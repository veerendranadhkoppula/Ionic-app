import React from "react";
import styles from "./CafeOrders.module.css";
import { useHistory } from "react-router-dom";
import NoState from "../../NoState/NoState";
import tokenStorage from "../../../utils/tokenStorage";
import {
  getUserCafeOrders,
  getCafeOrderById,
  submitCafeOrderRatings,
  isOrderOngoing,
  type CafeOrder,
} from "../../../api/apiCafeOrders";
import { useCart } from "../../../context/useCart";
import { useStoreCart } from "../../../context/useStoreCart";
import CartConflictModal from "../../StoreMenu/CartConflictModal/CartConflictModal";

const POLL_MS = 5000;  // poll every 5s (was 2.5s — halves server load)

const CafeOrders: React.FC = () => {
  const history = useHistory();

  // ── Cart contexts ─────────────────────────────────────────────────────────
  const { cart: cafeCart, addToCart, clearCart, setShopId } = useCart();
  const { storeCart, clearStoreCartAll } = useStoreCart();

  const [orders, setOrders] = React.useState<CafeOrder[]>([]);
  const [loading, setLoading] = React.useState(true);

  // ── Reorder state ─────────────────────────────────────────────────────────
  // track which order (id) is currently performing a reorder so only that
  // specific CTA shows the "Adding…" label instead of a page-wide overlay.
  const [reorderLoadingFor, setReorderLoadingFor] = React.useState<string | null>(null);
  const [conflictVisible, setConflictVisible] = React.useState(false);
  // "store"  → store cart has items, warn before overwriting with cafe items
  // "cafe"   → cafe cart already has items, warn before overwriting with reorder
  const [conflictType, setConflictType] = React.useState<"store" | "cafe">("store");
  // Holds the order to reorder while user decides in the conflict modal
  const pendingReorderRef = React.useRef<CafeOrder | null>(null);

  // Local rating state — pre-seeded from API, then updated optimistically
  const [orderRatings, setOrderRatings] = React.useState<{
    [key: string]: number;
  }>({});
  // How many orders to show initially and increment by
  const [visibleCount, setVisibleCount] = React.useState(5);
  const [baristaRatings, setBaristaRatings] = React.useState<{
    [key: string]: number;
  }>({});

  // Debounce timers per order
  const ratingTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Initial load ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const token = await tokenStorage.getToken();
        const list = await getUserCafeOrders(token);
        if (cancelled) return;

        setOrders(list);
        setLoading(false);

        // Pre-seed ratings from what the server already has
        const oRat: Record<string, number> = {};
        const bRat: Record<string, number> = {};
        list.forEach((o) => {
          if (o.orderRating   != null) oRat[String(o.id)] = o.orderRating;
          if (o.baristaRating != null) bRat[String(o.id)] = o.baristaRating;
        });
        setOrderRatings(oRat);
        setBaristaRatings(bRat);
      } catch (err) {
        console.error("[CafeOrders] load error", err);
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    const ongoingOrders = orders.filter(isOrderOngoing);
    if (ongoingOrders.length === 0) return;

    const tick = async () => {
      try {
        const token = await tokenStorage.getToken();
        // Fetch only the ongoing orders in parallel — not the whole list
        const updated = await Promise.all(
          ongoingOrders.map((o) => getCafeOrderById(token, o.id))
        );
        // Merge the updated orders back into the full list
        setOrders((prev) =>
          prev.map((o) => {
            const refreshed = updated.find((u) => u.id === o.id);
            return refreshed ?? o;
          })
        );
      } catch { /* silent */ }
    };

    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [orders]);

  const handleOrderRating = (id: string, value: number) => {
    setOrderRatings((prev) => ({ ...prev, [id]: value }));
    scheduleSave(id, value, baristaRatings[id] ?? null);
  };

  const handleBaristaRating = (id: string, value: number) => {
    setBaristaRatings((prev) => ({ ...prev, [id]: value }));
    scheduleSave(id, orderRatings[id] ?? null, value);
  };

  const scheduleSave = (
    id: string,
    orderRating: number | null,
    baristaRating: number | null,
  ) => {
    clearTimeout(ratingTimers.current[id]);
    ratingTimers.current[id] = setTimeout(async () => {
      try {
        const token = await tokenStorage.getToken();
        await submitCafeOrderRatings(token, id, orderRating, baristaRating);
      } catch (err) {
        console.warn("[CafeOrders] rating save failed", err);
      }
    }, 800);
  };


  const executeReorder = React.useCallback(async (order: CafeOrder) => {
    setReorderLoadingFor(String(order.id));
    try {
      // Restore shopId from localStorage — same key CartContext uses
      const storedShopId = localStorage.getItem("cart_shop_id");
      const shopId = storedShopId ? Number(storedShopId) : null;
      if (shopId) setShopId(shopId);

      // Clear existing cafe cart first so we start fresh
      await clearCart();

      for (const item of order.items) {
        // Add the item once; if quantity > 1, repeat addToCart for that count
        for (let qty = 0; qty < item.quantity; qty++) {

          await addToCart(item.productId, item.customizations ?? []);
        }
      }

      // Navigate to the cart screen
      history.push("/Cart");
    } catch (err) {
      console.error("[CafeOrders] reorder failed", err);
    } finally {
      setReorderLoadingFor(null);
    }
  }, [addToCart, clearCart, setShopId, history]);


  const handleReorder = React.useCallback((e: React.MouseEvent, order: CafeOrder) => {
    e.stopPropagation();

    const storeHasItems = (storeCart?.items ?? []).length > 0;
    const cafeHasItems  = (cafeCart?.items  ?? []).length > 0;

    if (storeHasItems) {
      pendingReorderRef.current = order;
      setConflictType("store");
      setConflictVisible(true);
      return;
    }

    if (cafeHasItems) {
      pendingReorderRef.current = order;
      setConflictType("cafe");
      setConflictVisible(true);
      return;
    }

    // No conflict — reorder immediately
    executeReorder(order);
  }, [storeCart, cafeCart, executeReorder]);

  /** User tapped "Replace" in the conflict modal — clear the right cart then reorder */
  const handleConflictReplace = React.useCallback(async () => {
    setConflictVisible(false);
    const order = pendingReorderRef.current;
    pendingReorderRef.current = null;
    if (!order) return;

    if (conflictType === "store") {
      await clearStoreCartAll();
    }
    // For cafe-vs-cafe, executeReorder already calls clearCart() before adding items
    await executeReorder(order);
  }, [conflictType, clearStoreCartAll, executeReorder]);

  const handleConflictCancel = React.useCallback(() => {
    setConflictVisible(false);
    pendingReorderRef.current = null;
  }, []);

  const renderStars = (
    currentValue: number,
    onClick: (value: number) => void,
  ) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={styles.starWrapper}
        onClick={(e) => {
          e.stopPropagation();
          onClick(star);
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9.60416 1.91371C9.64068 1.83993 9.6971 1.77782 9.76704 1.7344C9.83698 1.69098 9.91767 1.66797 9.99999 1.66797C10.0823 1.66797 10.163 1.69098 10.233 1.7344C10.3029 1.77782 10.3593 1.83993 10.3958 1.91371L12.3208 5.81288C12.4476 6.06952 12.6348 6.29155 12.8663 6.45992C13.0979 6.6283 13.3668 6.73797 13.65 6.77955L17.955 7.40955C18.0366 7.42137 18.1132 7.45577 18.1762 7.50888C18.2393 7.56199 18.2862 7.63167 18.3117 7.71005C18.3372 7.78843 18.3402 7.87239 18.3205 7.95241C18.3007 8.03244 18.259 8.10534 18.2 8.16288L15.0867 11.1945C14.8813 11.3946 14.7277 11.6416 14.639 11.9142C14.5503 12.1869 14.5292 12.477 14.5775 12.7595L15.3125 17.0429C15.3269 17.1244 15.3181 17.2084 15.2871 17.2851C15.2561 17.3619 15.2041 17.4284 15.1371 17.477C15.0701 17.5257 14.9908 17.5545 14.9082 17.5603C14.8256 17.566 14.7431 17.5485 14.67 17.5095L10.8217 15.4862C10.5681 15.3531 10.286 15.2835 9.99958 15.2835C9.71318 15.2835 9.43106 15.3531 9.17749 15.4862L5.32999 17.5095C5.25694 17.5482 5.17449 17.5656 5.09204 17.5598C5.00958 17.5539 4.93043 17.525 4.86357 17.4764C4.79672 17.4278 4.74485 17.3614 4.71387 17.2847C4.68289 17.2081 4.67404 17.1243 4.68833 17.0429L5.42249 12.7604C5.47099 12.4777 5.44998 12.1874 5.36128 11.9146C5.27257 11.6418 5.11883 11.3947 4.91333 11.1945L1.79999 8.16371C1.74049 8.10624 1.69832 8.03321 1.6783 7.95294C1.65827 7.87267 1.66119 7.7884 1.68673 7.70971C1.71226 7.63102 1.75938 7.56108 1.82272 7.50787C1.88607 7.45465 1.96308 7.4203 2.04499 7.40871L6.34916 6.77955C6.63271 6.7383 6.90199 6.62876 7.13381 6.46037C7.36564 6.29198 7.55308 6.06977 7.67999 5.81288L9.60416 1.91371Z"
            fill={currentValue >= star ? "#D0892F" : "none"}
            stroke={currentValue >= star ? "#D0892F" : "#8C8C8C"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    ));
  };


  const allOrders = orders.filter((o) => {
    const paid = o.paymentStatus === "paid";
    const refunded = o.paymentStatus === "refund-initiated" || o.paymentStatus === "refunded";
    const rejected = (o.orderAcceptance ?? "pending") === "rejected";
    const cancelled = o.orderStatus === "cancelled";
    return paid || refunded || rejected || cancelled;
  });


  const getOtherItems = (o: CafeOrder): string[] =>
    o.items
      .filter((it) => it.itemType === "food")
      .map((item) => `${item.quantity} x ${item.productName}`);

  const navigateTo = (o: CafeOrder) =>
    history.push("/orderdetailsCafe", { orderId: o.id });


  if (loading) {
    return (
      <div className={styles.main}>
        <div className={styles.MainConatiner}>
          <div className={styles.Bottom}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={styles.OngoingCard}
                style={{ opacity: 0.45, pointerEvents: "none" }}
              >
                <div className={styles.OngoingCardTop}>
                  <div
                    style={{
                      background: "#e0e0e0",
                      borderRadius: 6,
                      height: 14,
                      width: "50%",
                    }}
                  />
                  <div
                    style={{
                      background: "#e0e0e0",
                      borderRadius: 6,
                      height: 14,
                      width: "25%",
                    }}
                  />
                </div>
                <div
                  style={{
                    background: "#e0e0e0",
                    borderRadius: 6,
                    height: 50,
                    margin: "12px 0",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  if (allOrders.length === 0) {
    return (
      <div className={styles.main}>
        <div className={styles.MainConatiner}>
          <div className={styles.Bottom}>
            <div className={styles.emptyState}>
              <NoState
                title={"No cafe orders yet."}
                subtitle={"You don't have any cafe orders yet."}
                ctaText={"Browse cafe"}
                onCta={() => history.push("/CafeMenu")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const visibleOrders = allOrders.slice(0, visibleCount);

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainConatiner}>
          <div className={styles.Bottom}>
            {/* ── All orders — interleaved by recency (paginated view) ── */}
      {visibleOrders.map((order) => {
        const id       = String(order.id);
  const others   = getOtherItems(order);
  const beverageItems = order.items.filter((it) => it.itemType === "beverage");
  const hasBeverage = beverageItems.length > 0;
        // Treat admin-rejected acceptance as a cancelled order on the client
        const effectiveStatus = (order.orderAcceptance === 'rejected') ? 'cancelled' : order.orderStatus;
        const ongoing  = (order.orderAcceptance !== 'rejected') && isOrderOngoing(order);


                if (ongoing) {
                  return (
                  <div className={styles.OngoingCards} key={id}>
                  <div
                    className={styles.OngoingCard}
                    onClick={() => navigateTo(order)}
                  >
                    <div className={styles.OngoingCardTop}>
                      <div className={styles.OngoingCardTopOrderId}>
                        <p>
                          Order ID -{" "}
                          <span className={styles.spanra}>{order.displayId}</span>
                        </p>
                      </div>
                      <div className={styles.OngoingCardTopStatus}>
                        <p>Ongoing</p>
                      </div>
                    </div>

                    <div className={styles.OngoingCardMiddle}>
                      <div className={styles.OngoingCardMiddleTop}>
                          {hasBeverage ? (
                            <>
                              <div className={styles.OngoingCardMiddleTopByBarista}>
                                <p>By Barista : {order.barista?.name ?? "—"}</p>
                              </div>
                              <div className={styles.OngoingCardMiddleTopProdname}>
                                <p>{`${beverageItems[0].quantity} x ${beverageItems[0].productName}`}</p>
                              </div>
                            </>
                          ) : (
                            // No beverages — hide the barista block and prodname here. Other items are shown below.
                            null
                          )}
                      </div>

                      {others.length > 0 && (
                        <div className={styles.OngoingCardMiddleBottom}>
                          <div className={styles.OngoingCardMiddleBottomOtherItems}>
                            <p>Other items</p>
                          </div>
                          <div className={styles.OngoingCardMiddleBottomOtherItemsCount}>
                            <h5>{others[0]}</h5>
                            {others.length > 1 && (
                              <p className={styles.moreText}>
                                +{others.length - 1} more
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.RatingContainer}>
                      <div className={styles.RatingTopLine}></div>
                      <div className={styles.RatingRow}>
                        <div className={styles.RatingBlock}>
                          <p>Rate this Order</p>
                          <div className={styles.Stars}>
                            {renderStars(orderRatings[id] || 0, (val) =>
                              handleOrderRating(id, val),
                            )}
                          </div>
                        </div>
                        <div className={styles.RatingDivider}></div>
                        <div className={styles.RatingBlock}>
                          <p>Rate the Barista</p>
                          <div className={styles.Stars}>
                            {renderStars(baristaRatings[id] || 0, (val) =>
                              handleBaristaRating(id, val),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.OngoingCardBottom}>
                      <div className={styles.OngoingCardBottomTop}>
                        <div className={styles.OngoingCardBottomTopdate}>
                          <h4>{order.placedAtLabel}</h4>
                        </div>
                        <div className={styles.OngoingCardBottomTopAmount}>
                          <h4>Your Total - {order.financials.total.toFixed(0)} AED</h4>
                        </div>
                      </div>
                      <div className={styles.OngoingCardBottomBottom}>
                        <button className={styles.ViewOrderBtn}>
                          View Order
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
                  );
                }

                // ── COMPLETED card ────────────────────────────────────────
                if (effectiveStatus === "completed") {
                  return (
                  <div className={styles.CompletedCards} key={id}>
                  <div
                    className={styles.CompletedCard}
                    onClick={() => navigateTo(order)}
                  >
                    <div className={styles.CompletedCardTop}>
                      <div className={styles.CompletedCardTopOrderId}>
                        <p>
                          Order ID -{" "}
                          <span className={styles.spanra}>{order.displayId}</span>
                        </p>
                      </div>
                      <div className={styles.CompletedCardTopStatus}>
                        <p>Completed</p>
                      </div>
                    </div>

                    <div className={styles.CompletedCardMiddle}>
                      <div className={styles.CompletedCardMiddleTop}>
                          {hasBeverage ? (
                            <>
                              <div className={styles.CompletedCardMiddleTopByBarista}>
                                <p>By Barista : {order.barista?.name ?? "—"}</p>
                              </div>
                              <div className={styles.CompletedCardMiddleTopProdname}>
                                <p>{`${beverageItems[0].quantity} x ${beverageItems[0].productName}`}</p>
                              </div>
                            </>
                          ) : null}
                      </div>

                      {others.length > 0 && (
                        <div className={styles.CompletedCardMiddleBottom}>
                          <div className={styles.CompletedCardMiddleBottomOtherItems}>
                            <p>Other items</p>
                          </div>
                          <div className={styles.CompletedCardMiddleBottomOtherItemsCount}>
                            <h5>{others[0]}</h5>
                            {others.length > 1 && <p>+{others.length - 1} more</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.RatingContainer}>
                      <div className={styles.RatingTopLine}></div>
                      <div className={styles.RatingRow}>
                        <div className={styles.RatingBlock}>
                          <p>Rate this Order</p>
                          <div className={styles.Stars}>
                            {renderStars(orderRatings[id] || 0, (val) =>
                              handleOrderRating(id, val),
                            )}
                          </div>
                        </div>
                        <div className={styles.RatingDivider}></div>
                        <div className={styles.RatingBlock}>
                          <p>Rate the Barista</p>
                          <div className={styles.Stars}>
                            {renderStars(baristaRatings[id] || 0, (val) =>
                              handleBaristaRating(id, val),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.CompletedCardBottom}>
                      <div className={styles.CompletedCardBottomTop}>
                        <div className={styles.CompletedCardBottomTopdate}>
                          <h4>{order.placedAtLabel}</h4>
                        </div>
                        <div className={styles.CompletedCardBottomTopAmount}>
                          <h4>Your Total - {order.financials.total.toFixed(0)} AED</h4>
                        </div>
                      </div>

                      <div className={styles.CompletedCardBottomBottom}>
                        <button
                          disabled={reorderLoadingFor != null}
                          onClick={(e) => handleReorder(e, order)}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M1.66602 7.5L4.16602 5M4.16602 5L6.66602 7.5M4.16602 5V13.3333C4.16602 13.7754 4.34161 14.1993 4.65417 14.5118C4.96673 14.8244 5.39065 15 5.83268 15H10.8327M18.3327 12.5L15.8327 15M15.8327 15L13.3327 12.5M15.8327 15V6.66667C15.8327 6.22464 15.6571 5.80072 15.3445 5.48816C15.032 5.17559 14.608 5 14.166 5H9.16602"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{reorderLoadingFor === id ? "Adding…" : "Reorder"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
                  );
                }

                // ── CANCELLED card ────────────────────────────────────────
                const hasRefund =
                  order.financials.couponDiscount > 0 ||
                  order.financials.coinsDiscount  > 0 ||
                  order.financials.total           > 0;
                return (
                  <div className={styles.CancelledCards} key={id}>
                  <div
                    className={styles.CancelledCard}
                    onClick={() => navigateTo(order)}
                  >
                    <div className={styles.CancelledCardTop}>
                      <div className={styles.CancelledCardTopOrderId}>
                        <p>
                          Order ID -{" "}
                          <span className={styles.spanra}>{order.displayId}</span>
                        </p>
                      </div>
                      <div className={styles.CancelledCardTopStatus}>
                        <p>Cancelled</p>
                      </div>
                    </div>

                    <div className={styles.CancelledCardMiddle}>
                      <div className={styles.CancelledCardMiddleTop}>
                        {hasBeverage ? (
                          <>
                            <div className={styles.CancelledCardMiddleTopByBarista}>
                              <p>By Barista : {order.barista?.name ?? "—"}</p>
                            </div>
                            <div className={styles.CancelledCardMiddleTopProdname}>
                              <p>{`${beverageItems[0].quantity} x ${beverageItems[0].productName}`}</p>
                            </div>
                          </>
                        ) : null}
                      </div>

                      {others.length > 0 && (
                        <div className={styles.CancelledCardMiddleBottom}>
                          <div className={styles.CancelledCardMiddleBottomOtherItems}>
                            <p>Other items</p>
                          </div>
                          <div className={styles.CancelledCardMiddleBottomOtherItemsCount}>
                            <h5>{others[0]}</h5>
                            {others.length > 1 && <p>+{others.length - 1} more</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.RatingContainer}>
                      <div className={styles.RatingTopLine}></div>
                      <div className={styles.RatingRow}>
                        <div className={styles.RatingBlock}>
                          <p>Rate this Order</p>
                          <div className={styles.Stars}>
                            {renderStars(orderRatings[id] || 0, (val) =>
                              handleOrderRating(id, val),
                            )}
                          </div>
                        </div>
                        <div className={styles.RatingDivider}></div>
                        <div className={styles.RatingBlock}>
                          <p>Rate the Barista</p>
                          <div className={styles.Stars}>
                            {renderStars(baristaRatings[id] || 0, (val) =>
                              handleBaristaRating(id, val),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.CancelledCardBottom}>
                      <div className={styles.CancelledCardBottomTop}>
                        <div className={styles.CancelledCardBottomTopdate}>
                          <h4>{order.placedAtLabel}</h4>
                        </div>
                        <div className={styles.CancelledCardBottomTopAmount}>
                          <h4>Your Total - {order.financials.total.toFixed(0)} AED</h4>
                        </div>
                      </div>

                      <div className={styles.CancelledCardBottomBottom}>
                        <button
                          disabled={reorderLoadingFor != null}
                          onClick={(e) => handleReorder(e, order)}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M1.66602 7.5L4.16602 5M4.16602 5L6.66602 7.5M4.16602 5V13.3333C4.16602 13.7754 4.34161 14.1993 4.65417 14.5118C4.96673 14.8244 5.39065 15 5.83268 15H10.8327M18.3327 12.5L15.8327 15M15.8327 15L13.3327 12.5M15.8327 15V6.66667C15.8327 6.22464 15.6571 5.80072 15.3445 5.48816C15.032 5.17559 14.608 5 14.166 5H9.16602"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{reorderLoadingFor === id ? "Adding…" : "Reorder"}</span>
                        </button>
                        {hasRefund && (
                          <div className={styles.CancelledRefundstatus}>
                            <p>Refund processed</p>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M8 15.5C12.1421 15.5 15.5 12.1421 15.5 8C15.5 3.85786 12.1421 0.5 8 0.5C3.85786 0.5 0.5 3.85786 0.5 8C0.5 12.1421 3.85786 15.5 8 15.5Z"
                                fill="#6C7A5F"
                              />
                              <path d="M5.75 8L7.25 9.5L10.25 6.5" fill="#6C7A5F" />
                              <path
                                d="M5.75 8L7.25 9.5L10.25 6.5M15.5 8C15.5 12.1421 12.1421 15.5 8 15.5C3.85786 15.5 0.5 12.1421 0.5 8C0.5 3.85786 3.85786 0.5 8 0.5C12.1421 0.5 15.5 3.85786 15.5 8Z"
                                stroke="#F5F5F5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
              {/* "View more" (show next batch of 5) */}
              {allOrders.length > visibleCount && (
                <div className={styles.viewMoreContainer}>
                  <p
                    className={styles.viewMore}
                    onClick={() => setVisibleCount((v) => v + 5)}
                  >
                    View more
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Reorder does not render a page-wide overlay anymore — the clicked CTA
          shows its own "Adding…" label. */}

      {/* Cart conflict modal */}
      {conflictVisible && (
        <CartConflictModal
          existingOrigin={conflictType === "store" ? "store" : "cafe"}
          incomingOrigin="cafe"
          existingItemCount={
            conflictType === "store"
              ? (storeCart?.items ?? []).length
              : (cafeCart?.items  ?? []).length
          }
          onReplace={handleConflictReplace}
          onCancel={handleConflictCancel}
        />
      )}
    </>
  );
};

export default CafeOrders;

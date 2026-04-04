import React from "react";
import styles from "./ShopOrders.module.css";
import { useHistory } from "react-router-dom";
import NoState from "../../NoState/NoState";
import tokenStorage from "../../../utils/tokenStorage";
import {
  getUserWebOrders,
  cancelWebOrder,
  type WebOrder,
  type WebOrderDeliveryStatus,
} from "../../../api/apiStoreOrders";
import { getUserSubscriptions, type UserSubscription, cancelSubscriptionOrder } from "../../../api/apiSubscriptions";
import subStyles from "../../../pages/SubscriptionDetail.module.css";
import { useCart } from "../../../context/useCart";
import { useStoreCart } from "../../../context/useStoreCart";
import CartConflictModal from "../../StoreMenu/CartConflictModal/CartConflictModal";

const ShopOrders: React.FC = () => {
  const history = useHistory();

  const [orders, setOrders]   = React.useState<WebOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [ratings, setRatings] = React.useState<{ [key: string]: number }>({});
  const [cancelling, setCancelling] = React.useState<{ [key: string]: boolean }>({});
  // Pagination: how many orders to show at once
  const [visibleCount, setVisibleCount] = React.useState(5);

  // ── Reorder state (mirror CafeOrders behavior) ───────────────────────────
  const { cart: cafeCart, clearCart } = useCart();
  const { storeCart, clearStoreCartAll, addToStoreCart } = useStoreCart();
  const [reorderLoading, setReorderLoading] = React.useState(false);
  const [conflictVisible, setConflictVisible] = React.useState(false);
  const [conflictType, setConflictType] = React.useState<"store" | "cafe">("store");
  const pendingReorderRef = React.useRef<WebOrder | null>(null);

  const executeReorder = React.useCallback(async (o: WebOrder) => {
    setReorderLoading(true);
    try {
      // Clear any existing store cart before adding
      await clearStoreCartAll();

      for (const item of o.items) {
        try {
          await addToStoreCart(item.productId, item.quantity, item.variantId ?? undefined, item.variantName ?? undefined, item.price);
          console.log("[ShopOrders] added item to store cart", { productId: item.productId, qty: item.quantity });
        } catch (err) {
          console.error("[ShopOrders] addToStoreCart failed for item", item, err);
          throw err;
        }
      }
      console.log("[ShopOrders] executeReorder done — navigating to /Cart");
      history.push("/Cart");
    } catch (err) {
      console.error("[ShopOrders] reorder failed", err);
      try { alert("Failed to add items to cart. Please try again."); } catch { /* ignore */ }
    } finally {
      setReorderLoading(false);
    }
  }, [addToStoreCart, clearStoreCartAll, history]);

  // ── Navigation helper — subscription orders open SubscriptionDetail ───────
  const navigateToOrder = React.useCallback((order: WebOrder) => {
    if (order.origin === "subscription") {
      (async () => {
        try {
          const token = await tokenStorage.getToken();
          const subs = await getUserSubscriptions(token);
          // Attempt to find a matching subscription by product name + placedAtLabel or total
          const firstItemName = order.items[0]?.productName ?? "";
          let matched = subs.find((s) => s.placedAtLabel === order.placedAtLabel && s.productName === firstItemName);
          if (!matched) {
            matched = subs.find((s) => Math.abs((s.total ?? 0) - (order.financials.total ?? 0)) < 0.01 && s.productName === firstItemName);
          }
          if (matched) {
            history.push("/SubscriptionDetail", { subscription: matched });
            return;
          }
        } catch (err) {
          console.warn("[ShopOrders] failed to load subscriptions for detail fallback", err);
        }

        // Fallback: build a minimal UserSubscription object from order (previous behavior)
        const cancelledStatuses = ["cancelled", "refund-initiated", "refunded"];
        const sub: UserSubscription = {
          id:                order.id,
          displayId:         order.displayId,
          status:            cancelledStatuses.includes(order.deliveryStatus) ? "cancelled" : "active",
          productName:       order.items[0]?.productName ?? "Product",
          itemName:          order.items[0]
            ? `${order.items[0].productName}${order.items[0].variantName ? ", " + order.items[0].variantName : ""}`
            : "—",
          deliveryFrequency: "—",
          quantity:          order.items[0]?.quantity ?? 1,
          unitPrice:         order.items[0]?.price ?? 0,
          shippingCharge:    order.financials.shippingCharge,
          taxAmount:         order.financials.taxAmount,
          total:             order.financials.total,
          coinsDiscount:     order.financials.wtCoinsDiscount,
          nextDelivery:      order.deliveringBy ?? null,
          cancelledOn:       null,
          placedAtLabel:     order.placedAtLabel,
          shippingAddress:   order.shippingAddress
            ? {
                firstName:    order.shippingAddress.firstName,
                lastName:     order.shippingAddress.lastName,
                addressLine1: order.shippingAddress.addressLine1,
                addressLine2: order.shippingAddress.addressLine2 ?? "",
                city:         order.shippingAddress.city,
                emirates:     order.shippingAddress.emirates ?? "",
                phoneNumber:  order.shippingAddress.phoneNumber,
              }
            : null,
          billingAddress:  null,
          paymentHistory:  [],
          cardBrand:       "",
          cardLast4:       "",
          stripeSubId:     "",
        };
        history.push("/SubscriptionDetail", { subscription: sub });
      })();
    } else {
      history.push("/orderdetailsShop", { order });
    }
  }, [history]);

  const handleReorder = React.useCallback(async (e: React.MouseEvent, order: WebOrder) => {
    e.stopPropagation();

    if (order.origin === "subscription") {
      try {
        const token = await tokenStorage.getToken();
        // Try to find the matching subscription for this order (same logic as navigateToOrder)
        const subs = await getUserSubscriptions(token);
        const firstItemName = order.items[0]?.productName ?? "";
        let matched = subs.find((s) => s.placedAtLabel === order.placedAtLabel && s.productName === firstItemName);
        if (!matched) {
          matched = subs.find((s) => Math.abs((s.total ?? 0) - (order.financials.total ?? 0)) < 0.01 && s.productName === firstItemName);
        }

        if (matched) {
          try {
            const API_BASE = "https://endpoint.whitemantis.ae/api";
            const res = await fetch(`${API_BASE}/web-subscription/${matched.id}?depth=2`, {
              method: "GET",
              headers: token ? { Authorization: `JWT ${token}` } : undefined,
            });
            if (res.ok) {
              const parsed: unknown = await res.json().catch((err) => {
                console.warn("[ShopOrders] failed to parse subscription doc json", err);
                return null as unknown;
              });
              const parsedRec = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
              const docObj = parsedRec ? ((parsedRec["doc"] as Record<string, unknown> | undefined) ?? parsedRec) : null;
              const items = docObj && typeof docObj === "object" && Array.isArray((docObj as Record<string, unknown>)["items"]) ? ((docObj as Record<string, unknown>)["items"] as unknown[]) : [];
              const firstItem = items.length > 0 ? (items[0] as Record<string, unknown>) : null;

              const productObj = firstItem && typeof firstItem === "object" ? (firstItem["product"] as Record<string, unknown> | undefined) ?? null : null;
              const prodIdVal = productObj ? (productObj["id"] ?? productObj["_id"]) : firstItem ? firstItem["product"] : undefined;
              const productId = prodIdVal != null ? Number(prodIdVal) : Number(firstItem?.["product"] ?? 0);
              const productName = productObj
                ? String(productObj["name"] ?? productObj["title"] ?? firstItem?.["productName"] ?? "Product")
                : String(firstItem?.["productName"] ?? "Product");
              const variantId = (firstItem && (firstItem["variantID"] ?? firstItem["variantId"])) ?? undefined;
              let variantName = firstItem?.["variantName"] as string | undefined;
              // Try to read variant name from populated product if available
              if (!variantName && productObj && Array.isArray(productObj["variants"])) {
                const variants = productObj["variants"] as unknown[];
                const found = variants.find((v) => {
                  if (!v || typeof v !== "object") return false;
                  const vrec = v as Record<string, unknown>;
                  return String(vrec["id"] ?? vrec["_id"]) === String(variantId);
                }) as Record<string, unknown> | undefined;
                if (found) variantName = String(found["variantName"] ?? found["name"] ?? variantName);
              }

              const subscriptionId = (firstItem && (firstItem["subFreqID"] ?? firstItem["subFreqId"])) ?? (docObj && typeof docObj === "object" ? (docObj as Record<string, unknown>)["subFreqID"] : "") ?? "";
              const unitPrice = Number(firstItem?.["price"] ?? matched.unitPrice ?? 0);

              // Get user email from storage if available
              let userEmail = "";
              try { userEmail = (await tokenStorage.getItem("user_email")) ?? ""; } catch (err) { console.warn("[ShopOrders] tokenStorage.getItem user_email failed", err); }

              if (subscriptionId) {
                const state = {
                  productId: Number(productId),
                  productName,
                  variantId: variantId ?? undefined,
                  variantName: variantName ?? undefined,
                  subscriptionId: String(subscriptionId),
                  freqLabel: matched.deliveryFrequency ?? "",
                  quantity: Number(firstItem?.quantity ?? matched.quantity ?? 1),
                  unitPrice,
                  userEmail,
                };
                history.push("/SubScriptionCheckout", state);
                return;
              }
            }
          } catch (err) {
            console.warn("[ShopOrders] failed to fetch subscription doc for reorder fallback", err);
          }
        }


        navigateToOrder(order);
        return;
      } catch (err) {
        console.warn("[ShopOrders] subscription-reorder flow failed, falling back to normal reorder", err);
        // fall through to normal reorder behavior
      }
    }

    const storeHasItems = (storeCart?.items ?? []).length > 0;
    const cafeHasItems = (cafeCart?.items ?? []).length > 0;
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
    executeReorder(order);
  }, [storeCart, cafeCart, executeReorder, history, navigateToOrder]);

  const handleConflictReplace = React.useCallback(async () => {
    setConflictVisible(false);
    const o = pendingReorderRef.current;
    pendingReorderRef.current = null;
    if (!o) return;
    if (conflictType === "store") await clearStoreCartAll();
    if (conflictType === "cafe") await clearCart();
    await executeReorder(o);
  }, [conflictType, clearStoreCartAll, clearCart, executeReorder]);

  const handleConflictCancel = React.useCallback(() => {
    setConflictVisible(false);
    pendingReorderRef.current = null;
  }, []);

  // ── Cancel modal state ────────────────────────────────────────────────────
  const [cancelTargetId, setCancelTargetId]   = React.useState<number | null>(null);
  const [cancelReason, setCancelReason]       = React.useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [showSubscriptionCancelModal, setShowSubscriptionCancelModal] = React.useState(false);
  const [pendingSubscription, setPendingSubscription] = React.useState<UserSubscription | null>(null);
  const [subscriptionCancelling, setSubscriptionCancelling] = React.useState(false);

  const CANCEL_REASONS = [
    "Changed my mind",
    "Ordered by mistake",
    "Delivery time is too long",
    "Found a better alternative",
  ];

  // ── Initial load ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = await tokenStorage.getToken();
        const list  = await getUserWebOrders(token);
        if (cancelled) return;
        setOrders(list);
        // Pre-seed ratings from server data
        const rMap: Record<string, number> = {};
        list.forEach((o) => {
          if (o.orderRating != null) rMap[String(o.id)] = o.orderRating;
        });
        setRatings(rMap);
      } catch (err) {
        console.error("[ShopOrders] load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Cancel handler ────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (cancelTargetId === null) return;
    setCancelling((prev) => ({ ...prev, [String(cancelTargetId)]: true }));
    try {
      const token = await tokenStorage.getToken();
      await cancelWebOrder(token, cancelTargetId, cancelReason ?? "Cancelled by user");
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancelTargetId ? { ...o, deliveryStatus: "cancelled" } : o,
        ),
      );
      setCancelTargetId(null);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("[ShopOrders] cancel error", err);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setCancelling((prev) => ({ ...prev, [String(cancelTargetId)]: false }));
    }
  };

  const getStatusText = (status: WebOrderDeliveryStatus) => {
    switch (status) {
      case "placed":          return "Order Placed";
      case "shipped":         return "In Progress";
      case "delivered":       return "Delivered";
      case "cancelled":       return "Cancelled";
      case "refund-initiated":return "Refund Initiated";
      case "refunded":        return "Refunded";
      default:                return "";
    }
  };

  const handleRating = (orderId: string, value: number) => {
    setRatings((prev) => ({ ...prev, [orderId]: value }));
  };



  // ── Star renderer — same SVG + fill logic as CafeOrders ──────────────────
  const renderStars = (
    currentValue: number,
    onClick: (value: number) => void,
  ) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={styles.star}
        onClick={(e) => {
          e.stopPropagation();
          onClick(star);
        }}
      >
        <svg
          width="19"
          height="18"
          viewBox="0 0 19 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.689 0.995745C8.72552 0.921962 8.78193 0.859855 8.85188 0.816432C8.92182 0.77301 9.00251 0.75 9.08483 0.75C9.16716 0.75 9.24785 0.77301 9.31779 0.816432C9.38773 0.859855 9.44415 0.921962 9.48067 0.995745L11.4057 4.89491C11.5325 5.15155 11.7197 5.37359 11.9512 5.54196C12.1827 5.71033 12.4516 5.82001 12.7348 5.86158L17.0398 6.49158C17.1214 6.5034 17.198 6.5378 17.2611 6.59091C17.3241 6.64402 17.371 6.7137 17.3965 6.79208C17.422 6.87047 17.4251 6.95442 17.4053 7.03444C17.3856 7.11447 17.3438 7.18737 17.2848 7.24491L14.1715 10.2766C13.9662 10.4767 13.8126 10.7236 13.7239 10.9963C13.6352 11.2689 13.6141 11.559 13.6623 11.8416L14.3973 16.1249C14.4117 16.2064 14.4029 16.2904 14.3719 16.3671C14.3409 16.4439 14.2889 16.5104 14.222 16.5591C14.155 16.6077 14.0756 16.6366 13.9931 16.6423C13.9105 16.6481 13.8279 16.6305 13.7548 16.5916L9.9065 14.5682C9.65293 14.4351 9.37082 14.3655 9.08442 14.3655C8.79802 14.3655 8.5159 14.4351 8.26233 14.5682L4.41483 16.5916C4.34178 16.6303 4.25933 16.6477 4.17688 16.6418C4.09442 16.6359 4.01527 16.607 3.94841 16.5584C3.88156 16.5098 3.82969 16.4434 3.79871 16.3668C3.76773 16.2901 3.75888 16.2063 3.77317 16.1249L4.50733 11.8424C4.55583 11.5597 4.53482 11.2694 4.44611 10.9966C4.35741 10.7238 4.20367 10.4767 3.99817 10.2766L0.884833 7.24575C0.825328 7.18827 0.783161 7.11524 0.763135 7.03497C0.743109 6.95471 0.746031 6.87043 0.771565 6.79174C0.7971 6.71305 0.844222 6.64311 0.907564 6.5899C0.970905 6.53668 1.04792 6.50233 1.12983 6.49074L5.434 5.86158C5.71755 5.82033 5.98682 5.71079 6.21865 5.5424C6.45048 5.37401 6.63792 5.1518 6.76483 4.89491L8.689 0.995745Z"
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

  if (orders.length === 0) {
    return (
      <div className={styles.main}>
        <div className={styles.MainConatiner}>
          <div className={styles.Bottom}>
            <div className={styles.emptyState}> 
              <NoState
                title={"No store orders yet."}
                subtitle={"You don't have any store orders yet."}
                ctaText={"Browse store"}
                onCta={() => history.push("/StoreMenu")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.MainConatiner}>
        <div className={styles.Bottom}>
      {orders
        .filter((o) => o.paymentStatus === "completed" || o.deliveryStatus === "cancelled")
        .slice(0, visibleCount)
        .map((order) => {
            const id     = String(order.id);
            const status = order.deliveryStatus;
            const isCancelled = status === "cancelled" || status === "refund-initiated" || status === "refunded";
            const isDelivered = status === "delivered";

            // Date label: show deliveringBy for ongoing/placed, deliveredOn for delivered, placedAt for cancelled
            const dateLabel = isDelivered
              ? (order.deliveredOn ?? order.placedAtLabel)
              : isCancelled
              ? order.placedAtLabel
              : (order.deliveringBy ?? order.placedAtLabel);

            const productNames = order.items.map(
              (it) =>
                `${it.productName}${it.variantName ? `, ${it.variantName}` : ""}${it.quantity > 1 ? ` x${it.quantity}` : ""}`,
            );

            return (
              <div
                key={id}
                className={
                  isCancelled
                    ? styles.CancelledCard
                    : isDelivered
                    ? styles.CompletedCard
                    : styles.OngoingCard
                }
                onClick={() => navigateToOrder(order)}
              >
                <div
                  className={
                    isCancelled
                      ? styles.CancelledCardTop
                      : isDelivered
                      ? styles.CompletedCardTop
                      : styles.OngoingCardTop
                  }
                >
                  <div
                    className={
                      isCancelled
                        ? styles.CancelledCardTopOrderId
                        : isDelivered
                        ? styles.CompletedCardTopOrderId
                        : styles.OngoingCardTopOrderId
                    }
                  >
                    <div>
                      <p>
                        Order ID -{" "}
                        <span className={styles.spanra}>{order.displayId}</span>
                      </p>
                      <p>{dateLabel}</p>
                    </div>
                  </div>

                  <div
                    className={
                      isCancelled
                        ? styles.CancelledCardTopStatus
                        : isDelivered
                        ? styles.CompletedCardTopStatus
                        : styles.OngoingCardTopStatus
                    }
                  >
                    <p>{getStatusText(status)}</p>
                  </div>
                </div>

                {/* MIDDLE */}
                <div
                  className={
                    isCancelled
                      ? styles.CancelledCardMiddle
                      : isDelivered
                      ? styles.CompletedCardMiddle
                      : styles.OngoingCardMiddle
                  }
                >
                  <div
                    className={
                      isCancelled
                        ? styles.CancelledCardMiddleTop
                        : isDelivered
                        ? styles.CompletedCardMiddleTop
                        : styles.OngoingCardMiddleTop
                    }
                  >
                    <div
                      className={
                        isCancelled
                          ? styles.CancelledCardMiddleTopProdname
                          : isDelivered
                          ? styles.CompletedCardMiddleTopProdname
                          : styles.OngoingCardMiddleTopProdname
                      }
                    >
                      {productNames.slice(0, 2).map((product, i) => (
                        <p key={i}>{product}</p>
                      ))}
                    </div>
                  </div>

                  {productNames.length > 2 && (
                    <p
                      className={styles.moreText}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToOrder(order);
                      }}
                    >
                      & more
                    </p>
                  )}

                  {order.origin === "subscription" && (
                    <div
                      className={
                        isDelivered
                          ? styles.CompletedCardMiddleBottomOtherItems
                          : styles.OngoingCardMiddleBottomOtherItems
                      }
                      onClick={(e) => { e.stopPropagation(); navigateToOrder(order); }}
                    >
                      <p className={styles.viewsub}>View Subscription</p>
                    </div>
                  )}

                  <div className={styles.ratingContainer}>
                    <div className={styles.ratingLine}></div>
                    <div className={styles.ratingRow}>
                      <p>Rate the Order</p>
                      <div className={styles.stars}>
                        {renderStars(ratings[id] ?? 0, (val) =>
                          handleRating(id, val),
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    isCancelled
                      ? styles.CancelledCardBottom
                      : isDelivered
                      ? styles.CompletedCardBottom
                      : styles.OngoingCardBottom
                  }
                >
                  <div
                    className={
                      isCancelled
                        ? styles.CancelledCardBottomTop
                        : isDelivered
                        ? styles.CompletedCardBottomTop
                        : styles.OngoingCardBottomTop
                    }
                  >
                    <div
                      className={
                        isCancelled
                          ? styles.CancelledCardBottomTopdate
                          : isDelivered
                          ? styles.CompletedCardBottomTopdate
                          : styles.OngoingCardBottomTopdate
                      }
                    >
                      <h4>{order.placedAtLabel}</h4>
                    </div>

                    <div
                      className={
                        isCancelled
                          ? styles.CancelledCardBottomTopAmount
                          : isDelivered
                          ? styles.CompletedCardBottomTopAmount
                          : styles.OngoingCardBottomTopAmount
                      }
                    >
                      <h4>Your Total - {order.financials.total.toFixed(0)} AED</h4>
                    </div>
                  </div>

                  <div
                    className={
                      isCancelled
                        ? styles.CancelledCardBottomBottom
                        : isDelivered
                        ? styles.CompletedCardBottomBottom
                        : styles.OngoingCardBottomBottom
                    }
                  >

                    {status === "placed" ? (
                      (() => {
                        const isPickup = order.deliveryOption === "pickup";
                        const disabled = isPickup || !!cancelling[id];
                        return (
                          <button
                            disabled={disabled}
                            style={{ opacity: isPickup ? 0.45 : undefined }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (isPickup) return; // no-op for pickup orders


                              if (order.origin === "subscription") {
                                try {
                                  const token = await tokenStorage.getToken();
                                  const subs = await getUserSubscriptions(token);
                                  const firstItemName = order.items[0]?.productName ?? "";
                                  let matched = subs.find((s) => s.placedAtLabel === order.placedAtLabel && s.productName === firstItemName);
                                  if (!matched) {
                                    matched = subs.find((s) => Math.abs((s.total ?? 0) - (order.financials.total ?? 0)) < 0.01 && s.productName === firstItemName);
                                  }
                                  if (matched) {
                                    setPendingSubscription(matched);
                                    setShowSubscriptionCancelModal(true);
                                    return;
                                  }
                                } catch (err) {
                                  console.warn("[ShopOrders] failed to load subscriptions for cancel modal", err);
                                }

                                // If no matching subscription found, navigate to SubscriptionDetail
                                const cancelledStatuses = ["cancelled", "refund-initiated", "refunded"];
                                const sub: UserSubscription = {
                                  id:                order.id,
                                  displayId:         order.displayId,
                                  status:            cancelledStatuses.includes(order.deliveryStatus) ? "cancelled" : "active",
                                  productName:       order.items[0]?.productName ?? "Product",
                                  itemName:          order.items[0]
                                    ? `${order.items[0].productName}${order.items[0].variantName ? ", " + order.items[0].variantName : ""}`
                                    : "—",
                                  deliveryFrequency: "—",
                                  quantity:          order.items[0]?.quantity ?? 1,
                                  unitPrice:         order.items[0]?.price ?? 0,
                                  shippingCharge:    order.financials.shippingCharge,
                                  taxAmount:         order.financials.taxAmount,
                                  total:             order.financials.total,
                                  coinsDiscount:     order.financials.wtCoinsDiscount,
                                  nextDelivery:      order.deliveringBy ?? null,
                                  cancelledOn:       null,
                                  placedAtLabel:     order.placedAtLabel,
                                  shippingAddress:   order.shippingAddress
                                    ? {
                                        firstName:    order.shippingAddress.firstName,
                                        lastName:     order.shippingAddress.lastName,
                                        addressLine1: order.shippingAddress.addressLine1,
                                        addressLine2: order.shippingAddress.addressLine2 ?? "",
                                        city:         order.shippingAddress.city,
                                        emirates:     order.shippingAddress.emirates ?? "",
                                        phoneNumber:  order.shippingAddress.phoneNumber,
                                      }
                                    : null,
                                  billingAddress:  null,
                                  paymentHistory:  [],
                                  cardBrand:       "",
                                  cardLast4:       "",
                                  stripeSubId:     "",
                                };
                                history.push("/SubscriptionDetail", { subscription: sub });
                                return;
                              }

                              // Normal web-order cancel flow
                              setCancelTargetId(order.id);
                              setCancelReason(null);
                            }}
                          >
                            {cancelling[id] ? "Cancelling…" : "Cancel Order"}
                          </button>
                        );
                      })()
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorder(e, order);
                        }}
                      >
                        {reorderLoading ? "Adding…" : "Reorder"}
                      </button>
                    )}

                    {order.origin === "subscription" && (
                      <p className={styles.subscriptionText}>
                        This delivery is part of your active subscription
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {orders.filter((o) => o.paymentStatus === "completed" || o.deliveryStatus === "cancelled").length > visibleCount && (
            <div className={styles.viewMoreContainer}>
              <p className={styles.viewMore} onClick={() => setVisibleCount((v) => v + 5)}>View more</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart conflict modal for reorder (clear existing cart) */}
      {conflictVisible && (
        <CartConflictModal
          existingOrigin={conflictType === "store" ? "store" : "cafe"}
          incomingOrigin="store"
          existingItemCount={conflictType === "store" ? (storeCart?.items ?? []).length : (cafeCart?.items ?? []).length}
          onReplace={handleConflictReplace}
          onCancel={handleConflictCancel}
        />
      )}

      {/* ── Cancel Order Modal ── */}
      {cancelTargetId !== null && (
        <div className={styles.ModalOverlay} onClick={() => { setCancelTargetId(null); setCancelReason(null); }}>
          <div className={styles.CancelModal} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.CancelModalTitle}>Cancel order?</h4>
            <p className={styles.CancelModalDesc}>Are you sure you want to cancel your order?</p>
            <p className={styles.CancelModalReasonLabel}>Select cancellation reason:</p>
            <div className={styles.CancelReasons}>
              {CANCEL_REASONS.map((reason) => (
                <div key={reason} className={styles.CancelReasonRow} onClick={() => setCancelReason(reason)}>
                  <div className={`${styles.RadioBtn} ${cancelReason === reason ? styles.RadioBtnSelected : ""}`}>
                    {cancelReason === reason && <div className={styles.RadioDot} />}
                  </div>
                  <p className={styles.CancelReasonText}>{reason}</p>
                </div>
              ))}
            </div>
            <p className={styles.CancelDisclaimer}>All requests are reviewed. Refunds process in 7–14 days after approval.</p>
            <div className={styles.CancelCTAs}>
              <button className={styles.CancelNoBtn} onClick={() => { setCancelTargetId(null); setCancelReason(null); }}>No</button>
              <button
                className={styles.CancelYesBtn}
                disabled={cancelling[String(cancelTargetId)]}
                onClick={handleCancel}
              >
                {cancelling[String(cancelTargetId)] ? "Cancelling…" : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription Cancel Modal (inline) ── */}
      {showSubscriptionCancelModal && pendingSubscription && (
        <div className={subStyles.ModalOverlay} onClick={() => { setShowSubscriptionCancelModal(false); setPendingSubscription(null); }}>
          <div className={subStyles.CancelModal} onClick={(e) => e.stopPropagation()}>
            <p className={subStyles.CancelModalTitle}>Cancel Subscription?</p>
            <p className={subStyles.CancelModalBody}>
              Your subscription will be cancelled and no further orders will be processed.
            </p>
            <div className={subStyles.CancelModalButtons}>
              <button
                className={subStyles.CancelModalCancelBtn}
                disabled={subscriptionCancelling}
                onClick={async () => {
                  try {
                    setSubscriptionCancelling(true);
                    const token = await tokenStorage.getToken();
                    await cancelSubscriptionOrder(token, pendingSubscription.id, pendingSubscription.stripeSubId, "Cancelled by user");
                    setShowSubscriptionCancelModal(false);
                    setPendingSubscription(null);
                    setShowSuccessModal(true);
                  } catch (err) {
                    console.error('[ShopOrders] cancel subscription failed', err);
                    alert('Failed to cancel subscription. Please try again.');
                  } finally {
                    setSubscriptionCancelling(false);
                  }
                }}
              >
                {subscriptionCancelling ? "Cancelling…" : "Cancel"}
              </button>
              <button
                className={subStyles.CancelModalKeepBtn}
                onClick={() => { setShowSubscriptionCancelModal(false); setPendingSubscription(null); }}
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Cancelled Success Modal ── */}
      {showSuccessModal && (
        <div className={styles.ModalOverlay}>
          <div className={styles.SuccessModal}>
            <h4 className={styles.SuccessModalTitle}>Order cancelled</h4>
            <p className={styles.SuccessModalDesc}>Your order has been successfully cancelled.</p>
            <button className={styles.SuccessDoneBtn} onClick={() => setShowSuccessModal(false)}>
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ShopOrders;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { IonContent, IonPage, IonHeader, IonFooter } from "@ionic/react";
import styles from "./OrderDetailsCafe.module.css";
import React from "react";
import { useHistory } from "react-router-dom";
import tokenStorage from "../utils/tokenStorage";
import {
  getCafeOrderById,
  isOrderOngoing,
  type CafeOrder,
} from "../api/apiCafeOrders";
import { useCart } from "../context/useCart";
import { useStoreCart } from "../context/useStoreCart";
import { generateCafeTakeawayInvoice, generateCafeDineInInvoice } from "../utils/generateInvoicePdf";
import { downloadPdf } from "../utils/downloadPdf";
import CartConflictModal from "../components/StoreMenu/CartConflictModal/CartConflictModal";

const POLL_MS = 2500;

const VegIcon: React.FC = () => (
  <svg
    width="11"
    height="10"
    viewBox="0 0 11 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.00108 10.0022C2.23906 10.0022 0 7.7631 0 5.00108C0 2.23906 2.23906 0 5.00108 0H5.99892C8.76094 0 11 2.23906 11 5.00108C11 7.7631 8.76094 10.0022 5.99892 10.0022H5.00108ZM1.22222 5.00108C1.22222 7.14932 2.96371 8.89081 5.11195 8.89081H5.88805C8.03629 8.89081 9.77778 7.14932 9.77778 5.00108C9.77778 2.85284 8.03629 1.11135 5.88805 1.11135H5.11195C2.96371 1.11135 1.22222 2.85284 1.22222 5.00108ZM5.5 7.22378C4.82778 7.22378 4.25232 7.00614 3.77361 6.57086C3.29491 6.13558 3.05556 5.61232 3.05556 5.00108C3.05556 4.38984 3.29491 3.86658 3.77361 3.4313C4.25232 2.99602 4.82778 2.77838 5.5 2.77838C6.17222 2.77838 6.74768 2.99602 7.22639 3.4313C7.70509 3.86658 7.94444 4.38984 7.94444 5.00108C7.94444 5.61232 7.70509 6.13558 7.22639 6.57086C6.74768 7.00614 6.17222 7.22378 5.5 7.22378Z"
      fill="#34A853"
    />
  </svg>
);

const NonVegIcon: React.FC = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 11 11"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="0.5"
      y="0.5"
      width="10"
      height="10"
      rx="1.5"
      stroke="#E53935"
      strokeWidth="1"
    />
    <polygon points="5.5,2.5 9,8.5 2,8.5" fill="#E53935" />
  </svg>
);

const OrderDetailsCafe: React.FC = () => {
  const history = useHistory();
  const location = history.location as any;
  const orderId = location.state?.orderId ?? location.state?.order?.id;
  const [order, setOrder] = React.useState<CafeOrder | null>(null);
  const [loading, setLoading] = React.useState(true);

  // ── Cart contexts (reorder) ───────────────────────────────────────────────
  const { cart: cafeCart, addToCart, clearCart, setShopId } = useCart();
  const { storeCart, clearStoreCartAll } = useStoreCart();


  const [reorderLoadingFor, setReorderLoadingFor] = React.useState<string | null>(null);
  const [conflictVisible, setConflictVisible] = React.useState(false);
  const [conflictType, setConflictType] = React.useState<"store" | "cafe">(
    "store",
  );
  const pendingReorderRef = React.useRef<CafeOrder | null>(null);

  const [invoiceGenerating, setInvoiceGenerating] = React.useState(false);
const handleDownloadInvoice = React.useCallback(async () => {
  if (!order) return;
  setInvoiceGenerating(true);
  try {
const userEmail = await tokenStorage.getItem("user_email") ?? "";
const userPhone = await tokenStorage.getItem("user_mobile") ?? "";
const base64 = order.orderType === "dine-in"
  ? await generateCafeDineInInvoice(order, userEmail, userPhone)
  : await generateCafeTakeawayInvoice(order, userEmail, userPhone);
    await downloadPdf(base64, `invoice-${order.displayId.replace("#", "")}.pdf`);
  } catch (err) {
    console.error("[OrderDetailsCafe] invoice error", err);
    alert("Could not generate invoice. Please try again.");
  } finally {
    setInvoiceGenerating(false);
  }
}, [order]);
  React.useEffect(() => {
    if (!orderId) {
      history.goBack();
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const token = await tokenStorage.getToken();
        const data = await getCafeOrderById(token, orderId);
        if (!cancelled) {
          setOrder(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("[OrderDetailsCafe] fetch error", err);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debug logging: help diagnose missing customization display
  React.useEffect(() => {
    console.log("[OrderDetailsCafe] order state changed:", { orderId, order });
    if (order && Array.isArray(order.items)) {
      order.items.forEach((it) => {
        try {
          console.log("[OrderDetailsCafe] item:", {
            id: it.id,
            productId: it.productId,
            productName: it.productName,
            unitPrice: it.unitPrice,
            isReward: it.isReward,
            customizations: it.customizations,
          });
        } catch {
          /* ignore */
        }
      });
    }
  }, [order, orderId]);

  React.useEffect(() => {
    if (!order || !isOrderOngoing(order)) return;
    const tick = async () => {
      try {
        const token = await tokenStorage.getToken();
        const updated = await getCafeOrderById(token, orderId);
        setOrder(updated);
      } catch {
        /* silent */
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [order, orderId]);

  // ── Reorder logic (identical contract to CafeOrders.tsx) ─────────────────

  const executeReorder = React.useCallback(
    async (o: CafeOrder) => {
      setReorderLoadingFor(String(o.id));
      try {
        const storedShopId = localStorage.getItem("cart_shop_id");
        const sId = storedShopId ? Number(storedShopId) : null;
        if (sId) setShopId(sId);
        await clearCart();
        for (const item of o.items) {
          for (let q = 0; q < item.quantity; q++) {
            await addToCart(item.productId, item.customizations ?? []);
          }
        }
        history.push("/Cart");
      } catch (err) {
        console.error("[OrderDetailsCafe] reorder failed", err);
      } finally {
        setReorderLoadingFor(null);
      }
    },
    [addToCart, clearCart, setShopId, history],
  );

  const handleReorder = React.useCallback(() => {
    if (!order) return;
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
  }, [order, storeCart, cafeCart, executeReorder]);

  const handleConflictReplace = React.useCallback(async () => {
    setConflictVisible(false);
    const o = pendingReorderRef.current;
    pendingReorderRef.current = null;
    if (!o) return;
    if (conflictType === "store") await clearStoreCartAll();
    await executeReorder(o);
  }, [conflictType, clearStoreCartAll, executeReorder]);

  const handleConflictCancel = React.useCallback(() => {
    setConflictVisible(false);
    pendingReorderRef.current = null;
  }, []);

  // Prefetch invoice URL so the invoice CTA can directly link to Stripe (like SubscriptionDetail)

  if (loading || !order) {
    return (
      <IonPage>
        <IonHeader slot="fixed">
          <div className={styles.Top}>
            <div className={styles.TopLeft}>
              <svg
                width="35"
                height="35"
                viewBox="0 0 35 35"
                fill="none"
                onClick={() => history.goBack()}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20.5 13L15 18.5L20.5 24"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h4>Order details</h4>
            </div>
          </div>
        </IonHeader>
        <IonContent fullscreen className="home-content">
          <div className={styles.main}>
            <div className={styles.MainConatiner} style={{ opacity: 0.45 }}>
              <div
                style={{
                  background: "#e0e0e0",
                  borderRadius: 8,
                  height: 60,
                  margin: "16px 0",
                }}
              />
              <div
                style={{
                  background: "#e0e0e0",
                  borderRadius: 8,
                  height: 120,
                  margin: "16px 0",
                }}
              />
              <div
                style={{
                  background: "#e0e0e0",
                  borderRadius: 8,
                  height: 80,
                  margin: "16px 0",
                }}
              />
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const isCancelled = order.orderStatus === "cancelled";
  const isCompleted = order.orderStatus === "completed";
  const isOngoing = isOrderOngoing(order);

  const getStatusLabel = (): "Ongoing" | "Completed" | "Cancelled" => {
    if (isCancelled) return "Cancelled";
    if (isCompleted) return "Completed";
    return "Ongoing";
  };

  // Barista section = beverage items; Other items = food/baker items
  const baristaItems = order.items.filter((i) => i.itemType === "beverage");
  const otherItems = order.items.filter((i) => i.itemType !== "beverage");
  const fin = order.financials;

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <div className={styles.Top}>
          <div className={styles.TopLeft}>
            <svg
              width="35"
              height="35"
              viewBox="0 0 35 35"
              fill="none"
              onClick={() => history.goBack()}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.5 13L15 18.5L20.5 24"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h4>Order details</h4>
          </div>
          <div
            className={styles.TopRight}
            onClick={() => history.push("/NeedHelp")}
          >
            <p>Help</p>
          </div>
        </div>
      </IonHeader>
      <IonContent fullscreen className="home-content">
        <div className={styles.main}>
          <div className={styles.MainConatiner}>
            <div className={styles.TopContainer}>
              <div className={styles.OrderIdandStatus}>
                <div className={styles.OrderId}>
                  <p>Order ID - </p>
                  <h4>{order.displayId}</h4>
                </div>
                <div
                  className={`${styles.OrderStatus} ${
                    isCancelled ? styles.cancelledStatus : ""
                  } ${isCompleted ? styles.completedStatus : ""} ${
                    isOngoing ? styles.ongoingStatus : ""
                  }`}
                >
                  <p>{getStatusLabel()}</p>
                </div>
              </div>
              <div className={styles.OrderDetails}>
                <div className={styles.OrderDetailsLeft}>
                  <p>Placed on </p>
                  <h4>- {order.placedAtLabel}</h4>
                </div>
                {isCancelled && fin.total > 0 && (
                  <div className={styles.OrderDetailsRight}>
                    <p>Refund processed</p>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.MiddleContainer}>
              {order.orderType === "take-away" && (
                <div className={styles.MiddleTop}>
                  <p>Takeaway</p>
                  {order.slot && <p>Pickup time - {order.slot}</p>}
                </div>
              )}
              <div className={styles.MiddleBottom}>
                <h3>Bill Details</h3>
                <div className={styles.BillDetails}>
                  {baristaItems.length > 0 && (
                    <div className={styles.bybaristaprods}>
                      <h3>By Barista : {order.barista?.name ?? "—"}</h3>
                      {baristaItems.map((item) => {
                        const custExtra = (item.customizations ?? []).reduce(
                          (s, c) => s + (c?.price ?? 0),
                          0,
                        );
                        const lineTotal =
                          (item.unitPrice + custExtra) * item.quantity;
                        return (
                          <div className={styles.prods} key={item.id}>
                            <div className={styles.prodDtaisl}>
                              <div className={styles.PRodnameLeft}>
                                {item.isVeg ? <VegIcon /> : <NonVegIcon />}
                                <h4>
                                  {item.quantity} x {item.productName}
                                </h4>
                              </div>
                              <div className={styles.ProdnameRight}>
                                {item.isReward ? (
                                  // Reward items are free — show AED 0 instead of the word FREE
                                  <h4>AED 0</h4>
                                ) : (
                                  <h4>AED {lineTotal.toFixed(0)}</h4>
                                )}
                              </div>
                            </div>
                            {!item.isReward &&
                              (item.customizations?.length ?? 0) > 0 && (
                                <div className={styles.sizes}>
                                  {item.customizations.map((c, ci) => {
                                    const cc = c as Record<string, unknown>;
                                    const label = String(
                                      cc["label"] ??
                                        cc["selectedOptionLabel"] ??
                                        cc["optionLabel"] ??
                                        cc["selectedLabel"] ??
                                        cc["sectionTitle"] ??
                                        "",
                                    );
                                    const price =
                                      Number(
                                        cc["price"] ??
                                          cc["optionPrice"] ??
                                          cc["selectedOptionPrice"] ??
                                          0,
                                      ) || 0;
                                    return (
                                      <p
                                        key={ci}
                                        className={styles.customizationRow}
                                      >
                                        <span
                                          className={styles.customizationDot}
                                        ></span>
                                        {label}
                                        {price > 0
                                          ? ` (+AED ${price.toFixed(0)})`
                                          : ""}
                                      </p>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {otherItems.length > 0 && (
                    <div className={styles.OtherItems}>
                      <h3>Other items</h3>
                      <div className={styles.OtherItemlist}>
                        {otherItems.map((item) => {
                          const custExtra = (item.customizations ?? []).reduce(
                            (s, c) => s + (c?.price ?? 0),
                            0,
                          );
                          const lineTotal =
                            (item.unitPrice + custExtra) * item.quantity;
                          return (
                            <div className={styles.prods} key={item.id}>
                              <div className={styles.prodDtaisl}>
                                <div className={styles.PRodnameLeft}>
                                  {item.isVeg ? <VegIcon /> : <NonVegIcon />}
                                  <h4>
                                    {item.quantity} x {item.productName}
                                  </h4>
                                </div>
                                <div className={styles.ProdnameRight}>
                                  {item.isReward ? (
                                    // Reward items are free — show AED 0 instead of the word FREE
                                    <h4>AED 0</h4>
                                  ) : (
                                    <h4>AED {lineTotal.toFixed(0)}</h4>
                                  )}
                                </div>
                              </div>

                              {!item.isReward &&
                                (item.customizations?.length ?? 0) > 0 && (
                                  <div className={styles.sizes}>
                                    {item.customizations.map((c, ci) => {
                                      const cc = c as Record<string, unknown>;
                                      const label = String(
                                        cc["label"] ??
                                          cc["selectedOptionLabel"] ??
                                          cc["optionLabel"] ??
                                          cc["selectedLabel"] ??
                                          cc["sectionTitle"] ??
                                          "",
                                      );
                                      const price =
                                        Number(
                                          cc["price"] ??
                                            cc["optionPrice"] ??
                                            cc["selectedOptionPrice"] ??
                                            0,
                                        ) || 0;
                                      return (
                                        <p
                                          key={ci}
                                          className={styles.customizationRow}
                                        >
                                          <span
                                            className={styles.customizationDot}
                                          ></span>
                                          {label}
                                          {price > 0
                                            ? ` (+AED ${price.toFixed(0)})`
                                            : ""}
                                        </p>
                                      );
                                    })}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                      {order.specialInstructions ? (
                        <p>
                          Special Instructions - {order.specialInstructions}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.BottomContainer}>
              <div className={styles.ItemsTotal}>
                <div className={styles.calculationsConatiner}>
                  <div className={styles.itemsCoutnmoney}>
                    <h4>Item Total</h4>
                    <h4>AED {fin.subtotal.toFixed(0)}</h4>
                  </div>
                  <div className={styles.taxesContainer}>
                    <h4>Taxes</h4>
                    <h4>AED {fin.taxAmount.toFixed(0)}</h4>
                  </div>
                  {fin.coinsDiscount > 0 && (
                    <div className={styles.Beans}>
                      <h4>Beans Used</h4>
                      <h4>-{fin.coinsDiscount.toFixed(0)}</h4>
                    </div>
                  )}
                  {fin.couponDiscount > 0 && (
                    <div className={styles.CuponsConatiner}>
                      <div className={styles.Cupons}>
                        <h4>Coupon Applied</h4>
                        {fin.couponCode && <h4>"{fin.couponCode}"</h4>}
                      </div>
                      <h4> - AED {fin.couponDiscount.toFixed(0)}</h4>
                    </div>
                  )}
                </div>
                <div className={styles.line}></div>
                <div className={styles.Total}>
                  <h4>Your total</h4>
                  <h5>AED {fin.total.toFixed(0)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
      <IonFooter slot="fixed">
        <div className={styles.Footer}>
          <button
            className={styles.ReorderButton}
            disabled={isOngoing || reorderLoadingFor != null}
            style={isOngoing ? { opacity: 0.45, pointerEvents: "none" } : {}}
            onClick={handleReorder}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.66406 7.5L4.16406 5M4.16406 5L6.66406 7.5M4.16406 5V13.3333C4.16406 13.7754 4.33966 14.1993 4.65222 14.5118C4.96478 14.8244 5.3887 15 5.83073 15H10.8307M18.3307 12.5L15.8307 15M15.8307 15L13.3307 12.5M15.8307 15V6.66667C15.8307 6.22464 15.6551 5.80072 15.3426 5.48816C15.03 5.17559 14.6061 5 14.1641 5H9.16406"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p>{reorderLoadingFor === String(order.id) ? "Adding…" : "Reorder"}</p>
          </button>
         <button
  className={styles.InvoiceButton}
  onClick={handleDownloadInvoice}
  disabled={invoiceGenerating}
>
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9.9974 14.1667V2.5M9.9974 14.1667L4.9974 9.16667M9.9974 14.1667L14.9974 9.16667M15.8307 17.5H4.16406"
      stroke="#6C7A5F" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
  <p>{invoiceGenerating ? "Generating…" : "Invoice"}</p>
</button>
        </div>
      </IonFooter>


      {conflictVisible && (
        <CartConflictModal
          existingOrigin={conflictType === "store" ? "store" : "cafe"}
          incomingOrigin="cafe"
          existingItemCount={
            conflictType === "store"
              ? (storeCart?.items ?? []).length
              : (cafeCart?.items ?? []).length
          }
          onReplace={handleConflictReplace}
          onCancel={handleConflictCancel}
        />
      )}
    </IonPage>
  );
};

export default OrderDetailsCafe;

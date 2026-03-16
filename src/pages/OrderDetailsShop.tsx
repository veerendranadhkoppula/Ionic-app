/* eslint-disable @typescript-eslint/no-explicit-any */
import { IonContent, IonPage, IonHeader, IonFooter } from "@ionic/react";

import styles from "./OrderDetailsShop.module.css";
import React from "react";
import { useHistory } from "react-router-dom";
import tokenStorage from "../utils/tokenStorage";
import { getWebOrderInvoiceUrl } from "../api/apiStoreOrders";
import { useCart } from "../context/useCart";
import { useStoreCart } from "../context/useStoreCart";
import CartConflictModal from "../components/StoreMenu/CartConflictModal/CartConflictModal";
import {
  cancelWebOrder,
  type WebOrder,
  type WebOrderDeliveryStatus,
} from "../api/apiStoreOrders";

const OrderDetailsShop: React.FC = () => {
  const history = useHistory();
  const location = history.location as any;
  const order: WebOrder | undefined = location.state?.order;
  // Reorder/cart contexts (must be declared before any early returns)
  const { cart: cafeCart, clearCart } = useCart();
  const { storeCart, clearStoreCartAll, addToStoreCart } = useStoreCart();

  const [cancelling, setCancelling]         = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelReason, setCancelReason]     = React.useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  const CANCEL_REASONS = [
    "Changed my mind",
    "Ordered by mistake",
    "Delivery time is too long",
    "Found a better alternative",
  ];

  // NOTE: do not early-return before declaring all hooks — keep hooks unconditionally at top-level

  // Reorder UI state + callbacks (used when user taps Reorder)
  const [reorderLoading, setReorderLoading] = React.useState(false);
  const [conflictVisible, setConflictVisible] = React.useState(false);
  const [conflictType, setConflictType] = React.useState<"store" | "cafe">("store");
  const pendingReorderRef = React.useRef<WebOrder | null>(null);
  const [invoiceUrl, setInvoiceUrl] = React.useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = React.useState(false);

  // Prefetch invoice URL so the CTA can be a plain <a> (matches SubscriptionDetail behavior)
  React.useEffect(() => {
    // don't attempt to prefetch until we have an order id
    // (hook must remain unconditional; effect body will gate the real work)
    let cancelled = false;
    const load = async () => {
      if (!location?.state?.order) return;
      setInvoiceLoading(true);
      try {
        const token = await tokenStorage.getToken();
        const url = await getWebOrderInvoiceUrl(token, (location.state.order as WebOrder).id);
        if (!cancelled) setInvoiceUrl(url);
      } catch (err) {
        console.error("[OrderDetailsShop] invoice prefetch error", err);
      } finally {
        if (!cancelled) setInvoiceLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [location]);

  const executeReorder = React.useCallback(async (o: WebOrder) => {
    setReorderLoading(true);
    try {
      console.log("[OrderDetailsShop] executeReorder start", { orderId: o.id, itemCount: o.items.length });
      for (const item of o.items) {
        try {
          await addToStoreCart(item.productId, item.quantity, item.variantId ?? undefined, item.variantName ?? undefined, item.price);
          console.log("[OrderDetailsShop] added item to store cart", { productId: item.productId, qty: item.quantity });
        } catch (err) {
          console.error("[OrderDetailsShop] addToStoreCart failed for item", item, err);
          throw err;
        }
      }
      console.log("[OrderDetailsShop] executeReorder done — navigating to /Cart");
      history.push("/Cart");
    } catch (err) {
      console.error("[OrderDetailsShop] reorder failed", err);
      // Show a clear user-facing message so the caller can see why navigation didn't happen
      try { alert("Failed to add items to cart. Please try again."); } catch { /* ignore */ }
    } finally {
      setReorderLoading(false);
    }
  }, [addToStoreCart, history]);
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
    if (conflictType === "cafe") await clearCart();
    await executeReorder(o);
  }, [conflictType, clearStoreCartAll, clearCart, executeReorder]);

  const handleConflictCancel = React.useCallback(() => {
    setConflictVisible(false);
    pendingReorderRef.current = null;
  }, []);

  // If we don't have an order passed in, go back — do this after hooks are declared
  if (!order) {
    history.goBack();
    return null;
  }


  const status: WebOrderDeliveryStatus = order.deliveryStatus;
  const isCancelled = status === "cancelled" || status === "refund-initiated" || status === "refunded";
  const isDelivered = status === "delivered";
  const isOngoing   = !isCancelled && !isDelivered;

  const getStatusLabel = () => {
    if (status === "delivered")         return "Delivered";
    if (status === "cancelled")         return "Cancelled";
    if (status === "shipped")           return "Shipped";
    if (status === "refund-initiated")  return "Refund Initiated";
    if (status === "refunded")          return "Refunded";
    return "Ongoing";
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const token = await tokenStorage.getToken();
      await cancelWebOrder(token, order.id, cancelReason ?? "Cancelled by user");
      setShowCancelModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("[OrderDetailsShop] cancel error", err);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  // If we don't have an order passed in, go back — do this after hooks are declared
  if (!order) {
    history.goBack();
    return null;
  }

  // Address display helper
  const addr = order.shippingAddress;
  const addrLabel = addr
    ? `${addr.addressLine1}${addr.addressLine2 ? ", " + addr.addressLine2 : ""}, ${addr.city}, ${addr.emirates}, ${addr.country}`
    : null;
  const addrName = addr ? `${addr.firstName} ${addr.lastName}`.trim() : null;
  const addrPhone = addr?.phoneNumber ?? null;
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
            {/* ── TOP: Order ID + Status ── */}
            <div className={styles.TopContainer}>
              <div className={styles.OrderIdandStatus}>
                <div className={styles.OrderId}>
                  <p>Order ID - </p>
                  <h4>{order.displayId}</h4>
                </div>
                <div
                  className={`${styles.OrderStatus} 
    ${isCancelled ? styles.cancelledStatus : ""} 
    ${isDelivered ? styles.deliveredStatus : ""} 
    ${isOngoing ? styles.ongoingStatus : ""}`}
                >
                  <p>{getStatusLabel()}</p>
                  {isCancelled && (
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path
                        d="M0.75 8.6145L4.68225 4.68225L8.6145 8.6145M8.6145 0.75L4.6815 4.68225L0.75 0.75"
                        stroke="#E54842"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isDelivered && (
                    <svg width="14" height="14" viewBox="0 0 18 18">
                      <path
                        d="M3.75 10.875C3.75 10.875 4.875 10.875 6.375 13.5C6.375 13.5 10.5443 6.62475 14.25 5.25"
                        stroke="#6C7A5F"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isOngoing && (
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <circle cx="6" cy="6" r="5" stroke="#FFA500" strokeWidth="1.5" />
                    </svg>
                  )}
                </div>
              </div>
              <div className={styles.OrderDetails}>
                <div className={styles.OrderDetailsLeft}>
                  <p>Placed on </p>
                  <h4>- {order.placedAtLabel}</h4>
                </div>
                {(status === "refunded") && (
                  <div className={styles.OrderDetailsRight}>
                    <p>Refund processed</p>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path
                        d="M3.75 10.875C3.75 10.875 4.875 10.875 6.375 13.5C6.375 13.5 10.5443 6.62475 14.25 5.25"
                        stroke="#4B3827"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* ── MIDDLE: Delivery Address ── */}
            {addrName && (
              <div className={styles.MiddleContainer}>
                <h3>Delivery Address</h3>
                <div className={styles.Address}>
                  <p>{addrName}</p>
                  <h5>{addrLabel}</h5>
                  {addrPhone && <h3>Phone number : {addrPhone}</h3>}
                </div>
              </div>
            )}

            {/* ── BOTTOM: Order Summary ── */}
            <div className={styles.BottomContainer}>
              <h3>Order Summary</h3>
              <div className={styles.orderlisting}>
                {order.items.map((item, index) => (
                  <div key={index} className={styles.Item}>
                    <h4>
                      {item.productName}
                      {item.variantName ? `, ${item.variantName}` : ""}
                    </h4>
                    <p>{item.quantity}x</p>
                    <h6>AED {item.price.toFixed(2)}</h6>
                  </div>
                ))}
              </div>
              <div className={styles.ItemsTotal}>
                <div className={styles.calculationsConatiner}>
                  <div className={styles.itemsCoutnmoney}>
                    <h4>Item Total</h4>
                    <h4>AED {order.financials.subtotal.toFixed(2)}</h4>
                  </div>
                  {order.financials.shippingCharge > 0 && (
                    <div className={styles.taxesContainer}>
                      <h4>Shipping</h4>
                      <h4>AED {order.financials.shippingCharge.toFixed(2)}</h4>
                    </div>
                  )}
                  {order.financials.taxAmount > 0 && (
                    <div className={styles.taxesContainer}>
                      <h4>Taxes</h4>
                      <h4>AED {order.financials.taxAmount.toFixed(2)}</h4>
                    </div>
                  )}
                  {order.financials.wtCoinsDiscount > 0 && (
                    <div className={styles.CuponsConatiner}>
                      <div className={styles.Cupons}>
                        <h4>Beans Used</h4>
                      </div>
                      <h4>- AED {order.financials.wtCoinsDiscount.toFixed(2)}</h4>
                    </div>
                  )}
                  {order.financials.couponDiscount > 0 && (
                    <div className={styles.CuponsConatiner}>
                      <div className={styles.Cupons}>
                        <h4>Coupon Applied</h4>
                        {order.couponCode && <h4>"{order.couponCode}"</h4>}
                      </div>
                      <h4>- AED {order.financials.couponDiscount.toFixed(2)}</h4>
                    </div>
                  )}
                </div>
                <div className={styles.line}></div>
                <div className={styles.Total}>
                  <h4>Your total</h4>
                  <h5>AED {order.financials.total.toFixed(2)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>

      <IonFooter slot="fixed">
        <div className={styles.Footer}>
          {/* Cancel only when status is "placed" (not shipped/delivered/cancelled) */}
          {status === "placed" ? (
            <button
              className={styles.ReorderButton}
              onClick={() => setShowCancelModal(true)}
            >
              <p>Cancel Order</p>
            </button>
          ) : (
            <button
              className={styles.ReorderButton}
              disabled={isOngoing || reorderLoading}
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
              <p>Reorder</p>
            </button>
          )}
          {invoiceUrl ? (
            <a href={invoiceUrl} target="_blank" rel="noreferrer" className={styles.InvoiceButton}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.9974 14.1667V2.5M9.9974 14.1667L4.9974 9.16667M9.9974 14.1667L14.9974 9.16667M15.8307 17.5H4.16406"
                  stroke="#6C7A5F"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p>Invoice</p>
            </a>
          ) : (
            <button
              className={styles.InvoiceButton}
              onClick={() => alert("Invoice not available for this order.")}
              disabled={invoiceLoading}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.9974 14.1667V2.5M9.9974 14.1667L4.9974 9.16667M9.9974 14.1667L14.9974 9.16667M15.8307 17.5H4.16406"
                  stroke="#6C7A5F"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p>{invoiceLoading ? "Checking…" : "Invoice"}</p>
            </button>
          )}
        </div>
      </IonFooter>

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
      {showCancelModal && (
        <div className={styles.ModalOverlay} onClick={() => setShowCancelModal(false)}>
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
              <button className={styles.CancelNoBtn} onClick={() => setShowCancelModal(false)}>No</button>
              <button className={styles.CancelYesBtn} disabled={cancelling} onClick={handleCancel}>
                {cancelling ? "Cancelling…" : "Yes"}
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
            <button
              className={styles.SuccessDoneBtn}
              onClick={() => { setShowSuccessModal(false); history.goBack(); }}
            >
              Done
            </button>
          </div>
        </div>
      )}

    </IonPage>
  );
};

export default OrderDetailsShop;

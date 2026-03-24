import React, { useState, useRef, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import styles from "./StickOrderStatusBar.module.css";
import { cancelCafeOrder } from "../../../api/apiCafe";
import tokenStorage from "../../../utils/tokenStorage";

// Takeaway : field appOrderStatus
//   pending -> preparing -> pickup -> pickedup -> cancelled
// Dine-in  : field appOrderStatusDine
//   pending -> preparing -> readyToServe -> orderServed -> cancelled

type AppOrderStatus = string;
type OrderAcceptance = "accepted" | "pending" | string;
type OrderType = "take-away" | "dine-in";

interface ActiveOrder {
  orderId: string | number;
  orderType: OrderType;
}

// 3 dots on track, 6 visual positions:
//   0 ->  0% (dot 1)             Order Placed
//   1 -> 25% (between dot 1-2)   Order Accepted
//   2 -> 50% (dot 2)             Preparation Started
//   3 -> 75% (between dot 2-3)   Ready for Pickup / Ready to Serve
//   4 -> 100% (dot 3)            Order Completed / Order Served
function resolveStep(
  status: AppOrderStatus,
  acceptance: OrderAcceptance,
  orderType: OrderType
): number {
  if (orderType === "dine-in") {
    if (status === "completed") return 4;  // Order Served
    if (status === "ready")     return 3;  // Ready to Serve
    if (status === "preparing") return 2;  // Preparation Started
    if (acceptance === "accepted") return 1; // Order Accepted
    return 0;                              // Order Placed
  }
  // take-away � same values as dine-in
  if (status === "completed") return 4;   // Order Completed
  if (status === "ready")     return 3;   // Ready for Pickup
  if (status === "preparing") return 2;   // Preparation Started
  if (acceptance === "accepted") return 1; // Order Accepted
  return 0;                               // Order Placed
}

function resolveLabel(step: number, orderType: OrderType, status: AppOrderStatus): string {
  if (status === "cancelled") return "Order Cancelled";
  if (orderType === "dine-in") {
    return (["Order Placed!", "Order Accepted!", "Preparation Started!", "Ready to Serve!", "Order Served!"][step] ?? "Order Placed!");
  }
  return (["Order Placed!", "Order Accepted!", "Preparation Started!", "Ready for Pickup!", "Order Completed!"][step] ?? "Order Placed!");
}

const POLL_INTERVAL_MS = 2_000;
const LS_KEY = "active_cafe_order";
// Keep persisted active order for a reasonable time. If the app is backgrounded
// or the backend was down, we should not show a stale active order forever.
// Choose 24 hours as a conservative production TTL.
const PERSIST_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const StickOrderStatusBar = () => {
  const history = useHistory();

  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<AppOrderStatus>("pending");
  const [orderAcceptance, setOrderAcceptance] = useState<OrderAcceptance>("pending");
  const [orderId, setOrderId] = useState<string | number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [showSlightDelay, setShowSlightDelay] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // KEY FIX: store orderType in a ref so fetchStatus never reads a stale closure.
  // React setState is async � reading activeOrder?.orderType inside a useCallback
  // with deps=[orderId] always sees the initial null value. A ref is always current.
  const orderTypeRef = useRef<OrderType>("take-away");

  useEffect(() => {
    // Read on mount (handles page refresh / first load)
  const tryLoad = async () => {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      try {
       const parsed: ActiveOrder & { persistedAt?: number; userId?: string } = JSON.parse(raw);
// If the persisted entry is too old, clear it and don't resurrect the bar.
if (parsed.persistedAt && Date.now() - parsed.persistedAt > PERSIST_TTL_MS) {
  localStorage.removeItem(LS_KEY);
  return;
}
// If the order belongs to a different user, clear it.
const currentUserId = await tokenStorage.getItem("user_id");
if (parsed.userId && currentUserId && parsed.userId !== currentUserId) {
  localStorage.removeItem(LS_KEY);
  return;
}
orderTypeRef.current = parsed.orderType;
setActiveOrder(parsed);
setOrderId(parsed.orderId);
      } catch { /* ignore malformed */ }
    };

    tryLoad();

    // Listen for the custom same-tab event fired by Express.tsx right after
    // writing to localStorage (the native "storage" event only fires in OTHER tabs).
    const handleOrderPlaced = () => tryLoad();
    window.addEventListener("cafe_order_placed", handleOrderPlaced);

    // Also listen for the native storage event (other tabs / future proofing)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) tryLoad();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("cafe_order_placed", handleOrderPlaced);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const token = await tokenStorage.getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `JWT ${token}`;

      const res = await fetch(
        `https://endpoint.whitemantis.ae/api/app-orders/${orderId}`,
        { method: "GET", headers }
      );

      // If the resource is not found or explicitly removed, clear the persisted
      // active order. Treat 404/410 as terminal (order removed) and other 5xx
      // as transient (backend issue) so the bar can keep retrying.
      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          console.info("[StickBar] order not found (clearing persisted active order)", res.status);
          localStorage.removeItem(LS_KEY);
          setActiveOrder(null);
          setOrderId(null);
          return;
        }
        // For other non-ok statuses (e.g., 500), don't clear; let the next poll retry.
        console.warn("[StickBar] non-ok response while polling order status:", res.status);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const doc = data?.doc ?? data?.order ?? data ?? {};

      const acceptance: OrderAcceptance = doc?.orderAcceptance ?? "pending";

      // If admin has explicitly rejected the order (orderAcceptance === 'rejected')
      // treat it the same as a cancelled order on the client: navigate to the
      // OrderResult (cancel) screen and clear the active order state.
      if (acceptance === "rejected") {
        // Remove local storage flag so the bar doesn't reappear
        localStorage.removeItem(LS_KEY);
        try {
          // Attempt to hit the server cancel route so Stripe refund is triggered.
          // We don't block the UX on this — if it fails we log and still show the
          // cancelled screen to the user.
          const token = await tokenStorage.getToken();
          try {
            await cancelCafeOrder(token, orderId, "Order rejected by admin");
          } catch (err) {
            console.warn("StickBar: cancel endpoint failed for rejected order:", err);
          }

          history.push("/OrderResult", {
            orderId,
            orderType: orderTypeRef.current ?? "take-away",
            orderStatus: "cancelled",
          });
        } catch (e) {
          // history may not be usable in some test environments — ignore navigation errors
          console.warn("StickBar: navigation to OrderResult failed:", e);
        }
        setActiveOrder(null);
        setOrderId(null);
        return;
      }

      const isDineIn = orderTypeRef.current === "dine-in";
      const rawStatus: string = isDineIn
        ? (doc?.appOrderStatusDine ?? doc?.appOrderStatus ?? "pending")
        : (doc?.appOrderStatus ?? "pending");

      console.log(`[StickBar] type=${orderTypeRef.current} status=${rawStatus} acceptance=${acceptance}`);

      setOrderStatus(rawStatus);
      setOrderAcceptance(acceptance);

      // --- Slight Delay: if order is still pending acceptance 5+ minutes after
      // creation, show the 'Slight Delay' label in place of Order ID (design).
      try {
        const createdAt = doc?.createdAt ? new Date(doc.createdAt).getTime() : null;
        if (createdAt) {
          const ageMs = Date.now() - createdAt;
          // Only show the 'Slight Delay' UX for dine-in orders per product request.
          const isDineInOrder = orderTypeRef.current === "dine-in";
          const delayed = isDineInOrder && acceptance === "pending" && ageMs > 5 * 60 * 1000;
          setShowSlightDelay(Boolean(delayed));
        } else {
          setShowSlightDelay(false);
        }
      } catch {
        setShowSlightDelay(false);
      }

      // Remove from localStorage IMMEDIATELY on terminal so navigating away and
      // back does not re-show the bar with "pending" during the display window.
      const isTerminal =
        rawStatus === "completed" ||
        rawStatus === "cancelled";

      if (isTerminal) {
        localStorage.removeItem(LS_KEY);
        // "cancelled" auto-dismisses after 3s (the cancel flow also redirects).
        // "completed" stays visible until the user manually closes it via the ✕.
        if (rawStatus === "cancelled") {
          setTimeout(() => {
            setActiveOrder(null);
            setOrderId(null);
          }, 3000);
        }
        // For "completed" we do nothing here — the user closes it themselves.
      }
    } catch {
      console.warn("StickOrderStatusBar poll error:");
    }
  }, [orderId, history]); // orderId only — orderType is always fresh via ref

  useEffect(() => {
    if (!orderId) return;
    fetchStatus();
    const timer = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [orderId, fetchStatus]);

  // Re-check status when the app/tab becomes visible again. This handles the
  // case where the app was backgrounded and an order was removed while the
  // app wasn't active.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchStatus();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchStatus]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleConfirmCancel = async () => {
    if (!orderId) return;
    setCancelling(true);
    try {
  const token = await tokenStorage.getToken();
  await cancelCafeOrder(token, orderId, "Cancelled by user");
      localStorage.removeItem(LS_KEY);
      setShowCancelPopup(false);
      setActiveOrder(null);
      setOrderId(null);
      history.push("/OrderResult", {
        orderId,
        orderType: activeOrder?.orderType ?? "take-away",
        orderStatus: "cancelled",
      });
    } catch (e) {
      console.error("Cancel order failed:", e);
      // Even if the cancel endpoint fails (e.g., backend rejects refund),
      // still navigate to the OrderResult cancelled screen so the UX is
      // consistent for the user. The server-side refund handler will have
      // logged the reason; surface a console warning here.
      try {
        localStorage.removeItem(LS_KEY);
        setShowCancelPopup(false);
        setActiveOrder(null);
        setOrderId(null);
        history.push("/OrderResult", {
          orderId,
          orderType: activeOrder?.orderType ?? "take-away",
          orderStatus: "cancelled",
        });
      } catch (navErr) {
        console.warn("Failed to navigate after cancel error:", navErr);
      }
    }
  };

  if (!activeOrder || !orderId) return null;

  const step = resolveStep(orderStatus, orderAcceptance, activeOrder.orderType);
  const label = resolveLabel(step, activeOrder.orderType, orderStatus);

  const canCancel =
    orderAcceptance !== "accepted" &&
    orderStatus !== "cancelled" &&
    orderStatus !== "completed";

  const tickLeft =
    step === 0 ? "0%" :
    step === 1 ? "25%" :
    step === 2 ? "50%" :
    step === 3 ? "75%" : "100%";

  const tickTransform =
    step === 0 ? "translateX(0)" :
    step === 4 ? "translateX(-100%)" :
    "translateX(-50%)";

  return (
    <>
      {showCancelPopup && (
        <div className={styles.overlay} onClick={() => setShowCancelPopup(false)}>
          <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTexts}>
              <h3 className={styles.popupTitle}>Cancel order?</h3>
              <p className={styles.popupSubtitle}>Are you sure you want to cancel your order?</p>
            </div>
            <div className={styles.popupButtons}>
              <button className={styles.btnNo} onClick={() => setShowCancelPopup(false)}>No</button>
              <button className={styles.btnYes} onClick={handleConfirmCancel} disabled={cancelling}>
                {cancelling ? "..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.top}>
            <div className={styles.TopLeft}>
              <h3>{label}</h3>
              {showSlightDelay && orderAcceptance === "pending" ? (
                <h4 style={{
                  fontFamily: "Lato, sans-serif",
                  fontSize: "12px",
                  color: "#E54842",
                  margin: 0,
                }}>
                  Slight Delay
                </h4>
              ) : (
                <h4>Order ID - #{orderId}</h4>
              )}
            </div>

            <div className={styles.TopRight} ref={menuRef}>
              {orderStatus === "completed" ? (
                /* Order completed — show ✕ close button instead of the 3-dot menu */
                <div
                  onClick={() => { setActiveOrder(null); setOrderId(null); }}
                  className={styles.dots}
                  style={{ cursor: "pointer" }}
                >
                  <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z" fill="#4B3827"/>
                  </svg>
                </div>
              ) : (
                /* Normal state — show 3-dot menu */
                <div onClick={() => setShowMenu((p) => !p)} className={styles.dots}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="5" r="1.5" fill="#4B3827" />
                    <circle cx="12" cy="12" r="1.5" fill="#4B3827" />
                    <circle cx="12" cy="19" r="1.5" fill="#4B3827" />
                  </svg>
                </div>
              )}

              {showMenu && orderStatus !== "completed" && (
                <div className={styles.dropdown}>
                  <p
                    className={styles.menuItem}
                    onClick={() => {
                      setShowMenu(false);
                      history.push({
                        pathname: "/OrderDetailsCafe",
                        state: {
                          orderId,
                          orderType: activeOrder?.orderType ?? "take-away"
                        }
                      });
                    }}
                  >
                    View details
                  </p>
                  <p
                    className={!canCancel ? styles.menuItemMuted : ""}
                    onClick={() => {
                      if (!canCancel) return;
                      setShowMenu(false);
                      setShowCancelPopup(true);
                    }}
                  >
                    Cancel order
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.bottom}>
            <div className={styles.progressTrack}>
              <div className={styles.trackBase} />
              <div className={styles.trackFill} style={{ width: tickLeft }} />
              <div className={`${styles.fixedDot} ${styles.dot1} ${step >= 0 ? styles.dotPassed : ""}`} />
              <div className={`${styles.fixedDot} ${styles.dot2} ${step >= 2 ? styles.dotPassed : ""}`} />
              <div className={`${styles.fixedDot} ${styles.dot3} ${step >= 4 ? styles.dotPassed : ""}`} />
              <div className={styles.tickCircle} style={{ left: tickLeft, transform: tickTransform }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StickOrderStatusBar;

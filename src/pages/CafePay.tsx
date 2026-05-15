import React, { useEffect, useRef, useState } from "react";
import { IonContent, IonPage, useIonViewWillEnter } from "@ionic/react";
import { useLocation, useHistory } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import './Home.css'
import TopSection from "../components/CafePay/TopSection/TopSection";
import Express from "../components/CafePay/Express/Express";
import { CafeCheckoutItem, cafeCafeCheckout, patchOrderCustomizations } from "../api/apiCafe";
import { deductStampReward } from "../api/apiStamps";
import { getWebOrderById } from "../api/apiStoreOrders";
import tokenStorage from "../utils/tokenStorage";
import { useCart } from "../context/useCart";
import { useCheckout } from "../context/CafeCheckoutContext";

const isNative = Capacitor.isNativePlatform();
const CAFE_API = "https://endpoint.whitemantis.ae/api";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);


const SS_ORDER_FIRED   = "cafepay_order_fired";
const SS_CLIENT_SECRET = "cafepay_client_secret";
const SS_ORDER_ID      = "cafepay_order_id";

/** Everything PayContainer passes when navigating here */
export interface CafePayState {
  // All checkout fields needed for the single API call
  shopId              : number;
  orderType           : "take-away" | "dine-in";
  timeSelection       : "now" | "custom";
  selectedSlot        : number | null;
  useWTCoins          : boolean;
  specialInstructions : string;
  appliedCouponCode   : string | null;
  selectedBarista     : number | null;
  stampRewards        : unknown[];
  items               : CafeCheckoutItem[];
  // Display
  toPay               : number;
}

const CafePay: React.FC = () => {
  const location = useLocation<CafePayState>();
  const history = useHistory();
  const state = location.state ?? {} as CafePayState;

  const { clearCart } = useCart();
  const { reset, setAppliedCoupon } = useCheckout();


  const [clientSecret, setClientSecret] = useState<string | null>(
    () => sessionStorage.getItem(SS_CLIENT_SECRET)
  );
  const [orderId, setOrderId] = useState<string | number | null>(
    () => sessionStorage.getItem(SS_ORDER_ID)
  );
  const [isPreparing, setIsPreparing] = useState<boolean>(true);
  const effectiveClientSecret = isPreparing ? null : clientSecret;
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const hasFiredThisMount = useRef(false);

  // Native-only payment sheet state
  const [nativeState, setNativeState] = useState<"idle" | "presenting" | "canceled">("idle");
  const nativeSheetFired = useRef(false);

  const startCheckoutFlow = async () => {
    setIsPreparing(true);

    // Read BEFORE clearing — the guard must run first to prevent duplicate orders
    const existingFired  = sessionStorage.getItem(SS_ORDER_FIRED);
    const existingSecret = sessionStorage.getItem(SS_CLIENT_SECRET);
    const existingId     = sessionStorage.getItem(SS_ORDER_ID);

    if (existingFired === "1") {
      if (existingSecret) {
        // Order fully created — check if it was paid
        try {
          const token = await tokenStorage.getToken();
          const order = await getWebOrderById(token ?? null, existingId ?? "");
          if (order && order.paymentStatus === "completed") {
            // Paid — clear and fall through to create a fresh order
            sessionStorage.removeItem(SS_ORDER_FIRED);
            sessionStorage.removeItem(SS_CLIENT_SECRET);
            sessionStorage.removeItem(SS_ORDER_ID);
          } else {
            // Not paid — reuse
            setClientSecret(existingSecret);
            if (existingId) setOrderId(existingId);
            setIsPreparing(false);
            return;
          }
        } catch {
          // Backend unreachable — reuse to be safe
          setClientSecret(existingSecret);
          if (existingId) setOrderId(existingId);
          setIsPreparing(false);
          return;
        }
      } else {
        // SS_ORDER_FIRED = "1" but secret not stored yet — a concurrent
        // startCheckoutFlow call is mid-flight. Return to avoid firing a
        // second checkout request (causes duplicate order conflict).
        return;
      }
    } else {
      // No existing order session — clear stale keys and start fresh
      try {
        sessionStorage.removeItem(SS_CLIENT_SECRET);
        sessionStorage.removeItem(SS_ORDER_ID);
        sessionStorage.removeItem(SS_ORDER_FIRED);
      } catch (err) {
        console.warn("⚠️ failed to clear previous checkout session keys:", err);
      }
    }

    if (hasFiredThisMount.current) return;
    hasFiredThisMount.current = true;

    // Mark as fired immediately (before async) so any remount sees it.
    sessionStorage.setItem(SS_ORDER_FIRED, "1");

    const createOrder = async () => {
      try {
        const authToken = await tokenStorage.getToken();
        console.log("🔑 JWT token for this order:", authToken);
        const response = await cafeCafeCheckout(authToken, state);

        console.log("🛒 cafe-checkout response:", response);

        const secret =
          (response as Record<string, unknown>).clientSecret as string | undefined ??
          (response as Record<string, unknown>).client_secret as string | undefined;

        const id =
          response.orderId ??
          (response as Record<string, unknown>).dbOrderId ??
          (response.order as Record<string, unknown> | undefined)?.id ??
          (response.doc   as Record<string, unknown> | undefined)?.id ??
          response.id;

        console.log("🆔 resolved orderId:", id, "| raw response keys:", Object.keys(response as object));

        if (secret) {
          // Persist to sessionStorage so remounts don't re-fire
          sessionStorage.setItem(SS_CLIENT_SECRET, secret);
          setClientSecret(secret);
        } else {
          console.warn("⚠️ No clientSecret in response");
          // Clear the fired flag so user can retry if needed
          sessionStorage.removeItem(SS_ORDER_FIRED);
        }
        if (id) {
          sessionStorage.setItem(SS_ORDER_ID, String(id));
          setOrderId(id as string | number);

          const rewardsUsed = Array.isArray(state.stampRewards)
            ? (state.stampRewards as unknown[]).filter((v): v is number => typeof v === "number").length
            : 0;

          if (rewardsUsed > 0) {
            deductStampReward(authToken, id as string | number, rewardsUsed).catch((e) => {
              console.warn("⚙️ deductStampReward failed (non-fatal):", e);
            });
          }

          patchOrderCustomizations(
            authToken,
            id as string | number,
            state.items,

            Array.isArray(state.stampRewards)
              ? (state.stampRewards as unknown[]).filter((v): v is number => typeof v === "number")
              : [],
          ).catch((patchErr) => {
            // Non-fatal: display still works via cartSnapshot in OrderResultsDetail
            console.warn("⚙️ patchOrderCustomizations failed (non-fatal):", patchErr);
          });
        }
        setIsPreparing(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to create order";
        console.error("❌ cafe-checkout error:", msg);

        const isCouponError = /coupon/i.test(msg);
        if (isCouponError) {
          setAppliedCoupon(null);
          setCheckoutError("❌ Coupon error: " + msg + "\n\nThe coupon has been removed. Press \"Go Back & Fix\" to retry without it, or apply a different coupon.");
        } else {
          setCheckoutError(msg);
        }

        sessionStorage.removeItem(SS_ORDER_FIRED);
        hasFiredThisMount.current = false;
        setIsPreparing(false);
      }
    };

    // Start the async run
    void createOrder();
  };


  useIonViewWillEnter(() => {
    hasFiredThisMount.current = false;
    nativeSheetFired.current = false;
    setNativeState("idle");
    void startCheckoutFlow();
  });

  // On native: auto-present payment sheet as soon as clientSecret is ready
  useEffect(() => {
    if (!isNative || !effectiveClientSecret || nativeSheetFired.current) return;
    nativeSheetFired.current = true;
    void handleNativePayment(effectiveClientSecret);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClientSecret]);

  const handleNativePayment = async (secret: string) => {
    setNativeState("presenting");
    try {
      const { Stripe, PaymentSheetEventsEnum } = await import("@capacitor-community/stripe");
      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: secret,
        merchantDisplayName: "White Mantis",
        enableApplePay: true,
        applePayMerchantId: "merchant.com.whitemantis.app",
        enableGooglePay: true,
        GooglePayIsTesting: (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)?.startsWith("pk_test_") ?? true,
        countryCode: "AE",
      });
      const { paymentResult } = await Stripe.presentPaymentSheet();

      if (paymentResult === PaymentSheetEventsEnum.Completed) {
        const authToken = await tokenStorage.getToken();

        // Patch order payment status
        if (orderId) {
          try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (authToken) headers["Authorization"] = `JWT ${authToken}`;
            await fetch(`${CAFE_API}/app-orders/${orderId}`, {
              method: "PATCH",
              headers,
              body: JSON.stringify({ paymentStatus: "paid" }),
            });
          } catch { /* non-fatal */ }

          // Stamp reward notification
          try {
            const earnedStamps = parseInt(sessionStorage.getItem("cafe_earned_stamps") ?? "0", 10) || 0;
            const prevStampCount = parseInt(sessionStorage.getItem("cafe_stamp_count") ?? "0", 10) || 0;
            if (earnedStamps > 0) {
              const prevRewards = Math.floor(prevStampCount / 10);
              const newRewards  = Math.floor((prevStampCount + earnedStamps) / 10);
              if (newRewards > prevRewards) {
                const { appendNotifications } = await import("../api/apiCafeNotifications");
                await appendNotifications(authToken, [{
                  title           : "🎁 Free reward unlocked!",
                  description     : "You've earned a free reward! Head to the Rewards section to redeem it on your next order.",
                  origin          : "cafe",
                  notificationType: "reward",
                }]);
              }
            }
          } catch { /* non-fatal */ }

          // Persist active order for StickOrderStatusBar
          const currentUserId = await tokenStorage.getItem("user_id");
          localStorage.setItem("active_cafe_order", JSON.stringify({
            orderId,
            orderType : state.orderType ?? "take-away",
            persistedAt: Date.now(),
            userId    : currentUserId ?? undefined,
          }));
          window.dispatchEvent(new Event("cafe_order_placed"));
        }

        await handlePaymentSuccess();

        history.push("/OrderResult", {
          orderId,
          orderType  : state.orderType ?? "take-away",
          orderStatus: "succeeded",
          cartSnapshot: (() => {
            try {
              const raw = sessionStorage.getItem("cafe_cart_snapshot");
              return raw ? JSON.parse(raw) : undefined;
            } catch { return undefined; }
          })(),
        });
      } else if (paymentResult === PaymentSheetEventsEnum.Canceled) {
        setNativeState("canceled");
      } else {
        setCheckoutError("Payment failed. Please try again.");
      }
    } catch (e: unknown) {
      setCheckoutError(e instanceof Error ? e.message : "Payment failed. Please try again.");
    }
  };

  const retryNativePayment = () => {
    if (!effectiveClientSecret) return;
    nativeSheetFired.current = false;
    setNativeState("idle");
    void handleNativePayment(effectiveClientSecret);
  };

  const handlePaymentSuccess = async () => {
    // Clear sessionStorage keys for this payment session
    sessionStorage.removeItem(SS_ORDER_FIRED);
    sessionStorage.removeItem(SS_CLIENT_SECRET);
    sessionStorage.removeItem(SS_ORDER_ID);
    // Clear cart + reset checkout context
    try { await clearCart(); } catch { /* ignore */ }
    try { reset(); } catch { /* ignore */ }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <TopSection onBack={() => {
          // User pressed back — clear the session so next visit creates a fresh order
          sessionStorage.removeItem(SS_ORDER_FIRED);
          sessionStorage.removeItem(SS_CLIENT_SECRET);
          sessionStorage.removeItem(SS_ORDER_ID);
        }} />
        {checkoutError ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: "16px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FFF0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>❌</div>
            <p style={{ color: "#c0392b", fontSize: 14, fontFamily: "var(--lato)", margin: 0, lineHeight: 1.5 }}>{checkoutError}</p>
            <button
              onClick={() => {
                sessionStorage.removeItem(SS_ORDER_FIRED);
                sessionStorage.removeItem(SS_CLIENT_SECRET);
                sessionStorage.removeItem(SS_ORDER_ID);
                setAppliedCoupon(null);
                history.goBack();
              }}
              style={{ marginTop: 8, padding: "10px 28px", borderRadius: 8, border: "none", background: "#6C7A5F", color: "#fff", fontFamily: "var(--lato)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Go Back &amp; Fix
            </button>
          </div>
        ) : isNative ? (
          /* ── Native app: payment sheet is presented natively ── */
          nativeState === "canceled" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: "16px", textAlign: "center" }}>
              <p style={{ color: "#555", fontSize: 14, fontFamily: "var(--lato)", margin: 0 }}>
                Payment was cancelled.
              </p>
              <button
                onClick={retryNativePayment}
                style={{ padding: "12px 32px", borderRadius: 8, border: "none", background: "#6C7A5F", color: "#fff", fontFamily: "var(--lato)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem(SS_ORDER_FIRED);
                  sessionStorage.removeItem(SS_CLIENT_SECRET);
                  sessionStorage.removeItem(SS_ORDER_ID);
                  history.goBack();
                }}
                style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #6C7A5F", background: "transparent", color: "#6C7A5F", fontFamily: "var(--lato)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Go Back
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "16px" }}>
              <div style={{ width: 36, height: 36, border: "3px solid #e0e0e0", borderTop: "3px solid #6c7a5f", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
              <p style={{ color: "#6c7a5f", fontSize: 14, margin: 0, fontFamily: "var(--lato)" }}>Preparing payment…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )
        ) : effectiveClientSecret ? (
          /* ── Web: existing Stripe PaymentElement flow — unchanged ── */
          <Elements key={effectiveClientSecret ?? "preparing"} stripe={stripePromise} options={{ clientSecret: effectiveClientSecret ?? undefined }}>
            <Express
              toPay={state.toPay}
              orderId={orderId}
              orderType={state.orderType}
              onPaymentSuccess={handlePaymentSuccess}
            />
          </Elements>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "16px" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #e0e0e0", borderTop: "3px solid #6c7a5f", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
            <p style={{ color: "#6c7a5f", fontSize: 14, margin: 0, fontFamily: "var(--lato)" }}>Preparing payment…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default CafePay;

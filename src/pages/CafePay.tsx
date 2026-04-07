import React, { useEffect, useRef, useState } from "react";
import { IonContent, IonPage, useIonViewWillEnter } from "@ionic/react";
import { useLocation, useHistory } from "react-router-dom";
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

  const startCheckoutFlow = async () => {
    // Always show the preparing loader when entering the checkout screen.
    setIsPreparing(true);

    try {
      sessionStorage.removeItem(SS_CLIENT_SECRET);
      sessionStorage.removeItem(SS_ORDER_ID);
      sessionStorage.removeItem(SS_ORDER_FIRED);
    } catch (err) {
      console.warn("⚠️ failed to clear previous checkout session keys:", err);
    }
    // PaymentIntent is created for the next checkout attempt.
    if (sessionStorage.getItem(SS_ORDER_FIRED) === "1") {
      const existingOrderId = sessionStorage.getItem(SS_ORDER_ID);
      if (existingOrderId) {
        try {
          const token = await tokenStorage.getToken();
          const order = await getWebOrderById(token ?? null, existingOrderId);
          if (order && order.paymentStatus === "completed") {
            sessionStorage.removeItem(SS_ORDER_FIRED);
            sessionStorage.removeItem(SS_CLIENT_SECRET);
            sessionStorage.removeItem(SS_ORDER_ID);
          } else {
            // duplicate order.
            setIsPreparing(false);
            return;
          }
        } catch (err) {
          console.warn("⚠️ could not check existing cafe order status:", err);
          return;
        }
      } else {
        sessionStorage.removeItem(SS_ORDER_FIRED);
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
    void startCheckoutFlow();
  });


  useEffect(() => {
    return () => {

    };
  }, []);

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
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            gap: "16px",
            textAlign: "center",
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#FFF0F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}>❌</div>
            <p style={{
              color: "#c0392b",
              fontSize: 14,
              fontFamily: "var(--lato)",
              margin: 0,
              lineHeight: 1.5,
            }}>{checkoutError}</p>
            <button
              onClick={() => {
                // Clear sessionStorage guards so the next checkout attempt fires fresh
                sessionStorage.removeItem(SS_ORDER_FIRED);
                sessionStorage.removeItem(SS_CLIENT_SECRET);
                sessionStorage.removeItem(SS_ORDER_ID);
                // Clear the bad coupon from context so it's not re-sent
                setAppliedCoupon(null);
                history.goBack();
              }}
              style={{
                marginTop: 8,
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: "#6C7A5F",
                color: "#fff",
                fontFamily: "var(--lato)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go Back &amp; Fix
            </button>
          </div>
        ) : effectiveClientSecret ? (
          <Elements key={effectiveClientSecret ?? "preparing"} stripe={stripePromise} options={{ clientSecret: effectiveClientSecret ?? undefined }}>
            <Express
              toPay={state.toPay}
              orderId={orderId}
              orderType={state.orderType}
              onPaymentSuccess={handlePaymentSuccess}
            />
          </Elements>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 24px",
            gap: "16px",
          }}>
            <div style={{
              width: 36,
              height: 36,
              border: "3px solid #e0e0e0",
              borderTop: "3px solid #6c7a5f",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
            }} />
            <p style={{ color: "#6c7a5f", fontSize: 14, margin: 0, fontFamily: "var(--lato)" }}>
              Preparing payment…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default CafePay;

import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useHistory } from "react-router-dom";
import styles from "./Express.module.css";
import tokenStorage from "../../../utils/tokenStorage";
import { appendNotifications } from "../../../api/apiCafeNotifications";

const API_BASE = "https://whitemantis-app.vercel.app/api";

interface ExpressProps {
  toPay             ?: number;
  orderId           ?: string | number | null;
  orderType         ?: "take-away" | "dine-in";
  /** Called after payment is confirmed — clears cart + resets checkout context */
  onPaymentSuccess  ?: () => Promise<void>;
}

const Express: React.FC<ExpressProps> = ({ toPay, orderId, orderType, onPaymentSuccess }) => {
  const stripe   = useStripe();
  const elements = useElements();
  const history  = useHistory();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [paymentElementKey, setPaymentElementKey] = useState<number>(() => Date.now());

  const handleContinue = async () => {
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);

    try {
      // confirmPayment() collects card details from PaymentElement and
      // confirms the PaymentIntent whose clientSecret is in the <Elements> provider.
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Required by Stripe API — used for redirect-based methods (rare on mobile)
          return_url: window.location.origin + "/OrderResult",
        },
        // Handle result ourselves — don't auto-redirect
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message ?? "Payment failed. Please try again.");
        return;
      }

      const paymentIntent = result.paymentIntent;
      console.log("✅ Payment confirmed:", paymentIntent?.id, paymentIntent?.status);

      // ── Update paymentStatus to "paid" on the backend ──────────────────────
      if (orderId) {
        try {
          const token = await tokenStorage.getToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `JWT ${token}`;
          const patchRes = await fetch(`${API_BASE}/app-orders/${orderId}`, {
            method : "PATCH",
            headers,
            body   : JSON.stringify({ paymentStatus: "paid" }),
          });
          if (!patchRes.ok) {
            console.warn("⚠️ Failed to update paymentStatus:", patchRes.status);
          } else {
            console.log("✅ paymentStatus updated to 'paid' for order", orderId);
          }
        } catch (patchErr) {
          console.warn("⚠️ paymentStatus PATCH error (non-fatal):", patchErr);
        }
      }

      // ── Append stamp / reward notifications ────────────────────────────────
      // NOTE: Stamps are only actually awarded by the backend when the order
      // reaches "completed" status (not at payment time). But we know exactly
      // how many stamps WILL be earned (Cart.tsx saved it to sessionStorage).
      // So we notify the user now based on what they will earn.
      try {
        const token = await tokenStorage.getToken();
        // Cart.tsx saves earned stamp count to sessionStorage as "cafe_earned_stamps"
        const earnedStamps = parseInt(sessionStorage.getItem("cafe_earned_stamps") ?? "0", 10) || 0;
        // Cart.tsx also saves the current stamp count before this order
        const prevStampCount = parseInt(sessionStorage.getItem("cafe_stamp_count") ?? "0", 10) || 0;

        const notifItems: Array<{
          title: string;
          description: string;
          origin: "cafe" | "store";
          notificationType: "order" | "reward" | "general";
        }> = [];

        if (earnedStamps > 0) {
          // Check if this order will tip over a reward threshold (every 10 stamps = 1 reward)
          const prevRewards = Math.floor(prevStampCount / 10);
          const newRewards  = Math.floor((prevStampCount + earnedStamps) / 10);
          if (newRewards > prevRewards) {
            notifItems.push({
              title           : "🎁 Free reward unlocked!",
              description     : "You've earned a free reward! Head to the Rewards section to redeem it on your next order.",
              origin          : "cafe",
              notificationType: "reward",
            });
          }
        }

        if (notifItems.length > 0) {
          await appendNotifications(token, notifItems);
        }
      } catch (notifErr) {
        console.warn("⚠️ Stamp/reward notification failed (non-fatal):", notifErr);
      }

      // Clear cart + reset checkout context before navigating away
      if (onPaymentSuccess) await onPaymentSuccess();

      // Reset PaymentElement so if the user returns to pay again shortly the
      // card fields won't contain previous values.
      try {
        setPaymentElementKey(Date.now());
      } catch (err) {
        console.warn("Failed to reset Cafe PaymentElement key", err);
      }

      // Persist active order so StickOrderStatusBar can track it on Home
      if (orderId) {
        // Persist the active order with a timestamp so the UI can TTL stale entries.
        localStorage.setItem("active_cafe_order", JSON.stringify({
          orderId,
          orderType: orderType ?? "take-away",
          persistedAt: Date.now(),
        }));
        // Fire a same-tab event so StickOrderStatusBar picks it up immediately
        // (the native "storage" event only fires in OTHER browser tabs/windows)
        window.dispatchEvent(new Event("cafe_order_placed"));
      }

      history.push("/OrderResult", {
        orderId,
        orderType  : orderType ?? "take-away",
        orderStatus: paymentIntent?.status ?? "confirmed",
        // Pass cart snapshot so OrderResultsDetail can show customizations
        // even when the backend doesn't populate them in the stored order.
        cartSnapshot: (() => {
          try {
            const raw = sessionStorage.getItem("cafe_cart_snapshot");
            if (raw) return JSON.parse(raw);
          } catch { /* ignore */ }
          return undefined;
        })(),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      console.error("❌ Express handleContinue error:", msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.MainConatiner}>

        {/* ── Express / G Pay row ── */}
        <div className={styles.Top}>
          <h3>Express Checkout</h3>
          <button className={styles.GpayBtn}>
            <svg
              width="60"
              height="24"
              viewBox="0 0 60 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_4988_31214)">
                <path d="M42.5293 6.47785C44.1788 6.47785 45.4534 6.92949 46.4282 7.83279C47.4028 8.73596 47.8526 9.94032 47.8526 11.4457V18.6716H45.7533V17.0158H45.6783C44.7786 18.3708 43.504 19.0482 42.0045 19.0482C40.7298 19.0482 39.6052 18.6717 38.7055 17.9191C37.8807 17.1664 37.3559 16.1127 37.3559 14.9836C37.3559 13.7792 37.8057 12.8007 38.7055 12.048C39.6052 11.2953 40.8798 10.9942 42.3793 10.9942C43.7289 10.9942 44.7786 11.2201 45.6033 11.7469V11.2201C45.6033 10.5175 45.3421 9.81502 44.8195 9.35726L44.7035 9.26302C44.1038 8.73608 43.354 8.43502 42.5293 8.43502C41.2547 8.43502 40.28 8.96192 39.6052 10.0157L37.6559 8.81114C38.8554 7.23043 40.4299 6.47785 42.5293 6.47785ZM31.9576 1.35938C33.3029 1.35938 34.5814 1.82938 35.6037 2.70585L35.7814 2.86467C36.8311 3.76796 37.3559 5.1229 37.3559 6.55302C37.3559 7.98314 36.8311 9.26279 35.7814 10.2413C34.7318 11.2197 33.4571 11.7467 31.9576 11.7467L28.3588 11.6714V18.6716H26.1094V1.35938H31.9576ZM42.8291 12.8006C41.9294 12.8006 41.1797 13.0264 40.5799 13.478C39.9801 13.8543 39.6802 14.3811 39.6802 15.0586C39.6802 15.6608 39.9802 16.1876 40.4299 16.4888C40.9548 16.8651 41.5546 17.0909 42.1545 17.0909C42.9941 17.0909 43.8339 16.763 44.4907 16.1686L44.6286 16.0371C45.3784 15.3597 45.7533 14.5317 45.7533 13.6284C45.0785 13.1016 44.1038 12.8004 42.8292 12.8004M32.1077 3.46679H28.3589V9.48879H32.1077C32.9324 9.48879 33.7571 9.18773 34.282 8.58561C35.4816 7.45655 35.4816 5.57479 34.357 4.44561L34.282 4.37032C33.6821 3.7682 32.9324 3.39185 32.1076 3.46714M59.9988 6.8542L52.5762 23.9407H50.3269L53.1009 17.9943L48.2275 6.92949H50.6268L54.1506 15.435H54.2256L57.6745 6.92949H59.9988V6.8542Z" fill="#373835" />
                <path d="M19.4359 10.165C19.4359 9.48764 19.3609 8.81022 19.2859 8.13281H9.91406V11.9716H15.2373C15.0124 13.1759 14.3377 14.3049 13.288 14.9825V17.4663H16.512C18.3864 15.7352 19.436 13.1759 19.436 10.1652" fill="#4285F4" />
                <path d="M9.9175 19.8763C12.6166 19.8763 14.8659 18.973 16.5154 17.4676L13.2914 14.9837C12.3917 15.5858 11.267 15.9621 9.9175 15.9621C7.3682 15.9621 5.11891 14.231 4.36914 11.8223H1.07031V14.3814C2.79473 17.7686 6.16867 19.8763 9.9175 19.8763Z" fill="#34A853" />
                <path d="M4.36731 11.8218C3.91755 10.6175 3.91755 9.26265 4.36731 7.983V5.42383H1.06849C-0.356162 8.20889 -0.356162 11.5208 1.06849 14.381L4.36731 11.8218Z" fill="#FBBC04" />
                <path d="M9.91293 3.91816C11.3375 3.91816 12.687 4.4451 13.7368 5.42357L16.5858 2.56333C14.7863 0.907334 12.3871 -0.0711364 9.98781 0.00404006C6.23898 0.00404006 2.79016 2.11169 1.14062 5.49886L4.43957 8.05804C5.11434 5.64933 7.36363 3.91816 9.91293 3.91816Z" fill="#EA4335" />
              </g>
              <defs>
                <clipPath id="clip0_4988_31214">
                  <rect width="60" height="24" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </button>
        </div>

        <div className={styles.line} />

        {/* ── Payment details ── */}
        <div className={styles.Bottom}>
          <div className={styles.BottomTop}>
            <h4>Payment{toPay !== undefined ? ` — AED ${toPay.toFixed(2)}` : ""}</h4>
            <p>All transactions are secure and encrypted.</p>
          </div>

          {error && (
            <div className={styles.errorBanner}>{error}</div>
          )}

          {/* Stripe hosted Payment Element — renders card fields, wallets, etc. */}
          <PaymentElement key={paymentElementKey} />

          <button
            className={`${styles.PayBtn} ${isLoading ? styles.disabledBtn : ""}`}
            disabled={!stripe || !elements || isLoading}
            onClick={handleContinue}
          >
            {isLoading ? "Processing…" : "Continue"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Express;

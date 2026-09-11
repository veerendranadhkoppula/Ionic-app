import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useIonRouter } from "@ionic/react";
import styles from "./Express.module.css";

interface ExpressProps {
  toPay?: number;
  bookingId?: string | number | null;
  eventTitle?: string;
  guestAccessToken?: string | null;
}

const Express: React.FC<ExpressProps> = ({ toPay, bookingId, eventTitle, guestAccessToken }) => {
  const stripe = useStripe();
  const elements = useElements();
  const ionRouter = useIonRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/EventOrderResult",
        },
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message ?? "Payment failed. Please try again.");
        return;
      }

      // See CafePay.tsx / OrderResult.tsx for why this is
      // ionRouter.push("root","replace") + sessionStorage instead of
      // history.push(path, state) — the latter never cleared Ionic's own
      // internal navigation stack, so back-navigation from the results
      // screen would land back on this payment screen instead of Home.
      try {
        sessionStorage.setItem("eventpay_order_result", JSON.stringify({
          bookingId,
          eventTitle,
          guestAccessToken,
        }));
      } catch { /* non-fatal — EventOrderResult.tsx falls back gracefully */ }

      // Clear the checkout session keys now that this booking is paid —
      // otherwise the next visit to EventPay (for any event) would see
      // SS_BOOKING_FIRED still "1" and try to reuse this already-consumed
      // clientSecret instead of starting a fresh booking. The native path
      // in EventPay.tsx already does this; this was missed on the web path.
      sessionStorage.removeItem("eventpay_booking_fired");
      sessionStorage.removeItem("eventpay_client_secret");
      sessionStorage.removeItem("eventpay_booking_id");
      sessionStorage.removeItem("eventpay_guest_token");

      ionRouter.push("/EventOrderResult", "root", "replace");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.MainConatiner}>
        <div className={styles.Bottom}>
          <div className={styles.BottomTop}>
            <h4>Payment{toPay !== undefined ? ` — AED ${toPay.toFixed(2)}` : ""}</h4>
            <p>All transactions are secure and encrypted.</p>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <PaymentElement />

          <button
            className={`${styles.PayBtn} ${isLoading ? styles.disabledBtn : ""}`}
            disabled={!stripe || !elements || isLoading}
            onClick={handleContinue}
          >
            {isLoading ? "Processing…" : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Express;

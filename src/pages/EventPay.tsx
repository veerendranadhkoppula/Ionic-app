import React, { useEffect, useRef, useState } from "react";
import { IonContent, IonPage, useIonViewWillEnter, useIonRouter } from "@ionic/react";
import { useLocation, useHistory } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import "./Home.css";
import TopSection from "../components/EventPay/TopSection/TopSection";
import Express from "../components/EventPay/Express/Express";
import { getWorkshopById, type Workshop } from "../api/apiWorkshops";
import {
  type CoffeeExperience,
  getCoffeeExperienceById,
  findExperienceSlot,
  formatExperienceDateLabel,
  formatExperienceTimeRange,
} from "../api/apiCoffeeExperience";
import { eventCheckout } from "../api/apiEventCheckout";
import tokenStorage from "../utils/tokenStorage";
import { getCurrentUser } from "../utils/authStorage";

const isNative = Capacitor.isNativePlatform();

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

const SS_BOOKING_FIRED = "eventpay_booking_fired";
const SS_CLIENT_SECRET = "eventpay_client_secret";
const SS_BOOKING_ID = "eventpay_booking_id";
const SS_GUEST_TOKEN = "eventpay_guest_token";

interface EventPayState {
  eventId?: number | string;
  // Coffee Experience only — absent (undefined) means "workshop", the
  // original/default behavior. dateId/timeSlotId select which
  // availableDates/timeSlots row on the experience doc was booked.
  eventType?: "workshop" | "coffee-experience";
  dateId?: string;
  timeSlotId?: string;
}

const EventPay: React.FC = () => {
  const location = useLocation<EventPayState>();
  const history = useHistory();
  const ionRouter = useIonRouter();
  // Captured ONCE at mount rather than re-read from location.state on every
  // render. Root cause of the "lands back on /workshops instead of the
  // confirmation screen" bug: after a successful payment, Express.tsx calls
  // ionRouter.push("/EventOrderResult", "root", "replace") — which resets
  // Ionic's whole navigation stack. During that reset, this still-mounted
  // page's location.state can momentarily read as empty, which — when
  // eventId was re-derived live — made the "no eventId" effect below fire
  // history.replace("/workshops") in a race against the intended
  // navigation, and it sometimes won. Capturing eventId once removes the
  // race entirely: nothing here can invalidate it after mount.
  const [eventId] = useState<number | string | undefined>(
    () => location.state?.eventId
  );
  const [eventType] = useState<"workshop" | "coffee-experience">(
    () => location.state?.eventType || "workshop"
  );
  const [dateId] = useState<string | undefined>(() => location.state?.dateId);
  const [timeSlotId] = useState<string | undefined>(() => location.state?.timeSlotId);
  const isCoffeeExperience = eventType === "coffee-experience";

  const currentUser = getCurrentUser();
  const isGuest = !currentUser || currentUser.isGuest;

  const [event, setEvent] = useState<Workshop | CoffeeExperience | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Guest contact fields — collected before a booking is created, matching
  // the website's Contact section: email required, name/phone optional.
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [contactReady, setContactReady] = useState(!isGuest);
  const [contactError, setContactError] = useState<string | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(
    () => sessionStorage.getItem(SS_CLIENT_SECRET)
  );
  const [bookingId, setBookingId] = useState<string | number | null>(
    () => sessionStorage.getItem(SS_BOOKING_ID)
  );
  const [guestAccessToken, setGuestAccessToken] = useState<string | null>(
    () => sessionStorage.getItem(SS_GUEST_TOKEN)
  );
  const [isPreparing, setIsPreparing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const effectiveClientSecret = isPreparing ? null : clientSecret;

  const hasFiredThisMount = useRef(false);
  const [nativeState, setNativeState] = useState<"idle" | "presenting" | "canceled">("idle");
  const nativeSheetFired = useRef(false);

  // ── Load the event ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) {
      history.replace(isCoffeeExperience ? "/Experience" : "/workshops");
      return;
    }
    let cancelled = false;
    const loader = isCoffeeExperience ? getCoffeeExperienceById(eventId) : getWorkshopById(eventId);
    loader
      .then((doc) => {
        if (!cancelled) setEvent(doc);
      })
      .catch(() => {
        if (!cancelled) setLoadError("This event could not be found.");
      })
      .finally(() => {
        if (!cancelled) setLoadingEvent(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, isCoffeeExperience]);

  // Coffee Experience: the specific availableDates/timeSlots row this
  // booking is for — undefined for a workshop booking (fixed single date).
  const experienceSlot =
    isCoffeeExperience && event && dateId && timeSlotId
      ? findExperienceSlot(event as CoffeeExperience, dateId, timeSlotId)
      : null;

  const seatsRemaining = isCoffeeExperience
    ? experienceSlot
      ? Math.max(0, experienceSlot.slot.capacity - experienceSlot.slot.bookedCount)
      : 0
    : event
    ? Math.max(0, (Number((event as Workshop).capacity) || 0) - (Number((event as Workshop).bookedCount) || 0))
    : 0;

  const eventTitle = event?.title ?? "";
  const priceEach = event ? Number(event.price) || 0 : 0;

  // Same text/order the guest-contact preview always showed for a workshop
  // ("startDate · startTime") — coffee-experience resolves the equivalent
  // via the selected slot instead.
  const dateTimeLabel = isCoffeeExperience
    ? experienceSlot
      ? `${formatExperienceDateLabel(experienceSlot.dateEntry.date)} · ${formatExperienceTimeRange(
          experienceSlot.dateEntry.date,
          experienceSlot.slot.time
        )}`
      : ""
    : event
    ? `${(event as Workshop).startDate} · ${(event as Workshop).startTime}`
    : "";

  // Only Coffee Experience with allowMultipleSeats asks for a seat count —
  // Academy workshops stay fixed at 1 seat exactly as before.
  const needsSeatSelection = isCoffeeExperience && !!(event as CoffeeExperience | null)?.allowMultipleSeats;
  const [seats, setSeats] = useState(1);
  const [seatsConfirmed, setSeatsConfirmed] = useState(false);
  const maxSeats = needsSeatSelection
    ? Math.max(1, Math.min(seatsRemaining, (event as CoffeeExperience).maxSeatsPerBooking || 1))
    : 1;
  const seatsGateReady = !needsSeatSelection || seatsConfirmed;

  const startCheckoutFlow = async () => {
    if (!event) return;
    setIsPreparing(true);
    setCheckoutError(null);

    const existingFired = sessionStorage.getItem(SS_BOOKING_FIRED);
    if (existingFired === "1") {
      const existingSecret = sessionStorage.getItem(SS_CLIENT_SECRET);
      if (existingSecret) {
        setClientSecret(existingSecret);
        setBookingId(sessionStorage.getItem(SS_BOOKING_ID));
        setGuestAccessToken(sessionStorage.getItem(SS_GUEST_TOKEN));
        setIsPreparing(false);
        return;
      }
      // Fired flag set but secret not stored yet — a concurrent call is
      // mid-flight, avoid firing a duplicate booking request.
      return;
    }

    if (hasFiredThisMount.current) return;
    hasFiredThisMount.current = true;
    sessionStorage.setItem(SS_BOOKING_FIRED, "1");

    try {
      const token = await tokenStorage.getToken();
      const res = await eventCheckout(token, {
        eventId: event.id,
        eventType,
        // Academy is always single-seat (see WorkshopsSection.tsx); Coffee
        // Experience uses the seat count picked on the stepper below when
        // allowMultipleSeats is on, else also fixed at 1.
        seats: needsSeatSelection ? seats : 1,
        guestName: isGuest ? guestName.trim() || undefined : undefined,
        guestPhone: isGuest ? guestPhone.trim() || undefined : undefined,
        guestEmail: isGuest ? guestEmail.trim() || undefined : undefined,
        dateId: isCoffeeExperience ? dateId : undefined,
        timeSlotId: isCoffeeExperience ? timeSlotId : undefined,
      });

      if (!res.success || !res.clientSecret) {
        throw new Error(res.error || "Could not start checkout");
      }

      sessionStorage.setItem(SS_CLIENT_SECRET, res.clientSecret);
      setClientSecret(res.clientSecret);
      if (res.bookingId) {
        sessionStorage.setItem(SS_BOOKING_ID, String(res.bookingId));
        setBookingId(res.bookingId);
      }
      if (res.guestAccessToken) {
        sessionStorage.setItem(SS_GUEST_TOKEN, res.guestAccessToken);
        setGuestAccessToken(res.guestAccessToken);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create booking";
      setCheckoutError(msg);
      sessionStorage.removeItem(SS_BOOKING_FIRED);
      hasFiredThisMount.current = false;
    } finally {
      setIsPreparing(false);
    }
  };

  useIonViewWillEnter(() => {
    hasFiredThisMount.current = false;
    nativeSheetFired.current = false;
    setNativeState("idle");
    setSeatsConfirmed(false);
    setSeats(1);
  });

  // Start checkout once the event is loaded, seat count (if applicable) is
  // confirmed, and (for guests) contact info is ready.
  useEffect(() => {
    if (!event || !contactReady || !seatsGateReady || seatsRemaining === 0) return;
    void startCheckoutFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, contactReady, seatsGateReady, seatsRemaining]);

  // Native: auto-present payment sheet once the clientSecret is ready
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
        applePayMerchantId: "merchant.com.whitemantis.appname",
        enableGooglePay: true,
        GooglePayIsTesting: (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)?.startsWith("pk_test_") ?? true,
        countryCode: "AE",
      });
      const { paymentResult } = await Stripe.presentPaymentSheet();

      if (paymentResult === PaymentSheetEventsEnum.Completed) {
        try {
          sessionStorage.setItem("eventpay_order_result", JSON.stringify({
            bookingId,
            eventTitle,
            guestAccessToken,
          }));
        } catch { /* non-fatal */ }

        sessionStorage.removeItem(SS_BOOKING_FIRED);
        sessionStorage.removeItem(SS_CLIENT_SECRET);
        sessionStorage.removeItem(SS_BOOKING_ID);
        sessionStorage.removeItem(SS_GUEST_TOKEN);

        // See CafePay.tsx for why this is ionRouter.push("root","replace")
        // + sessionStorage instead of history.push(path, state).
        ionRouter.push("/EventOrderResult", "root", "replace");
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

  const clearSession = () => {
    sessionStorage.removeItem(SS_BOOKING_FIRED);
    sessionStorage.removeItem(SS_CLIENT_SECRET);
    sessionStorage.removeItem(SS_BOOKING_ID);
    sessionStorage.removeItem(SS_GUEST_TOKEN);
  };

  const submitContact = () => {
    setContactError(null);
    if (!guestEmail.trim()) {
      setContactError("Please enter your email to continue.");
      return;
    }
    setContactReady(true);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <TopSection onBack={clearSession} />

        {loadingEvent ? (
          <div style={centerBoxStyle}>
            <Spinner />
            <p style={mutedTextStyle}>Loading event…</p>
          </div>
        ) : loadError || !event ? (
          <div style={centerBoxStyle}>
            <p style={errorTextStyle}>{loadError || "Event not found."}</p>
          </div>
        ) : seatsRemaining === 0 ? (
          <div style={centerBoxStyle}>
            <p style={mutedTextStyle}>Sorry, this event is fully booked.</p>
          </div>
        ) : needsSeatSelection && !seatsConfirmed ? (
          /* ── Seat count — Coffee Experience only, allowMultipleSeats ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "27px 24px 32px 24px" }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 400, color: "#4b3827", fontFamily: "var(--lato)", margin: "0 0 4px" }}>
                {eventTitle}
              </h4>
              <p style={{ fontSize: 12, fontWeight: 400, color: "#6e736a", fontFamily: "var(--lato)", margin: 0 }}>
                {dateTimeLabel} &middot; AED {priceEach.toFixed(2)} / person
              </p>
            </div>

            <div style={seatStepperRowStyle}>
              <span style={{ fontFamily: "var(--lato)", fontSize: 14, color: "#4b3827" }}>Number of seats</span>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 14 }}>
                <button
                  type="button"
                  onClick={() => setSeats((s) => Math.max(1, s - 1))}
                  disabled={seats <= 1}
                  style={seatStepperBtnStyle}
                >
                  −
                </button>
                <span style={{ fontFamily: "var(--lato)", fontSize: 16, color: "#4b3827", minWidth: 20, textAlign: "center" }}>
                  {seats}
                </span>
                <button
                  type="button"
                  onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                  disabled={seats >= maxSeats}
                  style={seatStepperBtnStyle}
                >
                  +
                </button>
              </div>
            </div>

            <button onClick={() => setSeatsConfirmed(true)} style={payButtonStyle}>
              Continue &middot; AED {(priceEach * seats).toFixed(2)}
            </button>
          </div>
        ) : isGuest && !contactReady ? (
          /* ── Guest contact form — collected before creating the booking ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "27px 24px 32px 24px" }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 400, color: "#4b3827", fontFamily: "var(--lato)", margin: "0 0 4px" }}>
                {eventTitle}
              </h4>
              <p style={{ fontSize: 12, fontWeight: 400, color: "#6e736a", fontFamily: "var(--lato)", margin: 0 }}>
                {dateTimeLabel} &middot; AED {(priceEach * (needsSeatSelection ? seats : 1)).toFixed(2)}
                {needsSeatSelection ? ` · ${seats} seat${seats > 1 ? "s" : ""}` : ""}
              </p>
            </div>

            <input
              type="text"
              placeholder="Full name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={guestInputStyle}
            />
            <input
              type="email"
              placeholder="Email address"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              style={guestInputStyle}
            />
            <input
              type="tel"
              placeholder="Phone number (optional)"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              style={guestInputStyle}
            />

            {contactError && <p style={errorTextStyle}>{contactError}</p>}

            <button onClick={submitContact} style={payButtonStyle}>
              Continue to Payment
            </button>
          </div>
        ) : checkoutError ? (
          <div style={centerBoxStyle}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FFF0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>❌</div>
            <p style={errorTextStyle}>{checkoutError}</p>
            <button
              onClick={() => {
                clearSession();
                history.goBack();
              }}
              style={payButtonStyle}
            >
              Go Back
            </button>
          </div>
        ) : isNative ? (
          nativeState === "canceled" ? (
            <div style={centerBoxStyle}>
              <p style={mutedTextStyle}>Payment was cancelled.</p>
              <button onClick={retryNativePayment} style={payButtonStyle}>
                Try Again
              </button>
              <button
                onClick={() => {
                  clearSession();
                  history.goBack();
                }}
                style={outlineButtonStyle}
              >
                Go Back
              </button>
            </div>
          ) : (
            <div style={centerBoxStyle}>
              <Spinner />
              <p style={mutedTextStyle}>Preparing payment…</p>
            </div>
          )
        ) : effectiveClientSecret ? (
          <Elements key={effectiveClientSecret} stripe={stripePromise} options={{ clientSecret: effectiveClientSecret }}>
            <Express
              toPay={priceEach * (needsSeatSelection ? seats : 1)}
              bookingId={bookingId}
              eventTitle={eventTitle}
              guestAccessToken={guestAccessToken}
            />
          </Elements>
        ) : (
          <div style={centerBoxStyle}>
            <Spinner />
            <p style={mutedTextStyle}>Preparing payment…</p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

const Spinner = () => (
  <>
    <div style={{ width: 36, height: 36, border: "3px solid #e0e0e0", borderTop: "3px solid #6c7a5f", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </>
);

const centerBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 24px",
  gap: 16,
  textAlign: "center",
};

const mutedTextStyle: React.CSSProperties = {
  color: "#6e736a",
  fontSize: 14,
  margin: 0,
  fontFamily: "var(--lato)",
};

const errorTextStyle: React.CSSProperties = {
  color: "#c0392b",
  fontSize: 14,
  fontFamily: "var(--lato)",
  margin: 0,
  lineHeight: 1.5,
};

const payButtonStyle: React.CSSProperties = {
  padding: "10px 10px",
  width: "100%",
  borderRadius: 8,
  border: "1px solid #6c7a5f",
  background: "#6C7A5F",
  color: "#fff",
  fontFamily: "var(--lato)",
  fontSize: 16,
  fontWeight: 500,
  cursor: "pointer",
};

const outlineButtonStyle: React.CSSProperties = {
  padding: "10px 28px",
  borderRadius: 8,
  border: "1px solid #6C7A5F",
  background: "transparent",
  color: "#6C7A5F",
  fontFamily: "var(--lato)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const seatStepperRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  border: "1px solid #4B382740",
  borderRadius: 12,
  padding: "12px 16px",
};

const seatStepperBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid #6C7A5F",
  background: "transparent",
  color: "#6C7A5F",
  fontSize: 16,
  fontFamily: "var(--lato)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const guestInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #4B382740",
  fontFamily: "var(--lato)",
  fontSize: 14,
  color: "#4B3827",
  background: "transparent",
  boxSizing: "border-box",
};

export default EventPay;

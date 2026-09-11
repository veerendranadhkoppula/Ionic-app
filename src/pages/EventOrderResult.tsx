import React, { useEffect, useRef, useState } from "react";
import { IonContent, IonPage, useIonRouter } from "@ionic/react";
import { useHistory } from "react-router-dom";
import { App } from "@capacitor/app";
import styles from "./EventOrderResult.module.css";
import tickicon from "../components/OrderResults/OrderResultsTop/tick.png";
import { getEventBookingById, type EventBookingDetail } from "../api/apiEventCheckout";
import { findExperienceSlot, formatExperienceDateLabel, formatExperienceTimeRange } from "../api/apiCoffeeExperience";
import tokenStorage from "../utils/tokenStorage";

const SS_EVENT_ORDER_RESULT = "eventpay_order_result";

interface EventOrderResultState {
  bookingId?: string | number;
  eventTitle?: string;
  guestAccessToken?: string | null;
}

function formatDateStr(val?: string) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTimeStr(val?: string) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

const EventOrderResult: React.FC = () => {
  const history = useHistory();
  const ionRouter = useIonRouter();
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  const [state] = useState<EventOrderResultState>(() => {
    try {
      const raw = sessionStorage.getItem(SS_EVENT_ORDER_RESULT);
      sessionStorage.removeItem(SS_EVENT_ORDER_RESULT);
      if (raw) return JSON.parse(raw) as EventOrderResultState;
    } catch { /* fall through */ }
    return {};
  });

  const [booking, setBooking] = useState<EventBookingDetail | null>(null);

  useEffect(() => {
    if (!state.bookingId) return;
    let cancelled = false;
    (async () => {
      const token = await tokenStorage.getToken();
      const detail = await getEventBookingById(token, state.bookingId!, state.guestAccessToken);
      if (!cancelled) setBooking(detail);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bookingId]);

  // Always go Home on hardware back — same as OrderResult.tsx
  useEffect(() => {
    const setup = async () => {
      listenerRef.current = await App.addListener("backButton", () => {
        ionRouter.push("/home", "root", "replace");
      });
    };
    setup();
    return () => {
      listenerRef.current?.remove();
    };
  }, [ionRouter]);

  const handleClose = () => {
    history.replace("/Home");
  };

  const event = booking?.event?.value;
  const displayId = state.bookingId ? `#WMEVT${state.bookingId}` : null;

  // Coffee Experience bookings have no fixed eventDate/eventTime on the doc
  // itself — the raw event doc's availableDates/timeSlots (same shape the
  // backend serves for the experience collection) are indexed by the
  // booking's own selectedDateId/selectedTimeSlotId instead.
  const isCoffeeExperienceBooking = booking?.event?.relationTo === "coffee-experience";
  const experienceSlot =
    isCoffeeExperienceBooking && event && booking?.selectedDateId && booking?.selectedTimeSlotId
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        findExperienceSlot(event as any, booking.selectedDateId, booking.selectedTimeSlotId)
      : null;

  const eventDateTimeText = isCoffeeExperienceBooking
    ? experienceSlot
      ? `${formatExperienceDateLabel(experienceSlot.dateEntry.date)} · ${formatExperienceTimeRange(
          experienceSlot.dateEntry.date,
          experienceSlot.slot.time
        )}`
      : ""
    : `${formatDateStr(event?.eventDate)} · ${formatTimeStr(event?.eventTime)}`;

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <div className={styles.main}>
          <div className={styles.MainConatiner}>
            <div className={styles.Top} onClick={handleClose}>
              <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
                  fill="white"
                />
              </svg>
            </div>

            <div className={styles.Bottom}>
              <div className={styles.StatusBadge}>
                <img src={tickicon} alt="status" className={styles.TickIcon} />
              </div>
              <div className={styles.OrderStatusText}>
                <h3>Booking Confirmed!</h3>
                <p>{state.eventTitle || "Your seat is booked"}</p>
              </div>
              {displayId && (
                <div className={styles.OrderIdRow}>
                  <span className={styles.OrderIdText}>Booking ID: {displayId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {booking && (
          <div className={styles.Details}>
            {event && (
              <div className={styles.EventCard}>
                <h4>{event.title}</h4>
                <p>{eventDateTimeText}</p>
              </div>
            )}
            <div className={styles.DetailsRow}>
              <span>Seats</span>
              <strong>{booking.seats}</strong>
            </div>
            <div className={styles.DetailsRow}>
              <span>Total Paid</span>
              <strong>AED {Number(booking.amountPaid || 0).toFixed(2)}</strong>
            </div>
            <p className={styles.EmailNote}>
              A confirmation email with a calendar invite has been sent to your inbox.
            </p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default EventOrderResult;

import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import styles from "./BookingWidget.module.css";
import {
  type CoffeeExperience,
  combineUtcDayWithTime,
  formatExperienceTime24,
} from "../../../api/apiCoffeeExperience";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function isoDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatDayLabel(key: string): string {
  const [y, m, day] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

interface GridCell {
  key: string;
  day: number;
  inMonth: boolean;
}

function buildMonthGrid(year: number, month: number): GridCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells: GridCell[] = [];
  const cursor = new Date(Date.UTC(year, month, 1 - firstWeekday));
  for (let i = 0; i < totalCells; i++) {
    cells.push({
      key: isoDayKey(cursor),
      day: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() === month,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cells;
}

interface SlotWithMeta {
  id: string;
  time: string;
  remaining: number;
  isPast: boolean;
}

interface DateMetaEntry {
  dateId: string;
  slots: SlotWithMeta[];
  bookableSlots: SlotWithMeta[];
}

interface BookingWidgetProps {
  experience: CoffeeExperience;
}

const BookingWidget: React.FC<BookingWidgetProps> = ({ experience }) => {
  const history = useHistory();

  const [viewYear, setViewYear] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<number | null>(null);
  const [step, setStep] = useState<"calendar" | "slots">("calendar");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null);

  const dateMeta = useMemo(() => {
    const now = Date.now();
    const meta: Record<string, DateMetaEntry> = {};
    for (const entry of experience.availableDates) {
      if (!entry.date) continue;
      const key = isoDayKey(new Date(entry.date));
      const slots: SlotWithMeta[] = entry.timeSlots.map((s) => {
        const start = combineUtcDayWithTime(entry.date, s.time);
        return {
          id: s.id,
          time: s.time,
          remaining: Math.max(0, s.capacity - s.bookedCount),
          isPast: start.getTime() < now,
        };
      });
      meta[key] = {
        dateId: entry.id,
        slots,
        bookableSlots: slots.filter((s) => !s.isPast && s.remaining > 0),
      };
    }
    return meta;
  }, [experience]);

  const sortedKeys = useMemo(() => Object.keys(dateMeta).sort(), [dateMeta]);
  const bookableKeys = useMemo(
    () => sortedKeys.filter((k) => dateMeta[k].bookableSlots.length > 0),
    [sortedKeys, dateMeta],
  );

  useEffect(() => {
    if (viewYear !== null || sortedKeys.length === 0) return;
    const anchorKey = bookableKeys[0] || sortedKeys[0];
    const [y, m] = anchorKey.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedKeys, bookableKeys]);

  const monthBounds = useMemo(() => {
    if (sortedKeys.length === 0) return null;
    const toIdx = (k: string) => {
      const [y, m] = k.split("-").map(Number);
      return y * 12 + (m - 1);
    };
    const idxs = sortedKeys.map(toIdx);
    return { min: Math.min(...idxs), max: Math.max(...idxs) };
  }, [sortedKeys]);

  if (sortedKeys.length === 0) {
    return (
      <div className={styles.main}>
        <p className={styles.Heading}>Select Date &amp; Time</p>
        <div className={styles.CalendarBox}>
          <p className={styles.EmptyState}>No dates are currently open for booking.</p>
        </div>
      </div>
    );
  }

  const currentIdx = viewYear !== null ? viewYear * 12 + (viewMonth ?? 0) : null;
  const canGoPrev = !!monthBounds && currentIdx !== null && currentIdx > monthBounds.min;
  const canGoNext = !!monthBounds && currentIdx !== null && currentIdx < monthBounds.max;

  const goPrevMonth = () => {
    if (!canGoPrev || viewYear === null || viewMonth === null) return;
    const idx = viewYear * 12 + viewMonth - 1;
    setViewYear(Math.floor(idx / 12));
    setViewMonth(((idx % 12) + 12) % 12);
  };

  const goNextMonth = () => {
    if (!canGoNext || viewYear === null || viewMonth === null) return;
    const idx = viewYear * 12 + viewMonth + 1;
    setViewYear(Math.floor(idx / 12));
    setViewMonth(((idx % 12) + 12) % 12);
  };

  const grid = viewYear !== null && viewMonth !== null ? buildMonthGrid(viewYear, viewMonth) : [];
  const selectedMeta = selectedDateKey ? dateMeta[selectedDateKey] : null;

  const goToCheckout = () => {
    if (!selectedMeta || !selectedTimeSlotId) return;
    history.push("/EventPay", {
      eventId: experience.id,
      eventType: "coffee-experience",
      dateId: selectedMeta.dateId,
      timeSlotId: selectedTimeSlotId,
    });
  };

  return (
    <div className={styles.main}>
      <p className={styles.Heading}>Select Date &amp; Time</p>

      {step === "calendar" ? (
        <div className={styles.Body}>
          <div className={styles.CalendarBox}>
            <div className={styles.CalendarHeader}>
              <button
                type="button"
                className={styles.ArrowBtn}
                onClick={goPrevMonth}
                disabled={!canGoPrev}
                aria-label="Previous month"
              >
                {canGoPrev ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M10.3862 9.89228L7.1715 6.67756C7.02038 6.52644 6.94482 6.3341 6.94482 6.10056C6.94482 5.86701 7.02038 5.67467 7.1715 5.52355C7.32262 5.37243 7.51496 5.29688 7.7485 5.29688C7.98205 5.29688 8.17439 5.37243 8.32551 5.52355L12.1172 9.31528C12.1997 9.39771 12.258 9.487 12.2924 9.58317C12.3267 9.67934 12.3439 9.78237 12.3439 9.89228C12.3439 10.0022 12.3267 10.1052 12.2924 10.2014C12.258 10.2976 12.1997 10.3868 12.1172 10.4693L8.32551 14.261C8.17439 14.4121 7.98205 14.4877 7.7485 14.4877C7.51496 14.4877 7.32262 14.4121 7.1715 14.261C7.02038 14.1099 6.94482 13.9175 6.94482 13.684C6.94482 13.4505 7.02038 13.2581 7.1715 13.107L10.3862 9.89228Z"
                      fill="#6E736A"
                    />
                  </svg>
                ) : (
                  <svg width="7" height="16" viewBox="0 0 7 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M6.56498 0.847402L1.12298 7.1974C1.04551 7.28797 1.00294 7.40322 1.00294 7.5224C1.00294 7.64158 1.04551 7.75683 1.12298 7.8474L6.56498 14.1974C6.61193 14.2465 6.64839 14.3047 6.67212 14.3683C6.69585 14.432 6.70636 14.4998 6.703 14.5677C6.69964 14.6355 6.68249 14.702 6.65259 14.763C6.62269 14.824 6.58067 14.8783 6.52909 14.9225C6.47751 14.9668 6.41747 15 6.35261 15.0203C6.28776 15.0405 6.21945 15.0473 6.15188 15.0403C6.0843 15.0333 6.01886 15.0125 5.95956 14.9794C5.90026 14.9462 5.84835 14.9013 5.80698 14.8474L0.363976 8.4984C0.129309 8.22739 0.000143051 7.8809 0.000143051 7.5224C0.000143051 7.16391 0.129309 6.81742 0.363976 6.5464L5.80698 0.1974C5.84835 0.143503 5.90026 0.0986032 5.95956 0.0654402C6.01886 0.0322771 6.0843 0.0115499 6.15188 0.00451946C6.21945 -0.00251102 6.28776 0.00430393 6.35261 0.0245504C6.41747 0.0447969 6.47751 0.0780497 6.52909 0.122277C6.58067 0.166505 6.62269 0.220779 6.65259 0.281789C6.68249 0.342798 6.69964 0.409261 6.703 0.47712C6.70636 0.54498 6.69585 0.612811 6.67212 0.676475C6.64839 0.740138 6.61193 0.798298 6.56498 0.847402Z"
                      fill="#2F362A"
                      fillOpacity="0.3"
                    />
                  </svg>
                )}
              </button>

              <p className={styles.MonthLabel}>
                {viewYear !== null && viewMonth !== null ? monthLabel(viewYear, viewMonth) : ""}
              </p>

              <button
                type="button"
                className={styles.ArrowBtn}
                onClick={goNextMonth}
                disabled={!canGoNext}
                aria-label="Next month"
              >
                {canGoNext ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9.39667 9.89228L12.6114 6.67756C12.7625 6.52644 12.8381 6.3341 12.8381 6.10056C12.8381 5.86701 12.7625 5.67467 12.6114 5.52355C12.4603 5.37243 12.2679 5.29688 12.0344 5.29688C11.8008 5.29688 11.6085 5.37243 11.4574 5.52355L7.66567 9.31528C7.58324 9.39771 7.52485 9.487 7.49051 9.58317C7.45616 9.67934 7.43899 9.78237 7.43899 9.89228C7.43899 10.0022 7.45616 10.1052 7.49051 10.2014C7.52485 10.2976 7.58324 10.3868 7.66567 10.4693L11.4574 14.261C11.6085 14.4121 11.8008 14.4877 12.0344 14.4877C12.2679 14.4877 12.4603 14.4121 12.6114 14.261C12.7625 14.1099 12.8381 13.9175 12.8381 13.684C12.8381 13.4505 12.7625 13.2581 12.6114 13.107L9.39667 9.89228Z"
                      fill="#6E736A"
                    />
                  </svg>
                ) : (
                  <svg
                    width="7"
                    height="16"
                    viewBox="0 0 7 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: "scaleX(-1)" }}
                  >
                    <path
                      d="M6.56498 0.847402L1.12298 7.1974C1.04551 7.28797 1.00294 7.40322 1.00294 7.5224C1.00294 7.64158 1.04551 7.75683 1.12298 7.8474L6.56498 14.1974C6.61193 14.2465 6.64839 14.3047 6.67212 14.3683C6.69585 14.432 6.70636 14.4998 6.703 14.5677C6.69964 14.6355 6.68249 14.702 6.65259 14.763C6.62269 14.824 6.58067 14.8783 6.52909 14.9225C6.47751 14.9668 6.41747 15 6.35261 15.0203C6.28776 15.0405 6.21945 15.0473 6.15188 15.0403C6.0843 15.0333 6.01886 15.0125 5.95956 14.9794C5.90026 14.9462 5.84835 14.9013 5.80698 14.8474L0.363976 8.4984C0.129309 8.22739 0.000143051 7.8809 0.000143051 7.5224C0.000143051 7.16391 0.129309 6.81742 0.363976 6.5464L5.80698 0.1974C5.84835 0.143503 5.90026 0.0986032 5.95956 0.0654402C6.01886 0.0322771 6.0843 0.0115499 6.15188 0.00451946C6.21945 -0.00251102 6.28776 0.00430393 6.35261 0.0245504C6.41747 0.0447969 6.47751 0.0780497 6.52909 0.122277C6.58067 0.166505 6.62269 0.220779 6.65259 0.281789C6.68249 0.342798 6.69964 0.409261 6.703 0.47712C6.70636 0.54498 6.69585 0.612811 6.67212 0.676475C6.64839 0.740138 6.61193 0.798298 6.56498 0.847402Z"
                      fill="#2F362A"
                      fillOpacity="0.3"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className={styles.WeekRow}>
              {WEEKDAY_LABELS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className={styles.DayGrid}>
              {grid.map((cell) => {
                const meta = dateMeta[cell.key];
                const isBookable = cell.inMonth && !!meta && meta.bookableSlots.length > 0;
                const isSelected = cell.key === selectedDateKey;
                const cls = [
                  styles.DayCell,
                  isBookable ? styles.DayCellBookable : styles.DayCellMuted,
                  isSelected ? styles.DaySelected : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    type="button"
                    key={`${cell.key}-${cell.inMonth ? "in" : "out"}`}
                    className={cls}
                    disabled={!isBookable}
                    onClick={() => setSelectedDateKey(cell.key)}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.NextRow}>
            <button
              type="button"
              className={styles.NextBtn}
              disabled={!selectedMeta}
              onClick={() => setStep("slots")}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.Body}>
          <div className={`${styles.CalendarBox} ${styles.CalendarBoxSlots}`}>
            <p className={styles.SelectedDateLabel}>
              {selectedDateKey ? formatDayLabel(selectedDateKey) : ""}
            </p>
            <div className={styles.SlotsGrid}>
              {selectedMeta?.bookableSlots.map((slot) => (
                <button
                  type="button"
                  key={slot.id}
                  className={`${styles.SlotBtn} ${selectedTimeSlotId === slot.id ? styles.SlotBtnSelected : ""}`}
                  onClick={() => setSelectedTimeSlotId(slot.id)}
                >
                  {formatExperienceTime24(slot.time)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.StepFooterRow}>
            <button
              type="button"
              className={styles.BackBtn}
              onClick={() => {
                setStep("calendar");
                setSelectedTimeSlotId(null);
              }}
              aria-label="Back to calendar"
            >
              <svg width="31" height="33" viewBox="0 0 31 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="29.7035" height="32" rx="7.5" stroke="#3C4350" strokeOpacity="0.2" />
                <path
                  d="M18.565 9.82396L13.123 16.174C13.0455 16.2645 13.0029 16.3798 13.0029 16.499C13.0029 16.6181 13.0455 16.7334 13.123 16.824L18.565 23.174C18.6119 23.2231 18.6484 23.2812 18.6721 23.3449C18.6959 23.4086 18.7064 23.4764 18.703 23.5442C18.6996 23.6121 18.6825 23.6786 18.6526 23.7396C18.6227 23.8006 18.5807 23.8549 18.5291 23.8991C18.4775 23.9433 18.4175 23.9766 18.3526 23.9968C18.2878 24.0171 18.2195 24.0239 18.1519 24.0168C18.0843 24.0098 18.0189 23.9891 17.9596 23.9559C17.9003 23.9228 17.8483 23.8779 17.807 23.824L12.364 17.475C12.1293 17.2039 12.0001 16.8575 12.0001 16.499C12.0001 16.1405 12.1293 15.794 12.364 15.523L17.807 9.17396C17.8483 9.12007 17.9003 9.07517 17.9596 9.042C18.0189 9.00884 18.0843 8.98811 18.1519 8.98108C18.2195 8.97405 18.2878 8.98087 18.3526 9.00111C18.4175 9.02136 18.4775 9.05461 18.5291 9.09884C18.5807 9.14307 18.6227 9.19734 18.6526 9.25835C18.6825 9.31936 18.6996 9.38582 18.703 9.45368C18.7064 9.52154 18.6959 9.58937 18.6721 9.65304C18.6484 9.7167 18.6119 9.77486 18.565 9.82396Z"
                  fill="#2F362A"
                  fillOpacity="0.3"
                />
              </svg>
            </button>
            <button
              type="button"
              className={styles.NextBtn}
              disabled={!selectedTimeSlotId}
              onClick={goToCheckout}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingWidget;

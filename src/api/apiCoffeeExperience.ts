/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = "https://endpoint.whitemantis.ae/api";
const DUBAI_TZ = "Asia/Dubai";

export interface ExperienceTimeSlot {
  id: string;
  time: string;
  capacity: number;
  bookedCount: number;
}

export interface ExperienceDate {
  id: string;
  date: string;
  timeSlots: ExperienceTimeSlot[];
}

export interface AboutSessionDetail {
  label: string;
  value: string;
}

export interface CoffeeExperience {
  id: number;
  title: string;
  shortDescription: string;
  heroImage: string;
  price: number;
  allowMultipleSeats: boolean;
  maxSeatsPerBooking: number;
  availableDates: ExperienceDate[];
  aboutSession: {
    image: string;
    details: AboutSessionDetail[];
  };
  whoIsItFor: { icon: string; title: string }[];
  whatYoullExperience: {
    description: string;
    points: { title: string; description: string }[];
  };
  everySessionIsDifferent: { description: string; image: string };
  fromTheRoastery: string[];
  faqs: { question: string; answer: string }[];
}

function normImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://endpoint.whitemantis.ae${url}`;
}

function mapExperienceDoc(d: any): CoffeeExperience {
  return {
    id: d.id,
    title: d.title ?? "",
    shortDescription: d.shortDescription ?? "",
    heroImage: normImageUrl(d.heroImage?.url ?? null),
    price: Number(d.price) || 0,
    allowMultipleSeats: !!d.allowMultipleSeats,
    maxSeatsPerBooking: Number(d.maxSeatsPerBooking) || 6,
    availableDates: (d.availableDates || []).map((dt: any) => ({
      id: dt.id,
      date: dt.date,
      timeSlots: (dt.timeSlots || []).map((s: any) => ({
        id: s.id,
        time: s.time,
        capacity: Number(s.capacity) || 0,
        bookedCount: Number(s.bookedCount) || 0,
      })),
    })),
    aboutSession: {
      image: normImageUrl(d.aboutSession?.image?.url ?? null),
      details: (d.aboutSession?.details || []).map((r: any) => ({
        label: r.label,
        value: r.value,
      })),
    },
    whoIsItFor: (d.whoIsItFor || []).map((r: any) => ({ icon: r.icon, title: r.title })),
    whatYoullExperience: {
      description: d.whatYoullExperience?.description ?? "",
      points: (d.whatYoullExperience?.points || []).map((p: any) => ({
        title: p.title,
        description: p.description,
      })),
    },
    everySessionIsDifferent: {
      description: d.everySessionIsDifferent?.description ?? "",
      image: normImageUrl(d.everySessionIsDifferent?.image?.url ?? null),
    },
    fromTheRoastery: (d.fromTheRoastery || []).map((img: any) => normImageUrl(img?.url ?? null)),
    faqs: (d.faqs || []).map((f: any) => ({ question: f.question, answer: f.answer })),
  };
}

export async function getActiveCoffeeExperience(): Promise<CoffeeExperience | null> {
  const params = new URLSearchParams({
    "where[isActive][equals]": "true",
    limit: "1",
  });
  const res = await fetch(`${API_BASE}/coffee-experience?${params.toString()}`, { method: "GET" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const doc = data?.docs?.[0];
  if (!doc) return null;
  return mapExperienceDoc(doc);
}

export async function getCoffeeExperienceById(id: string | number): Promise<CoffeeExperience | null> {
  const res = await fetch(`${API_BASE}/coffee-experience/${id}`, { method: "GET" });
  if (!res.ok) return null;
  const doc = await res.json().catch(() => null);
  if (!doc || doc.id === undefined) return null;
  return mapExperienceDoc(doc);
}

/** Finds a specific date+timeSlot pair on an already-fetched experience —
 * mirrors the backend's own findExperienceSlot (coffeeExperienceSlots.ts) and
 * the website's identical helper, so "is this slot bookable" agrees
 * everywhere. */
export function findExperienceSlot(
  experience: CoffeeExperience,
  dateId: string,
  timeSlotId: string,
): { dateEntry: ExperienceDate; slot: ExperienceTimeSlot } | null {
  const dateEntry = experience.availableDates.find((d) => String(d.id) === String(dateId));
  if (!dateEntry) return null;
  const slot = dateEntry.timeSlots.find((s) => String(s.id) === String(timeSlotId));
  if (!slot) return null;
  return { dateEntry, slot };
}

// Day comes from the UTC components of `date`; time-of-day is shown fixed to
// the venue's own timezone (Dubai) regardless of the visitor's own device —
// same convention as the website (SessionBooking.jsx / event-checkout).
export function formatExperienceDateLabel(dateIso: string): string {
  const d = new Date(dateIso);
  const dayOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return dayOnly.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatExperienceShortDateLabel(dateIso: string): string {
  const d = new Date(dateIso);
  const dayOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return dayOnly.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatExperienceTimeLabel(timeIso: string): string {
  const d = new Date(timeIso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: DUBAI_TZ });
}

// 24-hour "HH:mm" — used specifically by the app's time-slot buttons
// (design shows "12:00" / "13:30", no AM/PM). formatExperienceTimeLabel
// above (12-hour) stays as-is for every other surface (hero badges, etc.).
export function formatExperienceTime24(timeIso: string): string {
  const d = new Date(timeIso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: DUBAI_TZ });
}

// The real bookable instant for a slot — day from the UTC components of
// `date`, hour/minute from the UTC components of `time`. Kept here once
// rather than re-implemented per component (this exact "copied logic drifts
// apart" mistake is why eventSeats.ts on the backend keeps its own
// shared-helper comment) — used to sort/filter slots and to build the
// "X:XX AM - Y:YY AM" range shown on the hero card.
export function combineUtcDayWithTime(dateIso: string, timeIso: string): Date {
  const d = new Date(dateIso);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const t = new Date(timeIso);
  start.setUTCHours(t.getUTCHours(), t.getUTCMinutes(), 0, 0);
  return start;
}

// Sessions run 1 hour — same assumption already used by the backend's .ics
// calendar invite generator (generateIcs.ts).
export function formatExperienceTimeRange(dateIso: string, timeIso: string): string {
  const start = combineUtcDayWithTime(dateIso, timeIso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: DUBAI_TZ });
  return `${fmt(start)} - ${fmt(end)}`;
}

/** The earliest still-bookable (not sold out, not already passed) date +
 * time slot across the whole experience — used for the hero card's
 * "next available" badge when there are many possible dates. */
export function findEarliestBookableSlot(
  experience: CoffeeExperience,
): { date: string; time: string } | null {
  const now = Date.now();
  let best: { date: string; time: string } | null = null;
  let bestInstant = Infinity;

  for (const d of experience.availableDates) {
    for (const s of d.timeSlots) {
      const remaining = s.capacity - s.bookedCount;
      if (remaining <= 0) continue;
      const instant = combineUtcDayWithTime(d.date, s.time).getTime();
      if (instant < now) continue;
      if (instant < bestInstant) {
        bestInstant = instant;
        best = { date: d.date, time: s.time };
      }
    }
  }
  return best;
}

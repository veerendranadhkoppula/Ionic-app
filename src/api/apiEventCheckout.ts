/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = "https://endpoint.whitemantis.ae/api";

export interface EventCheckoutPayload {
  eventId: number | string;
  eventType: "workshop" | "coffee-experience";
  seats: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  // Coffee Experience only — which availableDates/timeSlots row was picked.
  dateId?: string;
  timeSlotId?: string;
}

export interface EventCheckoutResponse {
  success: boolean;
  clientSecret?: string;
  bookingId?: number | string;
  guestAccessToken?: string;
  error?: string;
}

export async function eventCheckout(
  token: string | null,
  payload: EventCheckoutPayload,
): Promise<EventCheckoutResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  const res = await fetch(`${API_BASE}/checkout/event-checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("❌ event-checkout failed. Status:", res.status, "| Body:", JSON.stringify(data));
    throw new Error(data?.error || `Checkout failed (${res.status})`);
  }

  return data as EventCheckoutResponse;
}

export interface EventBookingDetail {
  id: number | string;
  seats: number;
  amountPaid: number;
  paymentStatus: string;
  bookingStatus: string;
  // Coffee Experience only — which availableDates/timeSlots row this
  // booking is for. Blank for Academy workshop bookings (fixed date).
  selectedDateId?: string;
  selectedTimeSlotId?: string;
  event?: {
    relationTo: "workshop" | "coffee-experience";
    // Shape depends on relationTo: workshop has a fixed eventDate/eventTime;
    // coffee-experience has availableDates that selectedDateId/
    // selectedTimeSlotId index into (see apiCoffeeExperience.ts).
    value: any;
  };
}

export async function getEventBookingById(
  token: string | null,
  id: string | number,
  guestToken?: string | null,
): Promise<EventBookingDetail | null> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `JWT ${token}`;

  const params = new URLSearchParams({ depth: "2" });
  if (guestToken) params.set("token", guestToken);

  const res = await fetch(`${API_BASE}/event-bookings/${id}?${params.toString()}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as EventBookingDetail | null;
}

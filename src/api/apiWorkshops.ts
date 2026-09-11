/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = "https://endpoint.whitemantis.ae/api";

export interface Workshop {
  id: number;
  title: string;
  image: string;
  startDate: string;
  startTime: string;
  calendlyLink: string;
  slug: string;
  description: string;
  price: number;
  capacity: number;
  bookedCount: number;
}

function normImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://endpoint.whitemantis.ae${url}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function mapWorkshopDoc(d: any): Workshop {
  return {
    id: d.id,
    title: d.title ?? "",
    image: normImageUrl(
      d.workshopImage?.url ?? d.workshopImage?.thumbnailURL ?? null
    ),
    startDate: formatDate(d.eventDate ?? d.updatedAt ?? null),
    startTime: formatTime(d.eventTime ?? d.eventDate ?? null),
    calendlyLink: d.calendyLink ?? d.calendlyLink ?? "",
    slug: d.slug ?? String(d.id),
    description: d.workshopDescription ?? "",
    price: Number(d.price) || 0,
    capacity: Number(d.capacity) || 0,
    bookedCount: Number(d.bookedCount) || 0,
  };
}


export async function getWorkshops(): Promise<Workshop[]> {
  const now = new Date();
  // Same-day-but-already-passed events were previously still shown as
  // "upcoming" here — the filter only checked eventDate >= today, not the
  // time. Matches the website's UpComing.jsx filter: eventDate in the
  // future OR (eventDate is today AND eventTime hasn't passed yet).
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const nowISO = now.toISOString();

  const params = new URLSearchParams({
    "where[or][0][eventDate][greater_than]": today,
    "where[or][1][and][0][eventDate][equals]": today,
    "where[or][1][and][1][eventTime][greater_than]": nowISO,
    limit: "50",
    depth: "1",
    sort: "eventDate",
  });

  const res = await fetch(`${API_BASE}/workshop?${params.toString()}`, {
    method: "GET",
  });

  if (!res.ok) throw new Error(`Workshops fetch failed: ${res.status}`);

  const data = await res.json();
  const docs: any[] = data?.docs ?? [];
  return docs.map(mapWorkshopDoc);
}

export async function getWorkshopById(id: string | number): Promise<Workshop | null> {
  const res = await fetch(`${API_BASE}/workshop/${id}`, { method: "GET" });
  if (!res.ok) return null;
  const doc = await res.json().catch(() => null);
  if (!doc || doc.id === undefined) return null;
  return mapWorkshopDoc(doc);
}

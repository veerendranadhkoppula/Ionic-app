/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = "https://whitemantis-app.vercel.app/api";

// ── Workshops ─────────────────────────────────────────────────────────────────

export interface Workshop {
  id: number;
  title: string;
  image: string;
  startDate: string;   // formatted e.g. "13 Mar, 2026"
  startTime: string;   // formatted e.g. "9:30 PM"
  calendlyLink: string;
  slug: string;
}

function normImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://whitemantis-app.vercel.app${url}`;
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
  };
}

/**
 * Fetch all upcoming workshops (eventDate >= now).
 */
export async function getWorkshops(): Promise<Workshop[]> {
  const now = new Date().toISOString();
  const params = new URLSearchParams({
    "where[eventDate][greater_than_equal]": now,
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

/**
 * apiStoreNotifications.ts
 *
 * Same behaviour as apiCafeNotifications but filters origin === 'store'
 */
const API_BASE = "https://endpoint.whitemantis.ae/api";
import tokenStorage from "../utils/tokenStorage";

export type NotificationType =
  | "order"
  | "reward"
  | "general";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  origin: "cafe" | "store";
  createdAt: string;
}

function authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `JWT ${token}`;
  return h;
}

function resolveType(raw: string): NotificationType {
  const lower = raw.toLowerCase();
  if (lower === "order") return "order";
  if (lower === "reward") return "reward";
  return "general";
}

function unwrapDoc(doc: Record<string, unknown>, filterOrigin?: "cafe" | "store"): AppNotification[] {
  const docId = String(doc.id ?? "");
  const docDate = String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString());
  const items = Array.isArray(doc.notifications) ? (doc.notifications as Record<string, unknown>[]) : [];

  return items
    .filter((item) => {
      if (!filterOrigin) return true;
      return String(item.origin ?? "").toLowerCase() === filterOrigin;
    })
    .map((item, idx) => ({
      id: `${docId}_${idx}`,
      title: String(item.title ?? ""),
      message: String(item.description ?? item.message ?? ""),
      type: resolveType(String(item.notificationType ?? "general")),
      origin: (String(item.origin ?? "store").toLowerCase()) as "cafe" | "store",
      createdAt: String((item as Record<string, unknown>).createdAt ?? docDate),
    }));
}

export async function getNotifications(token: string | null): Promise<AppNotification[]> {
  if (!token) return [];

  let userId: string | null = null;
  try {
    const meRes = await fetch(`${API_BASE}/users/me`, { method: "GET", headers: authHeaders(token) });
    if (meRes.ok) {
      const meData = await meRes.json().catch(() => null);
      const rawId = meData?.user?.id ?? meData?.id ?? null;
      if (rawId != null) userId = String(rawId);
    }
  } catch { /* ignore */ }

  if (!userId) userId = await tokenStorage.getItem("user_id").catch(() => null);

  const url = userId
    ? `${API_BASE}/notifications?where[user][equals]=${userId}&limit=1&depth=0`
    : `${API_BASE}/notifications?limit=1&depth=0`;

  const res = await fetch(url, { method: "GET", headers: authHeaders(token) });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ docs: [] }));
  const docs: Record<string, unknown>[] = Array.isArray(data.docs) ? data.docs : [];
  const all: AppNotification[] = docs.flatMap((doc) => unwrapDoc(doc, "store"));
  return all;
}

export async function getNotificationDocId(token: string | null): Promise<string | null> {
  let userId: string | null = null;
  try {
    const meRes = await fetch(`${API_BASE}/users/me`, { method: "GET", headers: authHeaders(token) });
    if (meRes.ok) {
      const meData = await meRes.json().catch(() => null);
      const rawId = meData?.user?.id ?? meData?.id ?? null;
      if (rawId != null) userId = String(rawId);
    }
  } catch { /* ignore */ }
  if (!userId) userId = await tokenStorage.getItem("user_id").catch(() => null);

  const url = userId
    ? `${API_BASE}/notifications?where[user][equals]=${userId}&limit=1&depth=0`
    : `${API_BASE}/notifications?limit=1&depth=0`;

  const res = await fetch(url, { method: "GET", headers: authHeaders(token) });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({ docs: [] }));
  const doc = data?.docs?.[0];
  return doc ? String(doc.id) : null;
}

export async function clearAllNotifications(token: string | null, docId: string): Promise<void> {
  await fetch(`${API_BASE}/notifications/${docId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ notifications: [] }),
  });
}

export async function appendNotifications(
  token: string | null,
  items: Array<{
    title: string;
    description: string;
    origin: "cafe" | "store";
    notificationType: NotificationType;
  }>,
): Promise<void> {
  if (!token || items.length === 0) return;
  let userId: string | null = null;
  try {
    const meRes = await fetch(`${API_BASE}/users/me`, { method: "GET", headers: authHeaders(token) });
    if (meRes.ok) {
      const meData = await meRes.json().catch(() => null);
      const rawId = meData?.user?.id ?? meData?.id ?? null;
      if (rawId != null) userId = String(rawId);
    }
  } catch { /* ignore */ }
  if (!userId) userId = await tokenStorage.getItem("user_id").catch(() => null);

  const getUrl = userId
    ? `${API_BASE}/notifications?where[user][equals]=${userId}&limit=1&depth=0`
    : `${API_BASE}/notifications?limit=1&depth=0`;

  const getRes = await fetch(getUrl, { method: "GET", headers: authHeaders(token) });
  if (!getRes.ok) return;
  const getData = await getRes.json().catch(() => ({ docs: [] }));
  const doc = Array.isArray(getData.docs) && getData.docs.length > 0 ? (getData.docs[0] as Record<string, unknown>) : null;
  if (!doc) return;

  const docId = String(doc.id ?? "");
  const existingItems = Array.isArray(doc.notifications) ? (doc.notifications as Record<string, unknown>[]) : [];

  await fetch(`${API_BASE}/notifications/${docId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ notifications: [...existingItems, ...items] }),
  });
}

export async function registerFcmToken(token: string | null, fcmToken: string): Promise<void> {
  // Resolve user id then PATCH /users/:id
  try {
    let userId: string | null = null;
    try {
      const meRes = await fetch(`${API_BASE}/users/me`, { method: "GET", headers: authHeaders(token) });
      if (meRes.ok) {
        const meData = await meRes.json().catch(() => null);
        const rawId = meData?.user?.id ?? meData?.id ?? null;
        if (rawId != null) userId = String(rawId);
      }
    } catch { /* ignore */ }
    if (!userId) userId = await tokenStorage.getItem("user_id").catch(() => null);
    if (!userId) throw new Error("Could not resolve userId for store.registerFcmToken");

    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ pushToken: fcmToken }),
    });

    try {
      const text = await res.text();
      console.log("[API] store.registerFcmToken status:", res.status, "body:", text);
    } catch {
      console.log("[API] store.registerFcmToken status:", res.status, "(no body)");
    }

    if (!res.ok) throw new Error(`store.registerFcmToken failed with status ${res.status}`);
  } catch (err) {
    console.warn("[API] store.registerFcmToken error:", err);
    throw err;
  }
}

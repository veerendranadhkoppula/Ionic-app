
const API_BASE = "https://endpoint.whitemantis.ae/api";
import tokenStorage from "../utils/tokenStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "order"
  | "reward"
  | "general";

export interface AppNotification {
  id          : string;   // parent doc id + array index  e.g.  "abc123_0"
  title       : string;
  message     : string;  // maps from "description"
  type        : NotificationType;
  origin      : "cafe" | "store";
  createdAt   : string;  // parent doc createdAt (best we have per-notification)
}


function authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `JWT ${token}`;
  return h;
}

function resolveType(raw: string): NotificationType {
  const lower = raw.toLowerCase();
  if (lower === "order")  return "order";
  if (lower === "reward") return "reward";
  return "general";
}


function unwrapDoc(
  doc: Record<string, unknown>,
  filterOrigin?: "cafe" | "store",
): AppNotification[] {
  const docId    = String(doc.id ?? "");
  // Use updatedAt as the timestamp — it reflects when the last notification was added
  const docDate  = String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString());
  const items    = Array.isArray(doc.notifications)
    ? (doc.notifications as Record<string, unknown>[])
    : [];

  return items
    .filter((item) => {
      if (!filterOrigin) return true;
      return String(item.origin ?? "").toLowerCase() === filterOrigin;
    })
    .map((item, idx) => ({
      id        : `${docId}_${idx}`,
      title     : String(item.title       ?? ""),
      message   : String(item.description ?? item.message ?? ""),
      type      : resolveType(String(item.notificationType ?? "general")),
      origin    : (String(item.origin ?? "cafe").toLowerCase()) as "cafe" | "store",
      // Use per-item createdAt if present (future-proof), fall back to doc updatedAt
      createdAt : String((item as Record<string, unknown>).createdAt ?? docDate),
    }));
}


export async function getNotifications(token: string | null): Promise<AppNotification[]> {
  console.log("[Notif] getNotifications called, token present:", !!token);
  if (!token) {
    console.warn("[Notif] No token — aborting");
    return [];
  }

  // Step 1: Get the current user's ID from /api/users/me (most reliable source)
  let userId: string | null = null;
  try {
    const meRes = await fetch(`${API_BASE}/users/me`, {
      method: "GET",
      headers: authHeaders(token),
    });
    console.log("[Notif] /users/me status:", meRes.status);
    if (meRes.ok) {
      const meData = await meRes.json().catch(() => null);
      console.log("[Notif] /users/me response:", JSON.stringify(meData));
      // PayloadCMS returns { user: { id } } or just { id } depending on version
      const rawId = meData?.user?.id ?? meData?.id ?? null;
      console.log("[Notif] Resolved userId from /me:", rawId);
      if (rawId != null) {
        userId = String(rawId);
      }
    }
  } catch (e) {
    console.warn("[Notif] /users/me fetch error:", e);
  }

  // Step 2: Fall back to tokenStorage if /me failed
  if (!userId) {
    userId = await tokenStorage.getItem("user_id").catch(() => null);
    console.log("[Notif] userId from tokenStorage fallback:", userId);
  }

  // Step 3: Fetch the notification doc
  const url = userId
    ? `${API_BASE}/notifications?where[user][equals]=${userId}&limit=1&depth=0`
    : `${API_BASE}/notifications?limit=1&depth=0`;

  console.log("[Notif] Fetching URL:", url);
  const res = await fetch(url, { method: "GET", headers: authHeaders(token) });

  console.log("[Notif] Notification fetch status:", res.status);
  if (!res.ok) {
    console.warn("[Notif] Fetch failed with status:", res.status);
    return [];
  }

  const data = await res.json().catch(() => ({ docs: [] }));
  console.log("[Notif] Raw API response:", JSON.stringify(data));
  const docs: Record<string, unknown>[] = Array.isArray(data.docs) ? data.docs : [];
  console.log("[Notif] Number of docs returned:", docs.length);

  if (docs.length > 0) {
    console.log("[Notif] First doc notifications array:", JSON.stringify((docs[0] as Record<string, unknown>).notifications));
  }

  // Each doc = one user's notification record — unwrap inner array, filter by cafe
  const all: AppNotification[] = docs.flatMap((doc) => unwrapDoc(doc, "cafe"));
  console.log("[Notif] Final notifications after unwrap+filter:", all.length, all);
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
  const doc  = data?.docs?.[0];
  return doc ? String(doc.id) : null;
}


export async function clearAllNotifications(
  token : string | null,
  docId : string,
): Promise<void> {
  await fetch(`${API_BASE}/notifications/${docId}`, {
    method  : "PATCH",
    headers : authHeaders(token),
    body    : JSON.stringify({ notifications: [] }),
  });
}

/**
 * @deprecated  no per-item read flag.
 * Kept so use clearAllNotifications() instead.
 */
export async function markNotificationRead(): Promise<void> {
}

export async function appendNotifications(
  token : string | null,
  items : Array<{
    title            : string;
    description      : string;
    origin           : "cafe" | "store";
    notificationType : NotificationType;
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
  if (!getRes.ok) {
    console.warn("[appendNotifications] Could not fetch notification doc:", getRes.status);
    return;
  }
  const getData = await getRes.json().catch(() => ({ docs: [] }));
  const doc = Array.isArray(getData.docs) && getData.docs.length > 0
    ? (getData.docs[0] as Record<string, unknown>)
    : null;

  if (!doc) {
    console.warn("[appendNotifications] No notification doc found for user", userId);
    return;
  }

  const docId            = String(doc.id ?? "");
  const existingItems    = Array.isArray(doc.notifications)
    ? (doc.notifications as Record<string, unknown>[])
    : [];

 
  const patchRes = await fetch(`${API_BASE}/notifications/${docId}`, {
    method  : "PATCH",
    headers : authHeaders(token),
    body    : JSON.stringify({ notifications: [...existingItems, ...items] }),
  });

  if (patchRes.ok) {
    console.log("[appendNotifications] Successfully appended", items.length, "notification(s)");
  } else {
    console.warn("[appendNotifications] PATCH failed:", patchRes.status);
  }
}


export async function registerFcmToken(
  token     : string | null,
  fcmToken  : string,
): Promise<void> {
 
  try {
    let userId: string | null = null;
    try {
      const meRes = await fetch(`${API_BASE}/users/me`, { method: "GET", headers: authHeaders(token) });
      if (meRes.ok) {
        const meData = await meRes.json().catch(() => null);
        const rawId = meData?.user?.id ?? meData?.id ?? null;
        if (rawId != null) userId = String(rawId);
      }
    } catch (e) {
      console.warn('[API] registerFcmToken: /users/me fetch failed', e);
    }

    if (!userId) {
      // Try tokenStorage fallback
      userId = await tokenStorage.getItem("user_id").catch(() => null);
    }

    if (!userId) {
      throw new Error("Could not resolve userId for registerFcmToken");
    }

    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ pushToken: fcmToken }),
    });

    try {
      const text = await res.text();
      console.log("[API] registerFcmToken status:", res.status, "body:", text);
    } catch {
      console.log("[API] registerFcmToken status:", res.status, "(no body)");
    }

    if (!res.ok) {
      throw new Error(`registerFcmToken failed with status ${res.status}`);
    }
  } catch (err) {
    console.warn("[API] registerFcmToken error:", err);
    throw err;
  }
}


export async function unregisterFcmToken(
  token: string | null,
): Promise<void> {
  // Resolve user id then PATCH the user document to clear pushToken
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
  if (!userId) return;

  await fetch(`${API_BASE}/users/${userId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ pushToken: null }),
  });
}

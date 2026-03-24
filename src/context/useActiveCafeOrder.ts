

import { useState, useEffect, useRef, useCallback } from "react";
import { getItem, getToken } from "../utils/tokenStorage";

const API_BASE = "https://endpoint.whitemantis.ae/api";
const POLL_INTERVAL_MS = 10_000; // 10 seconds


const ACTIVE_STATUSES = new Set(["pending", "preparing", "ready"]);

async function fetchHasActiveOrder(): Promise<boolean> {
  try {
    const [token, userId] = await Promise.all([getToken(), getItem("user_id")]);

    if (!userId) {
      console.log("[useActiveCafeOrder] No userId found — treating as guest, no block.");
      return false;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `JWT ${token}`;

    const url = `${API_BASE}/app-orders?depth=0&sort=-createdAt&limit=20&where[user][equals]=${encodeURIComponent(userId)}`;
    console.log("[useActiveCafeOrder] Fetching:", url);

    const res = await fetch(url, { method: "GET", headers });

    if (!res.ok) {
      console.warn("[useActiveCafeOrder] API responded with", res.status, "— no block.");
      return false;
    }

    const data = await res.json().catch(() => ({}));
    const docs: Record<string, unknown>[] = Array.isArray(data.docs) ? data.docs : [];

    console.log(`[useActiveCafeOrder] Got ${docs.length} orders. Checking for active ones...`);

    for (const doc of docs) {
      const orderType = String(doc.orderType ?? "take-away").toLowerCase();
      const isDineIn  = orderType === "dine-in";

     
      const rawAppStatus = isDineIn
        ? String(doc.appOrderStatusDine ?? doc.appOrderStatus ?? "").toLowerCase()
        : String(doc.appOrderStatus ?? "").toLowerCase();
      const rawOrderStatus = String((doc as Record<string, unknown>).orderStatus ?? "").toLowerCase();
      const rawStatus: string = rawAppStatus || rawOrderStatus || "completed";
      const paymentStatus = String(doc.paymentStatus ?? "").toLowerCase();


      if (paymentStatus !== "paid") {
        console.log(`[useActiveCafeOrder] Order #${doc.id} | type=${orderType} | rawStatus="${rawStatus}" | paymentStatus="${paymentStatus}" | NOT blocking (not paid)`);
        continue;
      }

   
      const rawStatusNorm = String(rawStatus ?? "").toLowerCase();
      const possibleCancelled = [
        "cancel",
        "cancelled",
        "canceled",
        "refunded",
        "voided",
        "rejected",
        "cancelled_by_user",
        "cancelled_by_admin",
      ];

      // Quick boolean checks on common fields that may indicate cancellation
      const d = doc as Record<string, unknown>;
      const isFlagCancelled = Boolean(
        d["isCancelled"] === true || d["cancelled"] === true || d["is_canceled"] === true,
      );
      const acceptanceRejected = String(d["orderAcceptance"] ?? "").toLowerCase() === "rejected";
      const explicitCancelled = rawOrderStatus === "cancelled";

      const looksCancelled =
        possibleCancelled.some((s) => rawStatusNorm.includes(s)) || isFlagCancelled || acceptanceRejected || explicitCancelled;

      console.log(`[useActiveCafeOrder] Order #${doc.id} | type=${orderType} | rawStatus="${rawStatus}" | rawOrderStatus="${rawOrderStatus}" | paymentStatus="${paymentStatus}" | isFlagCancelled=${isFlagCancelled} | acceptanceRejected=${acceptanceRejected} | explicitCancelled=${explicitCancelled} | looksCancelled=${looksCancelled}`);

      if (looksCancelled) {
        console.log(`[useActiveCafeOrder] Order #${doc.id} appears cancelled/refunded — NOT blocking add.`);
        continue;
      }

   
      if (ACTIVE_STATUSES.has(rawStatus)) {
        console.log(`[useActiveCafeOrder] 🔴 ACTIVE paid order found: #${doc.id} (${rawStatus}) — blocking add.`);
        return true;
      }
    }

    console.log("[useActiveCafeOrder] ✅ No active orders found — add is allowed.");
    return false;
  } catch (err) {
    console.error("[useActiveCafeOrder] Error during check — defaulting to no-block:", err);
    return false;
  }
}

export function useActiveCafeOrder() {
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [isChecking,    setIsChecking]     = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef  = useRef(true);

  const check = useCallback(async () => {
    const result = await fetchHasActiveOrder();
    if (mountedRef.current) {
      setHasActiveOrder(result);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setIsChecking(true);

    check(); // immediate check on mount

    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check]);

  return { hasActiveOrder, isChecking };
}

const API_BASE = "https://whitemantis-app.vercel.app/api";


export interface EarningTransaction {
  id: string;
  orderType: "In-Store Order" | "Web Order" | "App Order";
  title: string;
  orderId: string;
  amount: string;
  isPositive: boolean;
  date: string;
  /** Internal — unix ms timestamp used for sort; not shown in UI */
  _sortTs?: number;
}

export interface WtStampData {
  stampCount: number;
  stampReward: number;
  transactions: EarningTransaction[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseOrderType(raw?: string): EarningTransaction["orderType"] {
  if (!raw) return "App Order";
  const v = raw.toLowerCase();
  if (v.includes("in-store") || v.includes("instore") || v.includes("in store") || v.includes("offline")) return "In-Store Order";
  if (v.includes("web")) return "Web Order";
  return "App Order";
}

function parseTransactions(history: any[]): EarningTransaction[] {
  return history.map((entry: any, idx: number) => {
    // Real API fields: stamps, earnedAt, linkedOrder.value
    const stamps        = typeof entry.stamps        === "number" ? entry.stamps        : 0;
    const stampsEarned  = typeof entry.stampsEarned  === "number" ? entry.stampsEarned  : stamps;
    const stampsUsed    = typeof entry.stampsUsed    === "number" ? entry.stampsUsed    : 0;
    const rewardEarned  = typeof entry.rewardEarned  === "number" ? entry.rewardEarned  : 0;
    const isPositive    = stampsEarned > 0 || rewardEarned > 0;

    // Linked order — can be { relationTo, value: {...} } or a direct object
    const linkedOrder   = entry.linkedOrder?.value ?? entry.linkedOrder ?? null;
const rawOrderId    = entry.offlineReferenceId ?? linkedOrder?.id ?? entry.orderId ?? entry.order ?? entry.id ?? `${1000 + idx}`;
const orderId       = entry.offlineReferenceId ? `Ref #${entry.offlineReferenceId}` : `#${rawOrderId}`;

    // Date — earnedAt is the real field
    const rawDate = entry.earnedAt ?? entry.date ?? entry.createdAt ?? entry.timestamp ?? "";
    const date = rawDate
      ? new Date(rawDate).toLocaleString("en-GB", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
        }).replace(",", " ·")
      : "";

    // Order type from linked order
 const orderType = parseOrderType(entry.type === 'offline' ? 'offline' : (linkedOrder?.orderType ?? entry.orderType ?? entry.source));
    // Title
    let title = entry.title ?? entry.description ?? "";
    if (!title) {
      if (rewardEarned > 0)   title = "Reward earned";
      else if (stampsEarned > 0) title = "Stamp earned";
      else if (stampsUsed > 0)   title = "Stamp redeemed";
      else                       title = entry.type ?? "Transaction";
    }

    // Amount — show +N Stamps or -N Stamps
    let amount = entry.amount ?? "";
    if (!amount) {
      if (rewardEarned > 0)    amount = `+${rewardEarned} Reward`;
      else if (stampsEarned > 0) amount = `+${stampsEarned} Stamp${stampsEarned !== 1 ? "s" : ""}`;
      else if (stampsUsed > 0)   amount = `-${stampsUsed} Stamp${stampsUsed !== 1 ? "s" : ""}`;
      else                       amount = "—";
    }

    return {
      id       : String(entry.id ?? idx),
      orderType,
      title,
      orderId,
      amount,
      isPositive,
      date,
      // Carry the raw timestamp for merge-sort
      _sortTs  : rawDate ? new Date(rawDate).getTime() : 0,
    };
  });
}

/** Parse stampsRedemptionHistory entries into EarningTransaction (always negative). */
function parseRedemptionTransactions(history: any[]): EarningTransaction[] {
  console.log("parseRedemptionTransactions: raw array length=", history.length, JSON.stringify(history));
  return history.map((entry: any, idx: number) => {
    console.log(`parseRedemptionTransactions[${idx}]:`, JSON.stringify(entry));

    // Real backend fields (confirmed from live log):
    //   redeemedStamps     — number of stamps/rewards redeemed
    //   associatedOrder    — { relationTo: "app-orders", value: { id, createdAt, ... } }
      const rewardsRedeemed: number =
        typeof entry.redeemedStamps    === "number" ? entry.redeemedStamps    :
        typeof entry.stampsUsed        === "number" ? entry.stampsUsed        :
        typeof entry.rewardsRedeemed   === "number" ? entry.rewardsRedeemed   :
        typeof entry.rewardRedeemed    === "number" ? entry.rewardRedeemed    :
        typeof entry.rewards           === "number" ? entry.rewards           :
        typeof entry.count             === "number" ? entry.count             :
        1;

      // Determine whether this redemption entry represents stamp(s) or reward(s).
      // Backend fields are inconsistent across environments; prefer an explicit
      // reward-detection when any reward-like field is present. Otherwise treat
      // it as a stamp redemption when stamps fields are present.
      const stampsCount =
        typeof entry.redeemedStamps === 'number' ? entry.redeemedStamps :
        typeof entry.stampsUsed     === 'number' ? entry.stampsUsed     :
        typeof entry.stamps        === 'number' ? entry.stamps        :
        0;

      const rewardCountCandidate =
        typeof entry.rewardsRedeemed === 'number' ? entry.rewardsRedeemed :
        typeof entry.rewardRedeemed  === 'number' ? entry.rewardRedeemed  :
        typeof entry.rewards         === 'number' ? entry.rewards         :
        0;

      // associatedOrder is the real field name; fall back to linkedOrder / order
      const assocRaw = entry.associatedOrder ?? entry.linkedOrder ?? entry.order ?? null;

    // Payload relationship shape: { relationTo, value: <populated doc or id> }
    const assocDoc =
      assocRaw?.value && typeof assocRaw.value === "object"
        ? assocRaw.value
        : typeof assocRaw === "object" && assocRaw !== null && !("value" in assocRaw)
          ? assocRaw
          : null;

      // Heuristic: backend shapes are inconsistent. Prefer classifying an entry
      // as a reward redemption when any explicit reward field is present OR
      // when textual hints on the entry mention "reward". Additionally, in
      // our backend, reward redemptions commonly include an associatedOrder
      // link and often show a redeemedStamps value of 1 — treat that case as
      // a reward redemption as well.
      const textFields = [entry.title, entry.type, entry.description, entry.note, entry.reason]
        .filter(Boolean)
        .map((v: any) => String(v).toLowerCase());

      const mentionsReward = textFields.some((s: string) => s.includes("reward"));

      const isRewardRedemption = rewardCountCandidate > 0 || mentionsReward || (!!assocRaw && stampsCount === 1);

      const isStampRedemption = !isRewardRedemption && stampsCount > 0;

const rawOrderId =
      entry.offlineReferenceId ??
      assocDoc?.id ??
      (typeof assocRaw?.value === "number" ? assocRaw.value : null) ??
      (typeof assocRaw        === "number" ? assocRaw        : null) ??
      entry.orderId ??
      entry.id ??
      `${2000 + idx}`;
    const orderId = entry.offlineReferenceId ? `Ref #${entry.offlineReferenceId}` : `#${rawOrderId}`;

    // Date — try entry-level fields first, then fall back to the associated order's createdAt
    const rawDate =
      entry.redeemedAt  ??
      entry.createdAt   ??
      entry.date        ??
      entry.timestamp   ??
      entry.earnedAt    ??
      assocDoc?.createdAt ??
      "";

    const date = rawDate
      ? new Date(rawDate).toLocaleString("en-GB", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
        }).replace(",", " ·")
      : "";

const orderType = parseOrderType(
      entry.type === 'offline' ? 'offline' : (assocDoc?.orderType ?? entry.orderType ?? entry.source ?? "App Order"),
    );
    return {
      id        : `r-${String(entry.id ?? idx)}`,
      orderType,
      title     : isStampRedemption ? "Stamp redeemed" : (entry.title ?? "Reward redeemed"),
      orderId,
      amount    : isStampRedemption
        ? `-${stampsCount || rewardsRedeemed} Stamp${(stampsCount || rewardsRedeemed) !== 1 ? "s" : ""}`
        : `-${rewardCountCandidate || rewardsRedeemed} Reward${(rewardCountCandidate || rewardsRedeemed) !== 1 ? "s" : ""}`,
      isPositive: false,
      date,
      _sortTs   : rawDate ? new Date(rawDate).getTime() : 0,
    };
  });
}

async function fetchWtStampDoc(token: string | null): Promise<WtStampData> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  // Import tokenStorage inline to avoid circular deps
  const { default: tokenStorage } = await import("../utils/tokenStorage");
  const userId = await tokenStorage.getItem("user_id");

  const url = userId
    ? `${API_BASE}/wt-stamps?where[user][equals]=${userId}`
    : `${API_BASE}/wt-stamps`;

  console.log("fetchWtStampDoc: fetching for userId=", userId, "url=", url);

  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  if (!res.ok) {
    console.warn(`wt-stamps failed: ${res.status}`);
    return { stampCount: 0, stampReward: 0, transactions: [] };
  }
  const data = await res.json();
  console.log("fetchWtStampDoc: raw response docs=", data?.docs);
  const doc = Array.isArray(data?.docs) && data.docs.length > 0 ? data.docs[0] : null;

  // Log the full doc keys so we can verify the exact field names from the backend
  console.log("fetchWtStampDoc: doc keys=", doc ? Object.keys(doc) : "null");
  console.log("fetchWtStampDoc: stampEarningHistory=",    JSON.stringify(doc?.stampEarningHistory));
  console.log("fetchWtStampDoc: stampsRedemptionHistory=", JSON.stringify(doc?.stampsRedemptionHistory));

  const rawHistory      = Array.isArray(doc?.stampEarningHistory)     ? doc.stampEarningHistory     : [];
  const rawRedemptions  = Array.isArray(doc?.stampsRedemptionHistory) ? doc.stampsRedemptionHistory : [];

  // Parse both history arrays
  const earningTxns    = parseTransactions(rawHistory);
  const redemptionTxns = parseRedemptionTransactions(rawRedemptions);

  // Merge and sort newest-first by timestamp
  const allTxns = [...earningTxns, ...redemptionTxns].sort(
    (a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0),
  );

  return {
    stampCount  : typeof doc?.stampCount  === "number" ? doc.stampCount  : 0,
    stampReward : typeof doc?.stampReward === "number" ? doc.stampReward : 0,
    transactions: allTxns,
  };
}

/** Returns the total stamp count for the user. */
export async function getUserWtStamps(token: string | null): Promise<number> {
  try {
    const { stampCount } = await fetchWtStampDoc(token);
    return stampCount;
  } catch (e) {
    console.warn("getUserWtStamps error:", e);
    return 0;
  }
}

/** Returns both stampCount, stampReward and transactions from the backend. */
export async function getUserWtStampData(token: string | null): Promise<WtStampData> {
  try {
    return await fetchWtStampDoc(token);
  } catch (e) {
    console.warn("getUserWtStampData error:", e);
    return { stampCount: 0, stampReward: 0, transactions: [] };
  }
}

/** Returns only the earning transactions for the logged-in user. */
export async function getEarningTransactions(token: string | null): Promise<EarningTransaction[]> {
  // Get stamp-related transactions first
  const { transactions: stampTx } = await getUserWtStampData(token);

  try {
    // Import tokenStorage inline to avoid circular deps
    const { default: tokenStorage } = await import('../utils/tokenStorage');
    const userId = await tokenStorage.getItem('user_id');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `JWT ${token}`;

    const url = userId
      ? `${API_BASE}/user-wt-coins?where[user][equals]=${userId}`
      : `${API_BASE}/user-wt-coins`;

    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    if (!res.ok) {
      console.warn(`user-wt-coins fetch failed: ${res.status}`);
      return stampTx;
    }

    const data = await res.json().catch(() => ({}));
    const doc = Array.isArray(data?.docs) && data.docs.length > 0 ? data.docs[0] : null;

  // Debug logs to help identify why redemptions/coins may display incorrectly
  console.log('getEarningTransactions: user-wt-coins doc keys=', doc ? Object.keys(doc) : 'null');
  console.log('getEarningTransactions: coinEarningHistory sample=', JSON.stringify(doc?.coinEarningHistory?.slice?.(0,5) ?? doc?.coinEarningHistory ?? []));
  console.log('getEarningTransactions: pointsRedemptionHistory sample=', JSON.stringify(doc?.pointsRedemptionHistory?.slice?.(0,5) ?? doc?.pointsRedemptionHistory ?? []));

  const coinEarning = Array.isArray(doc?.coinEarningHistory) ? parseCoinEarningTransactions(doc.coinEarningHistory) : [];
  const coinRedemptions = Array.isArray(doc?.pointsRedemptionHistory) ? parseCoinRedemptionTransactions(doc.pointsRedemptionHistory) : [];

  const coinsTx = [...coinEarning, ...coinRedemptions];

  // Debug: show sample of parsed transactions with timestamps so we can diagnose ordering
  console.log('getEarningTransactions: parsed stampTx sample=', JSON.stringify((stampTx || []).slice(0,5).map(t => ({ id: t.id, _sortTs: t._sortTs, title: t.title, amount: t.amount }))))
  console.log('getEarningTransactions: parsed coinsTx sample=', JSON.stringify((coinsTx || []).slice(0,5).map(t => ({ id: t.id, _sortTs: t._sortTs, title: t.title, amount: t.amount }))))

  // Combine stamp and coin transactions and sort by timestamp desc
  const all = [...stampTx, ...coinsTx].sort((a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0));

  console.log('getEarningTransactions: merged-sorted sample=', JSON.stringify((all || []).slice(0,10).map(t => ({ id: t.id, _sortTs: t._sortTs, title: t.title, amount: t.amount }))));
  return all;
  } catch (err) {
    console.warn('getEarningTransactions: failed to fetch user-wt-coins', err);
    return stampTx;
  }
}


export async function deductStampReward(
  token: string | null,
  orderId: string | number,
  rewardsUsed: number,
): Promise<void> {
  if (rewardsUsed <= 0) return;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `JWT ${token}`;

    const { default: tokenStorage } = await import("../utils/tokenStorage");
    const userId = await tokenStorage.getItem("user_id");

    // Step 1: Fetch existing wt-stamps document
    const url = userId
      ? `${API_BASE}/wt-stamps?where[user][equals]=${userId}`
      : `${API_BASE}/wt-stamps`;

    const fetchRes = await fetch(url, { method: "GET", headers, cache: "no-store" });
    if (!fetchRes.ok) {
      console.warn("[deductStampReward] Could not fetch wt-stamps:", fetchRes.status);
      return;
    }
    const fetchData = await fetchRes.json().catch(() => ({}));
    const doc = Array.isArray(fetchData?.docs) && fetchData.docs.length > 0
      ? fetchData.docs[0]
      : null;

    if (!doc) {
      console.warn("[deductStampReward] No wt-stamps document found for user", userId);
      return;
    }

    // Step 2: Compute new stampReward (clamp to 0)
    const currentReward = typeof doc.stampReward === "number" ? doc.stampReward : 0;
    const newReward = Math.max(0, currentReward - rewardsUsed);

    // Step 3: Build the new redemption history entry
    const existingRedemptions: unknown[] = Array.isArray(doc.stampsRedemptionHistory)
      ? doc.stampsRedemptionHistory
      : [];
    const newEntry = {
      redeemedStamps: rewardsUsed,
      associatedOrder: {
        relationTo: "app-orders",
        value: orderId,
      },
    };

    console.log(
      `[deductStampReward] orderId=${orderId} rewardsUsed=${rewardsUsed}`,
      `stampReward: ${currentReward} → ${newReward}`,
    );

    // Step 4: PATCH the wt-stamps document
    const patchRes = await fetch(`${API_BASE}/wt-stamps/${doc.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        stampReward: newReward,
        stampsRedemptionHistory: [...existingRedemptions, newEntry],
      }),
    });

    if (patchRes.ok) {
      console.log("[deductStampReward] Successfully deducted rewards from wt-stamps");
    } else {
      const errData = await patchRes.json().catch(() => ({}));
      console.warn("[deductStampReward] PATCH failed:", patchRes.status, errData?.message);
    }
  } catch (err) {
    console.warn("[deductStampReward] Error:", err);
  }
}

export default { getUserWtStamps, getUserWtStampData, getEarningTransactions, deductStampReward };

// ── Stamp Reward Products ─────────────────────────────────────────────────────

export interface StampRewardProduct {
  id: number;
  title: string;
  description: string;
  image: string;
  /** "veg" | "non-veg" | "egg" | "vegan" — from backend dietaryType field */
  dietaryType: "veg" | "non-veg" | "egg" | "vegan";
}

/**
 * Fetch the admin-configured stamp reward products.
 * GET /api/globals/stamp-reward-products  — no auth required (read: () => true).
 *
 * Payload populates the relationship, so each item in stampProducts
 * is a full shop-menu document: { id, name, description/tagline, image: { url } }
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeDietaryType(value?: string): StampRewardProduct["dietaryType"] {
  if (!value) return "veg";
  const v = value.toLowerCase();
  if (v.includes("non")) return "non-veg";
  if (v === "egg")        return "egg";
  if (v === "vegan")      return "vegan";
  return "veg";
}

/**
 * Map a raw menu-item object (from individual endpoint) to StampRewardProduct.
 */
function mapToStampRewardProduct(item: any): StampRewardProduct {
  const imageObj = item.image;
  let imageUrl = "";
  if (imageObj?.url) {
    imageUrl = imageObj.url.startsWith("http")
      ? imageObj.url
      : `${API_BASE.replace("/api", "")}${imageObj.url}`;
  } else if (typeof imageObj === "string" && imageObj) {
    imageUrl = imageObj.startsWith("http")
      ? imageObj
      : `${API_BASE.replace("/api", "")}${imageObj}`;
  }
  return {
    id         : Number(item.id),
    title      : item.name ?? item.title ?? "Reward Item",
    description: item.tagline ?? item.description ?? "",
    image      : imageUrl,
    dietaryType: normalizeDietaryType(item.dietaryType ?? item.vegType),
  };
}

/**
 * Fetch admin-configured stamp-free (reward) products for a shop.
 *
 * The LIST endpoint (/api/shop/:id/menu-items) does NOT return isStampFreeProduct.
 * Only the SINGLE endpoint (/api/shop/:id/menu-items/:pid) returns it.
 *
 * Strategy:
 *   1. Fetch list → extract all IDs
 *   2. Fetch every item individually in parallel
 *   3. Keep only items where isStampFreeProduct === true
 */
export async function getStampRewardProducts(shopId: number = 1): Promise<StampRewardProduct[]> {
  try {
    // Step 1 — get all IDs from the list endpoint
    const listRes = await fetch(`${API_BASE}/shop/${shopId}/menu-items`, {
      method : "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!listRes.ok) {
      console.warn(`getStampRewardProducts: list fetch failed: ${listRes.status}`);
      return [];
    }
    const listData = await listRes.json();
    const allListItems: any[] = Array.isArray(listData?.items)
      ? listData.items
      : Array.isArray(listData?.docs)
      ? listData.docs
      : [];

    if (allListItems.length === 0) return [];

    const ids = allListItems
      .map((it: any) => Number(it.id))
      .filter((id) => !Number.isNaN(id));

    console.log(`getStampRewardProducts: fetching ${ids.length} items individually for isStampFreeProduct check`);

    // Step 2 — fetch every item individually in parallel
    const detailResults = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${API_BASE}/shop/${shopId}/menu-items/${id}`, {
          method : "GET",
          headers: { "Content-Type": "application/json" },
        }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      )
    );

    // Step 3 — keep only items with isStampFreeProduct === true
    const freeProducts: StampRewardProduct[] = [];
    detailResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        const raw = result.value;
        // Single endpoint may wrap: { item: {...} } or return bare object
        const item = raw?.item ?? raw;
        console.log(`getStampRewardProducts: id=${ids[idx]} isStampFreeProduct=${item?.isStampFreeProduct}`);
        if (item?.isStampFreeProduct === true) {
          freeProducts.push(mapToStampRewardProduct(item));
        }
      } else {
        console.warn(`getStampRewardProducts: item id=${ids[idx]} fetch failed:`, result.reason);
      }
    });

    console.log(`getStampRewardProducts: ${freeProducts.length} free-reward product(s) found`);
    return freeProducts;
  } catch (e) {
    console.warn("getStampRewardProducts error:", e);
    return [];
  }
}

/** Parse WTCoins (beans) earning history entries into EarningTransaction. */
function parseCoinEarningTransactions(history: any[]): EarningTransaction[] {
  console.log('parseCoinEarningTransactions: raw length=', Array.isArray(history) ? history.length : 0);
  return (history || []).map((entry: any, idx: number) => {
    const amountNum = typeof entry.amount === 'number' ? entry.amount : (typeof entry.coins === 'number' ? entry.coins : (entry.points || 0));
    const isPositive = amountNum > 0;

    const linkedOrder = entry.linkedOrder?.value ?? entry.linkedOrder ?? null;
const rawOrderId = entry.offlineReferenceId ?? linkedOrder?.id ?? entry.orderId ?? entry.order ?? entry.id ?? `${1000 + idx}`;
const orderId = entry.offlineReferenceId ? `Ref #${entry.offlineReferenceId}` : `#${rawOrderId}`;
    const rawDate = entry.earnedAt ?? entry.createdAt ?? entry.date ?? entry.timestamp ?? '';
    const date = rawDate
      ? new Date(rawDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', ' ·')
      : '';

const orderType = parseOrderType(entry.type === 'offline' ? 'offline' : (linkedOrder?.orderType ?? entry.orderType ?? entry.source));

  const title = entry.title ?? entry.description ?? (isPositive ? 'Beans earned' : 'Beans') ;
    const amount = isPositive ? `+${amountNum} Beans` : `${amountNum} Beans`;

    return {
      id: `c-e-${String(entry.id ?? idx)}`,
      orderType,
      title,
      orderId,
      amount,
      isPositive,
      date,
      _sortTs: rawDate ? new Date(rawDate).getTime() : 0,
    };
  }).map((tx) => {
    console.log('parseCoinEarningTransactions: parsed tx=', JSON.stringify({ id: tx.id, _sortTs: tx._sortTs, title: tx.title, amount: tx.amount }));
    return tx;
  });
}

/** Parse WTCoins redemption / points usage history into EarningTransaction (negative). */
function parseCoinRedemptionTransactions(history: any[]): EarningTransaction[] {
  console.log('parseCoinRedemptionTransactions: raw length=', Array.isArray(history) ? history.length : 0);
  return (history || []).map((entry: any, idx: number) => {
    console.log(`parseCoinRedemptionTransactions[${idx}]:`, JSON.stringify(entry));
    // Helper: try many fields to extract a numeric amount
    const extractAmount = (e: any) => {
      const candidates = [
        'redeemedAmount','redeemedCoins','redeemedPoints','pointsRedeemed','coinsRedeemed',
        'pointsUsed','coinsUsed','wtCoinsUsed','amount','points','coins','value','count','rewards'
      ];
      for (const k of candidates) {
        const v = e?.[k];
        if (typeof v === 'number' && !Number.isNaN(v)) return v;
        if (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))) return Number(v);
      }
      // Nested places
      if (e?.value && typeof e.value === 'object') {
        for (const k of candidates) {
          const v = e.value[k];
          if (typeof v === 'number' && !Number.isNaN(v)) return v;
          if (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))) return Number(v);
        }
      }
      return 0;
    };

    const amountNum = extractAmount(entry);

    const linkedOrder = entry.associatedOrder?.value ?? entry.linkedOrder?.value ?? entry.linkedOrder ?? entry.order ?? null;

const rawOrderId = entry.offlineReferenceId ?? linkedOrder?.id ?? entry.orderId ?? entry.id ?? `c-r-${2000 + idx}`;
    const orderId = entry.offlineReferenceId ? `Ref #${entry.offlineReferenceId}` : `#${rawOrderId}`;

    // Timestamp fallback helper: use several fields, then try to derive from a mongo-like hex id
    const parseObjectIdTs = (id: any) => {
      if (typeof id !== 'string') return 0;
      const hex = id.replace(/^#/, '');
      if (!/^[0-9a-fA-F]{24}$/.test(hex)) return 0;
      try {
        const seconds = parseInt(hex.substring(0, 8), 16);
        return seconds * 1000;
      } catch {
        return 0;
      }
    };

    const rawDate = entry.redeemedAt ?? entry.redeemedOn ?? entry.createdAt ?? entry.date ?? entry.timestamp ?? linkedOrder?.createdAt ?? linkedOrder?.value?.createdAt ?? '';
    let ts = rawDate ? (new Date(rawDate).getTime() || 0) : 0;
    if (!ts) {
      ts = parseObjectIdTs(entry.id) || parseObjectIdTs(linkedOrder?.id) || 0;
    }

    const date = ts ? new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', ' ·') : '';
const orderType = parseOrderType(entry.type === 'offline' ? 'offline' : (linkedOrder?.orderType ?? entry.orderType ?? entry.source ?? 'App Order'));

    return {
      id: `c-r-${String(entry.id ?? idx)}`,
      orderType,
      title: entry.title ?? 'Beans redeemed',
      orderId,
      amount: `-${Math.abs(amountNum)} Beans`,
      isPositive: false,
      date,
      _sortTs: ts || 0,
    };
  });
}
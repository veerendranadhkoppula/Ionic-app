/**
 * apiSubscriptions.ts
 *
 * Master subscription data  →  GET /api/web-subscription   (web-subscription collection)
 * Payment history           →  GET /api/web-orders?where[stripeSubscriptionID][equals]=<stripeSubId>
 * Cancel subscription       →  GET /api/web-subscription/:id/cancel
 *
 * Key backend fields (web-subscription):
 *   subsStatus        : "active" | "inactive" | "cancelled"
 *   nextPaymentDate   : ISO string — updated by invoice.paid webhook from Stripe period_end
 *   stripeSubscriptionID : Stripe sub_… id
 *   items[0].product  : depth-2 populated product doc (has subFreq array)
 *   items[0].subFreqID: matched to product.subFreq[].id for frequency label
 *   financials        : { subtotal, subscriptionDiscount, wtCoinsDiscount, shippingCharge, taxAmount, total }
 */

const API_BASE = "https://whitemantis-app.vercel.app/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubStatus = "active" | "cancelled";

export interface SubAddress {
  firstName   : string;
  lastName    : string;
  addressLine1: string;
  addressLine2: string;
  city        : string;
  emirates    : string;
  phoneNumber : string;
}

export interface SubPaymentRecord {
  date       : string;   // "07/03/2026"
  amount     : number;   // AED
  cardBrand  : string;   // "Visa"
  cardLast4  : string;   // "4242"
  invoiceUrl : string;
}

export interface UserSubscription {
  /** web-subscription document id */
  id               : number;
  displayId        : string;        // "#WMS-30"
  status           : SubStatus;
  productName      : string;        // "Coffee Drip Bags"
  itemName         : string;        // "Indonesia Meriah Anaerobic Natural, 1kg"
  deliveryFrequency: string;        // "Delivers Every 2 weeks"
  quantity         : number;
  unitPrice        : number;
  shippingCharge   : number;
  taxAmount        : number;
  total            : number;
  coinsDiscount    : number;
  nextDelivery     : string | null; // "31 Dec 2025" — from nextPaymentDate field
  cancelledOn      : string | null;
  placedAtLabel    : string;        // "07 Mar 2026"
  shippingAddress  : SubAddress | null;
  billingAddress   : SubAddress | null;
  paymentHistory   : SubPaymentRecord[];
  cardBrand        : string;
  cardLast4        : string;
  stripeSubId      : string;        // Stripe sub_… id (stripeSubscriptionID field)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  if (token) h["Authorization"] = `JWT ${token}`;
  return h;
}

async function safeParse(res: Response): Promise<Record<string, unknown>> {
  try { return (await res.json()) as Record<string, unknown>; }
  catch { return {}; }
}

function fmt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return null; }
}

function mapAddr(raw: Record<string, unknown> | null | undefined): SubAddress | null {
  if (!raw) return null;
  return {
    firstName   : String(raw.addressFirstName  ?? ""),
    lastName    : String(raw.addressLastName   ?? ""),
    addressLine1: String(raw.addressLine1      ?? ""),
    addressLine2: String(raw.addressLine2      ?? ""),
    city        : String(raw.city              ?? ""),
    emirates    : String(raw.emirates          ?? ""),
    phoneNumber : String(raw.phoneNumber       ?? ""),
  };
}

/**
 * Build "Delivers Every 2 weeks" from the matched subFreq entry.
 * Matches items[0].subFreqID against product.subFreq[].id.
 * Falls back to reading duration/interval directly from the item if product isn't populated.
 */
function buildFreqLabel(
  product       : Record<string, unknown> | null | undefined,
  subFreqID     : string,
  firstItem    ?: Record<string, unknown> | null,
  docSubFreq   ?: Array<{ id: string; duration: number; interval: string }>,
  doc          ?: Record<string, unknown>,
  variantSubFreq?: Array<{ id: string; duration: number; interval: string }>,
): string {
  // Helper to format a matched freq entry
  const fmt2 = (entry: { duration: number; interval: string }) => {
    const plural = entry.duration > 1 ? "s" : "";
    return `Delivers Every ${entry.duration} ${entry.interval}${plural}`;
  };

  // 1. Try the matched variant's subFreq array (backend stores subFreqID from selectedVariant.subFreq)
  if (variantSubFreq && variantSubFreq.length > 0) {
    const matched = subFreqID
      ? variantSubFreq.find((f) => String(f.id) === String(subFreqID)) ?? variantSubFreq[0]
      : variantSubFreq[0];
    return fmt2(matched);
  }

  // 2. Try product-level subFreq array (for products without variants)
  if (product) {
    const subFreq = product.subFreq as Array<{ id: string; duration: number; interval: string }> | undefined;
    if (subFreq && subFreq.length > 0) {
      const matched = subFreqID
        ? subFreq.find((f) => String(f.id) === String(subFreqID)) ?? subFreq[0]
        : subFreq[0];
      return fmt2(matched);
    }
  }

  // 3. Try doc-level subFreq array (some backends denormalize it)
  if (docSubFreq && docSubFreq.length > 0) {
    const matched = subFreqID
      ? docSubFreq.find((f) => String(f.id) === String(subFreqID)) ?? docSubFreq[0]
      : docSubFreq[0];
    return fmt2(matched);
  }

  // 4. Fallback: read duration/interval directly from the item
  if (firstItem) {
    const duration = firstItem.subFreqDuration ?? firstItem.duration ?? firstItem.freqDuration;
    const interval = firstItem.subFreqInterval ?? firstItem.interval ?? firstItem.freqInterval;
    if (duration && interval) {
      const d = Number(duration);
      const plural = d > 1 ? "s" : "";
      return `Delivers Every ${d} ${String(interval)}${plural}`;
    }
    // 4b. Pre-built label field on item
    const label = firstItem.subFreqLabel ?? firstItem.freqLabel ?? firstItem.frequencyLabel;
    if (label) return String(label);
  }

  // 5. Try stripeData on the doc — Stripe plan interval/interval_count
  if (doc) {
    const sd = (doc.stripeData as Record<string, unknown>) ?? {};
    const interval      = sd.interval      ?? sd.plan_interval;
    const intervalCount = sd.interval_count ?? sd.plan_interval_count ?? 1;
    if (interval) {
      const d = Number(intervalCount);
      const plural = d > 1 ? "s" : "";
      return `Delivers Every ${d} ${String(interval)}${plural}`;
    }
  }

  return "—";
}

function mapDoc(
  doc             : Record<string, unknown>,
  paymentHistory  : SubPaymentRecord[],
): UserSubscription {
  const id        = Number(doc.id);
  const createdAt = doc.createdAt as string | undefined;

  // ── Status ────────────────────────────────────────────────────────────────
  const subsStatus = String(doc.subsStatus ?? "active");
  const isCancelled = subsStatus === "cancelled" || subsStatus === "inactive";
  const status: SubStatus = isCancelled ? "cancelled" : "active";

  // ── Product info ──────────────────────────────────────────────────────────
  const rawItems  = Array.isArray(doc.items) ? (doc.items as unknown[]) : [];
  const firstItem = rawItems.length > 0 ? (rawItems[0] as Record<string, unknown>) : null;
  // Guard: product may be a plain ID string/number if depth population failed
  const rawProduct = firstItem ? (firstItem.product ?? null) : null;
  const product   = rawProduct && typeof rawProduct === "object"
    ? (rawProduct as Record<string, unknown>)
    : null;

  // subFreqID stored on the item — matches a row in the variant's subFreq array
  const subFreqID = firstItem
    ? String(firstItem.subFreqID ?? firstItem.subFreqId ?? doc.subFreqID ?? "")
    : String(doc.subFreqID ?? "");

  // variantID stored on the item
  const variantID = firstItem ? String(firstItem.variantID ?? "") : "";

  // ── DEBUG: log raw shapes to identify frequency path ──────────────────────
  console.log(`[sub #${doc.id}] subFreqID="${subFreqID}" variantID="${variantID}"`);
  console.log(`[sub #${doc.id}] product type: ${typeof rawProduct} | product:`, product ? JSON.stringify({
    id: product.id,
    name: product.name,
    subFreqCount: Array.isArray(product.subFreq) ? (product.subFreq as unknown[]).length : "none",
    variantsCount: Array.isArray(product.variants) ? (product.variants as unknown[]).length : "none",
  }) : "null");
  if (product && Array.isArray(product.variants)) {
    const dbgVariants = product.variants as Array<Record<string, unknown>>;
    dbgVariants.forEach((v, i) => {
      const sf = v.subFreq as unknown[] | undefined;
      console.log(`[sub #${doc.id}] variant[${i}] id="${v.id}" subFreq:`, sf ? JSON.stringify(sf) : "none");
    });
  }

  // Also try subFreq array directly on the doc (some backends denormalize it)
  const docSubFreq = doc.subFreq as Array<{ id: string; duration: number; interval: string }> | undefined;

  const productName = product
    ? String(product.name ?? product.title ?? "Product")
    : "Product";

  // Variant name + subFreq: look up variantID in product.variants
  let variantName = "";
  let variantSubFreq: Array<{ id: string; duration: number; interval: string }> | undefined;
  if (product && Array.isArray(product.variants)) {
    const variants = product.variants as Array<Record<string, unknown>>;
    const v = variantID ? variants.find((vr) => String(vr.id) === variantID) : variants[0];
    if (v) {
      if (v.variantName) variantName = String(v.variantName);
      // subFreq lives on the variant (selectedVariant.subFreq in backend checkout)
      if (Array.isArray(v.subFreq)) {
        variantSubFreq = v.subFreq as Array<{ id: string; duration: number; interval: string }>;
      }
    }
  }
  const itemName = variantName
    ? `${productName}, ${variantName}`
    : productName;

  const quantity  = firstItem ? Number(firstItem.quantity ?? 1) : 1;
  const unitPrice = firstItem ? Number(firstItem.price ?? 0)    : 0;
  const deliveryFrequency = buildFreqLabel(product, subFreqID, firstItem, docSubFreq, doc, variantSubFreq);
  console.log(`[sub #${doc.id}] deliveryFrequency="${deliveryFrequency}"`);

  // ── Financials ────────────────────────────────────────────────────────────
  const fin          = (doc.financials as Record<string, unknown>) ?? {};
  const shippingCharge = Number(fin.shippingCharge   ?? 0);
  const taxAmount      = Number(fin.taxAmount        ?? 0);
  const total          = Number(fin.total            ?? 0);
  const coinsDiscount  = Number(fin.wtCoinsDiscount  ?? 0);

  // ── Dates ─────────────────────────────────────────────────────────────────
  // nextPaymentDate is updated by Stripe webhook after every invoice.paid
  // updatedAt is set by Payload whenever the doc changes — used as cancellation date
  const updatedAt       = doc.updatedAt as string | undefined;
  const nextPaymentDate = doc.nextPaymentDate as string | null | undefined;
  const nextDelivery    = !isCancelled ? (fmt(nextPaymentDate) ?? "—") : null;
  // Use updatedAt as the cancel date (Payload sets it when subsStatus → "cancelled")
  // Fall back to cancelledAt if backend ever adds that dedicated field
  const cancelDateRaw   = (doc.cancelledAt ?? doc.canceledAt ?? updatedAt) as string | undefined;
  const cancelledOn     = isCancelled  ? (fmt(cancelDateRaw) ?? "—") : null;
  const placedAtLabel   = fmt(createdAt) ?? "—";

  // ── Stripe / card info ────────────────────────────────────────────────────
  // stripeData is a JSON field stored on the web-subscription doc.
  // stripeData.subscriptionId = the Stripe sub_… ID (set by handleInvoicePaid webhook)
  // stripeSubscriptionID (text field) = also the Stripe sub ID, set at checkout
  const stripeData  = (doc.stripeData as Record<string, unknown>) ?? {};
  // Prefer stripeData.subscriptionId (used by refundHandler), fall back to top-level text field
  const stripeSubId = String(stripeData.subscriptionId ?? doc.stripeSubscriptionID ?? "");

  const cardBrand   = paymentHistory[0]?.cardBrand ?? String(stripeData.cardBrand ?? "Visa");
  const cardLast4   = paymentHistory[0]?.cardLast4 ?? String(stripeData.cardLast4 ?? "");

  return {
    id,
    displayId        : `#WMS-${id}`,
    status,
    productName,
    itemName,
    deliveryFrequency,
    quantity,
    unitPrice,
    shippingCharge,
    taxAmount,
    total,
    coinsDiscount,
    nextDelivery,
    cancelledOn,
    placedAtLabel,
    shippingAddress  : mapAddr(doc.shippingAddress as Record<string, unknown> | null),
    billingAddress   : mapAddr(doc.billingAddress  as Record<string, unknown> | null),
    paymentHistory,
    cardBrand,
    cardLast4,
    stripeSubId,
  };
}

// ─── Payment history fetcher ─────────────────────────────────────────────────

/**
 * Fetches all web-orders that were created by a subscription renewal
 * (origin=subscription, stripeSubscriptionID matches the Stripe sub ID).
 * Each order = one payment cycle entry.
 * Exported so SubscriptionDetail can re-fetch live.
 */
export async function fetchPaymentHistory(
  token        : string | null,
  stripeSubId  : string,
): Promise<SubPaymentRecord[]> {
  if (!stripeSubId) return [];
  try {
    // web-orders stores the Stripe sub ID inside the stripeData JSON field as subscriptionId
    // The Payload query for a nested JSON field uses dot notation: stripeData.subscriptionId
    const res = await fetch(
      `${API_BASE}/web-orders?where[stripeData.subscriptionId][equals]=${encodeURIComponent(stripeSubId)}&depth=0&sort=-createdAt&limit=50`,
      { method: "GET", headers: authHeaders(token) },
    );
    if (!res.ok) return [];
    const data = await safeParse(res);
    const docs = Array.isArray(data.docs) ? (data.docs as Record<string, unknown>[]) : [];
    return docs.map((o) => {
      const sd        = (o.stripeData as Record<string, unknown>) ?? {};
      const fin       = (o.financials as Record<string, unknown>) ?? {};
      const createdAt = o.createdAt as string | undefined;
      return {
        date      : createdAt
          ? new Date(createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "—",
        amount    : Number(fin.total ?? sd.amount ?? 0) / (Number(fin.total ?? 0) > 100 ? 1 : 1),
        cardBrand : String(sd.cardBrand ?? "Visa"),
        cardLast4 : String(sd.cardLast4 ?? ""),
        invoiceUrl: String(sd.receipt_url ?? sd.hosted_invoice_url ?? ""),
      };
    });
  } catch {
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all the current user's subscriptions from the web-subscription collection,
 * newest first. Also fetches payment history per subscription from web-orders.
 */
export async function getUserSubscriptions(
  token: string | null,
): Promise<UserSubscription[]> {
  const headers = authHeaders(token);

  const userId = await import("../utils/tokenStorage")
    .then((m) => m.getItem?.("user_id") ?? (m.default as { getItem?: (k: string) => Promise<string | null> })?.getItem?.("user_id") ?? null)
    .catch(() => null);

  const userFilter = userId
    ? `&where[user][equals]=${encodeURIComponent(String(userId))}`
    : "";

  const res = await fetch(
    `${API_BASE}/web-subscription?depth=2&sort=-createdAt&limit=50${userFilter}`,
    { method: "GET", headers },
  );
  const data = await safeParse(res);
  if (!res.ok) {
    throw new Error(
      (data.message as string) ?? `Failed to load subscriptions (${res.status})`,
    );
  }

  const docs: Record<string, unknown>[] = Array.isArray(data.docs)
    ? (data.docs as Record<string, unknown>[])
    : [];

  // Fetch payment histories in parallel
  const results = await Promise.all(
    docs.map(async (doc) => {
      // Use stripeData.subscriptionId (set by webhook) — same field refundHandler uses
      const stripeData = (doc.stripeData as Record<string, unknown>) ?? {};
      const stripeSubId = String(stripeData.subscriptionId ?? doc.stripeSubscriptionID ?? "");
      const paymentHistory = await fetchPaymentHistory(token, stripeSubId);
      return mapDoc(doc, paymentHistory);
    }),
  );

  return results;
}

/**
 * Cancel a subscription.
 * Backend endpoint: GET /api/web-subscription/:id/cancel  (method: 'get' in Payload config)
 * The refundHandler checks order.stripeData.subscriptionId to cancel the Stripe subscription.
 *
 * If stripeData.subscriptionId is missing on the doc (webhook hasn't run yet), we first
 * PATCH the doc to copy stripeSubscriptionID → stripeData.subscriptionId, then retry cancel.
 */
export async function cancelSubscriptionOrder(
  token    : string | null,
  orderId  : number,
  stripeSubId ?: string,   // pass the stripeSubId we already have in the UI
  reason?: string,         // optional cancellation reason; appended as ?reason=...
): Promise<void> {
  const headers = authHeaders(token);

  const attemptCancel = async () => {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    return fetch(`${API_BASE}/web-subscription/${orderId}/cancel${qs}`, {
      method : "GET",
      headers,
    });
  };

  let res = await attemptCancel();

  // If 400 and we have the stripeSubId from the text field, try to patch stripeData first
  if (res.status === 400 && stripeSubId) {
    try {
      await fetch(`${API_BASE}/web-subscription/${orderId}`, {
        method : "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body   : JSON.stringify({ stripeData: { subscriptionId: stripeSubId } }),
      });
    } catch {
      // ignore patch errors — try cancel anyway
    }
    res = await attemptCancel();
  }

  const data = await safeParse(res);
  if (!res.ok) {
    throw new Error(
      (data.error as string) ?? (data.message as string) ?? `Cancel failed (${res.status})`,
    );
  }
}


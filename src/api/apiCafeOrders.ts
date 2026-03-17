/**
 * apiCafeOrders.ts
 * All API calls related to the user's cafe order history, detail view,
 * ratings submission, and invoice generation.
 */

const API_BASE = "https://endpoint.whitemantis.ae/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderType       = "take-away" | "dine-in";
export type PaymentStatus   = "pending" | "paid" | "failed" | "refund-initiated" | "refunded";
export type AppOrderStatus  = "pending" | "preparing" | "ready" | "completed" | "cancelled";
export type OrderAcceptance = "pending" | "accepted" | "rejected";

export type CafeItemType = "beverage" | "food";

export interface CafeOrderItem {
  id             : string;
  productId      : number;
  productName    : string;
  isVeg          : boolean;      // true → green dot, false → red/brown dot
  itemType       : CafeItemType; // "beverage" → barista section, "food" → other items
  quantity       : number;
  unitPrice      : number;
  isReward       : boolean;      // true → stamp-reward item (base price is FREE)
  /** Full backend-format customizations — preserved for display AND reorder */
  customizations : {
    label            ?: string;   // display label (selectedOptionLabel)
    price            ?: number;
    sectionId        ?: string;
    sectionTitle     ?: string;
    groupId          ?: string;
    selectedOptionId ?: string;
    selectedOptionLabel ?: string;
    [key: string]    : unknown;
  }[];
}

export interface CafeOrderBarista {
  id   : number;
  name : string;
}

export interface CafeOrderFinancials {
  subtotal       : number;
  couponDiscount : number;
  coinsDiscount  : number;
  taxAmount      : number;
  total          : number;
  couponCode     : string;
}

/** Full cafe order returned by the list + detail endpoints */
export interface CafeOrder {
  id              : number;
  displayId       : string;          // "#WMC-29"
  orderType       : OrderType;
  orderStatus     : AppOrderStatus;  // derived from appOrderStatus / appOrderStatusDine
  orderAcceptance : OrderAcceptance;
  paymentStatus   : PaymentStatus;
  placedAt        : string;          // ISO string
  placedAtLabel   : string;          // "Dec - 12"
  barista         : CafeOrderBarista | null;
  items           : CafeOrderItem[];
  specialInstructions : string;
  financials      : CafeOrderFinancials;
  orderRating     : number | null;
  baristaRating   : number | null;
  slot            : string | null;   // ISO slot time if take-away custom slot
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `JWT ${token}`;
  return h;
}

async function safeParse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "{}");
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

/**
 * Derive a simple string label for the order's placed-at date.
 * e.g. "02 Mar 2026"
 */
function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}


/**
 * In-memory product cache: productId → { name, itemType, isVeg, salePrice, regularPrice }
 * Shared across all mapOrder calls in one session so we don't re-fetch the same product twice.
 */
const _productCache = new Map<number, {
  name: string;
  itemType: CafeItemType;
  isVeg: boolean;
  salePrice: number;
  regularPrice: number;
}>();

/**
 * Fetch a single menu item from /api/shop/:shopId/menu-items/:productId.
 * Response shape: { success: true, item: { name, dietaryType, salePrice, regularPrice, category: { title } } }
 * Results are cached for the session.
 */
async function fetchProductDetails(shopId: number, productId: number): Promise<{
  name: string;
  itemType: CafeItemType;
  isVeg: boolean;
  salePrice: number;
  regularPrice: number;
} | null> {
  if (_productCache.has(productId)) return _productCache.get(productId)!;
  try {
    const res = await fetch(`${API_BASE}/shop/${shopId}/menu-items/${productId}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const item = data?.item ?? data;
    if (!item) return null;

    const name: string = String(item.name ?? item.title ?? "").trim() || `Item ${productId}`;

    // Category title tells us if this is a beverage or food item
    // Backend uses: "BEVERAGES" for drinks, "BAKERY" / "FOOD" / "SNACKS" etc for food
    const catTitle: string = String(
      (item.category as Record<string, unknown> | null)?.title ??
      item.categoryTitle ?? item.productType ?? item.type ?? "",
    ).toUpperCase();
    const itemType: CafeItemType =
      catTitle === "BEVERAGES" || catTitle.includes("DRINK") || catTitle.includes("COFFEE") || catTitle.includes("BEVERAGE")
        ? "beverage"
        : "food";

    const dietaryTypeRaw = String(item.dietaryType ?? item.vegType ?? "veg").toLowerCase();
    const isVeg: boolean = !dietaryTypeRaw.includes("non") && dietaryTypeRaw !== "egg";

    const salePrice    = Number(item.salePrice    ?? 0);
    const regularPrice = Number(item.regularPrice ?? item.price ?? 0);

    const result = { name, itemType, isVeg, salePrice, regularPrice };
    _productCache.set(productId, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch barista name from /api/shop/:shopId/barista (needs auth token).
 * Returns null if the barista ID cannot be resolved.
 */
async function fetchBaristaName(
  token: string | null,
  shopId: number,
  baristaId: number,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `JWT ${token}`;
    const res = await fetch(`${API_BASE}/shop/${shopId}/barista`, { method: "GET", headers });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const baristas: Record<string, unknown>[] = Array.isArray(data?.baristas) ? data.baristas : [];
    const found = baristas.find((b) => Number(b.id) === baristaId);
    if (!found) return null;
    return String(found.name ?? found.fullName ?? found.firstName ?? "").trim() || null;
  } catch {
    return null;
  }
}

async function mapOrder(
  doc: Record<string, unknown>,
  token: string | null = null,
): Promise<CafeOrder> {
  const isDineIn = (doc.orderType as string) === "dine-in";

  // Derive live status
  const rawStatus: string = isDineIn
    ? ((doc.appOrderStatusDine ?? doc.appOrderStatus ?? "pending") as string)
    : ((doc.appOrderStatus ?? "pending") as string);
  const orderStatus: AppOrderStatus = rawStatus as AppOrderStatus;

  // ── Shop ID (needed for product and barista lookups) ──────────────────────
  const shopId: number =
    typeof doc.shop === "object" && doc.shop
      ? Number((doc.shop as Record<string, unknown>).id ?? 1)
      : Number(doc.shop ?? 1);

  // ── Barista ───────────────────────────────────────────────────────────────
  // Backend returns barista as a raw numeric ID (not populated even at depth=2).
  let barista: CafeOrderBarista | null = null;
  const baristaRaw = doc.barista ?? doc.assignedBarista ?? doc.baristaId ?? doc.baristaAssigned;

  if (typeof baristaRaw === "object" && baristaRaw) {
    // If somehow already populated (future backend change)
    const b = baristaRaw as Record<string, unknown>;
    const bName = String(b.name ?? b.fullName ?? b.firstName ?? "").trim();
    if (bName) barista = { id: Number(b.id), name: bName };
  } else if (typeof baristaRaw === "number" && baristaRaw > 0) {
    const name = await fetchBaristaName(token, shopId, baristaRaw);
    if (name) barista = { id: baristaRaw, name };
  }

  // ── Stamp rewards ─────────────────────────────────────────────────────────
  const rawItems: Record<string, unknown>[] = Array.isArray(doc.items)
    ? (doc.items as Record<string, unknown>[])
    : [];

  const stampRewardPidCount = new Map<number, number>();
  const rawStampRewards: unknown[] = Array.isArray(doc.stampRewards)
    ? (doc.stampRewards as unknown[])
    : [];
  for (const sr of rawStampRewards) {
    const pid =
      typeof sr === "number" ? sr :
      typeof sr === "object" && sr !== null
        ? Number((sr as Record<string, unknown>).id ?? 0) || null
        : null;
    if (pid) stampRewardPidCount.set(pid, (stampRewardPidCount.get(pid) ?? 0) + 1);
  }

  // ── Fetch all product details in parallel ─────────────────────────────────
  const productIds: number[] = rawItems.map((item) =>
    typeof item.product === "number" ? item.product :
    typeof item.product === "object" && item.product
      ? Number((item.product as Record<string, unknown>).id ?? 0)
      : 0,
  );
  const uniqueIds = [...new Set(productIds.filter((id) => id > 0))];
  await Promise.all(uniqueIds.map((id) => fetchProductDetails(shopId, id)));

  // ── Map items ─────────────────────────────────────────────────────────────
  const items: CafeOrderItem[] = rawItems.map((item, _idx) => {
    const productId = productIds[_idx] ?? 0;
    const pd = productId > 0 ? _productCache.get(productId) ?? null : null;

    const productName = pd?.name ?? (() => {
      // fallback: check if item row has a snapshot name (older backend versions)
      const snap = item.productName ?? item.productTitle ?? item.name ?? item.title;
      return snap ? String(snap).trim() : `Item`;
    })();

    const isVeg     = pd?.isVeg     ?? true;
    const itemType  = pd?.itemType  ?? "beverage";
    const qty       = Number(item.quantity ?? 1);

    const baseUnitPrice = (() => {
      if (pd) return pd.salePrice > 0 ? pd.salePrice : pd.regularPrice;
      return Number(item.unitPrice ?? item.price ?? 0);
    })();

    // Customizations — preserve full backend object for reorder, normalise display fields
    const custRaw: Record<string, unknown>[] = Array.isArray(item.customizations)
      ? (item.customizations as Record<string, unknown>[]).filter(Boolean)
      : [];
    const customizations = custRaw
      .filter((c) => c.selectedOptionId || c.selectedOptionLabel || c.label)
      .map((c) => ({
        ...c,
        label               : String(c.selectedOptionLabel ?? c.label ?? ""),
        selectedOptionLabel : String(c.selectedOptionLabel ?? c.label ?? ""),
        price               : Number(c.price ?? 0),
      }));

    const rawItemPrice = Number(item.price ?? item.unitPrice ?? -1);
    const remainingRewardCount = productId > 0 ? (stampRewardPidCount.get(productId) ?? 0) : 0;
    const isRewardItem = remainingRewardCount > 0 && (rawItemPrice === 0 || rawItemPrice < 0);
    if (isRewardItem) stampRewardPidCount.set(productId, remainingRewardCount - 1);
    const unitPrice = isRewardItem ? 0 : baseUnitPrice;

    return {
      id            : String(item.id ?? _idx),
      productId,
      productName,
      isVeg,
      itemType,
      quantity      : qty,
      unitPrice,
      isReward      : isRewardItem,
      customizations,
    } satisfies CafeOrderItem;
  });

  try {
    const byPid = new Map<number, CafeOrderItem[]>();
    items.forEach((it) => {
      const pid = it.productId ?? 0;
      if (!byPid.has(pid)) byPid.set(pid, []);
      byPid.get(pid)!.push(it);
    });

  for (const [pid, group] of byPid.entries()) {
      if (pid === 0) continue;
      const custQueue: Array<Array<Record<string, unknown>>> = [];
      group.forEach((it) => {
        if ((it.customizations?.length ?? 0) > 0) {
          custQueue.push(it.customizations as Array<Record<string, unknown>>);
          it.customizations = [];
        }
      });

      if (custQueue.length === 0) continue;


      for (const it of group) {
        if ((it.customizations?.length ?? 0) === 0 && !it.isReward && custQueue.length > 0) {
          it.customizations = custQueue.shift() as Array<Record<string, unknown>>;
        }
      }

      for (const it of group) {
        if ((it.customizations?.length ?? 0) === 0 && custQueue.length > 0) {
          it.customizations = custQueue.shift() as Array<Record<string, unknown>>;
        }
      }
      if (custQueue.length > 0) {
        console.log(`[mapOrder] leftover customizations for pid=${pid}`, custQueue.length);
      }
    }
  } catch (err) {
    console.warn("[mapOrder] failed to redistribute customizations:", err);
  }

 
  const fin = (
    typeof doc.financials === "object" && doc.financials ? doc.financials : {}
  ) as Record<string, unknown>;

  const couponObj  = doc.coupon;
  const couponCode =
    (typeof couponObj === "object" && couponObj
      ? ((couponObj as Record<string, unknown>).code as string | undefined)
      : undefined) ??
    (fin.couponCode as string | undefined) ?? "";

  const computedSubtotal = parseFloat(
    items.reduce((s, it) => {
      const custTotal = it.customizations.reduce((cs, c) => cs + (c.price ?? 0), 0);
      return s + (it.unitPrice + custTotal) * it.quantity;
    }, 0).toFixed(2),
  );
  const subtotal       = Number(fin.subtotal ?? 0) > 0 ? Number(fin.subtotal) : computedSubtotal;
  const couponDiscount = Number(fin.couponDiscount ?? 0);
  const coinsDiscount  = Number(fin.wtCoinsDiscount ?? fin.coinsDiscount ?? 0);
  const taxAmount      = Number(fin.taxAmount ?? fin.tax ?? 0);
  const backendTotal   = Number(fin.total ?? 0);
  const computedTotal  = parseFloat((subtotal + taxAmount - couponDiscount - coinsDiscount).toFixed(2));
  const total          = backendTotal > 0 ? backendTotal : computedTotal;

  const financials: CafeOrderFinancials = { subtotal, couponDiscount, coinsDiscount, taxAmount, total, couponCode };

  const slotRaw = doc.slot;
  let slot: string | null = null;
  if (typeof slotRaw === "string") slot = slotRaw;
  else if (typeof slotRaw === "object" && slotRaw) {
    slot = (slotRaw as Record<string, unknown>).slot
      ? String((slotRaw as Record<string, unknown>).slot)
      : null;
  }

  return {
    id              : Number(doc.id),
    displayId       : `#WMC-${doc.id}`,
    orderType       : (doc.orderType as OrderType) ?? "take-away",
    orderStatus,
    orderAcceptance : (doc.orderAcceptance as OrderAcceptance) ?? "pending",
    paymentStatus   : (doc.paymentStatus as PaymentStatus) ?? "pending",
    placedAt        : String(doc.createdAt ?? ""),
    placedAtLabel   : formatDate(String(doc.createdAt ?? "")),
    barista,
    items,
    specialInstructions : String(doc.specialInstructions ?? ""),
    financials,
    orderRating     : doc.orderRating  != null ? Number(doc.orderRating)  : null,
    baristaRating   : doc.baristaRating != null ? Number(doc.baristaRating) : null,
    slot,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/app-orders?where[user][equals]=<userId>&depth=2&sort=-createdAt
 * Returns all cafe orders for the current user, newest first.
 * depth=2 ensures products + barista are fully populated inline —
/**
 * GET /api/app-orders?where[user][equals]=<userId>&depth=2&sort=-createdAt
 * Returns all cafe orders for the current user, newest first.
 * mapOrder is async — it fetches product names + barista names via the menu API.
 */
export async function getUserCafeOrders(
  token: string | null,
): Promise<CafeOrder[]> {
  const headers = authHeaders(token);

  // Retrieve the logged-in user's ID so we only fetch their own orders
  const userId = await import("../utils/tokenStorage")
    .then((m) => m.getItem("user_id"));

  const userFilter = userId
    ? `&where[user][equals]=${encodeURIComponent(userId)}`
    : "";

  const res = await fetch(
    `${API_BASE}/app-orders?depth=2&sort=-createdAt&limit=50${userFilter}`,
    { method: "GET", headers },
  );
  const data = await safeParse(res);
  if (!res.ok) {
    throw new Error(
      (data.message as string) ?? `Failed to load orders (${res.status})`,
    );
  }

  const docs: Record<string, unknown>[] = Array.isArray(data.docs)
    ? (data.docs as Record<string, unknown>[])
    : [];

  // mapOrder is async — runs in parallel for all orders
  return Promise.all(docs.map((doc) => mapOrder(doc, token)));
}

/**
 * GET /api/app-orders/:id?depth=2
 * Returns a single order with full detail. Used for live-polling in the
 * detail screen so statuses stay up to date.
 */
export async function getCafeOrderById(
  token: string | null,
  orderId: number | string,
): Promise<CafeOrder> {
  const headers = authHeaders(token);
  const res = await fetch(`${API_BASE}/app-orders/${orderId}?depth=2`, {
    method: "GET",
    headers,
  });
  const data = await safeParse(res);
  if (!res.ok) {
    throw new Error(
      (data.message as string) ?? `Failed to load order (${res.status})`,
    );
  }
  const doc = (data.doc ?? data.order ?? data) as Record<string, unknown>;
  return mapOrder(doc, token);
}

/**
 * Try to extract a Stripe invoice URL from an app-order (cafe order) document.
 * Returns null when no invoice URL is available.
 */
export async function getCafeOrderInvoiceUrl(
  token: string | null,
  orderId: number | string,
): Promise<string | null> {
  const headers = authHeaders(token);
  try {
    const res = await fetch(`${API_BASE}/app-orders/${orderId}?depth=0`, {
      method: "GET",
      headers,
    });
    if (!res.ok) return null;
    const data = await safeParse(res);
    const doc = (data.doc ?? data.order ?? data) as Record<string, unknown>;
    const sd = (doc.stripeData as Record<string, unknown>) ?? {};
    const url = String(sd.receipt_url ?? sd.hosted_invoice_url ?? sd.invoice_pdf ?? "");
    return url || null;
  } catch {
    return null;
  }
}

/**
 * PATCH /api/app-orders/:id
 * Submits order + barista star ratings.
 * Ratings are 1-5 integers. Pass null to skip updating that field.
 */
export async function submitCafeOrderRatings(
  token: string | null,
  orderId: number | string,
  orderRating: number | null,
  baristaRating: number | null,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (orderRating   != null) body.orderRating   = orderRating;
  if (baristaRating != null) body.baristaRating = baristaRating;
  if (Object.keys(body).length === 0) return;

  const res = await fetch(`${API_BASE}/app-orders/${orderId}`, {
    method  : "PATCH",
    headers : authHeaders(token),
    body    : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await safeParse(res);
    throw new Error(
      (data.message as string) ?? `Rating submission failed (${res.status})`,
    );
  }
}

/**
 * Derive whether an order is "ongoing" (not yet completed/cancelled).
 * Used to mute the Reorder CTA.
 */
export function isOrderOngoing(order: CafeOrder): boolean {
  return (
    order.orderStatus !== "completed" &&
    order.orderStatus !== "cancelled"
  );
}

/**
 * Derive a human-readable status label for display.
 */
export function getOrderStatusLabel(order: CafeOrder): "Ongoing" | "Completed" | "Cancelled" {
  if (order.orderStatus === "cancelled") return "Cancelled";
  if (order.orderStatus === "completed") return "Completed";
  return "Ongoing";
}

/**
 * Generate and trigger download of a text-based invoice for a cafe order.
 * Uses the browser's Blob API — no external dependency needed.
 */
export function downloadCafeInvoice(order: CafeOrder): void {
  const lines: string[] = [];

  lines.push("WHITE MANTIS ROASTERY & LAB");
  lines.push("========================================");
  lines.push(`Invoice for Order: ${order.displayId}`);
  lines.push(`Date       : ${order.placedAtLabel}`);
  lines.push(`Order Type : ${order.orderType === "dine-in" ? "Dine In" : "Take Away"}`);
  if (order.barista) lines.push(`Barista    : ${order.barista.name}`);
  lines.push("----------------------------------------");
  lines.push("ITEMS");
  lines.push("----------------------------------------");

  order.items.forEach((item) => {
    const linePrice = (item.unitPrice * item.quantity).toFixed(2);
    lines.push(`${item.quantity} x ${item.productName}  — AED ${linePrice}`);
    item.customizations.forEach((c) => {
      const displayLabel = c.selectedOptionLabel ?? c.label ?? "";
      const displayPrice = c.price ?? 0;
      lines.push(
        `    + ${displayLabel}${displayPrice > 0 ? ` (+AED ${displayPrice.toFixed(2)})` : ""}`,
      );
    });
  });

  lines.push("----------------------------------------");
  lines.push(`Subtotal   : AED ${order.financials.subtotal.toFixed(2)}`);
  if (order.financials.couponDiscount > 0) {
    lines.push(`Coupon (${order.financials.couponCode})  : -AED ${order.financials.couponDiscount.toFixed(2)}`);
  }
  if (order.financials.coinsDiscount > 0) {
    lines.push(`WT Coins   : -AED ${order.financials.coinsDiscount.toFixed(2)}`);
  }
  lines.push(`Tax        : AED ${order.financials.taxAmount.toFixed(2)}`);
  lines.push("========================================");
  lines.push(`TOTAL      : AED ${order.financials.total.toFixed(2)}`);
  lines.push("========================================");
  if (order.specialInstructions) {
    lines.push(`Special Instructions: ${order.specialInstructions}`);
  }
  lines.push("");
  lines.push("Thank you for visiting White Mantis!");

  const text = lines.join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `invoice-${order.displayId.replace("#", "")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

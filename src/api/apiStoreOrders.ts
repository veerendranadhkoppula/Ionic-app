

const API_BASE = "https://endpoint.whitemantis.ae/api";

export type WebOrderDeliveryStatus =
  | "placed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refund-initiated"
  | "refunded";

export type WebOrderPaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refund-initiated"
  | "refunded";

export type WebOrderOrigin = "one-time" | "subscription";

export interface WebOrderItem {
  id       : string;
  productId: number;
  productName: string;
  variantId  : string | null;
  variantName: string | null;
  quantity : number;
  price    : number;   // unit price
}

export interface WebOrderAddress {
  firstName   : string;
  lastName    : string;
  addressLine1: string;
  addressLine2: string;
  city        : string;
  emirates    : string;
  phoneNumber : string;
  country     : string;
}

export interface WebOrderFinancials {
  subtotal       : number;
  couponDiscount : number;
  wtCoinsDiscount: number;
  shippingCharge : number;
  taxAmount      : number;
  total          : number;
}

/** Full store order returned by the list + detail endpoints */
export interface WebOrder {
  id              : number;
  displayId       : string;          // "#WMS-8"
  deliveryStatus  : WebOrderDeliveryStatus;
  paymentStatus   : WebOrderPaymentStatus;
  origin          : WebOrderOrigin;
  deliveryOption  : "delivery" | "pickup";
  placedAt        : string;          // ISO string
  placedAtLabel   : string;          // "Dec - 12"
  deliveringBy    : string | null;   // "Delivering by Jan 5, 2026"
  deliveredOn     : string | null;   // "Delivered on Jan 5, 2026"
  items           : WebOrderItem[];
  shippingAddress : WebOrderAddress | null;
  billingAddress  : WebOrderAddress | null;
  financials      : WebOrderFinancials;
  orderRating     : number | null;
  couponCode      : string | null;
}


function authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  if (token) h["Authorization"] = `JWT ${token}`;
  return h;
}

async function safeParse(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day  : "2-digit",
      month: "short",
      year : "numeric",
    });
  } catch {
    return null;
  }
}

function placedAtLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      month: "short",
      day  : "2-digit",
    }).replace(" ", " - "); // "Dec - 12"
  } catch {
    return "—";
  }
}

function mapAddress(
  raw: Record<string, unknown> | null | undefined,
): WebOrderAddress | null {
  if (!raw) return null;
  return {
    firstName   : String(raw.addressFirstName  ?? ""),
    lastName    : String(raw.addressLastName   ?? ""),
    addressLine1: String(raw.addressLine1      ?? ""),
    addressLine2: String(raw.addressLine2      ?? ""),
    city        : String(raw.city              ?? ""),
    emirates    : String(raw.emirates          ?? ""),
    phoneNumber : String(raw.phoneNumber       ?? ""),
    country     : String(raw.addressCountry    ?? "United Arab Emirates"),
  };
}

function mapFinancials(
  raw: Record<string, unknown> | null | undefined,
): WebOrderFinancials {
  const f = raw ?? {};
  return {
    subtotal       : Number(f.subtotal        ?? 0),
    couponDiscount : Number(f.couponDiscount  ?? 0),
    wtCoinsDiscount: Number(f.wtCoinsDiscount ?? 0),
    shippingCharge : Number(f.shippingCharge  ?? 0),
    taxAmount      : Number(f.taxAmount       ?? 0),
    total          : Number(f.total           ?? 0),
  };
}

function mapItems(raw: unknown[]): WebOrderItem[] {
  return raw.map((item, idx) => {
    const i = item as Record<string, unknown>;

    // product may be populated object or a bare number id
    const product      = i.product as Record<string, unknown> | number | null;
    const productId    = typeof product === "object" && product !== null
      ? Number((product as Record<string, unknown>).id ?? 0)
      : Number(product ?? 0);
    const productName  = typeof product === "object" && product !== null
      ? String((product as Record<string, unknown>).title ?? (product as Record<string, unknown>).name ?? "Product")
      : "Product";

    const variantId   = i.variantID   ? String(i.variantID) : null;
    const variantName = i.variantName ? String(i.variantName) : null;

    return {
      id         : String(i.id ?? idx),
      productId,
      productName,
      variantId,
      variantName,
      quantity   : Number(i.quantity ?? 1),
      price      : Number(i.price    ?? 0),
    };
  });
}

function mapOrder(doc: Record<string, unknown>): WebOrder {
  const id          = Number(doc.id);
  const displayId   = `#WMS-${id}`;
  const createdAt   = doc.createdAt as string | undefined;

  // delivery / date labels
  const deliveringByIso = doc.deliveringBy as string | null | undefined;
  const deliveredOnIso  = doc.deliveredOn  as string | null | undefined;

  const deliveringByLabel = deliveringByIso
    ? `Delivering by ${formatDate(deliveringByIso)}`
    : null;
  const deliveredOnLabel = deliveredOnIso
    ? `Delivered on ${formatDate(deliveredOnIso)}`
    : null;

  const rawItems = Array.isArray(doc.items)
    ? (doc.items as unknown[])
    : [];

  // coupon code — may be a populated relationship or a string
  const couponRaw   = doc.couponCode as Record<string, unknown> | string | null | undefined;
  const couponCode  = couponRaw
    ? (typeof couponRaw === "object" ? String(couponRaw.code ?? "") : String(couponRaw))
    : null;

  return {
    id,
    displayId,
    deliveryStatus  : (doc.deliveryStatus as WebOrderDeliveryStatus)  ?? "placed",
    paymentStatus   : (doc.paymentStatus  as WebOrderPaymentStatus)   ?? "pending",
    origin          : (doc.origin         as WebOrderOrigin)          ?? "one-time",
    deliveryOption  : (doc.deliveryOption as "delivery" | "pickup")   ?? "delivery",
    placedAt        : createdAt ?? "",
    placedAtLabel   : placedAtLabel(createdAt),
    deliveringBy    : deliveringByLabel,
    deliveredOn     : deliveredOnLabel,
    items           : mapItems(rawItems),
    shippingAddress : mapAddress(doc.shippingAddress as Record<string, unknown> | null),
    billingAddress  : mapAddress(doc.billingAddress  as Record<string, unknown> | null),
    financials      : mapFinancials(doc.financials as Record<string, unknown> | null),
    orderRating     : doc.orderRating != null ? Number(doc.orderRating) : null,
    couponCode,
  };
}


export async function getUserWebOrders(
  token: string | null,
): Promise<WebOrder[]> {
  const headers = authHeaders(token);

 
  const userId = await import("../utils/tokenStorage")
    .then((m) => m.getItem("user_id"));

  const userFilter = userId
    ? `&where[user][equals]=${encodeURIComponent(userId)}`
    : "";

  const res = await fetch(
    `${API_BASE}/web-orders?depth=2&sort=-createdAt&limit=50${userFilter}`,
    { method: "GET", headers },
  );
  const data = await safeParse(res);
  if (!res.ok) {
    throw new Error(
      (data.message as string) ?? `Failed to load store orders (${res.status})`,
    );
  }

  const docs: Record<string, unknown>[] = Array.isArray(data.docs)
    ? (data.docs as Record<string, unknown>[])
    : [];

  return docs.map(mapOrder);
}


export async function getWebOrderById(
  token  : string | null,
  orderId: number | string,
): Promise<WebOrder> {
  const headers = authHeaders(token);
  const res = await fetch(`${API_BASE}/web-orders/${orderId}?depth=2`, {
    method: "GET",
    headers,
  });
  const data = await safeParse(res);
  if (!res.ok) {
    throw new Error(
      (data.message as string) ?? `Failed to load store order (${res.status})`,
    );
  }
  const doc = (data.doc ?? data.order ?? data) as Record<string, unknown>;
  return mapOrder(doc);
}


export async function getWebOrderInvoiceUrl(
  token: string | null,
  orderId: number | string,
): Promise<string | null> {
  const headers = authHeaders(token);
  try {
    const res = await fetch(`${API_BASE}/web-orders/${orderId}?depth=0`, {
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


export async function cancelWebOrder(
  token  : string | null,
  orderId: number | string,
  reason?: string | null,
): Promise<void> {
  const headers = authHeaders(token);
  const q = reason ? `?reason=${encodeURIComponent(String(reason))}` : "";
  const res = await fetch(`${API_BASE}/web-orders/${orderId}/cancel${q}`, {
    method : "GET",
    headers,
  });
  const data = await safeParse(res);
  if (!res.ok) {
    throw new Error(
      (data.message as string) ?? `Cancel failed (${res.status})`,
    );
  }
}

export default {
  getUserWebOrders,
  getWebOrderById,
  cancelWebOrder,
};

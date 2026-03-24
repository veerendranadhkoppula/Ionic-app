const API_BASE = "https://endpoint.whitemantis.ae/api";


export interface Coupon {
  id: string;

  discountText: string;

  description: string;
  code: string;

  expiry: string;
  isActive: boolean;

  discountType: "fixed" | "percentage";
  discountAmount: number;
  minimumAmount: number;
  applicability: string;
}

export interface ValidatedCoupon {
  valid: boolean;
  coupon: {
    id: number;
    code: string;
    discountType: "fixed" | "percentage";
    discountAmount: number;
    minimumAmount: number;
    applicability: string;
    products: null | number[];
  } | null;
  message?: string;
}

function formatExpiry(expiryDate: string | null | undefined): string {
  if (!expiryDate) return "No expiry";
  try {
    const date = new Date(expiryDate);
    return `Expiry - Valid till ${date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  } catch {
    return "No expiry";
  }
}

function formatDiscountText(
  discountType: string,
  discountAmount: number
): string {
  if (discountType === "percentage") return `${discountAmount}% OFF`;
  return `AED ${discountAmount} OFF`;
}

function formatDescription(
  discountType: string,
  discountAmount: number,
  minimumAmount: number
): string {
  const discount =
    discountType === "percentage"
      ? `${discountAmount}%`
      : `AED ${discountAmount}`;
  return `Flat ${discount} off on orders above AED ${minimumAmount}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCouponDoc(d: any): Coupon {

  const statusValue: string = d.couponStatus ?? d.status ?? "";
  const isExpired = d.expiryDate
    ? new Date(d.expiryDate).getTime() < Date.now()
    : false;
  const isActive = statusValue === "active" && !isExpired;

  return {
    id: String(d.id),
    discountText: formatDiscountText(d.discountType, d.discountAmount),
    description: formatDescription(
      d.discountType,
      d.discountAmount,
      d.minimumAmount
    ),
    code: d.code,
    expiry: isExpired ? "Expired" : formatExpiry(d.expiryDate),
    isActive,
    discountType: d.discountType,
    discountAmount: d.discountAmount,
    minimumAmount: d.minimumAmount,
    applicability: d.applicability,
  };
}


export async function getCoupons(shopId: number): Promise<Coupon[]> {
  const res = await fetch(`${API_BASE}/shop/${shopId}/coupons`);
  if (!res.ok) throw new Error(`Failed to load coupons: ${res.status}`);
  const data = await res.json();
  console.log("🎟 Coupons API raw response:", data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs: any[] = data?.docs ?? data?.coupons ?? data?.data ?? [];
  return docs.map(mapCouponDoc);
}


export async function validateCoupon(
  code: string,
  token: string | null,
  shopId: number
): Promise<ValidatedCoupon> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `JWT ${token}`;

  const res = await fetch(`${API_BASE}/shop/${shopId}/coupons/${code}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    if (res.status === 404 || res.status === 400) {
      return { valid: false, coupon: null, message: "Invalid or expired coupon" };
    }
    throw new Error(`Coupon validation failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    valid: data?.valid ?? data?.success ?? false,
    coupon: data?.coupon ?? null,
    message: data?.message,
  };
}

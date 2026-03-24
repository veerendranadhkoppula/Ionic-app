/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = "https://endpoint.whitemantis.ae/api";


export async function getBestSellerIds(shopId: number): Promise<Set<number>> {
  const res = await fetch(`${API_BASE}/shop/${shopId}/best-seller`, {
    method: "GET",
  });

  if (!res.ok) {
    console.warn(`Best-seller fetch failed: ${res.status}`);
    return new Set();
  }

  const data = await res.json();
  const ids: number[] = data?.productIds ?? [];
  return new Set(ids);
}


export interface Barista {
  id: number;
  name: string;

  shortDesc: string;

  fullDesc: string;
  profileImage: string | null;
  speciality: string | null;
}


export async function getBaristas(token: string | null, shopId: number): Promise<Barista[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `JWT ${token}`;

  const res = await fetch(
    `${API_BASE}/shop/${shopId}/barista`,
    { method: "GET", headers }
  );

  if (!res.ok) {
    throw new Error(`Barista fetch failed: ${res.status}`);
  }

  const data = await res.json();
  // Response shape: { success: true, baristas: [...] }
  const docs: any[] = data?.baristas ?? [];

  return docs.map((d: any): Barista => {
    const imageUrl: string | null = d.profileImage?.url
      ? d.profileImage.url.startsWith("http")
        ? d.profileImage.url
        : `${API_BASE.replace("/api", "")}${d.profileImage.url}`
      : null;

    const speciality: string | null = d.speciality ?? null;

    return {
      id: d.id,
      name: d.name ?? "Barista",
      shortDesc: speciality ?? "Here to make your drink with care",
      fullDesc: d.bio ?? d.fullDesc ?? speciality ?? "Expert in latte art and specialty brews.",
      profileImage: imageUrl,
      speciality,
    };
  });
}



export type PayloadShop = {
  id: number;
  name: string;

  isShopOpen?: boolean;
  operationalSettings?: {
    /** ISO datetime string — only the time portion (HH:mm UTC) is used for daily check */
    openingTime?   : string;
    /** ISO datetime string — only the time portion (HH:mm UTC) is used for daily check */
    closingTime?   : string;
    operatingDays? : {
      monday?   : boolean;
      tuesday?  : boolean;
      wednesday?: boolean;
      thursday? : boolean;
      friday?   : boolean;
      saturday? : boolean;
      sunday?   : boolean;
    };
  };
};


export function isShopOpen(shop: PayloadShop): boolean {
 
  if (shop.isShopOpen === false) {
    console.log("🕐 [isShopOpen] closed — manual toggle is OFF");
    return false;
  }

  const ops = shop.operationalSettings;

 
  const days = ops?.operatingDays;
  if (days) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const todayKey = dayNames[new Date().getDay()];
    if (days[todayKey] === false) {
      console.log(`🕐 [isShopOpen] closed — today (${todayKey}) is not an operating day`);
      return false;
    }
  }

 
  const openingIso  = ops?.openingTime;
  const closingIso  = ops?.closingTime;

  if (openingIso && closingIso) {
    const now     = new Date();
    const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();

    const openDate  = new Date(openingIso);
    const closeDate = new Date(closingIso);
    const openMins  = openDate.getUTCHours() * 60 + openDate.getUTCMinutes();
    const closeMins = closeDate.getUTCHours() * 60 + closeDate.getUTCMinutes();

    const inWindow = openMins < closeMins
      ? nowMins >= openMins && nowMins < closeMins          
      : nowMins >= openMins || nowMins < closeMins;          

    if (!inWindow) {
      console.log(
        `🕐 [isShopOpen] closed — current UTC ${now.getUTCHours()}:${String(now.getUTCMinutes()).padStart(2,"0")} ` +
        `is outside window ${openDate.getUTCHours()}:${String(openDate.getUTCMinutes()).padStart(2,"0")}–` +
        `${closeDate.getUTCHours()}:${String(closeDate.getUTCMinutes()).padStart(2,"0")}`
      );
      return false;
    }
  }

  console.log("🕐 [isShopOpen] shop is OPEN");
  return true;
}

export type RawMenuItem = {
  id: number;
  name: string;
  tagline?: string;
  description?: string;

  price?: number;
  salePrice?: number;

  dietaryType?: string;

  isAvailable?: boolean;
  stockCount?: number;

  image?: any;

  category?: {
    id: number;
    title: string;
    slug: string;
  };

  subCategory?: {
    id: number;
    title: string;
    slug: string;
  }[];

  customizations?: any;

  isStampEligible?    : boolean;   // earn 1 stamp when this item is purchased
  isStampFreeProduct? : boolean;   // can be redeemed as a free reward
};

export type MenuItem = {
  id: number;
  name: string;
  tagline?: string;
  desc: string;
  fullDesc?: string;

  price: number;
  originalPrice?: number;
  discountedPrice?: number;

  vegType: "Veg" | "NonVeg" | "Egg" | "Vegan";

  bestseller: boolean;
  inStock: boolean;

  image: string;
  customizations?: any[];

  /** Loyalty flags — populated from single item endpoint */
  isStampEligible?    : boolean;
  isStampFreeProduct? : boolean;
};

export type MenuCategory = {
  title: string;
  items: MenuItem[];
};

export type MenuShape = Record<string, MenuCategory[]>;


export async function getSingleMenuItem(
  shopId: number,
  itemId: number
): Promise<MenuItem> {
  const res = await fetch(
    `${API_BASE}/shop/${shopId}/menu-items/${itemId}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch item");
  }

  const data = await res.json();

  if (!data.success) {
    throw new Error("Item API success false");
  }

  const item = data.item;

  return {
    id: item.id,
    name: item.name,
    desc: item.description || "",
    fullDesc: item.description || "",
    price: item.salePrice || item.regularPrice,
    originalPrice:
      item.salePrice < item.regularPrice
        ? item.regularPrice
        : undefined,
    discountedPrice:
      item.salePrice < item.regularPrice
        ? item.salePrice
        : undefined,
   vegType: normalizeDietaryType(item.dietaryType),
    bestseller: false,
    inStock: item.inStock,
    image: item.image?.url
      ? item.image.url.startsWith("http")
        ? item.image.url
        : `https://endpoint.whitemantis.ae${item.image.url}`
      : "",
    customizations: item.customizations || [],
    // Loyalty flags — present on single item response, absent from list endpoint
    isStampEligible    : item.isStampEligible    === true,
    isStampFreeProduct : item.isStampFreeProduct === true,
  };
}
export async function getShops(): Promise<{
  docs: PayloadShop[];
}> {
  console.log("🌍 Fetching Shops...");

  const res = await fetch(`${API_BASE}/shop`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Shop API failed: ${res.status}`);
  }

  const data = await res.json();

  console.log("📦 Shops Response:", data);

  return data;
}

export async function getSingleShop(): Promise<PayloadShop> {
  const data = await getShops();

  if (!data?.docs?.length) {
    throw new Error("No shops found");
  }

  console.log("🏪 Using Shop:", data.docs[0]);

  return data.docs[0];
}



export async function getShopMenu(
  shopId: number
): Promise<RawMenuItem[]> {
  const url = `${API_BASE}/shop/${shopId}/menu-items`;

  console.log("🌍 Calling NEW Menu API:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Menu API Error:", res.status, text);
    throw new Error(`Menu fetch failed: ${res.status}`);
  }

  const data = await res.json();

  console.log("📦 Menu API Response:", data);
  // 🔍 STAMP DEBUG — log first item to verify isStampEligible field is present
  if (data.items?.length > 0) {
    const first = data.items[0];
    console.log("🔍 STAMP DEBUG first menu item keys:", Object.keys(first));
    console.log("🔍 STAMP DEBUG first item isStampEligible:", first.isStampEligible, "isStampFreeProduct:", first.isStampFreeProduct);
  }

  if (!data.success) {
    throw new Error("Menu API success false");
  }

  return data.items || [];
}


function normalizeDietaryType(
  value?: string
): "Veg" | "NonVeg" | "Egg" | "Vegan" {
  if (!value) return "Veg";

  const v = value.toLowerCase();

  if (v.includes("non")) return "NonVeg";
  if (v === "egg") return "Egg";
  if (v === "vegan") return "Vegan";

  return "Veg";
}

function extractImageUrl(image: any): string {
  if (!image) return "";

  if (typeof image === "string") return image;

  if (image?.url) {
    return image.url.startsWith("http")
      ? image.url
      : `https://endpoint.whitemantis.ae${image.url}`;
  }

  return "";
}


export function transformToMenuShape(
  items: RawMenuItem[]
): MenuShape {
  console.log("🔄 Transforming Menu Items:", items);

  const result: MenuShape = {};

  items.forEach((item) => {
    const mainCategory = item.category?.slug?.toUpperCase();

    if (!mainCategory) return;

    if (!result[mainCategory]) {
      result[mainCategory] = [];
    }

    const subCats =
      item.subCategory && Array.isArray(item.subCategory)
        ? item.subCategory.map((s: any) => s?.title)
        : ["General"];

    subCats.forEach((subTitle) => {
      if (!subTitle) return;

      let categoryBlock = result[mainCategory].find(
        (c) => c.title === subTitle
      );

      if (!categoryBlock) {
        categoryBlock = {
          title: subTitle,
          items: [],
        };
        result[mainCategory].push(categoryBlock);
      }

      const regular = Number(item.price ?? 0);
      const sale = Number(item.salePrice ?? 0);

      const hasDiscount =
        sale > 0 && regular > 0 && sale < regular;

      const mappedItem: MenuItem = {
        id: item.id,
        name: item.name,
        tagline: item.tagline,
        desc: item.description || "",
        fullDesc: item.description || "",

        price: hasDiscount ? sale : regular,
        originalPrice: hasDiscount ? regular : undefined,
        discountedPrice: hasDiscount ? sale : undefined,

        vegType: normalizeDietaryType(item.dietaryType),

        bestseller: false, 
        inStock: item.isAvailable ?? false,

        image: extractImageUrl(item.image),
        // propagate any customization panel info from the list endpoint so
        // callers (e.g. CafeMenu) can show a "Customizable" label without
        // fetching the single-item endpoint for every card.
        customizations: item.customizations || [],
      };

      categoryBlock.items.push(mappedItem);
    });
  });

  console.log("🎯 Final Structured Menu:", result);

  return result;
}



// ── User Preferences ──────────────────────────────────────────────────────────

export interface UserPreferences {
  /** User's default order type, e.g. "take-away" or "dine-in" */
  orderType?           : string;
  /** User's default time-selection, e.g. "immediate" or "custom" */
  timeSelection?       : string;
  /** Any other preference fields the API may return */
  [key: string]        : unknown;
}

/**
 * Fetch the authenticated user's saved preferences.
 * GET /api/app/preferences  — requires JWT Authorization header.
 * Returns null on any failure (caller should use defaults).
 */
export async function getUserPreferences(token: string | null): Promise<UserPreferences | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  try {
    const res = await fetch(`${API_BASE}/app/preferences`, { method: "GET", headers });
    if (!res.ok) {
      console.warn(`getUserPreferences failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return (data?.preferences ?? data) as UserPreferences;
  } catch (e) {
    console.warn("getUserPreferences error:", e);
    return null;
  }
}

// ── Ship & Tax ────────────────────────────────────────────────────────────────

/**
 * Fetch global tax + emirate delivery charges.
 * GET /api/globals/ship-and-tax  — no auth required.
 *
 * Currently used for cafe checkout tax calculation.
 * When a dedicated cafe-tax endpoint is added, swap the URL here.
 */
export interface ShipAndTax {
  tax             : number;   // % tax applied to item total
  emirateCharges  : Record<string, number>;
}

export async function getShipAndTax(): Promise<ShipAndTax> {
  try {
    const res = await fetch(`${API_BASE}/globals/ship-and-tax`, { method: "GET" });
    if (!res.ok) {
      console.warn(`getShipAndTax failed: ${res.status}`);
      return { tax: 0, emirateCharges: {} };
    }
    const data = await res.json();
    return {
      tax            : typeof data?.tax === "number" ? data.tax : 0,
      emirateCharges : data?.emirateCharges ?? {},
    };
  } catch (e) {
    console.warn("getShipAndTax error:", e);
    return { tax: 0, emirateCharges: {} };
  }
}

// ── User WT Coins ─────────────────────────────────────────────────────────────
// Logic has been moved to apiCoins.ts — re-exported here for backwards compatibility.
export { getUserWtCoins } from "./apiCoins";
import { getUserWtCoins } from "./apiCoins";

// ── Slots ─────────────────────────────────────────────────────────────────────

export interface CafeSlot {
  id              : number;
  /** "now" = the special "Order Now" slot | ISO datetime string for specific-time slots */
  slotTime        : string;
  isActive        : boolean;
  /** "now" | "custom" — mirrors backend timeSelection field on the Slots collection */
  timeSelection   : "now" | "custom";
  /** Human-readable label shown in the UI, e.g. "Order Now" or "02:00 PM" */
  label           : string;
}

/**
 * GET /api/slots
 * Returns all active slots.
 * Includes the special "now" slot (label "Order Now") and all custom time slots.
 * Slots with isActive=false are excluded.
 */
export async function getShopSlots(token: string | null): Promise<CafeSlot[]> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `JWT ${token}`;

  try {
    const res = await fetch(`${API_BASE}/slots?limit=100`, { method: "GET", headers });
    if (!res.ok) {
      console.warn(`getShopSlots failed: ${res.status}`, await res.text().catch(() => ""));
      return [];
    }
    const data = await res.json();
    console.log("📅 getShopSlots raw response:", JSON.stringify(data, null, 2));

    const docs: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.docs)
      ? data.docs
      : [];

    return docs
      // Only show slots where isActive is not explicitly false
      .filter((d) => d.isActive !== false)
      .map((d) => {
        const ts = String(d.timeSelection ?? "custom") as "now" | "custom";

        // "now" slot → special label
        if (ts === "now") {
          return {
            id           : Number(d.id),
            slotTime     : "now",
            isActive     : Boolean(d.isActive ?? true),
            timeSelection: "now",
            label        : "Order Now",
          };
        }

        // custom slot → parse the ISO date/time stored in "slot" field
        const rawSlot = String(d.slot ?? "");
        let label = rawSlot;
        try {
          if (rawSlot) {
            const dt = new Date(rawSlot);
            if (!isNaN(dt.getTime())) {
              label = dt.toLocaleTimeString("en-US", {
                hour  : "2-digit",
                minute: "2-digit",
                hour12: true,
              });
            }
          }
        } catch { /* use rawSlot as fallback */ }

        return {
          id           : Number(d.id),
          slotTime     : rawSlot,
          isActive     : Boolean(d.isActive ?? true),
          timeSelection: "custom",
          label,
        };
      });
  } catch (e) {
    console.warn("getShopSlots error:", e);
    return [];
  }
}

// ── Cafe Checkout ─────────────────────────────────────────────────────────────

/** A single order line item sent to the backend. */
export interface CafeCheckoutItem {
  product        : number;       // shop-menu document ID
  quantity       : number;
  customizations : unknown[];    // JSON blob — backend stores as-is
}

// ── Order Detail ──────────────────────────────────────────────────────────────

/** One line-item in the order confirm screen */
export interface OrderResultItem {
  id            : number;
  /** Backend productId — used by OrderResultsDetail for snapshot fallback matching */
  productId     ?: number;
  /** Item qty as stored on the order */
  quantity      ?: number;
  name          : string;
  variant       : string;   // first customization label (backward-compat)
  addon         : string;   // second customization label (backward-compat)
  price         : number;   // (basePrice + custExtras) × qty
  customizations: { label: string; price: number }[];  // all selected options
  isReward      ?: boolean; // true when this line was a stamp-reward / free item
}

/** Barista info shown on the confirm screen */
export interface OrderResultBarista {
  name                       : string;
  messageConfirmedTakeaway   : string;
  messageConfirmedDinein     : string;
}

/** Full data needed by OrderResultsDetail */
export interface OrderResultData {
  storeName   : string;
  pickupTime  : string;        // "10:00 AM"
  pickupDate  : string;        // "05 Jan 2026"
  orderNumber : string;        // dine-in queue number
  servedBy    : OrderResultBarista;
  orderId     : string;        // display string  "#WMC - 1234"
  items       : OrderResultItem[];
  calculations: {
    itemTotal       : number;
    taxes           : number;
    couponCode      : string;
    discount        : number;
    wtCoinsDiscount : number;   // AED value of beans redeemed (0 if none used)
    total           : number;
  };
}

/**
 * Fetch a single app-order by its DB id.
 * GET /api/app-orders/:id
 */
export async function getOrderById(
  token   : string | null,
  orderId : string | number,
): Promise<OrderResultData> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  console.log("📦 getOrderById → fetching orderId:", orderId, "url:", `${API_BASE}/app-orders/${orderId}`);

  const res = await fetch(`${API_BASE}/app-orders/${orderId}`, { method: "GET", headers });
  const data = await res.json().catch(() => ({}));

  console.log(`📦 getOrderById RESPONSE (${res.status}):`, JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(data?.message ?? `Order fetch failed (${res.status})`);
  }

  // PayloadCMS returns the document at root level (no wrapping key)
  const doc: Record<string, any> = data?.doc ?? data?.order ?? data ?? {};

  console.log("📦 doc.barista:", JSON.stringify(doc?.barista));
  console.log("📦 doc.slot:", JSON.stringify(doc?.slot));
  console.log("📦 doc.financials:", JSON.stringify(doc?.financials));
  console.log("📦 doc.items:", JSON.stringify(doc?.items));
  console.log("📦 doc.coupon:", JSON.stringify(doc?.coupon));

  // ── Store name ────────────────────────────────────────────────────────────
  // shop is a populated object but may not have a "name" field from this endpoint
  const storeName: string =
    (typeof doc?.shop === "object" && doc.shop?.name)
      ? doc.shop.name
      : "White Mantis Roastery & Lab";

  // ── Pickup date/time ──────────────────────────────────────────────────────
  // doc.slot is a populated object: { timeSelection: "now", slot: null } for immediate orders
  // Use the actual slot ISO string if present, otherwise fall back to doc.createdAt
  const fixIso = (raw: string): string =>
    raw && !raw.endsWith("Z") && !raw.includes("+") ? raw + "Z" : raw;

  const parseDateSafe = (iso: string): Date | null => {
    const d = new Date(fixIso(iso));
    return isNaN(d.getTime()) ? null : d;
  };

  // Extract the actual ISO string from the slot object (null when timeSelection = "now")
  const slotIso: string | null =
    typeof doc?.slot === "string" ? doc.slot :
    (typeof doc?.slot === "object" && doc.slot?.slot) ? String(doc.slot.slot) :
    null;

  const slotDate    = slotIso ? parseDateSafe(slotIso) : null;
  const fallbackDate = doc?.createdAt ? parseDateSafe(doc.createdAt) : null;
  const dateToUse   = slotDate ?? fallbackDate;

  let pickupTime = "Now";
  let pickupDate = "";

  if (dateToUse) {
    pickupTime = dateToUse.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    pickupDate = dateToUse.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    console.log("📦 pickupTime:", pickupTime, "pickupDate:", pickupDate);
  }

  // ── Dine-in order number ──────────────────────────────────────────────────
  const orderNumber: string = String(doc?.orderNumber ?? doc?.id ?? "");

  // ── Barista ───────────────────────────────────────────────────────────────
  // doc.barista is a NUMBER ID (not populated). Fetch from /api/shop/1/barista list.
  let baristaName       = "Our Barista";
  let baristaSpeciality = "Here to make your drinks with care";

  const baristaIdRaw = doc?.barista ?? doc?.selectedBarista ?? null;

  if (typeof baristaIdRaw === "object" && baristaIdRaw !== null) {
    // Already populated
    baristaName       = baristaIdRaw?.name       ?? baristaName;
    baristaSpeciality = baristaIdRaw?.speciality ?? baristaIdRaw?.bio ?? baristaSpeciality;
  } else if (typeof baristaIdRaw === "number") {
    // Fetch barista list and find by ID
    try {
      const shopId = typeof doc?.shop === "object" ? (doc.shop?.id ?? 1) : 1;
      const bRes = await fetch(`${API_BASE}/shop/${shopId}/barista`, {
        method: "GET",
        headers,
      });
      if (bRes.ok) {
        const bData = await bRes.json().catch(() => ({}));
        const baristas: any[] = bData?.baristas ?? [];
        const found = baristas.find((b: any) => b.id === baristaIdRaw || b._id === baristaIdRaw);
        if (found) {
          baristaName       = found.name       ?? baristaName;
          baristaSpeciality = found.speciality ?? found.bio ?? baristaSpeciality;
          console.log("📦 Barista resolved:", baristaName, baristaSpeciality);
        } else {
          console.warn("📦 Barista ID", baristaIdRaw, "not found in list of", baristas.length);
        }
      }
    } catch (bErr) {
      console.warn("📦 Barista fetch failed:", bErr);
    }
  }

  // ── Order display ID ──────────────────────────────────────────────────────
  const displayId: string = `#WMC - ${doc?.id ?? orderId}`;

  // ── Items ─────────────────────────────────────────────────────────────────
  // doc.items[].product is a NUMBER ID — fetch each via /api/shop/:shopId/menu-items/:id
  const rawItems: any[] = Array.isArray(doc?.items) ? doc.items : [];
  const shopIdForMenu = typeof doc?.shop === "object" ? (doc.shop?.id ?? 1) : 1;

  
  const stampRewardPidCount = new Map<number, number>();
  const rawStampRewards: any[] = Array.isArray(doc?.stampRewards) ? doc.stampRewards : [];
  for (const sr of rawStampRewards) {
    const pid =
      typeof sr === "number" ? sr :
      typeof sr === "object" && sr !== null ? (sr?.id ?? sr?.value?.id ?? null) :
      null;
    if (pid != null) {
      stampRewardPidCount.set(Number(pid), (stampRewardPidCount.get(Number(pid)) ?? 0) + 1);
    }
  }
  console.log("📦 stampRewardPidCount:", [...stampRewardPidCount.entries()]);

  const productFetches = rawItems.map(async (item: any) => {
    const productId = typeof item?.product === "number" ? item.product :
                      typeof item?.product === "object" ? (item.product?.id ?? null) : null;
    if (!productId) {
      console.warn("📦 Item has no valid productId:", JSON.stringify(item));
      return null;
    }
    try {
      const pRes = await fetch(`${API_BASE}/shop/${shopIdForMenu}/menu-items/${productId}`, {
        method: "GET",
      });
      if (!pRes.ok) {
        console.warn(`📦 menu-items/${productId} returned ${pRes.status}`);
        return null;
      }
      const pData = await pRes.json().catch(() => null);
      console.log(`📦 menu-items/${productId}:`, JSON.stringify({ name: pData?.item?.name, salePrice: pData?.item?.salePrice, regularPrice: pData?.item?.regularPrice }));
      return pData?.item ?? null;
    } catch (pErr) {
      console.warn(`📦 menu-items/${productId} fetch error:`, pErr);
      return null;
    }
  });

  const productDocs: (any | null)[] = await Promise.all(productFetches);

  const items: OrderResultItem[] = rawItems.map((item: any, idx: number) => {
    const productDoc: Record<string, any> = productDocs[idx] ?? {};

    const name: string =
      productDoc?.name   ??
      productDoc?.title  ??
      `Item ${idx + 1}`;

    // Price per unit — prefer salePrice, then regularPrice
    const unitPrice: number =
      productDoc?.salePrice     ??
      productDoc?.regularPrice  ??
      productDoc?.discountPrice ??
      productDoc?.price         ??
      0;

    const qty = item?.quantity ?? 1;

    // Customizations — extract labels and per-option prices
    const custs: any[] = Array.isArray(item?.customizations) ? item.customizations : [];
    const validCusts = custs.filter(
      (c: any) => c != null && !(Array.isArray(c) && c.length === 0)
    );

    // Sum extra cost from priced customization options
    const custExtraPerUnit: number = validCusts.reduce(
      (sum: number, c: any) => sum + (Number(c?.price) || 0),
      0
    );

    // Resolve the numeric productId for this item (used by OrderResultsDetail snapshot fallback)
    const resolvedProductId: number | undefined =
      typeof item?.product === "number" ? item.product :
      typeof item?.product === "object" ? (item.product?.id ?? undefined) :
      undefined;

    // Stamp reward items are FREE — always show AED 0 regardless of the product's menu price.
    // Consume one reward count per item so that if the user also bought the same product
    // at full price in the same order, only the reward quantity is zeroed out.
    const remainingRewardCount = resolvedProductId != null ? (stampRewardPidCount.get(resolvedProductId) ?? 0) : 0;
    const isRewardItem = remainingRewardCount > 0;
    if (isRewardItem && resolvedProductId != null) {
      stampRewardPidCount.set(resolvedProductId, remainingRewardCount - 1);
    }
    const effectiveUnitPrice = isRewardItem ? 0 : unitPrice;
    const price: number = parseFloat(((effectiveUnitPrice + (isRewardItem ? 0 : custExtraPerUnit)) * qty).toFixed(2));

    // Build rich customizations array for display: { label, price }
    const customizations: { label: string; price: number }[] = validCusts
      .filter((c: any) => c?.selectedOptionLabel)
      .map((c: any) => ({
        label: c.selectedOptionLabel as string,
        price: Number(c?.price) || 0,
      }));

    // backward-compat fields
    const variant: string = customizations[0]?.label ?? "";
    const addon: string   = customizations[1]?.label ?? (validCusts.length > 0 ? validCusts[0]?.sectionTitle ?? "" : "");

    console.log(`📦 Item[${idx}]: name="${name}" qty=${qty} unitPrice=${unitPrice} effectiveUnitPrice=${effectiveUnitPrice} custExtra=${custExtraPerUnit} totalPrice=${price} isReward=${isRewardItem}`, customizations);
  return { id: idx + 1, productId: resolvedProductId, quantity: qty, name, variant, addon, price, customizations, isReward: isRewardItem };
  });

  // ── Calculations ──────────────────────────────────────────────────────────
  // Real API fields: financials.{ subtotal, taxAmount, couponDiscount, wtCoinsDiscount, total }
  // coupon code: doc.coupon.code (populated object)
  const fin: Record<string, any> =
    (typeof doc?.financials === "object" && doc.financials) ? doc.financials : {};

  console.log("📦 financials fields:", JSON.stringify(fin));

  const itemTotal: number =
    fin?.subtotal        ??
    fin?.itemTotal       ??
    fin?.itemsTotal      ??
    doc?.subtotal        ??
    parseFloat(items.reduce((s, i) => s + i.price, 0).toFixed(2));

  // Real field is "taxAmount" not "tax"
  const taxes: number =
    fin?.taxAmount       ??
    fin?.tax             ??
    fin?.taxes           ??
    doc?.taxAmount       ??
    doc?.tax             ??
    0;

  // Real field is "couponDiscount" not "discount"
  const discount: number =
    fin?.couponDiscount       ??
    fin?.discount             ??
    fin?.couponDiscountAmount ??
    doc?.couponDiscount       ??
    doc?.discount             ??
    0;

  // Beans redeemed — backend field is "wtCoinsDiscount"
  const wtCoinsDiscount: number =
    fin?.wtCoinsDiscount      ??
    fin?.coinsDiscount        ??
    doc?.wtCoinsDiscount      ??
    doc?.coinsDiscount        ??
    0;

  // Coupon code lives in doc.coupon.code (populated object), NOT doc.couponCode
  const couponCode: string =
    (typeof doc?.coupon === "object" && doc.coupon?.code) ? doc.coupon.code :
    fin?.couponCode      ??
    doc?.couponCode      ??
    doc?.appliedCouponCode ??
    "";

  const total: number =
    fin?.total           ??
    fin?.grandTotal      ??
    fin?.toPay           ??
    doc?.toPay           ??
    doc?.total           ??
    parseFloat((itemTotal + taxes - discount).toFixed(2));

  console.log("📦 Calculations: itemTotal:", itemTotal, "taxes:", taxes, "discount:", discount, "wtCoinsDiscount:", wtCoinsDiscount, "couponCode:", couponCode, "total:", total);

  return {
    storeName,
    pickupTime,
    pickupDate,
    orderNumber,
    servedBy: {
      name                     : baristaName,
      messageConfirmedTakeaway : baristaSpeciality,
      messageConfirmedDinein   : "Your barista for this order",
    },
    orderId     : displayId,
    items,
    calculations: { itemTotal, taxes, couponCode, discount, wtCoinsDiscount, total },
  };
}

export interface CafeCheckoutPayload {
  shopId              : number;
  orderType           : "take-away" | "dine-in";
  /** Backend-accepted values: "now" (immediate) | "custom" (specific slot) */
  timeSelection       : "now" | "custom";
  selectedSlot        : number | null;
  useWTCoins          : boolean;
  specialInstructions : string;
  appliedCouponCode   : string | null;
  selectedBarista     : number | null;
  stampRewards        : unknown[];
  /** Cart items — required by backend (cart is NOT read from session) */
  items               : CafeCheckoutItem[];
}

export interface CafeCheckoutResponse {
  success   : boolean;
  orderId  ?: string | number;
  order    ?: { id?: string | number; [key: string]: unknown };
  id       ?: string | number;
  doc      ?: { id?: string | number; [key: string]: unknown };
  message  ?: string;
  [key: string]: unknown;
}

/**
 * POST /api/checkout/cafe-checkout
 * Creates a cafe order in the backend.
 * Returns the full response body so callers can read orderId / Stripe clientSecret.
 */
export async function cafeCafeCheckout(
  token: string | null,
  payload: CafeCheckoutPayload,
): Promise<CafeCheckoutResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  // Build the body — send coupon under BOTH field names since backend
  // might use 'couponCode' instead of 'appliedCouponCode'
  const body: Record<string, unknown> = {
    ...payload,
    couponCode        : payload.appliedCouponCode ?? null,   // alternative field name
    appliedCouponCode : payload.appliedCouponCode ?? null,   // keep original too
  };

  console.log("🛒 cafe-checkout PAYLOAD:", JSON.stringify(body, null, 2));
  console.log("🎟️  coupon being sent — appliedCouponCode:", payload.appliedCouponCode, "| couponCode:", payload.appliedCouponCode);
  console.log("🔑 token present:", !!token);

  const res = await fetch(`${API_BASE}/checkout/cafe-checkout`, {
    method  : "POST",
    headers,
    body    : JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  console.log(`🛒 cafe-checkout RESPONSE (${res.status}):`, JSON.stringify(data, null, 2));
  if (!res.ok) {
    console.error("❌ cafe-checkout failed. Status:", res.status, "| Body sent:", JSON.stringify(body, null, 2));
  }

  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? data?.errors?.[0]?.message ?? `Checkout failed (${res.status})`;
    throw new Error(msg);
  }

  return data as CafeCheckoutResponse;
}

export interface CafePayPayload {
  orderId     : string | number;
  stripeToken : string;
  nameOnCard  : string;
  address     : string;
}

export interface CafePayResponse {
  success      : boolean;
  orderStatus ?: string;
  message     ?: string;
  [key: string]: unknown;
}

/**
 * @deprecated  Payment is now sent in a single cafe-checkout call.
 */
export async function cafePay(
  token  : string | null,
  payload: CafePayPayload,
): Promise<CafePayResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  console.warn("⚠️ cafePay() called — this endpoint no longer exists. Payment should be sent via cafeCafeCheckout.");

  const res = await fetch(`${API_BASE}/checkout/cafe-pay`, {
    method : "POST",
    headers,
    body   : JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? `Payment failed (${res.status})`;
    throw new Error(msg);
  }

  return data as CafePayResponse;
}


export async function cancelCafeOrder(
  token  : string | null,
  orderId: string | number,
  reason : string = "Cancelled by user",
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  const url = `${API_BASE}/app-orders/${orderId}/cancel?reason=${encodeURIComponent(String(reason))}`;

try {
    const orderRes = await fetch(`${API_BASE}/app-orders/${orderId}?depth=0`, { method: "GET", headers });
    const orderText = await orderRes.text().catch(() => "");
    const orderData: any = (() => { try { return orderText ? JSON.parse(orderText) : {}; } catch { return { text: orderText }; } })();
    if (orderRes.ok) {
      const doc = orderData?.doc ?? orderData?.order ?? orderData ?? {};
      const paymentStatus = doc?.paymentStatus ?? doc?.financials?.paymentStatus ?? null;
      const stripeData = doc?.stripeData ?? {};
      const orderType = doc?.orderType ?? doc?.orderType;
      const orderStatus = orderType === 'dine-in' ? doc?.appOrderStatusDine ?? doc?.appOrderStatus : doc?.appOrderStatus;

      // Basic checks: must be paid and have a paymentIntentId to refund via Stripe
      if (paymentStatus !== 'paid') {
        throw new Error(`Order not paid (paymentStatus=${String(paymentStatus)}). Refund cannot be initiated.`);
      }
      if (!stripeData || !stripeData.paymentIntentId) {
        throw new Error(`Order missing Stripe paymentIntentId. Refund cannot be initiated.`);
      }
      // Also ensure orderStatus is pending (per backend logic)
      if (String(orderStatus) !== 'pending') {
        throw new Error(`Order status is not pending (status=${String(orderStatus)}). Refund cannot be initiated.`);
      }
    } else {
      // If we couldn't fetch the order, include server body for debugging but continue to attempt cancel
      console.warn('cancelCafeOrder: preflight order fetch failed', orderRes.status, orderData);
    }
  } catch (preErr: any) {
   
    console.warn('cancelCafeOrder preflight check failed — attempting cancel route anyway:', preErr?.message ?? preErr);
  }

  
  try {
    let res = await fetch(url, { method: "GET", headers });
    const text = await res.text().catch(() => "");
    let body: any = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { text }; }
    if (res.ok) return;

    console.warn(`cancelCafeOrder GET failed (${res.status}) — trying POST fallback. body=`, body);

    // Try POST fallback
    res = await fetch(url, { method: "POST", headers });
    const text2 = await res.text().catch(() => "");
    let body2: any = {};
    try { body2 = text2 ? JSON.parse(text2) : {}; } catch { body2 = { text: text2 }; }
    if (res.ok) return;

    console.warn(`cancelCafeOrder POST fallback failed (${res.status}) — trying PATCH fallback. body=`, body2);

    // Final fallback: PATCH the order status to cancelled (legacy behaviour)
    const patchRes = await fetch(`${API_BASE}/app-orders/${orderId}`, {
      method : "PATCH",
      headers,
      body   : JSON.stringify({ appOrderStatus: "cancelled" }),
    });
    const patchText = await patchRes.text().catch(() => "");
    let patchBody: any = {};
    try { patchBody = patchText ? JSON.parse(patchText) : {}; } catch { patchBody = { text: patchText }; }
    if (patchRes.ok) return;

    // None of the attempts worked — throw a detailed error to help debugging
    const errMsg =
      body2?.message || body?.message || patchBody?.message ||
      body2?.text || body?.text || patchBody?.text ||
      `Cancel failed (GET ${res.status} / POST ${res.status} / PATCH ${patchRes.status})`;
    throw new Error(errMsg);
  } catch (e: any) {
    // Re-throw with message preserved — callers can show a user-friendly error
    throw new Error(e?.message ?? String(e));
  }
}

/**
 * @param token
 * @param orderId     The created order ID
 * @param sentItems   The items[] array that was sent to cafe-checkout (same order as stored items)
 *                    Each entry has { product, quantity, customizations: [{sectionId, sectionTitle, selectedOptionId, selectedOptionLabel, price}] }
 */
export async function patchOrderCustomizations(
  token        : string | null,
  orderId      : string | number,
  sentItems    : Array<{
    product       : number;
    quantity      : number;
    customizations: unknown[];
  }>,
  stampRewardIds?: number[],
): Promise<void> {
  // Only proceed if at least one item has customizations
  const anyHasCust = sentItems.some(
    (it) => Array.isArray(it.customizations) && it.customizations.length > 0,
  );
  if (!anyHasCust) {

    if (stampRewardIds && stampRewardIds.length > 0) {
      console.log("⚙️ patchOrderCustomizations: no customizations but stampRewards present — ensuring reward items exist on order", stampRewardIds);
      const headersOnly: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headersOnly["Authorization"] = `JWT ${token}`;
      try {
        // Fetch existing order to get stored items and product relationship objects
        const fetchRes = await fetch(`${API_BASE}/app-orders/${orderId}`, { method: "GET", headers: headersOnly });
        const fetchData = await fetchRes.json().catch(() => ({}));
        const doc: Record<string, any> = fetchData?.doc ?? fetchData?.order ?? fetchData ?? {};
        const storedItems: any[] = Array.isArray(doc.items) ? doc.items : [];

        const existingPids = new Set(storedItems.map((si: any) => String(typeof si.product === 'number' ? si.product : (si.product?.id ?? si.product))));
        const appended: any[] = [];

        for (const rid of stampRewardIds) {
          const rpid = String(rid);
          if (!existingPids.has(rpid)) {
            // Try to reuse stored product relationship if available elsewhere in the order
            const stored = storedItems.find((si: any) => {
              const pid = typeof si.product === 'number' ? String(si.product) : String(si.product?.id ?? si.product);
              return pid === rpid;
            });
            console.log(`⚙️ patchOrderCustomizations: appending reward pid=${rpid} to order items`);
            appended.push({ product: stored?.product ?? Number(rid), quantity: 1, customizations: [] });
            existingPids.add(rpid);
          }
        }

        if (appended.length > 0) {
          const patchBody: Record<string, unknown> = {
            items: [...storedItems, ...appended],
            ...(stampRewardIds && stampRewardIds.length > 0 ? { stampRewards: stampRewardIds } : {}),
          };
          const patchRes = await fetch(`${API_BASE}/app-orders/${orderId}`, {
            method: "PATCH",
            headers: headersOnly,
            body: JSON.stringify(patchBody),
          });
          const patchData = await patchRes.json().catch(() => ({}));
          if (patchRes.ok) {
            console.log(`✅ patchOrderCustomizations: appended ${appended.length} reward item(s) for order ${orderId}`);
          } else {
            console.warn(`⚠️ patchOrderCustomizations: failed to append reward items (${patchRes.status})`, patchData?.message ?? patchData);
          }
        } else {
          // Still write stampRewards relationship in case backend hasn't persisted it
          const patchResOnly = await fetch(`${API_BASE}/app-orders/${orderId}`, {
            method: "PATCH",
            headers: headersOnly,
            body: JSON.stringify({ stampRewards: stampRewardIds }),
          });
          const patchDataOnly = await patchResOnly.json().catch(() => ({}));
          if (patchResOnly.ok) {
            console.log(`✅ patchOrderCustomizations: stampRewards patched for order ${orderId}`);
          } else {
            console.warn(`⚠️ patchOrderCustomizations: stampRewards-only PATCH failed (${patchResOnly.status})`, patchDataOnly?.message ?? patchDataOnly);
          }
        }
      } catch (err) {
        console.warn("⚙️ patchOrderCustomizations: error while ensuring reward items:", err);
      }
    }

    console.log("⚙️ patchOrderCustomizations: no customizations to patch, skipping further work");
    return;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  // --- Step 1: Fetch the created order to get item ObjectIds and current financials ---
  const fetchRes = await fetch(`${API_BASE}/app-orders/${orderId}`, { method: "GET", headers });
  const fetchData = await fetchRes.json().catch(() => ({}));

  if (!fetchRes.ok) {
    console.warn("⚙️ patchOrderCustomizations: fetch order failed", fetchRes.status);
    return;
  }

  const doc: Record<string, any> = fetchData?.doc ?? fetchData?.order ?? fetchData ?? {};
  const storedItems: any[] = Array.isArray(doc.items) ? doc.items : [];
  const fin: Record<string, any> = (typeof doc.financials === "object" && doc.financials) ? doc.financials : {};

  if (storedItems.length === 0) {
    console.warn("⚙️ patchOrderCustomizations: order has no items, skipping");
    return;
  }

  const storedProductIdMap = new Map<string, any>();
  for (const si of storedItems) {
    const pid = typeof si.product === "number" ? String(si.product) :
                typeof si.product === "object" ? String(si.product?.id ?? "") : "";
    if (pid && !storedProductIdMap.has(pid)) {
      // Keep the first stored item for that pid (carries the product relationship)
      storedProductIdMap.set(pid, si);
    }
  }

  let custSubtotalExtra = 0;

  const patchedItems = sentItems.map((sent, idx) => {
    const pid = String(sent.product);
    const stored = storedProductIdMap.get(pid);

    const custs: any[] = Array.isArray(sent.customizations) ? sent.customizations : [];
    const validCusts = custs.filter(
      (c) => c != null && typeof c === "object" && (c.selectedOptionId || c.selectedOptionLabel),
    );

    const custExtraPerUnit = validCusts.reduce(
      (sum: number, c: any) => sum + (Number(c.price) || 0),
      0,
    );
    custSubtotalExtra += custExtraPerUnit * (sent.quantity ?? 1);

    console.log(`⚙️ patchOrderCustomizations item[${idx}]: pid=${pid} qty=${sent.quantity} custExtra/unit=${custExtraPerUnit} custs=${validCusts.length}`);

    return {
      // Use stored product relationship id if we found it; otherwise raw number
      product      : stored?.product ?? sent.product,
      quantity     : sent.quantity ?? 1,
      customizations: validCusts,
    };
  });

  if (stampRewardIds && stampRewardIds.length > 0) {
    const existingPids = new Set(patchedItems.map((it: any) => String(typeof it.product === 'number' ? it.product : (it.product?.id ?? it.product))));
    for (const rid of stampRewardIds) {
      const rpid = String(rid);
      if (!existingPids.has(rpid)) {
        const stored = storedProductIdMap.get(rpid);
        console.log(`⚙️ patchOrderCustomizations: adding missing stamp reward item pid=${rpid} to patchedItems`);
        patchedItems.push({
          product: stored?.product ?? Number(rid),
          quantity: 1,
          customizations: [],
        });
        existingPids.add(rpid);
      }
    }
  }


  const currentSubtotal   = Number(fin.subtotal ?? 0);
  const currentTotal      = Number(fin.total    ?? 0);
  const newSubtotal       = parseFloat((currentSubtotal + custSubtotalExtra).toFixed(2));
  const newTotal          = parseFloat((currentTotal    + custSubtotalExtra).toFixed(2));

  console.log(
    `⚙️ patchOrderCustomizations orderId=${orderId}`,
    `custSubtotalExtra=${custSubtotalExtra}`,
    `subtotal: ${currentSubtotal} → ${newSubtotal}`,
    `total: ${currentTotal} → ${newTotal}`,
    "patchedItems:", patchedItems.map((it: any) => ({ product: it.product, qty: it.quantity, custLen: (it.customizations || []).length })),
  );

  const patchBody: Record<string, unknown> = {
    items: patchedItems,
    financials: {
      ...fin,
      subtotal : newSubtotal,
      total    : newTotal,
    },
   
    ...(stampRewardIds && stampRewardIds.length > 0
      ? { stampRewards: stampRewardIds }
      : {}),
  };

  const patchRes = await fetch(`${API_BASE}/app-orders/${orderId}`, {
    method  : "PATCH",
    headers,
    body    : JSON.stringify(patchBody),
  });
  const patchData = await patchRes.json().catch(() => ({}));

  if (patchRes.ok) {
    console.log(`✅ patchOrderCustomizations: order ${orderId} patched successfully`);
  } else {
    console.warn(`⚠️ patchOrderCustomizations: PATCH failed (${patchRes.status})`, patchData?.message ?? patchData);
  }
}

export default {
  getShops,
  getSingleShop,
  isShopOpen,
  getShopMenu,
  transformToMenuShape,
  getShipAndTax,
  getUserWtCoins,
  getUserPreferences,
  getShopSlots,
  cafeCafeCheckout,
  patchOrderCustomizations,
  cafePay,
  cancelCafeOrder,
};
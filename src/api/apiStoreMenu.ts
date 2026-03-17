const API_BASE = "https://endpoint.whitemantis.ae/api";
export const MEDIA_BASE = "https://endpoint.whitemantis.ae";

// ─── Sub-types ───────────────────────────────────────────────────────────────

export interface SubFreq {
  id: string;
  duration: number;
  interval: string;
}

export interface StoreVariant {
  id: string;
  variantName: string;
  variantRegularPrice: number;
  variantSalePrice: number;
  variantInStock: boolean;
  variantStockQuantity: number | null;
  variantImage?: { url: string };
  hasVariantSub: boolean;
  subscriptionDiscount: number;
  subFreq: SubFreq[];
}

export interface BrewGuide {
  filter: boolean;
  espresso: boolean;
  milk: boolean;
}

export interface ProductCategory {
  id: string | number;
  title: string;
  slug: string;
}

export interface ProductSubCategory {
  slug: string;
  level1Id?: string;
  level2Id?: string;
  subCategoryId?: string;
}

// ─── Category / SubCategory API types ────────────────────────────────────────

export interface WebCategory {
  id: number;
  title: string;
  slug: string;
  createdAt: string;
}

/** level2 / level3 node inside a sub-category level1 */
export interface SubCatLevel2 {
  id: string;
  name: string;
  slug: string;
}

/** Top-level group inside a web-sub-categories doc (level1 row) */
export interface SubCatLevel1 {
  id: string;
  name: string;
  slug: string;
  level2: SubCatLevel2[];
}

/** One sub-categories doc returned by /api/web-sub-categories */
export interface WebSubCategoryDoc {
  id: number;
  parentCategory: WebCategory;
  level1: SubCatLevel1[];
}

// ─── Main product type ────────────────────────────────────────────────────────

export interface StoreProduct {
  id: number;
  name: string;
  tagline: string;
  slug: string;

  // Pricing – null when hasVariantOptions=true (use variant prices instead)
  regularPrice: number | null;
  salePrice: number | null;

  inStock: boolean;
  stockQuantity: number | null;

  hasVariantOptions: boolean;
  variants: StoreVariant[];

  // Subscription
  hasSimpleSub: boolean;
  subscriptionDiscount: number | null;
  subFreq: SubFreq[];

  // Media
  productImage: { url: string; thumbnailURL?: string };

  // Taxonomy
  categories: ProductCategory;
  subCategories: ProductSubCategory[];

  // Detail copy
  description: string;
  farm: string;
  tastingNotes: string;
  variety: string;
  process: string;
  altitude: string;
  body: string;
  aroma: string;
  roast: string;
  finish: string;
  brewing: string;
  brewGuide: BrewGuide;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function resolveImageUrl(relativeUrl: string): string {
  if (!relativeUrl) return "";
  if (relativeUrl.startsWith("http")) return relativeUrl;
  return `${MEDIA_BASE}${relativeUrl}`;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Fetch all published store products.
 * GET /api/web-products?where[_status][equals]=published
 */
export async function getStoreProducts(): Promise<StoreProduct[]> {
  const url = `${API_BASE}/web-products?where[_status][equals]=published&limit=100`;
  console.log("[apiStoreMenu] getStoreProducts → fetching:", url);

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[apiStoreMenu] getStoreProducts → HTTP error:", res.status, res.statusText);
    throw new Error(`Failed to fetch store products: ${res.status}`);
  }

  const data = await res.json();
  console.log("[apiStoreMenu] getStoreProducts → totalDocs:", data.totalDocs);
  console.log("[apiStoreMenu] getStoreProducts → docs count:", data.docs?.length ?? 0);
  if (data.docs?.length > 0) {
    console.log("[apiStoreMenu] getStoreProducts → first doc sample:", JSON.stringify(data.docs[0]).slice(0, 400));
  }

  const products: StoreProduct[] = (data.docs ?? []).map((doc: Record<string, unknown>) => {
    const product = mapDocToProduct(doc);
    console.log(`[apiStoreMenu] mapped product id=${product.id} name="${product.name}" category="${product.categories?.title}" inStock=${product.inStock} price=${product.salePrice ?? product.regularPrice}`);
    return product;
  });

  return products;
}

/**
 * Fetch a single product by ID.
 * GET /api/web-products/:id
 */
export async function getStoreProductById(id: number): Promise<StoreProduct | null> {
  const url = `${API_BASE}/web-products/${id}`;
  console.log("[apiStoreMenu] getStoreProductById → fetching:", url);

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[apiStoreMenu] getStoreProductById → HTTP error:", res.status, res.statusText);
    return null;
  }

  const doc = await res.json();
  console.log("[apiStoreMenu] getStoreProductById → raw doc:", JSON.stringify(doc).slice(0, 400));

  return mapDocToProduct(doc as Record<string, unknown>);
}

/**
 * Fetch all store categories (top-level).
 * GET /api/web-categories
 */
export async function getStoreCategories(): Promise<WebCategory[]> {
  const url = `${API_BASE}/web-categories?limit=50`;
  console.log("[apiStoreMenu] getStoreCategories → fetching:", url);

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[apiStoreMenu] getStoreCategories → HTTP error:", res.status, res.statusText);
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }

  const data = await res.json();
  console.log("[apiStoreMenu] getStoreCategories → docs:", data.docs?.map((d: WebCategory) => d.title));
  return (data.docs ?? []) as WebCategory[];
}

/**
 * Fetch sub-categories for a given category slug.
 * GET /api/web-sub-categories?where[parentCategory.slug][equals]=<slug>&depth=1
 * Returns the level1 array (groups) from the first matching doc.
 */
export async function getStoreSubCategories(categorySlug: string): Promise<SubCatLevel1[]> {
  const url = `${API_BASE}/web-sub-categories?where[parentCategory.slug][equals]=${encodeURIComponent(categorySlug)}&depth=1&select[level1]=true&select[parentCategory]=true`;
  console.log("[apiStoreMenu] getStoreSubCategories → fetching:", url);

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[apiStoreMenu] getStoreSubCategories → HTTP error:", res.status, res.statusText);
    return [];
  }

  const data = await res.json();
  const docs: WebSubCategoryDoc[] = data.docs ?? [];
  console.log("[apiStoreMenu] getStoreSubCategories → docs count:", docs.length);

  if (docs.length === 0) return [];

  // There's one doc per category — take its level1 array
  const level1 = docs[0].level1 ?? [];
  console.log("[apiStoreMenu] getStoreSubCategories → level1 groups:", level1.map((l) => l.name));
  return level1;
}

// ─── Internal mapper ──────────────────────────────────────────────────────────

function mapDocToProduct(doc: Record<string, unknown>): StoreProduct {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;

  const variants: StoreVariant[] = (d.variants ?? []).map((v: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variant = v as any;
    return {
      id: String(variant.id ?? ""),
      variantName: String(variant.variantName ?? ""),
      variantRegularPrice: Number(variant.variantRegularPrice ?? 0),
      variantSalePrice: Number(variant.variantSalePrice ?? 0),
      variantInStock: Boolean(variant.variantInStock ?? true),
      variantStockQuantity: variant.variantStockQuantity != null ? Number(variant.variantStockQuantity) : null,
      variantImage: variant.variantImage ? { url: resolveImageUrl(String(variant.variantImage.url ?? "")) } : undefined,
      hasVariantSub: Boolean(variant.hasVariantSub ?? false),
      subscriptionDiscount: Number(variant.subscriptionDiscount ?? 0),
      subFreq: (variant.subFreq ?? []).map((s: Record<string, unknown>) => ({
        id: String((s as { id?: unknown }).id ?? ""),
        duration: Number((s as { duration?: unknown }).duration ?? 0),
        interval: String((s as { interval?: unknown }).interval ?? ""),
      })),
    };
  });

  const imageUrl = d.productImage?.url ? resolveImageUrl(String(d.productImage.url)) : "";

  const brewGuide: BrewGuide = {
    filter: Boolean(d.brewGuide?.filter ?? false),
    espresso: Boolean(d.brewGuide?.espresso ?? false),
    milk: Boolean(d.brewGuide?.milk ?? false),
  };

  const categories: ProductCategory = d.categories
    ? { id: d.categories.id ?? "", title: String(d.categories.title ?? ""), slug: String(d.categories.slug ?? "") }
    : { id: "", title: "", slug: "" };

  return {
    id: Number(d.id),
    name: String(d.name ?? ""),
    tagline: String(d.tagline ?? ""),
    slug: String(d.slug ?? ""),

    regularPrice: d.regularPrice != null ? Number(d.regularPrice) : null,
    salePrice: d.salePrice != null ? Number(d.salePrice) : null,

    inStock: Boolean(d.inStock ?? true),
    stockQuantity: d.stockQuantity != null ? Number(d.stockQuantity) : null,

    hasVariantOptions: Boolean(d.hasVariantOptions ?? false),
    variants,

    hasSimpleSub: Boolean(d.hasSimpleSub ?? false),
    subscriptionDiscount: d.subscriptionDiscount != null ? Number(d.subscriptionDiscount) : null,
    subFreq: (d.subFreq ?? []).map((s: Record<string, unknown>) => ({
      id: String((s as { id?: unknown }).id ?? ""),
      duration: Number((s as { duration?: unknown }).duration ?? 0),
      interval: String((s as { interval?: unknown }).interval ?? ""),
    })),

    productImage: { url: imageUrl, thumbnailURL: d.productImage?.thumbnailURL ? resolveImageUrl(String(d.productImage.thumbnailURL)) : undefined },

    categories,
    subCategories: (d.subCategories ?? []).map((sc: Record<string, unknown>) => ({
      slug: String((sc as { slug?: unknown }).slug ?? ""),
      level1Id: (sc as { level1Id?: unknown }).level1Id ? String((sc as { level1Id?: unknown }).level1Id) : undefined,
      level2Id: (sc as { level2Id?: unknown }).level2Id ? String((sc as { level2Id?: unknown }).level2Id) : undefined,
      subCategoryId: (sc as { subCategoryId?: unknown }).subCategoryId ? String((sc as { subCategoryId?: unknown }).subCategoryId) : undefined,
    })),

    description: String(d.description ?? ""),
    farm: String(d.farm ?? ""),
    tastingNotes: String(d.tastingNotes ?? ""),
    variety: String(d.variety ?? ""),
    process: String(d.process ?? ""),
    altitude: String(d.altitude ?? ""),
    body: String(d.body ?? ""),
    aroma: String(d.aroma ?? ""),
    roast: String(d.roast ?? ""),
    finish: String(d.finish ?? ""),
    brewing: String(d.brewing ?? ""),
    brewGuide,
  };
}

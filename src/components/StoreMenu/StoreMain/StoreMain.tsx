import React from "react";
import { createPortal } from "react-dom";
import { useHistory } from "react-router-dom";
import styles from "./StoreMain.module.css";
import { FilterNode } from "../data/products";
import { StoreProduct, StoreVariant, SubCatLevel1 } from "../../../api/apiStoreMenu";
import StoreBottomSheet from "../StoreBottomSheet/StoreBottomSheet";
import AddBottomSheet from "../AddBottomSheet/AddBottomSheet";
import SubScribeBottomSheet from "../SubScribeBottomSheet/SubScribeBottomSheet";
import CartConflictModal from "../CartConflictModal/CartConflictModal";
import ViewCart from "../../ViewCart";
import { useStoreWishlist } from "../../../context/useStoreWishlist";
import useAuth from "../../../utils/useAuth";
import { useStoreCart } from "../../../context/useStoreCart";
import { useCart } from "../../../context/useCart";

interface Props {
  activeCategory: string;
  activeSubCategory?: string;
  subCategories?: SubCatLevel1[];
  products: StoreProduct[];
  loading?: boolean;
}

const StoreMain = ({ activeCategory, subCategories = [], products, loading = false }: Props) => {
  const actualActiveCategory = activeCategory;
  const { wishlistIds: wishlist, toggleWishlist } = useStoreWishlist();
  const { isLoggedIn } = useAuth();
  const history = useHistory();

  // ── Cart contexts ──────────────────────────────────────────────────────────
  const { storeCart, storeCartCount, addToStoreCart } = useStoreCart();
  const { cart: cafeCart, clearCart: clearCafeCart } = useCart();

  // ── Conflict modal state ───────────────────────────────────────────────────
  const [conflictVisible, setConflictVisible] = React.useState(false);
  // Pending add — held while user decides in the conflict modal
  const pendingAddRef = React.useRef<{
    productId: number;
    quantity: number;
    variant: StoreVariant | null;
    unitPrice: number;
  } | null>(null);

  // ── handleAddToCart — called by AddBottomSheet ─────────────────────────────
  const handleAddToCart = React.useCallback(
    (productId: number, quantity: number, variant: StoreVariant | null, unitPrice: number) => {
      console.log(`🛍️ [StoreMain] handleAddToCart — productId=${productId} qty=${quantity} variant=${variant?.id ?? "none"} unitPrice=${unitPrice} storeCartCount=${storeCartCount}`);
      // Only count genuine cafe items (relationTo === "shop-menu").
      // The shared cart endpoint can return store items under the cafe origin query,
      // so we must not count those as a conflict.
      const genuineCafeItems = (cafeCart?.items ?? []).filter((item) => {
        const prod = item.product as Record<string, unknown> | undefined;
        // If relationTo is explicitly "web-products" it is a store item — skip it
        if (prod?.relationTo === "web-products") return false;
        // If store cart already has this item id, it is a store item leaking through
        const storeIds = new Set((storeCart?.items ?? []).map((s) => s.id));
        if (item.id && storeIds.has(item.id)) return false;
        return true;
      });

      // If store cart already has items there is no cross-origin conflict —
      // user is just adding more store items to an existing store cart.
      const storeAlreadyHasItems = (storeCart?.items ?? []).length > 0;

      if (!storeAlreadyHasItems && genuineCafeItems.length > 0) {
        // Conflict: real cafe items exist, user is trying to start a store cart
        pendingAddRef.current = { productId, quantity, variant, unitPrice };
        setConflictVisible(true);
        return;
      }
      // No conflict — add directly
      addToStoreCart(
        productId,
        quantity,
        variant?.id,
        variant?.variantName,
        unitPrice,
      );
    },
    [cafeCart, storeCart, storeCartCount, addToStoreCart],
  );

  // ── handleConflictReplace — user tapped "Replace" ─────────────────────────
  const handleConflictReplace = React.useCallback(async () => {
    setConflictVisible(false);
    const pending = pendingAddRef.current;
    pendingAddRef.current = null;
    if (!pending) return;
    await clearCafeCart();
    await addToStoreCart(
      pending.productId,
      pending.quantity,
      pending.variant?.id,
      pending.variant?.variantName,
      pending.unitPrice,
    );
  }, [clearCafeCart, addToStoreCart]);

  const handleConflictCancel = React.useCallback(() => {
    setConflictVisible(false);
    pendingAddRef.current = null;
  }, []);

  const [selectedProduct, setSelectedProduct] = React.useState<StoreProduct | null>(
    null,
  );
  const [isBottomSheetOpen, setIsBottomSheetOpen] = React.useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = React.useState(false);

  const [isSubscribeSheetOpen, setIsSubscribeSheetOpen] = React.useState(false);
  const [subscribeVariantId, setSubscribeVariantId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const [expandedSections, setExpandedSections] = React.useState<string[]>([]);

  // selectedFilters uses flattened keys like 'tastingProfile.acidity' -> string[] of selected values
  const [selectedFilters, setSelectedFilters] = React.useState<
    Record<string, string[]>
  >({});

  const categoryProducts = products.filter(
    (p) => p.categories?.title === actualActiveCategory,
  );

  // Build a dynamic filter schema for the active category. The schema maps a flattened
  // key (group or group.subgroup) to its unique set of values and a display label.
  const prettifyKey = (key: string) => {
    // convert camelCase or kebab/camel/dot to spaced, capitalized label
    const parts = key
      .replace(/\./g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .split(" ");
    return parts
      .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ""))
      .join(" ")
      .trim();
  };

  // buildFilterSchema moved into useMemo for stable dependencies

  const filterSchema = React.useMemo(() => {
    const schema: Record<string, { values: string[]; label: string }> = {};

    // ── Inject sub-categories from the API as filter groups ──────────────────
    // Each level1 group (e.g. "Brew Method") becomes a filter group.
    // Its level2 children (e.g. "Filter", "Espresso") are the selectable values.
    // We use the level2 slug as the stored value (matches product.subCategories[].slug).
    subCategories.forEach((group) => {
      if (!group.level2 || group.level2.length === 0) return;
      const key = `subcategory_${group.slug}`;
      schema[key] = {
        label: group.name,
        values: group.level2.map((l2) => l2.slug),
      };
    });

    // ── Legacy: also read any dummy .filters object on products (no-ops for API data) ──
    const items = categoryProducts;
    const pushValues = (
      key: string,
      values: string[] | undefined,
      label?: string,
    ) => {
      if (!values || values.length === 0) return;
      const set = new Set(schema[key]?.values || []);
      values.forEach((v) => set.add(v));
      schema[key] = {
        values: Array.from(set),
        label: label || prettifyKey(key),
      };
    };

    items.forEach((p) => {
      const f = (p as unknown as Record<string, unknown>).filters as Record<string, FilterNode> | undefined;
      if (!f) return;

      Object.keys(f).forEach((groupKey) => {
        const node = f[groupKey];
        if (Array.isArray(node)) {
          pushValues(groupKey, node, prettifyKey(groupKey));
        } else if (node && typeof node === "object") {
          Object.keys(node).forEach((subKey) => {
            const flat = `${groupKey}.${subKey}`;
            const subValues = (node as Record<string, string[]>)[subKey];
            pushValues(
              flat,
              subValues,
              `${prettifyKey(groupKey)} - ${prettifyKey(subKey)}`,
            );
          });
        }
      });
    });

    return schema;
  }, [categoryProducts, subCategories]);
  const handleFilterClick = (path: string, value: string) => {
    // Find first matching product
    const matchedProduct = categoryProducts.find((product) => {
      const productValues = getProductValuesForPath(product, path);
      if (!productValues) return false;

    return productValues
  .map((v) => String(v ?? "").toLowerCase())
  .includes((value ?? "").toLowerCase());
    });

    if (matchedProduct) {
      const element = document.getElementById(`product-${matchedProduct.id}`);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }

    // Close filter popup
    setIsFilterOpen(false);
  };
  React.useEffect(() => {
    setSelectedFilters({});
  }, [actualActiveCategory]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const getUniqueValues = (type: string): string[] => {
    return filterSchema[type]?.values || [];
  };

  const productMatchesFilters = (
    product: StoreProduct,
    filters: Record<string, string[]>,
  ) => {
    return Object.entries(filters).every(([path, vals]) => {
      if (!vals || vals.length === 0) return true;

      const pVals = getProductValuesForPath(product, path);
      if (!pVals || pVals.length === 0) return false;

     return vals.some((v) =>
  pVals.map((x) => String(x ?? "").toLowerCase()).includes((v ?? "").toLowerCase()),
);
    });
  };

  // count how many products would match if 'value' were applied to 'path', while
  // respecting other currently selected filters (but excluding selections for the same path)
  const getCountForOption = (path: string, value: string) => {
    const temp: Record<string, string[]> = {};
    Object.keys(selectedFilters).forEach((k) => {
      if (k === path) return; // exclude current path so counts reflect other filters
      temp[k] = selectedFilters[k] ? [...selectedFilters[k]] : [];
    });

    // apply this value for the path
    temp[path] = [value];

    return categoryProducts.filter((p) => productMatchesFilters(p, temp))
      .length;
  };

  // count of unique products that match any value in this path/group given other filters
  const getCountForGroup = (path: string) => {
    const values = getUniqueValues(path);
    if (!values || values.length === 0) return 0;

    const temp: Record<string, string[]> = {};
    Object.keys(selectedFilters).forEach((k) => {
      if (k === path) return; // exclude current group
      temp[k] = selectedFilters[k] ? [...selectedFilters[k]] : [];
    });

    // count products that have at least one of the values for 'path'
    return categoryProducts.filter((p) => {
      if (!productMatchesFilters(p, temp)) return false;
      const pVals = getProductValuesForPath(p, path);
      if (!pVals) return false;
    return values.some((v) =>
  pVals.map((x) => String(x ?? "").toLowerCase()).includes((v ?? "").toLowerCase()),
);
    }).length;
  };

  const getProductValuesForPath = (
    product: StoreProduct,
    path: string,
  ): string[] | undefined => {
    // Sub-category filter keys are prefixed with "subcategory_"
    // Values are level2 slugs stored in product.subCategories[].slug
    if (path.startsWith("subcategory_")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subCats: { slug?: string }[] = (product.subCategories as any[]) ?? [];
      return subCats.map((sc) => String(sc?.slug ?? "")).filter(Boolean);
    }

    const parts = path.split(".");
    // StoreProduct has no legacy filters object — use subCategories slugs for filtering
    const f = (product as unknown as Record<string, unknown>).filters as Record<string, FilterNode> | undefined;
    if (!f) return undefined;

    if (parts.length === 1) {
      const node = f[parts[0]];
      return Array.isArray(node) ? node : undefined;
    }

    // one level nesting supported: group.subgroup
    const group = f[parts[0]];
    if (!group || typeof group !== "object" || Array.isArray(group))
      return undefined;
    const sub = (group as Record<string, string[]>)[parts[1]];
    return Array.isArray(sub) ? sub : undefined;
  };

  const filteredProducts = categoryProducts.filter((product) => {
    if (product.categories?.title !== actualActiveCategory) return false;

    return Object.entries(selectedFilters).every(([path, values]) => {
      if (!values || values.length === 0) return true;

      const productValues = getProductValuesForPath(product, path);
      if (!productValues || productValues.length === 0) return false;

     return values.some((val) =>
  productValues
    .map((v) => String(v ?? "").toLowerCase())
    .includes((val ?? "").toLowerCase()),
);
    });
  });

  // When products finish loading, if there are few items we auto-scroll the
  // page so the last product is visible and approximately centered in the
  // viewport. This mirrors the cafe behavior for small result sets.
  React.useEffect(() => {
    if (loading) return;
    try {
      const prods = document.querySelectorAll('[id^="product-"]');
      if (!prods || prods.length === 0) return;
      const last = prods[prods.length - 1] as HTMLElement;
      last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      console.warn('[StoreMain] auto-scroll failed', err);
    }
  }, [loading, products.length, actualActiveCategory]);

  return (
    <>

      <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.prodsconatiner}>
          {loading && (
            <p style={{ padding: "16px", color: "#888" }}>Loading products…</p>
          )}
          {filteredProducts.map((product) => {
            // Derive display price: prefer salePrice, fallback to regularPrice
            // For variant products use the lowest variant salePrice
            let displayPrice: number | null = null;
            let originalPrice: number | null = null;

            if (product.hasVariantOptions && product.variants.length > 0) {
              const salePrices = product.variants.map((v) => v.variantSalePrice).filter((p) => p > 0);
              const regularPrices = product.variants.map((v) => v.variantRegularPrice).filter((p) => p > 0);
              displayPrice = salePrices.length > 0 ? Math.min(...salePrices) : (regularPrices.length > 0 ? Math.min(...regularPrices) : null);
              originalPrice = salePrices.length > 0 && regularPrices.length > 0 ? Math.min(...regularPrices) : null;
            } else {
              displayPrice = product.salePrice ?? product.regularPrice;
              originalPrice = product.salePrice != null && product.regularPrice != null && product.salePrice < product.regularPrice
                ? product.regularPrice
                : null;
            }

            const hasDiscount = originalPrice != null && displayPrice != null && displayPrice < originalPrice;
            const isOut = product.hasVariantOptions && product.variants.length > 0
              ? !product.variants.some((v) => v.variantInStock)
              : !product.inStock;
            const isLiked = wishlist.includes(product.id);

            return (
              <div
                id={`product-${product.id}`}
                key={product.id}
                className={`${styles.prodcard} ${
                  isOut ? styles.cardOutOfStock : ""
                }`}
                onClick={() => {
                  setSelectedProduct(product);
                  setIsBottomSheetOpen(true);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.prodcardTop}>
                  <div className={styles.prodcardImg}>
                    <img src={product.productImage?.url || ""} alt={product.name} />
                    {isLoggedIn && (
                      <div
                        className={styles.whislist}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product.id);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <svg width="22" height="20" viewBox="-1 -1 22 20">
                        <path
                          d="M12.8225 0.162502C13.9681 -0.112739 15.1716 -0.0369827 16.2727 0.379481C17.3737 0.796003 18.3203 1.53404 18.9861 2.49459C19.6513 3.4543 20.005 4.59101 19.9999 5.75377L19.9954 5.97792C19.8997 8.2785 18.3472 9.96547 17.0049 11.2903L16.9967 11.2984L11.8977 16.1661C11.6649 16.4206 11.3825 16.6263 11.0665 16.7695C10.7367 16.9189 10.3783 16.9977 10.0154 17C9.65262 17.0022 9.29326 16.9282 8.96164 16.783C8.63969 16.6419 8.35092 16.4367 8.11317 16.1805L3.00326 11.2975L2.99509 11.2903C1.65337 9.96607 0.100309 8.28752 0.00454214 5.97881L0 5.75377C2.1614e-05 4.59275 0.357267 3.45841 1.0238 2.50176C1.69032 1.54527 2.63536 0.811087 3.73364 0.39562C4.83197 -0.0198101 6.03215 -0.096816 7.17567 0.175054C8.25275 0.431183 9.23198 0.984995 9.99907 1.77012C10.7642 0.980134 11.7438 0.421646 12.8225 0.162502Z"
                          fill={isLiked ? "#E53935" : "transparent"}
                          stroke={isLiked ? "#E53935" : "#BDBDBD"}
                          strokeWidth="1.5"
                        />
                      </svg>
                      </div>
                    )}
                    {!isOut && hasDiscount && (
                      <div className={styles.offerbadge}>
                        <p>OFFER</p>
                      </div>
                    )}
                  </div>

                  <div className={styles.prodPricedetails}>
                    <h3>
                      AED{" "}
                      {hasDiscount ? displayPrice : displayPrice}
                      .00
                    </h3>

                    {hasDiscount && <p>AED {originalPrice}.00</p>}
                  </div>
                </div>

                <div className={styles.prodcardBottom}>
                  <div className={styles.prodDetails}>
                    <h3>{product.name}</h3>
                    <h4>{product.tagline}</h4>
                  </div>

                  <button
                    className={`${styles.buynowcta} ${
                      isOut ? styles.outofstock : ""
                    }`}
                    disabled={isOut}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                      setIsAddSheetOpen(true);
                    }}
                  >
                    {isOut ? "Out of Stock" : "Buy Now"}
                  </button>
                </div>
              </div>
            );
          })}
{filteredProducts.length === 0 && !loading && (
<div style={{
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "60vh",
  width: "100%",
  gap: "8px",
  textAlign: "center",
  padding: "24px",
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -30%)"
}}>
    <h2 style={{
      fontFamily: "var(--lexend)",
      fontWeight: 400,
      fontSize: "20px",
      margin: 0,
      color: "#6C7A5F"
    }}>
      Coming Soon
    </h2>
    <p style={{
      fontFamily: "var(--lato)",
      fontSize: "12px",
      color: "#8C8C8C",
      fontWeight: 400,
      margin: 0
    }}>
      We're brewing something special for you
    </p>
  </div>
)}
        </div>

        {isFilterOpen && (
          <div
            className={styles.FilterOverlay}
            onClick={() => setIsFilterOpen(false)}
          >
            <div
              className={styles.FilterPopup}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={styles.PopupCloseWrapper}
                onClick={() => setIsFilterOpen(false)}
              >
                <div className={styles.PopupClose}>✕</div>
              </div>

              {Object.keys(filterSchema).map((type) => {
                const isOpen = expandedSections.includes(type);
                const values = getUniqueValues(type);
                const count = getCountForGroup(type);
                const displayTitle =
                  filterSchema[type]?.label || prettifyKey(type);

                return (
                  <div key={type}>
                    <div
                      className={styles.FilterRow}
                      onClick={() => toggleSection(type)}
                    >
                      <div className={styles.FilterLeft}>
                        <span className={styles.FilterTitle}>
                          {displayTitle}
                        </span>

                        <span className={styles.FilterPlus}>
                          {isOpen ? "−" : "+"}
                        </span>
                      </div>

                      <span className={styles.FilterCount}>{count}</span>
                    </div>

                    {isOpen &&
                      values.map((value) => {
                        const optionCount = getCountForOption(type, value);

                        return (
                          <div
                            key={value}
                            className={styles.FilterSubRow}
                            onClick={() => handleFilterClick(type, value)}
                          >
                            <span>
                              {value}{" "}
                              {optionCount > 0 ? `(${optionCount})` : ""}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {!loading && (
      <div
        className={styles.FilterButton}
        onClick={() => setIsFilterOpen(true)}
      >
        <svg
          width="20"
          height="24"
          viewBox="0 0 20 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14.25 2.25003C14.25 2.01889 14.1967 1.79087 14.0941 1.58376C13.9914 1.37665 13.8424 1.19605 13.6584 1.05607C13.4745 0.916092 13.2607 0.820512 13.0337 0.776791C12.8068 0.733069 12.5728 0.742391 12.35 0.804028L1.85 3.72103C1.53438 3.80836 1.256 3.99657 1.05738 4.25695C0.858759 4.51732 0.750805 4.83554 0.750001 5.16303V21.276C0.749798 21.5072 0.803052 21.7354 0.905604 21.9426C1.00816 22.1499 1.15723 22.3306 1.34118 22.4707C1.52513 22.6108 1.73898 22.7064 1.96602 22.7502C2.19306 22.794 2.42715 22.7847 2.65 22.723L13.15 19.333C13.4663 19.2455 13.7451 19.0567 13.9438 18.7955C14.1425 18.5343 14.2501 18.2152 14.25 17.887V2.25003Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2.25 22.7754H17.25C17.6478 22.7754 18.0294 22.6174 18.3107 22.3361C18.592 22.0547 18.75 21.6732 18.75 21.2754V5.52539C18.75 5.12757 18.592 4.74603 18.3107 4.46473C18.0294 4.18342 17.6478 4.02539 17.25 4.02539H14.25"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      )}
      </div>

      {/* Sheets / modals / ViewCart: render into portal target (created in StoreMenu.tsx)
          so they are mounted outside the scrollable IonContent and do not get
          overlapped by the Ionic footer. We keep all logic/state unchanged. */}
      {
        (() => {
          const sheets = (
            <>
              {isBottomSheetOpen && selectedProduct && (
                <StoreBottomSheet
                  product={selectedProduct}
                  onClose={() => setIsBottomSheetOpen(false)}
                />
              )}
              {isAddSheetOpen && selectedProduct && (
                <AddBottomSheet
                  product={selectedProduct}
                  onClose={() => setIsAddSheetOpen(false)}
                  onAddToCart={handleAddToCart}
                  onSubscribe={(product, variant) => {
                    setIsAddSheetOpen(false);
                    setSelectedProduct(product);
                    setSubscribeVariantId(variant?.id ?? null);
                    setIsSubscribeSheetOpen(true);
                  }}
                />
              )}
              {isSubscribeSheetOpen && selectedProduct && (
                <SubScribeBottomSheet
                  product={selectedProduct}
                  initialVariantId={subscribeVariantId ?? undefined}
                  onClose={() => setIsSubscribeSheetOpen(false)}
                />
              )}

              {/* ── Conflict modal — shown when cafe cart has items ── */}
              {conflictVisible && (
                <CartConflictModal
                  existingOrigin="cafe"
                  incomingOrigin="store"
                  onReplace={handleConflictReplace}
                  onCancel={handleConflictCancel}
                />
              )}

              {/* ── ViewCart sticky bar — shown when store cart has items ── */}
              {(() => { console.log(`🛍️ [StoreMain] render — storeCartCount=${storeCartCount}`); return null; })()}
              {storeCartCount > 0 && (
                <ViewCart
                  itemCount={storeCartCount}
                  onClick={() => history.push("/Cart")}
                />
              )}
            </>
          );

          // Prefer mounting into the #store-sheets-root created by the page so
          // sheets become siblings of the IonFooter (like CafeMenu). If that
          // container isn't present yet, fall back to rendering in place to
          // avoid breaking behavior during SSR/hydration.
          try {
            if (typeof document !== "undefined") {
              const container = document.getElementById("store-sheets-root");
              if (container) return createPortal(sheets, container);
            }
          } catch {
            // ignore and render in place
          }

          return sheets;
        })()
      }

    </>
  );
};

export default StoreMain;

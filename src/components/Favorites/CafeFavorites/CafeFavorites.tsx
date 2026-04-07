/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styles from "./CafeFavorites.module.css";
import { useWishlist } from "../../../context/useWishlist";
import { useHistory } from "react-router-dom";
import NoState from "../../NoState/NoState";
import ProductDetailSheet from "../../ProductDetailSheet";
import Customization from "../../Home/Customization/Customization";
import RepeatCustomization from "../../CafeMenu/RepeatCustomization/RepeatCustomization";
import { getSingleMenuItem, getSingleShop, isShopOpen } from '../../../api/apiCafe';
import { useCart } from "../../../context/useCart";


const CafeFavorites = () => {
  const { rawWishlist, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const { cart, addToCart, decrementItem, shopId } = useCart();

  const [favorites, setFavorites] = React.useState<any[]>([]);
  const [openMenuId, setOpenMenuId] = React.useState<number | null>(null);
  const [shopClosed, setShopClosed] = React.useState(false);

  // product detail modal
  const [selectedProduct, setSelectedProduct] = React.useState<any | null>(null);

  // customization modal
  const [isCustomizationOpen, setIsCustomizationOpen] = React.useState(false);
  const [customizingProduct, setCustomizingProduct] = React.useState<any | null>(null);

  // repeat-customization modal (opened when + is pressed on an already-carted product)
  const [isRepeatOpen, setIsRepeatOpen] = React.useState(false);
  const [repeatProductId, setRepeatProductId] = React.useState<number | null>(null);
  const [repeatLastCustomizations, setRepeatLastCustomizations] = React.useState<any | null>(null);
  const [repeatProductName, setRepeatProductName] = React.useState<string>("");
  const [repeatProductPrice, setRepeatProductPrice] = React.useState<number | undefined>(undefined);
  const [repeatProductSubtitle, setRepeatProductSubtitle] = React.useState<string>("");
  const [repeatProductVegType, setRepeatProductVegType] = React.useState<"Veg" | "NonVeg" | "Egg" | "Vegan">("Veg");

  /** Opens RepeatCustomization sheet — mirrors CafeMenu handleIncrementClick */
  const handleIncrementClick = (entry: any, item: any) => {
    const pid = Number(entry?.productId ?? entry?.product?.id ?? entry?.product?.value?.id);
  setRepeatProductId(pid || null);
  setRepeatLastCustomizations((entry as any).customizations ?? (entry as any).customization ?? null);
    setRepeatProductName(item?.title ?? "");
    // item.price is "AED 25" — parse out the numeric part for the RepeatCustomization prop
    const rawPrice = item?.price ?? "";
    const parsedPrice = parseFloat(String(rawPrice).replace(/[^\d.]/g, ""));
    setRepeatProductPrice(isNaN(parsedPrice) ? undefined : parsedPrice);
    setRepeatProductSubtitle(item?.tagline ?? "");
    const dietary = item?.fullProduct?.dietaryType?.toLowerCase() ?? "";
    setRepeatProductVegType(
      dietary === "vegan" ? "Vegan"
      : dietary === "egg" ? "Egg"
      : dietary === "non-veg" || dietary === "nonveg" || dietary === "non veg" ? "NonVeg"
      : "Veg"
    );
    setIsRepeatOpen(true);
  };
React.useEffect(() => {
  getSingleShop().then((shop) => {
    setShopClosed(!isShopOpen(shop));
  }).catch(() => {
    // if fetch fails, default to open so users aren't blocked
    setShopClosed(false);
  });
}, []);

React.useEffect(() => {
  const mapped = (rawWishlist || []).map((item: any) => {
    const product = item?.product?.value;

    if (!product) {
      console.warn("⚠️ Missing product in wishlist item:", item);
      return null;
    }

    const price =
      product.salePrice && product.salePrice < product.regularPrice
        ? product.salePrice
        : product.regularPrice;

    const dietary = product.dietaryType?.toLowerCase();

// 🖼️ Image Safe Handling
let imageUrl = "";

if (product.image?.url) {
  imageUrl = product.image.url;
} else if (typeof product.image === "string") {
  imageUrl = product.image;
}

if (imageUrl && !imageUrl.startsWith("http")) {
  imageUrl = `https://endpoint.whitemantis.ae${imageUrl}`;
}

return {
  id: product.id,
  title: product.name,
  tagline: product.tagline || "",
  price: `AED ${price}`,
  image: imageUrl,
  isVeg: dietary === "vegan" || dietary === "veg",
  isNonVeg:
    dietary === "non-veg" ||
    dietary === "nonveg" ||
    dietary === "non veg",
  // include full product and customizations for downstream flows
  customizations: product.customizations || [],
  fullProduct: product,
};
  });

  const filtered = mapped.filter(Boolean);
  setFavorites(filtered);
}, [rawWishlist]);

  const SKELETON_COUNT = 4;

  const showSkeleton = wishlistLoading;
  const history = useHistory();

  return (
    <>
      <div className={styles.main} onClick={() => setOpenMenuId(null)}>
        <div className={styles.MainContainer}>

          {/* Skeleton — show while wishlist API is loading OR images are still loading */}
          {showSkeleton && (
            <>
              {Array.from({ length: SKELETON_COUNT }).map((_, n) => (
                <div className={styles.skeletonCard} key={n}>
                  <div className={`${styles.skeletonBase} ${styles.skeletonImage}`} />
                  <div className={styles.skeletonRight}>
                    <div className={styles.skeletonInfo}>
                      <div className={`${styles.skeletonBase} ${styles.skeletonTitle}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonTagline}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonPrice}`} />
                    </div>
                    <div className={styles.skeletonActions}>
                      <div className={`${styles.skeletonBase} ${styles.skeletonDot}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonBtn}`} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Real cards */}
          <div style={{ display: showSkeleton ? "none" : "contents" }}>
            { !showSkeleton && favorites.length === 0 && (
              <NoState
                title={"No favourites yet."}
                subtitle={"Heart items in the Cafe to save them here."}
                ctaText={"Browse menu"}
                onCta={() => history.push("/CafeMenu")}
                imageSrc="/fav.gif"
              />
            )}
            { !showSkeleton && favorites.length > 0 && favorites.map((item) => (
            <div className={`${styles.Card} ${shopClosed ? styles.ShopClosed : ""}`} key={item.id}>
              <div className={styles.CardLeft}>
             <img
  src={item.image || "/fallback.png"}
  alt={item.title}
  className={styles.ProductImage}
  onError={(e) => {
    (e.target as HTMLImageElement).src = "/fallback.png";
  }}
/>
              </div>

              <div className={styles.CardRight}>
                <div className={styles.ProductInfo}>
                 {item.isVeg && (
  <div className={styles.veganBadge}>
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 10V0H10V10H0ZM1.11111 8.88889H8.88889V1.11111H1.11111V8.88889ZM5 7.22222C4.38889 7.22222 3.86574 7.00463 3.43056 6.56944C2.99537 6.13426 2.77778 5.61111 2.77778 5C2.77778 4.38889 2.99537 3.86574 3.43056 3.43056C3.86574 2.99537 4.38889 2.77778 5 2.77778C5.61111 2.77778 6.13426 2.99537 6.56944 3.43056C7.00463 3.86574 7.22222 5.61111 7.22222 5Z"
        fill="#34A853"
      />
    </svg>
  </div>
)}

{item.isNonVeg && (
 <div className={styles.veganBadge}>
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="10" height="10" fill="#D93025" />
      <circle cx="5" cy="5" r="2.5" fill="white" />
    </svg>
  </div>
)}

                  <div className={styles.TitleandTagLine}>
                    <h3>{item.title}</h3>
                    <p>{item.tagline}</p>
                  </div>

                  <div className={styles.PriceSection}>
                    <h3>{item.price}</h3>
                  </div>
                </div>

                <div className={styles.ProductActions}>
                  <div
                    className={styles.ProductActionButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === item.id ? null : item.id);
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z"
                        stroke="#4B3827"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z"
                        stroke="#4B3827"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z"
                        stroke="#4B3827"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  {openMenuId === item.id && (
                    <div className={styles.ActionMenu}>
                        <button
                          className={styles.MenuItem}
                          onClick={async () => {
                            try {
                              await toggleWishlist(item.id);

                              // UI will update from context; also close menu
                              setOpenMenuId(null);
                            } catch (err) {
                              console.error("Failed to remove:", err);
                            }
                          }}
                        >
                          Remove from favorites
                        </button>

                      <button
                        className={styles.MenuItem}
                        onClick={async () => {
                          // fetch canonical full product on demand, then open detail sheet
                          setOpenMenuId(null);
                          try {
                            let detailed: any = null;
                            if (shopId) {
                              detailed = await getSingleMenuItem(shopId, item.id);
                            }

                            if (!detailed) detailed = item.fullProduct || null;

                            setSelectedProduct(detailed);
                          } catch (err) {
                            console.error("Failed to fetch product for details:", err);
                            setSelectedProduct(item.fullProduct || null);
                          }
                        }}
                      >
                        View details
                      </button>
                    </div>
                  )}

                  <div className={styles.ProductADDButton}>
                    {(() => {
                      // aggregate quantity for this product across ALL customizations (product-level)
                      const pidNum = Number(item.id);
                      const matching = (cart?.items || []).filter((ci: any) => {
                        const p = ci.product;
                        let pid: any = null;
                        if (p) pid = (p as any).value?.id ?? (p as any).id ?? (p as any);
                        if (!pid && typeof ci.productId !== 'undefined') pid = ci.productId;
                        return Number(pid) === pidNum;
                      });
                      const totalQty = matching.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);

                      if (totalQty > 0) {
                        const entry = matching[matching.length - 1];
                        return (
                          <div className={styles.QuantitySelector}>
                            <button onClick={async (e) => { e.stopPropagation(); try { await decrementItem(entry.id); } catch (err) { console.error(err); } }}>-</button>
                            <span>{totalQty}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleIncrementClick(entry, item); }}>+</button>
                          </div>
                        );
                      }

                      return (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              // fetch canonical product from menu API (fetch-on-click)
                              let detailed: any = null;
                              try {
                                if (shopId) {
                                  detailed = await getSingleMenuItem(shopId, item.id);
                                }
                              } catch (err) {
                                console.warn("Failed to fetch product details, falling back to wishlist snapshot", err);
                                detailed = null;
                              }

                              // fallback
                              if (!detailed) detailed = item.fullProduct || null;

                              if (!detailed) {
                                console.error("No product data available for addToCart");
                                return;
                              }

                              // if product has customizations -> open customization sheet (pass full numeric-price product)
                              if (detailed.customizations && detailed.customizations.length > 0) {
                                setCustomizingProduct(detailed);
                                setIsCustomizationOpen(true);
                                return;
                              }

                              // direct add with canonical id
                              await addToCart(detailed.id);
                            } catch (err) {
                              console.error("Add to favorites cart failed", err);
                            }
                          }}
                        >
                          ADD +
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>{/* end real-cards wrapper */}
        </div>
      </div>

        {/* Product detail sheet */}
        <ProductDetailSheet
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />

        {/* Customization sheet */}
        <Customization
          isOpen={isCustomizationOpen}
          product={customizingProduct}
          onClose={() => {
            setIsCustomizationOpen(false);
            setCustomizingProduct(null);
          }}
          onConfirm={async (payload) => {
            if (!customizingProduct?.id) return;
            try {
              await addToCart(customizingProduct.id, payload.selectedOptions ?? payload);
            } catch (err) {
              console.error("CafeFavorites: customization add failed", err);
            } finally {
              setIsCustomizationOpen(false);
              setCustomizingProduct(null);
            }
          }}
        />

        {/* Repeat-customization sheet — mirrors CafeMenu behavior */}
        <RepeatCustomization
          isOpen={isRepeatOpen}
          productId={repeatProductId}
          previousCustomizations={repeatLastCustomizations}
          productName={repeatProductName}
          productPrice={repeatProductPrice}
          productSubtitle={repeatProductSubtitle}
          vegType={repeatProductVegType}
          onClose={() => {
            setIsRepeatOpen(false);
            setRepeatProductId(null);
            setRepeatLastCustomizations(null);
            setRepeatProductName("");
            setRepeatProductPrice(undefined);
            setRepeatProductSubtitle("");
            setRepeatProductVegType("Veg");
          }}
          onChoose={() => {
            // User wants to choose new customizations — open full customization sheet
            if (!repeatProductId || !shopId) return;
            (async () => {
              try {
                const detailed = await getSingleMenuItem(shopId, repeatProductId);
                setCustomizingProduct(detailed);
                setIsCustomizationOpen(true);
              } catch (err) {
                console.error("CafeFavorites: failed to open customization from repeat", err);
              } finally {
                setIsRepeatOpen(false);
              }
            })();
          }}
          onRepeatLast={async (quantity = 1) => {
            if (!repeatProductId) return;
            try {
              for (let i = 0; i < (quantity || 1); i++) {
                // sequentially add repeated items
                await addToCart(repeatProductId, repeatLastCustomizations);
              }
            } catch (err) {
              console.error("CafeFavorites: repeat last customization failed", err);
            } finally {
              setIsRepeatOpen(false);
              setRepeatProductId(null);
              setRepeatLastCustomizations(null);
            }
          }}
        />
      </>
  );
};

export default CafeFavorites;

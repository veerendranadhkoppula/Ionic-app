/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styles from "./ShopFavorites.module.css";
import { useStoreWishlist } from "../../../context/useStoreWishlist";
import { resolveImageUrl, getStoreProductById, StoreProduct, StoreVariant } from "../../../api/apiStoreMenu";
import { useStoreCart } from "../../../context/useStoreCart";
import { useCart } from "../../../context/useCart";
import { useHistory } from "react-router-dom";
import NoState from "../../NoState/NoState";
import AddBottomSheet from "../../StoreMenu/AddBottomSheet/AddBottomSheet";
import SubScribeBottomSheet from "../../StoreMenu/SubScribeBottomSheet/SubScribeBottomSheet";
import CartConflictModal from "../../StoreMenu/CartConflictModal/CartConflictModal";


type ShopFavItem = {
  id: number;
  name: string;
  tagline: string;
  price: string;
  imageUrl: string;
};

const SkeletonCard = () => (
  <div className={styles.card}>
    <div className={styles.cardTop}>
      <div className={`${styles.cardImage} ${styles.skeleton}`} />
    </div>
    <div className={styles.cardMiddle}>
      <div className={styles.ProductPrice}>
        <div className={`${styles.skeletonLine} ${styles.skeleton}`} style={{ width: "60%", height: 14 }} />
      </div>
      <div className={styles.ProductDetails}>
        <div className={`${styles.skeletonLine} ${styles.skeleton}`} style={{ width: "80%", height: 14 }} />
        <div className={`${styles.skeletonLine} ${styles.skeleton}`} style={{ width: "50%", height: 12, marginTop: 4 }} />
      </div>
    </div>
    <div className={styles.cardBottom}>
      <div className={`${styles.skeletonLine} ${styles.skeleton}`} style={{ width: "100%", height: 32, borderRadius: 8 }} />
    </div>
  </div>
);

const ShopFavorites = () => {
  const { rawWishlist, wishlistIds, loading, toggleWishlist } = useStoreWishlist();

  // ── Store cart + cafe cart (for conflict detection) ────────────────────────
  const { storeCart, addToStoreCart } = useStoreCart();
  const { cart: cafeCart, clearCart: clearCafeCart } = useCart();

  // ── Bottom sheet state ─────────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = React.useState<StoreProduct | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = React.useState(false);
  const [isSubscribeSheetOpen, setIsSubscribeSheetOpen] = React.useState(false);
  const [subscribeVariantId, setSubscribeVariantId] = React.useState<string | null>(null);
  // Track which card is currently loading its full product data
  const [loadingId, setLoadingId] = React.useState<number | null>(null);

  const history = useHistory();

  // ── Conflict modal state ───────────────────────────────────────────────────
  const [conflictVisible, setConflictVisible] = React.useState(false);
  const pendingAddRef = React.useRef<{
    productId: number;
    quantity: number;
    variant: StoreVariant | null;
    unitPrice: number;
  } | null>(null);

  // ── handleAddToCart — same logic as StoreMain ──────────────────────────────
  const handleAddToCart = React.useCallback(
    (productId: number, quantity: number, variant: StoreVariant | null, unitPrice: number) => {
      const genuineCafeItems = (cafeCart?.items ?? []).filter((item) => {
        const prod = item.product as Record<string, unknown> | undefined;
        if (prod?.relationTo === "web-products") return false;
        const storeIds = new Set((storeCart?.items ?? []).map((s) => s.id));
        if (item.id && storeIds.has(item.id)) return false;
        return true;
      });

      const storeAlreadyHasItems = (storeCart?.items ?? []).length > 0;

      if (!storeAlreadyHasItems && genuineCafeItems.length > 0) {
        pendingAddRef.current = { productId, quantity, variant, unitPrice };
        setConflictVisible(true);
        return;
      }

      addToStoreCart(productId, quantity, variant?.id, variant?.variantName, unitPrice);
    },
    [cafeCart, storeCart, addToStoreCart],
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

  // ── "Buy Now" tapped: fetch full product then open AddBottomSheet ──────────
  const handleBuyNow = React.useCallback(async (id: number) => {
    setLoadingId(id);
    try {
      const fullProduct = await getStoreProductById(id);
      if (fullProduct) {
        setSelectedProduct(fullProduct);
        setIsAddSheetOpen(true);
      }
    } finally {
      setLoadingId(null);
    }
  }, []);

  // ── Build display list ─────────────────────────────────────────────────────
  const favorites = React.useMemo<ShopFavItem[]>(() => {
    return (rawWishlist || [])
      .map((item: any) => {
        const product = item?.product?.value ?? item?.product;
        if (!product) return null;

        const pid =
          typeof product.id === "number"
            ? product.id
            : parseInt(String(product.id), 10);

        if (!wishlistIds.includes(pid)) return null;

        const salePrice = product.salePrice ?? null;
        const regularPrice = product.regularPrice ?? null;
        const displayPrice = salePrice && regularPrice && salePrice < regularPrice
          ? salePrice
          : regularPrice;

        const rawUrl = product.productImage?.url ?? product.image?.url ?? "";
        const imageUrl = resolveImageUrl(rawUrl);

        return {
          id: pid,
          name: product.name ?? "",
          tagline: product.tagline ?? "",
          price: displayPrice != null ? `AED ${displayPrice}.00` : "",
          imageUrl,
        } as ShopFavItem;
      })
      .filter(Boolean) as ShopFavItem[];
  }, [rawWishlist, wishlistIds]);

  if (loading) {
    return (
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.row}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className={styles.main}>
        <div className={styles.emptyState}>
          <NoState
            title={"No favourites yet."}
            subtitle={"Heart a product in the Store to save it here."}
            ctaText={"Browse store"}
            onCta={() => history.push("/StoreMenu")}
            imageSrc="/fav.gif"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.row}>
          {favorites.map((item) => (
            <div className={styles.card} key={item.id}>
              <div className={styles.cardTop}>
                <div className={styles.cardImage}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={styles.productImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/fallback.png";
                    }}
                  />
                  <div
                    className={styles.removeIcon}
                    onClick={() => toggleWishlist(item.id)}
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path
                        d="M1.14771 10.4119L0 9.26421L4.07174 5.19247L0 1.14771L1.14771 0L5.21945 4.07174L9.26421 0L10.4119 1.14771L6.34018 5.19247L10.4119 9.26421L9.26421 10.4119L5.21945 6.34018L1.14771 10.4119Z"
                        fill="#6C7A5F"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={styles.cardMiddle}>
                <div className={styles.ProductPrice}>
                  <p>{item.price}</p>
                </div>
                <div className={styles.ProductDetails}>
                  <h3>{item.name}</h3>
                  <p>{item.tagline}</p>
                </div>
              </div>

              <div className={styles.cardBottom}>
                <button
                  className={styles.BuyNow}
                  disabled={loadingId === item.id}
                  onClick={() => handleBuyNow(item.id)}
                >
                  {loadingId === item.id ? "..." : "Buy Now"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AddBottomSheet ── */}
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

      {/* ── SubscribeBottomSheet ── */}
      {isSubscribeSheetOpen && selectedProduct && (
        <SubScribeBottomSheet
          product={selectedProduct}
          initialVariantId={subscribeVariantId ?? undefined}
          onClose={() => setIsSubscribeSheetOpen(false)}
        />
      )}

      {/* ── Cart conflict modal ── */}
      {conflictVisible && (
        <CartConflictModal
          existingOrigin="cafe"
          incomingOrigin="store"
          onReplace={handleConflictReplace}
          onCancel={handleConflictCancel}
        />
      )}


    </div>
  );
};

export default ShopFavorites;


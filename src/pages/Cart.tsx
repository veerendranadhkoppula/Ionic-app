/* eslint-disable @typescript-eslint/no-explicit-any */
import { IonContent, IonPage, IonHeader, IonFooter } from "@ionic/react";
import "./Home.css";
import React, { useState, useEffect, useCallback } from "react";
import { useIonViewWillEnter } from "@ionic/react";
import { useHistory } from "react-router-dom";
import Customization from "../components/Home/Customization/Customization";
import {
  getShopMenu,
  getSingleMenuItem,
  RawMenuItem,
  getShipAndTax,
} from "../api/apiCafe";
import { CartItem as CartCtxItem } from "../context/CartContext";
import TopSection from "../components/Cart/Caffe/TopSection/TopSection";
import Barista from "../components/Cart/Caffe/Barista/Barista";
import GuestBaristaSheet from "../components/Cart/Caffe/Barista/GuestBaristaSheet";
import useAuth from "../utils/useAuth";
import CafePayContainer from "../components/Cart/Caffe/PayContainer/PayContainer";
import cartEmptyStyles from "./CartEmpty.module.css";
import cartStyles from "./Cart.module.css";
import OtherItems from "../components/Cart/Caffe/OtherItems/OtherItems";
import BaristaSheet from "../components/Cart/Caffe/Barista/BaristaSheet";
import RewardsSheet from "../components/Cart/Caffe/CafeRewards/RewardsSheet";
import CafeRewards from "../components/Cart/Caffe/CafeRewards/CafeRewards";
import CuponsCoins from "../components/Cart/Caffe/CuponsCoins/CuponsCoins";
import TotalPay from "../components/Cart/Caffe/TotalPay/TotalPay";
import OrderMode from "../components/Cart/Caffe/OrderMode/OrderMode";
import EarnCafeStamps from "../components/Cart/Caffe/EarnCafeStamps/EarnCafeStamps";
import SpecialInstructions from "../components/Cart/Caffe/SpecialInstructions/SpecialInstructions";
import { useCart } from "../context/useCart";
import { useCheckout } from "../context/CafeCheckoutContext";
import { getUserWtStampData, getStampRewardProducts } from "../api/apiStamps";
import type { StampRewardProduct } from "../api/apiStamps";
import tokenStorage from "../utils/tokenStorage";
// ── Store cart imports ────────────────────────────────────────────────────────
import { useStoreCart } from "../context/useStoreCart";
import StoreCartOrderSummary, {
  CartStoreItem,
} from "../components/Cart/Store/OrderSummary/OrderSummary";
import StoreCartSubTotal from "../components/Cart/Store/SubTotal/SubTotal";
import StorePayContainer from "../components/StoreCheckout/PayContainer/PayContainer";
interface Props {
  appliedCoupon?: any;
  setAppliedCoupon?: (coupon: any | null) => void;
}

const Cart: React.FC<Props> = () => {
  const history = useHistory();
  const [isBaristaOpen, setIsBaristaOpen] = useState(false);
  const [isGuestBaristaOpen, setIsGuestBaristaOpen] = useState(false);
  const { isLoggedIn } = useAuth();
  const [selectedBarista, setSelectedBarista] = useState<{
    id: number;
    name: string;
    shortDesc: string;
  } | null>(null);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  // selectedReward lives in CafeCheckoutContext so PayContainer can read it directly
  const { cart, clearCart, shopId, addToCart, removeItem } = useCart();
  const {
    setItemsTotal,
    itemsTotal,
    setSelectedBaristaId,
    selectedReward,
    setSelectedReward,
    useCoins,
    appliedCoupon,
  } = useCheckout();
  const [isClearCartOpen, setIsClearCartOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  // ── Store cart ─────────────────────────────────────────────────────────────
  const {
    storeCart,
    clearStoreCartAll,
    incrementStoreItem,
    decrementStoreItem,
    removeStoreItem,
  } = useStoreCart();
  // Use actual item length rather than storeCartCount which can lag after server-side changes
  const isStoreCart = (storeCart?.items ?? []).length > 0;
  const cafeHasItems = (cart?.items ?? []).length > 0;
  const isEmpty = !isStoreCart && !cafeHasItems;

  // Derive store order items for StoreCartOrderSummary
  const storeOrderItems: CartStoreItem[] = React.useMemo(
    () =>
      (storeCart?.items ?? []).map((it) => ({
        id: it.id,
        name: it.productName ?? `Product #${it.productId}`,
        variantName: it.variantName,
        productImage: it.productImage,
        quantity: it.quantity,
        unitPrice: it.unitPrice ?? 0,
      })),
    [storeCart],
  );
  const storeTotal = React.useMemo(
    () =>
      storeOrderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
    [storeOrderItems],
  );

  // Tax for store cart footer "Proceed" button
  const [storeTaxRate, setStoreTaxRate] = useState<number>(0);
  useEffect(() => {
    if (isStoreCart) {
      getShipAndTax()
        .then((d) => setStoreTaxRate(d.tax))
        .catch(() => {});
    }
  }, [isStoreCart]);
  const storeTaxAmount = parseFloat(
    ((storeTotal * storeTaxRate) / 100).toFixed(2),
  );
  const storeTotalWithTax = parseFloat(
    (storeTotal + storeTaxAmount).toFixed(2),
  );

  // Stamps + reward-eligible items
  // Seed from sessionStorage immediately so containers render on refresh without
  // waiting for the async API call to complete.
  const [stampReward, setStampReward] = useState<number>(() => {
    try {
      return Number(sessionStorage.getItem("cafe_stamp_reward") ?? "0") || 0;
    } catch {
      return 0;
    }
  });
  const [earnedStampsCache, setEarnedStampsCache] = useState<number>(() => {
    try {
      return Number(sessionStorage.getItem("cafe_earned_stamps") ?? "0") || 0;
    } catch {
      return 0;
    }
  });
  const [rewardItems, setRewardItems] = useState<StampRewardProduct[]>([]);
  const [rewardItemsLoading, setRewardItemsLoading] = useState(true);
  const [menuItemsLoading, setMenuItemsLoading] = useState(true);

  // Fetch user stamp data (exposed so we can call it on mount and whenever the
  // view becomes active). Persist to sessionStorage so the UI survives refresh.
  const fetchStamps = useCallback(async () => {
    try {
      console.log("🔄 Cart: fetching user stamp data...");
      const token = await tokenStorage.getToken();
      const { stampReward: sr, stampCount: sc } = await getUserWtStampData(
        token,
      );
      console.log("🔄 Cart: fetched stamp data", {
        stampReward: sr,
        stampCount: sc,
      });
      setStampReward(sr);
      try {
        sessionStorage.setItem("cafe_stamp_reward", String(sr));
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.setItem("cafe_stamp_count", String(sc));
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.warn("⚠️ Cart: failed to fetch stamp data", err);
      setStampReward(0);
    }
  }, []);

  // Run once on mount so refresh/resilience still works
  useEffect(() => {
    void fetchStamps();
  }, [fetchStamps]);

  // Also refresh stamp data whenever the Cart view becomes active. This fixes
  // the UX where rewards only appear after a full app refresh — now the
  // cart will show the updated reward count when the user navigates back.
  useIonViewWillEnter(() => {
    console.log(
      "useIonViewWillEnter: Cart view entering — refreshing stamp data",
    );
    void fetchStamps();
  });

  // Also refresh stamp data when a cafe order is placed in the same tab.
  // Express.tsx dispatches 'cafe_order_placed' when it persists the active order.
  useEffect(() => {
    const handler = () => {
      console.log(
        "window:event cafe_order_placed received — refreshing stamps",
      );
      void fetchStamps();
    };
    window.addEventListener("cafe_order_placed", handler);
    return () => window.removeEventListener("cafe_order_placed", handler);
  }, [fetchStamps]);

  // customization edit state
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [customizingCartItem, setCustomizingCartItem] =
    useState<CartCtxItem | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<any | null>(
    null,
  );
  const [customizingInitialSelections, setCustomizingInitialSelections] =
    useState<Record<string, Record<string, any[]>> | undefined>(undefined);

  // Load menu items for classification by category.slug
  const [menuItems, setMenuItems] = useState<RawMenuItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!shopId) return;
        const items = await getShopMenu(Number(shopId));
        if (!mounted) return;
        setMenuItems(items || []);
      } catch (err) {
        console.error("Cart: failed to fetch menu for classification", err);
      } finally {
        if (mounted) setMenuItemsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [shopId]);

  // Fetch admin-configured stamp reward products from the global
  // GET /api/globals/stamp-reward-products
  useEffect(() => {
    let mounted = true;
    const fetchRewardProducts = async () => {
      try {
        setRewardItemsLoading(true);
        const items = await getStampRewardProducts();
        if (mounted) setRewardItems(items);
      } catch {
        if (mounted) setRewardItems([]);
      } finally {
        if (mounted) setRewardItemsLoading(false);
      }
    };
    fetchRewardProducts();
    return () => {
      mounted = false;
    };
  }, []);

  // Full product definitions keyed by productId — needed to resolve customization labels.
  // getShopMenu (list endpoint) often omits customization definitions; getSingleMenuItem has them.
  const [productDefs, setProductDefs] = useState<Record<number, any>>({});
  // Dedicated stamp-eligible pid set — populated when getSingleMenuItem results arrive.
  // Kept separate so a state update triggers re-render of the stamp components.
  const [stampEligiblePids, setStampEligiblePids] = useState<Set<number>>(
    new Set(),
  );
  // Track which pids have been fetched (or are in-flight) to avoid duplicate requests.
  const fetchedPidsRef = React.useRef<Set<number>>(new Set());

  useEffect(() => {
    fetchedPidsRef.current.clear();
    setProductDefs({});
    setStampEligiblePids(new Set());
    // Also reset the earned-stamps cache so stale sessionStorage values from a
    // previous cart never cause the stamp banner to show for non-eligible items.
    setEarnedStampsCache(0);
    try {
      sessionStorage.setItem("cafe_earned_stamps", "0");
    } catch {
      /* ignore */
    }
    console.log(
      "🔄 Cart mounted — cleared productDefs & stampEligiblePids caches",
    );
  }, []); // ← runs once on mount only

  useEffect(() => {
    if (!shopId || !cart?.items?.length) return;
    let mounted = true;

    const uniquePids = [
      ...new Set(
        (cart.items || [])
          .map((it: any) =>
            Number(
              it?.productId ?? it?.product?.id ?? it?.product?.value?.id ?? NaN,
            ),
          )
          .filter((p) => !Number.isNaN(p)),
      ),
    ] as number[];

    console.log(
      "🔄 Cart productDefs effect — uniquePids:",
      uniquePids,
      "| alreadyFetched:",
      [...fetchedPidsRef.current],
    );

    // Only fetch pids we haven't already fetched/started fetching.
    const missing = uniquePids.filter((p) => !fetchedPidsRef.current.has(p));
    if (missing.length === 0) {
      console.log("🔄 Cart productDefs — all pids already fetched, skipping");
      return;
    }

    // Mark all as in-flight immediately so concurrent renders don't duplicate requests.
    missing.forEach((p) => fetchedPidsRef.current.add(p));
    console.log("🔄 Cart productDefs — fetching missing pids:", missing);

    (async () => {
      const results: Record<number, any> = {};
      for (const pid of missing) {
        try {
          const detail = await getSingleMenuItem(Number(shopId), pid);
          results[pid] = detail;
          console.log(
            `🔍 getSingleMenuItem pid=${pid} isStampEligible:`,
            detail?.isStampEligible,
          );
        } catch (err) {
          console.warn("Cart: failed to fetch product def for pid", pid, err);
          fetchedPidsRef.current.delete(pid);
        }
      }
      if (!mounted) return;
      if (Object.keys(results).length > 0) {
        setProductDefs((prev) => ({ ...prev, ...results }));
        // Update stampEligiblePids based on fresh results
        setStampEligiblePids((prev) => {
          const next = new Set(prev);
          Object.entries(results).forEach(([pidStr, def]) => {
            const pid = Number(pidStr);
            if ((def as any)?.isStampEligible === true) {
              next.add(pid);
              console.log(`✅ pid=${pid} added to stampEligiblePids`);
            } else {
              next.delete(pid);
              console.log(`⬜ pid=${pid} NOT stamp-eligible`);
            }
          });
          return next;
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [shopId, cart?.items]);

  const beveragesItems: CartCtxItem[] = [];
  const bakeryItems: CartCtxItem[] = [];

  console.log(
    "Cart: menuItems count",
    menuItems.length,
    "cart items",
    (cart?.items || []).length,
  );

  (cart?.items || []).forEach((cartItem: CartCtxItem) => {
    const ci: any = cartItem as any;
    // Resolve productId from all possible shapes the backend may return:
    // ci.productId | ci.product.id | ci.product.value.id
    const pid = Number(
      ci?.productId ?? ci?.product?.id ?? ci?.product?.value?.id ?? NaN,
    );
    if (Number.isNaN(pid)) {
      console.warn("Cart: skipping cartItem with invalid pid", cartItem);
      return;
    }

    const matched = menuItems.find((m) => Number(m.id) === pid);
    if (!matched) {
      console.warn(
        "Cart: no matching menu item for pid",
        pid,
        "cartItem",
        cartItem,
      );
      return;
    }

    // 🔍 STAMP DEBUG — log the full raw matched item to see all fields from API
    console.log("🔍 STAMP DEBUG matched raw item:", JSON.stringify(matched));
    console.log(
      "🔍 STAMP DEBUG isStampEligible value:",
      (matched as any).isStampEligible,
      "| type:",
      typeof (matched as any).isStampEligible,
    );

    const slug = String(matched.category?.slug || "").toLowerCase();
    console.log("Cart: matched menu item", { pid, slug, name: matched.name });
    // Normalize product fields from matched menu item so child components display correctly
    const imageObj: any = (matched as any).image;
    let imageUrl = "";
    try {
      if (imageObj?.url) {
        imageUrl = String(imageObj.url);
        if (!imageUrl.startsWith("http"))
          imageUrl = `https://endpoint.whitemantis.ae${imageUrl}`;
      } else if (typeof imageObj === "string") {
        imageUrl = imageObj;
        if (!imageUrl.startsWith("http"))
          imageUrl = `https://endpoint.whitemantis.ae${imageUrl}`;
      }
    } catch {
      imageUrl = "";
    }

    const normalizedProduct: any = {
      id: matched.id,
      title: matched.name,
      name: matched.name,
      price: (matched as any).price ?? (matched as any).salePrice ?? 0,
      discountPrice: (matched as any).salePrice ?? (matched as any).price ?? 0,
      inStock: (matched as any).isAvailable ?? (matched as any).inStock ?? true,
      image: imageUrl,

      customizations:
        (productDefs[pid] as any)?.customizations ??
        (matched as any).customizations ??
        [],
      size: (matched as any).size ?? undefined,
      addOn: (matched as any).addOn ?? undefined,
      isVeg:
        ((matched as any).dietaryType || "").toLowerCase().indexOf("non") ===
        -1,
      // Prefer the authoritative single-item productDefs value when available,
      // but fall back to the list-endpoint `matched.isStampEligible` so the
      // UI can show stamp-related containers immediately after adding an
      // eligible product (before getSingleMenuItem completes).
      isStampEligible:
        (productDefs[pid] as any)?.isStampEligible === true ||
        (matched as any)?.isStampEligible === true,
      isStampFreeProduct:
        (productDefs[pid] as any)?.isStampFreeProduct === true,
    };

    console.log("Cart: normalizedProduct", { pid, normalizedProduct });

    const enriched: CartCtxItem = {
      ...(cartItem as any),
      product: normalizedProduct,
      customizations: (cartItem as any).customizations || [],
    } as any;
    console.log("🛒 Cart: enriched cartItem", {
      id: enriched.id,
      productId: enriched.productId,
      customizations: (enriched as any).customizations,
      custLength: Array.isArray((enriched as any).customizations)
        ? (enriched as any).customizations.length
        : "n/a",
      firstCustKeys:
        Array.isArray((enriched as any).customizations) &&
        (enriched as any).customizations.length > 0
          ? Object.keys((enriched as any).customizations[0] || {})
          : [],
    });
    if (slug === "beverages") beveragesItems.push(enriched);
    else bakeryItems.push(enriched);
  });

  console.log("Cart: classification result", {
    beverages: beveragesItems.length,
    bakery: bakeryItems.length,
  });

  // earnedStamps = total quantity of stamp-eligible items in cart
  // Uses stampEligiblePids (populated after getSingleMenuItem resolves) — reliable even after async load.
  // Falls back to earnedStampsCache (from sessionStorage) while async is still in-flight (e.g. after refresh).
  const allCartItems = [...beveragesItems, ...bakeryItems];
  const earnedStampsLive = allCartItems.reduce((acc, it) => {
    const pid = Number(
      (it as any)?.productId ?? (it as any)?.product?.id ?? NaN,
    );
    const isEligible = !Number.isNaN(pid) && stampEligiblePids.has(pid);
    console.log(
      `🔍 STAMP COUNT item: ${
        (it as any)?.product?.name
      } | pid: ${pid} | inEligibleSet: ${isEligible} | qty: ${it.quantity}`,
    );
    return isEligible ? acc + (it.quantity || 1) : acc;
  }, 0);

  // Use live count once stampEligiblePids has been populated; otherwise fall
  // back to a fast count derived from the normalized product flag (from the
  // list-endpoint `matched.isStampEligible`) so the UI shows the expected
  // "You'll earn X Café Stamps" immediately after adding an eligible item.
  const stampEligibleResolved = stampEligiblePids.size > 0;

  const fallbackEarnedFromProducts = allCartItems.reduce((acc, it) => {
    const qty = Number((it as any)?.quantity ?? 1) || 1;
    return (it as any)?.product?.isStampEligible ? acc + qty : acc;
  }, 0);

  const earnedStamps = stampEligibleResolved
    ? earnedStampsLive
    : fallbackEarnedFromProducts || earnedStampsCache;

  // Persist earnedStamps once we have a real value
  useEffect(() => {
    if (stampEligibleResolved && earnedStampsLive !== earnedStampsCache) {
      setEarnedStampsCache(earnedStampsLive);
      try {
        sessionStorage.setItem("cafe_earned_stamps", String(earnedStampsLive));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stampEligibleResolved, earnedStampsLive]);

  // Show coupon-applied modal whenever a coupon is set in the checkout context.
  // Show coupon-applied modal when a coupon is newly applied in the cafe cart.
  // We track the previously-seen coupon code and which coupon has been
  // acknowledged (closed) so the modal appears when a coupon is applied but
  // does not reappear after the user explicitly closes it.
  const prevAppliedCouponCodeRef = React.useRef<string | null>(null);

  const SESSION_KEY = "cafe_acknowledged_coupon";

  const closeCouponModal = React.useCallback(() => {
    try {
      const code = String((appliedCoupon as any)?.code ?? "");
      if (code) {
        try {
          sessionStorage.setItem(SESSION_KEY, code);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
    setIsCouponModalOpen(false);
  }, [appliedCoupon]);

  useEffect(() => {
    if (isStoreCart) {
      setIsCouponModalOpen(false);
      return;
    }

    const code = String((appliedCoupon as any)?.code ?? "");

    if (!code) {
      // No coupon applied — clear prev marker and the session acknowledged key
      prevAppliedCouponCodeRef.current = null;
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
      setIsCouponModalOpen(false);
      return;
    }

    // If we have an acknowledged record in sessionStorage, do not re-show
    let acknowledged: string | null = null;
    try {
      acknowledged = sessionStorage.getItem(SESSION_KEY);
    } catch {
      acknowledged = null;
    }

    // Newly applied coupon (different code than previously seen)
    if (prevAppliedCouponCodeRef.current !== code) {
      prevAppliedCouponCodeRef.current = code;
      // If not yet acknowledged in this session, show modal
      if (acknowledged !== code) setIsCouponModalOpen(true);
      else setIsCouponModalOpen(false);
      return;
    }

    // Same coupon as before — only show if not acknowledged
    if (acknowledged !== code) setIsCouponModalOpen(true);
    else setIsCouponModalOpen(false);
  }, [appliedCoupon, isStoreCart]);

  // Compute the actual coupon discount to display in the modal.
  // For percentage coupons we calculate against the current itemsTotal; for flat coupons we use the discountAmount field.
  const couponDisplayAmount = React.useMemo(() => {
    if (!appliedCoupon) return 0;
    try {
      const a = appliedCoupon as any;
      if (a.discountType === "percentage") {
        const pct = Number(a.discountAmount ?? 0);
        return parseFloat(((itemsTotal * pct) / 100).toFixed(2));
      }
      // fallback to known numeric fields
      return Number(a.discountAmount ?? a.amount ?? a.value ?? 0);
    } catch {
      return 0;
    }
  }, [appliedCoupon, itemsTotal]);

  // Show stamp/reward containers if:
  //  a) we have computed live stamp-eligible items, OR
  //  b) we have a cached count from a previous render (survives refresh)
  // Show the stamp/reward container if we have a positive earnedStamps count
  // OR if any enriched cart item is flagged stamp-eligible from the (fast)
  // list-endpoint `matched` data. This ensures the EarnCafeStamps box
  // appears immediately after adding an eligible product without waiting
  // for getSingleMenuItem to finish.
  const hasAnyStampEligible =
    earnedStamps > 0 ||
    allCartItems.some((it) => Boolean((it as any)?.product?.isStampEligible));
  console.log(
    "🎯 STAMP RESULT earnedStamps:",
    earnedStamps,
    "| resolved:",
    stampEligibleResolved,
    "| hasAnyStampEligible:",
    hasAnyStampEligible,
    "| eligiblePids:",
    [...stampEligiblePids],
  );

  const cartLoading = menuItemsLoading || rewardItemsLoading;

  // Push computed itemsTotal into CafeCheckoutContext so TotalPay/PayContainer can read it.
  // Runs whenever the enriched cart composition changes.
  useEffect(() => {
    const total = [...beveragesItems, ...bakeryItems].reduce((sum, item) => {
      const p = (item as any)?.product;
      const basePrice = Number(
        p?.discountPrice ?? p?.salePrice ?? p?.price ?? 0,
      );
      const custExtra = Array.isArray((item as any).customizations)
        ? (item as any).customizations.reduce(
            (s: number, c: any) => s + (Number(c?.price) || 0),
            0,
          )
        : 0;
      return sum + (basePrice + custExtra) * (item.quantity ?? 1);
    }, 0);
    setItemsTotal(parseFloat(total.toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.items, menuItems]);

  const handleEdit = (cartItemId: string, productId?: number) => {
    try {
      const found =
        [...beveragesItems, ...bakeryItems].find(
          (it) => it.id === cartItemId,
        ) || null;
      if (found) {
        const product = (found as any)?.product || null;

        // Convert backend customizations [{sectionId, selectedOptionId, selectedOptionLabel, price}]
        // back to the selectedOptions {[sectionId]: {[groupId]: option[]}} shape for Customization.
        // Since backend doesn't store groupId, we use sectionId as the groupId key as well.
        const backendCusts: any[] = Array.isArray((found as any).customizations)
          ? (found as any).customizations
          : [];
        let initialSelections:
          | Record<string, Record<string, any[]>>
          | undefined;
        if (backendCusts.length > 0) {
          const selections: Record<string, Record<string, any[]>> = {};
          backendCusts.forEach((c: any) => {
            const sid = String(c.sectionId ?? c.sectionTitle ?? "");
            if (!sid) return;
            if (!selections[sid]) selections[sid] = {};
            // Use sectionId as the groupId key since we don't have the original groupId
            const gid = String(c.groupId ?? sid);
            if (!selections[sid][gid]) selections[sid][gid] = [];
            selections[sid][gid].push({
              id: String(c.selectedOptionId ?? c.optionId ?? ""),
              label: String(c.selectedOptionLabel ?? c.label ?? ""),
              price: Number(c.price ?? 0),
            });
          });
          initialSelections = selections;
        }

        setCustomizingCartItem(found || null);
        setCustomizingProduct(product);
        setCustomizingInitialSelections(initialSelections);
        setIsCustomizationOpen(true);
        return;
      }

      if (productId != null) {
        const matched = menuItems.find(
          (m) => Number(m.id) === Number(productId),
        );
        if (matched) {
          const imageObj: any = (matched as any).image;
          let imageUrl = "";
          try {
            if (imageObj?.url) {
              imageUrl = String(imageObj.url);
              if (!imageUrl.startsWith("http"))
                imageUrl = `https://endpoint.whitemantis.ae${imageUrl}`;
            } else if (typeof imageObj === "string") {
              imageUrl = imageObj;
              if (!imageUrl.startsWith("http"))
                imageUrl = `https://endpoint.whitemantis.ae${imageUrl}`;
            }
          } catch {
            imageUrl = "";
          }

          const product = {
            id: matched.id,
            name: matched.name,
            title: matched.name,
            price: (matched as any).price ?? (matched as any).salePrice ?? 0,
            discountPrice:
              (matched as any).salePrice ?? (matched as any).price ?? 0,
            inStock:
              (matched as any).isAvailable ?? (matched as any).inStock ?? true,
            image: imageUrl,
            size: (matched as any).size ?? undefined,
            addOn: (matched as any).addOn ?? undefined,
            customizations: (matched as any).customizations ?? [],
          } as any;

          setCustomizingCartItem(null);
          setCustomizingProduct(product);
          setCustomizingInitialSelections(undefined);
          setIsCustomizationOpen(true);
          return;
        }
      }

      console.warn("Cart: handleEdit could not resolve product/cartItem", {
        cartItemId,
        productId,
      });
    } catch (err) {
      console.error("Cart: handleEdit failed", err);
    }
  };

  const handleCustomizationConfirm = async (data: {
    bagAmount: string;
    size: string;
    quantity: number;
    selectedOptions?: { [sectionId: string]: { [groupId: string]: any[] } };
  }) => {
    try {
      if (!customizingCartItem) return;
      const pid = Number(
        (customizingCartItem as any)?.product?.id ??
          (customizingCartItem as any)?.product?.value?.id ??
          NaN,
      );
      if (Number.isNaN(pid)) {
        console.warn(
          "Cart: cannot resolve product id for editing",
          customizingCartItem,
        );
        setIsCustomizationOpen(false);
        return;
      }

      // Preserve the existing quantity for this variant — when editing a variant
      // the user's intention is usually to update all units of that variant.
      const qtyToTransfer = Number(customizingCartItem.quantity ?? 1) || 1;
      console.log("Cart: editing variant", {
        id: customizingCartItem.id,
        pid,
        qtyToTransfer,
      });

      // Remove the old variant entry (this will decrement/delete backend row and update local variant ledger)
      await removeItem(customizingCartItem.id);

      // Re-add the same product with the new customization the same number of times
      // so the new variant ends up with the same total quantity.
      for (let i = 0; i < qtyToTransfer; i++) {
        // serialise to keep server-side quantity consistent.
        // addToCart merges with existing variants if selection matches, so this handles merges too.
        await addToCart(pid, data);
      }
    } catch (err) {
      console.error("Cart: customization confirm failed", err);
    } finally {
      setIsCustomizationOpen(false);
      setCustomizingCartItem(null);
      setCustomizingProduct(null);
      setCustomizingInitialSelections(undefined);
    }
  };

  return (
    <IonPage>
      <IonHeader slot="fixed">
        {/* Hide Clear Cart CTA when the cart is empty; TopSection only shows it when onClearClick is provided */}
        <TopSection
          onClearClick={isEmpty ? undefined : () => setIsClearCartOpen(true)}
        />
      </IonHeader>

      <IonContent fullscreen scrollY={true} className="home-content">
        {isEmpty ? (
          // Empty cart placeholder (centered) — match provided design and spacing
          <div className={cartEmptyStyles.container}>
            <div className={cartEmptyStyles.iconWrapper}>
              <svg
                className={cartEmptyStyles.iconSvg}
                width="100"
                height="100"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g opacity="0.4">
                  <path
                    d="M8.53906 8.54297H16.8724L27.9557 60.293C28.3623 62.1882 29.4169 63.8825 30.9379 65.0841C32.4589 66.2856 34.3512 66.9194 36.2891 66.8763H77.0391C78.9356 66.8732 80.7744 66.2233 82.2517 65.034C83.7289 63.8446 84.7563 62.1868 85.1641 60.3346L92.0391 29.3763H21.3307M37.4974 87.5013C37.4974 89.8025 35.6319 91.668 33.3307 91.668C31.0295 91.668 29.1641 89.8025 29.1641 87.5013C29.1641 85.2001 31.0295 83.3346 33.3307 83.3346C35.6319 83.3346 37.4974 85.2001 37.4974 87.5013ZM83.3307 87.5013C83.3307 89.8025 81.4653 91.668 79.1641 91.668C76.8629 91.668 74.9974 89.8025 74.9974 87.5013C74.9974 85.2001 76.8629 83.3346 79.1641 83.3346C81.4653 83.3346 83.3307 85.2001 83.3307 87.5013Z"
                    stroke="#6C7A5F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </div>
            <h3 className={cartEmptyStyles.title}>
              Your cart is currently empty
            </h3>
            <p className={cartEmptyStyles.subtitle}>
              Once you add items, they’ll appear here for a smooth checkout.
            </p>
            <div className={cartEmptyStyles.ctaWrap}>
              <button
                onClick={() => history.push("/CafeMenu")}
                className={cartEmptyStyles.browseBtn}
              >
                Browse Menu
              </button>
            </div>
          </div>
        ) : isStoreCart ? (
          /* ── STORE CART VIEW ───────────────────────────────────────── */
          <>
            <StoreCartOrderSummary
              items={storeOrderItems}
              onIncrement={(id) => incrementStoreItem(id)}
              onDecrement={(id) => decrementStoreItem(id)}
              onRemove={(id) => removeStoreItem(id)}
            />
            <StoreCartSubTotal subtotal={storeTotal} />
          </>
        ) : cartLoading ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              backgroundColor: "#ffffff",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src="/12.gif"
              alt="Loading"
              style={{ width: 90, height: 90 }}
            />
          </div>
        ) : (
          /* ── CAFE CART VIEW ────────────────────────────────────────── */
          <>
            {beveragesItems.length > 0 && (
              <Barista
                openSheet={() => {
                  if (isLoggedIn) setIsBaristaOpen(true);
                  else setIsGuestBaristaOpen(true);
                }}
                selectedBarista={selectedBarista}
                clearBarista={() => {
                  setSelectedBarista(null);
                  setSelectedBaristaId(null);
                }}
                items={beveragesItems}
                onEdit={handleEdit}
              />
            )}

            {bakeryItems.length > 0 && (
              <OtherItems items={bakeryItems} onEdit={handleEdit} />
            )}

            {/* Show stamp progress only when at least one item in cart is stamp-eligible */}
            {hasAnyStampEligible && !useCoins && (
              <EarnCafeStamps earnedStamps={earnedStamps} />
            )}

            {/* Show reward section whenever user has at least 1 redeemable reward — independent of cart contents */}
            {stampReward >= 1 && (
              <CafeRewards
                openSheet={() => setIsRewardsOpen(true)}
                selectedReward={selectedReward}
                clearReward={() => setSelectedReward(null)}
              />
            )}

            <SpecialInstructions />
            <OrderMode />
            <CuponsCoins />
            <TotalPay />
          </>
        )}
      </IonContent>

      {/* Hide the footer pay container when the cart is empty */}
      {!isEmpty && (
        <IonFooter>
          {isStoreCart ? (
            <StorePayContainer
              total={storeTotalWithTax}
              label="Proceed"
              onProceed={() => history.push("/StoreCheckout")}
            />
          ) : (
            <CafePayContainer />
          )}
        </IonFooter>
      )}
      <BaristaSheet
        isOpen={isBaristaOpen}
        onClose={() => setIsBaristaOpen(false)}
        currentBaristaId={selectedBarista?.id ?? null}
        onClear={() => {
          setSelectedBarista(null);
          setSelectedBaristaId(null);
        }}
        onConfirm={(barista) => {
          setSelectedBarista(barista);
          setSelectedBaristaId(barista.id);
          setIsBaristaOpen(false);
        }}
      />
      <GuestBaristaSheet
        isOpen={isGuestBaristaOpen}
        onClose={() => setIsGuestBaristaOpen(false)}
      />
      <RewardsSheet
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
        selectedReward={selectedReward}
        setSelectedReward={setSelectedReward}
        rewardItems={rewardItems}
        rewardItemsLoading={rewardItemsLoading}
        availableRewardCount={stampReward}
      />

      <Customization
        isOpen={isCustomizationOpen}
        product={customizingProduct}
        onClose={() => {
          setIsCustomizationOpen(false);
          setCustomizingInitialSelections(undefined);
        }}
        onConfirm={handleCustomizationConfirm}
        initialSelections={customizingInitialSelections}
      />
      {isClearCartOpen && (
        <div
          className={cartStyles.overlay + " " + cartStyles.clearOverlay}
          onClick={() => setIsClearCartOpen(false)}
        >
          <div className={cartStyles.box} onClick={(e) => e.stopPropagation()}>
            <h3 className={cartStyles.clearTitle}>Clear cart?</h3>
            <p className={cartStyles.clearText}>
              Are you sure you want to clear your cart?
            </p>

            <div className={cartStyles.row}>
              <button
                onClick={() => setIsClearCartOpen(false)}
                className={cartStyles.btnGhost}
              >
                No
              </button>
              <button
                onClick={async () => {
                  try {
                    if (isStoreCart) {
                      await clearStoreCartAll();
                    } else {
                      await clearCart();
                    }
                  } catch (err) {
                    console.error("Clear cart action failed", err);
                  } finally {
                    setIsClearCartOpen(false);
                  }
                }}
                className={cartStyles.btnPrimary}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {isCouponModalOpen && appliedCoupon && (
        <div className={cartStyles.overlay} onClick={closeCouponModal}>
          <div
            className={cartStyles.couponWrapper}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeCouponModal}
              aria-label="close"
              className={cartStyles.closeButton}
            >
              <svg
                width="35"
                height="35"
                viewBox="0 0 35 35"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
                  fill="#4B3827"
                />
              </svg>
            </button>

            <div className={cartStyles.couponBox}>
              <div className={cartStyles.centerIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 32C15.4264 32 14.883 31.8933 14.3698 31.68C13.8578 31.4655 13.4039 31.1561 13.008 30.752C12.08 29.8477 11.2883 29.2563 10.6329 28.9778C9.97748 28.6993 8.99259 28.56 7.67822 28.56C6.50133 28.56 5.50044 28.1481 4.67556 27.3244C3.85185 26.4996 3.44 25.4981 3.44 24.32C3.44 23.0305 3.30015 22.0516 3.02044 21.3831C2.74074 20.7147 2.14993 19.9176 1.248 18.992C0.835555 18.5796 0.524445 18.1179 0.314667 17.6071C0.104889 17.0975 0 16.5641 0 16.0071C0 15.4501 0.104889 14.9144 0.314667 14.4C0.524445 13.8856 0.835555 13.4216 1.248 13.008C2.14874 12.0966 2.73956 11.3108 3.02044 10.6507C3.30133 9.99052 3.44118 8.9997 3.44 7.67822C3.44 6.50133 3.85185 5.50044 4.67556 4.67556C5.50044 3.85185 6.50193 3.44 7.68 3.44C8.96948 3.44 9.94844 3.30015 10.6169 3.02044C11.2853 2.74074 12.0824 2.14993 13.008 1.248C13.405 0.843852 13.8607 0.535111 14.3751 0.321778C14.8895 0.107259 15.4264 0 15.9858 0C16.5452 0 17.0833 0.104889 17.6 0.314667C18.1167 0.524445 18.5807 0.835555 18.992 1.248C19.9034 2.14874 20.6892 2.73956 21.3493 3.02044C22.0095 3.30133 23.0003 3.44118 24.3218 3.44C25.4987 3.44 26.4996 3.85185 27.3244 4.67556C28.1493 5.50044 28.5618 6.50193 28.5618 7.68C28.5618 8.96948 28.7016 9.94844 28.9813 10.6169C29.261 11.2853 29.8513 12.0824 30.752 13.008C31.1644 13.4204 31.4756 13.8821 31.6853 14.3929C31.8951 14.9025 32 15.4359 32 15.9929C32 16.5499 31.8951 17.0856 31.6853 17.6C31.4756 18.1144 31.1644 18.5784 30.752 18.992C29.8477 19.9188 29.2563 20.7105 28.9778 21.3671C28.6993 22.0237 28.5606 23.0086 28.5618 24.3218C28.5618 25.4987 28.1493 26.4996 27.3244 27.3244C26.4996 28.1493 25.4981 28.5618 24.32 28.5618C23.0305 28.5618 22.0516 28.7016 21.3831 28.9813C20.7147 29.261 19.9176 29.8513 18.992 30.752C18.5961 31.1561 18.1422 31.4655 17.6302 31.68C17.1182 31.8933 16.5748 32 16 32ZM16.0053 30.2222C16.3301 30.2222 16.6489 30.1588 16.9618 30.032C17.2759 29.9052 17.5407 29.7333 17.7564 29.5164C18.7899 28.4616 19.773 27.7422 20.7058 27.3582C21.6385 26.9742 22.8439 26.7822 24.3218 26.7822C25.0187 26.7822 25.603 26.5464 26.0747 26.0747C26.5464 25.603 26.7822 25.0187 26.7822 24.3218C26.7822 22.8533 26.9742 21.6563 27.3582 20.7307C27.7422 19.805 28.451 18.8136 29.4844 17.7564C29.9763 17.2646 30.2222 16.6791 30.2222 16C30.2222 15.3209 29.9876 14.7461 29.5182 14.2756C28.4634 13.2207 27.744 12.227 27.36 11.2942C26.976 10.3615 26.784 9.15615 26.784 7.67822C26.784 6.98133 26.5476 6.39704 26.0747 5.92533C25.603 5.45245 25.0187 5.216 24.3218 5.216C22.8201 5.216 21.6101 5.02993 20.6916 4.65778C19.773 4.28444 18.7834 3.57037 17.7227 2.51556C17.5058 2.29985 17.2409 2.12267 16.928 1.984C16.6151 1.84533 16.3058 1.77659 16 1.77778C15.6942 1.77896 15.379 1.85067 15.0542 1.99289C14.7295 2.13511 14.4587 2.30933 14.2418 2.51556C13.2107 3.54785 12.2281 4.256 11.2942 4.64C10.3603 5.024 9.15496 5.216 7.67822 5.216C6.98133 5.216 6.39704 5.45245 5.92533 5.92533C5.45245 6.39704 5.216 6.98133 5.216 7.67822C5.216 9.16918 5.024 10.3781 4.64 11.3049C4.256 12.2317 3.53718 13.2219 2.48356 14.2756C2.01304 14.7461 1.77778 15.3209 1.77778 16C1.77778 16.6791 2.01244 17.2652 2.48178 17.7582C3.53659 18.813 4.25659 19.7997 4.64178 20.7182C5.02696 21.6367 5.21896 22.8379 5.21778 24.3218C5.21778 25.0187 5.45363 25.603 5.92533 26.0747C6.39704 26.5464 6.98133 26.7822 7.67822 26.7822C9.17156 26.7822 10.3751 26.9742 11.2889 27.3582C12.2027 27.7434 13.1982 28.4634 14.2756 29.5182C14.4936 29.7351 14.7544 29.907 15.0578 30.0338C15.3612 30.1606 15.677 30.2234 16.0053 30.2222ZM20.2116 21.9147C20.6975 21.9147 21.1028 21.7523 21.4276 21.4276C21.7523 21.1028 21.9147 20.6975 21.9147 20.2116C21.9147 19.7256 21.7523 19.3126 21.4276 18.9724C21.1028 18.6311 20.6975 18.4604 20.2116 18.4604C19.7256 18.4604 19.3126 18.6311 18.9724 18.9724C18.6323 19.3138 18.4616 19.7268 18.4604 20.2116C18.4593 20.6963 18.6299 21.1016 18.9724 21.4276C19.315 21.7535 19.728 21.9159 20.2116 21.9147ZM11.7049 21.5182L21.5182 11.7404L20.2596 10.4818L10.4818 20.2951L11.7049 21.5182ZM13.0276 13.0276C13.3677 12.6874 13.5378 12.2744 13.5378 11.7884C13.5378 11.3025 13.3677 10.8972 13.0276 10.5724C12.6874 10.2477 12.2744 10.0853 11.7884 10.0853C11.3025 10.0853 10.8972 10.2477 10.5724 10.5724C10.2477 10.8972 10.0853 11.3025 10.0853 11.7884C10.0853 12.2744 10.2477 12.6874 10.5724 13.0276C10.8972 13.3677 11.3025 13.5384 11.7884 13.5396C12.2744 13.5407 12.6874 13.3701 13.0276 13.0276Z"
                    fill="#6C7A5F"
                  />
                </svg>
              </div>

              <div className={cartStyles.couponTitle}>
                ‘{String(appliedCoupon.code)}’ applied!
              </div>

              <div className={cartStyles.couponSaved}>
                You saved AED {couponDisplayAmount.toFixed(2)} on this order
              </div>

              <button
                onClick={closeCouponModal}
                className={cartStyles.couponCta}
              >
                YAY!
              </button>
            </div>
          </div>
        </div>
      )}
    </IonPage>
  );
};

export default Cart;

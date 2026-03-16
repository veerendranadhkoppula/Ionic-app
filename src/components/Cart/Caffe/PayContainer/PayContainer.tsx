import React, { useState, useEffect } from 'react'
import styles from "./PayContainer.module.css"
import { useHistory } from "react-router-dom";
import { useCheckout } from "../../../../context/CafeCheckoutContext";
import { useCart } from "../../../../context/useCart";
import { useShopId } from "../../../../context/useShopId";
import { getShipAndTax } from "../../../../api/apiCafe";
import { getUserWtCoins, getWtCoinsConfig } from "../../../../api/apiCoins";
import tokenStorage from "../../../../utils/tokenStorage";
import useAuth from "../../../../utils/useAuth";

const PayContainer = () => {
  const history = useHistory();
  const { cart } = useCart();
  const shopId = useShopId(); // always dynamic — never hardcoded
  const {
    appliedCoupon,
    useCoins,
    itemsTotal,
    orderType,
    timeSelection,
    selectedSlot,
    specialInstructions,
    selectedBaristaId,
    selectedReward,
  } = useCheckout();

  const [taxRate, setTaxRate] = useState<number>(0);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [pointsToAed, setPointsToAed] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    getShipAndTax().then((d) => setTaxRate(d.tax));
    getWtCoinsConfig().then((c) => setPointsToAed(c.pointsToAed));
  }, []);

  useEffect(() => {
    if (!useCoins) return;
    tokenStorage.getToken().then((t) => getUserWtCoins(t).then(setCoinBalance));
  }, [useCoins]);

  const chargesAmount = parseFloat(((itemsTotal * taxRate) / 100).toFixed(2));

  let couponDiscount = 0;
  if (appliedCoupon) {
    couponDiscount = appliedCoupon.discountType === "percentage"
      ? parseFloat(((itemsTotal * appliedCoupon.discountAmount) / 100).toFixed(2))
      : appliedCoupon.discountAmount;
  }

  // Convert bean balance to AED: beans ÷ pointsToAed
  // e.g. 146 beans ÷ 10 = AED 14.60
  const beansDiscountAed = useCoins && coinBalance > 0
    ? parseFloat((coinBalance / pointsToAed).toFixed(2))
    : 0;

  const beansDiscount = useCoins
    ? Math.min(beansDiscountAed, itemsTotal + chargesAmount)
    : 0;

  const toPay = Math.max(
    0,
    parseFloat((itemsTotal + chargesAmount - couponDiscount - beansDiscount).toFixed(2))
  );

  const { isLoggedIn } = useAuth();

  // cafe checkout requires the cart to have items, shopId resolved and not loading.
  // Do NOT gate the button's enabled state on authentication — guests should
  // be able to click the Pay button and be redirected to auth when needed.
  const canCheckout = (cart?.items?.length ?? 0) > 0 && !isLoading && shopId !== null;

  const handlePay = async () => {
    if (!canCheckout) return;

    // If guest, redirect to auth flow so they can sign in / sign up before
    // proceeding with payment. This keeps the button active but forces login.
    if (!isLoggedIn) {
      history.push("/auth");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Build items array from cart — one entry per virtual cart row.
      // Virtual rows already have separate customizations + individual quantities
      // so we can send them as-is: each row becomes one order item.
      // Backend accepts multiple items with the same productId but different customizations.
      const items = (cart?.items ?? []).map((item) => {
        const rawCust: unknown[] = item.customizations ?? [];
        const cleanCust = rawCust.filter((c) => {
          if (c == null) return false;
          if (Array.isArray(c)) return (c as unknown[]).length > 0;
          if (typeof c === "object") {
            const co = c as Record<string, unknown>;
            return !!(co.selectedOptionId || co.sectionTitle || co.vId);
          }
          return false;
        });

        console.log(`🧾 PayContainer item pid=${item.productId} qty=${item.quantity} rawCust=${rawCust.length} cleanCust=${cleanCust.length}`, JSON.stringify(cleanCust));

        return {
          product       : item.productId!,
          quantity      : item.quantity ?? 1,
          customizations: cleanCust,
        };
      });

      // If the user selected a stamp reward product, append it as a free item
      // (price 0, no customizations). The reward product's `id` IS the menu product id.
      if (selectedReward) {
        const rewardPid = Number(selectedReward.id);
        console.log(`🎁 PayContainer: adding reward item pid=${rewardPid} "${selectedReward.title}" as free item`);
        items.push({
          product       : rewardPid,
          quantity      : 1,
          customizations: [],
        });
      }

      // Persist a snapshot of the enriched cart items (with customizations)
      // so OrderResultsDetail can show customization labels even if the backend
      // doesn't populate them in the stored order.
      try {
        const snapshot = (cart?.items ?? []).map((item) => ({
          productId     : item.productId,
          quantity      : item.quantity ?? 1,
          customizations: item.customizations ?? [],
          // product enrichment (name/price) from Cart.tsx enrichment
          product       : (item as Record<string, unknown>).product ?? null,
        }));
        sessionStorage.setItem("cafe_cart_snapshot", JSON.stringify(snapshot));
        console.log("🧾 PayContainer: stored cart snapshot in sessionStorage, items:", snapshot.length);
      } catch { /* ignore */ }

      console.log("🧾 PayContainer → navigating to CafePay with:", {
        shopId,
        orderType,
        timeSelection,
        selectedSlot,
        useCoins,
        specialInstructions,
        appliedCouponCode: appliedCoupon?.code ?? null,
        selectedBaristaId,
        toPay,
        itemCount: items.length,
        items,
        // ensure stampRewards contains numeric ids (backend expects numbers)
        stampRewards: selectedReward ? [Number(selectedReward.id)] : [],
      });

      // Navigate to the card entry screen, passing all checkout data.
      // The actual API call (cafe-checkout) happens AFTER the user enters card details.
      history.push("/CafePay", {
        // checkout fields
        shopId             : Number(shopId),   // dynamic — resolved from API, never hardcoded
        orderType,
        timeSelection,
        selectedSlot       : selectedSlot ?? null,
        useWTCoins         : useCoins,
        specialInstructions,
        appliedCouponCode  : appliedCoupon?.code ?? null,
        selectedBarista    : selectedBaristaId ?? null,
        stampRewards       : selectedReward ? [Number(selectedReward.id)] : [],
        items,
        // display
        toPay,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div style={{ background: "#FFF3F3", padding: "8px 24px", textAlign: "center" }}>
          <p style={{ color: "#A83434", fontFamily: "var(--lato)", fontSize: 12, margin: 0 }}>{error}</p>
        </div>
      )}
      <div
        className={styles.main}
        onClick={handlePay}
        style={{ cursor: canCheckout ? "pointer" : "not-allowed", opacity: canCheckout ? 1 : 0.6 }}
      >
        <div className={styles.MainCoantiner}>
          <div className={styles.left}>
            <h4>{isLoading ? "Preparing..." : "Pay now"}</h4>
          </div>
          <div className={styles.right}>
            <h4>AED {toPay.toFixed(2)}</h4>
          </div>
        </div>
      </div>
    </>
  )
}

export default PayContainer

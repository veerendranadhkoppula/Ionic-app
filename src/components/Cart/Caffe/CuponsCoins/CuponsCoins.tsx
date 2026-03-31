import React from "react";
import styles from "./CuponsCoins.module.css";
import { useHistory } from "react-router-dom";
import { validateCoupon, getCoupons, Coupon } from "../../../../api/apiCoupons";
import tokenStorage from "../../../../utils/tokenStorage";
import { getUserWtCoins } from "../../../../api/apiCoins";
import { useCheckout } from "../../../../context/CafeCheckoutContext";
import { useShopId } from "../../../../context/useShopId";

const CuponsCoins: React.FC = () => {
  const history = useHistory();
  const { appliedCoupon, setAppliedCoupon, useCoins, setUseCoins, itemsTotal } = useCheckout();
  const shopId = useShopId(); // always dynamic — never hardcoded

  const [inputCode, setInputCode] = React.useState("");
  const [inputLoading, setInputLoading] = React.useState(false);
  const [inputError, setInputError] = React.useState<string | null>(null);

  // Local coupons list — used to validate expiry on the client before checkout
  const [couponsList, setCouponsList] = React.useState<Coupon[]>([]);

  // Coins balance state
  const [coinBalance, setCoinBalance] = React.useState<number | null>(null);
  const [coinsLoading, setCoinsLoading] = React.useState(true);

  // Fetch coupons list — waits for real shopId, never falls back to a hardcoded value
  React.useEffect(() => {
    if (shopId === null) return; // wait until shop is resolved
    console.log("🏪 CuponsCoins: loading coupons for shopId:", shopId);
    getCoupons(shopId).then(setCouponsList).catch(() => setCouponsList([]));
  }, [shopId]);

  React.useEffect(() => {
    let mounted = true;
    const fetchCoins = async () => {
      try {
        setCoinsLoading(true);
        const token = await tokenStorage.getToken();
        const balance = await getUserWtCoins(token);
        if (mounted) setCoinBalance(balance);
      } catch {
        if (mounted) setCoinBalance(0);
      } finally {
        if (mounted) setCoinsLoading(false);
      }
    };
    fetchCoins();
    return () => { mounted = false; };
  }, []);

  // If coins get set to 0 after load, uncheck automatically
  React.useEffect(() => {
    if (coinBalance === 0) setUseCoins(false);
  }, [coinBalance, setUseCoins]);

  // Sync coupon input when applied from the /coupons list screen
  React.useEffect(() => {
    if (appliedCoupon) {
      setInputCode(appliedCoupon.code);
    } else {
      setInputCode("");
      setInputError(null);
    }
  }, [appliedCoupon, itemsTotal]);

  const isSaved = !!appliedCoupon;
  const hasCoins = coinBalance !== null && coinBalance > 0;

  const couponDisplayAmount = React.useMemo(() => {
    if (!appliedCoupon) return 0;
    try {
      const a = appliedCoupon as { discountType?: string; discountAmount?: number; amount?: number; value?: number };
      if (a.discountType === "percentage") {
        const pct = Number(a.discountAmount ?? 0);
        return parseFloat(((itemsTotal * pct) / 100).toFixed(2));
      }
      return Number(a.discountAmount ?? a.amount ?? a.value ?? 0);
    } catch {
      return 0;
    }
  }, [appliedCoupon]);

  const formatAed = (v: number) => {
    if (Number.isInteger(v)) return `AED${v}`;
    return `AED${v.toFixed(2)}`;
  };

  const handleSave = async () => {
    const code = inputCode.trim().toUpperCase();
    if (!code) return;
    console.log("🎟️ handleSave — code entered:", code);
    console.log("🎟️ couponsList loaded:", couponsList.map(c => `${c.code}(active:${c.isActive})`));

    // 1️⃣ Check local coupons list first — already has expiry-aware isActive
    const localMatch = couponsList.find((c) => c.code.toUpperCase() === code);
    console.log("🎟️ localMatch:", localMatch ?? "NOT FOUND in list");
    if (localMatch) {
      if (!localMatch.isActive) {
        console.warn("🎟️ Blocked — coupon expired/inactive:", code);
        setInputError("This coupon has expired or is no longer active.");
        return;
      }
      console.log("✅ Coupon valid from local list, applying:", code);
      setAppliedCoupon({
        code: localMatch.code,
        discountType: localMatch.discountType,
        discountAmount: localMatch.discountAmount,
        minimumAmount: localMatch.minimumAmount,
        discountText: localMatch.discountText,
        description: localMatch.description,
      });
      return;
    }

    // 2️⃣ Code not in list — validate against backend
    console.log("🎟️ Not in local list — calling validateCoupon API for:", code);
    setInputLoading(true);
    setInputError(null);
    try {
      const token = await tokenStorage.getToken();
      const result = await validateCoupon(code, token, shopId!);
      console.log("🎟️ validateCoupon result:", JSON.stringify(result));
      if (result.valid && result.coupon) {
        const c = result.coupon;
        // Cross-check by id against the loaded list for expiry
        const matchById = couponsList.find((lc) => String(lc.id) === String(c.id));
        console.log("🎟️ matchById in list:", matchById ?? "not found");
        if (matchById && !matchById.isActive) {
          console.warn("🎟️ Blocked by id-match — coupon expired:", code);
          setInputError("This coupon has expired or is no longer active.");
          return;
        }
        console.log("✅ Applying coupon from API:", c.code);
        setAppliedCoupon({
          code: c.code,
          discountType: c.discountType,
          discountAmount: c.discountAmount,
          minimumAmount: c.minimumAmount,
          discountText:
            c.discountType === "percentage"
              ? `${c.discountAmount}% OFF`
              : `AED ${c.discountAmount} OFF`,
          description:
            c.discountType === "percentage"
              ? `Flat ${c.discountAmount}% off on orders above AED ${c.minimumAmount}`
              : `Flat AED ${c.discountAmount} off on orders above AED ${c.minimumAmount}`,
        });
      } else {
        console.warn("🎟️ validateCoupon returned invalid:", result);
        setInputError(result.message ?? "Invalid or expired coupon.");
      }
    } catch (err) {
      console.error("🎟️ validateCoupon threw:", err);
      setInputError("Could not validate coupon. Please try again.");
    } finally {
      setInputLoading(false);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setInputCode("");
    setInputError(null);
  };

  const renderAction = () => {
    if (!isSaved) {
      if (inputCode.trim()) {
        return (
          <p className={styles.actionSave} onClick={inputLoading ? undefined : handleSave}>
            {inputLoading ? "..." : "APPLY"}
          </p>
        );
      }
      return (
        <p className={styles.CuponsContainerRight} onClick={() => history.push("/coupons")}>
          View all coupons
        </p>
      );
    }
    return (
      <p className={styles.actionRemove} onClick={handleRemove}>
        REMOVE
      </p>
    );
  };

  const coinsLabel = coinsLoading
    ? "Loading..."
    : coinBalance === 0
    ? "No active beans"
    : `Total Active Beans : ${coinBalance} Beans`;

  return (
    <>
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.Heading}>
            <h4>Offers and Benefits</h4>
          </div>
          <div className={styles.CuponsCoinsContainer}>
            <div className={styles.CuponsContainer}>
              <div className={styles.CuponsContainerLeft}>
                {isSaved ? (
                  <div className={styles.appliedCoupon}>
                    <span className={styles.appliedCode}>
                      {couponDisplayAmount > 0 ? (
                        <>
                          {formatAed(couponDisplayAmount)} saved with {appliedCoupon!.code}
                        </>
                      ) : (
                        <>{appliedCoupon!.code}</>
                      )}
                    </span>
                  </div>
                ) : (
                  <input
                    className={styles.couponInput}
                    placeholder="Enter Coupon Code"
                    value={inputCode}
                    disabled={isSaved}
                    onChange={(e) => {
                      setInputCode(e.target.value);
                      setInputError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSaved) handleSave();
                    }}
                  />
                )}
                {inputError && (
                  <p className={styles.inputError}>{inputError}</p>
                )}
              </div>
              <div className={styles.CuponsContainerRight}>
                {renderAction()}
              </div>
            </div>
            <div className={styles.CoinsContainer} style={{ opacity: hasCoins ? 1 : 0.45 }}>
              <div className={styles.CoinsContainerLeft}>
                <h4>Mantis Beans</h4>
                <p>{coinsLabel}</p>
              </div>
              <div className={styles.CoinsContainerRight}>
                <label className={styles.customCheckbox}>
                  <input
                    type="checkbox"
                    disabled={!hasCoins || coinsLoading}
                    checked={useCoins}
                    onChange={(e) => hasCoins && setUseCoins(e.target.checked)}
                  />
                  <span className={styles.checkmark}></span>
                </label>
              </div>
            </div>
            <h6>Orders paid using coins are not eligible for stamp collection.</h6>
          </div>
        </div>
      </div>
    </>
  );
};

export default CuponsCoins;

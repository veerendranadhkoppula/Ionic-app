/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styles from "./CuponsCoins.module.css";
import { useHistory } from "react-router-dom";
import { validateCoupon, getCoupons, Coupon } from "../../../api/apiCoupons";
import tokenStorage from "../../../utils/tokenStorage";
import { useShopId } from "../../../context/useShopId";

interface Props {
  appliedCoupon: any | null;
  setAppliedCoupon: (coupon: any | null) => void;
  useCoins: boolean;
  setUseCoins: (v: boolean) => void;
  coinBalance: number;
  coinsLoading: boolean;
  itemsTotal: number;
}

const CuponsCoins: React.FC<Props> = ({
  appliedCoupon,
  setAppliedCoupon,
  useCoins,
  setUseCoins,
  coinBalance,
  coinsLoading,
  itemsTotal,
}) => {
  const history = useHistory();
  const shopId = useShopId();

  const [inputCode, setInputCode] = React.useState("");
  const [inputLoading, setInputLoading] = React.useState(false);
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [couponsList, setCouponsList] = React.useState<Coupon[]>([]);

  React.useEffect(() => {
    if (shopId === null) return;
    getCoupons(shopId)
      .then(setCouponsList)
      .catch(() => setCouponsList([]));
  }, [shopId]);

  React.useEffect(() => {
    if (appliedCoupon) {
      setInputCode(appliedCoupon.code);
    } else {
      setInputCode("");
      setInputError(null);
    }
  }, [appliedCoupon]);

  const isSaved = !!appliedCoupon;
  const hasCoins = !coinsLoading && coinBalance > 0;

  const couponDisplayAmount = React.useMemo(() => {
    if (!appliedCoupon) return 0;
    try {
      const a = appliedCoupon as {
        discountType?: string;
        discountAmount?: number;
        amount?: number;
        value?: number;
      };
      if (a.discountType === "percentage") {
        const pct = Number(a.discountAmount ?? 0);
        return parseFloat(((itemsTotal * pct) / 100).toFixed(2));
      }
      return Number(a.discountAmount ?? a.amount ?? a.value ?? 0);
    } catch {
      return 0;
    }
  }, [appliedCoupon, itemsTotal]);

  const formatAed = (v: number) => {
    if (Number.isInteger(v)) return `AED${v}`;
    return `AED${v.toFixed(2)}`;
  };

  const handleSave = async () => {
    const code = inputCode.trim().toUpperCase();
    if (!code) return;

    const localMatch = couponsList.find((c) => c.code.toUpperCase() === code);
    if (localMatch) {
      if (!localMatch.isActive) {
        setInputError("This coupon has expired or is no longer active.");
        return;
      }
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

    setInputLoading(true);
    setInputError(null);
    try {
      const token = await tokenStorage.getToken();
      const result = await validateCoupon(code, token, shopId!);
      if (result.valid && result.coupon) {
        const c = result.coupon;
        const matchById = couponsList.find(
          (lc) => String(lc.id) === String(c.id),
        );
        if (matchById && !matchById.isActive) {
          setInputError("This coupon has expired or is no longer active.");
          return;
        }
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
        setInputError(result.message ?? "Invalid or expired coupon.");
      }
    } catch {
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
          <p
            className={styles.actionSave}
            onClick={inputLoading ? undefined : handleSave}
          >
            {inputLoading ? "..." : "SAVE"}
          </p>
        );
      }
      return (
        <p
          className={styles.CuponsContainerRight}
          onClick={() => history.push("/coupons", { source: "store" })}
        >
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
                      {couponDisplayAmount > 0
                        ? `${formatAed(couponDisplayAmount)} saved with  ${
                            appliedCoupon.code
                          }`
                        : appliedCoupon.code}
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

            <div
              className={styles.CoinsContainer}
              style={{ opacity: hasCoins ? 1 : 0.45 }}
            >
              <div className={styles.CoinsContainerLeft}>
                <h4>Mantis beans</h4>
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
          </div>
        </div>
      </div>
    </>
  );
};

export default CuponsCoins;

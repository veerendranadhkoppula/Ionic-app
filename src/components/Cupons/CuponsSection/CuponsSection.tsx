import React from "react";
import styles from "./CuponsSection.module.css";
import { IonInput } from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";
import { getCoupons, validateCoupon, Coupon } from "../../../api/apiCoupons";
import tokenStorage from "../../../utils/tokenStorage";
import { useCheckout } from "../../../context/CafeCheckoutContext";
import { useShopId } from "../../../context/useShopId";

const CuponsSection: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ source?: string }>();
  const isStoreSource = location.state?.source === "store";
  const { setAppliedCoupon } = useCheckout();
  const shopId = useShopId(); 

  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // selection via clicking the whole card is intentionally disabled; we don't track selectedCoupon
  const [copiedCouponId, setCopiedCouponId] = React.useState<string | null>(null);
  const [inputCode, setInputCode] = React.useState("");
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [inputLoading, setInputLoading] = React.useState(false);
  const [inputFocused, setInputFocused] = React.useState(false);

  React.useEffect(() => {
    if (shopId === null) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCoupons(shopId);
        if (!cancelled) setCoupons(data);
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load coupons");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [shopId]);

  const applyAndGoBack = (coupon: Coupon) => {
    if (isStoreSource) {
      // Store checkout: persist to sessionStorage so StoreCheckout can pick it up on return
      try { sessionStorage.setItem("store_pending_coupon", JSON.stringify(coupon)); } catch { /* ignore */ }
    } else {
      // Cafe flow: set via context as before
      setAppliedCoupon({ ...coupon, _fromList: true });
    }
    history.goBack();
  };

  const handleApplyInput = async () => {
    const code = inputCode.trim().toUpperCase();
    if (!code) return;

    // Check local list first (already has expiry-aware isActive)
    const local = coupons.find((c) => c.code.toUpperCase() === code);
    if (local) {
      if (!local.isActive) {
        setInputError("This coupon has expired or is no longer active.");
        return;
      }
      applyAndGoBack(local);
      return;
    }

    setInputLoading(true);
    setInputError(null);
    try {
      const token = await tokenStorage.getToken();
      const result = await validateCoupon(code, token, shopId!);
      if (result.valid && result.coupon) {
        const c = result.coupon;

        // The validate endpoint doesn't return expiryDate, but we can
        // cross-check against the loaded coupons list by id
        const matchById = coupons.find((lc) => String(lc.id) === String(c.id));
        if (matchById && !matchById.isActive) {
          setInputError("This coupon has expired or is no longer active.");
          return;
        }

        const validated: Coupon = {
          id: String(c.id),
          discountText:
            c.discountType === "percentage"
              ? `${c.discountAmount}% OFF`
              : `AED ${c.discountAmount} OFF`,
          description:
            c.discountType === "percentage"
              ? `Flat ${c.discountAmount}% off on orders above AED ${c.minimumAmount}`
              : `Flat AED ${c.discountAmount} off on orders above AED ${c.minimumAmount}`,
          code: c.code,
          expiry: "Valid coupon",
          isActive: true,
          discountType: c.discountType,
          discountAmount: c.discountAmount,
          minimumAmount: c.minimumAmount,
          applicability: c.applicability,
        };
        applyAndGoBack(validated);
      } else {
        setInputError(result.message ?? "Invalid or expired coupon.");
      }
    } catch {
      setInputError("Could not validate coupon. Please try again.");
    } finally {
      setInputLoading(false);
    }
  };

  // suppress unused warning - selectedCoupon is used for visual selection highlight
  void 0;

  const isActive = inputFocused || inputCode.trim().length > 0;

  return (
    <div className={styles.main}>
      <div className={styles.MainConatiner}>
        <div className={styles.Top}>
          <div className={`${styles.CouponInputWrapper} ${
            isActive ? styles.CouponWrapperActive : ""
          }`}>
            <IonInput
              className={styles.CouponInput}
              placeholder="Enter Coupon Code"
              type="text"
              value={inputCode}
              onIonInput={(e) => {
                setInputCode(e.detail.value ?? "");
                setInputError(null);
              }}
              onIonFocus={() => setInputFocused(true)}
              onIonBlur={() => setInputFocused(false)}
            />
            <button
              className={`${styles.ApplyText} ${isActive ? styles.ApplyTextActive : ""}`}
              disabled={!inputCode.trim() || inputLoading}
              onClick={handleApplyInput}
            >
              {inputLoading ? "..." : "APPLY"}
            </button>
          </div>
          {inputError && (
            <p style={{ color: "#A83434", fontSize: 12, margin: "4px 0 0 4px" }}>
              {inputError}
            </p>
          )}
        </div>

        <div className={styles.Bottom}>
          {loading && (
            <div className={styles.Bottom}>
              {[1, 2, 3].map((n) => (
                <React.Fragment key={n}>
                  <div className={styles.skeletonCard}>
                    <div className={styles.skeletonDiscount} />
                    <div className={styles.skeletonDetails}>
                      <div className={`${styles.skeletonBase} ${styles.skeletonDesc}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonCode}`} />
                      <div className={styles.skeletonBottom}>
                        <div className={`${styles.skeletonBase} ${styles.skeletonExpiry}`} />
                        <div className={`${styles.skeletonBase} ${styles.skeletonBtn}`} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.line} />
                </React.Fragment>
              ))}
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#A83434" }}>
              {error}
            </div>
          )}

          {!loading && !error && coupons.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#8C8C8C" }}>
              No coupons available right now.
            </div>
          )}

          {!loading &&
            !error &&
            coupons.map((coupon) => (
              <React.Fragment key={coupon.id}>
                <div
                  className={`${styles.CouponCard} ${
                    !coupon.isActive ? styles.InactiveCoupon : ""
                  }`}
                // clicking the card should not change visual state or selection
                >
                  <div
                    className={`${styles.discount} ${
                      !coupon.isActive ? styles.InactiveDiscount : ""
                    }`}
                  >
                    <h4>{coupon.discountText}</h4>
                  </div>

                  <div className={styles.details}>
                    <div className={styles.detailsTop}>
                      <div className={styles.cupontext}>
                        <p>{coupon.description}</p>
                      </div>

                      <div
                        className={`${styles.cuponcode} ${
                          !coupon.isActive ? styles.InactiveCode : ""
                        }`}
                      >
                        {copiedCouponId === coupon.id ? (
                          <span className={styles.copiedText}>Copied</span>
                        ) : (
                          <>
                            <p>{coupon.code}</p>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 18 18"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  navigator.clipboard?.writeText(coupon.code ?? "");
                                  setCopiedCouponId(String(coupon.id));
                                  setTimeout(() => setCopiedCouponId(null), 1000);
                                } catch {
                                  // ignore clipboard errors silently
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <path
                                d="M10.5 4.875H6C5.37868 4.875 4.875 5.37868 4.875 6V13.5C4.875 14.1213 5.37868 14.625 6 14.625H10.5C11.1213 14.625 11.625 14.1213 11.625 13.5V6C11.625 5.37868 11.1213 4.875 10.5 4.875Z"
                                stroke={coupon.isActive ? "#6C7A5F" : "#8C8C8C"}
                                strokeWidth="0.8"
                              />
                              <path
                                d="M6.375 4.5C6.375 4.20163 6.49353 3.91548 6.7045 3.7045C6.91548 3.49353 7.20163 3.375 7.5 3.375H12C12.2984 3.375 12.5845 3.49353 12.7955 3.7045C13.0065 3.91548 13.125 4.20163 13.125 4.5V12"
                                stroke={coupon.isActive ? "#6C7A5F" : "#8C8C8C"}
                                strokeWidth="0.8"
                              />
                            </svg>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={styles.detailsBottom}>
                      <div className={styles.validity}>
                        <p>{coupon.expiry}</p>
                      </div>

                      <button
                        className={`${styles.applybtn} ${
                          !coupon.isActive ? styles.InactiveApplyBtn : ""
                        }`}
                        disabled={!coupon.isActive}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (coupon.isActive) applyAndGoBack(coupon);
                        }}
                      >
                        APPLY
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.line}></div>
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CuponsSection;
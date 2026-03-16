/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import styles from "./CuponsCoins.module.css";
import tooltipicon from "./1.png";
import tokenStorage from "../../../utils/tokenStorage";
import { getUserWtCoins } from "../../../api/apiCoins";

interface Props {
  appliedCoupon: any | null;
  setAppliedCoupon: (coupon: any | null) => void;
  onCoinsChange?: (useCoins: boolean, coinBalance: number) => void;
}

const CuponsCoins: React.FC<Props> = ({ onCoinsChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinsLoading, setCoinsLoading] = useState(true);
  const [useCoins, setUseCoins] = useState(false);

  useEffect(() => {
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

  useEffect(() => {
    if (coinBalance === 0) setUseCoins(false);
  }, [coinBalance]);

  // Notify parent of coins toggle state
  useEffect(() => {
    if (onCoinsChange) {
      onCoinsChange(useCoins, coinBalance ?? 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCoins, coinBalance]);

  const hasCoins = coinBalance !== null && coinBalance > 0;

  const coinsLabel = coinsLoading
    ? "Loading..."
    : coinBalance === 0
    ? "No active coins"
    : `Total Active Coins : ${coinBalance} Coins`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  return (
    <>
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.Heading}>
            <h4>Offers and Benefits</h4>
          </div>
          <div className={styles.CuponsCoinsContainer}>
            <div className={styles.CoinsContainer} style={{ opacity: hasCoins ? 1 : 0.45 }}>
              <div className={styles.CoinsContainerLeft}>
                <div className={styles.tooltipWrapper} ref={tooltipRef}>
                  <h4>Mantis Coins</h4>
                  <div className={styles.tooltipContainer}>
                    <img
                      src={tooltipicon}
                      alt="Tooltip Icon"
                      className={styles.tooltipIcon}
                      onClick={() => setShowTooltip(true)}
                    />
                    {showTooltip && (
                      <div className={styles.tooltipBox}>
                        <div className={styles.tooltipContent}>
                          <p>You can use WM beans for up to 20% of your order value.</p>
                          <svg
                            className={styles.closeIcon}
                            onClick={() => setShowTooltip(false)}
                            width="8"
                            height="8"
                            viewBox="0 0 8 8"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M7.52364 0.0817381C7.63262 -0.0272459 7.80928 -0.027246 7.91826 0.0817381C8.02725 0.190722 8.02725 0.367378 7.91826 0.476362L4.39462 4L7.91826 7.52364C8.02725 7.63262 8.02725 7.80928 7.91826 7.91826C7.80928 8.02725 7.63262 8.02725 7.52364 7.91826L4 4.39462L0.476362 7.91826C0.367378 8.02725 0.190722 8.02725 0.0817381 7.91826C-0.027246 7.80928 -0.0272459 7.63262 0.0817381 7.52364L3.60538 4L0.0817381 0.476362C-0.027246 0.367378 -0.027246 0.190722 0.0817381 0.0817381C0.190722 -0.027246 0.367378 -0.027246 0.476362 0.0817381L4 3.60538L7.52364 0.0817381Z"
                              fill="white"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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


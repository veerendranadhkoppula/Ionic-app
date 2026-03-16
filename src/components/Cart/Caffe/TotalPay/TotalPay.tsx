import React, { useState, useRef, useEffect } from "react";
import styles from "./TotalPay.module.css";
import { useCheckout } from "../../../../context/CafeCheckoutContext";
import { getShipAndTax } from "../../../../api/apiCafe";
import { getUserWtCoins, getWtCoinsConfig } from "../../../../api/apiCoins";
import tokenStorage from "../../../../utils/tokenStorage";

const TotalPay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { appliedCoupon, useCoins, itemsTotal } = useCheckout();

  const [taxRate, setTaxRate] = useState<number>(0);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [pointsToAed, setPointsToAed] = useState<number>(10);

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

  const totalDiscount = parseFloat((couponDiscount + beansDiscount).toFixed(2));

  const toPay = Math.max(
    0,
    parseFloat((itemsTotal + chargesAmount - couponDiscount - beansDiscount).toFixed(2))
  );

  const toggleAccordion = () => setIsOpen((prev) => !prev);

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <div className={styles.TopLeft}>
              <p>To Pay </p>
              {totalDiscount > 0 && (
                <h5>AED {totalDiscount.toFixed(2)} saved on the total!</h5>
              )}
            </div>
            <div className={styles.TopRight} onClick={toggleAccordion}>
              <p>AED {toPay.toFixed(2)}</p>
              <svg
                className={`${styles.arrow} ${isOpen ? styles.rotate : ""}`}
                width="23"
                height="23"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 8.5L11.5 14L17 8.5"
                  stroke="#4B3827"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div
            ref={contentRef}
            className={styles.BottomWrapper}
            style={{ height: isOpen ? `${contentRef.current?.scrollHeight}px` : "0px" }}
          >
            <div className={styles.Bottom}>
              <div className={styles.paydetails}>
                <div className={styles.ItemsTotal}>
                  <h5>Item Total</h5>
                  <h4>AED {itemsTotal.toFixed(2)}</h4>
                </div>
                <div className={styles.charges}>
                  <h5>Charges</h5>
                  <h4>AED {chargesAmount.toFixed(2)}</h4>
                </div>

                {useCoins && beansDiscount > 0 && (
                  <div className={styles.Beansused}>
                    <h5>Beans Used</h5>
                    <h4>-{beansDiscount.toFixed(2)}</h4>
                  </div>
                )}

                {appliedCoupon && (
                  <div className={styles.Coupsapplies}>
                    <div className={styles.CoupsappliesTop}>
                      <h5>Coupon Applied</h5>
                      <h4>&quot;{appliedCoupon.code}&quot;</h4>
                    </div>
                    <h4>- AED {couponDiscount.toFixed(2)}</h4>
                  </div>
                )}

                {totalDiscount > 0 && (
                  <div className={styles.discount}>
                    <h5>Discount</h5>
                    <h4>AED {totalDiscount.toFixed(2)}</h4>
                  </div>
                )}
              </div>
              <div className={styles.line}></div>
              <div className={styles.totalpayPrice}>
                <h4>To Pay </h4>
                <h5>AED {toPay.toFixed(2)}</h5>
              </div>
            </div>
            <div className={styles.anotherline}></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TotalPay;

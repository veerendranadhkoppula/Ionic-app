/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef } from "react";
import styles from "./TotalPay.module.css";

interface Props {
  itemsTotal: number;
  taxRate: number;
  emirateCharges: Record<string, number>;
  deliveryMode: "ship" | "pickup" | null;
  shippingEmirate: string;
  appliedCoupon: any | null;
  useCoins: boolean;
  coinBalance: number;
  pointsToAed?: number;
}

const TotalPay = ({
  itemsTotal,
  taxRate,
  emirateCharges,
  deliveryMode,
  shippingEmirate,
  appliedCoupon,
  useCoins,
  coinBalance,
  pointsToAed = 10,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleAccordion = () => setIsOpen((prev) => !prev);

  const shippingCharge =
    deliveryMode === "ship" && shippingEmirate
      ? (emirateCharges[shippingEmirate] ?? 0)
      : 0;

  let couponDiscount = 0;
  if (appliedCoupon) {
    couponDiscount =
      appliedCoupon.discountType === "percentage"
        ? parseFloat(((itemsTotal * appliedCoupon.discountAmount) / 100).toFixed(2))
        : appliedCoupon.discountAmount;
  }


  const beansDiscountAed = useCoins && coinBalance > 0
    ? parseFloat((coinBalance / pointsToAed).toFixed(2))
    : 0;
  const beansDiscount       = useCoins ? Math.min(beansDiscountAed, itemsTotal - couponDiscount) : 0;
  const totalAfterDiscounts = Math.max(0, itemsTotal - couponDiscount - beansDiscount);
  const totalWithShipping   = totalAfterDiscounts + shippingCharge;
  const taxAmount           = parseFloat(((totalWithShipping * taxRate) / 100).toFixed(2));
  const toPay               = parseFloat((totalWithShipping + taxAmount).toFixed(2));

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.Top}>
          <div className={styles.TopLeft}>
            <p>To Pay</p>
          </div>
          <div className={styles.TopRight} onClick={toggleAccordion}>
            <p>AED {toPay.toFixed(2)}</p>
            <svg
              className={`${styles.arrow} ${isOpen ? styles.rotate : ""}`}
              width="23" height="23" viewBox="0 0 23 23" fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M6 8.5L11.5 14L17 8.5" stroke="#4B3827" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div ref={contentRef} className={styles.BottomWrapper}
          style={{ height: isOpen ? `${contentRef.current?.scrollHeight}px` : "0px" }}
        >
          <div className={styles.Bottom}>
            <div className={styles.paydetails}>
              <div className={styles.ItemsTotal}>
                <h5>Item Total</h5>
                <h4>AED {itemsTotal.toFixed(2)}</h4>
              </div>
              {taxRate > 0 && (
                <div className={styles.charges}>
                  <h5>Tax ({taxRate}%)</h5>
                  <h4>AED {taxAmount.toFixed(2)}</h4>
                </div>
              )}
              {deliveryMode === "ship" && shippingCharge > 0 && (
                <div className={styles.charges}>
                  <h5>Shipping</h5>
                  <h4>AED {shippingCharge.toFixed(2)}</h4>
                </div>
              )}
              {appliedCoupon && couponDiscount > 0 && (
                <div className={styles.CuponsApplied}>
                  <div className={styles.CouponAppliedHead}>
                    <h5>Coupon Applied</h5>
                    <h5>&quot;{appliedCoupon.code}&quot;</h5>
                  </div>
                  <h4>- AED {couponDiscount.toFixed(2)}</h4>
                </div>
              )}
              {useCoins && beansDiscount > 0 && (
                <div className={styles.discount}>
                  <h5>Beans Used</h5>
                  <h4>- {beansDiscount.toFixed(2)}</h4>
                </div>
              )}
            </div>
            <div className={styles.line}></div>
            <div className={styles.totalpayPrice}>
              <h4>To Pay</h4>
              <h5>AED {toPay.toFixed(2)}</h5>
            </div>
          </div>
          <div className={styles.anotherline}></div>
        </div>
      </div>
    </div>
  );
};

export default TotalPay;

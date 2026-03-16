import React, { useState } from "react";

import styles from "./TotalPay.module.css";

interface Props {
  itemTotal: number;
  deliveryCharge?: number;
  taxAmount?: number;
  coinsDiscount?: number;
  total: number;
  beansEarned?: number;
}

const TotalPay: React.FC<Props> = ({
  itemTotal,
  deliveryCharge = 0,
  taxAmount = 0,
  coinsDiscount = 0,
  total,
  beansEarned,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleAccordion = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <div className={styles.TopLeft}>
              <p>To Pay </p>
              {beansEarned != null && beansEarned > 0 && (
                <h5>You are earning {beansEarned} WM beans!</h5>
              )}
            </div>
            <div className={styles.TopRight} onClick={toggleAccordion}>
              <p>AED {total.toFixed(2)}</p>
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
            className={styles.BottomWrapper}
            style={{
              height: isOpen ? "auto" : "0px",
            }}
          >
            <div className={styles.Bottom}>
              <div className={styles.paydetails}>
                <div className={styles.ItemsTotal}>
                  <h5>Item Total</h5>
                  <h4>AED {itemTotal.toFixed(2)}</h4>
                </div>
                {deliveryCharge > 0 && (
                  <div className={styles.charges}>
                    <h5>Delivery Charges</h5>
                    <h4>AED {deliveryCharge.toFixed(2)}</h4>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className={styles.charges}>
                    <h5>Charges</h5>
                    <h4>AED {taxAmount.toFixed(2)}</h4>
                  </div>
                )}
                {coinsDiscount > 0 && (
                  <div className={styles.discount}>
                    <h5>Bean used</h5>
                    <h4>- AED {coinsDiscount.toFixed(2)}</h4>
                  </div>
                )}
              </div>
              <div className={styles.line}></div>
              <div className={styles.totalpayPrice}>
                <h4>To Pay </h4>
                <h5>AED {total.toFixed(2)}</h5>
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
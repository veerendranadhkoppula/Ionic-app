import React, { useState, useRef, useEffect } from "react";
import styles from "./SubTotal.module.css";
import { getShipAndTax } from "../../../../api/apiCafe";

interface Props {
  subtotal: number;
}

const SubTotal = ({ subtotal }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [taxRate, setTaxRate] = useState<number>(0);

  useEffect(() => {
    getShipAndTax().then((d) => setTaxRate(d.tax));
  }, []);

  const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const totalWithTax = parseFloat((subtotal + taxAmount).toFixed(2));

  const toggleAccordion = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <div className={styles.TopLeft}>
              <p>Subtotal </p>
            </div>
            <div className={styles.TopRight} onClick={toggleAccordion}>
              <p>AED {totalWithTax.toFixed(2)}</p>
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
            style={{
              height: isOpen ? `${contentRef.current?.scrollHeight}px` : "0px",
            }}
          >
            <div className={styles.topline}></div>
            <div className={styles.shippingText}>
              Shipping charges will be calculated at checkout
            </div>
            <div className={styles.Bottom}>
              <div className={styles.paydetails}>
                <div className={styles.ItemsTotal}>
                  <h5>Item Total</h5>
                  <h4>AED {subtotal.toFixed(2)}</h4>
                </div>
                {taxRate > 0 && (
                  <div className={styles.charges}>
                    <h5>Taxes</h5>
                    <h4>AED {taxAmount.toFixed(2)}</h4>
                  </div>
                )}
              </div>
              <div className={styles.line}></div>
              <div className={styles.totalpayPrice}>
                <h4>Subtotal</h4>
                <h5>AED {totalWithTax.toFixed(2)}</h5>
              </div>
            </div>
            <div className={styles.anotherline}></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubTotal;


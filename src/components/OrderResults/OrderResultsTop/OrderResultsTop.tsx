import React, { useState } from "react";
import styles from "./OrderResultsTop.module.css";
import tickicon from "./tick.png";
import wrongicon from "./x.png";
import { useHistory } from "react-router-dom";

type Props = {
  orderStatus: "confirmed" | "cancelled";
  orderId    ?: string | number;
};

const OrderResultsTop: React.FC<Props> = ({ orderStatus, orderId }) => {
  const history = useHistory();
  const [copied, setCopied] = useState(false);

  // Always go Home — going back would return to the Stripe card screen
  const handleClose = () => {
    history.replace("/Home");
  };

  const handleCopy = () => {
    const text = orderId ? `#WMANTIS${orderId}` : "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isCancelled = orderStatus === "cancelled";

  const titleText = isCancelled ? "Order Cancelled" : "Order Confirmed!";
  const subText   = isCancelled ? "Your order has been cancelled" : "Thankyou for placing the order";
  const icon      = isCancelled ? wrongicon : tickicon;
  const displayId = orderId ? `#WMANTIS${orderId}` : null;

  return (
    <>
      <div className={`${styles.main} ${isCancelled ? styles.cancelBackground : ""}`}>
        <div className={styles.MainConatiner}>

          {/* ── Close → Home ── */}
          <div className={styles.Top} onClick={handleClose}>
            <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
                fill="white"
              />
            </svg>
          </div>

          {/* ── Status icon + text + order ID copy row ── */}
          <div className={styles.Bottom}>
            <div className={styles.StatusBadge}>
              <img src={icon} alt="status" className={styles.TickIcon} />
            </div>

            <div className={styles.OrderStatusText}>
              <h3>{titleText}</h3>
              <p>{subText}</p>
            </div>

            {/* Order ID with copy button — only shown when orderId is available */}
            {displayId && (
              <div className={styles.OrderIdRow} onClick={handleCopy}>
                <span className={styles.OrderIdText}>
                  {copied ? "Copied!" : `Order ID: ${displayId}`}
                </span>
                {!copied && (
                  <svg width="11" height="15" viewBox="0 0 11 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.21839 2.21484H1.7636C1.01045 2.21484 0.399902 2.82538 0.399902 3.57852V12.6697C0.399902 13.4229 1.01045 14.0334 1.7636 14.0334H7.21839C7.97154 14.0334 8.58208 13.4229 8.58208 12.6697V3.57852C8.58208 2.82538 7.97154 2.21484 7.21839 2.21484Z" stroke="white" strokeWidth="0.8" strokeLinecap="round"/>
                    <path d="M2.21777 1.76212C2.21777 1.40045 2.36145 1.05359 2.61719 0.79785C2.87293 0.54211 3.2198 0.398438 3.58147 0.398438H9.03626C9.39793 0.398438 9.74479 0.54211 10.0005 0.79785C10.2563 1.05359 10.4 1.40045 10.4 1.76212V10.8533C10.4 11.215 10.2563 11.5619 10.0005 11.8176C9.74479 12.0733 9.39793 12.217 9.03626 12.217" stroke="white" strokeWidth="0.8"/>
                  </svg>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default OrderResultsTop;

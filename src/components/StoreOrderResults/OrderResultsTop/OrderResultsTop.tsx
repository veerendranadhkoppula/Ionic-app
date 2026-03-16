import React, { useState } from "react";
import styles from "./OrderResultsTop.module.css";
import tickicon from "./tick.png";
import wrongicon from "./x.png";
import { useHistory } from "react-router-dom";

type Props = {
  orderStatus: "confirmed" | "cancelled";
  isSubscription: boolean;
  orderId: string;
  subscriptionId?: string;
};

const OrderResultsTop: React.FC<Props> = ({
  orderStatus,
  isSubscription,
  orderId,
  subscriptionId,
}) => {
  const history = useHistory();
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    // Replace the entire history stack so Back can't navigate to StorePay / StoreCheckout
    history.replace("/Home");
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isCancelled = orderStatus === "cancelled";

  const titleText = isCancelled ? "Order Cancelled" : "Order Confirmed!";
  const subText = isCancelled
    ? "Your order has been cancelled"
    : "Thankyou for placing the order";

  const icon = isCancelled ? wrongicon : tickicon;

  return (
    <div
      className={`${styles.main} ${
        isCancelled ? styles.cancelBackground : ""
      }`}
    >
      <div className={styles.MainConatiner}>
        <div className={styles.Top} onClick={handleClose}>
          <svg
            width="35"
            height="35"
            viewBox="0 0 35 35"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
              fill="white"
            />
          </svg>
        </div>

        <div className={styles.Bottom}>
          <div className={styles.BottomTop}>
            <div className={styles.StatusBadge}>
              <img src={icon} alt="status" className={styles.TickIcon} />
            </div>

            <div className={styles.OrderStatusText}>
              <h3>{titleText}</h3>
              <p>{subText}</p>
            </div>
          </div>

          <div className={styles.OrderIdorSubscrpitionId}>
            {isSubscription ? (
              (() => {
                const hasSubId = Boolean(subscriptionId && String(subscriptionId).trim());
                const subText = hasSubId ? `Subscription ID: #WMS-${subscriptionId}` : "Subscription ID: —";
                return (
                  <>
                    <p>{copied ? "Copied!" : subText}</p>
                    {!copied && hasSubId && (
                      <div
                        className={styles.Copy}
                        onClick={() => handleCopy(`WMS-${subscriptionId}`)}
                      >
                        <svg width="11" height="15" viewBox="0 0 11 15" fill="none">
                          <path
                            d="M7.21839 2.21875H1.7636C1.01045 2.21875 0.399902 2.82929 0.399902 3.58243V12.6736C0.399902 13.4268 1.01045 14.0373 1.7636 14.0373H7.21839C7.97154 14.0373 8.58208 13.4268 8.58208 12.6736V3.58243C8.58208 2.82929 7.97154 2.21875 7.21839 2.21875Z"
                            stroke="white"
                            strokeWidth="0.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M2.21777 1.76407C2.21777 1.4024 2.36145 1.05554 2.61719 0.799803C2.87293 0.544064 3.2198 0.400391 3.58147 0.400391H9.03626C9.39793 0.400391 9.74479 0.544064 10.0005 0.799803C10.2563 1.05554 10.4 1.4024 10.4 1.76407V10.8553C10.4 11.2169 10.2563 11.5638 10.0005 11.8195C9.74479 12.0753 9.39793 12.219 9.03626 12.219"
                            stroke="white"
                            strokeWidth="0.8"
                          />
                        </svg>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <>
                <p>{copied ? "Copied!" : `Order ID: #${orderId}`}</p>
                {!copied && (
                  <div
                    className={styles.Copy}
                    onClick={() => handleCopy(orderId)}
                  >
                    <svg width="11" height="15" viewBox="0 0 11 15" fill="none">
                      <path
                        d="M7.21839 2.21875H1.7636C1.01045 2.21875 0.399902 2.82929 0.399902 3.58243V12.6736C0.399902 13.4268 1.01045 14.0373 1.7636 14.0373H7.21839C7.97154 14.0373 8.58208 13.4268 8.58208 12.6736V3.58243C8.58208 2.82929 7.97154 2.21875 7.21839 2.21875Z"
                        stroke="white"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M2.21777 1.76407C2.21777 1.4024 2.36145 1.05554 2.61719 0.799803C2.87293 0.544064 3.2198 0.400391 3.58147 0.400391H9.03626C9.39793 0.400391 9.74479 0.544064 10.0005 0.799803C10.2563 1.05554 10.4 1.4024 10.4 1.76407V10.8553C10.4 11.2169 10.2563 11.5638 10.0005 11.8195C9.74479 12.0753 9.39793 12.219 9.03626 12.219"
                        stroke="white"
                        strokeWidth="0.8"
                      />
                    </svg>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderResultsTop;
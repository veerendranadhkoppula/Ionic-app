import React from "react";
import styles from "./SubScriptionOrderSummary.module.css";

interface Props {
  email: string;
  productName: string;
  variantName?: string;
  freqLabel: string;
  quantity: number;
  unitPrice: number;
}

const SubScriptionOrderSummary: React.FC<Props> = ({
  email,
  productName,
  variantName,
  freqLabel,
  quantity,
  unitPrice,
}) => {
  const displayName = variantName ? `${productName}, ${variantName}` : productName;
  const quantityLabel = quantity > 1 ? `${freqLabel} · ${quantity} bags` : freqLabel;

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.EmailContainer}>
            <div className={styles.EmailTitle}>
              <h3>Email</h3>
            </div>
            <div className={styles.useremail}>
              <p>{email}</p>
            </div>
          </div>

          <div className={styles.OrderSummaryContainer}>
            <div className={styles.Heading}>
              <h3>Order Summary</h3>
            </div>

            <div className={styles.OrderDetails}>
              <div className={styles.Item}>
                <div className={styles.ItemName}>
                  <p>{displayName}</p>
                  <h4>{quantityLabel}</h4>
                </div>
                <div className={styles.ItemPrice}>
                  <p>AED {unitPrice.toFixed(2)}</p>
                </div>
              </div>
              </div>

            <div className={styles.line}></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubScriptionOrderSummary;
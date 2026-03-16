import React from 'react'
import styles from "./PayContainer.module.css"

interface Props {
  total: number;
  onPay: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const PayContainer: React.FC<Props> = ({ total, onPay, loading = false, disabled = false }) => {
  return (
    <>
      <div
        className={`${styles.main} ${disabled ? styles.disabled : ""}`}
        style={{ cursor: loading || disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}
        onClick={onPay}
      >
        <div className={styles.MainCoantiner}>
          <div className={styles.left}>
            <h4>{loading ? "Processing..." : "Pay now"}</h4>
          </div>
          <div className={styles.right}>
            <h4>AED {total.toFixed(2)}</h4>
          </div>
        </div>
      </div>
    </>
  );
};

export default PayContainer;

 

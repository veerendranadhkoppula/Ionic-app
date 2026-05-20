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
    <div className={styles.footer}>
      <div
        className={`${styles.btn} ${disabled ? styles.disabled : ""}`}
        style={{ cursor: loading || disabled ? "not-allowed" : "pointer" }}
        onClick={disabled || loading ? undefined : onPay}
      >
        <h4>{loading ? "Processing..." : "Pay now"}</h4>
        <h4>AED {total.toFixed(2)}</h4>
      </div>
    </div>
  );
};

export default PayContainer;

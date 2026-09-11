import React from 'react'
import styles from "./PayContainer.module.css"

interface Props {
  total: number;
  onProceed: () => void;
  label?: string;
  disabled?: boolean;
}

const PayContainer = ({ total, onProceed, label = "Pay now", disabled = false }: Props) => {
  return (
    <div className={styles.footer}>
      <div
        className={`${styles.btn} ${disabled ? styles.disabled : ""}`}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
        onClick={disabled ? undefined : onProceed}
      >
        <h4>{label}</h4>
        <h4>AED {total.toFixed(2)}</h4>
      </div>
    </div>
  );
}

export default PayContainer

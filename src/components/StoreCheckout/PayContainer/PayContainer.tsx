import React from 'react'
import styles from "./PayContainer.module.css"

interface Props {
  total: number;
  onProceed: () => void;
  label?: string;
  disabled?: boolean;
}

const PayContainer = ({ total, onProceed, label = "Pay now", disabled = false }: Props) => {
  // Make the whole container clickable (like cafe PayContainer) so guests
  // can tap the bar to trigger the informational login toast even when the
  // visual state is "disabled". We keep the visual disabled styling but
  // do not block pointer events so StoreCheckout's onProceed can run and
  // show the login/signup toast.
  return (
    <>
      <div
        className={`${styles.main} ${disabled ? styles.disabled : ""}`}
        // keep a disabled cursor but allow clicks so the parent can show
        // the login toast for guests (matching cafe behaviour)
        style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}
        onClick={onProceed}
      >
        <div className={styles.MainCoantiner}>
          <div className={styles.left}>
            <h4>{label}</h4>
          </div>
          <div className={styles.right}>
            <h4>AED {total.toFixed(2)}</h4>
          </div>
        </div>
      </div>
    </>
  );
}

export default PayContainer

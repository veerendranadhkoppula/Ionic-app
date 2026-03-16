import React from "react";
import styles from "./CartConflictModal.module.css";

interface Props {
  existingOrigin  : "cafe" | "store";
  incomingOrigin  : "cafe" | "store";
  onReplace       : () => void;
  onCancel        : () => void;
  /** Number of items currently in the existing cart — used for richer copy */
  existingItemCount ?: number;
}

const CartConflictModal = ({
  existingOrigin,
  incomingOrigin,
  onReplace,
  onCancel,
  existingItemCount,
}: Props) => {
  // ── Cafe-vs-Cafe: reordering a past cafe order while cafe cart has items ──
  const isCafeToCafe = existingOrigin === "cafe" && incomingOrigin === "cafe";
  const isStoreToCafe = existingOrigin === "store" && incomingOrigin === "cafe";
  const isCafeToStore = existingOrigin === "cafe" && incomingOrigin === "store";
  if (isCafeToCafe) {
    const countText =
      existingItemCount && existingItemCount > 0
        ? `${existingItemCount} item${existingItemCount > 1 ? "s" : ""}`
        : "some items";

    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.card} onClick={(e) => e.stopPropagation()}>
          <div className={styles.iconWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
                stroke="#6C7A57"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="3" y1="6" x2="21" y2="6" stroke="#6C7A57" strokeWidth="1.5" strokeLinecap="round" />
              <path
                d="M16 10a4 4 0 01-8 0"
                stroke="#6C7A57"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 className={styles.title}>Replace your cafe cart?</h2>

          <p className={styles.description}>
            You already have <span className={styles.highlight}>{countText}</span> in your cafe
            cart. Reordering will replace them with the items from this order.
          </p>

          <div className={styles.actions}>
            <button className={styles.noBtn} onClick={onCancel}>
              Keep cart
            </button>
            <button className={styles.replaceBtn} onClick={onReplace}>
              Reorder
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Store-vs-Cafe: store cart has items, user is trying to reorder cafe ──
  if (isStoreToCafe) {
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.card} onClick={(e) => e.stopPropagation()}>
          <h2 className={styles.title}>Clear current cart?</h2>

          <p className={styles.description}>
            Your cart currently has items from the Store. To reorder from the
            Cafe, we'll need to clear your Store cart first.
          </p>

          <div className={styles.actions}>
            <button className={styles.noBtn} onClick={onCancel}>
              No
            </button>
            <button className={styles.replaceBtn} onClick={onReplace}>
              Replace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Cafe-vs-Store: cafe cart has items, user is trying to add store items ──
  if (isCafeToStore) {
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.card} onClick={(e) => e.stopPropagation()}>
          <h2 className={styles.title}>Clear current cart?</h2>

          <p className={styles.description}>
            Your cart currently has items from the Cafe. To add products from the
            Store, we'll need to clear your Cafe cart first.
          </p>

          <div className={styles.actions}>
            <button className={styles.noBtn} onClick={onCancel}>
              No
            </button>
            <button className={styles.replaceBtn} onClick={onReplace}>
              Replace
            </button>
          </div>
        </div>
      </div>
    );
  }


  return null;
};

export default CartConflictModal;

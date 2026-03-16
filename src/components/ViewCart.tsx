import React from "react";
import styles from "./ViewCart.module.css";

interface Props {
  itemCount: number;
  onClick?: () => void;
  disabled?: boolean;
}

const ViewCart: React.FC<Props> = ({ itemCount, onClick, disabled = false }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.stopPropagation();
      return;
    }
    if (onClick) onClick();
  };

  return (
    <>
      <div
        className={`${styles.main} ${disabled ? styles.disabled : ""}`}
        onClick={handleClick}
        role={onClick && !disabled ? "button" : undefined}
        aria-disabled={disabled ? "true" : "false"}
      >
        <div className={styles.viewCartContainer}>
          <div className={styles.viewCartLeft}>
           <p>{itemCount} Item{itemCount > 1 ? "s" : ""} added</p>
          </div>
          <div className={styles.viewCartRight}>
            <p>View cart</p>
            <svg
              width="35"
              height="35"
              viewBox="0 0 35 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.5 13L20 18.5L14.5 24"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewCart;

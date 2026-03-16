import React from "react";
import styles from "./RepeatCustomization.module.css";

type VegType = "Veg" | "NonVeg" | "Egg" | "Vegan";

const VegIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 11.4814V0H11.4814V11.4814H0ZM1.27571 10.2056H10.2056V1.27571H1.27571V10.2056ZM5.74068 8.29209C5.03904 8.29209 4.43839 8.04226 3.93874 7.54261C3.43909 7.04296 3.18926 6.44231 3.18926 5.74068C3.18926 5.03904 3.43909 4.43839 3.93874 3.93874C4.43839 3.43909 5.03904 3.18926 5.74068 3.18926C6.44231 3.18926 7.04296 3.43909 7.54261 3.93874C8.04226 4.43839 8.29209 5.03904 8.29209 5.74068C8.29209 6.44231 8.04226 7.04296 7.54261 7.54261C7.04296 8.04226 6.44231 8.29209 5.74068 8.29209Z" fill="#34A853"/>
  </svg>
);

const NonVegIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="18" height="18" rx="3" stroke="#A83434" strokeWidth="1.5"/>
    <polygon points="10,4 17,16 3,16" fill="#A83434"/>
  </svg>
);

const EggIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="18" height="18" rx="3" stroke="#F9AB00" strokeWidth="1.5"/>
    <ellipse cx="10" cy="10" rx="5" ry="6" fill="#F9AB00"/>
  </svg>
);

const VeganIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 11.4814V0H11.4814V11.4814H0ZM1.27571 10.2056H10.2056V1.27571H1.27571V10.2056ZM5.74068 8.29209C5.03904 8.29209 4.43839 8.04226 3.93874 7.54261C3.43909 7.04296 3.18926 6.44231 3.18926 5.74068C3.18926 5.03904 3.43909 4.43839 3.93874 3.93874C4.43839 3.43909 5.03904 3.18926 5.74068 3.18926C6.44231 3.18926 7.04296 3.43909 7.54261 3.93874C8.04226 4.43839 8.29209 5.03904 8.29209 5.74068C8.29209 6.44231 8.04226 7.04296 7.54261 7.54261C7.04296 8.04226 6.44231 8.29209 5.74068 8.29209Z" fill="#34A853"/>
</svg>

);

const VegTypeIcon = ({ type }: { type?: VegType }) => {
  switch (type) {
    case "NonVeg": return <NonVegIcon />;
    case "Egg":    return <EggIcon />;
    case "Vegan":  return <VeganIcon />;
    default:       return <VegIcon />;
  }
};

interface Props {
  isOpen: boolean;
  productId: number | null;
  previousCustomizations: unknown | null;
  productName?: string;
  productPrice?: number;
  productSubtitle?: string;
  vegType?: VegType;
  onClose: () => void;
  onChoose: () => void;
  onRepeatLast: () => void;
}

const RepeatCustomization: React.FC<Props> = ({
  isOpen,
  productId,
  previousCustomizations,
  productName,
  productPrice,
  productSubtitle,
  vegType,
  onClose,
  onChoose,
  onRepeatLast,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.main} onClick={(e) => e.stopPropagation()}>

        <div className={styles.Header}>
          <div className={styles.closeBtn} onClick={onClose}>
            <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z" fill="#4B3827"/>
            </svg>
          </div>
        </div>

        <div className={styles.ProductRow}>
          <div className={styles.ProductLeft}>
            <VegTypeIcon type={vegType} />
            <div className={styles.ProductInfo}>
              {productName && <h3 className={styles.productTitle}>{productName}</h3>}
              {productSubtitle && <p className={styles.productTagline}>{productSubtitle}</p>}
            </div>
          </div>

          {/* price shown on the right side */}
          {typeof productPrice === "number" && (
            <div className={styles.productPrice}>AED {productPrice}</div>
          )}
        </div>

        <div className={styles.divider} />

        <div className={styles.ButtonRow}>
          <button
            className={styles.btnChoose}
            onClick={() => {
              console.log("RepeatCustomization: I'll Choose", { productId, previousCustomizations });
              onChoose();
            }}
          >
            I'll Choose
          </button>
          <button
            className={styles.btnRepeat}
            onClick={() => {
              console.log("RepeatCustomization: Repeat Last", { productId, previousCustomizations });
              onRepeatLast();
            }}
          >
            Repeat Last
          </button>
        </div>

      </div>
    </div>
  );
};

export default RepeatCustomization;

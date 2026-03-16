import React, { useState } from "react";
import styles from "./AddBottomSheet.module.css";
import { StoreProduct, StoreVariant } from "../../../api/apiStoreMenu";

interface Props {
  product: StoreProduct;
  onClose: () => void;
  onSubscribe: (product: StoreProduct, selectedVariant: StoreVariant | null) => void;
  onAddToCart: (productId: number, quantity: number, variant: StoreVariant | null, unitPrice: number) => void;
}

const AddBottomSheet = ({ product, onClose, onSubscribe, onAddToCart }: Props) => {
  const [quantity, setQuantity] = useState(1);
  const [isClosing, setIsClosing] = useState(false);

  // For variant products, default-select the first in-stock variant (or first overall)
  const firstVariant = product.hasVariantOptions && product.variants.length > 0
    ? (product.variants.find((v) => v.variantInStock) ?? product.variants[0])
    : null;

  const [selectedVariant, setSelectedVariant] = useState<StoreVariant | null>(firstVariant);

  // Compute display price based on selection × quantity
  const unitPrice: number = product.hasVariantOptions
    ? selectedVariant
      ? (selectedVariant.variantSalePrice > 0 ? selectedVariant.variantSalePrice : selectedVariant.variantRegularPrice)
      : 0
    : (product.salePrice ?? product.regularPrice ?? 0);

  const displayPrice = unitPrice * quantity;

  // Show Subscribe only if the product has a subscription
  const hasSubscription = product.hasVariantOptions
    ? product.variants.some((v) => v.hasVariantSub)
    : product.hasSimpleSub;

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClose : ""}`}
      onClick={triggerClose}
    >
      <div
        className={`${styles.main} ${isClosing ? styles.close : ""} ${product.hasVariantOptions ? styles.mainWithVariants : styles.mainNoVariants}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── STICKY TOP ── */}
        <div className={styles.stickyTop}>
          {/* Close icon */}
          <div className={styles.WrongIcon} onClick={(e) => { e.stopPropagation(); triggerClose(); }}>
            <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
                fill="#4B3827"
              />
            </svg>
          </div>

          {/* Title + quantity selector */}
          <div className={styles.TitleandquntyConatiner}>
            <h3>{product.name}</h3>
            <div className={styles.QntyContainer}>
              <button className={styles.qtyBtn} onClick={() => setQuantity((p) => (p > 1 ? p - 1 : 1))}>-</button>
              <span className={styles.Qnty}>{quantity}</span>
              <button className={styles.qtyBtn} onClick={() => setQuantity((p) => p + 1)}>+</button>
            </div>
          </div>

          {/* Price — updates with variant selection */}
          <div className={styles.PriceContainer}>
            <h4>AED {displayPrice}.00</h4>
          </div>

          <div className={styles.line} />
        </div>

        {/* ── SCROLLABLE MIDDLE — variant options ── */}
        <div className={styles.scrollArea}>
          {product.hasVariantOptions && product.variants.length > 0 && (
            <div className={styles.variantSection}>
              {/* Section header */}
              <div className={styles.variantHeader}>
                <span className={styles.variantLabel}>Quantity</span>
                <span className={styles.requiredBadge}>Required</span>
              </div>

              {/* Option rows */}
              <div className={styles.variantList}>
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const price = variant.variantSalePrice > 0
                    ? variant.variantSalePrice
                    : variant.variantRegularPrice;

                  return (
                    <div
                      key={variant.id}
                      className={styles.variantRow}
                      onClick={() => setSelectedVariant(variant)}
                    >
                      <span className={styles.variantName}>{variant.variantName}</span>
                      <div className={styles.variantRight}>
                        <span className={styles.variantPrice}>AED {price}</span>
                        {/* Custom radio */}
                        <div className={`${styles.radio} ${isSelected ? styles.radioSelected : ""}`}>
                          {isSelected && <div className={styles.radioDot} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── STICKY BOTTOM — CTAs ── */}
        <div className={`${styles.stickyBottom} ${product.hasVariantOptions ? styles.stickyBottomPush : ""}`}>
          <div className={styles.BottomContainer}>
            {hasSubscription && (
              <button
                className={styles.sub}
                onClick={() => { triggerClose(); onSubscribe(product, selectedVariant); }}
              >
                Subscribe
              </button>
            )}
            <button
                className={styles.addtocart}
                onClick={() => {
                  triggerClose();
                  onAddToCart(product.id, quantity, selectedVariant, unitPrice);
                }}
              >
                Add to Cart
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBottomSheet;

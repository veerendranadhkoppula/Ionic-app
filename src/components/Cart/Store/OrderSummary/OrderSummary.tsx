import React from "react";
import styles from "./OrderSummary.module.css";

export interface CartStoreItem {
  id: string;
  name: string;
  variantName?: string;
  productImage?: string;
  unitPrice: number;
  quantity: number;
  isOutOfStock?: boolean;
}

interface Props {
  items: CartStoreItem[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
}

const OrderSummary = ({ items, onIncrement, onDecrement, onRemove }: Props) => {
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.top}>
          <h4>Order Summary</h4>
          <p>{items.length} {items.length === 1 ? "item" : "items"}</p>
        </div>

        <div className={styles.bottom}>
          {items.map((item) => (
            <div
              key={item.id}
              className={`${styles.addedprodcard} ${
                item.isOutOfStock ? styles.outofstockcard : ""
              }`}
            >
              <div className={styles.prodleft}>
                <div className={styles.prodimg}>
                  {item.productImage && (
                    <img src={item.productImage} alt={item.name} />
                  )}
                </div>
                <div className={styles.proddetails}>
                  <h3>
                    {item.name}
                    {item.variantName ? <span>, {item.variantName}</span> : null}
                  </h3>
                  <p>AED {item.unitPrice}</p>
                </div>
              </div>

              <div className={styles.prodright}>
                {item.isOutOfStock ? (
                  <div
                    className={styles.simpleRemove}
                    onClick={() => onRemove(item.id)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8.46387 15.5348L15.5359 8.46484M8.46387 8.46484L15.5359 15.5348" stroke="#4B3827" strokeLinecap="round" />
                    </svg>
                  </div>
                ) : (
                  <div className={styles.incredecre}>
                    <button
                      onClick={() => onDecrement(item.id)}
                      disabled={item.quantity === 1}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => onIncrement(item.id)}>+</button>
                  </div>
                )}

                {item.isOutOfStock ? (
                  <p className={styles.outofstocktext}>Out of stock</p>
                ) : (
                  <p className={styles.remove} onClick={() => onRemove(item.id)}>
                    Remove
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;

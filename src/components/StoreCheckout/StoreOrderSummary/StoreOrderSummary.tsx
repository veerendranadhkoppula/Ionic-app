import React from "react";
import styles from "./StoreOrderSummary.module.css";
import { useAuth } from "../../../utils/useAuth";

export interface StoreOrderItem {
  id: string;
  name: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  userEmail: string;
  items: StoreOrderItem[];
}

const StoreOrderSummary = ({ userEmail, items }: Props) => {
  const { isLoggedIn } = useAuth();
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.EmailContainer}>
            <div className={styles.EmailTitle}>
              <h3>Email</h3>
            </div>
            <div className={styles.useremail}>
              {/* For guests show "guest" and require login (matches cafe behaviour) */}
              {isLoggedIn && userEmail ? <p>{userEmail}</p> : <p>guest</p>}
            </div>
          </div>

          <div className={styles.OrderSummaryContainer}>
            <div className={styles.Heading}>
              <h3>Order Summary</h3>
            </div>

            <div className={styles.OrderDetails}>
              {items.map((item) => (
                <div className={styles.Item} key={item.id}>
                  <div className={styles.ItemName}>
                    <p>
                      {item.name}
                      {item.variantName ? `, ${item.variantName}` : ""}
                    </p>
                  </div>
                  <div className={styles.ItemQuantity}>
                    <p>{item.quantity}x</p>
                  </div>
                  <div className={styles.ItemPrice}>
                    <p>AED {item.unitPrice * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.line}></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StoreOrderSummary;
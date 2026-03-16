import React from "react";
import styles from "./NormalOrder.module.css";
import { useHistory } from "react-router-dom";

interface AddressInfo {
  name    : string;
  address : string;
  phone   : string;
}

interface OrderItem {
  name        : string;
  variantName?: string;
  quantity    : number;
  unitPrice   : number;
}

type Props = {
  isSubscription   : boolean;
  orderType        : "pickup" | "delivery";
  email            : string;
  shippingAddress ?: AddressInfo | null;
  billingAddress  ?: AddressInfo | null;
  toPay           ?: number;
  items           ?: OrderItem[];
  couponDiscount  ?: number;
  shippingCharge  ?: number;
  beansDiscount   ?: number;
  taxAmount       ?: number;
  cardLast4       ?: string | null;
  cardBrand       ?: string | null;
};

const PICKUP_ADDRESS = {
  title          : "White Mantis Roastery & Lab, Downtown",
  directionsText : "Get directions",
};

const NormalOrder: React.FC<Props> = ({
  // isSubscription kept in Props for compatibility, not used in store order view
  orderType,
  email,
  shippingAddress,
  billingAddress,
  toPay,
  items = [],
  couponDiscount = 0,
  shippingCharge = 0,
  beansDiscount  = 0,
  taxAmount      = 0,
  cardLast4,
  cardBrand,
}) => {
  const history = useHistory();

  const billing = billingAddress ?? shippingAddress;

  // Build the card display label e.g. "Visa 64xxxxxxxx" or "Card ••••1234"
  const cardDisplay = (() => {
    const brand = cardBrand
      ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1).toLowerCase()
      : "Card";
    if (cardLast4) {
      // Show first 2 digits of last4 then mask remaining as x's: "Visa 64xxxxxxxx"
      const first2 = cardLast4.slice(0, 2);
      return `${brand} ${first2}xxxxxxxx`;
    }
    return brand;
  })();

    return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          {orderType === "pickup" && (
            <div className={styles.PickupContainer}>
              <h3>Pickup Address</h3>
              <div className={styles.PickupAddress}>
                <h4>{PICKUP_ADDRESS.title}</h4>
                <div className={styles.PickupAddressDetails}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 5C10 7.4965 7.2305 10.0965 6.3005 10.8995C6.21386 10.9646 6.1084 10.9999 6 10.9999C5.8916 10.9999 5.78614 10.9646 5.6995 10.8995C4.7695 10.0965 2 7.4965 2 5C2 3.93913 2.42143 2.92172 3.17157 2.17157C3.92172 1.42143 4.93913 1 6 1C7.06087 1 8.07828 1.42143 8.82843 2.17157C9.57857 2.92172 10 3.93913 10 5Z" stroke="#6C7A5F" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 6.5C6.82843 6.5 7.5 5.82843 7.5 5C7.5 4.17157 6.82843 3.5 6 3.5C5.17157 3.5 4.5 4.17157 4.5 5C4.5 5.82843 5.17157 6.5 6 6.5Z" stroke="#6C7A5F" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p>{PICKUP_ADDRESS.directionsText}</p>
                </div>
              </div>
            </div>
          )}

          <div className={styles.OrderDetailsContainer}>
            <h4>Order Details</h4>
            <div className={styles.OrderDetails}>
              <div className={styles.ContactInfo}>
                <h4>Contact Information</h4>
                <p>{email || "�"}</p>
              </div>
              {orderType === "delivery" && shippingAddress && (
                <div className={styles.ShippingAdress}>
                  <h4>Shipping Address</h4>
                  <div className={styles.ShippingAddressDetails}>
                    <p>{shippingAddress.name}</p>
                    <h4>{shippingAddress.address}</h4>
                    <h5>Phone number : {shippingAddress.phone}</h5>
                  </div>
                </div>
              )}
              {billing && (
                <div className={styles.BillingAdress}>
                  <h4>Billing Address</h4>
                  <div className={styles.BillingAddressDetails}>
                    <p>{billing.name}</p>
                    <h4>{billing.address}</h4>
                    <h5>Phone number : {billing.phone}</h5>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.PaymentMethodContainer}>
            <h4>Payment Method</h4>
            <div className={styles.PaymentMethodDetails}>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.1091 0H0.890909C0.654625 0 0.428019 0.0992786 0.260941 0.275996C0.0938634 0.452713 0 0.692392 0 0.942308V9.55769C0 9.80761 0.0938634 10.0473 0.260941 10.224C0.428019 10.4007 0.654625 10.5 0.890909 10.5H13.1091C13.3454 10.5 13.572 10.4007 13.7391 10.224C13.9061 10.0473 14 9.80761 14 9.55769V0.942308C14 0.692392 13.9061 0.452713 13.7391 0.275996C13.572 0.0992786 13.3454 0 13.1091 0ZM0.890909 0.807692H13.1091C13.1428 0.807692 13.1752 0.821875 13.1991 0.84712C13.223 0.872365 13.2364 0.906606 13.2364 0.942308V2.69231H0.763636V0.942308C0.763636 0.906606 0.777045 0.872365 0.800914 0.84712C0.824782 0.821875 0.857154 0.807692 0.890909 0.807692ZM13.1091 9.69231H0.890909C0.857154 9.69231 0.824782 9.67813 0.800914 9.65288C0.777045 9.62764 0.763636 9.5934 0.763636 9.55769V3.5H13.2364V9.55769C13.2364 9.5934 13.223 9.62764 13.1991 9.65288C13.1752 9.67813 13.1428 9.69231 13.1091 9.69231ZM11.9636 7.94231C11.9636 8.04941 11.9234 8.15213 11.8518 8.22787C11.7802 8.30361 11.6831 8.34615 11.5818 8.34615H9.54545C9.44419 8.34615 9.34707 8.30361 9.27547 8.22787C9.20386 8.15213 9.16364 8.04941 9.16364 7.94231C9.16364 7.8352 9.20386 7.73248 9.27547 7.65675C9.34707 7.58101 9.44419 7.53846 9.54545 7.53846H11.5818C11.6831 7.53846 11.7802 7.58101 11.8518 7.65675C11.9234 7.73248 11.9636 7.8352 11.9636 7.94231ZM7.89091 7.94231C7.89091 8.04941 7.85068 8.15213 7.77908 8.22787C7.70747 8.30361 7.61036 8.34615 7.50909 8.34615H6.49091C6.38964 8.34615 6.29253 8.30361 6.22092 8.22787C6.14932 8.15213 6.10909 8.04941 6.10909 7.94231C6.10909 7.8352 6.14932 7.73248 6.22092 7.65675C6.29253 7.58101 6.38964 7.53846 6.49091 7.53846H7.50909C7.61036 7.53846 7.70747 7.58101 7.77908 7.65675C7.85068 7.73248 7.89091 7.8352 7.89091 7.94231Z" fill="#8C8C8C" />
              </svg>
              <p>{cardDisplay}</p>
            </div>
          </div>

          {toPay !== undefined && (
            <div className={styles.OrderSummaryContainer}>
              <h4>Order Summary</h4>
              <div className={styles.OrderSummaryDetails}>

                {/* ── Items list ─────────────────────────────────────── */}
                {items.length > 0 && (
                  <div className={styles.OrderSummaryPricedetails}>
                    <div className={styles.allPrices}>
                      {items.map((item, idx) => (
                        <div key={idx} className={styles.itemtotal}>
                          <span style={{
                            fontFamily: "var(--lato)",
                            fontWeight: 400,
                            fontSize: 14,
                            color: "#4B3827",
                            width: "33%",  
                           
                          }}>
                            {item.name}{item.variantName ? `, ${item.variantName}` : ""}
                          </span>
                          <span style={{
                            fontFamily: "var(--lato)",
                            fontWeight: 400,
                            fontSize: 12,
                            color: "#4B3827",
                            margin: "0 12px",
                            whiteSpace: "nowrap",
                            display: "flex",
                            justifyContent: "center",
                             width: "33%",  
                          }}>
                            {item.quantity}x
                          </span>
                          {/* Price */}
                          <span style={{
                            fontFamily: "var(--lato)",
                            fontWeight: 400,
                            fontSize: 12,
                            color: "#4B3827",
                            whiteSpace: "nowrap",
                             width: "34%",  
                             display: "flex",
                              justifyContent: "flex-end",
                          }}>
                            AED {(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Divider + Item Total + charges ─────────────────── */}
                {(shippingCharge > 0 || couponDiscount > 0 || beansDiscount > 0 || taxAmount > 0 || items.length > 0) && (
                  <>
                    {/* Divider line */}
                    <div className={styles.summaryDivider} />

                    <div className={styles.OrderSummaryPricedetails}>
                      <div className={styles.allPrices}>
                        {/* Item Total row */}
                        {items.length > 0 && (
                          <div className={styles.charges}>
                            <h4>Item Total</h4>
                            <h4>AED {items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)}</h4>
                          </div>
                        )}
                        {shippingCharge > 0 && (
                          <div className={styles.charges}>
                            <h4>Charges</h4>
                            <h4>AED {shippingCharge.toFixed(2)}</h4>
                          </div>
                        )}
                        {beansDiscount > 0 && (
                          <div className={styles.discount}>
                            <h4>Bean used</h4>
                            <h4>- {beansDiscount.toFixed(2)}</h4>
                          </div>
                        )}
                        {couponDiscount > 0 && (
                          <div className={styles.CuponsApplied}>
                            <div className={styles.CouponAppliedHead}>
                              <h4>Coupon Applied</h4>
                            </div>
                            <h4>- AED {couponDiscount.toFixed(2)}</h4>
                          </div>
                        )}
                        {taxAmount > 0 && (
                          <div className={styles.charges}>
                            <h4>VAT</h4>
                            <h4>AED {taxAmount.toFixed(2)}</h4>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Grand total ────────────────────────────────────── */}
                <div className={styles.totalPriceRow}>
                  <div className={styles.totalPrice}>
                    <h4>Your total</h4>
                    <h3>AED {toPay.toFixed(2)}</h3>
                  </div>
                </div>

              </div>
            </div>
          )}

          <div className={styles.ContatctUsContainer} onClick={() => history.push("/NeedHelp")}>
            <p>Contact Us</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default NormalOrder;
import React, { useState, useEffect } from "react";
import ChooseAdress from "../ChooseAdress/ChooseAdress";
import styles from "./Delivery.module.css";

export interface DeliveryAddress {
  id?: string;
  label: string;
  addressFirstName: string;
  addressLastName: string;
  street: string;
  apartment: string;
  city: string;
  emirates: string;
  country: string;
  phoneNumber: string;
}

export interface DeliveryState {
  deliveryMode: "ship" | "pickup" | null;
  shippingAddress: DeliveryAddress | null;
  billingAddress: DeliveryAddress | null;
  useShippingAsBilling: boolean;
}

interface Props {
  onDeliveryChange?: (state: DeliveryState) => void;
}


type Address = DeliveryAddress;

const Delivery: React.FC<Props> = ({ onDeliveryChange }) => {
  const [deliveryMode, setDeliveryMode] = useState<"ship" | "pickup" | null>(null);

  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);

  const [billingAddress, setBillingAddress] = useState<Address | null>(null);

  const [useShippingAsBilling, setUseShippingAsBilling] = useState(false);

  const [openAddressSheet, setOpenAddressSheet] = useState(false);

  const [sheetType, setSheetType] = useState<"shipping" | "billing">(
    "shipping",
  );

  useEffect(() => {
    if (useShippingAsBilling && shippingAddress) {
      setBillingAddress(shippingAddress);
    }
  }, [useShippingAsBilling, shippingAddress]);


  useEffect(() => {
    if (onDeliveryChange) {
      onDeliveryChange({
        deliveryMode,
        shippingAddress,
        billingAddress,
        useShippingAsBilling,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMode, shippingAddress, billingAddress, useShippingAsBilling]);

  const handleAddressSelect = (address: Address) => {
    if (sheetType === "shipping") {
      setShippingAddress(address);
      setUseShippingAsBilling(true);
      setBillingAddress(address);
    } else {
      setBillingAddress(address);
    }

    setOpenAddressSheet(false);
  };

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <h3>Delivery</h3>

            <div className={styles.ChooseCtas}>
              <button
                className={
                  deliveryMode === "ship" ? styles.shipbtn : styles.pickbtn
                }
                onClick={() => setDeliveryMode("ship")}
              >
                Ship
              </button>

              <button
                className={
                  deliveryMode === "pickup" ? styles.shipbtn : styles.pickbtn
                }
                onClick={() => setDeliveryMode("pickup")}
              >
                Pick up
              </button>
            </div>
          </div>

          <div className={styles.Bottom}>
            {deliveryMode === "ship" && (
              <>
                <div className={styles.ShipaddressContainer}>
                  <div className={styles.ShipAddressTop}>
                    <h3>
                      {shippingAddress ? "Shipping Address" : "Add Address"}
                    </h3>

                    <span
                      style={{ cursor: "pointer", fontSize: "18px" }}
                      onClick={() => {
                        setSheetType("shipping");
                        setOpenAddressSheet(true);
                      }}
                    >
                      {shippingAddress ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3.59743 14.5588H4.59921L12.7282 6.42984L11.7264 5.42806L3.59743 13.557V14.5588ZM2.40625 15.75V13.0623L12.8811 2.59207C13.0011 2.48301 13.1337 2.39876 13.2787 2.33934C13.4239 2.27978 13.5761 2.25 13.7353 2.25C13.8946 2.25 14.0487 2.27826 14.1979 2.33477C14.3472 2.39129 14.4794 2.48115 14.5944 2.60437L15.5642 3.5863C15.6874 3.70132 15.7752 3.83367 15.8276 3.98336C15.88 4.13305 15.9062 4.28274 15.9062 4.43243C15.9062 4.59218 15.879 4.74459 15.8245 4.88965C15.7699 5.03484 15.6832 5.16746 15.5642 5.2875L5.09394 15.75H2.40625ZM12.2186 5.93768L11.7264 5.42806L12.7282 6.42984L12.2186 5.93768Z"
                            fill="#4B3827"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.5 12.5H6V11.5H11.5V6H12.5V11.5H18V12.5H12.5V18H11.5V12.5Z"
                            fill="#4B3827"
                          />
                        </svg>
                      )}
                    </span>
                  </div>

                  {shippingAddress && (
                    <div className={styles.addedAddressBox}>
                      <h4>{shippingAddress.label}</h4>
                      <h5>
                        {shippingAddress.addressFirstName +
                          " " +
                          shippingAddress.addressLastName}
                      </h5>
                      <p>
                        {`${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.emirates}, UAE`}
                      </p>
                      <h6>Phone number : {shippingAddress.phoneNumber}</h6>
                    </div>
                  )}
                </div>

                {shippingAddress && (
                  <div className={styles.billingaddressContainer}>
                    <div className={styles.billingAddressTop}>
                      <label className={styles.customCheckbox}>
                        <input
                          type="checkbox"
                          checked={useShippingAsBilling}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseShippingAsBilling(checked);

                            if (!checked) {
                              setSheetType("billing");
                              setOpenAddressSheet(true);
                            }
                          }}
                        />
                        <span className={styles.checkmark}></span>
                      </label>

                      <p>Use Shipping as Billing Address</p>
                    </div>
                  </div>
                )}

                {shippingAddress && !useShippingAsBilling && billingAddress && (
                  <div className={styles.ShipaddressContainer}>
                    <div className={styles.ShipAddressTop}>
                      <h3>Billing Address</h3>

                      <span
                        style={{
                          cursor: "pointer",
                          fontSize: "18px",
                        }}
                        onClick={() => {
                          setSheetType("billing");
                          setOpenAddressSheet(true);
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3.59743 14.5588H4.59921L12.7282 6.42984L11.7264 5.42806L3.59743 13.557V14.5588ZM2.40625 15.75V13.0623L12.8811 2.59207C13.0011 2.48301 13.1337 2.39876 13.2787 2.33934C13.4239 2.27978 13.5761 2.25 13.7353 2.25C13.8946 2.25 14.0487 2.27826 14.1979 2.33477C14.3472 2.39129 14.4794 2.48115 14.5944 2.60437L15.5642 3.5863C15.6874 3.70132 15.7752 3.83367 15.8276 3.98336C15.88 4.13305 15.9062 4.28274 15.9062 4.43243C15.9062 4.59218 15.879 4.74459 15.8245 4.88965C15.7699 5.03484 15.6832 5.16746 15.5642 5.2875L5.09394 15.75H2.40625ZM12.2186 5.93768L11.7264 5.42806L12.7282 6.42984L12.2186 5.93768Z"
                            fill="#4B3827"
                          />
                        </svg>
                      </span>
                    </div>

                    <div className={styles.addedAddressBox}>
                      <h4>{billingAddress.label}</h4>
                      <h5>
                        {billingAddress.addressFirstName +
                          " " +
                          billingAddress.addressLastName}
                      </h5>
                      <p>
                        {`${billingAddress.street}, ${billingAddress.city}, ${billingAddress.emirates}, UAE`}
                      </p>
                      <h6>Phone number : {billingAddress.phoneNumber}</h6>
                    </div>
                  </div>
                )}
              </>
            )}

            {deliveryMode === "pickup" && (
              <>
                <div className={styles.locationstore}>
                  <h4>White Mantis Roastery - Al Quoz</h4>
                  <p>
                    Warehouse #2 – 26, 26th Street Al Quoz Industrial Area 4,
                    Dubai, UAE
                  </p>
                  <h5>Store Timing - 10:00 AM - 7:00 PM</h5>
                  <h6
                   
                  >
                    Get Directions
                  </h6>
                </div>

                <div className={styles.ShipaddressContainer}>
                  <div className={styles.ShipAddressTop}>
                    <h3>
                      {billingAddress
                        ? "Billing Address"
                        : "Add Billing Address"}
                    </h3>

                    <span
                      style={{ cursor: "pointer", fontSize: "18px" }}
                      onClick={() => {
                        setSheetType("billing");
                        setOpenAddressSheet(true);
                      }}
                    >
                      {billingAddress ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3.59743 14.5588H4.59921L12.7282 6.42984L11.7264 5.42806L3.59743 13.557V14.5588ZM2.40625 15.75V13.0623L12.8811 2.59207C13.0011 2.48301 13.1337 2.39876 13.2787 2.33934C13.4239 2.27978 13.5761 2.25 13.7353 2.25C13.8946 2.25 14.0487 2.27826 14.1979 2.33477C14.3472 2.39129 14.4794 2.48115 14.5944 2.60437L15.5642 3.5863C15.6874 3.70132 15.7752 3.83367 15.8276 3.98336C15.88 4.13305 15.9062 4.28274 15.9062 4.43243C15.9062 4.59218 15.879 4.74459 15.8245 4.88965C15.7699 5.03484 15.6832 5.16746 15.5642 5.2875L5.09394 15.75H2.40625ZM12.2186 5.93768L11.7264 5.42806L12.7282 6.42984L12.2186 5.93768Z"
                            fill="#4B3827"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.5 12.5H6V11.5H11.5V6H12.5V11.5H18V12.5H12.5V18H11.5V12.5Z"
                            fill="#4B3827"
                          />
                        </svg>
                      )}
                    </span>
                  </div>

                  {billingAddress && (
                    <div className={styles.addedAddressBox}>
                      <h4>{billingAddress.label}</h4>
                      <h5>
                        {billingAddress.addressFirstName +
                          " " +
                          billingAddress.addressLastName}
                      </h5>
                      <p>
                        {`${billingAddress.street}, ${billingAddress.city}, ${billingAddress.emirates}, UAE`}
                      </p>
                      <h6>Phone number : {billingAddress.phoneNumber}</h6>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {openAddressSheet && (
        <ChooseAdress
          type={sheetType}
          onClose={() => setOpenAddressSheet(false)}
          onSelect={handleAddressSelect}
        />
      )}
    </>
  );
};

export default Delivery;

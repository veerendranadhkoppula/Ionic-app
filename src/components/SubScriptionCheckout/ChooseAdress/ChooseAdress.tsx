import React, { useEffect, useState } from "react";
import AddNewAddress from "../../Adresses/AddNewAddress/AddNewAddress";
import tokenStorage from "../../../utils/tokenStorage";
import * as api from "../../../utils/apiAuth";

const authFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : (input as Request).url;
  const headers: Record<string, string> = {};
  if (init && init.headers) {
    if ((init.headers as Headers) instanceof Headers) {
      (init.headers as Headers).forEach((v, k) => (headers[k] = v));
    } else if (Array.isArray(init.headers)) {
      (init.headers as [string, string][]).forEach(([k, v]) => (headers[k] = v));
    } else {
      Object.assign(headers, init.headers as Record<string, string>);
    }
  }
  try { const token = await tokenStorage.getToken(); if (token) headers["Authorization"] = `JWT ${token}`; } catch (e) { console.warn(e); }
  const res = await fetch(url, { ...(init || {}), headers });
  if (res.status === 401) {
    try { await tokenStorage.clearToken(); } catch (e) { console.warn(e); }
    try { if (!window.location.pathname.startsWith('/auth')) window.location.assign('/auth'); } catch (e) { console.warn(e); }
  }
  return res;
};
import styles from "./ChooseAdress.module.css";
interface Address {
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
interface Props {
  type: "shipping" | "billing";
  onClose: () => void;
  onSelect: (address: Address) => void;
}

const ChooseAdress = ({ type, onClose, onSelect }: Props) => {
    const [isClosing, setIsClosing] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [openSheet, setOpenSheet] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);

        const userId = await tokenStorage.getItem("user_id");
        if (!userId) {
          setLoading(false);
          return;
        }

        const serverUser = await api.getUserById(userId);
        setAddresses(serverUser.addresses || []);
      } catch (err) {
        console.error("Failed to load addresses", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);
  const patchUserAddresses = async (updatedAddresses: Address[]) => {
    try {
      const userId = await tokenStorage.getItem("user_id");
      const token = await tokenStorage.getToken();
      if (!userId || !token) return;

      const res = await authFetch(
        `${api.API_BASE.replace("/api", "")}/api/users/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses: updatedAddresses }),
        },
      );

      if (!res.ok) throw new Error("Failed to update addresses");

      const data = await res.json();
      const serverData = data?.doc || data;
      setAddresses(serverData.addresses || updatedAddresses);
    } catch (err) {
      console.error("Address patch error:", err);
    }
  };
const handleAddAddress = async (newAddress: Address) => {
  const next = [...addresses, newAddress];
  await patchUserAddresses(next);

  onSelect(newAddress);
};
  return (
    <>
   <div
  className={`${styles.overlay} ${isClosing ? styles.overlayClose : ""}`}
  onClick={() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }}
>
   <div
  className={`${styles.main} ${isClosing ? styles.close : ""}`}
  onClick={(e) => e.stopPropagation()}
>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
           <h3>
  {type === "shipping"
    ? "Choose Shipping Address"
    : "Choose Billing Address"}
</h3>
          </div>
          <div className={styles.Botttom}>
            <div
              className={styles.AddAdressCoantainer}
              onClick={() => {
                setSelectedAddress(null);
                setOpenSheet(true);
              }}
              style={{ cursor: "pointer" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.5 12.5H6V11.5H11.5V6H12.5V11.5H18V12.5H12.5V18H11.5V12.5Z"
                  fill="#6C7A5F"
                />
              </svg>

              <p>Add New Address</p>
            </div>
            <div className={styles.AdressesContainers}>
              {addresses.length === 0 && !loading && <p>No addresses found.</p>}

              {addresses.map((item) => (
               <div
  key={item.id || item.label + item.street}
  className={styles.AdressCard}
  onClick={() => {
    onSelect(item);
  }}
  style={{ cursor: "pointer" }}
>
                  <h3>{item.label}</h3>
                  <h4>{item.addressFirstName + " " + item.addressLastName}</h4>
                  <p>
                    {`${item.street}, ${item.apartment}, ${item.city}, ${item.emirates}, UAE`}
                  </p>
                  <h5>Phone number : {item.phoneNumber}</h5>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
      {openSheet && (
        <AddNewAddress
          onClose={() => {
            setOpenSheet(false);
            setSelectedAddress(null);
          }}
          onAdd={handleAddAddress}
          editData={selectedAddress}
        />
      )}
    </>
  );
};

export default ChooseAdress;

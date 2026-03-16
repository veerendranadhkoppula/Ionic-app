import React, { useEffect, useState } from "react";
import styles from "./AdressesMain.module.css";
import AddNewAddress from "../AddNewAddress/AddNewAddress";

import tokenStorage from "../../../utils/tokenStorage";
import * as api from "../../../utils/apiAuth";
import FullScreenLoader from "../../../components/FullScreenLoader";

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

const AdressesMain = () => {
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profileFirstName, setProfileFirstName] = useState<string>("");
  const [profileLastName, setProfileLastName] = useState<string>("");

  const [openSheet, setOpenSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const MAX_ADDRESSES = 5;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | undefined>(
    undefined,
  );
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

        setProfileFirstName(serverUser.firstName || "");
        setProfileLastName(serverUser.lastName || "");
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

      const res = await fetch(
        `${api.API_BASE.replace("/api", "")}/api/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify({ addresses: updatedAddresses }),
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("PATCH ERROR:", errorText);
        throw new Error("Failed to update addresses");
      }

      const data = await res.json();
      const serverData = data?.doc || data;

      setAddresses(serverData.addresses || updatedAddresses);
    } catch (err) {
      console.error("Address patch error:", err);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;

    const next = addresses.filter((item) => item.id !== id);

    await patchUserAddresses(next);
  };

  const handleAddAddress = async (newAddress: Address) => {
    const next = [...addresses, newAddress];
    await patchUserAddresses(next);
  };

  const handleUpdateAddress = async (updated: Address) => {
    const next = addresses.map((item) =>
      item.id === updated.id ? updated : item,
    );

    await patchUserAddresses(next);
  };
  const confirmDelete = async () => {
    if (!addressToDelete) return;

    await handleDelete(addressToDelete);

    setShowDeleteModal(false);
    setAddressToDelete(undefined);
  };
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            {addresses.length === 0 && !loading ? (
              <div className={styles.EmptyStateWrapper}>
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g opacity="0.4">
                    <path
                      d="M41.6667 8.32812V16.6615M58.3333 8.32812V16.6615M66.6667 33.3281C67.7717 33.3281 68.8315 33.7671 69.6129 34.5485C70.3943 35.3299 70.8333 36.3897 70.8333 37.4948V70.8281C70.8333 75.2484 69.0774 79.4876 65.9518 82.6132C62.8262 85.7388 58.5869 87.4948 54.1667 87.4948H29.1667C24.7464 87.4948 20.5072 85.7388 17.3816 82.6132C14.2559 79.4876 12.5 75.2484 12.5 70.8281V37.4948C12.5 36.3897 12.939 35.3299 13.7204 34.5485C14.5018 33.7671 15.5616 33.3281 16.6667 33.3281H75C79.4203 33.3281 83.6595 35.0841 86.7851 38.2097C89.9107 41.3353 91.6667 45.5745 91.6667 49.9948C91.6667 54.4151 89.9107 58.6543 86.7851 61.7799C83.6595 64.9055 79.4203 66.6615 75 66.6615H70.8333M25 8.32812V16.6615"
                      stroke="#6C7A5F"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                </svg>

                <h3 className={styles.EmptyTitle}>No Addresses Saved</h3>
                <p className={styles.EmptySubtitle}>
                  You haven’t added any delivery addresses yet. Add an address
                  to make checkout faster and easier for your future orders.
                </p>

                <div className={styles.EmptyCTAWrapper}>
                  <button
                    className={styles.EmptyCTA}
                    onClick={() => setOpenSheet(true)}
                  >
                    Add New Address
                  </button>
                </div>
              </div>
            ) : (
              addresses.map((item) => (
                <div
                  key={item.id || item.label + item.street}
                  className={styles.AdreessCard}
                >
                  <div className={styles.AddressPlace}>
                    <h3>{item.label}</h3>
                  </div>

                  <div className={styles.AdresserName}>
                    <p>{item.addressFirstName + " " + item.addressLastName}</p>
                  </div>

                  <div className={styles.AddressDetails}>
                    <p>{`${item.street}, ${item.apartment}, ${item.city}, ${item.emirates}, UAE`}</p>
                  </div>

                  <div className={styles.AdresserPhone}>
                    <p>
                      Phone number :
                      <span className={styles.number}> {item.phoneNumber}</span>
                    </p>
                  </div>

                  <div className={styles.AdressActionIcons}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      onClick={() => {
                        setSelectedAddress(item);
                        setOpenSheet(true);
                      }}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4.80699 19.4118H6.14269L16.9813 8.57312L15.6456 7.23741L4.80699 18.0761V19.4118ZM3.21875 21V17.4164L17.1852 3.45609C17.3452 3.31068 17.522 3.19835 17.7154 3.11912C17.909 3.03971 18.1119 3 18.3242 3C18.5365 3 18.7421 3.03768 18.941 3.11303C19.14 3.18838 19.3162 3.30821 19.4696 3.4725L20.7627 4.78174C20.927 4.93509 21.044 5.11156 21.1139 5.31115C21.1838 5.51074 21.2188 5.71032 21.2188 5.90991C21.2188 6.12291 21.1824 6.32612 21.1097 6.51953C21.037 6.71312 20.9213 6.88994 20.7627 7.05L6.80234 21H3.21875ZM16.3018 7.91691L15.6456 7.23741L16.9813 8.57312L16.3018 7.91691Z"
                        fill="#4B3827"
                      />
                    </svg>

                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      onClick={() => {
                        setAddressToDelete(item.id);
                        setShowDeleteModal(true);
                      }}
                      style={{ cursor: "pointer" }}
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6.99325 21C6.46164 21 6.00749 20.8118 5.63082 20.4353C5.25432 20.0586 5.06607 19.6044 5.06607 19.0728V5.54204H4V3.94294H8.7973V3H15.1937V3.94294H19.991V5.54204H18.9249V19.0728C18.9249 19.6114 18.7384 20.0672 18.3652 20.4403C17.9921 20.8134 17.5363 21 16.9977 21H6.99325ZM17.3258 5.54204H6.66517V19.0728C6.66517 19.1686 6.6959 19.2472 6.75738 19.3087C6.81886 19.3702 6.89748 19.4009 6.99325 19.4009H16.9977C17.0798 19.4009 17.155 19.3667 17.2232 19.2983C17.2916 19.2301 17.3258 19.1549 17.3258 19.0728V5.54204ZM9.22799 17.2688H10.8268V7.67417H9.22799V17.2688ZM13.1642 17.2688H14.763V7.67417H13.1642V17.2688Z"
                        fill="#4B3827"
                      />
                    </svg>
                  </div>
                </div>
              ))
            )}
          </div>

          {addresses.length > 0 && (
            <button
              className={`${styles.AddButton} ${
                addresses.length >= MAX_ADDRESSES ? styles.DisabledButton : ""
              }`}
              onClick={() => {
                if (addresses.length < MAX_ADDRESSES) {
                  setOpenSheet(true);
                }
              }}
              disabled={addresses.length >= MAX_ADDRESSES}
            >
              {addresses.length >= MAX_ADDRESSES
                ? "Maximum 5 addresses reached"
                : "Add New Address"}
            </button>
          )}
        </div>
      </div>

      {openSheet && (
        <AddNewAddress
          onClose={() => {
            setOpenSheet(false);
            setSelectedAddress(null);
          }}
          onAdd={handleAddAddress}
          onUpdate={handleUpdateAddress}
          editData={selectedAddress}
          profileFirstName={profileFirstName}
          profileLastName={profileLastName}
        />
      )}
      {loading && <FullScreenLoader />}
      {showDeleteModal && (
        <div className={styles.DeleteOverlay}>
          <div className={styles.DeleteModal}>
            <h2>Delete Address?</h2>
            <p>
              You won’t be able to use this address
              <br />
              for future orders.
            </p>

            <div className={styles.DeleteActions}>
              <button
                className={styles.CancelBtn}
                onClick={() => {
                  setShowDeleteModal(false);
                  setAddressToDelete(undefined);
                }}
              >
                Cancel
              </button>

              <button className={styles.DeleteBtn} onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdressesMain;

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

import styles from "./AddNewAddress.module.css";

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
  onClose: () => void;
  onAdd: (data: Address) => void;
  onUpdate?: (data: Address) => void;
  editData?: Address | null;
  profileFirstName?: string;
  profileLastName?: string;
}

const AddNewAddress: React.FC<Props> = ({
  onClose,
  onAdd,
  onUpdate,
  editData,
  profileFirstName,
  profileLastName,
}) => {
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    street: string;
    apartment: string;
    city: string;
    emirates: string;
    phone: string;
  }>({
    firstName: editData?.addressFirstName ?? profileFirstName ?? "",
    lastName: editData?.addressLastName ?? profileLastName ?? "",
    street: editData?.street ?? "",
    apartment: editData?.apartment ?? "",
    city: editData?.city ?? "",
    emirates: editData?.emirates ?? "",
    phone: editData?.phoneNumber ?? "",
  });

  const [addressLabel, setAddressLabel] = useState<string>(
    editData?.label ?? "Home",
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Phone validation: digits only, reasonable length (7-15 digits)
  const isPhoneValid = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return /^\d{7,15}$/.test(digits);
  };

  const isFormValid =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.street.trim() !== "" &&
    formData.city.trim() !== "" &&
    formData.emirates.trim() !== "" &&
    formData.phone.trim() !== "" &&
    isPhoneValid(formData.phone);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const name = e.target.name;
    let value = e.target.value;

    // Allow an optional leading '+' for international country codes, but
    // otherwise strip non-digit characters. This preserves e.g. '+97150...'
    if (name === "phone") {
      if (value.startsWith("+")) {
        // Keep leading plus, remove non-digits afterwards
        value = "+" + value.slice(1).replace(/\D/g, "");
      } else {
        // No plus — keep digits only
        value = value.replace(/\D/g, "");
      }
    }

    setFormData({ ...formData, [name]: value } as any);
  };

  const handleSubmit = () => {
    setAttemptedSubmit(true);

    // If the form is invalid, show validation and do not submit.
    if (!isFormValid) {
      return;
    }

    const updatedAddress: Address = {
      id: editData?.id,
      label: addressLabel,
      addressFirstName: formData.firstName,
      addressLastName: formData.lastName,
      street: formData.street,
      apartment: formData.apartment,
      city: formData.city,
      emirates: formData.emirates,
      country: "United Arab Emirates",
      phoneNumber: formData.phone,
    };

    if (editData && onUpdate) {
      onUpdate(updatedAddress);
    } else {
      onAdd(updatedAddress);
    }

    onClose();
  };

  useEffect(() => {
    if (editData) {
      setFormData({
        firstName: editData.addressFirstName ?? "",
        lastName: editData.addressLastName ?? "",
        street: editData.street ?? "",
        apartment: editData.apartment ?? "",
        city: editData.city ?? "",
        emirates: editData.emirates ?? "",
        phone: editData.phoneNumber ?? "",
      });

      setAddressLabel(editData.label ?? "Home");
    } else {
      // When adding new address, prefill first/last from profile if provided
      setFormData((prev) => ({
        ...prev,
        firstName: profileFirstName ?? prev.firstName,
        lastName: profileLastName ?? prev.lastName,
      }));
    }
  }, [editData, profileFirstName, profileLastName]);

  const portalTarget =
    typeof document !== "undefined"
      ? document.getElementById("store-checkout-footer-overlays")
      : null;

  const overlayContent = (
    <div
      className={portalTarget ? styles.overlayFooter : styles.overlay}
      onClick={onClose}
    >
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{editData ? "Edit Address" : "Add New Address"}</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.floatingInput}>
            <span className={styles.floatingLabel}>Country/Region</span>
            <input className={styles.addns} value="United Arab Emirates" disabled />
          </div>

          <div className={styles.row}>
            <input
              name="firstName"
              value={formData.firstName}
              placeholder="First Name"
              className={styles.addns}
              onChange={handleChange}
            />
            <input
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              className={styles.addns}
            />
          </div>
          <div>
            <input
              name="street"
              value={formData.street}
              placeholder="House Number, Street Name"
              onChange={handleChange}
              className={styles.addns}
            />
          </div>
          <div>
            <input
              name="apartment"
              value={formData.apartment}
              placeholder="Apartment, Suite etc. (Optional)"
              onChange={handleChange}
              className={styles.addns}
            />
          </div>
          <div className={styles.row}>
            <input
              name="city"
              value={formData.city}
              placeholder="City"
              onChange={handleChange}
              className={styles.addns}
            />

            <select
              name="emirates"
              value={formData.emirates}
              onChange={handleChange}
            >
              <option value="">Select Emirates</option>

              <option value="dubai">Dubai</option>
              <option value="abu_dhabi">Abu Dhabi</option>
              <option value="sharjah">Sharjah</option>
              <option value="ajman">Ajman</option>
              <option value="ras_al_khaimah">Ras Al Khaimah</option>
              <option value="fujairah">Fujairah</option>
              <option value="umm_al_quwain">Umm Al Quwain</option>
            </select>
          </div>
          <div>
            <input
              name="phone"
              value={formData.phone}
              placeholder="Phone"
              onChange={handleChange}
              className={styles.addns}
            />
          </div>

          {/* Phone validation hint — show only after user attempts to save */}
          {attemptedSubmit && !isPhoneValid(formData.phone) && (
            <div style={{ color: "#A83434", fontSize: 12, marginTop: 6 }}>
              Please enter a valid phone number (digits only, 7–15 characters).
            </div>
          )}

          <div className={styles.saveAsSection}>
            <p>Save As</p>

            <div className={styles.saveOptions}>
              {["Home", "Work", "Other"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddressLabel(type)}
                  className={`${styles.saveOption} ${
                    addressLabel === type ? styles.active : ""
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleSubmit}
            className={!isFormValid ? styles.disabledButton : ""}
          >
            Save Address Details
          </button>
        </div>
      </div>
    </div>
  );

  if (portalTarget) return ReactDOM.createPortal(overlayContent, portalTarget);
  return overlayContent;
};

export default AddNewAddress;

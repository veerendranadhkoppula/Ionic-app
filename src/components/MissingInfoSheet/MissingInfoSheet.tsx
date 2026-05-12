import React, { useState } from "react";
import styles from "./MissingInfoSheet.module.css";
import tokenStorage from "../../utils/tokenStorage";
import { saveUser, setCurrentUser, getCurrentUser } from "../../utils/authStorage";
import { API_BASE } from "../../utils/apiAuth";

interface Props {
  field: "email" | "phone";
  onClose: () => void;
  onSaved: () => void;
}

const MissingInfoSheet = ({ field, onClose, onSaved }: Props) => {
  const [value, setValue] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleConfirm = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Prepend UAE country code for phone before saving
    const finalValue = field === "phone" ? `+971${trimmed}` : trimmed;

    setIsLoading(true);
    setError(null);

    try {
      const userId = await tokenStorage.getItem("user_id");
      const token = await tokenStorage.getToken();
      if (!userId || !token) throw new Error("Session expired. Please log in again.");

      const body = field === "email" ? { email: finalValue } : { phone: finalValue };

      const res = await fetch(
        `${API_BASE.replace("/api", "")}/api/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) throw new Error("Could not save. Please try again.");

      const data = await res.json();
      const serverData = data?.doc || data;

      // Directly persist to tokenStorage so the next check in handlePay/handleProceed
      // reads the fresh value immediately (saveUser is fire-and-forget async).
      const storageKey = field === "email" ? "user_email" : "user_mobile";
      await tokenStorage.setItem(storageKey, finalValue);

      const currentUser = getCurrentUser();
      const updatedUser = {
        id: serverData?.id ?? currentUser?.id,
        email: serverData?.email ?? currentUser?.email ?? "",
        firstName: serverData?.firstName ?? currentUser?.firstName,
        lastName: serverData?.lastName ?? currentUser?.lastName,
        mobile: serverData?.phone ?? currentUser?.mobile,
        gender: serverData?.gender ?? currentUser?.gender,
      };
      saveUser(updatedUser);
      setCurrentUser(updatedUser);

      setIsClosing(true);
      setTimeout(onSaved, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isEmail = field === "email";
  const title = isEmail ? "Add your email" : "Add your phone number";
  const subtitle = isEmail
    ? "Your email is required to complete your order."
    : "Your phone number is required so we can contact you about your order.";

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClose : ""}`}
      onClick={triggerClose}
    >
      <div
        className={`${styles.main} ${isClosing ? styles.close : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon — same SVG as AddBottomSheet */}
        <div className={styles.closeIcon} onClick={(e) => { e.stopPropagation(); triggerClose(); }}>
          <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
              fill="#4B3827"
            />
          </svg>
        </div>

        {/* Title + subtitle */}
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.divider} />

        {/* Input */}
        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>
            {isEmail ? "Email address" : "Phone number"}
          </label>
          {isEmail ? (
            <input
              className={styles.input}
              type="email"
              placeholder="e.g. yourname@email.com"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              autoFocus
            />
          ) : (
            <div className={styles.phoneRow}>
              <span className={styles.countryCode}>+971</span>
              <input
                className={styles.phoneInput}
                type="tel"
                inputMode="numeric"
                placeholder="50 000 0000"
                value={value}
                onChange={(e) => {
                  const numeric = e.target.value.replace(/\D/g, "");
                  setValue(numeric);
                  setError(null);
                }}
                autoFocus
              />
            </div>
          )}
          {error && <p className={styles.errorText}>{error}</p>}
        </div>

        {/* Confirm button */}
        <div className={styles.bottomSection}>
          <button
            className={`${styles.confirmBtn} ${(!value.trim() || isLoading) ? styles.confirmBtnDisabled : ""}`}
            disabled={!value.trim() || isLoading}
            onClick={handleConfirm}
          >
            {isLoading ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingInfoSheet;

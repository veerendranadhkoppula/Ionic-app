import React, { useState, useEffect } from "react";
import styles from "./FormSection.module.css";
import { IonInput } from "@ionic/react";
import useAuth from "../../../utils/useAuth";
import type { User } from "../../../utils/authStorage";
const submitContactForm = async (data: {
  fullName: string;
  email: string;
  phone: string;
  inquiryType: string;
  message: string;
}): Promise<unknown> => {
  // Log payload for debugging (kept minimal)
  try {
    console.info("Contact form: submitting", { fullName: data.fullName, email: data.email, inquiryType: data.inquiryType });
  } catch (err) {
    // ignore logging errors
    console.debug("Contact form: logging failed", err);
  }

  const res = await fetch("https://whitemantis-app.vercel.app/api/app-contact-form", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    // try to read response body for debugging
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch (err) {
      console.debug("Contact form: failed reading response body", err);
    }
    console.error("Contact form server error", { status: res.status, body: bodyText });
    // Some servers historically accept a plain string body without Content-Type.
    // Retry once using a raw body (no Content-Type) as a fallback to improve resilience.
    if (res.status === 400) {
      try {
        console.info("Contact form: retrying without Content-Type header as fallback");
        const retry = await fetch("https://whitemantis-app.vercel.app/api/app-contact-form", {
          method: "POST",
          body: JSON.stringify(data),
          redirect: "follow",
        });

        if (retry.ok) {
          try {
            return await retry.json();
          } catch (err) {
            console.debug("Contact form: retry succeeded but JSON parse failed", err);
            return {};
          }
        }

        let retryBody = "";
        try {
          retryBody = await retry.text();
        } catch (err) {
          console.debug("Contact form: failed reading retry response body", err);
        }
        console.error("Contact form retry failed", { status: retry.status, body: retryBody });
      } catch (err) {
        console.debug("Contact form: retry failed to send", err);
      }
    }

    throw new Error(`Failed to submit contact form: ${res.status} ${bodyText}`);
  }

  try {
    return await res.json();
  } catch (err) {
    // If server returned empty body but OK, return an empty object
    console.debug("Contact form: failed parsing JSON response", err);
    return {};
  }
};
const FormSection = () => {
  const mapInquiryType = (value: string) => {
  // Map visible labels to the exact backend option values configured in Payload CMS.
  const lookup: Record<string, string> = {
    "Order issue": "order_issue",
    "Payment or refund": "payment_refund",
    "Rewards & stamps": "rewards_stamps",
    "Barista selection": "barista_selection",
    "Pickup or timing": "pickup_timing",
    "Menu & availability": "menu_availability",
    "Other": "other",
  };

  if (value in lookup) return lookup[value];

  // Fallback: normalize label to a safe value
  return value.toLowerCase().replace(/&/g, "").replace(/\s+/g, "_");
};
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const { user, isLoggedIn } = useAuth();

  // Prefill name/email/phone for logged-in users if available. Do not
  // overwrite user-edited values; only populate when the input is empty.
  useEffect(() => {
    if (!isLoggedIn || !user) return;
    try {
      const u = user as unknown as User;
      const first = u.firstName || undefined;
      const last = u.lastName || undefined;
      const nameFromParts = first || last ? `${first ?? ""}${last ? " " + last : ""}`.trim() : u.name || "";

      if (!fullName && nameFromParts) setFullName(nameFromParts);
      if (!email && u.email) setEmail(u.email);
      // authStorage stores phone as `mobile`. Some older records may have `phone` key.
      const maybePhone = (user as unknown as Record<string, unknown>)['mobile'] as string | undefined
        || (user as unknown as Record<string, unknown>)['phone'] as string | undefined;
      if (!phone && maybePhone) setPhone(maybePhone);
    } catch {
      // ignore errors and leave fields empty
    }
}, [isLoggedIn, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = [
    "Order issue",
    "Payment or refund",
    "Rewards & stamps",
    "Barista selection",
    "Pickup or timing",
    "Menu & availability",
    "Other",
  ];

  const isFormValid = fullName && email && phone && selected && message;
  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setSelected("");
    setMessage("");
    setOpen(false);
  };

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.Top}>
          <div className={styles.Heading}>
            <h3>Send us a message</h3>
          </div>

          <div className={styles.Form}>
            <div className={styles.InputGroup}>
              <IonInput
                type="text"
                placeholder="Full name"
                value={fullName}
                onIonInput={(e) => setFullName(e.detail.value ?? "")}
                className={styles.IonInput}
              />
            </div>

            <div className={styles.Row}>
              <div className={styles.InputGroup}>
                <IonInput
                  type="email"
                  placeholder="Email"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value ?? "")}
                  className={styles.IonInput}
                />
              </div>

              <div className={styles.InputGroup}>
                <IonInput
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onIonInput={(e) => setPhone(e.detail.value ?? "")}
                  className={styles.IonInput}
                />
              </div>
            </div>

            <div className={styles.DropdownWrapper}>
              <div
                className={styles.DropdownHeader}
                onClick={() => setOpen(!open)}
              >
                <span
                  className={
                    selected ? styles.SelectedText : styles.PlaceholderText
                  }
                >
                  {selected || "Please select an inquiry type"}
                </span>

                <svg
                  className={`${styles.Arrow} ${open ? styles.Rotate : ""}`}
                  width="35"
                  height="35"
                  viewBox="0 0 35 35"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 14.5L18.5 20L24 14.5"
                    stroke="#4B3827"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div
                className={`${styles.DropdownList} ${open ? styles.Open : ""}`}
              >
                {options.map((item) => (
                  <div
                    key={item}
                    className={styles.Option}
                    onClick={() => {
                      setSelected(item);
                      setOpen(false);
                    }}
                  >
                    <span>{item}</span>
                    <span className={styles.Radio} />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.TextAreaGroup}>
              <textarea
                placeholder="Tell us how we can help"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.Bottom}>
          <button
            className={styles.conform}
            disabled={!isFormValid}
            onClick={async () => {
  try {
    await submitContactForm({
      fullName,
      email,
      phone,
      inquiryType: mapInquiryType(selected),
      message,
    });

    setShowSuccess(true);
  } catch (err) {
    console.error("Contact form failed:", err);
  }
}}
          >
            Confirm
          </button>
        </div>
      </div>
      {showSuccess && (
        <div className={styles.Overlay} onClick={() => setShowSuccess(false)}>
          <div
            className={styles.SuccessPopup}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.IconWrapper}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21.8006 9.9995C22.2573 12.2408 21.9318 14.5709 20.8785 16.6013C19.8251 18.6317 18.1075 20.2396 16.0121 21.1568C13.9167 22.0741 11.5702 22.2453 9.36391 21.6419C7.15758 21.0385 5.2248 19.6969 3.88789 17.8409C2.55097 15.9849 1.89073 13.7267 2.01728 11.4429C2.14382 9.15904 3.04949 6.98759 4.58326 5.29067C6.11703 3.59375 8.18619 2.47393 10.4457 2.11795C12.7052 1.76198 15.0184 2.19136 16.9996 3.3345M8.99961 10.9995L11.9996 13.9995L21.9996 3.9995"
                  stroke="#6C7A5F"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3>Message sent</h3>
            <p>
              Thanks for reaching out. Our team has received your message and
              will get back to you shortly.
            </p>

            <button
              className={styles.DoneButton}
              onClick={() => {
                resetForm();
                setShowSuccess(false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormSection;

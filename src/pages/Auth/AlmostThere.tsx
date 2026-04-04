// eslint: keep file lint-clean; avoid disabling rules globally
import React, { useState } from "react";
import { IonPage, IonContent, IonText } from "@ionic/react";
import { useLocation } from "react-router-dom";
import { useIonRouter } from "@ionic/react";
import styles from "./AlmostThere.module.css";
import logo from "./Logo.png";
import uaeFlag from "./uae.png";
import {
  saveUser,
  setCurrentUser,
  getCurrentUser,
} from "../../utils/authStorage";
import { validateReferralCode as validateReferralCodeApi } from "../../api/apiReferrals";

import FullScreenLoader from "../../components/FullScreenLoader";

import * as api from "../../utils/apiAuth";
import tokenStorage from "../../utils/tokenStorage";

const AlmostThere: React.FC = () => {
  const router = useIonRouter();
  const location = useLocation<{ email?: string; firstName?: string; lastName?: string }>();

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

  const stateEmail: string | undefined = location.state?.email;
  const queryEmail =
    new URLSearchParams(location.search).get("email") || undefined;
  const [email, setEmail] = React.useState<string | undefined>(
    stateEmail || queryEmail,
  );

  const guardRanRef = React.useRef(false);
  React.useEffect(() => {
    if (guardRanRef.current) return;
    guardRanRef.current = true;

    (async () => {
      const stateEmail = location.state?.email as string | undefined;
      const queryEmail =
        new URLSearchParams(location.search).get("email") || undefined;
      const initialEmail = stateEmail || queryEmail;

      if (initialEmail) return;

      try {
        const navState = location.state as
          | { encryptedEmail?: string }
          | undefined;
        const encryptedFromState = navState?.encryptedEmail;
        const queryEnc =
          new URLSearchParams(location.search).get("encryptedEmail") ||
          undefined;

        if (encryptedFromState || queryEnc) return;

        const maxAttempts = 10;
        const delayMs = 120;
        let ok = false;

        for (let i = 0; i < maxAttempts; i++) {
          try {
            const storedEncrypted = await tokenStorage.getEncryptedEmail();
            if (storedEncrypted) {
              ok = true;
              break;
            }
          } catch {
            // ignore persistence errors
          }
          await new Promise((r) => setTimeout(r, delayMs));
        }

        if (ok) return;
      } catch (err) {
        console.debug("[AlmostThere] guard check failed", err);
      }

      console.debug(
        "[AlmostThere] initial mount guard: no email or encryptedEmail, redirecting to /auth",
        { state: location.state, search: location.search },
      );
      router.push("/auth");
    })();
  }, [router, location.search, location.state]);
 
  const [firstName, setFirstName] = useState(location.state?.firstName ?? "");
  const [lastName, setLastName] = useState(location.state?.lastName ?? "");

 
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const validateTimerRef = React.useRef<number | null>(null);
  const validateSeqRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Debounce validation: when user stops typing for 700ms, validate automatically.
  React.useEffect(() => {
    // Clear previous timer
    if (validateTimerRef.current) {
      window.clearTimeout(validateTimerRef.current);
      validateTimerRef.current = null;
    }

    if (!referralCode || referralCode.trim().length === 0) {
      // Clear messages when input is empty
      setReferralMessage(null);
      setReferralError(null);
      return;
    }

    // Schedule validation
    validateTimerRef.current = window.setTimeout(async () => {
      const seq = ++validateSeqRef.current;
      try {
        const result = await validateReferralCodeApi(referralCode.trim());
        // Ignore stale responses
        if (seq !== validateSeqRef.current) return;
        if (!mountedRef.current) return;

        if (result.valid) {
          setReferralMessage("Referral code applied successfully!");
          setReferralError(null);
        } else if (result.unavailable) {
          setReferralMessage("Unable to validate referral code right now.");
          setReferralError(null);
        } else {
          setReferralError(result.message || "Invalid referral code.");
          setReferralMessage(null);
        }
      } catch (err) {
        console.warn("Referral validation failed", err);
        if (!mountedRef.current) return;
        setReferralMessage("Unable to validate referral code right now.");
        setReferralError(null);
      }
    }, 700);

    // cleanup on change/unmount
    return () => {
      if (validateTimerRef.current) {
        window.clearTimeout(validateTimerRef.current);
        validateTimerRef.current = null;
      }
    };
  }, [referralCode]);

  // Prefill decrypted email from server if encryptedEmail is available
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const navState = location.state as { encryptedEmail?: string };
        const enc =
          navState?.encryptedEmail || (await tokenStorage.getEncryptedEmail());
        if (!enc) return;

        const resp = await api.prefillEmail(enc);
        if (mounted && resp?.email) setEmail(resp.email);

        const storedFirst = await tokenStorage.getItem("user_firstName");
        const storedLast = await tokenStorage.getItem("user_lastName");

        if (mounted) {
          if (storedFirst) setFirstName(storedFirst);
          if (storedLast) setLastName(storedLast);
        }
      } catch (err) {
        console.debug("[AlmostThere] prefill failed", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [location.state]);
const onSubmit = async () => {
  setError(null);

  if (!firstName || !lastName || !mobile) {
    setError("First name, last name and mobile are required");
    return;
  }

  if (!email) {
    setError("Email missing. Please login again.");
    return;
  }

  try {
    setLoading(true);

    const token = await tokenStorage.getToken();
    const current = getCurrentUser();
    const userId = current?.id;

    const updatedUser = {
      id: userId,
      email: email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: mobile.trim(),
      gender,
    };


    if (userId && token) {
      try {
        const url = `${api.API_BASE}/users/${encodeURIComponent(userId)}`;
        const body: Record<string, unknown> = {
          firstName,
          lastName,
          phone: mobile,
          gender,
        };
        if (referralCode && referralCode.trim().length > 0) {
          body.referralCodeInput = referralCode.trim();
        }

        const res = await authFetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        // Handle server-side validation feedback for referral codes
        if (!res.ok) {
          try {
            const json = await res.json().catch(() => ({}));
            // Payload returns validation errors in `errors` array
            if (json && Array.isArray(json.errors) && json.errors.length > 0) {
              const found = json.errors.find((e: { path?: string; message?: string }) => e.path === 'referralCodeInput' || e.path === 'referralCode');
              const fallback = json.errors[0]?.message || 'Validation failed';
              if (found) {
                setReferralError(found.message || fallback);
              } else {
                // general error — show under form
                setError(fallback);
              }
            } else {
              setError('Failed to update profile.');
            }
          } catch (err) {
            console.warn('Failed to parse error response', err);
            setError('Failed to update profile.');
          }
        } else {
          // success — if referral code was included, show success message
          if (referralCode && referralCode.trim().length > 0) {
            setReferralMessage('Referral code applied successfully!');
          }
        }
      } catch (err) {
        console.warn("Server update failed, continuing locally", err);
      }
    }


    saveUser(updatedUser);
    setCurrentUser(updatedUser);

    console.log("User saved correctly:", updatedUser);

    router.push("/home");
  } catch (err) {
    console.error("Submit failed", err);
    setError("Unable to complete signup");
  } finally {
    setLoading(false);
  }
};

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className={styles.main}>
          <div className={styles.MainConatiner}>
            <div className={styles.Top}></div>

            <div className={styles.Bottom}>
              <div className={styles.BottomTop}>
                <div className={styles.BottomTopOne}>
                  <img src={logo} alt="White Mantis Logo" />
                </div>

                <div className={styles.BottomTopTwo}>
                  <h3>Almost there!</h3>
                  <p>Tell us a bit about you to complete your profile.</p>
                </div>

                <div className={styles.BottomTopForm}>
                 <input
  type="text"
  value={email ?? ""}
  readOnly
  className={styles.InputBox}
/>
                  <div className={styles.NameRow}>
                  <input
  type="text"
  placeholder="First Name *"
  className={styles.InputBox}
  value={firstName}
  onChange={(e) => setFirstName(e.target.value)}
/>
<input
  type="text"
  placeholder="Last Name *"
  className={styles.InputBox}
  value={lastName}
  onChange={(e) => setLastName(e.target.value)}
/>
                  </div>

                  <div className={styles.PhoneRow}>
                    <div className={styles.CountryStatic}>
                      <img src={uaeFlag} alt="UAE" className={styles.Flag} />
                      <span className={styles.Code}>+971</span>
                    </div>
<input
  type="tel"
  placeholder="Mobile Number *"
  className={styles.PhoneInput}
  value={mobile}
  onChange={(e) => setMobile(e.target.value)}
/>
                  </div>

                  <div className={styles.SelectWrapper}>
                    <select
                      className={styles.SelectBox}
                      value={gender}
                      onFocus={() => setIsGenderOpen(true)}
                      onBlur={() => setIsGenderOpen(false)}
                      onChange={(e) => {
                        setGender(e.target.value);
                        setIsGenderOpen(false);
                      }}
                    >
                      <option value="">Gender (optional)</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>

                    <span
                      className={`${styles.SelectArrow} ${
                        isGenderOpen ? styles.ArrowUp : ""
                      }`}
                    >
                      <svg
                        width="16"
                        height="7"
                        viewBox="0 0 16 7"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14.1956 0.138636L7.84557 5.58064C7.755 5.6581 7.63974 5.70067 7.52057 5.70067C7.40139 5.70067 7.28613 5.6581 7.19557 5.58064L0.845566 0.138636C0.796462 0.0916793 0.738303 0.0552221 0.67464 0.0314912C0.610977 0.00776021 0.543145 -0.00274712 0.475286 0.000611192C0.407427 0.0039695 0.340963 0.0211225 0.279954 0.0510234C0.218945 0.0809243 0.16467 0.122946 0.120442 0.174522C0.0762147 0.226098 0.0429629 0.286147 0.0227164 0.351003C0.00246989 0.415858 -0.00434634 0.48416 0.00268399 0.551738C0.00971432 0.619315 0.0304439 0.684752 0.0636066 0.744051C0.0967694 0.80335 0.14167 0.855268 0.195567 0.896636L6.54457 6.33964C6.81558 6.5743 7.16207 6.70347 7.52057 6.70347C7.87906 6.70347 8.22555 6.5743 8.49657 6.33964L14.8456 0.896636C14.8995 0.855268 14.9444 0.80335 14.9775 0.744051C15.0107 0.684752 15.0314 0.619315 15.0384 0.551738C15.0455 0.48416 15.0387 0.415858 15.0184 0.351003C14.9982 0.286147 14.9649 0.226098 14.9207 0.174522C14.8765 0.122946 14.8222 0.0809243 14.7612 0.0510234C14.7002 0.0211225 14.6337 0.0039695 14.5658 0.000611192C14.498 -0.00274712 14.4302 0.00776021 14.3665 0.0314912C14.3028 0.0552221 14.2447 0.0916793 14.1956 0.138636Z"
                          fill="#4B3827"
                        />
                      </svg>
                    </span>
                  </div>

                    {/* Referral code input — optional, appears like the other inputs */}
                   <input
  type="text"
  placeholder="Have a referral code?"
  className={styles.ReferralInput}
  value={referralCode}
  onChange={(e) => {
    setReferralCode(e.target.value);
    setReferralMessage(null);
    setReferralError(null);
  }}
  onBlur={async () => {
    try {
      if (!referralCode || referralCode.trim().length === 0) return;
      if (validateTimerRef.current) {
        window.clearTimeout(validateTimerRef.current);
        validateTimerRef.current = null;
      }
      const result = await validateReferralCodeApi(referralCode.trim());
      if (result.valid) {
        setReferralMessage("Referral code applied successfully!");
        setReferralError(null);
      } else if (result.unavailable) {
        setReferralMessage("Unable to validate referral code right now.");
        setReferralError(null);
      } else {
        setReferralError(result.message || "Invalid referral code.");
        setReferralMessage(null);
      }
    } catch (err) {
      console.warn("Referral validation failed", err);
      setReferralMessage("Unable to validate referral code right now.");
      setReferralError(null);
    }
  }}
/>
                   

                    {referralMessage && (
                      <div className={styles.ReferralMessage}>{referralMessage}</div>
                    )}

                    {referralError && (
                      <div className={styles.ReferralError}>{referralError}</div>
                    )}

                  {error && (
                    <IonText color="danger">
                      <p style={{ marginTop: 8 }}>{error}</p>
                    </IonText>
                  )}
                </div>
              </div>

              <div className={styles.BottomBottom}>
                <button
                  className={`${styles.continue} ${
                    firstName && lastName && mobile ? styles.continueActive : ""
                  }`}
                  onClick={onSubmit}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
      {loading && <FullScreenLoader />}
    </IonPage>
  );
};

export default AlmostThere;

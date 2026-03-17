/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { IonPage, IonContent, IonText } from "@ionic/react";

import { useHistory, useLocation } from "react-router-dom";
import styles from "./Otp.module.css";
import logo from "./Logo.png";
import FullScreenLoader from "../../components/FullScreenLoader";

import * as api from "../../utils/apiAuth";
import tokenStorage from "../../utils/tokenStorage";
import { saveUser, setCurrentUser } from "../../utils/authStorage";

const Otp: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ email?: string; mode?: "login" | "signup" }>();
  const state = location.state || {};
  const params = new URLSearchParams(location.search);
  const queryEmail = params.get("email") || undefined;
  const email: string | undefined = (state as any).email || queryEmail;

  const guardRanRef = React.useRef(false);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (guardRanRef.current) return;
    guardRanRef.current = true;

    (async () => {
      const stateEmail = (location.state as any)?.email;
      const queryEmail =
        new URLSearchParams(location.search).get("email") || undefined;

      if (stateEmail || queryEmail) return;

      try {
        for (let i = 0; i < 10; i++) {
          const storedEncrypted = await tokenStorage.getEncryptedEmail();
          if (storedEncrypted) return;
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch {
        // ignore persistence errors
      }

      history.replace("/auth");
    })();
  }, [history, location.search, location.state]);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [encryptedEmail, setEncryptedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resending, setResending] = useState(false);

 const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const onVerify = async () => {
    setError(null);
    if (otp.length < 4) {
      setError("Enter the 4-digit code");
      return;
    }

    setLoading(true);
    try {
      const currentEncrypted =
        encryptedEmail || (await tokenStorage.getEncryptedEmail());

      if (!currentEncrypted) {
        setError("Missing OTP context. Please restart login flow.");
        return;
      }

      const resp: any = await api.verifyOtp(currentEncrypted, otp);

      if (resp?.user) {
        const currentUser = {
          id: resp.user.id,
          email: resp.user.email,
          firstName: resp.user.firstName,
          lastName: resp.user.lastName,
          mobile: resp.user.mobile,
          gender: resp.user.gender,
        };

        saveUser(currentUser as any);
        setCurrentUser(currentUser as any);
      }

      if (!resp.isNewUser) {
        history.replace("/home");
      } else {
        history.replace(
          `/auth/almost?email=${encodeURIComponent(email || "")}`,
          {
            email,
            encryptedEmail: currentEncrypted,
          },
        );
      }
    } catch {
      setError("Invalid code");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    (async () => {
      await tokenStorage.removeItem("otp_lock_until");
      await tokenStorage.removeItem("otp_resend_attempts");

      const navState = location.state as { encryptedEmail?: string };
      const ee =
        navState?.encryptedEmail ||
        new URLSearchParams(location.search).get("encryptedEmail") ||
        (await tokenStorage.getEncryptedEmail());

      if (!ee) return;

      setEncryptedEmail(ee);

      const now = Math.floor(Date.now() / 1000);
      await tokenStorage.setItem("otp_cooldown_until", String(now + 60));
      setResendCooldown(60);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    })();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [location.state, location.search]);

  const onResend = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    try {
      const ee = encryptedEmail || (await tokenStorage.getEncryptedEmail());
      if (!ee) {
        setError("Missing email context.");
        return;
      }

      await api.sendOtp(ee);

      const now = Math.floor(Date.now() / 1000);
      await tokenStorage.setItem("otp_cooldown_until", String(now + 60));
      setResendCooldown(60);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("Unable to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const formatSeconds = (s: number) => {
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss}`;
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
                  <div className={styles.VerifyText}>
                    <h3>Verify your email address</h3>
                  </div>
                  <div className={styles.VerifyInfo}>
                    <div className={styles.VerifyInfoText}>
                      <p>Enter the 4-digit code sent to</p>
                    </div>
                    <div
                      className={styles.VerifyInfoEmail}
                      onClick={() => history.replace("/auth")}
                    >
                      <p>{email}</p>
                      <button
                        type="button"
                        className={styles.EditEmailBtn}
                        onClick={() => history.replace("/auth")}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6 1.5H2.5C2.23478 1.5 1.98043 1.60536 1.79289 1.79289C1.60536 1.98043 1.5 2.23478 1.5 2.5V9.5C1.5 9.76522 1.60536 10.0196 1.79289 10.2071C1.98043 10.3946 2.23478 10.5 2.5 10.5H9.5C9.76522 10.5 10.0196 10.3946 10.2071 10.2071C10.3946 10.0196 10.5 9.76522 10.5 9.5V6"
                            stroke="#4B3827"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M9.18755 1.31261C9.38646 1.1137 9.65624 1.00195 9.93755 1.00195C10.2189 1.00195 10.4886 1.1137 10.6875 1.31261C10.8865 1.51153 10.9982 1.78131 10.9982 2.06261C10.9982 2.34392 10.8865 2.6137 10.6875 2.81261L6.18105 7.31961C6.06232 7.43824 5.91565 7.52507 5.75455 7.57211L4.31805 7.99211C4.27502 8.00466 4.22942 8.00541 4.186 7.99429C4.14259 7.98317 4.10296 7.96058 4.07127 7.92889C4.03958 7.8972 4.01699 7.85757 4.00587 7.81416C3.99475 7.77074 3.9955 7.72514 4.00805 7.68211L4.42805 6.24561C4.47531 6.08464 4.56231 5.93814 4.68105 5.81961L9.18755 1.31261Z"
                            stroke="#4B3827"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.BottomTopThree}>
                  <div className={styles.OTPWrapper}>
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
                      ref={(el) => {
  inputRefs.current[i] = el;
}}
                        type="tel"
                        inputMode="numeric"
                        maxLength={1}
                        className={`${styles.OTPInput} ${
                          otp[i] ? styles.activeOTP : ""
                        }`}
                        value={otp[i] || ""}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(-1);
                          const newOtp =
                            otp.substring(0, i) + val + otp.substring(i + 1);
                          setOtp(newOtp);
                          if (val && inputRefs.current[i + 1]) {
                            inputRefs.current[i + 1]?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otp[i]) {
                            inputRefs.current[i - 1]?.focus();
                          }
                        }}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  {error && (
                    <IonText color="danger">
                      <p className={styles.ErrorText}>{error}</p>
                    </IonText>
                  )}
                </div>
              </div>

              <div className={styles.BottomBottom}>
                <div className={styles.BottomBottomOne}>
                  <button
                    className={`${styles.twoConfirm} ${
                      otp.length === 4 ? styles.twoConfirmActive : ""
                    }`}
                    onClick={onVerify}
                    disabled={loading}
                  >
                    Confirm
                  </button>
                </div>

                <div className={styles.BottomBottomTwo}>
                  <h5>Didn’t receive it? Check spam or</h5>
                  <p>
                    <button
                      className={styles.ResendSpam}
                      onClick={onResend}
                      disabled={resendCooldown > 0 || loading || resending}
                    >
                      Resend OTP
                    </button>

                    {resendCooldown > 0 && (
                      <span style={{ marginLeft: 8 }}>
                        ({formatSeconds(resendCooldown)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>

      {loading && <FullScreenLoader />}
    </IonPage>
  );
};

export default Otp;

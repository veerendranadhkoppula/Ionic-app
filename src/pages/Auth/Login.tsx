/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { IonPage, IonContent } from "@ionic/react";

import { useHistory } from "react-router-dom";
import styles from "./Login.module.css";
import logo from "./Logo.png";
import tokenStorage from "../../utils/tokenStorage";
// import * as api from "../../utils/apiAuth";
import { saveUser, setCurrentUser } from "../../utils/authStorage";
import { useEffect, useRef } from "react";
import { useIonRouter } from "@ionic/react";
import { App } from "@capacitor/app";
import FullScreenLoader from "../../components/FullScreenLoader";

import { sendOtp } from "../../utils/apiAuth";

import { setGuest } from "../../utils/authStorage";
import GoogleLoginButton from "../../components/GoogleLoginButton";
import { postGoogleAuth } from "../../api/apiGoogle";

const Login: React.FC = () => {
  const history = useHistory();
  const ionRouter = useIonRouter();
  const listenerRef = useRef<any>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value.trim());
  };

  const onContinue = async () => {
    setError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter an email");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { encryptedEmail } = await sendOtp(trimmedEmail);

      history.replace(`/auth/otp?email=${encodeURIComponent(trimmedEmail)}`, {
        email: trimmedEmail,
        encryptedEmail,
      });
    } catch (err) {
      console.error("[Login] OTP send failed", err);
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const setup = async () => {
      listenerRef.current = await App.addListener("backButton", () => {
        if (
          ionRouter.routeInfo.pathname === "/auth/login" ||
          ionRouter.routeInfo.pathname === "/login"
        ) {
          App.exitApp();
        }
      });
    };
    setup();
    return () => {
      listenerRef.current?.remove();
    };
  }, [ionRouter]);
  const handleLoginSuccess = async (googleUser: any) => {
    try {
      setLoading(true);

      const idToken = googleUser?.idToken;
      if (!idToken) throw new Error("No Google ID token received");

      const authResult = await postGoogleAuth(idToken);

      await tokenStorage.setToken(authResult.token);

      const u = authResult.user;
      const userToSave = {
        id: String(u.id ?? ""),
        email: u.email,
        firstName: u.firstName ?? (u as any).given_name ?? "",
        lastName: u.lastName ?? (u as any).family_name ?? "",
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      };
      saveUser(userToSave as any);
      setCurrentUser(userToSave as any);

      const hasCompletedProfile =
        !authResult.isNewUser &&
        !!u.firstName &&
        String(u.firstName).trim().length > 0;

      if (!hasCompletedProfile) {
        history.replace("/auth/almost", {
          email: u.email,
          firstName: String(u.firstName ?? (u as any).given_name ?? "").trim(),
          lastName: String(u.lastName ?? (u as any).family_name ?? "").trim(),
        });
      } else {
        history.replace("/home");
      }
    } catch (error) {
      console.error("Google login failed:", error);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleLoginError = (err: any) => {
    console.error("Login failed!", err);
  };
const onSkip = () => {
  setGuest();

  localStorage.setItem("auth_mode", "guest");

  window.dispatchEvent(new Event("auth-changed"));

  history.replace("/home");
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
                  <div className={styles.One}>
                    <div className={styles.OneBottom}>
                      <img
                        src={logo}
                        alt="White Mantis Logo"
                        className={styles.Logo}
                      />
                    </div>
                    <div className={styles.OneTop}>
                      <button className={styles.skip} onClick={onSkip}>
                        Skip
                      </button>
                    </div>
                  </div>

                  <div className={styles.Two}>
                    <h3>Login / Signup</h3>
                    <p>We’ll send a one-time code to verify your account.</p>
                  </div>

                  <div className={styles.Three}>
                    <input
                      type="email"
                      placeholder="Email Address"
                      className={`${styles.InputBox} ${
                        email.trim() ? styles.hasValue : ""
                      }`}
                      value={email}
                      onChange={(e) => {
                        const value = e.target.value; // ← CORRECT for regular input
                        setEmail(value);
                        setIsEmailValid(isValidEmail(value.trim()));
                        if (error) setError(null);
                      }}
                    />
                  </div>

                  {error && <div className={styles.ErrorText}>{error}</div>}
                </div>
                <div className={styles.BottomTopTwo}>
                  <div className={styles.BottomTopTwoTop}>
                    <p>
                      By continuing, you agree to our{" "}
                      <span
                        className={styles.SpanText}
                        role="button"
                        tabIndex={0}
                        onClick={() => history.push("/privacy")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            history.push("/privacy-policy");
                          }
                        }}
                      >
                        Terms & Privacy Policy
                      </span>
                    </p>
                  </div>

                  <div className={styles.BottomTopTwoBottom}>
                    <button
                      className={`${styles.continue} ${
                        isEmailValid ? styles.continueActive : ""
                      }`}
                      onClick={onContinue}
                      disabled={!isValidEmail(email.trim()) || loading}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.BottomBottom}>
                <div className={styles.BottomBottomOne}>
                  <div className={styles.line}></div>
                  <p>Or continue with</p>
                  <div className={styles.line}></div>
                </div>
                <div className={styles.BottomBottomTwo}>
                  <GoogleLoginButton
                    onSuccess={handleLoginSuccess}
                    onFailure={handleLoginError}
                  />
                  {/* <button
                    className={styles.google}
                    onClick={async () => {
                      // Minimal Google flow: prompt in web for an email (dev). In native apps, integrate Capacitor Google plugin.
                      try {
                        const gEmail = window.prompt(
                          "Enter Google account email (dev fallback)"
                        );
                        if (!gEmail) return;
                        // directly get JWT for Google email
                        const jwtResp = await api.getJwt(gEmail);
                        await tokenStorage.setToken(jwtResp.token);
                        // store encryptedEmail via signup endpoint (server should return encryptedEmail)
                        const signupResp = await api.signup(gEmail);
                        await tokenStorage.setEncryptedEmail(
                          signupResp.encryptedEmail
                        );
                        // Ensure UI reflects authenticated state by creating a minimal currentUser
                        try {
                          // Persist a minimal user record so authStorage and UI stay in sync
                          const minimal = { email: gEmail };
                          // saveUser is synchronous and will persist to localStorage
                          const { saveUser, setCurrentUser } = await import(
                            "../../utils/authStorage"
                          );
                          saveUser(minimal);
                          setCurrentUser(minimal);
                        } catch (e) {
                          // ignore persistence errors but keep the token
                          console.debug(
                            "[Login] google: failed to persist user",
                            e
                          );
                        }

                        history.replace("/home");
                      } catch (err) {
                        console.error("[Login] google login failed", err);
                      }
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g clipPath="url(#clip0_1354_2973)">
                        <path
                          d="M19.9905 10.1868C19.9905 9.36743 19.9224 8.76949 19.7752 8.14941H10.1992V11.8477H15.8201C15.7068 12.7668 15.0948 14.1509 13.7349 15.081L13.7159 15.2048L16.7436 17.4967L16.9534 17.5171C18.8798 15.7787 19.9905 13.2208 19.9905 10.1868Z"
                          fill="#4285F4"
                        />
                        <path
                          d="M10.1992 19.9312C12.953 19.9312 15.2648 19.0453 16.9534 17.5173L13.7349 15.0812C12.8737 15.6681 11.7177 16.0777 10.1992 16.0777C7.50211 16.0777 5.21297 14.3393 4.39695 11.9365L4.27734 11.9464L1.12906 14.3271L1.08789 14.439C2.76508 17.6944 6.21016 19.9312 10.1992 19.9312Z"
                          fill="#34A853"
                        />
                        <path
                          d="M4.39695 11.9363C4.18164 11.3163 4.05703 10.6518 4.05703 9.96534C4.05703 9.27878 4.18164 8.61443 4.38562 7.99435L4.37992 7.86229L1.19219 5.44336L1.08789 5.49183C0.396641 6.84275 0 8.35977 0 9.96534C0 11.5709 0.396641 13.0879 1.08789 14.4388L4.39695 11.9363Z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M10.1992 3.85336C12.1144 3.85336 13.4063 4.66168 14.1429 5.33717L17.0213 2.59107C15.2535 0.985496 12.953 0 10.1992 0C6.21016 0 2.76508 2.23672 1.08789 5.49214L4.38563 7.99466C5.21297 5.59183 7.50211 3.85336 10.1992 3.85336Z"
                          fill="#EB4335"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_1354_2973">
                          <rect width="20" height="20" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                    
                  </button> */}
                  {/* <button className={styles.apple}>
                    <svg
                      width="19"
                      height="24"
                      viewBox="0 0 19 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.7324 21.0024C15.7969 22.4906 14.8051 23.9428 13.2948 23.9668C11.7845 24.0028 11.2998 23.0186 9.58663 23.0186C7.86217 23.0186 7.33243 23.9428 5.90102 24.0028C4.42452 24.0628 3.3087 22.4186 2.36193 20.9664C0.434598 18.0021 -1.0419 12.5414 0.941791 8.86902C1.92237 7.04481 3.68064 5.89268 5.58543 5.85667C7.02812 5.83267 8.40318 6.90079 9.29358 6.90079C10.1727 6.90079 11.8408 5.61665 13.5878 5.80867C14.3204 5.84467 16.3718 6.1207 17.6905 8.18494C17.589 8.25695 15.2447 9.72112 15.2672 12.7575C15.301 16.3819 18.254 17.594 18.2878 17.606C18.254 17.69 17.8144 19.3342 16.7324 21.0024ZM10.2967 1.80021C11.1195 0.804092 12.4833 0.0480055 13.6104 0C13.7569 1.40416 13.2272 2.82032 12.4382 3.82844C11.6605 4.84856 10.3756 5.64065 9.11325 5.53264C8.94418 4.15248 9.57536 2.71231 10.2967 1.80021Z"
                        fill="black"
                      />
                    </svg>

                    <span>Apple</span>
                  </button>
                  <button className={styles.samsung}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g clipPath="url(#clip0_1450_7526)">
                        <path
                          d="M10.6027 0H7.39726C3.31187 0 0 3.31187 0 7.39726V10.6027C0 14.6881 3.31187 18 7.39726 18H10.6027C14.6881 18 18 14.6881 18 10.6027V7.39726C18 3.31187 14.6881 0 10.6027 0Z"
                          fill="#1E4BC6"
                        />
                        <path
                          d="M14.7945 8.9996C14.7945 5.79937 12.2002 3.20508 8.99996 3.20508C5.79974 3.20508 3.20544 5.79937 3.20544 8.9996C3.20544 12.1998 5.79974 14.7941 8.99996 14.7941C12.2002 14.7941 14.7945 12.1998 14.7945 8.9996Z"
                          fill="white"
                        />
                        <path
                          d="M10.3243 6.65792C10.3243 5.90893 9.71709 5.30176 8.9681 5.30176C8.21911 5.30176 7.61194 5.90893 7.61194 6.65792C7.61194 7.40691 8.21911 8.01409 8.9681 8.01409C9.71709 8.01409 10.3243 7.40691 10.3243 6.65792Z"
                          fill="#6D90FF"
                        />
                        <path
                          d="M8.96368 8.75391C10.4338 8.75391 11.6681 9.76303 12.012 11.1264C11.4046 12.0664 10.269 12.6991 8.96813 12.6991C7.66264 12.6991 6.52366 12.0619 5.91785 11.1164C6.26526 9.7581 7.49714 8.75391 8.96368 8.75391Z"
                          fill="#1E4BC6"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_1450_7526">
                          <rect width="18" height="18" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>

                    <span>Samsung</span>
                  </button> */}
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

export default Login;

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
import AppleLoginButton from "../../components/AppleLoginButton";
import { postAppleAuth } from "../../api/apiApple";
import MissingInfoSheet from "../../components/MissingInfoSheet/MissingInfoSheet";

const Login: React.FC = () => {
  const history = useHistory();
  const ionRouter = useIonRouter();
  const listenerRef = useRef<any>(null);
  const appleDeepLinkRef = useRef<any>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [showAppleEmailSheet, setShowAppleEmailSheet] = useState(false);
  const [pendingAppleResult, setPendingAppleResult] = useState<any>(null);

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

  useEffect(() => {
    App.addListener("appUrlOpen", async (event) => {
      if (!event.url.includes("://apple-auth")) return;
      try {
        const url = new URL(event.url);
        const token = url.searchParams.get("token");
        if (!token) return;
        const firstName = url.searchParams.get("firstName") || "";
        const lastName = url.searchParams.get("lastName") || "";
        await handleAppleSuccess({
          idToken: token,
          profile: { givenName: firstName, familyName: lastName },
        });
      } catch (e) {
        console.error("[AppleDeepLink] Failed to handle deep link", e);
      }
    }).then((h) => { appleDeepLinkRef.current = h; });
    return () => { appleDeepLinkRef.current?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  const navigateAfterApple = (authResult: Awaited<ReturnType<typeof postAppleAuth>>) => {
    const u = authResult.user;
    const hasProfile =
      !authResult.isNewUser &&
      !!u.firstName &&
      String(u.firstName).trim().length > 0;
    if (!hasProfile) {
      history.replace("/auth/almost", {
        email: u.email,
        firstName: String(u.firstName ?? "").trim(),
        lastName: String(u.lastName ?? "").trim(),
      });
    } else {
      history.replace("/home");
    }
  };

  const handleAppleSuccess = async (appleResult: any) => {
    try {
      setLoading(true);
      const identityToken = appleResult?.idToken;
      if (!identityToken) throw new Error("No Apple identity token received");

      const givenName = appleResult?.profile?.givenName ?? appleResult?.given_name ?? "";
      const familyName = appleResult?.profile?.familyName ?? appleResult?.family_name ?? "";

      const authResult = await postAppleAuth(identityToken, givenName, familyName);

      await tokenStorage.setToken(authResult.token);
      const u = authResult.user;
      const userToSave = {
        id: String(u.id ?? ""),
        email: u.email ?? "",
        firstName: u.firstName ?? "",
        lastName: u.lastName ?? "",
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      };
      saveUser(userToSave as any);
      setCurrentUser(userToSave as any);
      if (u.email) await tokenStorage.setItem("user_email", u.email);

      if (authResult.needsContactEmail) {
        // Apple private email or no email — ask user for real email
        setPendingAppleResult(authResult);
        setShowAppleEmailSheet(true);
        return;
      }

      navigateAfterApple(authResult);
    } catch (err) {
      console.error("Apple login failed:", err);
      setError("Apple sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleEmailSaved = () => {
    setShowAppleEmailSheet(false);
    if (pendingAppleResult) {
      navigateAfterApple(pendingAppleResult);
      setPendingAppleResult(null);
    } else {
      history.replace("/home");
    }
  };

  const handleAppleError = (err: any) => {
    console.error("Apple login failed!", err);
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
                  <AppleLoginButton
                    onSuccess={handleAppleSuccess}
                    onFailure={handleAppleError}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
      {showAppleEmailSheet && (
        <MissingInfoSheet
          field="email"
          onClose={() => setShowAppleEmailSheet(false)}
          onSaved={handleAppleEmailSaved}
        />
      )}
      {loading && <FullScreenLoader />}
    </IonPage>
  );
};

export default Login;

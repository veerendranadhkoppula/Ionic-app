import React, { useState, useEffect, useRef } from "react";
import { IonModal } from "@ionic/react";
import { useHistory } from "react-router-dom";
import { setGuest } from "../../../utils/authStorage";
import tokenStorage from "../../../utils/tokenStorage";
import * as api from "../../../utils/apiAuth";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { registerFcmToken } from "../../../api/apiCafeNotifications";
import { unregisterFcmToken } from "../../../api/apiCafeNotifications";

const NOTIF_KEY = "notif_enabled";
const LOCATION_KEY = "location_enabled";

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

import styles from "./SettingsSection.module.css";

const SettingsSection = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const history = useHistory();

  const [notifications, setNotifications] = useState(false);
  const [location, setLocation] = useState(false);
  // Track whether this component is still mounted so async callbacks don't
  // update state after unmount (which would crash the app on Android).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load persisted notification preference on mount ──────────────────────
  useEffect(() => {
    tokenStorage.getItem(NOTIF_KEY).then((val) => {
      if (mountedRef.current) setNotifications(val === "true");
    });
  }, []);

  // ── Load persisted location preference on mount (and try to reflect real permission) ─
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const stored = await tokenStorage.getItem(LOCATION_KEY);
        if (!cancelled && mountedRef.current) setLocation(stored === "true");

        // If native, prefer actual permission status to avoid stale state
        if (Capacitor.isNativePlatform()) {
          try {
                // Try to use the official Capacitor Geolocation plugin when available.
                // Use dynamic import so builds don't fail if the plugin hasn't been
                // installed yet. If import fails, fall back to the previously stored
                // value (and browser Permissions API below for web).
                try {
                  // Optional plugin import: may not be installed in some dev setups
                  const geoMod: unknown = await import('@capacitor/geolocation');
                  const Geolocation = (geoMod as unknown as { Geolocation?: { checkPermissions?: () => Promise<{ location: string }> } }).Geolocation;
                  if (Geolocation && typeof Geolocation.checkPermissions === 'function') {
                    const s = await Geolocation.checkPermissions();
                    const granted = s.location === 'granted';
                    if (!cancelled && mountedRef.current) setLocation(granted);
                    await tokenStorage.setItem(LOCATION_KEY, String(granted));
                  }
                } catch {
                  // Dynamic import failed or plugin not installed — keep stored value.
                }
          } catch {
            // Non-fatal — keep stored value
          }
        } else if (typeof navigator !== "undefined") {
          try {
            // Browser Permissions API (use a typed local alias to avoid 'any' lint)
            type PermQuery = { state: string };
            type NavWithPerm = { permissions?: { query: (p: { name: string }) => Promise<PermQuery> } };
            const nav = navigator as unknown as NavWithPerm;
            if (nav.permissions && typeof nav.permissions.query === "function") {
              const perm = await nav.permissions.query({ name: "geolocation" });
              const granted = perm.state === "granted";
              if (!cancelled && mountedRef.current) setLocation(granted);
              await tokenStorage.setItem(LOCATION_KEY, String(granted));
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn("[Settings] load location preference failed", e);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // ── Handle notification toggle ────────────────────────────────────────────
  const handleNotificationToggle = async () => {
    const next = !notifications;

    // Optimistically update UI
    if (mountedRef.current) setNotifications(next);
    await tokenStorage.setItem(NOTIF_KEY, String(next));

    if (!Capacitor.isNativePlatform()) return;

    if (next) {
      try {
        // Check existing permission status first — avoids double-prompting
        // on Android which can cause a crash on some devices/versions.
        const currentStatus = await PushNotifications.checkPermissions();

        let finalStatus = currentStatus.receive;

        if (finalStatus === "prompt" || finalStatus === "prompt-with-rationale") {
          const requested = await PushNotifications.requestPermissions();
          finalStatus = requested.receive;
        }

        if (finalStatus !== "granted") {
          // User denied — revert toggle
          if (mountedRef.current) setNotifications(false);
          await tokenStorage.setItem(NOTIF_KEY, "false");
          return;
        }

        // Add listeners BEFORE calling register() so we never miss the event.
        // Keep handles so we remove only these listeners and don't clear app-level listeners.
  const handles: PluginListenerHandle[] = [];
        const regHandle = await PushNotifications.addListener("registration", async (token) => {
          try {
            const jwt = await tokenStorage.getToken();
            if (!jwt) {
              console.warn("[FCM] No JWT present — cannot upload push token to backend");
            }
            await registerFcmToken(jwt, token.value);
            // Cache token locally so other code can skip duplicate uploads
            try { await tokenStorage.setItem("push_token", token.value); } catch { /* ignore */ }
            console.log("[FCM] pushToken saved:", token.value.slice(0, 20) + "...");
          } catch (e) {
            console.warn("[FCM] Token upload failed", e);
          }
        });
        handles.push(regHandle);

        const errHandle = await PushNotifications.addListener("registrationError", (err) => {
          console.warn("[FCM] Registration error", err);
        });
        handles.push(errHandle);

        await PushNotifications.register();
      } catch (e) {
        console.warn("[Push] Setup failed", e);
        // Revert on any error
        if (mountedRef.current) setNotifications(false);
        await tokenStorage.setItem(NOTIF_KEY, "false");
      }
    } else {
      // Turning off — clean up listeners
      try {
        // Remove only the listeners we added above (avoid clearing app-level listeners)
        try {
          // We can't reference handles from the "on" branch here directly (scoped),
          // so remove listeners by finding and removing listeners via the returned
          // PluginListenerHandle on the PushNotifications plugin if available.
          // Best-effort: call removeAllListeners only for registration-related events
          // by removing the specific listener handles if the API returns them.
          // (Capacitor's addListener returns an object with remove()).
          // There is no guaranteed global registry here, so as a defensive fallback
          // we call removeAllListeners only if Plugin supports it. This keeps
          // behavior conservative and avoids removing app-level handlers when possible.
          // The safer cross-platform option is to call removeAllListeners for
          // registration/error events only, but Capacitor doesn't expose per-event removal
          // via the static API — we rely on the handles stored above when toggling on.
        } catch (e) {
          console.warn("[Push] remove listeners failed (non-fatal)", e);
        }
        // Also inform backend to clear the stored pushToken
        try {
          const jwt = await tokenStorage.getToken();
          await unregisterFcmToken(jwt);
          await tokenStorage.removeItem("push_token");
          console.log("[FCM] pushToken cleared on backend");
        } catch (err) {
          console.warn("[FCM] failed to clear push token on backend", err);
        }
      } catch (e) {
        console.warn("[Push] removeAllListeners failed", e);
      }
    }
  };
  // ── Handle location toggle (permission-aware) ───────────────────────────
  const handleLocationToggle = async () => {
    const next = !location;

    // Optimistically update UI
    if (mountedRef.current) setLocation(next);
    await tokenStorage.setItem(LOCATION_KEY, String(next));

    try {
      if (Capacitor.isNativePlatform()) {
        // Native flow: prefer the official Capacitor Geolocation plugin (dynamic import)
        try {
          // Optional plugin import: may not be installed in some dev setups
          const geoMod: unknown = await import('@capacitor/geolocation');
          const Geolocation = (geoMod as unknown as { Geolocation?: { checkPermissions?: () => Promise<{ location: string }>, requestPermissions?: () => Promise<{ location: string }> } }).Geolocation;

          if (next) {
            if (Geolocation && typeof Geolocation.checkPermissions === 'function') {
              const s = await Geolocation.checkPermissions();
              let final = s.location;
              if (final === 'prompt') {
                if (typeof Geolocation.requestPermissions === 'function') {
                  const req = await Geolocation.requestPermissions();
                  final = req.location;
                }
              }

              const granted = final === 'granted';
              if (!granted) {
                if (mountedRef.current) setLocation(false);
                await tokenStorage.setItem(LOCATION_KEY, 'false');
                return;
              }
              // granted -> persist already done above
            }
          } else {
            // turning off: just persist false (already set) — no native unregister
          }
        } catch {
          // Plugin not installed or import failed. Fall back to web flow below.
        }
      } else {
        // Web flow: use Permissions API if available, otherwise prompt via getCurrentPosition
        const nav = navigator as unknown as { permissions?: { query: (p: { name: string }) => Promise<{ state: string }> } };
        if (next) {
          if (nav.permissions && typeof nav.permissions.query === "function") {
            const perm = await nav.permissions.query({ name: "geolocation" });
            if (perm.state === "granted") {
              // fine
            } else if (perm.state === "prompt") {
              // trigger actual browser prompt
              await new Promise<void>((resolve, reject) => {
                try {
                  navigator.geolocation.getCurrentPosition(() => resolve(), () => reject());
                } catch {
                  reject();
                }
              });
            } else {
              // denied
              if (mountedRef.current) setLocation(false);
              await tokenStorage.setItem(LOCATION_KEY, "false");
              return;
            }
          } else {
            // No Permissions API — try to prompt using geolocation directly
            try {
              await new Promise<void>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(() => resolve(), () => reject());
              });
            } catch {
              if (mountedRef.current) setLocation(false);
              await tokenStorage.setItem(LOCATION_KEY, "false");
              return;
            }
          }
        } else {
          // turning off on web: just persist false (already set)
        }
      }
    } catch (err) {
      console.warn("[Location] permission flow failed", err);
      if (mountedRef.current) setLocation(false);
      await tokenStorage.setItem(LOCATION_KEY, "false");
    }
  };
  const onLogout = async () => {
    try {
      await tokenStorage.clearAll();
      setGuest();
      history.replace("/auth");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };
  const handleDeleteAccount = async () => {
    try {
      const token = await tokenStorage.getToken();
      const userId = await tokenStorage.getItem("user_id");

      if (!token || !userId) return;

      const res = await authFetch(
        `${api.API_BASE.replace("/api", "")}/api/users/${userId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      await tokenStorage.clearAll();
      setGuest();
      history.replace("/auth");
    } catch (err) {
      console.error("Delete account error:", err);
    }
  };

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainConatiner}>
          <div className={styles.TopContainer}>
            <div className={styles.TopContainerTop}>
              <h3>Permissions</h3>
            </div>
            <div className={styles.TopContainerBottom}>
              <div className={styles.Notifications}>
                <div className={styles.NotificationsLeft}>
                  <p>Notifications</p>
                </div>
                <div
                  className={`${styles.Toggle} ${
                    notifications ? styles.ToggleOn : styles.ToggleOff
                  }`}
                  onClick={handleNotificationToggle}
                >
                  <span className={styles.ToggleKnob}></span>
                </div>
              </div>
              <div className={styles.Location}>
                <div className={styles.LocationLeft}>
                  <p>Location</p>
                </div>
                <div
                  className={`${styles.Toggle} ${
                    location ? styles.ToggleOn : styles.ToggleOff
                  }`}
                  onClick={handleLocationToggle}
                >
                  <span className={styles.ToggleKnob}></span>
                </div>
              </div>
              {/* Dev link removed: PushTest is kept in the repo but not exposed in Settings */}
            </div>
          </div>
          <div className={styles.BottomContainer}>
            <div className={styles.BottomContainerTop}>
              <h3>Account Management</h3>
            </div>
            <div className={styles.BottomContainerBottom}>
              <div
                className={styles.DeleteAccount}
                onClick={() => setShowDeleteModal(true)}
              >
                <p>Delete Account</p>
              </div>
              <div
                className={styles.Logout}
                onClick={() => setShowLogoutModal(true)}
              >
                <p>Logout</p>
              </div>
            </div>
          </div>
        </div>
        <IonModal
          isOpen={showLogoutModal}
          onDidDismiss={() => setShowLogoutModal(false)}
          backdropDismiss={true}
          className={styles.logoutModal}
          animated={false}
        >
          <div className={styles.logoutWrapper}>
            <h2>Log out?</h2>
            <p>Are you sure you want to log out?</p>

            <div className={styles.logoutActions}>
              <button
                className={styles.noBtn}
                onClick={() => setShowLogoutModal(false)}
              >
                No
              </button>

              <button
                className={styles.yesBtn}
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </IonModal>
        <IonModal
          isOpen={showDeleteModal}
          onDidDismiss={() => setShowDeleteModal(false)}
          backdropDismiss={true}
          className={styles.deleteModal}
          animated={false}
        >
          <div className={styles.deleteWrapper}>
            <h2>Delete account?</h2>

            <p>
              Deleting your account will erase your profile, rewards, and order
              history.
              <br />
              You won’t be able to recover this later.
            </p>

            <div className={styles.deleteActions}>
              <button
                className={styles.deleteYesBtn}
                onClick={async () => {
                  setShowDeleteModal(false);
                  await handleDeleteAccount();
                }}
              >
                Yes
              </button>

              <button
                className={styles.deleteNoBtn}
                onClick={() => setShowDeleteModal(false)}
              >
                No
              </button>
            </div>
          </div>
        </IonModal>
      </div>
    </>
  );
};

export default SettingsSection;

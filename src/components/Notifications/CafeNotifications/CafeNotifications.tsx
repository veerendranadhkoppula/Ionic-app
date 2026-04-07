import React, { useState, useEffect, useCallback } from "react";
import styles from "./CafeNotifications.module.css";
import {
  getNotifications,
  getNotificationDocId,
  clearAllNotifications,
  registerFcmToken,
  type AppNotification,
  type NotificationType,
} from "../../../api/apiCafeNotifications";
import tokenStorage from "../../../utils/tokenStorage";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import NoState from "../../NoState/NoState";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const OrderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.6047 15.5134C18.6047 13.853 17.3009 12.4894 15.6723 12.4893C14.0436 12.4893 12.7399 13.853 12.7399 15.5134C12.7401 17.1736 14.0438 18.5366 15.6723 18.5366C17.3007 18.5365 18.6044 17.1736 18.6047 15.5134ZM16.3354 10.4542V6.52503L9.56317 10.4171V18.1373L10.3453 17.6876C10.6832 17.4935 11.1076 17.6238 11.2928 17.9782C11.4777 18.3326 11.3535 18.7769 11.0157 18.971L9.90655 19.6094C9.68792 19.735 9.45144 19.8789 9.18708 19.9352C9.02782 19.9691 8.8649 19.978 8.7038 19.9609L8.54392 19.9352C8.27964 19.8789 8.04386 19.735 7.82536 19.6094L1.10941 15.7497C0.90863 15.6343 0.685743 15.5139 0.503495 15.34L0.428096 15.2619C0.272557 15.0874 0.154392 14.8798 0.0819881 14.6531C-0.00852062 14.3697 0.000228766 14.0654 0.000230285 13.7946V6.17441C0.000230285 5.90377 -0.00842872 5.59932 0.0819881 5.31597C0.154411 5.08925 0.272764 4.8816 0.428096 4.70715C0.621648 4.48987 0.879862 4.35126 1.10941 4.21934L7.82536 0.359682C8.04359 0.234254 8.27954 0.0901728 8.54392 0.0338356C8.75609 -0.0113001 8.97495 -0.011257 9.18708 0.0338356C9.4515 0.0901287 9.68821 0.234198 9.90655 0.359682L16.6216 4.21934C16.8514 4.3514 17.1093 4.48994 17.3029 4.70715C17.4579 4.88131 17.5765 5.0887 17.649 5.31597L17.679 5.42268C17.738 5.67454 17.7308 5.93752 17.7308 6.17441V10.4542C17.7305 10.8581 17.4183 11.186 17.0331 11.186C16.6481 11.1857 16.3357 10.858 16.3354 10.4542ZM2.14955 5.28929L8.8655 9.14895L11.4972 7.63691L4.78124 3.77725L2.14955 5.28929ZM8.8219 1.46775C8.81684 1.46939 8.80042 1.47558 8.76648 1.49252C8.70734 1.52205 8.63088 1.56541 8.49577 1.64306L6.2329 2.94263L12.9488 6.80229L15.5814 5.28929L9.23523 1.64306C9.10007 1.56538 9.02366 1.52204 8.96452 1.49252C8.9316 1.4761 8.91557 1.4696 8.91001 1.46775C8.88082 1.46154 8.85087 1.46162 8.8219 1.46775ZM20 15.5134C19.9998 18.0008 18.0532 20 15.6723 20C13.2913 20 11.3448 18.0008 11.3446 15.5134C11.3446 13.0258 13.2912 11.0259 15.6723 11.0259C18.0533 11.0259 20 13.0259 20 15.5134ZM1.40011 14.13C1.40206 14.1634 1.40432 14.1808 1.40556 14.1881C1.41418 14.2151 1.42798 14.2407 1.44734 14.2624C1.45248 14.2669 1.46773 14.2786 1.49821 14.2986C1.55678 14.3372 1.63709 14.3843 1.77982 14.4663L8.16783 18.1373V10.4171L1.39556 6.52503V13.7946C1.39556 13.9641 1.39597 14.0591 1.40011 14.13Z" fill="#6C7A5F"/>
  </svg>
);

const RewardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.5371 10.6977H10.6977V18.6047H15.1681C15.5312 18.6046 15.8796 18.4599 16.1364 18.2031C16.3931 17.9463 16.5371 17.5978 16.5371 17.2347V10.6977ZM3.46294 17.2347C3.46294 17.5978 3.60688 17.9463 3.86355 18.2031C4.12036 18.4599 4.46876 18.6046 4.83194 18.6047H9.30233V10.6977H3.46294V17.2347ZM18.6047 6.89953C18.6047 6.71404 18.4541 6.56341 18.2685 6.56341H10.6977V9.30233H18.2685C18.4541 9.30233 18.6047 9.1517 18.6047 8.96621V6.89953ZM1.39535 8.96621C1.39535 9.1517 1.54593 9.30233 1.73147 9.30233H9.30233V6.56341H1.73147C1.54593 6.56341 1.39535 6.71404 1.39535 6.89953V8.96621ZM16.5371 3.28216C16.5371 2.78192 16.3385 2.30232 15.9847 1.94858C15.631 1.59484 15.1514 1.39535 14.6512 1.39535H14.6394C13.8921 1.38233 13.0957 1.74145 12.3656 2.55269C11.782 3.20105 11.2836 4.09547 10.9257 5.16806H14.6512C15.1514 5.16806 15.631 4.96942 15.9847 4.61573C16.3385 4.26202 16.537 3.78237 16.5371 3.28216ZM3.46294 3.28216C3.46297 3.78237 3.66154 4.26202 4.01526 4.61573C4.369 4.96942 4.84859 5.16806 5.34884 5.16806H9.07431C8.71638 4.09547 8.21799 3.20105 7.63445 2.55269C6.90428 1.74145 6.10794 1.38233 5.36065 1.39535L5.34884 1.39626V1.39535C4.84855 1.39535 4.36901 1.59484 4.01526 1.94858C3.66153 2.30232 3.46294 2.78192 3.46294 3.28216ZM17.9324 3.28216C17.9324 3.96188 17.7211 4.61931 17.3356 5.16806H18.2685C19.2247 5.16806 20 5.94337 20 6.89953V8.96621C20 9.92236 19.2247 10.6977 18.2685 10.6977H17.9324V17.2347C17.9324 17.968 17.6415 18.6721 17.123 19.1906C16.6045 19.7089 15.9012 20 15.1681 20H4.83194C4.09879 20 3.39547 19.7089 2.877 19.1906C2.35849 18.6721 2.06759 17.968 2.06759 17.2347V10.6977H1.73147C0.775332 10.6977 0 9.92236 0 8.96621V6.89953C0 5.94337 0.775332 5.16806 1.73147 5.16806H2.66443C2.27887 4.61931 2.06761 3.96187 2.06759 3.28216C2.06759 2.41184 2.4133 1.57744 3.02871 0.962028C3.64414 0.346612 4.47849 5.87262e-08 5.34884 0V0.00181686C6.59105 -0.0157623 7.74483 0.590756 8.67097 1.61973C9.19292 2.19967 9.6395 2.90743 10 3.70549C10.3605 2.90743 10.8071 2.19967 11.329 1.61973C12.2552 0.590756 13.409 -0.015762 14.6512 0.00181686V0C15.5215 0 16.3559 0.346612 16.9713 0.962028C17.5867 1.57744 17.9324 2.41184 17.9324 3.28216Z" fill="#6C7A5F"/>
  </svg>
);

const PromoIcon = () => (
 <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.6047 15.5134C18.6047 13.853 17.3009 12.4894 15.6723 12.4893C14.0436 12.4893 12.7399 13.853 12.7399 15.5134C12.7401 17.1736 14.0438 18.5366 15.6723 18.5366C17.3007 18.5365 18.6044 17.1736 18.6047 15.5134ZM16.3354 10.4542V6.52503L9.56317 10.4171V18.1373L10.3453 17.6876C10.6832 17.4935 11.1076 17.6238 11.2928 17.9782C11.4777 18.3326 11.3535 18.7769 11.0157 18.971L9.90655 19.6094C9.68792 19.735 9.45144 19.8789 9.18708 19.9352C9.02782 19.9691 8.8649 19.978 8.7038 19.9609L8.54392 19.9352C8.27964 19.8789 8.04386 19.735 7.82536 19.6094L1.10941 15.7497C0.90863 15.6343 0.685743 15.5139 0.503495 15.34L0.428096 15.2619C0.272557 15.0874 0.154392 14.8798 0.0819881 14.6531C-0.00852062 14.3697 0.000228766 14.0654 0.000230285 13.7946V6.17441C0.000230285 5.90377 -0.00842872 5.59932 0.0819881 5.31597C0.154411 5.08925 0.272764 4.8816 0.428096 4.70715C0.621648 4.48987 0.879862 4.35126 1.10941 4.21934L7.82536 0.359682C8.04359 0.234254 8.27954 0.0901728 8.54392 0.0338356C8.75609 -0.0113001 8.97495 -0.011257 9.18708 0.0338356C9.4515 0.0901287 9.68821 0.234198 9.90655 0.359682L16.6216 4.21934C16.8514 4.3514 17.1093 4.48994 17.3029 4.70715C17.4579 4.88131 17.5765 5.0887 17.649 5.31597L17.679 5.42268C17.738 5.67454 17.7308 5.93752 17.7308 6.17441V10.4542C17.7305 10.8581 17.4183 11.186 17.0331 11.186C16.6481 11.1857 16.3357 10.858 16.3354 10.4542ZM2.14955 5.28929L8.8655 9.14895L11.4972 7.63691L4.78124 3.77725L2.14955 5.28929ZM8.8219 1.46775C8.81684 1.46939 8.80042 1.47558 8.76648 1.49252C8.70734 1.52205 8.63088 1.56541 8.49577 1.64306L6.2329 2.94263L12.9488 6.80229L15.5814 5.28929L9.23523 1.64306C9.10007 1.56538 9.02366 1.52204 8.96452 1.49252C8.9316 1.4761 8.91557 1.4696 8.91001 1.46775C8.88082 1.46154 8.85087 1.46162 8.8219 1.46775ZM20 15.5134C19.9998 18.0008 18.0532 20 15.6723 20C13.2913 20 11.3448 18.0008 11.3446 15.5134C11.3446 13.0258 13.2912 11.0259 15.6723 11.0259C18.0533 11.0259 20 13.0259 20 15.5134ZM1.40011 14.13C1.40206 14.1634 1.40432 14.1808 1.40556 14.1881C1.41418 14.2151 1.42798 14.2407 1.44734 14.2624C1.45248 14.2669 1.46773 14.2786 1.49821 14.2986C1.55678 14.3372 1.63709 14.3843 1.77982 14.4663L8.16783 18.1373V10.4171L1.39556 6.52503V13.7946C1.39556 13.9641 1.39597 14.0591 1.40011 14.13Z" fill="#6C7A5F"/>
  </svg>
);

function getIcon(type: NotificationType): React.ReactNode {
  switch (type) {
    case "order":   return <OrderIcon />;
    case "reward":  return <RewardIcon />;
    case "general":
    default:        return <PromoIcon />;
  }
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function isWithin24Hours(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < TWENTY_FOUR_HOURS_MS;
}

async function setupPushNotifications(onForegroundPush?: () => void): Promise<PluginListenerHandle[] | void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { receive } = await PushNotifications.requestPermissions();
    if (receive !== "granted") return;
    await PushNotifications.register();
    const handles: PluginListenerHandle[] = [];

    const regHandle = await PushNotifications.addListener("registration", async (token) => {
      try {
        const existing = await tokenStorage.getItem("push_token");
        if (existing === token.value) return;
        const jwt = await tokenStorage.getToken();
        if (!jwt) console.warn("[FCM] No JWT present");
        await registerFcmToken(jwt, token.value);
        await tokenStorage.setItem("push_token", token.value);
      } catch (e) {
        console.warn("[FCM] Token registration failed", e);
      }
    });
    handles.push(regHandle);

    const errHandle = await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[FCM] Registration error", err);
    });
    handles.push(errHandle);

    const fgHandle = await PushNotifications.addListener("pushNotificationReceived", () => {
      if (onForegroundPush) onForegroundPush();
    });
    handles.push(fgHandle);

    const actionHandle = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[FCM] Action performed:", action);
      if (onForegroundPush) onForegroundPush();
    });
    handles.push(actionHandle);

    return handles;
  } catch (e) {
    console.warn("[Push] Setup failed", e);
  }
}

const CafeNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await tokenStorage.getToken();
      const all = await getNotifications(token);

      const recent = all.filter((n) => isWithin24Hours(n.createdAt));

      if (recent.length < all.length) {
        try {
          const docId = await getNotificationDocId(token);
          if (docId && recent.length === 0) {
            await clearAllNotifications(token, docId);
          }
        } catch { /* silent */ }
      }

      setNotifications(recent);
    } catch (e) {
      console.warn("[CafeNotif] Fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    let mounted = true;
    let pushHandles: PluginListenerHandle[] = [];
    let appStateHandle: PluginListenerHandle | null = null;

    const doSetup = async () => {
      try {
        const handles = await setupPushNotifications(fetchNotifications);
        if (Array.isArray(handles)) pushHandles = handles;
      } catch (e) {
        console.warn("[CafeNotif] setupPushNotifications error", e);
      }
    };

    tokenStorage.getItem("notif_enabled").then((val) => {
      if (!mounted) return;
      if (val === "true") doSetup();
    });

    const handleAppState = async (state: { isActive: boolean }) => {
      if (!Capacitor.isNativePlatform()) return;
      if (state.isActive) {
        const val = await tokenStorage.getItem("notif_enabled");
        if (val === "true") {
          try { for (const h of pushHandles) await h.remove(); } catch { /* ignore */ }
          pushHandles = [];
          await doSetup();
        }
      }
    };

    (async () => {
      try {
        appStateHandle = await CapacitorApp.addListener("appStateChange", handleAppState);
      } catch { /* ignore */ }
    })();

    return () => {
      mounted = false;
      (async () => {
        try { for (const h of pushHandles) { try { await h.remove(); } catch { /* ignore */ } } } catch { /* ignore */ }
        if (appStateHandle) { try { await appStateHandle.remove(); } catch { /* ignore */ } }
      })();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearAll = async () => {
    setNotifications([]);
    try {
      const token = await tokenStorage.getToken();
      const docId = await getNotificationDocId(token);
      if (docId) await clearAllNotifications(token, docId);
    } catch { /* silent */ }
  };

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        {(loading || notifications.length > 0) && (
          <div className={styles.TopConatiner}>
            <h4>Today</h4>
            {notifications.length > 0 && (
              <p onClick={handleClearAll} style={{ cursor: "pointer" }}>Clear all</p>
            )}
          </div>
        )}

        <div className={!loading && notifications.length === 0 ? styles.centerEmpty : styles.BottomContainer}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className={styles.NotificationCard} style={{ opacity: 0.35 }}>
                <div className={styles.LeftSection}>
                  <div className={styles.IconContainer} style={{ background: "#e0e0e0" }} />
                  <div className={styles.NotificationText}>
                    <div style={{ height: 12, width: 120, background: "#e0e0e0", borderRadius: 4 }} />
                    <div style={{ height: 10, width: 180, background: "#e0e0e0", borderRadius: 4, marginTop: 4 }} />
                  </div>
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            <NoState variant="bell" title={"No new notifications today"} subtitle={"Browse the menu to brew something ☕"}  imageSrc="/not.gif"/>
          ) : (
            notifications.map((item, index) => (
              <React.Fragment key={item.id}>
                <div className={styles.NotificationCard}>
                  <div className={styles.LeftSection}>
                    <div className={styles.IconContainer}>{getIcon(item.type)}</div>
                    <div className={styles.NotificationText}>
                      <h4>{item.title}</h4>
                      <p>{item.message}</p>
                    </div>
                  </div>
                  <div className={styles.RightSection}>
                    <p>{formatTime(item.createdAt)}</p>
                  </div>
                </div>
                {index !== notifications.length - 1 && <div className={styles.line} />}
              </React.Fragment>
            ))
          )}
          {notifications.length > 0 && <div className={styles.line} />}
        </div>
      </div>
    </div>
  );
};

export default CafeNotifications;
import React, { useState, useEffect, useCallback } from "react";
import styles from "./ShopNotifications.module.css";
import NoState from "../../NoState/NoState";
import {
  getNotifications,
  getNotificationDocId,
  clearAllNotifications,
  type AppNotification,
} from "../../../api/apiStoreNotifications";
import tokenStorage from "../../../utils/tokenStorage";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

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

function getIcon(): React.ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.6047 15.5134C18.6047 13.853 17.3009 12.4894 15.6723 12.4893C14.0436 12.4893 12.7399 13.853 12.7399 15.5134C12.7401 17.1736 14.0438 18.5366 15.6723 18.5366C17.3007 18.5365 18.6044 17.1736 18.6047 15.5134ZM16.3354 10.4542V6.52503L9.56317 10.4171V18.1373L10.3453 17.6876C10.6832 17.4935 11.1076 17.6238 11.2928 17.9782C11.4777 18.3326 11.3535 18.7769 11.0157 18.971L9.90655 19.6094C9.68792 19.735 9.45144 19.8789 9.18708 19.9352C9.02782 19.9691 8.8649 19.978 8.7038 19.9609L8.54392 19.9352C8.27964 19.8789 8.04386 19.735 7.82536 19.6094L1.10941 15.7497C0.90863 15.6343 0.685743 15.5139 0.503495 15.34L0.428096 15.2619C0.272557 15.0874 0.154392 14.8798 0.0819881 14.6531C-0.00852062 14.3697 0.000228766 14.0654 0.000230285 13.7946V6.17441C0.000230285 5.90377 -0.00842872 5.59932 0.0819881 5.31597C0.154411 5.08925 0.272764 4.8816 0.428096 4.70715C0.621648 4.48987 0.879862 4.35126 1.10941 4.21934L7.82536 0.359682C8.04359 0.234254 8.27954 0.0901728 8.54392 0.0338356C8.75609 -0.0113001 8.97495 -0.011257 9.18708 0.0338356C9.4515 0.0901287 9.68821 0.234198 9.90655 0.359682L16.6216 4.21934C16.8514 4.3514 17.1093 4.48994 17.3029 4.70715C17.4579 4.88131 17.5765 5.0887 17.649 5.31597L17.679 5.42268C17.738 5.67454 17.7308 5.93752 17.7308 6.17441V10.4542C17.7305 10.8581 17.4183 11.186 17.0331 11.186C16.6481 11.1857 16.3357 10.858 16.3354 10.4542ZM2.14955 5.28929L8.8655 9.14895L11.4972 7.63691L4.78124 3.77725L2.14955 5.28929ZM8.8219 1.46775C8.81684 1.46939 8.80042 1.47558 8.76648 1.49252C8.70734 1.52205 8.63088 1.56541 8.49577 1.64306L6.2329 2.94263L12.9488 6.80229L15.5814 5.28929L9.23523 1.64306C9.10007 1.56538 9.02366 1.52204 8.96452 1.49252C8.9316 1.4761 8.91557 1.4696 8.91001 1.46775C8.88082 1.46154 8.85087 1.46162 8.8219 1.46775ZM20 15.5134C19.9998 18.0008 18.0532 20 15.6723 20C13.2913 20 11.3448 18.0008 11.3446 15.5134C11.3446 13.0258 13.2912 11.0259 15.6723 11.0259C18.0533 11.0259 20 13.0259 20 15.5134ZM1.40011 14.13C1.40206 14.1634 1.40432 14.1808 1.40556 14.1881C1.41418 14.2151 1.42798 14.2407 1.44734 14.2624C1.45248 14.2669 1.46773 14.2786 1.49821 14.2986C1.55678 14.3372 1.63709 14.3843 1.77982 14.4663L8.16783 18.1373V10.4171L1.39556 6.52503V13.7946C1.39556 13.9641 1.39597 14.0591 1.40011 14.13Z" fill="#6C7A5F"/>
    </svg>
  );
}

const ShopNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await tokenStorage.getToken();
      const list = await getNotifications(token);


      const recent = list.filter((n) => isWithin24Hours(n.createdAt));

      if (recent.length < list.length) {
        try {
          const docId = await getNotificationDocId(token);
          if (docId && recent.length === 0) {
            await clearAllNotifications(token, docId);
          }
        } catch { /* silent */ }
      }

      setNotifications(recent);
    } catch (e) {
      console.warn("[ShopNotif] fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
            <NoState variant="bell" title={"No notifications available"} subtitle={"You're all caught up."} />
          ) : (
            notifications.map((item, index) => (
              <React.Fragment key={item.id}>
                <div className={styles.NotificationCard}>
                  <div className={styles.LeftSection}>
                    <div className={styles.IconContainer}>{getIcon()}</div>
                    <div className={styles.NotificationText}>
                      <h4>{item.title}</h4>
                      <p>{item.message}</p>
                    </div>
                  </div>
                  <div className={styles.RightSection}>
                    <p>{formatTime(item.createdAt)}</p>
                  </div>
                </div>
                {index !== notifications.length - 1 && <div className={styles.line}></div>}
              </React.Fragment>
            ))
          )}
          {notifications.length > 0 && <div className={styles.line}></div>}
        </div>
      </div>
    </div>
  );
};

export default ShopNotifications;
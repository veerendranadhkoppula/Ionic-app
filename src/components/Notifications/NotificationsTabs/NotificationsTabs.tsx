import React from "react";
import styles from "./NotificationsTabs.module.css";

interface NotificationsTabsProps {
  activeTab: "cafe" | "shop";
  onChange: (tab: "cafe" | "shop") => void;
}

const NotificationsTabs: React.FC<NotificationsTabsProps> = ({
  activeTab,
  onChange,
}) => {
  return (
    <div className={styles.tabsContainer}>
      <div className={styles.Maintabs}>
        <button
          className={activeTab === "cafe" ? styles.active : ""}
          onClick={() => onChange("cafe")}
        >
          CAFE
        </button>

        <button
          className={activeTab === "shop" ? styles.active : ""}
          onClick={() => onChange("shop")}
        >
          SHOP
        </button>
      </div>
    </div>
  );
};

export default NotificationsTabs;

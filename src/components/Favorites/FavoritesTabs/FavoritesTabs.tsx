import React from "react";
import styles from "./FavoritesTabs.module.css";

interface FavoritesTabsProps {
  activeTab: "cafe" | "shop";
  onChange: (tab: "cafe" | "shop") => void;
}

const FavoritesTabs: React.FC<FavoritesTabsProps> = ({
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

export default FavoritesTabs;

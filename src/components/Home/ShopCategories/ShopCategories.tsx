import React from "react";
import styles from "./ShopCategories.module.css";
import one from "./1.png";
import two from "./2.png";
import three from "./3.png";
import { useIonRouter } from "@ionic/react";

const ShopCategories = () => {
  const ionRouter = useIonRouter();
  return (
    <>
      <div className={styles.main}>
        <div className={styles.maincontainer}>
          <div className={styles.Top}>
            <p>Shop Categories</p>
          </div>
          <div className={styles.Bottom}>
            <div
              className={styles.ShopcatCard}
              onClick={() =>
                ionRouter.push("/storemenu?category=Coffee Beans", "forward")
              }
            >
              <p>Beans</p>
              <img src={one} alt="Beans" />
            </div>
            <div
              className={styles.ShopcatCardtwo}
              onClick={() =>
                ionRouter.push("/storemenu?category=Drip Bags", "forward")
              }
            >
              <p>Drip bags</p>
              <img src={two} alt="Drip bags" />
            </div>
            <div
              className={styles.ShopcatCard}
              onClick={() =>
                ionRouter.push("/storemenu?category=Capsules", "forward")
              }
            >
              <p>Capsules</p>
              <img src={three} alt="Capsules" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopCategories;

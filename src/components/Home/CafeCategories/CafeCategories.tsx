import React from "react";
import styles from "./CafeCategories.module.css";
import one from "./1.png";
import two from "./2.png";
import { useHistory } from "react-router-dom";

const CafeCategories = () => {
  const history = useHistory();
  return (
    <>
      <div className={styles.main}>
        <div className={styles.maincontainer}>
          <div className={styles.Top}>
            <h3>Cafe Categories</h3>
          </div>
          <div className={styles.Bottom}>
            <div className={styles.cofeecat}   onClick={() => history.push("/cafemenu?tab=BEVERAGES")}>
              <h3>Coffee/Drinks</h3>
              <img src={one} alt="Cafe" />
            </div>
            <div className={styles.bakerycat}   onClick={() => history.push("/cafemenu?tab=BAKERY")}>
              <h3>Fresh Bakery</h3>
              <img src={two} alt="Cafe" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CafeCategories;

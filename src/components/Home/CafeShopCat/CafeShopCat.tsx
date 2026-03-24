import React from "react";
import styles from "./CafeShopCat.module.css";
import one from './1.png';
import two from './2.png';
import { useHistory } from "react-router-dom";

const CafeShopCat = () => {
  const history = useHistory();
  return (
    <>
      <div className={styles.main}>
        <div className={styles.maincontainer}>
          <div className={styles.left} onClick={() => history.push("/CafeMenu")} style={{ cursor: "pointer" }}>
            <div className={styles.text}>
              <h3>Cafe</h3>
              <p>Takeaway or dine at our cafe</p>
            </div>
            <div className={styles.image}>
              <img src={one} alt="Cafe" />
            </div>
          </div>
          <div className={styles.right} onClick={() => history.push("/StoreMenu")} style={{ cursor: "pointer" }}>
            <div className={styles.text}>
              <h3>Store</h3>
              <p>Fresh Beans and Merch</p>
            </div>
            <div className={styles.image}>
              <img src={two} alt="Shop" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CafeShopCat;

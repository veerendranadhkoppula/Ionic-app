import React from "react";
import styles from "./FullScreenLoader.module.css";
import loader from "./12.gif";

const FullScreenLoader = () => {
  return (
    <div className={styles.overlay}>
      <img src={loader} alt="Loading" className={styles.loader} />
    </div>
  );
};

export default FullScreenLoader;

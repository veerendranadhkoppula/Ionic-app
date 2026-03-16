import React from "react";
import styles from "./Crafted.module.css";
import subimg from "./1.png";
import { useIonRouter } from "@ionic/react";

const Crafted = () => {
  const ionRouter = useIonRouter();
  return (
    <div className={styles.main}>
      <div className={styles.maincontainer}>
        <div className={styles.Top}>
          <p>Crafted for Your Routine</p>
        </div>

        <div
          className={styles.Bottom}
          style={{ backgroundImage: `url(${subimg})` }}
          onClick={() => ionRouter.push("/storemenu", "forward")}
        >
          <div className={styles.overlay}></div>

          <div className={styles.content}>
            <div className={styles.leftContent}>
              <h2>Coffee Subscriptions</h2>
              <p>Get your favorite coffee delivered regularly to your door.</p>
            </div>

            <div className={styles.rightContent}>
              <span>Explore</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 6L11 10L7 14"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Crafted;

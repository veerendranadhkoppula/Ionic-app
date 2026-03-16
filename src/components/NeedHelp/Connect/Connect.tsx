import React from "react";
import styles from "./Connect.module.css";

const Connect = () => {
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.top}>
            <h3>Connect with us</h3>
          </div>
          <div className={styles.bottom}>
            <p>
              Email Us –{" "}
              <a
                href="mailto:sales@whitemantisroastery.com"
                className={styles.InfoSpam}
              >
                sales@whitemantisroastery.com
              </a>
            </p>

            <p>
              Contact Us –{" "}
              <a href="tel:+971589535337" className={styles.InfoSpam}>
                058 953 5337
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Connect;

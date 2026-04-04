import React, { useEffect, useRef, useState } from "react";
import styles from "./CafeShopCat.module.css";
import one from "./1.png";
import two from "./2.png";
import { useHistory } from "react-router-dom";

const CafeShopCat = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const history = useHistory();
  useEffect(() => {
    const element = sectionRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 },
    );

    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);
  return (
    <>
      <div className={styles.main} ref={sectionRef}>
        <div className={styles.maincontainer}>
          <div
            className={styles.left}
            onClick={() => history.push("/CafeMenu")}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.text}>
              <h3>Cafe</h3>
              <p>Takeaway or dine at our cafe</p>
            </div>
            <div
              className={`${styles.image} ${isVisible ? styles.reveal : ""}`}
            >
              <img src={one} alt="Cafe" />
            </div>
          </div>
          <div
            className={styles.right}
            onClick={() => history.push("/StoreMenu")}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.text}>
              <h3>Store</h3>
              <p>Fresh Beans and Merch</p>
            </div>
            <div
              className={`${styles.image} ${isVisible ? styles.reveal : ""}`}
            >
              <img src={two} alt="Shop" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CafeShopCat;

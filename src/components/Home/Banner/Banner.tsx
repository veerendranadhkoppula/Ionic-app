import React from "react";
import { useHistory } from "react-router-dom";
import styles from "./Banner.module.css";
import ban1 from "./1.png";

const banners = [
  { image: ban1, route: "/CafeMenu" },
];

const Banner: React.FC = () => {
  const history = useHistory();

  // Since we have only one banner
  const activeIndex = 0;

  const handleBannerClick = () => {
    history.push(banners[activeIndex].route);
  };

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div
          className={styles.TopConatiner}
          onClick={handleBannerClick}
        >
          <img
            src={banners[activeIndex].image}
            alt="Banner"
            className={styles.BannerImage}
          />
        </div>
      </div>
    </div>
  );
};

export default Banner;

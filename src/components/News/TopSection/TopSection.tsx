import React from "react";
import styles from "./TopSection.module.css";
import { useHistory } from "react-router-dom";
import { useLocation } from "react-router-dom";
type LocationState = {
  from?: string;
};
const TopSection: React.FC = () => {
  const history = useHistory();
  const location = useLocation<LocationState>();
  const handleBack = () => {
  if (location.state?.from) {
    history.replace(location.state.from); 
  } else {
    history.replace("/home"); 
  }
};
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div
            className={styles.LeftConatiner}
           onClick={handleBack}
          >
            <svg
              width="35"
              height="35"
              viewBox="0 0 35 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.5 13L15 18.5L20.5 24"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={styles.RightContainer}>
            <h4>News</h4>
          </div>
        </div>
      </div>
    </>
  );
};

export default TopSection;

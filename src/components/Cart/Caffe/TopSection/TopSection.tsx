import React from "react";
import styles from "./TopSection.module.css";
import { useHistory } from "react-router-dom";

interface Props {
  onClearClick?: () => void;
}

const TopSection: React.FC<Props> = ({ onClearClick }) => {
  const history = useHistory();
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div
            className={styles.LeftConatiner}
            onClick={() => history.goBack()}
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
            <h4>Cart</h4>
          </div>
          <div className={styles.RightContainer}>
            {onClearClick ? (
              <p onClick={() => onClearClick()}>Clear Cart</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default TopSection;

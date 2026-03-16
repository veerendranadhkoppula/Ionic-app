import React from "react";
import styles from "./GuestBaristaSheet.module.css";
import { useHistory } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GuestBaristaSheet: React.FC<Props> = ({ isOpen, onClose }) => {
  const history = useHistory();

  return (
    <div
      className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
      onClick={onClose}
    >
      <div
        className={`${styles.sheet} ${isOpen ? styles.sheetOpen : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.topContainer}>
          <div className={styles.topLeft}>
            <h2 className={styles.title}>Choose your Barista</h2>
            <p className={styles.subtitle}>
              Pick the barista you&apos;d like today
            </p>
          </div>
          <button
            className={styles.closeBtn}
            aria-label="Close"
            onClick={onClose}
          >
            <svg
              width="35"
              height="35"
              viewBox="0 0 35 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
                fill="#4B3827"
              />
            </svg>
          </button>
        </div>

        <div className={styles.center}>
          <div className={styles.coffeeSvg} aria-hidden>
            {/* simple coffee SVG */}
            <svg
              width="100"
              height="100"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g opacity="0.4">
                <path
                  d="M41.6667 8.32812V16.6615M58.3333 8.32812V16.6615M66.6667 33.3281C67.7717 33.3281 68.8315 33.7671 69.6129 34.5485C70.3943 35.3299 70.8333 36.3897 70.8333 37.4948V70.8281C70.8333 75.2484 69.0774 79.4876 65.9518 82.6132C62.8262 85.7388 58.5869 87.4948 54.1667 87.4948H29.1667C24.7464 87.4948 20.5072 85.7388 17.3816 82.6132C14.2559 79.4876 12.5 75.2484 12.5 70.8281V37.4948C12.5 36.3897 12.939 35.3299 13.7204 34.5485C14.5018 33.7671 15.5616 33.3281 16.6667 33.3281H75C79.4203 33.3281 83.6595 35.0841 86.7851 38.2097C89.9107 41.3353 91.6667 45.5745 91.6667 49.9948C91.6667 54.4151 89.9107 58.6543 86.7851 61.7799C83.6595 64.9055 79.4203 66.6615 75 66.6615H70.8333M25 8.32812V16.6615"
                  stroke="#6C7A5F"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
          </div>

          <h3 className={styles.centerTitle}>See who&apos;s brewing today</h3>
          <p className={styles.centerDesc}>
            Log in to browse available baristas and choose your favourite
          </p>
        </div>

        <div className={styles.ctaWrap}>
          <button className={styles.cta} onClick={() => history.push("/auth")}>
            Login / Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestBaristaSheet;

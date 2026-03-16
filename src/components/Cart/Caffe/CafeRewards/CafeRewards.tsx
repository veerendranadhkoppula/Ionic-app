/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styles from "./CafeRewards.module.css";

interface Props {
  openSheet: () => void;
  selectedReward: any | null;
  clearReward: () => void;
}

const CafeRewards: React.FC<Props> = ({
  openSheet,
  selectedReward,
  clearReward,
}) => {
  return (
    <div className={styles.main}>
      {!selectedReward ? (
        <div className={styles.mainContainer} onClick={openSheet}>
          <div className={styles.left}>
            <div className={styles.RewardIcon}>
              <svg
                width="35"
                height="35"
                viewBox="0 0 35 35"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M28.7963 11.6663H5.75915C4.96396 11.6663 4.31934 12.3192 4.31934 13.1247V16.0413C4.31934 16.8467 4.96396 17.4997 5.75915 17.4997H28.7963C29.5914 17.4997 30.2361 16.8467 30.2361 16.0413V13.1247C30.2361 12.3192 29.5914 11.6663 28.7963 11.6663Z"
                  fill="#D0892F"
                />
                <path d="M17.2777 11.6663V30.6247V11.6663Z" fill="#D0892F" />
                <path
                  d="M27.3564 17.4997V27.708C27.3564 28.4815 27.053 29.2234 26.513 29.7704C25.973 30.3174 25.2405 30.6247 24.4768 30.6247H10.0786C9.31488 30.6247 8.58244 30.3174 8.0424 29.7704C7.50236 29.2234 7.19897 28.4815 7.19897 27.708V17.4997"
                  fill="#D0892F"
                />
                <path
                  d="M10.7985 11.6663C9.84386 11.6663 8.9283 11.2822 8.25326 10.5985C7.57821 9.91476 7.19897 8.98743 7.19897 8.02049C7.19897 7.05356 7.57821 6.12623 8.25326 5.4425C8.9283 4.75877 9.84386 4.37466 10.7985 4.37466C12.1875 4.35015 13.5486 5.03275 14.7044 6.33344C15.8601 7.63413 16.7569 9.49254 17.2777 11.6663C17.7985 9.49254 18.6953 7.63413 19.851 6.33344C21.0068 5.03275 22.3679 4.35015 23.7569 4.37466C24.7115 4.37466 25.6271 4.75877 26.3022 5.4425C26.9772 6.12623 27.3564 7.05356 27.3564 8.02049C27.3564 8.98743 26.9772 9.91476 26.3022 10.5985C25.6271 11.2822 24.7115 11.6663 23.7569 11.6663"
                  fill="#D0892F"
                />
                <path
                  d="M17.2777 11.6663V30.6247M17.2777 11.6663C16.7569 9.49254 15.8601 7.63413 14.7044 6.33344C13.5486 5.03275 12.1875 4.35015 10.7985 4.37466C9.84386 4.37466 8.9283 4.75877 8.25326 5.4425C7.57821 6.12623 7.19897 7.05356 7.19897 8.02049C7.19897 8.98743 7.57821 9.91476 8.25326 10.5985C8.9283 11.2822 9.84386 11.6663 10.7985 11.6663M17.2777 11.6663C17.7985 9.49254 18.6953 7.63413 19.851 6.33344C21.0068 5.03275 22.3679 4.35015 23.7569 4.37466C24.7115 4.37466 25.6271 4.75877 26.3022 5.4425C26.9772 6.12623 27.3564 7.05356 27.3564 8.02049C27.3564 8.98743 26.9772 9.91476 26.3022 10.5985C25.6271 11.2822 24.7115 11.6663 23.7569 11.6663M27.3564 17.4997V27.708C27.3564 28.4815 27.053 29.2234 26.513 29.7704C25.973 30.3174 25.2405 30.6247 24.4768 30.6247H10.0786C9.31488 30.6247 8.58244 30.3174 8.0424 29.7704C7.50236 29.2234 7.19897 28.4815 7.19897 27.708V17.4997M5.75915 11.6663H28.7963C29.5914 11.6663 30.2361 12.3192 30.2361 13.1247V16.0413C30.2361 16.8467 29.5914 17.4997 28.7963 17.4997H5.75915C4.96396 17.4997 4.31934 16.8467 4.31934 16.0413V13.1247C4.31934 12.3192 4.96396 11.6663 5.75915 11.6663Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.RewardDetails}>
              <h3>Reward Unlocked</h3>
              <p>You have free Beverage available</p>
            </div>
          </div>

          <div className={styles.right}>
            <svg
              width="8"
              height="13"
              viewBox="0 0 8 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-0.000161171 1.05973L1.06084 -0.000272751L6.83984 5.77673C6.93299 5.86929 7.00692 5.97937 7.05737 6.10062C7.10782 6.22187 7.13379 6.3519 7.13379 6.48323C7.13379 6.61455 7.10782 6.74458 7.05737 6.86583C7.00692 6.98708 6.93299 7.09716 6.83984 7.18973L1.06084 12.9697L0.000838757 11.9097L5.42484 6.48473L-0.000161171 1.05973Z"
                fill="white"
              />
            </svg>
          </div>
        </div>
      ) : (
        <div className={styles.addedContainer}>
          <h3 className={styles.addedTitle}>Reward added</h3>
          <div className={styles.Line}></div>

          <div className={styles.addedItem}>
            <div className={styles.left}>
              <div className={styles.addedrewardimg}>
                <img
                  src={selectedReward.image}
                  alt="reward"
                  className={styles.addedImage}
                />
              </div>

              <div className={styles.addedRewardDetails}>
                <div className={styles.adedveganiconandTitle}>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 10V0H10V10H0ZM1.11111 8.88889H8.88889V1.11111H1.11111V8.88889ZM5 7.22222C4.38889 7.22222 3.86574 7.00463 3.43056 6.56944C2.99537 6.13426 2.77778 5.61111 2.77778 5C2.77778 4.38889 2.99537 3.86574 3.43056 3.43056C3.86574 2.99537 4.38889 2.77778 5 2.77778C5.61111 2.77778 6.13426 2.99537 6.56944 3.43056C7.00463 3.86574 7.22222 4.38889 7.22222 5C7.22222 5.61111 7.00463 6.13426 6.56944 6.56944C6.13426 7.00463 5.61111 7.22222 5 7.22222Z"
                      fill="#34A853"
                    />
                  </svg>

                  <h4>{selectedReward.title}</h4>
                </div>

                <p>{selectedReward.description}</p>
              </div>
            </div>

            <button onClick={clearReward} className={styles.removeBtn}>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CafeRewards;

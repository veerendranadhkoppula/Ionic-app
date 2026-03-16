import React from "react";
import styles from "./EarnCafeStamps.module.css";

interface EarnCafeStampsProps {
  earnedStamps?: number;
  totalStamps?: number;
}

const EarnCafeStamps: React.FC<EarnCafeStampsProps> = ({
  earnedStamps = 0,
  totalStamps = 10,
}) => {

  // Compute rewards and remainder for proper cycle display
  const rewards = Math.floor(earnedStamps / totalStamps);
  const remainder = earnedStamps % totalStamps;

  // If remainder is 0 but rewards > 0, display a full badge (totalStamps/totalStamps)
  const displayUnits = remainder === 0 && rewards > 0 ? totalStamps : remainder;
  const progressPerc = Math.min((displayUnits / totalStamps) * 100, 100);

  // Remaining to next reward should always be non-negative and refer to the NEXT reward
  const remaining = displayUnits === 0 ? totalStamps : totalStamps - displayUnits;

  return (
    <div className={styles.main}>
      <div className={`${styles.MainCoantiner} ${rewards > 0 ? styles.MainCoantinerFixed : ""}`}>

        <div className={styles.Top}>
          <h3>You’ll earn {earnedStamps} Café Stamps with this order</h3>
          <p>{remaining} more to go for a free reward</p>
        </div>

        <div className={styles.Bottom}>
          <div className={styles.progressWrapper}>

            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPerc}%` }}
              />
            </div>

            <div
              className={styles.progressBadge}
              style={{ left: `${progressPerc}%` }}
            >
              {displayUnits}/{totalStamps}
              <span className={styles.badgeArrow} />
            </div>

            {rewards > 0 && (
              <div className={styles.successLine} aria-live="polite">
                YAY! You have earned {rewards} free reward{rewards > 1 ? "s" : ""}.
              </div>
            )}

          </div>

          <div className={styles.iconWrapper}>

            <div className={styles.coffeeIcon}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.64474 0.75V2.43421M10.0132 0.75V2.43421M11.6974 5.80263C11.9207 5.80263 12.1349 5.89135 12.2928 6.04928C12.4508 6.2072 12.5395 6.4214 12.5395 6.64474V13.3816C12.5395 14.2749 12.1846 15.1317 11.5529 15.7634C10.9212 16.3951 10.0644 16.75 9.17105 16.75H4.11842C3.22506 16.75 2.36829 16.3951 1.73659 15.7634C1.10489 15.1317 0.75 14.2749 0.75 13.3816V6.64474C0.75 6.4214 0.838722 6.2072 0.996647 6.04928C1.15457 5.89135 1.36877 5.80263 1.59211 5.80263H13.3816C14.2749 5.80263 15.1317 6.15752 15.7634 6.78922C16.3951 7.42092 16.75 8.27769 16.75 9.17105C16.75 10.0644 16.3951 10.9212 15.7634 11.5529C15.1317 12.1846 14.2749 12.5395 13.3816 12.5395H12.5395M3.27632 0.75V2.43421"
                  stroke="white"
                  strokeWidth="1.5"
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

export default EarnCafeStamps;

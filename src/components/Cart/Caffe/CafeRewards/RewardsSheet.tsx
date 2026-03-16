/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styles from "./RewardsSheet.module.css";
import type { StampRewardProduct } from "../../../../api/apiStamps";

// Re-export for any consumer that still imports RewardItem from here
export type { StampRewardProduct as RewardItem };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedReward: any | null;
  setSelectedReward: (reward: any | null) => void;
  rewardItems: StampRewardProduct[];
  rewardItemsLoading: boolean;
  /** Number of rewards the user is ELIGIBLE to redeem (from backend stampReward field) */
  availableRewardCount: number;
}

const RewardsSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedReward,
  setSelectedReward,
  rewardItems,
  rewardItemsLoading,
  availableRewardCount,
}) => {
  const rewards = rewardItems;

  // Dietary type icon — matches the same visual pattern used across the app
  const DietaryIcon = ({ type }: { type: StampRewardProduct["dietaryType"] }) => {
    const isVeg = type === "veg" || type === "vegan";
    // Veg / Vegan → green border + green filled circle
    // Non-veg / Egg → brown/red border + brown filled circle
    const borderColor  = isVeg ? "#34A853" : "#A83434";
    const circleColor  = isVeg ? "#34A853" : "#A83434";
    return (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 10.2275V0H10.2275V10.2275H0ZM1.13639 9.09109H9.09109V1.13639H1.13639V9.09109ZM5.11374 7.38651C4.48872 7.38651 3.95368 7.16397 3.50859 6.71888C3.06351 6.2738 2.84096 5.73875 2.84096 5.11374C2.84096 4.48872 3.06351 3.95368 3.50859 3.50859C3.95368 3.06351 4.48872 2.84096 5.11374 2.84096C5.73875 2.84096 6.2738 3.06351 6.71888 3.50859C7.16397 3.95368 7.38651 4.48872 7.38651 5.11374C7.38651 5.73875 7.16397 6.2738 6.71888 6.71888C6.2738 7.16397 5.73875 7.38651 5.11374 7.38651Z"
          fill={isVeg ? borderColor : "none"}
          stroke={isVeg ? "none" : borderColor}
          strokeWidth={isVeg ? "0" : "0.8"}
        />
        <circle cx="5.11" cy="5.11" r="2.27" fill={circleColor} />
      </svg>
    );
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={onClose}
      >
        <div
          className={`${styles.sheet} ${isOpen ? styles.sheetOpen : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.main}>
            <div className={styles.MainContainer}>
              <div className={styles.Top}>
                <div className={styles.TopLeft}>
                  <h4>Rewards</h4>
                  <p>You’ve got a free coffee reward, you can choose</p>
                </div>
                <div className={styles.TopRight} onClick={onClose}>
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
                </div>
              </div>

              <div className={styles.Bottom}>
                <div className={styles.BottomHeading}>
                  <p>
                    Available Rewards -{" "}
                    {rewardItemsLoading ? "..." : availableRewardCount.toString().padStart(2, "0")}
                  </p>
                </div>

                <div className={styles.RewardList}>
                  {rewardItemsLoading ? (
                    <p style={{ fontFamily: "var(--lato)", fontSize: 13, color: "#8c8c8c" }}>
                      Loading rewards...
                    </p>
                  ) : rewards.length === 0 ? (
                    <p style={{ fontFamily: "var(--lato)", fontSize: 13, color: "#8c8c8c" }}>
                      No reward items available.
                    </p>
                  ) : (
                    rewards.map((reward) => (
                    <div className={styles.RewardItem} key={reward.id}>
                      <div className={styles.RewardLeft}>
                        <div className={styles.RewardImage}>
                          <img
                            src={reward.image || "/12.gif"}
                            alt={reward.title || "reward"}
                            onError={(e) => {
                              // Fallback to a placeholder image if the reward image fails
                              try {
                                console.warn("⚠️ Reward image failed to load, falling back to placeholder:", reward.image);
                                (e.target as HTMLImageElement).src = "/12.gif";
                              } catch {
                                // ignore
                              }
                            }}
                          />
                        </div>

                        <div className={styles.RewardDetails}>
                          <div className={styles.vegcatIcon}>
                            <DietaryIcon type={reward.dietaryType} />
                          </div>

                          <div className={styles.RewardTitleRow}>
                            <h3>{reward.title}</h3>
                            <p>{reward.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className={styles.RewardRight}>
                        {selectedReward?.id === reward.id ? (
                          <button
                            className={styles.removebtn}
                            onClick={() => setSelectedReward(null)}
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            className={styles.ADDbtn}
                            onClick={() => setSelectedReward(reward)}
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RewardsSheet;

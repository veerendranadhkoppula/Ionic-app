import React, { useState, useCallback, useEffect } from "react";
import styles from "./StampsContainer.module.css";
import StampBottomSheet from "../StampBottomSheet/StampBottomSheet";
import collectedStamp from "./cstamp.png";
import uncollectedStamp from "./nostamp.png";
import { getUserWtStampData } from "../../../api/apiStamps";
import tokenStorage from "../../../utils/tokenStorage";
import { useIonViewWillEnter } from "@ionic/react";

const TOTAL_STAMPS = 10;

const StampsContainer = () => {
  const [showSheet, setShowSheet] = useState(false);

  const [stampCount, setStampCount] = useState(0);
  const [rewards, setRewards] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStamps = useCallback(async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getToken();
      console.log("StampsContainer: fetching stamps, token present:", !!token);
      const { stampCount: sc, stampReward: sr } = await getUserWtStampData(token);
      console.log("StampsContainer: received stampCount=", sc, "stampReward=", sr);
      setStampCount(sc);
      setRewards(sr);
    } catch (err) {
      console.error("StampsContainer: fetch failed", err);
      setStampCount(0);
      setRewards(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStamps();
  }, [fetchStamps]);

  useIonViewWillEnter(() => {
    fetchStamps();
  });

  // stampCount is total lifetime stamps; show position within current 10-stamp cycle
  const remainder = stampCount % TOTAL_STAMPS;
  const currentStamps = remainder === 0 && stampCount > 0 ? TOTAL_STAMPS : remainder;
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.top}>
            <h4>Your brew journey</h4>
          </div>

          <div className={styles.bottom}>
            <div className={styles.StampsDetails}>
              <div className={styles.StampsDetailsLeft}>
                <p>{loading ? "Loading..." : `${currentStamps} of 10 stamps collected`}</p>
              </div>

              <div className={styles.StampsDetailsRight}>
                <p>Your Rewards</p>
                <h4>{rewards}</h4>
              </div>
            </div>

            <div className={styles.Stamps}>
              <div className={styles.StampCollects}>
                {[...Array(TOTAL_STAMPS)].map((_, index) => {
                  const isCollected = index < currentStamps;

                  const shadowClass = isCollected
                    ? `${styles[`shadow${index % 5}`]} ${
                        index >= 5 ? styles.secondRow : ""
                      }`
                    : "";

                  return (
                    <div
                      key={index}
                      className={`${styles.stampWrapper} ${shadowClass}`}
                    >
                      {isCollected ? (
                        <img
                          src={collectedStamp}
                          alt="stamp"
                          className={styles.collectedImg}
                        />
                      ) : (
                        <div className={styles.uncollectedCircle}>
                          <img src={uncollectedStamp} alt="stamp" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                className={styles.Howitworks}
                onClick={() => setShowSheet(true)}
              >
                <p>How it works</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSheet && <StampBottomSheet onClose={() => setShowSheet(false)} />}
    </>
  );
};

export default StampsContainer;

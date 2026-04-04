import React, { useState, useCallback, useEffect, useRef } from "react";
import styles from "./StampsContainer.module.css";
import StampBottomSheet from "../StampBottomSheet/StampBottomSheet";
import collectedStamp from "./cstamp.png";
import uncollectedStamp from "./nostamp.png";
import { getUserWtStampData } from "../../../api/apiStamps";
import tokenStorage from "../../../utils/tokenStorage";
import { useIonViewWillEnter } from "@ionic/react";

const TOTAL_STAMPS = 10;
const STAMP_INTERVAL_MS = 120;

const StampsContainer = () => {
  const [showSheet, setShowSheet] = useState(false);
  const [stampCount, setStampCount] = useState(0);
  const [rewards, setRewards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animatedCount, setAnimatedCount] = useState(0);
  const [stampingIndex, setStampingIndex] = useState<number | null>(null);

  const stampTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentStampsRef = useRef(0);

  const fetchStamps = useCallback(async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getToken();
      const { stampCount: sc, stampReward: sr } = await getUserWtStampData(token);
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

  const playStampAnimation = useCallback((target: number) => {
    if (stampTimerRef.current) clearInterval(stampTimerRef.current);
    setAnimatedCount(0);
    setStampingIndex(null);
    currentStampsRef.current = 0;

    if (target === 0) return;

    let current = 0;
    stampTimerRef.current = setInterval(() => {
      current += 1;
      setStampingIndex(current - 1);
      setAnimatedCount(current);
      if (current >= target) {
        clearInterval(stampTimerRef.current!);
        stampTimerRef.current = null;
        setTimeout(() => setStampingIndex(null), 300);
      }
    }, STAMP_INTERVAL_MS);
  }, []);

  const remainder = stampCount % TOTAL_STAMPS;
  const currentStamps = remainder === 0 && stampCount > 0 ? TOTAL_STAMPS : remainder;


  useEffect(() => {
    if (!loading) {
      playStampAnimation(currentStamps);
    }
  }, [loading, currentStamps, playStampAnimation]);


  useIonViewWillEnter(() => {
    playStampAnimation(currentStamps);
  });


  useEffect(() => {
    return () => {
      if (stampTimerRef.current) clearInterval(stampTimerRef.current);
    };
  }, []);

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
                  const isCollected = index < animatedCount;
                  const isStamping = index === stampingIndex;

                  const shadowClass = isCollected
                    ? `${styles[`shadow${index % 5}`]} ${index >= 5 ? styles.secondRow : ""}`
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
                          className={`${styles.collectedImg} ${isStamping ? styles.stampIn : ""}`}
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

              <div className={styles.Howitworks} onClick={() => setShowSheet(true)}>
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
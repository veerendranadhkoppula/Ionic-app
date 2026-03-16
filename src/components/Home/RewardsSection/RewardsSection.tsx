import React, { useEffect, useState, useCallback } from "react";
import styles from "./RewardsSection.module.css";
import { useIonRouter, useIonViewWillEnter } from "@ionic/react";
import tokenStorage from "../../../utils/tokenStorage";
import { getUserWtCoins } from "../../../api/apiCoins";
import { getUserWtStampData } from "../../../api/apiStamps";

const RewardsSection = () => {
  const ionRouter = useIonRouter();
  const [beanBalance, setBeanBalance] = useState<number | null>(null);
  const [stampReward, setStampReward] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await tokenStorage.getToken();
      const [balance, stampData] = await Promise.all([
        getUserWtCoins(token),
        getUserWtStampData(token),
      ]);
      setBeanBalance(balance);
      setStampReward(stampData.stampReward);
    } catch {
      setBeanBalance(0);
      setStampReward(0);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh every time the Home view becomes active (e.g. after completing an order)
  useIonViewWillEnter(() => {
    fetchData();
  });

  const rewards = stampReward;
  return (
    <>
      <div className={styles.main}>
        <div className={styles.maincontainer}>
          <div className={styles.left}>
            <div className={styles.stamps}>
              <div className={styles.stampsTop}>
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 17 17"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8.25 4.91693V15.75M8.25 4.91693C7.94856 3.6748 7.42954 2.61287 6.76061 1.86964C6.09169 1.1264 5.3039 0.736358 4.5 0.750364C3.94747 0.750364 3.41756 0.969852 3.02686 1.36054C2.63616 1.75124 2.41667 2.28113 2.41667 2.83365C2.41667 3.38617 2.63616 3.91606 3.02686 4.30675C3.41756 4.69744 3.94747 4.91693 4.5 4.91693M8.25 4.91693C8.55144 3.6748 9.07046 2.61287 9.73939 1.86964C10.4083 1.1264 11.1961 0.736358 12 0.750364C12.5525 0.750364 13.0824 0.969852 13.4731 1.36054C13.8638 1.75124 14.0833 2.28113 14.0833 2.83365C14.0833 3.38617 13.8638 3.91606 13.4731 4.30675C13.0824 4.69744 12.5525 4.91693 12 4.91693M14.0833 8.25018V14.0834C14.0833 14.5254 13.9077 14.9493 13.5952 15.2619C13.2826 15.5744 12.8587 15.75 12.4167 15.75H4.08333C3.64131 15.75 3.21738 15.5744 2.90482 15.2619C2.59226 14.9493 2.41667 14.5254 2.41667 14.0834V8.25018M1.58333 4.91693H14.9167C15.3769 4.91693 15.75 5.29002 15.75 5.75024V7.41687C15.75 7.8771 15.3769 8.25018 14.9167 8.25018H1.58333C1.1231 8.25018 0.75 7.8771 0.75 7.41687V5.75024C0.75 5.29002 1.1231 4.91693 1.58333 4.91693Z"
                    stroke="#4B3827"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p>{rewards === null ? "..." : rewards}</p>
              </div>
              <div className={styles.stampsBottom}>
                <p>Rewards</p>
              </div>
            </div>
            <div className={styles.Beans}>
              <div className={styles.BeansTop}>
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 19 19"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.8996 5.78256C11.3953 2.63728 9.03574 0.300781 6.15386 0.300781C2.92976 0.300781 0.300049 3.32025 0.300049 7.04067C0.300049 10.7611 2.70462 13.511 5.73059 13.7536C5.9017 14.9129 6.40603 15.9553 7.20755 16.7641C8.24322 17.7975 9.63013 18.3008 11.0801 18.3008C12.8362 18.3008 14.6824 17.5639 16.1234 16.126C18.7531 13.502 19.0413 9.51196 16.7628 7.22939C15.529 5.99823 13.7278 5.49499 11.8906 5.78256H11.8996ZM15.2588 8.30777C15.0967 8.33473 14.9256 8.34372 14.7184 8.3527C14.007 8.37966 13.0433 8.41561 12.0977 9.35919C11.1611 10.2938 11.1161 11.2643 11.0891 11.9743C11.0621 12.5764 11.0531 12.9448 10.6118 13.3852C10.1705 13.8255 9.80124 13.8435 9.19784 13.8614C8.76556 13.8794 8.23422 13.9064 7.67585 14.131C7.54977 13.7356 7.46872 13.3222 7.46872 12.8729C7.46872 11.5429 8.08112 10.186 9.1258 9.14352C9.7581 8.50506 10.5326 8.02471 11.3863 7.74162C11.8802 7.57801 12.3969 7.49309 12.9173 7.49C13.8088 7.49 14.6194 7.77757 15.2588 8.30777ZM10.1615 6.2858L10.0894 6.32175C10.0174 6.34871 9.95434 6.39364 9.88229 6.4206C9.71118 6.50148 9.54007 6.59134 9.37796 6.6902C9.29691 6.73513 9.22486 6.78905 9.14381 6.83398C8.9817 6.93283 8.8286 7.04966 8.6755 7.1575C8.61246 7.21142 8.54042 7.25635 8.47738 7.31027C8.26123 7.48101 8.0631 7.66074 7.86498 7.85844C7.84696 7.87642 7.82895 7.90338 7.80194 7.92135C7.57679 7.23837 7.16252 6.78006 6.8293 6.41161C6.41503 5.96229 6.17187 5.69269 6.17187 5.07262C6.17187 4.45255 6.42404 4.18296 6.8293 3.73363C7.12649 3.4191 7.47772 3.0237 7.71188 2.46653C8.99071 3.12255 9.94533 4.54242 10.1615 6.25884V6.2858ZM2.11023 7.04067C2.11023 4.44357 3.76731 2.30477 5.85667 2.11606C5.7576 2.25086 5.64053 2.38565 5.50544 2.53842C5.02813 3.05964 4.36169 3.76958 4.36169 5.0906C4.36169 6.41161 5.01912 7.13054 5.50544 7.65175C5.91971 8.10108 6.16287 8.37068 6.16287 8.99075C6.16287 9.61082 5.9107 9.88041 5.50544 10.3297C5.20825 10.6443 4.85702 11.0397 4.62286 11.5879C3.15491 10.842 2.11923 9.09858 2.11923 7.04067H2.11023ZM14.8625 14.8589C13.0253 16.6922 10.3506 17.0247 8.73854 15.6947C8.90065 15.6767 9.07176 15.6587 9.26989 15.6498C9.98135 15.6228 10.945 15.5869 11.8906 14.6433C12.8272 13.7087 12.8722 12.7381 12.8993 12.0282C12.9263 11.4171 12.9353 11.0576 13.3766 10.6173C13.8179 10.177 14.1871 10.159 14.7905 10.141C15.2228 10.123 15.7631 10.1051 16.3305 9.87142C16.8348 11.4351 16.3215 13.4121 14.8625 14.8589Z"
                    fill="#4B3827"
                    stroke="#F2F1F0"
                    strokeWidth="0.6"
                    strokeLinejoin="round"
                  />
                </svg>
                <p>{beanBalance === null ? "..." : beanBalance}</p>
              </div>
              <div className={styles.BeansBottom}>
                <p>Beans</p>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <h4>Collect rewards with every cafe and coffee order</h4>
            <div className={styles.arrow}  onClick={() => ionRouter.push("/rewards", "forward")}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="18" height="18" rx="9" transform="matrix(-1 0 0 1 18 0)" fill="#D8A05A"/>
<path d="M8 6L11 9L8 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RewardsSection;

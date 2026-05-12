import React, { useState, useEffect } from "react";
import styles from "./Earnings.module.css";
import { getCurrentUser } from "../../../utils/authStorage";
import UserQRCode from "../UserQRCode";
import { getEarningTransactions, EarningTransaction } from "../../../api/apiStamps";
import { getToken } from "../../../utils/tokenStorage";
import emptyImg from "./1.png";

const Earnings = () => {
  const [activeTab, setActiveTab] = useState<"scan" | "transactions">("scan");
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "transactions") return;

    let cancelled = false;
    setLoading(true);

    getToken()
      .then((token) =>
        getEarningTransactions(token)
          .then((data) => {
            if (!cancelled) {
              setTransactions(data);
              setLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) setLoading(false);
          })
      );

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>

        {/* ---------- TABS ---------- */}
        <div className={styles.top}>
          <div className={styles.tabs}>
            <button
              className={
                activeTab === "scan"
                  ? styles.activeTab
                  : styles.inactiveTab
              }
              onClick={() => setActiveTab("scan")}
            >
              SCAN QR
            </button>

            <button
              className={
                activeTab === "transactions"
                  ? styles.activeTab
                  : styles.inactiveTab
              }
              onClick={() => setActiveTab("transactions")}
            >
              TRANSACTIONS
            </button>
          </div>

          <div className={styles.fullLine}></div>
        </div>

        {/* ---------- CONTENT ---------- */}
        <div className={styles.bottom}>

          {/* SCAN TAB */}
          {activeTab === "scan" && (
            <div className={styles.scanContainer}>
              <div className={styles.ScanDetails}>
                <h3>Scan at the counter</h3>
                <p>For in-store orders only</p>
              </div>

              <div className={styles.ScanCode}>
                <div className={styles.QRContainer}>
                  {(() => {
                    const user = getCurrentUser();
                    if (!user || user.isGuest) {
                      return (
                        <p className={styles.qrGuestText}>
                          Login or sign up to see your QR code
                        </p>
                      );
                    }

                    return <UserQRCode userId={user.id} />;
                  })()}
                </div>

                <p>
                  {getCurrentUser()?.id
                    ? `reward_user_${getCurrentUser()?.id}`
                    : ""}
                </p>
              </div>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === "transactions" && (
            <>
              <h3 className={styles.heading}>Recent Activity</h3>

              {loading ? (
                <div className={styles.list}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className={styles.skeletonCard}>
                      <div className={styles.skeletonLeft}>
                        <div className={styles.skeletonTitle} />
                        <div className={styles.skeletonOrderId} />
                      </div>
                      <div className={styles.skeletonRight}>
                        <div className={styles.skeletonAmount} />
                        <div className={styles.skeletonDate} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>No transactions yet</p>
                </div>
              ) : (
                <div className={styles.list}>
                  {transactions.map((item) => (
                    <div key={item.id} className={styles.card}>
                      <div className={styles.left}>
                        <h4>{item.title}</h4>
                        <p>Order #{item.orderId}</p>
                      </div>

                      <div className={styles.right}>
                        <h4
                          className={
                            item.isPositive
                              ? styles.positive
                              : styles.negative
                          }
                        >
                          {item.amount}
                        </h4>

                        <p>{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Earnings;
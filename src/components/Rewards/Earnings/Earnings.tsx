import React, { useState, useEffect } from "react";
import styles from "./Earnings.module.css";
import { getCurrentUser } from "../../../utils/authStorage";
import UserQRCode from "../UserQRCode";
import { getEarningTransactions, EarningTransaction } from "../../../api/apiStamps";
import { getToken } from "../../../utils/tokenStorage";

const Earnings = () => {
  const [activeTab, setActiveTab] = useState<"scan" | "transactions">("scan");
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  // Transactions are not selectable/clickable UI — implement paginated reveal (5 at a time).
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [refreshKey, setRefreshKey] = useState(0);

  // Increment refreshKey on every mount so switching to this screen always re-fetches
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (activeTab !== "transactions") return;
    let cancelled = false;
    setLoading(true);
    getToken().then((token) =>
      getEarningTransactions(token).then((data) => {
        if (!cancelled) {
          setTransactions(data);
          setLoading(false);
        }
      }).catch(() => { if (!cancelled) setLoading(false); })
    );
    return () => { cancelled = true; };
  }, [activeTab, refreshKey]);

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.top}>
          <div className={styles.tabs}>
            <button
              className={
                activeTab === "scan" ? styles.activeTab : styles.inactiveTab
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
          <div className={styles.line}></div>
        </div>

        <div className={styles.bottom}>
          {activeTab === "scan" && (
            <div className={styles.scanContainer}>
              <div className={styles.ScanDetails}>
                <h3>Scan at the counter</h3>
                <p>For in-store orders only</p>
              </div>

              <div className={styles.ScanCode}>
                <div className={styles.QRContainer}>
                  {/* Render QR code for logged-in user: reward_user_<userId>
                      If guest or not logged in, show a friendly message */}
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
                <p>{getCurrentUser()?.id ? `reward_user_${getCurrentUser()?.id}` : ""}</p>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className={styles.transhistoryContainer}>
              {loading ? (
                <div className={styles.transhistoryContainer}>
                  {[1, 2, 3].map((n) => (
                    <div className={styles.skeletonCard} key={n}>
                      <div className={styles.skeletonLeft}>
                        <div className={`${styles.skeletonBase} ${styles.skeletonTag}`} />
                        <div className={`${styles.skeletonBase} ${styles.skeletonTitle}`} />
                        <div className={`${styles.skeletonBase} ${styles.skeletonOrderId}`} />
                      </div>
                      <div className={styles.skeletonRight}>
                        <div className={`${styles.skeletonBase} ${styles.skeletonAmount}`} />
                        <div className={`${styles.skeletonBase} ${styles.skeletonDate}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <p className={styles.emptyText}>No transactions yet.</p>
              ) : (
                // show only visibleCount items and make cards non-clickable
                transactions.slice(0, visibleCount).map((item) => (
                  <div key={item.id} className={styles.transhistoryCard}>
                    <div className={styles.transhistoryCardLeft}>
                      <div className={styles.Ordertype}>
                        <p>{item.orderType}</p>
                      </div>

                      <div className={styles.OrderDetails}>
                        <h4>{item.title}</h4>
                        <p>Order {item.orderId}</p>
                      </div>
                    </div>

                    <div className={styles.transhistoryCardRight}>
                      <div
                        className={
                          item.isPositive
                            ? styles.statusPositive
                            : styles.statusNegative
                        }
                      >
                        <p>{item.amount}</p>
                      </div>

                      <div className={styles.dateandtime}>
                        <p>{item.date}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {/* View more link - reveal 5 more per click, matching orders UX */}
              {activeTab === "transactions" && transactions.length > visibleCount && (
                <div className={styles.viewMoreContainer}>
                  <p className={styles.viewMore} onClick={() => setVisibleCount((v) => v + 5)}>View more</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Earnings;

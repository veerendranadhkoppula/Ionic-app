import styles from "./MantisBeans.module.css";
import mugs from "./1.gif";
import React, { useState, useEffect } from "react";
import BeansBottomSheet from "../BeansBottomSheet/BeansBottomSheet";
import tokenStorage from "../../../utils/tokenStorage";
import { getUserWtCoins } from "../../../api/apiCoins";

const MantisBeans = () => {
  const [showSheet, setShowSheet] = useState(false);
  const [beanBalance, setBeanBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchBeans = async () => {
      try {
        setLoading(true);
        const token = await tokenStorage.getToken();
        const balance = await getUserWtCoins(token);
        if (mounted) setBeanBalance(balance);
      } catch {
        if (mounted) setBeanBalance(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchBeans();
    return () => { mounted = false; };
  }, []);

  const beansLabel = loading ? "Loading..." : `${beanBalance ?? 0} Beans`;

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.top}>
            <h3>Your White Mantis Beans</h3>
          </div>
          <div className={styles.bottom}>
            <div className={styles.beansEarningsCard}>
              <div className={styles.beansEarningsCardLeft}>
                <h3>White Mantis beans </h3>
                <h4>{beansLabel}</h4>
              </div>
              <div className={styles.beansEarningsCardRight}>
                <img src={mugs} alt="beans" />
                <h5 onClick={() => setShowSheet(true)}>How it works</h5>
              </div>
            </div>
            <p>Beans expire 12 months after they're earned</p>
          </div>
        </div>
      </div>
      {showSheet && <BeansBottomSheet onClose={() => setShowSheet(false)} />}
    </>
  );
};

export default MantisBeans;


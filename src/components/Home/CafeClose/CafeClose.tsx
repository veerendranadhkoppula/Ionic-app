import React from "react";
import styles from "./CafeClose.module.css";
import closeicon from "./1.png";

type Props = {
  openingTime?: string | null;
};

const formatOpeningTime = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
};

const CafeClose: React.FC<Props> = ({ openingTime }) => {
  const display = formatOpeningTime(openingTime);

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainConatiner}>
          <div className={styles.left}>
            <img src={closeicon} alt="close" className={styles.closeicon} />
          </div>
          <div className={styles.right}>
            <div className={styles.deatils}>
              <h3>We’re currently closed</h3>
              <p>
                {display
                  ? `We’ll start accepting orders again at ${display}`
                  : `We’ll start accepting orders again soon`}
              </p>
            </div>
            <div className={styles.Timings}>
              <p>{display ? `Opens ${display}` : "Opens soon"}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CafeClose;

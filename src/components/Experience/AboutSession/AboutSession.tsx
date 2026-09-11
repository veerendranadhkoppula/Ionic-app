import React from "react";
import styles from "./AboutSession.module.css";
import type { CoffeeExperience } from "../../../api/apiCoffeeExperience";

interface AboutSessionProps {
  experience: CoffeeExperience;
}

const AboutSession: React.FC<AboutSessionProps> = ({ experience }) => {
  const details = experience.aboutSession.details;

  return (
    <div className={styles.main}>
      <div className={styles.Box}>
        <p className={styles.Heading}>About the Session</p>
        <div className={styles.DetailsGrid}>
          {details.map((d, i) => (
            <React.Fragment key={i}>
              <p className={styles.Label}>{d.label}</p>
              <p className={styles.Value}>{d.value}</p>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutSession;

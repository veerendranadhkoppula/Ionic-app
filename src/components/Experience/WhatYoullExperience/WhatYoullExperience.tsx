import React from "react";
import styles from "./WhatYoullExperience.module.css";
import type { CoffeeExperience } from "../../../api/apiCoffeeExperience";

interface WhatYoullExperienceProps {
  experience: CoffeeExperience;
}

const WhatYoullExperience: React.FC<WhatYoullExperienceProps> = ({ experience }) => {
  const points = experience.whatYoullExperience.points;

  return (
    <div className={styles.main}>
      <div className={styles.Block}>
        <p className={styles.Heading}>What You&apos;ll Experience</p>
        <div className={styles.PointsGrid}>
          {points.map((p, i) => (
            <React.Fragment key={i}>
              <p className={styles.PointTitle}>{p.title}</p>
              <p className={styles.PointDescription}>{p.description}</p>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className={styles.EverySession}>
        <p className={styles.EverySessionHeading}>Every session is different</p>
        <p className={styles.EverySessionDescription}>{experience.everySessionIsDifferent.description}</p>
      </div>
    </div>
  );
};

export default WhatYoullExperience;

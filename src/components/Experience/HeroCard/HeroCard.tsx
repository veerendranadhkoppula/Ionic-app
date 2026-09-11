import React from "react";
import styles from "./HeroCard.module.css";
import {
  type CoffeeExperience,
  findEarliestBookableSlot,
  formatExperienceShortDateLabel,
  formatExperienceTimeRange,
} from "../../../api/apiCoffeeExperience";

interface HeroCardProps {
  experience: CoffeeExperience;
}

const HeroCard: React.FC<HeroCardProps> = ({ experience }) => {
  // Showing a single date/time badge when the experience can have many
  // dates is inherently a simplification — surfacing the earliest still-
  // bookable slot as a "starts from" indicator, a common enough pattern to
  // not be misleading, rather than omitting it entirely.
  const earliest = findEarliestBookableSlot(experience);

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        {experience.heroImage && (
          <img src={experience.heroImage} alt={experience.title} className={styles.HeroImage} />
        )}

        <div className={styles.Info}>
          <div className={styles.Group3}>
            <div className={styles.Group2}>
              <div className={styles.TitleGroup}>
                <h3 className={styles.Title}>{experience.title}</h3>
                <p className={styles.Description}>{experience.shortDescription}</p>
              </div>

              {earliest && (
                <div className={styles.Badges}>
                  <span className={styles.Badge}>{formatExperienceShortDateLabel(earliest.date)}</span>
                  <span className={styles.Badge}>
                    {formatExperienceTimeRange(earliest.date, earliest.time)}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.Divider}></div>
          </div>

          <div className={styles.PriceRow}>
            <span className={styles.Price}>AED {experience.price.toFixed(2)}</span>
            <span className={styles.PerPerson}>Per person</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroCard;

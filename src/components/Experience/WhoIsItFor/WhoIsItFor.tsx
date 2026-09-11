import React from "react";
import styles from "./WhoIsItFor.module.css";
import type { CoffeeExperience } from "../../../api/apiCoffeeExperience";
import coffeeIcon from "./cofee.png";
import beansIcon from "./beans.png";
import peopleIcon from "./people.png";
import giftIcon from "./gift.png";
import sparkIcon from "./spark.png";

interface WhoIsItForProps {
  experience: CoffeeExperience;
}

// Icons are static, fixed per position — only the title text is
// CMS-driven (same convention the website's WhoIsItFor uses with its own
// static PNGs). Order: Coffee curious, Enthusiasts wanting depth,
// Friends & couples, Gift for a coffee lover, First-time specialty drinkers.
const ICONS = [coffeeIcon, beansIcon, peopleIcon, giftIcon, sparkIcon];

const WhoIsItFor: React.FC<WhoIsItForProps> = ({ experience }) => {
  const items = experience.whoIsItFor.slice(0, 5);
  if (items.length === 0) return null;

  return (
    <div className={styles.main}>
      <div className={styles.Box}>
        <p className={styles.Heading}>Who is it for?</p>
        <div className={styles.Grid}>
          {items.map((item, i) => {
            const isLastInRow = (i + 1) % 3 === 0;
            const isLastOverall = i === items.length - 1;
            const showDivider = !isLastInRow && !isLastOverall;
            const icon = ICONS[i % ICONS.length];
            return (
              <div key={i} className={`${styles.Item} ${showDivider ? styles.ItemWithDivider : ""}`}>
                <img src={icon} alt="" className={styles.Icon} draggable={false} />
                <p className={styles.ItemText}>{item.title}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WhoIsItFor;

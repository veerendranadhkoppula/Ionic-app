import React from "react";
import styles from "./RoasteryGallery.module.css";
import type { CoffeeExperience } from "../../../api/apiCoffeeExperience";

interface RoasteryGalleryProps {
  experience: CoffeeExperience;
}

const RoasteryGallery: React.FC<RoasteryGalleryProps> = ({ experience }) => {
  const images = experience.fromTheRoastery.filter(Boolean);
  if (images.length === 0) return null;

  return (
    <div className={styles.main}>
      <p className={styles.Heading}>From the Roastery</p>
      <div className={styles.Grid}>
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className={styles.Image} draggable={false} />
        ))}
      </div>
    </div>
  );
};

export default RoasteryGallery;

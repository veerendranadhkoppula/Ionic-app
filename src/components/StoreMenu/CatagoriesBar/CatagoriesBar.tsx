import React, { useRef, useEffect, useState } from "react";
import styles from "./CatagoriesBar.module.css";

interface Props {
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  categories: string[];
}

const CatagoriesBar = ({ activeCategory, setActiveCategory, categories }: Props) => {
  const [hiddenCount, setHiddenCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if ((!activeCategory || activeCategory === "") && categories.length > 0) {
      setActiveCategory(categories[0]);
    }
  }, [activeCategory, setActiveCategory, categories]);

  useEffect(() => {
  const container = scrollRef.current;
  if (!container) return;

  const updateHiddenCount = () => {
    const remaining =
      container.scrollWidth -
      container.clientWidth -
      container.scrollLeft;

    if (remaining <= 0) {
      setHiddenCount(0);
      return;
    }

    const buttons = Array.from(container.children) as HTMLElement[];
    let hidden = 0;

    buttons.forEach((btn) => {
      const btnRight = btn.offsetLeft + btn.offsetWidth;
      if (btnRight > container.clientWidth + container.scrollLeft) {
        hidden++;
      }
    });

    setHiddenCount(hidden);
  };


  requestAnimationFrame(updateHiddenCount);


  container.addEventListener("scroll", updateHiddenCount);


  const resizeObserver = new ResizeObserver(updateHiddenCount);
  resizeObserver.observe(container);

  return () => {
    container.removeEventListener("scroll", updateHiddenCount);
    resizeObserver.disconnect();
  };
}, []);


  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.catbnconatiner} ref={scrollRef}>
          {categories.map((item) => (
            <button
              key={item}
              className={`${styles.catbtn} ${
                activeCategory === item ? styles.active : ""
              }`}
              onClick={() => setActiveCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {hiddenCount > 0 && (
          <div className={styles.countbadge}>
            <p>+{hiddenCount}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatagoriesBar;

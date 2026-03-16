import React, { useEffect, useState, useRef } from "react";
import styles from "./FeaturedSection.module.css";
import { useNewsList } from "../data/useNewsList";
import type { NewsArticle } from "../../../api/apiNews";

const AUTO_DURATION = 3000;

const FeaturedSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<number | undefined>(undefined);
  const { articles, loading } = useNewsList();

  // Featured = isFeatured blogs first, fallback to all articles
  const featured: NewsArticle[] = articles.filter((a) => a.isFeatured).length > 0
    ? articles.filter((a) => a.isFeatured)
    : articles;

  const startAutoSlide = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setActiveIndex((prev) =>
        prev === featured.length - 1 ? 0 : prev + 1
      );
    }, AUTO_DURATION);
  };

  useEffect(() => {
    if (featured.length === 0) return;
    if (activeIndex >= featured.length) setActiveIndex(0);
    startAutoSlide();
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, featured.length]);

  const handleManualChange = (index: number) => {
    setActiveIndex(index);
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <p>Featured Articles</p>
          </div>
          <div className={styles.skeletonBottom}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className={`${styles.skeletonBase} ${styles.skeletonTitleLine}`} />
              <div className={`${styles.skeletonBase} ${styles.skeletonSubLine1}`} />
              <div className={`${styles.skeletonBase} ${styles.skeletonSubLine2}`} />
            </div>
            <div className={styles.skeletonBars}>
              {[0, 1, 2].map((n) => (
                <div key={n} className={`${styles.skeletonBase} ${styles.skeletonBarDot}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (featured.length === 0) return null;

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.Top}>
          <p>Featured Articles</p>
        </div>

        <div className={styles.Bottom}>
          <div className={styles.info}>
            <h3 key={activeIndex} className={styles.fadeIn}>
              {featured[activeIndex].title}
            </h3>

            <p key={activeIndex + "desc"} className={styles.fadeIn}>
              {featured[activeIndex].tagline || featured[activeIndex].content.slice(0, 120)}
            </p>
          </div>

          <div className={styles.bars}>
            {featured.map((_: NewsArticle, index: number) => (
              <span
                key={index}
                className={
                  index === activeIndex
                    ? `${styles.bar} ${styles.active}`
                    : styles.bar
                }
                onClick={() => handleManualChange(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedSection;
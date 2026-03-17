import React, { useEffect, useState, useRef } from "react";
import styles from "./FeaturedSection.module.css";
import { useNewsList } from "../data/useNewsList";
import type { NewsArticle } from "../../../api/apiNews";

const AUTO_DURATION = 3000;

const FeaturedSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<number | undefined>(undefined);
  const { articles, loading } = useNewsList();

  // ── Touch/drag tracking ───────────────────────────────────
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const MIN_SWIPE_DISTANCE = 50; // px — less than this = tap, not swipe

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

  // ── Swipe handlers ────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
    // Pause auto slide while user is touching
    clearInterval(intervalRef.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    const isSwipe = Math.abs(distance) > MIN_SWIPE_DISTANCE;

    if (isSwipe) {
      if (distance > 0) {
        // Swiped LEFT → go to next
        setActiveIndex((prev) =>
          prev === featured.length - 1 ? 0 : prev + 1
        );
      } else {
        // Swiped RIGHT → go to previous
        setActiveIndex((prev) =>
          prev === 0 ? featured.length - 1 : prev - 1
        );
      }
    } else {
      // Was just a tap — restart auto slide
      startAutoSlide();
    }
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

        {/* Swipe area */}
        <div
          className={styles.Bottom}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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

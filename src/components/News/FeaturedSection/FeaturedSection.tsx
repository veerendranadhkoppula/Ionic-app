import React, { useEffect, useState, useRef } from "react";
import styles from "./FeaturedSection.module.css";
import { useFeaturedNewsList } from "../data/useFeaturedNewsList";
import type { NewsArticle } from "../../../api/apiNews";

const AUTO_DURATION = 3000;
const CARD_TITLE_LIMIT = 50;
const CARD_DESC_LIMIT = 60;
const MIN_SWIPE_DISTANCE = 50; // px — less than this = tap, not swipe

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="12" fill="#ffffff" />
    <path d="M16.4045 7.10217C16.5408 6.96594 16.7616 6.96594 16.8978 7.10217C17.0341 7.2384 17.0341 7.45922 16.8978 7.59545L12.4933 12L16.8978 16.4045C17.0341 16.5408 17.0341 16.7616 16.8978 16.8978C16.7616 17.0341 16.5408 17.0341 16.4045 16.8978L12 12.4933L7.59545 16.8978C7.45922 17.0341 7.2384 17.0341 7.10217 16.8978C6.96594 16.7616 6.96594 16.5408 7.10217 16.4045L11.5067 12L7.10217 7.59545C6.96594 7.45922 6.96594 7.2384 7.10217 7.10217C7.2384 6.96594 7.45922 6.96594 7.59545 7.10217L12 11.5067L16.4045 7.10217Z" fill="#4B3827" />
  </svg>
);

const FeaturedSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);
  const startX = useRef<number>(0);
  const endX = useRef<number>(0);
  const didDrag = useRef(false);
  const popupOpenedAt = useRef(0);
  const { articles, loading } = useFeaturedNewsList();

  const featured = articles;

  const startAutoSlide = () => {
    clearInterval(intervalRef.current);
    if (featured.length <= 1) return;

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

  const handleStart = (x: number) => {
    startX.current = x;
    endX.current = x;
    didDrag.current = false;
    clearInterval(intervalRef.current);
  };

  const handleMove = (x: number) => {
    endX.current = x;
    if (Math.abs(startX.current - x) > 10) didDrag.current = true;
  };

  const handleEnd = () => {
    const distance = startX.current - endX.current;
    const isSwipe = Math.abs(distance) > MIN_SWIPE_DISTANCE;

    if (isSwipe) {
      if (distance > 0) {
        setActiveIndex((prev) =>
          prev === featured.length - 1 ? 0 : prev + 1
        );
      } else {
        setActiveIndex((prev) =>
          prev === 0 ? featured.length - 1 : prev - 1
        );
      }
    } else if (!didDrag.current && featured[activeIndex]) {
      clearInterval(intervalRef.current);
      popupOpenedAt.current = Date.now();
      setSelectedArticle(featured[activeIndex]);
    } else {
      startAutoSlide();
    }
  };

  const closePopup = () => {
    setSelectedArticle(null);
    startAutoSlide();
  };

  if (loading) {
    return (
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <p>Featured News</p>
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

  const activeItem = featured[activeIndex];
  const activeTitle = truncate(activeItem.title, CARD_TITLE_LIMIT);
  const activeDescription = truncate(
    activeItem.tagline || activeItem.content.slice(0, 120),
    CARD_DESC_LIMIT,
  );

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <p>Featured News</p>
          </div>

          <div
            className={styles.Bottom}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.info}>
              <h3 key={activeIndex} className={styles.fadeIn}>
                {activeTitle}
              </h3>

              <p key={activeIndex + "desc"} className={styles.fadeIn}>
                {activeDescription}
              </p>

              <p className={styles.dateText}>{activeItem.date}</p>
            </div>

            <div className={styles.bars}>
              {featured.map((_, index: number) => (
                <span
                  key={index}
                  className={
                    index === activeIndex
                      ? `${styles.bar} ${styles.active}`
                      : styles.bar
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualChange(index);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedArticle && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (Date.now() - popupOpenedAt.current > 200) closePopup();
          }}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closePopup}
                aria-label="Close featured news"
              >
                <CloseIcon />
              </button>
            </div>
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>{selectedArticle.title}</h3>
              <p className={styles.modalDescription}>
                {selectedArticle.tagline || selectedArticle.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeaturedSection;

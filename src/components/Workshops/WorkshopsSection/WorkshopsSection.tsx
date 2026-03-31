import React, { useState, useEffect, useRef } from "react";
import styles from "./WorkshopsSection.module.css";
import workshopimg from "./1.png";
import { getWorkshops } from "../../../api/apiWorkshops";
import type { Workshop } from "../../../api/apiWorkshops";
import NoState from "../../NoState/NoState";

const WorkshopsSection = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
  // tracks how many images have finished loading (load or error)
  const [, setImagesReady] = useState(0);
  const expectedImages = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setImagesReady(0);
    expectedImages.current = 0;
    getWorkshops()
      .then((data) => {
        if (!cancelled) {
          expectedImages.current = data.length;
          // if there are no workshops, no images to wait for
          if (data.length === 0) setLoading(false);
          setWorkshops(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load workshops");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // called when each <img> fires onLoad or onError
  const handleImageSettled = () => {
    setImagesReady((prev) => {
      const next = prev + 1;
      if (next >= expectedImages.current) setLoading(false);
      return next;
    });
  };

  const showSkeleton = loading;
  const [visibleCount, setVisibleCount] = useState(5);

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          {(showSkeleton || error || workshops.length > 0) && (
            <div className={styles.title}>
              <h3>Upcoming Academy Sessions</h3>
            </div>
          )}

          {/* Skeleton — visible until API + every image are fully loaded */}
          {showSkeleton && (
            <div className={styles.WorkshopCards}>
              {[1, 2, 3].map((n) => (
                <div className={styles.skeletonCard} key={n}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonDetails}>
                    <div className={`${styles.skeletonBase} ${styles.skeletonTitle}`} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonInfo}>
                      <div className={styles.skeletonInfoLeft}>
                        <div className={`${styles.skeletonBase} ${styles.skeletonDate}`} />
                        <div className={`${styles.skeletonBase} ${styles.skeletonTime}`} />
                      </div>
                      <div className={`${styles.skeletonBase} ${styles.skeletonBtn}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showSkeleton && error && (
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <p style={{ color: "#A83434", marginBottom: 12 }}>{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setImagesReady(0);
                  expectedImages.current = 0;
                  getWorkshops()
                    .then((data) => {
                      expectedImages.current = data.length;
                      if (data.length === 0) setLoading(false);
                      setWorkshops(data);
                    })
                    .catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Failed to load workshops");
                      setLoading(false);
                    });
                }}
                style={{
                  background: "#6C7A5F", color: "#fff", border: "none",
                  borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14,
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!showSkeleton && !error && workshops.length === 0 && (
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "50vh", // center the empty state vertically in the page
                padding: "24px",
                boxSizing: "border-box",
              }}
            >
              <NoState
                title={"No upcoming programs right now."}
                subtitle={"Check back later for new programs."}
              />
            </div>
          )}

          {/* Real cards — rendered (but invisible via opacity) while images load so
              onLoad / onError fire; hidden skeleton sits on top until all settle */}
          <div className={styles.WorkshopCards} style={{ display: showSkeleton ? "none" : "flex" }}>
            {!error && workshops.slice(0, visibleCount).map((workshop) => (
              <div className={styles.Card} key={workshop.id}>
                <div className={styles.CardImage}>
                  <img
                    src={workshop.image || workshopimg}
                    alt={workshop.title}
                    onLoad={handleImageSettled}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = workshopimg;
                      handleImageSettled();
                    }}
                  />
                </div>

                <div className={styles.CardDetails}>
                  <div className={styles.CardTitle}>
                    {/* Title truncation: show first 100 chars with clickable ellipsis to expand */}
                    {workshop.title && workshop.title.length > 100 ? (
                      <div className={styles.ExpandableTitle}>
                        {/* preview (collapsed) */}
                        <div className={`${styles.titlePreview} ${expandedIds[workshop.id] ? styles.hidden : ""}`}>
                          <h4>
                            {workshop.title.slice(0, 100)}
                            <span
                              className={styles.ellipsis}
                              onClick={() => setExpandedIds((prev) => ({ ...prev, [workshop.id]: true }))}
                              aria-label="Expand title"
                            >
                              ...
                            </span>
                          </h4>
                        </div>

                        {/* full title (expanded) */}
                        <div className={`${styles.fullTitle} ${expandedIds[workshop.id] ? styles.open : ""}`}>
                          <h4>
                            {workshop.title}
                          </h4>
                          <button
                            className={styles.collapseButton}
                            onClick={() => setExpandedIds((prev) => ({ ...prev, [workshop.id]: false }))}
                            aria-label="Collapse title"
                          >
                            {"\u22EE"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h4>{workshop.title}</h4>
                    )}
                  </div>

                  <div className={styles.line}></div>

                  <div className={styles.CardInfo}>
                    <div className={styles.CardInfoLeft}>
                      <h4>{workshop.startDate}</h4>
                      <p>{workshop.startTime}</p>
                    </div>

                    <a
                      href={workshop.calendlyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <button className={styles.BookNowcta}>
                        Book Now
                      </button>
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {/* View more link for additional workshops */}
            {!showSkeleton && !error && workshops.length > visibleCount && (
              <div className={styles.viewMoreContainer}>
                <p className={styles.viewMore} onClick={() => setVisibleCount((v) => v + 5)}>View more</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default WorkshopsSection;

import React, { useRef } from "react";
import styles from "./Articles.module.css";
import { useHistory } from "react-router-dom";
import NoState from "../../NoState/NoState";
import { useNewsList } from "../data/useNewsList";

const SKELETON_COUNT = 4;

const Articles = () => {
  const history = useHistory();
  const { articles, loading, error, retry } = useNewsList();

  // image-load tracking — skeleton stays until every img settles
  const [, setImagesReady] = React.useState(0);
  const expectedImages = useRef(0);
  const [imgLoading, setImgLoading] = React.useState(true);

  // when articles arrive, set expected count; reset counter
  React.useEffect(() => {
    if (loading) { setImgLoading(true); setImagesReady(0); return; }
    if (error || articles.length === 0) { setImgLoading(false); return; }
    expectedImages.current = articles.length;
    setImagesReady(0);
    setImgLoading(true);
  }, [loading, error, articles.length]);

  const handleImageSettled = () => {
    setImagesReady((prev) => {
      const next = prev + 1;
      if (next >= expectedImages.current) setImgLoading(false);
      return next;
    });
  };

  const showSkeleton = loading || imgLoading;
  const [visibleCount, setVisibleCount] = React.useState(5);
  const [expandedIds, setExpandedIds] = React.useState<Record<number, boolean>>({});

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.Top}>
          <h3>Latest Articles</h3>
        </div>

        <div className={styles.Bottom}>
          {/* Skeleton — stays until API done + every image loaded */}
          {showSkeleton && (
            <>
              {Array.from({ length: SKELETON_COUNT }).map((_, n) => (
                <div className={styles.skeletonCard} key={n}>
                  <div className={`${styles.skeletonBase} ${styles.skeletonImg}`} />
                  <div className={styles.skeletonRight}>
                    <div className={styles.skeletonRightTop}>
                      <div className={`${styles.skeletonBase} ${styles.skeletonBadge}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonTitleLine}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonSubLine}`} />
                    </div>
                    <div className={styles.skeletonRightBottom}>
                      <div className={`${styles.skeletonBase} ${styles.skeletonMinutes}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonReadBtn}`} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <p style={{ color: "#A83434", marginBottom: 12 }}>{error}</p>
              <button
                onClick={retry}
                style={{
                  background: "#6C7A5F", color: "#fff", border: "none",
                  borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14,
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && articles.length === 0 && (
            <div style={{ width: "100%" }}>
              <NoState
                title={"No articles available right now."}
                subtitle={"Check back later for new articles."}
              />
            </div>
          )}

          {/* Real cards rendered (hidden) so images start loading immediately */}
          <div style={{ display: showSkeleton ? "none" : "contents" }}>
            {!error && articles.slice(0, visibleCount).map((article) => (
              <div
                key={article.id}
                className={styles.articleCard}
                onClick={() => history.push(`/news/${article.id}`)}
              >
                <div className={styles.leftimg}>
                  <img
                    src={article.image}
                    alt={article.title}
                    onLoad={handleImageSettled}
                    onError={handleImageSettled}
                  />
                </div>

                <div className={styles.rightContent}>
                  <div className={styles.rightContentTop}>
                    <div className={styles.badge}>
                      <p>{article.date}</p>
                    </div>

                    <div className={styles.title}>
                        {/* Title with truncation/expand behavior when >100 chars */}
                        {article.title && article.title.length > 100 ? (
                          <div className={styles.ExpandableTitle}>
                            <div className={`${styles.titlePreview} ${expandedIds[article.id] ? styles.hidden : ""}`}>
                              <h3>
                                {article.title.slice(0, 100)}
                                <span
                                  className={styles.ellipsis}
                                  onClick={() => setExpandedIds((prev) => ({ ...prev, [article.id]: true }))}
                                  aria-label="Expand title"
                                >
                                  ...
                                </span>
                              </h3>
                            </div>

                            <div className={`${styles.fullTitle} ${expandedIds[article.id] ? styles.open : ""}`}>
                              <h3>{article.title}</h3>
                              <button
                                className={styles.collapseButton}
                                onClick={() => setExpandedIds((prev) => ({ ...prev, [article.id]: false }))}
                                aria-label="Collapse title"
                              >
                                {"\u22EE"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <h3>{article.title}</h3>
                        )}
                        <p>{article.tagline}</p>
                      </div>
                  </div>

                  <div className={styles.rightContentBottom}>
                    <div className={styles.rightContentBottomLeft}>
                      <p>{article.minutesToRead}</p>
                    </div>

                    <div className={styles.rightContentBottomRight}>
                      <p>Read Article</p>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M7 6L11 10L7 14"
                          stroke="#6C7A5F"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* View more for articles */}
            {!loading && !error && articles.length > visibleCount && (
              <div className={styles.viewMoreContainer}>
                <p className={styles.viewMore} onClick={() => setVisibleCount((v) => v + 5)}>View more</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Articles;
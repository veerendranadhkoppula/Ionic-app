import React, { useState, useEffect, useRef } from "react";
import { IonContent, IonPage, IonHeader } from "@ionic/react";
import { useParams } from "react-router-dom";
import { getBlogById } from "../api/apiNews";
import type { NewsArticle } from "../api/apiNews";
import TopSection from "../components/News/TopSection/TopSection";
import styles from "./NewsDetail.module.css";

interface RouteParams {
  id: string;
}

const SkeletonDetail: React.FC = () => (
  <div className={styles.main}>
    <div className={styles.MainContainer}>
      <div className={styles.TopContainer}>
        <div className={`${styles.skeletonBase} ${styles.skeletonImage}`} />
      </div>
      <div className={styles.BottomContainer}>
        <div className={styles.ArticlesDetails}>
          <div className={styles.title}>
            <div className={`${styles.skeletonBase} ${styles.skeletonTitle}`} />
          </div>
          <div className={styles.skeletonDateRow}>
            <div className={`${styles.skeletonBase} ${styles.skeletonDate}`} />
            <div className={styles.skeletonDivider} />
            <div className={`${styles.skeletonBase} ${styles.skeletonReadTime}`} />
          </div>
        </div>
        <div className={styles.skeletonContent}>
          {[100, 100, 100, 80, 100, 100, 65, 100, 90, 60].map((w, i) => (
            <div
              key={i}
              className={styles.skeletonBase}
              style={{ height: 12, width: `${w}%`, borderRadius: 6 }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const NewsDetail: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const imgExpected = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setImgReady(false);
    imgExpected.current = false;
    getBlogById(Number(id))
      .then((data) => {
        if (!cancelled) {
          imgExpected.current = true;
          setArticle(data);
          // API done but image still needs to load — loading stays true
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load article");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  const handleImageSettled = () => {
    setImgReady(true);
    setLoading(false);
  };

  const showSkeleton = loading && !imgReady;

  if (error || (!loading && !article)) {
    return (
      <IonPage>
        <IonHeader slot="fixed"><TopSection /></IonHeader>
        <IonContent fullscreen className="home-content">
          <div style={{ padding: "20px" }}>
            <h2>{error ?? "Article Not Found"}</h2>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <TopSection />
      </IonHeader>

      <IonContent fullscreen className="home-content">
        {/* Skeleton sits on top until image is ready */}
        {showSkeleton && <SkeletonDetail />}

        {/* Real content — hidden while skeleton shows; img fires onLoad/onError to dismiss */}
        <div style={{ display: showSkeleton ? "none" : undefined }}>
          {article && (
            <div className={styles.main}>
              <div className={styles.MainContainer}>
                <div className={styles.TopContainer}>
                  <img
                    src={article.image}
                    alt={article.title}
                    onLoad={handleImageSettled}
                    onError={handleImageSettled}
                  />
                </div>

                <div className={styles.BottomContainer}>
                  <div className={styles.ArticlesDetails}>
                    <div className={styles.title}>
                      <h3>{article.title}</h3>
                    </div>

                    <div className={styles.dateandreadingTime}>
                      <h3>{article.date}</h3>
                      <div className={styles.line}></div>
                      <h3>{article.minutesToRead}</h3>
                    </div>
                  </div>

                  <div className={styles.ArticleContent}>
                    <p>{article.content}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NewsDetail;

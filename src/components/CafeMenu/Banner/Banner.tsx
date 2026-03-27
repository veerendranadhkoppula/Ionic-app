/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useHistory } from "react-router-dom";
import styles from "./Banner.module.css";

const API_BASE = "https://endpoint.whitemantis.ae/api";

type PageValue = "Home" | "Cafe" | "Store";

interface BannerItem {
  id: string;
  imageUrl: string;
  page: PageValue;
}

interface Props {
  currentPage: PageValue;
}

const PAGE_ROUTES: Record<PageValue, string> = {
  Home: "/Home",
  Cafe: "/CafeMenu",
  Store: "/StoreMenu",
};

const AUTO_SCROLL_INTERVAL = 3500;

const Banner: React.FC<Props> = ({ currentPage }) => {
  const history = useHistory();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const MIN_SWIPE_DISTANCE = 40;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

 
  useEffect(() => {
    let mounted = true;
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE}/app-banners?limit=9&depth=1`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );
        if (!res.ok) throw new Error(`Banner fetch failed: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;

        const docs: any[] = data?.docs ?? [];
        const mapped: BannerItem[] = docs
          .filter((d) => d?.image?.url)
          .map((d) => {
            const rawUrl: string = d.image.url;
            const imageUrl = rawUrl.startsWith("http")
              ? rawUrl
              : `https://endpoint.whitemantis.ae${rawUrl}`;
            return { id: String(d.id), imageUrl, page: d.page as PageValue };
          });
        setBanners(mapped);
        setActiveIndex(0);
      } catch (err) {
        console.warn("Banner: failed to fetch banners", err);
        setBanners([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchBanners();
    return () => { mounted = false; };
  }, []); // fetch once — banners are the same on all screens

 
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % Math.max(banners.length, 1));
    }, AUTO_SCROLL_INTERVAL);
  }, [banners.length]);

  const resetTimer = useCallback(() => {
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    if (banners.length > 1) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length, startTimer]);

  // ── Banner tap → redirect to that banner's page (unless already there) ──────
  const handleBannerClick = () => {
    if (banners.length === 0) return;
    const banner = banners[activeIndex];
    if (banner.page === currentPage) return; // already on this page, do nothing
    history.push(PAGE_ROUTES[banner.page]);
  };


  const handleDotClick = (idx: number) => {
    setActiveIndex(idx);
    resetTimer();
  };


  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) < MIN_SWIPE_DISTANCE) return;
    if (delta > 0) {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    } else {
      setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
    resetTimer();
    touchStartX.current = null;
    touchEndX.current = null;
  };


  const mouseStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    if (Math.abs(e.clientX - mouseStartX.current) > 5) isDragging.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const delta = mouseStartX.current - e.clientX;
    if (Math.abs(delta) >= MIN_SWIPE_DISTANCE && banners.length > 1) {
      if (delta > 0) {
        setActiveIndex((prev) => (prev + 1) % banners.length);
      } else {
        setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
      }
      resetTimer();
    }
    mouseStartX.current = null;
  };

  const handleClick = () => {
    if (!isDragging.current) handleBannerClick();
    isDragging.current = false;
  };


if (loading) {
  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.skeleton} />
      </div>
    </div>
  );
}
  if (banners.length === 0) return null;

  const isTappable = banners[activeIndex]?.page !== currentPage;

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div
          className={styles.TopConatiner}
          style={{ cursor: isTappable ? "pointer" : "default" }}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.sliderTrack}>
            {banners.map((banner, idx) => (
              <img
                key={banner.id}
                src={banner.imageUrl}
                alt={`Banner ${idx + 1}`}
                className={`${styles.BannerImage} ${idx === activeIndex ? styles.active : styles.hidden}`}
                draggable={false}
              />
            ))}
          </div>
        </div>

        {banners.length > 1 && (
          <div className={styles.BottomContainer}>
            {banners.map((_, idx) => (
              <div
                key={idx}
                className={`${styles.dot} ${idx === activeIndex ? styles.activeDot : ""}`}
                onClick={() => handleDotClick(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Banner;
import React from 'react';
import styles from './OfflineOverlay.module.css';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import offlineImg from './1.png';

interface Props {
  onRetry?: () => Promise<void> | void;
  title?: string;
  subtitle?: string;
}

// SVG removed — using static image instead

export default function OfflineOverlay({ onRetry, title = "You're offline", subtitle = 'Please check your internet connection and try again.' }: Props) {
  const { checkOnline } = useNetworkStatus();

  const handleRetry = async () => {
    if (onRetry) {
      try {
        await onRetry();
        return;
      } catch {
        // continue to fallback behavior
      }
    }

    // run a health-check; if ok, reload; otherwise show a browser alert
    const ok = await checkOnline();
    if (ok) {
      window.location.reload();
    } else {
      // keep overlay; optionally show a small message
      // using alert to keep changes minimal; app can replace with toast later
  alert('Still offline. Please check your connection and try again.');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.box}>
        <img src={offlineImg} alt="offline" className={styles.image} />
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>{subtitle}</div>
        <div style={{ height: 32 }} />
        <button className={styles.retry} onClick={handleRetry}>Retry</button>
      </div>
    </div>
  );
}

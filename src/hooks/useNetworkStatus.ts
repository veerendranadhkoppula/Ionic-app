import { useEffect, useState, useCallback } from 'react';

// Simple hook that tracks navigator.onLine and provides a lightweight health-check
export default function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // health check: try fetching a small public asset with timeout
  const checkOnline = useCallback(async (timeoutMs = 3000) => {
    if (typeof fetch === 'undefined') return online;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      // use manifest or root as a cheap HEAD check
      const res = await fetch('/manifest.json', { method: 'GET', cache: 'no-store', signal: controller.signal });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }, [online]);

  return { online, checkOnline } as const;
}

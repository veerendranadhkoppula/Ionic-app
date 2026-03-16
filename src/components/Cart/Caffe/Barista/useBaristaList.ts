import { useState, useEffect, useCallback } from "react";
import { getBaristas, Barista } from "../../../../api/apiCafe";
import tokenStorage from "../../../../utils/tokenStorage";
import { useShopId } from "../../../../context/useShopId";

interface UseBaristaListResult {
  baristas: Barista[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useBaristaList(): UseBaristaListResult {
  const [baristas, setBaristas] = useState<Barista[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const shopId = useShopId();

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (shopId === null) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await tokenStorage.getToken();
        const data = await getBaristas(token, shopId);
        if (!cancelled) {
          setBaristas(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load baristas";
          // If the API returned a 401 we surface a special auth-required state so
          // calling components can show a login CTA instead of a raw error.
          if (typeof msg === "string" && msg.includes("401")) {
            setError("AUTH_REQUIRED");
          } else {
            setError(msg);
          }
          console.error("useBaristaList:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [attempt, shopId]);

  return { baristas, loading, error, retry };
}

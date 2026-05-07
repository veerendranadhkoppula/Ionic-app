import { useState, useEffect, useCallback } from "react";
import { getFeaturedNews, NewsArticle } from "../../../api/apiNews";

interface UseFeaturedNewsListResult {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useFeaturedNewsList(): UseFeaturedNewsListResult {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getFeaturedNews();
        if (!cancelled) setArticles(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load featured news");
          console.error("useFeaturedNewsList:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { articles, loading, error, retry };
}

import { useState, useEffect, useCallback } from "react";
import { getBlogs, NewsArticle } from "../../../api/apiNews";

interface UseNewsListResult {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useNewsList(): UseNewsListResult {
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
        const data = await getBlogs();
        if (!cancelled) setArticles(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load news");
          console.error("useNewsList:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [attempt]);

  return { articles, loading, error, retry };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import useAuth from "../utils/useAuth";
import {
  getStoreWishlist,
  addToStoreWishlist,
  removeFromStoreWishlist,
} from "../api/apiStoreWishlist";

type StoreWishlistContextShape = {
  wishlistIds: number[];
  rawWishlist: any[];
  loading: boolean;
  toggleWishlist: (id: number) => Promise<void>;
  refreshWishlist: () => Promise<void>;
};

const StoreWishlistContext = React.createContext<StoreWishlistContextShape | null>(null);

export const StoreWishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = React.useState<number[]>([]);
  const [rawWishlist, setRawWishlist] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  // Guard against double-taps firing two API calls simultaneously
  const processing = React.useRef<Set<number>>(new Set());

  const refreshWishlist = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await getStoreWishlist(); // already filtered to origin:"store" in the API fn
      setRawWishlist(items || []);

      const ids = (items || [])
        .map((it: any) => {
          const pid = it?.product?.value?.id ?? it?.product?.id;
          return typeof pid === "number" ? pid : typeof pid === "string" ? parseInt(pid, 10) : null;
        })
        .filter((id: any) => id !== null && !isNaN(id)) as number[];

      setWishlistIds(ids);
    } catch (err) {
      console.error("[StoreWishlistContext] refreshWishlist failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { isLoggedIn } = useAuth();

  React.useEffect(() => {
    // only refresh store wishlist for authenticated users
    if (!isLoggedIn) {
      setLoading(false);
      setRawWishlist([]);
      setWishlistIds([]);
      return;
    }

    refreshWishlist();
  }, [refreshWishlist, isLoggedIn]);

  const toggleWishlist = React.useCallback(
    async (id: number) => {
      // Prevent double-tap race conditions
      if (processing.current.has(id)) return;
      processing.current.add(id);
      try {
        if (wishlistIds.includes(id)) {
          // Optimistic remove
          setWishlistIds((prev) => prev.filter((x) => x !== id));
          setRawWishlist((prev) =>
            prev.filter((it: any) => {
              const pid = it?.product?.value?.id ?? it?.product?.id;
              return Number(pid) !== id;
            })
          );
          await removeFromStoreWishlist(id);
        } else {
          // Optimistic add
          setWishlistIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          await addToStoreWishlist(id);
          // Re-sync to get full product details in rawWishlist
          await refreshWishlist();
        }
      } catch (err) {
        console.error("[StoreWishlistContext] toggleWishlist failed:", err);
        // Revert on error
        await refreshWishlist();
      } finally {
        processing.current.delete(id);
      }
    },
    [wishlistIds, refreshWishlist]
  );

  const value = React.useMemo(
    () => ({ wishlistIds, rawWishlist, loading, toggleWishlist, refreshWishlist }),
    [wishlistIds, rawWishlist, loading, toggleWishlist, refreshWishlist]
  );

  return (
    <StoreWishlistContext.Provider value={value}>
      {children}
    </StoreWishlistContext.Provider>
  );
};

export default StoreWishlistContext;

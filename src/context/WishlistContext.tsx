/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import useAuth from "../utils/useAuth";
import {
  getCafeWishlist,
  addToCafeWishlist,
  removeFromCafeWishlist,
} from "../api/apiCafeWishlist";

type WishlistContextShape = {
  wishlistItems: number[];
  rawWishlist: any[];
  loading: boolean;
  toggleWishlist: (productId: number) => Promise<void>;
  refreshWishlist: () => Promise<void>;
};

const WishlistContext = React.createContext<WishlistContextShape | null>(
  null,
);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [wishlistItems, setWishlistItems] = React.useState<number[]>([]);
  const [rawWishlist, setRawWishlist] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  const refreshWishlist = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await getCafeWishlist();
      setRawWishlist(items || []);

      const productIds = (items || [])
        .map((it: any) => it?.product?.value?.id)
        .filter((id: any) => typeof id === "number");

      setWishlistItems(productIds);
    } catch (err) {
      console.error("Wishlist refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { isLoggedIn } = useAuth();

  React.useEffect(() => {
    // load once on mount, but only for logged-in users (guests should not trigger network calls)
    if (!isLoggedIn) {
      setLoading(false);
      setRawWishlist([]);
      setWishlistItems([]);
      return;
    }

    refreshWishlist();
  }, [refreshWishlist, isLoggedIn]);

  const toggleWishlist = React.useCallback(
    async (productId: number) => {
      try {
        if (wishlistItems.includes(productId)) {
          // remove
          await removeFromCafeWishlist(productId);

          setWishlistItems((prev) => prev.filter((id) => id !== productId));

          setRawWishlist((prev) => prev.filter((it) => it?.product?.value?.id !== productId));
        } else {
          // add
          // optimistic update for UI responsiveness
          setWishlistItems((prev) => (prev.includes(productId) ? prev : [...prev, productId]));

          await addToCafeWishlist(productId);

          // re-sync raw wishlist to get product details
          await refreshWishlist();
        }
      } catch (err) {
        console.error("toggleWishlist failed:", err);
      }
    },
    [wishlistItems, refreshWishlist],
  );

  const value: WishlistContextShape = React.useMemo(
    () => ({ wishlistItems, rawWishlist, loading, toggleWishlist, refreshWishlist }),
    [wishlistItems, rawWishlist, loading, toggleWishlist, refreshWishlist],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
};


export default WishlistContext;

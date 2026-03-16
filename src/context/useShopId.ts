

import React from "react";
import { useCart } from "./useCart";
import { getSingleShop } from "../api/apiCafe";

// Module-level cache so the API is only called once per page load.
let _cachedShopId: number | null = null;
let _fetchPromise: Promise<number> | null = null;

function fetchShopIdOnce(): Promise<number> {
  if (_cachedShopId !== null) return Promise.resolve(_cachedShopId);
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = getSingleShop()
    .then((shop) => {
      _cachedShopId = shop.id;
      return shop.id;
    })
    .catch((err) => {
      console.error("useShopId: failed to fetch shop", err);
      _fetchPromise = null; // allow retry on next call
      return Promise.reject(err);
    });
  return _fetchPromise;
}

/** Clears the module cache — useful for tests or if the shop changes. */
export function clearShopIdCache(): void {
  _cachedShopId = null;
  _fetchPromise = null;
}

/**
 * Hook — returns the current shop ID.
 * Returns `null` while it's being fetched.
 */
export function useShopId(): number | null {
  // Prefer the CartContext value — CafeMenu sets it via setShopId(shop.id)
  // and it's persisted in localStorage, so it's usually available immediately.
  const { shopId: cartShopId, setShopId } = useCart();

  const [fetchedShopId, setFetchedShopId] = React.useState<number | null>(
    () => _cachedShopId  // use cached value synchronously if available
  );

  React.useEffect(() => {
    // If CartContext already has it, populate the module cache and we're done.
    if (cartShopId !== null) {
      _cachedShopId = cartShopId;
      setFetchedShopId(cartShopId);
      return;
    }

    // CartContext doesn't have it yet — fetch from API.
    if (_cachedShopId !== null) {
      setFetchedShopId(_cachedShopId);
      return;
    }

    let cancelled = false;
    fetchShopIdOnce()
      .then((id) => {
        if (!cancelled) {
          setFetchedShopId(id);
          setShopId(id); // also push into CartContext so PayContainer etc. get it
        }
      })
      .catch(() => { /* error already logged in fetchShopIdOnce */ });

    return () => { cancelled = true; };
  }, [cartShopId, setShopId]);

  return cartShopId ?? fetchedShopId;
}

import React from "react";
import {
  StoreCartShape,
  StoreCartItem,
  fetchStoreCart,
  addStoreCartItem,
  incrementStoreCartItem,
  decrementStoreCartItem,
  removeStoreCartItem,
  clearStoreCart,
} from "../api/apiStoreCart";
import tokenStorage from "../utils/tokenStorage";
import { getStoreProductById } from "../api/apiStoreMenu";

// ─── Context shape ────────────────────────────────────────────────────────────

export interface StoreCartContextShape {
  /** Current store cart state — null if empty or not yet loaded */
  storeCart: StoreCartShape | null;
  /** Total number of items (sum of all quantities) */
  storeCartCount: number;
  /** True while any async cart operation is in flight */
  loading: boolean;
  /** Fetch / re-fetch the store cart from the server */
  refreshStoreCart: () => Promise<StoreCartShape | null>;
  /** Add a product to the store cart */
  addToStoreCart: (
    productId: number,
    quantity: number,
    variantId?: string,
    variantName?: string,
    unitPrice?: number,
  ) => Promise<StoreCartShape | null>;
  /** +1 on an existing item */
  incrementStoreItem: (itemId: string) => Promise<StoreCartShape | null>;
  /** -1 on an existing item (removes it when qty hits 0) */
  decrementStoreItem: (itemId: string) => Promise<StoreCartShape | null>;
  /** Remove a single item completely */
  removeStoreItem: (itemId: string) => Promise<StoreCartShape | null>;
  /** Wipe the entire store cart */
  clearStoreCartAll: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const StoreCartContext = React.createContext<StoreCartContextShape | null>(null);
export default StoreCartContext;

// ─── Provider ─────────────────────────────────────────────────────────────────

export const StoreCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeCart, setStoreCart] = React.useState<StoreCartShape | null>(null);
  const [loading, setLoading] = React.useState(false);
  // Local-only store cart for guests (persisted in localStorage)
  const LOCAL_STORE_KEY = "store_cart_local_v1";
  const localCartRef = React.useRef<StoreCartShape | null>(null);

  const loadLocalCart = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoreCartShape;
      localCartRef.current = parsed;
      return parsed;
    } catch { return null; }
  }, []);

  const saveLocalCart = React.useCallback((cart: StoreCartShape | null) => {
    try {
      if (!cart) {
        localStorage.removeItem(LOCAL_STORE_KEY);
        localCartRef.current = null;
        return;
      }
      localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(cart));
      localCartRef.current = cart;
    } catch { /* ignore */ }
  }, []);

  // Mutex — serialise mutations so concurrent calls never race
  const mutexRef = React.useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = React.useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = mutexRef.current.then(fn, fn);
    mutexRef.current = next.catch(() => {});
    return next;
  }, []);

  // ── Derived count ──────────────────────────────────────────────────────────
  const storeCartCount = React.useMemo(
    () => (storeCart?.items ?? []).reduce((sum, it) => sum + it.quantity, 0),
    [storeCart],
  );

  // ── refreshStoreCart ───────────────────────────────────────────────────────
  const refreshStoreCart = React.useCallback(async (): Promise<StoreCartShape | null> => {
    setLoading(true);
    try {
      // If user is not logged in, load local store cart instead of calling server
      const token = await tokenStorage.getToken();
      if (!token) {
        const local = loadLocalCart();
        setStoreCart(local);
        // Enrich any local items missing metadata (name/image) in background
        (async () => {
          try {
            if (!local || !local.items || local.items.length === 0) return;
            let changed = false;
            const enrichedItems = await Promise.all(
              local.items.map(async (it) => {
                if (it.productName && it.productImage) return it;
                try {
                  const prod = await getStoreProductById(it.productId);
                  if (prod) {
                    changed = true;
                    return { ...it, productName: it.productName ?? prod.name, productImage: it.productImage ?? prod.productImage?.url };
                  }
                } catch {
                  /* ignore */
                }
                return it;
              }),
            );
            if (changed) {
              const enriched = { ...local, items: enrichedItems };
              saveLocalCart(enriched);
              setStoreCart(enriched);
            }
          } catch { /* ignore enrichment errors */ }
        })();
        return local;
      }
      const cart = await fetchStoreCart();
      // CRITICAL: /api/app/cart is shared between cafe and store.
      // If the backend cart has origin "cafe" it means only cafe items exist.
      // We must NOT load cafe items into the store cart context — treat it as empty.
      if (cart && cart.origin === "cafe") {
        setStoreCart(null);
        return null;
      }
      setStoreCart(cart);
      return cart;
    } catch (err) {
      console.error("StoreCartContext: refreshStoreCart failed", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadLocalCart, saveLocalCart]);

  // ── addToStoreCart ─────────────────────────────────────────────────────────
  const addToStoreCart = React.useCallback(
    (
      productId: number,
      quantity: number,
      variantId?: string,
      variantName?: string,
      unitPrice?: number,
    ): Promise<StoreCartShape | null> =>
      enqueue(async () => {
        setLoading(true);
        try {
          const token = await tokenStorage.getToken();
          if (!token) {
            // Guest flow: maintain a local store cart
            const existing = localCartRef.current ?? loadLocalCart();
            const items = (existing?.items ?? []).slice();
            // try to find existing matching item
            const found = items.find((it: StoreCartItem) => it.productId === productId && String(it.variantId ?? "") === String(variantId ?? ""));
            if (found) {
              found.quantity = (found.quantity ?? 0) + quantity;
            } else {
              const id = `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
              // Try to resolve product metadata for nicer local UI (name + image)
              let resolvedName: string | undefined = undefined;
              let resolvedImage: string | undefined = undefined;
              try {
                const prod = await getStoreProductById(productId);
                if (prod) {
                  resolvedName = prod.name ?? undefined;
                  resolvedImage = prod.productImage?.url ?? undefined;
                }
              } catch {
                /* ignore resolution errors */
              }
              items.push({ id, productId, quantity, variantId: variantId ?? undefined, variantName: variantName ?? undefined, unitPrice, productName: resolvedName, productImage: resolvedImage });
            }
            const localCart: StoreCartShape = { items };
            saveLocalCart(localCart);
            setStoreCart(localCart);
            return localCart;
          }

          console.log(`🟢 [addToStoreCart] calling addStoreCartItem — productId=${productId} variantId=${variantId ?? "none"}`);
          const cart = await addStoreCartItem(productId, quantity, variantId, variantName, unitPrice);
          console.log(`🟢 [addToStoreCart] addStoreCartItem returned:`, cart ? `items=${cart.items.length} origin=${cart.origin}` : "null");
          if (cart) {
            const hasStoreItem = cart.items.some((it) => it.relationTo === "web-products");
            if (cart.origin === "cafe" && !hasStoreItem) {
              console.warn(`🟢 [addToStoreCart] cart origin is 'cafe' with no web-products items — discarding`);
              setStoreCart(null);
              return null;
            }
            if (cart.origin !== "store") cart.origin = "store";
            setStoreCart(cart);
            return cart;
          }
          console.warn(`🟢 [addToStoreCart] cart was null — doing fresh fetchStoreCart`);
          const fresh = await fetchStoreCart();
          if (fresh && fresh.origin !== "cafe") setStoreCart(fresh);
          return fresh;
        } catch (err) {
          console.error("🔴 [addToStoreCart] CAUGHT ERROR:", err);
          try {
            const fresh = await fetchStoreCart();
            if (fresh && fresh.origin !== "cafe") setStoreCart(fresh);
          } catch { /* ignore secondary error */ }
          return null;
        } finally {
          setLoading(false);
        }
      }),
    [enqueue, loadLocalCart, saveLocalCart],
  );

  // ── incrementStoreItem ─────────────────────────────────────────────────────
  const incrementStoreItem = React.useCallback(
    (itemId: string): Promise<StoreCartShape | null> =>
      enqueue(async () => {
        setLoading(true);
        try {
          const token = await tokenStorage.getToken();
          if (!token) {
            // local increment
            const existing = localCartRef.current ?? loadLocalCart();
            if (!existing) return null;
            const items = existing.items.map((it: StoreCartItem) => it.id === itemId ? { ...it, quantity: (it.quantity ?? 0) + 1 } : it);
            const updated: StoreCartShape = { items };
            saveLocalCart(updated);
            setStoreCart(updated);
            return updated;
          }
          const cart = await incrementStoreCartItem(itemId);
          setStoreCart(cart);
          return cart;
        } catch (err) {
          console.error("StoreCartContext: incrementStoreItem failed", err);
          return null;
        } finally {
          setLoading(false);
        }
      }),
    [enqueue, loadLocalCart, saveLocalCart],
  );

  // ── decrementStoreItem ─────────────────────────────────────────────────────
  const decrementStoreItem = React.useCallback(
    (itemId: string): Promise<StoreCartShape | null> =>
      enqueue(async () => {
        setLoading(true);
        try {
          const token = await tokenStorage.getToken();
          if (!token) {
            const existing = localCartRef.current ?? loadLocalCart();
            if (!existing) return null;
            let items = existing.items.map((it: StoreCartItem) => it.id === itemId ? { ...it, quantity: Math.max(0, (it.quantity ?? 1) - 1) } : it);
            items = items.filter((it: StoreCartItem) => (it.quantity ?? 0) > 0);
            const updated: StoreCartShape = { items };
            saveLocalCart(updated);
            setStoreCart(updated);
            return updated;
          }
          const cart = await decrementStoreCartItem(itemId);
          setStoreCart(cart);
          return cart;
        } catch (err) {
          console.error("StoreCartContext: decrementStoreItem failed", err);
          return null;
        } finally {
          setLoading(false);
        }
      }),
    [enqueue, loadLocalCart, saveLocalCart],
  );

  // ── removeStoreItem ────────────────────────────────────────────────────────
  const removeStoreItem = React.useCallback(
    (itemId: string): Promise<StoreCartShape | null> =>
      enqueue(async () => {
        setLoading(true);
        try {
          const token = await tokenStorage.getToken();
          if (!token) {
            const existing = localCartRef.current ?? loadLocalCart();
            if (!existing) return null;
            const items = existing.items.filter((it: StoreCartItem) => it.id !== itemId);
            const updated: StoreCartShape = { items };
            saveLocalCart(updated);
            setStoreCart(updated);
            return updated;
          }
          const cart = await removeStoreCartItem(itemId);
          setStoreCart(cart);
          return cart;
        } catch (err) {
          console.error("StoreCartContext: removeStoreItem failed", err);
          return null;
        } finally {
          setLoading(false);
        }
      }),
    [enqueue, loadLocalCart, saveLocalCart],
  );

  // ── clearStoreCartAll ──────────────────────────────────────────────────────
  const clearStoreCartAll = React.useCallback((): Promise<void> =>
    enqueue(async () => {
      setLoading(true);
      try {
        // If there's no auth token, do not call server APIs (they would trigger
        // the global 401 -> /auth redirect). For guests, clear local state only.
        const token = await tokenStorage.getToken();
        if (!token) {
          setStoreCart(null);
          // clear persisted local cart as well
          try { saveLocalCart(null); } catch { /* ignore */ }
          return;
        }

        await clearStoreCart();
        setStoreCart(null);
      } catch (err) {
        console.error("StoreCartContext: clearStoreCartAll failed", err);
      } finally {
        setLoading(false);
      }
    }),
    [enqueue, saveLocalCart],
  );

  // ── Hydrate on mount (only if a token exists) ──────────────────────────────
  React.useEffect(() => {
    (async () => {
      try {
        // Always refresh store cart on mount. For guests this will load the
        // local persisted cart (refreshStoreCart handles token/no-token paths).
        await refreshStoreCart();
      } catch (err) {
        console.error("StoreCartContext: hydration failed", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Merge guest local store cart into server cart after login --
  React.useEffect(() => {
    const handler = async () => {
      try {
        const token = await tokenStorage.getToken();
        const lastSync = (() => {
          try { return localStorage.getItem('guest_store_cart_last_sync_token'); } catch { return null; }
        })();

        if (token) {
          if (lastSync === token) return; // already synced for this token

          const local = localCartRef.current ?? loadLocalCart();
          if (!local || !local.items || local.items.length === 0) {
            try { localStorage.setItem('guest_store_cart_last_sync_token', token); } catch { /* ignore */ }
            return;
          }

          await enqueue(async () => {
            // For each local item, call the server add function to merge into server cart
            for (const it of local.items) {
              try {
                // Use the same API used by logged-in flow
                await addStoreCartItem(it.productId, it.quantity, it.variantId, it.variantName, it.unitPrice);
              } catch (err) {
                console.warn('StoreCartContext: guest merge POST failed for item', it, err);
              }
            }

            // Clear local persisted cart so UI will reflect server state
            try { saveLocalCart(null); } catch { /* ignore */ }
            localCartRef.current = null;
            setStoreCart(null);

            // Refresh cart from server (now includes merged items)
            try { await refreshStoreCart(); } catch { /* ignore */ }

            try { localStorage.setItem('guest_store_cart_last_sync_token', token); } catch { /* ignore */ }
          });
        } else {
          // Logout detected: clear guest-local persisted store cart and in-memory state
          try { localStorage.removeItem('guest_store_cart_last_sync_token'); } catch { /* ignore */ }
          try {
            localCartRef.current = null;
          } catch { /* ignore */ }
          try { saveLocalCart(null); } catch { /* ignore */ }
          try { setStoreCart(null); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('StoreCartContext: merge-on-login handler failed', err);
      }
    };

    window.addEventListener('auth-changed', handler);
    return () => window.removeEventListener('auth-changed', handler);
  }, [enqueue, refreshStoreCart, loadLocalCart, saveLocalCart, setStoreCart]);

  const value: StoreCartContextShape = React.useMemo(
    () => ({
      storeCart,
      storeCartCount,
      loading,
      refreshStoreCart,
      addToStoreCart,
      incrementStoreItem,
      decrementStoreItem,
      removeStoreItem,
      clearStoreCartAll,
    }),
    [
      storeCart,
      storeCartCount,
      loading,
      refreshStoreCart,
      addToStoreCart,
      incrementStoreItem,
      decrementStoreItem,
      removeStoreItem,
      clearStoreCartAll,
    ],
  );

  return (
    <StoreCartContext.Provider value={value}>
      {children}
    </StoreCartContext.Provider>
  );
};

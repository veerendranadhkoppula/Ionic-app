/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getSingleMenuItem } from "../api/apiCafe";
import tokenStorage from "../utils/tokenStorage";
import { buildCustomizationKey, deepSort } from "../utils/cartUtils";

const API_BASE = "https://endpoint.whitemantis.ae/api";
const CART_URL = `${API_BASE}/app/cart`;

export interface Product {
  id?: number;
  title?: string;
  image?: string;
  isVeg?: boolean;
  size?: string;
  addOn?: string;
  price?: number;
  discountPrice?: number;
  inStock?: boolean;
}

export type CartItem = {
  id: string;
  productId?: number;
  quantity?: number;
  product?: { value?: Product } | Product | unknown;
  customizations?: any[];
  customizationKey?: string;
  rawSelectionKey?: string;
};

export type CartShape = { items: CartItem[]; total?: number } | null;

export type CartContextShape = {
  cart: CartShape;
  origin: "cafe" | "store";
  shopId: number | null;
  loading: boolean;
  refreshCart: (shopId?: number | null) => Promise<CartShape | null>;
 addToCart: (productId: number, customizations?: any, quantity?: number) => Promise<CartShape | null>;
  incrementItem: (itemId: string) => Promise<CartShape | null>;
  decrementItem: (itemId: string) => Promise<CartShape | null>;
  removeItem: (itemId: string) => Promise<CartShape | null>;
  clearCart: () => Promise<CartShape | null>;
  setShopId: (id: number | null) => void;
};

const CartContext = React.createContext<CartContextShape | null>(null);

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { Accept: "application/json" };
  return headers;
}

let hasRedirectedToAuth = false;
function isOnAuthPage() {
  try {
    return (
      typeof window !== "undefined" &&
      window.location &&
      String(window.location.pathname || "").startsWith("/auth")
    );
  } catch {
    return false;
  }
}

async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : (input as Request).url;
  const headers: Record<string, string> = {};
  if (init && init.headers) {
    if ((init.headers as Headers) instanceof Headers) {
      (init.headers as Headers).forEach((v, k) => (headers[k] = v));
    } else if (Array.isArray(init.headers)) {
      (init.headers as [string, string][]).forEach(([k, v]) => (headers[k] = v));
    } else {
      Object.assign(headers, init.headers as Record<string, string>);
    }
  }
  try {
    const token = await tokenStorage.getToken();
    if (token) headers["Authorization"] = `JWT ${token}`;
  } catch { /* ignore */ }

  const merged: RequestInit = { ...(init || {}), headers };
  const res = await fetch(url, merged);
  if (res.status !== 401) return res;

  try { await tokenStorage.clearToken(); } catch (e) { console.warn("authFetch: clearToken failed", e); }
  try {
    if (!isOnAuthPage() && !hasRedirectedToAuth) {
      hasRedirectedToAuth = true;
      window.location.assign("/auth");
    }
  } catch (e) { console.warn("authFetch: redirect to /auth failed", e); }
  return res;
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; }
  catch (err) { console.warn("CartContext: failed to parse JSON", { status: res.status, text, err }); return null; }
}


const buildRawSelectionKey = (raw: any): string => {
  if (raw == null || raw === "") return "[]";
  try {
    if (Array.isArray(raw)) {
      if (raw.length === 0) return "[]";
      // Confirm it looks like normalized backend shape (has sectionId + selectedOptionId)
      const looksNormalized = raw.every(
        (c: any) => c && (c.sectionId != null) && (c.selectedOptionId != null || c.optionId != null)
      );
      if (!looksNormalized) return "[]";

      // Group by sectionId+groupId, collect optionIds
      const grouped = new Map<string, { sectionId: string; groupId: string; optionIds: string[] }>();
      for (const c of raw) {
        const sectionId = String(c.sectionId ?? "");
        const groupId = String(c.groupId ?? "");
        const optionId = String(c.selectedOptionId ?? c.optionId ?? "");
        if (!sectionId || !optionId) continue;
        const key = `${sectionId}|${groupId}`;
        if (!grouped.has(key)) grouped.set(key, { sectionId, groupId, optionIds: [] });
        grouped.get(key)!.optionIds.push(optionId);
      }
      if (grouped.size === 0) return "[]";
      const parts = Array.from(grouped.values()).map((g) => ({
        ...g,
        optionIds: [...g.optionIds].sort(),
      }));
      parts.sort((a, b) => {
        const sa = a.sectionId + "|" + a.groupId;
        const sb = b.sectionId + "|" + b.groupId;
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
      return JSON.stringify(parts);
    }

    // Shape A: { selectedOptions: {...} }   Shape B: plain nested object
    const selectedOptions: any = (raw && typeof raw === "object" && raw.selectedOptions)
      ? raw.selectedOptions
      : raw;

    if (!selectedOptions || typeof selectedOptions !== "object" || Array.isArray(selectedOptions)) return "[]";

    // Build a minimal, sorted representation: array of { sectionId, groupId, optionIds }
    const parts: { sectionId: string; groupId: string; optionIds: string[] }[] = [];
    for (const [sectionId, groups] of Object.entries(selectedOptions)) {
      if (!groups || typeof groups !== "object") continue;
      for (const [groupId, opts] of Object.entries(groups as any)) {
        if (!Array.isArray(opts) || opts.length === 0) continue;
        const optionIds = (opts as any[])
          .map((o: any) => String(o?.id ?? o?.optionId ?? o?.selectedOptionId ?? o?.value ?? ""))
          .filter(Boolean)
          .sort();
        if (optionIds.length > 0) {
          parts.push({ sectionId: String(sectionId), groupId: String(groupId), optionIds });
        }
      }
    }
    if (parts.length === 0) return "[]";
    parts.sort((a, b) => {
      const sa = a.sectionId + "|" + a.groupId;
      const sb = b.sectionId + "|" + b.groupId;
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
    return JSON.stringify(parts);
  } catch {
    return "[]";
  }
};

const canonicalizeCustomizations = async (
  mapFn: (p: number, c: any) => Promise<any[]>,
  productId: number,
  raw: any,
) => {
  const arr = (await mapFn(productId, raw)) || [];
  const normalized = Array.isArray(arr)
    ? arr.map((it: any) => { try { return JSON.parse(JSON.stringify(deepSort(it))); } catch { return deepSort(it); } })
    : [];
  normalized.sort((a: any, b: any) => {
    const sa = JSON.stringify(a); const sb = JSON.stringify(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });


  const key = buildRawSelectionKey(raw);

  return { normalized, key };
};

// --- Normalize a single cart item from the server ---
const normalizeCartItem = (ci: any): CartItem | null => {
  if (!ci) return null;
  const pid = Number(ci?.productId ?? ci?.product?.id ?? ci?.product?.value?.id ?? ci?.product ?? NaN);
  const cust = ci?.customizations ?? ci?.customization ?? [];
  const custArray = Array.isArray(cust) ? cust : [cust];
  // Keep id as a string — backend returns MongoDB ObjectId strings (e.g. "6998201bb229213e24bd7a8b")
  const rawId = ci.id ?? ci.itemId;
  const id: string = rawId != null ? String(rawId) : "";
  const quantity = ci.quantity != null ? Number(ci.quantity) : 1;
  return {
    id,
    productId: Number.isNaN(pid) ? undefined : pid,
    quantity: !Number.isNaN(quantity) ? quantity : 1,
    customizations: custArray,
    customizationKey: buildCustomizationKey(custArray),
    product: ci.product ?? (ci.productId ? { value: { id: pid } } : undefined),
  } as CartItem;
};

const normalizeCart = (rawCart: any): CartShape => {
  if (!rawCart) return null;
  const rawItems = Array.isArray(rawCart.items)
    ? rawCart.items.map((ci: any) => normalizeCartItem(ci)).filter(Boolean)
    : [];

  return { ...rawCart, items: rawItems };
};


type VariantEntry = { normalized: any[]; qty: number };

/** Parse a virtual or plain item id → { backendId, rawKey | null } */
const parseVirtualId = (virtualId: string): { backendId: string; rawKey: string | null } => {
  const sep = "__";
  const idx = virtualId.indexOf(sep);
  if (idx === -1) return { backendId: virtualId, rawKey: null };
  return { backendId: virtualId.slice(0, idx), rawKey: virtualId.slice(idx + sep.length) };
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = React.useState<CartShape>(null);
  const cartRef = React.useRef<CartShape>(null);

 
  const variantStoreRef = React.useRef<Map<string, Map<string, VariantEntry>>>(
    (() => {
      try {
        const raw = localStorage.getItem("cart_variants_v1");
        if (raw) {
          const parsed: [string, [string, VariantEntry][]][] = JSON.parse(raw);
          return new Map(parsed.map(([pid, entries]) => [pid, new Map(entries)]));
        }
      } catch { /* ignore */ }
      return new Map();
    })()
  );

  const saveVariantStore = React.useCallback(() => {
    try {
      localStorage.setItem(
        "cart_variants_v1",
        JSON.stringify(
          Array.from(variantStoreRef.current.entries()).map(([pid, map]) => [
            pid,
            Array.from(map.entries()),
          ])
        )
      );
    } catch { /* ignore */ }
  }, []);


  const expandCartItems = React.useCallback((backendItems: CartItem[]): CartItem[] => {
    const result: CartItem[] = [];
    for (const item of backendItems) {
      const pid = String(item.productId ?? "");
      const variants = pid ? variantStoreRef.current.get(pid) : undefined;

      if (variants && variants.size > 0) {
       
        const storedTotal = Array.from(variants.values()).reduce((s, v) => s + v.qty, 0);
        const backendQty = Number(item.quantity ?? 1);
        const scale = storedTotal > 0 && storedTotal !== backendQty
          ? backendQty / storedTotal
          : 1;

        for (const [rawKey, v] of variants.entries()) {
          const scaledQty = scale === 1 ? v.qty : Math.max(1, Math.round(v.qty * scale));
          result.push({
            ...item,
            id: `${item.id}__${rawKey}`,
            quantity: scaledQty,
            customizations: v.normalized,
            customizationKey: buildCustomizationKey(v.normalized),
            rawSelectionKey: rawKey,
          } as CartItem);
        }
      } else {
        // No variants stored — show the backend row as-is.
        result.push(item);
      }
    }
    return result;
  }, []);

  const setCartAndRef = React.useCallback((newCart: CartShape) => {
    const expanded: CartShape = newCart
      ? { ...newCart, items: expandCartItems(newCart.items || []) }
      : newCart;
    console.log("🔄 setCartAndRef expanded items:", expanded?.items?.map(it => ({
      id: it.id,
      pid: it.productId,
      qty: it.quantity,
      custLen: (it.customizations || []).length,
      rawKey: (it as any).rawSelectionKey?.slice(0, 40),
    })));
    cartRef.current = expanded;
    setCart(expanded);
  }, [expandCartItems]);

  // Mutex: serialize backend mutations to prevent race conditions
  const mutexRef = React.useRef<Promise<any>>(Promise.resolve());
  const enqueue = React.useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = mutexRef.current.then(fn, fn);
    mutexRef.current = next.catch(() => {});
    return next;
  }, []);

  const [shopId, setShopIdState] = React.useState<number | null>(() => {
    try {
      const stored = localStorage.getItem("cart_shop_id");
      return stored ? Number(stored) : null;
    } catch { return null; }
  });
 
  const _storedShopId = (() => {
    try { const s = localStorage.getItem("cart_shop_id"); return s ? Number(s) : null; } catch { return null; }
  })();
  const shopIdRef = React.useRef<number | null>(_storedShopId);
  const setShopId = React.useCallback((id: number | null) => {
    shopIdRef.current = id;
    setShopIdState(id);
    try {
      if (id == null) localStorage.removeItem("cart_shop_id");
      else localStorage.setItem("cart_shop_id", String(id));
    } catch (err) { console.warn("CartContext: failed to persist shopId", err); }
  }, []);

  const origin: "cafe" | "store" = "cafe";
  const [loading, setLoading] = React.useState(false);


  const refreshCart = React.useCallback(async (maybeShopId?: number | null): Promise<CartShape | null> => {
    setLoading(true);
    try {
      const sid = maybeShopId ?? shopIdRef.current;
      const url = `${CART_URL}?origin=${origin}${sid ? `&shopId=${sid}` : ""}`;
      const headers = await getAuthHeaders();
      const res = await authFetch(url, { method: "GET", headers });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(`Cart fetch failed: ${res.status}`);
      const newCartRaw = data?.cart ?? data;
      if (newCartRaw?.origin && newCartRaw.origin !== origin) {
        setCartAndRef(null);
        if (maybeShopId) setShopId(maybeShopId);
        return null;
      }
      const newCart = normalizeCart(newCartRaw ?? null);
      setCartAndRef(newCart);
      if (maybeShopId) setShopId(maybeShopId);
      return cartRef.current;
    } catch (err) { console.error("refreshCart failed:", err); return null; }
    finally { setLoading(false); }
  }, [setShopId, setCartAndRef]);

  // -- mapCustomizations --
  const mapCustomizations = React.useCallback(async (productId: number, rawCustomizations: any): Promise<any[]> => {
    // Case 1: Already in backend format — pass through as-is
    if (Array.isArray(rawCustomizations) && rawCustomizations.length > 0) {
      const looksLikeBackend = (rawCustomizations as any[]).every(
        (c) => c.selectedOptionId || c.sectionTitle || c.vId
      );
      if (looksLikeBackend) {
        return rawCustomizations;
      }
    }

    if (!rawCustomizations || typeof rawCustomizations !== "object") return [];

    try {
      // selectedOptions shape: { [sectionId]: { [groupId]: CustomizationOption[] } }
      const selectedOptions = rawCustomizations?.selectedOptions ?? rawCustomizations;

      if (!selectedOptions || typeof selectedOptions !== "object" || Array.isArray(selectedOptions)) return [];

      const result: any[] = [];

      // Try to enrich sectionTitle from backend — completely optional, never blocks
      const allSections: any[] = [];
      if (shopIdRef.current) {
        try {
          const prod = await getSingleMenuItem(shopIdRef.current, productId);
          const rawCusts = (prod as any).customizations || [];
          rawCusts.forEach((b: any) => {
            if (Array.isArray(b?.sections)) allSections.push(...b.sections);
            else if (b?.id && Array.isArray(b?.groups)) allSections.push(b);
          });
        } catch { /* ignore — sectionTitle enrichment is optional */ }
      }

      for (const [sectionId, groups] of Object.entries(selectedOptions)) {
        if (!groups || typeof groups !== "object") continue;
        const sectionDef = allSections.find((s: any) => String(s.id) === String(sectionId));
        const sectionTitle: string = sectionDef?.title ?? String(sectionId);

        for (const [groupId, opts] of Object.entries(groups as any)) {
          if (!Array.isArray(opts)) continue;
          for (const opt of opts) {
            const optionId: string = String(opt?.id ?? opt?.optionId ?? opt?._id ?? opt?.value ?? "");
            if (!optionId) continue;

            const optionLabel: string = String(opt?.label ?? opt?.name ?? "");
            const optionPrice: number = Number(opt?.price ?? 0);

            result.push({
              sectionId: String(sectionId),
              sectionTitle,
              groupId: String(groupId),
              selectedOptionId: optionId,
              selectedOptionLabel: optionLabel,
              price: optionPrice,
            });
          }
        }
      }

      return result;
    } catch (err) {
      console.warn("🗺️ [mapCust] FAILED:", err);
      return [];
    }
  }, []);


 const addToCart = React.useCallback(async (productId: number, customizations?: any, quantity: number = 1): Promise<CartShape | null> => {
    return enqueue(async () => {
      setLoading(true);
      try {
        const incomingRawKey = buildRawSelectionKey(customizations);
        const { normalized } = await canonicalizeCustomizations(mapCustomizations, productId, customizations);

        console.log("🛒 addToCart START", {
          productId,
          incomingRawKey: incomingRawKey.slice(0, 80),
          normalizedLen: normalized.length,
        });

        const pid = String(productId);

        // Upsert variant entry locally
        if (!variantStoreRef.current.has(pid)) {
          variantStoreRef.current.set(pid, new Map());
        }
        const variantMap = variantStoreRef.current.get(pid)!;
       const existing = variantMap.get(incomingRawKey);
if (existing) {
  existing.qty += quantity;
  console.log("🛒 [addToCart] existing variant qty→", existing.qty);
} else {
  variantMap.set(incomingRawKey, { normalized, qty: quantity });
  console.log("🛒 [addToCart] new variant created, rawKey:", incomingRawKey.slice(0, 80));
}

        // Persist variant ledger immediately
        saveVariantStore();

        // If user is not logged in, avoid any network calls — operate in guest/local mode.
        const token = await tokenStorage.getToken();
        if (!token) {
          // Build a synthetic backend-style cart from the variant store so UI shows local items
          const items: CartItem[] = [];
          for (const [p, map] of variantStoreRef.current.entries()) {
            const totalQty = Array.from(map.values()).reduce((s, v) => s + (v.qty || 0), 0) || 0;
            items.push({ id: `local_${p}`, productId: Number(p), quantity: totalQty, customizations: [] } as CartItem);
          }
          const localCart: CartShape = { items };
          setCartAndRef(localCart);
          return localCart;
        }

        // Authenticated path: find backend row & call server (existing behavior)
        const currentItems = cartRef.current?.items || [];
        let backendItemId: string | null = null;
        for (const ci of currentItems) {
          const ciPid = String(ci.productId ?? "");
          if (ciPid === pid) {
            const { backendId } = parseVirtualId(ci.id);
            backendItemId = backendId;
            break;
          }
        }

        const headers = await getAuthHeaders();

if (backendItemId) {
  for (let i = 0; i < quantity; i++) {
    const res = await authFetch(CART_URL, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: backendItemId, action: "increment" }),
    });
    await parseJsonSafe(res);
    if (!res.ok) throw new Error(`addToCart PATCH increment failed: ${res.status}`);
  }
  console.log("🛒 [addToCart] PATCHed increment x", quantity, "on backendId:", backendItemId);
        } else {
          const payload: any = { productId, quantity: 1, customizations: normalized.length > 0 ? normalized : [] };
          console.log("🛒 [addToCart] POSTing new item:", JSON.stringify(payload).slice(0, 200));
          const res = await authFetch(CART_URL, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const resData = await parseJsonSafe(res);
          console.log("🛒 addToCart POST response:", res.status, JSON.stringify(resData || {}).slice(0, 200));
          if (!res.ok) throw new Error(`addToCart POST failed: ${res.status}`);
          if (resData?.success === false) throw new Error("addToCart returned success=false");
        }

        return await refreshCart();
      } catch (err) {
        console.error("addToCart failed:", err);
        return null;
      } finally {
        setLoading(false);
      }
    });
  }, [mapCustomizations, refreshCart, enqueue, saveVariantStore, setCartAndRef]);

  // ----------------------------------------------------------------
  // incrementItem(virtualId)
  //
  // virtualId: "<backendId>__<rawKey>"  OR plain "<backendId>"
  // - Increment the variant qty by 1
  // - Send PATCH increment to backend
  // ----------------------------------------------------------------
  const incrementItem = React.useCallback(async (virtualId: string): Promise<CartShape | null> => {
    return enqueue(async () => {
      setLoading(true);
      try {
        const { backendId, rawKey } = parseVirtualId(virtualId);

        // Update variant store
        if (rawKey) {
          const itemsInCart = cartRef.current?.items || [];
          const virtualItem = itemsInCart.find((it) => it.id === virtualId);
          const pid = String(virtualItem?.productId ?? "");
          if (pid && variantStoreRef.current.has(pid)) {
            const variantMap = variantStoreRef.current.get(pid)!;
            const variant = variantMap.get(rawKey);
            if (variant) {
              variant.qty += 1;
              saveVariantStore();
              console.log("🔼 incrementItem variant qty→", variant.qty, "rawKey:", rawKey.slice(0, 40));
            }
          }
        }

        // If user is not logged in, reflect change locally only
        const token = await tokenStorage.getToken();
        if (!token) {
          const items: CartItem[] = [];
          for (const [p, map] of variantStoreRef.current.entries()) {
            const totalQty = Array.from(map.values()).reduce((s, v) => s + (v.qty || 0), 0) || 0;
            items.push({ id: `local_${p}`, productId: Number(p), quantity: totalQty, customizations: [] } as CartItem);
          }
          const localCart: CartShape = { items };
          setCartAndRef(localCart);
          return localCart;
        }

        // PATCH backend
        const headers = await getAuthHeaders();
        const res = await authFetch(CART_URL, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: backendId, action: "increment" }),
        });
        await parseJsonSafe(res);
        if (!res.ok) throw new Error(`incrementItem failed: ${res.status}`);
        return await refreshCart();
      } catch (err) { console.error("incrementItem failed:", err); return null; }
      finally { setLoading(false); }
    });
  }, [refreshCart, enqueue, saveVariantStore, setCartAndRef]);

  // ----------------------------------------------------------------
  // removeItemInternal (no queue — called from within queued fns)
  // Sends DELETE to backend.  Does NOT touch variantStoreRef.
  // ----------------------------------------------------------------
  const removeItemInternal = React.useCallback(async (backendId: string): Promise<boolean> => {
    try {
      const url = `${CART_URL}?itemId=${encodeURIComponent(backendId)}`;
      const headers = await getAuthHeaders();
      const res = await authFetch(url, { method: "DELETE", headers });
      await parseJsonSafe(res);
      if (!res.ok) throw new Error(`Remove failed: ${res.status}`);
      return true;
    } catch (err) { console.error("removeItemInternal failed:", err); return false; }
  }, []);

  // ----------------------------------------------------------------
  // decrementItem(virtualId)
  //
  // variant.qty > 1   → variant.qty-- , PATCH decrement backend
  // variant.qty === 1 and other variants exist → remove this variant,
  //                                              PATCH decrement backend
  // variant.qty === 1 and no other variants → remove entire backend row (DELETE)
  // ----------------------------------------------------------------
  const decrementItem = React.useCallback(async (virtualId: string): Promise<CartShape | null> => {
    return enqueue(async () => {
      setLoading(true);
      try {
        const { backendId, rawKey } = parseVirtualId(virtualId);

        let shouldDeleteBackend = false;

        if (rawKey) {
          // Find this variant in the store
          const itemsInCart = cartRef.current?.items || [];
          const virtualItem = itemsInCart.find((it) => it.id === virtualId);
          const pid = String(virtualItem?.productId ?? "");

          if (pid && variantStoreRef.current.has(pid)) {
            const variantMap = variantStoreRef.current.get(pid)!;
            const variant = variantMap.get(rawKey);

            if (variant) {
              if (variant.qty > 1) {
                variant.qty -= 1;
                console.log("🔽 decrementItem variant qty→", variant.qty);
              } else {
                // Remove this variant
                variantMap.delete(rawKey);
                console.log("🔽 decrementItem variant removed, rawKey:", rawKey.slice(0, 40));
              }

              if (variantMap.size === 0) {
                // No variants left for this product → delete backend row
                variantStoreRef.current.delete(pid);
                shouldDeleteBackend = true;
              }
            }
          }
          saveVariantStore();
        } else {
          // Plain (non-virtual) id — check backend qty directly
          const existing = cartRef.current?.items?.find((it) => String(it.id) === String(backendId));
          const qty = Number(existing?.quantity ?? 1);
          if (qty <= 1) shouldDeleteBackend = true;
        }

        // If user is not logged in, reflect change locally only
        const token = await tokenStorage.getToken();
        if (!token) {
          const items: CartItem[] = [];
          for (const [p, map] of variantStoreRef.current.entries()) {
            const totalQty = Array.from(map.values()).reduce((s, v) => s + (v.qty || 0), 0) || 0;
            items.push({ id: `local_${p}`, productId: Number(p), quantity: totalQty, customizations: [] } as CartItem);
          }
          const localCart: CartShape = { items };
          setCartAndRef(localCart);
          return localCart;
        }

        const headers = await getAuthHeaders();
        if (shouldDeleteBackend) {
          await removeItemInternal(backendId);
        } else {
          const res = await authFetch(CART_URL, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: backendId, action: "decrement" }),
          });
          await parseJsonSafe(res);
          if (!res.ok) throw new Error(`decrementItem PATCH failed: ${res.status}`);
        }

        return await refreshCart();
      } catch (err) { console.error("decrementItem failed:", err); return null; }
      finally { setLoading(false); }
    });
  }, [removeItemInternal, refreshCart, enqueue, saveVariantStore, setCartAndRef]);

  // ----------------------------------------------------------------
  // removeItem(virtualId)
  //
  // Removes the specific variant from the store.
  // If no variants remain for the product: DELETE backend row.
  // If variants remain: PATCH decrement backend by this variant's qty.
  // ----------------------------------------------------------------
  const removeItem = React.useCallback(async (virtualId: string): Promise<CartShape | null> => {
    return enqueue(async () => {
      setLoading(true);
      try {
        const { backendId, rawKey } = parseVirtualId(virtualId);

        let shouldDeleteBackend = false;
        let removedQty = 1;

        if (rawKey) {
          const itemsInCart = cartRef.current?.items || [];
          const virtualItem = itemsInCart.find((it) => it.id === virtualId);
          const pid = String(virtualItem?.productId ?? "");

          if (pid && variantStoreRef.current.has(pid)) {
            const variantMap = variantStoreRef.current.get(pid)!;
            const variant = variantMap.get(rawKey);
            if (variant) {
              removedQty = variant.qty;
              variantMap.delete(rawKey);
            }
            if (variantMap.size === 0) {
              variantStoreRef.current.delete(pid);
              shouldDeleteBackend = true;
            }
          } else {
            shouldDeleteBackend = true;
          }
          saveVariantStore();
        } else {
          shouldDeleteBackend = true;
        }

        // If user is not logged in, reflect change locally only
        const token = await tokenStorage.getToken();
        if (!token) {
          const items: CartItem[] = [];
          for (const [p, map] of variantStoreRef.current.entries()) {
            const totalQty = Array.from(map.values()).reduce((s, v) => s + (v.qty || 0), 0) || 0;
            items.push({ id: `local_${p}`, productId: Number(p), quantity: totalQty, customizations: [] } as CartItem);
          }
          const localCart: CartShape = { items };
          setCartAndRef(localCart);
          return localCart;
        }

        if (shouldDeleteBackend) {
          await removeItemInternal(backendId);
        } else {
          // Decrement backend qty by the number of units this variant had
          const headers = await getAuthHeaders();
          for (let i = 0; i < removedQty; i++) {
            const res = await authFetch(CART_URL, {
              method: "PATCH",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: backendId, action: "decrement" }),
            });
            await parseJsonSafe(res);
            if (!res.ok) {
              console.warn("removeItem: PATCH decrement failed on step", i, "of", removedQty);
              break;
            }
          }
        }

        return await refreshCart();
      } catch (err) { console.error("removeItem failed:", err); return null; }
      finally { setLoading(false); }
    });
  }, [removeItemInternal, refreshCart, enqueue, saveVariantStore, setCartAndRef]);

  // -- clearCart --
  const clearCart = React.useCallback(async (): Promise<CartShape | null> => {
    return enqueue(async () => {
      setLoading(true);
      try {
        // Collect unique backend IDs (strip virtual suffix)
        const snapshotItems = cartRef.current?.items || [];
        const backendIdSet = new Set<string>();
        for (const it of snapshotItems) {
          const { backendId } = parseVirtualId(it.id);
          if (backendId) backendIdSet.add(backendId);
        }
        const ids = Array.from(backendIdSet);

        let resolvedShopId: number | null = shopIdRef.current;
        if (!resolvedShopId) {
          try {
            const stored = localStorage.getItem("cart_shop_id");
            if (stored && stored !== "") resolvedShopId = Number(stored);
          } catch { /* ignore */ }
        }

        if (ids.length === 0) {
          setCartAndRef(null);
          return null;
        }

        if (!resolvedShopId) {
          console.error("clearCart: cannot delete items — shopId is null. Aborting.");
          return cartRef.current ?? null;
        }

        // If the user is not logged in, avoid calling protected APIs which would
        // trigger the global 401 -> /auth redirect. For guests, clear local
        // variant ledger and localStorage and update UI state to empty cart.
        const token = await tokenStorage.getToken();
        if (!token) {
          variantStoreRef.current.clear();
          try {
            localStorage.removeItem("cart_variants_v1");
            localStorage.removeItem("cart_customizations_v2");
            localStorage.removeItem("cart_rawkeys_v3");
          } catch { /* ignore */ }
          setCartAndRef(null);
          return null;
        }

        let failCount = 0;
        for (const id of ids) {
          try {
            const url = `${CART_URL}?itemId=${encodeURIComponent(id)}`;
            const headers = await getAuthHeaders();
            const res = await authFetch(url, { method: "DELETE", headers });
            await parseJsonSafe(res);
            if (!res.ok) {
              console.warn("clearCart: DELETE failed for itemId", id, "status", res.status);
              failCount++;
            }
          } catch (err) {
            console.warn("clearCart: exception deleting itemId", id, err);
            failCount++;
          }
        }

        if (failCount > 0) {
          console.warn("clearCart: some items failed to delete", { total: ids.length, failed: failCount });
        }

        // Clear variant store completely
        variantStoreRef.current.clear();
        try {
          localStorage.removeItem("cart_variants_v1");
          // Remove old keys too (cleanup)
          localStorage.removeItem("cart_customizations_v2");
          localStorage.removeItem("cart_rawkeys_v3");
        } catch { /* ignore */ }

        return await refreshCart(resolvedShopId);
      } catch (err) { console.error("clearCart failed:", err); return null; }
      finally { setLoading(false); }
    });
  }, [refreshCart, enqueue, setCartAndRef]);

  const value: CartContextShape = React.useMemo(() => ({
    cart, origin, shopId, loading, refreshCart, addToCart, incrementItem, decrementItem, removeItem, clearCart, setShopId,
  }), [cart, origin, shopId, loading, refreshCart, addToCart, incrementItem, decrementItem, removeItem, clearCart, setShopId]);

  // -- Hydrate on mount --
  React.useEffect(() => {
    try {
      const token = localStorage.getItem("app_jwt_token");
      const stored = localStorage.getItem("cart_shop_id");
      const restoredShopId = stored != null && stored !== "" ? Number(stored) : null;
      if (restoredShopId !== null && !Number.isNaN(restoredShopId)) setShopId(restoredShopId);
      if (token) {
        refreshCart(restoredShopId).catch((err: unknown) => console.error("CartContext: refreshCart failed on mount", err));
      } else {
        // Guest: build a synthetic local cart from the persisted variant ledger so
        // UI (ViewCart) can show sticky cart immediately without requiring a user
        // interaction or manual refresh.
        try {
          const items: CartItem[] = [];
          for (const [p, map] of variantStoreRef.current.entries()) {
            const totalQty = Array.from(map.values()).reduce((s, v) => s + (v.qty || 0), 0) || 0;
            items.push({ id: `local_${p}`, productId: Number(p), quantity: totalQty, customizations: [] } as CartItem);
          }
          if (items.length > 0) setCartAndRef({ items });
  } catch { /* ignore */ }
      }
    } catch (err) { console.error("CartContext: error checking token on mount", err); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Merge guest local variants into server cart after login --
  React.useEffect(() => {
    const handler = async () => {
      try {
        const token = await tokenStorage.getToken();
        const lastSync = (() => {
          try { return localStorage.getItem('guest_cart_last_sync_token'); } catch { return null; }
        })();

        if (token) {
          if (lastSync === token) return; // already synced for this token

          if (!variantStoreRef.current || variantStoreRef.current.size === 0) {
            try { localStorage.setItem('guest_cart_last_sync_token', token); } catch { /* ignore */ }
            return;
          }

          await enqueue(async () => {
            // For each productId -> each variant entry, POST to backend using authFetch
            for (const [pid, map] of variantStoreRef.current.entries()) {
              for (const [, v] of map.entries()) {
                const qty = (v && typeof v.qty === 'number') ? v.qty : 0;
                if (!qty) continue;
                const payload = { productId: Number(pid), quantity: qty, customizations: v.normalized || [] };
                try {
                  const res = await authFetch(CART_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  await parseJsonSafe(res);
                } catch (err) {
                  console.warn('CartContext: guest merge POST failed for pid', pid, err);
                }
              }
            }

      // Refresh cart from server (now includes merged items)
try { await refreshCart(); } catch { /* ignore */ }

// Rebuild variant store from merged variants so customization labels survive post-login.
// We do this AFTER refreshCart so cartRef.current has the latest backend item IDs.
const rebuiltStore = new Map<string, Map<string, VariantEntry>>();
for (const [pid, map] of Array.from(variantStoreRef.current.entries())) {
  if (map.size > 0) {
    rebuiltStore.set(pid, new Map(map));
  }
}
variantStoreRef.current = rebuiltStore;
saveVariantStore();

            try { localStorage.setItem('guest_cart_last_sync_token', token); } catch { /* ignore */ }
          });
        } else {
  const isGuest = localStorage.getItem("auth_mode") === "guest";


  if (isGuest) return;

  try {
    variantStoreRef.current.clear();
  } catch {/* ignore */ }

  try {
    localStorage.removeItem('cart_variants_v1');
    localStorage.removeItem('cart_customizations_v2');
    localStorage.removeItem('cart_rawkeys_v3');
    localStorage.removeItem('guest_cart_last_sync_token');
  } catch {/* ignore */ }

  try {
    setCartAndRef(null);
  } catch {/* ignore */}
}
      } catch (err) {
        console.error('CartContext: merge-on-login handler failed', err);
      }
    };

    window.addEventListener('auth-changed', handler);
    return () => window.removeEventListener('auth-changed', handler);
  }, [enqueue, refreshCart, setCartAndRef]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;

/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE = "https://endpoint.whitemantis.ae/api";
import tokenStorage from "../utils/tokenStorage";

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
  } catch (e) {
    console.warn("authFetch token read failed", e);
  }
  const res = await fetch(url, { ...(init || {}), headers });
  if (res.status !== 401) return res;
  try { await tokenStorage.clearToken(); } catch (e) { console.warn(e); }
  try {
    if (!isOnAuthPage() && !hasRedirectedToAuth) {
      hasRedirectedToAuth = true;
      window.location.assign("/auth");
    }
  } catch (e) { console.warn(e); }
  return res;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  return { "Content-Type": "application/json" };
}


export async function getStoreWishlist(): Promise<any[]> {
  const headers = await getAuthHeaders();
  const res = await authFetch(`${API_BASE}/wishlist`, {
    method: "GET",
    headers,
  });

  if (!res.ok) throw new Error("Failed to fetch store wishlist");

  const data = await res.json();
  console.log("[apiStoreWishlist] getStoreWishlist → response:", data);

  if (!data.success) throw new Error("Store wishlist API success false");

  // items[] is polymorphic: product.relationTo === "web-products" → store
  const allItems: any[] = data.wishlist?.items || [];
  const storeItems = allItems.filter((it: any) => it?.product?.relationTo === "web-products");

  console.log("[apiStoreWishlist] store items count:", storeItems.length);
  if (storeItems.length > 0) {
    console.log("[apiStoreWishlist] first store item:", JSON.stringify(storeItems[0]).slice(0, 300));
  }
  return storeItems;
}


export async function addToStoreWishlist(productId: number): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await authFetch(`${API_BASE}/wishlist`, {
    method: "POST",
    headers,
    body: JSON.stringify({ origin: "store", productId }),
  });

  const data = await res.json();
  console.log("[apiStoreWishlist] addToStoreWishlist → response:", data);
  if (!data.success) throw new Error("Failed to add to store wishlist");
  return data;
}

export async function removeFromStoreWishlist(productId: number): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await authFetch(`${API_BASE}/wishlist`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ origin: "store", productId }),
  });

  const data = await res.json();
  console.log("[apiStoreWishlist] removeFromStoreWishlist → response:", data);
  if (!data.success) throw new Error("Failed to remove from store wishlist");
  return data;
}

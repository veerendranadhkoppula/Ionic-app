const API_BASE = "https://endpoint.whitemantis.ae/api";
import tokenStorage from "../utils/tokenStorage";

let hasRedirectedToAuth = false;
function isOnAuthPage() {
  try { return typeof window !== "undefined" && window.location && String(window.location.pathname || "").startsWith("/auth"); } catch { return false; }
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
    // ignore token read errors
    console.warn("authFetch token read failed", e);
  }
  const res = await fetch(url, { ...(init || {}), headers });
  if (res.status !== 401) return res;
  try { await tokenStorage.clearToken(); } catch (e) { console.warn(e); }
  try { if (!isOnAuthPage() && !hasRedirectedToAuth) { hasRedirectedToAuth = true; window.location.assign("/auth"); } } catch (e) { console.warn(e); }
  return res;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  // Headers common to wishlist requests; Authorization is injected
  // automatically by fetchWithAuth to avoid duplicates.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  return headers;
}
/**
 * GET Cafe Wishlist
 */
export async function getCafeWishlist() {
  const headers = await getAuthHeaders();
  const res = await authFetch(`${API_BASE}/wishlist`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch wishlist");
  }

  const data = await res.json();

  console.log("📦 Wishlist API full response:", data);

  if (!data.success) {
    throw new Error("Wishlist API success false");
  }

  // items[] is polymorphic: product.relationTo === "shop-menu" → cafe
  //                          product.relationTo === "web-products" → store
  const allItems = data.wishlist?.items || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cafeItems = allItems.filter((it: any) => it?.product?.relationTo === "shop-menu");

  console.log("📦 Returning wishlist items:", cafeItems);
  return cafeItems;
}

/**
 * ADD item to Cafe Wishlist
 */
export async function addToCafeWishlist(productId: number) {
  const headers = await getAuthHeaders();
  const res = await authFetch(`${API_BASE}/wishlist`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      origin: "cafe",
      productId,
    }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error("Failed to add to wishlist");
  }

  return data;
}


export async function removeFromCafeWishlist(productId: number) {
  const headers = await getAuthHeaders();
  const res = await authFetch(`${API_BASE}/wishlist`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({
      origin: "cafe",
      productId,
    }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error("Failed to remove from wishlist");
  }

  return data;
}

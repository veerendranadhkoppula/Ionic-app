import tokenStorage from "../utils/tokenStorage";

const API_BASE = "https://whitemantis-app.vercel.app/api";
const MEDIA_BASE = "https://whitemantis-app.vercel.app";

const CART_URL = `${API_BASE}/app/cart`;
const CART_COLLECTION_URL = `${API_BASE}/app-cart`;

export interface StoreCheckoutAddress {
  label           : string;
  addressFirstName: string;
  addressLastName : string;
  street          : string;
  apartment       : string;
  city            : string;
  emirates        : string;
  country         : string;
  phoneNumber     : string;
}

export interface StoreCheckoutItem {
  productId : number;
  quantity  : number;
  variantId ?: string;
  variantName?: string;
  unitPrice ?: number;
}

export interface StoreCheckoutPayload {
  deliveryType      : "ship" | "pickup";
  shippingAddress  ?: StoreCheckoutAddress | null;
  billingAddress   ?: StoreCheckoutAddress | null;
  shippingAsBilling ?: boolean;
  items             : StoreCheckoutItem[];
  useWTCoins        : boolean;
  appliedCouponCode : string | null;
  taxRate           : number;
  shippingCharge    : number;
  couponDiscount    : number;
  beansDiscount     : number;
  toPay             : number;
  email            ?: string;
}

export interface StoreCheckoutResponse {
  success     : boolean;
  orderId    ?: string | number;
  dbOrderId  ?: string | number;
  order      ?: { id?: string | number; [key: string]: unknown };
  id         ?: string | number;
  doc        ?: { id?: string | number; [key: string]: unknown };
  clientSecret?: string;
  client_secret?: string;
  message    ?: string;
  [key: string]: unknown;
}


export async function storeCheckout(
  token  : string | null,
  payload: StoreCheckoutPayload,
): Promise<StoreCheckoutResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;


  const mapAddress = (a: StoreCheckoutAddress | null | undefined) => {
    if (!a) return undefined;
    return {
      addressFirstName: a.addressFirstName,
      addressLastName : a.addressLastName,
      addressLine1    : a.street,
      addressLine2    : a.apartment ?? "",
      city            : a.city,
      emirates        : a.emirates,
      phoneNumber     : a.phoneNumber,
    };
  };


  const deliveryOption = payload.deliveryType === "ship" ? "delivery" : "pickup";

  const sameAsBilling = payload.shippingAsBilling ?? false;
  const shippingAddr  = mapAddress(payload.shippingAddress);
  const billingAddr   = mapAddress(payload.billingAddress);

  const body: Record<string, unknown> = {
    deliveryOption,
    useWTCoins                     : payload.useWTCoins,
    shippingAddressAsBillingAddress: sameAsBilling,
  };


  if (payload.appliedCouponCode) {
    body["appliedCouponCode"] = payload.appliedCouponCode;
  }

  if (deliveryOption === "delivery" && shippingAddr) {
    body["shippingAddress"] = shippingAddr;
  }

  
  if (!sameAsBilling && billingAddr) {
    body["billingAddress"] = billingAddr;
  }

  console.log("🛒 store-checkout PAYLOAD v7:", JSON.stringify(body, null, 2));

  const res = await fetch(`${API_BASE}/checkout/app-store-checkout`, {
    method : "POST",
    headers,
    body   : JSON.stringify(body),
  });

  // Log raw response text BEFORE parsing so we see the full backend error
  const rawText = await res.text();
  console.log(`🛒 store-checkout RAW RESPONSE (${res.status}):`, rawText);

  let data: StoreCheckoutResponse;
  try {
    data = JSON.parse(rawText) as StoreCheckoutResponse;
  } catch {
    data = {} as StoreCheckoutResponse;
    console.error("🛒 store-checkout: response was not valid JSON");
  }

  console.log(`🛒 store-checkout PARSED (${res.status}):`, data);
  console.log(`🛒 store-checkout HEADERS:`, {
    "content-type": res.headers.get("content-type"),
    "x-vercel-error": res.headers.get("x-vercel-error"),
  });

  if (!res.ok) {
    const msg = (data as Record<string, unknown>)?.error as string
      ?? (data as Record<string, unknown>)?.message as string
      ?? `Store checkout failed (${res.status})`;
    console.error(`🛒 store-checkout ERROR DETAIL:`, {
      status: res.status,
      msg,
      fullData: data,
    });
    throw new Error(msg);
  }

  return data;
}



export interface StoreCartItem {
  id: string;
  productId: number;
  quantity: number;
  variantId?: string;
  variantName?: string;
  productName?: string;
  productImage?: string;
  unitPrice?: number;
  relationTo?: string;
}

export interface StoreCartShape {
  items: StoreCartItem[];
  total?: number;
  origin?: "store" | "cafe";
  cartId?: number | string;
}


async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {};
  if (init?.headers) {
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

  const res = await fetch(input, { ...(init || {}), headers });

  if (res.status === 401) {
    try { await tokenStorage.clearToken(); } catch { /* ignore */ }
    try { window.location.assign("/auth"); } catch { /* ignore */ }
  }
  return res;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; }
  catch { return null; }
}


export function normalizeStoreCart(raw: unknown): StoreCartShape | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const rawItems = Array.isArray(data.items) ? data.items : [];

  const items: StoreCartItem[] = rawItems
    .map((ci: unknown): StoreCartItem | null => {
      if (!ci || typeof ci !== "object") return null;
      const item = ci as Record<string, unknown>;

      const rawId = item.id ?? item.itemId;
      const id = rawId != null ? String(rawId) : "";
      if (!id) return null;

      // The GET response returns productId as a flat string/number field
      const pid = Number(
        item.productId ??
        ((item.product as Record<string, unknown>)?.value as Record<string, unknown>)?.id ??
        NaN
      );
      if (Number.isNaN(pid)) return null;

      const quantity = item.quantity != null ? Number(item.quantity) : 1;
      const variantId = item.vId != null && item.vId !== "" ? String(item.vId) : undefined;
      const variantName = item.variantName != null ? String(item.variantName) : undefined;

      const relationTo =
        (item.relationTo as string | undefined) ??
        ((item.product as Record<string, unknown>)?.relationTo as string | undefined);

      const productName =
        (item.productName as string | undefined) ??
        (item.name as string | undefined);

  
      const rawImage =
        (item.productImage as string | undefined) ??
        (item.image as string | undefined) ??
        "";
      const productImage = rawImage
        ? rawImage.startsWith("http")
          ? rawImage
          : `${MEDIA_BASE}${rawImage}`
        : undefined;
      const unitPrice =
        item.unitPrice != null ? Number(item.unitPrice) :
        item.price != null ? Number(item.price) :
        undefined;

      return { id, productId: pid, quantity, variantId, variantName, productName, productImage, unitPrice, relationTo };
    })
    .filter((x): x is StoreCartItem => x !== null);
  const topLevelOrigin = data.origin as "store" | "cafe" | undefined;
  let origin: "store" | "cafe" | undefined;
  if (items.length > 0) {
    const hasStoreItem = items.some((it) => it.relationTo === "web-products");
    const hasCafeItem  = items.some((it) => it.relationTo === "shop-menu");
    if (hasStoreItem) {
      origin = "store";
    } else if (hasCafeItem) {
      origin = "cafe";
    } else {
      // No per-item relationTo info — fall back to the top-level origin field
      origin = topLevelOrigin;
    }
  } else {
    origin = topLevelOrigin;
  }

  const cartId = data.id != null ? (data.id as number | string) : undefined;
  return { items, origin, cartId };
}


export async function fetchStoreCart(): Promise<StoreCartShape | null> {
  // Fetch both endpoints in parallel
  const [cartRes, collectionRes] = await Promise.all([
    authFetch(CART_URL, { method: "GET", headers: { Accept: "application/json" } }),
    authFetch(`${CART_COLLECTION_URL}?limit=1`, { method: "GET", headers: { Accept: "application/json" } }),
  ]);

  if (cartRes.status === 404) return null;
  const cartData = await parseJsonSafe(cartRes) as Record<string, unknown> | null;
  if (!cartRes.ok || !cartData) {
    if (cartRes.status === 404) return null;
    throw new Error(`fetchStoreCart failed: ${cartRes.status}`);
  }

  const raw = (cartData?.cart ?? cartData) as Record<string, unknown>;
  const cart = normalizeStoreCart(raw);
  if (!cart) return null;


  if (collectionRes.ok) {
    const collectionData = await parseJsonSafe(collectionRes) as Record<string, unknown> | null;
    const firstDoc = (collectionData?.docs as Record<string, unknown>[] | undefined)?.[0];
    if (firstDoc?.id != null) {
      cart.cartId = firstDoc.id as number | string;
    }
  }

  return cart;
}


export async function cartHasCafeItems(): Promise<boolean> {
  try {
    const cart = await fetchStoreCart();
    return cart !== null && cart.items.length > 0 && cart.origin === "cafe";
  } catch {
    return false;
  }
}


async function patchStoreCartDirect(
  cartId: number | string,
  existingItems: StoreCartItem[],
  newProductId: number,
  variantId?: string,
  variantName?: string,
  unitPrice?: number,
): Promise<StoreCartShape | null> {
  const COLLECTION_PATCH_URL = `${API_BASE}/app-cart/${cartId}`;
  const existingPayloadItems = existingItems.map((it) => {
    const item: Record<string, unknown> = {
      id: it.id,
      product: { relationTo: "web-products", value: it.productId },
      quantity: it.quantity,
      customizations: [],
    };
    if (it.variantId) item.vId = it.variantId;
    if (it.variantName) item.variantName = it.variantName;
    if (it.unitPrice != null) item.unitPrice = it.unitPrice;
    return item;
  });

  const newItem: Record<string, unknown> = {
    product: { relationTo: "web-products", value: newProductId },
    quantity: 1,
    customizations: [],
  };
  if (variantId) newItem.vId = variantId;
  if (variantName) newItem.variantName = variantName;
  if (unitPrice != null) newItem.unitPrice = unitPrice;

  const patchRes = await authFetch(COLLECTION_PATCH_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      items: [...existingPayloadItems, newItem],
    }),
  });

  const patchData = await parseJsonSafe(patchRes);
  if (!patchRes.ok) {
    console.error(
      `patchStoreCartDirect PATCH failed: ${patchRes.status}`,
      JSON.stringify(patchData || {}).slice(0, 300),
    );
    throw new Error(`patchStoreCartDirect PATCH failed: ${patchRes.status}`);
  }

  return fetchStoreCart();
}


export async function addStoreCartItem(
  productId: number,
  quantity: number,
  variantId?: string,
  variantName?: string,
  unitPrice?: number,
): Promise<StoreCartShape | null> {

  console.log(`🛒 [addStoreCartItem] START — productId=${productId} qty=${quantity} variantId=${variantId ?? "none"} variantName=${variantName ?? "none"} unitPrice=${unitPrice ?? "none"}`);

  const cart = await fetchStoreCart();
  console.log(`🛒 [addStoreCartItem] current cart:`, cart ? `${cart.items.length} items, origin=${cart.origin}, cartId=${cart.cartId}` : "null (empty)");

  const findExisting = (c: StoreCartShape | null) =>
    (c?.items ?? []).find((it) => {
      if (it.productId !== productId) return false;
      if (variantId) return String(it.variantId ?? "") === String(variantId);
      return !it.variantId;
    }) ?? null;

  const existingItem = findExisting(cart);
  console.log(`🛒 [addStoreCartItem] existing item match:`, existingItem ? `id=${existingItem.id}` : "none");

  if (existingItem) {
    console.log(`🛒 [addStoreCartItem] PATH: increment existing item`);
    for (let i = 0; i < quantity; i++) {
      const res = await authFetch(CART_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ itemId: existingItem.id, action: "increment" }),
      });
      await parseJsonSafe(res);
      if (!res.ok) {
        console.warn(`addStoreCartItem: increment ${i + 1}/${quantity} failed (${res.status})`);
        break;
      }
    }
    const result = await fetchStoreCart();
    console.log(`🛒 [addStoreCartItem] after increment, cart:`, result ? `${result.items.length} items` : "null");
    return result;
  }

  if (cart && cart.cartId != null) {
    console.log(`🛒 [addStoreCartItem] PATH: patchStoreCartDirect (cart exists, cartId=${cart.cartId})`);
    let updatedCart = await patchStoreCartDirect(
      cart.cartId,
      cart.items,
      productId,
      variantId,
      variantName,
      unitPrice,
    );
    console.log(`🛒 [addStoreCartItem] after patchStoreCartDirect:`, updatedCart ? `${updatedCart.items.length} items` : "null");

    // (qty > 1): PATCH increment the newly added item
    if (quantity > 1) {
      updatedCart = await fetchStoreCart();
      const added = findExisting(updatedCart);
      if (added) {
        for (let i = 1; i < quantity; i++) {
          const res = await authFetch(CART_URL, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ itemId: added.id, action: "increment" }),
          });
          await parseJsonSafe(res);
          if (!res.ok) {
            console.warn(`addStoreCartItem: qty increment ${i}/${quantity - 1} failed (${res.status})`);
            break;
          }
        }
        updatedCart = await fetchStoreCart();
      }
    }

    return updatedCart;
  }

  
  console.log(`🛒 [addStoreCartItem] PATH: POST new cart (no existing cart)`);

  const postPayload: Record<string, unknown> = {
    productId,                                                  // required by handler validation
    product: { relationTo: "web-products", value: productId }, // required by hook classification
    quantity: 1,
    customizations: [],
  };
  // Intentionally omit vId here — added via PATCH after cart creation (see below)
  if (variantName)        postPayload.variantName = variantName;
  if (unitPrice != null)  postPayload.unitPrice   = unitPrice;

  console.log(`🛒 [addStoreCartItem] POST payload:`, JSON.stringify(postPayload));

  const postRes = await authFetch(CART_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(postPayload),
  });
  const postData = await parseJsonSafe(postRes);
  console.log(`🛒 [addStoreCartItem] POST response status=${postRes.status} ok=${postRes.ok}`, JSON.stringify(postData || {}).slice(0, 300));
  if (!postRes.ok) {
    console.error(
      `addStoreCartItem POST failed: ${postRes.status}`,
      JSON.stringify(postData || {}).slice(0, 300),
    );
    throw new Error(`addStoreCartItem POST failed: ${postRes.status}`);
  }


  let updatedCart = await fetchStoreCart();
  console.log(`🛒 [addStoreCartItem] after POST + fetchStoreCart:`, updatedCart ? `${updatedCart.items.length} items, origin=${updatedCart.origin}, cartId=${updatedCart.cartId}` : "null");

  if (variantId != null && variantId !== "") {
    console.log(`🛒 [addStoreCartItem] variant item — now patching vId onto created item`);
    const created = findExisting(updatedCart); // finds by productId + no variantId yet
    console.log(`🛒 [addStoreCartItem] findExisting (no-vId match) result:`, created ? `id=${created.id}` : "NOT FOUND");
    if (created && updatedCart?.cartId != null) {

      const patchedItems = (updatedCart.items ?? []).map((it) => {
        const base: Record<string, unknown> = {
          id: it.id,
          product: { relationTo: "web-products", value: it.productId },
          quantity: it.quantity,
          customizations: [],
        };
        if (it.unitPrice != null) base.unitPrice = it.unitPrice;
        if (it.id === created.id) {
          // Attach the variant to this item
          base.vId = String(variantId);
          if (variantName) base.variantName = variantName;
        } else {
          if (it.variantId) base.vId = it.variantId;
          if (it.variantName) base.variantName = it.variantName;
        }
        return base;
      });

      console.log(`🛒 [addStoreCartItem] variant PATCH to ${CART_COLLECTION_URL}/${updatedCart.cartId}, items:`, JSON.stringify(patchedItems).slice(0, 400));
      const vPatchRes = await authFetch(`${CART_COLLECTION_URL}/${updatedCart.cartId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ items: patchedItems }),
      });
      const vPatchData = await parseJsonSafe(vPatchRes);
      console.log(`🛒 [addStoreCartItem] variant PATCH status=${vPatchRes.status} ok=${vPatchRes.ok}`, JSON.stringify(vPatchData || {}).slice(0, 200));
      if (!vPatchRes.ok) {
        console.warn(`addStoreCartItem: variant PATCH failed (${vPatchRes.status}) — item added without vId`);
      }
      updatedCart = await fetchStoreCart();
      console.log(`🛒 [addStoreCartItem] after variant PATCH + fetchStoreCart:`, updatedCart ? `${updatedCart.items.length} items, origin=${updatedCart.origin}` : "null");
    } else {
      console.warn(`🛒 [addStoreCartItem] variant PATCH skipped — created item not found or no cartId. cartId=${updatedCart?.cartId}`);
    }
  }


  if (quantity > 1) {
    const added = findExisting(updatedCart);
    if (added) {
      for (let i = 1; i < quantity; i++) {
        const res = await authFetch(CART_URL, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ itemId: added.id, action: "increment" }),
        });
        await parseJsonSafe(res);
        if (!res.ok) {
          console.warn(`addStoreCartItem: qty increment ${i}/${quantity - 1} failed (${res.status})`);
          break;
        }
      }
      updatedCart = await fetchStoreCart();
    }
  }

  return updatedCart;
}


export async function incrementStoreCartItem(itemId: string): Promise<StoreCartShape | null> {
  const res = await authFetch(CART_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ itemId, action: "increment" }),
  });
  await parseJsonSafe(res);
  if (!res.ok) throw new Error(`incrementStoreCartItem failed: ${res.status}`);
  return fetchStoreCart();
}


export async function decrementStoreCartItem(itemId: string): Promise<StoreCartShape | null> {
  const res = await authFetch(CART_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ itemId, action: "decrement" }),
  });
  await parseJsonSafe(res);
  if (!res.ok) throw new Error(`decrementStoreCartItem failed: ${res.status}`);
  return fetchStoreCart();
}


export async function removeStoreCartItem(itemId: string): Promise<StoreCartShape | null> {
  const res = await authFetch(`${CART_URL}?itemId=${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  await parseJsonSafe(res);
  if (!res.ok) throw new Error(`removeStoreCartItem failed: ${res.status}`);
  return fetchStoreCart();
}


export async function clearStoreCart(): Promise<void> {
  const cart = await fetchStoreCart();
  const items = cart?.items ?? [];
  for (const item of items) {
    try {
      const res = await authFetch(`${CART_URL}?itemId=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      await parseJsonSafe(res);
      if (!res.ok) console.warn(`clearStoreCart: failed to delete item ${item.id} (${res.status})`);
    } catch (err) {
      console.warn(`clearStoreCart: exception deleting item ${item.id}`, err);
    }
  }
}

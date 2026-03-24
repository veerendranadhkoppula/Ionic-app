const BASE_URL = "https://endpoint.whitemantis.ae/";


export interface SubscriptionAddress {
  addressFirstName: string;
  addressLastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  emirates: string;
  phoneNumber: string;
}


export interface SubscriptionCheckoutPayload {
  deliveryOption: "delivery" | "pickup";
  shippingAddress?: SubscriptionAddress | null;
  billingAddress?: SubscriptionAddress | null;
  shippingAddressAsBillingAddress: boolean;
  email: string;
  product: {
    productId: number;
    variantId: string | null;
    subscriptionId: string;
    quantity: number;
  };
  useWTCoins: boolean;
}


export interface SubscriptionCheckoutResponse {
  success             ?: boolean;
  subscriptionId      ?: string;
  clientSecret        ?: string;
  client_secret       ?: string;
  orderId             ?: string | number;
  message             ?: string;
  // Backend financial fields
  grandTotal          ?: number;
  grand_total         ?: number;
  shippingCharge      ?: number;
  shipping_charge     ?: number;
  tax                 ?: number;   // tax RATE (e.g. 5 = 5%)
  taxAmount           ?: number;   // actual tax in AED (may or may not be returned)
  subtotal            ?: number;
  subscriptionDiscount?: number;
  wtCoinsDiscount     ?: number;
  [key: string]: unknown;
}


export function mapToSubscriptionAddress(
  addr: {
    addressFirstName: string;
    addressLastName: string;
    street?: string;
    apartment?: string;
    addressLine1?: string;
    addressLine2?: string;
    city: string;
    emirates: string;
    phoneNumber: string;
  }
): SubscriptionAddress {
  return {
    addressFirstName: addr.addressFirstName,
    addressLastName: addr.addressLastName,
    addressLine1: addr.addressLine1 ?? addr.street ?? "",
    addressLine2: addr.addressLine2 ?? addr.apartment,
    city: addr.city,
    emirates: addr.emirates,
    phoneNumber: addr.phoneNumber,
  };
}


export async function subscriptionCheckout(
  token: string,
  payload: SubscriptionCheckoutPayload
): Promise<SubscriptionCheckoutResponse> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `JWT ${token}`,
  };
  console.log("🔑 [SUB API] Authorization header:", `JWT ${token.slice(0,20)}...`);
  console.log("📤 [SUB API] Sending payload:", JSON.stringify(payload, null, 2));
  const response = await fetch(`${BASE_URL}/api/checkout/subscription`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  // Always log the raw response to catch all backend error details
  const rawText = await response.text();
  console.log(`📬 [SUB API] status=${response.status}, raw:`, rawText);

  if (!response.ok) {
    let errorMsg = `Subscription checkout failed: ${response.status}`;
    try {
      const errData = JSON.parse(rawText);
      console.error("❌ [SUB API] error body:", JSON.stringify(errData, null, 2));
      if (errData?.message)     errorMsg = errData.message;
      else if (errData?.error)  errorMsg = errData.error;
      else if (errData?.errors) errorMsg = JSON.stringify(errData.errors);
    } catch {
      console.error("❌ [SUB API] error body (non-JSON):", rawText);
    }
    throw new Error(errorMsg);
  }

  try {
    return JSON.parse(rawText) as SubscriptionCheckoutResponse;
  } catch {
    console.error("❌ [SUB API] success response was not JSON:", rawText);
    return {} as SubscriptionCheckoutResponse;
  }
}

import React, { useRef, useState } from "react";
import { IonContent, IonPage, useIonViewWillEnter } from "@ionic/react";
import { useLocation, useHistory } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { getWebOrderById } from "../api/apiStoreOrders";
import "./Home.css";
import TopSection from "../components/StorePay/TopSection/TopSection";
import Express from "../components/StorePay/Express/Express";
import { storeCheckout } from "../api/apiStoreCart";
import { clearStoreCart } from "../api/apiStoreCart";
import { subscriptionCheckout, SubscriptionCheckoutPayload } from "../api/apiStoreSubscription";
import tokenStorage from "../utils/tokenStorage";
import type { StorePayState } from "./StoreCheckout";
import type { SubscriptionPayState } from "./SubScriptionCheckout";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);


const SS_ORDER_FIRED    = "storepay_order_fired";
const SS_CLIENT_SECRET  = "storepay_client_secret";
const SS_ORDER_ID       = "storepay_order_id";

const StorePay: React.FC = () => {
  const location = useLocation<StorePayState | SubscriptionPayState>();
  const history  = useHistory();
  const state    = location.state ?? {} as StorePayState;
  const isSub    = (state as SubscriptionPayState).isSubscription === true;
  const subState = isSub ? (state as SubscriptionPayState) : null;

  const [clientSecret, setClientSecret] = useState<string | null>(
    () => sessionStorage.getItem(SS_CLIENT_SECRET),
  );
  const [orderId, setOrderId] = useState<string | number | null>(
    () => sessionStorage.getItem(SS_ORDER_ID),
  );
  const [isPreparing, setIsPreparing] = useState<boolean>(true);
  const effectiveClientSecret = isPreparing ? null : clientSecret;

  const [subGrandTotal,    setSubGrandTotal]    = useState<number | null>(null);
  const [subShippingCharge,setSubShippingCharge]= useState<number | null>(null);
  const [subTax,           setSubTax]           = useState<number>(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const hasFiredThisMount = useRef(false);


  const startCheckoutFlow = async () => {
    // Always show the preparing loader when entering the checkout screen.
    setIsPreparing(true);
    try {
      sessionStorage.removeItem(SS_CLIENT_SECRET);
      sessionStorage.removeItem(SS_ORDER_ID);
      sessionStorage.removeItem(SS_ORDER_FIRED);
    } catch (err) {
      console.warn("⚠️ failed to clear previous checkout session keys:", err);
    }

    if (sessionStorage.getItem(SS_ORDER_FIRED) === "1") {
      const existingOrderId = sessionStorage.getItem(SS_ORDER_ID);
      if (existingOrderId) {
        try {
          const token = await tokenStorage.getToken();
          const order = await getWebOrderById(token ?? null, existingOrderId);
          if (order && order.paymentStatus === "completed") {
            // Previously-completed order: clear session keys and allow
            sessionStorage.removeItem(SS_ORDER_FIRED);
            sessionStorage.removeItem(SS_CLIENT_SECRET);
            sessionStorage.removeItem(SS_ORDER_ID);
          } else {
            // If not completed, keep the fired flag so we don't duplicate
            setIsPreparing(false);
            return;
          }
        } catch (err) {
          console.warn("⚠️ could not check existing order status:", err);
          return;
        }
      } else {
        sessionStorage.removeItem(SS_ORDER_FIRED);
      }
    }

    if (hasFiredThisMount.current) return;
    hasFiredThisMount.current = true;
    sessionStorage.setItem(SS_ORDER_FIRED, "1");

    const createOrder = async () => {
      try {
        const token = await tokenStorage.getToken();
        let secret: string | undefined;
        let id: string | number | undefined;

        if (isSub && subState) {
          const _shippingAddr = subState.deliveryOption === "pickup" && !subState.shippingAddress
            ? (subState.billingAddress ?? null)
            : subState.shippingAddress ?? null;
          const _shippingAsBilling = (_shippingAddr != null) ? true : !!subState.shippingAddressAsBillingAddress;

          const subPayload: Record<string, unknown> = {
            deliveryOption                : subState.deliveryOption,
            shippingAddress               : _shippingAddr,
            billingAddress                : subState.billingAddress,
            shippingAddressAsBillingAddress: _shippingAsBilling,
            email                         : subState.userEmail,
            product: {
              productId     : subState.productId,
              variantId     : subState.variantId ?? null,
              subscriptionId: subState.subscriptionId,
              quantity      : subState.quantity,
            },
            useWTCoins: subState.useWTCoins,
          };
          const response = await subscriptionCheckout(token!, subPayload as unknown as SubscriptionCheckoutPayload);
          secret = (response as Record<string, unknown>).clientSecret as string | undefined
                ?? (response as Record<string, unknown>).client_secret as string | undefined;
         id = String(
  (response as Record<string, unknown>).id ??
  response.orderId ??
  response.subscriptionId ??
  ""
);

          const bkGrandTotal  = response.grandTotal     ?? response.grand_total     ?? null;
          const bkShipping    = response.shippingCharge ?? response.shipping_charge ?? null;
          const bkTaxRate     = typeof response.tax === "number" ? response.tax : 0;
          const bkSubtotal    = typeof response.subtotal === "number" ? response.subtotal : null;

          let bkTaxAmount = 0;
          if (typeof response.taxAmount === "number" && response.taxAmount > 0) {
            bkTaxAmount = response.taxAmount;
          } else if (bkGrandTotal !== null && bkSubtotal !== null && bkShipping !== null) {
            bkTaxAmount = parseFloat((bkGrandTotal - bkSubtotal - bkShipping).toFixed(2));
          } else if (bkSubtotal !== null && bkShipping !== null && bkTaxRate > 0) {
            bkTaxAmount = parseFloat(((bkSubtotal + bkShipping) * bkTaxRate / 100).toFixed(2));
          } else if (bkGrandTotal !== null && bkTaxRate > 0) {
            bkTaxAmount = parseFloat((bkGrandTotal - bkGrandTotal / (1 + bkTaxRate / 100)).toFixed(2));
          } else if (bkGrandTotal !== null && bkShipping !== null) {
            const itemTot = subState!.unitPrice * subState!.quantity;
            bkTaxAmount = parseFloat((bkGrandTotal - itemTot - bkShipping).toFixed(2));
          }

          if (bkGrandTotal !== null)  setSubGrandTotal(bkGrandTotal);
          if (bkShipping   !== null)  setSubShippingCharge(bkShipping);
          setSubTax(Math.max(0, bkTaxAmount));
        } else {
          const s = state as StorePayState;
          const response = await storeCheckout(token, {
            deliveryType      : s.deliveryMode ?? "ship",
            shippingAddress   : s.shippingAddress ?? null,
            billingAddress    : s.billingAddress  ?? null,
            shippingAsBilling : s.shippingAsBilling ?? (s.deliveryMode === "ship"),
            items             : s.items ?? [],
            useWTCoins        : s.useWTCoins ?? false,
            appliedCouponCode : s.appliedCouponCode ?? null,
            taxRate           : s.taxRate ?? 0,
            shippingCharge    : s.shippingCharge ?? 0,
            couponDiscount    : s.couponDiscount ?? 0,
            beansDiscount     : s.beansDiscount ?? 0,
            toPay             : s.toPay ?? 0,
            email             : s.userEmail ?? "",
          });
          secret = (response as Record<string, unknown>).clientSecret as string | undefined
                ?? (response as Record<string, unknown>).client_secret as string | undefined;
          const rawId = response.dbOrderId ?? response.orderId
            ?? (response as Record<string, unknown>).dbOrderId
            ?? (response.order as Record<string, unknown> | undefined)?.id
            ?? (response.doc   as Record<string, unknown> | undefined)?.id
            ?? response.id;
          id = rawId != null ? String(rawId) : undefined;
        }

        if (secret) {
          sessionStorage.setItem(SS_CLIENT_SECRET, secret);
          setClientSecret(secret);
        } else {
          console.warn("⚠️ No clientSecret in checkout response");
          sessionStorage.removeItem(SS_ORDER_FIRED);
        }
        if (id) {
          sessionStorage.setItem(SS_ORDER_ID, String(id));
          setOrderId(id as string | number);
        }
        // Done preparing regardless of outcome so the UI updates
        setIsPreparing(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to create order";
        console.error("❌ checkout error:", msg);
        setCheckoutError(msg);
        sessionStorage.removeItem(SS_ORDER_FIRED);
        hasFiredThisMount.current = false;
        setIsPreparing(false);
      }
    };

  // Start the async run
  void createOrder();
  };


  useIonViewWillEnter(() => {
    // Reset guard so the flow may run on repeated entries.
    hasFiredThisMount.current = false;
    void startCheckoutFlow();
  });

  const handlePaymentSuccess = async () => {
    sessionStorage.removeItem(SS_ORDER_FIRED);
    sessionStorage.removeItem(SS_CLIENT_SECRET);
    sessionStorage.removeItem(SS_ORDER_ID);
    try { await clearStoreCart(); } catch { /* ignore */ }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <TopSection onBack={() => {
          sessionStorage.removeItem(SS_ORDER_FIRED);
          sessionStorage.removeItem(SS_CLIENT_SECRET);
          sessionStorage.removeItem(SS_ORDER_ID);
        }} />

        {checkoutError ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "48px 24px", gap: "16px", textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "#FFF0F0",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>❌</div>
            <p style={{ color: "#c0392b", fontSize: 14, fontFamily: "var(--lato)", margin: 0, lineHeight: 1.5 }}>
              {checkoutError}
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem(SS_ORDER_FIRED);
                sessionStorage.removeItem(SS_CLIENT_SECRET);
                sessionStorage.removeItem(SS_ORDER_ID);
                history.goBack();
              }}
              style={{
                marginTop: 8, padding: "10px 28px", borderRadius: 8, border: "none",
                background: "#6C7A5F", color: "#fff", fontFamily: "var(--lato)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Go Back &amp; Fix
            </button>
          </div>
        ) : effectiveClientSecret ? (
          <Elements key={effectiveClientSecret ?? "preparing"} stripe={stripePromise} options={{ clientSecret: effectiveClientSecret ?? undefined }}>
            <Express
              toPay={isSub ? (subGrandTotal ?? state.toPay) : state.toPay}
              orderId={orderId}
              deliveryMode={isSub ? (subState!.deliveryOption === "delivery" ? "ship" : "pickup") : (state as StorePayState).deliveryMode}
              shippingAddress={isSub ? null : (state as StorePayState).shippingAddress}
              billingAddress={isSub ? null : (state as StorePayState).billingAddress}
              userEmail={state.userEmail}
              items={isSub
                ? [{ name: subState!.productName, variantName: subState!.variantName, quantity: subState!.quantity, unitPrice: subState!.unitPrice }]
                : ((state as StorePayState).items ?? []).map((it: { productId: number; productName?: string; variantName?: string; quantity: number; unitPrice?: number }) => ({
                    name       : it.productName ?? `Product #${it.productId}`,
                    variantName: it.variantName,
                    quantity   : it.quantity,
                    unitPrice  : it.unitPrice ?? 0,
                  }))
              }
              couponDiscount={isSub ? 0 : (state as StorePayState).couponDiscount ?? 0}
              shippingCharge={isSub ? (subShippingCharge ?? subState!.shippingCharge ?? 0) : (state.shippingCharge ?? 0)}
              beansDiscount={isSub ? subState!.coinsDiscount : (state as StorePayState).beansDiscount ?? 0}
              taxAmount={isSub ? subTax : (() => {
                const rate = (state as StorePayState).taxRate ?? 0;
                return rate > 0
                  ? parseFloat((((state.toPay ?? 0) * rate) / (100 + rate)).toFixed(2))
                  : 0;
              })()}
              // Subscription extra fields forwarded to StoreOrderResults
              isSubscription={isSub}
              subscriptionData={isSub ? {
                subscriptionId : String(orderId ?? ""),
                productName    : subState!.productName,
                variantName    : subState!.variantName,
                freqLabel      : subState!.freqLabel,
                quantity       : subState!.quantity,
                unitPrice      : subState!.unitPrice,
                coinsDiscount  : subState!.coinsDiscount,
                orderType      : subState!.deliveryOption,
                shippingAddr   : subState!.shippingAddress,
                billingAddr    : subState!.billingAddress,
                backendShippingCharge: subShippingCharge,
                backendTax     : subTax,
                backendTotal   : subGrandTotal,
              } : undefined}
              onPaymentSuccess={handlePaymentSuccess}
            />
          </Elements>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "60px 24px", gap: "16px",
          }}>
            <div style={{
              width: 36, height: 36, border: "3px solid #e0e0e0",
              borderTop: "3px solid #6c7a5f", borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
            }} />
            <p style={{ color: "#6c7a5f", fontSize: 14, margin: 0, fontFamily: "var(--lato)" }}>
              Preparing payment…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default StorePay;


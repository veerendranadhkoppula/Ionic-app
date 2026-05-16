import React, { useRef, useState } from "react";
import { IonContent, IonPage, useIonViewWillEnter } from "@ionic/react";
import { useLocation, useHistory } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { getWebOrderById } from "../api/apiStoreOrders";
import "./Home.css";
import TopSection from "../components/StorePay/TopSection/TopSection";
import Express from "../components/StorePay/Express/Express";
import { storeCheckout, clearStoreCart } from "../api/apiStoreCart";
import type { SelectedProductHighlight } from "../api/apiStoreCart";
import { subscriptionCheckout, SubscriptionCheckoutPayload } from "../api/apiStoreSubscription";
import tokenStorage from "../utils/tokenStorage";
import type { StorePayState } from "./StoreCheckout";
import type { SubscriptionPayState } from "./SubScriptionCheckout";

const isNative = Capacitor.isNativePlatform();
const STORE_API = "https://endpoint.whitemantis.ae/api";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);


const SS_ORDER_FIRED    = "storepay_order_fired";
const SS_CLIENT_SECRET  = "storepay_client_secret";
const SS_ORDER_ID       = "storepay_order_id";
const SS_ORDER_AMOUNT   = "storepay_order_amount";

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

  // Native-only payment sheet state
  const [nativeState, setNativeState] = useState<"idle" | "presenting" | "canceled">("idle");
  const nativeSheetFired = useRef(false);


  const startCheckoutFlow = async () => {
    setIsPreparing(true);

    const existingFired  = sessionStorage.getItem(SS_ORDER_FIRED);
    const existingSecret = sessionStorage.getItem(SS_CLIENT_SECRET);
    const existingId     = sessionStorage.getItem(SS_ORDER_ID);
    const existingAmount = sessionStorage.getItem(SS_ORDER_AMOUNT);

    if (existingFired === "1") {
      if (existingSecret) {
        // An order was fully created and we have a clientSecret.
        const storedAmt     = existingAmount !== null ? parseFloat(existingAmount) : null;
        const currentAmt    = !isSub ? ((state as StorePayState).toPay ?? null) : null;
        const amountChanged = storedAmt !== null && currentAmt !== null
          && Math.abs(storedAmt - currentAmt) > 0.01;

        if (amountChanged) {
          // Cart total changed — discard stored order and create a fresh one
          sessionStorage.removeItem(SS_ORDER_FIRED);
          sessionStorage.removeItem(SS_CLIENT_SECRET);
          sessionStorage.removeItem(SS_ORDER_ID);
          sessionStorage.removeItem(SS_ORDER_AMOUNT);
          // fall through to createOrder
        } else if (existingId) {
          // Verify the order hasn't been paid already
          try {
            const token = await tokenStorage.getToken();
            const order = await getWebOrderById(token ?? null, existingId);
            if (order && order.paymentStatus === "completed") {
              // Already paid — allow a fresh order
              sessionStorage.removeItem(SS_ORDER_FIRED);
              sessionStorage.removeItem(SS_CLIENT_SECRET);
              sessionStorage.removeItem(SS_ORDER_ID);
              sessionStorage.removeItem(SS_ORDER_AMOUNT);
              // fall through to createOrder
            } else {
              setClientSecret(existingSecret);
              setOrderId(existingId);
              setIsPreparing(false);
              return;
            }
          } catch {
            setClientSecret(existingSecret);
            setOrderId(existingId);
            setIsPreparing(false);
            return;
          }
        } else {
          // Have secret but no stored order ID — still safe to reuse
          setClientSecret(existingSecret);
          setIsPreparing(false);
          return;
        }
      } else {
        // SS_ORDER_FIRED = "1" but secret not yet stored — another concurrent
        // startCheckoutFlow call already set the flag and is mid-flight creating
        // the order. Stay in the preparing state and return so we don't fire a
        // second storeCheckout request (which causes the uniqueness conflict).
        return;
      }
    } else {
      // No existing order session — clear any stale keys and start fresh
      try {
        sessionStorage.removeItem(SS_CLIENT_SECRET);
        sessionStorage.removeItem(SS_ORDER_ID);
        sessionStorage.removeItem(SS_ORDER_FIRED);
        sessionStorage.removeItem(SS_ORDER_AMOUNT);
      } catch (err) {
        console.warn("⚠️ failed to clear previous checkout session keys:", err);
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
              productId        : subState.productId,
              variantId        : subState.variantId ?? null,
              subscriptionId   : subState.subscriptionId,
              quantity         : subState.quantity,
              bagAmountID      : subState.bagAmountId ?? null,
              ...(subState.productHighlights && subState.productHighlights.length > 0
                ? { productHighlights: subState.productHighlights.map((h: SelectedProductHighlight) => ({
                    sectionTitle: h.sectionTitle,
                    items: [{ point: h.selectedPoint }],
                  })) }
                : {}),
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
          sessionStorage.setItem(SS_ORDER_AMOUNT, String(!isSub ? ((state as StorePayState).toPay ?? 0) : 0));
          setClientSecret(secret);
        } else {
          console.warn("⚠️ No clientSecret in checkout response");
          sessionStorage.removeItem(SS_ORDER_FIRED);
          setCheckoutError(
            isSub
              ? "Subscription was created but no payment confirmation was returned. Please contact support or try again."
              : "No payment session was returned. Please try again."
          );
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
    hasFiredThisMount.current = false;
    nativeSheetFired.current = false;
    setNativeState("idle");
    void startCheckoutFlow();
  });

  // On native: auto-present payment sheet as soon as clientSecret is ready
  React.useEffect(() => {
    if (!isNative || !effectiveClientSecret || nativeSheetFired.current) return;
    nativeSheetFired.current = true;
    void handleNativePayment(effectiveClientSecret);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClientSecret]);

  const handleNativePayment = async (secret: string) => {
    setNativeState("presenting");
    try {
      const { Stripe, PaymentSheetEventsEnum } = await import("@capacitor-community/stripe");
      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: secret,
        merchantDisplayName: "White Mantis",
        enableApplePay: true,
        applePayMerchantId: "merchant.com.whitemantis.appname",
        enableGooglePay: true,
        GooglePayIsTesting: (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)?.startsWith("pk_test_") ?? true,
        countryCode: "AE",
      });
      const { paymentResult } = await Stripe.presentPaymentSheet();

      if (paymentResult === PaymentSheetEventsEnum.Completed) {
        // Patch order status for non-subscription store orders
        if (!isSub && orderId) {
          try {
            const token = await tokenStorage.getToken();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `JWT ${token}`;
            await fetch(`${STORE_API}/web-orders/${orderId}`, {
              method: "PATCH",
              headers,
              body: JSON.stringify({ paymentStatus: "completed" }),
            });
          } catch { /* non-fatal */ }
        }
        await handlePaymentSuccess();

        if (isSub && subState) {
          const rawSubId = String(orderId ?? "");
          const numericMatch = rawSubId.match(/\d+/);
          const numericSubId = numericMatch ? numericMatch[0] : "";
          const resolvedShipping = subShippingCharge ?? subState.shippingCharge ?? 0;
          const resolvedTotal    = subGrandTotal ?? state.toPay;
          const fmtAddr = (a: import("../api/apiStoreSubscription").SubscriptionAddress | null | undefined) => {
            if (!a) return null;
            return {
              name   : `${a.addressFirstName} ${a.addressLastName}`.trim(),
              address: [a.addressLine1, a.addressLine2, a.city, a.emirates].filter(Boolean).join(", "),
              phone  : a.phoneNumber,
            };
          };
          history.push("/StoreOrderResults", {
            isSubscription  : true,
            subscriptionId  : numericSubId,
            productName     : subState.productName,
            variantName     : subState.variantName,
            freqLabel       : subState.freqLabel,
            quantity        : subState.quantity,
            unitPrice       : subState.unitPrice,
            bagAmount       : subState.bagAmount,
            shippingCharge  : resolvedShipping,
            coinsDiscount   : subState.coinsDiscount,
            taxAmount       : subTax,
            total           : resolvedTotal,
            orderType       : subState.deliveryOption,
            email           : state.userEmail,
            userEmail       : state.userEmail,
            subShippingAddress: fmtAddr(subState.shippingAddress),
            subBillingAddress : fmtAddr(subState.billingAddress),
            cardLast4       : null,
            cardBrand       : null,
          });
        } else {
          const s = state as StorePayState;
          const taxRate = s.taxRate ?? 0;
          history.push("/StoreOrderResults", {
            orderId,
            orderStatus    : "succeeded",
            deliveryMode   : s.deliveryMode ?? "ship",
            shippingAddress: s.shippingAddress,
            billingAddress : s.billingAddress,
            userEmail      : state.userEmail,
            toPay          : state.toPay,
            items          : (s.items ?? []).map((it) => ({
              name       : it.productName ?? `Product #${it.productId}`,
              variantName: it.variantName,
              quantity   : it.quantity,
              unitPrice  : it.unitPrice ?? 0,
            })),
            couponDiscount : s.couponDiscount ?? 0,
            shippingCharge : s.shippingCharge ?? 0,
            beansDiscount  : s.beansDiscount ?? 0,
            taxAmount      : taxRate > 0
              ? parseFloat(((state.toPay * taxRate) / (100 + taxRate)).toFixed(2))
              : 0,
            cardLast4: null,
            cardBrand: null,
          });
        }
      } else if (paymentResult === PaymentSheetEventsEnum.Canceled) {
        setNativeState("canceled");
      } else {
        setCheckoutError("Payment failed. Please try again.");
      }
    } catch (e: unknown) {
      setCheckoutError(e instanceof Error ? e.message : "Payment failed. Please try again.");
    }
  };

  const retryNativePayment = () => {
    if (!effectiveClientSecret) return;
    nativeSheetFired.current = false;
    setNativeState("idle");
    void handleNativePayment(effectiveClientSecret);
  };

  const handlePaymentSuccess = async () => {
    sessionStorage.removeItem(SS_ORDER_FIRED);
    sessionStorage.removeItem(SS_CLIENT_SECRET);
    sessionStorage.removeItem(SS_ORDER_ID);
    sessionStorage.removeItem(SS_ORDER_AMOUNT);
    try { await clearStoreCart(); } catch { /* ignore */ }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <TopSection onBack={() => {}} />

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
                sessionStorage.removeItem(SS_ORDER_AMOUNT);
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
        ) : isNative ? (
          /* ── Native app: show spinner or canceled state; payment sheet is presented natively ── */
          nativeState === "canceled" ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "48px 24px", gap: "16px", textAlign: "center",
            }}>
              <p style={{ color: "#555", fontSize: 14, fontFamily: "var(--lato)", margin: 0 }}>
                Payment was cancelled.
              </p>
              <button
                onClick={retryNativePayment}
                style={{
                  padding: "12px 32px", borderRadius: 8, border: "none",
                  background: "#6C7A5F", color: "#fff", fontFamily: "var(--lato)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => { history.goBack(); }}
                style={{
                  padding: "10px 28px", borderRadius: 8, border: "1px solid #6C7A5F",
                  background: "transparent", color: "#6C7A5F", fontFamily: "var(--lato)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Go Back
              </button>
            </div>
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
          )
        ) : effectiveClientSecret ? (
          /* ── Web: existing Stripe PaymentElement flow — unchanged ── */
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
                bagAmount      : subState!.bagAmount,
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


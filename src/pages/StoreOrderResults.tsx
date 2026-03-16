/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useLocation } from "react-router-dom";
import "./Home.css";
import OrderResultsTop from "../components/StoreOrderResults/OrderResultsTop/OrderResultsTop";
import NormalOrder from "../components/StoreOrderResults/NormalOrder/NormalOrder";
import SubScriptionOrder from "../components/StoreOrderResults/SubScriptionOrder/SubScriptionOrder";
import type { StoreCheckoutAddress } from "../api/apiStoreCart";
import { useStoreCart } from "../context/useStoreCart";
import { useRef } from "react";
import { useIonRouter } from "@ionic/react";
import { App } from "@capacitor/app";

type OrderStatus = "confirmed" | "cancelled";

export interface StoreOrderResultsState {
  // ── Regular store order fields ─────────────────────────────────────────────
  orderId          ?: string | number;
  orderStatus      ?: string;
  deliveryMode     ?: "ship" | "pickup";
  shippingAddress  ?: StoreCheckoutAddress | null;
  billingAddress   ?: StoreCheckoutAddress | null;
  userEmail        ?: string;
  toPay            ?: number;
  items            ?: { name: string; variantName?: string; quantity: number; unitPrice: number }[];
  couponDiscount   ?: number;
  shippingCharge   ?: number;
  beansDiscount    ?: number;
  taxAmount        ?: number;
  cardLast4        ?: string | null;
  cardBrand        ?: string | null;
  // ── Subscription-specific fields ──────────────────────────────────────────
  isSubscription      ?: boolean;
  subscriptionId      ?: string;
  productName         ?: string;
  variantName         ?: string;
  freqLabel           ?: string;
  quantity            ?: number;
  unitPrice           ?: number;
  coinsDiscount       ?: number;
  total               ?: number;
  orderType           ?: "delivery" | "pickup";
  email               ?: string;
  subShippingAddress  ?: { name: string; address: string; phone: string } | null;
  subBillingAddress   ?: { name: string; address: string; phone: string } | null;
}

const StoreOrderResults: React.FC = () => {
  const location = useLocation<StoreOrderResultsState>();
  const s = location.state ?? {};
  const ionRouter = useIonRouter();
const backListenerRef = useRef<any>(null);
  console.log("📋 [StoreOrderResults] state received:", JSON.stringify({
    isSubscription: s.isSubscription,
    taxAmount: s.taxAmount,
    shippingCharge: s.shippingCharge,
    total: s.total,
    coinsDiscount: s.coinsDiscount,
  }));
  const { clearStoreCartAll } = useStoreCart();

  // Clean up StorePay session keys + clear cart on landing here
  useEffect(() => {
    sessionStorage.removeItem("storepay_order_fired");
    sessionStorage.removeItem("storepay_client_secret");
    sessionStorage.removeItem("storepay_order_id");
    if (!s.isSubscription) {
      clearStoreCartAll().catch(() => { /* ignore */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
useEffect(() => {
  const setup = async () => {
    backListenerRef.current = await App.addListener("backButton", () => {
      ionRouter.push("/home", "root", "replace");
    });
  };
  setup();
  return () => {
    backListenerRef.current?.remove();
  };
}, [ionRouter]);
  const orderStatus: OrderStatus =
    s.orderStatus === "cancelled" ? "cancelled" : "confirmed";

  const orderId = s.orderId
    ? String(s.orderId)
    : s.subscriptionId
    ? String(s.subscriptionId)
    : "";

  // Debug: log the full state to help trace incoming subscription/order ids
  console.log("📋 [StoreOrderResults] full state:", s);

const rawSub = s.subscriptionId ? String(s.subscriptionId) : (s.orderId ? String(s.orderId) : "");
let subscriptionIdForTop = rawSub;
if (subscriptionIdForTop) {
  subscriptionIdForTop = subscriptionIdForTop.replace(/^#?/i, "");
  subscriptionIdForTop = subscriptionIdForTop.replace(/^WMS-?/i, "");
  subscriptionIdForTop = subscriptionIdForTop.replace(/^WMX-?/i, "");
  subscriptionIdForTop = subscriptionIdForTop.replace(/^WMANTIS-?/i, "");
  subscriptionIdForTop = subscriptionIdForTop.replace(/[^0-9A-Za-z-_]/g, "");
  const digits = subscriptionIdForTop.match(/\d+/)?.[0] ?? "";
  subscriptionIdForTop = digits || subscriptionIdForTop;
}
  console.log("📋 [StoreOrderResults] computed orderId:", orderId, "subscriptionIdForTop:", subscriptionIdForTop, "raw subscriptionId:", s.subscriptionId);

  const formatAddress = (a?: StoreCheckoutAddress | null) => {
    if (!a) return null;
    const name    = `${a.addressFirstName ?? ""} ${a.addressLastName ?? ""}`.trim();
    const line1   = [a.street, a.apartment].filter(Boolean).join(", ");
    const line2   = [a.city, a.emirates, a.country].filter(Boolean).join(", ");
    const address = [line1, line2].filter(Boolean).join(", ");
    return { name, address, phone: a.phoneNumber ?? "" };
  };

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <OrderResultsTop
          orderStatus={orderStatus}
          isSubscription={!!s.isSubscription}
          orderId={orderId}
          subscriptionId={subscriptionIdForTop}
        />
        {s.isSubscription ? (
          (() => {
            // Derive taxAmount if not passed: total - (unitPrice*qty) - shippingCharge
            const itemTot   = (s.unitPrice ?? 0) * (s.quantity ?? 1);
            const shipping  = s.shippingCharge ?? 0;
            const grandTot  = s.total ?? 0;
            const derivedTax = s.taxAmount && s.taxAmount > 0
              ? s.taxAmount
              : parseFloat(Math.max(0, grandTot - itemTot - shipping).toFixed(2));
            return (
              <SubScriptionOrder
                productName={s.productName ?? ""}
                variantName={s.variantName}
                freqLabel={s.freqLabel ?? ""}
                quantity={s.quantity ?? 1}
                unitPrice={s.unitPrice ?? 0}
                shippingCharge={shipping}
                coinsDiscount={s.coinsDiscount ?? 0}
                total={grandTot}
                taxAmount={derivedTax}
                orderType={s.orderType ?? "delivery"}
                email={s.email ?? s.userEmail ?? ""}
                subscriptionId={s.subscriptionId}
                shippingAddress={s.subShippingAddress}
                billingAddress={s.subBillingAddress}
                cardLast4={s.cardLast4}
                cardBrand={s.cardBrand}
              />
            );
          })()
        ) : (
          <NormalOrder
            isSubscription={false}
            orderType={s.deliveryMode === "pickup" ? "pickup" : "delivery"}
            email={s.userEmail ?? ""}
            shippingAddress={formatAddress(s.shippingAddress)}
            billingAddress={formatAddress(s.billingAddress)}
            toPay={s.toPay}
            items={s.items ?? []}
            couponDiscount={s.couponDiscount}
            shippingCharge={s.shippingCharge}
            beansDiscount={s.beansDiscount}
            taxAmount={s.taxAmount}
            cardLast4={s.cardLast4}
            cardBrand={s.cardBrand}
          />
        )}
      </IonContent>
    </IonPage>
  );
};

export default StoreOrderResults;


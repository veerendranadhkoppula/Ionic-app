/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  IonContent,
  IonPage,
  IonHeader,
  IonFooter,
  useIonViewDidEnter,
  useIonViewWillEnter,
} from "@ionic/react";
import "./Home.css";
import React, { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import TopSection from "../components/StoreCheckout/TopSection/TopSection";
import StoreOrderSummary from "../components/StoreCheckout/StoreOrderSummary/StoreOrderSummary";
import TotalPay from "../components/StoreCheckout/TotalPay/TotalPay";
import CuponsCoins from "../components/StoreCheckout/CuponsCoins/CuponsCoins";
import PayContainer from "../components/StoreCheckout/PayContainer/PayContainer";
import Delivery from "../components/StoreCheckout/Delivery/Delivery";
import { useStoreCart } from "../context/useStoreCart";
import tokenStorage from "../utils/tokenStorage";
import { useAuth } from "../utils/useAuth";
import { getShipAndTax, ShipAndTax } from "../api/apiCafe";
import { getUserWtCoins, getWtCoinsConfig } from "../api/apiCoins";
import type { StoreCheckoutAddress } from "../api/apiStoreCart";
import cartStyles from "./Cart.module.css";

export interface StorePayState {
  toPay: number;
  deliveryMode: "ship" | "pickup";
  shippingAddress: StoreCheckoutAddress | null;
  billingAddress: StoreCheckoutAddress | null;
  shippingAsBilling: boolean;
  items: {
    productId: number;
    productName?: string;
    quantity: number;
    variantId?: string;
    variantName?: string;
    unitPrice?: number;
  }[];
  useWTCoins: boolean;
  appliedCouponCode: string | null;
  taxRate: number;
  shippingCharge: number;
  couponDiscount: number;
  beansDiscount: number;
  userEmail: string;
}

const StoreCheckout: React.FC = () => {
  const history = useHistory();
  const { storeCart } = useStoreCart();

  const [userEmail, setUserEmail] = useState<string>("");
  useEffect(() => {
    tokenStorage.getItem("user_email").then((e) => setUserEmail(e ?? ""));
  }, []);

  const { isLoggedIn } = useAuth();

  const [shipAndTax, setShipAndTax] = useState<ShipAndTax>({ tax: 0, emirateCharges: {} });
  useEffect(() => {
    getShipAndTax().then(setShipAndTax);
  }, []);

  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [coinsLoading, setCoinsLoading] = useState(true);
  const [useCoins, setUseCoins] = useState(false);
  const [pointsToAed, setPointsToAed] = useState<number>(10);
  useEffect(() => {
    getWtCoinsConfig().then((c) => setPointsToAed(c.pointsToAed));
    let mounted = true;
    tokenStorage.getToken().then((t) =>
      getUserWtCoins(t)
        .then((b) => {
          if (mounted) {
            setCoinBalance(b);
            setCoinsLoading(false);
          }
        })
        .catch(() => {
          if (mounted) setCoinsLoading(false);
        }),
    );
    return () => {
      mounted = false;
    };
  }, []);

  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  const prevAppliedCouponCodeRef = useRef<string | null>(null);
  const SESSION_KEY_STORE = "store_acknowledged_coupon";

  const closeStoreCouponModal = React.useCallback(() => {
    try {
      const code = String((appliedCoupon as any)?.code ?? "");
      if (code) {
        try { sessionStorage.setItem(SESSION_KEY_STORE, code); } catch { /* ignore */ }
      }
    } catch {
      /* ignore */
    }
    setIsCouponModalOpen(false);
  }, [appliedCoupon]);
  

  const [deliveryMode, setDeliveryMode] = useState<"ship" | "pickup" | null>(null);
  const [shippingEmirate, setShippingEmirate] = useState<string>("");
  const [shippingAddress, setShippingAddress] = useState<StoreCheckoutAddress | null>(null);
  const [billingAddress, setBillingAddress] = useState<StoreCheckoutAddress | null>(null);

  const [deliveryKey, setDeliveryKey] = useState(0);

  useIonViewWillEnter(() => {
    // If we are returning from the coupons screen we must not wipe the
    // user's delivery/address selection. Only clear delivery state when
    // entering the page for other reasons.
    const fromCoupons = !!sessionStorage.getItem("store_pending_coupon");
    if (!fromCoupons) {
      // Do not select a delivery mode by default — require explicit user choice
      setDeliveryMode(null);
      setShippingEmirate("");
      setShippingAddress(null);
      setBillingAddress(null);
      setDeliveryKey((k) => k + 1);

      setAppliedCoupon(null);
      setUseCoins(false);
    }
  });

  useIonViewDidEnter(() => {
    try {
      const raw = sessionStorage.getItem("store_pending_coupon");
      if (raw) {
        setAppliedCoupon(JSON.parse(raw));
        sessionStorage.removeItem("store_pending_coupon");
      }
    } catch {
      /* ignore */
    }
  });

  

  const addressReady =
    deliveryMode === "ship"
      ? !!shippingAddress
      : deliveryMode === "pickup"
      ? !!billingAddress
      : false;

  //  Derive order
  const orderItems = React.useMemo(
    () =>
      (storeCart?.items ?? []).map((it) => ({
        id: String(it.id),
        name: it.productName ?? `Product #${it.productId}`,
        variantName: it.variantName,
        quantity: it.quantity,
        unitPrice: it.unitPrice ?? 0,
      })),
    [storeCart],
  );
  const itemsTotal = React.useMemo(
    () => orderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
    [orderItems],
  );

  const shippingCharge =
    deliveryMode === "ship" && shippingEmirate
      ? shipAndTax.emirateCharges[shippingEmirate] ?? 0
      : 0;
  let couponDiscount = 0;
  if (appliedCoupon) {
    couponDiscount =
      appliedCoupon.discountType === "percentage"
        ? parseFloat(
            ((itemsTotal * appliedCoupon.discountAmount) / 100).toFixed(2),
          )
        : appliedCoupon.discountAmount;
  }

  const beansDiscountAed =
    useCoins && coinBalance > 0
      ? parseFloat((coinBalance / pointsToAed).toFixed(2))
      : 0;
  const beansDiscount = useCoins
    ? Math.min(beansDiscountAed, itemsTotal - couponDiscount)
    : 0;
  const totalAfterDiscounts = Math.max(
    0,
    itemsTotal - couponDiscount - beansDiscount,
  );
  const totalWithShipping = totalAfterDiscounts + shippingCharge;
  const taxAmount = parseFloat(
    ((totalWithShipping * shipAndTax.tax) / 100).toFixed(2),
  );
  const toPay = parseFloat((totalWithShipping + taxAmount).toFixed(2));

  // Show the one-time coupon-applied modal when a coupon is set.
  React.useEffect(() => {
    const code = String((appliedCoupon as any)?.code ?? "");
    if (!code) {
      prevAppliedCouponCodeRef.current = null;
      try { sessionStorage.removeItem(SESSION_KEY_STORE); } catch { /* ignore */ }
      setIsCouponModalOpen(false);
      return;
    }

    let acknowledged: string | null = null;
    try { acknowledged = sessionStorage.getItem(SESSION_KEY_STORE); } catch { acknowledged = null; }

    if (prevAppliedCouponCodeRef.current !== code) {
      prevAppliedCouponCodeRef.current = code;
      if (acknowledged !== code) setIsCouponModalOpen(true);
      else setIsCouponModalOpen(false);
      return;
    }

    if (acknowledged !== code) setIsCouponModalOpen(true);
    else setIsCouponModalOpen(false);
  }, [appliedCoupon]);

  const couponDisplayAmount = React.useMemo(() => {
    if (!appliedCoupon) return 0;
    try {
      const a = appliedCoupon as any;
      if (a.discountType === "percentage") {
        const pct = Number(a.discountAmount ?? 0);
        return parseFloat(((itemsTotal * pct) / 100).toFixed(2));
      }
      return Number(a.discountAmount ?? a.amount ?? a.value ?? 0);
    } catch {
      return 0;
    }
  }, [appliedCoupon, itemsTotal]);

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <TopSection />
      </IonHeader>

    <IonContent fullscreen className="home-content">
  <StoreOrderSummary userEmail={userEmail} items={orderItems} />

        <Delivery
          key={deliveryKey}
          onDeliveryModeChange={setDeliveryMode}
          onShippingEmirateChange={setShippingEmirate}
          onAddressReadyChange={() => {
            /* derived from address state directly */
          }}
          onShippingAddressChange={setShippingAddress}
          onBillingAddressChange={setBillingAddress}
        />

        <CuponsCoins
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          useCoins={useCoins}
          setUseCoins={setUseCoins}
          coinBalance={coinBalance}
          coinsLoading={coinsLoading}
          itemsTotal={itemsTotal}
        />

        <TotalPay
          itemsTotal={itemsTotal}
          taxRate={shipAndTax.tax}
          emirateCharges={shipAndTax.emirateCharges}
          deliveryMode={deliveryMode}
          shippingEmirate={shippingEmirate}
          appliedCoupon={appliedCoupon}
          useCoins={useCoins}
          coinBalance={coinBalance}
          pointsToAed={pointsToAed}
        />
      </IonContent>

      <IonFooter>
        <PayContainer
          total={toPay}
          // disabled prop controls visual state; onProceed will now directly
          // redirect guests to the auth screen instead of showing a transient toast.
            disabled={!addressReady}
            onProceed={() => {
              // If guest, redirect straight to /auth so they can sign in / sign up.
              if (!isLoggedIn) {
                history.push("/auth");
                return;
              }

            // For logged-in users, ensure a delivery mode was selected before proceeding
            // (this preserves previous behavior for authenticated checkout flow).
            if (!deliveryMode) return;

            const state: StorePayState = {
              toPay,
              deliveryMode: deliveryMode as "ship" | "pickup",
              shippingAddress,
              billingAddress,

              shippingAsBilling: deliveryMode === "ship",
              items: (storeCart?.items ?? []).map((it) => ({
                productId: it.productId,
                productName: it.productName,
                quantity: it.quantity,
                variantId: it.variantId,
                variantName: it.variantName,
                unitPrice: it.unitPrice,
              })),
              useWTCoins: useCoins,
              appliedCouponCode: appliedCoupon?.code ?? null,
              taxRate: shipAndTax.tax,
              shippingCharge,
              couponDiscount,
              beansDiscount,
              userEmail,
            };
            history.push("/StorePay", state);
          }}
        />

        {/* Login toast removed: guests are redirected immediately to /auth when tapping Pay */}
        {/* Portal target for footer-mounted sheets (ChooseAdress / AddNewAddress).
            When present, sheets will render here and can be positioned above the
            footer by using absolute positioning inside this container. */}
        <div id="store-checkout-footer-overlays" style={{ position: "relative", width: "100%", height: 0 }} />
      </IonFooter>
      {isCouponModalOpen && appliedCoupon && (
        <div className={cartStyles.overlay} onClick={closeStoreCouponModal}>
          <div className={cartStyles.couponWrapper} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeStoreCouponModal} aria-label="close" className={cartStyles.closeButton}>
              <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z" fill="#4B3827"/>
              </svg>
            </button>

            <div className={cartStyles.couponBox}>
              <div className={cartStyles.centerIcon}>
               <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 32C15.4264 32 14.883 31.8933 14.3698 31.68C13.8578 31.4655 13.4039 31.1561 13.008 30.752C12.08 29.8477 11.2883 29.2563 10.6329 28.9778C9.97748 28.6993 8.99259 28.56 7.67822 28.56C6.50133 28.56 5.50044 28.1481 4.67556 27.3244C3.85185 26.4996 3.44 25.4981 3.44 24.32C3.44 23.0305 3.30015 22.0516 3.02044 21.3831C2.74074 20.7147 2.14993 19.9176 1.248 18.992C0.835555 18.5796 0.524445 18.1179 0.314667 17.6071C0.104889 17.0975 0 16.5641 0 16.0071C0 15.4501 0.104889 14.9144 0.314667 14.4C0.524445 13.8856 0.835555 13.4216 1.248 13.008C2.14874 12.0966 2.73956 11.3108 3.02044 10.6507C3.30133 9.99052 3.44118 8.9997 3.44 7.67822C3.44 6.50133 3.85185 5.50044 4.67556 4.67556C5.50044 3.85185 6.50193 3.44 7.68 3.44C8.96948 3.44 9.94844 3.30015 10.6169 3.02044C11.2853 2.74074 12.0824 2.14993 13.008 1.248C13.405 0.843852 13.8607 0.535111 14.3751 0.321778C14.8895 0.107259 15.4264 0 15.9858 0C16.5452 0 17.0833 0.104889 17.6 0.314667C18.1167 0.524445 18.5807 0.835555 18.992 1.248C19.9034 2.14874 20.6892 2.73956 21.3493 3.02044C22.0095 3.30133 23.0003 3.44118 24.3218 3.44C25.4987 3.44 26.4996 3.85185 27.3244 4.67556C28.1493 5.50044 28.5618 6.50193 28.5618 7.68C28.5618 8.96948 28.7016 9.94844 28.9813 10.6169C29.261 11.2853 29.8513 12.0824 30.752 13.008C31.1644 13.4204 31.4756 13.8821 31.6853 14.3929C31.8951 14.9025 32 15.4359 32 15.9929C32 16.5499 31.8951 17.0856 31.6853 17.6C31.4756 18.1144 31.1644 18.5784 30.752 18.992C29.8477 19.9188 29.2563 20.7105 28.9778 21.3671C28.6993 22.0237 28.5606 23.0086 28.5618 24.3218C28.5618 25.4987 28.1493 26.4996 27.3244 27.3244C26.4996 28.1493 25.4981 28.5618 24.32 28.5618C23.0305 28.5618 22.0516 28.7016 21.3831 28.9813C20.7147 29.261 19.9176 29.8513 18.992 30.752C18.5961 31.1561 18.1422 31.4655 17.6302 31.68C17.1182 31.8933 16.5748 32 16 32ZM16.0053 30.2222C16.3301 30.2222 16.6489 30.1588 16.9618 30.032C17.2759 29.9052 17.5407 29.7333 17.7564 29.5164C18.7899 28.4616 19.773 27.7422 20.7058 27.3582C21.6385 26.9742 22.8439 26.7822 24.3218 26.7822C25.0187 26.7822 25.603 26.5464 26.0747 26.0747C26.5464 25.603 26.7822 25.0187 26.7822 24.3218C26.7822 22.8533 26.9742 21.6563 27.3582 20.7307C27.7422 19.805 28.451 18.8136 29.4844 17.7564C29.9763 17.2646 30.2222 16.6791 30.2222 16C30.2222 15.3209 29.9876 14.7461 29.5182 14.2756C28.4634 13.2207 27.744 12.227 27.36 11.2942C26.976 10.3615 26.784 9.15615 26.784 7.67822C26.784 6.98133 26.5476 6.39704 26.0747 5.92533C25.603 5.45245 25.0187 5.216 24.3218 5.216C22.8201 5.216 21.6101 5.02993 20.6916 4.65778C19.773 4.28444 18.7834 3.57037 17.7227 2.51556C17.5058 2.29985 17.2409 2.12267 16.928 1.984C16.6151 1.84533 16.3058 1.77659 16 1.77778C15.6942 1.77896 15.379 1.85067 15.0542 1.99289C14.7295 2.13511 14.4587 2.30933 14.2418 2.51556C13.2107 3.54785 12.2281 4.256 11.2942 4.64C10.3603 5.024 9.15496 5.216 7.67822 5.216C6.98133 5.216 6.39704 5.45245 5.92533 5.92533C5.45245 6.39704 5.216 6.98133 5.216 7.67822C5.216 9.16918 5.024 10.3781 4.64 11.3049C4.256 12.2317 3.53718 13.2219 2.48356 14.2756C2.01304 14.7461 1.77778 15.3209 1.77778 16C1.77778 16.6791 2.01244 17.2652 2.48178 17.7582C3.53659 18.813 4.25659 19.7997 4.64178 20.7182C5.02696 21.6367 5.21896 22.8379 5.21778 24.3218C5.21778 25.0187 5.45363 25.603 5.92533 26.0747C6.39704 26.5464 6.98133 26.7822 7.67822 26.7822C9.17156 26.7822 10.3751 26.9742 11.2889 27.3582C12.2027 27.7434 13.1982 28.4634 14.2756 29.5182C14.4936 29.7351 14.7544 29.907 15.0578 30.0338C15.3612 30.1606 15.677 30.2234 16.0053 30.2222ZM20.2116 21.9147C20.6975 21.9147 21.1028 21.7523 21.4276 21.4276C21.7523 21.1028 21.9147 20.6975 21.9147 20.2116C21.9147 19.7256 21.7523 19.3126 21.4276 18.9724C21.1028 18.6311 20.6975 18.4604 20.2116 18.4604C19.7256 18.4604 19.3126 18.6311 18.9724 18.9724C18.6323 19.3138 18.4616 19.7268 18.4604 20.2116C18.4593 20.6963 18.6299 21.1016 18.9724 21.4276C19.315 21.7535 19.728 21.9159 20.2116 21.9147ZM11.7049 21.5182L21.5182 11.7404L20.2596 10.4818L10.4818 20.2951L11.7049 21.5182ZM13.0276 13.0276C13.3677 12.6874 13.5378 12.2744 13.5378 11.7884C13.5378 11.3025 13.3677 10.8972 13.0276 10.5724C12.6874 10.2477 12.2744 10.0853 11.7884 10.0853C11.3025 10.0853 10.8972 10.2477 10.5724 10.5724C10.2477 10.8972 10.0853 11.3025 10.0853 11.7884C10.0853 12.2744 10.2477 12.6874 10.5724 13.0276C10.8972 13.3677 11.3025 13.5384 11.7884 13.5396C12.2744 13.5407 12.6874 13.3701 13.0276 13.0276Z" fill="#6C7A5F"/>
              </svg>
              </div>

              <div className={cartStyles.couponTitle}>
                ‘{String(appliedCoupon.code)}’ applied!
              </div>

              <div className={cartStyles.couponSaved}>
                You saved AED {couponDisplayAmount.toFixed(2)} on this order
              </div>

              <button onClick={closeStoreCouponModal} className={cartStyles.couponCta}>
                YAY!
              </button>
            </div>
          </div>
        </div>
      )}
    </IonPage>
  );
};

export default StoreCheckout;

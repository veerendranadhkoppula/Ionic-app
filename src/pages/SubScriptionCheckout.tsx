/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useEffect } from "react";
import { IonContent, IonPage, IonHeader, IonFooter } from "@ionic/react";
import { useLocation, useHistory } from "react-router-dom";
import "./Home.css";
import TopSection from "../components/SubScriptionCheckout/TopSection/TopSection";
import TotalPay from "../components/SubScriptionCheckout/TotalPay/TotalPay";
import CuponsCoins from "../components/SubScriptionCheckout/CuponsCoins/CuponsCoins";
import PayContainer from "../components/SubScriptionCheckout/PayContainer/PayContainer";
import Delivery from "../components/SubScriptionCheckout/Delivery/Delivery";
import SubScriptionOrderSummary from "../components/SubScriptionCheckout/SubScriptionOrderSummary/SubScriptionOrderSummary";
import { DeliveryState } from "../components/SubScriptionCheckout/Delivery/Delivery";
import { mapToSubscriptionAddress } from "../api/apiStoreSubscription";
import tokenStorage from "../utils/tokenStorage";
import { getShipAndTax, ShipAndTax } from "../api/apiCafe";
import { getWtCoinsConfig } from "../api/apiCoins";
import { SubScriptionCheckoutRouteState } from "../components/StoreMenu/SubScribeBottomSheet/SubScribeBottomSheet";

export interface SubscriptionPayState {
  isSubscription: true;
  productId: number;
  productName: string;
  variantId?: string;
  variantName?: string;
  subscriptionId: string;
  freqLabel: string;
  quantity: number;
  unitPrice: number;
  // Delivery
  deliveryOption: "delivery" | "pickup";
  shippingAddress: ReturnType<typeof mapToSubscriptionAddress> | null;
  billingAddress: ReturnType<typeof mapToSubscriptionAddress> | null;
  shippingAddressAsBillingAddress: boolean;
  // Financials
  toPay: number;
  shippingCharge: number;
  taxAmount: number;
  coinsDiscount: number;
  useWTCoins: boolean;
  // User
  userEmail: string;
}

interface Props {
  appliedCoupon: any | null;
  setAppliedCoupon: (coupon: any | null) => void;
}

const SubScriptionCheckout: React.FC<Props> = ({
  appliedCoupon,
  setAppliedCoupon,
}) => {
  const location = useLocation<SubScriptionCheckoutRouteState>();
  const history = useHistory();
  const state = location.state;

  // No transient login toast: guests will be redirected to /auth when they
  // tap Pay (keeps behavior consistent with other checkout flows).

  const [shipAndTax, setShipAndTax] = useState<ShipAndTax>({
    tax: 0,
    emirateCharges: {},
  });
  const [pointsToAed, setPointsToAed] = useState<number>(10);
  useEffect(() => {
    getShipAndTax().then(setShipAndTax);
    getWtCoinsConfig().then((c) => setPointsToAed(c.pointsToAed));
  }, []);

  const [deliveryState, setDeliveryState] = useState<DeliveryState>({
    deliveryMode: null,
    shippingAddress: null,
    billingAddress: null,
    useShippingAsBilling: false,
  });

  const [useCoins, setUseCoins] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);

  const handleDeliveryChange = useCallback((ds: DeliveryState) => {
    setDeliveryState(ds);
  }, []);

  const handleCoinsChange = useCallback((coins: boolean, balance: number) => {
    setUseCoins(coins);
    setCoinBalance(balance);
  }, []);

  const unitPrice = state?.unitPrice ?? 0;
  const quantity = state?.quantity ?? 1;
  const itemTotal = unitPrice * quantity;

  const selectedEmirate = deliveryState.shippingAddress?.emirates ?? "";
  const deliveryCharge =
    deliveryState.deliveryMode === "ship" && selectedEmirate
      ? shipAndTax.emirateCharges[selectedEmirate] ?? 0
      : 0;

  const taxAmount = parseFloat(
    (((itemTotal + deliveryCharge) * shipAndTax.tax) / 100).toFixed(2),
  );

  const beansDiscountAed =
    useCoins && coinBalance > 0
      ? parseFloat((coinBalance / pointsToAed).toFixed(2))
      : 0;
  const coinsDiscount = useCoins
    ? Math.min(beansDiscountAed, itemTotal + deliveryCharge + taxAmount)
    : 0;
  const total = Math.max(
    0,
    parseFloat(
      (itemTotal + deliveryCharge + taxAmount - coinsDiscount).toFixed(2),
    ),
  );

  const handlePay = async () => {
    if (!state) return;

    const token = await tokenStorage.getToken();
    if (!token) {
      // Guest: redirect to auth so they can sign in / sign up before payment.
      history.push("/auth");
      return;
    }

    if (!deliveryState.deliveryMode) {
      alert("Please select Ship or Pick up.");
      return;
    }
    if (
      deliveryState.deliveryMode === "ship" &&
      !deliveryState.shippingAddress
    ) {
      alert("Please select a shipping address.");
      return;
    }

    const shippingAddr = deliveryState.shippingAddress
      ? mapToSubscriptionAddress(deliveryState.shippingAddress)
      : null;
    const billingAddr = deliveryState.useShippingAsBilling
      ? shippingAddr
      : deliveryState.billingAddress
      ? mapToSubscriptionAddress(deliveryState.billingAddress)
      : null;

    const payState: SubscriptionPayState = {
      isSubscription: true,
      productId: state.productId,
      productName: state.productName,
      variantId: state.variantId,
      variantName: state.variantName,
      subscriptionId: state.subscriptionId,
      freqLabel: state.freqLabel,
      quantity: state.quantity,
      unitPrice: state.unitPrice,
      deliveryOption:
        deliveryState.deliveryMode === "ship" ? "delivery" : "pickup",
      shippingAddress: shippingAddr,
      billingAddress: billingAddr,
      shippingAddressAsBillingAddress: deliveryState.useShippingAsBilling,
      toPay: total,
      shippingCharge: deliveryCharge,
      taxAmount,
      coinsDiscount,
      useWTCoins: useCoins,
      userEmail: state.userEmail,
    };

    history.push("/StorePay", payState);
  };

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <TopSection />
      </IonHeader>

      <IonContent fullscreen className="home-content">
        <SubScriptionOrderSummary
          email={state?.userEmail ?? ""}
          productName={state?.productName ?? ""}
          variantName={state?.variantName}
          freqLabel={state?.freqLabel ?? ""}
          quantity={state?.quantity ?? 1}
          unitPrice={state?.unitPrice ?? 0}
        />
        <Delivery onDeliveryChange={handleDeliveryChange} />
        <CuponsCoins
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          onCoinsChange={handleCoinsChange}
        />
        <TotalPay
          itemTotal={itemTotal}
          deliveryCharge={deliveryCharge}
          taxAmount={taxAmount}
          coinsDiscount={coinsDiscount}
          total={total}
        />
      </IonContent>

      <IonFooter>
          {/* Transient login toast removed — guests are redirected directly to /auth when they tap Pay */}
 <PayContainer
          total={total}
          onPay={handlePay}
          disabled={
            !(deliveryState.deliveryMode === "ship"
              ? !!deliveryState.shippingAddress
              : deliveryState.deliveryMode === "pickup"
              ? !!deliveryState.billingAddress
              : false)
          }
        />
        <div id="subscription-checkout-footer-overlays" style={{ position: "relative", width: "100%", height: 0 }} />
        
      </IonFooter>
    </IonPage>
  );
};

export default SubScriptionCheckout;

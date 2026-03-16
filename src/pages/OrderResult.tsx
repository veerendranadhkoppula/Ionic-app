/* eslint-disable @typescript-eslint/no-explicit-any */
import { IonContent, IonPage } from "@ionic/react";
import { useLocation } from "react-router-dom";
import "./Home.css";
import OrderResultsTop from "../components/OrderResults/OrderResultsTop/OrderResultsTop";
import OrderResultsDetail from "../components/OrderResults/OrderResultsDetail/OrderResultsDetail";

import { useIonRouter } from "@ionic/react";
import { App } from "@capacitor/app";
import React, { useEffect, useRef } from "react";
type OrderType = "takeaway" | "dinein" | "take-away" | "dine-in";
type OrderStatus = "confirmed" | "cancelled" | "succeeded" | "requires_capture";

interface OrderResultState {
  orderId      ?: string | number;
  orderType    ?: OrderType;
  orderStatus  ?: OrderStatus | string;
  cartSnapshot ?: unknown[];  // enriched cart items passed from Express after payment
}

/** Normalise the various status strings Stripe / backend can return */
function resolveStatus(raw: string | undefined): "confirmed" | "cancelled" {
  if (!raw) return "confirmed";
  if (raw === "cancelled" || raw === "canceled") return "cancelled";
  return "confirmed";
}

/** Normalise "take-away" → "takeaway", "dine-in" → "dinein" */
function resolveType(raw: string | undefined): "takeaway" | "dinein" {
  if (!raw) return "takeaway";
  if (raw === "dine-in" || raw === "dinein") return "dinein";
  return "takeaway";
}

const OrderResults: React.FC = () => {
  const location = useLocation<OrderResultState>();
  const {
    orderId,
    orderType,
    orderStatus,
    cartSnapshot,
  } = location.state ?? {};
const ionRouter = useIonRouter();
const listenerRef = useRef<any>(null);
  const status = resolveStatus(orderStatus);
  const type   = resolveType(orderType);
useEffect(() => {
  const setup = async () => {
    listenerRef.current = await App.addListener("backButton", () => {
      ionRouter.push("/home", "root", "replace");
    });
  };
  setup();
  return () => {
    listenerRef.current?.remove();
  };
}, [ionRouter]);
  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <OrderResultsTop orderStatus={status} orderId={orderId} />
        <OrderResultsDetail
          orderId={orderId}
          orderType={type}
          orderStatus={status}
          cartSnapshot={cartSnapshot}
        />
      </IonContent>
    </IonPage>
  );
};

export default OrderResults;

import { Route } from "react-router-dom";
import React, { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { App as CapacitorApp } from "@capacitor/app";
// No external router helper in this workspace; fall back to window.location navigation
// for notification actions.

import Onboarding from "./pages/onboarding/Onboarding.tsx";
import Sample from "./pages/onboarding/Sample/Sample";
import DevOnboardingPanel from "./components/DevOnboardingPanel";
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { WishlistProvider } from "./context/WishlistContext";
import { StoreWishlistProvider } from "./context/StoreWishlistContext";
import { CartProvider } from "./context/CartContext";
import { StoreCartProvider } from "./context/StoreCartContext";
import { CheckoutProvider } from "./context/CafeCheckoutContext";
import { IonReactRouter } from "@ionic/react-router";
import Splash from "./pages/Splash";
import Home from "./pages/Home";
import MyAccount from "./pages/MyAccount";
import Privacy from "./pages/Privacy";
import Help from "./pages/Help";
import CafeMenu from "./pages/CafeMenu.tsx";
import { Login, Otp, AlmostThere } from "./pages/Auth";
import { Profile } from "./pages";

import "@ionic/react/css/core.css";

import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import Rewards from "./pages/Rewards";

import "@ionic/react/css/palettes/dark.system.css";

import Notification from "./pages/Notification";
import "./theme/variables.css";
import Settings from "./pages/Settings.tsx";
import NeedHelp from "./pages/NeedHelp.tsx";
import Favorites from "./pages/Favorites.tsx";
import Referrals from "./pages/Referrals.tsx";
import YourOrders from "./pages/YourOrders.tsx";

import Cupons from "./pages/Cupons.tsx";
import Adresses from "./pages/Adresses.tsx";
import OrderResults from "./pages/OrderResult.tsx";
import Cart from "./pages/Cart.tsx";
import Workshops from "./pages/Workshops.tsx";
import StoreMenu from "./pages/StoreMenu.tsx";
import StoreCheckout from "./pages/StoreCheckout.tsx";
import SubScriptionCheckout from "./pages/SubScriptionCheckout.tsx";
import StorePay from "./pages/StorePay.tsx";
import StoreOrderResults from "./pages/StoreOrderResults.tsx";
import OrderDetailsShop from "./pages/OrderDetailsShop.tsx";
import OrderDetailsCafe from "./pages/OrderDetailsCafe.tsx";
import SubscriptionDetail from "./pages/SubscriptionDetail.tsx";
import Subscription from "./pages/Subscription.tsx";
import News from "./pages/News.tsx";
import NewsDetail from "./pages/NewsDetail.tsx";
import CafePay from "./pages/CafePay.tsx";

setupIonicReact();

const App: React.FC = () => {
  React.useEffect(() => {
    (async () => {
      try {
        const { hydrateCurrentUser } = await import("./utils/authStorage");
        await hydrateCurrentUser();
      } catch {
        // ignore
      }
    })();
  }, []);

  // Ensure notification click (action) is handled even on cold start.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAction = async (action: unknown) => {
      try {
        console.log("[App] Notification action received at app-level:", action);
        // Simple default: navigate to /notifications. If payload contains a "screen" field,
        // navigate there instead.
        // Using optional chaining with type-guards below to avoid `any` usage.
        let screen = "/notifications";
        try {
          const act = action as Record<string, unknown>;
          const notification = act["notification"] as Record<string, unknown> | undefined;
          const data = notification?.["data"] as Record<string, unknown> | undefined;
          if (data) {
            screen = String(data["screen"] ?? data["route"] ?? screen);
          }
        } catch { /* ignore parsing */ }
        // Navigate to the chosen screen (fallback to setting location.href)
        try { window.location.href = screen; } catch { /* ignore */ }
      } catch (e) {
        // keep catch minimal
        console.warn("[App] failed to handle notification action", e);
      }
    };

    // Attach global listener
    PushNotifications.addListener("pushNotificationActionPerformed", handleAction);

    // Also ensure app open via intent is covered (some platforms deliver via App plugin)
    CapacitorApp.addListener("appUrlOpen", (e) => {
      try {
        const ev = e as { url?: string } | undefined;
        const url = ev?.url;
        if (url) {
          // If the URL contains our app route, route to it
          const path = new URL(url).pathname;
          try { window.location.href = path; } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    });

    return () => {
      try { PushNotifications.removeAllListeners(); } catch { /* ignore */ }
      try { CapacitorApp.removeAllListeners(); } catch { /* ignore */ }
    };
  }, []);

  return (
    <IonApp>
      <CartProvider>
        <StoreCartProvider>
        <CheckoutProvider>
        <StoreWishlistProvider>
        <WishlistProvider>
          <IonReactRouter>
          <IonRouterOutlet>
          <Route exact path="/" component={Splash} />
          <Route exact path="/home">
            <Home />
          </Route>
          <Route exact path="/sample">
            <Sample />
          </Route>
          <Route exact path="/notifications">
            <Notification />
          </Route>
          {/* PushTest route removed from production UI (kept in repo for dev/testing) */}
          <Route exact path="/rewards">
            <Rewards />
          </Route>
          <Route exact path="/settings">
            <Settings />
          </Route>
          <Route exact path="/News">
            <News />
          </Route>
          <Route path="/news/:id" component={NewsDetail} exact />
          <Route exact path="/NeedHelp">
            <NeedHelp />
          </Route>

          <Route exact path="/favorites">
            <Favorites />
          </Route>
          <Route exact path="/StorePay">
            <StorePay />
          </Route>
          <Route exact path="/CafePay">
            <CafePay />
          </Route>
          <Route exact path="/referral">
            <Referrals />
          </Route>
          <Route exact path="/workshops">
            <Workshops />
          </Route>
          <Route exact path="/orders">
            <YourOrders />
          </Route>
          <Route exact path="/SubscriptionDetail">
            <SubscriptionDetail />
          </Route>
          <Route exact path="/orderdetailsShop">
            <OrderDetailsShop />
          </Route>
          <Route exact path="/orderdetailsCafe">
            <OrderDetailsCafe />
          </Route>
          <Route exact path="/Subscription">
            <Subscription />
          </Route>
          <Route exact path="/coupons" component={Cupons} />

          <Route exact path="/adresses">
            <Adresses />
          </Route>
          <Route exact path="/OrderResult">
            <OrderResults />
          </Route>
          <Route exact path="/StoreOrderResults">
            <StoreOrderResults />
          </Route>
          <Route exact path="/Cart" component={Cart} />

          <Route exact path="/StoreCheckout">
            <StoreCheckout />
          </Route>
          <Route
            exact
            path="/SubScriptionCheckout"
            render={(props) => (
              <SubScriptionCheckout
                {...props}
                appliedCoupon={null}
                setAppliedCoupon={() => {}}
              />
            )}
          />

          <Route exact path="/onboarding" component={Onboarding} />
          <Route exact path="/auth" component={Login} />
          <Route exact path="/auth/otp" component={Otp} />
          <Route exact path="/auth/almost" component={AlmostThere} />
          <Route exact path="/my-account" component={MyAccount} />
          <Route exact path="/profile" component={Profile} />
          <Route exact path="/privacy" component={Privacy} />
          <Route exact path="/help" component={Help} />
          <Route exact path="/StoreMenu" component={StoreMenu} />
          <Route exact path="/CafeMenu" component={CafeMenu} />
        </IonRouterOutlet>

        <DevOnboardingPanel />
      </IonReactRouter>
        </WishlistProvider>
        </StoreWishlistProvider>
        </CheckoutProvider>
        </StoreCartProvider>
      </CartProvider>
    </IonApp>
  );
};
export default App;
import { IonContent, IonPage, IonHeader } from "@ionic/react";
import "./Home.css";

import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";

import { useState } from "react";
import TopSection from "../components/Notifications/TopSection/TopSection";
import NotificationsTabs from "../components/Notifications/NotificationsTabs/NotificationsTabs";
import ShopNotifications from "../components/Notifications/ShopNotifications/ShopNotifications";
import CafeNotifications from "../components/Notifications/CafeNotifications/CafeNotifications";

const Notification: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"cafe" | "shop">("cafe");
  const { online } = useNetworkStatus();

  return (
    <IonPage>

      <IonHeader slot="fixed">
        <TopSection />
      </IonHeader>

      <IonContent fullscreen scrollY={true} className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : (
          <>
            <div className="favorites-tabs-wrapper">
              <NotificationsTabs 
                activeTab={activeTab} 
                onChange={setActiveTab} 
              />
            </div>
            {activeTab === "cafe" && <CafeNotifications />}
            {activeTab === "shop" && <ShopNotifications />}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Notification;

import { IonContent, IonPage, IonHeader } from "@ionic/react";
import "./Home.css";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import { useState } from "react";

import ShopOrders from "../components/YourOrders/ShopOrders/ShopOrders";
import TopSection from "../components/YourOrders/TopSection/TopSection";
import YourOrdersTabs from "../components/YourOrders/YourOrdersTabs/YourOrdersTabs";
import CafeOrders from "../components/YourOrders/CafeOrders/CafeOrders";

const YourOrders: React.FC = () => {
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
            <div className="Your-tabs-wrapper">
              <YourOrdersTabs 
                activeTab={activeTab} 
                onChange={setActiveTab} 
              />
            </div>

            {activeTab === "cafe" && <CafeOrders/>}
            {activeTab === "shop" && <ShopOrders />}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default YourOrders;

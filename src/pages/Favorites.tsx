import { IonContent, IonPage, IonHeader } from "@ionic/react";
import "./Home.css";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import TopSection from "../components/Favorites/TopSection/TopSection";
import FavoritesTabs from "../components/Favorites/FavoritesTabs/FavoritesTabs";
import CafeFavorites from "../components/Favorites/CafeFavorites/CafeFavorites";
import ShopFavorites from "../components/Favorites/ShopFavorites/ShopFavorites";
import { useState } from "react";
// import StickBar from "../components/Home/StickBar/StickBar";

const Favorites: React.FC = () => {
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
              <FavoritesTabs 
                activeTab={activeTab} 
                onChange={setActiveTab} 
              />
            </div>

            {activeTab === "cafe" && <CafeFavorites />}
            {activeTab === "shop" && <ShopFavorites />}
          </>
        )}

      </IonContent>
      {/* <IonFooter>
        <StickBar />
      </IonFooter> */}
    </IonPage>
  );
};

export default Favorites;

import { IonContent, IonPage, } from "@ionic/react";
import './Home.css'
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import TopSection from "../components/Adresses/TopSection/TopSection";
import AdressesMain from "../components/Adresses/AdressesMain/AdressesMain";
const Adresses: React.FC = () => {
  const { online } = useNetworkStatus();
  return (
    <IonPage>

      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : (
          <>
            <TopSection />
            <AdressesMain />
          </>
        )}

      </IonContent>
    </IonPage>
  );
};

export default Adresses;

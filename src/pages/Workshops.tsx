import { IonContent, IonPage, IonHeader, IonFooter } from "@ionic/react";

import './Home.css'
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import TopSection from "../components/Workshops/TopSection/TopSection";
import WorkshopsSection from "../components/Workshops/WorkshopsSection/WorkshopsSection";
import StickBar from "../components/Home/StickBar/StickBar";

const Workshops: React.FC = () => {
  const { online } = useNetworkStatus();

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <TopSection />
      </IonHeader>

      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : (
          <WorkshopsSection />
        )}
      </IonContent>
      <IonFooter>
        <StickBar />
      </IonFooter>
    </IonPage>
  );
};

export default Workshops;

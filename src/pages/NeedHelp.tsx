import { IonContent, IonPage } from "@ionic/react";

import './Home.css'
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import TopSection from "../components/NeedHelp/TopSection/TopSection";
import FormSection from "../components/NeedHelp/FormSection/FormSection";
import Connect from "../components/NeedHelp/Connect/Connect";

const NeedHelp: React.FC = () => {
  const { online } = useNetworkStatus();

  return (
    <IonPage>

      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : (
          <>
            <TopSection />
            <FormSection />
            <Connect />
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default NeedHelp;

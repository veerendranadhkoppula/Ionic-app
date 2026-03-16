import { IonContent, IonPage, } from "@ionic/react";
import './Home.css'
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import TopSection from "../components/Referrals/TopSection/TopSection";
import ReferralSection from "../components/Referrals/ReferralSection/ReferralSection";


const Referrals: React.FC = () => {
  const { online } = useNetworkStatus();
  return (
    <IonPage>

      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : (
          <>
            <TopSection />
            <ReferralSection />
          </>
        )}

      </IonContent>
    </IonPage>
  );
};

export default Referrals;

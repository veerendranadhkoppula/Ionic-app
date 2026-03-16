import { IonContent, IonPage,IonHeader } from "@ionic/react";
import './Home.css'
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import RewardsLanding from "../components/Rewards/RewardsLanding/RewardsLanding";
import MantisBeans from "../components/Rewards/MantisBeans/MantisBeans";
import StampsContainer from "../components/Rewards/StampsContainer/StampsContainer";
import Earnings from "../components/Rewards/Earnings/Earnings";


const Rewards: React.FC = () => {
  const { online } = useNetworkStatus();
  return (
    <IonPage>
      <IonHeader slot="fixed">
          <RewardsLanding />
        </IonHeader>

      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : (
          <>
            <MantisBeans />
            <StampsContainer />
            <Earnings />
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Rewards;

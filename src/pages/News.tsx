import { IonContent, IonFooter, IonHeader, IonPage, } from "@ionic/react";
import './Home.css'
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import TopSection from "../components/News/TopSection/TopSection";
import FeaturedSection from "../components/News/FeaturedSection/FeaturedSection";
import Articles from "../components/News/Articles/Articles";
import StickBar from "../components/Home/StickBar/StickBar";


const News: React.FC = () => {
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
          <>
            <FeaturedSection />
            <Articles />
          </>
        )}
      </IonContent>
      <IonFooter>
        <StickBar />
      </IonFooter>
    </IonPage>
  );
};

export default News;

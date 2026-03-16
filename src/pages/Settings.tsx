import { IonContent, IonPage } from "@ionic/react";

import './Home.css'
import TopSection from "../components/Settings/TopSection/TopSection";
import SettingsSection from "../components/Settings/SettingsSection/SettingsSection";

const Settings: React.FC = () => {
  return (
    <IonPage>

      <IonContent fullscreen className="home-content">
        <TopSection />
        <SettingsSection />
       
      </IonContent>
    </IonPage>
  );
};

export default Settings;

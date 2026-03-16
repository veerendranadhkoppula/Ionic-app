import { IonContent, IonPage } from "@ionic/react";
import TopSection from "../components/Cupons/TopSection/TopSection";
import CuponsSection from "../components/Cupons/CuponsSection/CuponsSection";
import React from "react";

const Cupons: React.FC = () => {
  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <TopSection />
        <CuponsSection />
      </IonContent>
    </IonPage>
  );
};

export default Cupons;

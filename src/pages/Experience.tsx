import { useEffect, useState } from "react";
import { IonContent, IonFooter, IonHeader, IonPage } from "@ionic/react";
import "./Home.css";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import TopSection from "../components/Experience/TopSection/TopSection";
import StickBar from "../components/Home/StickBar/StickBar";
import HeroCard from "../components/Experience/HeroCard/HeroCard";
import BookingWidget from "../components/Experience/BookingWidget/BookingWidget";
import WhatYoullExperience from "../components/Experience/WhatYoullExperience/WhatYoullExperience";
import AboutSession from "../components/Experience/AboutSession/AboutSession";
import RoasteryGallery from "../components/Experience/RoasteryGallery/RoasteryGallery";
import WhoIsItFor from "../components/Experience/WhoIsItFor/WhoIsItFor";
import FaqSection from "../components/Experience/FaqSection/FaqSection";
import NoState from "../components/NoState/NoState";
import { type CoffeeExperience, getActiveCoffeeExperience } from "../api/apiCoffeeExperience";

const Experience: React.FC = () => {
  const { online } = useNetworkStatus();
  const [experience, setExperience] = useState<CoffeeExperience | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveCoffeeExperience()
      .then((doc) => {
        if (!cancelled) setExperience(doc);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <TopSection />
      </IonHeader>

      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : loaded && experience ? (
          <>
            <HeroCard experience={experience} />
            <BookingWidget experience={experience} />
            <WhatYoullExperience experience={experience} />
            <AboutSession experience={experience} />
            <RoasteryGallery experience={experience} />
            <WhoIsItFor experience={experience} />
            <FaqSection experience={experience} />
          </>
        ) : loaded && !experience ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "calc(100vh - 140px)",
              padding: "24px",
              boxSizing: "border-box",
            }}
          >
            <NoState
              variant="cup"
              title="No Coffee Experience right now."
              subtitle="Check back later for our next tasting session."
            />
          </div>
        ) : null}
      </IonContent>
      <IonFooter>
        <StickBar />
      </IonFooter>
    </IonPage>
  );
};

export default Experience;

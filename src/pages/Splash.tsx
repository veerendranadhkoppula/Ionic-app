import React, { useEffect, useRef } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { useHistory } from "react-router-dom";
import "./Splash.css";
import { getHasSeenOnboardingAsync } from "../utils/onboardingStorage";

const Splash: React.FC = () => {
  const history = useHistory();
  // Track whether the splash navigation has already been triggered so that
  // any re-render / history-reference change cannot fire a second redirect.
  const hasNavigated = useRef(false);

  useEffect(() => {
    // If we already navigated away (e.g. history reference changed in Ionic
    // and this effect re-ran), do nothing.
    if (hasNavigated.current) return;

    let cancelled = false;

    const go = async () => {
      // Wait for both the splash duration AND the async storage check
      const [seen] = await Promise.all([
        getHasSeenOnboardingAsync(),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ]);

      if (cancelled) return;
      if (hasNavigated.current) return;

      hasNavigated.current = true;

      if (seen) {
        history.replace("/home");
      } else {
        history.replace("/onboarding");
      }
    };

    go();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IonPage>
  <IonContent fullscreen className="splash-container">
    <img
      src="/assets/splash/splashfinal.gif"
      alt="White Mantis"
      className="splash-gif"
    />
  </IonContent>
</IonPage>

  );
};

export default Splash;

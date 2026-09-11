import React, { useEffect, useRef } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import "./Splash.css";
import { getHasSeenOnboardingAsync } from "../utils/onboardingStorage";

const Splash: React.FC = () => {
  const ionRouter = useIonRouter();
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

      // ionRouter.push(path, "root", "replace") — not history.replace() —
      // so Ionic's own navigation stack is actually cleared here too;
      // otherwise the splash screen (and whatever launched it) stays
      // reachable via back/swipe-back from Home or Onboarding.
      if (seen) {
        ionRouter.push("/home", "root", "replace");
      } else {
        ionRouter.push("/onboarding", "root", "replace");
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

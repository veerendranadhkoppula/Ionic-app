/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";

import { useHistory, useLocation } from "react-router-dom";
import styles from "./Onboarding1/Onboarding1.module.css";
import { IonPage, IonContent } from "@ionic/react";

import { App } from "@capacitor/app";

import {
  setHasSeenOnboardingAsync,
} from "../../utils/onboardingStorage";

import bg1 from "./1.png";
import bg2 from "./22.png";
import bg3 from "./4.png";
import bg4 from "./3.png";

const onboardingBackgrounds = [bg1, bg2, bg3, bg4];

const onboardingSteps = [
  {
    title: "Welcome to White Mantis",
    description:
      "A specialty coffee brand delivering premium brews, products, and experiences",
  },
  {
    title: "Shop Coffee Essentials",
    description:
      "A curated selection of coffee and essentials. Crafted for every brewing style.",
  },
  {
    title: "Crafted at Our Cafe",
    description:
      "Order for dine-in or takeaway and choose your barista for a personalized brew.",
  },
  {
    title: "Coffee That Rewards You",
    description:
      "Collect stamps, earn beans, and unlock rewards. More coffee, more benefits.",
  },
];

const Onboarding: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const parseInitial = () => {
    try {
      const qp = new URLSearchParams(location.search);
      const s = qp.get("step");
      if (!s) return 0;
      const n = Number(s);
      if (Number.isNaN(n)) return 0;
      if (n < 1) return 0;
      if (n > onboardingSteps.length) return onboardingSteps.length - 1;
      return n - 1;
    } catch {
      return 0;
    }
  };

  const [step, setStep] = useState<number>(parseInitial());

  const [activeBg, setActiveBg] = useState<0 | 1>(0);
  const [bgImages, setBgImages] = useState<[string, string]>([
    onboardingBackgrounds[step],
    onboardingBackgrounds[step],
  ]);
  useEffect(() => {
    let listener: any;

    const setup = async () => {
      listener = await App.addListener("backButton", () => {
        // ✅ Close app on onboarding
        App.exitApp();
      });
    };

    setup();

    return () => {
      listener?.remove();
    };
  }, []);

  const changeStep = (nextStep: number) => {
    const nextBg = onboardingBackgrounds[nextStep];

    const nextLayer: 0 | 1 = activeBg === 0 ? 1 : 0;

    setBgImages((prev) =>
      nextLayer === 0 ? [nextBg, prev[1]] : [prev[0], nextBg],
    );

    setActiveBg(nextLayer);
    setStep(nextStep);
  };

  const skip = async () => {
    await setHasSeenOnboardingAsync();
    history.replace("/auth");
  };

  const finishAndRoute = async () => {
    await setHasSeenOnboardingAsync();
    history.replace("/auth");
  };

  const onNext = () => {
    if (step < onboardingSteps.length - 1) {
      changeStep(step + 1);
    } else {
      finishAndRoute();
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className={styles.main}>
          {/* Background layer A */}
          <div
            className={`${styles.bg} ${activeBg === 0 ? styles.bgActive : ""}`}
            style={{ backgroundImage: `url(${bgImages[0]})` }}
          />

          {/* Background layer B */}
          <div
            className={`${styles.bg} ${activeBg === 1 ? styles.bgActive : ""}`}
            style={{ backgroundImage: `url(${bgImages[1]})` }}
          />

          <div className={styles.MainConatiner}>
            <div className={styles.Top}>
              <button className={styles.skip} onClick={skip}>
                Skip
              </button>
            </div>

            <div
              className={styles.Bottom}
              style={{
                borderTopLeftRadius: step === 0 ? "100px" : "0px",
                borderTopRightRadius: step === 3 ? "100px" : "0px",
              }}
            >
              <div className={styles.BottomTop}>
                <h3>{onboardingSteps[step].title}</h3>
                <p>{onboardingSteps[step].description}</p>
              </div>

              <div className={styles.BottomBottom}>
                <div className={styles.BottomBottomLeft}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={i === step ? styles.active : undefined}
                      onClick={() => changeStep(i)}
                    />
                  ))}
                </div>

                <div className={styles.BottomBottomRight}>
                  <button className={styles.next} onClick={onNext}>
                    <div className={styles.progressWrap}>
                      <svg
                        className={styles.progressRing}
                        width="65"
                        height="65"
                      >
                        <circle
                          className={styles.progressBg}
                          cx="32.5"
                          cy="32.5"
                          r="28"
                        />
                        <circle
                          className={styles.progressCircle}
                          cx="32.5"
                          cy="32.5"
                          r="28"
                          style={{
                            strokeDashoffset:
                              176 - (176 * (step + 1)) / onboardingSteps.length,
                          }}
                        />
                      </svg>

                      <div className={styles.inner}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M0.967745 10.9677C0.433274 10.9677 0 10.5345 0 10C0 9.46553 0.433274 9.03225 0.967745 9.03225H16.6961L9.31581 1.6519C8.93788 1.27397 8.93788 0.661375 9.31581 0.283445C9.69374 -0.0944843 10.3063 -0.0944843 10.6843 0.283445L19.7166 9.31577C20.0945 9.6937 20.0945 10.3063 19.7166 10.6842L10.6843 19.7166C10.3063 20.0945 9.69374 20.0945 9.31581 19.7166C8.93788 19.3386 8.93788 18.726 9.31581 18.3481L16.6961 10.9677H0.967745Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Onboarding;

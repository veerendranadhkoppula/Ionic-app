import React from 'react';
import { IonPage, IonContent, IonButton } from '@ionic/react';
import styles from './OnboardingBase.module.css';

type Props = {
  title: string;
  description: string;
  onNext: () => void;
  onSkip: () => void;
  nextLabel?: string;
  showReset?: boolean;
  onReset?: () => void;
};

const OnboardingBase: React.FC<Props> = ({
  title,
  description,
  onNext,
  onSkip,
  nextLabel = 'Next',
  showReset = false,
  onReset,
}) => {
  return (
    <IonPage>
      <IonContent fullscreen className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          <div className={styles.actions}>
            <IonButton onClick={onSkip} fill="clear">
              Skip
            </IonButton>
            <IonButton onClick={onNext}>{nextLabel}</IonButton>
          </div>

          {showReset && onReset ? (
            <button className={styles.devReset} onClick={onReset}>
              Reset Onboarding
            </button>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OnboardingBase;

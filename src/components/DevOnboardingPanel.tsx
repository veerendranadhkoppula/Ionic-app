import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { clearHasSeenOnboarding } from '../utils/onboardingStorage';
import styles from './DevOnboardingPanel.module.css';

const DevOnboardingPanel: React.FC = () => {
  const isDev = !!import.meta.env.DEV;
  const history = useHistory();
  const [open, setOpen] = useState(false);


  if (!isDev) return null;

  const reset = () => {
    clearHasSeenOnboarding();
    window.alert('Onboarding flag cleared');
  };

  const go = (path: string) => {
    history.push(path);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} aria-hidden={!open}>
      <button
        className={styles.fab}
        title="Dev: Onboarding"
        onClick={() => setOpen((s) => !s)}
      >
        ☰
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Dev onboarding panel">
          <div className={styles.header}>Dev Onboarding</div>
          <div className={styles.actions}>
            <button className={styles.action} onClick={() => go('/onboarding?step=1')}>Onboard 1</button>
            <button className={styles.action} onClick={() => go('/onboarding?step=2')}>Onboard 2</button>
            <button className={styles.action} onClick={() => go('/onboarding?step=3')}>Onboard 3</button>
            <button className={styles.action} onClick={() => go('/onboarding?step=4')}>Onboard 4</button>
          </div>
          <div className={styles.footer}>
            <button className={styles.reset} onClick={reset}>Reset Onboarding</button>
            <button className={styles.close} onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevOnboardingPanel;

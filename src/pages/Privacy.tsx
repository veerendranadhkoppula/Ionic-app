import React from "react";
import { IonPage, IonContent, IonHeader } from "@ionic/react";
import { useHistory } from "react-router-dom";
import styles from "./Privacy.module.css";

const Privacy: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <div className={styles.Top}>
          <div
            className={styles.TopLeft}
            onClick={() => history.goBack()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") history.goBack();
            }}
          >
            <svg
              width="35"
              height="35"
              viewBox="0 0 35 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.5 13L15 18.5L20.5 24"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={styles.TopRight}>
            <h1>Privacy and Terms of Use</h1>
          </div>
        </div>
      </IonHeader>

      <IonContent fullscreen>
        <div className={styles.Main}>
          <div className={styles.MainConatiner}>
            <div className={styles.Bottom}>
              <div className={styles.Heading}>
                <h1>WHITE MANTIS ROASTERY & LAB</h1>
              </div>

              <div className={styles.One}>

                {/* 1. Introduction */}
                <div className={styles.OneTop}>
                  <h3>1. Introduction & Acceptance</h3>
                  <div className={styles.OneBottom}>
                    <p>
                      This application is owned and operated by White Mantis Roastery LLC,
                      registered in the United Arab Emirates. By accessing or using this app,
                      you agree to be bound by these Terms & Conditions. If you do not agree,
                      please discontinue use immediately. The UAE is the country of domicile,
                      and these terms are governed by UAE laws.
                    </p>
                  </div>
                </div>

                {/* 2. Account Registration */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>2. Account Registration</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <p>You are responsible for:</p>
                    <ul className={styles.BulletList}>
                      <li>Maintaining the confidentiality of your login credentials</li>
                      <li>All activities conducted through your account</li>
                    </ul>
                  </div>
                </div>

                {/* 3. Information We Collect */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>3. Information We Collect</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>Name, email address, phone number, delivery address</li>
                      <li>Order details, preferences, and transaction history</li>
                      <li>Device type, IP address, and app usage data</li>
                      <li>
                        Payment information — processed securely via third-party gateways;
                        we do not store card details
                      </li>
                      <li>Account authentication data</li>
                    </ul>
                  </div>
                </div>

                {/* 4. How We Use Your Information */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>4. How We Use Your Information</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>User authentication and login (OTP-based)</li>
                      <li>Processing and fulfilling orders</li>
                      <li>Customer support and communication</li>
                      <li>Improving app and service performance</li>
                      <li>Sending notifications and updates (with consent)</li>
                    </ul>
                  </div>
                </div>

                {/* 5. Data Sharing */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>5. Data Sharing</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>
                        Data is shared only with our backend services, delivery partners,
                        and payment processors to provide app functionality
                      </li>
                      <li>We do not sell personal data</li>
                      <li>Data may be disclosed to government authorities when legally required</li>
                    </ul>
                  </div>
                </div>

                {/* 6. Data Security */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>6. Data Security</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>All data is transmitted via HTTPS</li>
                      <li>Authentication data is securely stored</li>
                    </ul>
                  </div>
                </div>

                {/* 7. Data Retention */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>7. Data Retention</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <p>
                      Your data is retained only as long as necessary for business, legal,
                      or regulatory purposes.
                    </p>
                  </div>
                </div>

                {/* 8. User Rights */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>8. User Rights</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>
                        You have the right to request access, correction, or deletion of
                        your personal data by contacting us at support@whitemantis.ae.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 9. Rewards & Loyalty Program */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>9. Rewards & Loyalty Program</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <p><strong>Stamp System (Cafe Orders)</strong></p>
                    <ul className={styles.BulletList}>
                      <li>We track stamps earned per eligible cafe beverage purchase</li>
                      <li>10 stamps = 1 free beverage reward</li>
                      <li>Stamps are linked to your account and are non-transferable</li>
                    </ul>
                    <p><strong>Points System (Store Purchases)</strong></p>
                    <ul className={styles.BulletList}>
                      <li>We track points earned on store product purchases</li>
                      <li>AED 10 spent = 1 point; points may be redeemed for discounts</li>
                    </ul>
                    <p><strong>Referral Program</strong></p>
                    <ul className={styles.BulletList}>
                      <li>We store your unique referral code and track referral relationships</li>
                      <li>Both referrer and friend earn 1 stamp upon successful referral</li>
                    </ul>
                    <p>
                      Cancelled or refunded orders do not qualify for stamps or points.
                      White Mantis reserves the right to modify or terminate the program
                      at any time.
                    </p>
                  </div>
                </div>

                {/* 10. Changes to This Policy */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>10. Changes to This Policy</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <p>
                      We may update this Privacy Policy from time to time. Continued use of
                      our services indicates acceptance of the updated policy.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Privacy;

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
            <h1>Privacy and Terms of uses</h1>
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
                <div className={styles.OneTop}>
                  <h3>1. Introduction & Acceptance</h3>
                  <div className={styles.OneBottom}>
                    <p>
                      This application and website are owned and operated by
                      White Mantis Roastery LLC, registered in the United Arab
                      Emirates. By accessing or using this app, you agree to be
                      bound by these Terms & Conditions. If you do not agree,
                      please discontinue use immediately. The UAE is the country
                      of domicile, and these terms are governed by UAE laws.
                    </p>
                  </div>
                </div>
                {/* <div className={styles.OneBottom}>
                  <p>
                    This application and website are owned and operated by White
                    Mantis Roastery LLC, registered in the United Arab Emirates.
                    By accessing or using this app, you agree to be bound by
                    these Terms & Conditions. If you do not agree, please
                    discontinue use immediately. The UAE is the country of
                    domicile, and these terms are governed by UAE laws.
                  </p>
                </div> */}
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>2. Eligibility</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>
                        Users must be 18 years or older to register, place
                        orders, or make payments.
                      </li>
                      <li>Minors are not permitted to transact.</li>
                      <li>
                        Services are not provided to users located in OFAC or
                        sanctioned countries.
                      </li>
                    </ul>
                  </div>
                </div>
                <div className={styles.Three}>
                  <div className={styles.ThreeTop}>
                    <h3>3. Account Registration</h3>
                  </div>
                  <div className={styles.ThreeBottom}>
                    <p>You are responsible for: </p>
                    <ul className={styles.BulletList}>
                      <li>
                        Maintaining the confidentiality of your login
                        credentials
                      </li>
                      <li>All activities conducted through your account</li>
                    </ul>
                  </div>
                </div>
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>3. Information We Collect</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>Information We Collect</li>
                      <li>Email address</li>
                      <li>Account authentication data</li>
                      <li>Account authentication data</li>
                    </ul>
                  </div>
                </div>
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>4. How We Use This Information</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>User authentication and login (OTP-based)</li>
                      <li>Order placement and order history</li>
                      <li>Order placement and order history</li>
                    </ul>
                  </div>
                </div>
                <div className={styles.Two}>
                  <div className={styles.TwoTop}>
                    <h3>5. Data Sharing</h3>
                  </div>
                  <div className={styles.TwoBottom}>
                    <ul className={styles.BulletList}>
                      <li>
                        Data is shared only with our backend services to provide
                        app functionality
                      </li>
                      <li>We do not sell personal data</li>
                    </ul>
                  </div>
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
                  <div className={styles.Two}>
                    <div className={styles.TwoTop}>
                      <h3>7. User Rights</h3>
                    </div>
                    <div className={styles.TwoBottom}>
                      <ul className={styles.BulletList}>
                        <li>
                          You have the right to request access, correction, or
                          deletion of your personal data by contacting us at
                          support@whitemantis.ae.
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className={styles.Two}>
                    <div className={styles.TwoTop}>
                      <h3>8. Data Retention</h3>
                    </div>
                    <div className={styles.TwoBottom}>
                      <ul className={styles.BulletList}>
                        <li>
                          Your data is retained only as long as necessary for
                          business, legal, or regulatory purposes.
                        </li>
                      </ul>
                    </div>
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

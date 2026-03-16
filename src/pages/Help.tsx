import React, { useState, useRef } from "react";
import { IonPage, IonContent, IonHeader } from "@ionic/react";
import { useHistory } from "react-router-dom";
import styles from "./Help.module.css";

const faqs = [
  "What can I order through the app?",
  "Can I customize my order?",
  "What is the difference between dine-in and takeaway?",
  "What is the Barista feature?",
  "Is my preferred barista always guaranteed?",
  "What is the Stamp Rewards program?",
  "How many stamps are required for a reward?",
  "Do stamps expire?",
  "Where can I view my stamp balance?",
  "Do I need to create an account?",
  "What can I manage from my profile?",
  "How can I get assistance?",
  "What if I experience an issue with an order or reward?",
  "Will new features be introduced?",
  "How will I be informed about updates?",
];

const answers = [
  "You can browse our full selection of coffees, beverages, and bakery offerings, thoughtfully curated for both dine-in and takeaway.",
  "At this stage, customization options are limited. More detailed personalization will be introduced in upcoming phases.",
  "Dine-in: Enjoy your order within the café, freshly prepared for the moment. Takeaway: A seamless option for enjoying our offerings wherever your day takes you.",
  "The Barista feature allows you to view and select your preferred barista while placing an order, subject to availability.",
  "Barista selection is based on real-time availability. While we aim to accommodate your preference, availability may vary during peak hours.",
  "Each completed order earns you a stamp. As stamps accumulate, they unlock rewards as a gesture of appreciation for your loyalty",
  "Currently, collecting 10 stamps entitles you to a complimentary coffee.",
  "In Phase 1, stamps do not expire unless communicated otherwise within the app.",
  "Your stamp progress is displayed in the Rewards section of your profile.",
  "Creating an account is recommended to enjoy rewards and a more personalised experience, though limited browsing may be available without signing in.",
  "In this phase, your profile allows you to view basic details and track reward progress. Additional profile features will be added soon.",
  "Our support team can be reached via the Support section in the app, where you’ll find our contact details.",
  "Please contact our support team with your order information, and we’ll assist you promptly.",
  "Yes. Future phases will introduce enhanced personalisation, smoother payments, and expanded rewards.",
  "Updates will be communicated through app notifications and in-app messages.",
];

const Help: React.FC = () => {
  const history = useHistory();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <IonPage >
       <IonHeader slot="fixed">
 <div className={styles.Top}>
              <div className={styles.TopLeft} onClick={() => history.goBack()}>
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
                <h1>Help & Support</h1>
              </div>
            </div>
       </IonHeader>
      <IonContent fullscreen>
        <div className={styles.main}>
          <div className={styles.MainCoantiner}>
           

            <div className={styles.Bottom}>
              <div className={styles.BottomTop}>
                <h3>How can we help you?</h3>
              </div>

              <div className={styles.BottomBottom}>
                <div className={styles.Faqs}>
                  {faqs.map((q, i) => {
                    const isOpen = openIndex === i;
                    const bodyEl = bodyRefs.current[i];
                    const height = isOpen && bodyEl ? bodyEl.scrollHeight : 0;

                    return (
                      <div
                        key={i}
                        className={styles.FaqRow}
                        onClick={() => toggleFaq(i)}
                      >
                        <div className={styles.FaqHeader}>
                          <span>{q}</span>
                          <svg
                            className={`${styles.Arrow} ${
                              isOpen ? styles.Rotate : ""
                            }`}
                            width="16"
                            height="7"
                            viewBox="0 0 16 7"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M14.1956 0.138636L7.84557 5.58064C7.755 5.6581 7.63974 5.70067 7.52057 5.70067C7.40139 5.70067 7.28613 5.6581 7.19557 5.58064L0.845566 0.138636C0.796462 0.0916793 0.738303 0.0552221 0.67464 0.0314912C0.610977 0.00776021 0.543145 -0.00274712 0.475286 0.000611192C0.407427 0.0039695 0.340963 0.0211225 0.279954 0.0510234C0.218945 0.0809243 0.16467 0.122946 0.120442 0.174522C0.0762147 0.226098 0.0429629 0.286147 0.0227164 0.351003C0.00246989 0.415858 -0.00434634 0.48416 0.00268399 0.551738C0.00971432 0.619315 0.0304439 0.684752 0.0636066 0.744051C0.0967694 0.80335 0.14167 0.855268 0.195567 0.896636L6.54457 6.33964C6.81558 6.5743 7.16207 6.70347 7.52057 6.70347C7.87906 6.70347 8.22555 6.5743 8.49657 6.33964L14.8456 0.896636C14.8995 0.855268 14.9444 0.80335 14.9775 0.744051C15.0107 0.684752 15.0314 0.619315 15.0384 0.551738C15.0455 0.48416 15.0387 0.415858 15.0184 0.351003C14.9982 0.286147 14.9649 0.226098 14.9207 0.174522C14.8765 0.122946 14.8222 0.0809243 14.7612 0.0510234C14.7002 0.0211225 14.6337 0.0039695 14.5658 0.000611192C14.498 -0.00274712 14.4302 0.00776021 14.3665 0.0314912C14.3028 0.0552221 14.2447 0.0916793 14.1956 0.138636Z"
                              fill="#4B3827"
                            />
                          </svg>
                        </div>

                        <div className={styles.FaqBody} style={{ height }}>
                          <div
                            ref={(el) => {
                              bodyRefs.current[i] = el;
                            }}
                            className={styles.FaqInner}
                          >
                            <p>{answers[i]}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.ContactUs}>
                  <div className={styles.ContactUsHeading}  onClick={() => history.push("/NeedHelp")}>
                    <h3>Need more Help?</h3>
                  </div>
                  {/* <div className={styles.ContactUsPara}>
                    <p>
                      Email Us –{" "}
                      <a
                        href="mailto:sales@whitemantisroastery.com"
                        className={styles.InfoSpam}
                      >
                        sales@whitemantisroastery.com
                      </a>
                    </p>

                    <p>
                      Contact Us –{" "}
                      <a href="tel:+971589535337" className={styles.InfoSpam}>
                        058 953 5337
                      </a>
                    </p>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Help;

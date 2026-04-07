import React, { useEffect, useState } from "react";
import styles from "./ReferralSection.module.css";
import cups from "./1.gif";

import { getCurrentUser } from "../../../utils/authStorage";
import { getUserById } from "../../../utils/apiAuth";
import { buildInviteText } from "../../../api/apiReferrals";
import { Capacitor } from "@capacitor/core";

const ReferralSection: React.FC = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const current = getCurrentUser();
        const userId = current?.id;
        if (!userId) return;
        const user = await getUserById(userId);
        if (!mounted) return;
        setReferralCode(user?.referralCode || user?.referral || null);
      } catch (err) {
        console.warn("Failed to load referral code", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const copyCode = async () => {
    if (!referralCode) return;
    try {
  await navigator.clipboard.writeText(referralCode);
  setStatusMessage("Copied");
  setTimeout(() => setStatusMessage(null), 2000);
    } catch (err) {
      // Fallback: select text if any
      setStatusMessage("Copy failed — select code to copy manually");
      console.warn("Clipboard copy failed", err);
    }
  };

const sendInvite = async () => {
    // Restore correct links after publishing to both stores
    const ANDROID_LINK = "https://play.google.com/store/apps/details?id=com.whitemantis.app";
    const IOS_LINK = "https://apps.apple.com/app/idXXXXXXXXXX"; // replace after publishing

    const appLink = Capacitor.getPlatform() === "ios" ? IOS_LINK : ANDROID_LINK;
    const text = buildInviteText(referralCode || "", appLink);

    try {
      const nav = navigator as unknown as { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: "Join WhiteMantis", text, url: appLink });
        setStatusMessage("Invite sent");
      } else {
        await navigator.clipboard.writeText(text);
        setStatusMessage("Invite copied — paste it into your message app");
      }
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (err) {
      console.warn("Share failed", err);
      setStatusMessage("Unable to send invite. Try copying the code instead.");
      setTimeout(() => setStatusMessage(null), 2000);
    }
  };
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.top}>
            <div className={styles.TextContainer}>
              <h3>Share the love. Sip the rewards.</h3>
              <p>
                You both earn a stamp when your friend places their first order.
              </p>
            </div>
            <div className={styles.ImageContainer}>
              <img src={cups} alt="Cups" />
            </div>
          </div>
          <div className={styles.middle}>
            <div className={styles.MiddleTop}>
              <div className={styles.MiddleTopLeft}>
                <p>Your referral code</p>
                <h3>{referralCode || "—"}</h3>
              </div>
              <div className={styles.MiddleTopRight} onClick={copyCode} role="button" aria-label="Copy referral code">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 16C2.9 16 2 15.1 2 14V4C2 2.9 2.9 2 4 2H14C15.1 2 16 2.9 16 4M10 8H20C21.1046 8 22 8.89543 22 10V20C22 21.1046 21.1046 22 20 22H10C8.89543 22 8 21.1046 8 20V10C8 8.89543 8.89543 8 10 8Z"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {/* statusMessage moved to the bottom area (after How it works) */}
            </div>
            <div className={styles.MiddleBottom}>
              <button onClick={sendInvite}>Send invite</button>
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.BottomText}>
              <p>How it works</p>
            </div>
            <div className={styles.BottomSteps}>
              <div className={styles.Step}>
                <div className={styles.stepleft}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49M21 5C21 6.65685 19.6569 8 18 8C16.3431 8 15 6.65685 15 5C15 3.34315 16.3431 2 18 2C19.6569 2 21 3.34315 21 5ZM9 12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.65685 9 9 10.3431 9 12ZM21 19C21 20.6569 19.6569 22 18 22C16.3431 22 15 20.6569 15 19C15 17.3431 16.3431 16 18 16C19.6569 16 21 17.3431 21 19Z"
                      stroke="#4B3827"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className={styles.stepright}>
                  <div className={styles.stepNumber}>
                    <p>Step 1 </p>
                  </div>
                  <div className={styles.stepDescription}>
                    <h3>Share your code</h3>
                    <p>Send your unique referral code to friends</p>
                  </div>
                </div>
              </div>
              <div className={styles.Step}>
                <div className={styles.stepleft}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 21C1.99992 19.4603 2.44413 17.9533 3.27935 16.6599C4.11456 15.3664 5.30527 14.3415 6.7086 13.708C8.11193 13.0746 9.66824 12.8595 11.1908 13.0887C12.7133 13.3178 14.1373 13.9815 15.292 15M19 16V22M22 19H16M15 8C15 10.7614 12.7614 13 10 13C7.23858 13 5 10.7614 5 8C5 5.23858 7.23858 3 10 3C12.7614 3 15 5.23858 15 8Z"
                      stroke="#4B3827"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className={styles.stepright}>
                  <div className={styles.stepNumber}>
                    <p>Step 2 </p>
                  </div>
                  <div className={styles.stepDescription}>
                    <h3>Friend signs up</h3>
                    <p>They create an account and place their first order</p>
                  </div>
                </div>
              </div>
              <div className={styles.Step}>
                <div className={styles.stepleft}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18.5371 12.6977H12.6977V20.6047H17.1681C17.5312 20.6046 17.8796 20.4599 18.1364 20.2031C18.3931 19.9463 18.5371 19.5978 18.5371 19.2347V12.6977ZM5.46294 19.2347C5.46294 19.5978 5.60688 19.9463 5.86355 20.2031C6.12036 20.4599 6.46876 20.6046 6.83194 20.6047H11.3023V12.6977H5.46294V19.2347ZM20.6047 8.89953C20.6047 8.71404 20.4541 8.56341 20.2685 8.56341H12.6977V11.3023H20.2685C20.4541 11.3023 20.6047 11.1517 20.6047 10.9662V8.89953ZM3.39535 10.9662C3.39535 11.1517 3.54593 11.3023 3.73147 11.3023H11.3023V8.56341H3.73147C3.54593 8.56341 3.39535 8.71404 3.39535 8.89953V10.9662ZM18.5371 5.28216C18.5371 4.78192 18.3385 4.30232 17.9847 3.94858C17.631 3.59484 17.1514 3.39535 16.6512 3.39535H16.6394C15.8921 3.38233 15.0957 3.74145 14.3656 4.55269C13.782 5.20105 13.2836 6.09547 12.9257 7.16806H16.6512C17.1514 7.16806 17.631 6.96942 17.9847 6.61573C18.3385 6.26202 18.537 5.78237 18.5371 5.28216ZM5.46294 5.28216C5.46297 5.78237 5.66154 6.26202 6.01526 6.61573C6.369 6.96942 6.84859 7.16806 7.34884 7.16806H11.0743C10.7164 6.09547 10.218 5.20105 9.63445 4.55269C8.90428 3.74145 8.10794 3.38233 7.36065 3.39535L7.34884 3.39626V3.39535C6.84855 3.39535 6.36901 3.59484 6.01526 3.94858C5.66153 4.30232 5.46294 4.78192 5.46294 5.28216ZM19.9324 5.28216C19.9324 5.96188 19.7211 6.61931 19.3356 7.16806H20.2685C21.2247 7.16806 22 7.94337 22 8.89953V10.9662C22 11.9224 21.2247 12.6977 20.2685 12.6977H19.9324V19.2347C19.9324 19.968 19.6415 20.6721 19.123 21.1906C18.6045 21.7089 17.9012 22 17.1681 22H6.83194C6.09879 22 5.39547 21.7089 4.877 21.1906C4.35849 20.6721 4.06759 19.968 4.06759 19.2347V12.6977H3.73147C2.77533 12.6977 2 11.9224 2 10.9662V8.89953C2 7.94337 2.77533 7.16806 3.73147 7.16806H4.66443C4.27887 6.61931 4.06761 5.96187 4.06759 5.28216C4.06759 4.41184 4.4133 3.57744 5.02871 2.96203C5.64414 2.34661 6.47849 2 7.34884 2V2.00182C8.59105 1.98424 9.74483 2.59076 10.671 3.61973C11.1929 4.19967 11.6395 4.90743 12 5.70549C12.3605 4.90743 12.8071 4.19967 13.329 3.61973C14.2552 2.59076 15.409 1.98424 16.6512 2.00182V2C17.5215 2 18.3559 2.34661 18.9713 2.96203C19.5867 3.57744 19.9324 4.41184 19.9324 5.28216Z"
                      fill="#4B3827"
                    />
                  </svg>
                </div>
                <div className={styles.stepright}>
                  <div className={styles.stepNumber}>
                    <p>Step 3 </p>
                  </div>
                  <div className={styles.stepDescription}>
                    <h3>Earn rewards</h3>
                    <p>
                      You earn 1 stamp, friend earns 1 stamp.
                      <br />
                      10 stamps = 1 free coffee
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {statusMessage && <div className={styles.BottomStatus}>{statusMessage}</div>}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReferralSection;

import React from "react";
import { IonContent, IonPage, IonHeader } from "@ionic/react";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";

import styles from "./Subscription.module.css";

import { useHistory } from "react-router-dom";
import NoState from "../components/NoState/NoState";
import tokenStorage from "../utils/tokenStorage";
import {
  getUserSubscriptions,
  cancelSubscriptionOrder,
  type UserSubscription,
} from "../api/apiSubscriptions";

const Subscription: React.FC = () => {
  const history = useHistory();

  const { online } = useNetworkStatus();

  const [subscriptions, setSubscriptions] = React.useState<UserSubscription[]>([]);
  const [loading, setLoading]             = React.useState(true);
  const [cancellingId, setCancellingId]   = React.useState<number | null>(null);
  const [cancelTarget, setCancelTarget]   = React.useState<UserSubscription | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = await tokenStorage.getToken();
        const list  = await getUserSubscriptions(token);
        if (!cancelled) setSubscriptions(list);
      } catch (err) {
        console.error("[Subscription] load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Only consider active subscriptions that have at least one successful payment
  // (paymentHistory non-empty). This hides subscriptions that were created but
  // whose initial payment did not succeed yet.
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active" && (s.paymentHistory?.length ?? 0) > 0);
  const pastSubscriptions   = subscriptions.filter((s) => s.status === "cancelled");

  const openDetail = (sub: UserSubscription) =>
    history.push("/SubscriptionDetail", { subscription: sub });

  const handleCancel = (e: React.MouseEvent, sub: UserSubscription) => {
    e.stopPropagation();
    setCancelTarget(sub);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancellingId(cancelTarget.id);
    try {
      const token = await tokenStorage.getToken();
      await cancelSubscriptionOrder(token, cancelTarget.id, cancelTarget.stripeSubId, "Cancelled by user");
      setSubscriptions((prev) =>
        prev.map((s) => s.id === cancelTarget.id ? { ...s, status: "cancelled" as const } : s)
      );
      setCancelTarget(null);
    } catch (err) {
      console.error("[Subscription] cancel error", err);
      alert("Failed to cancel. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <IonPage>
        <IonHeader slot="fixed">
          <div className={styles.Top}>
            <svg width="35" height="35" viewBox="0 0 35 35" fill="none" onClick={() => history.goBack()} xmlns="http://www.w3.org/2000/svg">
              <path d="M20.5 13L15 18.5L20.5 24" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h4>Subscription</h4>
          </div>
        </IonHeader>
        <IonContent fullscreen className="home-content">
          {!online ? (
            <OfflineOverlay />
          ) : (
            <div className={styles.main}>
              <div className={styles.maincontainer}>
                {[1, 2].map((i) => (
                  <div key={i} className={styles.ActiveSubCard} style={{ opacity: 0.45, pointerEvents: "none" }}>
                    <div style={{ background: "#e0e0e0", borderRadius: 6, height: 14, width: "60%", marginBottom: 12 }} />
                    <div style={{ background: "#e0e0e0", borderRadius: 6, height: 50, marginBottom: 12 }} />
                    <div style={{ background: "#e0e0e0", borderRadius: 6, height: 14, width: "40%" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <div className={styles.Top}>
          <svg
            width="35"
            height="35"
            viewBox="0 0 35 35"
            fill="none"
            onClick={() => history.goBack()}
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
          <h4>Subscription</h4>
        </div>
      </IonHeader>

      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : (
          <div className={styles.main}>
            <div className={styles.maincontainer}>

            {/* If user has no active AND no past subscriptions show a single centered NoState */}
            {activeSubscriptions.length === 0 && pastSubscriptions.length === 0 ? (
              <div style={{ width: "100%" }}>
                <NoState
                  title={"No subscriptions yet"}
                   imageSrc="/sub.gif"
                  subtitle={"Subscribe to your favorite coffee and get it delivered regularly."}
                  ctaText={"Browse subscriptions"}
                  onCta={() => history.push("/StoreMenu")}
                />
              </div>
            ) : (
              <>
                {activeSubscriptions.length > 0 && (
                  <div className={styles.ActiveSubscriptions}>
                    <h3>Active Subscription</h3>
                    <div className={styles.ActiveSubscriptionsCards}>
                      {activeSubscriptions.map((sub) => (
                        <div key={sub.id} className={styles.ActiveSubCard} onClick={() => openDetail(sub)}>
                          <div className={styles.ActiveSubCardTop}>
                            <div className={styles.ActiveSubdetails}>
                              <div className={styles.ActiveSubdetailsLeft}>
                                <h4>
                                  Subscription ID - <span>{sub.displayId}</span>
                                </h4>
                                <p>Next Delivery : {sub.nextDelivery ?? "—"}</p>
                              </div>
                              <div className={styles.ActiveSubdetailsRight}>
                                <p>Active</p>
                              </div>
                            </div>

                            <div className={styles.activesubprodname}>
                              <p>{sub.productName}</p>
                              <h3>{sub.deliveryFrequency}</h3>
                            </div>

                            <div className={styles.activesubitem}>
                              <p>Items</p>
                              <h4>{sub.itemName}</h4>
                            </div>
                          </div>

                          <div className={styles.ActiveSubCardBottom}>
                            <p>Order date - {sub.placedAtLabel}</p>
                            <button
                              className={styles.ctaforviewordernadcancel}
                              disabled={cancellingId === sub.id}
                              onClick={(e) => handleCancel(e, sub)}
                            >
                              {cancellingId === sub.id ? "Cancelling…" : "Cancel"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pastSubscriptions.length > 0 && (
                  <div className={styles.PastSubscriptions}>
                    <h3>Past Subscription</h3>
                    <div className={styles.PastSubscriptionsCards}>
                      {pastSubscriptions.map((sub) => (
                        <div key={sub.id} className={styles.PastSubCard} onClick={() => openDetail(sub)}>
                          <div className={styles.PastSubCardTop}>
                            <div className={styles.PastSubdetails}>
                              <div className={styles.PastSubdetailsLeft}>
                                <h4>
                                  Subscription ID - <span>{sub.displayId}</span>
                                </h4>
                                <p>Cancelled On : {sub.cancelledOn ?? "—"}</p>
                              </div>
                              <div className={styles.PastSubdetailsRight}>
                                <p>Cancelled</p>
                              </div>
                            </div>

                            <div className={styles.pastsubprodname}>
                              <p>{sub.productName}</p>
                              <h3>{sub.deliveryFrequency}</h3>
                            </div>

                            <div className={styles.pastsubitem}>
                              <p>Items</p>
                              <h4>{sub.itemName}</h4>
                            </div>
                          </div>

                          <div className={styles.PastSubCardBottom}>
                            <p>Order date - {sub.placedAtLabel}</p>
                            <button
                              className={styles.ctaforvieworder}
                              onClick={(e) => { e.stopPropagation(); openDetail(sub); }}
                            >
                              View Order
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            </div>
          </div>
        )}
      </IonContent>

      {/* ── Cancel Subscription Modal ── */}
      {cancelTarget && (
        <div className={styles.ModalOverlay} onClick={() => setCancelTarget(null)}>
          <div className={styles.CancelModal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.CancelModalTitle}>Cancel Subscription?</p>
            <p className={styles.CancelModalBody}>
              Your subscription {cancelTarget.displayId} will be cancelled and no further orders will be processed.
            </p>
            <div className={styles.CancelModalButtons}>
              <button
                className={styles.CancelModalCancelBtn}
                onClick={confirmCancel}
                disabled={cancellingId === cancelTarget.id}
              >
                {cancellingId === cancelTarget.id ? "Cancelling…" : "Cancel"}
              </button>
              <button
                className={styles.CancelModalKeepBtn}
                onClick={() => setCancelTarget(null)}
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
    </IonPage>
  );
};

export default Subscription;

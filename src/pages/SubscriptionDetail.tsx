import { IonContent, IonPage, IonHeader, IonFooter } from "@ionic/react";
import styles from "./SubscriptionDetail.module.css";
import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import tokenStorage from "../utils/tokenStorage";
import { cancelSubscriptionOrder, fetchPaymentHistory, type UserSubscription, type SubPaymentRecord } from "../api/apiSubscriptions";
import { generateSubscriptionInvoice } from "../utils/generateInvoicePdf";
import { downloadPdf } from "../utils/downloadPdf";

const CardSVG = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.9818 0H1.01818C0.748143 0 0.489165 0.113461 0.298219 0.315424C0.107272 0.517386 0 0.791305 0 1.07692V10.9231C0 11.2087 0.107272 11.4826 0.298219 11.6846C0.489165 11.8865 0.748143 12 1.01818 12H14.9818C15.2519 12 15.5108 11.8865 15.7018 11.6846C15.8927 11.4826 16 11.2087 16 10.9231V1.07692C16 0.791305 15.8927 0.517386 15.7018 0.315424C15.5108 0.113461 15.2519 0 14.9818 0ZM1.01818 0.923077H14.9818C15.0204 0.923077 15.0574 0.939286 15.0847 0.968137C15.1119 0.996989 15.1273 1.03612 15.1273 1.07692V3.07692H0.872727V1.07692C0.872727 1.03612 0.888052 0.996989 0.91533 0.968137C0.942608 0.939286 0.979605 0.923077 1.01818 0.923077ZM14.9818 11.0769H1.01818C0.979605 11.0769 0.942608 11.0607 0.91533 11.0319C0.888052 11.003 0.872727 10.9639 0.872727 10.9231V4H15.1273V10.9231C15.1273 10.9639 15.1119 11.003 15.0847 11.0319C15.0574 11.0607 15.0204 11.0769 14.9818 11.0769ZM13.6727 9.07692C13.6727 9.19933 13.6268 9.31673 13.5449 9.40328C13.4631 9.48984 13.3521 9.53846 13.2364 9.53846H10.9091C10.7934 9.53846 10.6824 9.48984 10.6005 9.40328C10.5187 9.31673 10.4727 9.19933 10.4727 9.07692C10.4727 8.95452 10.5187 8.83712 10.6005 8.75057C10.6824 8.66401 10.7934 8.61539 10.9091 8.61539H13.2364C13.3521 8.61539 13.4631 8.66401 13.5449 8.75057C13.6268 8.83712 13.6727 8.95452 13.6727 9.07692ZM9.01818 9.07692C9.01818 9.19933 8.97221 9.31673 8.89037 9.40328C8.80854 9.48984 8.69755 9.53846 8.58182 9.53846H7.41818C7.30245 9.53846 7.19146 9.48984 7.10963 9.40328C7.02779 9.31673 6.98182 9.19933 6.98182 9.07692C6.98182 8.95452 7.02779 8.83712 7.10963 8.75057C7.19146 8.66401 7.30245 8.61539 7.41818 8.61539H8.58182C8.69755 8.61539 8.80854 8.66401 8.89037 8.75057C8.97221 8.83712 9.01818 8.95452 9.01818 9.07692Z" fill="#6E736A"/>
  </svg>
);

const SubscriptionDetail: React.FC = () => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [cancelling, setCancelling]       = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [paymentHistory, setPaymentHistory]   = useState<SubPaymentRecord[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  // How many payment history entries to show at once
  const [historyVisibleCount, setHistoryVisibleCount] = useState(5);
  const history  = useHistory();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const location = history.location as any;

  const subscription = location.state?.subscription as UserSubscription | undefined;

  // Re-fetch payment history live (the passed state object may have empty array)
  useEffect(() => {
    if (!subscription) return;
    // Seed with whatever was passed in state immediately
    setPaymentHistory(subscription.paymentHistory ?? []);
    if (!subscription.stripeSubId) return;
    let cancelled = false;
    const load = async () => {
      setHistoryLoading(true);
      try {
        const token = await tokenStorage.getToken();
        const records = await fetchPaymentHistory(token, subscription.stripeSubId);
        if (!cancelled) setPaymentHistory(records);
      } catch {
        // keep whatever was passed in state
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription?.id]);

  if (!subscription) {
    history.goBack();
    return null;
  }

  const isActive  = subscription.status === "active";
  const addr      = subscription.shippingAddress;
  const addrName  = addr ? `${addr.firstName} ${addr.lastName}`.trim() : "—";
  const addrLine  = addr
    ? [addr.addressLine1, addr.addressLine2, addr.city, addr.emirates].filter(Boolean).join(", ")
    : "—";
  const addrPhone = addr?.phoneNumber ?? "—";

  const cardLabel = subscription.cardLast4
    ? `${subscription.cardBrand} ${subscription.cardLast4.slice(-4).padStart(10, "x")}`
    : "—";
const handleDownloadInvoice = async () => {
  setInvoiceLoading(true);
  try {
    const userEmail = await tokenStorage.getItem("user_email") ?? "";
const base64    = await generateSubscriptionInvoice(subscription, userEmail);
await downloadPdf(base64, `invoice-${subscription.displayId.replace("#", "")}.pdf`);
  } catch (err) {
    console.error("[SubscriptionDetail] invoice error", err);
    alert("Could not generate invoice. Please try again.");
  } finally {
    setInvoiceLoading(false);
  }
};
  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const token = await tokenStorage.getToken();
      await cancelSubscriptionOrder(token, subscription.id, subscription.stripeSubId, "Cancelled by user");
      setShowCancelModal(false);
      history.replace("/Subscription");
    } catch (err) {
      console.error("[SubscriptionDetail] cancel error", err);
      alert("Failed to cancel subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <div className={styles.Top}>
          <div className={styles.TopLeft}>
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
            <h4>Order details</h4>
          </div>
          <div className={styles.TopRight} onClick={() => history.push("/NeedHelp")}>
            <p>Help</p>
          </div>
        </div>
      </IonHeader>

      <IonContent fullscreen className="home-content">
        <div className={styles.main}>
          <div className={styles.MainConatiner}>

            {/* Section 1: Status + Frequency */}
            <div className={styles.one}>
              <div className={styles.oneleft}>
                {isActive ? (
                  <>
                    <h4>Next Delivery - <span>{subscription.nextDelivery ?? "—"}</span></h4>
                    <h4>Delivery Frequency - <span>{subscription.deliveryFrequency}</span></h4>
                  </>
                ) : (
                  <>
                    <h4>Cancelled On - <span>{subscription.cancelledOn ?? "—"}</span></h4>
                    <h4>Delivery Frequency - <span>{subscription.deliveryFrequency}</span></h4>
                  </>
                )}
              </div>
              <div className={isActive ? styles.activeBadge : styles.cancelledBadge}>
                <p>{isActive ? "Active" : "Cancelled"}</p>
              </div>
            </div>

            {/* Section 2: Product + Items */}
            <div className={styles.two}>
              <p>{subscription.productName}</p>
              <div className={styles.subitemcard}>
                <div className={styles.subitemcardTop}>
                  <p>Items</p>
                  <h4>{subscription.itemName}</h4>
                  {subscription.quantity > 1 && <h4>{subscription.quantity}x Bag Amount</h4>}
                </div>
                <div className={styles.subitemcardBottom}>
                  <p>Price per Delivery : </p>
                  <h4>AED {subscription.total.toFixed(0)}</h4>
                </div>
              </div>
            </div>

            {/* Section 3: Delivery Address */}
            <div className={styles.three}>
              <p>Delivery Details</p>
              <div className={styles.adressCard}>
                <div className={styles.nameandloc}>
                  <p>{addrName}</p>
                  {addr?.city && <h4>{addr.city}</h4>}
                </div>
                <h5>{addrLine}</h5>
                {addrPhone !== "—" && <h6>Phone number : {addrPhone}</h6>}
              </div>
            </div>

            {/* Section 4: Payment */}
            <div className={styles.four}>
              <p>Payment Information</p>
              <div className={styles.paymentdetails}>
                {isActive && (
                  <div className={styles.NextPayment}>
                    <div className={styles.NextPaymentLeft}>
                      <p>Next Payment :</p>
                      <h4>{subscription.nextDelivery ?? "—"}</h4>
                    </div>
                    <div className={styles.NextPaymentRight}>
                      <CardSVG />
                      <p>{cardLabel}</p>
                    </div>
                  </div>
                )}

                <div className={styles.Viewpaymenthistory}>
                  <div
                    className={styles.Viewpaymenthistorytab}
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  >
                    <p>View Payment History</p>
                    <svg
                      width="35"
                      height="35"
                      style={{
                        transform: isHistoryOpen ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "0.3s ease",
                      }}
                      viewBox="0 0 35 35"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M23.5 20L18 14.5L12.5 20"
                        stroke="#4B3827"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  {isHistoryOpen && (
                    <>
                      {historyLoading && (
                        <p style={{ fontSize: 13, color: "#8C8C8C", padding: "8px 0" }}>Loading…</p>
                      )}
                      {!historyLoading && paymentHistory.length === 0 && (
                        <p style={{ fontSize: 13, color: "#8C8C8C", padding: "8px 0" }}>
                          No payment history available.
                        </p>
                      )}
                      {!historyLoading && paymentHistory.slice(0, historyVisibleCount).map((rec: SubPaymentRecord, idx: number) => (
                        <div key={idx} className={styles.Viewpaymenthistorycard}>
                          <div className={styles.ViewpaymenthistorycardLeft}>
                            <p>{rec.date}</p>
                            <div className={styles.ViewpaymenthistorycardLeftBottom}>
                              <CardSVG />
                              <p>{rec.cardBrand} {rec.cardLast4.slice(-4).padStart(10, "x")}</p>
                            </div>
                          </div>
                          <div className={styles.ViewpaymenthistorycardRight}>
                            <h4>AED {rec.amount.toFixed(0)}</h4>
                          <p
  style={{ cursor: "pointer", color: "#6C7A5F", textDecoration: "underline", margin: 0 }}
  onClick={handleDownloadInvoice}
>
  {invoiceLoading ? "Generating…" : "View Invoice"}
</p>
                          </div>
                        </div>
                      ))}
                      {/* View more for payment history */}
                      {!historyLoading && paymentHistory.length > historyVisibleCount && (
                        <div className={styles.viewMoreContainer}>
                          <p className={styles.viewMore} onClick={() => setHistoryVisibleCount((v) => v + 5)}>View more</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </IonContent>

      {isActive && (
        <IonFooter slot="fixed">
          <div className={styles.Footer}>
            <button
              className={styles.FooterButton}
              onClick={() => setShowCancelModal(true)}
            >
              Cancel Subscription
            </button>
          </div>
        </IonFooter>
      )}

      {showCancelModal && (
        <div className={styles.ModalOverlay} onClick={() => setShowCancelModal(false)}>
          <div className={styles.CancelModal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.CancelModalTitle}>Cancel Subscription?</p>
            <p className={styles.CancelModalBody}>
              Your subscription will be cancelled and no further orders will be processed.
            </p>
            <div className={styles.CancelModalButtons}>
              <button
                className={styles.CancelModalCancelBtn}
                disabled={cancelling}
                onClick={handleCancelSubscription}
              >
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
              <button
                className={styles.CancelModalKeepBtn}
                onClick={() => setShowCancelModal(false)}
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

export default SubscriptionDetail;

import React, { useEffect, useState } from "react";
import styles from "./OrderResultsDetail.module.css";
import { useHistory } from "react-router-dom";
import { getOrderById, OrderResultData } from "../../../api/apiCafe";
import tokenStorage from "../../../utils/tokenStorage";

type Props = {
  orderId?: string | number;
  orderType: "takeaway" | "dinein";
  orderStatus: "confirmed" | "cancelled";
  /** Enriched cart items passed from payment screen — used to fill customization
   *  labels/prices when the backend doesn't populate them on the stored order. */
  cartSnapshot?: unknown[];
};

const OrderResultsDetail: React.FC<Props> = ({
  orderId,
  orderType,
  orderStatus,
  cartSnapshot,
}) => {
  const history = useHistory();

  const [orderData, setOrderData] = useState<OrderResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🎯 OrderResultsDetail → orderId received:", orderId);
    if (!orderId) {
      console.warn("⚠️ No orderId passed — skipping fetch");
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const token = await tokenStorage.getToken();
        console.log("🔑 token present:", !!token);
        let data = await getOrderById(token, orderId);
        console.log("✅ orderData loaded:", data);

        // Merge cartSnapshot customizations into items when backend returns [] for
        // an item's customizations.
        //
        // After the patchOrderCustomizations fix the backend stores one item per
        // virtual cart row, so `data.items` already has the right customizations
        // for most items.  The snapshot is used only as a fallback for any item
        // that still comes back with an empty customizations array.
        //
        // Matching strategy: build a snapshot lookup keyed by productId.
        // Because we may have multiple rows with the SAME productId (different
        // customizations) we maintain a per-productId queue so each order item
        // drains one snapshot entry in order.
        if (
          cartSnapshot &&
          Array.isArray(cartSnapshot) &&
          cartSnapshot.length > 0
        ) {
          const snap = cartSnapshot as Array<{
            productId?: number;
            quantity?: number;
            customizations?: unknown[];
            product?: Record<string, unknown> | null;
          }>;
          console.log(
            "🧾 cartSnapshot available for fallback merge:",
            snap.length,
            "entries",
          );

          // Build a queue-map: productId → [snapItem, ...]  (preserving order)
          const snapQueues = new Map<number, typeof snap>();
          for (const si of snap) {
            const pid = si.productId;
            if (pid == null) continue;
            if (!snapQueues.has(pid)) snapQueues.set(pid, []);
            snapQueues.get(pid)!.push(si);
          }

          const mergedItems = data.items.map((orderItem) => {
            // If the backend already stored customizations, use them as-is
            if (orderItem.customizations && orderItem.customizations.length > 0)
              return orderItem;

            // Look up the next snapshot entry for this productId
            const pid = orderItem.productId as number | undefined;
            if (!pid) return orderItem;
            const queue = snapQueues.get(pid);
            const snapItem = queue?.shift(); // consume one entry per order item
            if (!snapItem) return orderItem;

            const snapCusts = (snapItem.customizations ?? []) as Array<{
              selectedOptionLabel?: string;
              price?: number;
              sectionTitle?: string;
            }>;
            const mappedCusts = snapCusts
              .filter((c) => c?.selectedOptionLabel)
              .map((c) => ({
                label: c.selectedOptionLabel as string,
                price: Number(c?.price) || 0,
              }));

            if (mappedCusts.length === 0) return orderItem;

            // Sum extra cost per unit from priced customization options
            const custExtraPerUnit = mappedCusts.reduce(
              (s, c) => s + c.price,
              0,
            );
            const qty = snapItem.quantity ?? orderItem.quantity ?? 1;

            // Recalculate total price: (baseUnitPrice + custExtras) × qty
            const baseUnitPrice =
              qty > 0 ? orderItem.price / qty : orderItem.price;
            const correctedPrice = parseFloat(
              ((baseUnitPrice + custExtraPerUnit) * qty).toFixed(2),
            );

            return {
              ...orderItem,
              customizations: mappedCusts,
              variant: mappedCusts[0]?.label ?? orderItem.variant,
              addon: mappedCusts[1]?.label ?? orderItem.addon,
              price: correctedPrice,
            };
          });

          data = { ...data, items: mergedItems };

          // Recalculate itemTotal from merged item prices (includes customization extras)
          const recalcItemTotal = parseFloat(
            mergedItems.reduce((s, it) => s + it.price, 0).toFixed(2),
          );
          if (recalcItemTotal !== data.calculations.itemTotal) {
            data = {
              ...data,
              calculations: {
                ...data.calculations,
                itemTotal: recalcItemTotal,
                total: parseFloat(
                  (
                    recalcItemTotal +
                    data.calculations.taxes -
                    data.calculations.discount
                  ).toFixed(2),
                ),
              },
            };
          }

          console.log(
            "🧾 post-merge items:",
            mergedItems.map((it) => ({
              name: it.name,
              pid: it.productId,
              custs: it.customizations?.length,
              price: it.price,
            })),
          );
        }

        if (!cancelled) setOrderData(data);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load order";
          console.error("❌ getOrderById failed:", msg);
          setFetchError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId, cartSnapshot]);

  const isCancelled = orderStatus === "cancelled";

  const statusText = isCancelled
    ? "Order Cancelled"
    : orderType === "dinein"
    ? "Order Confirmed"
    : "Order Received";

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className={styles.main}
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #e0e0e0",
            borderTop: "3px solid #6c7a5f",
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (fetchError || !orderData) {
    return (
      <div className={styles.main}>
        <div className={styles.MainConatiner}>
          <p style={{ padding: "24px", color: "#c0392b", fontSize: 13 }}>
            {fetchError
              ? `Error: ${fetchError}`
              : `No orderId received — cannot load order.`}
          </p>
          <p style={{ padding: "0 24px 16px", color: "#8C8C8C", fontSize: 11 }}>
            orderId: {String(orderId ?? "undefined")}
          </p>
          <div
            className={styles.BottomBottom}
            onClick={() => history.push("/NeedHelp")}
          >
            <p>Contact Us</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.MainConatiner}>
        <div className={styles.Top}>
          <div className={styles.TopTop}>
            <div className={styles.direction}>
              <h4>{orderData.storeName}</h4>
              <a
                href="https://www.google.com/maps/search/?api=1&query=White+Mantis+Roastery"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.directionLocation}>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 5C10 7.4965 7.2305 10.0965 6.3005 10.8995C6.21386 10.9646 6.1084 10.9999 6 10.9999C5.8916 10.9999 5.78614 10.9646 5.6995 10.8995C4.7695 10.0965 2 7.4965 2 5C2 3.93913 2.42143 2.92172 3.17157 2.17157C3.92172 1.42143 4.93913 1 6 1C7.06087 1 8.07828 1.42143 8.82843 2.17157C9.57857 2.92172 10 3.93913 10 5Z"
                      stroke="#6C7A5F"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M6 6.5C6.82843 6.5 7.5 5.82843 7.5 5C7.5 4.17157 6.82843 3.5 6 3.5C5.17157 3.5 4.5 4.17157 4.5 5C4.5 5.82843 5.17157 6.5 6 6.5Z"
                      stroke="#6C7A5F"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>

                  <p>Get directions</p>
                </div>
              </a>
            </div>

            {orderType === "takeaway" && (
              <>
                <div className={styles.PickUpSlot}>
                  <p>Pickup Slot</p>
                  <div className={styles.PickUpSlotTime}>
                    <p>{orderData.pickupTime}</p>
                    <svg width="6" height="6">
                      <circle cx="3" cy="3" r="3" fill="#4B3827" />
                    </svg>
                    <p>{orderData.pickupDate}</p>
                  </div>
                </div>

                <div className={styles.OrderStatus}>
                  <p>Order Status</p>
                  <div className={styles.OrderStatusBadge}>
                    <span
                      className={`${styles.statusDot} ${
                        isCancelled ? styles.statusCancelled : ""
                      }`}
                    ></span>
                    <p>{statusText}</p>
                  </div>
                </div>
              </>
            )}

            {orderType === "dinein" && (
              <>
                <div className={styles.PickUpSlot}>
                  <p>Today</p>
                  <div className={styles.PickUpSlotTime}>
                    <p>{orderData.pickupDate}</p>
                  </div>
                </div>

                <div className={styles.PickUpSlot}>
                  <p>Order Number</p>
                  <div className={styles.PickUpSlotTime}>
                    <p>{orderData.orderNumber}</p>
                  </div>
                </div>

                <div className={styles.divider}></div>
              </>
            )}
          </div>

          <div className={styles.TopBottom}>
            <p>Served by</p>
            <div className={styles.ServedByDetails}>
              <h3>{orderData.servedBy.name}</h3>
              <p>
                {orderType === "dinein"
                  ? orderData.servedBy.messageConfirmedDinein
                  : orderData.servedBy.messageConfirmedTakeaway}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.Bottom}>
          <div className={styles.BottomTop}>
            <div className={styles.OrderDetails}>
              <div className={styles.OrderDetailsLeft}>
                <p>Order details</p>
                <h4>Order ID</h4>
              </div>
              <div className={styles.OrderDetailsRight}>
                <h4>{orderData.orderId}</h4>
              </div>
            </div>

            <div className={styles.OrderDetailsList}>
              {orderData.items.map((item) => (
                <div key={item.id} className={styles.OrderDetailsListItem}>
                  <div className={styles.OrderDetailsListItemLeft}>
                    <div className={styles.prodname}>
                      <h4>
                        {item.name}
                        {` × ${item.quantity ?? 1}`}
                      </h4>
                    </div>
                    {(!item.isReward && (item.customizations?.length ?? 0) > 0) ? (
                            <div className={styles.prodaddons}>
                              {item.customizations.map((c, ci) => {
                                const cc = c as Record<string, unknown>;
                                const label = String(cc['label'] ?? cc['selectedOptionLabel'] ?? cc['optionLabel'] ?? cc['selectedLabel'] ?? cc['sectionTitle'] ?? "");
                                const price = Number(cc['price'] ?? cc['optionPrice'] ?? cc['selectedOptionPrice'] ?? 0) || 0;
                                return (
                                  <React.Fragment key={ci}>
                                    {ci > 0 && (
                                      <svg width="6" height="6">
                                        <circle cx="3" cy="3" r="3" fill="#8C8C8C" />
                                      </svg>
                                    )}
                                    <p>
                                      {label}
                                      {price > 0 && ` +AED ${price.toFixed(2)}`}
                                    </p>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          ) : item.variant || item.addon ? (
                      <div className={styles.prodaddons}>
                        {item.variant && <p>{item.variant}</p>}
                        {item.variant && item.addon && (
                          <svg width="6" height="6">
                            <circle cx="3" cy="3" r="3" fill="#8C8C8C" />
                          </svg>
                        )}
                        {item.addon && <p>{item.addon}</p>}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.OrderDetailsListItemRight}>
                    {item.isReward ? (
                      <h4>FREE</h4>
                    ) : (
                      <h4>AED {item.price.toFixed(2)}</h4>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.OrderCalculations}>
              <div className={styles.ItemsTotal}>
                <p>Item Total</p>
                <h5>AED {orderData.calculations.itemTotal}</h5>
              </div>

              <div className={styles.Taxes}>
                <p>Taxes</p>
                <h5>AED {orderData.calculations.taxes}</h5>
              </div>

              {orderData.calculations.wtCoinsDiscount > 0 && (
                <div className={styles.Taxes}>
                  <p>Beans Used</p>
                  <h5>- AED {orderData.calculations.wtCoinsDiscount}</h5>
                </div>
              )}

              {orderData.calculations.couponCode && (
                <div className={styles.Coupons}>
                  <div className={styles.CouponsLeft}>
                    <p>{isCancelled ? "Discount Applied" : "Coupon Applied"}</p>
                    <h5>"{orderData.calculations.couponCode}"</h5>
                  </div>
                  <div className={styles.CouponsRight}>
                    <h5>- AED {orderData.calculations.discount}</h5>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.OrderTotal}>
              <p>Your total</p>
              <h5>AED {orderData.calculations.total}</h5>
            </div>
          </div>

          <div
            className={styles.BottomBottom}
            onClick={() => history.push("/NeedHelp")}
          >
            <p>Contact Us</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderResultsDetail;

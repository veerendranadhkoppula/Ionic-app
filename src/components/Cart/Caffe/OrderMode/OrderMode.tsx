import React, { useState, useEffect } from "react";
import styles from "./OrderMode.module.css";
import { useAuth } from "../../../../utils/useAuth";
import { useCheckout, OrderType, TimeSelection } from "../../../../context/CafeCheckoutContext";
import tokenStorage from "../../../../utils/tokenStorage";
import { getUserPreferences, getShopSlots, CafeSlot } from "../../../../api/apiCafe";

const OrderMode = () => {
  const {
    orderType,
    timeSelection,
    selectedSlot,
    setOrderType,
    setTimeSelection,
    setSelectedSlot,
  } = useCheckout();

  const { isLoggedIn } = useAuth();

  const [slots, setSlots] = useState<CafeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // ── Fetch ALL slots on mount (we need the "now" slot ID for immediate mode) ─
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setSlotsLoading(true);
      try {
        const token = await tokenStorage.getToken();
        const data = await getShopSlots(token);
        console.log("📅 OrderMode slots loaded:", data);
        if (!mounted) return;
        setSlots(data);

        // Compute availability from freshly fetched data
        const dataHasNow = data.some((s) => s.timeSelection === "now");
        const dataHasCustom = data.some((s) => s.timeSelection === "custom");
        const nowSlot = data.find((s) => s.timeSelection === "now");

        // Only mutate defaults if the checkout state still looks like the
        // initial defaults (user hasn't chosen something else or prefs didn't prefill).
        const isDefaultCheckout = orderType === "take-away" && timeSelection === "now" && selectedSlot === null;

        if (isDefaultCheckout) {
          if (dataHasNow && dataHasCustom) {
            // Both available -> Immediate Pickup by default
            setOrderType("take-away");
            setTimeSelection("now");
            if (nowSlot) setSelectedSlot(nowSlot.id);
          } else if (dataHasNow && !dataHasCustom) {
            // Only now available
            setOrderType("take-away");
            setTimeSelection("now");
            if (nowSlot) setSelectedSlot(nowSlot.id);
          } else if (!dataHasNow && dataHasCustom) {
            // Only custom available
            setOrderType("take-away");
            setTimeSelection("custom");
            setSelectedSlot(null);
          } else {
            // Neither available -> for logged-in users default to Dine-In.
            // For guests, keep the optimistic Takeaway default so they don't
            // unexpectedly see Dine-In selected.
            if (isLoggedIn) {
              setOrderType("dine-in");
            }
          }
        } else {
          // If user already made a selection, still ensure we clear an invalid 'now'
          // selection when the now slot disappears.
          if (!dataHasNow && timeSelection === "now") {
            setTimeSelection("custom");
            setSelectedSlot(null);
          }
        }

      } catch (err) {
        console.warn("OrderMode: failed to load slots", err);
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pre-fill from user's saved preferences on mount ────────────────────────
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const token = await tokenStorage.getToken();
        const prefs = await getUserPreferences(token);
        if (!mounted || !prefs) return;

        if (prefs.orderType) {
          const mapped = String(prefs.orderType).toLowerCase().includes("dine")
            ? "dine-in"
            : "take-away";
          setOrderType(mapped as OrderType);
        }
        if (prefs.timeSelection) {
          const mapped = String(prefs.timeSelection).toLowerCase().includes("custom")
            ? "custom"
            : "now";
          setTimeSelection(mapped as TimeSelection);
        }
      } catch (err) {
        console.warn("OrderMode: failed to load preferences", err);
      }
    };
    load();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── When user switches to "now", auto-select the now slot ──────────────────
  const handleSelectNow = () => {
    setTimeSelection("now");
    const nowSlot = slots.find((s) => s.timeSelection === "now");
    if (nowSlot) {
      console.log("📅 Selecting 'now' slot:", nowSlot.id);
      setSelectedSlot(nowSlot.id);
    } else {
      console.warn("📅 No 'now' slot found in backend. Clearing selection.");
      setSelectedSlot(null);
    }
  };

  const customSlots = slots.filter((s) => s.timeSelection === "custom");


  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>
        <div className={styles.Top}>
          <h3>Choose Order Type</h3>

          <div className={styles.OrderTypeContainer}>
            <button
              className={`${styles.cta} ${orderType === "take-away" ? styles.activeCta : styles.inactiveCta}`}
              onClick={() => { setOrderType("take-away"); }}
              aria-disabled={false}
            >
              Takeaway
            </button>

            <button
              className={`${styles.cta} ${
                orderType === "dine-in" ? styles.activeCta : styles.inactiveCta
              }`}
              onClick={() => setOrderType("dine-in")}
            >
              Dine-In
            </button>
          </div>
        </div>

        {orderType === "take-away" && (
          <div className={styles.Bottom}>
            <div
              className={styles.optionRow}
              onClick={() => {
                handleSelectNow();
              }}
              aria-disabled={false}
            >
              <div
                className={`${styles.radio} ${
                  timeSelection === "now" ? styles.radioActive : ""
                }`}
              />
              <div className={styles.optionText}>
                <h4>Immediate Pickup</h4>
                <p>Ready in 5-8 mins</p>
              </div>
            </div>

            <div className={styles.line}></div>

            <div
              className={styles.optionRow}
              onClick={() => {
                setTimeSelection("custom");
                setSelectedSlot(null);
              }}
              aria-disabled={false}
            >
              <div
                className={`${styles.radio} ${
                  timeSelection === "custom" ? styles.radioActive : ""
                }`}
              />
              <div className={styles.optionText}>
                <h4>Pick a slot</h4>
                <p>Choose your slot</p>
              </div>
            </div>

            {timeSelection === "custom" && (
              <div className={styles.slotGrid}>
                {slotsLoading && (
                  <p className={styles.slotsLoading}>Loading slots…</p>
                )}
                {!slotsLoading && customSlots.length === 0 && (
                  <p className={styles.slotsLoading}>No slots available right now.</p>
                )}
                {!slotsLoading && customSlots.map((slot) => (
                  <button
                    key={slot.id}
                    className={`${styles.slotBtn} ${
                      selectedSlot === slot.id ? styles.slotSelected : ""
                    }`}
                    onClick={() => setSelectedSlot(slot.id)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderMode;

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import styles from "./StickOrderStatusBar.module.css";
import { cancelCafeOrder } from "../../../api/apiCafe";
import tokenStorage from "../../../utils/tokenStorage";

type AppOrderStatus = string;
type OrderAcceptance = "accepted" | "pending" | string;
type OrderType = "take-away" | "dine-in";

interface ActiveOrder {
  orderId: string | number;
  orderType: OrderType;
}

function resolveStep(
  status: AppOrderStatus,
  acceptance: OrderAcceptance,
  orderType: OrderType
): number {
  if (orderType === "dine-in") {
    if (status === "completed") return 4;
    if (status === "ready")     return 3;
    if (status === "preparing") return 2;
    if (acceptance === "accepted") return 1;
    return 0;
  }
  if (status === "completed") return 4;
  if (status === "ready")     return 3;
  if (status === "preparing") return 2;
  if (acceptance === "accepted") return 1;
  return 0;
}

function resolveLabel(step: number, orderType: OrderType, status: AppOrderStatus): string {
  if (status === "cancelled") return "Order Cancelled";
  if (orderType === "dine-in") {
    return (["Order Placed!", "Order Accepted!", "Preparation Started!", "Ready to Serve!", "Order Served!"][step] ?? "Order Placed!");
  }
  return (["Order Placed!", "Order Accepted!", "Preparation Started!", "Ready for Pickup!", "Order Completed!"][step] ?? "Order Placed!");
}

const POLL_INTERVAL_MS = 2_000;
const LS_KEY = "active_cafe_order";
const PERSIST_TTL_MS = 24 * 60 * 60 * 1000;



const BRAND_COLORS = ["#6C7A5F", "#D8A05A", "#4B3827", "#A8B89A", "#E8C27A", "#8B6347"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  gravity: number;
}

function createParticles(canvasW: number, canvasH: number): Particle[] {
  const particles: Particle[] = [];
  const count = 80;
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI) + Math.PI;
    const speed = 3 + Math.random() * 6;
    particles.push({
      x: canvasW / 2 + (Math.random() - 0.5) * canvasW * 0.6,
      y: canvasH,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      width: 6 + Math.random() * 6,
      height: 3 + Math.random() * 4,
      color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
      opacity: 1,
      gravity: 0.12 + Math.random() * 0.08,
    });
  }
  return particles;
}

const ConfettiCanvas: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    let particles = createParticles(W, H);
    const totalDuration = 2200;
    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / totalDuration, 1);

      ctx.clearRect(0, 0, W, H);

      particles = particles.map((p) => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + p.gravity,
        vx: p.vx * 0.99,
        rotation: p.rotation + p.rotationSpeed,
        opacity: progress > 0.6 ? 1 - ((progress - 0.6) / 0.4) : 1,
      }));

      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.restore();
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, W, H);
        onDone();
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "340px",
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
};



const StickOrderStatusBar = () => {
  const history = useHistory();

  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<AppOrderStatus>("pending");
  const [orderAcceptance, setOrderAcceptance] = useState<OrderAcceptance>("pending");
  const [orderId, setOrderId] = useState<string | number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [showSlightDelay, setShowSlightDelay] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const orderTypeRef = useRef<OrderType>("take-away");
  const confettiShownRef = useRef(false);

  // Check and trigger confetti — only once per order
  const maybeShowConfetti = useCallback((currentOrderId: string | number) => {
    const key = `confetti_shown_${currentOrderId}`;
    const alreadyShown = sessionStorage.getItem(key);
    if (!alreadyShown && !confettiShownRef.current) {
      confettiShownRef.current = true;
      sessionStorage.setItem(key, "1");
      setShowConfetti(true);
    }
  }, []);

  useEffect(() => {
    const tryLoad = async () => {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      try {
        const parsed: ActiveOrder & { persistedAt?: number; userId?: string } = JSON.parse(raw);
        if (parsed.persistedAt && Date.now() - parsed.persistedAt > PERSIST_TTL_MS) {
          localStorage.removeItem(LS_KEY);
          return;
        }
        const currentUserId = await tokenStorage.getItem("user_id");
        if (parsed.userId && currentUserId && parsed.userId !== currentUserId) {
          localStorage.removeItem(LS_KEY);
          return;
        }
        orderTypeRef.current = parsed.orderType;
        setActiveOrder(parsed);
        setOrderId(parsed.orderId);
      } catch { /* ignore malformed */ }
    };

    tryLoad();

    const handleOrderPlaced = () => tryLoad();
    window.addEventListener("cafe_order_placed", handleOrderPlaced);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) tryLoad();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("cafe_order_placed", handleOrderPlaced);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const token = await tokenStorage.getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `JWT ${token}`;

      const res = await fetch(
        `https://endpoint.whitemantis.ae/api/app-orders/${orderId}`,
        { method: "GET", headers }
      );

      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          localStorage.removeItem(LS_KEY);
          setActiveOrder(null);
          setOrderId(null);
          return;
        }
        return;
      }

      const data = await res.json().catch(() => ({}));
      const doc = data?.doc ?? data?.order ?? data ?? {};
      const acceptance: OrderAcceptance = doc?.orderAcceptance ?? "pending";

      if (acceptance === "rejected") {
        localStorage.removeItem(LS_KEY);
        try {
          const t = await tokenStorage.getToken();
          try {
            await cancelCafeOrder(t, orderId, "Order rejected by admin");
          } catch (err) {
            console.warn("StickBar: cancel endpoint failed for rejected order:", err);
          }
          history.push("/OrderResult", {
            orderId,
            orderType: orderTypeRef.current ?? "take-away",
            orderStatus: "cancelled",
          });
        } catch (e) {
          console.warn("StickBar: navigation to OrderResult failed:", e);
        }
        setActiveOrder(null);
        setOrderId(null);
        return;
      }

      const isDineIn = orderTypeRef.current === "dine-in";
      const rawStatus: string = isDineIn
        ? (doc?.appOrderStatusDine ?? doc?.appOrderStatus ?? "pending")
        : (doc?.appOrderStatus ?? "pending");

      setOrderStatus(rawStatus);
      setOrderAcceptance(acceptance);

      // Trigger confetti on completion
      if (rawStatus === "completed") {
        maybeShowConfetti(orderId);
      }

      try {
        const createdAt = doc?.createdAt ? new Date(doc.createdAt).getTime() : null;
        if (createdAt) {
          const ageMs = Date.now() - createdAt;
          const isDineInOrder = orderTypeRef.current === "dine-in";
          const delayed = isDineInOrder && acceptance === "pending" && ageMs > 5 * 60 * 1000;
          setShowSlightDelay(Boolean(delayed));
        } else {
          setShowSlightDelay(false);
        }
      } catch {
        setShowSlightDelay(false);
      }

      const isTerminal = rawStatus === "completed" || rawStatus === "cancelled";
      if (isTerminal) {
        localStorage.removeItem(LS_KEY);
        if (rawStatus === "cancelled") {
          setTimeout(() => {
            setActiveOrder(null);
            setOrderId(null);
          }, 3000);
        }
      }
    } catch {
      console.warn("StickOrderStatusBar poll error:");
    }
  }, [orderId, history, maybeShowConfetti]);

  useEffect(() => {
    if (!orderId) return;
    fetchStatus();
    const timer = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [orderId, fetchStatus]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchStatus]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleConfirmCancel = async () => {
    if (!orderId) return;
    setCancelling(true);
    try {
      const token = await tokenStorage.getToken();
      await cancelCafeOrder(token, orderId, "Cancelled by user");
      localStorage.removeItem(LS_KEY);
      setShowCancelPopup(false);
      setActiveOrder(null);
      setOrderId(null);
      history.push("/OrderResult", {
        orderId,
        orderType: activeOrder?.orderType ?? "take-away",
        orderStatus: "cancelled",
      });
    } catch (e) {
      console.error("Cancel order failed:", e);
      try {
        localStorage.removeItem(LS_KEY);
        setShowCancelPopup(false);
        setActiveOrder(null);
        setOrderId(null);
        history.push("/OrderResult", {
          orderId,
          orderType: activeOrder?.orderType ?? "take-away",
          orderStatus: "cancelled",
        });
      } catch (navErr) {
        console.warn("Failed to navigate after cancel error:", navErr);
      }
    }
  };

  if (!activeOrder || !orderId) return null;

  const step = resolveStep(orderStatus, orderAcceptance, activeOrder.orderType);
  const label = resolveLabel(step, activeOrder.orderType, orderStatus);

  const canCancel =
    orderAcceptance !== "accepted" &&
    orderStatus !== "cancelled" &&
    orderStatus !== "completed";

  const tickLeft =
    step === 0 ? "0%" :
    step === 1 ? "25%" :
    step === 2 ? "50%" :
    step === 3 ? "75%" : "100%";

  const tickTransform =
    step === 0 ? "translateX(0)" :
    step === 4 ? "translateX(-100%)" :
    "translateX(-50%)";

  return (
    <>
      {showCancelPopup && (
        <div className={styles.overlay} onClick={() => setShowCancelPopup(false)}>
          <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTexts}>
              <h3 className={styles.popupTitle}>Cancel order?</h3>
              <p className={styles.popupSubtitle}>Are you sure you want to cancel your order?</p>
            </div>
            <div className={styles.popupButtons}>
              <button className={styles.btnNo} onClick={() => setShowCancelPopup(false)}>No</button>
              <button className={styles.btnYes} onClick={handleConfirmCancel} disabled={cancelling}>
                {cancelling ? "..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.main} style={{ position: "fixed", overflow: "visible" }}>
        {showConfetti && (
          <ConfettiCanvas onDone={() => setShowConfetti(false)} />
        )}
        <div className={styles.MainContainer}>
          <div className={styles.top}>
            <div className={styles.TopLeft}>
              <h3>{label}</h3>
              {showSlightDelay && orderAcceptance === "pending" ? (
                <h4 style={{ fontFamily: "Lato, sans-serif", fontSize: "12px", color: "#E54842", margin: 0 }}>
                  Slight Delay
                </h4>
              ) : (
                <h4>Order ID - #{orderId}</h4>
              )}
            </div>

            <div className={styles.TopRight} ref={menuRef}>
              {orderStatus === "completed" ? (
                <div
                  onClick={() => { setActiveOrder(null); setOrderId(null); }}
                  className={styles.dots}
                  style={{ cursor: "pointer" }}
                >
                  <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z" fill="#4B3827"/>
                  </svg>
                </div>
              ) : (
                <div onClick={() => setShowMenu((p) => !p)} className={styles.dots}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="5" r="1.5" fill="#4B3827" />
                    <circle cx="12" cy="12" r="1.5" fill="#4B3827" />
                    <circle cx="12" cy="19" r="1.5" fill="#4B3827" />
                  </svg>
                </div>
              )}

              {showMenu && orderStatus !== "completed" && (
                <div className={styles.dropdown}>
                  <p
                    className={styles.menuItem}
                    onClick={() => {
                      setShowMenu(false);
                      history.push({
                        pathname: "/OrderDetailsCafe",
                        state: { orderId, orderType: activeOrder?.orderType ?? "take-away" }
                      });
                    }}
                  >
                    View details
                  </p>
                  <p
                    className={!canCancel ? styles.menuItemMuted : ""}
                    onClick={() => {
                      if (!canCancel) return;
                      setShowMenu(false);
                      setShowCancelPopup(true);
                    }}
                  >
                    Cancel order
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.bottom}>
            <div className={styles.progressTrack}>
              <div className={styles.trackBase} />
              <div className={styles.trackFill} style={{ width: tickLeft }} />
              <div className={`${styles.fixedDot} ${styles.dot1} ${step >= 0 ? styles.dotPassed : ""}`} />
              <div className={`${styles.fixedDot} ${styles.dot2} ${step >= 2 ? styles.dotPassed : ""}`} />
              <div className={`${styles.fixedDot} ${styles.dot3} ${step >= 4 ? styles.dotPassed : ""}`} />
              <div className={styles.tickCircle} style={{ left: tickLeft, transform: tickTransform }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StickOrderStatusBar;
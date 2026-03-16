/**
 * CafeCheckoutContext
 *
 * Single source of truth for all data that must be sent in the
 * cafe-checkout payload.  Lives in Cart.tsx via <CafeCheckoutProvider>
 * so every child (OrderMode, CuponsCoins, PayContainer, …) can
 * read / write without prop-drilling.
 *
 * NOTE: Store checkout is a separate flow with its own context
 *       (StoreCheckoutContext) — to be implemented when store APIs are ready.
 *
 * Checkout payload reference  (POST /api/checkout/cafe-checkout):
 * {
 *   shopId             : number
 *   orderType          : "take-away" | "dine-in"
 *   timeSelection      : "now" | "custom"
 *   selectedSlot       : number | null      (null when dine-in; ID of "now" slot or custom slot)
 *   usedWTCoins        : boolean
 *   specialInstructions: string
 *   appliedCouponCode  : string | null
 *   selectedBarista    : number | null
 *   stampRewards       : unknown[]
 * }
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import type { StampRewardProduct } from "../api/apiStamps";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderType    = "take-away" | "dine-in";
export type TimeSelection = "now" | "custom";

/** Shape stored when a coupon is successfully applied. */
export interface AppliedCoupon {
  code           : string;
  discountType   : "percentage" | "flat" | string;
  discountAmount : number;
  discountText   : string;
  description    : string;
  minimumAmount  ?: number;
  // allow extra fields returned by the coupon API (id, applicability, expiry, etc.)
  [key: string]  : unknown;
}

export interface CheckoutState {
  orderType           : OrderType;
  timeSelection       : TimeSelection;
  /** Numeric slot ID from backend.  null when timeSelection === "immediate". */
  selectedSlot        : number | null;
  specialInstructions : string;
  /** Coupon the user has applied (null = none). */
  appliedCoupon       : AppliedCoupon | null;
  /** Whether the user chose to redeem their Mantis coins. */
  useCoins            : boolean;
  /** Sum of (price × qty) for every enriched cart item.  Set by Cart.tsx. */
  itemsTotal          : number;
  /** Barista ID selected by the user (null = no preference / optional). */
  selectedBaristaId   : number | null;
  /** Stamp reward product chosen by the user (null = none selected). */
  selectedReward      : StampRewardProduct | null;
}

export interface CheckoutContextValue extends CheckoutState {
  setOrderType           : (v: OrderType)               => void;
  setTimeSelection       : (v: TimeSelection)            => void;
  setSelectedSlot        : (v: number | null)            => void;
  setSpecialInstructions : (v: string)                   => void;
  setAppliedCoupon       : (v: AppliedCoupon | null)     => void;
  setUseCoins            : (v: boolean)                  => void;
  setItemsTotal          : (v: number)                   => void;
  setSelectedBaristaId   : (v: number | null)            => void;
  setSelectedReward      : (v: StampRewardProduct | null) => void;
  /** Reset to defaults (called when cart is cleared). */
  reset                  : () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STATE: CheckoutState = {
  orderType           : "take-away",
  timeSelection       : "now",
  selectedSlot        : null,
  specialInstructions : "",
  appliedCoupon       : null,
  useCoins            : false,
  itemsTotal          : 0,
  selectedBaristaId   : null,
  selectedReward      : null,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CheckoutState>(DEFAULT_STATE);

  const setOrderType = useCallback((v: OrderType) =>
    setState((s) => ({ ...s, orderType: v, timeSelection: "now", selectedSlot: null })), []);

  const setTimeSelection = useCallback((v: TimeSelection) =>
    setState((s) => ({ ...s, timeSelection: v, selectedSlot: v === "now" ? null : s.selectedSlot })), []);

  const setSelectedSlot = useCallback((v: number | null) =>
    setState((s) => ({ ...s, selectedSlot: v })), []);

  const setSpecialInstructions = useCallback((v: string) =>
    setState((s) => ({ ...s, specialInstructions: v })), []);

  const setAppliedCoupon = useCallback((v: AppliedCoupon | null) =>
    setState((s) => ({ ...s, appliedCoupon: v })), []);

  const setUseCoins = useCallback((v: boolean) =>
    setState((s) => ({ ...s, useCoins: v })), []);

  const setItemsTotal = useCallback((v: number) =>
    setState((s) => ({ ...s, itemsTotal: v })), []);

  const setSelectedBaristaId = useCallback((v: number | null) =>
    setState((s) => ({ ...s, selectedBaristaId: v })), []);

  const setSelectedReward = useCallback((v: StampRewardProduct | null) =>
    setState((s) => ({ ...s, selectedReward: v })), []);

  const reset = useCallback(() => setState(DEFAULT_STATE), []);

  return (
    <CheckoutContext.Provider
      value={{ ...state, setOrderType, setTimeSelection, setSelectedSlot, setSpecialInstructions, setAppliedCoupon, setUseCoins, setItemsTotal, setSelectedBaristaId, setSelectedReward, reset }}
    >
      {children}
    </CheckoutContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used inside <CheckoutProvider>");
  return ctx;
}

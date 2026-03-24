
import React, { createContext, useContext, useState, useCallback } from "react";
import type { StampRewardProduct } from "../api/apiStamps";


export type OrderType    = "take-away" | "dine-in";
export type TimeSelection = "now" | "custom";


export interface AppliedCoupon {
  code           : string;
  discountType   : "percentage" | "flat" | string;
  discountAmount : number;
  discountText   : string;
  description    : string;
  minimumAmount  ?: number;
 
  [key: string]  : unknown;
}

export interface CheckoutState {
  orderType           : OrderType;
  timeSelection       : TimeSelection;
  /** Numeric slot ID from backend.  null when timeSelection === "immediate". */
  selectedSlot        : number | null;
  specialInstructions : string;
  appliedCoupon       : AppliedCoupon | null;
  useCoins            : boolean;
  itemsTotal          : number;
  selectedBaristaId   : number | null;
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

  reset                  : () => void;
}


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


const CheckoutContext = createContext<CheckoutContextValue | null>(null);

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


// eslint-disable-next-line react-refresh/only-export-components
export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used inside <CheckoutProvider>");
  return ctx;
}

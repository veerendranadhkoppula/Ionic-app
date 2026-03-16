
import React from "react";
import CartContext, { CartContextShape } from "./CartContext";

export const useCart = (): CartContextShape => {
  const ctx = React.useContext(CartContext as React.Context<CartContextShape | null>);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export default useCart;

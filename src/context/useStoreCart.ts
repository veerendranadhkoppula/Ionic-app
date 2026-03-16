import React from "react";
import StoreCartContext, { StoreCartContextShape } from "./StoreCartContext";

export const useStoreCart = (): StoreCartContextShape => {
  const ctx = React.useContext(StoreCartContext);
  if (!ctx) throw new Error("useStoreCart must be used within StoreCartProvider");
  return ctx;
};

export default useStoreCart;

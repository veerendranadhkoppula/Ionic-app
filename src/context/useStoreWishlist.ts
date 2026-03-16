/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import StoreWishlistContext from "./StoreWishlistContext";

export const useStoreWishlist = () => {
  const ctx = React.useContext(StoreWishlistContext as React.Context<any>);
  if (!ctx) throw new Error("useStoreWishlist must be used within StoreWishlistProvider");
  return ctx;
};

export default useStoreWishlist;

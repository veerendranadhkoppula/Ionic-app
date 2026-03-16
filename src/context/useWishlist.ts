/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import WishlistContext from "./WishlistContext";

export const useWishlist = () => {
  const ctx = React.useContext(WishlistContext as React.Context<any>);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};

export default useWishlist;

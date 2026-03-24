/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  getSingleShop,
  getShopMenu,
  getSingleMenuItem,
  transformToMenuShape,
  getBestSellerIds,
  isShopOpen,
  MenuShape as ApiMenuShape,
} from "../api/apiCafe";
import { useWishlist } from "../context/useWishlist";
import { useCart } from "../context/useCart";
import { useStoreCart } from "../context/useStoreCart";
import CartConflictModal from "../components/StoreMenu/CartConflictModal/CartConflictModal";
import styles from "./CafeMenu.module.css";
import ProductDetailSheet from "../components/ProductDetailSheet.tsx";
import { IonPage, IonContent, IonFooter } from "@ionic/react";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import StickBar from "../components/Home/StickBar/StickBar.tsx";
import { getCurrentUser } from "../utils/authStorage.ts";
import useAuth from "../utils/useAuth";

import placeholderimage from "./nostatesimg.png";
import Customization from "../components/Home/Customization/Customization.tsx";
import RepeatCustomization from "../components/CafeMenu/RepeatCustomization/RepeatCustomization";
import ViewCart from "../components/ViewCart.tsx";
import { useActiveCafeOrder } from "../context/useActiveCafeOrder";
import toastStyles from "../components/CafeMenu/ActiveOrderToast/ActiveOrderToast.module.css";

type VegType = "Veg" | "NonVeg" | "Egg" | "Vegan";

type MenuItem = {
  id?: number;
  name: string;
  tagline?: string;
  desc: string;
  price: number;

  originalPrice?: number;
  discountedPrice?: number;

  vegType: VegType;
  bestseller: boolean;
  inStock: boolean;
  image: string;
  fullDesc?: string;
  recipe?: { title: string; description: string }[];
  customizations?: any[];
};

type MenuCategory = {
  title: string;
  items: MenuItem[];
};

type MenuShape = Record<string, MenuCategory[]>;

const TAB_ORDER = ["BEVERAGES", "BAKERY"] as const;

const VegIcon = () => (
  <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
    <path
      d="M0 10.3325V0H11.3632V10.3325H0ZM1.26258 9.1844H10.1007V1.14805H1.26258V9.1844ZM5.68162 7.46233C4.9872 7.46233 4.39274 7.2375 3.89822 6.78785C3.40371 6.33819 3.15646 5.79765 3.15646 5.16623C3.15646 4.5348 3.40371 3.99426 3.89822 3.54461C4.39274 3.09495 4.9872 2.87013 5.68162 2.87013C6.37604 2.87013 6.97051 3.09495 7.46502 3.54461C7.95953 3.99426 8.20679 4.5348 8.20679 5.16623C8.20679 5.79765 7.95953 6.33819 7.46502 6.78785C6.97051 7.2375 6.37604 7.46233 5.68162 7.46233Z"
      fill="#34A853"
    />
  </svg>
);

const NonVegIcon = () => (
  <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
    <path d="M0 10.3325V0H11.3632V10.3325H0Z" fill="#A83434" />
  </svg>
);

const EggIcon = () => (
  <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
    <ellipse cx="6" cy="5.5" rx="4" ry="5" fill="#F9AB00" />
  </svg>
);

const VeganIcon = () => (
  <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
    <path
      d="M6 0C3 2 2 5 2 7.5C2 9.4 3.6 11 6 11C8.4 11 10 9.4 10 7.5C10 5 9 2 6 0Z"
      fill="#0F9D58"
    />
  </svg>
);

const VegTypeIcon = ({ type }: { type: VegType }) => {
  switch (type) {
    case "Veg":
      return <VegIcon />;
    case "NonVeg":
      return <NonVegIcon />;
    case "Egg":
      return <EggIcon />;
    case "Vegan":
      return <VeganIcon />;
    default:
      return null;
  }
};

const BestSellerIcon = () => (
  <svg
    width="57"
    height="21"
    viewBox="0 0 57 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.43 10.23C17.7067 10.23 17.945 10.1983 18.145 10.135C18.345 10.0717 18.5083 9.98333 18.635 9.87C18.765 9.75333 18.86 9.61667 18.92 9.46C18.98 9.3 19.01 9.125 19.01 8.935C19.01 8.565 18.8783 8.27333 18.615 8.06C18.3517 7.84333 17.9567 7.735 17.43 7.735H15.88V10.23H17.43ZM15.88 4.6V7.045H17.16C17.4333 7.045 17.67 7.015 17.87 6.955C18.0733 6.895 18.24 6.81167 18.37 6.705C18.5033 6.59833 18.6017 6.47 18.665 6.32C18.7283 6.16667 18.76 6 18.76 5.82C18.76 5.39667 18.6333 5.08833 18.38 4.895C18.1267 4.69833 17.7333 4.6 17.2 4.6H15.88ZM17.2 3.835C17.64 3.835 18.0183 3.87833 18.335 3.965C18.655 4.05167 18.9167 4.175 19.12 4.335C19.3267 4.495 19.4783 4.69167 19.575 4.925C19.6717 5.155 19.72 5.415 19.72 5.705C19.72 5.88167 19.6917 6.05167 19.635 6.215C19.5817 6.375 19.5 6.525 19.39 6.665C19.28 6.805 19.14 6.93167 18.97 7.045C18.8033 7.155 18.6067 7.245 18.38 7.315C18.9067 7.415 19.3017 7.60333 19.565 7.88C19.8317 8.15333 19.965 8.51333 19.965 8.96C19.965 9.26333 19.9083 9.54 19.795 9.79C19.685 10.04 19.5217 10.255 19.305 10.435C19.0917 10.615 18.8283 10.755 18.515 10.855C18.2017 10.9517 17.845 11 17.445 11H14.915V3.835H17.2ZM24.4817 7.915C24.4817 7.70833 24.4517 7.52 24.3917 7.35C24.3351 7.17667 24.2501 7.02833 24.1367 6.905C24.0267 6.77833 23.8917 6.68167 23.7317 6.615C23.5717 6.545 23.3901 6.51 23.1867 6.51C22.7601 6.51 22.4217 6.635 22.1717 6.885C21.9251 7.13167 21.7717 7.475 21.7117 7.915H24.4817ZM25.2017 10.29C25.0917 10.4233 24.9601 10.54 24.8067 10.64C24.6534 10.7367 24.4884 10.8167 24.3117 10.88C24.1384 10.9433 23.9584 10.99 23.7717 11.02C23.5851 11.0533 23.4001 11.07 23.2167 11.07C22.8667 11.07 22.5434 11.0117 22.2467 10.895C21.9534 10.775 21.6984 10.6017 21.4817 10.375C21.2684 10.145 21.1017 9.86167 20.9817 9.525C20.8617 9.18833 20.8017 8.80167 20.8017 8.365C20.8017 8.01167 20.8551 7.68167 20.9617 7.375C21.0717 7.06833 21.2284 6.80333 21.4317 6.58C21.6351 6.35333 21.8834 6.17667 22.1767 6.05C22.4701 5.92 22.8001 5.855 23.1667 5.855C23.4701 5.855 23.7501 5.90667 24.0067 6.01C24.2667 6.11 24.4901 6.25667 24.6767 6.45C24.8667 6.64 25.0151 6.87667 25.1217 7.16C25.2284 7.44 25.2817 7.76 25.2817 8.12C25.2817 8.26 25.2667 8.35333 25.2367 8.4C25.2067 8.44667 25.1501 8.47 25.0667 8.47H21.6817C21.6917 8.79 21.7351 9.06833 21.8117 9.305C21.8917 9.54167 22.0017 9.74 22.1417 9.9C22.2817 10.0567 22.4484 10.175 22.6417 10.255C22.8351 10.3317 23.0517 10.37 23.2917 10.37C23.5151 10.37 23.7067 10.345 23.8667 10.295C24.0301 10.2417 24.1701 10.185 24.2867 10.125C24.4034 10.065 24.5001 10.01 24.5767 9.96C24.6567 9.90667 24.7251 9.88 24.7817 9.88C24.8551 9.88 24.9117 9.90833 24.9517 9.965L25.2017 10.29ZM29.3249 6.77C29.2849 6.84333 29.2233 6.88 29.1399 6.88C29.0899 6.88 29.0333 6.86167 28.9699 6.825C28.9066 6.78833 28.8283 6.74833 28.7349 6.705C28.6449 6.65833 28.5366 6.61667 28.4099 6.58C28.2833 6.54 28.1333 6.52 27.9599 6.52C27.8099 6.52 27.6749 6.54 27.5549 6.58C27.4349 6.61667 27.3316 6.66833 27.2449 6.735C27.1616 6.80167 27.0966 6.88 27.0499 6.97C27.0066 7.05667 26.9849 7.15167 26.9849 7.255C26.9849 7.385 27.0216 7.49333 27.0949 7.58C27.1716 7.66667 27.2716 7.74167 27.3949 7.805C27.5183 7.86833 27.6583 7.925 27.8149 7.975C27.9716 8.02167 28.1316 8.07333 28.2949 8.13C28.4616 8.18333 28.6233 8.24333 28.7799 8.31C28.9366 8.37667 29.0766 8.46 29.1999 8.56C29.3233 8.66 29.4216 8.78333 29.4949 8.93C29.5716 9.07333 29.6099 9.24667 29.6099 9.45C29.6099 9.68333 29.5683 9.9 29.4849 10.1C29.4016 10.2967 29.2783 10.4683 29.1149 10.615C28.9516 10.7583 28.7516 10.8717 28.5149 10.955C28.2783 11.0383 28.0049 11.08 27.6949 11.08C27.3416 11.08 27.0216 11.0233 26.7349 10.91C26.4483 10.7933 26.2049 10.645 26.0049 10.465L26.2149 10.125C26.2416 10.0817 26.2733 10.0483 26.3099 10.025C26.3466 10.0017 26.3933 9.99 26.4499 9.99C26.5099 9.99 26.5733 10.0133 26.6399 10.06C26.7066 10.1067 26.7866 10.1583 26.8799 10.215C26.9766 10.2717 27.0933 10.3233 27.2299 10.37C27.3666 10.4167 27.5366 10.44 27.7399 10.44C27.9133 10.44 28.0649 10.4183 28.1949 10.375C28.3249 10.3283 28.4333 10.2667 28.5199 10.19C28.6066 10.1133 28.6699 10.025 28.7099 9.925C28.7533 9.825 28.7749 9.71833 28.7749 9.605C28.7749 9.465 28.7366 9.35 28.6599 9.26C28.5866 9.16667 28.4883 9.08833 28.3649 9.025C28.2416 8.95833 28.0999 8.90167 27.9399 8.855C27.7833 8.805 27.6216 8.75333 27.4549 8.7C27.2916 8.64667 27.1299 8.58667 26.9699 8.52C26.8133 8.45 26.6733 8.36333 26.5499 8.26C26.4266 8.15667 26.3266 8.03 26.2499 7.88C26.1766 7.72667 26.1399 7.54167 26.1399 7.325C26.1399 7.13167 26.1799 6.94667 26.2599 6.77C26.3399 6.59 26.4566 6.43333 26.6099 6.3C26.7633 6.16333 26.9516 6.055 27.1749 5.975C27.3983 5.895 27.6533 5.855 27.9399 5.855C28.2733 5.855 28.5716 5.90833 28.8349 6.015C29.1016 6.11833 29.3316 6.26167 29.5249 6.445L29.3249 6.77ZM32.2561 11.08C31.8561 11.08 31.5478 10.9683 31.3311 10.745C31.1178 10.5217 31.0111 10.2 31.0111 9.78V6.68H30.4011C30.3478 6.68 30.3028 6.665 30.2661 6.635C30.2294 6.60167 30.2111 6.55167 30.2111 6.485V6.13L31.0411 6.025L31.2461 4.46C31.2561 4.41 31.2778 4.37 31.3111 4.34C31.3478 4.30667 31.3944 4.29 31.4511 4.29H31.9011V6.035H33.3661V6.68H31.9011V9.72C31.9011 9.93333 31.9528 10.0917 32.0561 10.195C32.1594 10.2983 32.2928 10.35 32.4561 10.35C32.5494 10.35 32.6294 10.3383 32.6961 10.315C32.7661 10.2883 32.8261 10.26 32.8761 10.23C32.9261 10.2 32.9678 10.1733 33.0011 10.15C33.0378 10.1233 33.0694 10.11 33.0961 10.11C33.1428 10.11 33.1844 10.1383 33.2211 10.195L33.4811 10.62C33.3278 10.7633 33.1428 10.8767 32.9261 10.96C32.7094 11.04 32.4861 11.08 32.2561 11.08ZM37.2351 6.77C37.1951 6.84333 37.1334 6.88 37.0501 6.88C37.0001 6.88 36.9434 6.86167 36.8801 6.825C36.8167 6.78833 36.7384 6.74833 36.6451 6.705C36.5551 6.65833 36.4467 6.61667 36.3201 6.58C36.1934 6.54 36.0434 6.52 35.8701 6.52C35.7201 6.52 35.5851 6.54 35.4651 6.58C35.3451 6.61667 35.2417 6.66833 35.1551 6.735C35.0717 6.80167 35.0067 6.88 34.9601 6.97C34.9167 7.05667 34.8951 7.15167 34.8951 7.255C34.8951 7.385 34.9317 7.49333 35.0051 7.58C35.0817 7.66667 35.1817 7.74167 35.3051 7.805C35.4284 7.86833 35.5684 7.925 35.7251 7.975C35.8817 8.02167 36.0417 8.07333 36.2051 8.13C36.3717 8.18333 36.5334 8.24333 36.6901 8.31C36.8467 8.37667 36.9867 8.46 37.1101 8.56C37.2334 8.66 37.3317 8.78333 37.4051 8.93C37.4817 9.07333 37.5201 9.24667 37.5201 9.45C37.5201 9.68333 37.4784 9.9 37.3951 10.1C37.3117 10.2967 37.1884 10.4683 37.0251 10.615C36.8617 10.7583 36.6617 10.8717 36.4251 10.955C36.1884 11.0383 35.9151 11.08 35.6051 11.08C35.2517 11.08 34.9317 11.0233 34.6451 10.91C34.3584 10.7933 34.1151 10.645 33.9151 10.465L34.1251 10.125C34.1517 10.0817 34.1834 10.0483 34.2201 10.025C34.2567 10.0017 34.3034 9.99 34.3601 9.99C34.4201 9.99 34.4834 10.0133 34.5501 10.06C34.6167 10.1067 34.6967 10.1583 34.7901 10.215C34.8867 10.2717 35.0034 10.3233 35.1401 10.37C35.2767 10.4167 35.4467 10.44 35.6501 10.44C35.8234 10.44 35.9751 10.4183 36.1051 10.375C36.2351 10.3283 36.3434 10.2667 36.4301 10.19C36.5167 10.1133 36.5801 10.025 36.6201 9.925C36.6634 9.825 36.6851 9.71833 36.6851 9.605C36.6851 9.465 36.6467 9.35 36.5701 9.26C36.4967 9.16667 36.3984 9.08833 36.2751 9.025C36.1517 8.95833 36.0101 8.90167 35.8501 8.855C35.6934 8.805 35.5317 8.75333 35.3651 8.7C35.2017 8.64667 35.0401 8.58667 34.8801 8.52C34.7234 8.45 34.5834 8.36333 34.4601 8.26C34.3367 8.15667 34.2367 8.03 34.1601 7.88C34.0867 7.72667 34.0501 7.54167 34.0501 7.325C34.0501 7.13167 34.0901 6.94667 34.1701 6.77C34.2501 6.59 34.3667 6.43333 34.5201 6.3C34.6734 6.16333 34.8617 6.055 35.0851 5.975C35.3084 5.895 35.5634 5.855 35.8501 5.855C36.1834 5.855 36.4817 5.90833 36.7451 6.015C37.0117 6.11833 37.2417 6.26167 37.4351 6.445L37.2351 6.77ZM42.0013 7.915C42.0013 7.70833 41.9713 7.52 41.9113 7.35C41.8546 7.17667 41.7696 7.02833 41.6563 6.905C41.5463 6.77833 41.4113 6.68167 41.2513 6.615C41.0913 6.545 40.9096 6.51 40.7063 6.51C40.2796 6.51 39.9413 6.635 39.6913 6.885C39.4446 7.13167 39.2913 7.475 39.2313 7.915H42.0013ZM42.7213 10.29C42.6113 10.4233 42.4796 10.54 42.3263 10.64C42.1729 10.7367 42.0079 10.8167 41.8313 10.88C41.6579 10.9433 41.4779 10.99 41.2913 11.02C41.1046 11.0533 40.9196 11.07 40.7363 11.07C40.3863 11.07 40.0629 11.0117 39.7663 10.895C39.4729 10.775 39.2179 10.6017 39.0013 10.375C38.7879 10.145 38.6213 9.86167 38.5013 9.525C38.3813 9.18833 38.3213 8.80167 38.3213 8.365C38.3213 8.01167 38.3746 7.68167 38.4813 7.375C38.5913 7.06833 38.7479 6.80333 38.9513 6.58C39.1546 6.35333 39.4029 6.17667 39.6963 6.05C39.9896 5.92 40.3196 5.855 40.6863 5.855C40.9896 5.855 41.2696 5.90667 41.5263 6.01C41.7863 6.11 42.0096 6.25667 42.1963 6.45C42.3863 6.64 42.5346 6.87667 42.6413 7.16C42.7479 7.44 42.8013 7.76 42.8013 8.12C42.8013 8.26 42.7863 8.35333 42.7563 8.4C42.7263 8.44667 42.6696 8.47 42.5863 8.47H39.2013C39.2113 8.79 39.2546 9.06833 39.3313 9.305C39.4113 9.54167 39.5213 9.74 39.6613 9.9C39.8013 10.0567 39.9679 10.175 40.1613 10.255C40.3546 10.3317 40.5713 10.37 40.8113 10.37C41.0346 10.37 41.2263 10.345 41.3863 10.295C41.5496 10.2417 41.6896 10.185 41.8063 10.125C41.9229 10.065 42.0196 10.01 42.0963 9.96C42.1763 9.90667 42.2446 9.88 42.3013 9.88C42.3746 9.88 42.4313 9.90833 42.4713 9.965L42.7213 10.29ZM44.8145 3.635V11H43.9245V3.635H44.8145ZM47.1777 3.635V11H46.2877V3.635H47.1777ZM52.011 7.915C52.011 7.70833 51.981 7.52 51.921 7.35C51.8643 7.17667 51.7793 7.02833 51.666 6.905C51.556 6.77833 51.421 6.68167 51.261 6.615C51.101 6.545 50.9193 6.51 50.716 6.51C50.2893 6.51 49.951 6.635 49.701 6.885C49.4543 7.13167 49.301 7.475 49.241 7.915H52.011ZM52.731 10.29C52.621 10.4233 52.4893 10.54 52.336 10.64C52.1827 10.7367 52.0177 10.8167 51.841 10.88C51.6677 10.9433 51.4877 10.99 51.301 11.02C51.1143 11.0533 50.9293 11.07 50.746 11.07C50.396 11.07 50.0727 11.0117 49.776 10.895C49.4827 10.775 49.2277 10.6017 49.011 10.375C48.7977 10.145 48.631 9.86167 48.511 9.525C48.391 9.18833 48.331 8.80167 48.331 8.365C48.331 8.01167 48.3843 7.68167 48.491 7.375C48.601 7.06833 48.7577 6.80333 48.961 6.58C49.1643 6.35333 49.4127 6.17667 49.706 6.05C49.9993 5.92 50.3293 5.855 50.696 5.855C50.9993 5.855 51.2793 5.90667 51.536 6.01C51.796 6.11 52.0193 6.25667 52.206 6.45C52.396 6.64 52.5443 6.87667 52.651 7.16C52.7577 7.44 52.811 7.76 52.811 8.12C52.811 8.26 52.796 8.35333 52.766 8.4C52.736 8.44667 52.6793 8.47 52.596 8.47H49.211C49.221 8.79 49.2643 9.06833 49.341 9.305C49.421 9.54167 49.531 9.74 49.671 9.9C49.811 10.0567 49.9777 10.175 50.171 10.255C50.3643 10.3317 50.581 10.37 50.821 10.37C51.0443 10.37 51.236 10.345 51.396 10.295C51.5593 10.2417 51.6993 10.185 51.816 10.125C51.9327 10.065 52.0293 10.01 52.106 9.96C52.186 9.90667 52.2543 9.88 52.311 9.88C52.3843 9.88 52.441 9.90833 52.481 9.965L52.731 10.29ZM54.7492 6.95C54.9092 6.60333 55.1059 6.33333 55.3392 6.14C55.5726 5.94333 55.8576 5.845 56.1942 5.845C56.3009 5.845 56.4026 5.85667 56.4992 5.88C56.5992 5.90333 56.6876 5.94 56.7642 5.99L56.6992 6.655C56.6792 6.73833 56.6292 6.78 56.5492 6.78C56.5026 6.78 56.4342 6.77 56.3442 6.75C56.2542 6.73 56.1526 6.72 56.0392 6.72C55.8792 6.72 55.7359 6.74333 55.6092 6.79C55.4859 6.83667 55.3742 6.90667 55.2742 7C55.1776 7.09 55.0892 7.20333 55.0092 7.34C54.9326 7.47333 54.8626 7.62667 54.7992 7.8V11H53.9042V5.935H54.4142C54.5109 5.935 54.5776 5.95333 54.6142 5.99C54.6509 6.02667 54.6759 6.09 54.6892 6.18L54.7492 6.95Z"
      fill="#D0892F"
    />
    <path
      d="M11 3.06L9.13996 7.45L4.38996 7.86L7.99996 11L6.91996 15.63L11 13.18V14.34L5.41996 17.7L6.87996 11.35L1.95996 7.07L8.44996 6.5L11 0.5V3.06Z"
      fill="#D0892F"
    />
    <line x1="11" y1="13.5" x2="57" y2="13.5" stroke="#D0892F" />
  </svg>
);

const getDisplayName = (user: any) => {
  if (!user || user.isGuest) return "Guest";
  if (user.firstName && user.firstName.trim().length > 0) return user.firstName;
  if (user.name && !user.name.includes("@")) return user.name;
  if (user.email) return user.email.split("@")[0];
  return "User";
};

const CafeMenu: React.FC = () => {
  const history: any = useHistory();
  const location = useLocation();
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<MenuItem | null>(
    null,
  );

  const [selected] = useState<VegType | null>(null);
  const [MENU, setMENU] = useState<ApiMenuShape>({
    BEVERAGES: [],
    BAKERY: [],
  });
  const [activeTab, setActiveTab] = useState<keyof MenuShape>("BEVERAGES");
  const [cartPreloaded, setCartPreloaded] = useState(false);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [menuImagesPreloaded, setMenuImagesPreloaded] = useState(false);
  const [shopClosed, setShopClosed] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [shopId, setShopId] = useState<number | null>(null);
  const beveragesRef = useRef<HTMLDivElement | null>(null);
  const menuScrollRef = useRef<HTMLDivElement | null>(null);
  const productObserver = useRef<IntersectionObserver | null>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isProgrammaticScrollRef = useRef(false);
const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    wishlistItems,
    toggleWishlist,
    loading: wishlistLoading,
  } = useWishlist();
  const {
    cart,
    addToCart,
    decrementItem,
    setShopId: setCartShopId,
    refreshCart,
  } = useCart();
  const { storeCart, storeCartCount, clearStoreCartAll } = useStoreCart();
  const { isLoggedIn } = useAuth();

  // ── Store-cart conflict state ─────────────────────────────────────────────
  const [cafeConflictVisible, setCafeConflictVisible] = React.useState(false);
  const pendingCafeAddRef = React.useRef<() => void>(() => {});

  const guardCafeAdd = React.useCallback(
    (proceed: () => void) => {
      const storeHasItems =
        (storeCart?.items ?? []).length > 0 || storeCartCount > 0;
      if (storeHasItems) {
        pendingCafeAddRef.current = proceed;
        setCafeConflictVisible(true);
        return;
      }
      proceed();
    },
    [storeCart, storeCartCount],
  );

  const { online } = useNetworkStatus();

  const handleCafeConflictReplace = React.useCallback(async () => {
    setCafeConflictVisible(false);
    await clearStoreCartAll();
    pendingCafeAddRef.current();
    pendingCafeAddRef.current = () => {};
  }, [clearStoreCartAll]);

  const handleCafeConflictCancel = React.useCallback(() => {
    setCafeConflictVisible(false);
    pendingCafeAddRef.current = () => {};
  }, []);

  // ── Active cafe order guard ────────────────────────────────────────────────
  const [showBlockToast, setShowBlockToast] = React.useState(false);
  const blockToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { hasActiveOrder } = useActiveCafeOrder();
  const triggerBlockToast = React.useCallback(() => {
    setShowBlockToast(true);
    if (blockToastTimerRef.current) clearTimeout(blockToastTimerRef.current);
    blockToastTimerRef.current = setTimeout(
      () => setShowBlockToast(false),
      4000,
    );
  }, []);

  // Loader phase: fetch cart state before finishing loader
  useEffect(() => {
    async function preloadCart() {
      // Only attempt to refresh the server-side cart if the user is logged in.
      // Guests should not trigger a server call that may return 401 and redirect to /auth.
      try {
        if (typeof refreshCart === "function" && isLoggedIn) {
          await refreshCart();
        }
      } catch (err) {
        // ignore cart refresh errors — we still want to try loading menu
        console.warn("CafeMenu: refreshCart failed", err);
      }
      setCartPreloaded(true);
    }
    preloadCart();
  }, [refreshCart, isLoggedIn]);

  const [isRepeatOpen, setIsRepeatOpen] = useState(false);
  const [repeatProductId, setRepeatProductId] = useState<number | null>(null);
  const [repeatLastCustomizations, setRepeatLastCustomizations] = useState<
    any | null
  >(null);
  const [repeatProductName, setRepeatProductName] = useState<
    string | undefined
  >(undefined);
  const [repeatProductPrice, setRepeatProductPrice] = useState<
    number | undefined
  >(undefined);
  const [repeatProductSubtitle, setRepeatProductSubtitle] = useState<
    string | undefined
  >(undefined);
  const [repeatProductVegType, setRepeatProductVegType] = useState<
    VegType | undefined
  >(undefined);

  const handleAddClick = (item: MenuItem) => {
    guardCafeAdd(() => _handleAddClick(item));
  };

  const _handleAddClick = async (item: MenuItem) => {
    if (hasActiveOrder) {
      triggerBlockToast();
      return;
    }
    console.log("CafeMenu: add clicked", { shopId, productId: item.id });
    if (!shopId) {
      console.warn("CafeMenu: no shopId available, cannot open customization", {
        item,
      });
      return;
    }

    // check if an entry exists in cart; if yes, open RepeatCustomization
    const cartItems = cart?.items || [];
    let existing: any = null;
    for (let i = cartItems.length - 1; i >= 0; i--) {
      const ci = cartItems[i] as any;
      const pid = Number(
        ci?.productId ?? ci?.product?.id ?? ci?.product?.value?.id,
      );
      if (pid === Number(item.id)) {
        existing = ci;
        break;
      }
    }

    if (existing) {
      console.log(
        "CafeMenu: product exists in cart, opening RepeatCustomization",
        { productId: item.id, existing },
      );
      setRepeatProductId(Number(item.id));
      setRepeatLastCustomizations(
        (existing as any).customizations ??
          (existing as any).customization ??
          null,
      );
      setRepeatProductName(item.name);
      setRepeatProductPrice(item.price);
      setRepeatProductSubtitle(item.tagline ?? item.desc ?? undefined);
      setRepeatProductVegType(item.vegType);
      setIsRepeatOpen(true);
      return;
    }

    try {
      const detailed = await getSingleMenuItem(shopId, (item as any).id);

      // If product has no customizations, add directly to cart and skip opening the sheet
      const cust =
        (detailed as any)?.customizations ??
        (detailed as any)?.customization ??
        [];
      const hasCustomizations = Array.isArray(cust)
        ? cust.length > 0
        : Boolean(cust);

      if (!hasCustomizations) {
        try {
          await addToCart(Number((detailed as any).id), []);
          console.log(
            "CafeMenu: added product directly to cart (no customizations)",
            { productId: detailed.id },
          );
        } catch (err) {
          console.error("Failed addToCart (no customizations):", err);
        }
        return;
      }

      setCustomizingProduct(detailed);
      setIsCustomizationOpen(true);
      console.log("CafeMenu: opened customization for product", {
        productId: item.id,
      });
    } catch (err) {
      console.error("Customization error:", err);
    }
  };

  const handleIncrementClick = async (entry: any) => {
    if (hasActiveOrder) {
      triggerBlockToast();
      return;
    }
    console.log("CafeMenu: increment requested", {
      itemId: entry?.id,
      productId: entry?.productId ?? entry?.product?.id,
    });
    try {
      // Determine product id
      const pid = Number(
        entry?.productId ?? entry?.product?.id ?? entry?.product?.value?.id,
      );

      // Look up product details from loaded MENU for name/price/subtitle and to check customizations
      let foundItem: MenuItem | undefined;
      for (const cats of Object.values(MENU)) {
        for (const cat of cats as MenuCategory[]) {
          const match = cat.items?.find((i: MenuItem) => Number(i.id) === pid);
          if (match) {
            foundItem = match;
            break;
          }
        }
        if (foundItem) break;
      }

      // If product is known and has NO customizations, directly add to cart (skip RepeatCustomization)
      const previousCust =
        (entry as any).customizations ?? (entry as any).customization ?? null;
      const menuCust =
        (foundItem as any)?.customizations ??
        (foundItem as any)?.customization ??
        [];
      const hasCustomizations = Array.isArray(menuCust)
        ? menuCust.length > 0
        : Boolean(menuCust);

      if (!hasCustomizations) {
        console.log(
          "CafeMenu: increment - product has no customizations, adding directly",
          { pid, entry },
        );
        // Respect store-cart conflict guard
        guardCafeAdd(async () => {
          try {
            await addToCart(pid, previousCust ?? []);
          } catch (err) {
            console.error(
              "CafeMenu: failed to add increment (no customizations)",
              err,
            );
          }
        });
        return;
      }

      // Otherwise open RepeatCustomization so user can repeat or edit previous customization
      console.log("CafeMenu: opening RepeatCustomization for increment", {
        pid,
        entry,
      });
      setRepeatProductId(pid || null);
      setRepeatLastCustomizations(previousCust ?? null);
      setRepeatProductName(foundItem?.name);
      setRepeatProductPrice(foundItem?.price);
      setRepeatProductSubtitle(
        foundItem?.tagline ?? foundItem?.desc ?? undefined,
      );
      setRepeatProductVegType(foundItem?.vegType);
      setIsRepeatOpen(true);
    } catch (err) {
      console.error("CafeMenu: increment failed", err);
    }
  };

  const handleDecrementClick = async (entry: any) => {
    console.log("CafeMenu: decrement requested", {
      itemId: entry?.id,
      productId: entry?.productId ?? entry?.product?.id,
    });
    try {
      await decrementItem(entry.id);
      console.log("CafeMenu: decrement completed", { itemId: entry.id });
    } catch (err) {
      console.error("CafeMenu: decrement failed", err);
    }
  };
  const [isMenuIndexOpen, setIsMenuIndexOpen] = useState(false);
  const user = getCurrentUser();
  const displayName = getDisplayName(user);
  // toggleWishlist provided by context
  useEffect(() => {
    const loadMenu = async () => {
      try {
        setMenuLoaded(false);

        console.log("🚀 Loading cafe menu...");

        const shop = await getSingleShop();
        console.log("🏪 Shop:", shop);
        setShopId(shop.id);
        // Determine if shop is currently closed based on timings + live status
        const closed = !isShopOpen(shop);
        console.log(
          "🔒 [CafeMenu] shopClosed =",
          closed,
          "| isShopOpen field =",
          shop.isShopOpen,
        );
        setShopClosed(closed);
        try {
          // inform cart context of the active shop so Cart page can classify items
          setCartShopId?.(shop.id);
          console.log("CafeMenu: set cart context shopId", shop.id);
        } catch (e) {
          console.warn("CafeMenu: failed to set cart shopId", e);
        }

        const [items, bestSellerIds] = await Promise.all([
          getShopMenu(shop.id),
          getBestSellerIds(shop.id),
        ]);
        console.log("🍽 Raw Menu Items:", items);
        console.log("⭐ Best Seller IDs:", bestSellerIds);

        const structuredMenu = transformToMenuShape(items);
        console.log("🎯 Structured Menu:", structuredMenu);

        const markBestSellers = (cats: MenuCategory[]): MenuCategory[] =>
          cats.map((cat) => ({
            ...cat,
            items: cat.items.map((item) => ({
              ...item,
              bestseller: bestSellerIds.has(Number(item.id ?? 0)),
            })) as MenuItem[],
          }));

        setMENU({
          BEVERAGES: markBestSellers(
            structuredMenu.BEVERAGES || [],
          ) as ApiMenuShape["BEVERAGES"],
          BAKERY: markBestSellers(
            structuredMenu.BAKERY || [],
          ) as ApiMenuShape["BAKERY"],
        });
        // Preload cafe menu images so UI only shows once images are ready (or timeout)
        (async () => {
          try {
            const urls: string[] = [];
            const gather = (cats?: ApiMenuShape["BEVERAGES"]) => {
              if (!cats) return;
              for (const cat of cats) {
                for (const it of (cat as any).items || []) {
                  if (it?.image) urls.push(it.image);
                }
              }
            };
            gather(structuredMenu.BEVERAGES || ([] as any));
            gather(structuredMenu.BAKERY || ([] as any));

            // make unique
            const uniq = Array.from(new Set(urls.filter(Boolean)));

            if (uniq.length === 0) {
              setMenuImagesPreloaded(true);
              return;
            }

            await new Promise<void>((resolve) => {
              let remaining = uniq.length;
              let finished = false;
              const tryFinish = () => {
                if (finished) return;
                if (remaining <= 0) {
                  finished = true;
                  resolve();
                }
              };

              uniq.forEach((u) => {
                try {
                  const img = new Image();
                  img.onload = () => {
                    remaining -= 1;
                    tryFinish();
                  };
                  img.onerror = () => {
                    remaining -= 1;
                    tryFinish();
                  };
                  img.src = u;
                } catch {
                  remaining -= 1;
                  tryFinish();
                }
              });

              setTimeout(() => {
                if (finished) return;
                finished = true;
                resolve();
              }, 7000);
            });

            setMenuImagesPreloaded(true);
          } catch (err) {
            console.warn("CafeMenu: image preload failed", err);
            setMenuImagesPreloaded(true);
          }
        })();
      } catch (error) {
        console.error("❌ Menu load failed:", error);
      } finally {
        setMenuLoaded(true);
        // Safety: if no items loaded, ensure image preload flag is set
        setMenuImagesPreloaded(true);
      }
    };

    loadMenu();
  }, [setCartShopId]);

  const openProduct = async (item: MenuItem) => {
    if (item.fullDesc && item.fullDesc.trim().length > 0) {
      setSelectedProduct(item);
      return;
    }

    if (!shopId) {
      setSelectedProduct(item);
      return;
    }

    try {
      const detailed = await getSingleMenuItem(shopId, (item as any).id);

      const merged: MenuItem = {
        ...item,

        desc: (detailed as any).desc || item.desc,
        fullDesc: (detailed as any).fullDesc || item.fullDesc,
        price: (detailed as any).price ?? item.price,
        originalPrice: (detailed as any).originalPrice ?? item.originalPrice,
        discountedPrice:
          (detailed as any).discountedPrice ?? item.discountedPrice,
        image: (detailed as any).image || item.image,
        vegType: (detailed as any).vegType || item.vegType,
        inStock: (detailed as any).inStock ?? item.inStock,
        bestseller: (detailed as any).bestseller ?? item.bestseller,
      };

      setSelectedProduct(merged);
    } catch (err) {
      console.error("Failed to fetch single menu item:", err);
      setSelectedProduct(item);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
  if (tab === "BEVERAGES" || tab === "BAKERY") {
  setActiveTab(tab);
  isProgrammaticScrollRef.current = true;                          // ADD
  if (programmaticScrollTimerRef.current)                          // ADD
    clearTimeout(programmaticScrollTimerRef.current);              // ADD

  const tryScroll = (attempt = 0) => {
        const el = document.querySelector(
          `[data-tab="${tab}"]`,
        ) as HTMLElement | null;
        if (el) {
          // scroll the element into view inside the menu scroll container if available
          try {
            const container = menuScrollRef.current;
            if (container) {
              // compute relative position and scroll the container
              const containerRect = container.getBoundingClientRect();
              const elRect = el.getBoundingClientRect();
              const relativeTop = elRect.top - containerRect.top;
              container.scrollTo({
                top: Math.max(0, relativeTop + container.scrollTop - 10),
                behavior: "smooth",
              });
            } else {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          } catch (e) {
            // swallow scroll errors but log for diagnostics
            console.warn("CafeMenu: scroll failed", e);
          }
          return;
        }

        // retry a few times while menu is still loading/rendering
        if (attempt < 8) {
          setTimeout(() => tryScroll(attempt + 1), 150);
        }
      };

    setTimeout(() => tryScroll(0), 120);

  programmaticScrollTimerRef.current = setTimeout(() => {         // ADD
    isProgrammaticScrollRef.current = false;                      // ADD
  }, 1200);                                                       // ADD (longer since scroll starts later)
}
  }, [location, menuLoaded]);
useEffect(() => {
  if (!menuLoaded || !menuScrollRef.current) return;

  productObserver.current?.disconnect();

  productObserver.current = new IntersectionObserver(
    (entries) => {
      if (isProgrammaticScrollRef.current) return;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const tab = entry.target.getAttribute("data-tab");
        if (tab) setActiveTab(tab as keyof MenuShape);
      });
    },
    {
      root: menuScrollRef.current,
      threshold: 0,
      rootMargin: "0px 0px -80% 0px",
    },
  );

  return () => productObserver.current?.disconnect();
}, [menuLoaded]);

  const flattenCategories = (categories?: MenuCategory[]) => {
    if (!categories) return [];
    return categories.filter((cat) => cat?.items?.length > 0);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : !menuLoaded ||
          !cartPreloaded ||
          !menuImagesPreloaded ? (
          <div className={styles.loaderWrapper}>
            <img src="/12.gif" alt="Loading" />
            {/* <p>Loading menu...</p> */}
          </div>
        ) : (
          <div className={styles.main}>
            <div className={styles.MainContainer}>
              <div className={styles.StickyHeader}>
                <div className={styles.Top}>
                  <div className={styles.TopLeft}>
                    <h3>Hello {displayName}</h3>

                    <p>Let’s brew something perfect today.</p>
                  </div>
                  <div className={styles.TopRight}>
                    <div
                      className={styles.Rewards}
                      onClick={() => {
                        if (user?.isGuest) history.push("/auth");
                        else history.push("/rewards");
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          if (user?.isGuest) history.push("/auth");
                          else history.push("/rewards");
                        }
                      }}
                    >
                      <svg
                        width="35"
                        height="35"
                        viewBox="0 0 35 35"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M24.5371 17.6977H18.6977V25.6047H23.1681C23.5312 25.6046 23.8796 25.4599 24.1364 25.2031C24.3931 24.9463 24.5371 24.5978 24.5371 24.2347V17.6977ZM11.4629 24.2347C11.4629 24.5978 11.6069 24.9463 11.8636 25.2031C12.1204 25.4599 12.4688 25.6046 12.8319 25.6047H17.3023V17.6977H11.4629V24.2347ZM26.6047 13.8995C26.6047 13.714 26.4541 13.5634 26.2685 13.5634H18.6977V16.3023H26.2685C26.4541 16.3023 26.6047 16.1517 26.6047 15.9662V13.8995ZM9.39535 15.9662C9.39535 16.1517 9.54593 16.3023 9.73147 16.3023H17.3023V13.5634H9.73147C9.54593 13.5634 9.39535 13.714 9.39535 13.8995V15.9662ZM24.5371 10.2822C24.5371 9.78192 24.3385 9.30232 23.9847 8.94858C23.631 8.59484 23.1514 8.39535 22.6512 8.39535H22.6394C21.8921 8.38233 21.0957 8.74145 20.3656 9.55269C19.782 10.2011 19.2836 11.0955 18.9257 12.1681H22.6512C23.1514 12.1681 23.631 11.9694 23.9847 11.6157C24.3385 11.262 24.537 10.7824 24.5371 10.2822ZM11.4629 10.2822C11.463 10.7824 11.6615 11.262 12.0153 11.6157C12.369 11.9694 12.8486 12.1681 13.3488 12.1681H17.0743C16.7164 11.0955 16.218 10.2011 15.6344 9.55269C14.9043 8.74145 14.1079 8.38233 13.3606 8.39535L13.3488 8.39626V8.39535C12.8486 8.39535 12.369 8.59484 12.0153 8.94858C11.6615 9.30232 11.4629 9.78192 11.4629 10.2822ZM25.9324 10.2822C25.9324 10.9619 25.7211 11.6193 25.3356 12.1681H26.2685C27.2247 12.1681 28 12.9434 28 13.8995V15.9662C28 16.9224 27.2247 17.6977 26.2685 17.6977H25.9324V24.2347C25.9324 24.968 25.6415 25.6721 25.123 26.1906C24.6045 26.7089 23.9012 27 23.1681 27H12.8319C12.0988 27 11.3955 26.7089 10.877 26.1906C10.3585 25.6721 10.0676 24.968 10.0676 24.2347V17.6977H9.73147C8.77533 17.6977 8 16.9224 8 15.9662V13.8995C8 12.9434 8.77533 12.1681 9.73147 12.1681H10.6644C10.2789 11.6193 10.0676 10.9619 10.0676 10.2822C10.0676 9.41184 10.4133 8.57744 11.0287 7.96203C11.6441 7.34661 12.4785 7 13.3488 7V7.00182C14.591 6.98424 15.7448 7.59076 16.671 8.61973C17.1929 9.19967 17.6395 9.90743 18 10.7055C18.3605 9.90743 18.8071 9.19967 19.329 8.61973C20.2552 7.59076 21.409 6.98424 22.6512 7.00182V7C23.5215 7 24.3559 7.34661 24.9713 7.96203C25.5867 8.57744 25.9324 9.41184 25.9324 10.2822Z"
                          fill="white"
                        />
                      </svg>
                    </div>
                    <div
                      className={styles.Notifications}
                      onClick={() => history.push("/my-account")}
                    >
                      <svg
                        width="35"
                        height="35"
                        viewBox="0 0 35 35"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M21.8109 13.4114C21.8109 11.0306 19.8814 9.10016 17.5006 9.09997C15.1197 9.09997 13.1892 11.0304 13.1892 13.4114C13.1894 15.7921 15.1198 17.7217 17.5006 17.7217C19.8812 17.7215 21.8107 15.792 21.8109 13.4114ZM23.4109 13.4114C23.4107 16.6756 20.7649 19.3215 17.5006 19.3217C14.2361 19.3217 11.5894 16.6758 11.5892 13.4114C11.5892 10.1468 14.236 7.5 17.5006 7.5C20.765 7.50019 23.4109 10.1469 23.4109 13.4114Z"
                          fill="white"
                        />
                        <path
                          d="M24.8775 26.7006C24.8775 24.744 24.1007 22.8666 22.7171 21.483C21.3337 20.0996 19.457 19.3227 17.5006 19.3226C15.5439 19.3226 13.6665 20.0994 12.2829 21.483C10.8994 22.8666 10.1226 24.744 10.1226 26.7006C10.1224 27.1423 9.76427 27.5006 9.32257 27.5006C8.88086 27.5006 8.52277 27.1423 8.52258 26.7006C8.52258 24.3196 9.46807 22.0354 11.1517 20.3518C12.8353 18.6681 15.1195 17.7227 17.5006 17.7227C19.8814 17.7227 22.1648 18.6683 23.8484 20.3518C25.532 22.0354 26.4775 24.3196 26.4775 26.7006C26.4773 27.1423 26.1192 27.5006 25.6775 27.5006C25.236 27.5004 24.8777 27.1422 24.8775 26.7006Z"
                          fill="white"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className={styles.Middle}>
                  {/* <div className={styles.MiddleTop}>
                {(["Veg", "NonVeg", "Egg", "Vegan"] as VegType[]).map((v) => (
                  <button
                    key={v}
                    className={`${styles[v]} ${
                      selected === v ? styles.active : ""
                    }`}
                    onClick={() =>
                      setSelected((prev) => (prev === v ? null : v))
                    }
                  >
                    {v === "NonVeg" ? "Non-Veg" : v}
                  </button>
                ))}
              </div> */}

                  <div className={styles.MiddleBottom}>
                    {TAB_ORDER.filter((t) =>
                      Object.prototype.hasOwnProperty.call(MENU, t),
                    ).map((tab) => (
                      <button
                        key={tab}
                        className={`${styles[tab]} ${
                          activeTab === tab ? styles.activeTab : ""
                        }`}
                       onClick={() => {
  setActiveTab(tab);
  const el = document.querySelector(
    `[data-tab="${tab}"]`,
  ) as HTMLElement | null;
  if (!el || !menuScrollRef.current) return;

  isProgrammaticScrollRef.current = true;                         // ADD
  if (programmaticScrollTimerRef.current)                         // ADD
    clearTimeout(programmaticScrollTimerRef.current);             // ADD

  const container = menuScrollRef.current;
  const containerRect =
    container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const relativeTop =
    elRect.top -
    containerRect.top +
    container.scrollTop;
  container.scrollTo({
    top: Math.max(0, relativeTop),
    behavior: "smooth",
  });

  programmaticScrollTimerRef.current = setTimeout(() => {        // ADD
    isProgrammaticScrollRef.current = false;                     // ADD
  }, 800);                                                       // ADD
}}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.Bottom} ref={menuScrollRef}>
                <div ref={beveragesRef}>
                  {MENU.BEVERAGES.length === 0 ? (
                    <div
                      className={styles.ComingSoon}
                      data-tab="BEVERAGES"
                      ref={(el) => {
                        if (el && productObserver.current) {
                          productObserver.current.observe(el);
                        }
                      }}
                    >
                      <h2> Coming Soon</h2>
                      <p>We’re brewing something special for you</p>
                    </div>
                  ) : (
                    flattenCategories(MENU.BEVERAGES).map((cat, catIndex) => {
                      const filteredItems = cat.items.filter(
                        (item) => !selected || item.vegType === selected,
                      );

                      if (filteredItems.length === 0) return null;

                      const CatClass =
                        catIndex === 0
                          ? styles.CatOne
                          : catIndex === 1
                          ? styles.CatTwo
                          : styles.CatThree;

                      return (
                        <div key={`bev-${catIndex}`} className={CatClass}>
                         <div
  className={styles.TopHeading}
  data-tab="BEVERAGES"
  ref={(el) => {
    categoryRefs.current[cat.title] = el;
    if (el && productObserver.current) {
      productObserver.current.observe(el);
    }
  }}
>
                            <h3>{cat.title}</h3>
                          </div>

                          <div className={styles.Items}>
                            {filteredItems.map(
                              (item: MenuItem, index: number) => (
                                <React.Fragment key={index}>
                                  <div
                                    className={`${styles.ItemCard} ${
                                      !item.inStock ? styles.OutOfStock : ""
                                    } ${shopClosed ? styles.ShopClosed : ""}`}
                                    data-tab="BEVERAGES"
                                    ref={(el) => {
                                      if (
                                        el &&
                                        productObserver.current &&
                                        index === 0
                                      ) {
                                        productObserver.current.observe(el);
                                      }
                                    }}
                                  >
                                    <div
                                      className={styles.ItemCardLeft}
                                      onClick={() => {
                                        if (!item.inStock) return;
                                        openProduct(item);
                                      }}
                                    >
                                      <img
                                        src={item.image || placeholderimage}
                                        alt={item.name}
                                      />
                                      {item.originalPrice &&
                                        item.discountedPrice && (
                                          <div className={styles.Offerbadge}>
                                            <p>OFFER</p>
                                          </div>
                                        )}
                                    </div>

                                    <div className={styles.ItemCardRight}>
                                      <div
                                        className={styles.ItemCardRightTopvee}
                                      >
                                        <div
                                          className={styles.ItemCardRightTop}
                                        >
                                          <div className={styles.badges}>
                                            <div
                                              className={
                                                styles.VegandNonVegBadge
                                              }
                                            >
                                              <VegTypeIcon
                                                type={item.vegType}
                                              />
                                            </div>
                                            {item.bestseller && (
                                              <div
                                                className={
                                                  styles.BestSellerBadge
                                                }
                                              >
                                                <BestSellerIcon />
                                              </div>
                                            )}
                                          </div>

                                          <h2 onClick={() => openProduct(item)}>
                                            {item.name}
                                          </h2>
                                          <p>{item.tagline || item.desc}</p>
                                        </div>
                                        {isLoggedIn && (
                                          <div
                                            className={styles.WishListIcon}
                                            onClick={(e) => {
                                              e.stopPropagation();

                                              if (!item.id) {
                                                console.warn(
                                                  "⚠️ Missing item.id",
                                                  item,
                                                );
                                                return;
                                              }

                                              console.log(
                                                "❤️ Clicking wishlist for product:",
                                                item.id,
                                              );

                                              toggleWishlist(Number(item.id));
                                            }}
                                          >
                                            <svg
                                              width="22"
                                              height="20"
                                              viewBox="-1 -1 22 20"
                                              preserveAspectRatio="xMidYMid meet"
                                            >
                                              <path
                                                d="M12.8225 0.162502C13.9681 -0.112739 15.1716 -0.0369827 16.2727 0.379481C17.3737 0.796003 18.3203 1.53404 18.9861 2.49459C19.6513 3.4543 20.005 4.59101 19.9999 5.75377L19.9954 5.97792C19.8997 8.2785 18.3472 9.96547 17.0049 11.2903L16.9967 11.2984L11.8977 16.1661C11.6649 16.4206 11.3825 16.6263 11.0665 16.7695C10.7367 16.9189 10.3783 16.9977 10.0154 17C9.65262 17.0022 9.29326 16.9282 8.96164 16.783C8.63969 16.6419 8.35092 16.4367 8.11317 16.1805L3.00326 11.2975L2.99509 11.2903C1.65337 9.96607 0.100309 8.28752 0.00454214 5.97881L0 5.75377C2.1614e-05 4.59275 0.357267 3.45841 1.0238 2.50176C1.69032 1.54527 2.63536 0.811087 3.73364 0.39562C4.83197 -0.0198101 6.03215 -0.096816 7.17567 0.175054C8.25275 0.431183 9.23198 0.984995 9.99907 1.77012C10.7642 0.980134 11.7438 0.421646 12.8225 0.162502Z"
                                                fill={
                                                  item.id &&
                                                  wishlistItems.includes(
                                                    item.id,
                                                  )
                                                    ? "#E53935"
                                                    : "transparent"
                                                }
                                                stroke={
                                                  item.id &&
                                                  wishlistItems.includes(
                                                    item.id,
                                                  )
                                                    ? "#E53935"
                                                    : "#BDBDBD"
                                                }
                                                strokeWidth="1.5"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                      </div>

                                      <div
                                        className={
                                          styles.ItemCardRightBottomveee
                                        }
                                      >
                                        <div
                                          className={styles.ItemCardRightBottom}
                                        >
                                          {item.originalPrice &&
                                          item.discountedPrice ? (
                                            <div
                                              className={styles.priceDetailsss}
                                            >
                                              <span
                                                style={{
                                                  textDecoration:
                                                    "line-through",
                                                  color: "#8C8C8C",
                                                  fontSize: "12px",
                                                  fontWeight: 500,
                                                  fontFamily: "var(--lato)",
                                                }}
                                              >
                                                AED {item.originalPrice}
                                              </span>
                                              <h2>
                                                AED {item.discountedPrice}
                                              </h2>
                                            </div>
                                          ) : (
                                            <h2>AED {item.price}</h2>
                                          )}
                                        </div>
                                        <div className={styles.AddToCartButton}>
                                          {item.inStock ? (
                                            <>
                                              {item.customizations &&
                                                item.customizations.length >
                                                  0 && <p>Customizable</p>}

                                              {(() => {
                                                // aggregate quantity for this product across all customizations
                                                const pidNum = Number(item.id);
                                                const matching = (
                                                  cart?.items || []
                                                ).filter((ci: any) => {
                                                  const pid = Number(
                                                    ci?.productId ??
                                                      ci?.product?.id ??
                                                      ci?.product?.value?.id,
                                                  );
                                                  return pid === pidNum;
                                                });
                                                const totalQty =
                                                  matching.reduce(
                                                    (acc: number, it: any) =>
                                                      acc + (it.quantity || 0),
                                                    0,
                                                  );

                                                if (totalQty > 0) {
                                                  // pick the most recent entry for increment/decrement handlers (last match)
                                                  const entry =
                                                    matching[
                                                      matching.length - 1
                                                    ];
                                                  return (
                                                    <div
                                                      className={
                                                        styles.QuantitySelector
                                                      }
                                                    >
                                                      <button
                                                        onClick={() =>
                                                          handleDecrementClick(
                                                            entry,
                                                          )
                                                        }
                                                      >
                                                        -
                                                      </button>
                                                      <span>{totalQty}</span>
                                                      <button
                                                        onClick={() =>
                                                          handleIncrementClick(
                                                            entry,
                                                          )
                                                        }
                                                      >
                                                        +
                                                      </button>
                                                    </div>
                                                  );
                                                }

                                                // no entry -> ADD button opens customization flow
                                                return (
                                                  <button
                                                    onClick={() =>
                                                      handleAddClick(item)
                                                    }
                                                  >
                                                    ADD +
                                                  </button>
                                                );
                                              })()}
                                            </>
                                          ) : (
                                            <button
                                              className={
                                                styles.OutOfStockButton
                                              }
                                              disabled
                                            >
                                              Out of stock
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={styles.Line}></div>
                                </React.Fragment>
                              ),
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div>
                  {!MENU.BAKERY || MENU.BAKERY.length === 0 ? (
                    <div
                      className={styles.ComingSoon}
                      data-tab="BAKERY"
                      ref={(el) => {
                        if (el && productObserver.current) {
                          productObserver.current.observe(el);
                        }
                      }}
                    >
                      <h2>Bakery Coming Soon</h2>
                      <p>We’re brewing something special for you</p>
                    </div>
                  ) : (
                    flattenCategories(MENU.BAKERY).map((cat, catIndex) => {
                      const filteredItems = cat.items.filter(
                        (item) => !selected || item.vegType === selected,
                      );

                      if (filteredItems.length === 0) return null;

                      const CatClass =
                        catIndex === 0
                          ? styles.CatOne
                          : catIndex === 1
                          ? styles.CatTwo
                          : styles.CatThree;

                      return (
                        <div
                          key={`bak-${catIndex}`}
                          className={CatClass}
                          data-tab="BAKERY"
                          ref={(el) => {
                            if (
                              el &&
                              productObserver.current &&
                              catIndex === 0
                            ) {
                              productObserver.current.observe(el);
                            }
                          }}
                        >
                        <div
  className={styles.TopHeading}
  data-tab="BAKERY"
  ref={(el) => {
    categoryRefs.current[cat.title] = el;
    if (el && productObserver.current) {
      productObserver.current.observe(el);
    }
  }}
>
                            <h3>{cat.title}</h3>
                          </div>

                          <div className={styles.Items}>
                            {filteredItems.map(
                              (item: MenuItem, index: number) => (
                                <React.Fragment key={index}>
                                  <div
                                    className={`${styles.ItemCard} ${
                                      !item.inStock ? styles.OutOfStock : ""
                                    } ${shopClosed ? styles.ShopClosed : ""}`}
                                    data-tab="BAKERY"
                                    ref={(el) => {
                                      if (
                                        el &&
                                        productObserver.current &&
                                        index === 0
                                      ) {
                                        productObserver.current.observe(el);
                                      }
                                    }}
                                  >
                                    <div
                                      className={styles.ItemCardLeft}
                                      onClick={() => {
                                        if (!item.inStock) return;
                                        openProduct(item);
                                      }}
                                    >
                                      <img
                                        src={item.image || placeholderimage}
                                        alt={item.name}
                                      />
                                      {item.originalPrice &&
                                        item.discountedPrice && (
                                          <div className={styles.Offerbadge}>
                                            <p>OFFER</p>
                                          </div>
                                        )}
                                    </div>

                                    <div className={styles.ItemCardRight}>
                                      <div
                                        className={styles.ItemCardRightTopvee}
                                      >
                                        <div
                                          className={styles.ItemCardRightTop}
                                        >
                                          <div className={styles.badges}>
                                            <div
                                              className={
                                                styles.VegandNonVegBadge
                                              }
                                            >
                                              <VegTypeIcon
                                                type={item.vegType}
                                              />
                                            </div>
                                            {item.bestseller && (
                                              <div
                                                className={
                                                  styles.BestSellerBadge
                                                }
                                              >
                                                <BestSellerIcon />
                                              </div>
                                            )}
                                          </div>

                                          <h2 onClick={() => openProduct(item)}>
                                            {item.name}
                                          </h2>
                                          <p>{item.tagline || item.desc}</p>
                                        </div>
                                        {isLoggedIn && (
                                          <div
                                            className={styles.WishListIcon}
                                            onClick={(e) => {
                                              e.stopPropagation();

                                              if (!item.id) {
                                                console.warn(
                                                  "⚠️ Missing item.id",
                                                  item,
                                                );
                                                return;
                                              }

                                              console.log(
                                                "❤️ Clicking wishlist for product:",
                                                item.id,
                                              );

                                              toggleWishlist(Number(item.id));
                                            }}
                                          >
                                            <svg
                                              width="22"
                                              height="20"
                                              viewBox="-1 -1 22 20"
                                              preserveAspectRatio="xMidYMid meet"
                                            >
                                              <path
                                                d="M12.8225 0.162502C13.9681 -0.112739 15.1716 -0.0369827 16.2727 0.379481C17.3737 0.796003 18.3203 1.53404 18.9861 2.49459C19.6513 3.4543 20.005 4.59101 19.9999 5.75377L19.9954 5.97792C19.8997 8.2785 18.3472 9.96547 17.0049 11.2903L16.9967 11.2984L11.8977 16.1661C11.6649 16.4206 11.3825 16.6263 11.0665 16.7695C10.7367 16.9189 10.3783 16.9977 10.0154 17C9.65262 17.0022 9.29326 16.9282 8.96164 16.783C8.63969 16.6419 8.35092 16.4367 8.11317 16.1805L3.00326 11.2975L2.99509 11.2903C1.65337 9.96607 0.100309 8.28752 0.00454214 5.97881L0 5.75377C2.1614e-05 4.59275 0.357267 3.45841 1.0238 2.50176C1.69032 1.54527 2.63536 0.811087 3.73364 0.39562C4.83197 -0.0198101 6.03215 -0.096816 7.17567 0.175054C8.25275 0.431183 9.23198 0.984995 9.99907 1.77012C10.7642 0.980134 11.7438 0.421646 12.8225 0.162502Z"
                                                fill={
                                                  item.id &&
                                                  wishlistItems.includes(
                                                    item.id,
                                                  )
                                                    ? "#E53935"
                                                    : "transparent"
                                                }
                                                stroke={
                                                  item.id &&
                                                  wishlistItems.includes(
                                                    item.id,
                                                  )
                                                    ? "#E53935"
                                                    : "#BDBDBD"
                                                }
                                                strokeWidth="1.5"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      <div
                                        className={
                                          styles.ItemCardRightBottomveee
                                        }
                                      >
                                        <div
                                          className={styles.ItemCardRightBottom}
                                        >
                                          {item.originalPrice &&
                                          item.discountedPrice ? (
                                            <div
                                              className={styles.priceDetailsss}
                                            >
                                              <span
                                                style={{
                                                  textDecoration:
                                                    "line-through",
                                                  color: "#8C8C8C",
                                                  fontSize: "12px",
                                                }}
                                              >
                                                AED {item.originalPrice}
                                              </span>
                                              <h2>
                                                AED {item.discountedPrice}
                                              </h2>
                                            </div>
                                          ) : (
                                            <h2>AED {item.price}</h2>
                                          )}
                                        </div>
                                        <div className={styles.AddToCartButton}>
                                          {item.inStock ? (
                                            <>
                                              {item.customizations &&
                                                item.customizations.length >
                                                  0 && <p>Customizable</p>}
                                              {(() => {
                                                const pidNum = Number(item.id);
                                                const matching = (
                                                  cart?.items || []
                                                ).filter((ci: any) => {
                                                  const pid = Number(
                                                    ci?.productId ??
                                                      ci?.product?.id ??
                                                      ci?.product?.value?.id,
                                                  );
                                                  return pid === pidNum;
                                                });
                                                const totalQty =
                                                  matching.reduce(
                                                    (acc: number, it: any) =>
                                                      acc + (it.quantity || 0),
                                                    0,
                                                  );

                                                if (totalQty > 0) {
                                                  const entry =
                                                    matching[
                                                      matching.length - 1
                                                    ];
                                                  return (
                                                    <div
                                                      className={
                                                        styles.QuantitySelector
                                                      }
                                                    >
                                                      <button
                                                        onClick={() =>
                                                          handleDecrementClick(
                                                            entry,
                                                          )
                                                        }
                                                      >
                                                        -
                                                      </button>
                                                      <span>{totalQty}</span>
                                                      <button
                                                        onClick={() =>
                                                          handleIncrementClick(
                                                            entry,
                                                          )
                                                        }
                                                      >
                                                        +
                                                      </button>
                                                    </div>
                                                  );
                                                }

                                                return (
                                                  <button
                                                    onClick={() =>
                                                      handleAddClick(item)
                                                    }
                                                  >
                                                    ADD +
                                                  </button>
                                                );
                                              })()}
                                            </>
                                          ) : (
                                            <button
                                              className={
                                                styles.OutOfStockButton
                                              }
                                              disabled
                                            >
                                              Out of stock
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={styles.Line}></div>
                                </React.Fragment>
                              ),
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {menuLoaded && cartPreloaded && !wishlistLoading && (
          <div
            className={styles.MenuIndexButton}
            onClick={() => setIsMenuIndexOpen(true)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.5 2.48635C16.5 2.25522 16.4467 2.02719 16.3441 1.82008C16.2414 1.61297 16.0924 1.43238 15.9084 1.2924C15.7245 1.15242 15.5107 1.05684 15.2837 1.01312C15.0568 0.969398 14.8228 0.978719 14.6 1.04036L4.1 3.95736C3.78438 4.04468 3.506 4.2329 3.30738 4.49328C3.10876 4.75365 3.0008 5.07187 3 5.39935V21.5124C2.9998 21.7436 3.05305 21.9717 3.1556 22.179C3.25816 22.3862 3.40723 22.5669 3.59118 22.707C3.77513 22.8471 3.98898 22.9428 4.21602 22.9865C4.44306 23.0303 4.67715 23.021 4.9 22.9594L15.4 19.5694C15.7163 19.4818 15.9951 19.293 16.1938 19.0318C16.3925 18.7707 16.5001 18.4515 16.5 18.1234V2.48635Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.5 23.0117H19.5C19.8978 23.0117 20.2794 22.8537 20.5607 22.5724C20.842 22.2911 21 21.9095 21 21.5117V5.76172C21 5.36389 20.842 4.98236 20.5607 4.70106C20.2794 4.41975 19.8978 4.26172 19.5 4.26172H16.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        {isMenuIndexOpen && (
          <div
            className={styles.MenuIndexOverlay}
            onClick={() => setIsMenuIndexOpen(false)}
          >
            <div
              className={styles.MenuIndexPopup}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={styles.PopupCloseWrapper}
                onClick={() => setIsMenuIndexOpen(false)}
              >
                <div className={styles.PopupClose}>✕</div>
              </div>

              {(() => {
                const allCats = Object.values(MENU).flat();
                return allCats.map((cat, idx) => {
                  const isLast = idx === allCats.length - 1;
                  return (
                    <div key={cat.title}>
                      <div
                        className={styles.MenuIndexRow}
                        style={{
                          borderBottom: isLast
                            ? "none"
                            : "1px solid rgba(140,140,140,0.35)",
                        }}
                        onClick={() => {
                          setIsMenuIndexOpen(false);
                          categoryRefs.current[cat.title]?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                      >
                        <div className={styles.MenuIndexLeft}>
                          <span className={styles.MenuIndexTitle}>
                            {cat.title}
                          </span>
                        </div>
                        <span className={styles.MenuIndexCount}>
                          {cat.items.length}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </IonContent>

      <IonFooter>
        <StickBar />
      </IonFooter>
      {/* Only show ViewCart when there are cafe items AND no active store cart */}
      {(cart?.items?.length ?? 0) > 0 &&
        (storeCart?.items ?? []).length === 0 && (
          <ViewCart
            itemCount={
              cart?.items?.reduce(
                (acc: number, item: any) => acc + (item?.quantity || 0),
                0,
              ) ?? 0
            }
            onClick={() => history.push("/Cart")}
            // Mute the ViewCart button for cafe when the shop is closed so user
            // cannot proceed to checkout for cafe items. Store cart is already
            // excluded by the surrounding condition.
            disabled={Boolean(shopClosed)}
          />
        )}
      <Customization
        isOpen={isCustomizationOpen}
        product={customizingProduct}
        existingCartCount={
          customizingProduct?.id
            ? (cart?.items || [])
                .filter((ci: any) => {
                  const pid = Number(
                    ci?.productId ?? ci?.product?.id ?? ci?.product?.value?.id,
                  );
                  return pid === Number(customizingProduct.id);
                })
                .reduce((acc: number, it: any) => acc + (it.quantity || 0), 0)
            : 0
        }
        onClose={() => {
          setIsCustomizationOpen(false);
          setCustomizingProduct(null);
        }}
        onConfirm={async (payload) => {
          if (!customizingProduct?.id) return;
          const productId = customizingProduct.id;
          try {
            console.log("CafeMenu: Customization confirm (footer)", {
              productId,
              payload,
            });
            const qty = payload.quantity ?? 1;
            await addToCart(productId, payload, qty);
          } catch (err) {
            console.error("Failed addToCart:", err);
          }
          setIsCustomizationOpen(false);
          setCustomizingProduct(null);
        }}
      />
      <RepeatCustomization
        isOpen={Boolean(isRepeatOpen)}
        productId={repeatProductId}
        previousCustomizations={repeatLastCustomizations}
        productName={repeatProductName}
        productPrice={repeatProductPrice}
        productSubtitle={repeatProductSubtitle}
        vegType={repeatProductVegType}
        onClose={() => {
          setIsRepeatOpen(false);
          setRepeatProductId(null);
          setRepeatLastCustomizations(null);
          setRepeatProductName(undefined);
          setRepeatProductPrice(undefined);
          setRepeatProductSubtitle(undefined);
          setRepeatProductVegType(undefined);
        }}
        onChoose={() => {
          // open full customization flow for the product
          if (!repeatProductId || !shopId) return;
          (async () => {
            try {
              const detailed = await getSingleMenuItem(shopId, repeatProductId);
              setCustomizingProduct(detailed);
              setIsCustomizationOpen(true);
              console.log(
                "RepeatCustomization: user chose to open Customization",
                { productId: repeatProductId },
              );
            } catch (err) {
              console.error(
                "RepeatCustomization: failed to open customization",
                err,
              );
            } finally {
              setIsRepeatOpen(false);
            }
          })();
        }}
        onRepeatLast={async (quantity = 1) => {
          if (!repeatProductId) return;
          try {
            console.log("RepeatCustomization: repeating last customization", {
              productId: repeatProductId,
              previous: repeatLastCustomizations,
              quantity,
            });
            for (let i = 0; i < (quantity || 1); i++) {
              // sequentially add items to cart to keep server/state consistent
              // this mirrors manual repeated presses of the add button
              await addToCart(repeatProductId, repeatLastCustomizations);
            }
          } catch (err) {
            console.error("RepeatCustomization: repeat last failed", err);
          } finally {
            setIsRepeatOpen(false);
            setRepeatProductId(null);
            setRepeatLastCustomizations(null);
          }
        }}
      />
      <ProductDetailSheet
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Store-cart conflict: user tries to add a cafe item while store cart is active */}
      {cafeConflictVisible && (
        <CartConflictModal
          existingOrigin="store"
          incomingOrigin="cafe"
          onReplace={handleCafeConflictReplace}
          onCancel={handleCafeConflictCancel}
        />
      )}

      {/* Active cafe order toast */}
      {showBlockToast && (
        <div className={toastStyles.toast}>
          <span className={toastStyles.icon}>⚠️</span>
          <span className={toastStyles.text}>
            You already have a cafe order in progress. Please wait until
            it&apos;s completed.
          </span>
        </div>
      )}
    </IonPage>
  );
};

export default CafeMenu;

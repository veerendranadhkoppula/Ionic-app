import React from "react";
import { IonModal } from "@ionic/react";
import styles from "./ProductDetailSheet.module.css";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import noStateImg from "../pages/nostatesimg.png";

type VegType = "Veg" | "NonVeg" | "Egg" | "Vegan";

type Product = {
  name: string;
  desc: string;
  price?: number;
  vegType?: VegType;
  bestseller?: boolean;
  image?: string;
  fullDesc?: string;
  recipe?: { title: string; description: string }[];
};

const VegIcon = () => (
  <svg
    width="12"
    height="11"
    viewBox="0 0 12 11"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 10.3325V0H11.3632V10.3325H0ZM1.26258 9.1844H10.1007V1.14805H1.26258V9.1844ZM5.68162 7.46233C4.9872 7.46233 4.39274 7.2375 3.89822 6.78785C3.40371 6.33819 3.15646 5.79765 3.15646 5.16623C3.15646 4.5348 3.40371 3.99426 3.89822 3.54461C4.39274 3.09495 4.9872 2.87013 5.68162 2.87013C6.37604 2.87013 6.97051 3.09495 7.46502 3.54461C7.95953 3.99426 8.20679 4.5348 8.20679 5.16623C8.20679 5.79765 7.95953 6.33819 7.46502 6.78785C6.97051 7.2375 6.37604 7.46233 5.68162 7.46233Z"
      fill="#34A853"
    />
  </svg>
);

const NonVegIcon = () => (
  <svg
    width="12"
    height="11"
    viewBox="0 0 12 11"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 10.3325V0H11.3632V10.3325H0ZM1.26258 9.1844H10.1007V1.14805H1.26258V9.1844ZM5.68162 7.46233C4.9872 7.46233 4.39274 7.2375 3.89822 6.78785C3.40371 6.33819 3.15646 5.79765 3.15646 5.16623C3.15646 4.5348 3.40371 3.99426 3.89822 3.54461C4.39274 3.09495 4.9872 2.87013 5.68162 2.87013C6.37604 2.87013 6.97051 3.09495 7.46502 3.54461C7.95953 3.99426 8.20679 4.5348 8.20679 5.16623C8.20679 5.79765 7.95953 6.33819 7.46502 6.78785C6.97051 7.2375 6.37604 7.46233 5.68162 7.46233Z"
      fill="#A83434"
    />
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

const VegTypeIcon = ({ type }: { type?: VegType }) => {
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

export default function ProductDetailSheet({
  product,
  isOpen,
  onClose,
}: {
  product: Product | null | undefined;
  isOpen: boolean;
  onClose: () => void;
}) {
  const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.whitemantis.app";

const IOS_STORE_URL =
  "https://apps.apple.com/app/idXXXXXXXXXX"; // replace later

const getStoreUrl = () => {
  const platform = Capacitor.getPlatform();

  if (platform === "ios") {
    return IOS_STORE_URL;
  }

  return ANDROID_STORE_URL; // android + web
};

  const handleShare = async () => {
    if (!product) return;
const storeUrl = getStoreUrl();
    const shareText = `${product.name}
${product.fullDesc ?? product.desc}

Download the app:
${storeUrl}`;

    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: product.name,
          text: shareText,
          url: storeUrl ,
          dialogTitle: "Share product",
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: storeUrl ,
        });
        return;
      }

      await navigator.clipboard.writeText(shareText);
      alert("Link copied to clipboard");
    } catch (err) {
      console.log("Share failed", err);
    }
  };

  if (!product) return null;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      showBackdrop={false}
      backdropDismiss={true}
      className={styles.productSheet}
    >
      <div className={styles.SheetHeader}>
        <button className={styles.CloseButton} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18"
              stroke="#4B3827"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M6 6L18 18"
              stroke="#4B3827"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          {/* <div className={styles.CloseButton} onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
          >    <path  d="M18.364 5.63604L5.63604 18.364" stroke="#4B3827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.364 18.364L5.63604 5.63604" stroke="#4B3827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>

          </div> */}

          <div className={styles.Top}>
            {<img src={product.image || noStateImg} alt={product.name} />}
          </div>

          <div className={styles.Bottom}>
            <div className={styles.BottomTop}>
              <div className={styles.BottomTopTop}>
                <div className={styles.BottomTopTopRight}>
                  <div className={styles.VegTypeHere}>
                    <VegTypeIcon type={product.vegType} />
                  </div>
                  <div className={styles.ProductTitle}>
                    <h2>{product.name}</h2>
                  </div>
                </div>

                <div className={styles.BottomTopTopLeft}>
                  <button
                    className={styles.ShareBtn}
                    onClick={handleShare}
                    type="button"
                    aria-label="Share"
                  >
                    <svg
                      width="35"
                      height="35"
                      viewBox="0 0 35 35"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11 23.6977V17C11 16.6533 11.2686 16.3721 11.6 16.3721C11.9314 16.3721 12.2 16.6533 12.2 17V23.6977C12.2 23.9752 12.3054 24.2413 12.493 24.4376C12.6805 24.6339 12.9348 24.7442 13.2 24.7442H22.8C23.0652 24.7442 23.3195 24.6339 23.507 24.4376C23.6946 24.2413 23.8 23.9752 23.8 23.6977V17C23.8 16.6533 24.0686 16.3721 24.4 16.3721C24.7314 16.3721 25 16.6533 25 17V23.6977C25 24.3083 24.768 24.8937 24.3555 25.3255C23.9429 25.7573 23.3835 26 22.8 26H13.2C12.6165 26 12.0571 25.7573 11.6445 25.3255C11.232 24.8937 11 24.3083 11 23.6977ZM17.4 19.5117V10.1438L15.2242 12.4208C14.9899 12.666 14.6101 12.666 14.3758 12.4208C14.1415 12.1756 14.1415 11.7781 14.3758 11.5329L17.5758 8.18405L17.6211 8.14072C17.8568 7.93953 18.2045 7.95415 18.4242 8.18405L21.6242 11.5329C21.8585 11.7781 21.8585 12.1756 21.6242 12.4208C21.3899 12.666 21.0101 12.666 20.7758 12.4208L18.6 10.1438V19.5117C18.6 19.8584 18.3314 20.1396 18 20.1396C17.6686 20.1396 17.4 19.8584 17.4 19.5117Z"
                        fill="#4B3827"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className={styles.BottomTopdesc}>
              <p>{product.fullDesc ?? product.desc ?? ""}</p>
              </div>
            </div>

            {product.recipe && (
              <div className={styles.BottomBottom}>
                <div className={styles.BottomBottomHeading}>
                  <h4>Recipe</h4>
                </div>

                <div className={styles.RecipeDeatails}>
                  {product.recipe.map((step, index) => (
                    <p key={index} className={styles.RecipeLine}>
                      <span className={styles.RecipeLabel}>{step.title}</span>
                      <span className={styles.RecipeColon}>:</span>
                      <span className={styles.RecipeValue}>
                        {step.description}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </IonModal>
  );
}

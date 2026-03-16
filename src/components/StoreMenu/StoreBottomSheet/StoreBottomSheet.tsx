import React from "react";
import styles from "./StoreBottomSheet.module.css";
import { StoreProduct } from "../../../api/apiStoreMenu";

interface Props {
  product: StoreProduct;
  onClose: () => void;
}

const StoreBottomSheet = ({ product, onClose }: Props) => {
  const [isClosing, setIsClosing] = React.useState(false);

  return (
    <>
      <div
        className={`${styles.overlay} ${isClosing ? styles.overlayClose : ""}`}
        onClick={() => {
          setIsClosing(true);
          setTimeout(() => {
            onClose();
          }, 300);
        }}
      >
        <div
          className={`${styles.main} ${isClosing ? styles.close : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.MainContainer}>
            <div className={styles.Top}>
              <img src={product.productImage?.url || ""} alt="product" className={styles.prodimg} />
            </div>
            <div className={styles.Bottom}>
              <div className={styles.storesheetProdDetails}>
                <div className={styles.prodnameandshare}>
                  <div className={styles.prodname}>
                    <h3>{product.name}</h3>
                  </div>
                  <div className={styles.share}>
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
                  </div>
                </div>
                <div className={styles.proddesc}>
                  <p>{product.description}</p>
                </div>
              </div>
              <div className={styles.line}></div>
              <div className={styles.storesheetProdmoredetails}>
                {[
                  { label: "Farm", value: product.farm },
                  { label: "Tasting Notes", value: product.tastingNotes },
                  { label: "Variety", value: product.variety },
                  { label: "Process", value: product.process },
                  { label: "Altitude", value: product.altitude },
                  { label: "Body", value: product.body },
                  { label: "Aroma", value: product.aroma },
                  { label: "Roast", value: product.roast },
                  { label: "Finish", value: product.finish },
                  { label: "Brewing", value: product.brewing },
                ]
                  .filter((item) => item.value)
                  .map((item, index) => (
                    <div key={index} className={styles.proddetailItem}>
                      <h3>{item.label}</h3>
                      <p>{item.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StoreBottomSheet;

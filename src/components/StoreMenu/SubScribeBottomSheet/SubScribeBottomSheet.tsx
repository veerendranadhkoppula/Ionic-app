import React, { useState, useEffect } from "react";
import styles from "./SubScribeBottomSheet.module.css";
import { StoreProduct, StoreVariant, SubFreq } from "../../../api/apiStoreMenu";
import { useHistory } from "react-router-dom";
import tokenStorage from "../../../utils/tokenStorage";

interface Props {
  product: StoreProduct;
  initialVariantId?: string;
  onClose: () => void;
}

export interface SubScriptionCheckoutRouteState {
  productId: number;
  productName: string;
  variantId?: string;
  variantName?: string;
  subscriptionId: string;
  freqLabel: string;
  quantity: number;
  unitPrice: number;
  userEmail: string;
}

const formatFreq = (freq: SubFreq): string => {
  return `Every ${freq.duration} ${freq.interval}${freq.duration > 1 ? "s" : ""}`;
};

const SubScribeBottomSheet = ({ product, initialVariantId, onClose }: Props) => {
  const history = useHistory();
  const [isClosing, setIsClosing] = useState(false);

  const isVariant = product.hasVariantOptions && product.variants.length > 0;

  const subVariants: StoreVariant[] = isVariant
    ? product.variants.filter((v) => v.hasVariantSub)
    : [];

  const resolveInitialVariant = (): StoreVariant | null => {
    if (!isVariant || subVariants.length === 0) return null;
    if (initialVariantId) {
      const match = subVariants.find((v) => v.id === initialVariantId);
      if (match) return match;
    }
    return subVariants[0];
  };

  const [selectedVariant, setSelectedVariant] = useState<StoreVariant | null>(
    resolveInitialVariant
  );


  const freqOptions: SubFreq[] = isVariant
    ? selectedVariant?.subFreq ?? []
    : product.subFreq;

  const [selectedFreqId, setSelectedFreqId] = useState<string>(
    freqOptions[0]?.id ?? ""
  );


  useEffect(() => {
    if (!isVariant) return;
    const newFreqs = selectedVariant?.subFreq ?? [];
    const stillValid = newFreqs.some((f) => f.id === selectedFreqId);
    if (!stillValid) {
      setSelectedFreqId(newFreqs[0]?.id ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant]);

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleStartSubscription = async () => {
      console.log("variant full data:", JSON.stringify(selectedVariant));
  console.log("product full data:", JSON.stringify({ salePrice: product.salePrice, regularPrice: product.regularPrice }));
    const selectedFreq = freqOptions.find((f) => f.id === selectedFreqId);
    if (!selectedFreq) return;

    const freqLabel = formatFreq(selectedFreq);
const unitPrice = isVariant && selectedVariant
  ? (selectedVariant.variantSalePrice > 0 ? selectedVariant.variantSalePrice : selectedVariant.variantRegularPrice) ?? 0
  : (product.salePrice && product.salePrice > 0 ? product.salePrice : product.regularPrice) ?? 0;
console.log("selectedVariant full:", JSON.stringify(selectedVariant));
    let userEmail = "";
    try {
      const storedEmail = await tokenStorage.getItem("user_email");
      userEmail = storedEmail ?? "";
    } catch {
      userEmail = "";
    }

    const state: SubScriptionCheckoutRouteState = {
      productId: product.id,
      productName: product.name,
      variantId: isVariant ? (selectedVariant?.id ?? undefined) : undefined,
      variantName: isVariant ? (selectedVariant?.variantName ?? undefined) : undefined,
      subscriptionId: selectedFreqId,
      freqLabel,
      quantity: 1,
      unitPrice,
      userEmail,
    };

    history.push("/SubScriptionCheckout", state);
    onClose();
  };

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClose : ""}`}
      onClick={triggerClose}
    >
      <div
        className={`${styles.main} ${isClosing ? styles.close : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.MainContainer}>


          <div className={styles.Top}>
            <div className={styles.subscrihead}>
              <div className={styles.subscripheadtext}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M0 11.3632V0H11.3632V11.3632H0ZM1.26258 10.1007H10.1007V1.26258H1.26258V10.1007ZM5.68162 8.20679C4.9872 8.20679 4.39274 7.95953 3.89822 7.46502C3.40371 6.97051 3.15646 6.37604 3.15646 5.68162C3.15646 4.9872 3.40371 4.39274 3.89822 3.89822C4.39274 3.40371 4.9872 3.15646 5.68162 3.15646C6.37604 3.15646 6.97051 3.40371 7.46502 3.89822C7.95953 4.39274 8.20679 4.9872 8.20679 5.68162C8.20679 6.37604 7.95953 6.97051 7.46502 7.46502C6.97051 7.95953 6.37604 8.20679 5.68162 8.20679Z"
                    fill="#34A853"
                  />
                </svg>
                <h3>{product.name} subscription</h3>
              </div>
              <div className={styles.wrong} onClick={(e) => { e.stopPropagation(); triggerClose(); }}>
                <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
                    fill="#4B3827"
                  />
                </svg>
              </div>
            </div>
            <div className={styles.line} />
          </div>


          <div className={styles.Middle}>

            {freqOptions.length > 0 && (
              <div className={styles.BagContainer}>
                <div className={styles.BagTitle}>
                  <h3>Delivery Frequency</h3>
                  <p>Required</p>
                </div>
                <div className={styles.Bagqntyselect}>
                  {freqOptions.map((freq) => (
                    <div
                      key={freq.id}
                      className={styles.Bagqntyselectbtn}
                      onClick={() => setSelectedFreqId(freq.id)}
                    >
                      <h3>{formatFreq(freq)}</h3>
                      <input
                        type="radio"
                        name="subFreq"
                        value={freq.id}
                        checked={selectedFreqId === freq.id}
                        onChange={() => setSelectedFreqId(freq.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isVariant && subVariants.length > 0 && (
              <div className={styles.SizeContainer}>
                <div className={styles.SizeTitle}>
                  <h3>Size</h3>
                  <p>Required</p>
                </div>
                <div className={styles.Bagqntyselect}>
                  {subVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className={styles.Sizeqntyselectbtn}
                      onClick={() => setSelectedVariant(variant)}
                    >
                      <h3>{variant.variantName} gm</h3>
                      <input
                        type="radio"
                        name="subSize"
                        value={variant.id}
                        checked={selectedVariant?.id === variant.id}
                        onChange={() => setSelectedVariant(variant)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>


          <div className={styles.Bottom}>
            <button className={styles.stsubscribe} onClick={handleStartSubscription}>Start Subscription</button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SubScribeBottomSheet;

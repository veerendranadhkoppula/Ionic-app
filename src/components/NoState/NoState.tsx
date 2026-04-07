import React from "react";
import { useHistory } from "react-router-dom";
import styles from "./NoState.module.css";

type Variant = "cup" | "bell";

interface Props {
  variant?: Variant;
  title: string;
  subtitle?: string;
  ctaText?: string;
  onCta?: () => void;
   imageSrc?: string; 
}

const CupIcon: React.FC = () => (
  <svg className={styles.iconSvg} width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.4">
      <path d="M41.6667 8.33203V16.6654M58.3333 8.33203V16.6654M66.6667 33.332C67.7717 33.332 68.8315 33.771 69.6129 34.5524C70.3943 35.3338 70.8333 36.3936 70.8333 37.4987V70.832C70.8333 75.2523 69.0774 79.4915 65.9518 82.6171C62.8262 85.7427 58.5869 87.4987 54.1667 87.4987H29.1667C24.7464 87.4987 20.5072 85.7427 17.3816 82.6171C14.2559 79.4915 12.5 75.2523 12.5 70.832V37.4987C12.5 36.3936 12.939 35.3338 13.7204 34.5524C14.5018 33.771 15.5616 33.332 16.6667 33.332H75C79.4203 33.332 83.6595 35.088 86.7851 38.2136C89.9107 41.3392 91.6667 45.5784 91.6667 49.9987C91.6667 54.419 89.9107 58.6582 86.7851 61.7838C83.6595 64.9094 79.4203 66.6654 75 66.6654H70.8333M25 8.33203V16.6654" stroke="#6C7A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>
);

const BellIcon: React.FC = () => (
  <svg className={styles.iconSvg} width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity="0.4" d="M38.2563 78.2506C38.9146 79.3906 39.8614 80.3373 41.0015 80.9955C42.1416 81.6537 43.4349 82.0002 44.7513 82.0002C46.0678 82.0002 47.3611 81.6537 48.5012 80.9955C49.6413 80.3373 50.5881 79.3906 51.2463 78.2506M51.9363 8.17805C48.5519 7.03757 44.9446 6.71914 41.4127 7.24909C37.8808 7.77904 34.5257 9.14215 31.6251 11.2257C28.7244 13.3092 26.3613 16.0534 24.7313 19.2312C23.1014 22.4089 22.2513 25.9291 22.2513 29.5005C22.2513 46.3718 16.9601 51.8355 11.9763 56.9768C11.4872 57.5143 11.1649 58.1824 11.0484 58.8998C10.932 59.6171 11.0265 60.3528 11.3205 61.0175C11.6145 61.6821 12.0953 62.247 12.7043 62.6434C13.3134 63.0399 14.0246 63.2508 14.7513 63.2505H74.7513C75.4781 63.2508 76.1892 63.0399 76.7983 62.6434C77.4074 62.247 77.8882 61.6821 78.1822 61.0175C78.4762 60.3528 78.5707 59.6171 78.4542 58.8998C78.3378 58.1824 78.0154 57.5143 77.5263 56.9768C76.7546 56.1821 76.0225 55.3498 75.3326 54.483M78.5013 29.5005C78.5013 35.7138 73.4645 40.7505 67.2513 40.7505C61.0381 40.7505 56.0013 35.7138 56.0013 29.5005C56.0013 23.2873 61.0381 18.2505 67.2513 18.2505C73.4645 18.2505 78.5013 23.2873 78.5013 29.5005Z" stroke="#6C7A5F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NoState: React.FC<Props> = ({ variant = "cup", title, subtitle, ctaText, onCta, imageSrc }) => {
  const history = useHistory();

  const handleCta = () => {
    if (onCta) return onCta();
    // reasonable default: go to CafeMenu
    history.push("/CafeMenu");
  };

  return (
    <div className={styles.container}>
    <div className={styles.iconWrapper}>
  {imageSrc ? (
    <img
      src={imageSrc}
      alt="Empty State"
      style={{ width: "100px", height: "100px" }}
    />
  ) : variant === "bell" ? (
    <BellIcon />
  ) : (
    <CupIcon />
  )}
</div>
      <h3 className={styles.title}>{title}</h3>
      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      {ctaText ? (
        <div className={styles.ctaWrap}>
          <button className={styles.browseBtn} onClick={handleCta}>
            {ctaText}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default NoState;

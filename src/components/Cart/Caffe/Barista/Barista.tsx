/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import styles from "./Barista.module.css";
import { useCart } from "../../../../context/useCart";
import noStateImg from "../../../../pages/nostatesimg.png";
import type { CartItem } from "../../../../context/CartContext";
import { getSingleMenuItem } from "../../../../api/apiCafe";
import { useShopId } from "../../../../context/useShopId";

interface BaristaProps {
  openSheet: () => void;
  selectedBarista: {
    id: number;
    name: string;
    shortDesc: string;
  } | null;
  clearBarista: () => void;
  items?: CartItem[];
  onEdit?: (cartItemId: string, productId: number) => void;
}

const Barista: React.FC<BaristaProps> = ({
  openSheet,
  selectedBarista,
  clearBarista,
  items = [],
  onEdit,
}) => {
  const { incrementItem, decrementItem, removeItem } = useCart();
  const shopId = useShopId();

  const [resolvedLabels, setResolvedLabels] = useState<Record<string, string[]>>({});

  // Fetch product definitions to resolve missing customization labels when needed.
  useEffect(() => {
    let mounted = true;
    const toResolve: Array<{ cartItemId: string; productId?: number; sel: any[] }> = [];

    try {
      items.forEach((cartItem) => {
        const sel: any[] | any = (cartItem as any).customizations || (cartItem as any).customization || null;
        if (!Array.isArray(sel) || sel.length === 0) return;

        const needs = sel.some((s: any) => {
          return !(s?.selectedOptionLabel || s?.label || s?.optionLabel) && s?.sectionId && (s?.selectedOptionId || s?.optionId);
        });
        if (needs) toResolve.push({ cartItemId: cartItem.id, productId: cartItem.productId, sel });
      });
    } catch { /* ignore */ }

    if (toResolve.length === 0) return;

    (async () => {
      for (const item of toResolve) {
        try {
          const pid = Number(item.productId ?? (item as any).product?.id ?? NaN);
          if (Number.isNaN(pid) || !shopId) continue;
          const prod = await getSingleMenuItem(shopId, pid).catch(() => null);
          if (!mounted || !prod) continue;

          const productCustomizations: any[] = (prod as any).customizations || [];
          const allSections: any[] = [];
          productCustomizations.forEach((c: any) => {
            if (Array.isArray(c?.sections)) allSections.push(...c.sections);
            else if (c?.id && Array.isArray(c?.groups)) allSections.push(c);
          });

          const labels: string[] = [];
          (item.sel || []).forEach((s: any) => {
            if (s?.selectedOptionLabel) { labels.push(String(s.selectedOptionLabel)); return; }
            if (s?.label || s?.optionLabel) { labels.push(String(s.label || s.optionLabel)); return; }
            if (s?.sectionId && (s?.selectedOptionId || s?.optionId)) {
              const section = allSections.find((sec: any) => String(sec.id) === String(s.sectionId));
              if (section) {
                const allOptions: any[] = [];
                (section.groups || []).forEach((g: any) => { if (Array.isArray(g?.options)) allOptions.push(...g.options); });
                const optId = s?.selectedOptionId ?? s?.optionId;
                const option = allOptions.find((o: any) => String(o.id) === String(optId));
                if (option?.label) { labels.push(String(option.label)); return; }
              }
            }
          });

          if (labels.length > 0) {
            setResolvedLabels((prev) => ({ ...prev, [item.cartItemId]: labels }));
            console.log("🔍 BARISTA: fetched + resolved labels for", item.cartItemId, labels);
          }
        } catch (err) {
          console.warn("BARISTA: label resolve failed for", item.cartItemId, err);
        }
      }
    })();

    return () => { mounted = false; };
  }, [items, shopId]);

  const handleInc = async (id: string) => {
    try {
      console.log("Barista: increment", { itemId: id });
      await incrementItem(id);
      console.log("Barista: increment done", { itemId: id });
    } catch (err) {
      console.error("Barista: increment failed", err);
    }
  };

  const handleDec = async (id: string) => {
    try {
      console.log("Barista: decrement", { itemId: id });
      await decrementItem(id);
      console.log("Barista: decrement done", { itemId: id });
    } catch (err) {
      console.error("Barista: decrement failed", err);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      console.log("Barista: remove item", { itemId: id });
      await removeItem(id);
      console.log("Barista: remove done", { itemId: id });
    } catch (err) {
      console.error("Barista: remove failed", err);
    }
  };

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <div className={styles.TopText}>
              <h4>Choose Your Barista (Optional)</h4>
              <p>Auto-assigned based on availability.</p>
            </div>
            <div className={styles.BaristaSelect} onClick={openSheet}>
              {selectedBarista ? (
                <>
                  <div className={styles.selectedLeft}>
                    <div className={styles.selectedNameRow}>
                      <span className={styles.selectedName}>
                        {selectedBarista.name}
                      </span>

                      <span className={styles.tickIcon}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6.66667 0C3 0 0 3 0 6.66667C0 10.3333 3 13.3333 6.66667 13.3333C10.3333 13.3333 13.3333 10.3333 13.3333 6.66667C13.3333 3 10.3333 0 6.66667 0ZM5.33333 10L2 6.66667L2.94 5.72667L5.33333 8.11333L10.3933 3.05333L11.3333 4L5.33333 10Z"
                            fill="#6C7A5F"
                          />
                        </svg>
                      </span>
                    </div>

                    <span className={styles.selectedTagline}>
                      {selectedBarista.shortDesc.slice(0, 20)}
                    </span>
                  </div>

                  <span
                    className={styles.removeIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearBarista();
                    }}
                  >
                    <svg
                      width="25"
                      height="25"
                      viewBox="0 0 25 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8.81641 16.1807L16.1828 8.81641M8.81641 8.81641L16.1828 16.1807"
                        stroke="#4B3827"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </>
              ) : (
                <>
                  <span>Select Barista</span>

                  <svg
                    width="35"
                    height="35"
                    viewBox="0 0 35 35"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14.5 13L20 18.5L14.5 24"
                      stroke="#6C7A5F"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </div>
          </div>

          <div className={styles.Bottom}>
            <h3 className={styles.bevarge}>Beverages / Drinks</h3>

            {items.map((cartItem: CartItem) => {
              console.log("🧾 BARISTA cartItem FULL:", cartItem);
              console.log(
                "🧾 BARISTA cartItem.customizations:",
                (cartItem as any).customizations,
              );
              console.log(
                "🧾 BARISTA cartItem.customization:",
                (cartItem as any).customization,
              );
              console.log(
                "🧾 BARISTA cartItem.product:",
                (cartItem as any).product,
              );
              // ---- CUSTOMIZATION LABEL RESOLUTION DEBUG ----
              const _rawCust = (cartItem as any).customizations;
              console.log("🔍 BARISTA cust debug:", {
                isArray: Array.isArray(_rawCust),
                length: Array.isArray(_rawCust) ? _rawCust.length : "n/a",
                first: Array.isArray(_rawCust) && _rawCust.length > 0 ? _rawCust[0] : null,
                keys: Array.isArray(_rawCust) && _rawCust.length > 0 ? Object.keys(_rawCust[0] || {}) : [],
              });
              const product =
                (cartItem.product as any)?.value ||
                (cartItem.product as any) ||
                (cartItem as any);
              const qty = cartItem.quantity || 1;

              return (
                <div key={cartItem.id} className={styles.proditem}>
                  <div className={styles.proditemLeft}>
                    <div className={styles.proditemImage}>
                      <img
                        src={(product && product.image) || noStateImg}
                        alt="prod"
                        style={{ opacity: product?.inStock ? 1 : 0.4 }}
                      />
                    </div>

                    <div className={styles.proditemDetails}>
                      <div className={styles.proditemName}>
                        {product?.isVeg && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M0 10V0H10V10H0ZM1.11111 8.88889H8.88889V1.11111H1.11111V8.88889ZM5 7.22222C4.38889 7.22222 3.86574 7.00463 3.43056 6.56944C2.99537 6.13426 2.77778 5.61111 2.77778 5C2.77778 4.38889 2.99537 3.86574 3.43056 3.43056C3.86574 2.99537 4.38889 2.77778 5 2.77778C5.61111 2.77778 6.13426 2.99537 6.56944 3.43056C7.00463 3.86574 7.22222 4.38889 7.22222 5C7.22222 5.61111 7.00463 6.13426 6.56944 6.56944C6.13426 7.00463 5.61111 7.22222 5 7.22222Z"
                              fill="#34A853"
                            />
                          </svg>
                        )}

                        <h3 style={{ opacity: product?.inStock ? 1 : 0.5 }}>
                          {product?.title}
                        </h3>
                      </div>

                      <div className={styles.proditemdetails}>
                        {(() => {
                          const selected: any[] = (cartItem as any).customizations;
                          if (!Array.isArray(selected) || selected.length === 0) {
                            console.log("🔍 BARISTA: no customizations to display for", cartItem.id);
                            return null;
                          }

                          console.log("🔍 BARISTA: resolving labels for", cartItem.id, selected);

                          const labels: string[] = [];

                          selected.forEach((s: any, idx: number) => {
                            // Shape 1 (POST body preserved): { selectedOptionLabel, sectionTitle, ... }
                            if (s?.selectedOptionLabel) {
                              console.log(`🔍 BARISTA [${idx}] shape1 selectedOptionLabel:`, s.selectedOptionLabel);
                              labels.push(String(s.selectedOptionLabel));
                              return;
                            }
                            // Shape 2: { label } or { optionLabel }
                            if (s?.label || s?.optionLabel) {
                              const lbl = s.label || s.optionLabel;
                              console.log(`🔍 BARISTA [${idx}] shape2 label:`, lbl);
                              labels.push(String(lbl));
                              return;
                            }
                            // Shape 3: sectionId + selectedOptionId — look up in product definition
                            if (s?.sectionId && (s?.selectedOptionId || s?.optionId)) {
                              const productCustomizations: any[] = (cartItem as any).product?.customizations;
                              if (Array.isArray(productCustomizations) && productCustomizations.length > 0) {
                                const allSections: any[] = [];
                                productCustomizations.forEach((c: any) => {
                                  if (Array.isArray(c?.sections)) allSections.push(...c.sections);
                                  else if (c?.id && Array.isArray(c?.groups)) allSections.push(c);
                                });
                                const section = allSections.find((sec: any) => String(sec.id) === String(s.sectionId));
                                if (section) {
                                  const allOptions: any[] = [];
                                  (section.groups || []).forEach((g: any) => {
                                    if (Array.isArray(g?.options)) allOptions.push(...g.options);
                                  });
                                  const optId = s?.selectedOptionId ?? s?.optionId;
                                  const option = allOptions.find((o: any) => String(o.id) === String(optId));
                                  if (option?.label) {
                                    console.log(`🔍 BARISTA [${idx}] shape3 resolved label:`, option.label);
                                    labels.push(String(option.label));
                                    return;
                                  }
                                }
                              }
                              console.warn(`🔍 BARISTA [${idx}] shape3 could not resolve label for`, s);
                              return;
                            }
                            console.warn(`🔍 BARISTA [${idx}] unknown customization shape:`, s);
                          });

                          // If no labels resolved synchronously, check cached resolvedLabels
                          if (labels.length === 0) {
                            const cached = resolvedLabels[cartItem.id];
                            if (Array.isArray(cached) && cached.length > 0) {
                              console.log("🔍 BARISTA: using cached resolved labels for", cartItem.id, cached);
                              return (
                                <>
                                  <h5>{cached[0]}</h5>
                                  {cached.length > 1 && <p>{cached.slice(1).join(" • ")}</p>}
                                </>
                              );
                            }
                            return null;
                          }

                          console.log("🔍 BARISTA: final labels:", labels);
                          return (
                            <>
                              <h5>{labels[0]}</h5>
                              {labels.length > 1 && (
                                <p>{labels.slice(1).join(" • ")}</p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {product?.customizations && Array.isArray(product.customizations) && product.customizations.length > 0 && (
                        <div
                          className={styles.prodcustomizationedit}
                          onClick={() =>
                            onEdit?.(
                              cartItem.id,
                              product?.id ?? product?.value?.id ?? cartItem.id,
                            )
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <p>Edit</p>
                          <svg
                            width="7"
                            height="13"
                            viewBox="0 0 7 13"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M1.24454 3.33911L1.78303 2.80112L4.71605 5.73313C4.76332 5.78011 4.80085 5.83597 4.82645 5.89751C4.85205 5.95905 4.86523 6.02504 4.86523 6.0917C4.86523 6.15835 4.85205 6.22434 4.82645 6.28588C4.80085 6.34742 4.76332 6.40328 4.71605 6.45026L1.78303 9.38379L1.24505 8.84581L3.99789 6.09246L1.24454 3.33911Z"
                              fill="#8C8C8C"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.proditemRight}>
                    {product?.inStock ? (
                      <div className={styles.proditemquantitymanger}>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => handleDec(cartItem.id)}
                        >
                          −
                        </button>
                        <span className={styles.qtyNumber}>{qty}</span>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => handleInc(cartItem.id)}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{ cursor: "pointer" }}
                        onClick={() => handleRemove(cartItem.id)}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M8.46387 15.5348L15.5359 8.46484M8.46387 8.46484L15.5359 15.5348"
                            stroke="#4B3827"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}

                    <div className={styles.proditemprice}>
                      {!product?.inStock ? (
                        <>
                          <h5 style={{ color: "#8C8C8C" }}>Out of stock</h5>
                          <h5 style={{ opacity: 0.5 }}>
                            AED {product?.price}
                          </h5>
                        </>
                      ) : (
                        <>
                          {(() => {
                            const custExtra = Array.isArray((cartItem as any).customizations)
                              ? (cartItem as any).customizations.reduce((sum: number, s: any) => sum + (Number(s?.price) || 0), 0)
                              : 0;
                            const salePrice     = Number(product?.discountPrice) || Number(product?.price) || 0;
                            const originalPrice = Number(product?.price) || 0;
                            const saleTotal     = ((salePrice + custExtra) * qty).toFixed(2);
                            const originalTotal = ((originalPrice + custExtra) * qty).toFixed(2);
                            const hasDiscount   = originalPrice > salePrice;
                            return (
                              <>
                                {hasDiscount && <p>AED {originalTotal}</p>}
                                <h5>AED {saleTotal}</h5>
                              </>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Barista;

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import styles from "./OtherItems.module.css";
import noStateImg from "../../../../pages/nostatesimg.png";
import { useCart } from "../../../../context/useCart";
import type { CartItem } from "../../../../context/CartContext";
import { getSingleMenuItem } from "../../../../api/apiCafe";
import { useShopId } from "../../../../context/useShopId";

interface OtherItemsProps {
  items?: CartItem[];
  onEdit?: (cartItemId: string, productId?: number) => void;
}

const OtherItems: React.FC<OtherItemsProps> = ({ items = [], onEdit }) => {
  const { incrementItem, decrementItem, removeItem } = useCart();
  const shopId = useShopId();

  // Cache of resolved labels for cartItem.id → string[]
  const [resolvedLabels, setResolvedLabels] = useState<Record<string, string[]>>({});

  // Try to resolve missing labels by fetching product definitions when needed.
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
            console.log("🔍 OtherItems: fetched + resolved labels for", item.cartItemId, labels);
          }
        } catch (err) {
          console.warn("OtherItems: label resolve failed for", item.cartItemId, err);
        }
      }
    })();

    return () => { mounted = false; };
  }, [items, shopId]);

  const handleInc = async (id: string) => {
    try {
      console.log("OtherItems: increment", { itemId: id });
      await incrementItem(id);
      console.log("OtherItems: increment done", { itemId: id });
    } catch (err) {
      console.error("OtherItems: increment failed", err);
    }
  };

  const handleDec = async (id: string) => {
    try {
      console.log("OtherItems: decrement", { itemId: id });
      await decrementItem(id);
      console.log("OtherItems: decrement done", { itemId: id });
    } catch (err) {
      console.error("OtherItems: decrement failed", err);
    }
  };

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainCoantiner}>
          <div className={styles.Top}>
            <h4>Food Items</h4>
          </div>
          <div className={styles.Bottom}>
            <div className={styles.Prodlist}>
              {items.map((cartItem) => {
                const rawProduct = cartItem.product;
                const product =
                  rawProduct &&
                  typeof rawProduct === "object" &&
                  rawProduct !== null &&
                  "value" in rawProduct
                    ? (rawProduct as any).value
                    : rawProduct ?? (cartItem as unknown as any);
                let productImage = noStateImg as string;
                try {
                  const img =
                    (product &&
                      (product.image ??
                        (product.value && product.value.image))) ||
                    null;
                  if (typeof img === "string") {
                    productImage = img.startsWith("http")
                      ? img
                      : `https://endpoint.whitemantis.ae${img}`;
                  } else if (img && typeof img === "object" && img.url) {
                    productImage = img.url.startsWith("http")
                      ? img.url
                      : `https://endpoint.whitemantis.ae${img.url}`;
                  }
                } catch {
                  productImage = noStateImg;
                }
                const qty = cartItem.quantity || 1;

                return (
                  <div key={cartItem.id} className={styles.prodItem}>
                    <div className={styles.prodLeft}>
                      <div className={styles.prodImage}>
                        <img
                          src={productImage || noStateImg}
                          alt="prod"
                          style={{ opacity: product?.inStock ? 1 : 0.4 }}
                        />
                      </div>

                      <div className={styles.prodDetails}>
                        <div className={styles.prodTitleRow}>
                          {product?.isVeg === true ? (
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
                          ) : (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <rect width="10" height="10" fill="#D9534F" />
                            </svg>
                          )}

                          <h4
                            style={{
                              opacity: product?.inStock ? 1 : 0.5,
                              marginLeft: 0,
                            }}
                          >
                            {product?.title}
                          </h4>
                        </div>

                        {(() => {
                          const sel: any[] | any =
                            (cartItem as any).customizations ||
                            (cartItem as any).customization ||
                            null;

                                  // If we have an explicit array of customizations, try to use them.
                                  // If labels can't be resolved locally, fall back to any cached resolved labels
                                  if (Array.isArray(sel) && sel.length > 0) {
                            console.log("🔍 OtherItems: resolving labels for", cartItem.id, sel);
                            const labels: string[] = [];

                            sel.forEach((s: any, idx: number) => {
                              // Shape 1: { selectedOptionLabel, ... }
                              if (s?.selectedOptionLabel) {
                                console.log(`🔍 OtherItems [${idx}] shape1:`, s.selectedOptionLabel);
                                labels.push(String(s.selectedOptionLabel));
                                return;
                              }
                              // Shape 2: { label } or { optionLabel }
                              if (s?.label || s?.optionLabel) {
                                const lbl = s.label || s.optionLabel;
                                console.log(`🔍 OtherItems [${idx}] shape2:`, lbl);
                                labels.push(String(lbl));
                                return;
                              }
                              // Shape 3: sectionId + selectedOptionId — look up in product def
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
                                      console.log(`🔍 OtherItems [${idx}] shape3 resolved:`, option.label);
                                      labels.push(String(option.label));
                                      return;
                                    }
                                  }
                                }
                                console.warn(`🔍 OtherItems [${idx}] shape3 unresolved:`, s);
                                return;
                              }
                              console.warn(`🔍 OtherItems [${idx}] unknown shape:`, s);
                            });

                            console.log("🔍 OtherItems: final labels:", labels);
                            if (labels.length > 0) return <p style={{ margin: 0, fontSize: 12, color: "#8C8C8C" }}>{labels.join(" • ")}</p>;

                            // No labels resolved synchronously — check cached resolution from effect
                            const cached = resolvedLabels[cartItem.id];
                            if (Array.isArray(cached) && cached.length > 0) {
                              console.log("🔍 OtherItems: using cached resolved labels for", cartItem.id, cached);
                              return <p style={{ margin: 0, fontSize: 12, color: "#8C8C8C" }}>{cached.join(" • ")}</p>;
                            }
                          }

                          // Legacy format: plain object or string
                          if (sel && !Array.isArray(sel)) {
                            if (typeof sel === "object") {
                              const parts: string[] = [];
                              if (sel.size) parts.push(String(sel.size));
                              if (sel.bagAmount) parts.push(String(sel.bagAmount));
                              if (sel.addOn) parts.push(String(sel.addOn));
                              if (Array.isArray(sel.options))
                                parts.push(sel.options.map((o: any) => o.label || o).join(", "));
                              const text = parts.filter(Boolean).join(" • ");
                              if (text) return <p style={{ margin: 0, fontSize: 12, color: "#8C8C8C" }}>{text}</p>;
                            }
                            if (typeof sel === "string") return <p style={{ margin: 0, fontSize: 12, color: "#8C8C8C" }}>{sel}</p>;
                          }

                          return (
                            <>
                              {product?.size && <p style={{ margin: 0, fontSize: 12, color: "#8C8C8C" }}>{product.size}</p>}
                              {product?.addOn && <p style={{ margin: 0, fontSize: 12, color: "#8C8C8C" }}>{product.addOn}</p>}
                            </>
                          );
                        })()}

                        <div style={{ marginTop: 0 }}>
                          {product?.customizations && Array.isArray(product.customizations) && product.customizations.length > 0 && (
                            <p
                              style={{
                                cursor: "pointer",
                                margin: 0,
                                display: "flex",
                                alignItems: "end",
                                gap: "4px",
                              }}
                              onClick={() =>
                                onEdit?.(
                                  cartItem.id,
                                  (product &&
                                    (product.id ??
                                      (product as any).value?.id)) as any,
                                )
                              }
                            >
                              Edit
                              <svg
                                width="7"
                                height="13"
                                viewBox="0 0 7 13"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M1.24442 3.33813L1.78291 2.80015L4.71592 5.73215C4.7632 5.77913 4.80072 5.835 4.82633 5.89653C4.85193 5.95807 4.86511 6.02407 4.86511 6.09072C4.86511 6.15737 4.85193 6.22336 4.82633 6.2849C4.80072 6.34644 4.7632 6.40231 4.71592 6.44929L1.78291 9.38281L1.24493 8.84483L3.99777 6.09148L1.24442 3.33813Z"
                                  fill="#8C8C8C"
                                />
                              </svg>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.prodRight}>
                      {product.inStock ? (
                        <div className={styles.qtyBox}>
                          <button onClick={() => handleDec(cartItem.id)}>
                            -
                          </button>
                          <span>{qty}</span>
                          <button onClick={() => handleInc(cartItem.id)}>
                            +
                          </button>
                        </div>
                      ) : (
                        <div
                          className={styles.removeIcon}
                          onClick={() => removeItem(cartItem.id)}
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

                      <div className={styles.priceBox}>
                        {!product.inStock ? (
                          <>
                            <span className={styles.outStock}>
                              Out of stock
                            </span>
                            <span className={styles.disabledPrice}>
                              AED {product.price}
                            </span>
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
                                  {hasDiscount && <span className={styles.oldPrice}>AED {originalTotal}</span>}
                                  <span>AED {saleTotal}</span>
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

            <div className={styles.line}></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OtherItems;

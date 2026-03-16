/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep-sort objects/arrays so JSON stringification is stable regardless of key order.
 */
const deepSort = (v: any): any => {
  if (Array.isArray(v)) return v.map(deepSort);
  if (v && typeof v === "object") {
    const keys = Object.keys(v).sort();
    const out: any = {};
    for (const k of keys) out[k] = deepSort(v[k]);
    return out;
  }
  return v;
};

/**
 * Build a deterministic string key from customizations.
 * Used to compare whether two cart items have identical customizations.
 *
 * Only sectionId + selectedOptionId are used for identity — price/label/groupId/sectionTitle
 * are intentionally excluded so that keys remain stable even when the backend omits extra
 * fields (e.g. groupId is sent on POST but not returned on GET).
 *
 * UniqueKey = productId + buildCustomizationKey(customizations)
 */
export const buildCustomizationKey = (customizations: any): string => {
  if (!customizations) return "[]";
  const arr = Array.isArray(customizations) ? customizations : [customizations];
  const cleaned = arr.filter(
    (it: any) => it != null && (typeof it !== "object" || Object.keys(it).length > 0),
  );
  if (cleaned.length === 0) return "[]";

  // Extract only the identity-relevant fields so the key is stable regardless of
  // whether groupId / sectionTitle / price are present on any given object.
  const identity = cleaned.map((it: any) => {
    const sid = String(it?.sectionId ?? it?.section ?? "");
    const oid = String(it?.selectedOptionId ?? it?.optionId ?? it?.id ?? it?.value ?? "");
    return { sectionId: sid, selectedOptionId: oid };
  });

  identity.sort((a: any, b: any) => {
    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
  return JSON.stringify(identity);
};

export { deepSort };

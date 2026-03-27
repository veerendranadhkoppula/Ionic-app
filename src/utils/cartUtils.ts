/* eslint-disable @typescript-eslint/no-explicit-any */


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


export const buildCustomizationKey = (customizations: any): string => {
  if (!customizations) return "[]";
  const arr = Array.isArray(customizations) ? customizations : [customizations];
  const cleaned = arr.filter(
    (it: any) => it != null && (typeof it !== "object" || Object.keys(it).length > 0),
  );
  if (cleaned.length === 0) return "[]";


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

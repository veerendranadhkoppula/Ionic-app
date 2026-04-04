/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { UserSubscription } from "../api/apiSubscriptions";


const GREEN  = "#6C7A5F";
const BROWN  = "#4B3827";
const GREY   = "#8C8C8C";
const BLACK  = "#1A1A1A";
const WHITE  = "#FFFFFF";


const WM = {
  name   : "White Mantis",
  email  : "billing@whitemantis.ae",
  phone  : "+971 4 000 0000",
  address: "Shop 12, Al Wasl Road, Jumeirah Dubai, UAE",
  trn    : "100523052700003",
  legal  : "White Mantis Coffee LLC — Dubai, UAE",
  terms  : "Terms & Condition",
};


function drawAccentBar(doc: jsPDF): void {
  doc.setFillColor(GREEN);
  doc.rect(0, 0, 6, doc.internal.pageSize.height, "F");
}


function hRule(doc: jsPDF, y: number, margin = 20): void {
  doc.setDrawColor("#E0E0E0");
  doc.setLineWidth(0.3);
  doc.line(margin, y, doc.internal.pageSize.width - margin, y);
}

function labelValue(
  doc : jsPDF,
  label: string,
  value: string,
  x   : number,
  y   : number,
  valueColor = BLACK,
): void {
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text(label, x, y);

  doc.setFontSize(9);
  doc.setTextColor(valueColor);
  doc.setFont("helvetica", "bold");
  doc.text(value || "—", x, y + 5);
}


async function drawLogo(doc: jsPDF, x: number, y: number): Promise<void> {
  try {
    const img = await fetch("/logo.png")
      .then((r) => r.blob())
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
    // Draw image — width 25mm, height auto ~12mm, top-right
    doc.addImage(img, "PNG", x - 25, y - 8, 25, 12);
  } catch {
    // Fallback to text if image fails
    doc.setFontSize(7);
    doc.setTextColor(GREY);
    doc.setFont("helvetica", "normal");
    doc.text("WHITE MANTIS", x, y, { align: "right" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION INVOICE
// ─────────────────────────────────────────────────────────────────────────────
export async function generateSubscriptionInvoice(
  sub      : UserSubscription,
  userEmail: string,
): Promise<string> {
  const doc  = new jsPDF({ unit: "mm", format: "a4" });
  const W    = doc.internal.pageSize.width;   // 210
  const lm   = 20;   // left margin (after accent bar)
  const rm   = W - 20; // right margin

  // ── Accent bar ──────────────────────────────────────────────────────────
  drawAccentBar(doc);

  // ── HEADER ───────────────────────────────────────────────────────────────
  let y = 22;

  // "Invoice" title
  doc.setFontSize(26);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice", lm, y);

  // Date below title
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text(sub.placedAtLabel, lm, y);

  // Logo top-right
await drawLogo(doc, rm, 22);

  // Horizontal rule
  y += 8;
  hRule(doc, y, lm);
  y += 8;

  // ── INFO GRID (4 columns) ─────────────────────────────────────────────────
  // Col positions
  const c1 = lm;
  const c2 = lm + 70;
  const c3 = lm + 115;

  // Row 1
  labelValue(doc, "Recipient",       sub.shippingAddress
    ? `${sub.shippingAddress.firstName} ${sub.shippingAddress.lastName}`.trim()
    : "—", c1, y);

  labelValue(doc, "Order Id",  sub.displayId,          c2, y);
  labelValue(doc, "Order Date", sub.placedAtLabel,      c3, y);

  y += 14;

  // Row 2 — email / phone | invoice no | next billing date
  doc.setFontSize(8.5);
  doc.setTextColor(BLACK);
  doc.setFont("helvetica", "normal");
  doc.text(userEmail || "—", c1, y);

  y += 5;
  doc.setFontSize(8.5);
  doc.text(sub.shippingAddress?.phoneNumber || "—", c1, y);

  // Reset y to row 2 top for right columns
  y -= 5;
  labelValue(doc, "Invoice no.",       `INV-${sub.id}`,       c2, y);
  labelValue(doc, "Next Billing Date", sub.nextDelivery ?? "—", c3, y);

  y += 14;
  hRule(doc, y, lm);
  y += 8;

  // ── BILL TO / ISSUED BY / SHIP TO ─────────────────────────────────────────
  const addrY = y;

  // Bill to
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Bill to", c1, y);
  y += 5;

  const bill = sub.billingAddress ?? sub.shippingAddress;
  if (bill) {
    doc.setFontSize(9);
    doc.setTextColor(BROWN);
    doc.setFont("helvetica", "bold");
    doc.text(`${bill.firstName} ${bill.lastName}`.trim(), c1, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BLACK);
    doc.setFontSize(8.5);

    const billLines = [
      [bill.addressLine1, bill.addressLine2].filter(Boolean).join(", "),
      [bill.city, bill.emirates].filter(Boolean).join(", "),
      userEmail,
      `Phone: ${bill.phoneNumber}`,
    ].filter(Boolean);

    billLines.forEach((line) => {
      doc.text(line, c1, y);
      y += 4.5;
    });
  }

  // Issued By (right column, same top as addrY)
  let iy = addrY;
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Issued By", c2, iy);
  iy += 5;

  doc.setFontSize(9);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text(WM.name, c2, iy);
  iy += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(BLACK);
  doc.setFontSize(8.5);
  [`Email: ${WM.email}`, `Phone: ${WM.phone}`, `Address: ${WM.address}`].forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 70);
    doc.text(wrapped, c2, iy);
    iy += wrapped.length * 4.5;
  });

  // Ship to
  y = addrY;
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Ship to", c1, y + 50);

  const ship = sub.shippingAddress;
  if (ship) {
    let sy = y + 55;
    doc.setFontSize(9);
    doc.setTextColor(BROWN);
    doc.setFont("helvetica", "bold");
    doc.text(`${ship.firstName} ${ship.lastName}`.trim(), c1, sy);
    sy += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BLACK);
    doc.setFontSize(8.5);
    [
      [ship.addressLine1, ship.addressLine2].filter(Boolean).join(", "),
      [ship.city, ship.emirates].filter(Boolean).join(", "),
    ].filter(Boolean).forEach((line) => {
      doc.text(line, c1, sy);
      sy += 4.5;
    });
  }

  y = Math.max(y + 80, iy + 10);
  hRule(doc, y, lm);
  y += 8;

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  const amount = (sub.unitPrice * sub.quantity).toFixed(0);

  autoTable(doc, {
    startY      : y,
    margin      : { left: lm, right: 20 },
    head        : [["Description", "Frequency", "Qty", "Unit Price", "Amount"]],
    body        : [[
      sub.itemName,
      sub.deliveryFrequency,
      String(sub.quantity),
      `AED${sub.unitPrice.toFixed(0)}`,
      `AED ${amount}`,
    ]],
    styles      : { fontSize: 8.5, textColor: BLACK, cellPadding: 4 },
    headStyles  : {
      fillColor  : WHITE,
      textColor  : GREY,
      fontStyle  : "normal",
      lineWidth  : { bottom: 0.3 },
      lineColor  : "#E0E0E0",
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: { fillColor: WHITE },
    tableLineColor     : "#E0E0E0",
    tableLineWidth     : 0,
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  hRule(doc, y, lm);
  y += 8;

  // ── TOTALS (right-aligned) ────────────────────────────────────────────────
  const totalsX     = rm - 60;
  const totalsValX  = rm;

  const subtotal    = sub.unitPrice * sub.quantity;
  const coupon      = 0; // not available in sub
  const beans       = sub.coinsDiscount ?? 0;
  const shipping    = sub.shippingCharge ?? 0;
  const vat         = sub.taxAmount ?? 0;
  const total       = sub.total ?? 0;

  const totalsRows: [string, string][] = [
    ["Subtotal :",        `AED ${subtotal.toFixed(0)}`],
    ["Coupon Discount :", `AED ${coupon.toFixed(0)}`],
    ["Beans Discount :",  `AED ${beans.toFixed(0)}`],
    ["Shipping :",        `AED ${shipping.toFixed(0)}`],
    ["VAT tax :",         `AED ${vat.toFixed(0)}`],
  ];

  totalsRows.forEach(([label, val]) => {
    doc.setFontSize(8.5);
    doc.setTextColor(GREY);
    doc.setFont("helvetica", "normal");
    doc.text(label, totalsX, y);
    doc.setTextColor(BLACK);
    doc.text(val, totalsValX, y, { align: "right" });
    y += 6;
  });

  y += 2;
  hRule(doc, y, totalsX - 5);
  y += 6;

  // Total row
  doc.setFontSize(10);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Total", totalsX, y);
  doc.text(`AED ${total.toFixed(0)}`, totalsValX, y, { align: "right" });

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height;
  hRule(doc, pageH - 28, lm);

  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for your purchase", lm, pageH - 22);

  doc.setFont("helvetica", "normal");
  doc.text("Paid via", rm - 25, pageH - 22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BROWN);
  doc.text("Stripe", rm - 10, pageH - 22);

  doc.setFontSize(7.5);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text(`TRN: ${WM.trn}`, lm, pageH - 15);
  doc.text(WM.legal, rm, pageH - 15, { align: "right" });
  doc.text(WM.terms, rm, pageH - 10, { align: "right" });

  // Return base64
  return doc.output("datauristring");
}
// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME SHOP INVOICE
// ─────────────────────────────────────────────────────────────────────────────
export async function generateShopInvoice(
  order    : import("../api/apiStoreOrders").WebOrder,
  userEmail: string,
): Promise<string> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.width;
  const lm  = 20;
  const rm  = W - 20;

  // ── Accent bar ──────────────────────────────────────────────────────────
  drawAccentBar(doc);

  // ── HEADER — logo+name LEFT, Invoice RIGHT ────────────────────────────────
  let y = 18;

  // Logo left
  try {
    const img = await fetch("/logo.png")
      .then((r) => r.blob())
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
    doc.addImage(img, "PNG", lm, y - 6, 12, 12);
  } catch { /* skip logo if fails */ }

  // Company name + details (next to logo)
  const cx = lm + 16;
  doc.setFontSize(10);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("WHITE MANTIS", cx, y);

  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Dubai's Finest Coffee", cx, y + 5);
  doc.text("Shop 12, Al Wasl Road, Jumeirah", cx, y + 9);
  doc.text("Dubai, UAE", cx, y + 13);

  // Invoice title RIGHT
  doc.setFontSize(24);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice", rm, y + 2, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice date", rm, y + 9, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(BLACK);
  doc.setFont("helvetica", "bold");
  doc.text(order.placedAtLabel, rm, y + 14, { align: "right" });

  y += 26;
  hRule(doc, y, lm);
  y += 8;

  // ── INFO GRID ─────────────────────────────────────────────────────────────
  const c1 = lm;
  const c2 = lm + 90;
  const c3 = lm + 130;

  // Recipient
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Recipient", c1, y);
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  const recipientName = order.shippingAddress
    ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim()
    : "—";
  doc.text(recipientName, c1, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setTextColor(BLACK);
  doc.setFont("helvetica", "normal");
  doc.text(userEmail || "—", c1, y);
  y += 4.5;
  doc.text(order.shippingAddress?.phoneNumber || "—", c1, y);

  // Invoice no + Order Date (right columns, same row as Recipient label)
  const infoTopY = y - 14.5;
  labelValue(doc, "Invoice no.", `INV-${order.id}`, c2, infoTopY);
  labelValue(doc, "Order Date",  order.placedAtLabel, c3, infoTopY);

  // Payment Method
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Payment Method", c2, infoTopY + 14);
  doc.setFontSize(9);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Stripe", c2, infoTopY + 19);

  y += 10;
  hRule(doc, y, lm);
  y += 8;


  const shipX    = lm + 95;

  // Bill to
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Bill to", c1, y);

  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Ship to", shipX, y);

  y += 5;

  const bill = order.billingAddress ?? order.shippingAddress;
  const ship = order.shippingAddress;

  // Bill to details
  let by = y;
  if (bill) {
    doc.setFontSize(9);
    doc.setTextColor(BROWN);
    doc.setFont("helvetica", "bold");
    doc.text(`${bill.firstName} ${bill.lastName}`.trim(), c1, by);
    by += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BLACK);
    doc.setFontSize(8.5);
    [
      [bill.addressLine1, bill.addressLine2].filter(Boolean).join(", "),
      [bill.city, bill.emirates].filter(Boolean).join(", "),
      `Email: ${userEmail}`,
      `Phone: ${bill.phoneNumber}`,
    ].filter(Boolean).forEach((line) => {
      const wrapped = doc.splitTextToSize(line, 80);
      doc.text(wrapped, c1, by);
      by += wrapped.length * 4.5;
    });
  }

  // Ship to details
  let sy = y;
  if (ship) {
    doc.setFontSize(9);
    doc.setTextColor(BROWN);
    doc.setFont("helvetica", "bold");
    doc.text(`${ship.firstName} ${ship.lastName}`.trim(), shipX, sy);
    sy += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BLACK);
    doc.setFontSize(8.5);
    [
      [ship.addressLine1, ship.addressLine2].filter(Boolean).join(", "),
      [ship.city, ship.emirates].filter(Boolean).join(", "),
    ].filter(Boolean).forEach((line) => {
      const wrapped = doc.splitTextToSize(line, 80);
      doc.text(wrapped, shipX, sy);
      sy += wrapped.length * 4.5;
    });
  }

  y = Math.max(by, sy) + 8;
  hRule(doc, y, lm);
  y += 8;

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  const tableBody = order.items.map((item) => [
    item.productName + (item.variantName ? ` — ${item.variantName}` : ""),
    String(item.quantity),
    `AED${item.price.toFixed(0)}`,
    `AED ${(item.price * item.quantity).toFixed(0)}`,
  ]);

  autoTable(doc, {
    startY      : y,
    margin      : { left: lm, right: 20 },
    head        : [["Description", "Qty", "Unit Price", "Amount"]],
    body        : tableBody,
    styles      : { fontSize: 8.5, textColor: BLACK, cellPadding: 4 },
    headStyles  : {
      fillColor : WHITE,
      textColor : GREY,
      fontStyle : "normal",
      lineWidth : { bottom: 0.3 },
      lineColor : "#E0E0E0",
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    alternateRowStyles: { fillColor: WHITE },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  hRule(doc, y, lm);
  y += 8;

  // ── TOTALS ────────────────────────────────────────────────────────────────
  const totalsX    = rm - 60;
  const totalsValX = rm;

  const subtotal = order.financials.subtotal;
  const coupon   = order.financials.couponDiscount;
  const beans    = order.financials.wtCoinsDiscount;
  const shipping = order.financials.shippingCharge;
  const vat      = order.financials.taxAmount;
  const total    = order.financials.total;

  const totalsRows: [string, string][] = [
    ["Subtotal :",        `AED ${subtotal.toFixed(0)}`],
    ["Coupon Discount :", `AED ${coupon.toFixed(0)}`],
    ["Beans Discount :",  `AED ${beans.toFixed(0)}`],
    ["Shipping :",        `AED ${shipping.toFixed(0)}`],
    ["VAT tax :",         `AED ${vat.toFixed(0)}`],
  ];

  totalsRows.forEach(([label, val]) => {
    doc.setFontSize(8.5);
    doc.setTextColor(GREY);
    doc.setFont("helvetica", "normal");
    doc.text(label, totalsX, y);
    doc.setTextColor(BLACK);
    doc.text(val, totalsValX, y, { align: "right" });
    y += 6;
  });

  y += 2;
  hRule(doc, y, totalsX - 5);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Total", totalsX, y);
  doc.text(`AED ${total.toFixed(0)}`, totalsValX, y, { align: "right" });

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height;
  hRule(doc, pageH - 38, lm);

  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for your purchase", lm, pageH - 32);

  // Contact block bottom left
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(GREY);
  doc.text("Contact", lm, pageH - 24);
  doc.setTextColor(BLACK);
  doc.text(WM.email,          lm, pageH - 19);
  doc.text(WM.phone,          lm, pageH - 14);
  doc.text("www.whitemantis.ae", lm, pageH - 9);

  // TRN + legal right
  doc.setTextColor(GREY);
  doc.text(`TRN: ${WM.trn}`,  rm, pageH - 24, { align: "right" });
  doc.setTextColor(BLACK);
  doc.setFont("helvetica", "italic");
  doc.text(WM.legal,          rm, pageH - 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GREY);
  doc.text(WM.terms,          rm, pageH - 14, { align: "right" });

  return doc.output("datauristring");
}
// ─────────────────────────────────────────────────────────────────────────────
// SHARED CAFE INVOICE BUILDER (used by both takeaway + dine-in)
// ─────────────────────────────────────────────────────────────────────────────
async function buildCafeInvoice(
  order        : import("../api/apiCafeOrders").CafeOrder,
  userEmail    : string,
   userPhone    : string,
  thirdLabel   : string,   // "Pickup Time" or "Receipt Date"
  thirdValue   : string,   // slot time or placedAtLabel
): Promise<string> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.width;
  const lm  = 20;
  const rm  = W - 20;

  // ── Accent bar ─────────────────────────────────────────────────────────
  drawAccentBar(doc);

  // ── HEADER — logo+name LEFT, Invoice RIGHT ──────────────────────────────
  let y = 18;

  // Logo
  try {
    const img = await fetch("/logo.png")
      .then((r) => r.blob())
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
    doc.addImage(img, "PNG", lm, y - 6, 12, 12);
  } catch { /* skip */ }

  // Company name + details
  const cx = lm + 16;
  doc.setFontSize(10);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("WHITE MANTIS", cx, y);

  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Dubai's Finest Coffee",          cx, y + 5);
  doc.text("Shop 12, Al Wasl Road, Jumeirah", cx, y + 9);
  doc.text("Dubai, UAE",                      cx, y + 13);

  // Invoice title RIGHT
  doc.setFontSize(24);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice", rm, y + 2, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice date", rm, y + 9, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(BLACK);
  doc.setFont("helvetica", "bold");
  doc.text(order.placedAtLabel, rm, y + 14, { align: "right" });

  y += 26;
  hRule(doc, y, lm);
  y += 8;

  // ── INFO GRID ───────────────────────────────────────────────────────────
  const c1 = lm;
  const c2 = lm + 90;
  const c3 = lm + 140;

  // Recipient label + name
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Recipient", c1, y);
  y += 5;


  // We use shippingAddress name if available, else fallback
  doc.setFontSize(9);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text(userEmail ? userEmail.split("@")[0] : "Customer", c1, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setTextColor(BLACK);
  doc.setFont("helvetica", "normal");
  doc.text(userEmail || "—", c1, y);
  y += 4.5;
doc.text(userPhone || "—", c1, y);

  // Right columns (same top as Recipient label)
  const infoTopY = y - 14.5;

  labelValue(doc, "Invoice no.",  `INV-${order.id}`, c2, infoTopY);
  labelValue(doc, "Order Date",   order.placedAtLabel, c3, infoTopY);

  // Row 2 right — Payment Method + third field
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Payment Method", c2, infoTopY + 14);
  doc.setFontSize(9);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Stripe", c2, infoTopY + 19);

  // Third field (Pickup Time or Receipt Date)
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.text(thirdLabel, c3, infoTopY + 14);
  doc.setFontSize(9);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text(thirdValue || "—", c3, infoTopY + 19);

  y += 18;
  hRule(doc, y, lm);
  y += 8;

  // ── ITEMS TABLE ─────────────────────────────────────────────────────────
  const tableBody = order.items.map((item) => {
    const customLabel = item.customizations.length > 0
      ? item.customizations.map((c) => c.selectedOptionLabel ?? c.label ?? "").filter(Boolean).join(", ")
      : "—";
    const amount = (item.unitPrice * item.quantity).toFixed(0);
    return [
      item.quantity > 1
        ? `${item.productName} ×${item.quantity}`
        : item.productName,
      customLabel,
      `AED${item.unitPrice.toFixed(0)}`,
      `AED ${amount}`,
    ];
  });

  autoTable(doc, {
    startY      : y,
    margin      : { left: lm, right: 20 },
    head        : [["Description", "Customization", "Unit Price", "Amount"]],
    body        : tableBody,
    styles      : { fontSize: 8.5, textColor: BLACK, cellPadding: 4 },
    headStyles  : {
      fillColor : WHITE,
      textColor : GREY,
      fontStyle : "normal",
      lineWidth : { bottom: 0.3 },
      lineColor : "#E0E0E0",
    },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 45, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: { fillColor: WHITE },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  hRule(doc, y, lm);
  y += 8;

  // ── TOTALS ──────────────────────────────────────────────────────────────
  const totalsX    = rm - 60;
  const totalsValX = rm;

  const subtotal = order.financials.subtotal;
  const coupon   = order.financials.couponDiscount;
  const beans    = order.financials.coinsDiscount;
  const shipping = 0; // cafe has no shipping
  const vat      = order.financials.taxAmount;
  const total    = order.financials.total;

  const totalsRows: [string, string][] = [
    ["Subtotal :",        `AED ${subtotal.toFixed(0)}`],
    ["Coupon Discount :", `AED ${coupon.toFixed(0)}`],
    ["Beans Discount :",  `AED ${beans.toFixed(0)}`],
    ["Shipping :",        `AED ${shipping.toFixed(0)}`],
    ["VAT tax :",         `AED ${vat.toFixed(0)}`],
  ];

  totalsRows.forEach(([label, val]) => {
    doc.setFontSize(8.5);
    doc.setTextColor(GREY);
    doc.setFont("helvetica", "normal");
    doc.text(label, totalsX, y);
    doc.setTextColor(BLACK);
    doc.text(val, totalsValX, y, { align: "right" });
    y += 6;
  });

  y += 2;
hRule(doc, y, totalsX);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Total", totalsX, y);
  doc.text(`AED ${total.toFixed(0)}`, totalsValX, y, { align: "right" });

  // ── FOOTER ──────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height;
  hRule(doc, pageH - 38, lm);

  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for your purchase", lm, pageH - 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(GREY);
  doc.text("Contact",            lm, pageH - 24);
  doc.setTextColor(BLACK);
  doc.text(WM.email,             lm, pageH - 19);
  doc.text(WM.phone,             lm, pageH - 14);
  doc.text("www.whitemantis.ae", lm, pageH - 9);

  doc.setTextColor(GREY);
  doc.text(`TRN: ${WM.trn}`, rm, pageH - 24, { align: "right" });
  doc.setTextColor(BLACK);
  doc.setFont("helvetica", "italic");
  doc.text(WM.legal,   rm, pageH - 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GREY);
  doc.text(WM.terms,   rm, pageH - 14, { align: "right" });

  return doc.output("datauristring");
}

// ─────────────────────────────────────────────────────────────────────────────
// CAFE TAKEAWAY INVOICE
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCafeTakeawayInvoice(
  order    : import("../api/apiCafeOrders").CafeOrder,
  userEmail: string,
  userPhone: string,
): Promise<string> {
  let pickupTime = "—";
  if (order.slot) {
    try {
      // slot may be a time string like "09:30 AM" or an ISO string
      const slotStr = String(order.slot);
      if (slotStr.includes("T") || slotStr.includes("-")) {
        pickupTime = new Date(slotStr).toLocaleTimeString("en-US", {
          hour  : "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } else {
        // Already formatted like "09:30 AM"
        pickupTime = slotStr;
      }
    } catch {
      pickupTime = String(order.slot);
    }
  }
  return buildCafeInvoice(order, userEmail, userPhone, "Pickup Time", pickupTime);
}
export async function generateCafeDineInInvoice(
  order    : import("../api/apiCafeOrders").CafeOrder,
  userEmail: string,
  userPhone: string,
): Promise<string> {
  return buildCafeInvoice(order, userEmail, userPhone, "Receipt Date", order.placedAtLabel);
}
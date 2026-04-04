import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

/**
 * Downloads a PDF on both web and native (iOS/Android via Capacitor).
 * @param pdfBase64 - base64 string of the PDF (from jsPDF's output('datauristring'))
 * @param fileName  - e.g. "invoice-WMS-8.pdf"
 */
export async function downloadPdf(
  pdfBase64: string,
  fileName: string,
): Promise<void> {
  const platform = Capacitor.getPlatform();

  // ── WEB ──────────────────────────────────────────────────────────────────
  if (platform === "web") {
    // Strip the data URI prefix if present — we need raw base64
    const base64Data = pdfBase64.includes(",")
      ? pdfBase64.split(",")[1]
      : pdfBase64;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });

    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // ── NATIVE (iOS / Android) ────────────────────────────────────────────────
  try {
    // Strip data URI prefix if present
    const base64Data = pdfBase64.includes(",")
      ? pdfBase64.split(",")[1]
      : pdfBase64;

    // Write file to device Documents directory
    const result = await Filesystem.writeFile({
      path      : fileName,
      data      : base64Data,
      directory : Directory.Documents,
      recursive : true,
    });

    // Open the file so user can view/share it
    const { FileOpener } = await import("@capacitor-community/file-opener");
    await FileOpener.open({
      filePath  : result.uri,
      contentType: "application/pdf",
    });
  } catch (err) {
    console.error("[downloadPdf] native error:", err);
    // Friendly alert so user knows something went wrong
    alert("Could not save PDF. Please try again.");
  }
}
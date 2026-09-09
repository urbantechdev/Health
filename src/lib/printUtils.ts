export interface PrintOptions {
  title?: string;
  pageOrientation?: "portrait" | "landscape";
  paperSize?: "a4" | "a5" | "letter" | "receipt80mm" | string;
}

export interface PdfOptions {
  fileName?: string;
  title?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "a5" | "letter" | string;
  scale?: number;
  addPageNumbers?: boolean;
}

export async function printElement(
  elementIdOrRef: string | HTMLElement,
  options?: PrintOptions
): Promise<void> {
  const el =
    typeof elementIdOrRef === "string"
      ? document.getElementById(elementIdOrRef)
      : elementIdOrRef;

  if (!el) {
    console.warn(`[printUtils] Element not found: ${elementIdOrRef}`);
    window.print();
    return;
  }

  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const doc = printFrame.contentWindow?.document;
  if (!doc) {
    window.print();
    document.body.removeChild(printFrame);
    return;
  }

  // Copy head stylesheets and styles
  const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("\n");

  const orientation = options?.pageOrientation || "portrait";
  const paperSize = options?.paperSize || "a4";

  doc.open();
  doc.write(`
    <!doctype html>
    <html>
      <head>
        <title>${options?.title || "Hospital Record Document"}</title>
        ${styles}
        <style>
          @page {
            size: ${paperSize} ${orientation};
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0;
            padding: 10px;
          }
          .no-print, [data-no-print="true"] {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${el.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (err) {
      console.warn("[printUtils] Error printing from iframe:", err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 2000);
    }
  }, 500);
}

export async function downloadElementAsPdf(
  elementIdOrRef: string | HTMLElement,
  options?: PdfOptions
): Promise<boolean> {
  const el =
    typeof elementIdOrRef === "string"
      ? document.getElementById(elementIdOrRef)
      : elementIdOrRef;

  if (!el) {
    console.warn(`[printUtils] Element not found for PDF export: ${elementIdOrRef}`);
    return false;
  }

  try {
    const filename = options?.fileName || "Hospital_Document.html";
    const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((node) => node.outerHTML)
      .join("\n");

    const htmlContent = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${options?.title || "Hospital Document"}</title>
          ${styles}
          <style>
            @media print {
              .no-print { display: none !important; }
            }
            body { background: #fff; padding: 20px; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body>
          ${el.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".html") || filename.endsWith(".pdf") ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("[printUtils] PDF download error:", err);
    return false;
  }
}

export function estimatePageCount(
  elementIdOrRef: string | HTMLElement,
  _paperSize = "a4",
  _orientation = "portrait"
): number {
  const el =
    typeof elementIdOrRef === "string"
      ? document.getElementById(elementIdOrRef)
      : elementIdOrRef;
  if (!el) return 1;
  const height = el.scrollHeight || el.clientHeight || 800;
  const pageHeight = 980;
  return Math.max(1, Math.ceil(height / pageHeight));
}

export function numberToKenyanShillingsWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Zero Shillings Only";

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(n: number): string {
    let str = "";
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + " ";
    }
    return str.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - integerPart) * 100);

  let result = "";
  if (integerPart === 0) {
    result = "Zero";
  } else {
    const billions = Math.floor(integerPart / 1_000_000_000);
    const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
    const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
    const remainder = integerPart % 1000;

    if (billions > 0) result += convertGroup(billions) + " Billion ";
    if (millions > 0) result += convertGroup(millions) + " Million ";
    if (thousands > 0) result += convertGroup(thousands) + " Thousand ";
    if (remainder > 0) result += convertGroup(remainder) + " ";
  }

  result = result.trim() + " Shillings";
  if (cents > 0) {
    result += ` and ${convertGroup(cents)} Cents`;
  }
  result += " Only";

  return result.trim();
}

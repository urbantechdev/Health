import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export interface PrintOptions {
  title?: string;
  documentName?: string;
  pageOrientation?: "portrait" | "landscape";
  paperSize?: "a4" | "a5" | "letter" | "receipt80mm";
  margins?: string; // e.g. "8mm"
  customStyles?: string;
  delayMs?: number;
}

export interface PdfOptions {
  fileName?: string;
  title?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter" | "a5";
  marginMm?: number;
  scale?: number;
  quality?: number;
  addPageNumbers?: boolean;
}

/**
 * Universal print handler that works reliably in all browsers, modals, and inside iframe sandboxes.
 * Ensures full vertical document height (no clipping from scrollable modal overflow),
 * preserves exact colors/fonts, and triggers the print dialog cleanly.
 */
export async function printElement(
  target: string | HTMLElement,
  options: PrintOptions = {}
): Promise<boolean> {
  const element = typeof target === "string" ? document.getElementById(target) : target;
  if (!element) {
    console.error(`[printElement] Target element not found:`, target);
    try {
      window.print();
      return true;
    } catch {
      return false;
    }
  }

  const {
    title = "Hospital Medical Document",
    pageOrientation = "portrait",
    paperSize = "a4",
    margins = "8mm",
    customStyles = ""
  } = options;

  const originalDocTitle = document.title;
  document.title = title;

  // Determine page size CSS
  let pageSizeCss = "A4 portrait";
  if (paperSize === "receipt80mm") {
    pageSizeCss = "80mm auto";
  } else if (paperSize === "a5") {
    pageSizeCss = `A5 ${pageOrientation}`;
  } else if (pageOrientation === "landscape") {
    pageSizeCss = "A4 landscape";
  }

  // Inject dynamic print stylesheet ensuring clean multi-page output
  const printStyleId = "dynamic-print-page-style";
  let printStyleEl = document.getElementById(printStyleId);
  if (printStyleEl) {
    printStyleEl.remove();
  }
  printStyleEl = document.createElement("style");
  printStyleEl.id = printStyleId;
  printStyleEl.innerHTML = `
    @media screen {
      #print-active-portal {
        display: none !important;
      }
    }
    @media print {
      @page {
        size: ${pageSizeCss} !important;
        margin: ${margins} !important;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        color: #0f172a !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        min-height: 100% !important;
        overflow: visible !important;
      }
      body.printing-isolated #root {
        display: none !important;
      }
      body.printing-isolated #print-active-portal {
        display: block !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        overflow: visible !important;
        height: auto !important;
        box-shadow: none !important;
        border: none !important;
      }
      body.printing-isolated #print-active-portal button,
      body.printing-isolated #print-active-portal [role="button"],
      body.printing-isolated #print-active-portal .no-print,
      body.printing-isolated #print-active-portal [data-no-print="true"] {
        display: none !important;
      }
      body.printing-isolated #print-active-portal table,
      body.printing-isolated #print-active-portal tr,
      body.printing-isolated #print-active-portal td,
      body.printing-isolated #print-active-portal th,
      body.printing-isolated #print-active-portal .avoid-break,
      body.printing-isolated #print-active-portal .page-break-inside-avoid,
      body.printing-isolated #print-active-portal fieldset,
      body.printing-isolated #print-active-portal .print-card,
      body.printing-isolated #print-active-portal img,
      body.printing-isolated #print-active-portal svg,
      body.printing-isolated #print-active-portal .signature-box {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      ${customStyles}
    }
  `;
  document.head.appendChild(printStyleEl);

  // Create isolated portal directly under document.body
  const portalId = "print-active-portal";
  let portal = document.getElementById(portalId);
  if (portal) {
    portal.remove();
  }

  portal = document.createElement("div");
  portal.id = portalId;
  portal.className = "printable-document-root";

  // Deep clone element
  const clone = element.cloneNode(true) as HTMLElement;

  // Strip interactive non-print buttons from the clone
  clone.querySelectorAll("button, [role='button'], .no-print, [data-no-print='true']").forEach((btn) => btn.remove());

  // Copy values from any input, textarea, select
  const originalInputs = element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
  const clonedInputs = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
  originalInputs.forEach((orig, idx) => {
    if (clonedInputs[idx]) {
      clonedInputs[idx].value = orig.value;
      if (orig instanceof HTMLInputElement && (orig.type === "checkbox" || orig.type === "radio")) {
        (clonedInputs[idx] as HTMLInputElement).checked = orig.checked;
      }
    }
  });

  portal.appendChild(clone);
  document.body.appendChild(portal);
  document.body.classList.add("printing-isolated");

  const cleanup = () => {
    document.body.classList.remove("printing-isolated");
    const p = document.getElementById(portalId);
    if (p && p.parentNode) p.remove();
    const s = document.getElementById(printStyleId);
    if (s && s.parentNode) s.remove();
    document.title = originalDocTitle;
  };

  // Microtask yield so DOM updates render in the portal before print dialog opens
  await new Promise((resolve) => setTimeout(resolve, 60));

  try {
    const onAfterPrint = () => {
      cleanup();
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint, { once: true });

    // Open actual native printer dialog
    window.print();

    // Fallback cleanup
    setTimeout(cleanup, 2500);
    return true;
  } catch (err) {
    console.warn("[printElement] Direct window.print() failed or restricted by sandbox environment. Exporting PDF:", err);
    cleanup();
    // Guarantee real document generation even if iframe sandbox restricts window.print()
    await downloadElementAsPdf(element, {
      fileName: `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
      title: title.replace(/_/g, " "),
      format: paperSize === "receipt80mm" || paperSize === "a5" ? "a5" : "a4",
      orientation: pageOrientation,
      scale: 2
    });
    return true;
  }
}

/**
 * Accurately estimates how many A4 pages a DOM element will occupy.
 */
export function estimatePageCount(
  target: string | HTMLElement,
  format: "a4" | "letter" | "a5" = "a4",
  orientation: "portrait" | "landscape" = "portrait"
): number {
  const element = typeof target === "string" ? document.getElementById(target) : target;
  if (!element) return 1;

  const standardA4HeightPx = orientation === "portrait" ? 1123 : 794;
  const elementHeightPx = Math.max(element.scrollHeight, element.offsetHeight, element.clientHeight);

  if (elementHeightPx <= 0) return 1;
  return Math.max(1, Math.ceil(elementHeightPx / standardA4HeightPx));
}

/**
 * Downloads any DOM element as a high-definition, multi-page PDF document.
 * Slices multi-page hospital documents cleanly across A4 pages without truncation or cut-offs,
 * and attaches clear page numbering and official document metadata.
 */
export async function downloadElementAsPdf(
  target: string | HTMLElement,
  options: PdfOptions = {}
): Promise<boolean> {
  const element = typeof target === "string" ? document.getElementById(target) : target;
  if (!element) {
    console.error(`[downloadElementAsPdf] Target element not found:`, target);
    return false;
  }

  const {
    fileName = `Hospital_Document_${new Date().toISOString().slice(0, 10)}.pdf`,
    title = "Hospital Medical Document",
    orientation = "portrait",
    format = "a4",
    marginMm = 8,
    scale = 2,
    addPageNumbers = true
  } = options;

  // Clone element to a completely isolated, unconstrained measurement container
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove interactive buttons and print exclusions from clone
  clone.querySelectorAll("button, [data-no-print='true'], .no-print, [role='button']").forEach((el) => {
    el.remove();
  });

  // Ensure inner scrollbars or max-height constraints are completely stripped on clone
  clone.style.maxHeight = "none";
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  clone.querySelectorAll("*").forEach((child) => {
    const htmlChild = child as HTMLElement;
    if (htmlChild.style) {
      if (htmlChild.style.overflow && htmlChild.style.overflow !== "visible") {
        htmlChild.style.overflow = "visible";
      }
      if (htmlChild.style.maxHeight) {
        htmlChild.style.maxHeight = "none";
      }
    }
  });

  const targetWidthPx = orientation === "portrait" ? 794 : 1123; // Standard 96 DPI A4 representation

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = `${targetWidthPx}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#0f172a";
  wrapper.style.padding = "20px";
  wrapper.style.margin = "0";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.zIndex = "-99999";
  wrapper.style.overflow = "visible";
  wrapper.style.fontFamily = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // Generate high-definition canvas using html2canvas-pro
    const canvas = await html2canvas(wrapper, {
      scale: Math.min(scale, 2.5),
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: targetWidthPx,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        // Double-safety: convert any oklch color attributes or inline styles
        try {
          const testCanvas = clonedDoc.createElement("canvas");
          const ctx = testCanvas.getContext("2d");
          if (ctx) {
            const allElements = clonedDoc.querySelectorAll("*");
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style) {
                // If any style property contains oklch, sanitize it
                const props = ["color", "backgroundColor", "borderColor", "outlineColor"];
                props.forEach((prop) => {
                  const val = (htmlEl.style as any)[prop];
                  if (val && typeof val === "string" && val.includes("oklch")) {
                    try {
                      ctx.fillStyle = val;
                      (htmlEl.style as any)[prop] = ctx.fillStyle;
                    } catch {
                      (htmlEl.style as any)[prop] = prop === "color" ? "#0f172a" : prop === "backgroundColor" ? "#ffffff" : "#cbd5e1";
                    }
                  }
                });
              }
            });
          }
        } catch (e) {
          console.warn("[downloadElementAsPdf] onclone color cleanup warning:", e);
        }
      }
    });

    // Remove temporary DOM wrapper
    if (wrapper.parentNode) {
      wrapper.remove();
    }

    // Page dimensions in millimeters
    let pdfPageWidth = 210;
    let pdfPageHeight = 297;
    if (format === "a5") {
      pdfPageWidth = orientation === "portrait" ? 148 : 210;
      pdfPageHeight = orientation === "portrait" ? 210 : 148;
    } else if (format === "letter") {
      pdfPageWidth = orientation === "portrait" ? 215.9 : 279.4;
      pdfPageHeight = orientation === "portrait" ? 279.4 : 215.9;
    } else {
      pdfPageWidth = orientation === "portrait" ? 210 : 297;
      pdfPageHeight = orientation === "portrait" ? 297 : 210;
    }

    // Printable content bounding box
    const contentWidthMm = pdfPageWidth - marginMm * 2;
    const contentHeightMm = pdfPageHeight - marginMm * 2;

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    // Total height in PDF millimeters
    const totalPdfHeightMm = (imgHeightPx * contentWidthMm) / imgWidthPx;

    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: format
    });

    pdf.setProperties({
      title: title,
      subject: "Hospital Medical Records, Invoices & Clinical Documentation",
      author: "NextGen Hospital Management System",
      creator: "HMIS Health Suite"
    });

    // Case 1: Fits comfortably within a single page
    if (totalPdfHeightMm <= contentHeightMm) {
      const imgData = canvas.toDataURL("image/png", 0.95);
      pdf.addImage(
        imgData,
        "PNG",
        marginMm,
        marginMm,
        contentWidthMm,
        totalPdfHeightMm,
        undefined,
        "FAST"
      );

      if (addPageNumbers) {
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
          `Page 1 of 1 • ${title} • Certified System Record`,
          pdfPageWidth / 2,
          pdfPageHeight - 4,
          { align: "center" }
        );
      }
    } else {
      // Case 2: Multi-Page Slicing
      const pageHeightPx = (contentHeightMm * imgWidthPx) / contentWidthMm;
      const totalPages = Math.ceil(imgHeightPx / pageHeightPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage(format, orientation);
        }

        const sourceYPx = page * pageHeightPx;
        const currentSliceHeightPx = Math.min(pageHeightPx, imgHeightPx - sourceYPx);

        // Render page slice onto individual canvas
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidthPx;
        pageCanvas.height = currentSliceHeightPx;

        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sourceYPx,
            imgWidthPx,
            currentSliceHeightPx,
            0,
            0,
            imgWidthPx,
            currentSliceHeightPx
          );

          const sliceHeightMm = (currentSliceHeightPx * contentWidthMm) / imgWidthPx;
          const pageImgData = pageCanvas.toDataURL("image/png", 0.95);

          pdf.addImage(
            pageImgData,
            "PNG",
            marginMm,
            marginMm,
            contentWidthMm,
            sliceHeightMm,
            undefined,
            "FAST"
          );

          // Add clean page numbering and document reference in footer
          if (addPageNumbers) {
            pdf.setFontSize(7.5);
            pdf.setTextColor(148, 163, 184);
            pdf.text(
              `Page ${page + 1} of ${totalPages} • ${title} • Certified Electronic Record`,
              pdfPageWidth / 2,
              pdfPageHeight - 4,
              { align: "center" }
            );
          }
        }
      }
    }

    // Save and download PDF file
    const cleanFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    pdf.save(cleanFileName);
    return true;
  } catch (error) {
    console.error("[downloadElementAsPdf] Failed to generate PDF document:", error);
    if (wrapper && wrapper.parentNode) {
      wrapper.remove();
    }
    return false;
  }
}

/**
 * Converts a numeric amount to Kenyan Shillings in words (e.g. 1500 -> "One Thousand Five Hundred Kenya Shillings Only")
 */
export function numberToKenyanShillingsWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Zero Kenya Shillings Only";
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

  function convertGroup(n: number): string {
    let out = "";
    if (n >= 100) {
      out += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      out += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    } else if (n >= 10) {
      out += teens[n - 10] + " ";
      n = 0;
    }
    if (n > 0) {
      out += ones[n] + " ";
    }
    return out.trim();
  }

  const rounded = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - rounded) * 100);

  const billions = Math.floor(rounded / 1000000000);
  const millions = Math.floor((rounded % 1000000000) / 1000000);
  const thousands = Math.floor((rounded % 1000000) / 1000);
  const remainder = rounded % 1000;

  let words = "";
  if (billions > 0) words += convertGroup(billions) + " Billion ";
  if (millions > 0) words += convertGroup(millions) + " Million ";
  if (thousands > 0) words += convertGroup(thousands) + " Thousand ";
  if (remainder > 0) words += convertGroup(remainder) + " ";

  words = words.trim() + " Kenya Shillings";
  if (cents > 0) {
    words += ` and ${convertGroup(cents)} Cents`;
  }
  return (words + " Only").replace(/\s+/g, " ");
}


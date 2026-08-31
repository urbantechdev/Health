import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
    customStyles = "",
    delayMs = 350
  } = options;

  // Determine page size CSS
  let pageSizeCss = "A4 portrait";
  if (paperSize === "receipt80mm") {
    pageSizeCss = "80mm auto";
  } else if (paperSize === "a5") {
    pageSizeCss = `A5 ${pageOrientation}`;
  } else if (pageOrientation === "landscape") {
    pageSizeCss = "A4 landscape";
  }

  // Gather existing stylesheets from the document
  const headStyles: string[] = [];
  document.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
    headStyles.push(node.outerHTML);
  });

  const fullPrintHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Comfortaa:wght@400;600;700&family=Outfit:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
        ${headStyles.join("\n")}
        <style>
          @page {
            size: ${pageSizeCss};
            margin: ${margins};
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
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
            overflow: visible !important;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
          }
          .no-print, [data-no-print="true"], button, [role="button"] {
            display: none !important;
          }
          .printable-content {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            height: auto !important;
          }
          table, tr, td, th, .avoid-break, .page-break-inside-avoid, fieldset, .print-card, img, svg, .signature-box {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .force-page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          ${customStyles}
        </style>
      </head>
      <body>
        <div class="printable-content">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `;

  // Method 1: Print via dedicated full-dimension hidden iframe
  try {
    const iframeId = "print-utility-isolated-frame";
    let printIframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (printIframe) {
      printIframe.remove();
    }

    printIframe = document.createElement("iframe");
    printIframe.id = iframeId;
    printIframe.style.position = "fixed";
    printIframe.style.top = "0";
    printIframe.style.left = "0";
    printIframe.style.width = "100%";
    printIframe.style.height = "100%";
    printIframe.style.border = "none";
    printIframe.style.opacity = "0.001";
    printIframe.style.pointerEvents = "none";
    printIframe.style.zIndex = "-999";
    document.body.appendChild(printIframe);

    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc || !printIframe.contentWindow) {
      throw new Error("Cannot access print iframe document");
    }

    iframeDoc.open();
    iframeDoc.write(fullPrintHtml);
    iframeDoc.close();

    // Wait for fonts and images to load in the iframe
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Trigger focus and print
    printIframe.contentWindow.focus();
    printIframe.contentWindow.print();

    // Remove iframe after print dialog completes
    setTimeout(() => {
      if (printIframe && printIframe.parentNode) {
        printIframe.remove();
      }
    }, 4000);

    return true;
  } catch (err) {
    console.warn("[printElement] Iframe print failed, falling back to direct DOM isolation:", err);

    // Method 2 (Fallback): Direct Document Body Isolation
    const originalDocTitle = document.title;
    document.title = title;

    const portalId = "print-active-portal";
    let portal = document.getElementById(portalId);
    if (portal) {
      portal.remove();
    }

    portal = document.createElement("div");
    portal.id = portalId;
    portal.className = "printable-document-root";
    portal.style.position = "absolute";
    portal.style.top = "0";
    portal.style.left = "0";
    portal.style.width = "100%";
    portal.style.backgroundColor = "#ffffff";
    portal.style.zIndex = "999999";
    portal.innerHTML = element.innerHTML;

    // Strip buttons from portal clone
    portal.querySelectorAll("button, [data-no-print='true'], .no-print, [role='button']").forEach((btn) => btn.remove());

    document.body.appendChild(portal);
    document.body.classList.add("printing-isolated");

    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      window.print();
    } finally {
      // Clean up after print
      setTimeout(() => {
        document.body.classList.remove("printing-isolated");
        if (portal && portal.parentNode) {
          portal.remove();
        }
        document.title = originalDocTitle;
      }, 2500);
    }

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
    // Generate high-definition canvas using html2canvas
    const canvas = await html2canvas(wrapper, {
      scale: Math.min(scale, 2.5),
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: targetWidthPx,
      scrollX: 0,
      scrollY: 0
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

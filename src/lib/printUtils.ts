import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PrintOptions {
  title?: string;
  documentName?: string;
  pageOrientation?: "portrait" | "landscape";
  paperSize?: "a4" | "a5" | "letter" | "receipt80mm";
  margins?: string; // e.g. "8mm"
  customStyles?: string;
}

export interface PdfOptions {
  fileName?: string;
  title?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter" | "a5";
  marginMm?: number;
  scale?: number;
  quality?: number;
}

/**
 * Universal print handler that works reliably inside iframes, modals, and embedded windows.
 * Extracts the target element into a dedicated print container or isolated iframe,
 * ensures full vertical height (no clipping from modal overflow), applies all stylesheets,
 * and triggers the system print dialog.
 */
export async function printElement(
  target: string | HTMLElement,
  options: PrintOptions = {}
): Promise<boolean> {
  const element = typeof target === "string" ? document.getElementById(target) : target;
  if (!element) {
    console.error(`[printElement] Target element not found:`, target);
    window.print();
    return false;
  }

  const {
    title = "Hospital Medical Document",
    pageOrientation = "portrait",
    paperSize = "a4",
    margins = "8mm",
    customStyles = ""
  } = options;

  // Gather all style and link tags from current document
  const headStyles: string[] = [];
  document.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
    headStyles.push(node.outerHTML);
  });

  // Calculate page size rule
  let pageSizeRule = "A4 portrait";
  if (paperSize === "receipt80mm") {
    pageSizeRule = "80mm auto";
  } else if (paperSize === "a5") {
    pageSizeRule = `A5 ${pageOrientation}`;
  } else if (pageOrientation === "landscape") {
    pageSizeRule = "A4 landscape";
  }

  const printDocumentHtml = `
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
            size: ${pageSizeRule};
            margin: ${margins};
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
            overflow: visible !important;
            height: auto !important;
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
          /* Page break avoidance for critical hospital document blocks */
          table, tr, .avoid-break, .page-break-inside-avoid, fieldset, .print-card, img, svg {
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

  // Create an isolated hidden iframe for printing
  const iframeId = "print-utility-iframe";
  let printIframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (printIframe) {
    printIframe.remove();
  }

  printIframe = document.createElement("iframe");
  printIframe.id = iframeId;
  printIframe.style.position = "fixed";
  printIframe.style.right = "0";
  printIframe.style.bottom = "0";
  printIframe.style.width = "0px";
  printIframe.style.height = "0px";
  printIframe.style.border = "none";
  printIframe.style.visibility = "hidden";
  printIframe.style.zIndex = "-9999";
  document.body.appendChild(printIframe);

  try {
    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc || !printIframe.contentWindow) {
      throw new Error("Cannot access print iframe document");
    }

    iframeDoc.open();
    iframeDoc.write(printDocumentHtml);
    iframeDoc.close();

    // Allow images and fonts in the iframe to render
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Focus and execute print
    printIframe.contentWindow.focus();
    printIframe.contentWindow.print();

    // Schedule cleanup
    setTimeout(() => {
      if (printIframe && printIframe.parentNode) {
        printIframe.parentNode.removeChild(printIframe);
      }
    }, 2500);

    return true;
  } catch (err) {
    console.warn("[printElement] Iframe print fallback triggered:", err);

    // Fallback: create a temporary printable container in the current page
    const tempContainer = document.createElement("div");
    tempContainer.id = "print-fallback-container";
    tempContainer.className = "fixed inset-0 bg-white z-[999999] p-8 overflow-visible";
    tempContainer.innerHTML = element.innerHTML;
    document.body.appendChild(tempContainer);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "visible";

    window.print();

    document.body.style.overflow = originalOverflow;
    if (tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
    return true;
  }
}

/**
 * Downloads any DOM element as a high-definition, multi-page PDF.
 * Slices long hospital documents across clean A4 pages without truncation or cut-offs.
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
    marginMm = 10,
    scale = 2
  } = options;

  // Clone element to a clean, isolated container without scroll/height constraints
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remove interactive elements and buttons from the clone
  clone.querySelectorAll("button, [data-no-print='true'], .no-print, [role='button']").forEach((el) => {
    el.remove();
  });

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = orientation === "portrait" ? "794px" : "1123px"; // Standard 96 DPI A4 width
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#0f172a";
  wrapper.style.padding = "24px";
  wrapper.style.margin = "0";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.zIndex = "-99999";
  wrapper.style.overflow = "visible";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // Generate high-resolution canvas with html2canvas
    const canvas = await html2canvas(wrapper, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: orientation === "portrait" ? 794 : 1123
    });

    // Clean up temporary DOM wrapper
    wrapper.remove();

    // A4 dimensions in millimeters
    const pdfPageWidth = orientation === "portrait" ? 210 : 297;
    const pdfPageHeight = orientation === "portrait" ? 297 : 210;
    
    // Printable content area inside margins
    const contentWidthMm = pdfPageWidth - marginMm * 2;
    const contentHeightMm = pdfPageHeight - marginMm * 2;

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    // Calculate total height in PDF mm based on aspect ratio
    const totalPdfHeightMm = (imgHeightPx * contentWidthMm) / imgWidthPx;

    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: format
    });

    pdf.setProperties({
      title: title,
      subject: "Hospital Clinical Records & Invoices",
      author: "HMS NextGen e-Health System",
      creator: "HMS Hospital Management Suite"
    });

    // If total document fits on one page (with a small margin tolerance)
    if (totalPdfHeightMm <= contentHeightMm) {
      const imgData = canvas.toDataURL("image/png", 0.98);
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
    } else {
      // Multi-Page Slicing Algorithm
      // Calculate how many canvas pixels correspond to one PDF page content height
      const pageHeightPx = (contentHeightMm * imgWidthPx) / contentWidthMm;
      const totalPages = Math.ceil(imgHeightPx / pageHeightPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage(format, orientation);
        }

        const sourceYPx = page * pageHeightPx;
        const currentSliceHeightPx = Math.min(pageHeightPx, imgHeightPx - sourceYPx);

        // Create slice canvas for this page
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
          const pageImgData = pageCanvas.toDataURL("image/png", 0.98);

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

          // Add subtle page number in footer
          pdf.setFontSize(8);
          pdf.setTextColor(148, 163, 184);
          pdf.text(
            `Page ${page + 1} of ${totalPages} • ${title}`,
            pdfPageWidth / 2,
            pdfPageHeight - 4,
            { align: "center" }
          );
        }
      }
    }

    // Save and trigger file download
    const cleanFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    pdf.save(cleanFileName);
    return true;
  } catch (error) {
    console.error("[downloadElementAsPdf] Failed to generate PDF:", error);
    if (wrapper.parentNode) {
      wrapper.remove();
    }
    return false;
  }
}

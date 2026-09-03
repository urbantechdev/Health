import React, { useState } from "react";
import { Printer, Download, Loader2, CheckCircle2 } from "lucide-react";
import { printElement, downloadElementAsPdf, PrintOptions, PdfOptions } from "../lib/printUtils";

interface DocumentActionsToolbarProps {
  targetElementId: string;
  documentTitle: string;
  fileName?: string;
  orientation?: "portrait" | "landscape";
  paperSize?: "a4" | "a5" | "letter" | "receipt80mm";
  extraControls?: React.ReactNode;
  onBeforePrint?: () => void;
  className?: string;
}

export default function DocumentActionsToolbar({
  targetElementId,
  documentTitle,
  fileName,
  orientation = "portrait",
  paperSize = "a4",
  extraControls,
  onBeforePrint,
  className = ""
}: DocumentActionsToolbarProps) {
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const cleanFileName = (
    fileName ||
    `${documentTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`
  ).replace(/\.pdf$/i, "") + ".pdf";

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    if (onBeforePrint) onBeforePrint();

    try {
      await printElement(targetElementId, {
        title: documentTitle,
        pageOrientation: orientation,
        paperSize: paperSize
      });
    } catch (err) {
      console.error("Print error:", err);
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const success = await downloadElementAsPdf(targetElementId, {
        fileName: cleanFileName,
        title: documentTitle,
        orientation: orientation,
        format: paperSize === "a5" ? "a5" : "a4",
        scale: 2
      });

      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error("PDF Download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      id="document-actions-toolbar"
      data-no-print="true"
      className={`no-print flex flex-wrap items-center gap-2 ${className}`}
    >
      {extraControls}

      {/* Print Document Button */}
      <button
        type="button"
        id="btn-doc-print-action"
        disabled={printing}
        onClick={handlePrint}
        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
        title="Send complete document to physical printer or browser print preview"
      >
        {printing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Preparing Print...</span>
          </>
        ) : (
          <>
            <Printer className="w-3.5 h-3.5" />
            <span>Print Document</span>
          </>
        )}
      </button>

      {/* Download Full Multi-Page PDF Button */}
      <button
        type="button"
        id="btn-doc-download-pdf-action"
        disabled={downloading}
        onClick={handleDownloadPdf}
        className={`px-3.5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 ${
          downloadSuccess
            ? "bg-emerald-800 text-white shadow-emerald-800/20"
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
        }`}
        title="Download full multi-page PDF document directly to your device"
      >
        {downloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Exporting Full PDF...</span>
          </>
        ) : downloadSuccess ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>PDF Downloaded!</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Download Full PDF</span>
          </>
        )}
      </button>
    </div>
  );
}

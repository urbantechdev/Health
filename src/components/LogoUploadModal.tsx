import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Link2, 
  Check, 
  Trash2, 
  Sparkles, 
  Globe, 
  Copy, 
  FileText, 
  Building2,
  CheckCircle2,
  ShieldAlert
} from "lucide-react";
import { DEFAULT_BRAND_LOGO } from "./DocumentLogo";

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string;
  onSaveLogo: (url: string) => void;
  currentDocumentLogo?: string;
  onSaveDocumentLogo?: (url: string) => void;
  currentFavicon?: string;
  onSaveFavicon?: (url: string) => void;
  hospitalName?: string;
  onSaveHospitalName?: (name: string) => void;
}

const PRESET_LOGOS = [
  {
    name: "HMIS Medical Emblem",
    url: "https://i.pinimg.com/1200x/0d/21/0a/0d210ae7221bc218df223d59b16d2198.jpg",
  },
  {
    name: "Medical Cross & Heart",
    url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Hospital Caduceus Blue",
    url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Clinical Shield Green",
    url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=150&auto=format&fit=crop&q=80",
  },
];

const PRESET_DOC_LOGOS = [
  {
    name: "Official Clinical Seal",
    url: "https://i.pinimg.com/1200x/0d/21/0a/0d210ae7221bc218df223d59b16d2198.jpg",
  },
  {
    name: "Ministry & Hospital Crest",
    url: "https://cdn-icons-png.flaticon.com/512/3004/3004458.png",
  },
  {
    name: "Diagnostic Caduceus Badge",
    url: "https://cdn-icons-png.flaticon.com/512/4320/4320371.png",
  },
  {
    name: "Emergency Medical Star",
    url: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
  },
];

const PRESET_FAVICONS = [
  {
    name: "Red Medical Cross",
    url: "https://cdn-icons-png.flaticon.com/512/3004/3004458.png",
  },
  {
    name: "Emerald Heartbeat",
    url: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
  },
  {
    name: "Blue Hospital Badge",
    url: "https://cdn-icons-png.flaticon.com/512/4320/4320371.png",
  },
  {
    name: "Pharmacy Rx Pill",
    url: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
  },
];

export default function LogoUploadModal({
  isOpen,
  onClose,
  currentLogo,
  onSaveLogo,
  currentDocumentLogo = "",
  onSaveDocumentLogo,
  currentFavicon = "",
  onSaveFavicon,
  hospitalName = "The Tassia Hill Hospital",
  onSaveHospitalName,
}: LogoUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"logo" | "document_logo" | "favicon">("logo");

  // System Logo state
  const [logoInput, setLogoInput] = useState<string>(currentLogo || "");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(currentLogo || "");
  
  // Document Logo state (separate logo appearing on invoices, lab forms, sick sheets)
  const [docLogoInput, setDocLogoInput] = useState<string>(
    currentDocumentLogo || localStorage.getItem("platform_document_logo_url") || ""
  );
  const [docLogoPreviewUrl, setDocLogoPreviewUrl] = useState<string>(
    currentDocumentLogo || localStorage.getItem("platform_document_logo_url") || currentLogo || ""
  );

  // Favicon state
  const [faviconInput, setFaviconInput] = useState<string>(currentFavicon || "");
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string>(currentFavicon || "");

  // Facility Legal Name for Documents state
  const [facilityNameInput, setFacilityNameInput] = useState<string>(
    hospitalName || localStorage.getItem("hospital_facility_name") || "The Tassia Hill Hospital"
  );

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLogoInput(currentLogo || "");
      setLogoPreviewUrl(currentLogo || "");
      const storedDocLogo = currentDocumentLogo || localStorage.getItem("platform_document_logo_url") || "";
      setDocLogoInput(storedDocLogo);
      setDocLogoPreviewUrl(storedDocLogo || currentLogo || "");
      setFaviconInput(currentFavicon || "");
      setFaviconPreviewUrl(currentFavicon || "");
      const storedFacility = localStorage.getItem("hospital_facility_name") || hospitalName || "The Tassia Hill Hospital";
      setFacilityNameInput(storedFacility.toUpperCase() === "HMIS" ? "The Tassia Hill Hospital" : storedFacility);
      setUploadError("");
    }
  }, [isOpen, currentLogo, currentDocumentLogo, currentFavicon, hospitalName]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file?: File) => {
    setUploadError("");
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.name.endsWith(".ico")) {
      setUploadError("Please upload a valid image file (PNG, JPG, SVG, WebP, ICO).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image is larger than 5MB. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        if (activeTab === "logo") {
          setLogoInput(result);
          setLogoPreviewUrl(result);
        } else if (activeTab === "document_logo") {
          setDocLogoInput(result);
          setDocLogoPreviewUrl(result);
        } else {
          setFaviconInput(result);
          setFaviconPreviewUrl(result);
        }
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read image file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleCopyLogoToDocLogo = () => {
    const source = logoPreviewUrl || currentLogo || DEFAULT_BRAND_LOGO;
    if (source) {
      setDocLogoInput(source);
      setDocLogoPreviewUrl(source);
      setUploadError("");
    }
  };

  const handleCopyLogoToFavicon = () => {
    const source = logoPreviewUrl || currentLogo || DEFAULT_BRAND_LOGO;
    if (source) {
      setFaviconInput(source);
      setFaviconPreviewUrl(source);
      setActiveTab("favicon");
      setUploadError("");
    }
  };

  const handleApply = () => {
    // 1. Save System Logo
    onSaveLogo(logoPreviewUrl);

    // 2. Save Document Logo separately
    if (onSaveDocumentLogo) {
      onSaveDocumentLogo(docLogoPreviewUrl);
    } else {
      localStorage.setItem("platform_document_logo_url", docLogoPreviewUrl || "");
    }

    // 3. Save Favicon
    if (onSaveFavicon) {
      onSaveFavicon(faviconPreviewUrl);
    }

    // 4. Save Facility Legal Name (for documents)
    const finalFacility = facilityNameInput.trim() && facilityNameInput.trim().toUpperCase() !== "HMIS"
      ? facilityNameInput.trim()
      : "The Tassia Hill Hospital";
    if (onSaveHospitalName) {
      onSaveHospitalName(finalFacility);
    } else {
      localStorage.setItem("hospital_facility_name", finalFacility);
    }

    // Dispatch global events for instant reactive updates across all components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("platform_branding_changed"));
      window.dispatchEvent(new Event("platform_document_logo_changed"));
    }

    onClose();
  };

  const handleClearCurrent = () => {
    if (activeTab === "logo") {
      setLogoInput("");
      setLogoPreviewUrl("");
    } else if (activeTab === "document_logo") {
      setDocLogoInput("");
      setDocLogoPreviewUrl("");
    } else {
      setFaviconInput("");
      setFaviconPreviewUrl("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-5 sm:px-6 py-3.5 text-slate-950 flex items-center justify-between border-b border-yellow-500 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-yellow-300 rounded-xl border border-yellow-500 shadow-xs shrink-0">
              <ImageIcon className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black tracking-tight uppercase truncate">
                Logo & Facility Branding Settings
              </h3>
              <p className="text-[11px] text-slate-800 font-medium truncate">
                Header Title stays <strong>HMIS</strong> • Facility name & document logo apply to records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-yellow-300 text-slate-950 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-3 sm:px-6 pt-2.5 gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("logo");
              setUploadError("");
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === "logo"
                ? "bg-white text-slate-900 border-slate-200 border-b-white -mb-px shadow-xs"
                : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>1. System Logo (Header)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("document_logo");
              setUploadError("");
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === "document_logo"
                ? "bg-white text-emerald-950 border-slate-200 border-b-white -mb-px shadow-xs"
                : "bg-transparent text-slate-600 border-transparent hover:text-emerald-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Document Logo (Forms)</span>
            <span className="px-1.5 py-0.2 text-[9px] bg-emerald-100 text-emerald-800 font-black rounded-full">New</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("favicon");
              setUploadError("");
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === "favicon"
                ? "bg-white text-slate-900 border-slate-200 border-b-white -mb-px shadow-xs"
                : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>3. Browser Favicon</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">

          {/* TAB 1: SYSTEM LOGO */}
          {activeTab === "logo" && (
            <>
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>System Interface Logo:</strong> Displays in the primary top HMIS navigation header, system login portals, and staff workstation docks.
                </div>
              </div>

              {/* Live Logo Preview Box */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-20 h-20 sm:w-22 sm:h-22 bg-white border-2 border-yellow-500 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-lg ring-4 ring-yellow-400/30">
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                      onError={() => setUploadError("Failed to render image from URL.")}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Active System Logo Preview
                  </span>
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {logoPreviewUrl ? "Custom System Logo Set" : "Default Medical Emblem"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Main header displays: <strong>HMIS</strong> title with this emblem.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyLogoToDocLogo();
                        setActiveTab("document_logo");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-emerald-600" />
                      <span>Also Use as Document Logo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLogoToFavicon}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-blue-600" />
                      <span>Use as Browser Favicon</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drag and Drop / File Select Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                  isDragging
                    ? "border-amber-500 bg-amber-50 scale-102"
                    : "border-slate-300 hover:border-amber-400 hover:bg-slate-50/80"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/svg+xml, image/webp, image/gif"
                  className="hidden"
                />
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drop system logo file here
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Supports PNG, JPG, SVG, WebP (Max 5MB)
                  </p>
                </div>
              </div>

              {/* Direct URL Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-amber-500" />
                  <span>Or Paste Logo URL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={logoInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLogoInput(val);
                      setLogoPreviewUrl(val);
                      setUploadError("");
                    }}
                    placeholder="https://example.com/system-logo.png"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-amber-500"
                  />
                  {logoInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoInput("");
                        setLogoPreviewUrl("");
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>System Logo Presets</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_LOGOS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLogoInput(p.url);
                        setLogoPreviewUrl(p.url);
                        setUploadError("");
                      }}
                      className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="w-6 h-6 rounded-md object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-amber-800 truncate">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: DOCUMENT LOGO (SEPARATE FROM SYSTEM LOGO) */}
          {activeTab === "document_logo" && (
            <>
              {/* Distinctive Explanatory Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Separate Document Logo & Facility Name:</strong> Official patient invoices, lab reports, receipts, sick sheets, referral letters, and discharge summaries will display this logo and your facility's official name, while the system header title remains <strong>HMIS</strong>.
                </div>
              </div>

              {/* Facility Legal Name Input */}
              <div className="space-y-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hospital / Facility Legal Name (Printed on Documents)</span>
                </label>
                <input
                  type="text"
                  value={facilityNameInput}
                  onChange={(e) => setFacilityNameInput(e.target.value)}
                  placeholder="The Tassia Hill Hospital"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-500"
                />
                <p className="text-[10px] text-slate-400">
                  Retains facility identity on all official certificates & invoices (does not alter the standard HMIS header title).
                </p>
              </div>

              {/* Official Document Letterhead Simulation Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Official Document Header Preview
                </span>
                <div className="p-4 bg-white border-2 border-emerald-700/60 rounded-2xl shadow-xs">
                  <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white border-2 border-emerald-700 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {docLogoPreviewUrl ? (
                          <img
                            src={docLogoPreviewUrl}
                            alt="Document Logo"
                            className="w-full h-full object-cover"
                            onError={() => setUploadError("Document Logo image link failed to load.")}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileText className="w-7 h-7 text-emerald-700" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                          {facilityNameInput || "The Tassia Hill Hospital"}
                        </h4>
                        <p className="text-[10px] font-semibold text-emerald-800">
                          Outpatient, Inpatient, Maternity & Specialized Clinical Centre
                        </p>
                        <p className="text-[9px] text-slate-500">
                          P.O. Box 45120-00100 Nairobi • MOH License Valid
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full uppercase border border-emerald-300">
                        OFFICIAL DOCUMENT
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 text-[9px] text-slate-400 text-center font-mono">
                    Sample Clinical Form / Invoice Header Simulation
                  </div>
                </div>
              </div>

              {/* Quick Action: Sync from System Logo if desired */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-600 font-medium">Want to use the system logo on documents?</span>
                <button
                  type="button"
                  onClick={handleCopyLogoToDocLogo}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-emerald-600" />
                  <span>Sync from System Logo</span>
                </button>
              </div>

              {/* Upload Document Logo File */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50 scale-102"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/svg+xml, image/webp, image/gif"
                  className="hidden"
                />
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drop Document Logo file here
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Recommended: Clean transparent background PNG or SVG emblem
                  </p>
                </div>
              </div>

              {/* Document Logo URL Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-emerald-600" />
                  <span>Or Paste Document Logo URL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={docLogoInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDocLogoInput(val);
                      setDocLogoPreviewUrl(val);
                      setUploadError("");
                    }}
                    placeholder="https://example.com/document-seal.png"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-emerald-500"
                  />
                  {docLogoInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocLogoInput("");
                        setDocLogoPreviewUrl("");
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Document Logo Presets */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Document Emblem Presets</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_DOC_LOGOS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDocLogoInput(p.url);
                        setDocLogoPreviewUrl(p.url);
                        setUploadError("");
                      }}
                      className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="w-6 h-6 rounded-md object-contain border border-slate-200 group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-900 truncate">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: BROWSER FAVICON */}
          {activeTab === "favicon" && (
            <>
              {/* Favicon Browser Tab Simulation Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Live Browser Tab Preview
                </span>
                <div className="bg-slate-900 p-2.5 rounded-2xl shadow-md border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    {/* Simulated Browser Tab */}
                    <div className="bg-slate-950 px-3 py-1 rounded-t-xl border-t border-x border-slate-700 flex items-center gap-2 max-w-[240px]">
                      {faviconPreviewUrl ? (
                        <img
                          src={faviconPreviewUrl}
                          alt="Tab Favicon"
                          className="w-3.5 h-3.5 object-contain rounded-xs shrink-0 shadow-xs"
                          onError={() => setUploadError("Favicon URL failed to load.")}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-3.5 h-3.5 bg-emerald-500/20 text-emerald-400 rounded-xs flex items-center justify-center text-[8px] font-black shrink-0">
                          ✚
                        </div>
                      )}
                      <span className="text-[11px] font-bold text-slate-200 truncate">
                        HMIS
                      </span>
                      <span className="text-slate-500 text-[10px] ml-auto">✕</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded-xl text-center text-[10px] text-slate-400 font-mono">
                    {faviconPreviewUrl ? "Custom Favicon active on browser tab" : "Using default browser icon"}
                  </div>
                </div>
              </div>

              {/* Upload Favicon File */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 scale-102"
                    : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/80"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/x-icon, image/png, image/svg+xml, image/webp, image/jpeg"
                  className="hidden"
                />
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drop Favicon file (.ico, .png, .svg)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Recommended: 32x32px or 64x64px square icon
                  </p>
                </div>
              </div>

              {/* Favicon URL Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-blue-500" />
                  <span>Favicon Image / Icon URL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={faviconInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFaviconInput(val);
                      setFaviconPreviewUrl(val);
                      setUploadError("");
                    }}
                    placeholder="https://example.com/favicon.png"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-blue-500"
                  />
                  {faviconInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setFaviconInput("");
                        setFaviconPreviewUrl("");
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Preset Favicons */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Medical Icon Favicon Presets</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_FAVICONS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFaviconInput(p.url);
                        setFaviconPreviewUrl(p.url);
                        setUploadError("");
                      }}
                      className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="w-5 h-5 object-contain shrink-0 group-hover:scale-110 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-800 truncate">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {uploadError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
              {uploadError}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClearCurrent}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset {activeTab === "logo" ? "System Logo" : activeTab === "document_logo" ? "Doc Logo" : "Favicon"}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Save & Apply All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

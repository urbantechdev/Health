import React, { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon, Link2, Check, Trash2, Sparkles, Globe, Copy, RefreshCw } from "lucide-react";

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string;
  onSaveLogo: (url: string) => void;
  currentFavicon?: string;
  onSaveFavicon?: (url: string) => void;
  hospitalName?: string;
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
  currentFavicon = "",
  onSaveFavicon,
  hospitalName = "AfyaCare Hospital HMS",
}: LogoUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"logo" | "favicon">("logo");

  // Logo state
  const [logoInput, setLogoInput] = useState<string>(currentLogo || "");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(currentLogo || "");
  
  // Favicon state
  const [faviconInput, setFaviconInput] = useState<string>(currentFavicon || "");
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string>(currentFavicon || "");

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCopyLogoToFavicon = () => {
    if (logoPreviewUrl) {
      setFaviconInput(logoPreviewUrl);
      setFaviconPreviewUrl(logoPreviewUrl);
      setActiveTab("favicon");
      setUploadError("");
    }
  };

  const handleApply = () => {
    onSaveLogo(logoPreviewUrl);
    if (onSaveFavicon) {
      onSaveFavicon(faviconPreviewUrl);
    }
    onClose();
  };

  const handleClearCurrent = () => {
    if (activeTab === "logo") {
      setLogoInput("");
      setLogoPreviewUrl("");
    } else {
      setFaviconInput("");
      setFaviconPreviewUrl("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-yellow-400 px-6 py-4 text-slate-950 flex items-center justify-between border-b border-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-300 rounded-xl border border-yellow-500 shadow-xs">
              <ImageIcon className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight uppercase">Hospital Logo & Favicon Settings</h3>
              <p className="text-xs text-slate-800 font-medium">Customize header emblems, browser tab icons & branding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-yellow-300 text-slate-950 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("logo");
              setUploadError("");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === "logo"
                ? "bg-white text-slate-900 border-slate-200 border-b-white -mb-px shadow-xs"
                : "bg-transparent text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-500" />
            <span>Hospital Logo (Header & Portal)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("favicon");
              setUploadError("");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === "favicon"
                ? "bg-white text-slate-900 border-slate-200 border-b-white -mb-px shadow-xs"
                : "bg-transparent text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Browser Tab Favicon</span>
            {faviconPreviewUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {activeTab === "logo" ? (
            <>
              {/* Live Logo Preview Box */}
              <div className="flex items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-24 h-24 bg-white border-2 border-yellow-500 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-lg ring-4 ring-yellow-400/30">
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                      onError={() => setUploadError("Failed to render image from URL.")}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Active Logo Preview
                  </span>
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {logoPreviewUrl ? "Custom Emblem Configured" : "Default System Icon (Building2)"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Displays in the top HMIS header banner, printing headers, and patient portal.
                  </p>
                  {logoPreviewUrl && (
                    <button
                      type="button"
                      onClick={handleCopyLogoToFavicon}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Use this Logo as Browser Favicon</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Drag and Drop / File Select Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
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
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drop hospital logo file here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports PNG, JPG, SVG, WebP (Max 5MB)
                  </p>
                </div>
              </div>

              {/* Direct URL Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Or Paste Logo Image Link (URL)</span>
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
                    placeholder="https://example.com/hospital-logo.png"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-amber-500"
                  />
                  {logoInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoInput("");
                        setLogoPreviewUrl("");
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Sample Medical Logos</span>
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
                      className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="w-7 h-7 rounded-lg object-cover border border-slate-200 group-hover:scale-105 transition-transform"
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
          ) : (
            <>
              {/* Favicon Browser Tab Simulation Preview */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Live Browser Tab Preview
                </span>
                <div className="bg-slate-800 p-2.5 rounded-2xl shadow-md border border-slate-700">
                  {/* Browser Chrome Header Mockup */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    {/* Simulated Browser Tab */}
                    <div className="bg-slate-900 px-3 py-1.5 rounded-t-xl border-t border-x border-slate-700 flex items-center gap-2 max-w-[240px]">
                      {faviconPreviewUrl ? (
                        <img
                          src={faviconPreviewUrl}
                          alt="Tab Favicon"
                          className="w-4 h-4 object-contain rounded-xs shrink-0 shadow-xs"
                          onError={() => setUploadError("Favicon URL failed to load.")}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-4 h-4 bg-emerald-500/20 text-emerald-400 rounded-xs flex items-center justify-center text-[9px] font-black shrink-0">
                          ✚
                        </div>
                      )}
                      <span className="text-[11px] font-bold text-slate-200 truncate">
                        {hospitalName}
                      </span>
                      <span className="text-slate-500 text-[10px] ml-auto">✕</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl text-center text-[10px] text-slate-400">
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
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
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
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drop Favicon file (.ico, .png, .svg)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Recommended: 32x32px or 64x64px square icon
                  </p>
                </div>
              </div>

              {/* Favicon URL Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-500" />
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
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-blue-500"
                  />
                  {faviconInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setFaviconInput("");
                        setFaviconPreviewUrl("");
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Preset Favicons */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
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
                      className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="w-6 h-6 object-contain shrink-0 group-hover:scale-110 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-800 truncate">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {logoPreviewUrl && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={logoPreviewUrl}
                      alt="Current Logo"
                      className="w-7 h-7 rounded-full object-cover border border-amber-300 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-900 truncate">Use Current Hospital Logo</p>
                      <p className="text-[10px] text-amber-700">Sync favicon icon with hospital emblem</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLogoToFavicon}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Sync Now
                  </button>
                </div>
              )}
            </>
          )}

          {uploadError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
              {uploadError}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClearCurrent}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset {activeTab === "logo" ? "Logo" : "Favicon"}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
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


import React, { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon, Link2, Check, RefreshCw, Trash2, ShieldCheck, Sparkles } from "lucide-react";

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string;
  onSaveLogo: (url: string) => void;
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

export default function LogoUploadModal({
  isOpen,
  onClose,
  currentLogo,
  onSaveLogo,
}: LogoUploadModalProps) {
  const [logoInput, setLogoInput] = useState<string>(currentLogo || "");
  const [previewUrl, setPreviewUrl] = useState<string>(currentLogo || "");
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

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid image file (PNG, JPG, SVG, WebP, GIF).");
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
        setLogoInput(result);
        setPreviewUrl(result);
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

  const handleApply = () => {
    onSaveLogo(previewUrl);
    onClose();
  };

  const handleClear = () => {
    setLogoInput("");
    setPreviewUrl("");
    onSaveLogo("");
    onClose();
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
            <div className="p-2 bg-yellow-300 rounded-xl border border-yellow-500">
              <ImageIcon className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight uppercase">Upload Hospital Logo</h3>
              <p className="text-xs text-slate-800 font-medium">Customize the HMIS header & system branding logo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-yellow-300 text-slate-950 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Live Preview Box */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Logo Preview"
                  className="w-full h-full object-contain p-1"
                  onError={() => setUploadError("Failed to render image from URL.")}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Active Logo Preview
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">
                {previewUrl ? "Custom Logo Configured" : "Default System Icon (Building2)"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Displays in the top HMIS header banner, printing headers, and patient portal.
              </p>
            </div>
          </div>

          {/* Drag and Drop / File Select Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 ${
              isDragging
                ? "border-pink-500 bg-pink-50 scale-102"
                : "border-slate-300 hover:border-pink-400 hover:bg-slate-50/80"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/svg+xml, image/webp, image/gif"
              className="hidden"
            />
            <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drop an image file here
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports PNG, JPG, SVG, WebP (Max 5MB)
              </p>
            </div>
          </div>

          {/* Direct URL Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-pink-500" />
              <span>Or Paste Image Link (URL)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={logoInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setLogoInput(val);
                  setPreviewUrl(val);
                  setUploadError("");
                }}
                placeholder="https://example.com/hospital-logo.png"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-pink-500"
              />
              {logoInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoInput("");
                    setPreviewUrl("");
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {uploadError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
              {uploadError}
            </p>
          )}

          {/* Quick Presets */}
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Quick Sample Medical Logos</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_LOGOS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setLogoInput(p.url);
                    setPreviewUrl(p.url);
                    setUploadError("");
                  }}
                  className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-pink-50 border border-slate-200 hover:border-pink-300 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    className="w-7 h-7 rounded-lg object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-pink-700 truncate">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset to Default</span>
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
              className="flex items-center gap-1.5 px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-black rounded-xl shadow-lg shadow-pink-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Apply Logo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

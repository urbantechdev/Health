import React from "react";
import { DepartmentToggles, Tenant } from "../types";
import KenyanIntegrationsShowcase from "./KenyanIntegrationsShowcase";
import { 
  ToggleLeft, 
  ToggleRight, 
  Building2, 
  Sliders, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Trash2,
  Plus,
  Search,
  Sparkles,
  CreditCard,
  WifiOff,
  Layers,
  X,
  PlusCircle,
  Cpu,
  Type,
  Palette,
  Link2
} from "lucide-react";

const GOOGLE_FONTS = [
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans (Default)" },
  { id: "Inter", name: "Inter (Modern Sans)" },
  { id: "Comfortaa", name: "Comfortaa (Playful Rounded)" },
  { id: "JetBrains Mono", name: "JetBrains Mono (Tech/Mono)" },
  { id: "Playfair Display", name: "Playfair Display (Editorial Serif)" },
  { id: "Outfit", name: "Outfit (Geometric)" },
  { id: "Cinzel", name: "Cinzel (Classic Display Serif)" }
];

const THEME_PALETTES = [
  { id: "emerald", name: "Emerald Green (Default)", hex: "#059669" },
  { id: "indigo", name: "Corporate Indigo Blue", hex: "#4f46e5" },
  { id: "violet", name: "Royal Purple Violet", hex: "#7c3aed" },
  { id: "rose", name: "Crimson Rose Red", hex: "#e11d48" },
  { id: "amber", name: "Warm Golden Amber", hex: "#d97706" },
  { id: "slate", name: "Technical Steel Slate", hex: "#475569" },
  { id: "teal", name: "Aquatic Ocean Teal", hex: "#0d9488" }
];

interface AdminPanelProps {
  tenant: Tenant;
  onTenantChange: (tenant: Tenant) => void;
  toggles: DepartmentToggles;
  onToggleChange: (toggles: DepartmentToggles) => void;
}

interface CustomFeature {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  isSystem?: boolean;
}

const DEFAULT_FEATURES: CustomFeature[] = [
  {
    id: "ai_diagnostics",
    key: "AI_DIAGNOSTICS",
    name: "AI-Powered Diagnostics",
    description: "Uses Gemini context to auto-suggest medical codes and check drug contraindications.",
    enabled: true,
    category: "AI & Intelligence",
    isSystem: true
  },
  {
    id: "etims_auto",
    key: "ETIMS_AUTO_TRANSMIT",
    name: "eTIMS Live Sync",
    description: "Automated real-time background transmission of medical invoices to Kenya Revenue Authority.",
    enabled: true,
    category: "Regulatory & Tax",
    isSystem: true
  },
  {
    id: "biometric_bypass",
    key: "BIOMETRIC_BYPASS",
    name: "Biometric Verification Bypass",
    description: "Allows patient registration without fingerprint scan in case of emergency or physical trauma.",
    enabled: false,
    category: "Security & Safety",
    isSystem: true
  },
  {
    id: "mpesa_sandbox",
    key: "MPESA_SANDBOX",
    name: "M-Pesa STK Push Sandbox",
    description: "Simulates instantaneous Safaricom Daraja API payments for quick billing validation.",
    enabled: true,
    category: "Financials",
    isSystem: true
  },
  {
    id: "offline_sync",
    key: "OFFLINE_SYNC",
    name: "Offline Local-First Sync",
    description: "Buffers files in browser local storage and synchronization queue for low-bandwidth environments.",
    enabled: false,
    category: "Connectivity",
    isSystem: true
  }
];

export default function AdminPanel({ tenant, onTenantChange, toggles, onToggleChange }: AdminPanelProps) {
  const [platformFontSize, setPlatformFontSize] = React.useState<string>(() => {
    return localStorage.getItem("platform_font_size") || "base";
  });

  const [logoUrlInput, setLogoUrlInput] = React.useState(() => localStorage.getItem("platform_logo_url") || "");
  const [faviconUrlInput, setFaviconUrlInput] = React.useState(() => localStorage.getItem("platform_favicon_url") || "");
  const [customBrandNameInput, setCustomBrandNameInput] = React.useState(() => localStorage.getItem("platform_custom_brand_name") || "");
  const [selectedFont, setSelectedFont] = React.useState(() => localStorage.getItem("platform_font_id") || "Plus Jakarta Sans");
  const [selectedThemeColor, setSelectedThemeColor] = React.useState(() => localStorage.getItem("platform_theme_color") || "emerald");
  const [selectedBlockEdgeColor, setSelectedBlockEdgeColor] = React.useState(() => localStorage.getItem("platform_block_edge_color") || "yellow-blue-green");

  React.useEffect(() => {
    const handleSync = () => {
      setPlatformFontSize(localStorage.getItem("platform_font_size") || "base");
    };
    const handleBrandingSync = () => {
      setLogoUrlInput(localStorage.getItem("platform_logo_url") || "");
      setFaviconUrlInput(localStorage.getItem("platform_favicon_url") || "");
      setCustomBrandNameInput(localStorage.getItem("platform_custom_brand_name") || "");
      setSelectedFont(localStorage.getItem("platform_font_id") || "Plus Jakarta Sans");
      setSelectedThemeColor(localStorage.getItem("platform_theme_color") || "emerald");
      setSelectedBlockEdgeColor(localStorage.getItem("platform_block_edge_color") || "yellow-blue-green");
    };

    window.addEventListener("platform_font_size_changed", handleSync);
    window.addEventListener("platform_branding_changed", handleBrandingSync);
    return () => {
      window.removeEventListener("platform_font_size_changed", handleSync);
      window.removeEventListener("platform_branding_changed", handleBrandingSync);
    };
  }, []);

  const changeFontSize = (size: string) => {
    setPlatformFontSize(size);
    localStorage.setItem("platform_font_size", size);
    window.dispatchEvent(new Event("platform_font_size_changed"));
    const root = document.documentElement;
    if (size === "sm") {
      root.style.fontSize = "13px";
    } else if (size === "base") {
      root.style.fontSize = "16px";
    } else if (size === "lg") {
      root.style.fontSize = "18px";
    } else if (size === "xl") {
      root.style.fontSize = "20px";
    } else if (size === "2xl") {
      root.style.fontSize = "22px";
    } else if (size === "3xl") {
      root.style.fontSize = "25px";
    }
  };

  const updateBrandingSettings = (key: string, value: string) => {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event("platform_branding_changed"));
  };

  const [features, setFeatures] = React.useState<CustomFeature[]>(() => {
    const saved = localStorage.getItem("utumishi_custom_features");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_FEATURES;
  });

  React.useEffect(() => {
    localStorage.setItem("utumishi_custom_features", JSON.stringify(features));
  }, [features]);

  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [newKey, setNewKey] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newCat, setNewCat] = React.useState("Custom");
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleToggle = (key: keyof DepartmentToggles) => {
    onToggleChange({
      ...toggles,
      [key]: !toggles[key],
    });
  };

  const handleTypeChange = (type: "clinic" | "hospital_level_4" | "hospital_level_5") => {
    const defaultToggles: DepartmentToggles = {
      reception: true,
      queue: true,
      doctor: true,
      pharmacy: true,
      billing: true,
      laboratory: type !== "clinic",
      radiology: type === "hospital_level_5",
    };

    onTenantChange({
      id: tenant.id,
      name: type === "clinic" ? "Hospital Management System" : type === "hospital_level_4" ? "Mama Lucy Level 4 Hospital" : "Kenyatta National Referral Hospital",
      type,
      county: type === "clinic" ? "Nairobi" : type === "hospital_level_4" ? "Kiambu" : "Nairobi County",
    });

    onToggleChange(defaultToggles);
  };

  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newName.trim() || !newDesc.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    
    const upperKey = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!/^[A-Z]/.test(upperKey)) {
      setError("Feature key must start with an uppercase letter.");
      return;
    }

    if (features.some(f => f.key === upperKey)) {
      setError(`Feature flag with key '${upperKey}' already exists.`);
      return;
    }

    const newFeature: CustomFeature = {
      id: "feat-" + Date.now(),
      key: upperKey,
      name: newName.trim(),
      description: newDesc.trim(),
      enabled: false,
      category: newCat,
      isSystem: false
    };

    setFeatures([...features, newFeature]);
    setNewKey("");
    setNewName("");
    setNewDesc("");
    setError("");
    setShowAddForm(false);
  };

  const handleToggleFeature = (id: string) => {
    setFeatures(features.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const handleDeleteFeature = (id: string) => {
    setFeatures(features.filter(f => f.id !== id));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "AI & Intelligence":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "Regulatory & Tax":
        return <CheckCircle2 className="w-4 h-4 text-amber-500" />;
      case "Security & Safety":
        return <ShieldCheck className="w-4 h-4 text-red-500" />;
      case "Financials":
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case "Connectivity":
        return <WifiOff className="w-4 h-4 text-cyan-500" />;
      default:
        return <Layers className="w-4 h-4 text-emerald-500" />;
    }
  };

  const categories = ["All", "AI & Intelligence", "Regulatory & Tax", "Security & Safety", "Financials", "Connectivity", "Custom"];

  const filteredFeatures = features.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                          f.key.toLowerCase().includes(search.toLowerCase()) || 
                          f.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "All" || f.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div id="admin-panel" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-8">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">HMS Control Center</h2>
            <p className="text-xs text-gray-500">Super-Admin Multi-Tenant & Feature Toggles</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Admin Session Active</span>
        </div>
      </div>

      {/* Grid: Tenant Setup & Standard Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span>1. Tenant Subscription & Facility Tier</span>
          </h3>

          <div className="space-y-2">
            <label className="block text-xs text-gray-500 font-medium">Facility Profile</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="btn-tier-clinic"
                onClick={() => handleTypeChange("clinic")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  tenant.type === "clinic"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 font-semibold"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <span className="block text-sm">Clinic</span>
                <span className="text-[10px] opacity-75">Basic Care</span>
              </button>
              <button
                id="btn-tier-l4"
                onClick={() => handleTypeChange("hospital_level_4")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  tenant.type === "hospital_level_4"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 font-semibold"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <span className="block text-sm">Level 4</span>
                <span className="text-[10px] opacity-75">Sub-County</span>
              </button>
              <button
                id="btn-tier-l5"
                onClick={() => handleTypeChange("hospital_level_5")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  tenant.type === "hospital_level_5"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 font-semibold"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <span className="block text-sm">Level 5</span>
                <span className="text-[10px] opacity-75">Referral Hosp</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Tenant Name:</span>
              <span className="font-semibold text-gray-800">{tenant.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Location/County:</span>
              <span className="font-semibold text-gray-800">{tenant.county}, Kenya</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Regulations Status:</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ODPC Compliant
              </span>
            </div>
          </div>
        </div>

        {/* Feature Switches */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-gray-400" />
            <span>2. Feature Toggle Switchboard (Micro-plugins)</span>
          </h3>

          <div className="space-y-3">
            {Object.keys(toggles).map((moduleKey) => {
              const key = moduleKey as keyof DepartmentToggles;
              const isEnabled = toggles[key];
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isEnabled ? "bg-white border-emerald-100 shadow-xs" : "bg-gray-50/50 border-gray-100 opacity-60"
                  }`}
                >
                  <div>
                    <span className="block text-xs font-semibold capitalize text-gray-800">
                      {key === "billing" ? "Paperless Billing & KRA" : key === "queue" ? "Dynamic Ticket Routing" : `${key} module`}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {key === "reception" && "ID Scan & Biometric capture"}
                      {key === "queue" && "Automated routing workflows"}
                      {key === "doctor" && "EHR Timeline & Drug Verification"}
                      {key === "pharmacy" && "POS stock matching & FIFO tracking"}
                      {key === "laboratory" && "Ancillary Lab Results pipeline"}
                      {key === "radiology" && "DICOM/PACS Diagnostic imaging"}
                      {key === "billing" && "M-Pesa STK & Split Ledger checks"}
                    </span>
                  </div>
                  <button
                    id={`toggle-switch-${key}`}
                    onClick={() => handleToggle(key)}
                    className="text-gray-400 hover:text-emerald-500 transition-colors focus:outline-hidden"
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-10 h-10 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-300" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p>
          <strong>Clinical Caution:</strong> Disabling any core clinical module (e.g. Doctor, Laboratory) instantly reroutes active patients around that department's pipeline to secure billing safety and avoid process blocks.
        </p>
      </div>

      {/* 3. Advanced Features Management */}
      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">3. Advanced Features Management</h3>
              <p className="text-[11px] text-gray-400">Register, search, and switch enterprise feature modules</p>
            </div>
          </div>
          <button
            id="btn-add-feature-toggle"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAddForm ? "Cancel" : "Add Custom Feature"}</span>
          </button>
        </div>

        {/* Feature Creation Form */}
        {showAddForm && (
          <form onSubmit={handleAddFeature} className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
            <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">Create Custom Feature Flag</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Feature Key (Uppercase)</label>
                <input
                  type="text"
                  placeholder="e.g. MULTI_FACTOR_AUTH"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:border-purple-500 focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Feature Name</label>
                <input
                  type="text"
                  placeholder="e.g. Multi-Factor Authentication"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:border-purple-500 focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Category</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:border-purple-500 focus:outline-hidden"
                >
                  <option value="Custom">Custom Module</option>
                  <option value="AI & Intelligence">AI & Intelligence</option>
                  <option value="Regulatory & Tax">Regulatory & Tax</option>
                  <option value="Security & Safety">Security & Safety</option>
                  <option value="Financials">Financials</option>
                  <option value="Connectivity">Connectivity</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Description</label>
              <input
                type="text"
                placeholder="Brief summary of what this feature controls..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:border-purple-500 focus:outline-hidden"
                required
              />
            </div>
            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Feature Flag</span>
            </button>
          </form>
        )}

        {/* Feature Search and Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search features by name, key or summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all shrink-0 ${
                  selectedCategory === cat
                    ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Features List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredFeatures.map(f => {
            const isEnabled = f.enabled;
            return (
              <div
                key={f.id}
                className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                  isEnabled 
                    ? "bg-white border-purple-100 shadow-xs" 
                    : "bg-gray-50/50 border-gray-200/60 opacity-75 hover:opacity-90"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isEnabled ? "bg-purple-50" : "bg-gray-100"}`}>
                        {getCategoryIcon(f.category)}
                      </div>
                      <span className="text-xs font-bold text-gray-800">{f.name}</span>
                    </div>
                    {!f.isSystem && (
                      <button
                        onClick={() => handleDeleteFeature(f.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete custom feature flag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-[9px] font-bold text-slate-400 tracking-wider">
                    {f.key}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{f.description}</p>
                </div>

                <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-gray-100/60">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    f.isSystem 
                      ? "bg-blue-50 text-blue-700 border border-blue-100" 
                      : "bg-purple-50 text-purple-700 border border-purple-100"
                  }`}>
                    {f.isSystem ? "System Flag" : "Custom Feature"}
                  </span>
                  <button
                    onClick={() => handleToggleFeature(f.id)}
                    className="text-gray-400 hover:text-purple-500 transition-colors focus:outline-hidden"
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-9 h-9 text-purple-600" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          {filteredFeatures.length === 0 && (
            <div className="col-span-full py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Cpu className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-500">No matching feature toggles found.</p>
              <p className="text-[10px] text-gray-400">Try modifying your filters or add a new custom flag above.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Kenya Digital Health Sandbox APIs */}
      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">4. Digital Health Sandbox & Developer APIs</h3>
            <p className="text-[11px] text-gray-400">Interact with real-time simulated regulatory gateway API endpoints for Kenya health standards (SHA, eTIMS, M-Pesa, Slade 360)</p>
          </div>
        </div>
        <KenyanIntegrationsShowcase />
      </div>

      {/* 5. Typography & Accessibility Font Size Settings */}
      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">5. Typography & Accessibility Font Size Settings</h3>
            <p className="text-[11px] text-gray-400">Dynamically adjust the base scale of the platform layout. Perfect for high-density monitors or accessibility needs.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: "sm", label: "Small (13px)", desc: "High density layout" },
            { id: "base", label: "Default (16px)", desc: "Standard scaling" },
            { id: "lg", label: "Large (18px)", desc: "Comfortable reading" },
            { id: "xl", label: "X-Large (20px)", desc: "Enhanced visibility" },
            { id: "2xl", label: "2X-Large (22px)", desc: "High accessibility" },
            { id: "3xl", label: "3X-Large (25px)", desc: "Maximum zoom" }
          ].map((opt) => {
            const isSelected = platformFontSize === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => changeFontSize(opt.id)}
                className={`p-3.5 border rounded-2xl text-left transition-all hover:border-emerald-400 group cursor-pointer ${
                  isSelected 
                    ? "bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20" 
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider font-mono ${isSelected ? "text-emerald-700" : "text-gray-400"}`}>
                    {opt.id.toUpperCase()}
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    isSelected ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-900">{opt.label}</p>
                <p className="text-[9px] text-gray-400 leading-tight mt-0.5 group-hover:text-gray-500">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Global Platform Branding & Identity Settings */}
      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">6. Global Platform Branding & Identity Settings</h3>
            <p className="text-[11px] text-gray-400">Configure custom colors, typography, logos, and portal naming to match your medical facility's public identity.</p>
          </div>
        </div>

        <div className="bg-slate-50/50 p-4 rounded-2xl border border-gray-200/60 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Custom brand name */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custom Brand / Hospital Name</label>
              <input
                type="text"
                value={customBrandNameInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomBrandNameInput(val);
                  updateBrandingSettings("platform_custom_brand_name", val);
                }}
                placeholder={tenant.name}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-emerald-500"
              />
            </div>

            {/* Custom Google Font */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Platform Base Font Family</label>
              <select
                value={selectedFont}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedFont(val);
                  updateBrandingSettings("platform_font_id", val);
                }}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-emerald-500"
              >
                {GOOGLE_FONTS.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Custom Theme Color Selector */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Platform Primary Accent Color</label>
              <select
                value={selectedThemeColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedThemeColor(val);
                  updateBrandingSettings("platform_theme_color", val);
                }}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-emerald-500"
              >
                {THEME_PALETTES.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Block Right Edge Design Option */}
          <div className="pt-3 border-t border-gray-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-emerald-600" />
                <span>Block Right Edge Color Design</span>
              </label>
              <select
                value={selectedBlockEdgeColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBlockEdgeColor(val);
                  updateBrandingSettings("platform_block_edge_color", val);
                }}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-emerald-500"
              >
                <option value="yellow-blue-green">🎨 Tri-Color Fusion: Yellow ➔ Blue ➔ Green [Default]</option>
                <option value="yellow-blue-green-diag">⚡ Diagonal Sun-Sky-Emerald (Yellow ➔ Blue ➔ Green)</option>
                <option value="yellow-blue-green-soft">✨ Pastel Sunburst (Soft Yellow ➔ Soft Blue ➔ Soft Green)</option>
                <option value="theme">✨ Matching Theme Accent (Dynamic Solid)</option>
                <option value="#059669">🟢 Emerald Green (#059669)</option>
                <option value="#4f46e5">🔵 Corporate Indigo (#4f46e5)</option>
                <option value="#0284c7">🌊 Ocean Cyan / Sky (#0284c7)</option>
                <option value="#7c3aed">🟣 Royal Violet (#7c3aed)</option>
                <option value="#e11d48">🌹 Crimson Rose (#e11d48)</option>
                <option value="#d97706">🟡 Golden Amber (#d97706)</option>
                <option value="#f97316">🟠 Vibrant Orange (#f97316)</option>
                <option value="#475569">⚙️ Steel Slate Gray (#475569)</option>
                <option value="transparent">🚫 Minimalist (No Edge Line)</option>
              </select>
              <p className="text-[9px] text-gray-400">Customizes the vertical right border accent line on system cards and content blocks.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo URL Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Custom Logo URL (Image Link)</span>
              </label>
              <input
                type="url"
                value={logoUrlInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setLogoUrlInput(val);
                  updateBrandingSettings("platform_logo_url", val);
                }}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-emerald-500"
              />
              <p className="text-[9px] text-gray-400">Provide an absolute image URL to replace the default hospital logo.</p>
            </div>

            {/* Favicon URL Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Custom Favicon URL (Tab Icon Link)</span>
              </label>
              <input
                type="url"
                value={faviconUrlInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setFaviconUrlInput(val);
                  updateBrandingSettings("platform_favicon_url", val);
                }}
                placeholder="https://example.com/favicon.ico"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-emerald-500"
              />
              <p className="text-[9px] text-gray-400">Updates the browser's shortcut tab icon dynamically.</p>
            </div>
          </div>

          {/* Visual Palette Quick Picker Circles */}
          <div className="pt-2 border-t border-gray-200/50">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Accent Swatches</span>
            <div className="flex flex-wrap gap-2.5">
              {THEME_PALETTES.map((p) => {
                const isActive = selectedThemeColor === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedThemeColor(p.id);
                      updateBrandingSettings("platform_theme_color", p.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all hover:bg-slate-100/50 cursor-pointer ${
                      isActive 
                        ? "bg-white border-slate-900 shadow-sm animate-pulse" 
                        : "bg-transparent border-gray-200 text-gray-600"
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                      style={{ backgroundColor: p.hex }}
                    />
                    <span>{p.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


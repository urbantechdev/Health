import React from "react";
import { DepartmentToggles, Tenant, Employee } from "../types";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import KenyanIntegrationsShowcase from "./KenyanIntegrationsShowcase";
import { runFullDatabaseDeduplication, checkDuplicateEmployee, DeduplicationReport } from "../lib/deduplicationService";
import { SYSTEM_ROLES_DIRECTORY, SystemRole, getRoleConfig } from "../constants/roles";
import { bootstrapCloudFirestore, cleanSystemAndPurgeTestData, CleanSystemReport, CollectionCounts } from "../lib/dbInit";
import { toast, modernConfirm } from "../lib/promptService";
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
  Link2,
  Users,
  Shield,
  UserPlus,
  KeyRound,
  Edit2,
  Database,
  RefreshCw,
  Ban,
  Check,
  Lock,
  Eye,
  CheckSquare,
  Upload,
  Image as ImageIcon,
  Crown,
  Award
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
  currentUserRole?: SystemRole | string;
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

  const DEFAULT_BRAND_LOGO = "https://i.pinimg.com/1200x/0d/21/0a/0d210ae7221bc218df223d59b16d2198.jpg";
  const [logoUrlInput, setLogoUrlInput] = React.useState(() => localStorage.getItem("platform_logo_url") || DEFAULT_BRAND_LOGO);
  const [faviconUrlInput, setFaviconUrlInput] = React.useState(() => localStorage.getItem("platform_favicon_url") || "");
  const [customBrandNameInput, setCustomBrandNameInput] = React.useState(() => localStorage.getItem("platform_custom_brand_name") || "");
  const [selectedFont, setSelectedFont] = React.useState(() => localStorage.getItem("platform_font_id") || "Plus Jakarta Sans");
  const [selectedThemeColor, setSelectedThemeColor] = React.useState(() => localStorage.getItem("platform_theme_color") || "emerald");
  const [selectedBlockEdgeColor, setSelectedBlockEdgeColor] = React.useState(() => localStorage.getItem("platform_block_edge_color") || "yellow-blue-green");

  // System Users / Staff list from Firestore
  const [systemUsers, setSystemUsers] = React.useState<Employee[]>([]);
  const [showAddUserModal, setShowAddUserModal] = React.useState(false);
  const [userName, setUserName] = React.useState("");
  const [userEmail, setUserEmail] = React.useState("");
  const [userDept, setUserDept] = React.useState("administration");
  const [userRole, setUserRole] = React.useState("System Administrator");
  const [selectedSystemRole, setSelectedSystemRole] = React.useState<SystemRole>("Doctor");
  const [userAccessLevel, setUserAccessLevel] = React.useState<"Super Admin" | "Department Admin" | "Standard Staff">("Department Admin");
  const [userSubmitting, setUserSubmitting] = React.useState(false);
  const [userCreationError, setUserCreationError] = React.useState("");
  const [showRbacMatrix, setShowRbacMatrix] = React.useState(false);

  // Deduplication Scanner States
  const [isDeduplicating, setIsDeduplicating] = React.useState(false);
  const [dedupReport, setDedupReport] = React.useState<DeduplicationReport | null>(null);
  const [dedupStatusMessage, setDedupStatusMessage] = React.useState<string | null>(null);

  // Live Cloud Firestore Storage Counters
  const [dbCounts, setDbCounts] = React.useState<CollectionCounts>({
    patients: 0,
    employees: 0,
    system_tickets: 0,
    queue: 0,
    invoices: 0,
    medications: 0,
    payroll: 0
  });
  const [isBootstrappingDb, setIsBootstrappingDb] = React.useState(false);
  const [dbSyncMessage, setDbSyncMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const usersList: Employee[] = [];
      snapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setSystemUsers(usersList);
      setDbCounts((prev) => ({ ...prev, employees: snapshot.size }));
    });

    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      setDbCounts((prev) => ({ ...prev, patients: snapshot.size }));
    });

    const unsubTickets = onSnapshot(collection(db, "system_tickets"), (snapshot) => {
      setDbCounts((prev) => ({ ...prev, system_tickets: snapshot.size }));
    });

    const unsubQueue = onSnapshot(collection(db, "queue"), (snapshot) => {
      setDbCounts((prev) => ({ ...prev, queue: snapshot.size }));
    });

    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
      setDbCounts((prev) => ({ ...prev, invoices: snapshot.size }));
    });

    const unsubMeds = onSnapshot(collection(db, "medications"), (snapshot) => {
      setDbCounts((prev) => ({ ...prev, medications: snapshot.size }));
    });

    const unsubPayroll = onSnapshot(collection(db, "payroll"), (snapshot) => {
      setDbCounts((prev) => ({ ...prev, payroll: snapshot.size }));
    });

    return () => {
      unsubEmployees();
      unsubPatients();
      unsubTickets();
      unsubQueue();
      unsubInvoices();
      unsubMeds();
      unsubPayroll();
    };
  }, []);

  const [isPurgingSystem, setIsPurgingSystem] = React.useState(false);
  const [purgeReport, setPurgeReport] = React.useState<CleanSystemReport | null>(null);

  const handlePurgeAndCleanSystem = async () => {
    const confirmWipe = await modernConfirm(
      "CONFIRM PRODUCTION DATA WIPE:\n\nAre you sure you want to remove all test patients, tickets, queue encounters, invoices, pharmacy stocks, and test user accounts?\n\nOnly the Master Super Admin (naisiaetext@gmail.com) will be retained to allow fresh onboarding of real hospital users.",
      {
        title: "PURGE ALL TEST DATA",
        type: "error",
        destructive: true,
        confirmText: "Wipe & Initialize Clean Database",
        cancelText: "Cancel & Keep Records",
        badgeText: "DESTRUCTIVE OPERATION",
      }
    );
    if (!confirmWipe) return;

    setIsPurgingSystem(true);
    setDbSyncMessage("Cleaning system database: Purging all dummy test records and test user accounts...");
    try {
      const report = await cleanSystemAndPurgeTestData();
      setPurgeReport(report);
      setDbSyncMessage(
        `System successfully cleaned! Purged ${report.totalDeleted} total test record(s). All test user accounts removed. Only Master Super Admin is active for fresh staff onboarding.`
      );
      toast.success(`Purged ${report.totalDeleted} test records across 7 collections.`, "System Cleaned");
    } catch (err) {
      console.error("Error wiping system:", err);
      setDbSyncMessage("Failed to complete system purge. Please check Firestore connection.");
      toast.error("Failed to complete database purge.", "Purge Error");
    } finally {
      setIsPurgingSystem(false);
    }
  };

  const handleBootstrapDatabase = async () => {
    setIsBootstrappingDb(true);
    setDbSyncMessage("Verifying collections and checking database status...");
    try {
      const res = await bootstrapCloudFirestore();
      setDbCounts(res.counts);
      if (res.seeded) {
        setDbSyncMessage("Database verified: Master Super Admin account confirmed and active for fresh onboarding.");
      } else {
        setDbSyncMessage("Database connection verified. Clean database is active and storing permanently in Cloud Firestore.");
      }
    } catch (err) {
      console.error("Error bootstrapping database:", err);
      setDbSyncMessage("Database synchronization error. Please check network connection.");
    } finally {
      setIsBootstrappingDb(false);
    }
  };

  const handleRunFullDeduplication = async () => {
    setIsDeduplicating(true);
    setDedupStatusMessage("Scanning all hospital collections for duplicate records (Patients, Tickets, Queue, Staff, Pharmacy)...");
    try {
      const report = await runFullDatabaseDeduplication();
      setDedupReport(report);
      setDedupStatusMessage(`Deduplication scan complete: Found ${report.totalDuplicatesFound} duplicate(s), safely merged & cleaned ${report.totalDuplicatesCleaned} duplicate record(s).`);
    } catch (err) {
      console.error("Error running database deduplication:", err);
      setDedupStatusMessage("Deduplication error encountered while processing collections.");
    } finally {
      setIsDeduplicating(false);
    }
  };

  const handleSystemRoleChange = (role: SystemRole) => {
    setSelectedSystemRole(role);
    const cfg = getRoleConfig(role);
    setUserDept(cfg.department);
    setUserRole(cfg.title);
    if (role === "Super Admin") {
      setUserAccessLevel("Super Admin");
    } else if (role === "Admin" || role === "Finance" || role === "HR") {
      setUserAccessLevel("Department Admin");
    } else {
      setUserAccessLevel("Standard Staff");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationError("");
    if (!userName.trim() || !userEmail.trim()) {
      setUserCreationError("Please provide both name and corporate email address.");
      return;
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const cleanName = userName.trim();

    setUserSubmitting(true);
    try {
      // 1. Strict Duplicate Check: Always reject if user with same email or exact name already exists
      const duplicateCheck = await checkDuplicateEmployee("", cleanEmail);
      if (duplicateCheck.isDuplicate) {
        setUserCreationError(`[DUPLICATE REJECTED] ${duplicateCheck.reason}`);
        setUserSubmitting(false);
        return;
      }

      // Also check local system users for exact email match
      const existingUser = systemUsers.find(u => u.email?.toLowerCase() === cleanEmail);
      if (existingUser) {
        setUserCreationError(`[DUPLICATE REJECTED] An account with email '${cleanEmail}' already exists for ${existingUser.name}. Duplicate creation is strictly blocked.`);
        setUserSubmitting(false);
        return;
      }

      const roleConfig = getRoleConfig(selectedSystemRole);

      await addDoc(collection(db, "employees"), {
        name: cleanName,
        email: cleanEmail,
        department: roleConfig.department,
        role: selectedSystemRole,
        accessLevel: userAccessLevel,
        status: "active",
        salary: 100000,
        phone: "+254700000000",
        nationalId: "SYS-" + Math.floor(100000 + Math.random() * 900000),
        hireDate: new Date().toISOString().split("T")[0]
      });
      setUserName("");
      setUserEmail("");
      setUserCreationError("");
      setShowAddUserModal(false);
    } catch (err) {
      console.error("Error creating user:", err);
      setUserCreationError("Failed to create user. Please check Firestore connection.");
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleUpdateSystemRole = async (userId: string, newRole: SystemRole) => {
    const roleConfig = getRoleConfig(newRole);
    try {
      await updateDoc(doc(db, "employees", userId), {
        role: newRole,
        department: roleConfig.department,
        accessLevel: newRole === "Super Admin" ? "Super Admin" : newRole === "Admin" ? "Department Admin" : "Standard Staff"
      });
    } catch (err) {
      console.error("Error updating system role:", err);
    }
  };

  const handleUpdateAccessLevel = async (userId: string, newAccessLevel: "Super Admin" | "Department Admin" | "Standard Staff") => {
    try {
      await updateDoc(doc(db, "employees", userId), {
        accessLevel: newAccessLevel
      });
      toast.success(`Access level updated to ${newAccessLevel}.`, "Permissions Updated");
    } catch (err) {
      console.error("Error updating user access level:", err);
      toast.error("Failed to update access permissions.", "Permission Error");
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    const confirmed = await modernConfirm(
      `Are you sure you want to remove ${name} from the System User registry? Their access token and roles will be revoked.`,
      {
        title: "Remove User Account",
        type: "error",
        destructive: true,
        confirmText: "Delete Account",
        cancelText: "Cancel",
      }
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "employees", userId));
      toast.success(`${name} has been removed from user registry.`, "User Deleted");
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Failed to delete user account.", "Delete Error");
    }
  };

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
      name: type === "clinic" ? "HMS" : type === "hospital_level_4" ? "Mama Lucy Level 4 Hospital" : "Kenyatta National Referral Hospital",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">HMS Control Center</h2>
            </div>
            <p className="text-xs text-gray-500">Super-Admin Multi-Tenant & Feature Toggles</p>
          </div>
        </div>

        {/* Gold Standard Super Admin Emblem & Session Indicator */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Gold Standard Super Admin Emblem */}
          <div 
            id="gold-standard-super-admin-emblem"
            title="Gold Standard Super Admin Clearance - Full Sovereign Governance"
            className="group relative flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border border-amber-400/40 hover:border-amber-500/80 rounded-full text-amber-900 shadow-xs hover:shadow-md transition-all duration-300 cursor-default"
          >
            {/* Medallion / Crown Badge */}
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-xs ring-1 ring-amber-300/80">
              <Crown className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75" />
            </div>

            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-black tracking-wide uppercase text-amber-950 bg-gradient-to-r from-amber-900 to-yellow-800 bg-clip-text">
                  Gold Standard
                </span>
                <Award className="w-3 h-3 text-amber-600 shrink-0" />
              </div>
              <span className="text-[9px] font-bold text-amber-800/90 tracking-tight">
                Super Admin Sovereign
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Session Active</span>
          </div>
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

      {/* 3. System Users & Role Access Control (Super Admin Exclusive Authority) */}
      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">3. System Roles & User Accounts Management (RBAC)</h3>
                <span className="px-2 py-0.5 bg-purple-100 border border-purple-200 text-purple-900 text-[10px] font-extrabold rounded-md uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-purple-700" />
                  <span>Super Admin Exclusive</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Exclusive Creation: All 11 system roles and user accounts are managed strictly by Super Admin on a "need-to-know" basis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-rbac-matrix"
              type="button"
              onClick={() => setShowRbacMatrix(!showRbacMatrix)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>{showRbacMatrix ? "Hide RBAC Matrix" : "View 11-Role RBAC Matrix"}</span>
            </button>

            <button
              id="btn-add-system-user"
              type="button"
              onClick={() => setShowAddUserModal(!showAddUserModal)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              {showAddUserModal ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{showAddUserModal ? "Cancel" : "Create New User Account"}</span>
            </button>
          </div>
        </div>

        {/* RBAC Matrix Reference Guide */}
        {showRbacMatrix && (
          <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-purple-700" />
                <span>Hospital System Role Hierarchy & Need-to-Know Matrix (11 Defined Roles)</span>
              </h4>
              <span className="text-[10px] text-purple-700 font-mono">11 Active System Roles</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {SYSTEM_ROLES_DIRECTORY.map((r) => (
                <div key={r.role} className="p-2.5 bg-white border border-purple-100 rounded-xl text-xs space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-purple-950 text-xs">{r.role}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-800 font-mono font-bold rounded">
                      {r.department}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{r.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-purple-50">
                    <span className="text-[9px] font-bold text-gray-400">Allowed:</span>
                    {r.allowedModules.map((m) => (
                      <span key={m} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[8px] font-semibold rounded capitalize">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Creation Form */}
        {showAddUserModal && (
          <form onSubmit={handleCreateUser} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-purple-700" />
              <span>Super Admin: Register New System User & Assign Role</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Amina Wanjiku"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:border-purple-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. amina.wanjiku@afyacare.co.ke"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Assigned System Role (11 Roles) *</label>
                <select
                  value={selectedSystemRole}
                  onChange={(e) => handleSystemRoleChange(e.target.value as SystemRole)}
                  className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950 focus:border-purple-500"
                >
                  {SYSTEM_ROLES_DIRECTORY.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role} ({r.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Need-to-know preview */}
            <div className="p-2.5 bg-white rounded-xl border border-purple-100 text-xs flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-purple-900 uppercase">Need-to-Know Workspaces for {selectedSystemRole}:</span>
              <div className="flex flex-wrap gap-1">
                {getRoleConfig(selectedSystemRole).allowedModules.map((mod) => (
                  <span key={mod} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md capitalize">
                    {mod}
                  </span>
                ))}
              </div>
            </div>

            {userCreationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs font-bold text-rose-800 animate-shake">
                <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{userCreationError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={userSubmitting}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{userSubmitting ? "Registering..." : "Save User Account to Registry"}</span>
              </button>
            </div>
          </form>
        )}

        {/* System Users List */}
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
          {systemUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">
              <p className="font-semibold text-gray-700 mb-1">No System Users Registered</p>
              <p>Click "Create New User Account" above to register staff under the 11 defined roles.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">User / Staff Member</th>
                    <th className="p-3">Email Address (Login ID)</th>
                    <th className="p-3">Assigned System Role (RBAC)</th>
                    <th className="p-3">Need-to-Know Workspaces</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {systemUsers.map((u) => {
                    const matchedRole = SYSTEM_ROLES_DIRECTORY.find((r) => r.role === u.role) || SYSTEM_ROLES_DIRECTORY.find((r) => r.department === u.department) || SYSTEM_ROLES_DIRECTORY[0];
                    const activeRoleName = (u.role as SystemRole) || matchedRole.role;
                    const roleCfg = getRoleConfig(activeRoleName);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-gray-900">
                          <div className="flex items-center gap-2.5">
                            {u.photoURL || u.avatarUrl ? (
                              <img
                                src={u.photoURL || u.avatarUrl}
                                alt={u.name}
                                className="w-8 h-8 rounded-xl object-cover border border-purple-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs shrink-0">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div>{u.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">ID: {u.nationalId || u.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-gray-700">{u.email}</td>
                        <td className="p-3">
                          <select
                            value={activeRoleName}
                            onChange={(e) => handleUpdateSystemRole(u.id, e.target.value as SystemRole)}
                            className="px-2 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold cursor-pointer focus:outline-hidden"
                          >
                            {SYSTEM_ROLES_DIRECTORY.map((r) => (
                              <option key={r.role} value={r.role}>
                                {r.role}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {roleCfg.allowedModules.map((mod) => (
                              <span key={mod} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-semibold rounded capitalize">
                                {mod}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Remove User Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Anti-Duplication & Database Integrity Engine */}
      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span>4. Anti-Duplication & Zero-Duplicate Integrity Engine</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider border border-rose-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-rose-700" />
                  <span>Strict Rejection Enforced</span>
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">Automatically scans and purges redundant records across Patients, Queues, Tickets, Personnel, and Medications while enforcing zero-duplicate insertion rules.</p>
            </div>
          </div>

          <button
            id="btn-run-full-deduplication"
            onClick={handleRunFullDeduplication}
            disabled={isDeduplicating}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
              isDeduplicating
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-rose-500/20 active:scale-95"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDeduplicating ? "animate-spin" : ""}`} />
            <span>{isDeduplicating ? "Scanning & Cleaning Database..." : "Scan & Clean All Duplicate Data"}</span>
          </button>
        </div>

        {/* Real-time deduplication rules status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Patient EHR Records</span>
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">REJECT DUPES</span>
            </div>
            <p className="text-[10px] text-slate-500">Blocks duplicate National ID / Passport numbers. Merges visit history automatically.</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Live Queues & Tickets</span>
              </span>
              <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-full font-bold">REJECT DUPES</span>
            </div>
            <p className="text-[10px] text-slate-500">Rejects multiple active hospital encounters in doctor, pharmacy, or diagnostic queues.</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Staff & Pharmacy Stock</span>
              </span>
              <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full font-bold">REJECT DUPES</span>
            </div>
            <p className="text-[10px] text-slate-500">Enforces unique Employee emails / IDs and consolidates duplicate medication SKUs.</p>
          </div>
        </div>

        {/* Deduplication Progress and Report Display */}
        {dedupStatusMessage && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            isDeduplicating 
              ? "bg-indigo-50/70 border-indigo-200 text-indigo-900" 
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}>
            {isDeduplicating ? (
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <p className="font-bold">{dedupStatusMessage}</p>
              {dedupReport && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] text-emerald-800">
                    <span>Audit Report Timestamp: {dedupReport.timestamp}</span>
                    <span className="font-bold">Total Cleaned: {dedupReport.totalDuplicatesCleaned}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {dedupReport.details.map((det, idx) => (
                      <div key={idx} className="p-2.5 bg-white/80 rounded-lg border border-emerald-100 text-[11px]">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span className="capitalize">{det.collection}</span>
                          <span className={det.cleaned > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                            {det.cleaned > 0 ? `${det.cleaned} Removed` : "0 Duplicates"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{det.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Cloud Firestore Independent Database & Permanent Storage */}
      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span>5. Cloud Firestore Independent Database & Permanent Storage</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>Cloud Active</span>
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">All registered patients, medical staff, system tickets, queue encounters, invoices, and pharmacy stock persist permanently across all devices and sessions.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-purge-clean-system"
              onClick={handlePurgeAndCleanSystem}
              disabled={isPurgingSystem}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                isPurgingSystem
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 active:scale-95"
              }`}
            >
              <Trash2 className={`w-3.5 h-3.5 ${isPurgingSystem ? "animate-spin" : ""}`} />
              <span>{isPurgingSystem ? "Purging System Data..." : "Clean System & Purge All Test Data"}</span>
            </button>

            <button
              id="btn-sync-bootstrap-firestore"
              onClick={handleBootstrapDatabase}
              disabled={isBootstrappingDb}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                isBootstrappingDb
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBootstrappingDb ? "animate-spin" : ""}`} />
              <span>{isBootstrappingDb ? "Synchronizing Cloud..." : "Verify Clean Database Status"}</span>
            </button>
          </div>
        </div>

        {/* Live Permanent Collection Counts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Patients (EHR)</span>
            <span className="text-xl font-black text-slate-800 block">{dbCounts.patients}</span>
            <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Persistent
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Staff / Doctors</span>
            <span className="text-xl font-black text-slate-800 block">{dbCounts.employees}</span>
            <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Persistent
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">System Tickets</span>
            <span className="text-xl font-black text-slate-800 block">{dbCounts.system_tickets}</span>
            <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Persistent
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Live Queue</span>
            <span className="text-xl font-black text-slate-800 block">{dbCounts.queue}</span>
            <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Real-time
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Invoices & Bills</span>
            <span className="text-xl font-black text-slate-800 block">{dbCounts.invoices}</span>
            <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Permanent
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pharmacy Stock</span>
            <span className="text-xl font-black text-slate-800 block">{dbCounts.medications}</span>
            <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Persistent
            </span>
          </div>
        </div>

        {dbSyncMessage && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-semibold">{dbSyncMessage}</p>
          </div>
        )}
      </div>

      {/* 6. Advanced Features Management */}
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
                <option value="#eab308">🟡 Solid Yellow Gold (#eab308) [Default]</option>
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
            {/* Logo URL and File Upload Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Custom Logo (Upload or URL)</span>
                </label>
                <label className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Browse Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const res = ev.target?.result as string;
                          if (res) {
                            setLogoUrlInput(res);
                            updateBrandingSettings("platform_logo_url", res);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={logoUrlInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLogoUrlInput(val);
                    updateBrandingSettings("platform_logo_url", val);
                  }}
                  placeholder="Paste URL or upload image file above"
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-emerald-500"
                />
                {logoUrlInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrlInput("");
                      updateBrandingSettings("platform_logo_url", "");
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[9px] text-gray-400">Click "Browse Image File" to upload from your computer or paste an image URL.</p>
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


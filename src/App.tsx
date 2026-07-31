import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, googleProvider } from "./lib/firebase";
import { collection, getDocs, setDoc, doc, addDoc, onSnapshot, updateDoc, disableNetwork, enableNetwork } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from "firebase/auth";
import { Tenant, DepartmentToggles, Employee } from "./types";
import AdminPanel from "./components/AdminPanel";
import ReceptionKiosk from "./components/ReceptionKiosk";
import QueueDashboard from "./components/QueueDashboard";
import DoctorsDesk from "./components/DoctorsDesk";
import SmartPharmacy from "./components/SmartPharmacy";
import AncillaryLabs from "./components/AncillaryLabs";
import PaperlessBilling from "./components/PaperlessBilling";
import FinanceDashboard from "./components/FinanceDashboard";
import HumanResources from "./components/HumanResources";
import Payroll from "./components/Payroll";
import Procurement from "./components/Procurement";
import TicketSystem from "./components/TicketSystem";
import SecurityDesk from "./components/SecurityDesk";
import PatientJourneyTracker from "./components/PatientJourneyTracker";
import DashboardOverview from "./components/DashboardOverview";

import {
  Building2,
  Sliders,
  UserPlus,
  Monitor,
  Stethoscope,
  FlaskRound,
  ShoppingCart,
  CreditCard,
  Landmark,
  Cpu,
  RefreshCw,
  Heart,
  ShieldAlert,
  HelpCircle,
  Users,
  Shield,
  ShieldCheck,
  ExternalLink,
  Activity,
  User,
  Clock,
  Settings,
  Bell,
  BellRing,
  X,
  Check,
  Wifi,
  WifiOff,
  LayoutDashboard,
  LogIn,
  LogOut,
  Key,
  Lock,
  UserCog,
  ArrowRight,
  Sparkles,
  Type,
  Palette,
  Ticket,
  ShoppingBag,
  DollarSign
} from "lucide-react";

export interface LiveNotification {
  id: string;
  ticketNo: string;
  patientName: string;
  nationalId: string;
  age: number;
  phone: string;
  issue: string;
  assignedSpecialistId: string;
  assignedSpecialistName: string;
  timestamp: string;
}

export const GOOGLE_FONTS = [
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans (Default)", importUrl: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" },
  { id: "Inter", name: "Inter (Modern Sans)", importUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" },
  { id: "Comfortaa", name: "Comfortaa (Playful Rounded)", importUrl: "https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap" },
  { id: "JetBrains Mono", name: "JetBrains Mono (Tech/Mono)", importUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700;800&display=swap" },
  { id: "Playfair Display", name: "Playfair Display (Editorial Serif)", importUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" },
  { id: "Outfit", name: "Outfit (Geometric)", importUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" },
  { id: "Cinzel", name: "Cinzel (Classic Display Serif)", importUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap" }
];

export const THEME_PALETTES: Record<string, { name: string; hex: string; colors: Record<string, string> }> = {
  emerald: {
    name: "Emerald Green (Default)",
    hex: "#059669",
    colors: {
      "50": "#ecfdf5",
      "100": "#d1fae5",
      "200": "#a7f3d0",
      "500": "#10b981",
      "600": "#059669",
      "700": "#047857",
      "800": "#065f46"
    }
  },
  indigo: {
    name: "Corporate Indigo Blue",
    hex: "#4f46e5",
    colors: {
      "50": "#f5f7ff",
      "100": "#e0e7ff",
      "200": "#c7d2fe",
      "500": "#6366f1",
      "600": "#4f46e5",
      "700": "#4338ca",
      "800": "#3730a3"
    }
  },
  violet: {
    name: "Royal Purple Violet",
    hex: "#7c3aed",
    colors: {
      "50": "#faf5ff",
      "100": "#f3e8ff",
      "200": "#e9d5ff",
      "500": "#8b5cf6",
      "600": "#7c3aed",
      "700": "#6d28d9",
      "800": "#5b21b6"
    }
  },
  rose: {
    name: "Crimson Rose Red",
    hex: "#e11d48",
    colors: {
      "50": "#fff1f2",
      "100": "#ffe4e6",
      "200": "#fecdd3",
      "500": "#f43f5e",
      "600": "#e11d48",
      "700": "#be123c",
      "800": "#9f1239"
    }
  },
  amber: {
    name: "Warm Golden Amber",
    hex: "#d97706",
    colors: {
      "50": "#fffbeb",
      "100": "#fef3c7",
      "200": "#fde68a",
      "500": "#f59e0b",
      "600": "#d97706",
      "700": "#b45309",
      "800": "#92400e"
    }
  },
  slate: {
    name: "Technical Steel Slate",
    hex: "#475569",
    colors: {
      "50": "#f8fafc",
      "100": "#f1f5f9",
      "200": "#e2e8f0",
      "500": "#64748b",
      "600": "#475569",
      "700": "#334155",
      "800": "#1e293b"
    }
  },
  teal: {
    name: "Aquatic Ocean Teal",
    hex: "#0d9488",
    colors: {
      "50": "#f0fdfa",
      "100": "#ccfbf1",
      "200": "#99f6e4",
      "500": "#14b8a6",
      "600": "#0d9488",
      "700": "#0f766e",
      "800": "#115e59"
    }
  }
};

const HEADER_BG_STYLES: Record<string, { name: string; bgClass: string; fillClass: string; textClass: string; borderClass: string; pillClass: string; btnClass: string; accentClass: string; titleClass: string }> = {
  "sunset-orange": {
    name: "Sunset Orange",
    bgClass: "bg-gradient-to-r from-orange-950 via-amber-950 to-orange-900",
    fillClass: "fill-orange-950",
    textClass: "text-orange-100",
    borderClass: "border-orange-800",
    pillClass: "bg-orange-950/70 backdrop-blur-md text-orange-100 border-orange-700/60 shadow-xs",
    btnClass: "bg-orange-800/80 hover:bg-orange-700 text-orange-50 border border-orange-500/80 shadow-xs hover:border-orange-400",
    accentClass: "text-orange-400",
    titleClass: "text-white",
  },
  "dark-slate": {
    name: "Deep Slate & Orange",
    bgClass: "bg-slate-900",
    fillClass: "fill-slate-900",
    textClass: "text-slate-100",
    borderClass: "border-slate-800",
    pillClass: "bg-slate-800/80 backdrop-blur-md text-slate-100 border-orange-500/30 shadow-xs",
    btnClass: "bg-slate-700/80 hover:bg-slate-700 text-slate-100 border border-orange-500/40 hover:border-orange-400/80 shadow-xs",
    accentClass: "text-orange-400",
    titleClass: "text-white",
  },
  "emerald-dark": {
    name: "Medical Emerald & Orange",
    bgClass: "bg-emerald-950",
    fillClass: "fill-emerald-950",
    textClass: "text-emerald-100",
    borderClass: "border-emerald-900",
    pillClass: "bg-emerald-900/60 backdrop-blur-md text-emerald-100 border-orange-500/30 shadow-xs",
    btnClass: "bg-emerald-850/80 hover:bg-emerald-800 text-emerald-100 border border-orange-500/40 hover:border-orange-400/80 shadow-xs",
    accentClass: "text-orange-400",
    titleClass: "text-white",
  },
  "navy-dark": {
    name: "Executive Navy & Orange",
    bgClass: "bg-indigo-950",
    fillClass: "fill-indigo-950",
    textClass: "text-indigo-100",
    borderClass: "border-indigo-900",
    pillClass: "bg-indigo-900/60 backdrop-blur-md text-indigo-100 border-orange-500/30 shadow-xs",
    btnClass: "bg-indigo-850/80 hover:bg-indigo-800 text-indigo-100 border border-orange-500/40 hover:border-orange-400/80 shadow-xs",
    accentClass: "text-orange-400",
    titleClass: "text-white",
  },
  "midnight": {
    name: "Midnight Charcoal & Amber",
    bgClass: "bg-zinc-950",
    fillClass: "fill-zinc-950",
    textClass: "text-zinc-100",
    borderClass: "border-zinc-800",
    pillClass: "bg-zinc-900/80 backdrop-blur-md text-zinc-100 border-orange-500/30 shadow-xs",
    btnClass: "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-100 border border-orange-500/40 hover:border-orange-400/80 shadow-xs",
    accentClass: "text-orange-400",
    titleClass: "text-white",
  },
  "teal-dark": {
    name: "Ocean Teal & Orange",
    bgClass: "bg-teal-950",
    fillClass: "fill-teal-950",
    textClass: "text-teal-100",
    borderClass: "border-teal-900",
    pillClass: "bg-teal-900/60 backdrop-blur-md text-teal-100 border-orange-500/30 shadow-xs",
    btnClass: "bg-teal-850/80 hover:bg-teal-800 text-teal-100 border border-orange-500/40 hover:border-orange-400/80 shadow-xs",
    accentClass: "text-orange-400",
    titleClass: "text-white",
  },
  "royal-purple": {
    name: "Royal Violet & Orange",
    bgClass: "bg-purple-950",
    fillClass: "fill-purple-950",
    textClass: "text-purple-100",
    borderClass: "border-purple-900",
    pillClass: "bg-purple-900/60 backdrop-blur-md text-purple-100 border-orange-500/30 shadow-xs",
    btnClass: "bg-purple-850/80 hover:bg-purple-800 text-purple-100 border border-orange-500/40 hover:border-orange-400/80 shadow-xs",
    accentClass: "text-orange-400",
    titleClass: "text-white",
  },
  "subtle-light": {
    name: "Crisp Light & Orange",
    bgClass: "bg-white",
    fillClass: "fill-white",
    textClass: "text-slate-800",
    borderClass: "border-gray-200",
    pillClass: "bg-gray-100/90 backdrop-blur-md text-slate-800 border-orange-300/80 shadow-xs",
    btnClass: "bg-white hover:bg-orange-50 text-slate-900 border border-orange-400/60 hover:border-orange-500 shadow-2xs",
    accentClass: "text-orange-600",
    titleClass: "text-slate-900",
  },
};

export default function App() {
  const [tenant, setTenant] = useState<Tenant>({
    id: "tenant-9943",
    name: "Hospital Management System",
    type: "clinic",
    county: "Nairobi",
  });

  const [toggles, setToggles] = useState<DepartmentToggles>({
    reception: true,
    queue: true,
    doctor: true,
    pharmacy: true,
    laboratory: false, // Default clinic doesn't have lab/radiology
    radiology: false,
    billing: true,
  });

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Authentication & Session States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [simulatedUser, setSimulatedUser] = useState<{ email: string; displayName: string; isSimulated: boolean; photoURL?: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Specialist Simulation & Live Notification States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeSpecialistId, setActiveSpecialistId] = useState<string>("");
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [platformFontSize, setPlatformFontSize] = useState<"sm" | "base" | "lg" | "xl" | "2xl" | "3xl">(() => {
    const saved = localStorage.getItem("platform_font_size");
    return (saved as any) || "base";
  });

  // Dynamic branding state values
  const [headerBgStyle, setHeaderBgStyle] = useState<string>(() => localStorage.getItem("platform_header_bg") || "dark-slate");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>(() => localStorage.getItem("platform_logo_url") || "");
  const [brandFaviconUrl, setBrandFaviconUrl] = useState<string>(() => localStorage.getItem("platform_favicon_url") || "");
  const [brandCustomName, setBrandCustomName] = useState<string>(() => localStorage.getItem("platform_custom_brand_name") || "");
  const [brandFontId, setBrandFontId] = useState<string>(() => localStorage.getItem("platform_font_id") || "Plus Jakarta Sans");
  const [brandThemeColor, setBrandThemeColor] = useState<string>(() => localStorage.getItem("platform_theme_color") || "emerald");
  const [brandBlockEdgeColor, setBrandBlockEdgeColor] = useState<string>(() => localStorage.getItem("platform_block_edge_color") || "yellow-blue-green");

  useEffect(() => {
    localStorage.setItem("platform_header_bg", headerBgStyle);
  }, [headerBgStyle]);

  useEffect(() => {
    localStorage.setItem("platform_font_size", platformFontSize);
    const root = document.documentElement;
    if (platformFontSize === "sm") {
      root.style.fontSize = "13px";
    } else if (platformFontSize === "base") {
      root.style.fontSize = "16px";
    } else if (platformFontSize === "lg") {
      root.style.fontSize = "18px";
    } else if (platformFontSize === "xl") {
      root.style.fontSize = "20px";
    } else if (platformFontSize === "2xl") {
      root.style.fontSize = "22px";
    } else if (platformFontSize === "3xl") {
      root.style.fontSize = "25px";
    }
  }, [platformFontSize]);

  // Dynamic branding applicator
  useEffect(() => {
    // 1. Font Application
    const fontOpt = GOOGLE_FONTS.find(f => f.id === brandFontId);
    if (fontOpt) {
      const linkId = "dynamic-google-font";
      let linkEl = document.getElementById(linkId) as HTMLLinkElement;
      if (!linkEl) {
        linkEl = document.createElement("link");
        linkEl.id = linkId;
        linkEl.rel = "stylesheet";
        document.head.appendChild(linkEl);
      }
      linkEl.href = fontOpt.importUrl;
      document.documentElement.style.setProperty("--font-sans", `"${fontOpt.id}", "Inter", sans-serif`);
    }

    // 2. Theme Color Application (Dynamic overriding of Tailwind v4 --color-emerald CSS variables)
    const palette = THEME_PALETTES[brandThemeColor];
    const root = document.documentElement;
    if (palette) {
      Object.entries(palette.colors).forEach(([weight, hexValue]) => {
        root.style.setProperty(`--color-emerald-${weight}`, hexValue);
      });
    }

    // Calculate and set Block Right Edge Gradient & Glow
    if (brandBlockEdgeColor === "transparent") {
      root.style.setProperty("--block-edge-width", "0px");
      root.style.setProperty("--block-edge-gradient", "transparent");
      root.style.setProperty("--block-edge-glow", "transparent");
    } else {
      root.style.setProperty("--block-edge-width", "5px");
      if (brandBlockEdgeColor === "yellow-blue-green" || !brandBlockEdgeColor) {
        root.style.setProperty("--block-edge-gradient", "linear-gradient(180deg, #eab308 0%, #2563eb 50%, #10b981 100%)");
        root.style.setProperty("--block-edge-glow", "rgba(37, 99, 235, 0.4)");
      } else if (brandBlockEdgeColor === "yellow-blue-green-diag") {
        root.style.setProperty("--block-edge-gradient", "linear-gradient(135deg, #facc15 0%, #2563eb 50%, #10b981 100%)");
        root.style.setProperty("--block-edge-glow", "rgba(250, 204, 21, 0.4)");
      } else if (brandBlockEdgeColor === "yellow-blue-green-soft") {
        root.style.setProperty("--block-edge-gradient", "linear-gradient(180deg, #fde047 0%, #60a5fa 50%, #34d399 100%)");
        root.style.setProperty("--block-edge-glow", "rgba(96, 165, 250, 0.4)");
      } else if (brandBlockEdgeColor === "theme") {
        const themeHex = palette ? palette.colors["600"] : "#059669";
        root.style.setProperty("--block-edge-gradient", `linear-gradient(180deg, ${themeHex}, ${themeHex})`);
        root.style.setProperty("--block-edge-glow", "rgba(5, 150, 105, 0.35)");
      } else {
        root.style.setProperty("--block-edge-gradient", `linear-gradient(180deg, ${brandBlockEdgeColor}, ${brandBlockEdgeColor})`);
        root.style.setProperty("--block-edge-glow", "rgba(37, 99, 235, 0.35)");
      }
    }

    // 3. Favicon Application
    if (brandFaviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = brandFaviconUrl;
    }

    // 4. Tab Title Application
    if (brandCustomName) {
      document.title = brandCustomName;
    } else {
      document.title = "Hospital Management System";
    }
  }, [brandFontId, brandThemeColor, brandFaviconUrl, brandCustomName, brandBlockEdgeColor]);

  // Synchronize font size changes and branding edits from AdminPanel
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem("platform_font_size");
      if (saved) {
        setPlatformFontSize(saved as any);
      }
    };
    const handleBrandingSync = () => {
      setBrandLogoUrl(localStorage.getItem("platform_logo_url") || "");
      setBrandFaviconUrl(localStorage.getItem("platform_favicon_url") || "");
      setBrandCustomName(localStorage.getItem("platform_custom_brand_name") || "");
      setBrandFontId(localStorage.getItem("platform_font_id") || "Plus Jakarta Sans");
      setBrandThemeColor(localStorage.getItem("platform_theme_color") || "emerald");
      setBrandBlockEdgeColor(localStorage.getItem("platform_block_edge_color") || "theme");
    };

    window.addEventListener("platform_font_size_changed", handleSync);
    window.addEventListener("platform_branding_changed", handleBrandingSync);
    return () => {
      window.removeEventListener("platform_font_size_changed", handleSync);
      window.removeEventListener("platform_branding_changed", handleBrandingSync);
    };
  }, []);

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor real Firebase Auth changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const activeUser = user 
    ? { email: user.email || "", displayName: user.displayName || "Google User", isSimulated: false, photoURL: user.photoURL || undefined } 
    : simulatedUser;

  const isSuperAdmin = activeUser?.email === "muyamoz@gmail.com" || activeUser?.email === "naisiaetext@gmail.com";

  // Find employee matching logged-in user email
  const loggedInEmployee = employees.find(
    (emp) => emp.email?.toLowerCase() === activeUser?.email?.toLowerCase()
  );

  // Determine active identity for role checks
  const activeStaffRecord = activeSpecialistId
    ? employees.find(emp => emp.id === activeSpecialistId)
    : loggedInEmployee;

  const activeRoleName = activeStaffRecord?.role || (isSuperAdmin ? "Hospital Superintendent" : "Guest Operator");
  const activeDepartmentName = activeStaffRecord?.department || (isSuperAdmin ? "administration" : "guest");

  const checkTabPermission = (tabId: string): { allowed: boolean; reason?: string } => {
    // Super admins have access to all tabs
    if (isSuperAdmin) {
      return { allowed: true };
    }

    // Public dashboards & ticket desk
    if (tabId === "journey" || tabId === "queue" || tabId === "dashboard" || tabId === "tickets") {
      return { allowed: true };
    }

    // Unregistered guest users can only access public boards
    if (!loggedInEmployee) {
      return {
        allowed: false,
        reason: "Your email address is not registered in the Staff Registry. Please ask a Super-Admin to add your email in the HR Panel to obtain department clearance."
      };
    }

    const dept = loggedInEmployee.department?.toLowerCase();

    switch (tabId) {
      case "admin":
        return { allowed: false, reason: "Requires System Administrator (Administration) privileges." };
      case "reception":
        if (["reception", "nursing", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires Reception, Nursing, or Administration department clearance." };
      case "doctor":
        if (dept === "medical") return { allowed: true };
        return { allowed: false, reason: "Requires Medical clearance (registered Doctors / Practitioners only)." };
      case "diagnostics":
        if (["laboratory", "radiology", "medical", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires Laboratory, Radiology, or Medical department clearance." };
      case "pharmacy":
        if (["pharmacy", "medical", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires Pharmacy or Medical clearance." };
      case "billing":
        if (["finance", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires Finance or Administration clearance." };
      case "finance":
        if (["finance", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires Finance or Administration clearance." };
      case "hr":
        if (["hr", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires Human Resources or Administration department clearance." };
      case "payroll":
        if (["hr", "finance", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires HR, Finance, or Administration clearance." };
      case "procurement":
        if (["finance", "pharmacy", "laboratory", "hr", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires Supply Chain, Procurement, Finance, or Dept Clearance." };
      case "security":
        if (["security", "administration"].includes(dept)) return { allowed: true };
        return { allowed: false, reason: "Requires Security or Administration clearance." };
      default:
        return { allowed: false, reason: "Access restricted." };
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Logged in via Google:", result.user);
    } catch (err: any) {
      console.error("Google Auth popup error:", err);
      setAuthError(
        "Google Popup Blocked or Mismatched config. Inside the sandboxed iframe, popups might be blocked by your browser settings. Please click 'Super Admin Quick Bypass' to login instantly as muyamoz@gmail.com, or use 'Open in New Tab'."
      );
    }
  };

  const handleBypassLogin = (email: string, displayName: string) => {
    setAuthError(null);
    setSimulatedUser({
      email,
      displayName,
      isSimulated: true,
      photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c"
    });
  };

  const handleLogout = async () => {
    setAuthError(null);
    if (simulatedUser) {
      setSimulatedUser(null);
    } else {
      await signOut(auth);
    }
    // Reset impersonation and navigation tab
    setActiveSpecialistId("");
    setActiveTab("dashboard");
  };

  // Online/Offline & Sync Tracking State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Monitor real-world network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync listener to check if there are any snapshots with pending writes
  useEffect(() => {
    const unsubQueueSync = onSnapshot(collection(db, "queue"), (snapshot) => {
      const hasPending = snapshot.metadata.hasPendingWrites;
      setPendingSyncCount(hasPending ? 1 : 0);
    });
    return () => unsubQueueSync();
  }, []);

  // Function to toggle simulated offline mode
  const toggleOfflineSimulation = async () => {
    try {
      if (isSimulatedOffline) {
        await enableNetwork(db);
        setIsSimulatedOffline(false);
      } else {
        await disableNetwork(db);
        setIsSimulatedOffline(true);
      }
    } catch (err) {
      console.error("Error toggling offline simulation:", err);
    }
  };

  // Fetch specialists list for simulation
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((doc) => {
        emps.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(emps.filter(e => e.status === "active"));
    });
    return () => unsub();
  }, []);

  // Automatically switch active tab when a specialist is impersonated/jumped to
  useEffect(() => {
    if (activeSpecialistId) {
      const selectedEmp = employees.find(emp => emp.id === activeSpecialistId);
      if (selectedEmp) {
        const dept = selectedEmp.department?.toLowerCase();
        if (dept === "medical") {
          setActiveTab("doctor");
        } else if (dept === "pharmacy") {
          setActiveTab("pharmacy");
        } else if (dept === "laboratory" || dept === "radiology") {
          setActiveTab("diagnostics");
        } else if (dept === "finance") {
          setActiveTab("billing");
        } else if (dept === "hr") {
          setActiveTab("hr");
        } else if (dept === "security") {
          setActiveTab("security");
        } else if (dept === "reception" || dept === "nursing") {
          setActiveTab("reception");
        }
      }
    }
  }, [activeSpecialistId, employees]);

  // Live Firebase/Firestore onSnapshot Listener for Specialist notifications
  useEffect(() => {
    const qQueue = collection(db, "queue");
    const unsubscribeQueue = onSnapshot(qQueue, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          
          // Only trigger if it is pending, has an assigned specialist, and is newly created (last 3 minutes)
          const isNewlyCreated = data.timestamp && (new Date(data.timestamp).getTime() > Date.now() - 180000);
          
          if (
            data.status === "pending" &&
            data.assignedSpecialistId &&
            isNewlyCreated
          ) {
            const newNotif: LiveNotification = {
              id: change.doc.id,
              ticketNo: data.ticketNo,
              patientName: data.patientName,
              nationalId: data.nationalId,
              age: data.age || 30,
              phone: data.phone || "N/A",
              issue: data.issue || "General medical consultation",
              assignedSpecialistId: data.assignedSpecialistId,
              assignedSpecialistName: data.assignedSpecialistName,
              timestamp: data.timestamp,
            };

            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;

              // Play a medical alert tone
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
                oscillator.frequency.setValueAtTime(1109.73, audioCtx.currentTime + 0.15); // C#6 note
                gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.4);
              } catch (e) {
                console.log("Audio API blocked or unsupported:", e);
              }

              return [newNotif, ...prev];
            });
          }
        }
      });
    });

    return () => unsubscribeQueue();
  }, []);

  const handleAcceptTicket = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, "queue", ticketId), { status: "serving" });
      setNotifications((prev) => prev.filter((n) => n.id !== ticketId));
      setActiveTab("doctor"); // Seamlessly transition specialist to doctor station!
    } catch (err) {
      console.error("Error accepting assigned ticket:", err);
    }
  };

  // Auto-seed Firestore on mount if database is empty
  useEffect(() => {
    const checkAndSeedDatabase = async () => {
      setSeeding(true);
      try {
        const medSnap = await getDocs(collection(db, "medications"));
        if (medSnap.empty) {
          console.log("Firestore empty. Seeding initial clinical & POS records...");

          // 1. Seed Pharmacy Stock
          const initialMeds = [
            {
              name: "Amoxicillin (500mg)",
              category: "Antibiotics",
              quantity: 120,
              minThreshold: 40,
              batchNo: "AMX-8829-2026",
              expiryDate: "2026-10-15", // Expiring soon! (Within 4 months)
              price: 25,
              imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80",
            },
            {
              name: "Paracetamol (500mg)",
              category: "Analgesics",
              quantity: 800,
              minThreshold: 150,
              batchNo: "PCM-1044-2027",
              expiryDate: "2027-04-12",
              price: 5,
              imageUrl: "https://images.unsplash.com/photo-1550572017-edf792890586?auto=format&fit=crop&w=300&q=80",
            },
            {
              name: "Metformin (500mg)",
              category: "Antidiabetics",
              quantity: 0, // Out of Stock to trigger AI suggestions
              minThreshold: 50,
              batchNo: "MTF-3022-2026",
              expiryDate: "2026-11-20",
              price: 15,
              imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=300&q=80",
            },
            {
              name: "Atorvastatin (10mg)",
              category: "Cardiovascular",
              quantity: 15, // Low stock!
              minThreshold: 40,
              batchNo: "ATV-0091-2026",
              expiryDate: "2026-09-10", // Expiring soon! (FIFO alert)
              price: 45,
              imageUrl: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=300&q=80",
            },
            {
              name: "Omeprazole (20mg)",
              category: "Gastrointestinal",
              quantity: 450,
              minThreshold: 60,
              batchNo: "OMP-7744-2027",
              expiryDate: "2027-03-01",
              price: 12,
              imageUrl: "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=300&q=80",
            },
          ];

          for (const m of initialMeds) {
            await addDoc(collection(db, "medications"), m);
          }

          // 2. Seed Initial Patients with EHR Visit timelines
          const initialPatients = [
            {
              patientName: "Alice Wambui Kamau",
              nationalId: "32441928",
              phone: "0711943210",
              age: 29,
              gender: "Female",
              bloodType: "A+",
              shaEligible: "eligible",
              shaId: "SHA-K-3244-9043",
              visits: [
                {
                  id: "vst-001",
                  date: "2026-05-10",
                  vitals: { temp: "38.2", bp: "125/82", pulse: "88", weight: "58" },
                  symptoms: "High fever, chills, sore throat, and painful swallowing for 3 days.",
                  diagnosis: "Acute Bacterial Tonsillitis",
                  prescriptions: [
                    { drugName: "Amoxicillin (500mg)", quantity: 21, dosage: "1x3", instructions: "Take for 7 days post meals", status: "dispensed" },
                    { drugName: "Paracetamol (500mg)", quantity: 15, dosage: "1x3", instructions: "Take when fever occurs", status: "dispensed" }
                  ],
                  referrals: []
                }
              ]
            },
            {
              patientName: "David Omondi Otieno",
              nationalId: "29110482",
              phone: "0722004481",
              age: 42,
              gender: "Male",
              bloodType: "O+",
              shaEligible: "eligible",
              shaId: "SHA-K-2911-3012",
              visits: [
                {
                  id: "vst-002",
                  date: "2026-06-15",
                  vitals: { temp: "36.5", bp: "145/95", pulse: "72", weight: "85" },
                  symptoms: "Occasional morning headaches, mild dizziness, and high fatigue indicators.",
                  diagnosis: "Primary Essential Hypertension (Stage 1)",
                  prescriptions: [
                    { drugName: "Atorvastatin (10mg)", quantity: 30, dosage: "1x1", instructions: "Take at night", status: "dispensed" }
                  ],
                  referrals: [
                    { id: "ref-001", department: "laboratory", testName: "Lipid Profile Panel", notes: "Assess cardiac risks", status: "completed", results: "Cholesterol: 5.8 mmol/L (Elevated), LDL: 3.8 mmol/L. Triglycerides: 2.1 mmol/L." }
                  ]
                }
              ]
            }
          ];

          for (const p of initialPatients) {
            await addDoc(collection(db, "patients"), p);
          }

          // 3. Seed Initial Expenses (Opex Ledger)
          const initialExpenses = [
            {
              description: "Medical oxygen cylinders refill",
              amount: 12500,
              category: "supplies",
              date: "2026-07-01",
              supplier: "Kenya Medical Supplies Authority (KEMSA)",
            },
            {
              description: "Primary power generator diesel maintenance",
              amount: 8400,
              category: "utilities",
              date: "2026-07-04",
              supplier: "Rubis Energy Kenya",
            }
          ];

          for (const e of initialExpenses) {
            await addDoc(collection(db, "expenses"), e);
          }

          setSeedSuccess(true);
        }
      } catch (err) {
        console.error("Filerore seeding issue:", err);
      } finally {
        setSeeding(false);
      }
    };

    checkAndSeedDatabase();
  }, []);

  // Filter navigation tabs dynamically based on super-admin feature toggles
  const navItems = [
    { id: "dashboard", label: "Dashboard Overview", icon: LayoutDashboard, enabled: true },
    { id: "reception", label: "Reception Desk", icon: UserPlus, enabled: toggles.reception },
    { id: "tickets", label: "Client Tickets", icon: Ticket, enabled: true },
    { id: "journey", label: "Patient Journey", icon: Activity, enabled: true },
    { id: "queue", label: "Live Queue Board", icon: Monitor, enabled: toggles.queue },
    { id: "doctor", label: "Doctor Station", icon: Stethoscope, enabled: toggles.doctor },
    { id: "diagnostics", label: "Lab / Radiology", icon: FlaskRound, enabled: toggles.laboratory || toggles.radiology },
    { id: "pharmacy", label: "Pharmacy POS", icon: ShoppingCart, enabled: toggles.pharmacy },
    { id: "billing", label: "Split Billing", icon: CreditCard, enabled: toggles.billing },
    { id: "finance", label: "Finance & Accounts", icon: Landmark, enabled: true },
    { id: "procurement", label: "Procurement & LPO", icon: ShoppingBag, enabled: true },
    { id: "hr", label: "Human Resources", icon: Users, enabled: true },
    { id: "payroll", label: "Payroll & Tax", icon: DollarSign, enabled: true },
    { id: "security", label: "Security Desk", icon: Shield, enabled: true },
    { id: "admin", label: "Developer Settings", icon: Sliders, enabled: true },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase animate-pulse">Validating NextGen HMS Session...</p>
        </div>
      </div>
    );
  }

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0b0f19] via-[#0f172a] to-[#020617] flex flex-col items-center justify-center p-4 text-slate-100 font-sans relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

        <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-[0_24px_64px_rgba(0,0,0,0.5)] space-y-6 relative z-10">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20 mb-2">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-comfortaa">Hospital Management System</h1>
            <p className="text-[10px] font-bold font-mono text-emerald-400 tracking-widest uppercase">Hospital Management System</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Secure biometric intake, real-time Social Health Authority (SHA) claims, and eTIMS compliant billing.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-500/30 text-rose-300 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Authentication Notice</span>
              </div>
              <p className="leading-relaxed text-[11px]">{authError}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              id="btn-google-login"
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-slate-950 font-bold rounded-xl text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-white/5 hover:-translate-y-0.5 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google Account</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sandbox Testing Portal</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Quick Bypass Button for Super Admin testing */}
            <button
              id="btn-bypass-login"
              onClick={() => handleBypassLogin("muyamoz@gmail.com", "Super Admin (muyamoz)")}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold rounded-xl text-xs tracking-wider uppercase border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer animate-pulse hover:animate-none"
            >
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Super Admin Bypass (muyamoz@gmail.com)</span>
            </button>

            {/* Additional sandbox login for naisiaetext@gmail.com */}
            <button
              id="btn-developer-login"
              onClick={() => handleBypassLogin("naisiaetext@gmail.com", "Developer Admin")}
              className="w-full py-2.5 px-4 bg-slate-900/50 hover:bg-slate-800/40 text-slate-400 font-semibold rounded-xl text-[11px] tracking-wide border border-slate-800 hover:border-slate-750 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5 text-slate-400" />
              <span>Sign in as Developer (naisiaetext@gmail.com)</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800/60 text-center text-[10px] text-slate-500 leading-normal">
            By signing in, you will access the secure medical dashboard. Registered Super Admin has root bypass and system impersonation privileges.
          </div>
        </div>
      </div>
    );
  }

  const currentHeaderStyle = HEADER_BG_STYLES[headerBgStyle] || HEADER_BG_STYLES["dark-slate"];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col text-gray-800 font-sans pb-16 md:pb-0">
      {/* End-to-End Top Header Bar with Single Wave Curved Bottom Edge */}
      <div className="relative w-full z-30 shrink-0">
        <header className={`w-full ${currentHeaderStyle.bgClass} ${currentHeaderStyle.textClass} pt-5 md:pt-6 pb-4 md:pb-5 px-5 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-300 shadow-xs`}>
        
        {/* Brand and Active Facility */}
        <div className="flex items-center gap-3.5 md:gap-5">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center shrink-0">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" referrerPolicy="no-referrer" />
            ) : (
              <Building2 className="w-8 h-8 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={`text-3xl md:text-4xl lg:text-4xl font-extrabold tracking-tight ${currentHeaderStyle.titleClass} uppercase leading-none font-sans`}>
                {brandCustomName || tenant.name}
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold rounded-md uppercase tracking-wider shrink-0">Tier {tenant.type}</span>
            </div>
          </div>
        </div>

        {/* User Profile and Real-time Clock */}
        <div className="flex flex-wrap items-center gap-2.5 md:gap-3.5">
          {/* Offline/Online Status Indicator and Sync Controller */}
          <div className={`hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
            isOnline && !isSimulatedOffline
              ? currentHeaderStyle.pillClass
              : "bg-amber-500/20 text-amber-200 animate-pulse border-amber-500/40"
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline && !isSimulatedOffline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
            <div className="flex flex-col text-left mr-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-none">NETWORK</span>
              <span className="text-xs font-extrabold leading-none mt-0.5 flex items-center gap-1">
                {isOnline && !isSimulatedOffline ? "Online" : "Offline"}
                {pendingSyncCount > 0 && <span className="text-[10px] font-medium text-emerald-400 animate-pulse">(Syncing...)</span>}
              </span>
            </div>
            
            <button
              onClick={toggleOfflineSimulation}
              title={isSimulatedOffline ? "Enable connection and push pending changes to Firebase" : "Go offline to operate in fully local cached database"}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold active:scale-95 ${
                isOnline && !isSimulatedOffline
                  ? currentHeaderStyle.btnClass
                  : "bg-amber-500 text-slate-950 hover:bg-amber-400 border border-amber-300 shadow-xs"
              }`}
            >
              {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5 text-slate-950" /> : <Wifi className={`w-3.5 h-3.5 ${currentHeaderStyle.accentClass}`} />}
              <span className="font-mono text-[11px]">
                {isSimulatedOffline ? "Sync Now" : "Go Offline"}
              </span>
            </button>
          </div>

          {/* Admin Account Jumper / Specialist Jumper - Only visible to Admins */}
          {(isSuperAdmin || activeUser.email === "naisiaetext@gmail.com") && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/40 transition-all shadow-xs animate-pulse hover:animate-none text-amber-100">
              <div className="p-1 bg-amber-500 text-slate-950 rounded-md shrink-0">
                <UserCog className="w-4 h-4 text-slate-950" />
              </div>
              <div className="text-left block">
                <label className="block text-[9px] text-amber-300 font-black uppercase tracking-widest leading-none mb-0.5">Admin Account Jumper</label>
                <select
                  id="admin-specialist-jumper"
                  value={activeSpecialistId}
                  onChange={(e) => setActiveSpecialistId(e.target.value)}
                  className="bg-amber-950/60 hover:bg-amber-900/80 text-amber-100 border border-amber-400/30 rounded-md px-1.5 py-0.5 text-xs font-bold focus:outline-hidden cursor-pointer max-w-[140px] truncate transition-colors"
                >
                  <option value="" className="bg-slate-900 text-white">System Admin</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                      {emp.name} ({emp.role.split(" ")[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Active Google User Identity Profile display */}
          <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all shadow-xs ${currentHeaderStyle.pillClass}`}>
            {activeUser.photoURL ? (
              <img 
                src={activeUser.photoURL} 
                alt={activeUser.displayName} 
                className="w-7 h-7 rounded-full border border-emerald-500/50 object-cover shrink-0" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="p-1 bg-emerald-600 text-white rounded-md shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="text-left block mr-0.5">
              <div className="flex items-center gap-1 leading-none mb-0.5">
                <span className="text-[9px] opacity-70 font-black uppercase tracking-widest">SESSION</span>
                {isSuperAdmin && (
                  <span className="px-1 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[8px] font-extrabold rounded uppercase tracking-wider">ADMIN</span>
                )}
              </div>
              <p className="text-xs font-extrabold leading-none truncate max-w-[125px]" title={activeUser.email}>
                {activeUser.displayName}
              </p>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out of system portal"
              className="p-1.5 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 rounded-lg border border-transparent hover:border-rose-400/30 transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Header Background Color Palette Selector */}
          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentHeaderStyle.pillClass}`}>
            <Palette className={`w-4 h-4 ${currentHeaderStyle.accentClass} shrink-0`} />
            <span className="text-[10px] font-black uppercase opacity-70 font-mono tracking-wider">Header:</span>
            <select
              id="header-bg-color-select"
              value={headerBgStyle}
              onChange={(e) => setHeaderBgStyle(e.target.value)}
              className={`bg-transparent border-none text-xs font-extrabold focus:outline-hidden p-0 cursor-pointer ${currentHeaderStyle.textClass}`}
            >
              {Object.entries(HEADER_BG_STYLES).map(([key, style]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">
                  {style.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timestamp clock */}
          <div className={`hidden sm:flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-xl border ${currentHeaderStyle.pillClass}`}>
            <Clock className={`w-4 h-4 ${currentHeaderStyle.accentClass} animate-pulse shrink-0`} />
            <span className="font-bold">
              {currentTime.toLocaleDateString("en-CA")} {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* Single Wave Bottom Edge SVG Divider */}
      <div className="w-full overflow-hidden leading-none pointer-events-none -mt-0.5 z-20">
        <svg
          viewBox="0 0 1440 50"
          preserveAspectRatio="none"
          className={`block w-full h-6 md:h-10 ${currentHeaderStyle.fillClass} transition-colors duration-300 drop-shadow-xs`}
        >
          <path d="M 0,0 C 360,55 1080,-15 1440,30 L 1440,0 L 0,0 Z" />
        </svg>
      </div>
    </div>

      {/* Persistent System-Wide Impersonation Banner for Super-Admins */}
      {isSuperAdmin && activeSpecialistId && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between font-bold text-xs shadow-md border-b border-amber-600 relative z-40 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
            </span>
            <span>
              ⚠️ SYSTEM IMPERSONATION ACTIVE: You have jumped to employee account <strong className="underline">{employees.find(e => e.id === activeSpecialistId)?.name || "Unknown"}</strong> ({employees.find(e => e.id === activeSpecialistId)?.role || "Unknown"}) without requiring permission.
            </span>
          </div>
          <button
            onClick={() => setActiveSpecialistId("")}
            className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-extrabold uppercase rounded-lg tracking-wider transition-all cursor-pointer"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* Main Body Layout with Sidebar + Scrollable Content */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-60px)]">

        {/* Clean Plain Left Sidebar Navigation */}
        <aside className="hidden md:flex w-72 bg-slate-900 text-slate-300 flex-col justify-between shrink-0 shadow-md overflow-hidden z-20 border-r border-slate-800 relative group/sidebar">
          <div className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">FACILITY DEPARTMENTS</p>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
 
            {/* Navigation Menu (Filtered by feature toggles with Framer Motion slide pills) */}
            <nav className="space-y-1.5 relative">
              {navItems
                .filter((item) => item.enabled)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isAllowed = checkTabPermission(item.id).allowed;
                  return (
                    <motion.button
                      key={item.id}
                      id={`sidebar-nav-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                        isActive
                          ? "text-white font-bold"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      } ${!isAllowed ? "opacity-70" : ""}`}
                    >
                      {/* Animated sliding active background pill */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSideNavPill"
                          className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.4)] border border-emerald-400/30"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}

                      {/* Active neon strip indicator on left edge */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSideNavStrip"
                          className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-300 rounded-r-full shadow-[0_0_12px_#34d399]"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}

                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`p-1 rounded-lg transition-transform duration-200 ${isActive ? "scale-105" : "group-hover:scale-110 group-hover:rotate-3"}`}>
                          <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" : "text-slate-400 group-hover:text-emerald-300"}`} />
                        </div>
                        <span className={!isAllowed ? "text-slate-400 group-hover:text-slate-200" : ""}>{item.label}</span>
                      </div>

                      <div className="relative z-10 flex items-center gap-1.5">
                        {!isAllowed && (
                          <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        {isActive && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-1.5 h-1.5 rounded-full bg-emerald-200 shadow-[0_0_6px_#fff]"
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
            </nav>
          </div>
 
          {/* Seeding Status Notification */}
          {(seeding || seedSuccess) && (
            <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400 bg-slate-950/25 space-y-1 relative z-10">
              {seeding && (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Seeding default records...</span>
                </div>
              )}
              {seedSuccess && (
                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Initial Clinical Catalog Seeding Complete!
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Mobile Bottom Navigation Bar - with motion active tab indicator */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-gray-150 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] z-50 flex md:hidden items-center justify-start gap-1 overflow-x-auto scrollbar-none px-4">
          {navItems
            .filter((item) => item.enabled)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isAllowed = checkTabPermission(item.id).allowed;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center justify-center min-w-[68px] h-full transition-all shrink-0 relative ${
                    isActive ? "text-emerald-600 font-extrabold" : "text-gray-400 font-semibold"
                  } ${!isAllowed ? "opacity-70" : ""}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeMobileNavLine"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-1 bg-emerald-600 rounded-b-md shadow-[0_2px_8px_rgba(16,185,129,0.5)]"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <div className="relative">
                    <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? "text-emerald-600 scale-110" : "text-gray-400 group-hover:text-emerald-600"}`} />
                    {!isAllowed && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 rounded-full p-0.5 shadow-xs flex items-center justify-center">
                        <Lock className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] tracking-wider leading-none">{item.label.split(" ")[0]}</span>
                </motion.button>
              );
            })}
        </nav>

        {/* Main Content Area - adjusted padding for bottom mobile nav spacing */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto w-full">
          {/* Active Workspace renderer with animated entrance/exit transitions */}
          <div className="max-w-7xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 16, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.99 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-full space-y-6"
              >
                {!checkTabPermission(activeTab).allowed ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden text-white">
                    {/* Amber caution light flare */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="flex flex-col items-center max-w-lg mx-auto space-y-4">
                      <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl animate-pulse">
                        <ShieldAlert className="w-12 h-12" />
                      </div>
                      
                      <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Access Restricted</h3>
                      <p className="text-sm font-bold font-mono text-amber-400 tracking-wider uppercase">Security Clearance Required</p>
                      
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 border border-slate-800 rounded-xl">
                        {checkTabPermission(activeTab).reason}
                      </p>

                      <div className="pt-2 flex flex-col gap-2.5 w-full text-left text-xs bg-slate-950/30 rounded-xl p-4 border border-slate-800/50">
                        <div className="flex justify-between items-center py-1 border-b border-slate-800">
                          <span className="text-slate-400">Target Workspace:</span>
                          <strong className="text-slate-200 capitalize font-mono text-[11px]">
                            {navItems.find(n => n.id === activeTab)?.label}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-800">
                          <span className="text-slate-400">Authenticated Session:</span>
                          <span className="text-slate-200 font-bold">{activeUser?.email}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-800">
                          <span className="text-slate-400">Staff Record Status:</span>
                          {loggedInEmployee ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold">
                              Active Employee
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-[10px] font-bold">
                              Guest / Unregistered
                            </span>
                          )}
                        </div>
                        {loggedInEmployee && (
                          <>
                            <div className="flex justify-between items-center py-1 border-b border-slate-800">
                              <span className="text-slate-400">Assigned Department:</span>
                              <strong className="text-slate-200 uppercase font-mono text-[11px]">{loggedInEmployee.department}</strong>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-400">Current Role Profile:</span>
                              <strong className="text-slate-200">{loggedInEmployee.role}</strong>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pt-4 flex flex-wrap gap-3 justify-center">
                        <button
                          onClick={() => setActiveTab("journey")}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg hover:-translate-y-0.5"
                        >
                          View Patient Journey
                        </button>
                        <button
                          onClick={() => setActiveTab("queue")}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-950/40 hover:-translate-y-0.5"
                        >
                          View Live Queue Board
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeTab === "dashboard" && (
                      <DashboardOverview
                        tenant={tenant}
                        toggles={toggles}
                        onNavigateToTab={(tabId) => setActiveTab(tabId)}
                      />
                    )}

                    {activeTab === "admin" && (
                      <AdminPanel
                        tenant={tenant}
                        onTenantChange={setTenant}
                        toggles={toggles}
                        onToggleChange={setToggles}
                      />
                    )}

                    {activeTab === "reception" && toggles.reception && (
                      <ReceptionKiosk onTicketCreated={() => setActiveTab("queue")} />
                    )}

                    {activeTab === "tickets" && (
                      <TicketSystem />
                    )}

                    {activeTab === "journey" && (
                      <PatientJourneyTracker />
                    )}

                    {activeTab === "queue" && toggles.queue && (
                      <QueueDashboard toggles={toggles} />
                    )}

                    {activeTab === "doctor" && toggles.doctor && (
                      <DoctorsDesk toggles={toggles} onRefreshQueue={() => setActiveTab("queue")} activeSpecialistId={activeSpecialistId} />
                    )}

                    {activeTab === "diagnostics" && (toggles.laboratory || toggles.radiology) && (
                      <AncillaryLabs toggles={toggles} onActionCompleted={() => setActiveTab("queue")} />
                    )}

                    {activeTab === "pharmacy" && toggles.pharmacy && (
                      <SmartPharmacy toggles={toggles} onDispenseCompleted={() => setActiveTab("billing")} />
                    )}

                    {activeTab === "billing" && toggles.billing && (
                      <PaperlessBilling toggles={toggles} onPaymentReconciled={() => setActiveTab("finance")} />
                    )}

                    {activeTab === "finance" && (
                      <FinanceDashboard />
                    )}

                    {activeTab === "procurement" && (
                      <Procurement />
                    )}

                    {activeTab === "hr" && (
                      <HumanResources />
                    )}

                    {activeTab === "payroll" && (
                      <Payroll />
                    )}

                    {activeTab === "security" && (
                      <SecurityDesk />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Desktop Footer */}
            <footer className="mt-12 pt-6 pb-4 border-t border-slate-200/80 text-slate-500 text-xs hidden md:flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>AfyaCare Enterprise HMS</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 text-[11px] font-medium">SHA Portal API v4.2 • KRA eTIMS v2.0 Live Sync</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1 text-slate-600 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> 256-Bit SSL Encrypted
                </span>
                <span className="text-slate-300">•</span>
                <span>County Healthcare System</span>
                <span className="text-slate-300">•</span>
                <span>© {new Date().getFullYear()} AfyaCare Intelligence Systems</span>
              </div>
            </footer>
          </div>
        </main>
    </div>

    {/* Floating Specialist Notification Drawer */}
    {notifications.length > 0 && (
      <div id="specialist-notifications-tray" className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 max-w-sm w-full pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 pointer-events-auto animate-fade-in relative overflow-hidden text-white"
          >
            {/* Decorative side color block indicating high priority ticket */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
            
            <div className="flex items-start justify-between pl-2">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 animate-pulse">
                  <BellRing className="w-4.5 h-4.5 text-emerald-400" />
                </span>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">INSTANT DISPATCHED TICKET</h4>
                  <p className="text-xs font-bold font-mono text-emerald-400">{notif.ticketNo}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Patient and Issue Details */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs space-y-2 pl-3.5">
              <div className="flex justify-between text-slate-300">
                <span className="font-semibold text-white">Patient:</span>
                <span className="font-bold">{notif.patientName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500">National ID</span>
                  <span className="font-mono text-slate-200">{notif.nationalId}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Age & Phone</span>
                  <span className="text-slate-200">{notif.age} Yrs • {notif.phone}</span>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-2 mt-1">
                <span className="block text-[9px] uppercase font-bold text-slate-500">Chief Concern / Medical Issue</span>
                <p className="text-slate-200 text-[11px] leading-relaxed italic">
                  "{notif.issue}"
                </p>
              </div>
              <div className="border-t border-slate-800 pt-1.5 text-[10px] text-emerald-400">
                <span className="font-semibold text-slate-400">Assigned Specialist:</span> {notif.assignedSpecialistName}
              </div>
            </div>

            {/* Accept & Serve Quick Button */}
            <div className="flex gap-2 w-full justify-end pl-2">
              <button
                onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
                className="px-3 py-1 bg-transparent hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleAcceptTicket(notif.id)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept & Serve</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
  );
}

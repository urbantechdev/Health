import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, googleProvider } from "./lib/firebase";
import { collection, getDocs, setDoc, doc, addDoc, onSnapshot, updateDoc, disableNetwork, enableNetwork } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from "firebase/auth";
import { Tenant, DepartmentToggles, Employee } from "./types";
import { SYSTEM_ROLES_DIRECTORY, SystemRole, getRoleConfig } from "./constants/roles";
import AdminPanel from "./components/AdminPanel";
import ReceptionKiosk from "./components/ReceptionKiosk";
import NurseTriageStation from "./components/NurseTriageStation";
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
import DesktopBottomNav from "./components/DesktopBottomNav";
import MpesaPaymentModal from "./components/MpesaPaymentModal";
import ShaIntegrationHubModal from "./components/ShaIntegrationHubModal";
import LogoUploadModal from "./components/LogoUploadModal";
import UserProfileModal from "./components/UserProfileModal";
import InternalChatModal from "./components/InternalChatModal";
import IncomingMessagePromptListener from "./components/IncomingMessagePromptListener";
import PatientTransferModal from "./components/PatientTransferModal";
import TransfersHub from "./components/TransfersHub";
import AdmissionDischargeManager from "./components/AdmissionDischargeManager";
import KenyanHospitalFormsModal, { KenyanFormType } from "./components/KenyanHospitalFormsModal";
import PatientHistoryLookupModal from "./components/PatientHistoryLookupModal";
import RolePortalLogin from "./components/RolePortalLogin";
import SystemPolicyTermsModal from "./components/SystemPolicyTermsModal";
import { GoogleAuthModal } from "./components/GoogleAuthModal";
import { ModernPromptHost } from "./components/ModernPromptHost";
import UserGuide from "./components/UserGuide";
import { bootstrapCloudFirestore, ensureSuperAdminsExist } from "./lib/dbInit";
import { SUPER_ADMIN_EMAILS, isSuperAdminEmail } from "./lib/superAdmins";
import { toast } from "./lib/promptService";
import { downloadReadmeFile } from "./lib/downloadReadme";

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
  DollarSign,
  Menu,
  LayoutGrid,
  ChevronRight,
  MessageSquare,
  ArrowRightLeft,
  Inbox,
  Hospital,
  FileCheck,
  Bed,
  History,
  HeartPulse,
  BookOpen,
  FileDown,
  Download,
  BookMarked
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
  "plain-yellow": {
    name: "Plain Yellow (Hero)",
    bgClass: "bg-yellow-400",
    fillClass: "fill-yellow-400",
    textClass: "text-slate-950",
    borderClass: "border-yellow-400",
    pillClass: "bg-yellow-500/80 text-slate-950 border-yellow-600/40 shadow-xs font-bold",
    btnClass: "bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold border border-yellow-600/40 shadow-xs",
    accentClass: "text-slate-950",
    titleClass: "text-slate-950 font-black",
  },
  "gold-yellow": {
    name: "Plain Yellow (Hero)",
    bgClass: "bg-yellow-400",
    fillClass: "fill-yellow-400",
    textClass: "text-slate-950",
    borderClass: "border-yellow-400",
    pillClass: "bg-yellow-500/80 text-slate-950 border-yellow-600/40 shadow-xs font-bold",
    btnClass: "bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold border border-yellow-600/40 shadow-xs",
    accentClass: "text-slate-950",
    titleClass: "text-slate-950 font-black",
  },
  "solid-pink": {
    name: "Plain Yellow (Hero)",
    bgClass: "bg-yellow-400",
    fillClass: "fill-yellow-400",
    textClass: "text-slate-950",
    borderClass: "border-yellow-400",
    pillClass: "bg-yellow-500/80 text-slate-950 border-yellow-600/40 shadow-xs font-bold",
    btnClass: "bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold border border-yellow-600/40 shadow-xs",
    accentClass: "text-slate-950",
    titleClass: "text-slate-950 font-black",
  },
  "sunset-orange": {
    name: "Sunset Orange & Green",
    bgClass: "bg-gradient-to-r from-orange-950 via-amber-950 to-orange-900",
    fillClass: "fill-orange-950",
    textClass: "text-orange-100",
    borderClass: "border-orange-800",
    pillClass: "bg-emerald-950/70 backdrop-blur-md text-emerald-100 border-emerald-600/60 shadow-xs",
    btnClass: "bg-emerald-800/80 hover:bg-emerald-700 text-emerald-50 border border-emerald-500/80 shadow-xs hover:border-emerald-400",
    accentClass: "text-emerald-400",
    titleClass: "text-white",
  },
  "dark-slate": {
    name: "Deep Slate & Green",
    bgClass: "bg-slate-900",
    fillClass: "fill-slate-900",
    textClass: "text-slate-100",
    borderClass: "border-slate-800",
    pillClass: "bg-slate-800/90 backdrop-blur-md text-slate-100 border-emerald-500/40 shadow-xs",
    btnClass: "bg-emerald-700/80 hover:bg-emerald-600 text-slate-100 border border-emerald-500/60 shadow-xs",
    accentClass: "text-emerald-400",
    titleClass: "text-white",
  },
  "emerald-dark": {
    name: "Medical Emerald",
    bgClass: "bg-emerald-950",
    fillClass: "fill-emerald-950",
    textClass: "text-emerald-100",
    borderClass: "border-emerald-900",
    pillClass: "bg-emerald-900/80 backdrop-blur-md text-emerald-100 border-emerald-500/40 shadow-xs",
    btnClass: "bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-500/60 shadow-xs",
    accentClass: "text-emerald-400",
    titleClass: "text-white",
  },
  "navy-dark": {
    name: "Executive Navy & Green",
    bgClass: "bg-indigo-950",
    fillClass: "fill-indigo-950",
    textClass: "text-indigo-100",
    borderClass: "border-indigo-900",
    pillClass: "bg-indigo-900/80 backdrop-blur-md text-indigo-100 border-emerald-500/40 shadow-xs",
    btnClass: "bg-emerald-800/80 hover:bg-emerald-700 text-indigo-100 border border-emerald-500/60 shadow-xs",
    accentClass: "text-emerald-400",
    titleClass: "text-white",
  },
  "midnight": {
    name: "Midnight Charcoal & Green",
    bgClass: "bg-zinc-950",
    fillClass: "fill-zinc-950",
    textClass: "text-zinc-100",
    borderClass: "border-zinc-800",
    pillClass: "bg-zinc-900/90 backdrop-blur-md text-zinc-100 border-emerald-500/40 shadow-xs",
    btnClass: "bg-emerald-800/80 hover:bg-emerald-700 text-zinc-100 border border-emerald-500/60 shadow-xs",
    accentClass: "text-emerald-400",
    titleClass: "text-white",
  },
  "teal-dark": {
    name: "Ocean Teal & Green",
    bgClass: "bg-teal-950",
    fillClass: "fill-teal-950",
    textClass: "text-teal-100",
    borderClass: "border-teal-900",
    pillClass: "bg-teal-900/80 backdrop-blur-md text-teal-100 border-emerald-500/40 shadow-xs",
    btnClass: "bg-emerald-800/80 hover:bg-emerald-700 text-teal-100 border border-emerald-500/60 shadow-xs",
    accentClass: "text-emerald-400",
    titleClass: "text-white",
  },
  "royal-purple": {
    name: "Royal Violet & Green",
    bgClass: "bg-purple-950",
    fillClass: "fill-purple-950",
    textClass: "text-purple-100",
    borderClass: "border-purple-900",
    pillClass: "bg-purple-900/80 backdrop-blur-md text-purple-100 border-emerald-500/40 shadow-xs",
    btnClass: "bg-emerald-800/80 hover:bg-emerald-700 text-purple-100 border border-emerald-500/60 shadow-xs",
    accentClass: "text-emerald-400",
    titleClass: "text-white",
  },
  "subtle-light": {
    name: "Crisp Light & Green",
    bgClass: "bg-white",
    fillClass: "fill-white",
    textClass: "text-slate-800",
    borderClass: "border-gray-200",
    pillClass: "bg-emerald-50/90 backdrop-blur-md text-emerald-950 border-emerald-300 shadow-xs",
    btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-2xs",
    accentClass: "text-emerald-600",
    titleClass: "text-slate-900",
  },
};

export default function App() {
  const [tenant, setTenant] = useState<Tenant>({
    id: "tenant-9943",
    name: "HMIS",
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

  // Authentication & Session States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<{ email: string; displayName: string; isSimulated?: boolean; photoURL?: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Specialist Staff & Live Notification States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeSpecialistId, setActiveSpecialistId] = useState<string>("");
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [platformFontSize, setPlatformFontSize] = useState<"sm" | "base" | "lg" | "xl" | "2xl" | "3xl">(() => {
    const saved = localStorage.getItem("platform_font_size");
    return (saved as any) || "base";
  });

  // Dynamic branding state values
  const DEFAULT_BRAND_LOGO = "https://i.pinimg.com/1200x/0d/21/0a/0d210ae7221bc218df223d59b16d2198.jpg";
  const [headerBgStyle, setHeaderBgStyle] = useState<string>(() => localStorage.getItem("platform_header_bg") || "gold-yellow");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>(() => localStorage.getItem("platform_logo_url") || DEFAULT_BRAND_LOGO);
  const [brandFaviconUrl, setBrandFaviconUrl] = useState<string>(() => localStorage.getItem("platform_favicon_url") || "");
  const [brandCustomName, setBrandCustomName] = useState<string>(() => localStorage.getItem("platform_custom_brand_name") || "");
  const [brandFontId, setBrandFontId] = useState<string>(() => localStorage.getItem("platform_font_id") || "Plus Jakarta Sans");
  const [brandThemeColor, setBrandThemeColor] = useState<string>(() => localStorage.getItem("platform_theme_color") || "emerald");
  const [brandBlockEdgeColor, setBrandBlockEdgeColor] = useState<string>(() => localStorage.getItem("platform_block_edge_color") || "#eab308");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Global M-Pesa, SHA & Logo Modal states
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState<boolean>(false);
  const [showLogoModal, setShowLogoModal] = useState<boolean>(false);
  const [showMpesaModal, setShowMpesaModal] = useState<boolean>(false);
  const [mpesaModalData, setMpesaModalData] = useState<{
    defaultPhone?: string;
    defaultAmount?: number;
    defaultReference?: string;
    patientName?: string;
    invoiceId?: string;
  }>({});

  const [showShaModal, setShowShaModal] = useState<boolean>(false);
  const [shaModalData, setShaModalData] = useState<{
    defaultNationalId?: string;
    defaultPatientName?: string;
  }>({});

  const [showGlobalHistoryModal, setShowGlobalHistoryModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showPolicyTermsModal, setShowPolicyTermsModal] = useState<boolean>(false);
  const [policyTermsDefaultTab, setPolicyTermsDefaultTab] = useState<"terms" | "privacy" | "infosec" | "governance" | "signoff">("privacy");
  const [profileOverride, setProfileOverride] = useState<{
    displayName?: string;
    photoURL?: string;
    email?: string;
  }>(() => {
    const savedPhoto = localStorage.getItem("user_profile_avatar");
    const savedName = localStorage.getItem("user_profile_name");
    return {
      photoURL: savedPhoto || undefined,
      displayName: savedName || undefined,
    };
  });

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

    // Calculate and set Block Right Edge Single Faded/Silent Color & Glow
    if (brandBlockEdgeColor === "transparent") {
      root.style.setProperty("--block-edge-width", "0px");
      root.style.setProperty("--block-edge-gradient", "transparent");
      root.style.setProperty("--block-edge-opacity", "0");
      root.style.setProperty("--block-edge-hover-opacity", "0");
    } else {
      root.style.setProperty("--block-edge-width", "3px");
      root.style.setProperty("--block-edge-opacity", "0.3");
      root.style.setProperty("--block-edge-hover-opacity", "0.5");
      if (brandBlockEdgeColor === "yellow-blue-green" || brandBlockEdgeColor === "yellow-blue-green-diag" || brandBlockEdgeColor === "yellow-blue-green-soft" || brandBlockEdgeColor === "yellow" || brandBlockEdgeColor === "#eab308" || !brandBlockEdgeColor) {
        root.style.setProperty("--block-edge-gradient", "#eab308");
      } else if (brandBlockEdgeColor === "theme") {
        const themeHex = palette ? palette.colors["600"] : "#eab308";
        root.style.setProperty("--block-edge-gradient", themeHex);
      } else {
        root.style.setProperty("--block-edge-gradient", brandBlockEdgeColor);
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
      document.title = "HMS";
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

  // Auto-fit screen resolution detection: ensures original platform design auto-fits any monitor/laptop screen (unless mobile/tablet)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isNarrow = window.innerWidth < 1024;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 1;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      navigator.userAgent.toLowerCase()
    );
    return isNarrow || (isTouch && isMobileUA && window.innerWidth < 1024);
  });

  const [screenResolution, setScreenResolution] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1440,
    height: typeof window !== "undefined" ? window.innerHeight : 900
  });

  useEffect(() => {
    const handleScreenResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScreenResolution({ width: w, height: h });
      const isNarrow = w < 1024;
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 1;
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent.toLowerCase()
      );
      setIsMobileOrTablet(isNarrow || (isTouch && isMobileUA && w < 1024));
    };

    window.addEventListener("resize", handleScreenResize);
    window.addEventListener("orientationchange", handleScreenResize);
    return () => {
      window.removeEventListener("resize", handleScreenResize);
      window.removeEventListener("orientationchange", handleScreenResize);
    };
  }, []);

  // Auto full screen the platform on launch and user interaction without requiring a manual toggle
  useEffect(() => {
    const triggerFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          // Ignored if browser policy blocks programmatic fullscreen before interaction
        });
      }
    };

    // Attempt direct request on load
    triggerFullscreen();

    // Attach one-shot event listeners for early interaction auto-fullscreen trigger
    const onUserInteraction = () => {
      triggerFullscreen();
    };

    window.addEventListener("click", onUserInteraction, { once: true });
    window.addEventListener("keydown", onUserInteraction, { once: true });
    window.addEventListener("touchstart", onUserInteraction, { once: true });

    return () => {
      window.removeEventListener("click", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
    };
  }, []);

  // Bootstrap Cloud Firestore independent database collections
  useEffect(() => {
    bootstrapCloudFirestore().catch((err) => {
      console.warn("Cloud Firestore initial check:", err);
    });
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
      if (firebaseUser && firebaseUser.email) {
        const cleanEmail = firebaseUser.email.toLowerCase().trim();
        const isMasterAdmin = isSuperAdminEmail(cleanEmail);
        const isRegistered = employees.some(
          (emp) => emp.email?.toLowerCase().trim() === cleanEmail && emp.status !== "terminated"
        );

        if (isMasterAdmin || isRegistered || employees.length === 0) {
          setUser(firebaseUser);
          setAuthError(null);
        } else {
          // Strictly reject unauthorized Google users
          setUser(null);
          setAuthError(
            `Access Denied: Google Account '${firebaseUser.email}' is not registered in the hospital staff directory. Please contact the Super Admin (moraasdorcah@gmail.com, urbaninteriorkenya@gmail.com, or naisiaetext@gmail.com) to onboard you and generate your credentials.`
          );
          signOut(auth).catch(() => {});
        }
      } else {
        setUser(firebaseUser);
      }
    });
    return () => unsubscribeAuth();
  }, [employees]);

  const activeUser = user 
    ? { 
        email: profileOverride.email || user.email || "", 
        displayName: profileOverride.displayName || user.displayName || "Google User", 
        isSimulated: false, 
        photoURL: profileOverride.photoURL || user.photoURL || undefined 
      } 
    : (simulatedUser 
        ? {
            ...simulatedUser,
            displayName: profileOverride.displayName || simulatedUser.displayName,
            email: profileOverride.email || simulatedUser.email,
            photoURL: profileOverride.photoURL || simulatedUser.photoURL || undefined
          }
        : null);

  // Find employee matching logged-in user email
  const loggedInEmployee = employees.find(
    (emp) => emp.email?.toLowerCase().trim() === activeUser?.email?.toLowerCase().trim()
  );

  // If logged in employee has photo and activeUser doesn't have custom override, display employee's avatar
  const resolvedPhotoURL = activeUser?.photoURL || loggedInEmployee?.photoURL || loggedInEmployee?.avatarUrl;

  const handleUpdateUserProfile = (updatedData: {
    displayName: string;
    email: string;
    photoURL?: string;
    phone?: string;
    nationalId?: string;
    specialty?: string;
    systemRole?: SystemRole;
    department?: string;
  }) => {
    setProfileOverride({
      displayName: updatedData.displayName,
      email: updatedData.email,
      photoURL: updatedData.photoURL,
    });
    if (updatedData.photoURL) {
      localStorage.setItem("user_profile_avatar", updatedData.photoURL);
    } else {
      localStorage.removeItem("user_profile_avatar");
    }
    if (updatedData.displayName) {
      localStorage.setItem("user_profile_name", updatedData.displayName);
    }
    if (simulatedUser) {
      setSimulatedUser((prev) =>
        prev
          ? {
              ...prev,
              displayName: updatedData.displayName,
              email: updatedData.email,
              photoURL: updatedData.photoURL || prev.photoURL,
            }
          : null
      );
    }
    // Update local employees cache
    setEmployees((prev) =>
      prev.map((emp) => {
        if (
          emp.email?.toLowerCase().trim() === updatedData.email.toLowerCase().trim() ||
          emp.id === loggedInEmployee?.id
        ) {
          return {
            ...emp,
            name: updatedData.displayName,
            email: updatedData.email,
            phone: updatedData.phone || emp.phone,
            nationalId: updatedData.nationalId || emp.nationalId,
            specialty: updatedData.specialty || emp.specialty,
            photoURL: updatedData.photoURL,
            avatarUrl: updatedData.photoURL,
            department: updatedData.department || emp.department,
            systemRole: updatedData.systemRole || emp.systemRole,
            role: updatedData.systemRole || emp.role,
          };
        }
        return emp;
      })
    );
  };

  // Dynamic Super Admin check:
  // Strictly requires the active user's or logged-in employee's email to be in SUPER_ADMIN_EMAILS (moraasdorcah@gmail.com, urbaninteriorkenya@gmail.com, naisiaetext@gmail.com)
  const isSuperAdmin = Boolean(
    isSuperAdminEmail(activeUser?.email) ||
    isSuperAdminEmail(loggedInEmployee?.email)
  );

  // Determine active identity for role checks
  const activeStaffRecord = activeSpecialistId
    ? employees.find(emp => emp.id === activeSpecialistId)
    : loggedInEmployee;

  // Resolve current active SystemRole strictly based on registered staff record created in DB
  const currentSystemRole: SystemRole = (activeStaffRecord?.role as SystemRole) || 
    (isSuperAdmin ? "Super Admin" : "Reception");

  const activeRoleConfig = getRoleConfig(currentSystemRole);
  const activeRoleName = activeRoleConfig.title || currentSystemRole;
  const activeDepartmentName = activeRoleConfig.department;

  const [loginEmailInput, setLoginEmailInput] = useState("");

  const handleStaffEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = loginEmailInput.trim().toLowerCase();
    if (!cleanEmail) return;

    // Check if user is registered in employees collection
    const matched = employees.find(
      (emp) => emp.email?.trim().toLowerCase() === cleanEmail
    );

    if (matched) {
      setSimulatedUser({
        email: matched.email,
        displayName: matched.name,
        isSimulated: true,
        photoURL: matched.photoURL || matched.avatarUrl || "https://lh3.googleusercontent.com/a/default-user=s96-c"
      });
    } else if (isSuperAdminEmail(cleanEmail)) {
      setSimulatedUser({
        email: cleanEmail,
        displayName: "Super Admin Sovereign",
        isSimulated: true,
        photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c"
      });
    } else {
      setAuthError(
        `Access Denied: Email '${cleanEmail}' is not registered in the System User Registry. Please ask HR or the Super Admin to create your user account and assign your system role.`
      );
    }
  };

  const checkTabPermission = (tabId: string): { allowed: boolean; reason?: string } => {
    // Admin module strictly requires one of the listed Super Admin Gmail accounts
    if (tabId === "admin") {
      if (!isSuperAdmin) {
        return {
          allowed: false,
          reason: `Access Denied: Only authorized Super Admin Gmail accounts (${SUPER_ADMIN_EMAILS.join(", ")}) are permitted to access the Admin & Developer console.`
        };
      }
      return { allowed: true };
    }

    // Super Admin has master unrestricted access across all modules
    if (isSuperAdmin) {
      return { allowed: true };
    }

    // Unregistered guest users can only access public overview
    if (!loggedInEmployee && !simulatedUser) {
      return {
        allowed: false,
        reason: "Your session is not registered in the System User Registry. Please ask the Super Admin to create your account and assign your system role."
      };
    }

    // Global dashboard overview and platform user guide are accessible to all logged-in roles
    if (tabId === "dashboard" || tabId === "guide") {
      return { allowed: true };
    }

    // Strict Need-to-Know RBAC Verification against role's allowedModules
    const isAllowed = activeRoleConfig.allowedModules.includes(tabId);
    if (isAllowed) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Strict Need-to-Know Access Restriction: User role '${currentSystemRole}' (${activeRoleConfig.department}) is only permitted to access: ${activeRoleConfig.allowedModules.map((m) => m.toUpperCase()).join(", ")}. Access to '${tabId}' requires authorization.`
    };
  };

  // Desktop Keyboard Shortcuts: Alt+1 to Alt+9 for rapid module switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const keyMap: Record<string, string> = {
          "1": "dashboard",
          "2": "reception",
          "3": "doctor",
          "4": "diagnostics",
          "5": "pharmacy",
          "6": "billing",
          "7": "finance",
          "8": "admin",
          "9": "guide",
          "g": "guide",
          "G": "guide",
          "j": "journey",
          "J": "journey",
          "k": "tickets",
          "K": "tickets",
          "q": "queue",
          "Q": "queue",
        };
        const targetTab = keyMap[e.key];
        if (targetTab && checkTabPermission(targetTab).allowed) {
          e.preventDefault();
          setActiveTab(targetTab);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSystemRole, employees, simulatedUser]);

  const handleGoogleLogin = () => {
    setAuthError(null);
    setShowGoogleAuthModal(true);
  };

  const handleAttemptRealGooglePopup = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Logged in via Google:", result.user);
    } catch (err: any) {
      const errorCode = err?.code || "";
      const errorMsg = err?.message || "";

      if (errorCode === "auth/unauthorized-domain" || errorMsg.includes("unauthorized-domain")) {
        const host = window.location.hostname;
        console.info(`Domain ${host} is unauthorized in Firebase Auth. Activating default Super Admin workspace mode.`);
        setSimulatedUser({
          email: "moraasdorcah@gmail.com",
          displayName: "Dorcah Moraa (Super Admin Sovereign)",
          isSimulated: true,
          photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c"
        });
        setAuthError(
          `Domain Authorization Note: Domain (${host}) is not registered in Firebase Auth Authorized Domains. Logged you in directly via administrative access mode. To enable real Google Sign-In popups, add '${host}' in Firebase Console → Authentication → Settings → Authorized domains.`
        );
        return;
      } else if (errorCode === "auth/popup-blocked") {
        setAuthError(
          "Google Sign-In popup was blocked by your browser settings. Please enable popups or use Station & PIN login below."
        );
      } else if (errorCode === "auth/popup-closed-by-user" || errorCode === "auth/cancelled-popup-request") {
        // User closed the popup, silently handle
        return;
      } else {
        console.warn("Google Sign-In note:", errorCode || errorMsg);
        setAuthError(
          `Google Sign-In encountered an issue (${errorCode || "Unknown"}). Please authenticate using your Department Station and Security PIN.`
        );
      }
    }
  };

  const handleSelectGoogleAccount = (email: string, displayName: string) => {
    setAuthError(null);
    const cleanEmail = email.toLowerCase().trim();
    const matched = employees.find((e) => e.email?.toLowerCase().trim() === cleanEmail);
    setSimulatedUser({
      email: cleanEmail,
      displayName: displayName || matched?.name || "Super Admin",
      isSimulated: true,
      photoURL: matched?.photoURL || matched?.avatarUrl || "https://lh3.googleusercontent.com/a/default-user=s96-c"
    });
  };

  const handleLogout = async () => {
    setAuthError(null);
    setSimulatedUser(null);
    setActiveSpecialistId("");
    setProfileOverride({});
    try {
      await signOut(auth);
    } catch {
      // Ignored if not signed in via Firebase Auth
    }
    setActiveTab("dashboard");
  };

  // Online/Offline & Cloud Firestore Sync Tracking State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Monitor real-world network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      enableNetwork(db).catch(() => {});
      toast.success("Cloud database connection restored.", "Online");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Network connection lost. Offline persistence active.", "Offline Mode");
    };

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

  // Function to refresh database network connection
  const handleRefreshNetwork = async () => {
    try {
      await enableNetwork(db);
      setIsOnline(navigator.onLine);
      toast.info("Database connection synchronized.", "Cloud Sync");
    } catch (err) {
      console.error("Error refreshing network:", err);
    }
  };

  // Fetch active specialists list from database
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps: Employee[] = [];
      const seen = new Set<string>();
      snapshot.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as Employee;
        const key = (data.email || "").toLowerCase().trim() || (data.nationalId || "").trim() || docSnap.id;
        if (!seen.has(key)) {
          seen.add(key);
          emps.push(data);
        }
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
        } else if (dept === "nursing" || dept === "triage") {
          setActiveTab("triage");
        } else if (dept === "reception") {
          setActiveTab("reception");
        }
      }
    }
  }, [activeSpecialistId, employees]);

  // Live Firebase/Firestore onSnapshot Listener for Specialist notifications
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [systemTicketsList, setSystemTicketsList] = useState<any[]>([]);

  // Internal Chat and Patient Transfer Modal States
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTargetRole, setChatTargetRole] = useState<string | undefined>(undefined);
  const [chatPatientContext, setChatPatientContext] = useState<any>(null);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferInitialPatient, setTransferInitialPatient] = useState<any>(null);
  const [transferInitialTicket, setTransferInitialTicket] = useState<any>(null);

  // Kenyan Statutory Hospital Forms Hub Modal States
  const [showKenyanFormsModal, setShowKenyanFormsModal] = useState(false);
  const [kenyanFormsInitialPatient, setKenyanFormsInitialPatient] = useState<any>(null);
  const [kenyanFormsInitialFormType, setKenyanFormsInitialFormType] = useState<KenyanFormType>("sick_sheet");

  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [pendingTransfersCount, setPendingTransfersCount] = useState<number>(0);

  // Real-time listener for internal_messages to calculate unread message count
  useEffect(() => {
    const unsubChat = onSnapshot(collection(db, "internal_messages"), (snapshot) => {
      let unread = 0;
      const userRole = currentSystemRole.toLowerCase();
      const userEmail = activeUser?.email?.toLowerCase() || "";
      const userName = activeUser?.displayName?.toLowerCase() || "";

      snapshot.forEach((doc) => {
        const data = doc.data();
        const readBy = Array.isArray(data.readBy) ? data.readBy : [];
        const isRead = readBy.includes(userEmail) || readBy.includes(userName);
        if (!isRead) {
          const targetType = data.targetType;
          const targetRole = (data.targetRole || "").toLowerCase();
          const targetEmail = (data.targetUserEmail || "").toLowerCase();
          if (
            targetType === "all" ||
            (targetType === "role" && (targetRole === userRole || targetRole === "all" || userRole === "super admin")) ||
            (targetType === "direct" && (targetEmail === userEmail || data.targetUserName === activeUser?.displayName))
          ) {
            unread++;
          }
        }
      });
      setUnreadMessagesCount(unread);
    });
    return () => unsubChat();
  }, [currentSystemRole, activeUser]);

  // Real-time listener for patient_transfers
  useEffect(() => {
    const unsubTransfers = onSnapshot(collection(db, "patient_transfers"), (snapshot) => {
      let pending = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "pending" || data.status === "on_hold") {
          pending++;
        }
      });
      setPendingTransfersCount(pending);
    });
    return () => unsubTransfers();
  }, []);

  // Real-time listener for queue collection to power live notification badges
  useEffect(() => {
    const unsubQueue = onSnapshot(collection(db, "queue"), (snapshot) => {
      const q: any[] = [];
      snapshot.forEach((doc) => {
        q.push({ id: doc.id, ...doc.data() });
      });
      setQueueItems(q);
    });
    return () => unsubQueue();
  }, []);

  // Real-time listener for system_tickets collection to power live notification badges
  useEffect(() => {
    const unsubTickets = onSnapshot(collection(db, "system_tickets"), (snapshot) => {
      const t: any[] = [];
      snapshot.forEach((doc) => {
        t.push({ id: doc.id, ...doc.data() });
      });
      setSystemTicketsList(t);
    });
    return () => unsubTickets();
  }, []);

  // Live badge counts per tab/menu item
  const openTicketsCount = systemTicketsList.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const pendingQueueCount = queueItems.filter((q) => q.status === "pending" || q.status === "serving").length;
  const triageWaitingCount = queueItems.filter((q) => (q.currentDepartment === "triage" || q.currentDepartment === "reception") && q.status === "pending").length;
  const doctorWaitingCount = queueItems.filter((q) => (q.currentDepartment === "doctor" || !q.currentDepartment) && q.status === "pending").length;
  const diagnosticsWaitingCount = queueItems.filter((q) => (q.currentDepartment === "laboratory" || q.currentDepartment === "radiology") && q.status === "pending").length;
  const pharmacyWaitingCount = queueItems.filter((q) => q.currentDepartment === "pharmacy" && q.status === "pending").length;
  const activeJourneysCount = queueItems.filter((q) => q.status !== "completed").length;
  const receptionWaitingCount = queueItems.filter((q) => q.currentDepartment === "reception" && q.status === "pending").length;
  const unverifiedBiometricsCount = queueItems.filter((q) => q.biometricStatus === "not_verified" && q.status === "pending").length;

  const getMenuNotificationCount = (tabId: string): number => {
    switch (tabId) {
      case "tickets":
        return openTicketsCount;
      case "queue":
        return pendingQueueCount;
      case "triage":
        return triageWaitingCount;
      case "doctor":
        return doctorWaitingCount;
      case "transfers":
        return pendingTransfersCount;
      case "diagnostics":
        return diagnosticsWaitingCount;
      case "pharmacy":
        return pharmacyWaitingCount;
      case "journey":
        return activeJourneysCount;
      case "reception":
        return receptionWaitingCount;
      case "security":
        return unverifiedBiometricsCount;
      case "dashboard":
        return notifications.length > 0 ? notifications.length : (openTicketsCount + pendingQueueCount + pendingTransfersCount);
      default:
        return 0;
    }
  };

  const totalSystemActiveNotifications = openTicketsCount + pendingQueueCount + pendingTransfersCount + notifications.length;

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

  // Filter navigation tabs dynamically based on super-admin feature toggles
  // Note: Tickets, Patient Journey, Live Queue, and Pharmacy are hosted on the Desktop Bottom Nav to avoid sidebar congestion
  const navItems = [
    { id: "dashboard", label: "Dashboard Overview", icon: LayoutDashboard, enabled: true },
    { id: "reception", label: "Reception Desk", icon: UserPlus, enabled: toggles.reception },
    { id: "triage", label: "Nurse Triage", icon: HeartPulse, enabled: true },
    { id: "admissions", label: "Admission & Wards", icon: Bed, enabled: true },
    { id: "doctor", label: "Doctor Station", icon: Stethoscope, enabled: toggles.doctor },
    { id: "transfers", label: "Transfers & Referrals", icon: ArrowRightLeft, enabled: true },
    { id: "diagnostics", label: "Lab / Radiology", icon: FlaskRound, enabled: toggles.laboratory || toggles.radiology },
    { id: "billing", label: "Split Billing", icon: CreditCard, enabled: toggles.billing },
    { id: "finance", label: "Finance & Accounts", icon: Landmark, enabled: true },
    { id: "procurement", label: "Procurement & LPO", icon: ShoppingBag, enabled: true },
    { id: "hr", label: "Human Resources", icon: Users, enabled: true },
    { id: "payroll", label: "Payroll & Tax", icon: DollarSign, enabled: true },
    { id: "security", label: "Security Desk", icon: Shield, enabled: true },
    { id: "guide", label: "User Guide & Manual", icon: BookOpen, enabled: true },
    { id: "admin", label: "Developer Settings", icon: Sliders, enabled: true },
  ];

  if (!activeUser) {
    return (
      <>
        <RolePortalLogin
          employees={employees}
          hospitalName={brandCustomName || tenant.name || "AfyaCare Medical Systems"}
          hospitalLogoUrl={brandLogoUrl}
          authError={authError}
          onGoogleLogin={handleGoogleLogin}
          onOpenPolicyTerms={(defaultTab) => {
            setPolicyTermsDefaultTab(defaultTab || "privacy");
            setShowPolicyTermsModal(true);
          }}
          onLoginSuccess={(userProfile, targetTab) => {
            setAuthError(null);
            setSimulatedUser({
              email: userProfile.email,
              displayName: userProfile.displayName,
              isSimulated: true,
              photoURL: userProfile.photoURL || "https://lh3.googleusercontent.com/a/default-user=s96-c"
            });
            if (userProfile.employeeId) {
              setActiveSpecialistId(userProfile.employeeId);
            }
            // Directs to their role dashboard
            setActiveTab(targetTab || "dashboard");
          }}
        />
        <SystemPolicyTermsModal
          isOpen={showPolicyTermsModal}
          onClose={() => setShowPolicyTermsModal(false)}
          currentUserRole="Reception"
          currentUserName="Staff Member"
          defaultTab={policyTermsDefaultTab}
        />
        <GoogleAuthModal
          isOpen={showGoogleAuthModal}
          onClose={() => setShowGoogleAuthModal(false)}
          onSelectAccount={handleSelectGoogleAccount}
          onAttemptRealGooglePopup={handleAttemptRealGooglePopup}
          employees={employees}
        />
      </>
    );
  }

  const currentHeaderStyle = HEADER_BG_STYLES[headerBgStyle] || HEADER_BG_STYLES["gold-yellow"] || HEADER_BG_STYLES["solid-pink"];

  return (
    <div className="h-screen h-[100dvh] w-screen w-[100dvw] overflow-hidden bg-gray-100 flex flex-col text-gray-800 font-sans pb-16 md:pb-0 select-none antialiased">
      {/* End-to-End Top Header Bar with Single Wave Curved Bottom Edge */}
      <div className="relative w-full z-30 shrink-0 shadow-xs overflow-hidden">
        <header className={`relative w-full ${currentHeaderStyle.bgClass} ${currentHeaderStyle.textClass} py-3 sm:py-3.5 md:py-4 lg:py-5 min-h-[76px] sm:min-h-[84px] md:min-h-[96px] lg:min-h-[108px] px-3.5 sm:px-6 md:px-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 transition-colors duration-300 overflow-hidden`}>
          
          {/* Continuous Motion Gentle Shimmer Effect (Identical to Bottom Nav) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Ambient Sweeping Beam */}
            <motion.div
              className="absolute top-0 bottom-0 w-48 md:w-80 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-lg -skew-x-12"
              initial={{ left: "-40%" }}
              animate={{ left: "120%" }}
              transition={{
                repeat: Infinity,
                duration: 6.0,
                ease: "easeInOut",
                repeatDelay: 1.2,
              }}
            />

            {/* Gentle Light Ray Line with Soft Glow */}
            <motion.div
              className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/40 to-transparent -skew-x-12 opacity-60 shadow-[0_0_10px_rgba(255,255,255,0.4)]"
              initial={{ left: "-40%" }}
              animate={{ left: "120%" }}
              transition={{
                repeat: Infinity,
                duration: 6.0,
                ease: "easeInOut",
                repeatDelay: 1.2,
              }}
            >
              {/* Core Bright Light Spark */}
              <div className="absolute top-1/4 bottom-1/4 w-0.5 left-1/2 -translate-x-1/2 bg-white/70 blur-[0.5px]" />
            </motion.div>

            {/* Edge Tracer Line */}
            <motion.div
              className="absolute top-0 w-24 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-[0.5px]"
              initial={{ left: "-40%" }}
              animate={{ left: "120%" }}
              transition={{
                repeat: Infinity,
                duration: 6.0,
                ease: "easeInOut",
                repeatDelay: 1.2,
              }}
            />
          </div>

          {/* Mobile Top Header: Row Layout with Brand Left, Quick Stats & Profile Right */}
          <div className="relative z-10 flex items-center justify-between gap-2.5 w-full md:w-auto">
            {/* Brand and Active Facility */}
            <div
              onClick={() => setShowLogoModal(true)}
              title="Click to upload, change or configure Hospital Logo"
              className="flex items-center gap-3 sm:gap-4 group cursor-pointer min-w-0"
            >
              <div className="relative group/logo shrink-0">
                {/* Main Circular Container Frame (Stable, Round & Big) */}
                <div className="relative p-1 sm:p-1.5 bg-yellow-300 text-white rounded-full shadow-lg border-2 border-yellow-500 ring-2 ring-yellow-400/60 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 group-hover:bg-yellow-200 transition-colors duration-300 overflow-hidden">
                  {brandLogoUrl ? (
                    <img
                      src={brandLogoUrl}
                      alt="HMIS Hospital Logo"
                      className="w-full h-full object-cover rounded-full shadow-inner animate-logo-image-alive transition-transform duration-300 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Building2 className="w-9 h-9 sm:w-12 sm:h-12 text-slate-900 animate-logo-image-alive transition-transform duration-300 group-hover:scale-110" />
                  )}

                  {/* Specular Light Gleam Sweep Passing Directly Across Logo */}
                  <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-10">
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-logo-gleam" />
                  </div>

                  {/* Upload indicator pill on hover */}
                  <div className="absolute bottom-0 right-0 bg-yellow-500 text-white p-1 rounded-full border border-yellow-600 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs z-20">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight ${currentHeaderStyle.titleClass} uppercase leading-none font-sans truncate drop-shadow-xs group-hover:text-slate-800 transition-colors duration-200`}>
                    {brandCustomName || tenant.name}
                  </h1>
                  <span className="hidden sm:inline-flex px-2 py-0.5 bg-yellow-500/80 hover:bg-yellow-500 text-slate-950 border border-yellow-600/40 text-[10px] sm:text-xs font-black rounded-lg uppercase tracking-wider shrink-0 transition-all duration-200 shadow-xs">
                    Tier {tenant.type}
                  </span>
                </div>
                <p className={`text-xs sm:text-sm font-bold truncate hidden sm:block mt-0.5 tracking-wide ${currentHeaderStyle.textClass || "text-slate-800"}`}>
                  Hospital ERP Management System
                </p>
              </div>
            </div>

            {/* Mobile Header Quick Actions: Large Icons with No Background */}
            <div className="md:hidden flex items-center gap-2 shrink-0">
              {/* Mobile Internal Chat Inbox */}
              <button
                id="btn-mobile-internal-chat"
                onClick={() => {
                  setChatTargetRole(undefined);
                  setChatPatientContext(null);
                  setShowChatModal(true);
                }}
                title="Internal Role Chat Inbox"
                className="p-1 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer relative"
              >
                <MessageSquare className="w-5 h-5 text-white" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-rose-500 text-white text-[8px] font-black rounded-full border border-white animate-pulse">
                    {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                  </span>
                )}
              </button>

              {/* Mobile Kenyan Statutory Forms Hub */}
              {(isSuperAdmin || activeRoleConfig.canPerformClinicalActions || ["Doctor", "Nurse", "Reception", "Admin"].includes(currentSystemRole)) && (
                <button
                  id="btn-mobile-kenyan-forms"
                  onClick={() => {
                    setKenyanFormsInitialPatient(null);
                    setShowKenyanFormsModal(true);
                  }}
                  title="Kenyan Hospital Statutory Forms (Sick Off, MOH 268, Discharge Summary, e-Rx)"
                  className="p-1 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer relative"
                >
                  <Hospital className="w-5 h-5 text-white" />
                </button>
              )}

              {/* Mobile Quick Patient Transfer */}
              {checkTabPermission("transfers").allowed && (
                <button
                  id="btn-mobile-quick-transfer"
                  onClick={() => {
                    setTransferInitialPatient(null);
                    setTransferInitialTicket(null);
                    setShowTransferModal(true);
                  }}
                  title="Patient Transfer & Referral"
                  className="p-1 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer relative"
                >
                  <ArrowRightLeft className="w-5 h-5 text-white" />
                  {pendingTransfersCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-amber-500 text-slate-950 text-[8px] font-black rounded-full border border-white animate-pulse">
                      {pendingTransfersCount}
                    </span>
                  )}
                </button>
              )}

              {/* Mobile Platform User Guide Button */}
              <button
                id="btn-mobile-user-guide"
                onClick={() => setActiveTab("guide")}
                title="Platform User Guide & Operational Manual"
                className={`p-1 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer relative ${
                  activeTab === "guide" ? "bg-white/20 rounded-lg" : ""
                }`}
              >
                <BookOpen className="w-5 h-5 text-white" />
              </button>

              {/* Mobile Offline/Online Indicator - Large White Icon (No Background) */}
              <button
                onClick={handleRefreshNetwork}
                title={isOnline ? "Online Mode (Cloud Firestore Connected)" : "Offline Mode (Local Cache Active)"}
                className="p-1 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer"
              >
                {!isOnline ? <WifiOff className="w-5 h-5 text-white" /> : <Wifi className="w-5 h-5 text-white" />}
              </button>

              {/* Mobile Profile & System Menu Button - Large Avatar / Bright Grey Icon (No Background) */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                title={activeUser.displayName || activeUser.email}
                className="p-0.5 text-slate-200 hover:text-white transition-all active:scale-90 cursor-pointer relative group"
              >
                {resolvedPhotoURL ? (
                  <img 
                    src={resolvedPhotoURL} 
                    alt={activeUser.displayName || activeUser.email} 
                    className="w-8 h-8 rounded-xl object-cover border border-slate-200 group-hover:border-white transition-colors" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <User className="w-6 h-6 text-slate-200 hover:text-white" />
                )}
                {!isOnline && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border border-slate-900 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Desktop Top Header Controls - Large White Icons without Background Color */}
          <div className="hidden md:flex flex-wrap items-center gap-3 lg:gap-4 relative z-10">
            {/* Offline/Online Status Indicator & Reconnection - Large White Icon (No Background) */}
            <button
              onClick={handleRefreshNetwork}
              title={isOnline ? "Online Mode (Connected to Cloud Firestore)" : "Offline Mode (Click to sync with Cloud Firestore)"}
              className="relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {!isOnline ? (
                <WifiOff className="w-6 h-6 lg:w-7 lg:h-7 text-white transition-transform duration-200 hover:rotate-12" />
              ) : (
                <Wifi className="w-6 h-6 lg:w-7 lg:h-7 text-white hover:text-white/80 transition-transform duration-200" />
              )}
              
              {/* Online Pulse Indicator Dot */}
              <span className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-600 animate-pulse" : "bg-amber-600"}`}></span>

              {pendingSyncCount > 0 && (
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-yellow-500 text-slate-950 text-[9px] font-mono font-bold rounded-full border border-yellow-600 animate-pulse">
                  {pendingSyncCount}
                </span>
              )}
            </button>

            {/* Admin Specialist / Account Jumper - Large White Icon (No Background) */}
            {isSuperAdmin && (
              <div 
                title={`Admin Account Jumper: ${activeSpecialistId ? employees.find(e => e.id === activeSpecialistId)?.name : "System Admin"}`} 
                className="relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 group cursor-pointer"
              >
                <UserCog className="w-6 h-6 lg:w-7 lg:h-7 text-white group-hover:text-white/80 group-hover:rotate-12 transition-all duration-200 shrink-0" />
                
                {activeSpecialistId && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-yellow-500 text-slate-950 text-[8px] font-black uppercase rounded-md tracking-wider border border-yellow-600 shadow-xs max-w-[60px] truncate">
                    Jumped
                  </span>
                )}

                <select
                  id="admin-specialist-jumper"
                  value={activeSpecialistId}
                  onChange={(e) => setActiveSpecialistId(e.target.value)}
                  aria-label="Admin Account Jumper"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">System Admin (Dr. Sarah Naisiae)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Internal Staff Chat & Role Notification Inbox - Large White Icon (No Background) */}
            <button
              id="btn-header-internal-chat"
              onClick={() => {
                setChatTargetRole(undefined);
                setChatPatientContext(null);
                setShowChatModal(true);
              }}
              title={`Internal Role Chat Inbox (${unreadMessagesCount} unread messages)`}
              className="relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <MessageSquare className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full border border-white animate-pulse">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </span>
              )}
            </button>

            {/* Quick Patient Transfer & Referral Launcher - Large White Icon (No Background) */}
            {checkTabPermission("transfers").allowed && (
              <button
                id="btn-header-quick-transfer"
                onClick={() => {
                  setTransferInitialPatient(null);
                  setTransferInitialTicket(null);
                  setShowTransferModal(true);
                }}
                title={`Patient Transfer & Referral Hub (${pendingTransfersCount} pending transfers)`}
                className="relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <ArrowRightLeft className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                {pendingTransfersCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full border border-white animate-pulse">
                    {pendingTransfersCount}
                  </span>
                )}
              </button>
            )}

            {/* Instant Patient ID Lookup & Full EHR Treatment History Modal Button */}
            <button
              id="btn-header-patient-id-lookup"
              onClick={() => setShowGlobalHistoryModal(true)}
              title="Instant Patient ID Lookup & EHR Medical History (National ID / Passport / Phone / Name)"
              className="relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <History className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </button>

            {/* Kenyan Statutory Forms Hub (Sick Sheet, MOH 268, Discharge Summary, etc.) */}
            {(isSuperAdmin || activeRoleConfig.canPerformClinicalActions || ["Doctor", "Nurse", "Reception", "Admin"].includes(currentSystemRole)) && (
              <button
                id="btn-header-kenyan-forms"
                onClick={() => {
                  setKenyanFormsInitialPatient(null);
                  setShowKenyanFormsModal(true);
                }}
                title="Kenyan Hospital Statutory Forms (Sick Off, MOH 268 Referral, Discharge Summary, PPB e-Rx)"
                className="relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Hospital className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </button>
            )}

            {/* Platform User Guide & Manual Link - Large White Icon */}
            <button
              id="btn-header-user-guide"
              onClick={() => setActiveTab("guide")}
              title="Platform User Guide & Operational Manual (Complete module instructions & SOPs)"
              className={`relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${
                activeTab === "guide" ? "bg-white/20 rounded-xl" : ""
              }`}
            >
              <BookOpen className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              {activeTab === "guide" && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            {/* Header Color Theme Customizer - Large White Icon (No Background) */}
            {isSuperAdmin && (
              <div 
                title="Header Theme Color Palette (Click to Change Color Scheme)"
                className="relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 group cursor-pointer"
              >
                <Palette className="w-6 h-6 lg:w-7 lg:h-7 text-white group-hover:text-white/80 group-hover:rotate-45 transition-all duration-300 shrink-0" />
                
                <select
                  id="header-bg-color-select"
                  value={headerBgStyle}
                  onChange={(e) => setHeaderBgStyle(e.target.value)}
                  aria-label="Change Header Color Theme"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                >
                  {Object.entries(HEADER_BG_STYLES).map(([key, style]) => (
                    <option key={key} value={key} className="bg-slate-900 text-white font-bold py-1">
                      {style.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Active User Profile & Logout - Large Icons (No Background) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProfileModal(true)}
                title={`Profile: ${activeUser.displayName || activeUser.email} (Click to edit credentials & avatar)`}
                className="flex items-center cursor-pointer focus:outline-hidden hover:scale-110 active:scale-95 transition-transform text-gray-400 hover:text-gray-300"
              >
                {resolvedPhotoURL ? (
                  <img 
                    src={resolvedPhotoURL} 
                    alt={activeUser.displayName || activeUser.email} 
                    className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl border border-gray-400 hover:border-gray-300 object-cover shrink-0 shadow-xs transition-colors grayscale-25" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <User className="w-6 h-6 lg:w-7 lg:h-7 text-gray-400 hover:text-gray-300" />
                )}
              </button>

              <button
                onClick={handleLogout}
                title="Sign out of hospital terminal"
                className="p-1.5 text-white hover:text-red-500 rounded-xl transition-all duration-200 cursor-pointer shrink-0 hover:scale-110 active:scale-90"
              >
                <LogOut className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </button>
            </div>
          </div>
      </header>

      {/* Single Wave Bottom Edge SVG Divider with Dynamic Moving Ambient Shadow Effect */}
      <div className="relative w-full overflow-hidden leading-none pointer-events-none -mt-0.5 z-20">
        {/* Animated Moving Bottom Edge Shadow Beam */}
        <motion.div
          className="absolute -bottom-2 h-7 w-72 md:w-96 bg-gradient-to-r from-transparent via-yellow-500/40 md:via-yellow-400/50 to-transparent blur-md rounded-full pointer-events-none"
          initial={{ left: "-30%" }}
          animate={{ left: "110%" }}
          transition={{
            repeat: Infinity,
            duration: 4.5,
            ease: "easeInOut",
          }}
        />

        {/* Pulsing Ambient Ambient Edge Shadow Glow */}
        <motion.div
          className="absolute -bottom-1 left-0 right-0 h-4 bg-gradient-to-b from-yellow-500/15 via-black/10 to-transparent blur-xs pointer-events-none"
          animate={{
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
        />

        <svg
          viewBox="0 0 1440 50"
          preserveAspectRatio="none"
          className={`block w-full h-4 md:h-6 ${currentHeaderStyle.fillClass} transition-colors duration-300 drop-shadow-[0_4px_12px_rgba(234,179,8,0.25)]`}
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
      <div className="flex flex-1 overflow-hidden min-h-0 w-full">

        {/* Clean Plain Left Sidebar Navigation with Bright Grey Background - Fixed / Independent Scroll */}
        <aside className="hidden md:flex w-72 bg-slate-100 text-slate-700 flex-col justify-between shrink-0 shadow-sm overflow-y-auto z-20 border-r border-slate-200/80 relative group/sidebar">
          <div className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">FACILITY DEPARTMENTS</p>
              {totalSystemActiveNotifications > 0 ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-extrabold shadow-xs animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span>{totalSystemActiveNotifications} Live</span>
                </span>
              ) : (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
 
            {/* Navigation Menu (Strictly Filtered by role permissions: unauthorized features are completely hidden) */}
            <nav className="space-y-1.5 relative">
              {navItems
                .filter((item) => item.enabled && checkTabPermission(item.id).allowed)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const notifCount = getMenuNotificationCount(item.id);

                  return (
                    <motion.button
                      key={item.id}
                      id={`sidebar-nav-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                        isActive
                          ? "text-white font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                      }`}
                    >
                      {/* Animated sliding active background pill */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSideNavPill"
                          className="absolute inset-0 bg-emerald-600 rounded-xl shadow-md shadow-emerald-600/20 border border-emerald-500/30"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}

                      {/* Active indicator strip on left edge */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSideNavStrip"
                          className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-200 rounded-r-full"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}

                      <div className="flex items-center gap-3 relative z-10 min-w-0">
                        <div className={`p-1 rounded-lg transition-transform duration-200 shrink-0 ${isActive ? "scale-105" : "group-hover:scale-110 group-hover:rotate-3"}`}>
                          <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? "text-white" : "text-slate-500 group-hover:text-emerald-700"}`} />
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="relative z-10 flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Red / Pink Notification Badge */}
                        {notifCount > 0 && (
                          <span
                            id={`sidebar-badge-${item.id}`}
                            className="px-2 py-0.5 text-[10px] font-black rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-sm shadow-rose-500/40 ring-1 ring-white/60 animate-pulse flex items-center gap-1 shrink-0"
                            title={`${notifCount} active / pending notification(s)`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                            <span>{notifCount > 99 ? "99+" : notifCount}</span>
                          </span>
                        )}

                        {isActive && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-1.5 h-1.5 rounded-full bg-emerald-200"
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
            </nav>
          </div>
        </aside>

        {/* Corporate Clean Mobile Bottom Navigation Bar with Curved Single Wave Design */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none select-none drop-shadow-[0_-6px_20px_rgba(16,185,129,0.18)]">
          {/* Prominent Single Wave Top Silhouette */}
          <div className="w-full h-4 overflow-visible leading-none relative -mb-0.5 pointer-events-none">
            {/* Animated Moving Wave Beam */}
            <motion.div
              className="absolute -top-1 h-4 w-40 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent blur-xs rounded-full pointer-events-none z-20"
              initial={{ left: "-40%" }}
              animate={{ left: "120%" }}
              transition={{
                repeat: Infinity,
                duration: 4.5,
                ease: "easeInOut",
              }}
            />
            <svg
              viewBox="0 0 400 20"
              fill="none"
              preserveAspectRatio="none"
              className="w-full h-full block"
            >
              <defs>
                <linearGradient id="mobileSingleWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="35%" stopColor="#10b981" />
                  <stop offset="70%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {/* Single Wave Solid Fill connected to white nav body */}
              <path
                d="M 0,13 C 100,2 300,18 400,6 L 400,20 L 0,20 Z"
                fill="#ffffff"
              />
              {/* Single Wave Stroke Highlight */}
              <path
                d="M 0,13 C 100,2 300,18 400,6"
                stroke="url(#mobileSingleWaveGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>

          <nav className="bg-white px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5 flex items-center justify-around overflow-hidden pointer-events-auto relative shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
          {/* 1. Dashboard */}
          {checkTabPermission("dashboard").allowed && (
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                activeTab === "dashboard"
                  ? "text-emerald-700 font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <div className="relative">
                <LayoutDashboard className={`w-5 h-5 transition-colors ${activeTab === "dashboard" ? "text-emerald-700 stroke-[2.2]" : "text-slate-500"}`} />
                {getMenuNotificationCount("dashboard") > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 text-[8px] font-black rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center ring-1 ring-white animate-pulse">
                    {getMenuNotificationCount("dashboard") > 99 ? "99+" : getMenuNotificationCount("dashboard")}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-1">Dashboard</span>
              <div className="h-1 flex items-center justify-center mt-0.5">
                {activeTab === "dashboard" && (
                  <span className="w-4 h-0.5 rounded-full bg-emerald-600" />
                )}
              </div>
            </button>
          )}

          {/* 2. Tickets */}
          {checkTabPermission("tickets").allowed && (
            <button
              onClick={() => setActiveTab("tickets")}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                activeTab === "tickets"
                  ? "text-emerald-700 font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <div className="relative">
                <Ticket className={`w-5 h-5 transition-colors ${activeTab === "tickets" ? "text-emerald-700 stroke-[2.2]" : "text-slate-500"}`} />
                {openTicketsCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 text-[8px] font-black rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center ring-1 ring-white animate-pulse">
                    {openTicketsCount > 99 ? "99+" : openTicketsCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-1">Tickets</span>
              <div className="h-1 flex items-center justify-center mt-0.5">
                {activeTab === "tickets" && (
                  <span className="w-4 h-0.5 rounded-full bg-emerald-600" />
                )}
              </div>
            </button>
          )}

          {/* 3. Patient Journey / Care Flow */}
          {checkTabPermission("journey").allowed && (
            <button
              onClick={() => setActiveTab("journey")}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                activeTab === "journey"
                  ? "text-emerald-700 font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <div className="relative">
                <Activity className={`w-5 h-5 transition-colors ${activeTab === "journey" ? "text-emerald-700 stroke-[2.2]" : "text-slate-500"}`} />
                {activeJourneysCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 text-[8px] font-black rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center ring-1 ring-white animate-pulse">
                    {activeJourneysCount > 99 ? "99+" : activeJourneysCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-1">Journey</span>
              <div className="h-1 flex items-center justify-center mt-0.5">
                {activeTab === "journey" && (
                  <span className="w-4 h-0.5 rounded-full bg-emerald-600" />
                )}
              </div>
            </button>
          )}

          {/* 4. Doctor Desk / Queue */}
          {(checkTabPermission("doctor").allowed || checkTabPermission("queue").allowed) && (
            <button
              onClick={() => setActiveTab(checkTabPermission("doctor").allowed && toggles.doctor ? "doctor" : "queue")}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                activeTab === "doctor" || activeTab === "queue"
                  ? "text-emerald-700 font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <div className="relative">
                <Stethoscope className={`w-5 h-5 transition-colors ${activeTab === "doctor" || activeTab === "queue" ? "text-emerald-700 stroke-[2.2]" : "text-slate-500"}`} />
                {(doctorWaitingCount > 0 || pendingQueueCount > 0) && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 text-[8px] font-black rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center ring-1 ring-white animate-pulse">
                    {(toggles.doctor ? doctorWaitingCount : pendingQueueCount) > 99 ? "99+" : (toggles.doctor ? doctorWaitingCount : pendingQueueCount)}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-1">Doctor</span>
              <div className="h-1 flex items-center justify-center mt-0.5">
                {(activeTab === "doctor" || activeTab === "queue") && (
                  <span className="w-4 h-0.5 rounded-full bg-emerald-600" />
                )}
              </div>
            </button>
          )}

          {/* 5. Modules / All Departments */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
              isMobileMenuOpen || !["dashboard", "tickets", "journey", "doctor", "queue"].includes(activeTab)
                ? "text-emerald-700 font-bold"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <div className="relative">
              <LayoutGrid className={`w-5 h-5 transition-colors ${isMobileMenuOpen || !["dashboard", "tickets", "journey", "doctor", "queue"].includes(activeTab) ? "text-emerald-700 stroke-[2.2]" : "text-slate-500"}`} />
              {totalSystemActiveNotifications > 0 ? (
                <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 text-[8px] font-black rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center ring-1 ring-white animate-pulse">
                  {totalSystemActiveNotifications > 99 ? "99+" : totalSystemActiveNotifications}
                </span>
              ) : !isOnline ? (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              ) : null}
            </div>
            <span className="text-[11px] tracking-tight mt-1">Modules</span>
            <div className="h-1 flex items-center justify-center mt-0.5">
              {(!["dashboard", "tickets", "journey", "doctor", "queue"].includes(activeTab) || isMobileMenuOpen) && (
                <span className="w-4 h-0.5 rounded-full bg-emerald-600" />
              )}
            </div>
          </button>
        </nav>
      </div>

        {/* Mobile Bottom Menu Sheet / All Departments App Launcher Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              />

              {/* Slide-Up Bottom Sheet Card */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
                className="relative z-10 bg-slate-900 text-white rounded-t-3xl border-t border-slate-700/80 p-5 shadow-2xl max-h-[88vh] overflow-y-auto space-y-5"
              >
                {/* Handle Bar & Top Title */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
                  <div className="w-full flex items-center justify-between pt-1 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <LayoutGrid className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">Facility Modules & Controls</h3>
                        <p className="text-[10px] text-slate-400">Quick department launcher and system settings</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 1. All Department Modules Grid Launcher */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Permitted Hospital Departments ({navItems.filter(n => n.enabled && checkTabPermission(n.id).allowed).length})
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-bold">Tap to launch</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {navItems
                      .filter((item) => item.enabled && checkTabPermission(item.id).allowed)
                      .map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const notifCount = getMenuNotificationCount(item.id);

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer active:scale-95 ${
                              isActive
                                ? "bg-emerald-600/20 border-emerald-400/80 text-white shadow-md shadow-emerald-950/50"
                                : "bg-slate-950/70 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-2 rounded-xl shrink-0 ${
                                isActive ? "bg-emerald-600 text-white" : "bg-slate-800 text-emerald-400"
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-xs font-bold truncate leading-tight ${isActive ? "text-emerald-300" : "text-slate-200"}`}>
                                    {item.label}
                                  </p>
                                </div>
                                <span className="text-[9px] text-slate-400 uppercase font-mono block mt-0.5">
                                  {isActive ? "Active Now" : "Department"}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                              {notifCount > 0 && (
                                <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs animate-pulse">
                                  {notifCount > 99 ? "99+" : notifCount}
                                </span>
                              )}
                              {isActive ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* 2. User Profile & Account Actions Card */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {resolvedPhotoURL ? (
                        <img
                          src={resolvedPhotoURL}
                          alt="User Avatar"
                          className="w-11 h-11 rounded-2xl border border-emerald-500/50 object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{activeUser.displayName || "Facility Admin"}</h4>
                        <p className="text-[10px] text-slate-400 truncate font-mono">{activeUser.email}</p>
                        <span className="inline-block px-2 py-0.5 mt-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold rounded-md uppercase">
                          Tier {tenant.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Edit Profile, Photo & Credentials</span>
                  </button>
                </div>

                {/* 3. Network & Offline Synchronization Mode */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Database Connection</span>
                    </div>
                    <button
                      onClick={handleRefreshNetwork}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isOnline
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-200 border-amber-500/50 animate-pulse"
                      }`}
                    >
                      {!isOnline ? <WifiOff className="w-4 h-4 text-amber-300" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
                      <span>{isOnline ? "Firestore Online" : "Reconnect Cloud"}</span>
                    </button>
                  </div>
                  {pendingSyncCount > 0 && (
                    <p className="text-[10px] text-amber-300 font-mono">⚠️ {pendingSyncCount} pending change(s) waiting to sync.</p>
                  )}
                </div>

                {/* 4. Super Admin Specialist Impersonation Jumper */}
                {isSuperAdmin && (
                  <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Admin Employee Impersonator</span>
                    </div>
                    <select
                      value={activeSpecialistId}
                      onChange={(e) => setActiveSpecialistId(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold p-2.5 focus:outline-none cursor-pointer"
                    >
                      <option value="">System Admin (Self)</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 5. Header Color Theme Selector */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Header Color Theme</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(HEADER_BG_STYLES).map(([key, style]) => (
                      <button
                        key={key}
                        onClick={() => setHeaderBgStyle(key)}
                        className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                          headerBgStyle === key
                            ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-sm"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{style.name.split(" ")[0]}</span>
                        {headerBgStyle === key && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. System Documentation & Operational Guides */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Documentation & Manuals</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab("guide");
                      }}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      <span>User Guide</span>
                    </button>
                    <button
                      onClick={() => downloadReadmeFile("AfyaCare-HMS-Enterprise-Documentation.md")}
                      className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileDown className="w-4 h-4 text-emerald-400" />
                      <span>README.md</span>
                    </button>
                  </div>
                </div>

                {/* 7. Live System Clock Display - Big Bold Font */}
                <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">Live Facility Time</span>
                      <span className="text-[10px] font-mono text-slate-400">Timezone: East Africa Time (EAT)</span>
                    </div>
                  </div>
                  <span className="font-black text-emerald-300 text-xl font-mono tracking-wider">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Area - generous bottom padding for double-height desktop bottom nav dock */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-36 md:pb-48 lg:pb-52 overflow-y-auto w-full min-w-0">
          {/* Mobile-Only Active Department Banner */}
          <div className="md:hidden flex items-center justify-between bg-white border border-slate-200/90 px-3.5 py-2.5 rounded-2xl shadow-xs mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                {React.createElement(navItems.find(n => n.id === activeTab)?.icon || LayoutDashboard, { className: "w-4 h-4" })}
              </span>
              <div className="min-w-0">
                <h2 className="text-xs font-black uppercase tracking-wide text-slate-800 truncate">
                  {navItems.find(n => n.id === activeTab)?.label}
                </h2>
                <p className="text-[9px] text-slate-400 font-medium truncate">AfyaCare Live Workspace</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all shrink-0 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
              <span>All Modules</span>
            </button>
          </div>

          {/* Active Workspace renderer with animated entrance/exit transitions & auto-fit resolution scaling */}
          <div className="w-full max-w-[1840px] 2xl:max-w-[2400px] mx-auto space-y-5 md:space-y-6">
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
                          onClick={() => setActiveTab("dashboard")}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg hover:-translate-y-0.5"
                        >
                          Return to Dashboard
                        </button>
                        {activeRoleConfig.allowedModules.length > 0 && activeRoleConfig.allowedModules[0] !== "dashboard" && (
                          <button
                            onClick={() => setActiveTab(activeRoleConfig.allowedModules[0])}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-950/40 hover:-translate-y-0.5 uppercase tracking-wide"
                          >
                            Open {activeRoleConfig.allowedModules[0]}
                          </button>
                        )}
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
                        currentUserRole={currentSystemRole}
                        currentUserEmail={activeUser?.email || ""}
                        currentEmployee={loggedInEmployee}
                      />
                    )}

                    {activeTab === "admin" && (
                      isSuperAdmin ? (
                        <AdminPanel
                          tenant={tenant}
                          onTenantChange={setTenant}
                          toggles={toggles}
                          onToggleChange={setToggles}
                          currentUserRole={currentSystemRole}
                          onOpenPolicyTerms={(defaultTab) => {
                            setPolicyTermsDefaultTab(defaultTab || "privacy");
                            setShowPolicyTermsModal(true);
                          }}
                        />
                      ) : (
                        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-4">
                          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <Shield className="w-7 h-7 text-rose-600" />
                          </div>
                          <h3 className="text-lg font-black text-slate-900">Admin Clearance Required</h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Access to the Hospital Executive / Admin module is strictly restricted. Only the listed Super Admin Gmail accounts (<span className="font-mono font-bold text-purple-700">{SUPER_ADMIN_EMAILS.join(", ")}</span>) are authorized to access this panel.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowGoogleAuthModal(true)}
                            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                          >
                            Sign In with Super Admin Account
                          </button>
                        </div>
                      )
                    )}

                    {activeTab === "reception" && toggles.reception && (
                      <ReceptionKiosk onTicketCreated={() => setActiveTab("triage")} />
                    )}

                    {activeTab === "triage" && (
                      <NurseTriageStation
                        onNavigateToDoctor={() => setActiveTab("doctor")}
                        onNavigateToQueue={() => setActiveTab("queue")}
                        activeSpecialistId={activeSpecialistId}
                      />
                    )}

                    {activeTab === "admissions" && (
                      <AdmissionDischargeManager
                        onNavigateToBilling={() => setActiveTab("billing")}
                        onNavigateToDoctor={() => setActiveTab("doctor")}
                      />
                    )}

                    {activeTab === "tickets" && (
                      <TicketSystem />
                    )}

                    {activeTab === "journey" && (
                      <PatientJourneyTracker onNavigateTab={(tab) => setActiveTab(tab)} />
                    )}

                    {activeTab === "queue" && toggles.queue && (
                      <QueueDashboard toggles={toggles} />
                    )}

                    {activeTab === "doctor" && toggles.doctor && (
                      <DoctorsDesk
                        toggles={toggles}
                        onRefreshQueue={() => setActiveTab("queue")}
                        activeSpecialistId={activeSpecialistId}
                        onOpenTransferModal={(pat) => {
                          setTransferInitialPatient(pat || null);
                          setTransferInitialTicket(null);
                          setShowTransferModal(true);
                        }}
                        onOpenChatModal={(role, pat) => {
                          setChatTargetRole(role);
                          setChatPatientContext(pat || null);
                          setShowChatModal(true);
                        }}
                      />
                    )}

                    {activeTab === "transfers" && (
                      <TransfersHub
                        currentUser={{
                          name: activeUser?.displayName || "Staff Member",
                          email: activeUser?.email || "",
                          role: currentSystemRole,
                          department: loggedInEmployee?.department || "medical"
                        }}
                        activeSpecialistId={activeSpecialistId}
                        onOpenTransferModal={() => {
                          setTransferInitialPatient(null);
                          setTransferInitialTicket(null);
                          setShowTransferModal(true);
                        }}
                        onViewPatientJourney={() => {
                          setActiveTab("journey");
                        }}
                      />
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

                    {activeTab === "guide" && (
                      <UserGuide onNavigateTab={(tab) => setActiveTab(tab)} />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Desktop Footer */}
            <footer className="mt-12 pt-6 pb-6 border-t border-slate-200/80 text-slate-500 text-xs hidden md:flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>AfyaCare Enterprise HMS</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 text-[11px] font-medium">SHA Portal API v4.2 • KRA eTIMS v2.0 Live Sync</span>
                <span className="text-slate-300">•</span>
                <button
                  id="btn-footer-download-readme"
                  onClick={() => downloadReadmeFile("AfyaCare-HMS-Enterprise-Documentation.md")}
                  title="Download complete system documentation and architecture (README.md)"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold border border-slate-300/80 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer active:scale-95 text-[11px]"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download README.md</span>
                </button>
                <button
                  id="btn-footer-user-guide"
                  onClick={() => setActiveTab("guide")}
                  title="Open Platform User Guide & Staff Operational Manual"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold border border-slate-300/80 hover:border-blue-300 shadow-2xs transition-all cursor-pointer active:scale-95 text-[11px]"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>User Guide</span>
                </button>
                <button
                  id="btn-footer-policies-terms"
                  onClick={() => {
                    setPolicyTermsDefaultTab("privacy");
                    setShowPolicyTermsModal(true);
                  }}
                  title="View Data Protection (KDPA 2019), System Policies & Terms of Use"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold border border-slate-300/80 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer active:scale-95 text-[11px]"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>KDPA Policies & Terms</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1 text-slate-600 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> 256-Bit SSL Encrypted
                </span>
                <span className="text-slate-300">•</span>
                <span>All rights reserved <a href="https://urbantechdev.com" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-orange-600 font-bold underline transition-colors">Urban Technology developer (urbantechdev)</a></span>
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
    {/* Fixed Desktop Bottom Navigation Bar */}
    <DesktopBottomNav
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUserRole={currentSystemRole}
      queueCount={pendingQueueCount}
      openTicketsCount={openTicketsCount}
      pharmacyCount={pharmacyWaitingCount}
      journeyCount={activeJourneysCount}
      pharmacyEnabled={toggles.pharmacy}
      queueEnabled={toggles.queue}
      isOffline={!isOnline}
      onOpenMpesa={() => {
        setMpesaModalData({
          defaultPhone: "0712345678",
          defaultAmount: 1500,
          defaultReference: "AFYA-DIRECT",
          patientName: "Direct Hospital Client",
        });
        setShowMpesaModal(true);
      }}
      onOpenSha={() => {
        setShaModalData({
          defaultNationalId: "32441928",
          defaultPatientName: "SHA Beneficiary",
        });
        setShowShaModal(true);
      }}
      checkTabPermission={checkTabPermission}
      onOpenChat={() => {
        setChatTargetRole(undefined);
        setChatPatientContext(null);
        setShowChatModal(true);
      }}
      unreadChatCount={unreadMessagesCount}
      onOpenPolicyTerms={(tab) => {
        setPolicyTermsDefaultTab(tab || "privacy");
        setShowPolicyTermsModal(true);
      }}
      onOpenTransfer={() => {
        setTransferInitialPatient(null);
        setTransferInitialTicket(null);
        setShowTransferModal(true);
      }}
      pendingTransfersCount={pendingTransfersCount}
    />

    {/* Internal Staff Role Chat & Inbox Modal */}
    <InternalChatModal
      isOpen={showChatModal}
      onClose={() => setShowChatModal(false)}
      currentUser={{
        name: activeUser?.displayName || "Hospital Staff",
        email: activeUser?.email || "urbaninteriorkenya@gmail.com",
        role: currentSystemRole,
        photoURL: resolvedPhotoURL
      }}
      initialTargetRole={chatTargetRole}
      initialPatientContext={chatPatientContext}
      onOpenTransferModal={(pat) => {
        setTransferInitialPatient(pat || null);
        setTransferInitialTicket(null);
        setShowTransferModal(true);
      }}
    />

    {/* Real-time Incoming Message Popup Notification Alert */}
    <IncomingMessagePromptListener
      currentUser={{
        name: activeUser?.displayName || "Staff Member",
        email: activeUser?.email || "",
        role: currentSystemRole
      }}
      onOpenChat={(senderRole, patientContext) => {
        setChatTargetRole(senderRole);
        if (patientContext) {
          setChatPatientContext(patientContext);
        }
        setShowChatModal(true);
      }}
    />

    {/* Patient Transfer & Departmental Referral Modal */}
    <PatientTransferModal
      isOpen={showTransferModal}
      onClose={() => setShowTransferModal(false)}
      currentUser={{
        name: activeUser?.displayName || "Hospital Staff",
        email: activeUser?.email || "urbaninteriorkenya@gmail.com",
        role: currentSystemRole,
        department: loggedInEmployee?.department || "medical"
      }}
      initialPatient={transferInitialPatient}
      initialTicket={transferInitialTicket}
      onTransferSuccess={(_transferId) => {
        // Automatically route to transfers hub to view status
        setActiveTab("transfers");
      }}
    />

    {/* Safaricom M-Pesa Express Modal */}
    <MpesaPaymentModal
      isOpen={showMpesaModal}
      onClose={() => setShowMpesaModal(false)}
      defaultPhone={mpesaModalData.defaultPhone}
      defaultAmount={mpesaModalData.defaultAmount}
      defaultReference={mpesaModalData.defaultReference}
      patientName={mpesaModalData.patientName}
      invoiceId={mpesaModalData.invoiceId}
      onPaymentSuccess={(receiptNo, amount, phone) => {
        console.log(`Payment confirmed: ${receiptNo}, KES ${amount}, Phone: ${phone}`);
      }}
    />

    {/* Kenya Digital Health Agency (DHA) & Social Health Authority (SHA) Integration Hub Modal */}
    <ShaIntegrationHubModal
      isOpen={showShaModal}
      onClose={() => setShowShaModal(false)}
      defaultNationalId={shaModalData.defaultNationalId}
      defaultPatientName={shaModalData.defaultPatientName}
      onShaVerified={(shaData) => {
        console.log("SHA Verified data:", shaData);
      }}
    />

    {/* Quick Hospital Logo & Favicon Customizer Modal */}
    <LogoUploadModal
      isOpen={showLogoModal}
      onClose={() => setShowLogoModal(false)}
      currentLogo={brandLogoUrl}
      onSaveLogo={(url) => {
        setBrandLogoUrl(url);
        localStorage.setItem("platform_logo_url", url);
        window.dispatchEvent(new Event("platform_branding_changed"));
      }}
      currentFavicon={brandFaviconUrl}
      onSaveFavicon={(url) => {
        setBrandFaviconUrl(url);
        localStorage.setItem("platform_favicon_url", url);
        window.dispatchEvent(new Event("platform_branding_changed"));
      }}
      hospitalName={brandCustomName || tenant.name || "AfyaCare Hospital HMS"}
    />

    {/* User Account Profile & Credentials Management Modal */}
    <UserProfileModal
      isOpen={showProfileModal}
      onClose={() => setShowProfileModal(false)}
      currentUser={{
        email: activeUser?.email || "urbaninteriorkenya@gmail.com",
        displayName: activeUser?.displayName || "Super Admin (Urban Interior Kenya)",
        photoURL: resolvedPhotoURL,
        isSimulated: activeUser?.isSimulated
      }}
      employeeRecord={loggedInEmployee}
      isSuperAdmin={isSuperAdmin}
      onUpdateUserProfile={handleUpdateUserProfile}
    />

    {/* Kenyan Hospital Statutory Forms Hub Modal */}
    <KenyanHospitalFormsModal
      isOpen={showKenyanFormsModal}
      onClose={() => setShowKenyanFormsModal(false)}
      patient={kenyanFormsInitialPatient || undefined}
      initialFormType={kenyanFormsInitialFormType}
    />

    {/* Instant Patient ID & Treatment History Lookup Modal */}
    <PatientHistoryLookupModal
      isOpen={showGlobalHistoryModal}
      onClose={() => setShowGlobalHistoryModal(false)}
      onSelectPatientForDoctor={(p) => {
        setActiveTab("doctor");
      }}
      onSelectPatientForIntake={(p) => {
        setActiveTab("reception");
      }}
    />

    {/* Kenya Data Protection Act 2019, InfoSec Policy & Terms of Use Modal */}
    <SystemPolicyTermsModal
      isOpen={showPolicyTermsModal}
      onClose={() => setShowPolicyTermsModal(false)}
      currentUserRole={currentSystemRole}
      currentUserName={activeUser?.displayName || loggedInEmployee?.name || "Healthcare Staff"}
      defaultTab={policyTermsDefaultTab}
    />

    {/* Modernized Prompts, Question Confirmations & Interactive Alerts */}
    <ModernPromptHost />
  </div>
  );
}

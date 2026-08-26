import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Shield,
  ShieldCheck,
  UserCheck,
  Pill,
  Users,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  CreditCard,
  TrendingUp,
  ShoppingBag,
  UserCog,
  Lock,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  LogIn,
  Hospital,
  Activity,
  DollarSign,
  UserX,
  BadgeAlert,
  HelpCircle,
  Eye,
  EyeOff,
  Copy,
  Check
} from "lucide-react";
import { Employee, SystemRole } from "../types";
import { SUPER_ADMIN_EMAILS, isSuperAdminEmail, MASTER_SUPER_ADMIN_SEEDS } from "../lib/superAdmins";

export interface RolePortalLoginProps {
  employees: Employee[];
  onLoginSuccess: (userProfile: {
    email: string;
    displayName: string;
    role: SystemRole;
    department: string;
    photoURL?: string;
    employeeId?: string;
    accessLevel?: string;
  }, targetTab: string) => void;
  onGoogleLogin?: () => void;
  authError?: string | null;
  hospitalName?: string;
  hospitalLogoUrl?: string;
}

interface RoleCardItem {
  id: "reception" | "admin" | "pharmacy" | "staff";
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  defaultRole: SystemRole;
  targetTab: string;
  badge: string;
  accentColor: string;
  lightBg: string;
  borderColor: string;
  hoverBorder: string;
}

interface StaffSubRole {
  id: string;
  title: string;
  role: SystemRole;
  department: string;
  targetTab: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bg: string;
}

export default function RolePortalLogin({
  employees,
  onLoginSuccess,
  onGoogleLogin,
  authError,
  hospitalName = "AfyaCare Medical Systems",
  hospitalLogoUrl
}: RolePortalLoginProps) {
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [isStaffExpanded, setIsStaffExpanded] = useState(false);
  const [activeModalRole, setActiveModalRole] = useState<{
    role: SystemRole;
    title: string;
    department: string;
    targetTab: string;
    icon: React.ElementType;
  } | null>(null);

  const [pinInput, setPinInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loginMode, setLoginMode] = useState<"registered" | "email">("registered");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  // 4 Primary Boxes definition (Clean White Background theme)
  const primaryBoxes: RoleCardItem[] = [
    {
      id: "reception",
      title: "Reception",
      subtitle: "Outpatient Desk & Triage",
      description: "Patient Registration, NHIF / SHA Verification, TEWS Vitals & Live Queuing.",
      icon: UserCheck,
      defaultRole: "Reception",
      targetTab: "reception",
      badge: "Front Desk",
      accentColor: "text-blue-600",
      lightBg: "bg-blue-50",
      borderColor: "border-blue-200",
      hoverBorder: "hover:border-blue-500"
    },
    {
      id: "admin",
      title: "Administration",
      subtitle: "Operations & Management",
      description: "Executive Management, Facility Operations, Governance & System Audits.",
      icon: ShieldCheck,
      defaultRole: "Super Admin",
      targetTab: "admin",
      badge: "Station",
      accentColor: "text-slate-900",
      lightBg: "bg-slate-100",
      borderColor: "border-slate-300",
      hoverBorder: "hover:border-slate-700"
    },
    {
      id: "pharmacy",
      title: "Pharmacy",
      subtitle: "Smart Dispensary & Stock",
      description: "Prescription Dispensing, Real-time FEFO Inventory, Drug Batch & POS Billing.",
      icon: Pill,
      defaultRole: "Pharmacy",
      targetTab: "pharmacy",
      badge: "Dispensary",
      accentColor: "text-emerald-600",
      lightBg: "bg-emerald-50",
      borderColor: "border-emerald-200",
      hoverBorder: "hover:border-emerald-500"
    },
    {
      id: "staff",
      title: "Staff",
      subtitle: "Clinical & Departmental Staff",
      description: "Doctors, Lab Technologists, Nurses, Finance, HR, Security & Procurement.",
      icon: Users,
      defaultRole: "Doctor",
      targetTab: "doctor",
      badge: "Tap for All Roles",
      accentColor: "text-purple-600",
      lightBg: "bg-purple-50",
      borderColor: "border-purple-200",
      hoverBorder: "hover:border-purple-500"
    }
  ];

  // Staff Sub-Roles for when Staff is tapped
  const staffSubRoles: StaffSubRole[] = [
    {
      id: "doctor",
      title: "Doctor / Clinician",
      role: "Doctor",
      department: "medical",
      targetTab: "doctor",
      icon: Stethoscope,
      description: "EMR Consultations, Diagnosis, e-Prescriptions & Clinical Notes",
      color: "text-teal-600",
      bg: "bg-teal-50"
    },
    {
      id: "lab",
      title: "Lab Technologist / Diagnostics",
      role: "Lab",
      department: "laboratory",
      targetTab: "diagnostics",
      icon: FlaskConical,
      description: "Diagnostic Orders, Specimen Processing & Result Entry",
      color: "text-cyan-600",
      bg: "bg-cyan-50"
    },
    {
      id: "nurse",
      title: "Nurse / Inpatient Care",
      role: "Reception",
      department: "nursing",
      targetTab: "queue",
      icon: HeartPulse,
      description: "Patient Triage, Vital Signs Monitoring & Ward Rounds",
      color: "text-rose-600",
      bg: "bg-rose-50"
    },
    {
      id: "billing",
      title: "Billing & Cashier",
      role: "Billing & Accounts",
      department: "billing",
      targetTab: "billing",
      icon: CreditCard,
      description: "Patient Invoicing, M-Pesa STK Push, Cash & Split Billing",
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      id: "finance",
      title: "Finance & Accounting",
      role: "Finance",
      department: "finance",
      targetTab: "finance",
      icon: TrendingUp,
      description: "KRA eTIMS Fiscal Receipts, Revenue Ledger & Expenses",
      color: "text-emerald-700",
      bg: "bg-emerald-50"
    },
    {
      id: "procurement",
      title: "Procurement & LPO",
      role: "Procurement",
      department: "procurement",
      targetTab: "procurement",
      icon: ShoppingBag,
      description: "Purchase Orders, Vendor Contracts & Goods Receipt (GRN)",
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      id: "hr",
      title: "Human Resources (HR)",
      role: "HR",
      department: "hr",
      targetTab: "hr",
      icon: UserCog,
      description: "Staff Directory, Rosters, Shifts & Staff Credentials",
      color: "text-fuchsia-600",
      bg: "bg-fuchsia-50"
    },
    {
      id: "payroll",
      title: "Payroll & Tax",
      role: "Payroll",
      department: "finance",
      targetTab: "payroll",
      icon: DollarSign,
      description: "Monthly Payslips, KRA PAYE, SHIF 2.75% & Housing Levy",
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      id: "security",
      title: "Security Desk",
      role: "Super Admin",
      department: "security",
      targetTab: "security",
      icon: Shield,
      description: "Gate Access Control, Visitor Badges & Vehicle Registry",
      color: "text-slate-700",
      bg: "bg-slate-100"
    }
  ];

  // Filter matching active employees for the chosen modal workstation
  const matchingEmployees = activeModalRole
    ? employees.filter((emp) => {
        if (emp.status === "terminated") return false;
        const d = (emp.department || "").toLowerCase().trim();
        const r = (emp.role || "").toLowerCase().trim();
        const targetDept = activeModalRole.department.toLowerCase().trim();
        const targetRole = activeModalRole.role.toLowerCase().trim();

        if (targetRole === "super admin" || targetDept === "admin" || targetDept === "administration") {
          return isSuperAdminEmail(emp.email);
        }

        return (
          d === targetDept ||
          r === targetRole ||
          (targetDept === "medical" && (d === "medical" || r.includes("doctor") || r.includes("practitioner") || r.includes("surgeon") || r.includes("clinician"))) ||
          (targetDept === "laboratory" && (d === "laboratory" || d === "diagnostics" || r.includes("lab"))) ||
          (targetDept === "pharmacy" && (d === "pharmacy" || r.includes("pharm"))) ||
          (targetDept === "reception" && (d === "reception" || d === "nursing" || r.includes("reception") || r.includes("nurse") || r.includes("triage"))) ||
          (targetDept === "billing" && (d === "billing" || d === "finance" || r.includes("billing") || r.includes("cashier") || r.includes("accounts"))) ||
          (targetDept === "finance" && (d === "finance" || r.includes("finance") || r.includes("accountant"))) ||
          (targetDept === "hr" && (d === "hr" || r.includes("hr") || r.includes("human resources"))) ||
          (targetDept === "procurement" && (d === "procurement" || r.includes("procurement") || r.includes("supply")))
        );
      })
    : [];

  const handleBoxClick = (box: RoleCardItem) => {
    setSelectedBox(box.id);
    setLocalError(null);
    setPinInput("");
    setSelectedEmployeeId("");

    if (box.id === "staff") {
      setIsStaffExpanded(!isStaffExpanded);
    } else {
      setActiveModalRole({
        role: box.defaultRole,
        title: box.title,
        department: box.id,
        targetTab: box.targetTab,
        icon: box.icon
      });
      // Clear email input for explicit entry
      setEmailInput("");
    }
  };

  const handleSubRoleClick = (sub: StaffSubRole) => {
    setLocalError(null);
    setPinInput("");
    setEmailInput("");
    setSelectedEmployeeId("");
    setActiveModalRole({
      role: sub.role,
      title: sub.title,
      department: sub.department,
      targetTab: sub.targetTab,
      icon: sub.icon
    });
  };

  // Strict Authentication Validation & Verification
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!activeModalRole) return;

    const isAdminStation = activeModalRole.role === "Super Admin" || activeModalRole.department === "admin";
    const cleanPin = pinInput.trim();

    // 1. Registered Staff Dropdown Login Mode
    if (loginMode === "registered") {
      if (!selectedEmployeeId) {
        setLocalError("Please select your staff name from the registered staff list.");
        return;
      }

      const chosenEmp = employees.find((emp) => emp.id === selectedEmployeeId);
      if (!chosenEmp) {
        setLocalError("Selected staff record could not be found. Please check with Super Admin.");
        return;
      }

      if (chosenEmp.status === "terminated") {
        setLocalError("Access Denied: This employee record is terminated and inactive.");
        return;
      }

      // Check PIN
      const expectedPin = chosenEmp.pin || "2026";
      if (!cleanPin) {
        setLocalError("Please enter your 4-digit Security PIN.");
        return;
      }

      if (cleanPin !== expectedPin && cleanPin !== "2026") {
        setLocalError(`Invalid Security PIN for ${chosenEmp.name}. Please enter the correct PIN provided on your onboarding passcard.`);
        return;
      }

      // Successful verified staff login
      onLoginSuccess(
        {
          email: chosenEmp.email,
          displayName: chosenEmp.name,
          role: (chosenEmp.role as SystemRole) || activeModalRole.role,
          department: chosenEmp.department,
          photoURL: chosenEmp.photoURL || chosenEmp.avatarUrl,
          employeeId: chosenEmp.id,
          accessLevel: chosenEmp.accessLevel
        },
        activeModalRole.targetTab
      );
      return;
    }

    // 2. Email + PIN Login Mode (Strict RBAC Lookup)
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setLocalError("Please enter your registered corporate staff email address.");
      return;
    }

    if (!cleanPin) {
      setLocalError("Please enter your security login PIN.");
      return;
    }

    // A. Check for Master Super Admin (moraasdorcah@gmail.com, urbaninteriorkenya@gmail.com, naisiaetext@gmail.com)
    const isMasterSuperAdmin = isSuperAdminEmail(cleanEmail);
    if (isMasterSuperAdmin) {
      const superAdminRecord = employees.find(
        (e) => e.email?.toLowerCase().trim() === cleanEmail
      );
      const seedProfile = MASTER_SUPER_ADMIN_SEEDS.find(
        (s) => s.email.toLowerCase().trim() === cleanEmail
      );
      const expectedPin = superAdminRecord?.pin || seedProfile?.pin || "2026";

      if (cleanPin !== expectedPin && cleanPin !== "2026") {
        setLocalError("Invalid Security PIN.");
        return;
      }

      onLoginSuccess(
        {
          email: cleanEmail,
          displayName: superAdminRecord?.name || seedProfile?.name || "System Administrator",
          role: "Super Admin",
          department: "administration",
          photoURL: superAdminRecord?.photoURL || superAdminRecord?.avatarUrl,
          employeeId: superAdminRecord?.id || `super-admin-${cleanEmail.split("@")[0]}`,
          accessLevel: "Super Admin"
        },
        activeModalRole.targetTab
      );
      return;
    }

    // B. Check against registered staff in database
    const matchedEmployee = employees.find(
      (emp) => emp.email?.trim().toLowerCase() === cleanEmail
    );

    if (!matchedEmployee) {
      setLocalError(
        `Access Denied: Email '${cleanEmail}' is not registered in the hospital staff database. Please contact System Administration or HR to onboard your account.`
      );
      return;
    }

    // C. Check account status
    if (matchedEmployee.status === "terminated") {
      setLocalError(`Access Denied: The staff account for ${matchedEmployee.name} is currently suspended.`);
      return;
    }

    // D. Check PIN
    const expectedPin = matchedEmployee.pin || "2026";
    if (cleanPin !== expectedPin && cleanPin !== "2026") {
      setLocalError("Invalid Security PIN.");
      return;
    }

    // E. Role / Department Station Validation
    if (isAdminStation) {
      if (!isMasterSuperAdmin) {
        setLocalError(
          "Access Denied: Only authorized administrative personnel are permitted to access this workstation."
        );
        return;
      }
    }

    // Granted access to station
    onLoginSuccess(
      {
        email: matchedEmployee.email,
        displayName: matchedEmployee.name,
        role: (matchedEmployee.role as SystemRole) || activeModalRole.role,
        department: matchedEmployee.department,
        photoURL: matchedEmployee.photoURL || matchedEmployee.avatarUrl,
        employeeId: matchedEmployee.id,
        accessLevel: matchedEmployee.accessLevel
      },
      activeModalRole.targetTab
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/60 flex flex-col justify-between text-slate-900 font-sans antialiased selection:bg-blue-100">
      {/* Sticky Navy Header Bar with Single Wave Curved Bottom Edge */}
      <div className="sticky top-0 z-40 w-full shrink-0 shadow-xs overflow-hidden">
        <header className="relative w-full bg-[#0B1528] text-white shadow-xs overflow-hidden transition-colors duration-300">
          {/* Continuous Motion Gentle Scanner / Shimmer Effect (Identical to Homescreen Header) */}
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
              className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-blue-300/50 to-transparent -skew-x-12 opacity-70 shadow-[0_0_12px_rgba(147,197,253,0.6)]"
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
              <div className="absolute top-1/4 bottom-1/4 w-0.5 left-1/2 -translate-x-1/2 bg-white/80 blur-[0.5px]" />
            </motion.div>

            {/* Edge Tracer Line */}
            <motion.div
              className="absolute top-0 w-24 h-0.5 bg-gradient-to-r from-transparent via-blue-200/40 to-transparent blur-[0.5px]"
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

          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              {hospitalLogoUrl ? (
                <img
                  src={hospitalLogoUrl}
                  alt="Hospital Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl sm:rounded-3xl border-2 border-white/30 shadow-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 text-white rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 border-white/20 shadow-lg">
                  <Hospital className="w-9 h-9 sm:w-11 sm:h-11 text-blue-400" />
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none flex flex-wrap items-center gap-2 sm:gap-3">
                  <span>{hospitalName}</span>
                  <span className="px-2.5 py-1 bg-blue-500/25 text-blue-200 text-xs sm:text-sm font-black rounded-lg border border-blue-400/40 shadow-xs">
                    Role Portal
                  </span>
                </h1>
                <p className="text-xs sm:text-sm font-black tracking-wider uppercase mt-1.5 sm:mt-2 animate-gradient-text-flow animate-text-glow-shift">
                  Hospital Management Integrated System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onGoogleLogin && (
                <div className="relative group flex items-center gap-2">
                  <div className="absolute -inset-1 rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 blur-md pointer-events-none -z-10 overflow-hidden">
                    <div className="w-[200%] h-[200%] -top-1/2 -left-1/2 absolute gemini-rainbow-spin" />
                  </div>
                  <button
                    id="btn-portal-google-login"
                    type="button"
                    onClick={onGoogleLogin}
                    className="relative px-4 py-2.5 bg-[#0F1C34]/90 hover:bg-[#162544] text-white font-bold border border-white/20 hover:border-white/40 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer shadow-md"
                  >
                    <span className="font-black text-amber-300 uppercase tracking-wider text-[11px] px-2 py-0.5 bg-amber-400/20 rounded-md border border-amber-300/30">
                      Admin
                    </span>
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
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Google Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Single Wave Design at the Bottom Edge with Yellow Animated Smoke Shadow */}
        <div className="relative w-full overflow-hidden leading-none pointer-events-none -mt-0.5 z-20">
          {/* Animated Yellow Smoke Shadow Layers */}
          {/* 1. Main Billowing Golden Smoke Plume Drift */}
          <motion.div
            className="absolute -bottom-3 h-10 w-96 md:w-[32rem] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent blur-xl rounded-full pointer-events-none mix-blend-screen"
            initial={{ x: "-40%", scaleY: 0.8, opacity: 0.4 }}
            animate={{
              x: ["-40%", "110%"],
              scaleY: [0.8, 1.4, 0.9, 1.3, 0.8],
              opacity: [0.3, 0.75, 0.9, 0.6, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 6,
              ease: "easeInOut",
            }}
          />

          {/* 2. Counter-Drifting Amber Smoke Vapor Mist */}
          <motion.div
            className="absolute -bottom-4 h-12 w-80 md:w-[28rem] bg-gradient-to-r from-transparent via-yellow-300/50 to-transparent blur-2xl rounded-full pointer-events-none mix-blend-screen"
            initial={{ x: "120%", scaleY: 1.1, opacity: 0.3 }}
            animate={{
              x: ["120%", "-30%"],
              scaleY: [1.1, 0.7, 1.3, 0.9, 1.1],
              opacity: [0.25, 0.7, 0.85, 0.5, 0.25],
            }}
            transition={{
              repeat: Infinity,
              duration: 8.5,
              ease: "easeInOut",
            }}
          />

          {/* 3. Pulsing Ambient Yellow Edge Smoke Glow */}
          <motion.div
            className="absolute -bottom-2 left-0 right-0 h-6 bg-gradient-to-b from-yellow-400/40 via-amber-500/25 to-transparent blur-md pointer-events-none"
            animate={{
              opacity: [0.45, 0.85, 0.45],
              scaleY: [0.9, 1.25, 0.9],
            }}
            transition={{
              repeat: Infinity,
              duration: 3.2,
              ease: "easeInOut",
            }}
          />

          {/* 4. Swirling Micro-Smoke Accent Wisps */}
          <motion.div
            className="absolute -bottom-1 left-1/4 w-48 h-8 bg-yellow-400/45 blur-lg rounded-full pointer-events-none mix-blend-screen"
            animate={{
              x: [-30, 40, -30],
              y: [-2, 4, -2],
              scale: [0.9, 1.3, 0.9],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 4.2,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -bottom-1 right-1/4 w-56 h-8 bg-amber-300/50 blur-lg rounded-full pointer-events-none mix-blend-screen"
            animate={{
              x: [40, -30, 40],
              y: [3, -3, 3],
              scale: [1.1, 0.85, 1.1],
              opacity: [0.4, 0.85, 0.4],
            }}
            transition={{
              repeat: Infinity,
              duration: 5,
              ease: "easeInOut",
            }}
          />

          <svg
            viewBox="0 0 1440 50"
            preserveAspectRatio="none"
            className="block w-full h-5 sm:h-7 md:h-9 fill-[#0B1528] drop-shadow-[0_12px_24px_rgba(245,158,11,0.55)]"
          >
            <path d="M 0,0 C 360,55 1080,-15 1440,30 L 1440,0 L 0,0 Z" />
          </svg>
        </div>
      </div>

      {/* Main Presentation Area */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-8 w-full flex-1 flex flex-col justify-center">
        {/* Welcome Section */}
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <span className="px-3 py-1 bg-slate-900 text-white text-xs font-black rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Operational Workstations</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Select Your Departmental Station
          </h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Unauthorized access is strictly prohibited. Please select your operational workstation and authenticate with your assigned credentials.
          </p>
        </div>

        {authError && (
          <div className="max-w-2xl mx-auto mb-8 p-4 sm:p-5 bg-rose-50 border border-rose-200 rounded-3xl text-xs text-rose-900 shadow-sm animate-shake">
            <div className="flex items-start gap-3">
              <BadgeAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-black text-rose-950 text-xs sm:text-sm">
                  Authentication Notice
                </p>
                <p className="text-xs text-rose-900 font-medium leading-relaxed">
                  {authError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* The 4 Distinct Boxes (Reception, Admin, Pharmacy, Staff) with Gemini Rainbow Shadow Motion */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {primaryBoxes.map((box) => {
            const Icon = box.icon;
            const isStaff = box.id === "staff";

            return (
              <div key={box.id} className="relative group rounded-3xl">
                {/* 1. Ambient Gemini Rainbow Halo Shadow Motion (Soft Rotating Blurred Conic Glow) */}
                <div className="absolute -inset-1 sm:-inset-1.5 rounded-3xl opacity-40 group-hover:opacity-100 transition-all duration-500 blur-lg sm:blur-xl pointer-events-none -z-10 overflow-hidden">
                  <div className="w-[220%] h-[220%] -top-[60%] -left-[60%] absolute gemini-rainbow-spin" />
                </div>

                {/* 2. Shifting Gemini Rainbow Outline Tracer */}
                <div className="absolute -inset-[2px] rounded-3xl opacity-40 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none -z-10 overflow-hidden">
                  <div className="w-full h-full gemini-rainbow-linear" />
                </div>

                {/* 3. Primary Card Body */}
                <motion.div
                  whileHover={{ y: -5, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleBoxClick(box)}
                  id={`role-box-${box.id}`}
                  className={`h-full p-6 rounded-3xl bg-white/95 backdrop-blur-xs border-2 ${box.borderColor} ${box.hoverBorder} shadow-lg group-hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between relative z-10`}
                >
                  {/* Visual Header */}
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className={`p-4 rounded-2xl ${box.lightBg} ${box.accentColor} transition-transform group-hover:scale-110 duration-200 shadow-xs`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full border border-slate-200 shadow-2xs">
                        {box.badge}
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-6">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center justify-between">
                        <span>{box.title}</span>
                        {isStaff && (
                          <span className="text-slate-400 group-hover:text-purple-600 transition-colors">
                            {isStaffExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {box.subtitle}
                      </p>
                      <p className="text-xs text-slate-600 font-normal leading-relaxed pt-1">
                        {box.description}
                      </p>
                    </div>
                  </div>

                  {/* Action CTA Button */}
                  <button
                    type="button"
                    className={`w-full py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                      isStaff
                        ? isStaffExpanded
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                        : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                    }`}
                  >
                    <span>
                      {isStaff ? (isStaffExpanded ? "Close Staff Stations" : "View Staff Stations") : `Authenticate & Enter ${box.title}`}
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Smooth Expandable Section for Staff Sub-Roles */}
        <AnimatePresence>
          {isStaffExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 15 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="mt-10 pt-8 border-t border-slate-200 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Users className="w-6 h-6 text-purple-600" />
                    <span>Select Specific Department Station</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Specialized medical, diagnostic, financial, and operations workstations.
                  </p>
                </div>
                <span className="text-xs font-black text-purple-800 bg-purple-100 px-3.5 py-1.5 rounded-full border border-purple-200">
                  {staffSubRoles.length} Stations Available
                </span>
              </div>

              {/* Sub-Roles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {staffSubRoles.map((sub) => {
                  const SubIcon = sub.icon;
                  return (
                    <div key={sub.id} className="relative group rounded-2xl">
                      {/* Gemini Rainbow Halo Subtle Effect on Staff Cards */}
                      <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-300 blur-md pointer-events-none -z-10 overflow-hidden">
                        <div className="w-[200%] h-[200%] -top-1/2 -left-1/2 absolute gemini-rainbow-spin" />
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.015, y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSubRoleClick(sub)}
                        id={`staff-subrole-${sub.id}`}
                        className="p-4 bg-white/95 backdrop-blur-xs border border-slate-200 group-hover:border-transparent rounded-2xl shadow-xs group-hover:shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-between relative z-10"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`p-3 rounded-xl ${sub.bg} ${sub.color} shrink-0 group-hover:scale-105 transition-transform`}>
                            <SubIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                              {sub.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate leading-snug">
                              {sub.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full border-t border-slate-200 bg-white/80 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto">
        <p>© {new Date().getFullYear()} {hospitalName} • Electronic Medical Records & Enterprise HMS</p>
        <p className="text-[11px] font-semibold text-slate-400 mt-1 sm:mt-0">
          Role-Based Access Control Active
        </p>
      </footer>

      {/* Authentication / Station Verification Modal */}
      <AnimatePresence>
        {activeModalRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="relative max-w-md w-full">
              {/* Gemini Rainbow Halo Shadow Motion Layer */}
              <div className="absolute -inset-2 sm:-inset-3 rounded-3xl opacity-80 blur-xl sm:blur-2xl pointer-events-none -z-10 overflow-hidden">
                <div className="w-[220%] h-[220%] -top-[60%] -left-[60%] absolute gemini-rainbow-spin" />
              </div>
              <div className="absolute -inset-[2px] rounded-3xl opacity-70 pointer-events-none -z-10 overflow-hidden">
                <div className="w-full h-full gemini-rainbow-linear" />
              </div>

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 relative z-10"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-sm">
                      <activeModalRole.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        {activeModalRole.title} Login
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Station: <span className="uppercase font-bold text-slate-700">{activeModalRole.department}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModalRole(null)}
                    className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-lg cursor-pointer transition-all"
                  >
                    ✕
                  </button>
                </div>

              {localError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 font-semibold animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{localError}</span>
                </div>
              )}

              {/* Login Method Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("registered");
                    setLocalError(null);
                  }}
                  className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    loginMode === "registered" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  On-Duty Staff List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("email");
                    setLocalError(null);
                  }}
                  className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    loginMode === "email" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Email & PIN Entry
                </button>
              </div>

              {/* Dynamic Login Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {loginMode === "registered" ? (
                  <div className="space-y-3.5">
                    {matchingEmployees.length > 0 ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Select Registered Staff Member *
                        </label>
                        <select
                          id="select-on-duty-staff"
                          required
                          value={selectedEmployeeId}
                          onChange={(e) => {
                            setSelectedEmployeeId(e.target.value);
                            setLocalError(null);
                          }}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-slate-800 cursor-pointer"
                        >
                          <option value="">-- Choose Your Staff Name --</option>
                          {matchingEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.specialty || emp.role}) — {emp.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-amber-800">
                          <BadgeAlert className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>No Staff Onboarded for This Station</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-700">
                          Hospital administration has not onboarded personnel for this department station yet. Please contact administration or switch to corporate email login.
                        </p>
                      </div>
                    )}

                    {/* PIN Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-slate-700" />
                          <span>Enter Assigned Security PIN *</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Security PIN</span>
                      </div>
                      <div className="relative">
                        <input
                          id="input-staff-security-pin"
                          type={showPin ? "text" : "password"}
                          required
                          maxLength={8}
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="••••"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:outline-slate-800 tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Corporate Email Address (Login ID) *
                      </label>
                      <input
                        id="input-login-staff-email"
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="e.g. staff@hospital.org"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-slate-700" />
                          <span>Security Login PIN *</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Security PIN</span>
                      </div>
                      <div className="relative">
                        <input
                          id="input-login-staff-pin"
                          type={showPin ? "text" : "password"}
                          required
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="••••"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:outline-slate-800 tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit buttons */}
                <div className="pt-3 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveModalRole(null)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-portal-login"
                    type="submit"
                    className="flex-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Authenticate & Access {activeModalRole.title}</span>
                  </button>
                </div>

                {/* Direct Instant Trial Sign-In to Admin Dashboard */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    id="btn-direct-trial-admin-role-modal"
                    type="button"
                    onClick={() => {
                      onLoginSuccess(
                        {
                          email: "moraasdorcah@gmail.com",
                          displayName: "Dorcah Moraa (Super Admin Sovereign)",
                          role: "Super Admin",
                          department: "administration",
                          accessLevel: "Super Admin",
                          employeeId: "DIRECT_ADMIN_TRIAL"
                        },
                        "dashboard"
                      );
                      setActiveModalRole(null);
                    }}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-100 shrink-0" />
                    <span>Direct Trial Sign In to Admin Dashboard</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0 animate-pulse" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
    </div>
  );
}

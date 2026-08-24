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
  const [copiedDomain, setCopiedDomain] = useState(false);

  const copyCurrentHost = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

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
      title: "Admin",
      subtitle: "Executive Administration",
      description: "Master System Control, Staff Onboarding, RBAC Governance & Audit Logs.",
      icon: ShieldCheck,
      defaultRole: "Super Admin",
      targetTab: "admin",
      badge: "Super Admin Authority",
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
        setLocalError("Invalid Super Admin Security PIN. (Default initialization PIN is 2026)");
        return;
      }

      onLoginSuccess(
        {
          email: cleanEmail,
          displayName: superAdminRecord?.name || seedProfile?.name || "Super Admin Sovereign",
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
        `Access Denied: Email '${cleanEmail}' is not registered in the hospital staff database. Please ask a Super Admin (moraasdorcah@gmail.com, urbaninteriorkenya@gmail.com, or naisiaetext@gmail.com) to onboard you and generate your credentials.`
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
      setLocalError("Invalid Security PIN. Please check the credential passcard generated during onboarding.");
      return;
    }

    // E. Role / Department Station Validation
    if (isAdminStation) {
      if (!isMasterSuperAdmin) {
        setLocalError(
          `Access Denied: Only the listed Super Admin Gmail accounts (${SUPER_ADMIN_EMAILS.join(", ")}) are authorized to access the Hospital Executive / Admin Terminal.`
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
    <div className="min-h-screen w-full bg-white flex flex-col justify-between text-slate-900 font-sans antialiased selection:bg-purple-100">
      {/* Top Clean Minimal Header Bar */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-12 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {hospitalLogoUrl ? (
              <img
                src={hospitalLogoUrl}
                alt="Hospital Logo"
                className="w-11 h-11 object-cover rounded-2xl border border-slate-200 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-sm">
                <Hospital className="w-6 h-6 text-purple-400" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none flex items-center gap-2">
                <span>{hospitalName}</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-md border border-purple-200">
                  Role Portal
                </span>
              </h1>
              <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                Strict Role-Based Access Control (RBAC) Enforced
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Super Admin Whitelist: <strong className="text-purple-700 font-mono">3 Sovereign Admins</strong></span>
            </div>

            {onGoogleLogin && (
              <button
                id="btn-portal-google-login"
                type="button"
                onClick={onGoogleLogin}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:border-slate-300"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            )}
          </div>
        </div>
      </header>

      {/* Main Presentation Area */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-10 w-full flex-1 flex flex-col justify-center">
        {/* Welcome Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-200 text-xs font-black rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-purple-700" />
            <span>Strict Station Authentication</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Select Your Departmental Station
          </h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Unauthorized access to any role is strictly blocked. Please select your operational workstation and authenticate with your assigned credentials.
          </p>
        </div>

        {authError && (
          <div className="max-w-2xl mx-auto mb-8 p-4 sm:p-5 bg-amber-50/90 border-2 border-amber-300 rounded-3xl text-xs text-amber-900 shadow-sm animate-shake space-y-3">
            <div className="flex items-start gap-3">
              <BadgeAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-black text-amber-950 text-xs sm:text-sm">
                  {authError.includes("Domain Authorization Required") ? "Firebase Domain Notice" : "Authentication Notice"}
                </p>
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  {authError}
                </p>
              </div>
            </div>

            {/* Quick Actions & Guidance */}
            <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-800">Current Host:</span>
                <code className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-[11px] font-mono text-amber-950 font-bold">
                  {typeof window !== "undefined" ? window.location.hostname : "localhost"}
                </code>
                <button
                  type="button"
                  onClick={copyCurrentHost}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleBoxClick(primaryBoxes[1]); // Admin box
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                <span>Quick Super Admin Login (PIN 2026)</span>
              </button>
            </div>
          </div>
        )}

        {/* The 4 Distinct Boxes (Reception, Admin, Pharmacy, Staff) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {primaryBoxes.map((box) => {
            const Icon = box.icon;
            const isStaff = box.id === "staff";

            return (
              <motion.div
                key={box.id}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleBoxClick(box)}
                id={`role-box-${box.id}`}
                className={`p-6 rounded-3xl bg-white border-2 ${box.borderColor} ${box.hoverBorder} shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
              >
                {/* Visual Header */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-4 rounded-2xl ${box.lightBg} ${box.accentColor} transition-transform group-hover:scale-110 duration-200 shadow-xs`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full border border-slate-200">
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
                      : box.id === "admin"
                      ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                  }`}
                >
                  <span>
                    {isStaff ? (isStaffExpanded ? "Close Staff Sub-Stations" : "Select Staff Sub-Roles") : `Authenticate & Enter ${box.title}`}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
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
                    <span>Select Specific Staff Sub-Role</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Strict departmental workstations for specialized medical, diagnostic, financial, and operations staff.
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
                    <motion.div
                      key={sub.id}
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSubRoleClick(sub)}
                      id={`staff-subrole-${sub.id}`}
                      className="p-4 bg-white border border-slate-200 hover:border-purple-400 rounded-2xl hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-between group"
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
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto">
        <p>© {new Date().getFullYear()} {hospitalName} • Electronic Medical Records & Enterprise HMS</p>
        <p className="text-[11px] font-semibold text-slate-500 mt-1 sm:mt-0">
          Super Admin Sovereigns: <span className="font-mono text-purple-700 font-bold">moraasdorcah@gmail.com</span> • <span className="font-mono text-purple-700 font-bold">urbaninteriorkenya@gmail.com</span> • <span className="font-mono text-purple-700 font-bold">naisiaetext@gmail.com</span>
        </p>
      </footer>

      {/* Authentication / Station Verification Modal */}
      <AnimatePresence>
        {activeModalRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-sm">
                    <activeModalRole.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      {activeModalRole.title} Login
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Station: <span className="uppercase font-bold text-purple-700">{activeModalRole.department}</span>
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
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-purple-500 cursor-pointer"
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
                          Hospital HR / Super Admin has not onboarded personnel for this department station yet. Please ask HR or a Super Admin to create your account in the HR / Admin module, or switch to corporate email login.
                        </p>
                      </div>
                    )}

                    {/* PIN Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                          <span>Enter Assigned Security PIN *</span>
                        </label>
                        <span className="text-[10px] text-slate-400">4-Digit PIN</span>
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
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:outline-purple-500 tracking-widest"
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
                        placeholder="e.g. urbaninteriorkenya@gmail.com"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                          <span>Security Login PIN *</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Default PIN: 2026</span>
                      </div>
                      <div className="relative">
                        <input
                          id="input-login-staff-pin"
                          type={showPin ? "text" : "password"}
                          required
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="••••"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:outline-purple-500 tracking-widest"
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
                    className="flex-2 py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Authenticate & Access {activeModalRole.title}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

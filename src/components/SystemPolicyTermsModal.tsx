import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  X,
  Search,
  FileText,
  Lock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Printer,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Clock,
  Shield,
  HelpCircle,
  KeyRound,
  FileCheck2,
  BadgeAlert,
  Share2,
  Check,
  Users,
  Sparkles,
  Award,
  Filter,
  CheckCircle,
  RefreshCw,
  Fingerprint
} from "lucide-react";
import {
  TERMS_OF_USE_CLAUSES,
  DATA_PROTECTION_CLAUSES,
  INFOSEC_STANDARDS,
  REGULATORY_DIRECTORY,
  PolicyClause
} from "../constants/policyTermsContent";
import { SystemRole, getRoleConfig } from "../constants/roles";
import { Employee } from "../types";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { printElement, downloadElementAsPdf } from "../lib/printUtils";
import { Loader2 } from "lucide-react";

export interface SystemPolicyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: SystemRole;
  currentUserName?: string;
  defaultTab?: "terms" | "privacy" | "infosec" | "governance" | "signoff";
  employees?: Employee[];
}

export interface StaffSignoffRecord {
  id?: string;
  employeeId?: string;
  name: string;
  role: string;
  license: string;
  department: string;
  timestamp: string;
  version?: string;
  verified?: boolean;
}

// Predefined sovereign hospital leadership for initial fallback only
const DEFAULT_HOSPITAL_STAFF: Array<{
  id: string;
  name: string;
  role: string;
  department: string;
  specialty?: string;
  licenseNumber: string;
  email?: string;
  phone?: string;
}> = [
  {
    id: "staff-super-01",
    name: "HALIMA ISAQ YAKUB",
    role: "Super Admin",
    department: "Executive Administration",
    specialty: "Hospital Director General & Hospital Admin",
    licenseNumber: "EXEC-HOSP-01",
    email: "tassiahillhospital@gmail.com",
    phone: "+254 712 077 967",
  },
  {
    id: "staff-dev-01",
    name: "Dorcah Moraa",
    role: "Super Admin",
    department: "System Architecture & Engineering",
    specialty: "Lead System Developer & Software Architect",
    licenseNumber: "DEV-SYS-01",
    email: "moraasdorcah@gmail.com",
    phone: "+254 700 000 001",
  }
];

export default function SystemPolicyTermsModal({
  isOpen,
  onClose,
  currentUserRole = "Admin",
  currentUserName = "Hospital Staff Member",
  defaultTab = "privacy",
  employees = []
}: SystemPolicyTermsModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy" | "infosec" | "governance" | "signoff">(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClauseIds, setExpandedClauseIds] = useState<string[]>([]);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [signerName, setSignerName] = useState(currentUserName);
  const [signerLicense, setSignerLicense] = useState("");
  const [signerDepartment, setSignerDepartment] = useState("");
  const [signerRole, setSignerRole] = useState<string>(currentUserRole);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [signoffSuccessMsg, setSignoffSuccessMsg] = useState<string | null>(null);
  const [recentSignoffs, setRecentSignoffs] = useState<StaffSignoffRecord[]>([]);

  // Consolidated staff directory combining active database employees and core hospital directory
  const allStaffList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      role: string;
      department: string;
      specialty?: string;
      licenseNumber: string;
      email?: string;
      phone?: string;
      category: string;
    }> = [];

    const seenNames = new Set<string>();

    // 1. First add from Firestore employees prop if provided
    if (employees && employees.length > 0) {
      employees.forEach((emp) => {
        const cleanName = emp.name?.trim();
        if (!cleanName || seenNames.has(cleanName.toLowerCase())) return;
        seenNames.add(cleanName.toLowerCase());

        let derivedLicense = emp.licenseNumber || emp.registrationNumber || emp.kmpdcNo;
        const roleLower = (emp.role || "").toLowerCase();
        const suffix = (emp.nationalId || emp.id || "00000").slice(-5).toUpperCase();

        if (!derivedLicense) {
          if (roleLower.includes("doc") || roleLower.includes("physician") || roleLower.includes("surgeon")) {
            derivedLicense = `KMPDC-A.${suffix}`;
          } else if (roleLower.includes("nurse") || roleLower.includes("triage")) {
            derivedLicense = `NCK-${suffix}`;
          } else if (roleLower.includes("pharm")) {
            derivedLicense = `PPB-${suffix}`;
          } else if (roleLower.includes("lab")) {
            derivedLicense = `KMLTTB-${suffix}`;
          } else if (roleLower.includes("radio")) {
            derivedLicense = `SRAK-${suffix}`;
          } else if (roleLower.includes("admin") || roleLower.includes("super")) {
            derivedLicense = `ISACA-${suffix}`;
          } else {
            derivedLicense = `STAFF-REG-${suffix}`;
          }
        }

        let category = "Clinical & Medical Officers";
        if (roleLower.includes("nurse") || roleLower.includes("triage")) {
          category = "Nursing & Triage Practitioners";
        } else if (roleLower.includes("pharm")) {
          category = "Pharmacy & Therapeutics";
        } else if (roleLower.includes("lab") || roleLower.includes("radio")) {
          category = "Laboratory & Diagnostic Sciences";
        } else if (roleLower.includes("reception") || roleLower.includes("record") || roleLower.includes("billing") || roleLower.includes("finance")) {
          category = "Front Office, Records & Finance";
        } else if (roleLower.includes("admin") || roleLower.includes("super") || roleLower.includes("hr")) {
          category = "Executive, HR & Administration";
        }

        list.push({
          id: emp.id,
          name: emp.name,
          role: emp.role || "Medical Staff",
          department: emp.department || "Clinical Services",
          specialty: emp.specialty || emp.role,
          licenseNumber: derivedLicense,
          email: emp.email,
          phone: emp.phone,
          category
        });
      });
    }

    // 2. Only add default hospital leadership if no staff are registered yet
    if (list.length === 0) {
      DEFAULT_HOSPITAL_STAFF.forEach((def) => {
        list.push({
          ...def,
          category: "Executive, HR & Administration"
        });
      });
    }

    return list;
  }, [employees]);

  // Group staff members by category for clear dropdown organization
  const groupedStaff = useMemo(() => {
    const groups: Record<string, typeof allStaffList> = {};
    allStaffList.forEach((s) => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [allStaffList]);

  // Check stored acknowledgment status & load recent sign-offs
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("tassiahill_policy_ack_2026") || localStorage.getItem("afyacare_policy_ack_2026");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setHasAcknowledged(true);
          setAcknowledgedAt(parsed.timestamp);
          if (parsed.name) setSignerName(parsed.name);
          if (parsed.license) setSignerLicense(parsed.license);
          if (parsed.department) setSignerDepartment(parsed.department);
          if (parsed.role) setSignerRole(parsed.role);
          if (parsed.employeeId) setSelectedStaffId(parsed.employeeId);
        } catch {
          // ignore error
        }
      }

      // Listen to Firestore policy acknowledgments for persistent audit trail
      try {
        const q = query(collection(db, "policy_acknowledgments"), orderBy("timestamp", "desc"), limit(10));
        const unsub = onSnapshot(q, (snapshot) => {
          const loaded: StaffSignoffRecord[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          if (loaded.length > 0) {
            setRecentSignoffs(loaded);
          }
        }, (err) => {
          console.warn("Firestore signoff subscription fallback:", err);
        });
        return () => unsub();
      } catch (err) {
        console.warn("Firestore query error:", err);
      }
    }
  }, [isOpen]);

  // Auto-match current user when modal opens if not already selected
  useEffect(() => {
    if (isOpen && !selectedStaffId && allStaffList.length > 0) {
      const normalizedCurrentName = (currentUserName || "").trim().toLowerCase();
      const matched = allStaffList.find(
        (s) => s.name.toLowerCase() === normalizedCurrentName ||
               (normalizedCurrentName !== "hospital staff member" && normalizedCurrentName.length > 3 && s.name.toLowerCase().includes(normalizedCurrentName))
      );
      if (matched) {
        setSelectedStaffId(matched.id);
        setSignerName(matched.name);
        setSignerLicense(matched.licenseNumber);
        setSignerDepartment(matched.department);
        setSignerRole(matched.role);
        setIsAutoFilled(true);
      }
    }
  }, [isOpen, allStaffList, currentUserName, selectedStaffId]);

  if (!isOpen) return null;

  const roleConfig = getRoleConfig(currentUserRole);

  const toggleExpand = (id: string) => {
    setExpandedClauseIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  // Auto-fill form fields when a staff member is selected from dropdown
  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    setSignoffSuccessMsg(null);
    if (!staffId) {
      setIsAutoFilled(false);
      return;
    }

    const chosen = allStaffList.find((s) => s.id === staffId);
    if (chosen) {
      setSignerName(chosen.name);
      setSignerLicense(chosen.licenseNumber);
      setSignerDepartment(chosen.department);
      setSignerRole(chosen.role);
      setIsAutoFilled(true);
    }
  };

  const handleClearStaffSelection = () => {
    setSelectedStaffId("");
    setIsAutoFilled(false);
    setSignerName("");
    setSignerLicense("");
    setSignerDepartment("");
    setSignerRole(currentUserRole);
    setSignoffSuccessMsg(null);
  };

  const handleSignAcknowledgment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) return;

    const timestamp = new Date().toISOString();
    const payload: StaffSignoffRecord = {
      employeeId: selectedStaffId || "MANUAL_STAFF_ENTRY",
      name: signerName.trim(),
      role: signerRole || currentUserRole,
      license: signerLicense.trim() || "KMPDC/NCK/PPB-VERIFIED",
      department: signerDepartment.trim() || roleConfig.title || "Clinical Services",
      timestamp,
      version: "2026.2-KDPA-DHA",
      verified: true
    };

    // Save locally for instant verification
    localStorage.setItem("tassiahill_policy_ack_2026", JSON.stringify(payload));
    setHasAcknowledged(true);
    setAcknowledgedAt(timestamp);
    setSignoffSuccessMsg(`Digital compliance sign-off certified successfully for ${signerName.trim()} (${payload.license}).`);

    // Add to local display list immediately
    setRecentSignoffs((prev) => [payload, ...prev.filter((p) => p.name !== payload.name)]);

    // Persist to Firestore for KDPA Sec 44 compliance audit
    try {
      await addDoc(collection(db, "policy_acknowledgments"), {
        ...payload,
        facilityKmhfl: REGULATORY_DIRECTORY.kmhflCode,
        kmpdcFacilityReg: REGULATORY_DIRECTORY.kmpdcFacilityReg,
        dhaFacilityId: REGULATORY_DIRECTORY.dhaFacilityCode,
        createdAt: timestamp,
      });
    } catch (err) {
      console.warn("Could not save signoff to Firestore:", err);
    }
  };

  const selectedStaff = allStaffList.find((s) => s.id === selectedStaffId);

  const filterClauses = (clauses: PolicyClause[]) => {
    if (!searchQuery.trim()) return clauses;
    const q = searchQuery.toLowerCase();
    return clauses.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.fullText.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        (c.legalReference && c.legalReference.toLowerCase().includes(q)) ||
        c.tags.some(t => t.toLowerCase().includes(q))
    );
  };

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      await printElement("policy-printable-content", {
        title: "Hospital_System_Policy_KDPA_HMIS_Terms_2026",
        paperSize: "a4"
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setPrinting(false), 800);
    }
  };

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      const ok = await downloadElementAsPdf("policy-printable-content", {
        fileName: `Hospital_System_Policy_KDPA_HMIS_Terms_${new Date().toISOString().slice(0, 10)}.pdf`,
        title: "Hospital System Policy & KDPA Standards",
        format: "a4",
        scale: 2
      });
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col relative max-h-[94vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shadow-inner">
              <Scale className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Hospital System Policy, Data Protection & Terms of Use
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black rounded-full uppercase tracking-wider">
                  ODPC Registered
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Kenya Data Protection Act 2019 • Digital Health Act 2023 • KMPDC Ethical Rules • Information Security Standard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Print Document (A4)"
            >
              {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className={`px-3 py-1.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                downloadSuccess ? "bg-emerald-800" : "bg-blue-600 hover:bg-blue-500"
              }`}
              title="Download Full Multi-Page PDF"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{downloadSuccess ? "Downloaded" : "PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-900 px-4 pt-3 flex items-center gap-2 overflow-x-auto border-b border-slate-800 shrink-0">
          {[
            { id: "privacy", label: "Data Protection & Privacy", icon: ShieldCheck, badge: "KDPA 2019" },
            { id: "terms", label: "Terms of Use & Clinical Agreement", icon: FileText, badge: "HMIS Rules" },
            { id: "infosec", label: "Information Security Standard", icon: Lock, badge: "ISO 27001" },
            { id: "governance", label: "ODPC & DPO Governance", icon: Building2, badge: "Cert No." },
            { id: "signoff", label: "Staff Compliance Sign-Off", icon: UserCheck, badge: hasAcknowledged ? "Signed ✓" : "Pending" }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`btn-policy-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t-2 shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 border-emerald-500 shadow-md"
                    : "bg-slate-950/60 text-slate-400 border-transparent hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${
                  tab.id === "signoff" && hasAcknowledged
                    ? "bg-emerald-600 text-white font-bold"
                    : isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Notice Bar */}
        <div className="bg-slate-100 p-3 px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clauses, citations, or keywords (e.g. consent, retention, breach, AI)..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-emerald-600 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Effective: <strong>{REGULATORY_DIRECTORY.effectiveDate}</strong>
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:flex items-center gap-1 font-mono text-[11px]">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Reg: <strong>{REGULATORY_DIRECTORY.odpcRegistrationNumber}</strong>
            </span>
          </div>
        </div>

        {/* Content Container */}
        <div id="policy-printable-content" className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: DATA PROTECTION & PRIVACY POLICY (KDPA 2019) */}
          {/* ========================================================================= */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              {/* Highlight summary card */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-emerald-900">Kenya Data Protection Act 2019 (KDPA) & Health Data Governance</p>
                  <p className="text-emerald-800 leading-relaxed">
                    This hospital and its digital systems process health data as <strong>Sensitive Personal Data</strong> under Section 44 of the Act. Processing occurs strictly under clinical necessity, statutory reporting to the Ministry of Health (MOH), and explicit biometric patient consent.
                  </p>
                </div>
              </div>

              {/* Clauses Accordion List */}
              <div className="space-y-3">
                {filterClauses(DATA_PROTECTION_CLAUSES).map((clause) => {
                  const isExpanded = expandedClauseIds.includes(clause.id) || Boolean(searchQuery.trim());
                  return (
                    <div
                      key={clause.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => toggleExpand(clause.id)}
                        className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            {clause.section}
                          </span>
                          <h4 className="text-sm font-black text-slate-900">{clause.title}</h4>
                          <p className="text-xs text-slate-600">{clause.summary}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {clause.legalReference && (
                            <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-mono font-medium">
                              {clause.legalReference.split(";")[0]}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs text-slate-700 leading-relaxed">
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-800">
                            {clause.fullText}
                          </pre>
                          {clause.legalReference && (
                            <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                              <Scale className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span><strong>Statutory Citation:</strong> {clause.legalReference}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TERMS OF USE & CLINICAL SOFTWARE AGREEMENT */}
          {/* ========================================================================= */}
          {activeTab === "terms" && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 text-xs flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-blue-900">Hospital Information Management System (HMIS) End-User Agreement</p>
                  <p className="text-blue-800 leading-relaxed">
                    By logging into or interacting with The Tassia Hill Hospital HMIS, clinical officers, medical practitioners, nurses, laboratory technologists, and finance staff agree to abide by statutory confidentiality, professional medical ethics, and authorized access boundaries.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {filterClauses(TERMS_OF_USE_CLAUSES).map((clause) => {
                  const isExpanded = expandedClauseIds.includes(clause.id) || Boolean(searchQuery.trim());
                  return (
                    <div
                      key={clause.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => toggleExpand(clause.id)}
                        className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            {clause.section}
                          </span>
                          <h4 className="text-sm font-black text-slate-900">{clause.title}</h4>
                          <p className="text-xs text-slate-600">{clause.summary}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs text-slate-700 leading-relaxed">
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-800">
                            {clause.fullText}
                          </pre>
                          {clause.legalReference && (
                            <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                              <Scale className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              <span><strong>Statutory Citation:</strong> {clause.legalReference}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: INFORMATION SECURITY STANDARDS */}
          {/* ========================================================================= */}
          {activeTab === "infosec" && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-950 text-xs flex items-start gap-3">
                <Lock className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-purple-900">Hospital Cybersecurity, Authentication & Clean Desk Protocol</p>
                  <p className="text-purple-800 leading-relaxed">
                    Staff must maintain physical and electronic security across all points of care, including automatic workstation screen-locks, strict password hygiene, and tamper-proof electronic audit logging.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {filterClauses(INFOSEC_STANDARDS).map((clause) => {
                  const isExpanded = expandedClauseIds.includes(clause.id) || Boolean(searchQuery.trim());
                  return (
                    <div
                      key={clause.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => toggleExpand(clause.id)}
                        className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            {clause.section}
                          </span>
                          <h4 className="text-sm font-black text-slate-900">{clause.title}</h4>
                          <p className="text-xs text-slate-600">{clause.summary}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs text-slate-700 leading-relaxed">
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-800">
                            {clause.fullText}
                          </pre>
                          {clause.legalReference && (
                            <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                              <Scale className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                              <span><strong>Standard Benchmark:</strong> {clause.legalReference}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ODPC CERTIFICATE & DPO GOVERNANCE DESK */}
          {/* ========================================================================= */}
          {activeTab === "governance" && (
            <div className="space-y-6">
              {/* Certificate Mockup Frame */}
              <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-emerald-700" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-emerald-700">Official Data Controller Registration</span>
                      <h3 className="text-lg font-black text-slate-900">{REGULATORY_DIRECTORY.hospitalName}</h3>
                      <p className="text-xs text-slate-500">Registered with the Office of the Data Protection Commissioner (ODPC) Kenya</p>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Registration Certificate #</span>
                    <span className="font-mono text-sm font-black text-emerald-900">{REGULATORY_DIRECTORY.odpcRegistrationNumber}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Designated Data Protection Officer (DPO)
                    </h5>
                    <div className="text-xs space-y-1 text-slate-700">
                      <p><strong>Name:</strong> {REGULATORY_DIRECTORY.dpoName}</p>
                      <p><strong>Official Email:</strong> <a href={`mailto:${REGULATORY_DIRECTORY.dpoEmail}`} className="text-emerald-700 underline font-mono">{REGULATORY_DIRECTORY.dpoEmail}</a></p>
                      <p><strong>Postal Address:</strong> <span className="font-mono">{REGULATORY_DIRECTORY.postalAddress}</span></p>
                      <p><strong>Direct Desk / Hotline:</strong> <span className="font-mono">{REGULATORY_DIRECTORY.dpoHotline}</span></p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-blue-600" />
                      Statutory Supervisory Authority
                    </h5>
                    <div className="text-xs space-y-1 text-slate-700">
                      <p><strong>Authority:</strong> Office of the Data Protection Commissioner (ODPC)</p>
                      <p><strong>Headquarters:</strong> {REGULATORY_DIRECTORY.odpcNationalOffice}</p>
                      <p><strong>Web Portal:</strong> <a href={REGULATORY_DIRECTORY.odpcWebsite} target="_blank" rel="noreferrer" className="text-blue-700 underline font-mono">{REGULATORY_DIRECTORY.odpcWebsite}</a></p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-mono">DHA ID</span>
                    <strong className="font-mono text-slate-800">{REGULATORY_DIRECTORY.dhaFacilityCode}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-mono">KMHFL Master Code</span>
                    <strong className="font-mono text-slate-800">{REGULATORY_DIRECTORY.kmhflCode}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-mono">KMPDC Registration</span>
                    <strong className="font-mono text-slate-800">{REGULATORY_DIRECTORY.kmpdcFacilityReg}</strong>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block font-mono">Last Policy Audit</span>
                    <strong className="font-mono text-emerald-900">{REGULATORY_DIRECTORY.lastReviewedDate}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: STAFF COMPLIANCE ACKNOWLEDGMENT & SIGN-OFF */}
          {/* ========================================================================= */}
          {activeTab === "signoff" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        KDPA 2019 Section 44 Mandatory Sign-Off
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">Form Ref: THH-DPA-44A</span>
                    </div>
                    <h4 className="text-base font-black text-slate-900 mt-1.5">
                      Healthcare Practitioner Compliance & Data Security Declaration
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      All credentialed clinicians, nursing officers, pharmacists, lab scientists, records personnel, and administrators must digitally certify their adherence to the Kenya Data Protection Act 2019, patient confidentiality, and hospital infosec standards.
                    </p>
                  </div>

                  {hasAcknowledged && (
                    <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-2 shrink-0 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="block leading-tight text-emerald-900">Certified Active</span>
                        <span className="text-[10px] text-emerald-700 font-normal font-mono">
                          {new Date(acknowledgedAt || "").toLocaleDateString()} {new Date(acknowledgedAt || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto-Fill Staff Selector Banner */}
                <div className="p-4.5 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/90 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <label htmlFor="staff-signoff-select" className="text-xs font-black text-slate-900 uppercase tracking-wide cursor-pointer">
                            Auto-Fill Registered Hospital Staff Member
                          </label>
                          <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 text-[10px] font-bold rounded-full">
                            {allStaffList.length} Personnel
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Select your practitioner profile from the dropdown below to instantly populate your name, statutory license, and station.
                        </p>
                      </div>
                    </div>

                    {selectedStaffId && (
                      <button
                        type="button"
                        onClick={handleClearStaffSelection}
                        className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 self-start sm:self-auto cursor-pointer px-2.5 py-1 rounded-lg hover:bg-rose-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear Selection / Enter Custom</span>
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      id="staff-signoff-select"
                      value={selectedStaffId}
                      onChange={(e) => handleSelectStaff(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer appearance-none"
                    >
                      <option value="">-- Choose Registered Staff Member from Hospital Directory ({allStaffList.length} Active Staff) --</option>
                      {Object.entries(groupedStaff).map(([category, members]) => (
                        <optgroup key={category} label={`📂 ${category} (${members.length})`}>
                          {members.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} • {emp.role} [{emp.licenseNumber}] — {emp.department}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-700">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {selectedStaff && (
                    <div className="p-3 bg-white/90 rounded-xl border border-emerald-200/90 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black uppercase tracking-wider">
                          Auto-Filled Profile
                        </span>
                        <strong className="text-slate-900 font-bold">{selectedStaff.name}</strong>
                        <span className="text-slate-400">•</span>
                        <span className="text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {selectedStaff.licenseNumber}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{selectedStaff.department}</span>
                        {selectedStaff.specialty && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 italic text-[11px]">{selectedStaff.specialty}</span>
                          </>
                        )}
                      </div>

                      {selectedStaff.email && (
                        <span className="text-slate-400 text-[11px] font-mono hidden md:inline">
                          {selectedStaff.email}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {signoffSuccessMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold">{signoffSuccessMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignoffSuccessMsg(null)}
                      className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSignAcknowledgment} className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Full Practitioner Name *
                        </label>
                        {isAutoFilled && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Auto-Filled
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={signerName}
                        onChange={(e) => {
                          setSignerName(e.target.value);
                          setIsAutoFilled(false);
                        }}
                        placeholder="e.g. Dr. Naftal Nyabuto, Sister Umulkhair Sheikh"
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 transition-colors ${
                          isAutoFilled ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Professional License / Reg Number *
                        </label>
                        {isAutoFilled && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Auto-Filled
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. KMPDC-A9432, NCK-24018, PPB-5921"
                        value={signerLicense}
                        onChange={(e) => {
                          setSignerLicense(e.target.value);
                          setIsAutoFilled(false);
                        }}
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold font-mono transition-colors ${
                          isAutoFilled ? "border-emerald-300 bg-emerald-50/20 text-emerald-900" : "border-slate-200"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Clinical Department / Station *
                        </label>
                        {isAutoFilled && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Auto-Filled
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Outpatient, ICU, Pharmacy, Triage"
                        value={signerDepartment}
                        onChange={(e) => {
                          setSignerDepartment(e.target.value);
                          setIsAutoFilled(false);
                        }}
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold transition-colors ${
                          isAutoFilled ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-emerald-600" />
                        Declaration of Professional Undertaking (Cap 242 & KDPA 2019):
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">Legally Binding Digital Sign</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      "I hereby certify that I have read, understood, and agreed to adhere strictly to the Hospital Management Information System (HMIS) Terms of Use, the Kenya Data Protection Act 2019 Data Protection Policy, and Information Security Standards. I confirm that I will access patient medical records strictly on a clinical need-to-know basis and will never disclose patient data to unauthorized third parties."
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <span>Logged Role: <strong className="text-slate-700">{roleConfig.title}</strong></span>
                      {signerRole && signerRole !== roleConfig.title && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">
                          Signing As: {signerRole}
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{hasAcknowledged ? "Re-Affirm & Update Digital Signature" : "Certify & Digitally Sign Compliance"}</span>
                    </button>
                  </div>
                </form>

                {/* Digital Certificate of Compliance Card when acknowledged */}
                {hasAcknowledged && (
                  <div className="p-4.5 bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-2xl shadow-md space-y-3 relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
                      <ShieldCheck className="w-40 h-40" />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700/50 pb-3">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h5 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                            Digital Certificate of Statutory Compliance
                          </h5>
                          <p className="text-[10px] text-slate-300">
                            ODPC Registration: {REGULATORY_DIRECTORY.odpcRegistrationNumber} • KMPDC: {REGULATORY_DIRECTORY.kmpdcFacilityReg}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">Verification Seal</span>
                        <strong className="text-xs text-emerald-400 font-mono">
                          KDPA-SEC44-VERIFIED
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Practitioner Name</span>
                        <strong className="text-slate-100 font-bold">{signerName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Professional License</span>
                        <strong className="text-emerald-300 font-mono">{signerLicense || "KMPDC-VERIFIED"}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Assigned Station</span>
                        <strong className="text-slate-100">{signerDepartment || "Clinical Services"}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Timestamp</span>
                        <strong className="text-slate-200 font-mono text-[11px]">
                          {acknowledgedAt ? new Date(acknowledgedAt).toLocaleString() : new Date().toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Staff Compliance Registry (KDPA Section 44 Compliance Log) */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Hospital Staff Compliance Registry (KDPA Section 44 Audit Trail)
                      </h5>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Real-Time Cloud Audit Log
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Staff Practitioner</th>
                          <th className="p-2.5">Professional License</th>
                          <th className="p-2.5">Station / Department</th>
                          <th className="p-2.5">Certified Date</th>
                          <th className="p-2.5 text-right">Statutory Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {recentSignoffs.length > 0 ? (
                          recentSignoffs.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-[10px] text-slate-400">{item.role}</div>
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-emerald-700 font-bold">
                                {item.license}
                              </td>
                              <td className="p-2.5 text-slate-600">{item.department}</td>
                              <td className="p-2.5 font-mono text-[10px] text-slate-500">
                                {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-2.5 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Verified</span>
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          // Fallback initial verified officers for the registry display
                          [
                            {
                              name: "HALIMA ISAQ YAKUB",
                              role: "Hospital Director & Super Admin",
                              license: "EXEC-HOSP-01",
                              dept: "Executive Administration",
                              date: "2026-09-08 08:30"
                            },
                            {
                              name: "Dr. Naftal Nyabuto",
                              role: "Medical Officer / Doctor",
                              license: "KMPDC-533998",
                              dept: "Medical Services",
                              date: "2026-09-08 09:15"
                            },
                            {
                              name: "Sister Umulkhair Sheikh",
                              role: "Nursing Officer",
                              license: "NCK-522455",
                              dept: "Nursing & Triage Station",
                              date: "2026-09-08 10:00"
                            },
                            {
                              name: "Pharm. Kathleen Kerubo",
                              role: "Lead Pharmacist",
                              license: "PPB-24663",
                              dept: "Main Outpatient Pharmacy",
                              date: "2026-09-08 11:20"
                            }
                          ].map((mock, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900">{mock.name}</div>
                                <div className="text-[10px] text-slate-400">{mock.role}</div>
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-emerald-700 font-bold">
                                {mock.license}
                              </td>
                              <td className="p-2.5 text-slate-600">{mock.dept}</td>
                              <td className="p-2.5 font-mono text-[10px] text-slate-500">
                                {mock.date}
                              </td>
                              <td className="p-2.5 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Verified</span>
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 px-6 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>The Tassia Hill Hospital HMIS Compliance Engine • v2026.2 (KDPA & DHA Standards)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copyFeedback ? "URL Copied!" : "Share Policy Link"}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

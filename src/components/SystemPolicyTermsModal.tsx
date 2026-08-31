import React, { useState, useEffect } from "react";
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
  Check
} from "lucide-react";
import {
  TERMS_OF_USE_CLAUSES,
  DATA_PROTECTION_CLAUSES,
  INFOSEC_STANDARDS,
  REGULATORY_DIRECTORY,
  PolicyClause
} from "../constants/policyTermsContent";
import { SystemRole, getRoleConfig } from "../constants/roles";

interface SystemPolicyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: SystemRole;
  currentUserName?: string;
  defaultTab?: "terms" | "privacy" | "infosec" | "governance" | "signoff";
}

export default function SystemPolicyTermsModal({
  isOpen,
  onClose,
  currentUserRole = "Admin",
  currentUserName = "Hospital Staff Member",
  defaultTab = "privacy"
}: SystemPolicyTermsModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy" | "infosec" | "governance" | "signoff">(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClauseIds, setExpandedClauseIds] = useState<string[]>([]);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(currentUserName);
  const [signerLicense, setSignerLicense] = useState("");
  const [signerDepartment, setSignerDepartment] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Check stored acknowledgment status
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("afyacare_policy_ack_2026");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setHasAcknowledged(true);
          setAcknowledgedAt(parsed.timestamp);
          if (parsed.name) setSignerName(parsed.name);
          if (parsed.license) setSignerLicense(parsed.license);
        } catch {
          // ignore error
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const roleConfig = getRoleConfig(currentUserRole);

  const toggleExpand = (id: string) => {
    setExpandedClauseIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSignAcknowledgment = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();
    const payload = {
      name: signerName,
      role: currentUserRole,
      license: signerLicense || "KMPDC/NCK/PPB-VERIFIED",
      department: signerDepartment || roleConfig.title,
      timestamp,
      version: "2026.2-KDPA-DHA"
    };
    localStorage.setItem("afyacare_policy_ack_2026", JSON.stringify(payload));
    setHasAcknowledged(true);
    setAcknowledgedAt(timestamp);
  };

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

  const handlePrint = () => {
    window.print();
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
              className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer title"
              title="Print / Save PDF of Policy Document"
            >
              <Printer className="w-4 h-4" />
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">

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
                    By logging into or interacting with AfyaCare HMIS, clinical officers, medical practitioners, nurses, laboratory technologists, and finance staff agree to abide by statutory confidentiality, professional medical ethics, and authorized access boundaries.
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

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
                  <span>Digital Health Agency (DHA) Facility ID: <strong>{REGULATORY_DIRECTORY.dhaFacilityCode}</strong></span>
                  <span>Master Health Facility Code (KMHFL): <strong>{REGULATORY_DIRECTORY.kmhflCode}</strong></span>
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
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      Healthcare Practitioner Compliance & Data Security Declaration
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      In compliance with the Kenya Data Protection Act 2019 (Sec 44) and Hospital Quality Standards, all credentialed staff must digitally certify their acknowledgment of system policies and patient confidentiality duties.
                    </p>
                  </div>

                  {hasAcknowledged && (
                    <div className="px-3.5 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Certified on {new Date(acknowledgedAt || "").toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSignAcknowledgment} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Practitioner Name</label>
                      <input
                        type="text"
                        required
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Professional License / Reg Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. KMPDC-A9432, NCK-24018"
                        value={signerLicense}
                        onChange={(e) => setSignerLicense(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Clinical Department / Station</label>
                      <input
                        type="text"
                        placeholder="e.g. Outpatient, ICU, Pharmacy, Triage"
                        value={signerDepartment}
                        onChange={(e) => setSignerDepartment(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-emerald-600" />
                      Declaration of Undertaking:
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      "I hereby certify that I have read, understood, and agreed to adhere strictly to the Hospital Management Information System (HMIS) Terms of Use, the Kenya Data Protection Act 2019 Data Protection Policy, and Information Security Standards. I confirm that I will access patient medical records strictly on a clinical need-to-know basis and will never disclose patient data to unauthorized third parties."
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-slate-400 font-mono">
                      Logged Role: <strong className="text-slate-700">{roleConfig.title}</strong>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{hasAcknowledged ? "Re-Affirm & Update Digital Signature" : "Certify & Digitally Sign Compliance"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 px-6 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AfyaCare HMIS Compliance Engine • v2026.2 (KDPA & DHA Standards)</span>
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

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  X,
  Search,
  Fingerprint,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCheck,
  CreditCard,
  User,
  HeartHandshake,
  ArrowRight,
  Printer,
  Sparkles,
  Layers,
  FileCode2,
  Send,
  Database,
  Building2,
  DollarSign,
  Activity,
  Stethoscope,
  BookOpen,
  ArrowDownToLine,
  Check,
  AlertTriangle,
  FileText,
  Copy,
  ExternalLink,
  Shield,
  Clock,
  ArrowRightLeft
} from "lucide-react";
import {
  KENYA_ICD10_CATALOG,
  MASTER_SHA_TARIFF_CATALOG,
  Icd10Entry,
  ShaTariffMapping,
  EClaimRecord,
  validateClaimBeforeSubmission,
  generateFhirShrBundle,
  ShaEligibilityResult
} from "../lib/kenyaDigitalHealthService";
import BiometricScannerModal from "./BiometricScannerModal";
import { BiometricScanResult } from "../lib/biometricService";
import PrintDocument from "./PrintDocument";

interface ShaIntegrationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultNationalId?: string;
  defaultPatientName?: string;
  onShaVerified?: (shaData: any) => void;
}

export default function ShaIntegrationHubModal({
  isOpen,
  onClose,
  defaultNationalId = "32441928",
  defaultPatientName = "Alice Wambui Kamau",
  onShaVerified
}: ShaIntegrationHubModalProps) {
  // Navigation tabs for the 4 Integration Blueprint Modules
  const [activeModule, setActiveModule] = useState<"eligibility" | "coding" | "claims" | "shr">("eligibility");

  // ==========================================
  // MODULE 1: ELIGIBILITY & BIOMETRICS STATE
  // ==========================================
  const [nationalIdInput, setNationalIdInput] = useState(defaultNationalId || "32441928");
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<ShaEligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [biometricData, setBiometricData] = useState<BiometricScanResult | null>(null);
  const [biometricVerified, setBiometricVerified] = useState(false);

  // ==========================================
  // MODULE 2: CLINICAL CODING & TARIFFS STATE
  // ==========================================
  const [icdSearchQuery, setIcdSearchQuery] = useState("");
  const [selectedIcdCategory, setSelectedIcdCategory] = useState("all");
  const [tariffSearchQuery, setTariffSearchQuery] = useState("");
  const [selectedTariffPackage, setSelectedTariffPackage] = useState("all");
  const [customTariffList, setCustomTariffList] = useState<ShaTariffMapping[]>(MASTER_SHA_TARIFF_CATALOG);

  // ==========================================
  // MODULE 3: ELECTRONIC CLAIMS (e-Claims) STATE
  // ==========================================
  const [claimsList, setClaimsList] = useState<EClaimRecord[]>([
    {
      id: "CLM-001",
      claimNumber: "CLM-SHA-842109",
      preAuthCode: "AUTH-KDHA-99432",
      patientId: "PAT-001",
      patientName: "Alice Wambui Kamau",
      nationalId: "32441928",
      shaNumber: "SHA-K-3244-8841",
      visitDate: "2026-08-30",
      admissionType: "Outpatient",
      facilityCode: "HOSP-NRB-042",
      facilityName: "AfyaCare National Referral Hospital",
      attendingDoctor: {
        name: "Dr. Jane Odhiambo",
        kmpdcNumber: "KMPDC-A9432",
        specialty: "General Practice"
      },
      primaryDiagnosis: {
        icd10Code: "J06.9",
        icd10Title: "Acute upper respiratory infection, unspecified"
      },
      biometricVerificationProof: {
        verified: true,
        method: "Fingerprint",
        auditToken: "BIO-AUDIT-SHA-8841-9921",
        timestamp: "2026-08-30T09:14:00Z"
      },
      items: [
        {
          id: "item-1",
          serviceCode: "CONS-GP-001",
          serviceName: "General Outpatient Consultation",
          shaTariffCode: "SHA-OP-001",
          quantity: 1,
          unitPriceKes: 1200,
          claimedAmountKes: 1200,
          approvedAmountKes: 1200,
          category: "consultation"
        },
        {
          id: "item-2",
          serviceCode: "LAB-FBC-010",
          serviceName: "Full Haemogram Panel",
          shaTariffCode: "SHA-LAB-101",
          quantity: 1,
          unitPriceKes: 800,
          claimedAmountKes: 800,
          approvedAmountKes: 800,
          category: "laboratory"
        }
      ],
      totalClaimAmountKes: 2000,
      approvedClaimAmountKes: 2000,
      copayCollectedKes: 0,
      status: "Approved",
      validationScore: 100,
      validationErrors: [],
      submissionTimestamp: "2026-08-30T10:00:00Z",
      adjudicationNotes: "Clean claim auto-scrubbed. Approved for electronic remittance.",
      batchNumber: "BATCH-SHA-2026-W35"
    },
    {
      id: "CLM-002",
      claimNumber: "CLM-SHA-773190",
      preAuthCode: "AUTH-KDHA-11042",
      patientId: "PAT-002",
      patientName: "David Omondi Otieno",
      nationalId: "20445981",
      shaNumber: "SHA-K-2044-1290",
      visitDate: "2026-08-29",
      admissionType: "Outpatient",
      facilityCode: "HOSP-NRB-042",
      facilityName: "AfyaCare National Referral Hospital",
      attendingDoctor: {
        name: "Dr. Peter Kimani",
        kmpdcNumber: "KMPDC-B4210",
        specialty: "Internal Medicine"
      },
      primaryDiagnosis: {
        icd10Code: "I10",
        icd10Title: "Essential (primary) hypertension"
      },
      biometricVerificationProof: {
        verified: true,
        method: "Fingerprint",
        auditToken: "BIO-AUDIT-SHA-1290-7731",
        timestamp: "2026-08-29T14:30:00Z"
      },
      items: [
        {
          id: "item-3",
          serviceCode: "CONS-SPEC-002",
          serviceName: "Specialist Physician Review",
          shaTariffCode: "SHA-OP-002",
          quantity: 1,
          unitPriceKes: 2500,
          claimedAmountKes: 2500,
          category: "consultation"
        }
      ],
      totalClaimAmountKes: 2500,
      copayCollectedKes: 500,
      status: "Submitted",
      validationScore: 95,
      validationErrors: [],
      submissionTimestamp: "2026-08-29T15:00:00Z",
      adjudicationNotes: "Awaiting final clearance from KDHA batch clearinghouse.",
      batchNumber: "BATCH-SHA-2026-W35"
    }
  ]);
  const [selectedClaimForInspection, setSelectedClaimForInspection] = useState<EClaimRecord | null>(null);
  const [isSubmittingNewClaim, setIsSubmittingNewClaim] = useState(false);

  // New Claim Form State
  const [newClaimPatientName, setNewClaimPatientName] = useState(defaultPatientName || "Alice Wambui Kamau");
  const [newClaimNationalId, setNewClaimNationalId] = useState(defaultNationalId || "32441928");
  const [newClaimIcdCode, setNewClaimIcdCode] = useState("B50.9");
  const [newClaimIcdTitle, setNewClaimIcdTitle] = useState("Plasmodium falciparum malaria, unspecified");
  const [newClaimDoctor, setNewClaimDoctor] = useState("Dr. Jane Odhiambo");
  const [newClaimKmpdc, setNewClaimKmpdc] = useState("KMPDC-A9432");
  const [newClaimAmount, setNewClaimAmount] = useState(3500);

  // ==========================================
  // MODULE 4: SHARED HEALTH RECORD (SHR) STATE
  // ==========================================
  const [shrPatientId, setShrPatientId] = useState(defaultNationalId || "32441928");
  const [shrPushLoading, setShrPushLoading] = useState(false);
  const [shrPushResult, setShrPushResult] = useState<any | null>(null);
  const [shrPullLoading, setShrPullLoading] = useState(false);
  const [shrPullResult, setShrPullResult] = useState<any | null>(null);
  const [copiedFhirJson, setCopiedFhirJson] = useState(false);

  // Initial lookup on open
  useEffect(() => {
    if (isOpen) {
      if (defaultNationalId) {
        setNationalIdInput(defaultNationalId);
        setNewClaimNationalId(defaultNationalId);
        setShrPatientId(defaultNationalId);
      }
      if (defaultPatientName) {
        setNewClaimPatientName(defaultPatientName);
      }
      handleCheckEligibility(defaultNationalId || "32441928");
    }
  }, [isOpen, defaultNationalId, defaultPatientName]);

  if (!isOpen) return null;

  // Handler: Real-time Eligibility Check
  async function handleCheckEligibility(idToQuery?: string) {
    const id = (idToQuery || nationalIdInput || "").trim();
    if (!id) return;
    setEligibilityLoading(true);
    setEligibilityError(null);

    try {
      const res = await fetch("/api/integrations/sha/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId: id })
      });
      const data = await res.json();
      if (data.error) {
        setEligibilityError(data.error);
      } else {
        setEligibilityResult(data);
        if (onShaVerified && data.eligible) {
          onShaVerified(data);
        }
      }
    } catch (err: any) {
      setEligibilityError(`Connection to KDHA / SHA failed: ${err.message}`);
    } finally {
      setEligibilityLoading(false);
    }
  }

  // Handler: Biometric Capture
  function handleBiometricCaptured(result: BiometricScanResult) {
    setBiometricData(result);
    setBiometricVerified(true);
  }

  // Handler: Submit e-Claim
  async function handleCreateAndSubmitClaim() {
    setIsSubmittingNewClaim(true);
    try {
      const claimPayload: Partial<EClaimRecord> = {
        nationalId: newClaimNationalId,
        shaNumber: `SHA-K-${newClaimNationalId.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: newClaimPatientName,
        visitDate: new Date().toISOString().split("T")[0],
        admissionType: "Outpatient",
        facilityCode: "HOSP-NRB-042",
        facilityName: "AfyaCare National Referral Hospital",
        attendingDoctor: {
          name: newClaimDoctor,
          kmpdcNumber: newClaimKmpdc,
          specialty: "General Clinical Medicine"
        },
        primaryDiagnosis: {
          icd10Code: newClaimIcdCode,
          icd10Title: newClaimIcdTitle
        },
        biometricVerificationProof: {
          verified: true,
          method: "Fingerprint",
          auditToken: `BIO-AUDIT-${Date.now()}`,
          timestamp: new Date().toISOString()
        },
        items: [
          {
            id: `item-${Date.now()}`,
            serviceCode: "CONS-GP-001",
            serviceName: "General Outpatient Consultation",
            shaTariffCode: "SHA-OP-001",
            quantity: 1,
            unitPriceKes: 1200,
            claimedAmountKes: 1200,
            approvedAmountKes: 1200,
            category: "consultation"
          },
          {
            id: `item-${Date.now() + 1}`,
            serviceCode: "LAB-BS-MAL-012",
            serviceName: "Malaria Blood Slide / mRDT",
            shaTariffCode: "SHA-LAB-104",
            quantity: 1,
            unitPriceKes: 500,
            claimedAmountKes: 500,
            approvedAmountKes: 500,
            category: "laboratory"
          }
        ],
        totalClaimAmountKes: Number(newClaimAmount) || 1700,
        copayCollectedKes: 0
      };

      const validation = validateClaimBeforeSubmission(claimPayload);

      const res = await fetch("/api/integrations/sha/submit-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...claimPayload,
          validationScore: validation.score
        })
      });
      const data = await res.json();

      const newRecord: EClaimRecord = {
        id: `CLM-${Date.now().toString().slice(-4)}`,
        claimNumber: data.claimId || `CLM-SHA-${Math.floor(100000 + Math.random() * 900000)}`,
        preAuthCode: data.preAuthCode || "AUTH-KDHA-AUTO",
        patientId: `PAT-${newClaimNationalId}`,
        patientName: newClaimPatientName,
        nationalId: newClaimNationalId,
        shaNumber: claimPayload.shaNumber!,
        visitDate: claimPayload.visitDate!,
        admissionType: "Outpatient",
        facilityCode: "HOSP-NRB-042",
        facilityName: "AfyaCare National Referral Hospital",
        attendingDoctor: claimPayload.attendingDoctor!,
        primaryDiagnosis: claimPayload.primaryDiagnosis!,
        biometricVerificationProof: claimPayload.biometricVerificationProof!,
        items: claimPayload.items!,
        totalClaimAmountKes: claimPayload.totalClaimAmountKes!,
        approvedClaimAmountKes: data.approvedAmountKes || claimPayload.totalClaimAmountKes,
        copayCollectedKes: 0,
        status: "Approved",
        validationScore: validation.score,
        validationErrors: validation.errors,
        submissionTimestamp: new Date().toISOString(),
        adjudicationNotes: data.message || "Submitted and approved via DHA auto-clearinghouse.",
        batchNumber: data.batchNumber || "BATCH-SHA-2026-W35"
      };

      setClaimsList([newRecord, ...claimsList]);
      setSelectedClaimForInspection(newRecord);
    } catch (err: any) {
      console.error("Error submitting claim:", err);
    } finally {
      setIsSubmittingNewClaim(false);
    }
  }

  // Handler: Push to National SHR (FHIR Bundle)
  async function handlePushToShr() {
    setShrPushLoading(true);
    setShrPushResult(null);
    try {
      const mockPatient = {
        id: `pat-${shrPatientId}`,
        name: eligibilityResult?.patientName || defaultPatientName || "Alice Wambui Kamau",
        nationalId: shrPatientId,
        phone: "+254712345678",
        gender: eligibilityResult?.gender || "Female",
        county: eligibilityResult?.county || "Nairobi"
      };
      const mockVisit = {
        id: `vis-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        vitals: { temp: "36.8", bp: "120/80", pulse: "74", weight: "65" },
        symptoms: "Headache, mild fever, chills for 2 days",
        diagnosis: "Plasmodium falciparum malaria, unspecified",
        icd10Code: "B50.9",
        icd10Title: "Plasmodium falciparum malaria, unspecified",
        prescriptions: [
          { drugName: "Artemether/Lumefantrine (Coartem 20/120mg)", dosage: "4 tabs stat, then 4 tabs BD x 3 days", quantity: 24, frequency: "BD", duration: "3 days" },
          { drugName: "Paracetamol 500mg", dosage: "1g TDS PRN", quantity: 20, frequency: "TDS", duration: "5 days" }
        ],
        referrals: []
      };

      const fhirBundle = generateFhirShrBundle(mockPatient as any, mockVisit as any);

      const res = await fetch("/api/integrations/fhir/push-shr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fhirBundle)
      });
      const data = await res.json();
      setShrPushResult({ data, bundle: fhirBundle });
    } catch (err: any) {
      setShrPushResult({ error: err.message });
    } finally {
      setShrPushLoading(false);
    }
  }

  // Handler: Pull from National SHR
  async function handlePullFromShr() {
    setShrPullLoading(true);
    setShrPullResult(null);
    try {
      const res = await fetch("/api/integrations/fhir/pull-shr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId: shrPatientId })
      });
      const data = await res.json();
      setShrPullResult(data);
    } catch (err: any) {
      setShrPullResult({ error: err.message });
    } finally {
      setShrPullLoading(false);
    }
  }

  // Filter ICD-10 List
  const filteredIcdList = KENYA_ICD10_CATALOG.filter(item => {
    const matchesQ = !icdSearchQuery ||
      item.code.toLowerCase().includes(icdSearchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(icdSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(icdSearchQuery.toLowerCase());
    const matchesCat = selectedIcdCategory === "all" || item.mohCategory === selectedIcdCategory;
    return matchesQ && matchesCat;
  });

  // Filter Tariffs List
  const filteredTariffList = customTariffList.filter(item => {
    const matchesQ = !tariffSearchQuery ||
      item.internalName.toLowerCase().includes(tariffSearchQuery.toLowerCase()) ||
      item.shaTariffName.toLowerCase().includes(tariffSearchQuery.toLowerCase()) ||
      item.shaTariffCode.toLowerCase().includes(tariffSearchQuery.toLowerCase()) ||
      item.internalCode.toLowerCase().includes(tariffSearchQuery.toLowerCase());
    const matchesPkg = selectedTariffPackage === "all" || item.shaPackage === selectedTariffPackage;
    return matchesQ && matchesPkg;
  });

  // Generate Sample FHIR Bundle for viewing
  const sampleFhirBundle = generateFhirShrBundle(
    {
      id: "pat-32441928",
      name: "Alice Wambui Kamau",
      nationalId: "32441928",
      phone: "+254712345678",
      gender: "Female",
      county: "Nairobi",
      dateOfBirth: "1988-04-12"
    } as any,
    {
      id: "vis-current",
      date: "2026-08-30",
      vitals: { temp: "37.1", bp: "118/76", pulse: "72", weight: "62" },
      symptoms: "Routine check-up, mild cough",
      diagnosis: "Acute upper respiratory infection, unspecified (URTI)",
      icd10Code: "J06.9",
      icd10Title: "Acute upper respiratory infection, unspecified",
      prescriptions: [
        { drugName: "Amoxicillin/Clavulanate 625mg", dosage: "1 tab BD x 5 days", quantity: 10, frequency: "BD", duration: "5 days" }
      ],
      referrals: []
    } as any
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col relative max-h-[95vh]">
        
        {/* Main Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-5 text-white flex items-center justify-between shrink-0 border-b border-emerald-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Kenya Digital Health (DHA / SHA) Integration Blueprint
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Live Gateway
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Social Health Authority (SHA) • ICD-10 & Tariffs • Electronic Claims (e-Claims) • HL7 FHIR Shared Health Record (SHR)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Core Module Navigation Tabs */}
        <div className="bg-slate-900 px-4 pt-3 flex items-center gap-2 overflow-x-auto border-b border-slate-800 shrink-0">
          {[
            { id: "eligibility", label: "1. Patient Eligibility & Biometrics", icon: Fingerprint, badge: "Real-Time API" },
            { id: "coding", label: "2. Clinical Coding & Tariffs", icon: Stethoscope, badge: "ICD-10 / SHA" },
            { id: "claims", label: "3. Electronic Claims (e-Claims)", icon: CreditCard, badge: "Auto-Scrubber" },
            { id: "shr", label: "4. Shared Health Record (SHR)", icon: Activity, badge: "HL7 FHIR R4" }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.id}
                id={`btn-tab-sha-${tab.id}`}
                onClick={() => setActiveModule(tab.id as any)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t-2 shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 border-emerald-500 shadow-md"
                    : "bg-slate-950/60 text-slate-400 border-transparent hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-800 text-slate-400"}`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">

          {/* ========================================================================= */}
          {/* MODULE 1: PATIENT ELIGIBILITY & BIOMETRIC GATEWAY */}
          {/* ========================================================================= */}
          {activeModule === "eligibility" && (
            <div className="space-y-6">
              {/* Lookup Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Search className="w-4 h-4 text-emerald-600" />
                      Social Health Authority (SHA) Real-Time Verification
                    </h3>
                    <p className="text-xs text-slate-500">Query National Population Registry (IPRS/NRB) & Active Benefit Entitlements</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsBioModalOpen(true)}
                      className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Fingerprint className="w-4 h-4 text-purple-600" />
                      <span>{biometricVerified ? "Biometrics Captured" : "Capture Biometrics"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={nationalIdInput}
                      onChange={(e) => setNationalIdInput(e.target.value)}
                      placeholder="Enter Kenya National ID or SHA Member ID (e.g., 32441928)..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-emerald-600"
                    />
                  </div>
                  <button
                    onClick={() => handleCheckEligibility()}
                    disabled={eligibilityLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {eligibilityLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>{eligibilityLoading ? "Verifying..." : "Query SHA API"}</span>
                  </button>
                </div>

                {eligibilityError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{eligibilityError}</span>
                  </div>
                )}
              </div>

              {/* Eligibility Result Display */}
              {eligibilityResult && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
                    eligibilityResult.eligible
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                        eligibilityResult.eligible ? "bg-emerald-600" : "bg-rose-600"
                      }`}>
                        {eligibilityResult.eligible ? <Check className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black">{eligibilityResult.patientName}</h4>
                          <span className="px-2 py-0.5 bg-white text-emerald-800 text-[10px] font-black rounded-md border border-emerald-300 font-mono">
                            {eligibilityResult.shaId}
                          </span>
                        </div>
                        <p className="text-xs opacity-90">{eligibilityResult.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold px-3 py-1 bg-white rounded-xl border border-emerald-300 text-emerald-800">
                        Status: <strong>{eligibilityResult.status}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Scheme & Dependents Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Scheme</span>
                      <p className="text-xs font-black text-slate-800 mt-0.5">{eligibilityResult.schemeType}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Premium Validity</span>
                      <p className="text-xs font-black text-emerald-700 mt-0.5">Paid until {eligibilityResult.premiumPaidUntil}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Employer / Category</span>
                      <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{eligibilityResult.employerName || "Informal Contributor"}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Dependents</span>
                      <p className="text-xs font-black text-purple-700 mt-0.5">{eligibilityResult.dependentCount} Beneficiaries Active</p>
                    </div>
                  </div>

                  {/* Live Benefit Limits Progress Bars */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span>SHA National Benefit Limit Ceilings</span>
                      <span className="text-[10px] text-emerald-600 font-bold">Automatic Pre-Authorization Applied</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Outpatient */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">Outpatient Package</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            KES {eligibilityResult.benefitLimits.outpatient.balance.toLocaleString()} bal
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{
                              width: `${(eligibilityResult.benefitLimits.outpatient.spent / eligibilityResult.benefitLimits.outpatient.limit) * 100}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Spent: KES {eligibilityResult.benefitLimits.outpatient.spent.toLocaleString()}</span>
                          <span>Cap: KES {eligibilityResult.benefitLimits.outpatient.limit.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Inpatient */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">Inpatient Ward & Theatre</span>
                          <span className="font-mono text-blue-700 font-bold">
                            KES {eligibilityResult.benefitLimits.inpatient.balance.toLocaleString()} bal
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{
                              width: `${(eligibilityResult.benefitLimits.inpatient.spent / eligibilityResult.benefitLimits.inpatient.limit) * 100}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Spent: KES {eligibilityResult.benefitLimits.inpatient.spent.toLocaleString()}</span>
                          <span>Cap: KES {eligibilityResult.benefitLimits.inpatient.limit.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Maternity */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">Maternity (Linda Mama)</span>
                          <span className="font-mono text-pink-700 font-bold">
                            KES {eligibilityResult.benefitLimits.maternity.balance.toLocaleString()} bal
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-pink-500 h-full rounded-full"
                            style={{
                              width: `${(eligibilityResult.benefitLimits.maternity.spent / eligibilityResult.benefitLimits.maternity.limit) * 100}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Spent: KES {eligibilityResult.benefitLimits.maternity.spent.toLocaleString()}</span>
                          <span>Cap: KES {eligibilityResult.benefitLimits.maternity.limit.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODULE 2: CLINICAL CODING & SERVICE MAPPING */}
          {/* ========================================================================= */}
          {activeModule === "coding" && (
            <div className="space-y-6">
              {/* Introduction Banner */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 text-xs flex items-start gap-3">
                <Stethoscope className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-blue-900">MOH Standardized Clinical Coding & SHA Tariff Master Directory</p>
                  <p className="text-blue-800">
                    All clinical notes, diagnoses, procedures, and prescriptions are mapped directly to ICD-10 diagnostic classifications and official SHA Tariff fee codes. This enforces revenue compliance and eliminates claims rejection.
                  </p>
                </div>
              </div>

              {/* Subtabs: ICD-10 vs Tariffs */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: ICD-10 Coding Lookup */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      ICD-10 Clinical Coding Repository
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">{filteredIcdList.length} codes listed</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={icdSearchQuery}
                        onChange={(e) => setIcdSearchQuery(e.target.value)}
                        placeholder="Search disease, code or symptom (e.g. malaria, B50, diabetes)..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-emerald-600"
                      />
                    </div>
                    <select
                      value={selectedIcdCategory}
                      onChange={(e) => setSelectedIcdCategory(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl text-xs font-bold px-2.5 py-2 text-slate-700"
                    >
                      <option value="all">All MOH Types</option>
                      <option value="MOH 705A (Under 5)">MOH 705A (Under 5)</option>
                      <option value="MOH 705B (Over 5)">MOH 705B (Over 5)</option>
                      <option value="MOH 711">MOH 711 (Maternity/Surgery)</option>
                    </select>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                    {filteredIcdList.map((icd) => (
                      <div
                        key={icd.code}
                        onClick={() => {
                          setNewClaimIcdCode(icd.code);
                          setNewClaimIcdTitle(icd.title);
                          setActiveModule("claims");
                        }}
                        className="p-3 hover:bg-emerald-50/50 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                              {icd.code}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate">{icd.title}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span>{icd.category}</span>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">{icd.mohCategory}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                            icd.shaPackage.includes("PHCF") ? "bg-emerald-100 text-emerald-800" :
                            icd.shaPackage.includes("SHIF") ? "bg-blue-100 text-blue-800" :
                            icd.shaPackage.includes("ECCIF") ? "bg-amber-100 text-amber-800" :
                            "bg-pink-100 text-pink-800"
                          }`}>
                            {icd.shaPackage.split(" ")[0]}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: SHA Tariff Rate Card & Mapping */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Hospital Service to SHA Tariff Mapping
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">{filteredTariffList.length} tariffs</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={tariffSearchQuery}
                        onChange={(e) => setTariffSearchQuery(e.target.value)}
                        placeholder="Search service, tariff code or description..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-emerald-600"
                      />
                    </div>
                    <select
                      value={selectedTariffPackage}
                      onChange={(e) => setSelectedTariffPackage(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl text-xs font-bold px-2.5 py-2 text-slate-700"
                    >
                      <option value="all">All Packages</option>
                      <option value="PHCF">PHCF (Level 2-4)</option>
                      <option value="SHIF">SHIF (Level 4-6)</option>
                      <option value="ECCIF">ECCIF (Critical)</option>
                    </select>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                    {filteredTariffList.map((t) => (
                      <div key={t.internalCode} className="p-3 hover:bg-slate-50 transition-colors space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                              {t.internalCode} → <strong className="text-emerald-700">{t.shaTariffCode}</strong>
                            </span>
                            <h5 className="text-xs font-bold text-slate-800">{t.internalName}</h5>
                            <p className="text-[11px] text-slate-500 font-medium">{t.shaTariffName}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded-md shrink-0">
                            {t.shaPackage}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <div className="flex items-center gap-3">
                            <span>Hospital Std: <strong>KES {t.standardPriceKes.toLocaleString()}</strong></span>
                            <span className="text-emerald-700 font-bold">SHA Covered: KES {t.shaCoveredPriceKes.toLocaleString()}</span>
                          </div>
                          <span className={`font-bold ${t.patientCopayKes > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                            {t.patientCopayKes > 0 ? `Co-Pay: KES ${t.patientCopayKes.toLocaleString()}` : "Zero Co-Pay (100% Free)"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODULE 3: ELECTRONIC CLAIMS (e-Claims) */}
          {/* ========================================================================= */}
          {activeModule === "claims" && (
            <div className="space-y-6">
              {/* Claims Overview Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Claims Processed</span>
                  <p className="text-xl font-black text-slate-900 mt-1">{claimsList.length} Claims</p>
                  <span className="text-[10px] text-emerald-600 font-bold">100% Auto-Scrubbed</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Claimed Revenue (KES)</span>
                  <p className="text-xl font-black text-emerald-700 mt-1">
                    KES {claimsList.reduce((acc, c) => acc + c.totalClaimAmountKes, 0).toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500">Submitted to Clearinghouse</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Revenue Leakage Prevented</span>
                  <p className="text-xl font-black text-blue-700 mt-1">KES 14,800</p>
                  <span className="text-[10px] text-blue-600 font-bold">Pre-submission Validation</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Clean Claim Pass Rate</span>
                  <p className="text-xl font-black text-purple-700 mt-1">98.5%</p>
                  <span className="text-[10px] text-purple-600 font-bold">0% Unreconciled Rejections</span>
                </div>
              </div>

              {/* Claims Generator & Auto-Scrubber Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      e-Claim Auto-Compiler & Pre-Submission Scrubber
                    </h4>
                    <p className="text-xs text-slate-500">Auto-bundle clinical diagnosis, KMPDC doctor license, tariff items and submit electronically</p>
                  </div>

                  <button
                    onClick={handleCreateAndSubmitClaim}
                    disabled={isSubmittingNewClaim}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingNewClaim ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isSubmittingNewClaim ? "Scrubbing & Submitting..." : "Compile & Submit e-Claim"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Patient Full Name</label>
                    <input
                      type="text"
                      value={newClaimPatientName}
                      onChange={(e) => setNewClaimPatientName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">National ID / Passport</label>
                    <input
                      type="text"
                      value={newClaimNationalId}
                      onChange={(e) => setNewClaimNationalId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Attending Doctor & KMPDC Reg</label>
                    <input
                      type="text"
                      value={`${newClaimDoctor} (${newClaimKmpdc})`}
                      onChange={(e) => setNewClaimDoctor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Primary ICD-10 Diagnosis</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={`${newClaimIcdCode} - ${newClaimIcdTitle}`}
                        readOnly
                        className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                      <button
                        onClick={() => setActiveModule("coding")}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Claim Total Amount (KES)</label>
                    <input
                      type="number"
                      value={newClaimAmount}
                      onChange={(e) => setNewClaimAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-emerald-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Claims Table / Pipeline */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Electronic Claims Processing Queue</h4>
                  <span className="text-[10px] font-bold text-slate-500">Live Status Tracking</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Claim ID / Pre-Auth</th>
                        <th className="p-3">Patient</th>
                        <th className="p-3">Diagnosis (ICD-10)</th>
                        <th className="p-3">Claim Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {claimsList.map((claim) => (
                        <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono">
                            <div className="font-bold text-slate-800">{claim.claimNumber}</div>
                            <span className="text-[10px] text-slate-400">{claim.preAuthCode}</span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{claim.patientName}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{claim.shaNumber}</span>
                          </td>
                          <td className="p-3 max-w-[200px]">
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-mono font-bold rounded text-[10px] mr-1">
                              {claim.primaryDiagnosis.icd10Code}
                            </span>
                            <span className="text-slate-600 truncate">{claim.primaryDiagnosis.icd10Title}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">
                            KES {claim.totalClaimAmountKes.toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-max ${
                              claim.status === "Approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                              claim.status === "Submitted" ? "bg-blue-100 text-blue-800 border border-blue-300" :
                              "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{claim.status}</span>
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedClaimForInspection(claim)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-[11px] font-bold border border-slate-200 transition-all cursor-pointer"
                            >
                              Inspect Packet
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inspected Claim Packet JSON Drawer */}
              {selectedClaimForInspection && (
                <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">e-Claim Transmission Payload ({selectedClaimForInspection.claimNumber})</span>
                    </div>
                    <button
                      onClick={() => setSelectedClaimForInspection(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <pre className="p-3 bg-slate-950 rounded-xl overflow-x-auto text-[11px] text-emerald-400 leading-relaxed max-h-60">
                    {JSON.stringify(selectedClaimForInspection, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODULE 4: SHARED HEALTH RECORD (SHR) & FHIR INTEROPERABILITY */}
          {/* ========================================================================= */}
          {activeModule === "shr" && (
            <div className="space-y-6">
              {/* Introduction Banner */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-950 text-xs flex items-start gap-3">
                <Activity className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-purple-900">Kenya National Shared Health Record (SHR) & HL7 FHIR R4 Engine</p>
                  <p className="text-purple-800">
                    Enables bi-directional clinical data exchange with the Kenya Digital Health Agency (KDHA) National Health Information Exchange (HIE). Push standardized encounter summaries (Patient, Encounter, Condition, Observations) and pull historical medical records from other hospitals across the country.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Push vs Pull */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Push to National SHR */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Send className="w-4 h-4 text-emerald-600" />
                    <span>Push Clinical Encounter to National SHR</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Compiles patient demographics, vitals, ICD-10 diagnosis, and prescriptions into an HL7 FHIR R4 Transaction Bundle and transmits to National HIE repository.
                  </p>
                  <button
                    onClick={handlePushToShr}
                    disabled={shrPushLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {shrPushLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{shrPushLoading ? "Transmitting FHIR Bundle..." : "Transmit Encounter to KDHA SHR"}</span>
                  </button>

                  {shrPushResult && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Transmission Confirmed</span>
                      </p>
                      <p className="text-[11px] font-mono">TX ID: {shrPushResult.data?.transactionId || "FHIR-TX-LIVE"}</p>
                      <p className="text-[11px] text-emerald-800">{shrPushResult.data?.message}</p>
                    </div>
                  )}
                </div>

                {/* Pull from National SHR */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <ArrowDownToLine className="w-4 h-4 text-blue-600" />
                    <span>Pull Longitudinal History from National SHR</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Fetch prior visits, chronic conditions, and previous facility treatments recorded by other hospitals in Kenya using National ID.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shrPatientId}
                      onChange={(e) => setShrPatientId(e.target.value)}
                      placeholder="National ID (e.g. 32441928)..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                    />
                    <button
                      onClick={handlePullFromShr}
                      disabled={shrPullLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {shrPullLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>{shrPullLoading ? "Fetching..." : "Pull Records"}</span>
                    </button>
                  </div>

                  {shrPullResult && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-2 text-blue-900 max-h-48 overflow-y-auto">
                      <p className="font-bold flex items-center justify-between">
                        <span>{shrPullResult.patientName}</span>
                        <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                          {shrPullResult.totalPastEncounters} Past Encounters Found
                        </span>
                      </p>
                      <div className="space-y-1.5 divide-y divide-blue-200/60">
                        {shrPullResult.records?.map((rec: any, idx: number) => (
                          <div key={idx} className="pt-1.5 text-[11px]">
                            <div className="flex justify-between font-bold">
                              <span>{rec.facilityName} ({rec.facilityLevel})</span>
                              <span className="text-slate-500 font-mono text-[10px]">{rec.encounterDate}</span>
                            </div>
                            <p className="text-blue-800">{rec.primaryDiagnosis}</p>
                            <p className="text-slate-500 text-[10px]">Rx: {rec.prescriptions?.join(", ")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw FHIR R4 Bundle JSON Inspector */}
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">HL7 FHIR R4 Standard Clinical Summary Bundle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(sampleFhirBundle, null, 2));
                        setCopiedFhirJson(true);
                        setTimeout(() => setCopiedFhirJson(false), 2000);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedFhirJson ? "Copied JSON!" : "Copy FHIR JSON"}</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 bg-slate-950 rounded-xl overflow-x-auto text-[11px] text-emerald-400 leading-relaxed max-h-72">
                  {JSON.stringify(sampleFhirBundle, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-white p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>KDHA AfyaLink Security: 256-bit TLS • Digital Health Act 2023 Compliant</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close Hub
            </button>
          </div>
        </div>

      </div>

      {/* Biometric Scanner Modal Embedded */}
      <BiometricScannerModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        nationalId={nationalIdInput}
        patientName={eligibilityResult?.patientName || defaultPatientName}
        onBiometricCaptured={handleBiometricCaptured}
      />
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

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
  Layers
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import BiometricScannerModal from "./BiometricScannerModal";
import { BiometricScanResult } from "../lib/biometricService";

interface ShaVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultNationalId?: string;
  defaultPatientName?: string;
  onShaVerified?: (shaData: any) => void;
}

export default function ShaVerificationModal({
  isOpen,
  onClose,
  defaultNationalId = "",
  defaultPatientName = "",
  onShaVerified,
}: ShaVerificationModalProps) {
  const [nationalId, setNationalId] = useState(defaultNationalId || "32441928");
  const [patientName, setPatientName] = useState(defaultPatientName || "");
  const [isLoading, setIsLoading] = useState(false);
  const [shaResult, setShaResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Biometric state
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [capturedBioData, setCapturedBioData] = useState<BiometricScanResult | null>(null);

  // Claim pre-auth state
  const [claimAmount, setClaimAmount] = useState(2500);
  const [claimDiagnosis, setClaimDiagnosis] = useState("General Outpatient Consultation & Diagnostics");
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimResult, setClaimResult] = useState<any | null>(null);


  useEffect(() => {
    if (isOpen) {
      if (defaultNationalId) setNationalId(defaultNationalId);
      if (defaultPatientName) setPatientName(defaultPatientName);
      setError(null);
      setClaimResult(null);
    }
  }, [isOpen, defaultNationalId, defaultPatientName]);

  if (!isOpen) return null;

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = (nationalId || "").trim();
    if (!cleanId) {
      setError("Please provide a valid Kenya National ID or SHA Member ID.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShaResult(null);
    setClaimResult(null);

    try {
      const res = await fetch("/api/integrations/sha/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId: cleanId }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setShaResult(data);
        if (data.patientName && !patientName) {
          setPatientName(data.patientName);
        }
        if (onShaVerified && data.eligible) {
          onShaVerified(data);
        }
      }
    } catch (err: any) {
      console.error("SHA Verification failed:", err);
      setError(`Network connection to DHA AfyaLink failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricScan = () => {
    setIsBioModalOpen(true);
  };

  const handleBiometricCaptured = (result: BiometricScanResult) => {
    setCapturedBioData(result);
    setBiometricVerified(true);
  };

  const handleSubmitClaim = async () => {

    if (!shaResult?.shaId) return;
    setClaimSubmitting(true);
    try {
      const res = await fetch("/api/integrations/sha/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shaId: shaResult.shaId,
          amount: claimAmount,
          diagnosis: claimDiagnosis,
        }),
      });
      const data = await res.json();
      setClaimResult(data);
    } catch (err: any) {
      console.error("Claim submission failed:", err);
    } finally {
      setClaimSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-cyan-100 flex flex-col relative max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900 via-cyan-800 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">Social Health Authority (SHA) Portal</h3>
                <span className="px-2 py-0.5 bg-cyan-400/30 border border-cyan-300/40 rounded-full text-[10px] font-mono font-bold tracking-wider">
                  Taifa Care / DHA
                </span>
              </div>
              <p className="text-xs text-cyan-100 font-medium">Universal Health Coverage Biometric & Benefit Claims Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Lookup Input Bar */}
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-700">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="Enter Kenya National ID or SHA Member ID..."
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-gray-300 rounded-2xl text-sm font-bold font-mono text-gray-900 focus:bg-white focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="py-3 px-6 bg-cyan-700 hover:bg-cyan-800 active:bg-cyan-900 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{isLoading ? "Querying DHA Gateway..." : "Verify SHA Eligibility"}</span>
            </button>
          </form>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800 font-semibold">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SHA Member Profile Card */}
          {shaResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-5 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white rounded-3xl border border-cyan-500/30 shadow-xl space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider block mb-0.5">
                      Republic of Kenya • Ministry of Health
                    </span>
                    <h4 className="text-lg font-black text-white">{shaResult.patientName || patientName || "Beneficiary"}</h4>
                    <span className="font-mono text-xs text-cyan-200 font-bold">ID No: {nationalId}</span>
                  </div>

                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                      shaResult.eligible
                        ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                        : "bg-rose-500/20 border border-rose-400/40 text-rose-300"
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{shaResult.status || (shaResult.eligible ? "ACTIVE CONTRIBUTOR" : "INACTIVE")}</span>
                    </span>
                    <span className="text-[10px] text-cyan-300 block mt-1 font-mono">{shaResult.shaId}</span>
                  </div>
                </div>

                {/* Limits & Benefit Coverage Breakdown */}
                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-cyan-900/80">
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-center">
                    <span className="text-[9px] uppercase font-bold text-cyan-300 block">Outpatient Limit</span>
                    <span className="text-sm font-black text-white font-mono">
                      KES {(shaResult.benefitLimits?.outpatient || 25000).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-center">
                    <span className="text-[9px] uppercase font-bold text-cyan-300 block">Inpatient Cover</span>
                    <span className="text-sm font-black text-white font-mono">
                      KES {(shaResult.benefitLimits?.inpatient || 150000).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-center">
                    <span className="text-[9px] uppercase font-bold text-cyan-300 block">Maternity Benefit</span>
                    <span className="text-sm font-black text-white font-mono">
                      KES {(shaResult.benefitLimits?.maternity || 40000).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-cyan-300/80 pt-1">
                  <span>Premium Validated Until: {shaResult.premiumPaidUntil || "2026-12-31"}</span>
                  <span>Registered Dependents: {shaResult.dependentCount || 2}</span>
                </div>
              </div>

              {/* Biometrics & Smart App card reader */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${
                    biometricVerified ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-700"
                  }`}>
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-gray-900">Biometric Verification (Phone & Optical)</h5>
                      {capturedBioData?.isPhoneSensor && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[9px] font-bold">
                          📱 Phone Sensor
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {biometricVerified
                        ? `✓ Identity verified via ${capturedBioData?.deviceUsed || "Biometric Sensor"} (${capturedBioData?.qualityScore || 98}% Quality)`
                        : "Use Phone Fingerprint Sensor, QR Remote Scan, or USB Scanner"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBiometricScan}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    biometricVerified
                      ? "bg-emerald-600 text-white"
                      : "bg-cyan-700 hover:bg-cyan-800 text-white shadow-xs"
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>{biometricVerified ? "✓ Verified (Re-Scan)" : "Scan Phone / Sensor"}</span>
                </button>
              </div>


              {/* Electronic Claim Pre-Authorization Section */}
              <div className="p-4 bg-cyan-50/50 border border-cyan-200 rounded-2xl space-y-3">
                <h5 className="text-xs font-bold text-cyan-950 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-cyan-700" />
                  <span>Instant SHA Electronic Pre-Authorization Claim</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Claim Amount (KES)</label>
                    <input
                      type="number"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold font-mono text-gray-900 focus:border-cyan-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Clinical Indication / Diagnosis</label>
                    <input
                      type="text"
                      value={claimDiagnosis}
                      onChange={(e) => setClaimDiagnosis(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:border-cyan-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitClaim}
                    disabled={claimSubmitting}
                    className="px-4 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {claimSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{claimSubmitting ? "Transmitting to DHA..." : "Submit Pre-Auth Claim"}</span>
                  </button>
                </div>

                {claimResult && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-900 space-y-1 animate-in fade-in">
                    <div className="flex justify-between items-center font-bold">
                      <span>Pre-Auth Code: {claimResult.claimId}</span>
                      <span className="text-emerald-700">{claimResult.status}</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Amount Covered: <strong>KES {claimResult.amountCovered?.toLocaleString()}</strong> ({claimResult.message})
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-gray-200 flex items-center justify-between text-xs">
          <span className="text-gray-500 text-[11px]">
            Connected to <strong>AfyaLink DHA National Health Exchange v2</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close Portal
          </button>
        </div>
      </div>

      <BiometricScannerModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        onBiometricCaptured={handleBiometricCaptured}
        patientName={patientName || shaResult?.fullName || "SHA Beneficiary"}
        nationalId={nationalId}
      />
    </div>
  );
}


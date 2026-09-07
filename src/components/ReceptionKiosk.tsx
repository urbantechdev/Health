import React, { useState } from "react";
import {
  UserPlus,
  Search,
  Fingerprint,
  Phone,
  CreditCard,
  Building,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "../lib/promptService";
import { printElement } from "../lib/printUtils";
import { upsertUnifiedPatientRecord } from "../lib/patientSyncService";
import BiometricScannerModal from "./BiometricScannerModal";

interface ReceptionKioskProps {
  onTicketCreated?: () => void;
  onOpenBiometrics?: (patientName?: string, nationalId?: string, onCaptured?: (res: any) => void) => void;
}

export default function ReceptionKiosk({ onTicketCreated, onOpenBiometrics }: ReceptionKioskProps) {
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [nextOfKin, setNextOfKin] = useState("");
  const [kinPhone, setKinPhone] = useState("");
  const [residence, setResidence] = useState("Nairobi");
  const [paymentScheme, setPaymentScheme] = useState<"Cash / M-Pesa" | "Social Health Authority (SHA)" | "Private Insurance">("Cash / M-Pesa");
  const [insurancePolicyNo, setInsurancePolicyNo] = useState("");
  const [priority, setPriority] = useState<"Normal" | "Urgent / Child" | "STAT Emergency">("Normal");
  const [serviceStation, setServiceStation] = useState<"Triage Station" | "Direct Doctor Review" | "Laboratory" | "Pharmacy">("Triage Station");

  const [loading, setLoading] = useState(false);
  const [lastCreatedTicket, setLastCreatedTicket] = useState<any>(null);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<"verified" | "not_verified">("not_verified");
  const [biometricResult, setBiometricResult] = useState<any>(null);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.warning("Please enter patient full name.", "Required Field");
      return;
    }

    setLoading(true);
    try {
      const ticketPrefix = serviceStation === "Triage Station" ? "TRG" : serviceStation === "Direct Doctor Review" ? "DOC" : "OPD";
      const randomNum = Math.floor(100 + Math.random() * 900);
      const ticketNo = `${ticketPrefix}-${randomNum}`;
      const patientId = `PAT-${nationalId.trim() || Date.now().toString().slice(-6)}`;

      // 1. Upsert Patient in Medical Records
      await upsertUnifiedPatientRecord({
        id: patientId,
        patientName: fullName.trim(),
        nationalId: nationalId.trim(),
        phone: phone.trim(),
        age: Number(age) || 30,
        gender,
        nextOfKin: nextOfKin.trim(),
        nextOfKinPhone: kinPhone.trim(),
        residence: residence.trim(),
        paymentScheme,
        insurancePolicyNo: insurancePolicyNo.trim()
      });

      // 2. Add to Live Hospital Queue
      const queueDoc = {
        ticketNo,
        patientId,
        patientName: fullName.trim(),
        nationalId: nationalId.trim(),
        phone: phone.trim(),
        age: Number(age) || 30,
        gender,
        department: serviceStation === "Triage Station" ? "Triage" : serviceStation === "Direct Doctor Review" ? "Doctor" : serviceStation,
        status: "waiting",
        priority: priority === "STAT Emergency" ? "stat_emergency" : priority === "Urgent / Child" ? "urgent" : "normal",
        paymentScheme,
        biometricStatus: biometricStatus === "verified" ? "verified" : "not_verified",
        createdAt: new Date().toISOString(),
        triageStage: "unassigned"
      };

      await addDoc(collection(db, "queue"), queueDoc);

      setLastCreatedTicket({
        ...queueDoc,
        date: new Date().toLocaleString("en-KE")
      });

      toast.success(`Queue Ticket ${ticketNo} generated for ${fullName}!`, "Registration Complete");

      // Reset form
      setFullName("");
      setNationalId("");
      setPhone("");
      setAge("");
      setNextOfKin("");
      setKinPhone("");
      setInsurancePolicyNo("");

      if (onTicketCreated) {
        onTicketCreated();
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error("Failed to register patient and queue ticket.", "Registration Error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = async () => {
    try {
      await printElement("kiosk-printed-slip", {
        title: `Queue_Ticket_${lastCreatedTicket?.ticketNo}`,
        paperSize: "receipt80mm"
      });
      toast.success("Printed queue ticket slip.");
    } catch {
      toast.error("Failed to print queue ticket.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">Patient Reception & Registration Kiosk</h2>
            <p className="text-xs text-slate-500">
              National ID KYC lookup, biometric verification, and automated queue ticketing
            </p>
          </div>
        </div>

        {lastCreatedTicket && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintSlip}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" /> Print Ticket Slip ({lastCreatedTicket.ticketNo})
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <form onSubmit={handleRegisterPatient} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Patient Full Legal Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alice Wambui Kamau"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kenyan National ID / Passport No
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. 32441928"
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    id="btn-tap-fingerprint-kiosk"
                    onClick={() => {
                      if (onOpenBiometrics) {
                        onOpenBiometrics(fullName || "Patient", nationalId, (res) => {
                          setBiometricStatus("verified");
                          setBiometricResult(res);
                        });
                      } else {
                        setShowBiometricModal(true);
                      }
                    }}
                    title="Tap to open Biometric Scanner (Full Screen / Top Popup)"
                    className="absolute right-1.5 top-1.5 p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Fingerprint className="w-5 h-5 animate-pulse" />
                  </button>
                </div>

                {/* Direct Tap CTA Button for Full Screen Biometric Window */}
                <button
                  type="button"
                  id="btn-kiosk-scan-fingerprint-cta"
                  onClick={() => {
                    if (onOpenBiometrics) {
                      onOpenBiometrics(fullName || "Patient", nationalId, (res) => {
                        setBiometricStatus("verified");
                        setBiometricResult(res);
                      });
                    } else {
                      setShowBiometricModal(true);
                    }
                  }}
                  className={`mt-2 w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border shadow-xs ${
                    biometricStatus === "verified"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                      : "bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-950 border-indigo-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Fingerprint className={`w-4 h-4 ${biometricStatus === "verified" ? "text-emerald-600" : "text-indigo-600 animate-pulse"}`} />
                    <span>{biometricStatus === "verified" ? "Biometrics Attached to Patient" : "Tap to Open Biometric Scanner (Full Screen)"}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    biometricStatus === "verified" ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                  }`}>
                    {biometricStatus === "verified" ? "✓ Verified" : "Tap to Scan"}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone (Safaricom / Airtel)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Age (Years) *
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 34"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Scheme / Insurance
                </label>
                <select
                  value={paymentScheme}
                  onChange={(e) => setPaymentScheme(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Cash / M-Pesa">Cash / Safaricom M-Pesa</option>
                  <option value="Social Health Authority (SHA)">Social Health Authority (SHA / Taifa Care)</option>
                  <option value="Private Insurance">Private Corporate Insurance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Insurance / Policy Member #
                </label>
                <input
                  type="text"
                  value={insurancePolicyNo}
                  onChange={(e) => setInsurancePolicyNo(e.target.value)}
                  placeholder="SHA-902148-KE or Policy ID"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Queue Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Normal">Normal - Standard Walk-in</option>
                  <option value="Urgent / Child">Urgent - Pediatric / Elderly</option>
                  <option value="STAT Emergency">STAT Emergency - Resuscitation Area</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Forward Patient Routing To
                </label>
                <select
                  value={serviceStation}
                  onChange={(e) => setServiceStation(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Triage Station">Nurse Triage & Vital Signs</option>
                  <option value="Direct Doctor Review">Direct Doctor Review (Follow-up)</option>
                  <option value="Laboratory">Laboratory Diagnostics</option>
                  <option value="Pharmacy">Pharmacy Refills</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                {loading ? "Registering & Queuing..." : "Complete Registration & Issue Ticket"}
              </button>
            </div>
          </form>
        </div>

        {/* Live Ticket Preview Slip */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Generated Ticket Preview
            </h3>

            {lastCreatedTicket ? (
              <div
                id="kiosk-printed-slip"
                className="bg-white p-5 rounded-xl border border-slate-300 shadow-xs space-y-3 text-center"
              >
                <div className="border-b border-dashed border-slate-300 pb-2">
                  <div className="font-black text-sm text-slate-900 uppercase">NEXTGEN HOSPITAL</div>
                  <div className="text-[10px] text-slate-500">Reception & Triage Queue Slip</div>
                </div>

                <div className="py-2">
                  <div className="text-3xl font-black text-emerald-600 tracking-tight">
                    {lastCreatedTicket.ticketNo}
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{lastCreatedTicket.patientName}</div>
                  <div className="text-[10px] text-slate-500">ID: {lastCreatedTicket.nationalId || "Walk-in"}</div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-600 space-y-1 text-left">
                  <div><strong>Destination:</strong> {lastCreatedTicket.department}</div>
                  <div><strong>Scheme:</strong> {lastCreatedTicket.paymentScheme}</div>
                  <div><strong>Time:</strong> {lastCreatedTicket.date}</div>
                </div>

                <div className="text-[9px] text-slate-400 pt-2 border-t border-slate-100">
                  Please proceed to the waiting bay and listen for your vocal turn announcement.
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                Register a patient to generate an electronic queue ticket and print slip.
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Integrated with Safaricom Daraja STK Push & SHA Taifa Care.</span>
          </div>
        </div>
      </div>

      {/* Biometric Scanner Modal on top of everything */}
      <BiometricScannerModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        patientName={fullName || "Patient Intake"}
        nationalId={nationalId}
        defaultFullscreen={false}
        onBiometricCaptured={(res) => {
          setBiometricStatus("verified");
          setBiometricResult(res);
          setShowBiometricModal(false);
          toast.success(`Biometrics verified for ${fullName || "patient"}!`, "Biometrics Attached");
        }}
      />
    </div>
  );
}

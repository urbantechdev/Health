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
  AlertCircle,
  Receipt,
  Stethoscope
} from "lucide-react";
import { collection, addDoc, doc, setDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db, cleanFirestoreData } from "../lib/firebase";
import { toast } from "../lib/promptService";
import { printElement } from "../lib/printUtils";
import { upsertUnifiedPatientRecord, createTriageQueueTicket } from "../lib/patientSyncService";
import { createHospitalEncounter } from "../lib/encounterService";
import { addChargeToCart } from "../lib/patientCartService";
import { checkDuplicatePatientRegistration } from "../lib/deduplicationService";
import { voiceAnnouncer } from "../lib/voiceAnnouncementService";
import BiometricScannerModal from "./BiometricScannerModal";

interface ReceptionKioskProps {
  onTicketCreated?: () => void;
  onNavigateToBilling?: (patientId?: string) => void;
  onOpenBiometrics?: (patientName?: string, nationalId?: string, onCaptured?: (res: any) => void) => void;
}

export default function ReceptionKiosk({ onTicketCreated, onNavigateToBilling, onOpenBiometrics }: ReceptionKioskProps) {
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
  const [serviceStation, setServiceStation] = useState<"Triage Station" | "Direct Doctor Review" | "Billing" | "Laboratory" | "Pharmacy">("Triage Station");

  const [loading, setLoading] = useState(false);
  const [lastCreatedTicket, setLastCreatedTicket] = useState<any>(null);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<"verified" | "not_verified">("not_verified");
  const [biometricResult, setBiometricResult] = useState<any>(null);
  const [existingPatientMatch, setExistingPatientMatch] = useState<any>(null);
  const [isSearchingExisting, setIsSearchingExisting] = useState(false);

  // Auto-lookup returning patient by National ID
  const handleLookupNationalId = async (idToSearch: string) => {
    const cleanId = idToSearch.trim();
    if (!cleanId || cleanId.length < 5) {
      setExistingPatientMatch(null);
      return;
    }

    setIsSearchingExisting(true);
    try {
      const q1 = query(collection(db, "patients"), where("nationalId", "==", cleanId));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        const foundData = snap1.docs[0].data() as any;
        setExistingPatientMatch({ ...foundData, id: snap1.docs[0].id });
        if (!fullName) setFullName(foundData.patientName || foundData.name || foundData.fullName || "");
        if (!phone) setPhone(foundData.phone || "");
        if (!age && foundData.age) setAge(foundData.age);
        if (foundData.gender) setGender(foundData.gender);
        if (foundData.residence) setResidence(foundData.residence);
        if (foundData.nextOfKin) setNextOfKin(foundData.nextOfKin);
        if (foundData.kinPhone || foundData.emergencyContact) setKinPhone(foundData.kinPhone || foundData.emergencyContact || "");
        if (foundData.paymentScheme) setPaymentScheme(foundData.paymentScheme);
        if (foundData.insurancePolicyNo || foundData.insuranceNumber) setInsurancePolicyNo(foundData.insurancePolicyNo || foundData.insuranceNumber || "");
        toast.info(`Found registered patient record for ${foundData.patientName || foundData.name || "Patient"}. Profile auto-loaded.`, "Patient Profile Matched");
      } else {
        setExistingPatientMatch(null);
      }
    } catch (lookupErr) {
      console.warn("National ID lookup notice:", lookupErr);
    } finally {
      setIsSearchingExisting(false);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.warning("Please enter patient full name.", "Required Field");
      return;
    }

    setLoading(true);
    try {
      const ticketPrefix = serviceStation === "Triage Station" ? "TRG" : serviceStation === "Direct Doctor Review" ? "DOC" : serviceStation === "Billing" ? "BIL" : "OPD";
      const randomNum = Math.floor(100 + Math.random() * 900);
      const ticketNo = `${ticketPrefix}-${randomNum}`;

      // 1. Check for duplicates in the system
      let targetPatientId = `PAT-${nationalId.trim() || Date.now().toString().slice(-6)}`;
      try {
        const dupCheck = await checkDuplicatePatientRegistration(
          nationalId.trim(),
          phone.trim(),
          fullName.trim()
        );
        const existingFoundId = dupCheck.existingRecord?.id || (dupCheck as any).matchedPatient?.id;
        if (dupCheck.isDuplicate && existingFoundId) {
          targetPatientId = existingFoundId;
          toast.info(`Found existing patient record for ${fullName}. Updating profile & linking new visit.`, "EHR Linked");
        }
      } catch (dupErr) {
        console.warn("Duplicate check notice:", dupErr);
      }

      // 2. Upsert Patient in Medical Records (automatically creates Triage queue if new patient)
      const syncResult = await upsertUnifiedPatientRecord({
        id: targetPatientId,
        patientName: fullName.trim(),
        nationalId: nationalId.trim(),
        phone: phone.trim(),
        age: Number(age) || 30,
        gender,
        nextOfKin: nextOfKin.trim(),
        nextOfKinPhone: kinPhone.trim(),
        residence: residence.trim(),
        paymentScheme,
        insurancePolicyNo: insurancePolicyNo.trim(),
        activeTicketNo: ticketNo,
        currentDepartment: "triage",
        priority,
        biometricStatus: biometricStatus === "verified" ? "verified" : "not_verified",
        sourceStation: "Reception Desk",
        autoQueueTriage: true
      });

      const finalPatientId = syncResult?.patientId || targetPatientId;

      // 3. Create active Hospital Encounter to track visit
      let encounterId: string | undefined;
      try {
        encounterId = await createHospitalEncounter({
          patientId: finalPatientId,
          patientName: fullName.trim(),
          nationalId: nationalId.trim(),
          phone: phone.trim(),
          age: Number(age) || 30,
          gender,
          status: "ADMITTED",
          admissionDate: new Date().toISOString(),
          assignedWard: "Outpatient / OPD",
          notes: `Reception Intake: ${serviceStation} [${paymentScheme}]`,
          activeTicketNo: syncResult?.ticketNo || ticketNo,
          paymentScheme,
          insuranceScheme: paymentScheme === "Social Health Authority (SHA)" 
            ? "Social Health Authority (SHA)" 
            : paymentScheme === "Private Insurance" 
              ? (insurancePolicyNo.trim() ? "Private Insurance" : "Corporate Insurance") 
              : "Cash / M-Pesa",
          insuranceNumber: insurancePolicyNo.trim() || ""
        });
      } catch (encErr) {
        console.warn("Notice: Encounter creation notice:", encErr);
      }

      // 4. Wire Directly to Patient Billing Cart (Real-time Folio)
      try {
        const intakeAmount = paymentScheme === "Social Health Authority (SHA)" ? 0 : 1000;
        await addChargeToCart({
          patientId: finalPatientId,
          patientName: fullName.trim(),
          nationalId: nationalId.trim(),
          phone: phone.trim(),
          ticketNo: syncResult?.ticketNo || ticketNo,
          encounterId,
          stage: "Reception & Intake",
          department: "Reception / OPD",
          category: "consultation",
          itemCode: "REG-INTAKE",
          name: "Outpatient Registration & Consultation Intake",
          unitPrice: intakeAmount,
          quantity: 1,
          totalPrice: intakeAmount,
          notes: paymentScheme === "Social Health Authority (SHA)" 
            ? "Social Health Authority (SHA) Capitation Covered Intake" 
            : paymentScheme === "Private Insurance"
              ? `Insurance Claimable Intake (${insurancePolicyNo.trim() || "Policy Active"})`
              : "General Outpatient Cash Consultation Fee",
          addedBy: "Reception Desk",
          addedByRole: "Reception",
          paymentScheme,
          insurancePolicyNo: insurancePolicyNo.trim()
        });
      } catch (cartErr) {
        console.warn("Notice: Cart sync notice:", cartErr);
      }

      // 5. Ensure patient is queued in Live Hospital Queue at Triage
      let activeQueueTicketNo = syncResult?.ticketNo || ticketNo;
      let activeQueueId = syncResult?.queueId;

      if (activeQueueId) {
        // Triage queue was already automatically created by patientSyncService! Attach encounterId if available
        if (encounterId) {
          try {
            await updateDoc(doc(db, "queue", activeQueueId), { encounterId });
          } catch (e) {
            console.warn("Notice: could not link encounter to auto-created triage queue:", e);
          }
        }
      } else {
        // Returning patient or encounter without pre-existing queue: ensure queued at Nurse Triage
        const triageQueueResult = await createTriageQueueTicket({
          patientId: finalPatientId,
          patientName: fullName.trim(),
          nationalId: nationalId.trim(),
          phone: phone.trim(),
          age: Number(age) || 30,
          gender,
          priority,
          paymentScheme,
          insurancePolicyNo: insurancePolicyNo.trim(),
          biometricStatus: biometricStatus === "verified" ? "verified" : "not_verified",
          ticketNo,
          notes: `Reception Registration: Queued for Nurse Triage [${serviceStation}]`,
          encounterId: encounterId || null
        });
        activeQueueTicketNo = triageQueueResult.ticketNo;
        activeQueueId = triageQueueResult.queueId;
      }

      const queueTicketRecord = {
        id: activeQueueId || "triage-ticket",
        ticketNo: activeQueueTicketNo,
        patientId: finalPatientId,
        encounterId: encounterId || null,
        patientName: fullName.trim(),
        nationalId: nationalId.trim(),
        phone: phone.trim(),
        age: Number(age) || 30,
        gender,
        department: "Triage",
        currentDepartment: "triage",
        service: "Nurse Triage & Vitals",
        status: "pending",
        priority: priority === "STAT Emergency" ? "stat_emergency" : priority === "Urgent / Child" ? "urgent" : "normal",
        paymentScheme,
        insurancePolicyNo: insurancePolicyNo.trim(),
        biometricStatus: biometricStatus === "verified" ? "verified" : "not_verified",
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        triageStage: "unassigned",
        date: new Date().toLocaleString("en-KE")
      };

      setLastCreatedTicket(queueTicketRecord as any);

      // Automated Voice Broadcast for Patient Turn / Arrival Announcement
      try {
        await voiceAnnouncer.announceTicketLogged({
          ticketNo: activeQueueTicketNo,
          patientName: fullName.trim(),
          department: "triage",
          service: "Nurse Triage & Vitals",
          status: "pending",
          roomOrDesk: "Nurse Triage Desk"
        });
      } catch (annErr) {
        console.warn("Voice announcement notice:", annErr);
      }

      if (onTicketCreated) {
        onTicketCreated();
      }

      toast.success(
        `Patient ${fullName} registered! Automatically queued at Nurse Triage (Ticket #${activeQueueTicketNo}).`,
        "Patient Registered & Queued"
      );

      // Reset form
      setFullName("");
      setNationalId("");
      setPhone("");
      setAge("");
      setNextOfKin("");
      setKinPhone("");
      setInsurancePolicyNo("");
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err.message || "Failed to register patient and queue ticket.", "Registration Error");
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
                    onChange={(e) => {
                      setNationalId(e.target.value);
                      handleLookupNationalId(e.target.value);
                    }}
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

                {/* Existing Patient Match Notice */}
                {isSearchingExisting && (
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Searching master patient index...</span>
                  </div>
                )}
                {existingPatientMatch && (
                  <div className="mt-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="font-bold">Returning Patient:</span> {existingPatientMatch.name || existingPatientMatch.fullName} ({existingPatientMatch.patientNumber || "EHR Linked"})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToBilling) {
                          onNavigateToBilling(existingPatientMatch.id);
                        }
                      }}
                      className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-950 underline shrink-0 cursor-pointer"
                    >
                      Open in Billing →
                    </button>
                  </div>
                )}

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
                  <option value="Billing">Direct Billing / Cashier Desk</option>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Generated Ticket Preview
              </h3>
              {lastCreatedTicket && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Wired to Billing
                </span>
              )}
            </div>

            {lastCreatedTicket ? (
              <div className="space-y-4">
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
                    {lastCreatedTicket.insurancePolicyNo && (
                      <div><strong>Policy No:</strong> {lastCreatedTicket.insurancePolicyNo}</div>
                    )}
                    <div><strong>Time:</strong> {lastCreatedTicket.date}</div>
                  </div>

                  <div className="text-[9px] text-slate-400 pt-2 border-t border-slate-100">
                    Please proceed to the waiting bay and listen for your vocal turn announcement.
                  </div>
                </div>

                {/* Quick Transmission Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrintSlip}
                    className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print Slip</span>
                  </button>

                  <button
                    type="button"
                    id="btn-reception-goto-billing"
                    onClick={() => {
                      if (onNavigateToBilling) {
                        onNavigateToBilling(lastCreatedTicket.patientId);
                      }
                    }}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Proceed to Billing →</span>
                  </button>
                </div>

                <div className="p-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Intake charges ({lastCreatedTicket.paymentScheme === "Social Health Authority (SHA)" ? "KES 0 SHA Capitation" : "KES 1,000 OPD"}) transmitted to Billing.
                  </span>
                </div>

                {onTicketCreated && (
                  <button
                    type="button"
                    onClick={onTicketCreated}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Triage / Station</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
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

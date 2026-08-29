import React, { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { 
  User, 
  CreditCard, 
  Ticket, 
  Fingerprint, 
  Search, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw, 
  Stethoscope, 
  Briefcase,
  AlertCircle,
  UserCheck,
  Ban,
  Clock,
  X,
  History,
  FileText,
  Eye,
  Activity,
  Shield,
  MapPin,
  Zap,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Sparkles
} from "lucide-react";
import { Employee, MedicalRecord, SystemTicket, QueueTicket, SecurityLog } from "../types";
import { createAutoTicket, checkActivePatientEncounter, findPatientByNationalId, DuplicateEncounterCheck } from "../lib/ticketService";
import { upsertUnifiedPatientRecord, findUnifiedPatient } from "../lib/patientSyncService";
import { addChargeToCart } from "../lib/patientCartService";
import { toast } from "../lib/promptService";
import { voiceAnnouncer } from "../lib/voiceAnnouncementService";
import PatientHistoryLookupModal from "./PatientHistoryLookupModal";
import BiometricScannerModal from "./BiometricScannerModal";
import { BiometricScanResult } from "../lib/biometricService";

interface ReceptionKioskProps {
  onTicketCreated: () => void;
}

export default function ReceptionKiosk({ onTicketCreated }: ReceptionKioskProps) {
  const [patientName, setPatientName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [bloodType, setBloodType] = useState("Not Sure");
  const [issue, setIssue] = useState("");

  // History Lookup Modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearchId, setHistorySearchId] = useState("");

  // Triage & Vitals
  const [fastTrackDirectVitals, setFastTrackDirectVitals] = useState(false);
  const [triageTemp, setTriageTemp] = useState("36.8");
  const [triageBp, setTriageBp] = useState("120/80");
  const [triagePulse, setTriagePulse] = useState("72");
  const [triageWeight, setTriageWeight] = useState("68");
  const [triageHeight, setTriageHeight] = useState("170");
  const [allergies, setAllergies] = useState("No Known Drug Allergies (NKDA)");
  const [chronicConditions, setChronicConditions] = useState("None");

  // Real-time lookup & duplicate check states
  const [existingPatientProfile, setExistingPatientProfile] = useState<MedicalRecord | null>(null);
  const [activeDuplicateEncounter, setActiveDuplicateEncounter] = useState<DuplicateEncounterCheck | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(false);

  // Security Desk Integration State
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [matchedSecurityLog, setMatchedSecurityLog] = useState<SecurityLog | null>(null);
  const [showSecurityGateDrawer, setShowSecurityGateDrawer] = useState(true);

  // Duplicate Encounter Rejection Modal state
  const [duplicateRejectionModal, setDuplicateRejectionModal] = useState<{
    show: boolean;
    checkResult: DuplicateEncounterCheck;
    nationalId: string;
    patientName: string;
  } | null>(null);

  // Real-time subscription to Security Gate Checkpoint Entry Logs
  useEffect(() => {
    const unsubSecurity = onSnapshot(collection(db, "security_logs"), (snapshot) => {
      const logsList: SecurityLog[] = [];
      snapshot.forEach((docSnap) => {
        logsList.push({ id: docSnap.id, ...docSnap.data() } as SecurityLog);
      });
      logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Filter entry records for patients / individuals
      const patientGateLogs = logsList.filter(
        (l) => l.direction === "entry" && (l.entityType === "patient" || l.type === "individual" || l.patientName)
      );
      setSecurityLogs(patientGateLogs);
    });

    return () => unsubSecurity();
  }, []);

  // Real-time National ID lookup function (EHR + Security Desk Link)
  const performIdLookup = useCallback(async (idToCheck: string) => {
    const cleanId = (idToCheck || "").trim();
    if (!cleanId || cleanId.length < 3) {
      setExistingPatientProfile(null);
      setActiveDuplicateEncounter(null);
      setMatchedSecurityLog(null);
      return;
    }

    setIsCheckingId(true);
    try {
      // 1. Check for active duplicate encounters (open ticket or active queue)
      const dupCheck = await checkActivePatientEncounter(cleanId);
      setActiveDuplicateEncounter(dupCheck.isDuplicate ? dupCheck : null);

      // 2. Check for security gate entry log match
      const matchedSec = securityLogs.find((s) => {
        const sId = (s.nationalId || s.idOrPhone || "").trim().toLowerCase();
        const sName = (s.patientName || s.nameOrPlate || "").trim().toLowerCase();
        return sId === cleanId.toLowerCase() || (cleanId.length >= 4 && sName.includes(cleanId.toLowerCase()));
      });
      setMatchedSecurityLog(matchedSec || null);

      // 3. Check for existing registered patient file in EHR database
      const existingPatient = await findPatientByNationalId(cleanId);
      if (existingPatient) {
        setExistingPatientProfile(existingPatient);
        // Auto-populate demographics if current fields are empty
        setPatientName((prev) => prev || existingPatient.patientName || (matchedSec?.patientName || matchedSec?.nameOrPlate) || "");
        setPhone((prev) => prev || existingPatient.phone || (matchedSec?.phone || matchedSec?.idOrPhone) || "");
        setAge((prev) => (prev ? prev : existingPatient.age ? String(existingPatient.age) : ""));
        if (existingPatient.gender) setGender(existingPatient.gender);
        if (existingPatient.bloodType) setBloodType(existingPatient.bloodType);
        if (existingPatient.shaEligible === "eligible" && existingPatient.shaId) {
          setShaStatus({
            eligible: true,
            shaId: existingPatient.shaId,
            patientName: existingPatient.patientName,
            benefitLimits: { outpatient: 100000, inpatient: 500000 }
          });
        }
      } else {
        setExistingPatientProfile(null);
        // If not in EHR but found in Security Gate log, auto-populate from Security Log
        if (matchedSec) {
          setPatientName((prev) => prev || matchedSec.patientName || matchedSec.nameOrPlate || "");
          if (matchedSec.phone) setPhone((prev) => prev || matchedSec.phone || (matchedSec.idOrPhone?.startsWith("07") ? matchedSec.idOrPhone : "") || "");
          if (matchedSec.notes) setIssue((prev) => prev || matchedSec.notes || "");
        }
      }
    } catch (err) {
      console.error("Error performing ID verification lookup:", err);
    } finally {
      setIsCheckingId(false);
    }
  }, [securityLogs]);

  // One-click retrieve patient profile from Security Gate Log
  const handleRetrieveFromSecurityLog = (secLog: SecurityLog) => {
    const secId = secLog.nationalId || secLog.idOrPhone || "";
    const secName = secLog.patientName || secLog.nameOrPlate || "";
    const secPhone = secLog.phone || (secLog.idOrPhone && (secLog.idOrPhone.startsWith("07") || secLog.idOrPhone.startsWith("+254") || secLog.idOrPhone.startsWith("254")) ? secLog.idOrPhone : "");

    setNationalId(secId);
    setPatientName(secName);
    if (secPhone) setPhone(secPhone);
    if (secLog.notes) setIssue(secLog.notes);
    setMatchedSecurityLog(secLog);

    if (secId) {
      performIdLookup(secId);
    }

    toast.success(
      `Loaded Security Checkpoint record for ${secName} (Arrived at ${secLog.checkpoint} at ${new Date(secLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${secLog.officerName}).`,
      "Security Patient Record Retrieved"
    );
  };

  // Debounced lookup on National ID change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nationalId.trim()) {
        performIdLookup(nationalId.trim());
      } else {
        setExistingPatientProfile(null);
        setActiveDuplicateEncounter(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [nationalId, performIdLookup]);

  // Biometric state
  const [biometricsCaptured, setBiometricsCaptured] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricScanData, setBiometricScanData] = useState<BiometricScanResult | null>(null);

  // SHA integration state
  const [shaLoading, setShaLoading] = useState(false);
  const [shaStatus, setShaStatus] = useState<any | null>(null);

  // Optical ID Scanner state
  const [scanning, setScanning] = useState(false);

  // Form submitting
  const [submitting, setSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  const handleFocusIDScanInput = () => {
    setScanning(true);
    const idInput = document.getElementById("input-national-id") as HTMLInputElement | null;
    if (idInput) {
      idInput.focus();
      idInput.select();
      toast.info("Scanner Ready: Swipe patient national ID or scan MRZ barcode.", "Optical Scanner Active");
    }
    setTimeout(() => setScanning(false), 800);
  };

  const checkSHAEligibility = async () => {
    if (!nationalId) {
      toast.warning("Please scan or enter a National ID / Passport number first.", "ID Required");
      return;
    }
    setShaLoading(true);
    setShaStatus(null);
    try {
      const response = await fetch("/api/integrations/sha/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId }),
      });
      const data = await response.json();
      setShaStatus(data);
      if (data.eligible && data.patientName) {
        setPatientName(data.patientName);
        toast.success(`SHA Active for ${data.patientName} (${data.shaId})`, "SHA Verified");
      } else if (!data.eligible) {
        toast.error(data.reason || "Patient is not currently active on SHA portal.", "SHA Inactive");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to SHA eligibility verification portal.", "Connection Error");
    } finally {
      setShaLoading(false);
    }
  };

  const captureBiometrics = () => {
    setCapturing(true);
    setTimeout(() => {
      setBiometricsCaptured(true);
      setCapturing(false);
      toast.success("Biometric fingerprint verification captured successfully.", "Biometrics Active");
    }, 2000);
  };

  const handleRegisterAndTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = nationalId.trim();
    const cleanName = patientName.trim();

    if (!cleanName || !cleanId) {
      toast.warning("Please fill out patient name and scan/input ID.", "Incomplete Patient Information");
      return;
    }

    setSubmitting(true);
    setSuccessTicket(null);

    try {
      // STEP 1: Strict Anti-Duplication Check
      // Reject if patient already has an active hospital encounter in queue or open system tickets
      const dupCheck = await checkActivePatientEncounter(cleanId);
      if (dupCheck.isDuplicate) {
        const dupTicket = dupCheck.activeTicket?.ticketNumber || dupCheck.activeQueue?.ticketNo || "Active Ticket";
        const dupDept = dupCheck.activeTicket?.department || dupCheck.activeQueue?.currentDepartment || "Outpatient";
        toast.warning(
          dupCheck.reason || `[DUPLICATE BLOCKED] Patient ${cleanName} already has an active encounter (${dupTicket}) in ${dupDept}.`,
          "Duplicate Patient Encounter Rejected"
        );
        setDuplicateRejectionModal({
          show: true,
          checkResult: dupCheck,
          nationalId: cleanId,
          patientName: cleanName
        });
        setSubmitting(false);
        return;
      }

      // Standard Hospital Care Protocol: Every patient registered at Reception routes directly to Nurse Triage first
      const currentDept = "triage";
      const targetDept = "triage";
      const selectedServiceName = "Nurse Triage & Clinical Intake";
      const prefix = "TRI";
      const ticketNo = `${prefix}-${Math.floor(Math.random() * 900 + 100)}`;
      const consultationRoom = "Nurse Triage Desk";

      // STEP 2: Unified EHR Auto-Sync Engine (Creates or Updates Master Patient Profile)
      const patientSyncResult = await upsertUnifiedPatientRecord({
        patientName: cleanName,
        nationalId: cleanId,
        phone: phone.trim(),
        age: parseInt(age) || 30,
        gender,
        bloodType,
        shaEligible: shaStatus?.eligible ? "eligible" : "not_eligible",
        shaId: shaStatus?.shaId || "",
        vitals: {
          temp: triageTemp || "36.8",
          bp: triageBp || "120/80",
          pulse: triagePulse || "72",
          weight: triageWeight || "68",
        },
        allergies: allergies || "No Known Drug Allergies (NKDA)",
        chronicConditions: chronicConditions || "None",
        symptoms: `${issue.trim() || "Walk-in registration for Clinical Triage & Consultation."}${allergies ? ` | Allergies: ${allergies}` : ""}${chronicConditions && chronicConditions !== "None" ? ` | Chronic: ${chronicConditions}` : ""}`,
        diagnosis: "Initial checkup pending Nurse Triage assessment & specialist routing",
        currentDepartment: "triage",
        activeTicketNo: ticketNo,
        sourceStation: "Reception Kiosk"
      });

      const resolvedPatientId = patientSyncResult.patientId;

      // STEP 3: Create active Queue ticket in database (Queued in Nurse Triage Station)
      const queueData = {
        ticketNo,
        patientName: cleanName,
        nationalId: cleanId,
        biometricStatus: biometricsCaptured ? "verified" : "not_verified",
        service: "Nurse Triage & Clinical Intake",
        currentDepartment: "triage",
        status: "pending",
        patientId: resolvedPatientId,
        timestamp: new Date().toISOString(),
        phone: phone.trim() || "N/A",
        age: parseInt(age) || 30,
        gender: gender,
        bloodType: bloodType,
        issue: issue.trim() || "Outpatient Clinical Intake",
        allergies: allergies || "No Known Drug Allergies (NKDA)",
        chronicConditions: chronicConditions || "None",
        vitals: {
          temp: triageTemp || "36.8",
          bp: triageBp || "120/80",
          pulse: triagePulse || "72",
          weight: triageWeight || "68",
        },
        targetDepartment: "triage",
        targetClinic: "Nurse Triage & Vital Signs Desk",
        assignedSpecialistId: "",
        assignedSpecialistName: "Triage Nurse Officer",
        specialistTitle: "Triage & Vitals",
        consultationRoom: consultationRoom,
      };

      await addDoc(collection(db, "queue"), queueData);

      // STEP 4: Automatically trigger system ticket creation in Triage
      await createAutoTicket({
        patientName: cleanName,
        nationalId: cleanId,
        phone: phone.trim(),
        department: "triage",
        visitReason: issue.trim() || "Outpatient Clinical Intake & Nurse Triage",
        priority: "Normal",
        patientId: resolvedPatientId,
        assignedSpecialistId: "",
        assignedSpecialistName: "Triage Nurse Officer",
        specialistTitle: "Nurse Triage",
        consultationRoom: consultationRoom
      });

      // STEP 5: Automatically post initial Registration & Clinical Consultation Charge to Patient Cart
      await addChargeToCart({
        patientId: resolvedPatientId,
        patientName: cleanName,
        nationalId: cleanId,
        phone: phone.trim(),
        ticketNo: ticketNo,
        stage: "Registration & Triage",
        department: "Reception / OPD",
        category: "consultation",
        itemCode: "REG-001",
        name: "Outpatient Registration & Clinical Triage Intake",
        unitPrice: 500,
        quantity: 1,
        notes: "Intake at Reception Kiosk • Forwarded to Nurse Triage Desk",
        addedBy: "Reception Desk",
        addedByRole: "Reception"
      });

      // STEP 6: Update any matching Security Log record to mark it as registered in Reception
      if (matchedSecurityLog?.id) {
        try {
          await updateDoc(doc(db, "security_logs", matchedSecurityLog.id), {
            receptionStatus: "registered",
            receptionTicketNo: ticketNo
          });
        } catch (secErr) {
          console.warn("Security log status update notice:", secErr);
        }
      }

      setSuccessTicket(ticketNo);

      // Automated Vocal PA Announcement on Ticket Creation
      voiceAnnouncer.announceNewTicket({
        ticketNo: ticketNo,
        patientName: cleanName,
        department: "NURSE TRIAGE & VITALS",
        assignedRoom: "Triage Desk"
      }).catch(e => console.warn("Kiosk voice announcement error:", e));

      toast.success(
        `Patient ${cleanName} registered and queued to Nurse Triage Station (Ticket #${ticketNo}).`,
        "Queued to Nurse Triage"
      );

      // Reset form fields
      setPatientName("");
      setNationalId("");
      setPhone("");
      setAge("");
      setIssue("");
      setBiometricsCaptured(false);
      setShaStatus(null);
      setExistingPatientProfile(null);
      setActiveDuplicateEncounter(null);
      onTicketCreated();
    } catch (err: any) {
      console.error("Failed to register patient/ticket:", err);
      toast.error(err?.message || "Failed to register patient and issue ticket.", "Onboarding Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="reception-kiosk" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Walk-in Reception Desk</h2>
            <p className="text-xs text-gray-500">ID Verification, Biometrics & SHA Claim Intake</p>
          </div>
        </div>

        <button
          id="btn-instant-patient-history-lookup"
          type="button"
          onClick={() => {
            setHistorySearchId(nationalId);
            setShowHistoryModal(true);
          }}
          className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <History className="w-4 h-4 text-indigo-600" />
          <span>Instant Patient ID / History Lookup</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form and capture fields */}
        <form onSubmit={handleRegisterAndTicket} className="lg:col-span-8 space-y-4">
          
          {/* SECURITY GATE CHECKPOINT INFLOW & PATIENT RETRIEVAL DRAWER */}
          {securityLogs.length > 0 && (
            <div id="security-gate-inflow-card" className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 space-y-3 transition-all animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-sky-600 text-white rounded-lg shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                        Security Checkpoint Inflow Stream
                      </h4>
                      <span className="px-2 py-0.5 bg-sky-200 text-sky-900 rounded-full text-[10px] font-extrabold">
                        {securityLogs.filter(l => l.receptionStatus !== "registered").length} Waiting Intake
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-800">
                      Entrants logged at hospital security gates can be retrieved instantly using National ID or the one-click button below.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSecurityGateDrawer(!showSecurityGateDrawer)}
                  className="px-2.5 py-1 text-xs text-sky-700 hover:text-sky-900 bg-white/80 hover:bg-white rounded-lg border border-sky-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{showSecurityGateDrawer ? "Collapse" : "Expand Arrivals"}</span>
                  {showSecurityGateDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showSecurityGateDrawer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {securityLogs.slice(0, 6).map((log) => {
                    const isRegistered = log.receptionStatus === "registered";
                    const isSelected = matchedSecurityLog?.id === log.id;
                    const logId = log.nationalId || log.idOrPhone || "N/A";
                    const logName = log.patientName || log.nameOrPlate;
                    const timeString = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between gap-2 transition-all ${
                          isSelected
                            ? "bg-white border-sky-500 ring-2 ring-sky-300 shadow-sm"
                            : isRegistered
                            ? "bg-sky-100/40 border-sky-200 opacity-60"
                            : "bg-white border-sky-200 hover:border-sky-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 truncate max-w-[130px]" title={logName}>
                              {logName}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isRegistered ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                            }`}>
                              {isRegistered ? "Registered" : log.checkpoint}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                            <span>ID: <strong className="text-gray-800">{logId}</strong></span>
                            <span>{timeString}</span>
                          </div>

                          {log.notes && (
                            <p className="text-[10px] text-gray-600 italic line-clamp-1">
                              "{log.notes}"
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRetrieveFromSecurityLog(log)}
                          className={`w-full py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-sky-600 text-white shadow-xs"
                              : "bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200"
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          <span>{isSelected ? "Active in Form" : "Retrieve Patient"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* National ID Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-600">National ID / Passport</label>
                {isCheckingId && (
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Verifying ID & Gate Logs...
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <CreditCard className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                  <input
                    id="input-national-id"
                    type="text"
                    required
                    placeholder="e.g. 32441928"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-xl text-sm focus:outline-hidden font-mono ${
                      activeDuplicateEncounter
                        ? "border-rose-400 bg-rose-50/50 text-rose-950 focus:border-rose-500"
                        : existingPatientProfile
                        ? "border-emerald-400 bg-emerald-50/30 text-emerald-950 focus:border-emerald-500"
                        : matchedSecurityLog
                        ? "border-sky-400 bg-sky-50/30 text-sky-950 focus:border-sky-500"
                        : "border-gray-200 focus:border-emerald-500"
                    }`}
                  />
                </div>
                <button
                  id="btn-scan-id"
                  type="button"
                  onClick={handleFocusIDScanInput}
                  disabled={scanning}
                  className="px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium rounded-xl text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Click to engage optical reader / barcode gun"
                >
                  <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                  <span>{scanning ? "Ready..." : "Optical Scan"}</span>
                </button>
              </div>
            </div>

            {/* Health Authority Check */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Social Health Authority (SHA)</label>
              <button
                id="btn-check-sha"
                type="button"
                onClick={checkSHAEligibility}
                disabled={shaLoading || !nationalId}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {shaLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Check AfyaLink/Taifa Care
              </button>
            </div>
          </div>

          {/* SECURITY GATE CLEARANCE VERIFIED BADGE */}
          {matchedSecurityLog && (
            <div
              id="security-gate-match-badge"
              className="p-3.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-xs"
            >
              <div className="flex items-start gap-2.5">
                <Shield className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sky-950">
                      Security Gate Arrival Linked & Verified
                    </p>
                    <span className="px-2 py-0.5 bg-sky-200 text-sky-900 border border-sky-300 rounded text-[9px] font-black uppercase tracking-wider">
                      {matchedSecurityLog.status || "AUTHORIZED"}
                    </span>
                  </div>
                  <p className="text-sky-900 text-[11px]">
                    Logged at <strong className="font-semibold">{matchedSecurityLog.checkpoint}</strong> by <span className="font-semibold">{matchedSecurityLog.officerName || "Security Desk"}</span> at {new Date(matchedSecurityLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                  </p>
                  {matchedSecurityLog.notes && (
                    <p className="text-[10px] text-sky-800 font-medium italic">
                      Guard Notes: "{matchedSecurityLog.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-md border border-emerald-300">
                  Ready to Queue to Triage
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE DUPLICATE ENCOUNTER REJECTION ALERT BANNER */}
          {activeDuplicateEncounter && (
            <div
              id="active-duplicate-warning-banner"
              className="p-4 rounded-xl border border-rose-200 bg-rose-50/90 text-rose-950 text-xs space-y-2 animate-fade-in"
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-rose-900 uppercase tracking-wide">
                      Active Encounter Detected — Duplicate Ticket Blocked
                    </span>
                    <span className="px-2 py-0.2 bg-rose-600 text-white rounded text-[9px] font-black uppercase tracking-wider">
                      REJECTED
                    </span>
                  </div>
                  <p className="text-rose-800 leading-relaxed font-medium">
                    This patient already has an unresolved ticket in the hospital system. Under anti-duplication safety rules, a second active ticket cannot be issued for ID <strong className="font-mono text-rose-950">{nationalId}</strong>.
                  </p>
                  <div className="mt-2 pt-2 border-t border-rose-200/80 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-rose-900">
                    <span>
                      Active Ticket: <strong className="font-mono">{activeDuplicateEncounter.activeTicket?.ticketNumber || activeDuplicateEncounter.activeQueue?.ticketNo}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Location: <strong className="uppercase">{activeDuplicateEncounter.activeTicket?.department || activeDuplicateEncounter.activeQueue?.currentDepartment}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Priority: <strong className="capitalize">{activeDuplicateEncounter.activeTicket?.priority || "Normal"}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REGISTERED PATIENT EHR FILE RECOGNIZED BADGE */}
          {existingPatientProfile && !activeDuplicateEncounter && (
            <div
              id="existing-patient-found-badge"
              className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
            >
              <div className="flex items-start gap-2.5">
                <UserCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-emerald-900">
                      Existing Medical Record Recognized
                    </p>
                    <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold">
                      Profile Linked
                    </span>
                  </div>
                  <p className="text-emerald-800 text-[11px]">
                    Patient: <strong className="font-semibold text-emerald-950">{existingPatientProfile.patientName}</strong> • Age: {existingPatientProfile.age} • Gender: {existingPatientProfile.gender} • Blood: {existingPatientProfile.bloodType} • <span className="font-semibold">{existingPatientProfile.visits?.length || 1} Past Visit(s) on File</span>.
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    All prior treatments, diagnoses, and prescriptions retrieved automatically.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHistorySearchId(existingPatientProfile.nationalId || nationalId);
                  setShowHistoryModal(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Treatment History</span>
              </button>
            </div>
          )}

          {/* SHA Response Alert Box */}
          {shaStatus && (
            <div
              id="sha-status-banner"
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                shaStatus.eligible
                  ? "bg-emerald-50 border-emerald-100 text-emerald-900"
                  : "bg-rose-50 border-rose-100 text-rose-950"
              }`}
            >
              {shaStatus.eligible ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">
                  {shaStatus.eligible ? "Taifa Care / SHA Active" : "SHA Status Flagged"}
                </p>
                <p className="opacity-90">
                  Patient: <span className="font-semibold">{shaStatus.patientName}</span> • Eligibility ID:{" "}
                  <span className="font-mono">{shaStatus.shaId || "N/A"}</span>
                </p>
                <p className="opacity-75">Limits: Outpatient KES {shaStatus.benefitLimits?.outpatient?.toLocaleString()} remaining.</p>
              </div>
            </div>
          )}

          {/* Demographics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Full Patient Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="input-patient-name"
                  type="text"
                  required
                  placeholder="e.g. Alice Wambui Kamau"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Mobile Phone</label>
              <input
                id="input-phone"
                type="text"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Age</label>
              <input
                id="input-age"
                type="number"
                placeholder="Years"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Gender</label>
              <select
                id="select-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Blood Type (ABO / Rh)</label>
              <select
                id="select-blood-type"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="Not Sure">Not Sure / Unknown (Lab Confirmation Required)</option>
                <option value="O+">O+ (O Positive)</option>
                <option value="O-">O- (O Negative)</option>
                <option value="A+">A+ (A Positive)</option>
                <option value="A-">A- (A Negative)</option>
                <option value="B+">B+ (B Positive)</option>
                <option value="B-">B- (B Negative)</option>
                <option value="AB+">AB+ (AB Positive)</option>
                <option value="AB-">AB- (AB Negative)</option>
              </select>
            </div>
          </div>

          {/* Dedicated Nurse Triage & Vitals Routing Flow Banner */}
          <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wide flex items-center gap-2">
                    <span>Clinical Intake Protocol: Nurse Triage & Vitals Desk</span>
                    <span className="px-2 py-0.2 bg-rose-200 text-rose-800 text-[9px] font-black rounded-full uppercase">Standard OPD Care</span>
                  </h3>
                  <p className="text-[11px] text-rose-800">
                    Patient will be issued ticket and queued for the <strong>Nurse Station</strong> to record full vital signs (BP, Pulse, Temp, SpO2, RBS, BMI) & triage urgency before doctor consultation.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFastTrackDirectVitals(!fastTrackDirectVitals)}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100/80 border border-rose-300 text-rose-900 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                >
                  {fastTrackDirectVitals ? "Hide Direct Vitals" : "⚡ Emergency Fast-Track Entry"}
                </button>
              </div>
            </div>

            {/* Optional Collapsible Fast-Track Vitals Entry (For Night Shift or Immediate Resuscitation) */}
            {fastTrackDirectVitals && (
              <div className="pt-3 border-t border-rose-200/60 space-y-3 animate-fade-in">
                <p className="text-[10px] font-bold text-rose-700 uppercase">
                  Direct Front-Desk Vitals Override (Optional):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase">BP (mmHg)</label>
                    <input
                      id="input-triage-bp"
                      type="text"
                      value={triageBp}
                      onChange={(e) => setTriageBp(e.target.value)}
                      placeholder="120/80"
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase">Temp (°C)</label>
                    <input
                      id="input-triage-temp"
                      type="text"
                      value={triageTemp}
                      onChange={(e) => setTriageTemp(e.target.value)}
                      placeholder="36.8"
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase">Pulse (bpm)</label>
                    <input
                      id="input-triage-pulse"
                      type="text"
                      value={triagePulse}
                      onChange={(e) => setTriagePulse(e.target.value)}
                      placeholder="72"
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase">Weight (kg)</label>
                    <input
                      id="input-triage-weight"
                      type="text"
                      value={triageWeight}
                      onChange={(e) => setTriageWeight(e.target.value)}
                      placeholder="68"
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase">Height (cm)</label>
                    <input
                      id="input-triage-height"
                      type="text"
                      value={triageHeight}
                      onChange={(e) => setTriageHeight(e.target.value)}
                      placeholder="170"
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 uppercase">Known Allergies / Intolerances</label>
                <input
                  id="input-triage-allergies"
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa, Peanuts or NKDA"
                  className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 uppercase">Chronic Conditions / Health Alerts</label>
                <input
                  id="input-triage-chronic"
                  type="text"
                  value={chronicConditions}
                  onChange={(e) => setChronicConditions(e.target.value)}
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                  className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Patient Complaint / Reason for Visit */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Patient Chief Complaint / Reason for Visit
            </label>
            <textarea
              id="input-patient-issue"
              required
              rows={2}
              placeholder="e.g. Complaining of sudden abdominal pain, mild nausea, or routine follow-up checkup..."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden bg-white shadow-2xs"
            />
          </div>

          {/* HOSPITAL CARE PATHWAY NOTICE: AUTOMATIC ROUTING TO NURSE TRIAGE */}
          <div className="p-4 bg-gradient-to-r from-rose-50 via-pink-50/50 to-amber-50/40 rounded-2xl border border-rose-200/80 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                  Standard Clinical Routing: Nurse Triage & Vitals First
                </h4>
                <p className="text-[11px] text-rose-800">
                  Patient is automatically queued to Nurse Triage Desk 1 for vitals, TEWS assessment & specialist assignment.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-[10px]">1</span>
                <span className="text-slate-700 font-medium">Reception Intake</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[10px]">2</span>
                <span className="text-rose-900 font-bold">Nurse Triage & Vitals</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">3</span>
                <span className="text-slate-700 font-medium">Doctor / Specialist Clinic</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-register-submit"
            type="submit"
            disabled={submitting || !!activeDuplicateEncounter}
            className={`w-full py-3.5 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              activeDuplicateEncounter
                ? "bg-rose-600 hover:bg-rose-700 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/20"
            }`}
          >
            {activeDuplicateEncounter ? (
              <>
                <Ban className="w-4 h-4" />
                <span>Duplicate Encounter Blocked (Active Ticket Exists)</span>
              </>
            ) : submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Creating Record & Queuing to Nurse Triage...</span>
              </>
            ) : (
              <>
                <Ticket className="w-4.5 h-4.5" />
                <span>Issue Ticket & Route to Nurse Triage Station</span>
              </>
            )}
          </button>
        </form>

        {/* Sidebar / Biometrics & Printing */}
        <div className="lg:col-span-4 space-y-6">
          {/* Biometrics */}
          <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <Fingerprint className="w-4.5 h-4.5 text-indigo-600" />
                <span>Biometrics & Phone Fingerprint Hub</span>
              </h3>
              {biometricsCaptured ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center gap-1">
                  📱 Phone & USB
                </span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-5 border border-dashed border-indigo-200 bg-white rounded-2xl space-y-3">
              <button
                id="btn-biometric-capture"
                type="button"
                onClick={() => setIsBiometricModalOpen(true)}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                  biometricsCaptured
                    ? "bg-emerald-500 text-white shadow-emerald-500/20 ring-4 ring-emerald-100"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25 hover:scale-105"
                }`}
              >
                <Fingerprint className="w-8 h-8" />
              </button>

              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-gray-800">
                  {biometricsCaptured
                    ? `Fingerprint Verified (${biometricScanData?.qualityScore || 98}% Quality)`
                    : "Open Phone / USB Biometrics"}
                </p>
                <p className="text-[10px] text-gray-500">
                  {biometricsCaptured
                    ? `Device: ${biometricScanData?.deviceUsed || "Phone / USB Reader"}`
                    : "Supports Phone Fingerprints (Android/iOS), QR Remote Pair & USB Scanners"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBiometricModalOpen(true)}
                className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-200"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>{biometricsCaptured ? "Re-scan Fingerprint" : "Scan via Phone / USB Sensor"}</span>
              </button>
            </div>

          </div>

          {/* Output Ticket Receipt Simulator */}
          {successTicket && (
            <div id="thermal-ticket" className="p-5 border-2 border-emerald-100 bg-emerald-50/20 rounded-2xl space-y-3 relative overflow-hidden animate-scale-up">
              <div className="absolute right-0 top-0 bg-emerald-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl">
                Printed
              </div>
              <h4 className="text-xs font-bold text-emerald-800">Queue Receipt Issued</h4>
              <div className="bg-white p-4 border border-gray-100 rounded-xl text-center space-y-1.5 shadow-xs font-mono">
                <p className="text-[10px] text-gray-400 uppercase">A.B.M Clinic Reception</p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-wider">{successTicket}</h3>
                
                <div className="py-1.5 px-2 bg-rose-50 rounded-lg border border-rose-200 text-left text-xs font-sans space-y-0.5">
                  <div className="font-bold text-rose-950 flex items-center justify-between">
                    <span>Target: Nurse Triage & Vitals</span>
                  </div>
                  <p className="text-[11px] text-rose-800 font-semibold">Triage Desk 1</p>
                  <p className="text-[10px] text-slate-600">Action: Vitals Assessment & Doctor Referral</p>
                </div>
                
                <p className="text-[9px] text-gray-400">{new Date().toLocaleString()}</p>
              </div>
              <p className="text-[10px] text-emerald-700 text-center">
                Patient directed to Nurse Triage Desk. Ticket is visible on Triage Station display.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DUPLICATE ENCOUNTER REJECTION MODAL */}
      {duplicateRejectionModal?.show && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-60 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border-2 border-rose-200 overflow-hidden animate-scale-up">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-700/60 rounded-2xl">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">Duplicate Ticket Registration Rejected</h3>
                  <p className="text-[11px] text-rose-100 font-medium">Hospital Patient Identity Verification Rule</p>
                </div>
              </div>
              <button 
                onClick={() => setDuplicateRejectionModal(null)}
                className="p-1 rounded-xl hover:bg-rose-700/50 text-rose-100 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-rose-900 font-medium leading-relaxed">
                    Patient <strong className="font-bold text-rose-950">{duplicateRejectionModal.patientName}</strong> with National ID <span className="font-mono font-bold text-rose-950">{duplicateRejectionModal.nationalId}</span> already has an active hospital encounter in progress.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Active Clinical Encounter Record
                </div>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Ticket No</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {duplicateRejectionModal.checkResult.activeTicket?.ticketNumber || duplicateRejectionModal.checkResult.activeQueue?.ticketNo}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Department</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {duplicateRejectionModal.checkResult.activeTicket?.department || duplicateRejectionModal.checkResult.activeQueue?.currentDepartment}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Current Status</span>
                    <span className="font-bold text-amber-600 capitalize">
                      {duplicateRejectionModal.checkResult.activeTicket?.status || duplicateRejectionModal.checkResult.activeQueue?.status || "Active in Queue"}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Encounter Time</span>
                    <span className="font-bold text-slate-900 text-[11px]">
                      {duplicateRejectionModal.checkResult.activeTicket?.createdTime || duplicateRejectionModal.checkResult.activeQueue?.timestamp ? new Date(duplicateRejectionModal.checkResult.activeQueue?.timestamp || "").toLocaleTimeString() : "Today"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                To maintain single-patient clinical integrity and prevent accidental billing duplication, please resolve or close their active ticket before issuing a new one.
              </p>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDuplicateRejectionModal(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow-md transition-colors"
                >
                  Understood & Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instant Patient EHR & Treatment History Modal */}
      <PatientHistoryLookupModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        initialSearchId={historySearchId || nationalId}
        onSelectPatientForIntake={(p) => {
          setNationalId(p.nationalId || "");
          setPatientName(p.patientName || "");
          setPhone(p.phone || "");
          setAge(p.age ? String(p.age) : "");
          if (p.gender) setGender(p.gender);
          if (p.bloodType) setBloodType(p.bloodType);
          if (p.shaEligible === "eligible" && p.shaId) {
            setShaStatus({
              eligible: true,
              shaId: p.shaId,
              patientName: p.patientName,
              benefitLimits: { outpatient: 100000, inpatient: 500000 }
            });
          }
          toast.success(`Loaded clinical profile for ${p.patientName}`, "Patient Record Retrieved");
        }}
      />
      {/* Biometric Hardware Scanner Modal */}
      <BiometricScannerModal
        isOpen={isBiometricModalOpen}
        onClose={() => setIsBiometricModalOpen(false)}
        patientName={patientName || "Patient"}
        nationalId={nationalId}
        onBiometricCaptured={(res) => {
          setBiometricsCaptured(true);
          setBiometricScanData(res);
          setIsBiometricModalOpen(false);
          toast.success(
            `Biometric fingerprint registered successfully (${res.qualityScore}% match quality on ${res.deviceUsed || "USB Scanner"}).`,
            "Biometrics Verified"
          );
        }}
      />
    </div>
  );
}

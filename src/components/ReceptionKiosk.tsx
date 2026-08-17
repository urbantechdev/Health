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
  History
} from "lucide-react";
import { Employee, MedicalRecord, SystemTicket, QueueTicket } from "../types";
import { createAutoTicket, checkActivePatientEncounter, findPatientByNationalId, DuplicateEncounterCheck } from "../lib/ticketService";

interface ReceptionKioskProps {
  onTicketCreated: () => void;
}

export default function ReceptionKiosk({ onTicketCreated }: ReceptionKioskProps) {
  const [patientName, setPatientName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [bloodType, setBloodType] = useState("O+");
  const [service, setService] = useState("General Doctor");
  const [issue, setIssue] = useState("");

  // Specialists state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignedSpecialistId, setAssignedSpecialistId] = useState<string>("");

  // Real-time lookup & duplicate check states
  const [existingPatientProfile, setExistingPatientProfile] = useState<MedicalRecord | null>(null);
  const [activeDuplicateEncounter, setActiveDuplicateEncounter] = useState<DuplicateEncounterCheck | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(false);

  // Duplicate Encounter Rejection Modal state
  const [duplicateRejectionModal, setDuplicateRejectionModal] = useState<{
    show: boolean;
    checkResult: DuplicateEncounterCheck;
    nationalId: string;
    patientName: string;
  } | null>(null);

  // Subscribe to employees from Firestore to list clinical specialists
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((doc) => {
        emps.push({ id: doc.id, ...doc.data() } as Employee);
      });
      // Filter active clinical employees/doctors/pharmacists/etc.
      setEmployees(emps.filter(emp => emp.status === "active"));
    });
    return () => unsubscribe();
  }, []);

  // Real-time National ID lookup function
  const performIdLookup = useCallback(async (idToCheck: string) => {
    const cleanId = (idToCheck || "").trim();
    if (!cleanId || cleanId.length < 3) {
      setExistingPatientProfile(null);
      setActiveDuplicateEncounter(null);
      return;
    }

    setIsCheckingId(true);
    try {
      // 1. Check for active duplicate encounters (open ticket or active queue)
      const dupCheck = await checkActivePatientEncounter(cleanId);
      setActiveDuplicateEncounter(dupCheck.isDuplicate ? dupCheck : null);

      // 2. Check for existing registered patient file in EHR database
      const existingPatient = await findPatientByNationalId(cleanId);
      if (existingPatient) {
        setExistingPatientProfile(existingPatient);
        // Auto-populate demographics if current fields are empty
        setPatientName((prev) => prev || existingPatient.patientName || "");
        setPhone((prev) => prev || existingPatient.phone || "");
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
      }
    } catch (err) {
      console.error("Error performing ID verification lookup:", err);
    } finally {
      setIsCheckingId(false);
    }
  }, []);

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

  // SHA integration state
  const [shaLoading, setShaLoading] = useState(false);
  const [shaStatus, setShaStatus] = useState<any | null>(null);

  // Scanning simulation
  const [scanning, setScanning] = useState(false);

  // Form submitting
  const [submitting, setSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  const simulateIDScan = () => {
    setScanning(true);
    setTimeout(() => {
      // Hardware Optical Reader Simulation: Generate formatted Kenyan National ID and Phone
      const freshId = String(Math.floor(20000000 + Math.random() * 19000000));
      setNationalId(freshId);
      setPhone("07" + Math.floor(10000000 + Math.random() * 90000000));
      setScanning(false);
    }, 1200);
  };

  const checkSHAEligibility = async () => {
    if (!nationalId) {
      alert("Please scan or enter a National ID / Passport number first.");
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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShaLoading(false);
    }
  };

  const captureBiometrics = () => {
    setCapturing(true);
    setTimeout(() => {
      setBiometricsCaptured(true);
      setCapturing(false);
    }, 2000);
  };

  const handleRegisterAndTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = nationalId.trim();
    const cleanName = patientName.trim();

    if (!cleanName || !cleanId) {
      alert("Please fill out patient name and scan/input ID.");
      return;
    }

    setSubmitting(true);
    setSuccessTicket(null);

    try {
      // STEP 1: Strict Anti-Duplication Check
      // Reject if patient already has an active hospital encounter in queue or open system tickets
      const dupCheck = await checkActivePatientEncounter(cleanId);
      if (dupCheck.isDuplicate) {
        setDuplicateRejectionModal({
          show: true,
          checkResult: dupCheck,
          nationalId: cleanId,
          patientName: cleanName
        });
        setSubmitting(false);
        return;
      }

      // Dynamic prefix generator & mapping specialist details
      let prefix = "GEN";
      let currentDept: any = "doctor";
      let selectedServiceName = service;
      let specName = "";

      if (assignedSpecialistId) {
        const spec = employees.find(e => e.id === assignedSpecialistId);
        if (spec) {
          specName = spec.name;
          const dept = spec.department.toLowerCase();
          if (dept === "medical" || dept === "nursing") {
            currentDept = "doctor";
            selectedServiceName = `Consultation with ${spec.name} (${spec.specialty || "General GP"})`;
          } else if (dept === "laboratory" || dept === "lab") {
            currentDept = "laboratory";
            selectedServiceName = `Lab Service: ${spec.name}`;
            prefix = "LAB";
          } else if (dept === "radiology") {
            currentDept = "radiology";
            selectedServiceName = `Radiology Service: ${spec.name}`;
            prefix = "RAD";
          } else if (dept === "pharmacy") {
            currentDept = "pharmacy";
            selectedServiceName = `Pharmacy Service: ${spec.name}`;
            prefix = "PHA";
          } else {
            currentDept = "doctor";
            selectedServiceName = `Consultation with ${spec.name}`;
          }
        }
      } else {
        if (service === "Laboratory") {
          prefix = "LAB";
          currentDept = "laboratory";
        } else if (service === "Radiology") {
          prefix = "RAD";
          currentDept = "radiology";
        } else if (service === "Pharmacy") {
          prefix = "PHA";
          currentDept = "pharmacy";
        } else if (service === "Labour Room") {
          prefix = "LBR";
          currentDept = "labour_room";
        } else if (service === "Gynecology (Gyna)") {
          prefix = "GYN";
          currentDept = "gyna";
        }
      }

      const ticketNo = `${prefix}-${Math.floor(Math.random() * 900 + 100)}`;

      // STEP 2: EHR Record Management (Prevent Duplicate Patient Document)
      let resolvedPatientId = "";
      const existingPatient = await findPatientByNationalId(cleanId);

      const newVisit = {
        id: `vst-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        vitals: {
          temp: "36.8",
          bp: "120/80",
          pulse: "72",
          weight: "68",
        },
        symptoms: issue.trim() || "Walk-in registration. Presenting for routine assessment/consultation.",
        diagnosis: "Initial checkup pending clinical consultation",
        prescriptions: [],
        referrals: [],
      };

      if (existingPatient) {
        // Patient already exists in database -> DO NOT create duplicate record.
        // Update existing record by appending the visit and updating latest contact info.
        resolvedPatientId = existingPatient.id;
        const updatedVisits = [...(existingPatient.visits || []), newVisit];
        await updateDoc(doc(db, "patients", existingPatient.id), {
          patientName: cleanName,
          phone: phone.trim() || existingPatient.phone,
          age: parseInt(age) || existingPatient.age || 30,
          gender: gender || existingPatient.gender,
          bloodType: bloodType || existingPatient.bloodType,
          shaEligible: shaStatus?.eligible ? "eligible" : (existingPatient.shaEligible || "not_eligible"),
          shaId: shaStatus?.shaId || existingPatient.shaId || "",
          visits: updatedVisits,
        });
        console.log(`Updated existing patient EHR profile [${existingPatient.id}] with new visit.`);
      } else {
        // Brand new patient -> Create new document in `patients`
        const newPatientData = {
          patientName: cleanName,
          nationalId: cleanId,
          phone: phone.trim(),
          age: parseInt(age) || 30,
          gender,
          bloodType,
          shaEligible: shaStatus?.eligible ? "eligible" : "not_eligible",
          shaId: shaStatus?.shaId || "",
          visits: [newVisit],
        };
        const patientRef = await addDoc(collection(db, "patients"), newPatientData);
        resolvedPatientId = patientRef.id;
        console.log(`Created new patient EHR profile [${patientRef.id}].`);
      }

      // STEP 3: Create active Queue ticket in database
      const queueData = {
        ticketNo,
        patientName: cleanName,
        nationalId: cleanId,
        biometricStatus: biometricsCaptured ? "verified" : "not_verified",
        service: selectedServiceName,
        currentDepartment: currentDept,
        status: "pending",
        patientId: resolvedPatientId,
        timestamp: new Date().toISOString(),
        phone: phone.trim() || "N/A",
        age: parseInt(age) || 30,
        issue: issue.trim() || "Not Specified",
        assignedSpecialistId: assignedSpecialistId || "",
        assignedSpecialistName: specName || "",
      };

      await addDoc(collection(db, "queue"), queueData);

      // STEP 4: Automatically trigger system ticket creation
      await createAutoTicket({
        patientName: cleanName,
        nationalId: cleanId,
        phone: phone.trim(),
        department: currentDept,
        visitReason: issue.trim() || selectedServiceName || "Outpatient Clinical Intake",
        priority: "Normal",
        patientId: resolvedPatientId
      });

      setSuccessTicket(ticketNo);
      // Reset form fields
      setPatientName("");
      setNationalId("");
      setPhone("");
      setAge("");
      setIssue("");
      setAssignedSpecialistId("");
      setBiometricsCaptured(false);
      setShaStatus(null);
      setExistingPatientProfile(null);
      setActiveDuplicateEncounter(null);
      onTicketCreated();
    } catch (err) {
      console.error("Failed to register patient/ticket:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="reception-kiosk" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Walk-in Reception Desk</h2>
          <p className="text-xs text-gray-500">ID Verification, Biometrics & SHA Claim Intake</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form and capture fields */}
        <form onSubmit={handleRegisterAndTicket} className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* National ID Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-600">National ID / Passport</label>
                {isCheckingId && (
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Verifying ID...
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
                        : "border-gray-200 focus:border-emerald-500"
                    }`}
                  />
                </div>
                <button
                  id="btn-scan-id"
                  type="button"
                  onClick={simulateIDScan}
                  disabled={scanning}
                  className="px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium rounded-xl text-gray-700 flex items-center gap-1.5 transition-colors"
                >
                  {scanning ? "Scanning..." : "Scan ID"}
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
              className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950 text-xs flex items-start gap-2.5 animate-fade-in"
            >
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
                  New intake will be appended directly to their existing medical history without creating duplicate patient records.
                </p>
              </div>
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
              <label className="block text-xs font-semibold text-gray-600">Blood Type</label>
              <select
                id="select-blood-type"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option>O+</option>
                <option>A+</option>
                <option>B+</option>
                <option>AB+</option>
                <option>O-</option>
              </select>
            </div>
          </div>

          {/* Desired Service Ticket */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">Required Service Department</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { name: "General Doctor", label: "Consultation" },
                { name: "Laboratory", label: "Diagnostic Tests" },
                { name: "Radiology", label: "DICOM Scans" },
                { name: "Pharmacy", label: "Dispensary & POS" },
                { name: "Labour Room", label: "Maternity Care" },
                { name: "Gynecology (Gyna)", label: "Specialist OB/GYN" },
              ].map((serv) => (
                <button
                  key={serv.name}
                  id={`btn-service-${serv.name.toLowerCase().replace(" ", "-")}`}
                  type="button"
                  onClick={() => {
                    setService(serv.name);
                    // Clear specialist if switching to a non-medical department that doesn't fit
                    if (serv.name !== "General Doctor") {
                      setAssignedSpecialistId("");
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    service === serv.name && !assignedSpecialistId
                      ? "border-emerald-500 bg-emerald-50/40 text-emerald-800 font-semibold"
                      : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                  }`}
                >
                  <span className="block text-xs">{serv.name}</span>
                  <span className="text-[10px] text-gray-400 font-normal">{serv.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Patient Complaint / Issue */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">Patient Complaint / Chief Medical Issue</label>
            <textarea
              id="input-patient-issue"
              required
              rows={2}
              placeholder="e.g. Complaining of sudden abdominal pain, mild nausea, and slight dizziness for past 12 hours."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
            />
          </div>

          {/* Specialist / Staff Assignment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-600">Assign to Specific Specialist (Optional)</label>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Real-time Employee Registry</span>
            </div>
            <div className="relative">
              <select
                id="select-specialist"
                value={assignedSpecialistId}
                onChange={(e) => {
                  const specId = e.target.value;
                  setAssignedSpecialistId(specId);
                  if (specId) {
                    const spec = employees.find(emp => emp.id === specId);
                    if (spec) {
                      // Auto-select correct category based on department
                      const dept = spec.department.toLowerCase();
                      if (dept === "laboratory" || dept === "lab") setService("Laboratory");
                      else if (dept === "radiology") setService("Radiology");
                      else if (dept === "pharmacy") setService("Pharmacy");
                      else setService("General Doctor");
                    }
                  }
                }}
                className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden bg-white appearance-none"
              >
                <option value="">-- General Pool (Dispatch to department queue) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.role} [{emp.specialty || emp.department}]
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              Assigning a specific specialist will immediately route this patient to their personal workbench and trigger an instant ticket notification.
            </p>
          </div>

          {/* Submit Button */}
          <button
            id="btn-register-submit"
            type="submit"
            disabled={submitting || !!activeDuplicateEncounter}
            className={`w-full py-3 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 ${
              activeDuplicateEncounter
                ? "bg-rose-600 hover:bg-rose-700 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700"
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
                <span>Processing EHR & Dispatching Ticket...</span>
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4" />
                <span>Issue Digital Queue Ticket</span>
              </>
            )}
          </button>
        </form>

        {/* Sidebar / Biometrics & Printing */}
        <div className="lg:col-span-4 space-y-6">
          {/* Biometrics */}
          <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Fingerprint className="w-4.5 h-4.5 text-gray-400" />
              <span>Biometric Verification</span>
            </h3>

            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 bg-white rounded-xl">
              <button
                id="btn-biometric-capture"
                type="button"
                onClick={captureBiometrics}
                disabled={capturing || biometricsCaptured}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  biometricsCaptured
                    ? "bg-emerald-100 text-emerald-600"
                    : capturing
                    ? "bg-amber-100 text-amber-600 animate-pulse"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                <Fingerprint className="w-8 h-8" />
              </button>

              <span className="mt-2 text-xs font-medium text-gray-700">
                {biometricsCaptured
                  ? "Biometrics Verified"
                  : capturing
                  ? "Place finger on reader..."
                  : "Tap to scan fingerprint"}
              </span>
              <span className="text-[10px] text-gray-400 mt-1">Smart Applications SDK Proxy</span>
            </div>
          </div>

          {/* Output Ticket Receipt Simulator */}
          {successTicket && (
            <div id="thermal-ticket" className="p-5 border-2 border-emerald-100 bg-emerald-50/20 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="absolute right-0 top-0 bg-emerald-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl">
                Printed
              </div>
              <h4 className="text-xs font-bold text-emerald-800">Queue Receipt Issued</h4>
              <div className="bg-white p-4 border border-gray-100 rounded-xl text-center space-y-1 shadow-xs font-mono">
                <p className="text-[10px] text-gray-400 uppercase">A.B.M Clinic Reception</p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-wider">{successTicket}</h3>
                <p className="text-[11px] font-semibold text-gray-600 capitalize">{service} Intake</p>
                <p className="text-[9px] text-gray-400">{new Date().toLocaleString()}</p>
              </div>
              <p className="text-[10px] text-emerald-700 text-center">
                Autodispatched to department. Present ticket on clinical display screens.
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
    </div>
  );
}

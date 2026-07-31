import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { User, CreditCard, Ticket, Fingerprint, Search, ShieldAlert, CheckCircle, RefreshCw, Stethoscope, Briefcase } from "lucide-react";
import { Employee } from "../types";
import { createAutoTicket } from "../lib/ticketService";

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
      // Simulate scanning Kenyan ID card
      const mockIds = ["32441928", "29110482", "38450123", "20445981"];
      const chosenId = mockIds[Math.floor(Math.random() * mockIds.length)];
      setNationalId(chosenId);
      setPhone("07" + Math.floor(10000000 + Math.random() * 90000000));
      setScanning(false);
    }, 1500);
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
    if (!patientName || !nationalId) {
      alert("Please fill out patient name and scan/input ID.");
      return;
    }

    setSubmitting(true);
    setSuccessTicket(null);

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

    try {
      // 1. Create Patient EHR Record if eligible / standard
      const patientData = {
        patientName,
        nationalId,
        phone,
        age: parseInt(age) || 30,
        gender,
        bloodType,
        shaEligible: shaStatus?.eligible ? "eligible" : "not_eligible",
        shaId: shaStatus?.shaId || "",
        visits: [
          {
            id: `vst-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            vitals: {
              temp: "36.8",
              bp: "120/80",
              pulse: "72",
              weight: "68",
            },
            symptoms: issue || "Walk-in registration. Presenting for routine assessment/consultation.",
            diagnosis: "Initial checkup pending clinical consultation",
            prescriptions: [],
            referrals: [],
          },
        ],
      };

      // 2. Save EHR to Firestore
      const patientRef = await addDoc(collection(db, "patients"), patientData);

      // 3. Create active Queue ticket in database
      const queueData = {
        ticketNo,
        patientName,
        nationalId,
        biometricStatus: biometricsCaptured ? "verified" : "not_verified",
        service: selectedServiceName,
        currentDepartment: currentDept,
        status: "pending",
        patientId: patientRef.id,
        timestamp: new Date().toISOString(),
        phone: phone || "N/A",
        age: parseInt(age) || 30,
        issue: issue || "Not Specified",
        assignedSpecialistId: assignedSpecialistId || "",
        assignedSpecialistName: specName || "",
      };

      await addDoc(collection(db, "queue"), queueData);

      // Automatically trigger system ticket creation
      await createAutoTicket({
        patientName,
        nationalId,
        phone,
        department: currentDept,
        visitReason: issue || selectedServiceName || "Outpatient Clinical Intake",
        priority: "Normal",
        patientId: patientRef.id
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
              <label className="block text-xs font-semibold text-gray-600">National ID / Passport</label>
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-hidden"
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
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <Ticket className="w-4 h-4" />
            {submitting ? "Processing Claim & Dispatching..." : "Issue Digital Queue Ticket"}
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
    </div>
  );
}

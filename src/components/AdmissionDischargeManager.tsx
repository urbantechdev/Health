import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  getDocs
} from "firebase/firestore";
import {
  Encounter,
  EncounterVital,
  EncounterPrescription,
  EncounterLabRequest,
  EncounterBillItem,
  EncounterNursingNote,
  WardBed,
  HospitalWard,
  MedicalRecord,
  AdmissionType,
  EncounterStatus
} from "../types";
import {
  initDefaultHospitalWardsAndBeds,
  createHospitalEncounter,
  addEncounterVital,
  addEncounterPrescription,
  addEncounterLabRequest,
  completeEncounterLabRequest,
  dispenseEncounterPrescription,
  addEncounterNursingNote,
  addEncounterBillItem,
  payEncounterBill,
  signDoctorClinicalDischarge,
  executeAtomicDischarge,
  subscribeEncounters,
  subscribeHospitalBeds,
  subscribeEncounterSubcollections
} from "../lib/encounterService";
import { findUnifiedPatient } from "../lib/patientSyncService";
import { toast } from "../lib/promptService";
import {
  Bed,
  UserCheck,
  Building,
  Heart,
  Stethoscope,
  FlaskRound,
  ShoppingBag,
  CreditCard,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Printer,
  Sparkles,
  Lock,
  Unlock,
  X,
  FileText,
  UserPlus,
  RefreshCw,
  Activity,
  Layers,
  ChevronRight,
  Send,
  Smartphone,
  Hospital
} from "lucide-react";
import PrintDocument from "./PrintDocument";

export default function AdmissionDischargeManager() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [beds, setBeds] = useState<WardBed[]>([]);
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  // Subcollection state for active encounter
  const [subcollections, setSubcollections] = useState<{
    vitals: EncounterVital[];
    prescriptions: EncounterPrescription[];
    labRequests: EncounterLabRequest[];
    billItems: EncounterBillItem[];
    nursingNotes: EncounterNursingNote[];
  }>({
    vitals: [],
    prescriptions: [],
    labRequests: [],
    billItems: [],
    nursingNotes: []
  });

  // UI Active Sub-tab in Detail Inspector
  const [activeTab, setActiveTab] = useState<"vitals" | "prescriptions" | "labs" | "billing" | "nursing" | "discharge">("discharge");
  const [filterStatus, setFilterStatus] = useState<string>("ALL_ACTIVE");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [showNewAdmissionModal, setShowNewAdmissionModal] = useState<boolean>(false);
  const [showAddVitalModal, setShowAddVitalModal] = useState<boolean>(false);
  const [showAddRxModal, setShowAddRxModal] = useState<boolean>(false);
  const [showAddLabModal, setShowAddLabModal] = useState<boolean>(false);
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [showDoctorSignoffModal, setShowDoctorSignoffModal] = useState<boolean>(false);
  const [showDischargeSuccessModal, setShowDischargeSuccessModal] = useState<boolean>(false);
  const [dischargeSuccessData, setDischargeSuccessData] = useState<any>(null);

  // Action loaders
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form states for New Admission
  const [admPatientSearch, setAdmPatientSearch] = useState("");
  const [admSelectedPatient, setAdmSelectedPatient] = useState<MedicalRecord | null>(null);
  const [admPatientName, setAdmPatientName] = useState("");
  const [admNationalId, setAdmNationalId] = useState("");
  const [admPhone, setAdmPhone] = useState("");
  const [admAge, setAdmAge] = useState(32);
  const [admGender, setAdmGender] = useState("Male");
  const [admBloodType, setAdmBloodType] = useState("O+");
  const [admType, setAdmType] = useState<AdmissionType>("INPATIENT");
  const [admBedId, setAdmBedId] = useState("");
  const [admSymptoms, setAdmSymptoms] = useState("Severe acute abdominal pain and pyrexia");
  const [admDiagnosis, setAdmDiagnosis] = useState("Acute Appendicitis (Pre-Op Investigation)");
  const [admDoctorName, setAdmDoctorName] = useState("Dr. Beatrice Omwamba (Consultant Surgeon)");
  const [admVitalTemp, setAdmVitalTemp] = useState("38.4");
  const [admVitalBp, setAdmVitalBp] = useState("130/85");
  const [admVitalPulse, setAdmVitalPulse] = useState("88");
  const [admVitalWeight, setAdmVitalWeight] = useState("72");
  const [admVitalSpo2, setAdmVitalSpo2] = useState("98");

  // Form states for Subcollections
  const [newVitalTemp, setNewVitalTemp] = useState("37.0");
  const [newVitalBp, setNewVitalBp] = useState("120/80");
  const [newVitalPulse, setNewVitalPulse] = useState("76");
  const [newVitalWeight, setNewVitalWeight] = useState("70");
  const [newVitalSpo2, setNewVitalSpo2] = useState("99");
  const [newVitalNotes, setNewVitalNotes] = useState("Patient resting comfortably in bed");

  const [newRxName, setNewRxName] = useState("IV Ceftriaxone 1g");
  const [newRxQty, setNewRxQty] = useState(2);
  const [newRxDosage, setNewRxDosage] = useState("1g IV OD");
  const [newRxInstructions, setNewRxInstructions] = useState("Infuse in 100ml Normal Saline over 30 mins");
  const [newRxPrice, setNewRxPrice] = useState(850);

  const [newLabName, setNewLabName] = useState("Full Haemogram & Differential");
  const [newLabDept, setNewLabDept] = useState("laboratory");
  const [newLabSample, setNewLabSample] = useState("Whole Blood (EDTA)");
  const [newLabPrice, setNewLabPrice] = useState(1200);
  const [newLabNotes, setNewLabNotes] = useState("Check leukocytosis and platelet count");

  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<"Cash" | "M-PESA" | "SHA/NHIF" | "Insurance" | "Split">("M-PESA");
  const [payMpesaPhone, setPayMpesaPhone] = useState("0722123456");

  const [docSignoffNotes, setDocSignoffNotes] = useState("Patient is clinically stable, surgical site healing satisfactorily, afebrile, and ready for home recovery.");
  const [docSignoffName, setDocSignoffName] = useState("Dr. Beatrice Omwamba (Lead Surgeon)");

  const [nurseNoteText, setNurseNoteText] = useState("");
  const [nurseShift, setNurseShift] = useState<"Morning" | "Afternoon" | "Night">("Morning");

  // Initialize wards on mount
  useEffect(() => {
    initDefaultHospitalWardsAndBeds();

    // 1. Subscribe to Encounters
    const unsubEncounters = subscribeEncounters((list) => {
      setEncounters(list);
      if (list.length > 0 && !selectedEncounterId) {
        setSelectedEncounterId(list[0].id);
      }
    });

    // 2. Subscribe to Beds
    const unsubBeds = subscribeHospitalBeds((list) => {
      setBeds(list);
    });

    // 3. Subscribe to Patients
    const unsubPatients = onSnapshot(collection(db, "patients"), (snap) => {
      const pList: MedicalRecord[] = [];
      snap.forEach((d) => pList.push({ id: d.id, ...d.data() } as MedicalRecord));
      setPatients(pList);
    });

    return () => {
      unsubEncounters();
      unsubBeds();
      unsubPatients();
    };
  }, []);

  // Listen to subcollections when selected encounter changes
  useEffect(() => {
    if (!selectedEncounterId) return;
    const unsubSub = subscribeEncounterSubcollections(selectedEncounterId, (data) => {
      setSubcollections(data);
    });
    return () => unsubSub();
  }, [selectedEncounterId]);

  const selectedEncounter = encounters.find((e) => e.id === selectedEncounterId);
  const balanceDue = selectedEncounter ? Math.max(0, (selectedEncounter.totalBilled || 0) - (selectedEncounter.totalPaid || 0)) : 0;

  // Filtered Encounters
  const filteredEncounters = encounters.filter((enc) => {
    const matchesSearch =
      enc.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enc.nationalId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (enc.assignedWard && enc.assignedWard.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === "ALL_ACTIVE") return enc.status !== "DISCHARGED";
    if (filterStatus === "ADMITTED") return enc.status === "ADMITTED";
    if (filterStatus === "DISCHARGING") return enc.status === "DISCHARGING";
    if (filterStatus === "DISCHARGED") return enc.status === "DISCHARGED";
    if (filterStatus === "OUTPATIENT") return enc.admissionType === "OUTPATIENT" && enc.status !== "DISCHARGED";

    return true;
  });

  // Calculate metrics
  const totalActive = encounters.filter((e) => e.status !== "DISCHARGED").length;
  const totalInpatients = encounters.filter((e) => e.status === "ADMITTED").length;
  const totalDischarging = encounters.filter((e) => e.status === "DISCHARGING").length;
  const availableBedsCount = beds.filter((b) => b.status === "AVAILABLE").length;
  const occupiedBedsCount = beds.filter((b) => b.status === "OCCUPIED").length;

  // Handle New Admission Submission
  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admPatientName || !admNationalId) {
      toast.warning("Patient Name and National ID are required for hospital admission.", "Missing Details");
      return;
    }

    setActionLoading(true);
    try {
      const matchedBed = beds.find((b) => b.id === admBedId);

      const encId = await createHospitalEncounter({
        patientId: admSelectedPatient?.id || `PAT-${Date.now()}`,
        patientName: admPatientName,
        nationalId: admNationalId,
        phone: admPhone,
        age: admAge,
        gender: admGender,
        bloodType: admBloodType,
        admissionType: admType,
        assignedWardId: matchedBed?.wardId,
        assignedWardName: matchedBed?.wardName,
        assignedBedId: matchedBed?.id,
        assignedBedNumber: matchedBed?.bedNumber,
        initialSymptoms: admSymptoms,
        initialDiagnosis: admDiagnosis,
        attendingDoctorName: admDoctorName,
        initialVitals: {
          temp: admVitalTemp,
          bp: admVitalBp,
          pulse: admVitalPulse,
          weight: admVitalWeight,
          spo2: admVitalSpo2
        },
        recordedBy: "Admissions & Triage Nurse"
      });

      setSelectedEncounterId(encId);
      setShowNewAdmissionModal(false);
      toast.success(`Encounter ${encId} created successfully. Patient admitted to ${matchedBed ? matchedBed.wardName + " (" + matchedBed.bedNumber + ")" : "Outpatient Care"}.`, "Admission Created");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create encounter.", "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Vital
  const handleAddVital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterId) return;
    setActionLoading(true);
    try {
      await addEncounterVital(selectedEncounterId, {
        temp: newVitalTemp,
        bp: newVitalBp,
        pulse: newVitalPulse,
        weight: newVitalWeight,
        spo2: newVitalSpo2,
        notes: newVitalNotes,
        recordedBy: "Ward Duty Nurse"
      });
      setShowAddVitalModal(false);
      toast.success("Vitals recorded successfully.", "Vitals Updated");
    } catch (err: any) {
      toast.error(err.message, "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Prescription
  const handleAddPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterId) return;
    setActionLoading(true);
    try {
      await addEncounterPrescription(selectedEncounterId, {
        drugName: newRxName,
        quantity: Number(newRxQty),
        dosage: newRxDosage,
        instructions: newRxInstructions,
        unitPrice: Number(newRxPrice),
        prescribedBy: selectedEncounter?.attendingDoctorName || "Doctor on Duty"
      });
      setShowAddRxModal(false);
      toast.success(`Prescription for ${newRxName} placed and charged to encounter bill.`, "Prescription Added");
    } catch (err: any) {
      toast.error(err.message, "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Lab Request
  const handleAddLabRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterId) return;
    setActionLoading(true);
    try {
      await addEncounterLabRequest(selectedEncounterId, {
        testName: newLabName,
        department: newLabDept,
        sampleType: newLabSample,
        notes: newLabNotes,
        unitPrice: Number(newLabPrice),
        orderedBy: selectedEncounter?.attendingDoctorName || "Consultant Doctor"
      });
      setShowAddLabModal(false);
      toast.success(`Lab order ${newLabName} sent to diagnostic unit and billed.`, "Lab Order Created");
    } catch (err: any) {
      toast.error(err.message, "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Nursing Note
  const handleAddNursingNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterId || !nurseNoteText) return;
    setActionLoading(true);
    try {
      await addEncounterNursingNote(selectedEncounterId, {
        note: nurseNoteText,
        shift: nurseShift,
        nurseName: "Ward Sister in Charge"
      });
      setNurseNoteText("");
      toast.success("Nursing handover note logged.", "Note Saved");
    } catch (err: any) {
      toast.error(err.message, "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Bill Payment
  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterId || payAmount <= 0) return;
    setActionLoading(true);
    try {
      const res = await payEncounterBill(selectedEncounterId, Number(payAmount), payMethod, `Settled via ${payMethod}`);
      setShowPayModal(false);
      toast.success(`Payment of KES ${Number(payAmount).toLocaleString()} recorded. Total Paid: KES ${res.newTotalPaid.toLocaleString()}. ${res.billingCleared ? "✓ Bill Fully Cleared!" : ""}`, "Payment Processed");
    } catch (err: any) {
      toast.error(err.message, "Payment Failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Doctor Discharge Signoff
  const handleDoctorSignoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterId) return;
    setActionLoading(true);
    try {
      await signDoctorClinicalDischarge(selectedEncounterId, docSignoffName, docSignoffNotes);
      setShowDoctorSignoffModal(false);
      toast.success("Doctor clinical discharge sign-off approved! Encounter status moved to DISCHARGING.", "Clinical Sign-off Approved");
    } catch (err: any) {
      toast.error(err.message, "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle ATOMIC DISCHARGE EXECUTION
  const handleExecuteDischarge = async () => {
    if (!selectedEncounterId || !selectedEncounter) return;
    setActionLoading(true);
    try {
      const result = await executeAtomicDischarge(selectedEncounterId, {
        dischargedBy: "Senior Discharge & Medical Records Officer",
        dischargeReason: "Clinical Resolution & Clearance",
        takeHomeNotes: selectedEncounter.dischargeNotes || "Patient discharged in good health."
      });

      setDischargeSuccessData({
        encounter: selectedEncounter,
        subcollections,
        dischargedAt: new Date().toLocaleString()
      });
      setShowDischargeSuccessModal(true);
      toast.success(result.message, "Discharge Completed");
    } catch (err: any) {
      toast.error(err.message || "Discharge failed atomic verification.", "Discharge Blocked");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Metrics Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
                <Bed className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Admission to Discharge Hub
                  <span className="px-2.5 py-0.5 text-xs font-extrabold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    Firestore Parent-Subcollection Model
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  End-to-end encounter lifecycle tracking with atomic discharge transactions, ward bed allocations, and clinical clearance gates.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowNewAdmissionModal(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Admission / Encounter</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Active Encounters</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalActive}</span>
              <span className="text-xs text-slate-500">across hospital</span>
            </div>
          </div>

          <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200/60">
            <div className="flex items-center justify-between text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Inpatient Wards</span>
              <Bed className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900">{totalInpatients} Admitted</span>
              <span className="text-xs text-blue-600 font-bold">({occupiedBedsCount} Beds Occupied)</span>
            </div>
          </div>

          <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/60">
            <div className="flex items-center justify-between text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Discharge Pipeline</span>
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-900">{totalDischarging}</span>
              <span className="text-xs text-amber-700 font-bold">Awaiting Final Gates</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/60">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Available Ward Beds</span>
              <Building className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-900">{availableBedsCount} Beds</span>
              <span className="text-xs text-emerald-700 font-bold">Ready for Admission</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Encounters Grid: Left Encounter List & Right Deep Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Encounter Directory (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Hospital Encounters ({filteredEncounters.length})
              </h2>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Patient, ID, Ward, or Encounter No..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                {[
                  { id: "ALL_ACTIVE", label: "Active" },
                  { id: "ADMITTED", label: "Inpatients" },
                  { id: "DISCHARGING", label: "Discharging" },
                  { id: "OUTPATIENT", label: "Outpatient" },
                  { id: "DISCHARGED", label: "Discharged" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                      filterStatus === f.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Encounter Cards List */}
            <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
              {filteredEncounters.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <Bed className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold">No matching encounters found.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click "New Admission" to register a patient.</p>
                </div>
              ) : (
                filteredEncounters.map((enc) => {
                  const isSelected = selectedEncounterId === enc.id;
                  const encBalance = Math.max(0, (enc.totalBilled || 0) - (enc.totalPaid || 0));

                  return (
                    <div
                      key={enc.id}
                      onClick={() => setSelectedEncounterId(enc.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-emerald-50/70 border-emerald-500 shadow-md ring-1 ring-emerald-500/30"
                          : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-extrabold text-slate-900 truncate">
                              {enc.patientName}
                            </h3>
                            <span className="text-[10px] font-mono text-slate-400">
                              {enc.nationalId}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
                            {enc.id} • {enc.admissionType}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md shrink-0 ${
                            enc.status === "ADMITTED"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : enc.status === "DISCHARGING"
                              ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                              : enc.status === "DISCHARGED"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {enc.status}
                        </span>
                      </div>

                      {/* Ward & Bed info if inpatient */}
                      {enc.assignedBed && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg mb-2">
                          <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{enc.assignedWard}</span>
                          <span className="text-blue-700 font-black">({enc.assignedBed})</span>
                        </div>
                      )}

                      {/* 3 Micro Clearance Indicator Pills */}
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[9px] font-bold">
                        {/* Doctor Signoff */}
                        <div className={`p-1 rounded-md text-center flex items-center justify-center gap-1 ${
                          enc.doctorDischargeApproved ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}>
                          <Stethoscope className="w-3 h-3 shrink-0" />
                          <span>{enc.doctorDischargeApproved ? "Dr. Signed" : "Dr. Pending"}</span>
                        </div>

                        {/* Labs */}
                        <div className={`p-1 rounded-md text-center flex items-center justify-center gap-1 ${
                          (enc.pendingLabOrders || 0) === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800 animate-pulse"
                        }`}>
                          <FlaskRound className="w-3 h-3 shrink-0" />
                          <span>{(enc.pendingLabOrders || 0) === 0 ? "Labs 0" : `${enc.pendingLabOrders} Labs`}</span>
                        </div>

                        {/* Financial */}
                        <div className={`p-1 rounded-md text-center flex items-center justify-center gap-1 ${
                          enc.billingCleared ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          <CreditCard className="w-3 h-3 shrink-0" />
                          <span>{enc.billingCleared ? "Cleared" : `Bal KES ${encBalance.toLocaleString()}`}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Deep Encounter Inspector & Subcollection Viewer (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedEncounter ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs text-slate-400">
              <Bed className="w-12 h-12 mx-auto mb-3 text-slate-300 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-600">No Encounter Selected</h3>
              <p className="text-xs text-slate-400 mt-1">Select an encounter from the left panel to inspect subcollections and manage discharge.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              
              {/* Encounter Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                      {selectedEncounter.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Admitted: {new Date(selectedEncounter.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    {selectedEncounter.patientName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    National ID: <strong className="text-slate-700">{selectedEncounter.nationalId}</strong> • Age: {selectedEncounter.age} • Gender: {selectedEncounter.gender} • Blood: {selectedEncounter.bloodType}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Billed</span>
                    <span className="text-base font-black text-slate-900">KES {(selectedEncounter.totalBilled || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right pl-3 border-l border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Balance Due</span>
                    <span className={`text-base font-black ${balanceDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      KES {balanceDue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subcollection Navigation Tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
                {[
                  { id: "discharge", label: "Discharge Clearance", icon: ShieldCheck },
                  { id: "vitals", label: `Vitals (${subcollections.vitals.length})`, icon: Heart },
                  { id: "prescriptions", label: `Prescriptions (${subcollections.prescriptions.length})`, icon: ShoppingBag },
                  { id: "labs", label: `Lab Orders (${subcollections.labRequests.length})`, icon: FlaskRound },
                  { id: "billing", label: `Charge Sheet (${subcollections.billItems.length})`, icon: CreditCard },
                  { id: "nursing", label: `Nursing Notes (${subcollections.nursingNotes.length})`, icon: FileText }
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: DISCHARGE CLEARANCE GATE & ATOMIC ENGINE */}
              {activeTab === "discharge" && (
                <div className="space-y-6">
                  {/* Explanation Banner */}
                  <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                      <Lock className="w-4 h-4" />
                      <span>Atomic Hospital Discharge Gatekeeper</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      To safeguard hospital revenue and patient clinical outcomes, patient discharge is strictly guarded by an atomic Firestore transaction. All 3 gates must pass before the patient record is discharged and the ward bed is released back to available.
                    </p>
                  </div>

                  {/* 3 Clearance Gates Checklist Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Gate 1: Doctor Clinical Signoff */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      selectedEncounter.doctorDischargeApproved
                        ? "bg-emerald-50/80 border-emerald-300"
                        : "bg-amber-50/80 border-amber-300"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Gate 1: Doctor Sign-off</span>
                        {selectedEncounter.doctorDischargeApproved ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600 animate-pulse" />
                        )}
                      </div>
                      <h4 className="text-xs font-black text-slate-900">Clinical Approval</h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {selectedEncounter.doctorDischargeApproved
                          ? `Approved by ${selectedEncounter.doctorDischargeApprovedBy || "Doctor"}`
                          : "Pending attending doctor examination and discharge summary."}
                      </p>

                      {!selectedEncounter.doctorDischargeApproved && (
                        <button
                          onClick={() => setShowDoctorSignoffModal(true)}
                          className="mt-3 w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-xs"
                        >
                          Doctor Sign-off Now
                        </button>
                      )}
                    </div>

                    {/* Gate 2: Lab & Diagnostics Complete */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      (selectedEncounter.pendingLabOrders || 0) === 0
                        ? "bg-emerald-50/80 border-emerald-300"
                        : "bg-rose-50/80 border-rose-300"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Gate 2: Lab Orders</span>
                        {(selectedEncounter.pendingLabOrders || 0) === 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                        )}
                      </div>
                      <h4 className="text-xs font-black text-slate-900">Diagnostic Results</h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {(selectedEncounter.pendingLabOrders || 0) === 0
                          ? "All laboratory and diagnostic tests completed."
                          : `${selectedEncounter.pendingLabOrders} test(s) still undergoing diagnostic processing.`}
                      </p>

                      {(selectedEncounter.pendingLabOrders || 0) > 0 && (
                        <button
                          onClick={() => setActiveTab("labs")}
                          className="mt-3 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-xs"
                        >
                          View & Complete Labs
                        </button>
                      )}
                    </div>

                    {/* Gate 3: Financial Settlement */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      selectedEncounter.billingCleared || balanceDue === 0
                        ? "bg-emerald-50/80 border-emerald-300"
                        : "bg-rose-50/80 border-rose-300"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Gate 3: Billing Clearance</span>
                        {selectedEncounter.billingCleared || balanceDue === 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                        )}
                      </div>
                      <h4 className="text-xs font-black text-slate-900">Financial Balance</h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {selectedEncounter.billingCleared || balanceDue === 0
                          ? "Hospital invoice 100% cleared."
                          : `Outstanding balance of KES ${balanceDue.toLocaleString()} must be settled.`}
                      </p>

                      {balanceDue > 0 && (
                        <button
                          onClick={() => {
                            setPayAmount(balanceDue);
                            setShowPayModal(true);
                          }}
                          className="mt-3 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-xs"
                        >
                          Pay KES {balanceDue.toLocaleString()}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Action Trigger */}
                  {selectedEncounter.status === "DISCHARGED" ? (
                    <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center space-y-1">
                      <span className="text-xs font-black text-slate-700">✓ This encounter is already DISCHARGED</span>
                      <p className="text-[11px] text-slate-500">
                        Discharged by {selectedEncounter.dischargedBy || "Discharge Officer"} on {new Date(selectedEncounter.dischargedAt || "").toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-slate-500">
                        {selectedEncounter.doctorDischargeApproved && (selectedEncounter.pendingLabOrders || 0) === 0 && balanceDue === 0 ? (
                          <span className="text-emerald-700 font-black flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            All 3 clearance gates validated. Ready for final discharge execution.
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            Discharge button is locked until all 3 gates pass.
                          </span>
                        )}
                      </div>

                      <button
                        disabled={
                          !selectedEncounter.doctorDischargeApproved ||
                          (selectedEncounter.pendingLabOrders || 0) > 0 ||
                          balanceDue > 0 ||
                          actionLoading
                        }
                        onClick={handleExecuteDischarge}
                        className={`px-8 py-3.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                          selectedEncounter.doctorDischargeApproved && (selectedEncounter.pendingLabOrders || 0) === 0 && balanceDue === 0
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30 active:scale-95 cursor-pointer"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                        }`}
                      >
                        <ShieldCheck className="w-5 h-5" />
                        <span>{actionLoading ? "Executing Atomic Discharge..." : "Execute Atomic Discharge"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: VITALS SUBCOLLECTION */}
              {activeTab === "vitals" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Patient Vitals Subcollection (/encounters/{selectedEncounter.id}/vitals)
                      </h3>
                      <p className="text-[11px] text-slate-500">Live bedside recordings and clinical trends</p>
                    </div>
                    <button
                      onClick={() => setShowAddVitalModal(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Vitals</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {subcollections.vitals.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">No vitals recorded yet.</p>
                    ) : (
                      subcollections.vitals.map((v) => (
                        <div key={v.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                          <div className="grid grid-cols-5 gap-3 text-center min-w-0 flex-1">
                            <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Temp</span>
                              <span className="text-xs font-black text-slate-900">{v.temp}°C</span>
                            </div>
                            <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">BP</span>
                              <span className="text-xs font-black text-slate-900">{v.bp}</span>
                            </div>
                            <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Pulse</span>
                              <span className="text-xs font-black text-slate-900">{v.pulse} bpm</span>
                            </div>
                            <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">SpO2</span>
                              <span className="text-xs font-black text-slate-900">{v.spo2 || 98}%</span>
                            </div>
                            <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Weight</span>
                              <span className="text-xs font-black text-slate-900">{v.weight} kg</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono text-slate-400 block">{new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-[10px] font-bold text-slate-600">{v.recordedBy}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: PRESCRIPTIONS & PHARMACY MAR */}
              {activeTab === "prescriptions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Prescriptions Subcollection (/encounters/{selectedEncounter.id}/prescriptions)
                      </h3>
                      <p className="text-[11px] text-slate-500">Auto-billed medication administration record</p>
                    </div>
                    <button
                      onClick={() => setShowAddRxModal(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Prescribe Medication</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {subcollections.prescriptions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">No prescriptions in this encounter.</p>
                    ) : (
                      subcollections.prescriptions.map((rx) => (
                        <div key={rx.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-900">{rx.drugName}</h4>
                              <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md ${
                                rx.status === "dispensed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800 animate-pulse"
                              }`}>
                                {rx.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Qty: {rx.quantity} • Dosage: {rx.dosage} • {rx.instructions}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              KES {rx.totalPrice.toLocaleString()} • Prescribed by {rx.prescribedBy}
                            </span>
                          </div>

                          {rx.status === "pending" && (
                            <button
                              onClick={async () => {
                                await dispenseEncounterPrescription(selectedEncounter.id, rx.id, "Ward Pharmacist");
                                toast.success(`${rx.drugName} dispensed and MAR updated.`, "Dispensed");
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-xs shrink-0"
                            >
                              Dispense Drug
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: LAB ORDERS & RESULTS */}
              {activeTab === "labs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Lab Orders Subcollection (/encounters/{selectedEncounter.id}/labRequests)
                      </h3>
                      <p className="text-[11px] text-slate-500">Diagnostic investigations and pathology results</p>
                    </div>
                    <button
                      onClick={() => setShowAddLabModal(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Order Lab Test</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {subcollections.labRequests.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">No laboratory orders recorded.</p>
                    ) : (
                      subcollections.labRequests.map((lab) => (
                        <div key={lab.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-slate-900">{lab.testName}</h4>
                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md ${
                                  lab.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 animate-pulse"
                                }`}>
                                  {lab.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                Sample: {lab.sampleType} • Billed: KES {lab.unitPrice.toLocaleString()} • Ordered by: {lab.orderedBy}
                              </p>
                            </div>

                            {lab.status !== "completed" && (
                              <button
                                onClick={async () => {
                                  await completeEncounterLabRequest(
                                    selectedEncounter.id,
                                    lab.id,
                                    "WBC: 12.4 x10^9/L (Mild leukocytosis), Hb: 13.8 g/dL, Platelets: 280k",
                                    "Normal / Mild elevation",
                                    "Lead Lab Technologist"
                                  );
                                  toast.success(`Results submitted for ${lab.testName}. Gate 2 updated.`, "Lab Completed");
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-xs shrink-0"
                              >
                                Submit Lab Results
                              </button>
                            )}
                          </div>

                          {lab.results && (
                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Diagnostic Findings</span>
                              <p className="font-mono text-[11px]">{lab.results}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: CHARGE SHEET & BILLING */}
              {activeTab === "billing" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Itemized Bill Items Subcollection (/encounters/{selectedEncounter.id}/billItems)
                      </h3>
                      <p className="text-[11px] text-slate-500">Real-time dynamic hospital charges</p>
                    </div>
                    {balanceDue > 0 && (
                      <button
                        onClick={() => {
                          setPayAmount(balanceDue);
                          setShowPayModal(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Settle Bill (KES {balanceDue.toLocaleString()})</span>
                      </button>
                    )}
                  </div>

                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-900 text-white rounded-2xl">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Charges</span>
                      <span className="text-sm font-black">KES {(selectedEncounter.totalBilled || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Settled</span>
                      <span className="text-sm font-black text-emerald-400">KES {(selectedEncounter.totalPaid || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Outstanding Balance</span>
                      <span className={`text-sm font-black ${balanceDue > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        KES {balanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {subcollections.billItems.map((b) => (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{b.description}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Category: {b.category} • {new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-900">KES {b.total.toLocaleString()}</span>
                          <span className={`block text-[9px] font-bold uppercase ${b.isPaid ? "text-emerald-600" : "text-rose-600"}`}>
                            {b.isPaid ? "✓ Paid" : "Unpaid"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 6: NURSING NOTES */}
              {activeTab === "nursing" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Nursing Notes Subcollection (/encounters/{selectedEncounter.id}/nursingNotes)
                      </h3>
                      <p className="text-[11px] text-slate-500">Bedside handovers and clinical logs</p>
                    </div>
                  </div>

                  {/* Add note box */}
                  <form onSubmit={handleAddNursingNote} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Add Clinical Note</span>
                      <div className="flex items-center gap-1 text-xs">
                        {(["Morning", "Afternoon", "Night"] as const).map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => setNurseShift(s)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              nurseShift === s ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border"
                            }`}
                          >
                            {s} Shift
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={nurseNoteText}
                      onChange={(e) => setNurseNoteText(e.target.value)}
                      placeholder="Type patient progress, vital response, wound dressing notes..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <div className="text-right">
                      <button
                        type="submit"
                        disabled={actionLoading || !nurseNoteText}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                      >
                        Save Note
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5">
                    {subcollections.nursingNotes.map((n) => (
                      <div key={n.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-emerald-700">{n.shift} Shift • {n.nurseName}</span>
                          <span className="font-mono">{new Date(n.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700">{n.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* 3. MODAL: NEW ADMISSION / ENCOUNTER */}
      {showNewAdmissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">New Hospital Admission & Encounter</h3>
                  <p className="text-[11px] text-slate-500">Initiate admission lifecycle, subcollections and ward bed reservation</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewAdmissionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmission} className="space-y-4 text-xs">
              {/* Quick Patient Search / Picker */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Existing Patient Quick Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={admPatientSearch}
                    onChange={(e) => {
                      setAdmPatientSearch(e.target.value);
                      const matched = findUnifiedPatient(e.target.value, patients);
                      if (matched) {
                        setAdmSelectedPatient(matched);
                        setAdmPatientName(matched.patientName);
                        setAdmNationalId(matched.nationalId);
                        setAdmPhone(matched.phone || "");
                        setAdmAge(matched.age || 32);
                        setAdmGender(matched.gender || "Male");
                        setAdmBloodType(matched.bloodType || "O+");
                      }
                    }}
                    placeholder="Search by Name, National ID, or Phone..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    value={admPatientName}
                    onChange={(e) => setAdmPatientName(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">National ID / Passport</label>
                  <input
                    type="text"
                    required
                    value={admNationalId}
                    onChange={(e) => setAdmNationalId(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={admPhone}
                    onChange={(e) => setAdmPhone(e.target.value)}
                    placeholder="07..."
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Age</label>
                  <input
                    type="number"
                    value={admAge}
                    onChange={(e) => setAdmAge(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Gender</label>
                  <select
                    value={admGender}
                    onChange={(e) => setAdmGender(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:bg-white focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Blood Type</label>
                  <select
                    value={admBloodType}
                    onChange={(e) => setAdmBloodType(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:bg-white focus:outline-none"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Admission Pathway</label>
                  <select
                    value={admType}
                    onChange={(e) => setAdmType(e.target.value as any)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:bg-white focus:outline-none"
                  >
                    <option value="INPATIENT">Inpatient Admission</option>
                    <option value="EMERGENCY">Emergency STAT</option>
                    <option value="MATERNITY">Maternity Ward</option>
                    <option value="DAY_SURGERY">Day Surgery</option>
                    <option value="OUTPATIENT">Outpatient Care</option>
                  </select>
                </div>
              </div>

              {/* Bed Assignment */}
              {admType !== "OUTPATIENT" && (
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 space-y-2">
                  <label className="text-[11px] font-bold text-blue-900 uppercase flex items-center justify-between">
                    <span>Assign Inpatient Ward Bed</span>
                    <span className="text-[10px] text-blue-600 lowercase">({beds.filter(b => b.status === "AVAILABLE").length} available)</span>
                  </label>
                  <select
                    value={admBedId}
                    onChange={(e) => setAdmBedId(e.target.value)}
                    required
                    className="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Available Ward & Bed --</option>
                    {beds.filter(b => b.status === "AVAILABLE").map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        {bed.wardName} — {bed.bedNumber} ({bed.category} • KES {bed.dailyRate.toLocaleString()}/day)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Triage & Clinical Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Intake Symptoms / Chief Complaint</label>
                  <input
                    type="text"
                    value={admSymptoms}
                    onChange={(e) => setAdmSymptoms(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Provisional Diagnosis</label>
                  <input
                    type="text"
                    value={admDiagnosis}
                    onChange={(e) => setAdmDiagnosis(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Intake Vitals */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Intake Bedside Vitals</label>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Temp (°C)</span>
                    <input
                      type="text"
                      value={admVitalTemp}
                      onChange={(e) => setAdmVitalTemp(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">BP (mmHg)</span>
                    <input
                      type="text"
                      value={admVitalBp}
                      onChange={(e) => setAdmVitalBp(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Pulse (bpm)</span>
                    <input
                      type="text"
                      value={admVitalPulse}
                      onChange={(e) => setAdmVitalPulse(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Weight (kg)</span>
                    <input
                      type="text"
                      value={admVitalWeight}
                      onChange={(e) => setAdmVitalWeight(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">SpO2 (%)</span>
                    <input
                      type="text"
                      value={admVitalSpo2}
                      onChange={(e) => setAdmVitalSpo2(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewAdmissionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  {actionLoading ? "Processing Admission..." : "Admit Patient & Initialize Encounter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: RECORD VITALS */}
      {showAddVitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900">Record Bedside Vitals</h3>
            <form onSubmit={handleAddVital} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Temperature (°C)</label>
                  <input
                    type="text"
                    value={newVitalTemp}
                    onChange={(e) => setNewVitalTemp(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Blood Pressure</label>
                  <input
                    type="text"
                    value={newVitalBp}
                    onChange={(e) => setNewVitalBp(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Pulse (bpm)</label>
                  <input
                    type="text"
                    value={newVitalPulse}
                    onChange={(e) => setNewVitalPulse(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">SpO2 (%)</label>
                  <input
                    type="text"
                    value={newVitalSpo2}
                    onChange={(e) => setNewVitalSpo2(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500">Bedside Notes</label>
                <input
                  type="text"
                  value={newVitalNotes}
                  onChange={(e) => setNewVitalNotes(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVitalModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-black cursor-pointer shadow-xs"
                >
                  Save Vitals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: PRESCRIBE MEDICATION */}
      {showAddRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900">Prescribe Medication & Auto-Bill</h3>
            <form onSubmit={handleAddPrescription} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500">Drug Name & Strength</label>
                <input
                  type="text"
                  required
                  value={newRxName}
                  onChange={(e) => setNewRxName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Quantity</label>
                  <input
                    type="number"
                    value={newRxQty}
                    onChange={(e) => setNewRxQty(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Unit Price (KES)</label>
                  <input
                    type="number"
                    value={newRxPrice}
                    onChange={(e) => setNewRxPrice(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500">Dosage & Frequency</label>
                <input
                  type="text"
                  value={newRxDosage}
                  onChange={(e) => setNewRxDosage(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500">Instructions</label>
                <input
                  type="text"
                  value={newRxInstructions}
                  onChange={(e) => setNewRxInstructions(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRxModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-black cursor-pointer shadow-xs"
                >
                  Add Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: ORDER LAB */}
      {showAddLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900">Order Diagnostic Investigation</h3>
            <form onSubmit={handleAddLabRequest} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500">Test / Investigation Name</label>
                <input
                  type="text"
                  required
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Department</label>
                  <select
                    value={newLabDept}
                    onChange={(e) => setNewLabDept(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  >
                    <option value="laboratory">Laboratory</option>
                    <option value="radiology">Radiology (X-Ray/CT/Ultrasound)</option>
                    <option value="labour_room">Maternity / Labour</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Price (KES)</label>
                  <input
                    type="number"
                    value={newLabPrice}
                    onChange={(e) => setNewLabPrice(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500">Sample Type</label>
                <input
                  type="text"
                  value={newLabSample}
                  onChange={(e) => setNewLabSample(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500">Clinical Indication / Notes</label>
                <input
                  type="text"
                  value={newLabNotes}
                  onChange={(e) => setNewLabNotes(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLabModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-black cursor-pointer shadow-xs"
                >
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: PAY ENCOUNTER BILL */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Settle Hospital Encounter Charges
            </h3>
            <form onSubmit={handlePayBill} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500">Amount to Pay (KES)</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-slate-900 text-lg"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500">Payment Channel</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="M-PESA">Safaricom M-PESA STK</option>
                  <option value="Cash">Direct Cash Office</option>
                  <option value="SHA/NHIF">SHA / Taifa Care Capitation</option>
                  <option value="Insurance">Corporate Insurance (Slade/CIC/Jubilee)</option>
                </select>
              </div>

              {payMethod === "M-PESA" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500">M-PESA Phone Number</label>
                  <input
                    type="text"
                    value={payMpesaPhone}
                    onChange={(e) => setPayMpesaPhone(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: DOCTOR SIGNOFF */}
      {showDoctorSignoffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              Doctor Clinical Discharge Sign-off
            </h3>
            <form onSubmit={handleDoctorSignoff} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500">Attending Consultant / Medical Officer</label>
                <input
                  type="text"
                  required
                  value={docSignoffName}
                  onChange={(e) => setDocSignoffName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500">Discharge Summary & Take-Home Plan</label>
                <textarea
                  rows={3}
                  required
                  value={docSignoffNotes}
                  onChange={(e) => setDocSignoffNotes(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDoctorSignoffModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Sign & Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: DISCHARGE SUCCESS & CERTIFICATE */}
      {showDischargeSuccessModal && dischargeSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Hospital Discharge Complete</h3>
              <p className="text-xs text-slate-500 mt-1">
                Patient <strong className="text-slate-800">{dischargeSuccessData.encounter?.patientName}</strong> has been successfully discharged.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Encounter ID:</span>
                <strong className="text-slate-900">{dischargeSuccessData.encounter?.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ward Bed Released:</span>
                <span className="text-emerald-700 font-bold">{dischargeSuccessData.encounter?.assignedWard || "N/A"} ({dischargeSuccessData.encounter?.assignedBed || "N/A"}) ➔ AVAILABLE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Financial Balance:</span>
                <span className="text-emerald-700 font-bold">KES 0.00 (Fully Settled)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Clinical Sign-off:</span>
                <span className="text-slate-900 font-bold">{dischargeSuccessData.encounter?.doctorDischargeApprovedBy || "Doctor Signed"}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowDischargeSuccessModal(false)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

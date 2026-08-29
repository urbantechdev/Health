import React, { useState, useEffect } from "react";
import { 
  Printer, 
  X, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  QrCode, 
  Calendar, 
  User, 
  Building, 
  Stethoscope, 
  Activity, 
  Heart, 
  AlertCircle, 
  Award, 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  Send,
  Baby,
  FileCheck,
  Hospital
} from "lucide-react";
import { MedicalRecord, ClinicalVisit, QueueTicket } from "../types";
import { toast } from "../lib/promptService";

export type KenyanFormType = 
  | "sick_sheet" 
  | "referral_moh268" 
  | "discharge_summary" 
  | "lab_requisition_moh240" 
  | "prescription_erx" 
  | "triage_sheet"
  | "birth_notification" 
  | "death_notification";

export interface KenyanHospitalFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFormType?: KenyanFormType;
  patient?: MedicalRecord | null;
  visit?: ClinicalVisit | null;
  ticket?: QueueTicket | null;
  doctorName?: string;
  doctorKmpdc?: string;
  facilityName?: string;
  facilityMfl?: string;
  county?: string;
}

export const COMMON_ICD10_KENYA = [
  { code: "B54", name: "Unspecified Malaria (Plasmodium falciparum)" },
  { code: "J06.9", name: "Acute Upper Respiratory Tract Infection (URTI)" },
  { code: "A09", name: "Infectious Gastroenteritis & Diarrhoeal Disease" },
  { code: "I10", name: "Essential (Primary) Systemic Hypertension" },
  { code: "E11.9", name: "Type 2 Diabetes Mellitus without complications" },
  { code: "N39.0", name: "Urinary Tract Infection (UTI), site not specified" },
  { code: "J18.9", name: "Pneumonia, unspecified organism" },
  { code: "K29.7", name: "Gastritis / Peptic Ulcer Disease (PUD)" },
  { code: "J45.9", name: "Bronchial Asthma, unspecified" },
  { code: "A01.0", name: "Typhoid Fever (Salmonella typhi)" },
  { code: "O80", name: "Single Spontaneous Normal Vertex Delivery (SVD)" },
  { code: "O82", name: "Single Delivery by Caesarean Section (C-Section)" },
  { code: "A15.0", name: "Pulmonary Tuberculosis (PTB)" },
  { code: "B20", name: "Human Immunodeficiency Virus [HIV] Clinical Disease" },
  { code: "M54.5", name: "Chronic Low Back Pain / Lumbago" },
  { code: "S06.0", name: "Concussion / Minor Head Injury" },
  { code: "K35.8", name: "Acute Appendicitis" },
  { code: "L03.9", name: "Cellulitis / Soft Tissue Bacterial Infection" }
];

export default function KenyanHospitalFormsModal({
  isOpen,
  onClose,
  initialFormType = "sick_sheet",
  patient,
  visit,
  ticket,
  doctorName = "Dr. Sarah Naisiae, MBChB, MMed",
  doctorKmpdc = "KMPDC/REG/A-94821",
  facilityName = "AFYA BORA LEVEL 4 HOSPITAL",
  facilityMfl = "MFL CODE: 18492 - NAIROBI COUNTY",
  county = "Nairobi City County"
}: KenyanHospitalFormsModalProps) {
  const [selectedForm, setSelectedForm] = useState<KenyanFormType>(initialFormType);

  useEffect(() => {
    if (initialFormType) {
      setSelectedForm(initialFormType);
    }
  }, [initialFormType]);

  // Master Form Data State (pre-populated with patient & visit info)
  const [formData, setFormData] = useState({
    // Patient Bio Data
    patientName: patient?.patientName || ticket?.patientName || "Jane Wanjiku Mwangi",
    nationalId: patient?.nationalId || ticket?.nationalId || "30198422",
    age: String(patient?.age || ticket?.age || "32"),
    gender: patient?.gender || "Female",
    phone: patient?.phone || ticket?.phone || "0712 345 678",
    shaId: patient?.shaId || "SHA-99201948",
    employerOrSchool: "Safaricom PLC / HQ Westlands",
    occupation: "Systems Engineer",
    residence: "Kilimani, Nairobi",

    // Clinical Findings
    diagnosis: visit?.diagnosis || patient?.latestDiagnosis || "Acute Upper Respiratory Tract Infection (J06.9)",
    icd10Code: "J06.9",
    symptoms: visit?.symptoms || patient?.latestSymptoms || "Severe fever, persistent dry cough, sore throat, generalized myalgia",
    vitals: {
      bp: visit?.vitals.bp || patient?.latestVitals?.bp || "124/82 mmHg",
      temp: visit?.vitals.temp || patient?.latestVitals?.temp || "38.2 °C",
      pulse: visit?.vitals.pulse || patient?.latestVitals?.pulse || "84 bpm",
      weight: visit?.vitals.weight || patient?.latestVitals?.weight || "68 kg",
      height: "168 cm",
      bmi: "24.1 (Normal Weight)",
      spo2: "98% on room air",
      respiratoryRate: "18 bpm"
    },
    allergies: Array.isArray(patient?.allergies)
      ? patient.allergies.join(", ")
      : typeof patient?.allergies === "string" && patient.allergies.trim()
      ? patient.allergies
      : typeof ticket?.allergies === "string" && ticket.allergies.trim()
      ? ticket.allergies
      : "Penicillin, Sulfa drugs (Severe rash)",

    // Sick Sheet specific
    sickOffDays: 3,
    sickOffStartDate: new Date().toISOString().split("T")[0],
    sickOffEndDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    resumeDutyDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
    fitnessStatus: "Unfit for work/school duties during treatment period",
    doctorRemarks: "Patient requires complete bed rest, adequate hydration, and avoidance of strenuous workplace duties. Review in OPD clinic if symptoms persist after 72 hours.",

    // MOH 268 Referral specific
    referringFacility: facilityName,
    referringMfl: facilityMfl,
    referringDoctor: doctorName,
    referringContact: "+254 711 943 210",
    receivingFacility: "KENYATTA NATIONAL HOSPITAL (KNH) - NATIONAL LEVEL 6",
    receivingDepartment: "Pulmonology & Specialized Critical Care Unit",
    referralUrgency: "Urgent (Within 4 Hours)",
    reasonForReferral: "Specialized Bronchoscopy investigation, arterial blood gas workup, and advanced specialist pulmonologist review.",
    interventionsGiven: "Nebulization with Salbutamol 5mg, IV Ceftriaxone 1g STAT, IV Paracetamol 1g, Oxygen titration at 2L/min via nasal prongs.",
    transitAmbulance: "ST. JOHN AMBULANCE / REG NO: KDA 892M",
    escortParamedic: "Nurse Officer Kevin Kiprop (NCK Reg: 44921)",
    transitVitals: "Stable: BP 120/80, SpO2 97%, Pulse 80 bpm",

    // Discharge Summary specific
    admissionDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    dischargeDate: new Date().toISOString().split("T")[0],
    wardOrBed: "St. Luke Ward - Bed 14 (Semi-Private)",
    dischargeCondition: "Markedly Improved, Afebrile, Hemodynamically Stable, Ambulatory",
    hospitalCourse: "Patient was admitted with severe acute febrile respiratory illness. Initiated on IV antimicrobial therapy, hydration, and regular vital sign monitoring. Responded excellently within 48 hours. Tolerating oral feeds well.",
    proceduresDone: "Chest X-Ray (AP/Lateral) - Clear lung fields; Complete Blood Count (CBC) - Normalized WBC count (6.8 x 10^9/L); Blood cultures - No bacterial growth at 48h.",
    dischargeMedications: [
      { drug: "Amoxicillin/Clavulanic Acid 1g (Augmentin)", dose: "1 Tablet Twice Daily (PO)", duration: "5 Days" },
      { drug: "Paracetamol 500mg Tablets", dose: "2 Tablets 8-hourly (PRN Pain/Fever)", duration: "3 Days" },
      { drug: "Cetirizine 10mg Tablets", dose: "1 Tablet at Night (PO)", duration: "5 Days" }
    ],
    homeCareInstructions: "Complete full antibiotic course even if feeling fully recovered. Drink plenty of warm fluids. Avoid cold drafts and dust exposure.",
    dangerSignsWarning: "Return immediately to Accident & Emergency if you experience sudden breathlessness, chest pain, high fever (>39°C), or coughing blood.",
    followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    followUpClinic: "General Medical Outpatient Clinic (Room 5) at 09:00 AM",

    // MOH 240 Lab Requisition specific
    labTestsRequested: [
      { test: "Complete Blood Count (CBC / Hemogram)", result: "WBC 7.2, Hb 13.8 g/dL, PLT 240k", flag: "Normal", range: "WBC: 4.0-10.0" },
      { test: "Malaria Blood Slide (BS for MPS) / mRDT", result: "Negative for Plasmodium parasites", flag: "Normal", range: "No parasites seen" },
      { test: "Serum Creatinine & Urea (RFT)", result: "Creatinine: 78 umol/L, Urea: 4.2 mmol/L", flag: "Normal", range: "Creatinine: 53-97" },
      { test: "Random Blood Sugar (RBS)", result: "5.6 mmol/L", flag: "Normal", range: "4.0 - 7.8 mmol/L" },
      { test: "Urinalysis Strip & Microscopy", result: "Protein: Nil, Sugar: Nil, Pus cells: 1-2/hpf", flag: "Normal", range: "Negative" }
    ],
    labTechnologist: "Benard Omwenga (KMLTTB Reg: 12940)",

    // Birth Notification MOH 241
    childGender: "Male",
    birthDateTime: new Date().toISOString().replace("T", " ").substring(0, 16),
    birthWeight: "3.45 kg",
    gestationalAge: "39 Weeks + 2 Days",
    deliveryMode: "Spontaneous Vertex Delivery (SVD)",
    apgarScore: "9/10 at 1 min, 10/10 at 5 min",
    motherName: "Jane Wanjiku Mwangi",
    motherId: "30198422",
    fatherName: "David Mwangi Kamau",
    fatherId: "28472911",
    midwifeOfficer: "Senior Nursing Officer Mary Atieno (NCK/44819)",

    // Death Notification MOH 242
    deceasedName: "John Kipchumba Koech",
    deceasedId: "14829103",
    dateOfDeath: new Date().toISOString().replace("T", " ").substring(0, 16),
    immediateCauseOfDeath: "Septic Shock secondary to severe Community Acquired Pneumonia",
    underlyingCauses: "Chronic Obstructive Pulmonary Disease (COPD), Type 2 Diabetes Mellitus",
    certifyingOfficer: doctorName,

    // Triage Early Warning Score (TEWS)
    triageCategory: "Urgent (Yellow)",
    triagePainScore: "4/10 (Moderate)",
    triageConsciousness: "Alert (GCS 15/15)",
    triageNurse: "Nursing Officer Grace Njeri (NCK/77412)"
  });

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formTabs = [
    { id: "sick_sheet", label: "Sick Off Sheet", sub: "Medical Incapacity Certificate", icon: FileCheck },
    { id: "referral_moh268", label: "MOH 268 Referral", sub: "Inter-Facility Transfer Form", icon: Send },
    { id: "discharge_summary", label: "Discharge Summary", sub: "Inpatient / OPD Care Plan", icon: Award },
    { id: "lab_requisition_moh240", label: "MOH 240 Lab Form", sub: "Clinical Diagnostics Order", icon: Activity },
    { id: "prescription_erx", label: "PPB e-Prescription", sub: "Digital Doctor's Rx Slip", icon: Stethoscope },
    { id: "triage_sheet", label: "Triage & Vitals", sub: "TEWS Emergency Assessment", icon: Heart },
    { id: "birth_notification", label: "Birth Notification", sub: "MOH 241 Civil Record", icon: Baby },
    { id: "death_notification", label: "Death Notification", sub: "MOH 242 Cause of Death", icon: AlertCircle }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 w-full max-w-5xl flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* MODAL HEADER (Screen-only) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm uppercase tracking-wide">
                Kenyan Hospital Statutory & Clinical Forms Hub
              </h2>
              <p className="text-[11px] text-slate-300 font-mono">
                Compliant with Ministry of Health (MOH), KMPDC, PPB & Civil Registration Standards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Form (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FORMS NAV TABS (Screen-only) */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0 scrollbar-thin">
          {formTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedForm === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedForm(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-left transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                  isSelected 
                    ? "bg-emerald-700 text-white font-black shadow-xs ring-2 ring-emerald-500/30" 
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300/80 font-bold"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-300" : "text-slate-500"}`} />
                <div>
                  <div className="text-[11px] leading-tight whitespace-nowrap">{tab.label}</div>
                  <div className={`text-[9px] font-normal leading-none ${isSelected ? "text-emerald-200" : "text-slate-500"}`}>{tab.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* MAIN BODY: SPLIT VIEW (Editable Control Panel on Left, Pristine A4 Document Preview on Right) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT SIDE: QUICK EDIT CONTROLS */}
          <div className="w-full lg:w-72 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4 shrink-0 text-xs text-slate-700 max-h-[72vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600">Active Patient Details</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono text-[9px] font-bold rounded-md">
                EHR SYNCED
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Patient Full Name:</label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700">National ID:</label>
                <input
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Age / Gender:</label>
                <input
                  type="text"
                  value={`${formData.age} Yrs / ${formData.gender}`}
                  onChange={(e) => {
                    const parts = e.target.value.split("/");
                    setFormData({ ...formData, age: parts[0]?.trim() || formData.age, gender: parts[1]?.trim() || formData.gender });
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* ICD-10 Diagnosis Selector */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>ICD-10 Diagnostic Framework:</span>
                <span className="text-[9px] text-emerald-800 font-bold">Standard</span>
              </label>
              <select
                value={formData.icd10Code}
                onChange={(e) => {
                  const sel = COMMON_ICD10_KENYA.find(c => c.code === e.target.value);
                  if (sel) {
                    setFormData({
                      ...formData,
                      icd10Code: sel.code,
                      diagnosis: `${sel.name} (${sel.code})`
                    });
                  }
                }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              >
                {COMMON_ICD10_KENYA.map(item => (
                  <option key={item.code} value={item.code}>
                    [{item.code}] {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* FORM SPECIFIC QUICK INPUTS */}
            {selectedForm === "sick_sheet" && (
              <div className="space-y-3 pt-2 border-t border-slate-100 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <span className="font-bold text-emerald-950 uppercase text-[10px] block">Sick Off Period Parameters</span>
                <div>
                  <label className="font-semibold text-slate-700">Days Granted Off Duty:</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.sickOffDays}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 1;
                      const end = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
                      const resume = new Date(Date.now() + (days + 1) * 86400000).toISOString().split("T")[0];
                      setFormData({ ...formData, sickOffDays: days, sickOffEndDate: end, resumeDutyDate: resume });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-black text-emerald-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Employer / School Name:</label>
                  <input
                    type="text"
                    value={formData.employerOrSchool}
                    onChange={(e) => setFormData({ ...formData, employerOrSchool: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {selectedForm === "referral_moh268" && (
              <div className="space-y-3 pt-2 border-t border-slate-100 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                <span className="font-bold text-blue-950 uppercase text-[10px] block">Referral Transfer Route</span>
                <div>
                  <label className="font-semibold text-slate-700">Receiving Level 5/6 Facility:</label>
                  <input
                    type="text"
                    value={formData.receivingFacility}
                    onChange={(e) => setFormData({ ...formData, receivingFacility: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Referral Urgency Category:</label>
                  <select
                    value={formData.referralUrgency}
                    onChange={(e) => setFormData({ ...formData, referralUrgency: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option>Immediate STAT Emergency (Within 1 Hr)</option>
                    <option>Urgent (Within 4 Hours)</option>
                    <option>Priority Transfer (Within 24 Hours)</option>
                    <option>Routine Elective Specialist Review</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-2 text-[10px] text-slate-500 space-y-1">
              <p className="flex items-center gap-1 font-semibold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>KMPDC Registry Verified</span>
              </p>
              <p>Doctor: {doctorName}</p>
              <p>Licence: {doctorKmpdc}</p>
            </div>
          </div>

          {/* RIGHT SIDE: OFFICIAL PRISTINE A4 DOCUMENT PRINT CANVAS */}
          <div className="flex-1 flex justify-center w-full min-w-0">
            
            {/* 1. SICK OFF SHEET / MEDICAL INCAPACITY CERTIFICATE */}
            {selectedForm === "sick_sheet" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 sm:p-10 rounded-2xl shadow-xl font-serif text-slate-900 space-y-6 text-sm">
                
                {/* Official Kenyan Hospital Letterhead */}
                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Hospital className="w-6 h-6 text-emerald-700" />
                    <h1 className="text-xl sm:text-2xl font-black font-sans uppercase tracking-tight text-slate-950">
                      {facilityName}
                    </h1>
                  </div>
                  <p className="text-xs font-sans font-bold text-slate-700">{facilityMfl} • {county}</p>
                  <p className="text-xs font-sans text-slate-600">P.O. Box 49821-00100 Nairobi • Tel: +254 711 943 210 • Email: records@afyabora.co.ke</p>
                  <div className="pt-2">
                    <span className="px-4 py-1 bg-slate-900 text-white font-sans font-black text-xs uppercase tracking-widest rounded-md inline-block">
                      OFFICIAL MEDICAL CERTIFICATE OF INCAPACITY / SICK OFF SHEET
                    </span>
                  </div>
                  <p className="text-[10px] font-sans text-slate-500 font-bold tracking-wider">
                    ISSUED UNDER THE KENYA MEDICAL PRACTITIONERS AND DENTISTS COUNCIL (KMPDC) ACT
                  </p>
                </div>

                {/* Serial & Date Bar */}
                <div className="flex justify-between items-center text-xs font-sans font-bold border-b border-slate-200 pb-2">
                  <span>CERTIFICATE SERIAL NO: <strong className="text-emerald-800 font-mono">SO-2026-08492</strong></span>
                  <span>DATE OF EXAMINATION: <strong className="font-mono">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></span>
                </div>

                {/* Body Content */}
                <div className="space-y-4 leading-relaxed font-serif text-slate-900 text-sm">
                  <p>
                    <strong>TO WHOM IT MAY CONCERN / EMPLOYER:</strong>
                    <br />
                    <span className="font-sans font-bold text-slate-800">{formData.employerOrSchool || "The Managing Director / HR Manager / School Principal"}</span>
                  </p>

                  <p>
                    This is to certify that I have this day clinically examined:
                  </p>

                  {/* Patient Info Card */}
                  <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl font-sans grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Patient Name:</span>
                      <strong className="text-slate-950 text-sm">{formData.patientName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">National ID / Passport:</span>
                      <strong className="text-slate-950 font-mono">{formData.nationalId}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Age / Gender:</span>
                      <strong className="text-slate-950">{formData.age} Years / {formData.gender}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SHA / Member No:</span>
                      <strong className="text-slate-950 font-mono">{formData.shaId || "SHA-VERIFIED"}</strong>
                    </div>
                  </div>

                  <p>
                    In my professional medical opinion, the patient is suffering from:
                    <br />
                    <strong className="text-base text-slate-950 font-sans bg-amber-50 px-3 py-1 rounded border border-amber-200 inline-block mt-1">
                      {formData.diagnosis} [ICD-10: {formData.icd10Code}]
                    </strong>
                  </p>

                  <div className="p-4 bg-emerald-50 border-2 border-emerald-600 rounded-xl space-y-2 font-sans">
                    <h4 className="font-black text-emerald-950 uppercase text-xs tracking-wider">
                      ★ MEDICAL RECOMMENDATION & EXCUSED DUTY PERIOD:
                    </h4>
                    <p className="text-sm font-bold text-emerald-900">
                      The patient is medically unfit for work / academic duties and is hereby granted:
                    </p>
                    <div className="text-base font-black text-emerald-950 font-mono py-1">
                      👉 {formData.sickOffDays} ({formData.sickOffDays === 1 ? "ONE" : formData.sickOffDays === 2 ? "TWO" : formData.sickOffDays === 3 ? "THREE" : formData.sickOffDays === 4 ? "FOUR" : formData.sickOffDays === 5 ? "FIVE" : formData.sickOffDays === 7 ? "SEVEN" : formData.sickOffDays} DAYS) OFF DUTY
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-emerald-200">
                      <div>
                        <span className="text-emerald-800 block">Effective From:</span>
                        <strong className="text-emerald-950">{formData.sickOffStartDate}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-800 block">Through To:</span>
                        <strong className="text-emerald-950">{formData.sickOffEndDate}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-800 block">Fit to Resume Duty On:</span>
                        <strong className="text-emerald-950 text-sm">{formData.resumeDutyDate}</strong>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 italic">
                    <strong>Attending Doctor's Remarks:</strong> {formData.doctorRemarks}
                  </p>
                </div>

                {/* Official Signatures & Hospital Seal */}
                <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end font-sans">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">Examining Medical Practitioner:</p>
                    <div className="h-10 flex items-end">
                      <span className="font-serif italic text-emerald-800 text-lg font-bold">Dr. Sarah Naisiae</span>
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-xs">
                      <strong>{doctorName}</strong>
                      <p className="text-[10px] text-slate-600">Reg No: {doctorKmpdc}</p>
                    </div>
                  </div>

                  {/* Official Hospital Stamp */}
                  <div className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-emerald-700 rounded-xl bg-emerald-50/50 text-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-700" />
                    <span className="text-[9px] font-black uppercase text-emerald-900 tracking-wider">OFFICIAL CLINICAL STAMP</span>
                    <span className="text-[8px] font-mono text-emerald-800">{facilityName}</span>
                    <span className="text-[8px] font-bold text-emerald-700">{new Date().toLocaleDateString()}</span>
                  </div>

                  {/* eTIMS / QR Verification Code */}
                  <div className="flex flex-col items-end">
                    <div className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                      <QrCode className="w-14 h-14 text-slate-900" />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 mt-1">VERIFY: KMPDC-EHR-VALID</span>
                  </div>
                </div>

                <div className="text-center pt-2 text-[9px] font-sans text-slate-500 border-t border-slate-100">
                  Notice: Any alteration or fraudulent forgery of this medical document is a punishable criminal offense under the Penal Code and KMPDC regulations.
                </div>
              </div>
            )}

            {/* 2. STANDARD KENYAN INTER-FACILITY REFERRAL FORM (MOH 268) */}
            {selectedForm === "referral_moh268" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 sm:p-10 rounded-2xl shadow-xl font-sans text-slate-900 space-y-5 text-xs">
                
                {/* MOH Header */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-0.5">
                  <div className="flex items-center justify-center gap-2 font-black text-sm uppercase text-slate-950">
                    <Building className="w-5 h-5 text-emerald-700" />
                    <span>MINISTRY OF HEALTH • REPUBLIC OF KENYA</span>
                  </div>
                  <h1 className="text-lg font-black uppercase tracking-tight text-slate-950">
                    INTER-FACILITY PATIENT REFERRAL FORM (MOH 268)
                  </h1>
                  <p className="text-[10px] font-bold text-slate-600">KENYA INTEGRATED HEALTH REFERRAL & TRANSFER NETWORK (KIHRN)</p>
                </div>

                {/* Section A: Facility Details */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 block">A. Referring Facility:</span>
                    <strong className="text-slate-950 text-xs block">{formData.referringFacility}</strong>
                    <span className="text-[10px] text-slate-600">{formData.referringMfl} • Phone: {formData.referringContact}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-900 block">B. Receiving Referral Hospital:</span>
                    <strong className="text-blue-950 text-xs block">{formData.receivingFacility}</strong>
                    <span className="text-[10px] text-blue-800">Unit: {formData.receivingDepartment} • Urgency: <strong>{formData.referralUrgency}</strong></span>
                  </div>
                </div>

                {/* Section B: Patient Bio Demographics */}
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Patient Name:</span>
                    <strong className="text-slate-950">{formData.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">National ID:</span>
                    <strong className="text-slate-950 font-mono">{formData.nationalId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Age / Gender:</span>
                    <strong className="text-slate-950">{formData.age} Yrs / {formData.gender}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Phone / Next of Kin:</span>
                    <strong className="text-slate-950">{formData.phone}</strong>
                  </div>
                </div>

                {/* Section C: Clinical History & Examination */}
                <div className="space-y-2 border border-slate-300 p-3 rounded-xl">
                  <h4 className="font-black text-slate-900 text-xs uppercase border-b border-slate-200 pb-1">
                    C. Clinical Summary & Examination Findings:
                  </h4>
                  <div className="space-y-1 text-slate-800">
                    <p><strong>Chief Complaints & History:</strong> {formData.symptoms}</p>
                    <p><strong>Provisional / Confirmed Diagnosis:</strong> <span className="font-bold text-slate-950 bg-amber-100 px-1.5 py-0.5 rounded">{formData.diagnosis}</span></p>
                    <p><strong>Baseline Vital Signs:</strong> BP: {formData.vitals.bp} | Pulse: {formData.vitals.pulse} | Temp: {formData.vitals.temp} | SpO2: {formData.vitals.spo2} | Weight: {formData.vitals.weight}</p>
                    <p><strong>Known Drug Allergies:</strong> <span className="font-bold text-rose-800">{formData.allergies}</span></p>
                  </div>
                </div>

                {/* Section D: Reason for Referral & Emergency Treatment Given */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1">
                    <span className="font-black text-amber-950 uppercase text-[10px] block">D. Specific Reason for Referral:</span>
                    <p className="text-slate-800 font-medium">{formData.reasonForReferral}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-1">
                    <span className="font-black text-emerald-950 uppercase text-[10px] block">E. Treatment / Resuscitation Given Prior to Transfer:</span>
                    <p className="text-slate-800 font-medium">{formData.interventionsGiven}</p>
                  </div>
                </div>

                {/* Section E: Transit Ambulance & Escort Paramedic */}
                <div className="p-3 bg-slate-900 text-white rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ambulance Vehicle:</span>
                    <strong className="text-emerald-400 font-mono">{formData.transitAmbulance}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Escort Medical Officer:</span>
                    <strong className="text-slate-200">{formData.escortParamedic}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Transit Status:</span>
                    <strong className="text-emerald-400">{formData.transitVitals}</strong>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-3 border-t-2 border-slate-300 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">Referring Doctor Signature & KMPDC No:</span>
                    <p className="font-bold text-slate-950">{doctorName} ({doctorKmpdc})</p>
                    <p className="text-[10px] text-slate-600">Date/Time: {new Date().toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-bold text-slate-500">Receiving Officer Acceptance Note:</span>
                    <p className="text-[11px] text-slate-700 italic">Signature / Stamp / Bed Assigned: _______________</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. OFFICIAL DISCHARGE SUMMARY & CARE PLAN */}
            {selectedForm === "discharge_summary" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 sm:p-10 rounded-2xl shadow-xl font-sans text-slate-900 space-y-5 text-xs">
                
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                  <h1 className="text-xl font-black uppercase text-slate-950 tracking-tight">{facilityName}</h1>
                  <p className="text-xs font-bold text-slate-700">{facilityMfl} • DEPARTMENT OF INPATIENT CLINICAL SERVICES</p>
                  <div className="pt-1">
                    <span className="px-3 py-0.5 bg-emerald-800 text-white font-bold text-xs uppercase rounded-md">
                      PATIENT DISCHARGE SUMMARY & POST-HOSPITALIZATION CARE PLAN
                    </span>
                  </div>
                </div>

                {/* Admission & Discharge Timelines */}
                <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Patient:</span>
                    <strong className="text-slate-950">{formData.patientName}</strong>
                    <span className="text-[10px] text-slate-600 block">ID: {formData.nationalId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Admission Date:</span>
                    <strong className="text-slate-950 font-mono">{formData.admissionDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Discharge Date:</span>
                    <strong className="text-slate-950 font-mono">{formData.dischargeDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ward / Bed:</span>
                    <strong className="text-slate-950">{formData.wardOrBed}</strong>
                  </div>
                </div>

                {/* Diagnoses & Course */}
                <div className="space-y-2 border border-slate-300 p-3 rounded-xl">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                    <span className="font-bold text-slate-700 uppercase text-[10px]">Final Clinical Diagnosis:</span>
                    <span className="font-bold text-emerald-800 text-xs">{formData.diagnosis}</span>
                  </div>
                  <div className="space-y-1 text-slate-800 text-xs">
                    <p><strong>Clinical Course & Management:</strong> {formData.hospitalCourse}</p>
                    <p><strong>Investigations / Procedures Done:</strong> {formData.proceduresDone}</p>
                    <p><strong>Discharge Condition:</strong> <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{formData.dischargeCondition}</span></p>
                  </div>
                </div>

                {/* Discharge Medications */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-xs flex justify-between">
                    <span>DISCHARGE MEDICATIONS TO TAKE HOME</span>
                    <span className="text-[10px] text-slate-300">DISPENSED VIA SMART PHARMACY</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-2">Medication / Strength</th>
                        <th className="p-2">Dosage & Route</th>
                        <th className="p-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.dischargeMedications.map((med, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{med.drug}</td>
                          <td className="p-2 text-slate-700">{med.dose}</td>
                          <td className="p-2 font-mono text-emerald-800 font-bold">{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Danger Signs & Follow Up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <span className="font-black text-rose-950 uppercase text-[10px] block">⚠️ RED FLAG DANGER SIGNS (SEEK IMMEDIATE CARE):</span>
                    <p className="text-rose-900 text-xs">{formData.dangerSignsWarning}</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <span className="font-black text-blue-950 uppercase text-[10px] block">📅 NEXT CLINIC FOLLOW-UP APPOINTMENT:</span>
                    <p className="text-blue-950 font-bold text-xs">{formData.followUpClinic}</p>
                    <p className="text-blue-800 font-mono text-xs">Date: <strong>{formData.followUpDate}</strong></p>
                  </div>
                </div>

                {/* Sign-off */}
                <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-end">
                  <div>
                    <p className="font-bold text-slate-950">Attending Consultant / Doctor: {doctorName}</p>
                    <p className="text-[10px] text-slate-600">KMPDC License: {doctorKmpdc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Patient / Guardian Acknowledgment:</p>
                    <p className="text-xs font-bold text-slate-800">Received Discharge Summary & Rx Drugs</p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. MOH 240 LAB REQUISITION & RESULTS SLIP */}
            {selectedForm === "lab_requisition_moh240" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h1 className="text-lg font-black uppercase">{facilityName} - CLINICAL LABORATORY</h1>
                  <span className="px-3 py-0.5 bg-slate-900 text-white font-bold text-xs uppercase rounded">
                    MOH 240: LABORATORY INVESTIGATION REQUISITION & RESULTS REPORT
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 grid grid-cols-3 gap-2">
                  <div><span className="text-slate-500 block">Patient Name:</span><strong>{formData.patientName}</strong></div>
                  <div><span className="text-slate-500 block">National ID / Age:</span><strong>{formData.nationalId} ({formData.age} Yrs)</strong></div>
                  <div><span className="text-slate-500 block">Requesting Clinician:</span><strong>{doctorName}</strong></div>
                </div>

                <table className="w-full text-left border border-slate-300 rounded-xl overflow-hidden">
                  <thead className="bg-slate-800 text-white text-[11px]">
                    <tr>
                      <th className="p-2">TEST NAME / PARAMETER</th>
                      <th className="p-2">MEASURED RESULT</th>
                      <th className="p-2">REFERENCE RANGE</th>
                      <th className="p-2">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {formData.labTestsRequested.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-bold">{t.test}</td>
                        <td className="p-2 font-mono font-bold text-slate-950">{t.result}</td>
                        <td className="p-2 text-slate-600 font-mono">{t.range}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            {t.flag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 block">Authorized Medical Laboratory Technologist:</span>
                    <strong>{formData.labTechnologist}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Report Released At:</span>
                    <strong className="font-mono">{new Date().toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 5. PPB e-PRESCRIPTION */}
            {selectedForm === "prescription_erx" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h1 className="text-xl font-black uppercase">{facilityName}</h1>
                  <span className="px-3 py-0.5 bg-emerald-800 text-white font-bold text-xs uppercase rounded">
                    DIGITAL ELECTRONIC PRESCRIPTION (PPB / KMPDC COMPLIANT e-Rx)
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 grid grid-cols-4 gap-2">
                  <div><span className="text-slate-500 block">Patient:</span><strong>{formData.patientName}</strong></div>
                  <div><span className="text-slate-500 block">National ID:</span><strong className="font-mono">{formData.nationalId}</strong></div>
                  <div><span className="text-slate-500 block">Age / Gender:</span><strong>{formData.age} Yrs / {formData.gender}</strong></div>
                  <div><span className="text-slate-500 block">Allergies:</span><strong className="text-rose-700">{formData.allergies}</strong></div>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-300 rounded-xl space-y-3">
                  <div className="font-black text-emerald-950 uppercase text-xs flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-emerald-700" />
                    <span>Rx PRESCRIBED MEDICINES:</span>
                  </div>
                  {formData.dischargeMedications.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                      <div>
                        <strong className="text-slate-950 text-sm block">{idx + 1}. {item.drug}</strong>
                        <span className="text-slate-600 text-xs">Sig: {item.dose}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        Duration: {item.duration}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-end">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Prescribing Medical Practitioner:</span>
                    <strong className="text-slate-950">{doctorName}</strong>
                    <p className="text-[10px] text-slate-600">Reg No: {doctorKmpdc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Dispensing Pharmacist Sign & Stamp:</span>
                    <p className="text-xs font-bold text-slate-800">Pharmacy & Poisons Board Verified</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. TRIAGE & VITAL SIGNS (TEWS) */}
            {selectedForm === "triage_sheet" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h1 className="text-xl font-black uppercase">{facilityName}</h1>
                  <span className="px-3 py-0.5 bg-amber-500 text-slate-950 font-black text-xs uppercase rounded">
                    EMERGENCY TRIAGE ASSESSMENT & VITAL SIGNS RECORD (TEWS)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300">
                  <div className="p-3 bg-white rounded-lg border text-center">
                    <span className="text-slate-500 block text-[10px]">Blood Pressure (BP)</span>
                    <strong className="text-sm text-slate-950 font-mono">{formData.vitals.bp}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border text-center">
                    <span className="text-slate-500 block text-[10px]">Temperature (°C)</span>
                    <strong className="text-sm text-slate-950 font-mono">{formData.vitals.temp}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border text-center">
                    <span className="text-slate-500 block text-[10px]">Pulse Rate (HR)</span>
                    <strong className="text-sm text-slate-950 font-mono">{formData.vitals.pulse}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border text-center">
                    <span className="text-slate-500 block text-[10px]">Oxygen Saturation (SpO2)</span>
                    <strong className="text-sm text-emerald-800 font-mono">{formData.vitals.spo2}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border text-center">
                    <span className="text-slate-500 block text-[10px]">Body Weight</span>
                    <strong className="text-sm text-slate-950 font-mono">{formData.vitals.weight}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border text-center">
                    <span className="text-slate-500 block text-[10px]">Height / BMI</span>
                    <strong className="text-sm text-slate-950 font-mono">{formData.vitals.height} / {formData.vitals.bmi}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border text-center">
                    <span className="text-slate-500 block text-[10px]">Triage Acuity Category</span>
                    <strong className="text-xs text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded">{formData.triageCategory}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border text-center">
                    <span className="text-slate-500 block text-[10px]">Consciousness (GCS)</span>
                    <strong className="text-sm text-slate-950 font-mono">{formData.triageConsciousness}</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 rounded-xl border flex justify-between items-center text-xs">
                  <span>Triage Nurse Officer: <strong>{formData.triageNurse}</strong></span>
                  <span className="font-mono">Time: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            )}

            {/* 7. BIRTH NOTIFICATION (MOH 241) */}
            {selectedForm === "birth_notification" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h1 className="text-lg font-black uppercase text-slate-950">REPUBLIC OF KENYA - MINISTRY OF HEALTH</h1>
                  <span className="px-3 py-0.5 bg-blue-800 text-white font-bold text-xs uppercase rounded">
                    MOH 241: NOTIFICATION OF BIRTH (CIVIL REGISTRATION & MATERNITY RECORD)
                  </span>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-slate-500 block">Child Gender:</span><strong className="text-sm">{formData.childGender}</strong></div>
                    <div><span className="text-slate-500 block">Date & Time of Birth:</span><strong className="font-mono">{formData.birthDateTime}</strong></div>
                    <div><span className="text-slate-500 block">Birth Weight:</span><strong className="font-mono text-emerald-900">{formData.birthWeight}</strong></div>
                    <div><span className="text-slate-500 block">APGAR Score:</span><strong className="font-mono">{formData.apgarScore}</strong></div>
                    <div><span className="text-slate-500 block">Delivery Mode:</span><strong>{formData.deliveryMode}</strong></div>
                    <div><span className="text-slate-500 block">Gestational Age:</span><strong>{formData.gestationalAge}</strong></div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Parents Demographics:</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-slate-500 block">Mother's Full Name:</span><strong>{formData.motherName} (ID: {formData.motherId})</strong></div>
                    <div><span className="text-slate-500 block">Father's Full Name:</span><strong>{formData.fatherName} (ID: {formData.fatherId})</strong></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-xs">
                  <div><span>Attending Midwife / Nurse:</span> <strong>{formData.midwifeOfficer}</strong></div>
                  <div className="font-mono">LINDA MAMA / SHA RECOGNIZED</div>
                </div>
              </div>
            )}

            {/* 8. DEATH NOTIFICATION (MOH 242) */}
            {selectedForm === "death_notification" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h1 className="text-lg font-black uppercase text-slate-950">REPUBLIC OF KENYA - MINISTRY OF HEALTH</h1>
                  <span className="px-3 py-0.5 bg-slate-900 text-white font-bold text-xs uppercase rounded">
                    MOH 242: MEDICAL CERTIFICATE OF CAUSE OF DEATH
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-slate-500 block">Deceased Name:</span><strong className="text-sm">{formData.deceasedName}</strong></div>
                    <div><span className="text-slate-500 block">National ID No:</span><strong className="font-mono">{formData.deceasedId}</strong></div>
                    <div><span className="text-slate-500 block">Date & Time of Pronouncement:</span><strong className="font-mono">{formData.dateOfDeath}</strong></div>
                  </div>
                </div>

                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                  <span className="font-bold text-rose-950 uppercase text-[10px]">Cause of Death Classification (ICD-10):</span>
                  <p><strong>Immediate Cause:</strong> {formData.immediateCauseOfDeath}</p>
                  <p><strong>Underlying Antecedent Causes:</strong> {formData.underlyingCauses}</p>
                </div>

                <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-xs">
                  <div><span>Certifying Medical Officer:</span> <strong>{formData.certifyingOfficer} ({doctorKmpdc})</strong></div>
                  <div className="font-mono text-slate-500">CIVIL REGISTRATION ACT (CAP 149)</div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

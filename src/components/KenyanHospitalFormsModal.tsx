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
  Hospital,
  FlaskRound,
  ShoppingBag,
  CreditCard,
  Phone,
  Clock,
  MapPin,
  ClipboardList
} from "lucide-react";
import { 
  MedicalRecord, 
  ClinicalVisit, 
  QueueTicket, 
  Encounter,
  EncounterVital,
  EncounterPrescription,
  EncounterLabRequest,
  EncounterBillItem,
  EncounterNursingNote,
  EncounterDoctorNote
} from "../types";
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
  encounter?: Encounter | null;
  encounterSubcollections?: {
    vitals?: EncounterVital[];
    prescriptions?: EncounterPrescription[];
    labRequests?: EncounterLabRequest[];
    billItems?: EncounterBillItem[];
    nursingNotes?: EncounterNursingNote[];
    doctorNotes?: EncounterDoctorNote[];
  } | null;
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
  encounter,
  encounterSubcollections,
  doctorName = "Dr. Sarah Naisiae, MBChB, MMed",
  doctorKmpdc = "KMPDC/REG/A-94821",
  facilityName = "TASSIAHILL HOSPITAL",
  facilityMfl = "MFL CODE: 18492 - NAIROBI COUNTY",
  county = "Nairobi City County"
}: KenyanHospitalFormsModalProps) {
  const [selectedForm, setSelectedForm] = useState<KenyanFormType>(initialFormType);

  useEffect(() => {
    if (initialFormType) {
      setSelectedForm(initialFormType);
    }
  }, [initialFormType]);

  // Derive initial values from patient / visit / encounter
  const initialPatientName = patient?.patientName || ticket?.patientName || encounter?.patientName || "Jane Wanjiku Mwangi";
  const initialNationalId = patient?.nationalId || ticket?.nationalId || encounter?.nationalId || "30198422";
  const initialAge = String(patient?.age || ticket?.age || encounter?.age || "32");
  const initialGender = patient?.gender || encounter?.gender || "Female";
  const initialPhone = patient?.phone || ticket?.phone || encounter?.phone || "0712 345 678";
  const initialShaId = patient?.shaId || "SHA-99201948";
  const initialEncounterId = encounter?.id || ticket?.ticketNo || "ENC-2026-08492";

  // Master Form Data State (pre-populated with full patient & visit info)
  const [formData, setFormData] = useState({
    // Patient Bio Data
    patientName: initialPatientName,
    nationalId: initialNationalId,
    age: initialAge,
    gender: initialGender,
    phone: initialPhone,
    shaId: initialShaId,
    encounterId: initialEncounterId,
    employerOrSchool: "Safaricom PLC / HQ Westlands",
    occupation: "Systems Engineer",
    residence: "Kilimani, Nairobi",
    nextOfKin: "David Mwangi Kamau (Spouse) - 0722 998 877",
    admissionType: encounter?.admissionType ? `${encounter.admissionType} Admission` : "Inpatient Admission",

    // Step 1: Presentation & Baseline Triage Vitals
    chiefComplaints: visit?.symptoms || patient?.latestSymptoms || encounter?.latestSymptoms || "High grade fever x 3 days, productive cough with yellowish sputum x 4 days, right-sided pleuritic chest pain, progressive dyspnoea",
    triageVitals: {
      bp: visit?.vitals.bp || patient?.latestVitals?.bp || (encounterSubcollections?.vitals?.[0]?.bp) || "128/84 mmHg",
      temp: visit?.vitals.temp || patient?.latestVitals?.temp || (encounterSubcollections?.vitals?.[0]?.temp) || "38.8 °C",
      pulse: visit?.vitals.pulse || patient?.latestVitals?.pulse || (encounterSubcollections?.vitals?.[0]?.pulse) || "98 bpm",
      spo2: (visit?.vitals as any)?.spo2 || patient?.latestVitals?.spo2 || (encounterSubcollections?.vitals?.[0]?.spo2) || "95% (Room Air)",
      respRate: (visit?.vitals as any)?.respRate || patient?.latestVitals?.respRate || (encounterSubcollections?.vitals?.[0]?.respiratoryRate) || "22 bpm",
      weight: visit?.vitals.weight || patient?.latestVitals?.weight || (encounterSubcollections?.vitals?.[0]?.weight) || "68 kg",
      height: "168 cm",
      bmi: "24.1 (Normal Weight)",
      bloodGlucose: "6.2 mmol/L (Random)",
      triageAcuity: "Urgent (Yellow - TEWS Score 3)",
      triageNurse: "Grace Njeri (NCK/77412)"
    },

    // Step 2: Initial Clinical Examination & Working Diagnosis
    physicalExam: "Conscious, moderately ill-looking, febrile. Chest: Decreased air entry in right middle zone, coarse crackles. CVS: S1+S2 regular, no murmurs. Abdomen: Soft, non-tender, no organomegaly. CNS: GCS 15/15, pupils equal and reactive.",
    allergies: Array.isArray(patient?.allergies)
      ? patient.allergies.join(", ")
      : typeof patient?.allergies === "string" && patient.allergies.trim()
      ? patient.allergies
      : typeof ticket?.allergies === "string" && ticket.allergies.trim()
      ? ticket.allergies
      : "Penicillin (Severe Urticaria / Angioedema), Sulfa drugs (Rash)",
    medicalHistory: "Past History: Known Asthmatic since 2018 (controlled on Salbutamol inhaler PRN). No past surgical interventions or TB history.",
    initialDiagnosis: "Acute Community Acquired Pneumonia (CAP) with Bronchospasm (J18.9)",
    icd10Code: "J18.9",

    // Step 3: Diagnostic Investigations & Labs
    labInvestigations: (encounterSubcollections?.labRequests && encounterSubcollections.labRequests.length > 0)
      ? encounterSubcollections.labRequests.map(r => ({
          test: r.testName,
          result: r.results || "Completed within reference limits",
          range: r.department === "radiology" ? "Normal lung expansion" : "Normal limits",
          flag: r.abnormalFlags || "Normal",
          date: r.completedAt ? r.completedAt.split("T")[0] : new Date().toISOString().split("T")[0],
          officer: r.performedBy || "B. Omwenga (KMLTTB/12940)"
        }))
      : [
          { test: "Complete Blood Count (CBC / Hemogram)", result: "WBC: 12.8 x 10^9/L (Neutrophilia), Hb: 13.6 g/dL, PLT: 280k", range: "WBC: 4.0 - 10.0", flag: "High WBC", date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], officer: "B. Omwenga (KMLTTB)" },
          { test: "Malaria Blood Slide (BS / mRDT)", result: "Negative for Plasmodium falciparum parasites", range: "No parasites seen", flag: "Normal", date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], officer: "B. Omwenga (KMLTTB)" },
          { test: "Chest Radiography (CXR - AP / Lateral)", result: "Right middle lobe dense alveolar consolidation; no effusion", range: "Clear lung fields", flag: "Consolidation", date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], officer: "Dr. J. Mwangi (Radiologist)" },
          { test: "Serum Creatinine & Electrolytes (U/E/C)", result: "Creatinine: 76 umol/L, Urea: 4.5 mmol/L, K+: 4.1 mmol/L", range: "Creat: 53-97", flag: "Normal", date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0], officer: "B. Omwenga (KMLTTB)" },
          { test: "Sputum Gram Stain & Culture (48h)", result: "Gram positive diplococci (Streptococcus pneumoniae) sensitive to Levofloxacin", range: "Normal flora", flag: "Positive", date: new Date().toISOString().split("T")[0], officer: "B. Omwenga (KMLTTB)" }
        ],

    // Step 4: Clinical Procedures & Interventions Performed
    proceduresDone: [
      { name: "Peripheral IV Cannulation (18G) & Saline Lock", date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], clinician: "Nurse Kevin Kiprop (NCK)", outcome: "Successful on 1st attempt; patent" },
      { name: "Nebulization with Salbutamol 5mg + Ipratropium 500mcg", date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], clinician: doctorName, outcome: "Marked relief of broncho-constriction; SpO2 98%" },
      { name: "Intravenous Fluid Hydration (Ringers Lactate 1000ml)", date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], clinician: "Nurse Grace Njeri", outcome: "Hydration restored, hemodynamically stable" },
      { name: "Oxygen Titration (Nasal Cannula 2L/min)", date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0], clinician: "Nurse Kevin Kiprop", outcome: "Weaned off oxygen successfully on Day 2" }
    ],

    // Step 5: Daily Ward Rounds & Inpatient Clinical Course
    inpatientCourse: encounter?.doctorClearance?.clinicalSummary || encounter?.dischargeNotes || 
      "Day 1: Admitted with severe acute febrile respiratory illness and right middle lobe pneumonia. Initiated on IV Levofloxacin 750mg OD, IV Paracetamol, nebulization, and Q4H vital checks.\nDay 2: Patient became afebrile x 24h. SpO2 maintained 98% on room air. Auscultation showed clearing lung fields. Weaned off oxygen and tolerated oral feeds.\nDay 3: Ambulatory, vitals stable, afebrile, symptomatically improved. Cleared for discharge with oral antibiotic step-down.",
    doctorNotesSummary: (encounterSubcollections?.doctorNotes && encounterSubcollections.doctorNotes.length > 0)
      ? encounterSubcollections.doctorNotes.map(n => `[${n.category || "Ward Round"} - ${n.doctorName}]: ${n.note}${n.clinicalPlan ? ` | Plan: ${n.clinicalPlan}` : ""}`).join("\n")
      : `Ward Round Review (${doctorName}): Patient markedly improved, chest clear on auscultation, stable SpO2 (99%), good oral intake. Approved for discharge on oral step-down.`,
    nursingNotesSummary: (encounterSubcollections?.nursingNotes && encounterSubcollections.nursingNotes.length > 0)
      ? encounterSubcollections.nursingNotes.map(n => `[Shift: ${n.shift} - ${n.nurseName}]: ${n.note}`).join("\n")
      : "Shift Handover: Patient resting comfortably in bed, afebrile throughout shift. Vital signs within normal baseline. Fluid balance positive.",

    // Step 6: In-Hospital Administered Medications
    administeredHospitalMeds: "IV Levofloxacin 750mg Once Daily x 2 days; IV Paracetamol 1g 8-hourly x 2 days; Nebulized Salbutamol 5mg 8-hourly x 24h; IV Ringers Lactate 1000ml; IV Normal Saline 500ml.",

    // Step 7: Final Diagnosis & Discharge Clinical Status
    diagnosis: encounter?.latestDiagnosis || visit?.diagnosis || patient?.latestDiagnosis || "Right Middle Lobe Community Acquired Pneumonia (CAP) - J18.9; Mild Bronchial Asthma (J45.0)",
    dischargeCondition: encounter?.doctorClearance?.dischargeCondition || "Markedly Improved, Clinically Afebrile, Hemodynamically Stable, Ambulatory, Tolerating Oral Feeds",
    admissionDate: encounter?.admittedAt ? encounter.admittedAt.split("T")[0] : new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    dischargeDate: encounter?.dischargedAt ? encounter.dischargedAt.split("T")[0] : new Date().toISOString().split("T")[0],
    lengthOfStay: "3 Days / 2 Nights",
    wardOrBed: encounter?.assignedWard ? `${encounter.assignedWard} - ${encounter.assignedBed || "Bed 1"}` : "St. Luke Ward - Bed 14 (Semi-Private)",
    dischargeVitals: {
      bp: (encounterSubcollections?.vitals && encounterSubcollections.vitals.length > 1) ? encounterSubcollections.vitals[encounterSubcollections.vitals.length - 1].bp : "118/76 mmHg",
      temp: (encounterSubcollections?.vitals && encounterSubcollections.vitals.length > 1) ? encounterSubcollections.vitals[encounterSubcollections.vitals.length - 1].temp : "36.7 °C",
      pulse: (encounterSubcollections?.vitals && encounterSubcollections.vitals.length > 1) ? encounterSubcollections.vitals[encounterSubcollections.vitals.length - 1].pulse : "74 bpm",
      spo2: (encounterSubcollections?.vitals && encounterSubcollections.vitals.length > 1) ? (encounterSubcollections.vitals[encounterSubcollections.vitals.length - 1].spo2 || "99%") : "99% on room air",
      respRate: (encounterSubcollections?.vitals && encounterSubcollections.vitals.length > 1) ? (encounterSubcollections.vitals[encounterSubcollections.vitals.length - 1].respiratoryRate || "16 bpm") : "16 bpm"
    },

    // Step 8: Take-Home Discharge Medications (e-Rx)
    dischargeMedications: (encounterSubcollections?.prescriptions && encounterSubcollections.prescriptions.length > 0)
      ? encounterSubcollections.prescriptions.map(p => ({
          drug: p.drugName,
          dose: p.dosage || "1 Tablet Daily",
          duration: `${p.quantity || 1} Units / Course`,
          instructions: p.instructions || "Take with food"
        }))
      : [
          { drug: "Levofloxacin 500mg Tablets (PO)", dose: "1 Tablet Once Daily (Morning with Food)", duration: "5 Days (Complete full course)", instructions: "Drink plenty of water; avoid direct sun exposure" },
          { drug: "Salbutamol 100mcg Inhaler", dose: "2 Puffs 8-Hourly PRN for Wheeze / Shortness of Breath", duration: "1 Month (Take home)", instructions: "Rinse mouth with water after use" },
          { drug: "Paracetamol 500mg Tablets", dose: "2 Tablets 8-Hourly PRN (Mild Pain / Fever)", duration: "3 Days", instructions: "Do not exceed 4g (8 tablets) in 24 hours" },
          { drug: "Ascorbic Acid (Vitamin C) 500mg Chewable", dose: "1 Tablet Daily after Meals", duration: "14 Days", instructions: "Chew tablet thoroughly" }
        ],

    // Step 9: Home Care, Dietary & Lifestyle Instructions
    homeCareInstructions: "1. Complete the full 5-day antibiotic course even if feeling fully recovered.\n2. Hydration: Drink 2.5 to 3 Litres of clean, warm fluids daily.\n3. Diet: Balanced, high-protein nutrition with fresh fruits and green leafy vegetables to support immune recovery.\n4. Rest & Mobility: Moderate indoor walking encouraged; avoid strenuous exercise, heavy lifting, cold baths, and exposure to dust, smoke, or cold evening air for 7 days.",

    // Step 10: Critical Red Flag Danger Signs (Emergency Return)
    dangerSignsWarning: "Return immediately to Tassiahill Hospital Accident & Emergency (or call 24/7 Helpline: +254 711 943 210) if you experience:\n• Sudden onset breathlessness, wheezing, or chest tightness\n• High spiking fever (>38.5°C) or severe chills/rigors\n• Hemoptysis (coughing up blood or dark-colored sputum)\n• Severe sharp pleuritic chest pain or fainting/dizziness\n• Inability to keep fluids down due to persistent vomiting",

    // Step 11: Comprehensive Future Follow-Up Plan
    followUpDate: encounter?.doctorClearance?.followUpDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    followUpTime: "09:00 AM - 12:00 PM (Morning Specialty Clinic Session)",
    followUpClinic: "Chest & Respiratory Medical Outpatient Clinic (Room 5 - Specialized OPD)",
    followUpDoctor: doctorName,
    followUpKmpdc: doctorKmpdc,
    followUpRepeatTests: "Repeat Complete Blood Count (CBC) & Follow-up Chest X-Ray (CXR AP View) upon arrival at 08:30 AM before doctor review.",
    sutureOrDressingCare: "No active surgical sutures. Check chest auscultation and peak expiratory flow rate.",
    primaryCareTransfer: "If unable to attend Tassiahill Hospital, report with this discharge summary to your nearest Sub-County Level 4 Hospital / Medical Officer.",
    emergencyHelpline: "+254 711 943 210 / +254 722 000 111 (24/7 Triage Desk)",

    // Step 12: Financial Settlement & Discharge Clearance
    totalBillKES: encounter?.totalBilled ? `KES ${encounter.totalBilled.toLocaleString()}` : "KES 48,500.00",
    insuranceCoveredKES: "KES 42,000.00 (SHA / Taifa Care Comprehensive Inpatient Benefit)",
    copayPaidKES: encounter?.totalPaid ? `KES ${encounter.totalPaid.toLocaleString()} (M-PESA / Cash Settled)` : "KES 6,500.00 (M-PESA Ref: QKE8910482)",
    netBalanceKES: (encounter?.billingCleared || (encounter && encounter.totalBilled <= encounter.totalPaid)) ? "KES 0.00 (Fully Settled & Cleared)" : "KES 0.00 (Fully Settled & Cleared)",
    clearedByOfficer: encounter?.dischargedBy || "Discharge & Records Officer B. Mutua",

    // Step 13: Digital Clinician Stamp & Verification
    signaturePin: encounter?.doctorClearance?.doctorSignature || "DIG-SIG-A94821-APPROVED",
    stampedDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),

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

  // State for adding a new take-home medication interactively
  const [newMedDrug, setNewMedDrug] = useState("");
  const [newMedDose, setNewMedDose] = useState("");
  const [newMedDuration, setNewMedDuration] = useState("");
  const [newMedInstructions, setNewMedInstructions] = useState("");

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleAddTakeHomeMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedDrug.trim()) return;
    setFormData(prev => ({
      ...prev,
      dischargeMedications: [
        ...prev.dischargeMedications,
        {
          drug: newMedDrug.trim(),
          dose: newMedDose.trim() || "1 Tablet Daily (PO)",
          duration: newMedDuration.trim() || "5 Days",
          instructions: newMedInstructions.trim() || "Take after meals"
        }
      ]
    }));
    setNewMedDrug("");
    setNewMedDose("");
    setNewMedDuration("");
    setNewMedInstructions("");
    toast.success("Take-home medication added to discharge summary.", "Medication Added");
  };

  const handleRemoveTakeHomeMed = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dischargeMedications: prev.dischargeMedications.filter((_, i) => i !== index)
    }));
  };

  const formTabs = [
    { id: "discharge_summary", label: "Discharge Summary & Care Plan", sub: "Complete Multi-Step Inpatient/OPD Journey", icon: Award },
    { id: "sick_sheet", label: "Sick Off Sheet", sub: "Medical Incapacity Certificate", icon: FileCheck },
    { id: "referral_moh268", label: "MOH 268 Referral", sub: "Inter-Facility Transfer Form", icon: Send },
    { id: "lab_requisition_moh240", label: "MOH 240 Lab Form", sub: "Clinical Diagnostics Order", icon: Activity },
    { id: "prescription_erx", label: "PPB e-Prescription", sub: "Digital Doctor's Rx Slip", icon: Stethoscope },
    { id: "triage_sheet", label: "Triage & Vitals", sub: "TEWS Emergency Assessment", icon: Heart },
    { id: "birth_notification", label: "Birth Notification", sub: "MOH 241 Civil Record", icon: Baby },
    { id: "death_notification", label: "Death Notification", sub: "MOH 242 Cause of Death", icon: AlertCircle }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 w-full max-w-6xl flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
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
          <div className="w-full lg:w-80 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4 shrink-0 text-xs text-slate-700 max-h-[76vh] overflow-y-auto">
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

            {/* FORM SPECIFIC QUICK INPUTS: DISCHARGE SUMMARY */}
            {selectedForm === "discharge_summary" && (
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <span className="font-black text-emerald-950 uppercase text-[10px] block flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-700" />
                    Admission & Ward Parameters
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Admission Date:</label>
                      <input
                        type="date"
                        value={formData.admissionDate}
                        onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Discharge Date:</label>
                      <input
                        type="date"
                        value={formData.dischargeDate}
                        onChange={(e) => setFormData({ ...formData, dischargeDate: e.target.value })}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px] font-mono font-bold text-emerald-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Ward & Bed Allocation:</label>
                    <input
                      type="text"
                      value={formData.wardOrBed}
                      onChange={(e) => setFormData({ ...formData, wardOrBed: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Discharge Clinical Condition:</label>
                    <input
                      type="text"
                      value={formData.dischargeCondition}
                      onChange={(e) => setFormData({ ...formData, dischargeCondition: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-emerald-800"
                    />
                  </div>
                </div>

                {/* Future Follow-up Parameters */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <span className="font-black text-blue-950 uppercase text-[10px] block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    Future Follow-up Appointment Plan
                  </span>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Scheduled Follow-Up Date:</label>
                    <input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                      className="w-full p-1.5 bg-white border border-blue-300 rounded text-[11px] font-mono font-bold text-blue-950"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Follow-Up Outpatient Clinic / Room:</label>
                    <input
                      type="text"
                      value={formData.followUpClinic}
                      onChange={(e) => setFormData({ ...formData, followUpClinic: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Pre-Review Repeat Diagnostic Orders:</label>
                    <textarea
                      rows={2}
                      value={formData.followUpRepeatTests}
                      onChange={(e) => setFormData({ ...formData, followUpRepeatTests: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px]"
                    />
                  </div>
                </div>

                {/* Interactive Take-Home Meds Adder */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 uppercase text-[10px] flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                      Take-Home Prescriptions ({formData.dischargeMedications.length})
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {formData.dischargeMedications.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-white border border-slate-200 rounded text-[10px]">
                        <div className="truncate pr-1">
                          <strong className="text-slate-900 block truncate">{m.drug}</strong>
                          <span className="text-slate-500">{m.dose} • {m.duration}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTakeHomeMed(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Quick Med */}
                  <form onSubmit={handleAddTakeHomeMed} className="pt-1.5 border-t border-slate-200 space-y-1 text-[10px]">
                    <input
                      type="text"
                      placeholder="Medication name & strength"
                      value={newMedDrug}
                      onChange={(e) => setNewMedDrug(e.target.value)}
                      className="w-full p-1 bg-white border border-slate-200 rounded"
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 1 Tab BD)"
                        value={newMedDose}
                        onChange={(e) => setNewMedDose(e.target.value)}
                        className="w-full p-1 bg-white border border-slate-200 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g. 5 Days)"
                        value={newMedDuration}
                        onChange={(e) => setNewMedDuration(e.target.value)}
                        className="w-full p-1 bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMedDrug.trim()}
                      className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Take-Home Drug</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

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
                  <p className="text-xs font-sans text-slate-600">Tassia Hill Complex, Embakasi East • Tel: +254 711 943 210 • Email: records@tassiahillhospital.co.ke</p>
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
                        <span className="text-emerald-800 block">Duty Resumption Date:</span>
                        <strong className="text-emerald-950 text-sm">{formData.resumeDutyDate}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-sans text-slate-700">
                    <p><strong>Clinical Doctor Remarks:</strong> {formData.doctorRemarks}</p>
                    <p><strong>Fitness Status:</strong> <span className="font-bold text-rose-700">{formData.fitnessStatus}</span></p>
                  </div>
                </div>

                {/* Sign-off & Verification Footer */}
                <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans items-end">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-950">Attending Medical Practitioner:</p>
                    <p className="text-sm font-black text-slate-900">{doctorName}</p>
                    <p className="text-slate-600 font-mono">Reg: {doctorKmpdc}</p>
                    <div className="pt-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded">
                        ✓ DIGITALLY SIGNED & VERIFIED
                      </span>
                    </div>
                  </div>

                  <div className="text-center p-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Official Facility Stamp</p>
                    <p className="text-xs font-black text-emerald-800 uppercase mt-1">{facilityName}</p>
                    <p className="text-[9px] text-slate-500 font-mono">MED RECORDS • APPROVED</p>
                  </div>

                  <div className="flex flex-col items-end justify-center space-y-1">
                    <div className="p-2 bg-white border border-slate-300 rounded-lg shadow-xs">
                      <QrCode className="w-12 h-12 text-slate-900" />
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">Scan to Verify Authenticity</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MOH 268 AMBULANCE & INTER-FACILITY REFERRAL FORM */}
            {selectedForm === "referral_moh268" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 sm:p-10 rounded-2xl shadow-xl font-sans text-slate-900 space-y-5 text-xs">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Hospital className="w-5 h-5 text-blue-700" />
                    <h1 className="text-lg font-black uppercase text-slate-950">MINISTRY OF HEALTH - REPUBLIC OF KENYA</h1>
                  </div>
                  <div className="pt-1">
                    <span className="px-3 py-0.5 bg-blue-900 text-white font-bold text-xs uppercase tracking-wider rounded">
                      MOH 268: STANDARDIZED INTER-FACILITY REFERRAL & MEDICAL TRANSFER NOTE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">Pursuant to the Kenya Health Sector Referral Strategy (Level 4/5 to Level 6 Transfer Protocol)</p>
                </div>

                {/* Section A: Facility & Urgency */}
                <div className="grid grid-cols-2 gap-3 bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <div>
                    <span className="text-[10px] font-bold text-blue-900 uppercase block">1. Originating Facility:</span>
                    <strong className="text-slate-950 text-xs">{formData.referringFacility}</strong>
                    <span className="block text-[10px] text-slate-600 font-mono">{formData.referringMfl}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-900 uppercase block">2. Receiving Level 5/6 Facility:</span>
                    <strong className="text-blue-950 text-xs">{formData.receivingFacility}</strong>
                    <span className="block text-[10px] text-blue-800 font-bold">{formData.receivingDepartment}</span>
                  </div>
                </div>

                {/* Section B: Patient Info */}
                <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Patient Name:</span>
                    <strong className="text-slate-950">{formData.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">National ID / Age:</span>
                    <strong className="text-slate-950 font-mono">{formData.nationalId} ({formData.age} Yrs)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SHA / Member No:</span>
                    <strong className="text-slate-950 font-mono">{formData.shaId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Transfer Urgency:</span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">{formData.referralUrgency}</span>
                  </div>
                </div>

                {/* Section C: Clinical Summary & Reason */}
                <div className="space-y-2 border border-slate-300 p-3 rounded-xl">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                    <span className="font-bold text-slate-700 uppercase text-[10px]">Primary Clinical Diagnosis:</span>
                    <span className="font-bold text-slate-900 text-xs">{formData.diagnosis}</span>
                  </div>
                  <div className="space-y-1.5 text-slate-800">
                    <p><strong>Reason for Specialized Transfer:</strong> {formData.reasonForReferral}</p>
                    <p><strong>Interventions Given at Originating Facility:</strong> {formData.interventionsGiven}</p>
                    <p><strong>Transit Ambulance / Reg:</strong> <span className="font-mono font-bold text-blue-900">{formData.transitAmbulance}</span> • <strong>Escort Paramedic:</strong> {formData.escortParamedic}</p>
                    <p><strong>Pre-Departure Transit Vitals:</strong> <span className="font-mono font-bold text-emerald-800">{formData.transitVitals}</span></p>
                  </div>
                </div>

                {/* Section D: Sign-off */}
                <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-end">
                  <div>
                    <p className="font-bold text-slate-950">Referring Doctor: {doctorName}</p>
                    <p className="text-[10px] text-slate-600">KMPDC: {doctorKmpdc} • Phone: {formData.referringContact}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Receiving Clinician Handover:</p>
                    <p className="text-xs font-bold text-slate-800">Pending Triage & Bed Acceptance</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. OFFICIAL COMPREHENSIVE PATIENT DISCHARGE SUMMARY & FUTURE FOLLOW-UP CARE PLAN (FEATURING EVERY STEP OF THE PATIENT JOURNEY) */}
            {selectedForm === "discharge_summary" && (
              <div id="print-section" className="w-full max-w-4xl bg-white border-2 border-slate-300 p-6 sm:p-9 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                
                {/* Official Kenyan Hospital Letterhead & Statutory Accreditation */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Hospital className="w-6 h-6 text-emerald-700" />
                    <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-tight">{facilityName}</h1>
                  </div>
                  <p className="text-xs font-bold text-slate-700">{facilityMfl} • {county} • INPATIENT & OUTPATIENT CLINICAL CARE</p>
                  <p className="text-[11px] text-slate-500">Tassia Hill Complex, Embakasi East • 24/7 Clinical Emergency & Telehealth: {formData.emergencyHelpline}</p>
                  <div className="pt-1.5 flex items-center justify-center gap-2">
                    <span className="px-4 py-1 bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-md">
                      OFFICIAL PATIENT DISCHARGE SUMMARY & COMPREHENSIVE FOLLOW-UP CARE PLAN
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Statutory Compliant: MOH / KMPDC Standards • PPB Digital Pharmacy e-Rx • SHA/NHIF Case Record
                  </p>
                </div>

                {/* Patient Identity & Encounter Demographics Bar */}
                <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Patient Name:</span>
                    <strong className="text-slate-950 text-sm">{formData.patientName}</strong>
                    <span className="text-[10px] text-slate-600 block">ID: {formData.nationalId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Age / Gender / Contact:</span>
                    <strong className="text-slate-950">{formData.age} Yrs / {formData.gender}</strong>
                    <span className="text-[10px] text-slate-600 block">{formData.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Admission & Ward:</span>
                    <strong className="text-slate-950 font-mono">{formData.admissionDate}</strong>
                    <span className="text-[10px] text-emerald-800 font-bold block">{formData.wardOrBed}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Discharge & Stay:</span>
                    <strong className="text-slate-950 font-mono">{formData.dischargeDate}</strong>
                    <span className="text-[10px] text-slate-700 font-bold block">{formData.lengthOfStay}</span>
                  </div>
                </div>

                {/* STEP 1: PRESENTATION & BASELINE ADMISSION TRIAGE VITALS */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 text-white px-3 py-1 font-bold text-[11px] flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      STEP 1: PATIENT ARRIVAL, CHIEF COMPLAINTS & ADMISSION TRIAGE VITALS
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono">{formData.triageVitals.triageAcuity}</span>
                  </div>
                  <div className="p-3 space-y-2 bg-white text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] font-bold uppercase block">Chief Presenting Complaints on Arrival:</span>
                      <p className="text-slate-900 font-medium">{formData.chiefComplaints}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center font-mono">
                      <div><span className="text-[9px] text-slate-500 block font-sans">BP (Intake)</span><strong className="text-slate-900 text-xs">{formData.triageVitals.bp}</strong></div>
                      <div><span className="text-[9px] text-slate-500 block font-sans">Temp (Intake)</span><strong className="text-rose-700 text-xs">{formData.triageVitals.temp}</strong></div>
                      <div><span className="text-[9px] text-slate-500 block font-sans">Heart Rate</span><strong className="text-slate-900 text-xs">{formData.triageVitals.pulse}</strong></div>
                      <div><span className="text-[9px] text-slate-500 block font-sans">SpO2 (Room Air)</span><strong className="text-slate-900 text-xs">{formData.triageVitals.spo2}</strong></div>
                      <div><span className="text-[9px] text-slate-500 block font-sans">Resp Rate</span><strong className="text-slate-900 text-xs">{formData.triageVitals.respRate}</strong></div>
                      <div><span className="text-[9px] text-slate-500 block font-sans">Weight / BMI</span><strong className="text-slate-900 text-xs">{formData.triageVitals.weight} ({formData.triageVitals.bmi.split(" ")[0]})</strong></div>
                    </div>
                  </div>
                </div>

                {/* STEP 2: CLINICAL EXAMINATION, ALLERGIES & COMORBIDITIES */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-300" />
                      STEP 2: CLINICAL EXAMINATION FINDINGS, ALLERGIES & COMORBIDITIES
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">ALLERGY CHECK COMPLETED</span>
                  </div>
                  <div className="p-3 space-y-2 bg-white text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 text-[10px] font-bold uppercase block">Systemic Physical Examination Findings:</span>
                        <p className="text-slate-800 text-[11px] leading-relaxed">{formData.physicalExam}</p>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-rose-600 text-[10px] font-black uppercase block">⚠️ Known Drug Allergies:</span>
                          <span className="font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px] inline-block">
                            {formData.allergies}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] font-bold uppercase block">Past Medical History & Comorbidities:</span>
                          <p className="text-slate-700 text-[11px]">{formData.medicalHistory}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 3: DIAGNOSTIC INVESTIGATIONS & LAB RESULTS */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <FlaskRound className="w-3.5 h-3.5 text-amber-400" />
                      STEP 3: DIAGNOSTIC LABORATORY & RADIOLOGY INVESTIGATIONS PERFORMED
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono">MOH 240 Diagnostic Log</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Investigation / Test Name</th>
                        <th className="p-2">Measured Result & Findings</th>
                        <th className="p-2">Reference Limits</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Reporting Officer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {formData.labInvestigations.map((lab, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{lab.test}</td>
                          <td className="p-2 font-mono text-slate-950 font-bold">{lab.result}</td>
                          <td className="p-2 text-slate-500 text-[10px]">{lab.range}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                              lab.flag === "Normal" 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}>
                              {lab.flag}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600 text-[10px]">{lab.officer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* STEP 4 & 5: CLINICAL PROCEDURES, INPATIENT WARD ROUNDS & DOCTOR/NURSE NOTES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Step 4: Procedures */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      <span>STEP 4: PROCEDURES & INTERVENTIONS PERFORMED</span>
                    </div>
                    <div className="p-3 space-y-2 bg-white text-xs">
                      {formData.proceduresDone.map((proc, i) => (
                        <div key={i} className="border-b border-slate-100 pb-1.5 last:border-none text-[11px]">
                          <div className="flex justify-between">
                            <strong className="text-slate-900">{proc.name}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">{proc.date}</span>
                          </div>
                          <p className="text-slate-600 text-[10px]">Clinician: {proc.clinician} • <span className="text-emerald-800 font-bold">Outcome: {proc.outcome}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 5: Ward Rounds & Clinical Course */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>STEP 5: INPATIENT CLINICAL PROGRESS & WARD ROUNDS</span>
                    </div>
                    <div className="p-3 space-y-2 bg-white text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] font-bold uppercase block">Attending Consultant Rounds & Daily Progress:</span>
                        <p className="text-slate-800 text-[11px] leading-relaxed whitespace-pre-line">{formData.inpatientCourse}</p>
                      </div>
                      <div className="pt-1 border-t border-slate-100">
                        <span className="text-slate-500 text-[10px] font-bold uppercase block">In-Hospital Administered Medications (Step 6):</span>
                        <p className="text-slate-700 text-[10px] font-mono">{formData.administeredHospitalMeds}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 7: DISCHARGE CLINICAL CONDITION & DIAGNOSIS */}
                <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-emerald-200 pb-1.5">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-950 block">STEP 7: FINAL CONFIRMED CLINICAL DIAGNOSIS:</span>
                      <strong className="text-sm font-black text-emerald-950">{formData.diagnosis}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-600 block">Discharge Clinical Condition:</span>
                      <span className="px-2.5 py-0.5 bg-emerald-700 text-white font-bold text-[11px] rounded-md shadow-xs">
                        {formData.dischargeCondition}
                      </span>
                    </div>
                  </div>

                  {/* Vitals Improvement Comparison */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-2 rounded-lg border border-emerald-200 text-center font-mono text-xs">
                    <div><span className="text-[9px] text-slate-500 block font-sans">Exit Blood Pressure</span><strong className="text-slate-900">{formData.dischargeVitals.bp}</strong></div>
                    <div><span className="text-[9px] text-slate-500 block font-sans">Exit Temp (Afebrile)</span><strong className="text-emerald-700">{formData.dischargeVitals.temp}</strong></div>
                    <div><span className="text-[9px] text-slate-500 block font-sans">Exit Pulse</span><strong className="text-slate-900">{formData.dischargeVitals.pulse}</strong></div>
                    <div><span className="text-[9px] text-slate-500 block font-sans">Exit SpO2 (Room Air)</span><strong className="text-emerald-800 font-bold">{formData.dischargeVitals.spo2}</strong></div>
                    <div><span className="text-[9px] text-slate-500 block font-sans">Exit Resp Rate</span><strong className="text-slate-900">{formData.dischargeVitals.respRate}</strong></div>
                  </div>
                </div>

                {/* STEP 8: TAKE-HOME DISCHARGE MEDICATIONS (e-Rx) */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 text-white px-3 py-1 font-bold text-[11px] flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      STEP 8: TAKE-HOME DISCHARGE MEDICATIONS (DIGITAL e-PRESCRIPTION)
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono">PHARMACY DISPENSED & VERIFIED</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Prescribed Medication / Strength</th>
                        <th className="p-2">Dosage & Route</th>
                        <th className="p-2">Duration</th>
                        <th className="p-2">Administration Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {formData.dischargeMedications.map((med, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{med.drug}</td>
                          <td className="p-2 text-slate-800 font-medium">{med.dose}</td>
                          <td className="p-2 font-mono text-emerald-800 font-bold">{med.duration}</td>
                          <td className="p-2 text-slate-600 text-[10px]">{med.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* STEP 9 & STEP 10: HOME CARE GUIDANCE & RED FLAG DANGER SIGNS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1 text-xs">
                    <span className="font-black text-slate-950 uppercase text-[10px] block flex items-center gap-1">
                      <ClipboardList className="w-3.5 h-3.5 text-emerald-700" />
                      STEP 9: PATIENT HOME CARE, DIET & REHABILITATION INSTRUCTIONS
                    </span>
                    <p className="text-slate-800 text-[11px] leading-relaxed whitespace-pre-line">{formData.homeCareInstructions}</p>
                  </div>

                  <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-1 text-xs">
                    <span className="font-black text-rose-950 uppercase text-[10px] block flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                      STEP 10: ⚠️ RED FLAG DANGER SIGNS (SEEK IMMEDIATE EMERGENCY CARE)
                    </span>
                    <p className="text-rose-900 text-[11px] leading-relaxed whitespace-pre-line font-medium">{formData.dangerSignsWarning}</p>
                  </div>
                </div>

                {/* STEP 11: FUTURE FOLLOW-UP APPOINTMENT & CONTINUITY OF CARE PLAN */}
                <div className="p-4 bg-blue-50/90 border-2 border-blue-400 rounded-xl space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-blue-200 pb-2">
                    <span className="font-black text-blue-950 uppercase text-xs flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-700" />
                      STEP 11: FUTURE FOLLOW-UP APPOINTMENT & CONTINUITY OF CARE
                    </span>
                    <span className="px-3 py-0.5 bg-blue-800 text-white font-bold text-xs rounded-full font-mono">
                      APPOINTMENT DATE: {formData.followUpDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Follow-Up Clinic & Room</span>
                      <strong className="text-slate-950 text-xs block">{formData.followUpClinic}</strong>
                      <span className="text-[10px] text-blue-800 font-mono block mt-0.5">{formData.followUpTime}</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Reviewing Consultant</span>
                      <strong className="text-slate-950 text-xs block">{formData.followUpDoctor}</strong>
                      <span className="text-[10px] text-slate-600 font-mono block mt-0.5">Reg: {formData.followUpKmpdc}</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Required Pre-Review Tests</span>
                      <p className="text-slate-800 text-[11px] font-medium">{formData.followUpRepeatTests}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-blue-900 pt-1 border-t border-blue-200 gap-2">
                    <span><strong>Primary Health Center Transfer:</strong> {formData.primaryCareTransfer}</span>
                    <span className="font-bold text-blue-950">24/7 Clinical Emergency Line: {formData.emergencyHelpline}</span>
                  </div>
                </div>

                {/* STEP 12 & 13: FINANCIAL CLEARANCE & DIGITAL CLINICIAN SIGN-OFF */}
                <div className="pt-3 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs items-end">
                  
                  {/* Financial Clearance Summary */}
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 uppercase text-[10px] flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-emerald-600" />
                      STEP 12: FINANCIAL CLEARANCE
                    </span>
                    <p className="text-[10px] text-slate-600">Total Billed: <strong className="text-slate-900">{formData.totalBillKES}</strong></p>
                    <p className="text-[10px] text-slate-600">Benefit Cover: <strong className="text-slate-900">{formData.insuranceCoveredKES}</strong></p>
                    <p className="text-[10px] text-emerald-800 font-bold">Net Balance: {formData.netBalanceKES}</p>
                    <p className="text-[9px] text-slate-500">Cleared by: {formData.clearedByOfficer}</p>
                  </div>

                  {/* Doctor Signature Block */}
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 uppercase text-[10px] block">STEP 13: CLINICIAN CERTIFICATION</span>
                    <p className="text-xs font-black text-slate-950">{doctorName}</p>
                    <p className="text-[10px] text-slate-600 font-mono">KMPDC Licence: {doctorKmpdc}</p>
                    <div className="pt-1">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded font-mono block">
                        PIN: {formData.signaturePin}
                      </span>
                    </div>
                  </div>

                  {/* Patient Acknowledgement & Stamp QR */}
                  <div className="flex flex-col items-end justify-center space-y-1 text-right">
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold">Patient / Next of Kin Receipt:</p>
                        <p className="text-[11px] font-bold text-slate-900">Summary & Rx Received</p>
                        <p className="text-[9px] text-slate-500 font-mono">{formData.stampedDate}</p>
                      </div>
                      <div className="p-1.5 bg-white border border-slate-300 rounded shadow-2xs">
                        <QrCode className="w-10 h-10 text-slate-900" />
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">Scan to verify clinical discharge</span>
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

                <div className="pt-4 border-t border-slate-300 flex justify-between">
                  <p>Reporting Technologist: <strong>{formData.labTechnologist}</strong></p>
                  <p>Certified Sign-off: <strong>LAB-VAL-OK</strong></p>
                </div>
              </div>
            )}

            {/* 5. PPB DIGITAL E-PRESCRIPTION */}
            {selectedForm === "prescription_erx" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h1 className="text-lg font-black uppercase text-emerald-900">{facilityName} • PHARMACY DISPENSARY</h1>
                  <span className="px-3 py-0.5 bg-emerald-800 text-white font-bold text-xs uppercase rounded">
                    PPB STANDARDIZED DIGITAL e-PRESCRIPTION SLIP (MOH / PPB COMPLIANT)
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><span className="text-slate-500 block">Patient Name:</span><strong>{formData.patientName}</strong></div>
                  <div><span className="text-slate-500 block">National ID / Age:</span><strong>{formData.nationalId} ({formData.age} Yrs)</strong></div>
                  <div><span className="text-slate-500 block">Prescribing Doctor:</span><strong>{doctorName}</strong></div>
                  <div><span className="text-slate-500 block">KMPDC License:</span><strong className="font-mono">{doctorKmpdc}</strong></div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-900 text-[10px] uppercase block">Clinical Diagnosis:</span>
                  <span className="font-bold text-slate-900 text-xs">{formData.diagnosis}</span>
                </div>

                <table className="w-full text-left border border-slate-300 rounded-xl overflow-hidden">
                  <thead className="bg-slate-800 text-white text-[11px]">
                    <tr>
                      <th className="p-2">DRUG NAME & FORMULATION</th>
                      <th className="p-2">DOSAGE / FREQUENCY / ROUTE</th>
                      <th className="p-2">TREATMENT DURATION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {formData.dischargeMedications.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-950">{m.drug}</td>
                        <td className="p-2 text-slate-700">{m.dose}</td>
                        <td className="p-2 font-mono font-bold text-emerald-800">{m.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-3 bg-slate-50 rounded-xl text-slate-700 space-y-1">
                  <p><strong>Pharmacy Dispensing Instructions:</strong> Take medications as directed. Do not share prescribed antibiotics. Store in a cool, dry place out of reach of children.</p>
                </div>

                <div className="pt-4 border-t border-slate-300 flex justify-between items-end">
                  <div>
                    <p className="font-bold">Authorized Prescriber: {doctorName}</p>
                    <p className="text-[10px] text-slate-500">Digital Electronic Prescription PIN: #ERX-94821-OK</p>
                  </div>
                  <div className="p-1 border border-slate-300 rounded">
                    <QrCode className="w-10 h-10 text-slate-900" />
                  </div>
                </div>
              </div>
            )}

            {/* 6. TRIAGE SHEET & TEWS SCORE */}
            {selectedForm === "triage_sheet" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h1 className="text-lg font-black uppercase">{facilityName} - ACCIDENT & EMERGENCY</h1>
                  <span className="px-3 py-0.5 bg-amber-600 text-white font-bold text-xs uppercase rounded">
                    TRIAGE EARLY WARNING SCORE (TEWS) & EMERGENCY INTAKE RECORD
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><span className="text-slate-500 block">Patient Name:</span><strong>{formData.patientName}</strong></div>
                  <div><span className="text-slate-500 block">National ID / Age:</span><strong>{formData.nationalId} ({formData.age} Yrs)</strong></div>
                  <div><span className="text-slate-500 block">Triage Category:</span><strong className="text-amber-800">{formData.triageCategory}</strong></div>
                  <div><span className="text-slate-500 block">Consciousness:</span><strong>{formData.triageConsciousness}</strong></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 border border-slate-300 rounded-xl text-center">
                  <div className="p-2 bg-slate-50 rounded">
                    <span className="text-slate-500 block text-[10px]">Blood Pressure</span>
                    <strong className="text-sm">{formData.vitals.bp}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <span className="text-slate-500 block text-[10px]">Temperature</span>
                    <strong className="text-sm text-rose-700">{formData.vitals.temp}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <span className="text-slate-500 block text-[10px]">Heart Rate / Pulse</span>
                    <strong className="text-sm">{formData.vitals.pulse}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <span className="text-slate-500 block text-[10px]">Weight / BMI</span>
                    <strong className="text-sm">{formData.vitals.weight} ({formData.vitals.bmi.split(" ")[0]})</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <p><strong>Presenting Symptoms:</strong> {formData.symptoms}</p>
                  <p><strong>Pain Score:</strong> {formData.triagePainScore}</p>
                </div>

                <div className="pt-4 border-t border-slate-300 flex justify-between">
                  <p>Triage Officer: <strong>{formData.triageNurse}</strong></p>
                  <p>Time of Triage: <strong>{new Date().toLocaleTimeString()}</strong></p>
                </div>
              </div>
            )}

            {/* 7. BIRTH NOTIFICATION MOH 241 */}
            {selectedForm === "birth_notification" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-xl font-sans text-slate-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h1 className="text-lg font-black uppercase text-slate-950">MINISTRY OF HEALTH & CIVIL REGISTRATION</h1>
                  <span className="px-3 py-0.5 bg-emerald-800 text-white font-bold text-xs uppercase rounded">
                    MOH 241: OFFICIAL HOSPITAL NOTICE OF BIRTH
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><span className="text-slate-500 block">Child Gender:</span><strong className="text-emerald-950">{formData.childGender}</strong></div>
                  <div><span className="text-slate-500 block">Date & Time of Birth:</span><strong className="font-mono">{formData.birthDateTime}</strong></div>
                  <div><span className="text-slate-500 block">Birth Weight:</span><strong className="text-slate-950 font-bold">{formData.birthWeight}</strong></div>
                  <div><span className="text-slate-500 block">Apgar Score:</span><strong className="text-emerald-900">{formData.apgarScore}</strong></div>
                </div>

                <div className="space-y-2 border border-slate-300 p-3 rounded-xl">
                  <h4 className="font-bold text-slate-700 uppercase text-[10px]">Parental Records:</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p><strong>Mother's Full Name:</strong> {formData.motherName}</p>
                      <p className="text-slate-600 font-mono">National ID: {formData.motherId}</p>
                    </div>
                    <div>
                      <p><strong>Father's Full Name:</strong> {formData.fatherName}</p>
                      <p className="text-slate-600 font-mono">National ID: {formData.fatherId}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p><strong>Gestational Age at Delivery:</strong> {formData.gestationalAge} • <strong>Delivery Mode:</strong> {formData.deliveryMode}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-300 flex justify-between">
                  <p>Attending Midwife / Medical Officer: <strong>{formData.midwifeOfficer}</strong></p>
                  <p>Civil Notice Serial: <strong>MOH-BN-2026-8942</strong></p>
                </div>
              </div>
            )}

            {/* 8. DEATH NOTIFICATION MOH 242 */}
            {selectedForm === "death_notification" && (
              <div id="print-section" className="w-full max-w-3xl bg-white border-2 border-stone-400 p-8 rounded-2xl shadow-xl font-sans text-stone-900 space-y-4 text-xs">
                <div className="text-center border-b-2 border-stone-900 pb-3">
                  <h1 className="text-lg font-black uppercase text-stone-950">MINISTRY OF HEALTH & CIVIL REGISTRATION</h1>
                  <span className="px-3 py-0.5 bg-stone-900 text-white font-bold text-xs uppercase rounded">
                    MOH 242: OFFICIAL MEDICAL CERTIFICATE OF CAUSE OF DEATH
                  </span>
                </div>

                <div className="bg-stone-100 border border-stone-300 p-3 rounded-xl grid grid-cols-3 gap-2">
                  <div><span className="text-stone-500 block">Deceased Full Name:</span><strong className="text-stone-950">{formData.deceasedName}</strong></div>
                  <div><span className="text-stone-500 block">National ID / Age:</span><strong className="font-mono">{formData.deceasedId}</strong></div>
                  <div><span className="text-stone-500 block">Date & Time of Death:</span><strong className="font-mono text-stone-950">{formData.dateOfDeath}</strong></div>
                </div>

                <div className="space-y-2 border border-stone-300 p-3 rounded-xl">
                  <h4 className="font-bold text-stone-700 uppercase text-[10px]">Medical Certification of Cause:</h4>
                  <p><strong>1. Immediate Cause of Death:</strong> {formData.immediateCauseOfDeath}</p>
                  <p><strong>2. Underlying Antecedent Causes:</strong> {formData.underlyingCauses}</p>
                </div>

                <div className="pt-4 border-t border-stone-300 flex justify-between">
                  <p>Certifying Medical Officer: <strong>{formData.certifyingOfficer}</strong> (KMPDC: {doctorKmpdc})</p>
                  <p>Death Notice Serial: <strong>MOH-DN-2026-0192</strong></p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

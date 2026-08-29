import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Download,
  Search,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Activity,
  ArrowRight,
  HelpCircle,
  Printer,
  Copy,
  Sparkles,
  Smartphone,
  Laptop,
  ChevronDown,
  ChevronRight,
  Hospital,
  Stethoscope,
  HeartPulse,
  CreditCard,
  ShoppingCart,
  FlaskRound,
  Shield,
  Users,
  Ticket,
  Bed,
  ArrowRightLeft,
  DollarSign,
  ShoppingBag,
  Sliders,
  FileText,
  Clock,
  Radio,
  FileDown,
  Check,
  AlertTriangle,
  Lightbulb,
  Keyboard,
  ScanLine
} from "lucide-react";
import { downloadReadmeFile } from "../lib/downloadReadme";
import { toast } from "../lib/promptService";

interface UserGuideProps {
  onNavigateTab?: (tab: string) => void;
}

interface GuideSection {
  id: string;
  title: string;
  category: "core" | "clinical" | "diagnostic" | "finance" | "admin" | "security";
  targetTab?: string;
  icon: React.ElementType;
  roleTags: string[];
  summary: string;
  prerequisites: string[];
  steps: string[];
  tips: string[];
  kenyaComplianceNote?: string;
  hotkey?: string;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "getting-started": true,
    "patient-journey": true,
    "reception": false,
    "triage": false,
    "doctor": false,
    "diagnostics": false,
    "pharmacy": false,
    "billing": false,
    "admissions": false,
    "transfers": false,
    "security": false,
    "kenyan-forms": false,
    "hardware-scanners": false,
    "faq": false,
  });
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    guideSections.forEach((s) => {
      allExpanded[s.id] = true;
    });
    setExpandedSections(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    guideSections.forEach((s) => {
      allCollapsed[s.id] = false;
    });
    setExpandedSections(allCollapsed);
  };

  const handleCopySection = (section: GuideSection) => {
    const text = `${section.title}\n\nSummary:\n${section.summary}\n\nKey Steps:\n${section.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nTips:\n${section.tips.join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopiedSectionId(section.id);
    toast.success(`Copied "${section.title}" guide to clipboard!`, "Guide Copied");
    setTimeout(() => setCopiedSectionId(null), 2500);
  };

  const guideSections: GuideSection[] = [
    {
      id: "getting-started",
      title: "1. Quick Start & Station Authentication",
      category: "core",
      targetTab: "dashboard",
      icon: Sparkles,
      roleTags: ["All Staff", "Doctors", "Nurses", "Reception", "Cashiers", "Admins"],
      summary: "How to authenticate, select your active department station, switch accounts via Station PIN, and navigate the platform.",
      prerequisites: [
        "Registered staff profile in the hospital directory.",
        "Assigned 4-digit Security Station PIN provided by HR / Super Admin.",
      ],
      steps: [
        "Open the hospital portal login page and select your designated clinical or administrative role.",
        "Click on your profile avatar or enter your 4-digit Security PIN for rapid station handovers.",
        "View the facility live operational dashboard (Alt+1) to see pending queue volume, active transfers, and live alerts.",
        "Use the persistent top action bar to access Internal Role Chat, Patient History Lookup, Statutory Forms, and Theme Customization.",
        "Review real-time sync indicators in the header showing active Cloud Firestore database telemetry and offline local caching."
      ],
      tips: [
        "Super Admins can use the top 'Admin Account Jumper' to seamlessly switch to any employee station for supervision without logging out.",
        "Use keyboard shortcuts (Alt+1 through Alt+8) to switch between primary hospital modules instantly."
      ],
      hotkey: "Alt + 1",
    },
    {
      id: "patient-journey",
      title: "2. Patient Journey & Real-Time Flowchart",
      category: "core",
      targetTab: "journey",
      icon: Activity,
      roleTags: ["All Staff", "Doctors", "Nurses", "Management"],
      summary: "Understand the end-to-end clinical lifecycle from patient intake to digital gate pass clearance.",
      prerequisites: [
        "Active patient check-in at Reception Desk.",
      ],
      steps: [
        "Stage 1 — Reception: Patient presents National ID / Passport; biometric validation and SHA eligibility are checked; electronic queue ticket is issued.",
        "Stage 2 — Nurse Triage: Vital signs (BP, Pulse, Temp, SpO2, RBS, BMI) are recorded; MEWS deterioration score is calculated; patient routed to doctor.",
        "Stage 3 — Doctor Desk: Clinician conducts consultation, enters ICD-10 diagnoses, and electronically orders lab tests, imaging, or prescriptions.",
        "Stage 4 — Diagnostics / Ancillary: Lab and Radiology execute orders and submit verified digital results back to the attending doctor.",
        "Stage 5 — Smart Pharmacy: Pharmacist scans 2D GS1 barcodes to dispense verified medication batches with FEFO expiry enforcement.",
        "Stage 6 — Paperless Billing: Cashier reconciles split claims (SHA coverage + Cash co-pay), dispatches M-Pesa STK push, and generates KRA eTIMS invoice.",
        "Stage 7 — Security Clearance: Post-billing digital gate pass is verified at the security gate to clear patient departure."
      ],
      tips: [
        "Open the 'Patient Journey' tab anytime to view live patient milestones, station wait times, and direct routing triggers.",
        "Emergency patients can be flagged as 'Resuscitation / High Priority' to bypass routine triage queues."
      ],
      kenyaComplianceNote: "Aligned with Kenya Ministry of Health (MOH) Universal Health Coverage standards.",
    },
    {
      id: "reception",
      title: "3. Reception Desk & Patient Intake",
      category: "clinical",
      targetTab: "reception",
      icon: Users,
      roleTags: ["Receptionist", "Front Office", "Admins"],
      summary: "Patient registration, optical National ID & MRZ passport scanning, SHA beneficiary verification, and queue ticket generation.",
      prerequisites: [
        "Reception Kiosk module enabled in facility settings.",
        "Hardware optical scanner or keyboard input ready.",
      ],
      steps: [
        "Navigate to 'Reception Desk' (Alt+2).",
        "Scan the patient's Kenyan National ID or Passport using the optical barcode/MRZ scanner, or type the National ID number manually.",
        "Click 'Verify SHA Status' to perform an instant live lookup against the Social Health Authority / AfyaLink DHA database.",
        "Review patient demographic information (Full Name, Phone, Age, Gender, County of Residence, Emergency Contact).",
        "Select the primary clinical service requested (e.g. General Consultation, Paediatrics, Gynaecology, Lab Only, Dental).",
        "Click 'Register & Issue Ticket' to print or display the thermal queue ticket (e.g. GEN-042) and automatically advance the patient to Nurse Triage."
      ],
      tips: [
        "For returning patients, entering their National ID automatically populates their full medical history and previous hospital records.",
        "If SHA verification shows 'Active Beneficiary', the primary consultation charge is automatically routed for insurance claim submission."
      ],
      kenyaComplianceNote: "Complies with KDPA 2019 patient identification standards.",
      hotkey: "Alt + 2",
    },
    {
      id: "triage",
      title: "4. Nurse Triage & Vitals Station",
      category: "clinical",
      targetTab: "triage",
      icon: HeartPulse,
      roleTags: ["Nurse", "Triage Officer", "Clinical Officers"],
      summary: "Capturing vital signs, automated MEWS deterioration scoring, emergency triage categorization, and specialist assignment.",
      prerequisites: [
        "Patient registered at Reception and listed in the Triage queue.",
      ],
      steps: [
        "Open 'Nurse Triage' station from the sidebar or bottom navigation.",
        "Select the next waiting patient from the incoming reception queue.",
        "Measure and input vital signs: Blood Pressure (Systolic/Diastolic), Heart Rate, Respiratory Rate, Body Temperature, SpO2 (%), Random Blood Sugar (RBS), Height (cm), and Weight (kg).",
        "Observe the auto-calculated MEWS (Modified Early Warning Score) and BMI values.",
        "If MEWS score is 4 or higher (Orange/Red), click 'Fast-Track Emergency' to notify the on-call Medical Officer immediately.",
        "Record chief complaints and initial nursing observations, select the assigned Doctor or Specialist, and click 'Save Vitals & Forward to Doctor'."
      ],
      tips: [
        "Vital signs are immediately embedded into the patient's permanent electronic health record (EHR) and visible to the attending doctor.",
        "Nurses can use the top 'Patient Transfer' button to refer patients directly to Inpatient Wards or Emergency Observation."
      ],
      kenyaComplianceNote: "MEWS thresholds follow Kenya National Clinical Guidelines (MOH).",
    },
    {
      id: "doctor",
      title: "5. Doctor's Clinical Desk & EMR",
      category: "clinical",
      targetTab: "doctor",
      icon: Stethoscope,
      roleTags: ["Medical Doctor", "Specialist", "Clinical Officer"],
      summary: "Full EMR consultation, WHO ICD-10 diagnostic indexing, CPOE electronic lab/radiology orders, and digital e-prescriptions.",
      prerequisites: [
        "Patient vitals recorded in Nurse Triage.",
      ],
      steps: [
        "Switch to 'Doctor Station' (Alt+3) and click 'Call Next Patient' or pick from the waiting specialist queue.",
        "Review previous medical visits, allergy warnings, chronic conditions, and Nurse Triage vitals on the consultation panel.",
        "Document History of Presenting Illness (HPI), physical examination findings, and clinical notes.",
        "Search and assign provisional or definitive diagnoses using the integrated WHO ICD-10 code search.",
        "To order lab investigations or imaging: Click 'Order Diagnostics (CPOE)', select tests (e.g. Full Haemogram, Malaria BS, Chest X-Ray), and submit electronically.",
        "To prescribe medications: Click 'Add Prescription', search medications by generic/brand name, specify dosage, frequency, and duration, and click 'Issue e-Prescription'.",
        "Click 'Complete Consultation & Route Patient' to send the patient to Pharmacy, Lab, Admissions, or Billing."
      ],
      tips: [
        "Doctors can click 'View Treatment History' anytime to see previous doctor notes, past lab reports, and medication regimens across all visits.",
        "Prescriptions electronically stream to the Pharmacy POS queue in real-time, eliminating illegible paper prescriptions."
      ],
      kenyaComplianceNote: "Complies with Pharmacy and Poisons Board (PPB) Digital Prescription Guidelines.",
      hotkey: "Alt + 3",
    },
    {
      id: "diagnostics",
      title: "6. Diagnostics: Laboratory & Radiology (LIS / RIS)",
      category: "diagnostic",
      targetTab: "diagnostics",
      icon: FlaskRound,
      roleTags: ["Lab Technologist", "Radiographer", "Pathologist"],
      summary: "Managing specimen barcoding, automated analyzer result entry, reference range critical flags, and radiology DICOM reports.",
      prerequisites: [
        "Diagnostic orders issued by the attending clinician via CPOE.",
      ],
      steps: [
        "Navigate to 'Lab / Radiology' workstation (Alt+4).",
        "Filter pending orders by department (Laboratory vs. Radiology).",
        "For Laboratory: Click 'Collect Specimen' to generate sample barcode tube labels; enter analyzer numeric values and qualitative results.",
        "Abnormal values outside reference ranges are automatically highlighted in bold yellow/red.",
        "For Radiology: Upload diagnostic imaging report findings, enter radiologist impression, and attach DICOM image PACS links.",
        "Click 'Verify & Submit Results' to electronically transmit the completed diagnostic report back to the requesting doctor's desk and trigger billing items."
      ],
      tips: [
        "Doctors receive an instant live notification when lab results for their patient are ready for review.",
        "Lab tests are automatically logged in the hospital revenue ledger for cashier reconciliation."
      ],
      hotkey: "Alt + 4",
    },
    {
      id: "pharmacy",
      title: "7. Smart Pharmacy & Stock POS",
      category: "clinical",
      targetTab: "pharmacy",
      icon: ShoppingCart,
      roleTags: ["Pharmacist", "Pharmacy Tech", "Storekeeper"],
      summary: "2D GS1 barcode scanner dispensing, FEFO batch expiry validation, counterfeit medicine protection, and inventory control.",
      prerequisites: [
        "Active electronic prescription issued by a doctor.",
      ],
      steps: [
        "Open 'Pharmacy POS' (Alt+5).",
        "Select the patient from the 'Pending Prescriptions' queue to display all prescribed items and doctor dosages.",
        "Scan the 2D GS1 DataMatrix barcode on the medicine package using your handheld 2D scanner (or click batch selection).",
        "The system validates the GTIN, verifies that the batch is not expired (FEFO rule), and checks that the quantity is in stock.",
        "Print the patient dosage label (e.g. '1 tab twice daily after meals for 5 days').",
        "Click 'Dispense & Forward to Billing' to automatically decrement stock levels and queue the items for cashier checkout."
      ],
      tips: [
        "If a drug is near its expiry date (within 60 days), the system flags an amber warning to ensure oldest valid stock is dispensed first.",
        "Use the 'Inventory Management' modal to track reorder thresholds, update stock batches, and monitor purchase prices."
      ],
      kenyaComplianceNote: "Meets PPB GS1 traceability standards for pharmaceuticals.",
      hotkey: "Alt + 5",
    },
    {
      id: "billing",
      title: "8. Paperless Split-Ledger Billing & eTIMS",
      category: "finance",
      targetTab: "billing",
      icon: CreditCard,
      roleTags: ["Cashier", "Billing Officer", "Finance Controller"],
      summary: "Managing insurance split claims (SHA/NHIF vs. Cash co-pay), Safaricom M-Pesa STK push checkout, and KRA eTIMS fiscal invoices.",
      prerequisites: [
        "Rendered hospital services (consultation, lab, pharmacy, procedures, bed stay).",
      ],
      steps: [
        "Open 'Split Billing' register (Alt+6).",
        "Select the patient to view the aggregated itemized bill across all hospital departments.",
        "For SHA / Insurance Patients: Click 'Apply SHA Benefit Allocation'. The system computes the covered amount and determines any out-of-pocket co-pay balance.",
        "For Cash / M-Pesa Payments: Enter the patient's Safaricom phone number and click 'Send M-Pesa STK Push'.",
        "The patient receives an instant USSD PIN prompt on their mobile phone; upon entering their M-Pesa PIN, the transaction is verified automatically.",
        "The system produces a cryptographically signed KRA eTIMS invoice with official QR code verification.",
        "Click 'Finalize Invoice & Issue Digital Gate Pass' to grant the patient electronic clearance to exit."
      ],
      tips: [
        "Thermal receipts can be printed in 58mm or 80mm format, including the hospital logo, KRA PIN, eTIMS QR, and M-Pesa receipt number.",
        "The Patient Cart POS modal supports multi-tender split payments (e.g. Partial SHA + M-Pesa + Cash)."
      ],
      kenyaComplianceNote: "Integrated with KRA eTIMS v2.0 and Safaricom Daraja 3.0 API.",
      hotkey: "Alt + 6",
    },
    {
      id: "admissions",
      title: "9. Inpatient Admissions & Ward Management",
      category: "clinical",
      targetTab: "admissions",
      icon: Bed,
      roleTags: ["Ward Master", "Inpatient Nurse", "Attending Doctors"],
      summary: "Interactive bed occupancy matrix, ward allocation, nursing care charts, doctor ward rounds, and discharge summaries.",
      prerequisites: [
        "Admission order issued by a Medical Officer.",
      ],
      steps: [
        "Open 'Admission & Wards' from the navigation menu.",
        "Review bed availability across General Ward, Maternity, Paediatric, Surgical, HDU, and ICU.",
        "Click 'Admit Patient', select an unoccupied bed, assign the attending physician, and enter the admitting diagnosis.",
        "Record daily nursing handover notes, vital sign monitoring charts, and medication administration (MAR).",
        "Attending physicians document daily ward round progress notes and clinical orders.",
        "Upon clinical stabilization: Click 'Initiate Discharge', generate the standardized Discharge Summary, and transfer the ledger to Billing for final clearance."
      ],
      tips: [
        "Daily ward bed charges automatically accumulate on the patient's running invoice.",
        "Discharged patients cannot leave the facility until the Cashier finalizes billing and issues an electronic gate pass."
      ],
    },
    {
      id: "transfers",
      title: "10. Transfers & Referrals Hub (MOH 268)",
      category: "clinical",
      targetTab: "transfers",
      icon: ArrowRightLeft,
      roleTags: ["Doctors", "Nurses", "Ambulance Crew"],
      summary: "Managing internal department transfers, specialized referrals, and external tertiary hospital transfers with official MOH 268 forms.",
      prerequisites: [
        "Active clinical encounter requiring departmental relocation or higher-level referral.",
      ],
      steps: [
        "Open 'Transfers & Referrals' hub from the sidebar or click the top header Transfer icon.",
        "Click 'New Transfer / Referral', select the patient, and specify whether the transfer is Internal (e.g. Ward to HDU) or External (e.g. Transfer to Kenyatta National Hospital).",
        "Enter clinical justification, current medical stability status, and required transit life support (e.g. Oxygen, Infusion, Paramedic Escort).",
        "For External Referrals: The system automatically generates the statutory **MOH 268 Referral Form** complete with diagnostic summaries and clinician signature.",
        "Print or electronically transmit the MOH 268 transfer document to the receiving facility."
      ],
      tips: [
        "The receiving department or ambulance team can confirm arrival with 1-click status update.",
        "All historical transfers remain logged in the patient's EHR timeline."
      ],
      kenyaComplianceNote: "Standardized against Kenya Ministry of Health MOH 268 Referral guidelines.",
    },
    {
      id: "security",
      title: "11. Security Desk & Gate Clearance",
      category: "security",
      targetTab: "security",
      icon: Shield,
      roleTags: ["Security Officers", "Gate Guards", "Hospital Admin"],
      summary: "Validating digital gate passes, logging visitor and vehicle movements, and synchronizing security watchlists.",
      prerequisites: [
        "Patient has settled their invoice and received a Digital Gate Pass code.",
      ],
      steps: [
        "Open 'Security Desk' from the main menu.",
        "To clear a departing patient: Scan the QR code or enter the 6-character Digital Gate Pass code on the patient's clearance slip.",
        "The system displays the patient's discharge clearance status, payment verification, and timestamp.",
        "Click 'Approve Gate Clearance' to log the departure time and close the clinical encounter.",
        "For Vehicle Entry/Exit: Enter vehicle registration (e.g. KDA 123X), driver name, phone number, and purpose of visit in the Vehicle Register.",
        "View the Live Watchlist for real-time security alerts on flagged individuals or restricted vehicles."
      ],
      tips: [
        "Unsettled patients attempting to leave without a valid gate pass trigger an immediate amber warning.",
        "Security staff can log incident reports directly to the Hospital Administrator."
      ],
    },
    {
      id: "kenyan-forms",
      title: "12. Kenyan Statutory Hospital Forms Hub",
      category: "clinical",
      targetTab: "dashboard",
      icon: FileText,
      roleTags: ["Doctors", "Nurses", "HR", "Admins"],
      summary: "Generating official Ministry of Health standardized medical documents with QR verification codes.",
      prerequisites: [
        "Authorized clinical or administrative role.",
      ],
      steps: [
        "Click the **Hospital Forms icon** in the top desktop header bar.",
        "Select the required statutory form type: Standard Sick Off Sheet, MOH 268 Ambulance Referral, Inpatient Discharge Summary, or PPB Digital e-Prescription.",
        "Select the patient to auto-populate diagnostic history, vitals, attending doctor name, and hospital registration numbers.",
        "Specify custom form parameters (e.g. number of recommended rest days and duty resumption date for Sick Offs).",
        "Click 'Print / Export Official Form' to produce a standardized, stamped PDF ready for issuance to employers, insurance providers, or county health directorates."
      ],
      tips: [
        "Every printed form includes an automated QR code for employer authentication to prevent medical certificate fraud.",
      ],
      kenyaComplianceNote: "Standardized templates approved by the Kenya Medical Practitioners and Dentists Council (KMPDC).",
    },
    {
      id: "hardware-scanners",
      title: "13. Hardware Scanner & Thermal Printer Setup",
      category: "admin",
      targetTab: "admin",
      icon: ScanLine,
      roleTags: ["IT Admins", "Pharmacists", "Receptionists", "Cashiers"],
      summary: "How to connect and calibrate 2D GS1 barcode scanners, optical document scanners, and thermal receipt printers.",
      prerequisites: [
        "USB or Bluetooth peripheral hardware devices.",
      ],
      steps: [
        "**2D Barcode Scanners (Pharmacy / Security)**: Plug in USB cable or pair Bluetooth. Scan the 'USB-HID Keyboard' configuration barcode from your scanner manual. Ensure the scanner transmits a carriage return (Enter key) after reading.",
        "**Optical Document Scanners (Reception)**: Position scanner at the front desk. When scanning National IDs or Passports, click into the ID search field before scanning.",
        "**Thermal Receipt Printers (Cashier / POS)**: Install 58mm or 80mm thermal printer drivers on the workstation. In the browser print dialog, set Paper Size to '80mm (3.14 inch) Roll' and Margins to 'None' for edge-to-edge receipt output.",
        "**Barcode Label Printers (Lab / Pharmacy)**: Compatible with Zebra ZD220, TSC TE200, and standard direct thermal label rolls (1.5 x 1 inch or 2 x 1 inch)."
      ],
      tips: [
        "All AfyaCare HMS scanner inputs listen automatically for fast hardware keystroke bursts, enabling instantaneous scanning without requiring mouse clicks.",
      ],
    },
    {
      id: "faq",
      title: "14. Frequently Asked Questions & Troubleshooting",
      category: "core",
      targetTab: "dashboard",
      icon: HelpCircle,
      roleTags: ["All Staff"],
      summary: "Quick answers to common operational scenarios, network interruptions, and system questions.",
      prerequisites: [],
      steps: [
        "**Q: What happens if the internet connection goes down?**\nA: AfyaCare HMS utilizes Google Cloud Firestore with client-side IndexedDB persistence. You can continue consulting, recording vitals, and dispensing medication offline. All changes sync automatically when connectivity is restored.",
        "**Q: How do I handle patients with split insurance and cash co-pays?**\nA: In the Split Billing register, apply the SHA / Insurance coverage amount first. The system automatically computes the remaining balance and enables M-Pesa STK push or cash payment for the difference.",
        "**Q: How do I change my station or pass the terminal to another nurse/doctor?**\nA: Click your user profile avatar in the header and enter your Security Station PIN. The interface instantly adapts to your individual role permissions.",
        "**Q: Where can I download the complete system README and architectural specs?**\nA: Click the 'Download README.md' button at the bottom footer of any page or inside this User Guide header."
      ],
      tips: [
        "For urgent IT system issues, use the 'Patient Tickets / IT Helpdesk' module to raise an immediate support ticket.",
      ],
    },
  ];

  const filteredSections = useMemo(() => {
    return guideSections.filter((section) => {
      // Category filter
      if (selectedCategory !== "all" && section.category !== selectedCategory) {
        return false;
      }
      // Role filter
      if (selectedRole !== "all") {
        const matchesRole = section.roleTags.some((tag) =>
          tag.toLowerCase().includes(selectedRole.toLowerCase()) || tag === "All Staff"
        );
        if (!matchesRole) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = section.title.toLowerCase().includes(q);
        const inSummary = section.summary.toLowerCase().includes(q);
        const inSteps = section.steps.some((s) => s.toLowerCase().includes(q));
        const inTips = section.tips.some((t) => t.toLowerCase().includes(q));
        const inRoles = section.roleTags.some((r) => r.toLowerCase().includes(q));
        return inTitle || inSummary || inSteps || inTips || inRoles;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedRole]);

  return (
    <div id="platform-user-guide" className="max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in text-slate-800">
      
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/80 relative overflow-hidden">
        {/* Background Decorative Ambient Circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold tracking-wide">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Official Knowledge Base & Staff Operating Manual</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              AfyaCare HMS Platform User Guide
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Complete step-by-step operating procedures, clinical station workflows, Kenyan regulatory compliance instructions (SHA • eTIMS • M-PESA • PPB), and hardware calibration manuals for hospital personnel.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Download Complete README.md File */}
            <button
              onClick={() => downloadReadmeFile("AfyaCare-HMS-Enterprise-Documentation.md")}
              title="Download full Markdown documentation file to your computer"
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
            >
              <FileDown className="w-4 h-4" />
              <span>Download README.md</span>
            </button>

            {/* Print or Export Guide */}
            <button
              onClick={() => {
                expandAll();
                setTimeout(() => window.print(), 300);
              }}
              title="Print or Save User Guide as PDF"
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Search and Filter Bar */}
        <div className="mt-6 pt-6 border-t border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guide topics (e.g., M-Pesa STK, MEWS score, 2D barcode, SHA check, Gate pass)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Category"
              className="px-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="core">Core Workflows</option>
              <option value="clinical">Clinical Stations</option>
              <option value="diagnostic">Diagnostics & Labs</option>
              <option value="finance">Billing & Finance</option>
              <option value="security">Security & Gate</option>
              <option value="admin">Admin & Hardware</option>
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              aria-label="Filter by Staff Role"
              className="px-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Staff Roles</option>
              <option value="Doctor">Doctors & Specialists</option>
              <option value="Nurse">Nurses & Triage</option>
              <option value="Pharmacist">Pharmacists</option>
              <option value="Cashier">Cashiers & Billing</option>
              <option value="Receptionist">Receptionists</option>
              <option value="Security">Security Guards</option>
              <option value="Admin">Super Admins & IT</option>
            </select>

            <button
              onClick={expandAll}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 cursor-pointer transition-all"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 cursor-pointer transition-all"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Quick Interactive Station Switchboard Grid */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Quick Station Jump Links</h2>
          </div>
          <span className="text-[11px] text-slate-500">Click any card below to launch that hospital module</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {[
            { label: "1. Reception", tab: "reception", icon: Users, color: "hover:border-blue-400 hover:bg-blue-50/50 text-blue-700" },
            { label: "2. Nurse Triage", tab: "triage", icon: HeartPulse, color: "hover:border-emerald-400 hover:bg-emerald-50/50 text-emerald-700" },
            { label: "3. Doctor Desk", tab: "doctor", icon: Stethoscope, color: "hover:border-purple-400 hover:bg-purple-50/50 text-purple-700" },
            { label: "4. Diagnostics", tab: "diagnostics", icon: FlaskRound, color: "hover:border-cyan-400 hover:bg-cyan-50/50 text-cyan-700" },
            { label: "5. Pharmacy POS", tab: "pharmacy", icon: ShoppingCart, color: "hover:border-amber-400 hover:bg-amber-50/50 text-amber-700" },
            { label: "6. Split Billing", tab: "billing", icon: CreditCard, color: "hover:border-rose-400 hover:bg-rose-50/50 text-rose-700" },
            { label: "7. Admissions", tab: "admissions", icon: Bed, color: "hover:border-indigo-400 hover:bg-indigo-50/50 text-indigo-700" },
            { label: "8. Transfers", tab: "transfers", icon: ArrowRightLeft, color: "hover:border-teal-400 hover:bg-teal-50/50 text-teal-700" },
            { label: "9. Patient Journey", tab: "journey", icon: Activity, color: "hover:border-emerald-400 hover:bg-emerald-50/50 text-emerald-700" },
            { label: "10. Security Desk", tab: "security", icon: Shield, color: "hover:border-slate-400 hover:bg-slate-50 text-slate-700" },
            { label: "11. Finance Ledger", tab: "finance", icon: DollarSign, color: "hover:border-emerald-400 hover:bg-emerald-50/50 text-emerald-700" },
            { label: "12. Admin Settings", tab: "admin", icon: Sliders, color: "hover:border-yellow-400 hover:bg-yellow-50/50 text-yellow-700" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                onClick={() => onNavigateTab?.(item.tab)}
                className={`p-3 rounded-xl border border-slate-200 bg-slate-50/50 transition-all text-left flex flex-col gap-1.5 cursor-pointer active:scale-95 group ${item.color}`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-4 h-4" />
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs font-bold text-slate-800 leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Accordion Guide Sections */}
      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No matching guide topics found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try searching with different keywords like "vitals", "prescription", "eTIMS", "scanner", or clear your filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedRole("all");
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = !!expandedSections[section.id];
            const isCopied = copiedSectionId === section.id;

            return (
              <div
                key={section.id}
                id={`guide-${section.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Header Collapsible Trigger */}
                <div
                  onClick={() => toggleSection(section.id)}
                  className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer bg-gradient-to-r from-slate-50/50 to-white hover:bg-slate-50 select-none transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                          {section.title}
                        </h3>
                        {section.hotkey && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold border border-slate-200">
                            <Keyboard className="w-2.5 h-2.5" />
                            <span>{section.hotkey}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1 sm:line-clamp-none">
                        {section.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Role Tags */}
                    <div className="hidden md:flex flex-wrap gap-1">
                      {section.roleTags.slice(0, 2).map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200"
                        >
                          {role}
                        </span>
                      ))}
                    </div>

                    <div className="p-1 text-slate-400 group-hover:text-slate-600">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content Body */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-slate-100 p-5 sm:p-6 space-y-5 bg-white"
                    >
                      {/* Prerequisites if any */}
                      {section.prerequisites.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-xs">
                            <span className="font-bold text-slate-700">Required Prerequisites:</span>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                              {section.prerequisites.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Step-by-Step Procedure */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Standard Operating Steps</span>
                        </h4>
                        <div className="space-y-2">
                          {section.steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pro Tips & Regulatory Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {section.tips.length > 0 && (
                          <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/80 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Clinical & Operational Tips</span>
                            </div>
                            <ul className="text-xs text-amber-900/80 space-y-1 list-disc list-inside pl-1">
                              {section.tips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {section.kenyaComplianceNote && (
                          <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200/80 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Kenya Regulatory Compliance</span>
                            </div>
                            <p className="text-xs text-emerald-900/80 leading-relaxed">
                              {section.kenyaComplianceNote}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Footer of Section */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopySection(section)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? "Copied" : "Copy Guide Text"}</span>
                          </button>
                        </div>

                        {section.targetTab && onNavigateTab && (
                          <button
                            onClick={() => onNavigateTab(section.targetTab!)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <span>Open {section.title.split(". ")[1] || "Station"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Documentation Download Footer Callout */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-400 font-bold text-xs">
            <FileDown className="w-4 h-4" />
            <span>Full System Architecture & Technical Specifications</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">Need Offline or Printable Documentation?</h3>
          <p className="text-slate-400 text-xs max-w-xl">
            Download the comprehensive Markdown README file containing full architectural schemas, API integration contracts, database entity structures, and compliance checklists.
          </p>
        </div>

        <button
          onClick={() => downloadReadmeFile("AfyaCare-HMS-Enterprise-Documentation.md")}
          className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-xl shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0 border border-emerald-400/30"
        >
          <FileDown className="w-4 h-4" />
          <span>Download README.md</span>
        </button>
      </div>

    </div>
  );
};
export default UserGuide;

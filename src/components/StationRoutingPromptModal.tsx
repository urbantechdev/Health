import React, { useState, useMemo, useEffect } from "react";
import { Employee, QueueTicket } from "../types";
import { DEFAULT_HOSPITAL_PHYSICIANS } from "../lib/queueLoadBalancer";
import {
  Stethoscope,
  Heart,
  FlaskRound,
  ShoppingCart,
  CreditCard,
  User,
  X,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  Flame,
  Check,
  ChevronRight,
  Activity,
  Award
} from "lucide-react";

export type TargetStationType = "triage" | "doctor" | "diagnostics" | "pharmacy" | "billing";

interface StationRoutingPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStation: TargetStationType;
  ticket: QueueTicket;
  allEmployees?: Employee[];
  allQueueTickets?: QueueTicket[];
  onConfirmRoute: (params: {
    targetDepartment: string;
    prefix: string;
    notes: string;
    assignedSpecialistId?: string;
    assignedSpecialistName?: string;
    specialistTitle?: string;
    consultationRoom?: string;
    targetClinic?: string;
    priority?: "normal" | "urgent" | "emergency";
  }) => Promise<void>;
}

// Default Nurse Roster if database has few nurses registered
const DEFAULT_NURSES: Employee[] = [
  {
    id: "nurse-tri-001",
    name: "Nurse Mercy Wanjiku, KRCHN",
    nationalId: "28192019",
    role: "Senior Triage Nurse",
    department: "nursing",
    specialty: "Nurse Triage & Vitals Assessment",
    salary: 120000,
    phone: "+254 722 900 001",
    email: "mercy.wanjiku@hms.co.ke",
    status: "active",
    hireDate: "2022-01-15",
    systemRole: "Nurse"
  },
  {
    id: "nurse-tri-002",
    name: "Nurse Faith Chebet, KRCHN",
    nationalId: "29102938",
    role: "Staff Triage Nurse",
    department: "nursing",
    specialty: "Rapid Triage & Vitals Bay",
    salary: 110000,
    phone: "+254 722 900 002",
    email: "faith.chebet@hms.co.ke",
    status: "active",
    hireDate: "2023-04-10",
    systemRole: "Nurse"
  },
  {
    id: "nurse-tri-003",
    name: "Nurse John Otieno, BScN",
    nationalId: "27481920",
    role: "Emergency Triage Officer",
    department: "nursing",
    specialty: "Emergency & Resuscitation Triage",
    salary: 130000,
    phone: "+254 722 900 003",
    email: "john.otieno@hms.co.ke",
    status: "active",
    hireDate: "2021-11-01",
    systemRole: "Nurse"
  },
  {
    id: "nurse-tri-004",
    name: "Nurse Beatrice Akinyi, KRCHN",
    nationalId: "26381920",
    role: "MCH / Antenatal Nurse",
    department: "nursing",
    specialty: "MCH, Immunization & Vitals",
    salary: 115000,
    phone: "+254 722 900 004",
    email: "beatrice.akinyi@hms.co.ke",
    status: "active",
    hireDate: "2023-08-15",
    systemRole: "Nurse"
  }
];

// Default Diagnostic Technologists & Units
const DEFAULT_DIAGNOSTIC_STAFF: Employee[] = [
  {
    id: "diag-lab-001",
    name: "Peter Mutiso, KMLTTB",
    nationalId: "27381921",
    role: "Chief Laboratory Technologist",
    department: "laboratory",
    specialty: "Main Hematology & LIS Laboratory (Room 201)",
    salary: 140000,
    phone: "+254 722 950 001",
    email: "peter.mutiso@hms.co.ke",
    status: "active",
    hireDate: "2021-06-01",
    systemRole: "Lab"
  },
  {
    id: "diag-lab-002",
    name: "Susan Ochieng, KMLTTB",
    nationalId: "28491028",
    role: "Senior Biochemist & Serologist",
    department: "laboratory",
    specialty: "Clinical Biochemistry & Serology Lab (Room 202)",
    salary: 135000,
    phone: "+254 722 950 002",
    email: "susan.ochieng@hms.co.ke",
    status: "active",
    hireDate: "2022-03-15",
    systemRole: "Lab"
  },
  {
    id: "diag-rad-001",
    name: "Daniel Waweru, Rad Tech",
    nationalId: "26192039",
    role: "Senior Radiographer",
    department: "radiology",
    specialty: "Digital X-Ray & CT Suite (Room 205)",
    salary: 145000,
    phone: "+254 722 950 003",
    email: "daniel.waweru@hms.co.ke",
    status: "active",
    hireDate: "2022-09-01",
    systemRole: "Lab"
  },
  {
    id: "diag-rad-002",
    name: "Dr. Anthony Omondi, MD",
    nationalId: "25491029",
    role: "Consultant Sonographer & Radiologist",
    department: "radiology",
    specialty: "Ultrasound & Sonography Bay (Room 206)",
    salary: 210000,
    phone: "+254 722 950 004",
    email: "anthony.omondi@hms.co.ke",
    status: "active",
    hireDate: "2020-05-10",
    systemRole: "Doctor"
  }
];

// Default Pharmacy Staff
const DEFAULT_PHARMACY_STAFF: Employee[] = [
  {
    id: "pharm-001",
    name: "Pharm. Peter Kamau, BPharm",
    nationalId: "27481920",
    role: "Chief Pharmacist",
    department: "pharmacy",
    specialty: "Main Outpatient Dispensary (Desk 1)",
    salary: 160000,
    phone: "+254 722 960 001",
    email: "peter.kamau@hms.co.ke",
    status: "active",
    hireDate: "2021-08-01",
    systemRole: "Pharmacy"
  },
  {
    id: "pharm-002",
    name: "Pharm. Linda Achieng, Dip Pharm",
    nationalId: "28491029",
    role: "Pharmaceutical Technologist",
    department: "pharmacy",
    specialty: "Fast-Track Pharmacy (Desk 2)",
    salary: 125000,
    phone: "+254 722 960 002",
    email: "linda.achieng@hms.co.ke",
    status: "active",
    hireDate: "2023-01-10",
    systemRole: "Pharmacy"
  }
];

// Default Billing Staff
const DEFAULT_BILLING_STAFF: Employee[] = [
  {
    id: "bill-001",
    name: "Faith Njeri, CPA(K)",
    nationalId: "28491029",
    role: "Senior Billing Cashier",
    department: "billing",
    specialty: "Cashier Desk 1 - M-PESA & eTIMS",
    salary: 110000,
    phone: "+254 722 970 001",
    email: "faith.njeri@hms.co.ke",
    status: "active",
    hireDate: "2022-11-01",
    systemRole: "Billing & Accounts"
  },
  {
    id: "bill-002",
    name: "Jackson Kiprono, BCom",
    nationalId: "27381920",
    role: "SHA & Claims Officer",
    department: "billing",
    specialty: "Cashier Desk 2 - SHA / Insurance & Invoices",
    salary: 115000,
    phone: "+254 722 970 002",
    email: "jackson.kiprono@hms.co.ke",
    status: "active",
    hireDate: "2023-02-15",
    systemRole: "Billing & Accounts"
  }
];

export default function StationRoutingPromptModal({
  isOpen,
  onClose,
  targetStation,
  ticket,
  allEmployees = [],
  allQueueTickets = [],
  onConfirmRoute
}: StationRoutingPromptModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [consultationRoom, setConsultationRoom] = useState("");
  const [targetClinic, setTargetClinic] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent" | "emergency">("normal");
  const [submitting, setSubmitting] = useState(false);

  // Compute prefix and default target department
  const stationConfig = useMemo(() => {
    switch (targetStation) {
      case "triage":
        return {
          title: "Select Available Triage Nurse",
          subTitle: "Assign patient to nurse for vital signs recording, triage category, and acuity scoring.",
          dept: "triage",
          prefix: "TRI",
          icon: Heart,
          iconColor: "text-rose-600",
          iconBg: "bg-rose-50 border-rose-200",
          accentColor: "border-rose-500",
          defaultNotes: "Routed to Nurse Triage for vital signs and urgency check.",
          defaultRooms: [
            "Triage Desk 1 - Vitals Bay",
            "Triage Desk 2 - Rapid Assessment",
            "Triage Desk 3 - Emergency Resuscitation Bay",
            "MCH / Antenatal Triage Suite"
          ],
          defaultClinics: [
            "General OPD Triage",
            "Pediatric Triage Bay",
            "MCH / Antenatal Triage",
            "Emergency Rapid Triage"
          ],
          roleLabel: "Nurse / Triage Officer"
        };
      case "doctor":
        return {
          title: "Select Available Doctor / Specialist",
          subTitle: "Assign patient to attending medical officer, physician, or specialist consultation room.",
          dept: "doctor",
          prefix: "DOC",
          icon: Stethoscope,
          iconColor: "text-blue-600",
          iconBg: "bg-blue-50 border-blue-200",
          accentColor: "border-blue-500",
          defaultNotes: "Routed to Doctor Consultation room for clinical evaluation.",
          defaultRooms: [
            "Consultation Room 101 (General OPD)",
            "Consultation Room 102 (General OPD)",
            "Consultation Room 103 (General OPD)",
            "Consultation Room 104 (Cardiology Clinic)",
            "Consultation Room 105 (Pediatric Clinic)",
            "Consultation Room 108 (Gynecology Suite)",
            "Consultation Room 110 (Dental Surgery)",
            "Consultation Room 112 (Eye Clinic)",
            "Consultation Room 114 (Orthopedic Suite)",
            "Consultation Room 116 (ENT Clinic)"
          ],
          defaultClinics: [
            "General Outpatient (OPD)",
            "Cardiology Clinic",
            "Pediatrics & Child Health",
            "Obstetrics & Gynecology (Gyna)",
            "Dentistry & Dental Surgery",
            "Ophthalmology / Eye Clinic",
            "Orthopedic Surgery",
            "Otolaryngology (ENT)"
          ],
          roleLabel: "Medical Doctor / Specialist"
        };
      case "diagnostics":
        return {
          title: "Select Diagnostic Unit & Technologist",
          subTitle: "Route patient to laboratory for specimen draw/LIS analysis or radiology for imaging scans.",
          dept: "laboratory",
          prefix: "LAB",
          icon: FlaskRound,
          iconColor: "text-indigo-600",
          iconBg: "bg-indigo-50 border-indigo-200",
          accentColor: "border-indigo-500",
          defaultNotes: "Referred for Laboratory diagnostics and diagnostic tests.",
          defaultRooms: [
            "Main Laboratory Suite - Hematology & LIS (Room 201)",
            "Clinical Biochemistry & Serology Lab (Room 202)",
            "Specialized Microbiology & PCR Unit (Room 203)",
            "Digital X-Ray & Imaging Suite (Room 205)",
            "Ultrasound & Sonography Bay (Room 206)"
          ],
          defaultClinics: [
            "Full Haemogram (CBC) & Hematology",
            "Urinalysis & Clinical Chemistry",
            "Serology, Blood Grouping & Crossmatch",
            "Digital X-Ray Radiography",
            "Ultrasound / Sonography"
          ],
          roleLabel: "Technologist / Radiographer"
        };
      case "pharmacy":
        return {
          title: "Select Pharmacy Dispensary & Pharmacist",
          subTitle: "Route prescriptions to pharmacy for drug formulation verification and patient counseling.",
          dept: "pharmacy",
          prefix: "PHA",
          icon: ShoppingCart,
          iconColor: "text-orange-600",
          iconBg: "bg-orange-50 border-orange-200",
          accentColor: "border-orange-500",
          defaultNotes: "Prescriptions queued for smart pharmacy batch match & dispensing.",
          defaultRooms: [
            "Main OPD Dispensary Desk 1",
            "Fast-Track Pharmacy Desk 2",
            "Inpatient & Specialized Dispensary"
          ],
          defaultClinics: [
            "Outpatient Medication Dispensing",
            "Chronic Refill Counseling",
            "Specialized Pediatric Formulation"
          ],
          roleLabel: "Pharmacist on Duty"
        };
      case "billing":
      default:
        return {
          title: "Select Cashier Station & Billing Officer",
          subTitle: "Route patient invoice and split ledger to cashier for M-PESA, SHA, or cash settlement.",
          dept: "billing",
          prefix: "BIL",
          icon: CreditCard,
          iconColor: "text-purple-600",
          iconBg: "bg-purple-50 border-purple-200",
          accentColor: "border-purple-500",
          defaultNotes: "Invoice and ledger reconciliation ready for cashier checkout.",
          defaultRooms: [
            "Cashier Desk 1 - M-PESA & eTIMS",
            "Cashier Desk 2 - SHA / Insurance Desk",
            "Cashier Desk 3 - Direct Settlement"
          ],
          defaultClinics: [
            "General Outpatient Billing",
            "SHA / NHIF Claims Processing",
            "Corporate & Private Insurance"
          ],
          roleLabel: "Cashier / Billing Officer"
        };
    }
  }, [targetStation]);

  // Merge registered DB employees with default roster to ensure full coverage
  const candidateStaffList = useMemo(() => {
    let baseList: Employee[] = [];

    if (targetStation === "triage") {
      const dbNurses = allEmployees.filter((emp) => {
        const d = (emp.department || "").toLowerCase();
        const r = (emp.role || "").toLowerCase();
        const s = (emp.systemRole || "").toLowerCase();
        return (
          d.includes("nurs") ||
          d.includes("triage") ||
          r.includes("nurse") ||
          r.includes("krchn") ||
          r.includes("triage") ||
          s.includes("nurse")
        );
      });
      const names = new Set(dbNurses.map((n) => n.name.toLowerCase().trim()));
      baseList = [...dbNurses];
      DEFAULT_NURSES.forEach((seed) => {
        if (!names.has(seed.name.toLowerCase().trim())) {
          baseList.push(seed);
        }
      });
    } else if (targetStation === "doctor") {
      const dbDoctors = allEmployees.filter((emp) => {
        const d = (emp.department || "").toLowerCase();
        const r = (emp.role || "").toLowerCase();
        const s = (emp.systemRole || "").toLowerCase();
        return (
          d.includes("med") ||
          d.includes("doc") ||
          d.includes("clin") ||
          d.includes("gyna") ||
          d.includes("dental") ||
          r.includes("dr") ||
          r.includes("doctor") ||
          r.includes("physician") ||
          r.includes("surgeon") ||
          r.includes("officer") ||
          s.includes("doctor")
        );
      });
      const names = new Set(dbDoctors.map((n) => n.name.toLowerCase().trim()));
      baseList = [...dbDoctors];
      DEFAULT_HOSPITAL_PHYSICIANS.forEach((seed) => {
        if (!names.has(seed.name.toLowerCase().trim())) {
          baseList.push(seed);
        }
      });
    } else if (targetStation === "diagnostics") {
      const dbDiag = allEmployees.filter((emp) => {
        const d = (emp.department || "").toLowerCase();
        const r = (emp.role || "").toLowerCase();
        const s = (emp.systemRole || "").toLowerCase();
        return (
          d.includes("lab") ||
          d.includes("radio") ||
          d.includes("diag") ||
          r.includes("tech") ||
          r.includes("lab") ||
          r.includes("radio") ||
          s.includes("lab")
        );
      });
      const names = new Set(dbDiag.map((n) => n.name.toLowerCase().trim()));
      baseList = [...dbDiag];
      DEFAULT_DIAGNOSTIC_STAFF.forEach((seed) => {
        if (!names.has(seed.name.toLowerCase().trim())) {
          baseList.push(seed);
        }
      });
    } else if (targetStation === "pharmacy") {
      const dbPharm = allEmployees.filter((emp) => {
        const d = (emp.department || "").toLowerCase();
        const r = (emp.role || "").toLowerCase();
        const s = (emp.systemRole || "").toLowerCase();
        return d.includes("pharm") || r.includes("pharm") || s.includes("pharm");
      });
      const names = new Set(dbPharm.map((n) => n.name.toLowerCase().trim()));
      baseList = [...dbPharm];
      DEFAULT_PHARMACY_STAFF.forEach((seed) => {
        if (!names.has(seed.name.toLowerCase().trim())) {
          baseList.push(seed);
        }
      });
    } else {
      const dbBilling = allEmployees.filter((emp) => {
        const d = (emp.department || "").toLowerCase();
        const r = (emp.role || "").toLowerCase();
        const s = (emp.systemRole || "").toLowerCase();
        return d.includes("bill") || d.includes("cash") || d.includes("fin") || r.includes("cash") || s.includes("bill");
      });
      const names = new Set(dbBilling.map((n) => n.name.toLowerCase().trim()));
      baseList = [...dbBilling];
      DEFAULT_BILLING_STAFF.forEach((seed) => {
        if (!names.has(seed.name.toLowerCase().trim())) {
          baseList.push(seed);
        }
      });
    }

    return baseList;
  }, [allEmployees, targetStation]);

  // Compute workload for each staff member
  const staffWithWorkload = useMemo(() => {
    return candidateStaffList.map((staff) => {
      const pendingCount = allQueueTickets.filter((t) => {
        const matchesName =
          t.assignedSpecialistName &&
          t.assignedSpecialistName.toLowerCase().trim() === staff.name.toLowerCase().trim();
        const matchesId = t.assignedSpecialistId === staff.id;
        const isPending = t.status === "pending";
        return (matchesName || matchesId) && isPending;
      }).length;

      const servingCount = allQueueTickets.filter((t) => {
        const matchesName =
          t.assignedSpecialistName &&
          t.assignedSpecialistName.toLowerCase().trim() === staff.name.toLowerCase().trim();
        const matchesId = t.assignedSpecialistId === staff.id;
        const isServing = t.status === "serving";
        return (matchesName || matchesId) && isServing;
      }).length;

      return {
        staff,
        pendingCount,
        servingCount,
        totalLoad: pendingCount + servingCount
      };
    });
  }, [candidateStaffList, allQueueTickets]);

  // Sort: lowest load first, active status first
  const sortedStaff = useMemo(() => {
    return [...staffWithWorkload].sort((a, b) => {
      if (a.staff.status === "active" && b.staff.status !== "active") return -1;
      if (a.staff.status !== "active" && b.staff.status === "active") return 1;
      return a.totalLoad - b.totalLoad;
    });
  }, [staffWithWorkload]);

  // Filtered by search
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sortedStaff;
    return sortedStaff.filter(
      (item) =>
        item.staff.name.toLowerCase().includes(q) ||
        (item.staff.specialty && item.staff.specialty.toLowerCase().includes(q)) ||
        (item.staff.role && item.staff.role.toLowerCase().includes(q))
    );
  }, [sortedStaff, searchQuery]);

  // Initialize selection
  useEffect(() => {
    if (isOpen) {
      if (sortedStaff.length > 0) {
        const best = sortedStaff[0];
        setSelectedStaffId(best.staff.id);
        
        // Infer default room
        if (targetStation === "doctor") {
          const spec = (best.staff.specialty || "").toLowerCase();
          if (spec.includes("cardio")) setConsultationRoom("Consultation Room 104 (Cardiology Clinic)");
          else if (spec.includes("ped")) setConsultationRoom("Consultation Room 105 (Pediatric Clinic)");
          else if (spec.includes("gyna") || spec.includes("obs")) setConsultationRoom("Consultation Room 108 (Gynecology Suite)");
          else if (spec.includes("dent")) setConsultationRoom("Consultation Room 110 (Dental Surgery)");
          else if (spec.includes("eye") || spec.includes("ophth")) setConsultationRoom("Consultation Room 112 (Eye Clinic)");
          else if (spec.includes("ortho")) setConsultationRoom("Consultation Room 114 (Orthopedic Suite)");
          else if (spec.includes("ent")) setConsultationRoom("Consultation Room 116 (ENT Clinic)");
          else setConsultationRoom("Consultation Room 101 (General OPD)");
        } else {
          setConsultationRoom(stationConfig.defaultRooms[0] || "Station Desk 1");
        }

        setTargetClinic(stationConfig.defaultClinics[0] || "Standard Care");
        setNotes(stationConfig.defaultNotes);
        setPriority("normal");
      }
    }
  }, [isOpen, targetStation, stationConfig, sortedStaff]);

  // Generate target ticket number preview
  const previewTicketNo = useMemo(() => {
    const rawNumber = ticket.ticketNo.includes("-")
      ? ticket.ticketNo.split("-")[1]
      : ticket.ticketNo.replace(/\D/g, "") || "001";
    return `${stationConfig.prefix}-${rawNumber}`;
  }, [ticket, stationConfig.prefix]);

  const selectedStaffObj = useMemo(() => {
    return sortedStaff.find((s) => s.staff.id === selectedStaffId);
  }, [sortedStaff, selectedStaffId]);

  const handleSelectStaff = (item: typeof sortedStaff[0]) => {
    setSelectedStaffId(item.staff.id);
    // Auto-update room if applicable
    if (targetStation === "doctor") {
      const spec = (item.staff.specialty || "").toLowerCase();
      if (spec.includes("cardio")) setConsultationRoom("Consultation Room 104 (Cardiology Clinic)");
      else if (spec.includes("ped")) setConsultationRoom("Consultation Room 105 (Pediatric Clinic)");
      else if (spec.includes("gyna") || spec.includes("obs")) setConsultationRoom("Consultation Room 108 (Gynecology Suite)");
      else if (spec.includes("dent")) setConsultationRoom("Consultation Room 110 (Dental Surgery)");
      else if (spec.includes("eye") || spec.includes("ophth")) setConsultationRoom("Consultation Room 112 (Eye Clinic)");
      else if (spec.includes("ortho")) setConsultationRoom("Consultation Room 114 (Orthopedic Suite)");
      else if (spec.includes("ent")) setConsultationRoom("Consultation Room 116 (ENT Clinic)");
      else setConsultationRoom("Consultation Room 102 (General OPD)");
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const staff = selectedStaffObj?.staff;
      await onConfirmRoute({
        targetDepartment: stationConfig.dept,
        prefix: stationConfig.prefix,
        notes: notes.trim() || stationConfig.defaultNotes,
        assignedSpecialistId: staff?.id || "",
        assignedSpecialistName: staff?.name || "",
        specialistTitle: staff?.specialty || staff?.role || stationConfig.roleLabel,
        consultationRoom: consultationRoom || stationConfig.defaultRooms[0],
        targetClinic: targetClinic || stationConfig.defaultClinics[0],
        priority
      });
      onClose();
    } catch (err) {
      console.error("Routing error in modal:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const IconComponent = stationConfig.icon;

  return (
    <div
      id="station-routing-prompt-modal-backdrop"
      className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 font-sans"
    >
      <div
        id="station-routing-prompt-modal"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${stationConfig.iconBg} border shrink-0`}>
              <IconComponent className={`w-5 h-5 ${stationConfig.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  {stationConfig.title}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Live Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {stationConfig.subTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient & Ticket Identity Banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">
                  {ticket.patientName}
                </span>
                {ticket.age && (
                  <span className="text-slate-500 text-xs font-semibold">
                    ({ticket.age} yrs • {ticket.gender || "Patient"})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Current: <strong className="text-slate-700">{ticket.ticketNo}</strong> • National ID: {ticket.nationalId || "N/A"}
              </div>
            </div>
          </div>

          {/* New Ticket Handover Tag */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Dispatch Ticket:
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono font-black text-xs rounded-lg border border-emerald-300">
              #{previewTicketNo}
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/40">
          {/* Section: Select Personnel / Clinician */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Available {stationConfig.roleLabel}s on Duty</span>
              </label>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${stationConfig.roleLabel}...`}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Staff Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredStaff.length === 0 ? (
                <div className="col-span-2 p-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                  No matching staff members found.
                </div>
              ) : (
                filteredStaff.map((item, idx) => {
                  const isSelected = selectedStaffId === item.staff.id;
                  const isLowestLoad = idx === 0 && item.totalLoad === 0;

                  return (
                    <div
                      key={item.staff.id}
                      onClick={() => handleSelectStaff(item)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isSelected ? <Check className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {item.staff.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {item.staff.specialty || item.staff.role}
                            </p>
                          </div>
                        </div>

                        {/* Recommendation or Load Badge */}
                        <div className="flex flex-col items-end gap-1">
                          {isLowestLoad && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded-md flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                              Best Fit
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                              item.totalLoad === 0
                                ? "bg-emerald-100 text-emerald-800"
                                : item.totalLoad <= 2
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.totalLoad === 0
                              ? "0 Waiting"
                              : `${item.totalLoad} in Queue`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: Consultation Room / Desk & Target Clinic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Consultation Room / Desk Location
              </label>
              <select
                value={consultationRoom}
                onChange={(e) => setConsultationRoom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {stationConfig.defaultRooms.map((rm) => (
                  <option key={rm} value={rm}>
                    {rm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Target Clinic / Service Discipline
              </label>
              <select
                value={targetClinic}
                onChange={(e) => setTargetClinic(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {stationConfig.defaultClinics.map((cl) => (
                  <option key={cl} value={cl}>
                    {cl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Clinical Priority Level */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Encounter Dispatch Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority("normal")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  priority === "normal"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Routine (Normal)</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority("urgent")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  priority === "urgent"
                    ? "bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Urgent Care</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority("emergency")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  priority === "emergency"
                    ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span>STAT Emergency</span>
              </button>
            </div>
          </div>

          {/* Section: Clinical Dispatch Instructions & Handover Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Handover Instructions & Clinical Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide reason for routing, symptoms, or special instructions..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-sans"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {selectedStaffObj ? (
              <span>
                Assigned to: <strong className="text-slate-900">{selectedStaffObj.staff.name}</strong> ({consultationRoom})
              </span>
            ) : (
              <span>Select an available practitioner above</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting || !selectedStaffId}
              onClick={handleConfirm}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Dispatching..." : `Dispatch to ${stationConfig.title.split(" ")[2] || "Station"}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

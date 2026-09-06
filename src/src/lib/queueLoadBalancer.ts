// NextGen HMS - Intelligent Healthcare Queue Load Balancer
// Rule: Dynamic Least-Queue Routing & Load Balancing for Same-Specialty Clinicians
// Optimizes patient wait times by distributing incoming flow to the doctor with the fewest waiting patients.

import { Employee, QueueTicket } from "../types";
import { HOSPITAL_SPECIALISTS_DIRECTORY, SpecialistDefinition, getSpecialistByName } from "../constants/specialists";

export interface DoctorWorkload {
  doctor: Employee;
  doctorId: string;
  doctorName: string;
  specialty: string;
  department: string;
  assignedRoom: string;
  pendingCount: number; // Waiting to be called
  servingCount: number;  // Currently in consultation
  totalLoad: number;     // pendingCount + servingCount
  isActive: boolean;     // Status === "active"
  statusBadge: {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
  };
}

export interface SpecialtyQueueBalance {
  specialtyOrClinicName: string;
  targetDepartment: string;
  matchingDoctors: DoctorWorkload[];
  recommendedDoctor: DoctorWorkload | null;
  recommendedRoom: string;
  totalSpecialtyQueueCount: number;
  isBalanced: boolean;
  recommendationReason: string;
  hasMultipleClinicians: boolean;
}

/**
 * Standard Clinical Hospital Staff Profiles for Specialties (Cleaned: No mock staff)
 * Real staff are managed via HR / Staff Onboarding and fetched from live Firestore.
 */
export const DEFAULT_HOSPITAL_PHYSICIANS: Employee[] = [];

/**
 * Normalizes specialty strings for resilient matching across taxonomy, roles, and profiles.
 * e.g. "Cardiologist" <-> "Cardiology" <-> "Cardiovascular"
 * e.g. "Pediatrician" <-> "Pediatrics & Child Health"
 * e.g. "Obstetrician / Gynecologist" <-> "Obstetrics & Gynecology" <-> "Gyna"
 */
export function normalizeSpecialtyTerm(term: string): string {
  if (!term) return "";
  return term
    .toLowerCase()
    .replace(/clinic|suite|department|unit|specialist|specialty|consultant|doctor|dr\.|officer/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Checks whether a doctor matches a target specialty or department.
 */
export function isDoctorMatchingSpecialty(
  doctor: Employee,
  targetSpecialty: string,
  targetDepartment: string = "doctor"
): boolean {
  if (!doctor) return false;

  const docDept = (doctor.department || "").toLowerCase().trim();
  const docSpec = (doctor.specialty || "").toLowerCase().trim();
  const docRole = (doctor.role || "").toLowerCase().trim();
  const targetSpecClean = (targetSpecialty || "").toLowerCase().trim();
  const targetDeptClean = (targetDepartment || "").toLowerCase().trim();

  // If no specialty is targeted, match general medical officers / OPD clinicians
  if (!targetSpecClean || targetSpecClean.includes("general") || targetSpecClean.includes("opd")) {
    const isGeneral =
      docSpec.includes("general") ||
      docSpec.includes("opd") ||
      docSpec.includes("internal medicine") ||
      docSpec.includes("family") ||
      docRole.includes("medical officer") ||
      docRole.includes("general practitioner") ||
      docRole.includes("doctor") ||
      docRole.includes("physician") ||
      docDept.includes("medical") ||
      docDept.includes("doctor") ||
      docDept.includes("clinical");
    return isGeneral;
  }

  // Exact or normalized root matching
  const normTarget = normalizeSpecialtyTerm(targetSpecClean);
  const normDocSpec = normalizeSpecialtyTerm(docSpec);
  const normDocRole = normalizeSpecialtyTerm(docRole);

  if (normTarget && normDocSpec && (normDocSpec.includes(normTarget) || normTarget.includes(normDocSpec))) {
    return true;
  }

  if (normTarget && normDocRole && (normDocRole.includes(normTarget) || normTarget.includes(normDocRole))) {
    return true;
  }

  // Direct substring checks
  if (docSpec && (docSpec.includes(targetSpecClean) || targetSpecClean.includes(docSpec))) {
    return true;
  }

  // Department-specific matches
  if (targetDeptClean && targetDeptClean !== "doctor") {
    if (docDept.includes(targetDeptClean) || docRole.includes(targetDeptClean)) {
      return true;
    }
  }

  // Cross-reference with Hospital Specialists Directory
  const specDef = getSpecialistByName(targetSpecialty);
  if (specDef) {
    const specNameClean = specDef.name.toLowerCase();
    if (docSpec.includes(specNameClean) || docRole.includes(specNameClean)) return true;
    if (specDef.shortCode && (docSpec.includes(specDef.shortCode.toLowerCase()) || docRole.includes(specDef.shortCode.toLowerCase()))) return true;
  }

  return false;
}

/**
 * Determines standard default consultation room for a doctor based on their specialty/id
 */
export function getDoctorConsultationRoom(doctor: Employee, fallbackRoom?: string): string {
  if (doctor.specialty) {
    const specDef = getSpecialistByName(doctor.specialty);
    if (specDef?.defaultRoom) return specDef.defaultRoom;
  }

  const spec = (doctor.specialty || "").toLowerCase();
  if (spec.includes("cardio")) return "Room 104 - Cardiac Clinic";
  if (spec.includes("pediatric") || spec.includes("child")) return "Room 102 - Pediatrics Clinic";
  if (spec.includes("gyna") || spec.includes("obs")) return "Room 105 - OB/GYN Suite";
  if (spec.includes("dental") || spec.includes("dentist")) return "Room 201 - Dental Surgery";
  if (spec.includes("eye") || spec.includes("ophthal")) return "Room 203 - Eye Clinic";
  if (spec.includes("ortho")) return "Room 116 - Orthopedics Suite";
  if (spec.includes("neuro")) return "Room 114 - Neurosciences Clinic";
  if (spec.includes("derma")) return "Room 120 - Dermatology Clinic";
  if (spec.includes("ent") || spec.includes("throat")) return "Room 122 - ENT Clinic";
  if (spec.includes("pulm") || spec.includes("chest")) return "Room 106 - Chest & Lung Unit";
  if (spec.includes("gastro") || spec.includes("endo")) return "Room 108 - GI Clinic";

  if (fallbackRoom) return fallbackRoom;
  return "Room 101 - General OPD";
}

/**
 * Calculates real-time active queue metrics and workload for all employees / doctors.
 */
export function calculateAllDoctorsWorkload(
  employees: Employee[],
  queueTickets: QueueTicket[]
): Map<string, DoctorWorkload> {
  const workloadMap = new Map<string, DoctorWorkload>();

  // Filter only clinical medical staff from live DB
  const dbClinicalStaff = employees.filter((emp) => {
    const dept = (emp.department || "").toLowerCase();
    const role = (emp.role || "").toLowerCase();
    const spec = (emp.specialty || "").toLowerCase();
    return (
      dept.includes("med") ||
      dept.includes("doc") ||
      dept.includes("clin") ||
      dept.includes("gyna") ||
      dept.includes("dental") ||
      role.includes("dr") ||
      role.includes("doctor") ||
      role.includes("physician") ||
      role.includes("surgeon") ||
      role.includes("officer") ||
      spec.length > 0
    );
  });

  // Ensure comprehensive hospital specialist coverage by merging default roster if needed
  const existingNames = new Set(dbClinicalStaff.map(d => d.name.toLowerCase().trim()));
  const mergedClinicalStaff: Employee[] = [...dbClinicalStaff];

  DEFAULT_HOSPITAL_PHYSICIANS.forEach(seed => {
    if (!existingNames.has(seed.name.toLowerCase().trim())) {
      mergedClinicalStaff.push(seed);
    }
  });

  // Initialize records
  mergedClinicalStaff.forEach((doc) => {
    const room = getDoctorConsultationRoom(doc);
    workloadMap.set(doc.id, {
      doctor: doc,
      doctorId: doc.id,
      doctorName: doc.name,
      specialty: doc.specialty || doc.role || "General Medical Officer",
      department: doc.department || "doctor",
      assignedRoom: room,
      pendingCount: 0,
      servingCount: 0,
      totalLoad: 0,
      isActive: doc.status === "active",
      statusBadge: {
        label: "Idle / Available",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200"
      }
    });
  });

  // Calculate active workload from tickets
  const activeTickets = queueTickets.filter(
    (t) => t.status === "pending" || t.status === "serving"
  );

  activeTickets.forEach((t) => {
    // Match by explicit assignedSpecialistId
    if (t.assignedSpecialistId && workloadMap.has(t.assignedSpecialistId)) {
      const entry = workloadMap.get(t.assignedSpecialistId)!;
      if (t.status === "serving") {
        entry.servingCount += 1;
      } else {
        entry.pendingCount += 1;
      }
      entry.totalLoad = entry.pendingCount + entry.servingCount;
      return;
    }

    // Match by assignedSpecialistName if ID not present
    if (t.assignedSpecialistName) {
      const matchByName = Array.from(workloadMap.values()).find(
        (w) => w.doctorName.toLowerCase().trim() === t.assignedSpecialistName?.toLowerCase().trim()
      );
      if (matchByName) {
        if (t.status === "serving") {
          matchByName.servingCount += 1;
        } else {
          matchByName.pendingCount += 1;
        }
        matchByName.totalLoad = matchByName.pendingCount + matchByName.servingCount;
      }
    }
  });

  // Update status badges based on total queue depth
  workloadMap.forEach((entry) => {
    if (!entry.isActive) {
      entry.statusBadge = {
        label: "Off Duty / On Leave",
        bgClass: "bg-slate-100",
        textClass: "text-slate-500",
        borderClass: "border-slate-300"
      };
    } else if (entry.totalLoad === 0) {
      entry.statusBadge = {
        label: "Free / 0 in Queue",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200"
      };
    } else if (entry.totalLoad <= 2) {
      entry.statusBadge = {
        label: `Light Load (${entry.totalLoad})`,
        bgClass: "bg-blue-50",
        textClass: "text-blue-700",
        borderClass: "border-blue-200"
      };
    } else if (entry.totalLoad <= 4) {
      entry.statusBadge = {
        label: `Moderate (${entry.totalLoad})`,
        bgClass: "bg-amber-50",
        textClass: "text-amber-700",
        borderClass: "border-amber-200"
      };
    } else {
      entry.statusBadge = {
        label: `High Queue (${entry.totalLoad})`,
        bgClass: "bg-rose-50",
        textClass: "text-rose-700",
        borderClass: "border-rose-200"
      };
    }
  });

  return workloadMap;
}

/**
 * Intelligent Queue Balancer:
 * Evaluates all on-duty doctors of the requested specialty/department,
 * calculates each doctor's queue depth, and selects the optimal least-queue clinician.
 */
export function getSmartQueueRecommendation(params: {
  specialtyName?: string;
  department?: string;
  fallbackRoom?: string;
  employees: Employee[];
  queueTickets: QueueTicket[];
}): SpecialtyQueueBalance {
  const { specialtyName = "", department = "doctor", fallbackRoom = "Room 101 - General OPD", employees, queueTickets } = params;

  const workloadMap = calculateAllDoctorsWorkload(employees, queueTickets);
  const allDoctorWorkloads = Array.from(workloadMap.values());

  // 1. Filter doctors matching the exact specialty or department
  let matching = allDoctorWorkloads.filter((w) =>
    isDoctorMatchingSpecialty(w.doctor, specialtyName, department)
  );

  // If no doctors match the specific specialty directly, broaden to all general medical officers
  if (matching.length === 0) {
    matching = allDoctorWorkloads.filter((w) => isDoctorMatchingSpecialty(w.doctor, "General OPD", "doctor"));
  }

  // If still empty, use all active clinical staff
  if (matching.length === 0) {
    matching = allDoctorWorkloads;
  }

  // 2. Sort prioritizing on-duty (active) status first, then lowest totalLoad, then lowest pendingCount
  const sorted = [...matching].sort((a, b) => {
    // Prioritize active on-duty staff
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;

    // Least total load first (Pending + Serving)
    if (a.totalLoad !== b.totalLoad) {
      return a.totalLoad - b.totalLoad;
    }

    // Secondary: Fewest pending waiting
    if (a.pendingCount !== b.pendingCount) {
      return a.pendingCount - b.pendingCount;
    }

    // Tertiary: Fewest serving
    if (a.servingCount !== b.servingCount) {
      return a.servingCount - b.servingCount;
    }

    // Tie breaker: Alphabetical name stability (Round-Robin balance)
    return a.doctorName.localeCompare(b.doctorName);
  });

  const bestDoctor = sorted.length > 0 ? sorted[0] : null;
  const totalQueue = matching.reduce((sum, d) => sum + d.totalLoad, 0);
  const hasMultiple = matching.length > 1;

  let reason = "";
  if (!bestDoctor) {
    reason = "No clinical staff currently registered. Directing to General Pool.";
  } else if (hasMultiple) {
    const nextDoctor = sorted[1];
    if (nextDoctor && nextDoctor.totalLoad > bestDoctor.totalLoad) {
      reason = `⚡ Auto-Balanced: ${bestDoctor.doctorName} has fewer waiting patients (${bestDoctor.totalLoad} active vs. ${nextDoctor.totalLoad} with ${nextDoctor.doctorName}).`;
    } else {
      reason = `⚡ Optimal Least-Queue Assignment: ${bestDoctor.doctorName} is available with ${bestDoctor.totalLoad} patient(s) in queue.`;
    }
  } else {
    reason = `Primary specialist ${bestDoctor.doctorName} assigned with ${bestDoctor.totalLoad} patient(s) waiting.`;
  }

  const defaultRoomResolved = bestDoctor
    ? bestDoctor.assignedRoom
    : fallbackRoom;

  return {
    specialtyOrClinicName: specialtyName || (department === "doctor" ? "General OPD" : department),
    targetDepartment: department,
    matchingDoctors: sorted,
    recommendedDoctor: bestDoctor,
    recommendedRoom: defaultRoomResolved,
    totalSpecialtyQueueCount: totalQueue,
    isBalanced: hasMultiple,
    recommendationReason: reason,
    hasMultipleClinicians: hasMultiple
  };
}

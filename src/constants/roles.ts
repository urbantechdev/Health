import { SystemRole } from "../types";

export type { SystemRole };

export interface SystemRoleConfig {
  role: SystemRole;
  title: string;
  department: string;
  description: string;
  allowedModules: string[];
  badgeColor?: string;
  canPerformClinicalActions?: boolean;
  canDispenseAndCheckout?: boolean;
}

export const ALL_SYSTEM_ROLES: SystemRole[] = [
  "Super Admin",
  "Admin",
  "Reception",
  "Nurse",
  "Doctor",
  "Pharmacy",
  "Lab",
  "HR",
  "Payroll",
  "Finance",
  "Procurement",
  "Billing & Accounts"
];

export const SYSTEM_ROLES_DIRECTORY: SystemRoleConfig[] = [
  {
    role: "Super Admin",
    title: "Chief Executive / Master Admin",
    department: "Executive & System Administration",
    description: "Full master administrative authorization across all clinics, wards, billing, and system configurations.",
    allowedModules: [
      "dashboard",
      "reception",
      "triage",
      "queue",
      "doctor",
      "pharmacy",
      "laboratory",
      "radiology",
      "billing",
      "finance",
      "hr",
      "payroll",
      "procurement",
      "transfers",
      "admissions",
      "surveillance",
      "forms",
      "admin"
    ],
    badgeColor: "purple"
  },
  {
    role: "Admin",
    title: "Hospital Administrator",
    department: "Hospital Administration",
    description: "Operational hospital management, patient flow monitoring, compliance, and department reporting.",
    allowedModules: [
      "dashboard",
      "reception",
      "triage",
      "queue",
      "doctor",
      "pharmacy",
      "laboratory",
      "radiology",
      "billing",
      "finance",
      "hr",
      "payroll",
      "procurement",
      "transfers",
      "admissions",
      "surveillance",
      "forms"
    ],
    badgeColor: "indigo"
  },
  {
    role: "Reception",
    title: "Front Desk & Patient Registrar",
    department: "Front Desk & Registration",
    description: "Patient registration, biometric check-in, queue ticketing, and appointment management.",
    allowedModules: ["dashboard", "reception", "queue", "surveillance", "forms"],
    badgeColor: "blue"
  },
  {
    role: "Nurse",
    title: "Triage & Inpatient Nurse",
    department: "Nursing & Outpatient Triage",
    description: "Vital signs capture, acuity assessment, fast-track triage, patient queueing, and medication administration.",
    allowedModules: ["dashboard", "triage", "queue", "transfers", "admissions", "surveillance", "forms"],
    badgeColor: "rose"
  },
  {
    role: "Doctor",
    title: "Medical Officer / Consultant",
    department: "Clinical Consultations & OPD",
    description: "Clinical examinations, ICD-10 diagnostic coding, electronic prescription ordering, and lab work orders.",
    allowedModules: ["dashboard", "doctor", "laboratory", "radiology", "pharmacy", "transfers", "admissions", "surveillance", "forms"],
    badgeColor: "emerald"
  },
  {
    role: "Pharmacy",
    title: "Chief Pharmacist / Dispenser",
    department: "Pharmacy & Dispensary",
    description: "Prescription fulfillment, inventory stock deduction, batch/expiry alerts, and patient POS dispensaries.",
    allowedModules: ["dashboard", "pharmacy", "procurement", "billing"],
    badgeColor: "amber"
  },
  {
    role: "Lab",
    title: "Medical Laboratory Scientist",
    department: "Diagnostic Laboratory Services",
    description: "Diagnostic specimen testing, automated analyzer results entry, reference verification, and pathology reports.",
    allowedModules: ["dashboard", "laboratory", "transfers", "surveillance"],
    badgeColor: "cyan"
  },
  {
    role: "HR",
    title: "Human Resources Officer",
    department: "Human Resources & Personnel",
    description: "Staff onboarding, shift rosters, medical licensing tracking, leave requests, and performance management.",
    allowedModules: ["dashboard", "hr", "payroll"],
    badgeColor: "teal"
  },
  {
    role: "Payroll",
    title: "Payroll & Compensation Officer",
    department: "Compensation & Benefits",
    description: "Monthly salary schedules, statutory PAYE, SHIF/NHIF, NSSF deductions, and payslip distribution.",
    allowedModules: ["dashboard", "payroll", "finance"],
    badgeColor: "green"
  },
  {
    role: "Finance",
    title: "Finance & Accounting Officer",
    department: "Finance & Accounts",
    description: "Hospital general ledger, bank reconciliations, revenue accounting, and M-Pesa statements.",
    allowedModules: ["dashboard", "finance", "billing", "payroll"],
    badgeColor: "yellow"
  },
  {
    role: "Procurement",
    title: "Procurement & Stores Manager",
    department: "Supply Chain & Procurement",
    description: "Purchase orders, supplier contracts, tender reviews, and bulk pharmaceutical requisitions.",
    allowedModules: ["dashboard", "procurement", "pharmacy"],
    badgeColor: "orange"
  },
  {
    role: "Billing & Accounts",
    title: "Cashier & Billing Specialist",
    department: "Cashier & Patient Billing",
    description: "M-Pesa payment validation, cash settlements, SHA/NHIF invoice processing, and clearance receipts.",
    allowedModules: ["dashboard", "billing", "finance", "forms"],
    badgeColor: "violet"
  }
];

export function getRoleConfig(role?: SystemRole | string): SystemRoleConfig {
  if (!role) {
    return SYSTEM_ROLES_DIRECTORY[2]; // Reception default
  }
  const match = SYSTEM_ROLES_DIRECTORY.find(
    (r) => r.role.toLowerCase() === role.toLowerCase() || r.department.toLowerCase() === role.toLowerCase()
  );
  if (match) return match;

  // Fallback config for unlisted role
  return {
    role: role as SystemRole,
    title: `${role} Officer`,
    department: `${role} Unit`,
    description: `Standard access configuration for ${role}.`,
    allowedModules: ["dashboard", "forms"]
  };
}

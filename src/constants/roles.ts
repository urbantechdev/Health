import { SystemRole } from "../types";
export type { SystemRole };

export interface RoleDefinition {
  id: SystemRole;
  role: SystemRole;
  title: string;
  category: "Leadership" | "Clinical" | "Administrative" | "Financial & Logistics";
  description: string;
  allowedTabs: string[];
  allowedModules: string[];
  department: string;
  colorClass: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
  canManageUsers: boolean;
  canManageInventory: boolean;
  canPerformClinicalActions: boolean;
  canDispenseAndCheckout: boolean;
  canProcessPayroll: boolean;
  canApproveProcurement: boolean;
}

export const SYSTEM_ROLES_MAP: Record<SystemRole, RoleDefinition> = {
  "Super Admin": {
    id: "Super Admin",
    role: "Super Admin",
    title: "Super Admin (Master Control)",
    category: "Leadership",
    description: "Exclusive master authority. Authorized to create, assign, and manage all system users, permissions, master configurations, and cross-departmental operations.",
    allowedTabs: [
      "dashboard",
      "admin",
      "admissions",
      "reception",
      "queue",
      "doctor",
      "transfers",
      "pharmacy",
      "diagnostics",
      "billing",
      "finance",
      "hr",
      "payroll",
      "procurement",
      "tickets",
      "journey",
      "security",
    ],
    allowedModules: [
      "dashboard",
      "admin",
      "admissions",
      "reception",
      "queue",
      "doctor",
      "transfers",
      "pharmacy",
      "diagnostics",
      "billing",
      "finance",
      "hr",
      "payroll",
      "procurement",
      "tickets",
      "journey",
      "security",
    ],
    department: "administration",
    colorClass: {
      bg: "bg-purple-50",
      text: "text-purple-900",
      border: "border-purple-300",
      badge: "bg-purple-700 text-white",
    },
    canManageUsers: true,
    canManageInventory: true,
    canPerformClinicalActions: true,
    canDispenseAndCheckout: true,
    canProcessPayroll: true,
    canApproveProcurement: true,
  },
  "Admin": {
    id: "Admin",
    role: "Admin",
    title: "Admin (Operational Management)",
    category: "Leadership",
    description: "Supervises day-to-day hospital operations, inter-departmental queues, and facility operational metrics.",
    allowedTabs: [
      "dashboard",
      "admin",
      "admissions",
      "reception",
      "queue",
      "doctor",
      "transfers",
      "pharmacy",
      "diagnostics",
      "billing",
      "finance",
      "hr",
      "payroll",
      "procurement",
      "tickets",
      "journey",
      "security",
    ],
    allowedModules: [
      "dashboard",
      "admin",
      "admissions",
      "reception",
      "queue",
      "doctor",
      "transfers",
      "pharmacy",
      "diagnostics",
      "billing",
      "finance",
      "hr",
      "payroll",
      "procurement",
      "tickets",
      "journey",
      "security",
    ],
    department: "administration",
    colorClass: {
      bg: "bg-indigo-50",
      text: "text-indigo-900",
      border: "border-indigo-300",
      badge: "bg-indigo-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: true,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: false,
    canProcessPayroll: true,
    canApproveProcurement: true,
  },
  "Reception": {
    id: "Reception",
    role: "Reception",
    title: "Reception (Front Desk & Patient Registration)",
    category: "Administrative",
    description: "Registers incoming patients, verifies SHA/NHIF eligibility, issues digital queue tickets, and assigns patients to specialist clinics.",
    allowedTabs: ["reception", "admissions", "queue", "journey", "tickets", "transfers", "dashboard"],
    allowedModules: ["reception", "admissions", "queue", "journey", "tickets", "transfers", "dashboard"],
    department: "reception",
    colorClass: {
      bg: "bg-emerald-50",
      text: "text-emerald-900",
      border: "border-emerald-300",
      badge: "bg-emerald-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: false,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: false,
    canProcessPayroll: false,
    canApproveProcurement: false,
  },
  "Doctor": {
    id: "Doctor",
    role: "Doctor",
    title: "Doctor (Clinical Consultation)",
    category: "Clinical",
    description: "Conducts outpatient and inpatient clinical consultations, captures vital signs, creates digital prescriptions, and triggers automated triage routing.",
    allowedTabs: ["doctor", "admissions", "transfers", "queue", "journey", "diagnostics", "pharmacy", "tickets", "dashboard"],
    allowedModules: ["doctor", "admissions", "transfers", "queue", "journey", "diagnostics", "pharmacy", "tickets", "dashboard"],
    department: "medical",
    colorClass: {
      bg: "bg-cyan-50",
      text: "text-cyan-900",
      border: "border-cyan-300",
      badge: "bg-cyan-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: false,
    canPerformClinicalActions: true,
    canDispenseAndCheckout: false,
    canProcessPayroll: false,
    canApproveProcurement: false,
  },
  "Pharmacy": {
    id: "Pharmacy",
    role: "Pharmacy",
    title: "Pharmacy (Dispensing & POS)",
    category: "Clinical",
    description: "Receives doctor digital prescriptions, verifies medicine availability, executes POS checkout with M-Pesa/Cash, and holds exclusive authority over drug inventory.",
    allowedTabs: ["pharmacy", "transfers", "queue", "billing", "procurement", "dashboard"],
    allowedModules: ["pharmacy", "transfers", "queue", "billing", "procurement", "dashboard"],
    department: "pharmacy",
    colorClass: {
      bg: "bg-teal-50",
      text: "text-teal-900",
      border: "border-teal-300",
      badge: "bg-teal-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: true,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: true,
    canProcessPayroll: false,
    canApproveProcurement: false,
  },
  "Lab": {
    id: "Lab",
    role: "Lab",
    title: "Lab (Laboratory Diagnostics)",
    category: "Clinical",
    description: "Processes lab and diagnostic test orders generated from doctor consultations, records specimen findings, and uploads lab diagnostic reports.",
    allowedTabs: ["diagnostics", "transfers", "queue", "procurement", "dashboard"],
    allowedModules: ["diagnostics", "transfers", "queue", "procurement", "dashboard"],
    department: "laboratory",
    colorClass: {
      bg: "bg-amber-50",
      text: "text-amber-900",
      border: "border-amber-300",
      badge: "bg-amber-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: false,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: false,
    canProcessPayroll: false,
    canApproveProcurement: false,
  },
  "HR": {
    id: "HR",
    role: "HR",
    title: "HR (Human Resources)",
    category: "Administrative",
    description: "Maintains hospital employee profiles, contracts, credentialing, department placements, and staff attendance.",
    allowedTabs: ["hr", "payroll", "dashboard"],
    allowedModules: ["hr", "payroll", "dashboard"],
    department: "hr",
    colorClass: {
      bg: "bg-rose-50",
      text: "text-rose-900",
      border: "border-rose-300",
      badge: "bg-rose-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: false,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: false,
    canProcessPayroll: false,
    canApproveProcurement: false,
  },
  "Payroll": {
    id: "Payroll",
    role: "Payroll",
    title: "Payroll (Salary & Compensation Management)",
    category: "Financial & Logistics",
    description: "Computes monthly employee compensation, calculates statutory deductions (SHIF, PAYE, Housing Levy, NSSF), and disburses payslips.",
    allowedTabs: ["payroll", "finance", "hr", "dashboard"],
    allowedModules: ["payroll", "finance", "hr", "dashboard"],
    department: "finance",
    colorClass: {
      bg: "bg-orange-50",
      text: "text-orange-900",
      border: "border-orange-300",
      badge: "bg-orange-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: false,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: false,
    canProcessPayroll: true,
    canApproveProcurement: false,
  },
  "Finance": {
    id: "Finance",
    role: "Finance",
    title: "Finance (Financial Reporting & Oversight)",
    category: "Financial & Logistics",
    description: "Tracks hospital revenues, operational expenses, department profit & loss, cash flows, and KRA eTIMS regulatory compliance.",
    allowedTabs: ["finance", "billing", "procurement", "payroll", "dashboard"],
    allowedModules: ["finance", "billing", "procurement", "payroll", "dashboard"],
    department: "finance",
    colorClass: {
      bg: "bg-blue-50",
      text: "text-blue-900",
      border: "border-blue-300",
      badge: "bg-blue-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: false,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: false,
    canProcessPayroll: true,
    canApproveProcurement: true,
  },
  "Procurement": {
    id: "Procurement",
    role: "Procurement",
    title: "Procurement (Purchasing & Supply Chain)",
    category: "Financial & Logistics",
    description: "Manages purchase requisitions, generates official Local Purchase Orders (LPO), inspects Goods Received Notes (GRN), and manages supplier registries.",
    allowedTabs: ["procurement", "finance", "pharmacy", "dashboard"],
    allowedModules: ["procurement", "finance", "pharmacy", "dashboard"],
    department: "procurement",
    colorClass: {
      bg: "bg-stone-50",
      text: "text-stone-900",
      border: "border-stone-300",
      badge: "bg-stone-700 text-white",
    },
    canManageUsers: false,
    canManageInventory: false,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: false,
    canProcessPayroll: false,
    canApproveProcurement: true,
  },
  "Billing & Accounts": {
    id: "Billing & Accounts",
    role: "Billing & Accounts",
    title: "Billing & Accounts (Invoicing & Revenue Management)",
    category: "Financial & Logistics",
    description: "Generates consolidated patient invoices, handles split billing for SHA/Insurance/Cash, collects M-Pesa payments, and reconciles patient accounts.",
    allowedTabs: ["billing", "transfers", "finance", "queue", "dashboard"],
    allowedModules: ["billing", "transfers", "finance", "queue", "dashboard"],
    department: "billing",
    colorClass: {
      bg: "bg-emerald-50",
      text: "text-emerald-900",
      border: "border-emerald-300",
      badge: "bg-emerald-800 text-white",
    },
    canManageUsers: false,
    canManageInventory: false,
    canPerformClinicalActions: false,
    canDispenseAndCheckout: true,
    canProcessPayroll: false,
    canApproveProcurement: false,
  },
};

export const SYSTEM_ROLES_DIRECTORY: RoleDefinition[] = Object.values(SYSTEM_ROLES_MAP);

export const ALL_SYSTEM_ROLES: SystemRole[] = [
  "Super Admin",
  "Admin",
  "Reception",
  "Doctor",
  "Pharmacy",
  "Lab",
  "HR",
  "Payroll",
  "Finance",
  "Procurement",
  "Billing & Accounts",
];

export function getRoleConfig(roleName?: string): RoleDefinition {
  if (!roleName) return SYSTEM_ROLES_MAP["Super Admin"];
  const trimmed = roleName.trim();
  if (trimmed in SYSTEM_ROLES_MAP) {
    return SYSTEM_ROLES_MAP[trimmed as SystemRole];
  }
  // Loose matching for legacy strings
  const lower = trimmed.toLowerCase();
  if (lower.includes("super admin")) return SYSTEM_ROLES_MAP["Super Admin"];
  if (lower.includes("admin")) return SYSTEM_ROLES_MAP["Admin"];
  if (lower.includes("reception")) return SYSTEM_ROLES_MAP["Reception"];
  if (lower.includes("doc") || lower.includes("physician") || lower.includes("surgeon") || lower.includes("med") || lower.includes("cardiologist") || lower.includes("pulmonologist")) return SYSTEM_ROLES_MAP["Doctor"];
  if (lower.includes("pharm")) return SYSTEM_ROLES_MAP["Pharmacy"];
  if (lower.includes("lab")) return SYSTEM_ROLES_MAP["Lab"];
  if (lower.includes("pay")) return SYSTEM_ROLES_MAP["Payroll"];
  if (lower.includes("hr") || lower.includes("human")) return SYSTEM_ROLES_MAP["HR"];
  if (lower.includes("procure") || lower.includes("supply")) return SYSTEM_ROLES_MAP["Procurement"];
  if (lower.includes("bill") || lower.includes("account")) return SYSTEM_ROLES_MAP["Billing & Accounts"];
  if (lower.includes("finan")) return SYSTEM_ROLES_MAP["Finance"];
  
  return SYSTEM_ROLES_MAP["Super Admin"];
}

export const getRoleDefinition = getRoleConfig;

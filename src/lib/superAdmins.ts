import { Employee } from "../types";

/**
 * Top-Tier Master Super Admin Whitelist
 * These sovereign administrators have unrestricted authority to manage all 11 system roles,
 * onboard/delete staff, configure facility settings, manage wards & billing, and perform system-level operations.
 */
export const SUPER_ADMIN_EMAILS: readonly string[] = [
  "tassiahillhospital@gmail.com",
  "moraasdorcah@gmail.com",
  "urbaninteriorkenya@gmail.com"
] as const;

/**
 * Checks if a given email belongs to a Master Super Admin.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return SUPER_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase().trim() === clean);
}

/**
 * Master Super Admin Seed Profiles
 * Strictly restricted to:
 * 1. The Tassia Hill Hospital (tassiahillhospital@gmail.com)
 * 2. Dorcah Moraa (moraasdorcah@gmail.com)
 */
export const MASTER_SUPER_ADMIN_SEEDS: Omit<Employee, "id">[] = [
  {
    name: "The Tassia Hill Hospital (Super Admin)",
    nationalId: "31849204",
    role: "Super Admin",
    department: "administration",
    specialty: "Hospital Director General & System Sovereign",
    salary: 500000,
    phone: "+254 700 000 004",
    email: "tassiahillhospital@gmail.com",
    pin: "2026",
    status: "active",
    hireDate: "2024-01-01",
    accessLevel: "Super Admin",
    systemRole: "Super Admin"
  },
  {
    name: "Dorcah Moraa (System Developer)",
    nationalId: "28471920",
    role: "Super Admin",
    department: "engineering",
    specialty: "Lead System Developer & Software Architect",
    salary: 0,
    isEmployee: false,
    employmentType: "developer",
    phone: "+254 700 000 001",
    email: "moraasdorcah@gmail.com",
    pin: "2026",
    status: "active",
    hireDate: "2024-01-01",
    accessLevel: "Super Admin",
    systemRole: "Super Admin"
  },
  {
    name: "System Administrator (Master Admin)",
    nationalId: "39201948",
    role: "Super Admin",
    department: "administration",
    specialty: "System Owner & Hospital Director",
    salary: 500000,
    phone: "+254 700 000 000",
    email: "urbaninteriorkenya@gmail.com",
    pin: "2026",
    status: "active",
    hireDate: "2024-01-01",
    accessLevel: "Super Admin",
    systemRole: "Super Admin"
  }
];

export const PRIMARY_SUPER_ADMIN_SEED = MASTER_SUPER_ADMIN_SEEDS[0];

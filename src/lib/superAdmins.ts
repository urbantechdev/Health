import { Employee } from "../types";

/**
 * Top-Tier Master Super Admin Whitelist
 * These sovereign administrators have unrestricted authority to manage all 11 system roles,
 * onboard/delete staff, configure facility settings, manage wards & billing, and perform system-level operations.
 */
export const SUPER_ADMIN_EMAILS: readonly string[] = [
  "moraasdorcah@gmail.com",
  "urbaninteriorkenya@gmail.com",
  "naisiaetext@gmail.com"
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
 */
export const MASTER_SUPER_ADMIN_SEEDS: Omit<Employee, "id">[] = [
  {
    name: "Dorcah Moraa (Super Admin Sovereign)",
    nationalId: "28471920",
    role: "Super Admin",
    department: "administration",
    specialty: "Hospital Director General & System Sovereign",
    salary: 500000,
    phone: "+254 700 000 001",
    email: "moraasdorcah@gmail.com",
    pin: "2026",
    status: "active",
    hireDate: "2024-01-01",
    accessLevel: "Super Admin",
    systemRole: "Super Admin"
  },
  {
    name: "Urban Interior Kenya (Super Admin)",
    nationalId: "24189342",
    role: "Super Admin",
    department: "administration",
    specialty: "Hospital Director & Super Admin",
    salary: 450000,
    phone: "+254 712 345 678",
    email: "urbaninteriorkenya@gmail.com",
    pin: "2026",
    status: "active",
    hireDate: "2024-01-15",
    accessLevel: "Super Admin",
    systemRole: "Super Admin"
  },
  {
    name: "Naisiae Text (Super Admin)",
    nationalId: "30194827",
    role: "Super Admin",
    department: "administration",
    specialty: "Executive Hospital Administrator & Super Admin",
    salary: 450000,
    phone: "+254 722 000 002",
    email: "naisiaetext@gmail.com",
    pin: "2026",
    status: "active",
    hireDate: "2024-01-20",
    accessLevel: "Super Admin",
    systemRole: "Super Admin"
  }
];

export const PRIMARY_SUPER_ADMIN_SEED = MASTER_SUPER_ADMIN_SEEDS[0];

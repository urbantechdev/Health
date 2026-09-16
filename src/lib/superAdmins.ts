export interface SuperAdminSeed {
  email: string;
  name: string;
  role: string;
  department: string;
  pin: string;
  adminType?: "developer" | "hospital";
}

/**
 * Developer Admin: Only Moraa (moraasdorcah@gmail.com)
 * Hospital Admin: tassiahillhospital@gmail.com (Halima Isaq Yakub)
 */
export const DEVELOPER_ADMIN_EMAILS: string[] = [
  "moraasdorcah@gmail.com",
];

export const HOSPITAL_ADMIN_EMAILS: string[] = [
  "tassiahillhospital@gmail.com",
];

export const SUPER_ADMIN_EMAILS: string[] = [
  "tassiahillhospital@gmail.com",
  "moraasdorcah@gmail.com",
  "urbaninteriorkenya@gmail.com",
  "zamodasports@gmail.com",
  "veronicanjus@gmail.com",
  "admin@tassiahill.co.ke",
  "director@tassiahill.co.ke",
  "superadmin@tassiahill.co.ke",
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

export function isDeveloperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return DEVELOPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

export function isHospitalAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return HOSPITAL_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

export const MASTER_SUPER_ADMIN_SEEDS: SuperAdminSeed[] = [
  {
    email: "tassiahillhospital@gmail.com",
    name: "HALIMA ISAQ YAKUB",
    role: "Super Admin",
    department: "Hospital Administration",
    pin: "2026",
    adminType: "hospital",
  },
  {
    email: "moraasdorcah@gmail.com",
    name: "Dorcah Moraa (System Developer)",
    role: "Super Admin",
    department: "Software Engineering & Architecture",
    pin: "2026",
    adminType: "developer",
  },
  {
    email: "urbaninteriorkenya@gmail.com",
    name: "Urban Interior Lead Admin",
    role: "Super Admin",
    department: "Executive Management",
    pin: "2026",
    adminType: "developer",
  },
  {
    email: "zamodasports@gmail.com",
    name: "System Super Administrator (Zamoda)",
    role: "Super Admin",
    department: "Executive Administration",
    pin: "2026",
    adminType: "developer",
  },
  {
    email: "veronicanjus@gmail.com",
    name: "Veronica Njus (Super Administrator)",
    role: "Super Admin",
    department: "Executive Management",
    pin: "2026",
    adminType: "hospital",
  },
  {
    email: "admin@tassiahill.co.ke",
    name: "System Super Administrator",
    role: "Super Admin",
    department: "Information Technology",
    pin: "2026",
    adminType: "hospital",
  },
  {
    email: "director@tassiahill.co.ke",
    name: "Hospital Director",
    role: "Super Admin",
    department: "Executive Board",
    pin: "2026",
    adminType: "hospital",
  },
  {
    email: "superadmin@tassiahill.co.ke",
    name: "Master Super Administrator",
    role: "Super Admin",
    department: "Executive Management",
    pin: "2026",
    adminType: "hospital",
  },
];

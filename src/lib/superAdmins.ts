export interface SuperAdminSeed {
  email: string;
  name: string;
  role: string;
  department: string;
  pin: string;
}

export const SUPER_ADMIN_EMAILS: string[] = [
  "veronicanjus@gmail.com",
  "urbaninteriorkenya@gmail.com",
  "admin@tassiahill.co.ke",
  "director@tassiahill.co.ke",
  "superadmin@tassiahill.co.ke",
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

export const MASTER_SUPER_ADMIN_SEEDS: SuperAdminSeed[] = [
  {
    email: "veronicanjus@gmail.com",
    name: "System Super Administrator",
    role: "Super Admin",
    department: "Executive Management",
    pin: "2026",
  },
  {
    email: "urbaninteriorkenya@gmail.com",
    name: "Urban Interior Lead Admin",
    role: "Super Admin",
    department: "Executive Management",
    pin: "2026",
  },
  {
    email: "admin@tassiahill.co.ke",
    name: "System Super Administrator",
    role: "Super Admin",
    department: "Information Technology",
    pin: "2026",
  },
];

import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from "firebase/firestore";
import { Employee, SystemRole } from "../types";
import { isSuperAdminEmail, MASTER_SUPER_ADMIN_SEEDS } from "./superAdmins";

export interface UserSaveInput {
  uid?: string;
  id?: string;
  name: string;
  displayName?: string;
  email: string;
  role?: SystemRole;
  systemRole?: SystemRole;
  department?: string;
  specialty?: string;
  accessLevel?: "Super Admin" | "Department Admin" | "Standard Staff" | string;
  pin?: string;
  phone?: string;
  nationalId?: string;
  salary?: number;
  basicSalary?: number;
  photoURL?: string;
  avatarUrl?: string;
  status?: "active" | "inactive" | "terminated" | "on_leave" | string;
  licenseNumber?: string;
  employeeNumber?: string;
  hireDate?: string;
  isSuperAdmin?: boolean;
  isEmployee?: boolean;
  password?: string;
}

export interface RepoStaffSeed {
  name: string;
  email: string;
  role: SystemRole;
  department: string;
  specialty: string;
  pin: string;
  nationalId: string;
  phone: string;
  salary: number;
  accessLevel: "Super Admin" | "Department Admin" | "Standard Staff";
  licenseNumber?: string;
  isSuperAdmin?: boolean;
}

/**
 * Complete staff directory from the repository, including:
 * - Super Admins & IT Directors
 * - Senior Medical Officers & Specialist Doctors
 * - Clinical & Triage Nurses
 * - In-charge Pharmacists
 * - Laboratory Scientists
 * - Reception & Front Office Registrars
 * - Billing & Accounts Cashiers
 * - Finance, HR, Procurement & Payroll Executives
 */
export const REPO_STAFF_SEEDS: RepoStaffSeed[] = [
  // 1. Executive Super Administrators & Developers
  {
    name: "HALIMA ISAQ YAKUB",
    email: "tassiahillhospital@gmail.com",
    role: "Super Admin",
    department: "Hospital Administration",
    specialty: "Hospital Chief Executive",
    pin: "2026",
    nationalId: "20194821",
    phone: "+254 720 000 001",
    salary: 350000,
    accessLevel: "Super Admin",
    isSuperAdmin: true,
  },
  {
    name: "Dorcah Moraa (System Developer)",
    email: "moraasdorcah@gmail.com",
    role: "Super Admin",
    department: "Software Engineering & Architecture",
    specialty: "Lead Software Architect",
    pin: "2026",
    nationalId: "21948201",
    phone: "+254 720 000 002",
    salary: 350000,
    accessLevel: "Super Admin",
    isSuperAdmin: true,
  },
  {
    name: "Urban Interior Lead Admin",
    email: "urbaninteriorkenya@gmail.com",
    role: "Super Admin",
    department: "Executive Management",
    specialty: "Executive Systems Admin",
    pin: "2026",
    nationalId: "22849102",
    phone: "+254 720 000 003",
    salary: 300000,
    accessLevel: "Super Admin",
    isSuperAdmin: true,
  },
  {
    name: "System Super Administrator (Zamoda)",
    email: "zamodasports@gmail.com",
    role: "Super Admin",
    department: "Executive Administration",
    specialty: "Executive Lead Administrator",
    pin: "2026",
    nationalId: "23849104",
    phone: "+254 720 000 004",
    salary: 300000,
    accessLevel: "Super Admin",
    isSuperAdmin: true,
  },
  {
    name: "Veronica Njus (Super Administrator)",
    email: "veronicanjus@gmail.com",
    role: "Super Admin",
    department: "Executive Management",
    specialty: "Executive Administrator",
    pin: "2026",
    nationalId: "24849105",
    phone: "+254 720 000 005",
    salary: 300000,
    accessLevel: "Super Admin",
    isSuperAdmin: true,
  },
  {
    name: "System Super Administrator",
    email: "admin@tassiahill.co.ke",
    role: "Super Admin",
    department: "Information Technology",
    specialty: "IT Infrastructure Director",
    pin: "2026",
    nationalId: "25849106",
    phone: "+254 720 000 006",
    salary: 280000,
    accessLevel: "Super Admin",
    isSuperAdmin: true,
  },
  {
    name: "Hospital Director",
    email: "director@tassiahill.co.ke",
    role: "Super Admin",
    department: "Executive Board",
    specialty: "Medical Director & Board Chair",
    pin: "2026",
    nationalId: "26849107",
    phone: "+254 720 000 007",
    salary: 380000,
    accessLevel: "Super Admin",
    isSuperAdmin: true,
  },
  {
    name: "Master Super Administrator",
    email: "superadmin@tassiahill.co.ke",
    role: "Super Admin",
    department: "Executive Management",
    specialty: "Master System Administrator",
    pin: "2026",
    nationalId: "27849108",
    phone: "+254 720 000 008",
    salary: 300000,
    accessLevel: "Super Admin",
    isSuperAdmin: true,
  },

  // 2. Doctors & Clinical Specialists
  {
    name: "Dr. Arthur Conan",
    email: "arthur.conan@tassiahillhospital.co.ke",
    role: "Doctor",
    department: "medical",
    specialty: "Consultant Physician",
    pin: "2026",
    nationalId: "24108841",
    phone: "+254 711 234 567",
    salary: 180000,
    accessLevel: "Standard Staff",
    licenseNumber: "KMPDC-A-48201",
  },
  {
    name: "Dr. Amina Wanjiku",
    email: "amina.wanjiku@tassiahillhospital.co.ke",
    role: "Doctor",
    department: "medical",
    specialty: "Head of Medical Services",
    pin: "2026",
    nationalId: "26781290",
    phone: "+254 722 345 678",
    salary: 220000,
    accessLevel: "Department Admin",
    licenseNumber: "KMPDC-A-39102",
  },
  {
    name: "Dr. Brian Mwangi",
    email: "brian.mwangi@tassiahillhospital.co.ke",
    role: "Doctor",
    department: "medical",
    specialty: "Consultant Paediatrician",
    pin: "2026",
    nationalId: "30192841",
    phone: "+254 733 456 789",
    salary: 190000,
    accessLevel: "Standard Staff",
    licenseNumber: "KMPDC-B-51029",
  },
  {
    name: "Dr. Halima Yakub",
    email: "dr.halima@tassiahillhospital.co.ke",
    role: "Doctor",
    department: "medical",
    specialty: "Consultant Surgeon & CMO",
    pin: "2026",
    nationalId: "22891045",
    phone: "+254 720 123 456",
    salary: 240000,
    accessLevel: "Department Admin",
    licenseNumber: "KMPDC-H-19402",
  },

  // 3. Nursing & Triage
  {
    name: "Nurse Beatrice Chebet",
    email: "beatrice.chebet@tassiahillhospital.co.ke",
    role: "Nurse",
    department: "nursing",
    specialty: "Nursing Officer In-Charge",
    pin: "2026",
    nationalId: "28391024",
    phone: "+254 712 567 890",
    salary: 95000,
    accessLevel: "Department Admin",
    licenseNumber: "NCK-RN-29401",
  },
  {
    name: "Faith Mwende",
    email: "faith.mwende@tassiahillhospital.co.ke",
    role: "Nurse",
    department: "nursing",
    specialty: "Triage & Emergency Nurse",
    pin: "2026",
    nationalId: "29481726",
    phone: "+254 723 678 901",
    salary: 85000,
    accessLevel: "Standard Staff",
    licenseNumber: "NCK-RN-38102",
  },

  // 4. Pharmacy
  {
    name: "Kennedy Otieno",
    email: "kennedy.otieno@tassiahillhospital.co.ke",
    role: "Pharmacy",
    department: "pharmacy",
    specialty: "Lead Pharmacist",
    pin: "2026",
    nationalId: "27103945",
    phone: "+254 734 789 012",
    salary: 140000,
    accessLevel: "Department Admin",
    licenseNumber: "PPB-P-19204",
  },
  {
    name: "Mary Wairimu",
    email: "mary.wairimu@tassiahillhospital.co.ke",
    role: "Pharmacy",
    department: "pharmacy",
    specialty: "Clinical Pharmacist",
    pin: "2026",
    nationalId: "31829472",
    phone: "+254 715 890 123",
    salary: 110000,
    accessLevel: "Standard Staff",
    licenseNumber: "PPB-P-28491",
  },

  // 5. Laboratory & Diagnostics
  {
    name: "Mercy Achieng",
    email: "mercy.achieng@tassiahillhospital.co.ke",
    role: "Lab",
    department: "laboratory",
    specialty: "Chief Medical Lab Technologist",
    pin: "2026",
    nationalId: "25819403",
    phone: "+254 726 901 234",
    salary: 125000,
    accessLevel: "Department Admin",
    licenseNumber: "KMLTTB-L-10294",
  },
  {
    name: "Daniel Kiprono",
    email: "daniel.kiprono@tassiahillhospital.co.ke",
    role: "Lab",
    department: "laboratory",
    specialty: "Medical Laboratory Scientist",
    pin: "2026",
    nationalId: "29581023",
    phone: "+254 737 012 345",
    salary: 105000,
    accessLevel: "Standard Staff",
    licenseNumber: "KMLTTB-L-29183",
  },

  // 6. Reception & Front Desk
  {
    name: "Jackline Muthoni",
    email: "jackline.muthoni@tassiahillhospital.co.ke",
    role: "Reception",
    department: "reception",
    specialty: "Front Desk & Patient Registrar",
    pin: "2026",
    nationalId: "32918402",
    phone: "+254 718 123 456",
    salary: 75000,
    accessLevel: "Standard Staff",
  },
  {
    name: "Kevin Omondi",
    email: "kevin.omondi@tassiahillhospital.co.ke",
    role: "Reception",
    department: "reception",
    specialty: "Admissions Registrar",
    pin: "2026",
    nationalId: "33819201",
    phone: "+254 729 234 567",
    salary: 70000,
    accessLevel: "Standard Staff",
  },

  // 7. Billing & Finance
  {
    name: "Agnes Nduta",
    email: "billing@tassiahillhospital.co.ke",
    role: "Billing & Accounts",
    department: "finance",
    specialty: "Hospital Billing Manager",
    pin: "2026",
    nationalId: "24918230",
    phone: "+254 731 345 678",
    salary: 130000,
    accessLevel: "Department Admin",
  },
  {
    name: "Peter Kamau",
    email: "peter.kamau@tassiahillhospital.co.ke",
    role: "Billing & Accounts",
    department: "finance",
    specialty: "Cashier & Split Billing Officer",
    pin: "2026",
    nationalId: "30291845",
    phone: "+254 713 456 789",
    salary: 80000,
    accessLevel: "Standard Staff",
  },
  {
    name: "George Mutua",
    email: "finance@tassiahillhospital.co.ke",
    role: "Finance",
    department: "finance",
    specialty: "Senior Financial Accountant",
    pin: "2026",
    nationalId: "23910294",
    phone: "+254 724 567 890",
    salary: 160000,
    accessLevel: "Department Admin",
  },

  // 8. Human Resources, Procurement & Payroll
  {
    name: "Esther Njeri",
    email: "hr@tassiahillhospital.co.ke",
    role: "HR",
    department: "administration",
    specialty: "Human Resources Specialist",
    pin: "2026",
    nationalId: "26481029",
    phone: "+254 735 678 901",
    salary: 120000,
    accessLevel: "Department Admin",
  },
  {
    name: "Samuel Barasa",
    email: "procurement@tassiahillhospital.co.ke",
    role: "Procurement",
    department: "procurement",
    specialty: "Supply Chain & LPO Officer",
    pin: "2026",
    nationalId: "28301924",
    phone: "+254 716 789 012",
    salary: 115000,
    accessLevel: "Department Admin",
  },
  {
    name: "David Kariuki",
    email: "payroll@tassiahillhospital.co.ke",
    role: "Payroll",
    department: "finance",
    specialty: "Senior Payroll Officer",
    pin: "2026",
    nationalId: "27491028",
    phone: "+254 727 890 123",
    salary: 110000,
    accessLevel: "Department Admin",
  },
  {
    name: "General Staff User",
    email: "staff.user@tassiahillhospital.co.ke",
    role: "Admin",
    department: "administration",
    specialty: "Hospital Operations Staff",
    pin: "2026",
    nationalId: "29104829",
    phone: "+254 700 000 001",
    salary: 80000,
    accessLevel: "Standard Staff",
  }
];

/**
 * Universal function to save/synchronize any user into the database
 * whenever a user is created or updated.
 *
 * Saves in both:
 * 1. `system_users` (Authentication, system login profile, access permissions)
 * 2. `employees` (Staff directory, payroll, department roster, clinical workflows)
 */
export async function saveUserToDatabase(input: UserSaveInput): Promise<{
  employeeId: string;
  userId: string;
}> {
  const cleanEmail = (input.email || "").toLowerCase().trim();
  const cleanName = (input.name || input.displayName || cleanEmail.split("@")[0] || "Hospital User").trim();
  const isSuper = isSuperAdminEmail(cleanEmail) || input.isSuperAdmin === true || input.role === "Super Admin";

  const resolvedRole: SystemRole = (input.role || input.systemRole || (isSuper ? "Super Admin" : "Doctor")) as SystemRole;
  const resolvedDept = input.department || (isSuper ? "Hospital Administration" : "medical");
  const resolvedSpecialty = input.specialty || (isSuper ? "Executive Administration" : resolvedRole);
  const resolvedAccessLevel = input.accessLevel || (isSuper ? "Super Admin" : "Standard Staff");
  const resolvedPin = input.pin || "2026";
  const now = new Date().toISOString();

  // Stable document IDs based on sanitized email or provided ID
  const emailSlug = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  const userId = input.uid || `user-${emailSlug}`;
  const employeeDocId = input.id || (isSuper ? `superadmin-${emailSlug}` : `emp-${emailSlug}`);

  // 1. Save / Merge into system_users collection
  const userRef = doc(db, "system_users", userId);
  const userPayload: any = {
    id: userId,
    uid: input.uid || userId,
    email: cleanEmail,
    name: cleanName,
    displayName: cleanName,
    role: resolvedRole,
    systemRole: resolvedRole,
    department: resolvedDept,
    specialty: resolvedSpecialty,
    accessLevel: resolvedAccessLevel,
    pin: resolvedPin,
    phone: input.phone || "",
    nationalId: input.nationalId || "",
    photoURL: input.photoURL || input.avatarUrl || "",
    avatarUrl: input.photoURL || input.avatarUrl || "",
    status: input.status || "active",
    isSuperAdmin: isSuper,
    isEmployee: input.isEmployee !== undefined ? input.isEmployee : true,
    lastLoginAt: now,
    updatedAt: now,
  };

  if (input.password) {
    userPayload.password = input.password;
  }

  // Preserve original createdAt if doc exists
  try {
    const existingUser = await getDoc(userRef);
    if (!existingUser.exists()) {
      userPayload.createdAt = input.hireDate || now;
    }
    await setDoc(userRef, userPayload, { merge: true });
  } catch (err) {
    console.warn(`[saveUserToDatabase] system_users write notice for ${cleanEmail}:`, err);
  }

  // 2. Save / Merge into employees collection
  const empRef = doc(db, "employees", employeeDocId);
  const empPayload: any = {
    id: employeeDocId,
    name: cleanName,
    email: cleanEmail,
    role: resolvedRole,
    systemRole: resolvedRole,
    department: resolvedDept,
    specialty: resolvedSpecialty,
    accessLevel: resolvedAccessLevel,
    pin: resolvedPin,
    phone: input.phone || "",
    nationalId: input.nationalId || "",
    salary: input.salary || input.basicSalary || (isSuper ? 350000 : 90000),
    basicSalary: input.basicSalary || input.salary || (isSuper ? 350000 : 90000),
    status: input.status || "active",
    hireDate: input.hireDate || now.split("T")[0],
    isSuperAdmin: isSuper,
    isEmployee: input.isEmployee !== undefined ? input.isEmployee : true,
    photoURL: input.photoURL || input.avatarUrl || "",
    avatarUrl: input.photoURL || input.avatarUrl || "",
    licenseNumber: input.licenseNumber || "",
    employeeNumber: input.employeeNumber || `EMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    updatedAt: now,
  };

  try {
    const existingEmp = await getDoc(empRef);
    if (!existingEmp.exists()) {
      empPayload.createdAt = now;
    }
    await setDoc(empRef, empPayload, { merge: true });
  } catch (err) {
    console.warn(`[saveUserToDatabase] employees write notice for ${cleanEmail}:`, err);
  }

  return { employeeId: employeeDocId, userId };
}

/**
 * Imports all repository staff and super administrators into Firestore
 * (both `employees` and `system_users` collections).
 */
export async function importStaffFromRepo(): Promise<{
  importedCount: number;
  totalSeeds: number;
}> {
  let importedCount = 0;
  const totalSeeds = REPO_STAFF_SEEDS.length;

  for (const staff of REPO_STAFF_SEEDS) {
    try {
      await saveUserToDatabase({
        name: staff.name,
        email: staff.email,
        role: staff.role,
        systemRole: staff.role,
        department: staff.department,
        specialty: staff.specialty,
        pin: staff.pin,
        nationalId: staff.nationalId,
        phone: staff.phone,
        salary: staff.salary,
        basicSalary: staff.salary,
        accessLevel: staff.accessLevel,
        licenseNumber: staff.licenseNumber,
        isSuperAdmin: staff.isSuperAdmin,
        status: "active",
      });
      importedCount++;
    } catch (err) {
      console.warn(`[importStaffFromRepo] Error importing ${staff.email}:`, err);
    }
  }

  return { importedCount, totalSeeds };
}

import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  deleteDoc
} from "firebase/firestore";
import { Employee } from "../types";

/**
 * Super Admin Master Seed Account
 * Sole account retained to allow the Super Admin to onboard and create other hospital users.
 */
export const MASTER_SUPER_ADMIN_SEED: Omit<Employee, "id"> = {
  name: "Super Admin (Urban Interior Kenya)",
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
};

export interface CollectionCounts {
  patients: number;
  employees: number;
  system_tickets: number;
  queue: number;
  invoices: number;
  medications: number;
  payroll: number;
  suppliers: number;
  procurement_orders: number;
}

export interface CleanSystemReport {
  timestamp: string;
  totalDeleted: number;
  collectionsPurged: {
    name: string;
    deletedCount: number;
  }[];
  superAdminPreserved: boolean;
}

/**
 * Clean and wipe all test and dummy data across the entire system.
 * Removes test patients, queue encounters, tickets, invoices, pharmacy stocks, payroll,
 * and purges test user accounts — leaving ONLY the master Super Admin account.
 */
export async function cleanSystemAndPurgeTestData(): Promise<CleanSystemReport> {
  const collectionsToPurge = [
    "patients",
    "queue",
    "system_tickets",
    "invoices",
    "medications",
    "payroll",
    "suppliers",
    "procurement_orders",
    "notifications",
    "lab_orders"
  ];

  const report: CleanSystemReport = {
    timestamp: new Date().toISOString(),
    totalDeleted: 0,
    collectionsPurged: [],
    superAdminPreserved: false
  };

  try {
    // 1. Purge standard data collections completely
    for (const colName of collectionsToPurge) {
      try {
        const snap = await getDocs(collection(db, colName));
        let count = 0;
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((docSnap) => {
            batch.delete(doc(db, colName, docSnap.id));
            count++;
          });
          await batch.commit();
        }
        report.collectionsPurged.push({
          name: colName,
          deletedCount: count
        });
        report.totalDeleted += count;
      } catch (err) {
        console.warn(`Error purging collection ${colName}:`, err);
        report.collectionsPurged.push({
          name: colName,
          deletedCount: 0
        });
      }
    }

    // 2. Clean employees collection: remove test accounts, keep or seed ONLY the Super Admin (urbaninteriorkenya@gmail.com)
    try {
      const empSnap = await getDocs(collection(db, "employees"));
      let empDeletedCount = 0;
      let superAdminExists = false;

      const batch = writeBatch(db);
      for (const docSnap of empSnap.docs) {
        const data = docSnap.data() as Employee;
        const email = data.email?.toLowerCase().trim();
        const isSuperAdmin = email === "urbaninteriorkenya@gmail.com" || email === "naisiaetext@gmail.com" || data.accessLevel === "Super Admin" || data.systemRole === "Super Admin";

        if (isSuperAdmin && !superAdminExists) {
          // Normalize to master super admin config
          batch.set(doc(db, "employees", docSnap.id), {
            ...data,
            name: data.name || MASTER_SUPER_ADMIN_SEED.name,
            email: data.email || "urbaninteriorkenya@gmail.com",
            pin: data.pin || "2026",
            department: "administration",
            accessLevel: "Super Admin",
            systemRole: "Super Admin",
            role: "Super Admin",
            status: "active"
          });
          superAdminExists = true;
        } else {
          // Purge test staff / duplicate user account
          batch.delete(doc(db, "employees", docSnap.id));
          empDeletedCount++;
        }
      }

      // If no super admin account was found in the database, seed it now
      if (!superAdminExists) {
        const newSuperAdminRef = doc(collection(db, "employees"));
        batch.set(newSuperAdminRef, {
          ...MASTER_SUPER_ADMIN_SEED,
          createdAt: new Date().toISOString()
        });
        superAdminExists = true;
      }

      await batch.commit();

      report.collectionsPurged.push({
        name: "employees (Test Users Purged)",
        deletedCount: empDeletedCount
      });
      report.totalDeleted += empDeletedCount;
      report.superAdminPreserved = superAdminExists;
    } catch (empErr) {
      console.error("Error cleaning employee registry:", empErr);
    }

    return report;
  } catch (error) {
    console.error("Critical error during system purge:", error);
    throw error;
  }
}

/**
 * Bootstrap Cloud Firestore with clean initial state (Super Admin only).
 * Ensures zero test dummy data is auto-seeded.
 */
export async function bootstrapCloudFirestore(): Promise<{
  seeded: boolean;
  counts: CollectionCounts;
}> {
  try {
    const counts: CollectionCounts = {
      patients: 0,
      employees: 0,
      system_tickets: 0,
      queue: 0,
      invoices: 0,
      medications: 0,
      payroll: 0,
      suppliers: 0,
      procurement_orders: 0
    };

    // Check existing staff
    const empSnap = await getDocs(collection(db, "employees"));
    counts.employees = empSnap.size;

    // Check other collections
    const [patSnap, tckSnap, qSnap, invSnap, medSnap, paySnap] = await Promise.all([
      getDocs(collection(db, "patients")),
      getDocs(collection(db, "system_tickets")),
      getDocs(collection(db, "queue")),
      getDocs(collection(db, "invoices")),
      getDocs(collection(db, "medications")),
      getDocs(collection(db, "payroll"))
    ]);

    counts.patients = patSnap.size;
    counts.system_tickets = tckSnap.size;
    counts.queue = qSnap.size;
    counts.invoices = invSnap.size;
    counts.medications = medSnap.size;
    counts.payroll = paySnap.size;

    let seeded = false;

    // If employees collection is completely empty, provision ONLY the master Super Admin
    if (counts.employees === 0) {
      console.log("[Firestore Bootstrapper] Provisioning sole Master Super Admin into clean database...");
      const batch = writeBatch(db);
      const newRef = doc(collection(db, "employees"));
      batch.set(newRef, {
        ...MASTER_SUPER_ADMIN_SEED,
        createdAt: new Date().toISOString()
      });
      await batch.commit();
      counts.employees = 1;
      seeded = true;
    }

    return { seeded, counts };
  } catch (err) {
    console.error("Error bootstrapping clean Cloud Firestore:", err);
    return {
      seeded: false,
      counts: {
        patients: 0,
        employees: 0,
        system_tickets: 0,
        queue: 0,
        invoices: 0,
        medications: 0,
        payroll: 0,
        suppliers: 0,
        procurement_orders: 0
      }
    };
  }
}

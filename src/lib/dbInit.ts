import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc
} from "firebase/firestore";
import { Employee } from "../types";
import { 
  SUPER_ADMIN_EMAILS, 
  isSuperAdminEmail, 
  MASTER_SUPER_ADMIN_SEEDS, 
  PRIMARY_SUPER_ADMIN_SEED 
} from "./superAdmins";

export const MASTER_SUPER_ADMIN_SEED = PRIMARY_SUPER_ADMIN_SEED;

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
 * and purges test user accounts — while strictly preserving the 3 Master Super Admins:
 * - moraasdorcah@gmail.com
 * - urbaninteriorkenya@gmail.com
 * - naisiaetext@gmail.com
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

    // 2. Clean employees collection: remove test accounts, ensure the 3 Master Super Admins are preserved and active
    try {
      const empSnap = await getDocs(collection(db, "employees"));
      let empDeletedCount = 0;
      const preservedEmails = new Set<string>();

      const batch = writeBatch(db);
      for (const docSnap of empSnap.docs) {
        const data = docSnap.data() as Employee;
        const email = data.email?.toLowerCase().trim();
        const isMaster = isSuperAdminEmail(email);

        if (isMaster && email && !preservedEmails.has(email)) {
          // Normalize to master super admin config
          const seedMatch = MASTER_SUPER_ADMIN_SEEDS.find(s => s.email.toLowerCase() === email) || PRIMARY_SUPER_ADMIN_SEED;
          batch.set(doc(db, "employees", docSnap.id), {
            ...data,
            name: data.name || seedMatch.name,
            email: email,
            pin: data.pin || "2026",
            department: "administration",
            accessLevel: "Super Admin",
            systemRole: "Super Admin",
            role: "Super Admin",
            status: "active"
          });
          preservedEmails.add(email);
        } else if (isMaster && email && preservedEmails.has(email)) {
          // Remove duplicate entry for same super admin
          batch.delete(doc(db, "employees", docSnap.id));
          empDeletedCount++;
        } else {
          // Purge test staff user account
          batch.delete(doc(db, "employees", docSnap.id));
          empDeletedCount++;
        }
      }

      // Seed any of the 3 Master Super Admins that are missing
      for (const seed of MASTER_SUPER_ADMIN_SEEDS) {
        if (!preservedEmails.has(seed.email.toLowerCase())) {
          const newSuperAdminRef = doc(collection(db, "employees"));
          batch.set(newSuperAdminRef, {
            ...seed,
            createdAt: new Date().toISOString()
          });
          preservedEmails.add(seed.email.toLowerCase());
        }
      }

      await batch.commit();

      report.collectionsPurged.push({
        name: "employees (Test Users Purged & 3 Super Admins Preserved)",
        deletedCount: empDeletedCount
      });
      report.totalDeleted += empDeletedCount;
      report.superAdminPreserved = preservedEmails.size > 0;
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
 * Ensures all 3 Sovereign Super Admins are created and whitelisted in Firestore
 */
export async function ensureSuperAdminsExist(): Promise<number> {
  try {
    const empSnap = await getDocs(collection(db, "employees"));
    const existingEmails = new Set(
      empSnap.docs
        .map(d => (d.data() as Employee).email?.toLowerCase().trim())
        .filter(Boolean)
    );

    let addedCount = 0;
    const batch = writeBatch(db);

    for (const seed of MASTER_SUPER_ADMIN_SEEDS) {
      if (!existingEmails.has(seed.email.toLowerCase())) {
        const newRef = doc(collection(db, "employees"));
        batch.set(newRef, {
          ...seed,
          createdAt: new Date().toISOString()
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await batch.commit();
      console.log(`[Firestore Bootstrapper] Provisioned ${addedCount} missing Master Super Admin account(s) into database.`);
    }

    return addedCount;
  } catch (err) {
    console.error("Error ensuring Super Admins exist in Firestore:", err);
    return 0;
  }
}

/**
 * Bootstrap Cloud Firestore with clean initial state (Super Admins only).
 * Ensures all 3 Top-Tier Super Admins exist and zero dummy data is auto-seeded.
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

    // Provision any missing Master Super Admins
    await ensureSuperAdminsExist();

    // Check existing staff count
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

    return { seeded: counts.employees > 0, counts };
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

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
import { uploadDrugDictionaryToFirestore } from "../services/drugInventorySync";

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
 * and purges test user accounts — while strictly preserving the 2 Sovereign Super Admins:
 * - tassiahillhospital@gmail.com (The Tassia Hill Hospital)
 * - moraasdorcah@gmail.com (Dorcah Moraa)
 */
export async function cleanSystemAndPurgeTestData(): Promise<CleanSystemReport> {
  const collectionsToPurge = [
    "patients",
    "queue",
    "encounters",
    "system_tickets",
    "invoices",
    "patient_carts",
    "medications",
    "lab_orders",
    "payroll",
    "expenses",
    "suppliers",
    "procurement_orders",
    "procurement_grns",
    "procurement_requisitions",
    "procurement_suppliers",
    "notifications",
    "internal_messages",
    "patient_transfers",
    "security_logs",
    "security_watchlists",
    "settings_audit_logs",
    "system_users",
    "beds",
    "wards",
    "ward_bed_rates",
    "procedure_tariffs"
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

    // 2. Clean employees collection: remove test accounts and any unauthorized admins, ensuring ONLY the 2 Sovereign Super Admins are preserved
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
        } else {
          // Purge test staff user account or unauthorized/obsolete admin account
          batch.delete(doc(db, "employees", docSnap.id));
          empDeletedCount++;
        }
      }

      // Seed the 2 Sovereign Super Admins if missing
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
        name: "employees (All unauthorized admins/test staff purged; 2 Sovereign Super Admins preserved)",
        deletedCount: empDeletedCount
      });
      report.totalDeleted += empDeletedCount;
      report.superAdminPreserved = preservedEmails.size === 2;
    } catch (empErr) {
      console.error("Error cleaning employee registry:", empErr);
    }

    return report;
  } catch (error) {
    console.error("Critical error during system purge:", error);
    throw error;
  }
}

const OBSOLETE_ADMIN_EMAILS = [
  "urbaninteriorkenya@gmail.com",
  "naisiaetext@gmail.com"
];

/**
 * Ensures ONLY the 2 Master Super Admins (The Tassia Hill Hospital & Dorcah Moraa) exist,
 * and actively wipes any other super admins or obsolete admin accounts from Firestore.
 */
export async function ensureSuperAdminsExist(): Promise<number> {
  try {
    const empSnap = await getDocs(collection(db, "employees"));
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();
    const toDeleteIds: string[] = [];

    for (const docSnap of empSnap.docs) {
      const data = docSnap.data() as Employee;
      const email = data.email?.toLowerCase().trim() || "";
      const nationalId = data.nationalId?.trim();
      const roleStr = (data.role || "").toLowerCase();
      const accessStr = (data.accessLevel || "").toLowerCase();
      const sysRoleStr = (data.systemRole || "").toLowerCase();

      // Wipe obsolete admins
      if (OBSOLETE_ADMIN_EMAILS.includes(email)) {
        toDeleteIds.push(docSnap.id);
        continue;
      }

      // Wipe any other admin that is NOT in SUPER_ADMIN_EMAILS
      const isSuperAdminAccount = roleStr.includes("super admin") || accessStr.includes("super admin") || sysRoleStr.includes("super admin");
      if (isSuperAdminAccount && !isSuperAdminEmail(email)) {
        toDeleteIds.push(docSnap.id);
        continue;
      }

      // Deduplicate valid super admins or duplicate employees
      if (email && seenEmails.has(email)) {
        toDeleteIds.push(docSnap.id);
      } else if (nationalId && seenIds.has(nationalId)) {
        toDeleteIds.push(docSnap.id);
      } else {
        if (email) seenEmails.add(email);
        if (nationalId) seenIds.add(nationalId);
      }
    }

    let addedCount = 0;
    const batch = writeBatch(db);

    // Prune obsolete admins and redundant duplicates
    for (const delId of toDeleteIds) {
      batch.delete(doc(db, "employees", delId));
    }

    // Provision the 2 Sovereign Super Admins if not present
    for (const seed of MASTER_SUPER_ADMIN_SEEDS) {
      if (!seenEmails.has(seed.email.toLowerCase())) {
        const newRef = doc(collection(db, "employees"));
        batch.set(newRef, {
          ...seed,
          createdAt: new Date().toISOString()
        });
        seenEmails.add(seed.email.toLowerCase());
        addedCount++;
      }
    }

    if (toDeleteIds.length > 0 || addedCount > 0) {
      await batch.commit();
      console.log(`[Firestore Bootstrapper] Purged ${toDeleteIds.length} obsolete/unauthorized admin record(s) and ensured the 2 Sovereign Super Admins are active.`);
    }

    // Also purge obsolete admins from system_users collection if any exist
    try {
      const usersSnap = await getDocs(collection(db, "system_users"));
      if (!usersSnap.empty) {
        const userBatch = writeBatch(db);
        let userPurged = 0;
        usersSnap.docs.forEach((uDoc) => {
          const uData = uDoc.data();
          const uEmail = (uData.email || "").toLowerCase().trim();
          const isObs = OBSOLETE_ADMIN_EMAILS.includes(uEmail);
          const isUnauthAdmin =
            (uData.role === "Super Admin" || uData.accessLevel === "Super Admin") &&
            !isSuperAdminEmail(uEmail);
          if (isObs || isUnauthAdmin) {
            userBatch.delete(uDoc.ref);
            userPurged++;
          }
        });
        if (userPurged > 0) {
          await userBatch.commit();
          console.log(`[Firestore Bootstrapper] Purged ${userPurged} user accounts from system_users.`);
        }
      }
    } catch {
      // Ignored if collection is empty or not queried
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

    // Auto-seed drug dictionary if medication catalogue is empty or minimal
    if (counts.medications < 20) {
      console.log(`[Firestore Bootstrapper] Medications catalogue has ${counts.medications} items. Uploading full drug reference dictionary...`);
      try {
        const syncResult = await uploadDrugDictionaryToFirestore();
        console.log(`[Firestore Bootstrapper] Drug dictionary synced: ${syncResult.message}`);
        const updatedMedSnap = await getDocs(collection(db, "medications"));
        counts.medications = updatedMedSnap.size;
      } catch (err) {
        console.error("Failed to auto-seed drug reference dictionary:", err);
      }
    }

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

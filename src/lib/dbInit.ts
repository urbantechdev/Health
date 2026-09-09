import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { MASTER_SUPER_ADMIN_SEEDS, isSuperAdminEmail } from "./superAdmins";

export interface CollectionCounts {
  [collectionName: string]: number;
}

export interface CleanSystemReport {
  totalDeleted: number;
  collectionCounts: CollectionCounts;
  retainedAdmins: string[];
}

export async function ensureSuperAdminsExist(): Promise<boolean> {
  let seeded = false;
  try {
    for (const admin of MASTER_SUPER_ADMIN_SEEDS) {
      const docId = `superadmin-${admin.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const ref = doc(db, "employees", docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(
          ref,
          {
            id: docId,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            department: admin.department,
            status: "active",
            createdAt: new Date().toISOString(),
            isSuperAdmin: true,
          },
          { merge: true }
        );
        seeded = true;
      }
    }
  } catch (err) {
    console.warn("ensureSuperAdminsExist notice:", err);
  }
  return seeded;
}

const APP_COLLECTIONS = [
  "patients",
  "queue_tickets",
  "clinical_encounters",
  "invoices",
  "medications",
  "lab_requests",
  "lab_results",
  "chat_messages",
  "chat_tickets",
  "transfers",
  "purchase_orders",
  "purchase_requisitions",
  "suppliers",
  "security_logs",
  "audit_logs",
  "settings_audit_logs",
  "push_subscriptions",
];

export async function bootstrapCloudFirestore(): Promise<{ counts: CollectionCounts; seeded: boolean }> {
  const counts: CollectionCounts = {};
  let seeded = false;
  try {
    seeded = await ensureSuperAdminsExist();
    for (const colName of APP_COLLECTIONS) {
      try {
        const snap = await getDocs(collection(db, colName));
        counts[colName] = snap.size;
      } catch {
        counts[colName] = 0;
      }
    }
    const empSnap = await getDocs(collection(db, "employees"));
    counts["employees"] = empSnap.size;
  } catch (err) {
    console.warn("bootstrapCloudFirestore notice:", err);
  }
  return { counts, seeded };
}

export async function cleanSystemAndPurgeTestData(): Promise<CleanSystemReport> {
  const collectionCounts: CollectionCounts = {};
  let totalDeleted = 0;
  const retainedAdmins: string[] = [];

  for (const colName of APP_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      let colDeleted = 0;
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
        colDeleted++;
        totalDeleted++;
      }
      collectionCounts[colName] = colDeleted;
    } catch {
      collectionCounts[colName] = 0;
    }
  }

  // Handle employees - preserve super admins
  try {
    const empSnap = await getDocs(collection(db, "employees"));
    let empDeleted = 0;
    for (const d of empSnap.docs) {
      const data = d.data();
      if (isSuperAdminEmail(data.email) || data.isSuperAdmin) {
        retainedAdmins.push(data.email || data.name);
      } else {
        await deleteDoc(d.ref);
        empDeleted++;
        totalDeleted++;
      }
    }
    collectionCounts["employees"] = empDeleted;
  } catch {
    collectionCounts["employees"] = 0;
  }

  await ensureSuperAdminsExist();

  return {
    totalDeleted,
    collectionCounts,
    retainedAdmins,
  };
}

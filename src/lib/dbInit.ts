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
    const empSnap = await getDocs(collection(db, "employees"));
    const existingEmails = new Set(empSnap.docs.map(d => d.data().email?.toLowerCase().trim()));

    for (const admin of MASTER_SUPER_ADMIN_SEEDS) {
      const cleanEmail = admin.email.toLowerCase().trim();
      if (!existingEmails.has(cleanEmail)) {
        const docId = `superadmin-${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const ref = doc(db, "employees", docId);
        await setDoc(
          ref,
          {
            id: docId,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            systemRole: admin.role,
            department: admin.department,
            employmentType: admin.adminType === "developer" ? "developer" : "employee",
            isEmployee: admin.adminType !== "developer",
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
  "invoices",
  "queue",
  "queue_tickets",
  "system_tickets",
  "encounters",
  "clinical_encounters",
  "patient_carts",
  "patient_transfers",
  "payroll",
  "expenses",
  "cashier_shifts",
  "payment_vouchers",
  "supplier_invoices",
  "debtor_claims",
  "remittance_batches",
  "general_ledger",
  "goods_received",
  "procurement_grns",
  "procurement_orders",
  "procurement_requisitions",
  "purchase_orders",
  "purchase_requisitions",
  "lab_requests",
  "lab_results",
  "chat_messages",
  "chat_tickets",
  "transfers",
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
        // If encounters, also clean subcollections
        if (colName === "encounters") {
          const subcols = ["bill_items", "lab_requests", "prescriptions", "nursing_notes", "vitals"];
          for (const s of subcols) {
            try {
              const subSnap = await getDocs(collection(db, "encounters", d.id, s));
              for (const subDoc of subSnap.docs) {
                await deleteDoc(subDoc.ref);
              }
            } catch {
              // ignore
            }
          }
        }
        await deleteDoc(d.ref);
        colDeleted++;
        totalDeleted++;
      }
      collectionCounts[colName] = colDeleted;
    } catch {
      collectionCounts[colName] = 0;
    }
  }

  // Handle employees - preserve only legitimate Super Admins (Moraa: Developer Admin, Halima: Hospital Admin)
  try {
    const empSnap = await getDocs(collection(db, "employees"));
    let empDeleted = 0;
    for (const d of empSnap.docs) {
      const data = d.data();
      const email = data.email?.toLowerCase().trim();
      const name = (data.name || "").toLowerCase().trim();
      
      // Specifically remove Colins Gaucho or old developer admins
      const isColinsGaucho = name.includes("gaucho") || email?.includes("gaucho");
      const isAuthorizedSuperAdmin = isSuperAdminEmail(email) && !isColinsGaucho;

      if (isAuthorizedSuperAdmin) {
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

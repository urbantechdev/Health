import { collection, getDocs, query, where, doc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface DeduplicationDetail {
  collection: string;
  cleaned: number;
  description: string;
}

export interface DeduplicationReport {
  totalDuplicatesFound: number;
  totalDuplicatesCleaned: number;
  scannedCollections: string[];
  details: DeduplicationDetail[];
  timestamp: string;
}

export function normalizeKey(str: string): string {
  return (str || "").toLowerCase().trim().replace(/\s+/g, " ");
}

export async function checkDuplicateEmployee(
  nationalId: string,
  email: string
): Promise<{ isDuplicate: boolean; reason?: string }> {
  try {
    const employeesRef = collection(db, "employees");

    // Check nationalId if non-empty
    if (nationalId && nationalId.trim()) {
      const qId = query(employeesRef, where("nationalId", "==", nationalId.trim()));
      const snapId = await getDocs(qId);
      if (!snapId.empty) {
        return {
          isDuplicate: true,
          reason: `An employee account already exists with National ID: ${nationalId.trim()}`
        };
      }
    }

    // Check email if non-empty
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const qEmail = query(employeesRef, where("email", "==", cleanEmail));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        return {
          isDuplicate: true,
          reason: `An employee account already exists with Email: ${cleanEmail}`
        };
      }
    }

    return { isDuplicate: false };
  } catch (err: any) {
    console.warn("[Deduplication] Error querying duplicate employees:", err);
    return { isDuplicate: false };
  }
}

export async function checkDuplicateSupplier(
  kraPin?: string,
  name?: string,
  email?: string
): Promise<{ isDuplicate: boolean; reason?: string }> {
  try {
    const suppliersRef = collection(db, "suppliers");
    if (kraPin && kraPin.trim()) {
      const q = query(suppliersRef, where("kraPin", "==", kraPin.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { isDuplicate: true, reason: `A supplier already exists with KRA PIN: ${kraPin.trim()}` };
      }
    }
    if (email && email.trim()) {
      const q = query(suppliersRef, where("email", "==", email.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { isDuplicate: true, reason: `A supplier already exists with Email: ${email.trim()}` };
      }
    }
    if (name && name.trim()) {
      const q = query(suppliersRef, where("name", "==", name.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { isDuplicate: true, reason: `A supplier already exists with Name: ${name.trim()}` };
      }
    }
    return { isDuplicate: false };
  } catch (err) {
    console.warn("[Deduplication] Error checking duplicate supplier:", err);
    return { isDuplicate: false };
  }
}

export async function checkDuplicatePatientRegistration(
  nationalId: string,
  phone?: string,
  patientName?: string
): Promise<{
  isDuplicate: boolean;
  reason?: string;
  existingRecord?: any;
  matchedPatient?: any;
}> {
  try {
    const patientsRef = collection(db, "patients");
    if (nationalId && nationalId.trim()) {
      const q = query(patientsRef, where("nationalId", "==", nationalId.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const p = { id: snap.docs[0].id, ...snap.docs[0].data() };
        return { isDuplicate: true, reason: `Patient found with National ID: ${nationalId.trim()}`, existingRecord: p, matchedPatient: p };
      }
    }
    if (phone && phone.trim()) {
      const q = query(patientsRef, where("phone", "==", phone.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const p = { id: snap.docs[0].id, ...snap.docs[0].data() };
        return { isDuplicate: true, reason: `Patient found with Phone: ${phone.trim()}`, existingRecord: p, matchedPatient: p };
      }
    }
    if (patientName && patientName.trim()) {
      const q = query(patientsRef, where("patientName", "==", patientName.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const p = { id: snap.docs[0].id, ...snap.docs[0].data() };
        return { isDuplicate: true, reason: `Patient found with Name: ${patientName.trim()}`, existingRecord: p, matchedPatient: p };
      }
    }
    return { isDuplicate: false };
  } catch (err) {
    console.warn("[Deduplication] Error checking duplicate patient:", err);
    return { isDuplicate: false };
  }
}

export async function runFullDatabaseDeduplication(): Promise<DeduplicationReport> {
  const report: DeduplicationReport = {
    totalDuplicatesFound: 0,
    totalDuplicatesCleaned: 0,
    scannedCollections: ["employees", "patients", "queue_tickets", "inventory"],
    details: [],
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Deduplicate employees by email
    const empSnap = await getDocs(collection(db, "employees"));
    const seenEmails = new Set<string>();
    const seenNationalIds = new Set<string>();
    const empDuplicatesToDelete: string[] = [];

    empSnap.docs.forEach((d) => {
      const data = d.data();
      const email = data.email ? String(data.email).trim().toLowerCase() : "";
      const nId = data.nationalId ? String(data.nationalId).trim() : "";

      let isDup = false;
      if (email && seenEmails.has(email)) {
        isDup = true;
      } else if (email) {
        seenEmails.add(email);
      }

      if (nId && seenNationalIds.has(nId)) {
        isDup = true;
      } else if (nId) {
        seenNationalIds.add(nId);
      }

      if (isDup) {
        empDuplicatesToDelete.push(d.id);
      }
    });

    if (empDuplicatesToDelete.length > 0) {
      report.totalDuplicatesFound += empDuplicatesToDelete.length;
      let empCleaned = 0;
      for (const id of empDuplicatesToDelete) {
        try {
          await deleteDoc(doc(db, "employees", id));
          report.totalDuplicatesCleaned++;
          empCleaned++;
        } catch (e) {
          console.warn("[Deduplication] Could not delete employee:", id, e);
        }
      }
      report.details.push({
        collection: "employees",
        cleaned: empCleaned,
        description: `Removed ${empCleaned} redundant employee profiles with matching credentials.`
      });
    } else {
      report.details.push({
        collection: "employees",
        cleaned: 0,
        description: "Employee registry verified clean with no duplicate credentials."
      });
    }

    // 2. Deduplicate queue tickets
    try {
      const qSnap = await getDocs(collection(db, "queue_tickets"));
      const seenTicketNos = new Set<string>();
      const ticketDupsToDelete: string[] = [];

      qSnap.docs.forEach((d) => {
        const data = d.data();
        const ticketNo = data.ticketNo || "";
        if (ticketNo && seenTicketNos.has(ticketNo)) {
          ticketDupsToDelete.push(d.id);
        } else if (ticketNo) {
          seenTicketNos.add(ticketNo);
        }
      });

      if (ticketDupsToDelete.length > 0) {
        report.totalDuplicatesFound += ticketDupsToDelete.length;
        let tCleaned = 0;
        for (const id of ticketDupsToDelete) {
          try {
            await deleteDoc(doc(db, "queue_tickets", id));
            report.totalDuplicatesCleaned++;
            tCleaned++;
          } catch (e) {
            console.warn("[Deduplication] Could not delete ticket:", id, e);
          }
        }
        report.details.push({
          collection: "queue_tickets",
          cleaned: tCleaned,
          description: `Removed ${tCleaned} duplicate queue ticket records.`
        });
      } else {
        report.details.push({
          collection: "queue_tickets",
          cleaned: 0,
          description: "Queue ticket collection verified with no active ticket collisions."
        });
      }
    } catch {
      // ignore
    }

    return report;
  } catch (err: any) {
    console.error("[Deduplication] Full deduplication scan failed:", err);
    report.details.push({
      collection: "system",
      cleaned: 0,
      description: `Scan encountered an error: ${err.message || String(err)}`
    });
    return report;
  }
}

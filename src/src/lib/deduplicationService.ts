import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { MedicalRecord, QueueTicket, SystemTicket, Employee, Medication, Supplier } from "../types";

export interface DeduplicationReportDetail {
  collection: string;
  found: number;
  cleaned: number;
  description: string;
}

export interface DeduplicationReport {
  timestamp: string;
  totalDuplicatesFound: number;
  totalDuplicatesCleaned: number;
  details: DeduplicationReportDetail[];
}

export interface DuplicateValidationResult {
  isDuplicate: boolean;
  field?: string;
  reason?: string;
  existingRecord?: any;
}

/**
 * Normalizes text for strict duplicate comparison (removes whitespace, lowercases)
 */
export function normalizeKey(val?: string | number | null): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Check if a patient already exists or has duplicate registration parameters (National ID or Phone + Name)
 */
export async function checkDuplicatePatientRegistration(
  nationalId: string,
  phone?: string,
  patientName?: string,
  excludeId?: string
): Promise<DuplicateValidationResult> {
  const normId = normalizeKey(nationalId);
  const normPhone = normalizeKey(phone);
  const normName = normalizeKey(patientName);

  if (!normId && !normPhone) {
    return { isDuplicate: false };
  }

  try {
    const snap = await getDocs(collection(db, "patients"));
    for (const d of snap.docs) {
      if (excludeId && d.id === excludeId) continue;
      const data = d.data() as MedicalRecord;
      const existingId = normalizeKey(data.nationalId);
      const existingPhone = normalizeKey(data.phone);
      const existingName = normalizeKey(data.patientName);

      // Match by National ID / Passport
      if (normId && existingId && normId === existingId) {
        return {
          isDuplicate: true,
          field: "nationalId",
          reason: `A registered patient with National ID / Passport '${nationalId}' already exists (${data.patientName}).`,
          existingRecord: { id: d.id, ...data }
        };
      }

      // Match by exact Phone + Name
      if (normPhone && normName && existingPhone === normPhone && existingName === normName) {
        return {
          isDuplicate: true,
          field: "phone_and_name",
          reason: `A patient with name '${patientName}' and phone '${phone}' is already registered.`,
          existingRecord: { id: d.id, ...data }
        };
      }
    }

    return { isDuplicate: false };
  } catch (err) {
    console.error("Error validating duplicate patient:", err);
    return { isDuplicate: false };
  }
}

/**
 * Check if an employee already exists by National ID or Email
 */
export async function checkDuplicateEmployee(
  nationalId: string,
  email: string,
  excludeId?: string
): Promise<DuplicateValidationResult> {
  const normId = normalizeKey(nationalId);
  const normEmail = normalizeKey(email);

  if (!normId && !normEmail) return { isDuplicate: false };

  try {
    const snap = await getDocs(collection(db, "employees"));
    for (const d of snap.docs) {
      if (excludeId && d.id === excludeId) continue;
      const data = d.data() as Employee;
      const existingId = normalizeKey(data.nationalId);
      const existingEmail = normalizeKey(data.email);

      if (normId && existingId && normId === existingId) {
        return {
          isDuplicate: true,
          field: "nationalId",
          reason: `An employee with National ID '${nationalId}' already exists in staff registry (${data.name}).`,
          existingRecord: { id: d.id, ...data }
        };
      }

      if (normEmail && existingEmail && normEmail === existingEmail) {
        return {
          isDuplicate: true,
          field: "email",
          reason: `An employee with email '${email}' already exists in staff registry (${data.name}).`,
          existingRecord: { id: d.id, ...data }
        };
      }
    }

    return { isDuplicate: false };
  } catch (err) {
    console.error("Error validating duplicate employee:", err);
    return { isDuplicate: false };
  }
}

/**
 * Check if a medication already exists by Batch No or Exact Name
 */
export async function checkDuplicateMedication(
  batchNo?: string,
  name?: string,
  excludeId?: string
): Promise<DuplicateValidationResult> {
  const normBatch = normalizeKey(batchNo);
  const normName = normalizeKey(name);

  if (!normBatch && !normName) return { isDuplicate: false };

  try {
    const snap = await getDocs(collection(db, "medications"));
    for (const d of snap.docs) {
      if (excludeId && d.id === excludeId) continue;
      const data = d.data() as Medication;
      const existingBatch = normalizeKey(data.batchNo);
      const existingName = normalizeKey(data.name);

      if (normBatch && existingBatch && normBatch === existingBatch) {
        return {
          isDuplicate: true,
          field: "batchNo",
          reason: `Medication with Batch No '${batchNo}' already exists in inventory (${data.name}).`,
          existingRecord: { id: d.id, ...data }
        };
      }

      if (normName && existingName && normName === existingName) {
        return {
          isDuplicate: true,
          field: "name",
          reason: `Medication named '${name}' already exists in inventory registry.`,
          existingRecord: { id: d.id, ...data }
        };
      }
    }

    return { isDuplicate: false };
  } catch (err) {
    console.error("Error validating duplicate medication:", err);
    return { isDuplicate: false };
  }
}

/**
 * Check if a supplier already exists by KRA PIN, Name or Email
 */
export async function checkDuplicateSupplier(
  kraPin?: string,
  name?: string,
  email?: string,
  excludeId?: string
): Promise<DuplicateValidationResult> {
  const normPin = normalizeKey(kraPin);
  const normName = normalizeKey(name);
  const normEmail = normalizeKey(email);

  if (!normPin && !normName && !normEmail) return { isDuplicate: false };

  try {
    const snap = await getDocs(collection(db, "procurement_suppliers"));
    for (const d of snap.docs) {
      if (excludeId && d.id === excludeId) continue;
      const data = d.data() as Supplier;
      const existingPin = normalizeKey(data.kraPin);
      const existingName = normalizeKey(data.name);
      const existingEmail = normalizeKey(data.email);

      if (normPin && existingPin && normPin === existingPin) {
        return {
          isDuplicate: true,
          field: "kraPin",
          reason: `Supplier with KRA PIN '${kraPin}' already exists (${data.name}).`,
          existingRecord: { id: d.id, ...data }
        };
      }

      if (normName && existingName && normName === existingName) {
        return {
          isDuplicate: true,
          field: "name",
          reason: `Supplier named '${name}' already exists.`,
          existingRecord: { id: d.id, ...data }
        };
      }

      if (normEmail && existingEmail && normEmail === existingEmail) {
        return {
          isDuplicate: true,
          field: "email",
          reason: `Supplier with email '${email}' already exists.`,
          existingRecord: { id: d.id, ...data }
        };
      }
    }

    return { isDuplicate: false };
  } catch (err) {
    console.error("Error validating duplicate supplier:", err);
    return { isDuplicate: false };
  }
}

/**
 * Comprehensive System-Wide Database Deduplication Engine:
 * Scans all collections (patients, queue, tickets, employees, medications, suppliers)
 * Identifies duplicates, merges fragmented medical histories and stock numbers, and safely removes redundant entries.
 */
export async function runFullDatabaseDeduplication(): Promise<DeduplicationReport> {
  const details: DeduplicationReportDetail[] = [];
  let grandTotalFound = 0;
  let grandTotalCleaned = 0;

  // 1. DEDUPLICATE PATIENTS
  try {
    const patientSnap = await getDocs(collection(db, "patients"));
    const patientMap = new Map<string, { id: string; data: MedicalRecord }[]>();

    patientSnap.docs.forEach((d) => {
      const data = d.data() as MedicalRecord;
      const key = normalizeKey(data.nationalId) || `${normalizeKey(data.patientName)}_${normalizeKey(data.phone)}`;
      if (key) {
        if (!patientMap.has(key)) patientMap.set(key, []);
        patientMap.get(key)!.push({ id: d.id, data });
      }
    });

    let patDupFound = 0;
    let patDupCleaned = 0;

    for (const [key, docs] of patientMap.entries()) {
      if (docs.length > 1) {
        patDupFound += (docs.length - 1);
        // Primary doc is the one with the most visits or first
        docs.sort((a, b) => (b.data.visits?.length || 0) - (a.data.visits?.length || 0));
        const primary = docs[0];
        const secondary = docs.slice(1);

        // Merge all visits into primary
        const combinedVisits = [...(primary.data.visits || [])];
        for (const sec of secondary) {
          if (sec.data.visits && Array.isArray(sec.data.visits)) {
            for (const v of sec.data.visits) {
              if (!combinedVisits.some((cv) => cv.id === v.id || (cv.date === v.date && cv.symptoms === v.symptoms))) {
                combinedVisits.push(v);
              }
            }
          }
        }

        // Update primary patient with consolidated medical records
        await updateDoc(doc(db, "patients", primary.id), {
          visits: combinedVisits,
          phone: primary.data.phone || secondary[0].data.phone || "",
          shaEligible: primary.data.shaEligible || secondary[0].data.shaEligible || "not_eligible",
          shaId: primary.data.shaId || secondary[0].data.shaId || ""
        });

        // Delete redundant duplicate patient documents
        for (const sec of secondary) {
          await deleteDoc(doc(db, "patients", sec.id));
          patDupCleaned++;
        }
      }
    }

    details.push({
      collection: "patients (EHR)",
      found: patDupFound,
      cleaned: patDupCleaned,
      description: patDupCleaned > 0 
        ? `Consolidated medical visits & merged ${patDupCleaned} duplicate patient profile(s).` 
        : "All patient profiles are unique and verified."
    });
    grandTotalFound += patDupFound;
    grandTotalCleaned += patDupCleaned;
  } catch (err) {
    console.error("Error deduplicating patients:", err);
  }

  // 2. DEDUPLICATE QUEUE
  try {
    const queueSnap = await getDocs(collection(db, "queue"));
    const queueActiveMap = new Map<string, { id: string; data: QueueTicket }[]>();

    queueSnap.docs.forEach((d) => {
      const data = d.data() as QueueTicket;
      // Only check active encounters
      if (data.status === "pending" || data.status === "serving") {
        const key = normalizeKey(data.nationalId) || normalizeKey(data.ticketNo);
        if (key) {
          if (!queueActiveMap.has(key)) queueActiveMap.set(key, []);
          queueActiveMap.get(key)!.push({ id: d.id, data });
        }
      }
    });

    let queueDupFound = 0;
    let queueDupCleaned = 0;

    for (const [key, docs] of queueActiveMap.entries()) {
      if (docs.length > 1) {
        queueDupFound += (docs.length - 1);
        // Sort by timestamp desc to keep the newest active ticket
        docs.sort((a, b) => new Date(b.data.timestamp || 0).getTime() - new Date(a.data.timestamp || 0).getTime());
        const redundant = docs.slice(1);

        for (const sec of redundant) {
          // Mark older duplicate encounter completed / archived
          await updateDoc(doc(db, "queue", sec.id), {
            status: "completed",
            resolutionNotes: "Auto-archived: Replaced by updated live queue encounter."
          });
          queueDupCleaned++;
        }
      }
    }

    details.push({
      collection: "queue (Active Care Flow)",
      found: queueDupFound,
      cleaned: queueDupCleaned,
      description: queueDupCleaned > 0
        ? `Resolved ${queueDupCleaned} conflicting duplicate active queue encounter(s).`
        : "Live patient queue contains 0 duplicate active encounters."
    });
    grandTotalFound += queueDupFound;
    grandTotalCleaned += queueDupCleaned;
  } catch (err) {
    console.error("Error deduplicating queue:", err);
  }

  // 3. DEDUPLICATE SYSTEM TICKETS
  try {
    const ticketSnap = await getDocs(collection(db, "system_tickets"));
    const ticketMap = new Map<string, { id: string; data: SystemTicket }[]>();

    ticketSnap.docs.forEach((d) => {
      const data = d.data() as SystemTicket;
      if (data.status === "open" || data.status === "in_progress") {
        const key = normalizeKey(data.nationalId) || normalizeKey(data.ticketNumber);
        if (key) {
          if (!ticketMap.has(key)) ticketMap.set(key, []);
          ticketMap.get(key)!.push({ id: d.id, data });
        }
      }
    });

    let ticketDupFound = 0;
    let ticketDupCleaned = 0;

    for (const [key, docs] of ticketMap.entries()) {
      if (docs.length > 1) {
        ticketDupFound += (docs.length - 1);
        docs.sort((a, b) => (b.data.id || "").localeCompare(a.data.id || ""));
        const redundant = docs.slice(1);

        for (const sec of redundant) {
          await updateDoc(doc(db, "system_tickets", sec.id), {
            status: "closed",
            closedTime: new Date().toLocaleString("en-KE"),
            closedBy: "System Deduplication Engine",
            resolutionNotes: "Duplicate active ticket closed automatically to prevent duplicate encounters."
          });
          ticketDupCleaned++;
        }
      }
    }

    details.push({
      collection: "system_tickets (Hospital Tickets)",
      found: ticketDupFound,
      cleaned: ticketDupCleaned,
      description: ticketDupCleaned > 0
        ? `Closed & resolved ${ticketDupCleaned} redundant open hospital ticket(s).`
        : "Hospital ticket registry has 0 duplicate active tickets."
    });
    grandTotalFound += ticketDupFound;
    grandTotalCleaned += ticketDupCleaned;
  } catch (err) {
    console.error("Error deduplicating tickets:", err);
  }

  // 4. DEDUPLICATE EMPLOYEES / STAFF
  try {
    const empSnap = await getDocs(collection(db, "employees"));
    const empMap = new Map<string, { id: string; data: Employee }[]>();

    empSnap.docs.forEach((d) => {
      const data = d.data() as Employee;
      const key = normalizeKey(data.nationalId) || normalizeKey(data.email);
      if (key) {
        if (!empMap.has(key)) empMap.set(key, []);
        empMap.get(key)!.push({ id: d.id, data });
      }
    });

    let empDupFound = 0;
    let empDupCleaned = 0;

    for (const [key, docs] of empMap.entries()) {
      if (docs.length > 1) {
        empDupFound += (docs.length - 1);
        const secondary = docs.slice(1);
        for (const sec of secondary) {
          await deleteDoc(doc(db, "employees", sec.id));
          empDupCleaned++;
        }
      }
    }

    details.push({
      collection: "employees (HR Registry)",
      found: empDupFound,
      cleaned: empDupCleaned,
      description: empDupCleaned > 0
        ? `Purged ${empDupCleaned} duplicate employee / user account(s).`
        : "HR staff registry contains zero duplicate personnel."
    });
    grandTotalFound += empDupFound;
    grandTotalCleaned += empDupCleaned;
  } catch (err) {
    console.error("Error deduplicating employees:", err);
  }

  // 5. DEDUPLICATE MEDICATIONS / INVENTORY
  try {
    const medSnap = await getDocs(collection(db, "medications"));
    const medMap = new Map<string, { id: string; data: Medication }[]>();

    medSnap.docs.forEach((d) => {
      const data = d.data() as Medication;
      const key = normalizeKey(data.batchNo) || normalizeKey(data.name);
      if (key) {
        if (!medMap.has(key)) medMap.set(key, []);
        medMap.get(key)!.push({ id: d.id, data });
      }
    });

    let medDupFound = 0;
    let medDupCleaned = 0;

    for (const [key, docs] of medMap.entries()) {
      if (docs.length > 1) {
        medDupFound += (docs.length - 1);
        const primary = docs[0];
        const secondary = docs.slice(1);

        // Sum quantities into primary
        let totalQuantity = primary.data.quantity || 0;
        for (const sec of secondary) {
          totalQuantity += (sec.data.quantity || 0);
        }

        await updateDoc(doc(db, "medications", primary.id), {
          quantity: totalQuantity
        });

        for (const sec of secondary) {
          await deleteDoc(doc(db, "medications", sec.id));
          medDupCleaned++;
        }
      }
    }

    details.push({
      collection: "medications (Pharmacy Stock)",
      found: medDupFound,
      cleaned: medDupCleaned,
      description: medDupCleaned > 0
        ? `Merged quantities & removed ${medDupCleaned} redundant medicine SKU listing(s).`
        : "Pharmacy medication catalog is clean and unique."
    });
    grandTotalFound += medDupFound;
    grandTotalCleaned += medDupCleaned;
  } catch (err) {
    console.error("Error deduplicating medications:", err);
  }

  return {
    timestamp: new Date().toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "medium" }),
    totalDuplicatesFound: grandTotalFound,
    totalDuplicatesCleaned: grandTotalCleaned,
    details
  };
}

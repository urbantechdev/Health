import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { MedicalRecord, ClinicalVisit, QueueTicket, SystemTicket, PrescriptionItem, Invoice } from "../types";

/**
 * Universal Patient Normalizer & Database Auto-Sync Engine
 * Ensures patient data entered from ANY department (Reception, Doctor, Lab, Pharmacy, Billing, Queue, Tickets)
 * is immediately unified, persisted to Firestore, and instantly visible across the entire hospital system.
 */

// Helper to normalize strings for comparison
export const normalizeString = (str?: string | null): string => {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
};

// Helper to clean phone numbers (e.g. 0712345678, +254712345678, 254712345678 -> 0712345678)
export const normalizePhone = (phone?: string | null): string => {
  if (!phone) return "";
  let p = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (p.startsWith("+254")) {
    p = "0" + p.slice(4);
  } else if (p.startsWith("254") && p.length === 12) {
    p = "0" + p.slice(3);
  }
  return p;
};

/**
 * High-precision patient finder that matches across multiple identification keys:
 * 1. Firestore Document ID
 * 2. National ID / Passport No
 * 3. Phone Number
 * 4. Exact or Normalized Patient Name
 */
export const findUnifiedPatient = (
  searchKey: string,
  patients: MedicalRecord[]
): MedicalRecord | null => {
  if (!searchKey || !patients || patients.length === 0) return null;
  const cleanKey = normalizeString(searchKey);
  const cleanPhoneKey = normalizePhone(searchKey);

  // 1. Direct ID match
  const byId = patients.find((p) => p.id === searchKey || p.id === cleanKey);
  if (byId) return byId;

  // 2. National ID match
  const byNationalId = patients.find(
    (p) => normalizeString(p.nationalId) === cleanKey && cleanKey.length >= 3
  );
  if (byNationalId) return byNationalId;

  // 3. Phone Number match
  if (cleanPhoneKey.length >= 9) {
    const byPhone = patients.find((p) => normalizePhone(p.phone) === cleanPhoneKey);
    if (byPhone) return byPhone;
  }

  // 4. Normalized Patient Name match
  const byName = patients.find(
    (p) => normalizeString(p.patientName) === cleanKey
  );
  if (byName) return byName;

  // 5. Partial Name match (if length >= 4)
  if (cleanKey.length >= 4) {
    const byPartialName = patients.find(
      (p) => normalizeString(p.patientName).includes(cleanKey) || cleanKey.includes(normalizeString(p.patientName))
    );
    if (byPartialName) return byPartialName;
  }

  return null;
};

/**
 * Universal Patient Upsert: Creates or updates the Master Patient record in Firestore.
 * Automatically called whenever data is entered from ANY station in the hospital.
 */
export interface UnifiedPatientInput {
  id?: string;
  patientName: string;
  nationalId: string;
  phone?: string;
  age?: number | string;
  gender?: string;
  bloodType?: string;
  shaEligible?: "eligible" | "not_eligible" | "unchecked";
  shaId?: string;
  vitals?: {
    temp?: string;
    bp?: string;
    pulse?: string;
    weight?: string;
  };
  symptoms?: string;
  diagnosis?: string;
  allergies?: string;
  chronicConditions?: string;
  prescriptions?: PrescriptionItem[];
  referrals?: {
    id: string;
    department: "laboratory" | "radiology" | "labour_room" | "gyna" | string;
    testName: string;
    notes: string;
    status: "pending" | "completed";
    results?: string;
  }[];
  currentDepartment?: string;
  activeTicketNo?: string;
  sourceStation?: string;
}

export const upsertUnifiedPatientRecord = async (
  input: UnifiedPatientInput
): Promise<{ success: boolean; patientId: string; isNew: boolean }> => {
  try {
    const cleanName = (input.patientName || "").trim();
    const cleanNationalId = (input.nationalId || "").trim();
    const cleanPhone = (input.phone || "").trim();
    const numericAge = typeof input.age === "string" ? parseInt(input.age) || 30 : input.age || 30;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split("T")[0];

    if (!cleanName) {
      throw new Error("Patient name is required for auto-sync record creation.");
    }

    // 1. Search for existing record in Firestore
    let existingDocId: string | null = null;
    let existingData: MedicalRecord | null = null;

    if (input.id) {
      existingDocId = input.id;
    } else if (cleanNationalId && cleanNationalId.length >= 3) {
      const qId = query(collection(db, "patients"), where("nationalId", "==", cleanNationalId));
      const snap = await getDocs(qId);
      if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        existingData = { id: snap.docs[0].id, ...snap.docs[0].data() } as MedicalRecord;
      }
    }

    if (!existingDocId && cleanName) {
      // Look up by name
      const qName = query(collection(db, "patients"), where("patientName", "==", cleanName));
      const snap = await getDocs(qName);
      if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        existingData = { id: snap.docs[0].id, ...snap.docs[0].data() } as MedicalRecord;
      }
    }

    // Build the clinical visit object if clinical details were provided
    const hasClinicalDetails = input.symptoms || input.diagnosis || input.vitals || (input.prescriptions && input.prescriptions.length > 0) || (input.referrals && input.referrals.length > 0);
    
    const newVisit: ClinicalVisit | null = hasClinicalDetails ? {
      id: `vst-${Date.now()}`,
      date: todayDate,
      vitals: {
        temp: input.vitals?.temp || "36.8",
        bp: input.vitals?.bp || "120/80",
        pulse: input.vitals?.pulse || "72",
        weight: input.vitals?.weight || "68",
      },
      symptoms: input.symptoms || "Clinical consultation / intake",
      diagnosis: input.diagnosis || "Initial checkup pending review",
      prescriptions: input.prescriptions || [],
      referrals: input.referrals || [],
    } : null;

    if (existingDocId) {
      // UPDATE existing patient
      const docRef = doc(db, "patients", existingDocId);
      const updatedFields: any = {
        patientName: cleanName,
        updatedAt: nowIso,
      };

      if (cleanNationalId) updatedFields.nationalId = cleanNationalId;
      if (cleanPhone) updatedFields.phone = cleanPhone;
      if (numericAge) updatedFields.age = numericAge;
      if (input.gender) updatedFields.gender = input.gender;
      if (input.bloodType) updatedFields.bloodType = input.bloodType;
      if (input.shaEligible) updatedFields.shaEligible = input.shaEligible;
      if (input.shaId) updatedFields.shaId = input.shaId;
      if (input.currentDepartment) updatedFields.currentDepartment = input.currentDepartment;
      if (input.activeTicketNo) updatedFields.activeTicketNo = input.activeTicketNo;

      if (input.vitals) {
        updatedFields.latestVitals = {
          ...input.vitals,
          recordedAt: nowIso
        };
      }
      if (input.diagnosis) updatedFields.latestDiagnosis = input.diagnosis;
      if (input.symptoms) updatedFields.latestSymptoms = input.symptoms;

      if (newVisit) {
        const existingVisits = existingData?.visits || [];
        updatedFields.visits = [...existingVisits, newVisit];
      }

      await updateDoc(docRef, updatedFields);
      console.log(`[Auto-Sync] Updated patient EHR [${existingDocId}] from ${input.sourceStation || "Workstation"}`);
      return { success: true, patientId: existingDocId, isNew: false };
    } else {
      // CREATE new patient
      const newPatientDoc: any = {
        patientName: cleanName,
        nationalId: cleanNationalId || `GEN-${Math.floor(10000000 + Math.random() * 90000000)}`,
        phone: cleanPhone || "N/A",
        age: numericAge,
        gender: input.gender || "Male",
        bloodType: input.bloodType || "Not Sure",
        shaEligible: input.shaEligible || "not_eligible",
        shaId: input.shaId || "",
        visits: newVisit ? [newVisit] : [{
          id: `vst-${Date.now()}`,
          date: todayDate,
          vitals: {
            temp: input.vitals?.temp || "36.8",
            bp: input.vitals?.bp || "120/80",
            pulse: input.vitals?.pulse || "72",
            weight: input.vitals?.weight || "68",
          },
          symptoms: input.symptoms || "Registration & initial hospital intake",
          diagnosis: input.diagnosis || "Initial intake assessment",
          prescriptions: [],
          referrals: [],
        }],
        latestVitals: input.vitals ? { ...input.vitals, recordedAt: nowIso } : {
          temp: "36.8",
          bp: "120/80",
          pulse: "72",
          weight: "68",
          recordedAt: nowIso
        },
        latestDiagnosis: input.diagnosis || "Registration intake",
        latestSymptoms: input.symptoms || "Walk-in registration",
        currentDepartment: input.currentDepartment || "reception",
        activeTicketNo: input.activeTicketNo || "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const docRef = await addDoc(collection(db, "patients"), newPatientDoc);
      console.log(`[Auto-Sync] Created unified patient EHR [${docRef.id}] from ${input.sourceStation || "Workstation"}`);
      return { success: true, patientId: docRef.id, isNew: true };
    }
  } catch (error) {
    console.error("[Auto-Sync] Error in upsertUnifiedPatientRecord:", error);
    throw error;
  }
};

/**
 * Universal Patient Real-time Listener Hook / Subscription Helper
 */
export const subscribeUnifiedPatients = (
  callback: (patients: MedicalRecord[]) => void
): Unsubscribe => {
  return onSnapshot(collection(db, "patients"), (snapshot) => {
    const list: MedicalRecord[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as MedicalRecord);
    });
    // Sort recently updated or visited first
    list.sort((a: any, b: any) => {
      const timeA = a.updatedAt || a.createdAt || (a.visits?.[a.visits.length - 1]?.date) || "";
      const timeB = b.updatedAt || b.createdAt || (b.visits?.[b.visits.length - 1]?.date) || "";
      return timeB.localeCompare(timeA);
    });
    callback(list);
  });
};

/**
 * Direct lookup by phone in Firestore EHR patients
 */
export const findPatientByPhone = async (phone: string): Promise<MedicalRecord | null> => {
  try {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 9) return null;

    const snap = await getDocs(collection(db, "patients"));
    if (snap.empty) return null;

    for (const d of snap.docs) {
      const pData = { id: d.id, ...d.data() } as MedicalRecord;
      if (normalizePhone(pData.phone) === cleanPhone) {
        return pData;
      }
    }
    return null;
  } catch (err) {
    console.error("Error finding patient by phone:", err);
    return null;
  }
};

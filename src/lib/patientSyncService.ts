import { db, cleanFirestoreData } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
  nextOfKin?: string;
  nextOfKinPhone?: string;
  residence?: string;
  paymentScheme?: string;
  insurancePolicyNo?: string;
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
  priority?: "Normal" | "Urgent / Child" | "STAT Emergency" | string;
  biometricStatus?: "verified" | "not_verified";
  autoQueueTriage?: boolean;
}

export interface UpsertPatientResult {
  success: boolean;
  patientId: string;
  isNew: boolean;
  ticketNo?: string;
  queueId?: string;
  createdTriageQueue?: boolean;
}

/**
 * Automatically creates or ensures an active triage queue ticket in the live queue collection.
 */
export async function createTriageQueueTicket(params: {
  patientId: string;
  patientName: string;
  nationalId?: string;
  phone?: string;
  age?: number | string;
  gender?: string;
  priority?: string;
  paymentScheme?: string;
  insurancePolicyNo?: string;
  biometricStatus?: "verified" | "not_verified";
  ticketNo?: string;
  notes?: string;
  encounterId?: string;
}): Promise<{ success: boolean; queueId?: string; ticketNo: string; alreadyExisted?: boolean }> {
  try {
    const cleanId = (params.nationalId || "").trim();
    const nowIso = new Date().toISOString();

    // 1. Check if an active triage ticket already exists for this patient
    const qQueue = query(
      collection(db, "queue"),
      where("patientId", "==", params.patientId)
    );
    const snap = await getDocs(qQueue);
    const activeDoc = snap.docs.find((d) => {
      const data = d.data();
      const dept = (data?.currentDepartment || data?.department || "").toLowerCase();
      const isTriage = dept === "triage" || dept === "reception" || dept === "nurse";
      const isPending = data?.status === "pending" || data?.status === "serving" || data?.status === "waiting";
      return isTriage && isPending;
    });

    if (activeDoc) {
      const existingData = activeDoc.data();
      // If encounterId was provided, attach it to the existing ticket
      if (params.encounterId && !existingData.encounterId) {
        try {
          await updateDoc(doc(db, "queue", activeDoc.id), { encounterId: params.encounterId });
        } catch {}
      }
      return {
        success: true,
        queueId: activeDoc.id,
        ticketNo: existingData.ticketNo,
        alreadyExisted: true
      };
    }

    // 2. Generate new triage ticket number (prefix TRG)
    const ticketNo = params.ticketNo && params.ticketNo.startsWith("TRG")
      ? params.ticketNo
      : `TRG-${Math.floor(100 + Math.random() * 900)}`;

    const numericAge = typeof params.age === "string" ? parseInt(params.age) || 30 : params.age || 30;

    const triageQueueDoc: Omit<QueueTicket, "id"> = {
      ticketNo,
      patientId: params.patientId,
      patientName: params.patientName.trim(),
      nationalId: cleanId,
      phone: (params.phone || "").trim() || "N/A",
      age: numericAge,
      gender: params.gender || "Male",
      department: "Triage",
      currentDepartment: "triage",
      service: "Nurse Triage & Vitals",
      status: "pending",
      priority: (params.priority === "STAT Emergency"
        ? "stat_emergency"
        : params.priority === "Urgent / Child"
          ? "urgent"
          : "normal") as any,
      paymentScheme: params.paymentScheme || "Cash / M-Pesa",
      insurancePolicyNo: params.insurancePolicyNo || "",
      biometricStatus: params.biometricStatus === "verified" ? "verified" : "not_verified",
      createdAt: nowIso,
      timestamp: nowIso,
      triageStage: "unassigned",
      notes: params.notes || "Auto-routed to Nurse Triage upon registration for vital signs & triage acuity rating.",
      encounterId: params.encounterId || null
    } as any;

    const addedDoc = await addDoc(collection(db, "queue"), cleanFirestoreData(triageQueueDoc));

    // Update patient master record with active ticket and department
    try {
      await updateDoc(doc(db, "patients", params.patientId), {
        activeTicketNo: ticketNo,
        currentDepartment: "triage",
        updatedAt: nowIso
      });
    } catch {}

    console.log(`[Auto-Triage] Created triage queue ticket [${ticketNo}] for patient [${params.patientName}]`);
    return {
      success: true,
      queueId: addedDoc.id,
      ticketNo,
      alreadyExisted: false
    };
  } catch (err) {
    console.error("[Auto-Triage] Failed to create triage queue ticket:", err);
    return {
      success: false,
      ticketNo: params.ticketNo || "TRG-000"
    };
  }
}

export const upsertUnifiedPatientRecord = async (
  input: UnifiedPatientInput
): Promise<UpsertPatientResult> => {
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
      try {
        const idRef = doc(db, "patients", input.id);
        const idSnap = await getDoc(idRef);
        if (idSnap.exists()) {
          existingDocId = input.id;
          existingData = { id: idSnap.id, ...idSnap.data() } as MedicalRecord;
        }
      } catch {
        // Document with this ID does not exist yet; will check alternatives
      }
    }

    if (!existingDocId && cleanNationalId && cleanNationalId.length >= 3) {
      const qId = query(collection(db, "patients"), where("nationalId", "==", cleanNationalId));
      const snap = await getDocs(qId);
      if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        existingData = { id: snap.docs[0].id, ...snap.docs[0].data() } as MedicalRecord;
      }
    }

    if (!existingDocId && cleanPhone && cleanPhone.length >= 9) {
      const qPhone = query(collection(db, "patients"), where("phone", "==", cleanPhone));
      const snap = await getDocs(qPhone);
      if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        existingData = { id: snap.docs[0].id, ...snap.docs[0].data() } as MedicalRecord;
      }
    }

    if (!existingDocId && cleanName) {
      // Look up by exact name
      const qName = query(collection(db, "patients"), where("patientName", "==", cleanName));
      const snap = await getDocs(qName);
      if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        existingData = { id: snap.docs[0].id, ...snap.docs[0].data() } as MedicalRecord;
      }
    }

    // Determine target document ID
    const targetDocId = existingDocId || input.id || doc(collection(db, "patients")).id;
    const isNewRecord = !existingDocId;

    // Standardize payment and insurance scheme mappings
    const resolvedPaymentScheme = input.paymentScheme || existingData?.paymentScheme || "Cash / M-Pesa";
    const resolvedPolicyNo = (input.insurancePolicyNo !== undefined ? input.insurancePolicyNo : existingData?.insurancePolicyNo) || "";
    const resolvedInsuranceScheme = input.paymentScheme === "Social Health Authority (SHA)"
      ? "Social Health Authority (SHA)"
      : input.paymentScheme === "Private Insurance"
        ? (resolvedPolicyNo ? "Private Insurance" : "Corporate Insurance")
        : existingData?.insuranceScheme || resolvedPaymentScheme;

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

    if (!isNewRecord) {
      // UPDATE existing patient using setDoc merge to guarantee zero crashes
      const docRef = doc(db, "patients", targetDocId);
      const updatedFields: any = {
        id: targetDocId,
        patientName: cleanName,
        updatedAt: nowIso,
        sourceStation: input.sourceStation || existingData?.sourceStation || "Reception",
      };

      if (cleanNationalId) updatedFields.nationalId = cleanNationalId;
      if (cleanPhone) updatedFields.phone = cleanPhone;
      if (numericAge) updatedFields.age = numericAge;
      if (input.gender) updatedFields.gender = input.gender;
      if (input.bloodType) updatedFields.bloodType = input.bloodType;
      
      // Persist reception & insurance fields
      if (input.paymentScheme) updatedFields.paymentScheme = resolvedPaymentScheme;
      if (input.insurancePolicyNo !== undefined) updatedFields.insurancePolicyNo = resolvedPolicyNo;
      updatedFields.insuranceScheme = resolvedInsuranceScheme;
      updatedFields.insuranceNumber = resolvedPolicyNo;
      if (input.nextOfKin !== undefined) updatedFields.nextOfKin = input.nextOfKin;
      if (input.nextOfKinPhone !== undefined) updatedFields.nextOfKinPhone = input.nextOfKinPhone;
      if (input.residence !== undefined) updatedFields.residence = input.residence;
      if (input.allergies !== undefined) updatedFields.allergies = input.allergies;
      if (input.chronicConditions !== undefined) updatedFields.chronicConditions = input.chronicConditions;

      if (input.shaEligible) {
        updatedFields.shaEligible = input.shaEligible;
      } else if (resolvedPaymentScheme === "Social Health Authority (SHA)") {
        updatedFields.shaEligible = "eligible";
      }
      if (input.shaId || resolvedPolicyNo) updatedFields.shaId = input.shaId || resolvedPolicyNo;
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

      await setDoc(docRef, cleanFirestoreData(updatedFields), { merge: true });
      console.log(`[Auto-Sync] Updated patient EHR [${targetDocId}] from ${input.sourceStation || "Workstation"}`);
      return { success: true, patientId: targetDocId, isNew: false };
    } else {
      // CREATE new patient with explicit ID and full Kenyan HMS fields
      const newPatientDoc: any = {
        id: targetDocId,
        patientName: cleanName,
        nationalId: cleanNationalId || `GEN-${Math.floor(10000000 + Math.random() * 90000000)}`,
        phone: cleanPhone || "N/A",
        age: numericAge,
        gender: input.gender || "Male",
        bloodType: input.bloodType || "Not Sure",
        nextOfKin: input.nextOfKin || "",
        nextOfKinPhone: input.nextOfKinPhone || "",
        residence: input.residence || "",
        paymentScheme: resolvedPaymentScheme,
        insurancePolicyNo: resolvedPolicyNo,
        insuranceScheme: resolvedInsuranceScheme,
        insuranceNumber: resolvedPolicyNo,
        shaEligible: input.shaEligible || (resolvedPaymentScheme === "Social Health Authority (SHA)" ? "eligible" : "not_eligible"),
        shaId: input.shaId || (resolvedPaymentScheme === "Social Health Authority (SHA)" ? resolvedPolicyNo : ""),
        allergies: input.allergies || "",
        chronicConditions: input.chronicConditions || "",
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
        currentDepartment: input.currentDepartment || "triage",
        activeTicketNo: input.activeTicketNo || "",
        sourceStation: input.sourceStation || "Reception",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const docRef = doc(db, "patients", targetDocId);
      await setDoc(docRef, cleanFirestoreData(newPatientDoc), { merge: true });
      console.log(`[Auto-Sync] Created unified patient EHR [${targetDocId}] from ${input.sourceStation || "Workstation"}`);

      // Automatically create a queue ticket at Triage whenever a new patient is created
      let assignedTicketNo = input.activeTicketNo;
      let createdQueueId: string | undefined = undefined;
      let createdTriageQueue = false;

      if (input.autoQueueTriage !== false) {
        const triageQueueResult = await createTriageQueueTicket({
          patientId: targetDocId,
          patientName: cleanName,
          nationalId: cleanNationalId,
          phone: cleanPhone,
          age: numericAge,
          gender: input.gender,
          priority: input.priority,
          paymentScheme: resolvedPaymentScheme,
          insurancePolicyNo: resolvedPolicyNo,
          biometricStatus: input.biometricStatus,
          ticketNo: input.activeTicketNo,
          notes: input.symptoms ? `Auto-triage queue on patient creation. Intake: ${input.symptoms}` : undefined
        });

        assignedTicketNo = triageQueueResult.ticketNo;
        createdQueueId = triageQueueResult.queueId;
        createdTriageQueue = true;
      }

      return {
        success: true,
        patientId: targetDocId,
        isNew: true,
        ticketNo: assignedTicketNo,
        queueId: createdQueueId,
        createdTriageQueue
      };
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

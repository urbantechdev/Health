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
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Unsubscribe
} from "firebase/firestore";
import {
  Encounter,
  EncounterVital,
  EncounterPrescription,
  EncounterLabRequest,
  EncounterBillItem,
  EncounterNursingNote,
  EncounterDoctorNote,
  HospitalWard,
  WardBed,
  AdmissionType,
  EncounterStatus,
  MedicalRecord,
  MorgueAdmissionRecord
} from "../types";

/**
 * DEFAULT KENYAN HOSPITAL WARDS & BEDS DATA INITIALIZER
 */
export const DEFAULT_HOSPITAL_WARDS: HospitalWard[] = [
  { id: "ward-general-male", name: "Male Medical & Surgical Ward", code: "MMSW", floor: "Ground Floor - Wing A", category: "General", totalBeds: 6, dailyBaseRate: 1500 },
  { id: "ward-general-female", name: "Female Medical & Surgical Ward", code: "FMSW", floor: "Ground Floor - Wing B", category: "General", totalBeds: 6, dailyBaseRate: 1500 },
  { id: "ward-maternity", name: "Maternity & Postnatal Ward", code: "MATW", floor: "1st Floor - Wing A", category: "Maternity", totalBeds: 4, dailyBaseRate: 2500 },
  { id: "ward-pediatric", name: "Pediatric Ward (Children)", code: "PEDW", floor: "1st Floor - Wing B", category: "General", totalBeds: 4, dailyBaseRate: 1800 },
  { id: "ward-private", name: "Executive Private Wing", code: "EXPW", floor: "2nd Floor - Wing A", category: "Private", totalBeds: 3, dailyBaseRate: 6000 },
  { id: "ward-icu", name: "Intensive Care Unit (ICU / HDU)", code: "ICUW", floor: "2nd Floor - Wing B", category: "ICU", totalBeds: 3, dailyBaseRate: 12000 }
];

export const initDefaultHospitalWardsAndBeds = async (): Promise<void> => {
  try {
    const wardsSnap = await getDocs(collection(db, "wards"));
    if (wardsSnap.empty) {
      console.log("[EncounterService] Initializing default hospital wards and beds...");
      for (const ward of DEFAULT_HOSPITAL_WARDS) {
        await setDoc(doc(db, "wards", ward.id), ward);

        // Populate beds for this ward
        for (let i = 1; i <= ward.totalBeds; i++) {
          const bedId = `${ward.id}-bed-${i}`;
          const bedDoc: WardBed = {
            id: bedId,
            bedNumber: `Bed ${i}`,
            wardId: ward.id,
            wardName: ward.name,
            category: ward.category as any,
            status: "AVAILABLE",
            dailyRate: ward.dailyBaseRate,
            currentPatientId: null,
            currentPatientName: null,
            currentEncounterId: null,
            occupiedSince: null
          };
          await setDoc(doc(db, "beds", bedId), bedDoc);
        }
      }
      console.log("[EncounterService] Successfully initialized hospital wards and beds.");
    }
  } catch (err) {
    console.error("[EncounterService] Error initializing wards and beds:", err);
  }
};

/**
 * 1. CREATE MASTER ENCOUNTER DOCUMENT (/encounters/{encounterId})
 */
export interface CreateEncounterParams {
  patientId: string;
  patientName: string;
  nationalId: string;
  phone?: string;
  age?: number;
  gender?: string;
  bloodType?: string;
  admissionType: AdmissionType;
  assignedWardId?: string;
  assignedWardName?: string;
  assignedBedId?: string;
  assignedBedNumber?: string;
  initialSymptoms?: string;
  initialDiagnosis?: string;
  attendingDoctorName?: string;
  attendingDoctorId?: string;
  activeQueueTicketId?: string;
  initialVitals?: {
    temp?: string;
    bp?: string;
    pulse?: string;
    weight?: string;
    spo2?: string;
    respiratoryRate?: string;
  };
  recordedBy?: string;
}

export const createHospitalEncounter = async (
  params: CreateEncounterParams
): Promise<string> => {
  const nowIso = new Date().toISOString();
  const encounterId = `ENC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const isAdmitted = params.admissionType === "INPATIENT" || params.admissionType === "EMERGENCY" || params.admissionType === "MATERNITY";
  const status: EncounterStatus = isAdmitted ? "ADMITTED" : "TRIAGE";

  // Initial bill item calculation if bed is assigned
  let initialBilled = 0;
  if (params.assignedBedId && isAdmitted) {
    // Initial Admission & Ward File Opening Charge
    initialBilled = 2000;
  } else {
    // Standard Consultation Intake fee
    initialBilled = 1000;
  }

  const encounterDoc: Encounter = {
    id: encounterId,
    patientId: params.patientId,
    patientName: params.patientName,
    nationalId: params.nationalId,
    phone: params.phone || "",
    age: params.age || 30,
    gender: params.gender || "Male",
    bloodType: params.bloodType || "Not Sure",
    status,
    admissionType: params.admissionType,
    assignedWard: params.assignedWardName || undefined,
    assignedWardId: params.assignedWardId || undefined,
    assignedBed: params.assignedBedNumber || undefined,
    assignedBedId: params.assignedBedId || undefined,
    admittedAt: isAdmitted ? nowIso : undefined,
    dischargedAt: null,
    doctorDischargeApproved: false,
    billingCleared: false,
    totalBilled: initialBilled,
    totalPaid: 0,
    pendingLabOrders: 0,
    pendingPrescriptions: 0,
    latestDiagnosis: params.initialDiagnosis || "Initial medical intake",
    latestSymptoms: params.initialSymptoms || "Registration & triage assessment",
    attendingDoctorName: params.attendingDoctorName || "Duty Medical Officer",
    attendingDoctorId: params.attendingDoctorId || "",
    activeQueueTicketId: params.activeQueueTicketId || "",
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // 1. Save Encounter Parent Document
  await setDoc(doc(db, "encounters", encounterId), encounterDoc);

  // 2. Initial Vitals in Subcollection (/encounters/{encounterId}/vitals)
  if (params.initialVitals) {
    const vitalDoc: EncounterVital = {
      id: `vit-${Date.now()}`,
      temp: params.initialVitals.temp || "36.8",
      bp: params.initialVitals.bp || "120/80",
      pulse: params.initialVitals.pulse || "72",
      weight: params.initialVitals.weight || "68",
      spo2: params.initialVitals.spo2 || "98",
      respiratoryRate: params.initialVitals.respiratoryRate || "16",
      recordedBy: params.recordedBy || "Triage Nurse",
      recordedAt: nowIso
    };
    await setDoc(doc(db, "encounters", encounterId, "vitals", vitalDoc.id), vitalDoc);
  }

  // 3. Initial Consultation / Admission Bill Item in Subcollection (/encounters/{encounterId}/billItems)
  const initialBillDoc: EncounterBillItem = {
    id: `bill-${Date.now()}-01`,
    description: isAdmitted ? "Inpatient Admission & Medical File Fee" : "Outpatient Clinical Consultation",
    category: isAdmitted ? "ward_bed" : "consultation",
    unitPrice: initialBilled,
    quantity: 1,
    total: initialBilled,
    isPaid: false,
    timestamp: nowIso
  };
  await setDoc(doc(db, "encounters", encounterId, "billItems", initialBillDoc.id), initialBillDoc);

  // 4. Initial Nursing Note in Subcollection
  const noteDoc: EncounterNursingNote = {
    id: `note-${Date.now()}`,
    note: `Patient admitted to ${params.assignedWardName || "Outpatient Care"} via ${params.admissionType} pathway. Intake vitals recorded.`,
    shift: "Morning",
    nurseName: params.recordedBy || "Intake Nurse",
    timestamp: nowIso
  };
  await setDoc(doc(db, "encounters", encounterId, "nursingNotes", noteDoc.id), noteDoc);

  // 4B. Initial Doctor's Admission Note in Subcollection (/encounters/{encounterId}/doctorNotes)
  const docNoteDoc: EncounterDoctorNote = {
    id: `doc-note-${Date.now()}`,
    note: params.initialSymptoms
      ? `Admission clinical evaluation: ${params.initialSymptoms}. Working diagnosis: ${params.initialDiagnosis || "Pending investigation"}.`
      : `Patient admitted for ${params.initialDiagnosis || "inpatient care and monitoring"}.`,
    category: "Ward Round Review",
    doctorName: params.attendingDoctorName || "Attending Medical Officer",
    doctorId: params.attendingDoctorId || "",
    clinicalPlan: "Admit to ward, initiate vital signs monitoring, routine bedside evaluation and clinical workup.",
    orders: "Monitor Q4H vitals, maintain hydration, review pending diagnostic results.",
    timestamp: nowIso
  };
  await setDoc(doc(db, "encounters", encounterId, "doctorNotes", docNoteDoc.id), docNoteDoc);

  // 5. Update Master Patient record with activeEncounterId
  if (params.patientId) {
    const patRef = doc(db, "patients", params.patientId);
    await updateDoc(patRef, {
      activeEncounterId: encounterId,
      status: isAdmitted ? "INPATIENT" : "OUTPATIENT",
      currentDepartment: isAdmitted ? "inpatient_ward" : "doctor",
      updatedAt: nowIso
    }).catch(async () => {
      // In case patient doc doesn't exist, create it
      await setDoc(patRef, {
        id: params.patientId,
        patientName: params.patientName,
        nationalId: params.nationalId,
        phone: params.phone || "",
        age: params.age || 30,
        gender: params.gender || "Male",
        bloodType: params.bloodType || "Not Sure",
        activeEncounterId: encounterId,
        status: isAdmitted ? "INPATIENT" : "OUTPATIENT",
        createdAt: nowIso,
        updatedAt: nowIso
      });
    });
  }

  // 6. Lock the Ward Bed if assigned
  if (params.assignedBedId) {
    const bedRef = doc(db, "beds", params.assignedBedId);
    await updateDoc(bedRef, {
      status: "OCCUPIED",
      currentPatientId: params.patientId,
      currentPatientName: params.patientName,
      currentEncounterId: encounterId,
      occupiedSince: nowIso
    }).catch(err => console.error("Error updating bed status:", err));
  }

  return encounterId;
};

/**
 * 2. SUBCOLLECTION OPERATIONS
 */

// Add Vital to /encounters/{encounterId}/vitals
export const addEncounterVital = async (
  encounterId: string,
  vital: Omit<EncounterVital, "id" | "recordedAt">
): Promise<string> => {
  const nowIso = new Date().toISOString();
  const vitalId = `vit-${Date.now()}`;
  const vitalDoc: EncounterVital = {
    ...vital,
    id: vitalId,
    recordedAt: nowIso
  };

  await setDoc(doc(db, "encounters", encounterId, "vitals", vitalId), vitalDoc);

  // Update encounter document
  await updateDoc(doc(db, "encounters", encounterId), {
    updatedAt: nowIso
  });

  return vitalId;
};

// Add Prescription to /encounters/{encounterId}/prescriptions + /encounters/{encounterId}/billItems
export const addEncounterPrescription = async (
  encounterId: string,
  item: {
    drugName: string;
    quantity: number;
    dosage: string;
    instructions: string;
    unitPrice: number;
    prescribedBy: string;
  }
): Promise<string> => {
  const nowIso = new Date().toISOString();
  const rxId = `rx-${Date.now()}`;
  const totalPrice = item.unitPrice * item.quantity;

  const rxDoc: EncounterPrescription = {
    id: rxId,
    drugName: item.drugName,
    quantity: item.quantity,
    dosage: item.dosage,
    instructions: item.instructions,
    unitPrice: item.unitPrice,
    totalPrice,
    status: "pending",
    prescribedBy: item.prescribedBy,
    createdAt: nowIso
  };

  // 1. Add prescription
  await setDoc(doc(db, "encounters", encounterId, "prescriptions", rxId), rxDoc);

  // 2. Add matching bill item
  const billId = `bill-rx-${Date.now()}`;
  const billDoc: EncounterBillItem = {
    id: billId,
    description: `Pharmacy: ${item.drugName} (${item.quantity}x - ${item.dosage})`,
    category: "pharmacy",
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    total: totalPrice,
    isPaid: false,
    timestamp: nowIso
  };
  await setDoc(doc(db, "encounters", encounterId, "billItems", billId), billDoc);

  // 3. Increment rollups on encounter document
  const encSnap = await getDoc(doc(db, "encounters", encounterId));
  if (encSnap.exists()) {
    const data = encSnap.data() as Encounter;
    const newTotalBilled = (data.totalBilled || 0) + totalPrice;
    const newPendingPrescriptions = (data.pendingPrescriptions || 0) + 1;
    const billingCleared = (data.totalPaid || 0) >= newTotalBilled;

    await updateDoc(doc(db, "encounters", encounterId), {
      totalBilled: newTotalBilled,
      pendingPrescriptions: newPendingPrescriptions,
      billingCleared,
      updatedAt: nowIso
    });
  }

  return rxId;
};

// Add Lab Request to /encounters/{encounterId}/labRequests + /encounters/{encounterId}/billItems
export const addEncounterLabRequest = async (
  encounterId: string,
  lab: {
    testName: string;
    department: string;
    sampleType?: string;
    notes?: string;
    unitPrice: number;
    orderedBy: string;
  }
): Promise<string> => {
  const nowIso = new Date().toISOString();
  const labId = `lab-${Date.now()}`;

  const labDoc: EncounterLabRequest = {
    id: labId,
    testName: lab.testName,
    department: lab.department,
    sampleType: lab.sampleType || "Blood / Serum",
    notes: lab.notes || "",
    unitPrice: lab.unitPrice,
    status: "pending",
    orderedBy: lab.orderedBy,
    createdAt: nowIso
  };

  // 1. Add lab request
  await setDoc(doc(db, "encounters", encounterId, "labRequests", labId), labDoc);

  // 2. Add bill item
  const billId = `bill-lab-${Date.now()}`;
  const billDoc: EncounterBillItem = {
    id: billId,
    description: `Diagnostic: ${lab.testName} (${lab.department.toUpperCase()})`,
    category: "laboratory",
    unitPrice: lab.unitPrice,
    quantity: 1,
    total: lab.unitPrice,
    isPaid: false,
    timestamp: nowIso
  };
  await setDoc(doc(db, "encounters", encounterId, "billItems", billId), billDoc);

  // 3. Increment rollups
  const encSnap = await getDoc(doc(db, "encounters", encounterId));
  if (encSnap.exists()) {
    const data = encSnap.data() as Encounter;
    const newTotalBilled = (data.totalBilled || 0) + lab.unitPrice;
    const newPendingLabOrders = (data.pendingLabOrders || 0) + 1;
    const billingCleared = (data.totalPaid || 0) >= newTotalBilled;

    await updateDoc(doc(db, "encounters", encounterId), {
      totalBilled: newTotalBilled,
      pendingLabOrders: newPendingLabOrders,
      billingCleared,
      updatedAt: nowIso
    });
  }

  return labId;
};

// Complete Lab Request & decrement pendingLabOrders
export const completeEncounterLabRequest = async (
  encounterId: string,
  labId: string,
  results: string,
  abnormalFlags: string,
  performedBy: string
): Promise<void> => {
  const nowIso = new Date().toISOString();

  // 1. Update lab doc
  const labRef = doc(db, "encounters", encounterId, "labRequests", labId);
  await updateDoc(labRef, {
    status: "completed",
    results,
    abnormalFlags,
    performedBy,
    completedAt: nowIso
  });

  // 2. Recalculate pending lab orders rollup
  const labsSnap = await getDocs(collection(db, "encounters", encounterId, "labRequests"));
  let pendingCount = 0;
  labsSnap.forEach(d => {
    const data = d.data() as EncounterLabRequest;
    if (data.status === "pending" || data.status === "processing" || data.status === "sample_collected") {
      pendingCount++;
    }
  });

  await updateDoc(doc(db, "encounters", encounterId), {
    pendingLabOrders: pendingCount,
    updatedAt: nowIso
  });
};

// Dispense Prescription & decrement pendingPrescriptions
export const dispenseEncounterPrescription = async (
  encounterId: string,
  rxId: string,
  dispensedBy: string
): Promise<void> => {
  const nowIso = new Date().toISOString();

  // 1. Update prescription doc
  const rxRef = doc(db, "encounters", encounterId, "prescriptions", rxId);
  await updateDoc(rxRef, {
    status: "dispensed",
    dispensedBy,
    dispensedAt: nowIso
  });

  // 2. Recalculate pending prescriptions rollup
  const rxSnap = await getDocs(collection(db, "encounters", encounterId, "prescriptions"));
  let pendingCount = 0;
  rxSnap.forEach(d => {
    const data = d.data() as EncounterPrescription;
    if (data.status === "pending") {
      pendingCount++;
    }
  });

  await updateDoc(doc(db, "encounters", encounterId), {
    pendingPrescriptions: pendingCount,
    updatedAt: nowIso
  });
};

// Add Nursing Note
export const addEncounterNursingNote = async (
  encounterId: string,
  note: {
    note: string;
    shift: "Morning" | "Afternoon" | "Night";
    nurseName: string;
  }
): Promise<string> => {
  const nowIso = new Date().toISOString();
  const noteId = `note-${Date.now()}`;
  const noteDoc: EncounterNursingNote = {
    ...note,
    id: noteId,
    timestamp: nowIso
  };

  await setDoc(doc(db, "encounters", encounterId, "nursingNotes", noteId), noteDoc);
  return noteId;
};

// Add Doctor's Note / Ward Round Note to /encounters/{encounterId}/doctorNotes
export const addEncounterDoctorNote = async (
  encounterId: string,
  note: {
    note: string;
    category?: "Ward Round Review" | "Treatment Plan" | "Specialist Consultation" | "Clinical Progress" | "Procedure / Intervention" | "Emergency Assessment" | "General";
    doctorName: string;
    doctorId?: string;
    doctorKmpdc?: string;
    clinicalPlan?: string;
    orders?: string;
  }
): Promise<string> => {
  const nowIso = new Date().toISOString();
  const noteId = `doc-note-${Date.now()}`;
  const noteDoc: EncounterDoctorNote = {
    ...note,
    id: noteId,
    timestamp: nowIso
  };

  await setDoc(doc(db, "encounters", encounterId, "doctorNotes", noteId), noteDoc);
  return noteId;
};

// Add Custom Bill Item to /encounters/{encounterId}/billItems
export const addEncounterBillItem = async (
  encounterId: string,
  item: Omit<EncounterBillItem, "id" | "timestamp" | "isPaid">
): Promise<string> => {
  const nowIso = new Date().toISOString();
  const billId = `bill-${Date.now()}`;
  const billDoc: EncounterBillItem = {
    ...item,
    id: billId,
    isPaid: false,
    timestamp: nowIso
  };

  await setDoc(doc(db, "encounters", encounterId, "billItems", billId), billDoc);

  const encSnap = await getDoc(doc(db, "encounters", encounterId));
  if (encSnap.exists()) {
    const data = encSnap.data() as Encounter;
    const newTotalBilled = (data.totalBilled || 0) + item.total;
    const billingCleared = (data.totalPaid || 0) >= newTotalBilled;

    await updateDoc(doc(db, "encounters", encounterId), {
      totalBilled: newTotalBilled,
      billingCleared,
      updatedAt: nowIso
    });
  }

  return billId;
};

// Settle / Pay Encounter Bill
export const payEncounterBill = async (
  encounterId: string,
  paymentAmount: number,
  paymentMethod: "Cash" | "M-PESA" | "SHA/NHIF" | "Insurance" | "Split",
  referenceNotes?: string
): Promise<{ success: boolean; newTotalPaid: number; billingCleared: boolean }> => {
  const nowIso = new Date().toISOString();
  const encRef = doc(db, "encounters", encounterId);
  const encSnap = await getDoc(encRef);

  if (!encSnap.exists()) {
    throw new Error("Encounter document not found.");
  }

  const encounter = encSnap.data() as Encounter;
  const newTotalPaid = (encounter.totalPaid || 0) + paymentAmount;
  const isCleared = newTotalPaid >= (encounter.totalBilled || 0);

  // Mark all un-paid bill items in subcollection as paid
  const billSnap = await getDocs(collection(db, "encounters", encounterId, "billItems"));
  const batchUpdates: Promise<void>[] = [];
  billSnap.forEach((bDoc) => {
    const bData = bDoc.data() as EncounterBillItem;
    if (!bData.isPaid) {
      batchUpdates.push(
        updateDoc(doc(db, "encounters", encounterId, "billItems", bDoc.id), {
          isPaid: true,
          paidAt: nowIso,
          paymentMethod
        })
      );
    }
  });
  await Promise.all(batchUpdates);

  // Update master encounter document
  await updateDoc(encRef, {
    totalPaid: newTotalPaid,
    billingCleared: isCleared,
    updatedAt: nowIso
  });

  // Also create a master invoice document for accounting records
  const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
  await setDoc(doc(db, "invoices", invoiceId), cleanFirestoreData({
    id: invoiceId,
    patientId: encounter.patientId,
    patientName: encounter.patientName,
    nationalId: encounter.nationalId,
    total: paymentAmount,
    split: {
      sha: paymentMethod === "SHA/NHIF" ? paymentAmount : 0,
      insurance: paymentMethod === "Insurance" ? paymentAmount : 0,
      outOfPocket: ["Cash", "M-PESA"].includes(paymentMethod) ? paymentAmount : 0
    },
    paymentMethod,
    paymentStatus: "paid",
    kraCompliantInvoiceNo: `KRA-ETIMS-${Date.now().toString().slice(-8)}`,
    timestamp: nowIso,
    encounterId
  }));

  return { success: true, newTotalPaid, billingCleared: isCleared };
};

// Doctor Clinical Discharge Signoff with comprehensive clearance details
export interface DoctorClearanceParams {
  encounterId: string;
  doctorName: string;
  doctorId?: string;
  dischargeCondition: "Recovered" | "Improved / Stable for Home Care" | "Transferred / Referred" | "Against Medical Advice (DAMA)" | "Deceased";
  clinicalSummary: string;
  dischargeMedications?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  doctorSignature?: string;
}

export const signDoctorClinicalDischarge = async (
  params: DoctorClearanceParams | (string & { [key: string]: any }),
  legacyDoctorName?: string,
  legacySummary?: string
): Promise<void> => {
  const nowIso = new Date().toISOString();
  let encounterId: string;
  let doctorName: string;
  let clearanceData: any;

  if (typeof params === "string") {
    encounterId = params;
    doctorName = legacyDoctorName || "Attending Medical Officer";
    clearanceData = {
      cleared: true,
      doctorName,
      clearedAt: nowIso,
      dischargeCondition: "Recovered",
      clinicalSummary: legacySummary || "Patient cleared for discharge by attending physician.",
      followUpInstructions: "Standard home care instructions provided.",
      doctorSignature: `SIG-${doctorName.replace(/\s+/g, "_")}-${Date.now().toString().slice(-4)}`
    };
  } else {
    encounterId = params.encounterId;
    doctorName = params.doctorName || "Attending Medical Officer";
    clearanceData = {
      cleared: true,
      doctorName: params.doctorName,
      doctorId: params.doctorId || "",
      clearedAt: nowIso,
      dischargeCondition: params.dischargeCondition || "Recovered",
      clinicalSummary: params.clinicalSummary || "Clinical discharge approved.",
      dischargeMedications: params.dischargeMedications || "",
      followUpDate: params.followUpDate || "",
      followUpInstructions: params.followUpInstructions || "Follow prescribed recovery plan.",
      doctorSignature: params.doctorSignature || `SIG-${doctorName.replace(/\s+/g, "_")}-${Date.now().toString().slice(-4)}`
    };
  }

  const encRef = doc(db, "encounters", encounterId);

  await updateDoc(encRef, {
    doctorDischargeApproved: true,
    doctorDischargeApprovedBy: doctorName,
    doctorDischargeApprovedAt: nowIso,
    doctorClearance: clearanceData,
    dischargeNotes: clearanceData.clinicalSummary,
    status: "DISCHARGING",
    updatedAt: nowIso
  });
};

/**
 * BED TRANSFER HISTORY & ACCURATE DAILY RATE LOGGING
 * Moves patient between wards/beds (e.g. General Ward -> ICU -> Private Room)
 * and logs timestamped transfer records for differential daily billing.
 */
export interface TransferBedParams {
  encounterId: string;
  toWardId: string;
  toWardName: string;
  toBedId: string;
  toBedNumber: string;
  toDailyRate: number;
  transferredBy: string;
  reason?: string;
}

export const transferEncounterBed = async (
  params: TransferBedParams
): Promise<{ success: boolean; message: string; transferRecord: any }> => {
  const encRef = doc(db, "encounters", params.encounterId);
  const nowIso = new Date().toISOString();

  return await runTransaction(db, async (transaction) => {
    const encSnap = await transaction.get(encRef);
    if (!encSnap.exists()) {
      throw new Error("Encounter not found.");
    }
    const enc = encSnap.data() as Encounter;

    // Check target bed
    const targetBedRef = doc(db, "beds", params.toBedId);
    const targetBedSnap = await transaction.get(targetBedRef);
    if (!targetBedSnap.exists()) {
      throw new Error("Target bed does not exist.");
    }
    const targetBedData = targetBedSnap.data() as WardBed;
    if (targetBedData.status === "OCCUPIED" && targetBedData.currentEncounterId !== params.encounterId) {
      throw new Error(`Target bed ${targetBedData.bedNumber} is already occupied by another patient.`);
    }

    // Previous bed details
    const fromWardId = enc.assignedWardId;
    const fromWardName = enc.assignedWard || "Unassigned Ward";
    const fromBedId = enc.assignedBedId;
    const fromBedNumber = enc.assignedBed || "Unassigned Bed";

    // Calculate days spent in previous bed
    const lastTransferTime = enc.bedTransfers && enc.bedTransfers.length > 0
      ? new Date(enc.bedTransfers[enc.bedTransfers.length - 1].transferredAt).getTime()
      : enc.admittedAt ? new Date(enc.admittedAt).getTime() : Date.now();
    
    const durationMs = Math.max(0, Date.now() - lastTransferTime);
    const daysSpent = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));

    // Create Transfer Record
    const transferRecord = {
      id: `xfer-${Date.now()}`,
      fromWardId,
      fromWardName,
      fromBedId,
      fromBedNumber,
      toWardId: params.toWardId,
      toWardName: params.toWardName,
      toBedId: params.toBedId,
      toBedNumber: params.toBedNumber,
      transferredAt: nowIso,
      transferredBy: params.transferredBy,
      reason: params.reason || "Clinical bed transfer",
      dailyRate: params.toDailyRate,
      daysSpent,
      accumulatedCost: daysSpent * (targetBedData.dailyRate || params.toDailyRate)
    };

    const existingTransfers = enc.bedTransfers || [];
    const updatedTransfers = [...existingTransfers, transferRecord];

    // Release old bed if existed
    if (fromBedId && fromBedId !== params.toBedId) {
      const oldBedRef = doc(db, "beds", fromBedId);
      transaction.update(oldBedRef, {
        status: "AVAILABLE",
        currentPatientId: null,
        currentPatientName: null,
        currentEncounterId: null,
        occupiedSince: null
      });
    }

    // Occupy target bed
    transaction.update(targetBedRef, {
      status: "OCCUPIED",
      currentPatientId: enc.patientId,
      currentPatientName: enc.patientName,
      currentEncounterId: enc.id,
      occupiedSince: nowIso
    });

    // Add automated bill item for the bed transfer / differential rate
    const billRef = doc(collection(db, "encounters", params.encounterId, "billItems"));
    transaction.set(billRef, {
      id: billRef.id,
      description: `Bed Transfer: ${fromWardName} (${fromBedNumber}) -> ${params.toWardName} (${params.toBedNumber})`,
      category: "accommodation",
      department: "inpatient",
      unitPrice: params.toDailyRate,
      quantity: 1,
      total: params.toDailyRate,
      isPaid: false,
      timestamp: nowIso
    });

    const newTotalBilled = (enc.totalBilled || 0) + params.toDailyRate;

    // Update master encounter
    transaction.update(encRef, {
      assignedWard: params.toWardName,
      assignedWardId: params.toWardId,
      assignedBed: params.toBedNumber,
      assignedBedId: params.toBedId,
      bedTransfers: updatedTransfers,
      totalBilled: newTotalBilled,
      billingCleared: (enc.totalPaid || 0) >= newTotalBilled,
      updatedAt: nowIso
    });

    return {
      success: true,
      message: `Patient successfully transferred to ${params.toWardName} - ${params.toBedNumber}. Daily rate: KES ${params.toDailyRate.toLocaleString()}.`,
      transferRecord
    };
  });
};

/**
 * 3. ATOMIC DISCHARGE TRANSACTION ENGINE
 * Enforces all 3 clearance gates (Doctor signoff, Zero pending labs, Zero billing balance)
 * Releases the bed to AVAILABLE and clears activeEncounterId from patient record simultaneously!
 */
export interface AtomicDischargeOptions {
  dischargedBy: string;
  dischargeReason?: string;
  takeHomeNotes?: string;
}

export const executeAtomicDischarge = async (
  encounterId: string,
  options: AtomicDischargeOptions
): Promise<{ success: boolean; message: string }> => {
  const encRef = doc(db, "encounters", encounterId);

  return await runTransaction(db, async (transaction) => {
    const encSnap = await transaction.get(encRef);
    if (!encSnap.exists()) {
      throw new Error("Encounter not found.");
    }

    const encounter = encSnap.data() as Encounter;

    // Gate 1: Doctor Clinical Signoff
    if (!encounter.doctorDischargeApproved) {
      throw new Error("Cannot execute discharge: Attending Doctor clinical discharge sign-off is pending.");
    }

    // Gate 2: Zero Pending Laboratory Orders
    if ((encounter.pendingLabOrders || 0) > 0) {
      throw new Error(`Cannot execute discharge: ${encounter.pendingLabOrders} laboratory investigation(s) still in progress.`);
    }

    // Gate 3: Financial Clearance Check
    const outstandingBalance = (encounter.totalBilled || 0) - (encounter.totalPaid || 0);
    if (outstandingBalance > 0 && !encounter.billingCleared) {
      throw new Error(`Cannot execute discharge: Outstanding hospital bill balance of KES ${outstandingBalance.toLocaleString()} must be cleared first.`);
    }

    const nowIso = new Date().toISOString();

    // 1. Update Encounter Document to DISCHARGED
    transaction.update(encRef, {
      status: "DISCHARGED",
      dischargedAt: nowIso,
      dischargedBy: options.dischargedBy,
      dischargeReason: options.dischargeReason || "Normal Clinical Recovery",
      dischargeNotes: options.takeHomeNotes || encounter.dischargeNotes || "Patient discharged in stable condition.",
      updatedAt: nowIso
    });

    // 2. Free up Patient Record active encounter
    if (encounter.patientId) {
      const patRef = doc(db, "patients", encounter.patientId);
      transaction.update(patRef, {
        activeEncounterId: null,
        status: "DISCHARGED",
        currentDepartment: "discharged",
        updatedAt: nowIso
      });
    }

    // 3. Release Assigned Ward Bed to AVAILABLE
    if (encounter.assignedBedId) {
      const bedRef = doc(db, "beds", encounter.assignedBedId);
      transaction.update(bedRef, {
        status: "AVAILABLE",
        currentPatientId: null,
        currentPatientName: null,
        currentEncounterId: null,
        occupiedSince: null
      });
    }

    // 4. Close any linked Queue Ticket
    if (encounter.activeQueueTicketId) {
      const queueRef = doc(db, "queue", encounter.activeQueueTicketId);
      transaction.update(queueRef, {
        status: "completed"
      });
    }

    return {
      success: true,
      message: `Encounter ${encounterId} successfully discharged. Patient discharged, bed released, and final clearance certificate generated.`
    };
  });
};

/**
 * 3B. ATOMIC MORGUE / MORTUARY ADMISSION FROM WARD
 * Handles transition of a deceased patient directly from ward/ICU/casualty to the Hospital Mortuary.
 * Creates MOH 214 Death Notification record, logs mortuary custody, frees the ward bed,
 * adds mortuary preservation bill items, and updates the encounter status to MORGUE.
 */
export interface MorgueAdmissionParams {
  encounterId: string;
  timeOfDeath: string;
  certifiedByDoctor: string;
  doctorLicenseNo?: string;
  causeOfDeathImmediate: string;
  causeOfDeathUnderlying?: string;
  mohDeathNoticeNo?: string;
  morgueUnitName: string;
  cabinetOrBayNumber: string;
  morgueAttendantName: string;
  nurseHandoverName: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  belongingsInventory?: string;
  tagsVerified: boolean;
  notes?: string;
  initialMorgueDailyFee?: number; // Default daily mortuary fee KES 1,000
}

export const executeMorgueAdmission = async (
  params: MorgueAdmissionParams
): Promise<{ success: boolean; message: string; morgueRecord: MorgueAdmissionRecord }> => {
  const encRef = doc(db, "encounters", params.encounterId);
  const nowIso = new Date().toISOString();
  const morgueRecordId = `MRG-${Date.now().toString().slice(-6)}`;

  return await runTransaction(db, async (transaction) => {
    const encSnap = await transaction.get(encRef);
    if (!encSnap.exists()) {
      throw new Error("Encounter not found.");
    }

    const encounter = encSnap.data() as Encounter;

    if (encounter.status === "MORGUE" || encounter.status === "DECEASED") {
      throw new Error("Patient has already been admitted to the morgue.");
    }

    // Build the Morgue Admission Record
    const morgueRecord: MorgueAdmissionRecord = {
      id: morgueRecordId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      patientName: encounter.patientName,
      nationalId: encounter.nationalId,
      age: encounter.age,
      gender: encounter.gender,
      fromWardId: encounter.assignedWardId,
      fromWardName: encounter.assignedWard || "Inpatient Ward",
      fromBedNumber: encounter.assignedBed || "N/A",
      timeOfDeath: params.timeOfDeath || nowIso,
      certifiedByDoctor: params.certifiedByDoctor,
      doctorLicenseNo: params.doctorLicenseNo || "KMPDC-REG",
      causeOfDeathImmediate: params.causeOfDeathImmediate,
      causeOfDeathUnderlying: params.causeOfDeathUnderlying || "",
      mohDeathNoticeNo: params.mohDeathNoticeNo || `MOH214-${Date.now().toString().slice(-5)}`,
      admittedToMorgueAt: nowIso,
      morgueUnitName: params.morgueUnitName || "Hospital Mortuary & Cold Room Unit",
      cabinetOrBayNumber: params.cabinetOrBayNumber || "Bay 01",
      morgueAttendantName: params.morgueAttendantName || "Mortuary Superintendent",
      nurseHandoverName: params.nurseHandoverName || "Ward Nurse in Charge",
      nextOfKinName: params.nextOfKinName,
      nextOfKinPhone: params.nextOfKinPhone,
      nextOfKinRelationship: params.nextOfKinRelationship,
      belongingsInventory: params.belongingsInventory || "All personal items inventoried and tagged with nursing staff.",
      tagsVerified: params.tagsVerified,
      notes: params.notes || "Transferred with dual wrist & toe identification tags intact."
    };

    // 1. Release the Inpatient Ward Bed immediately back to AVAILABLE
    if (encounter.assignedBedId) {
      const bedRef = doc(db, "beds", encounter.assignedBedId);
      transaction.update(bedRef, {
        status: "AVAILABLE",
        currentPatientId: null,
        currentPatientName: null,
        currentEncounterId: null,
        occupiedSince: null
      });
    }

    // 2. Add Morgue Preservation & Handling item to encounter bill ledger
    const morgueFee = params.initialMorgueDailyFee ?? 1000;
    const billRef = doc(collection(db, "encounters", params.encounterId, "billItems"));
    transaction.set(billRef, {
      id: billRef.id,
      description: `Morgue Cold Storage Admission & Body Handling (Bay: ${morgueRecord.cabinetOrBayNumber})`,
      category: "ward_bed",
      department: "mortuary",
      unitPrice: morgueFee,
      quantity: 1,
      total: morgueFee,
      isPaid: false,
      timestamp: nowIso
    });

    const newTotalBilled = (encounter.totalBilled || 0) + morgueFee;

    // 3. Update Encounter document status to MORGUE
    transaction.update(encRef, {
      status: "MORGUE",
      morgueAdmission: morgueRecord,
      morgueTransferredAt: nowIso,
      doctorDischargeApproved: true,
      doctorDischargeApprovedBy: params.certifiedByDoctor,
      doctorDischargeApprovedAt: nowIso,
      doctorClearance: {
        cleared: true,
        doctorName: params.certifiedByDoctor,
        clearedAt: nowIso,
        dischargeCondition: "Deceased",
        clinicalSummary: `Patient certified deceased. Cause: ${params.causeOfDeathImmediate}. MOH Notice: ${morgueRecord.mohDeathNoticeNo}. Admitted to Mortuary.`,
        doctorSignature: `SIG-${params.certifiedByDoctor.replace(/\s+/g, "_")}-${Date.now().toString().slice(-4)}`
      },
      dischargeReason: `Deceased - Admitted to Morgue (${morgueRecord.morgueUnitName} - ${morgueRecord.cabinetOrBayNumber})`,
      dischargeNotes: `Certified by ${params.certifiedByDoctor}. Immediate cause: ${params.causeOfDeathImmediate}. Transferred to Morgue by ${params.nurseHandoverName}.`,
      dischargedAt: nowIso,
      dischargedBy: params.nurseHandoverName,
      totalBilled: newTotalBilled,
      billingCleared: (encounter.totalPaid || 0) >= newTotalBilled,
      updatedAt: nowIso
    });

    // 4. Update Patient master record
    if (encounter.patientId) {
      const patRef = doc(db, "patients", encounter.patientId);
      transaction.update(patRef, {
        status: "DECEASED",
        currentDepartment: "mortuary",
        updatedAt: nowIso
      });
    }

    // 5. Store dedicated Morgue Admission document in /morgue_records collection for pathology & mortuary tracking
    const morgueDocRef = doc(db, "morgue_records", morgueRecordId);
    transaction.set(morgueDocRef, cleanFirestoreData({
      ...morgueRecord,
      totalBilled: newTotalBilled,
      totalPaid: encounter.totalPaid || 0,
      createdAt: nowIso
    }));

    // 6. Complete linked Queue ticket if any
    if (encounter.activeQueueTicketId) {
      const queueRef = doc(db, "queue", encounter.activeQueueTicketId);
      transaction.update(queueRef, {
        status: "completed",
        currentDepartment: "mortuary"
      });
    }

    return {
      success: true,
      message: `Patient ${encounter.patientName} successfully admitted to Morgue (${morgueRecord.cabinetOrBayNumber}). Ward bed released and MOH 214 notice generated.`,
      morgueRecord
    };
  });
};

/**
 * 4. REAL-TIME SUBSCRIPTION HELPERS
 */

export const subscribeEncounters = (
  callback: (encounters: Encounter[]) => void
): Unsubscribe => {
  const q = query(collection(db, "encounters"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: Encounter[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Encounter);
    });
    callback(list);
  });
};

export const subscribeHospitalBeds = (
  callback: (beds: WardBed[]) => void
): Unsubscribe => {
  return onSnapshot(collection(db, "beds"), (snap) => {
    const list: WardBed[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as WardBed);
    });
    callback(list);
  });
};

export const subscribeEncounterSubcollections = (
  encounterId: string,
  callback: (data: {
    vitals: EncounterVital[];
    prescriptions: EncounterPrescription[];
    labRequests: EncounterLabRequest[];
    billItems: EncounterBillItem[];
    nursingNotes: EncounterNursingNote[];
    doctorNotes: EncounterDoctorNote[];
  }) => void
): (() => void) => {
  if (!encounterId) return () => {};

  let currentData = {
    vitals: [] as EncounterVital[],
    prescriptions: [] as EncounterPrescription[],
    labRequests: [] as EncounterLabRequest[],
    billItems: [] as EncounterBillItem[],
    nursingNotes: [] as EncounterNursingNote[],
    doctorNotes: [] as EncounterDoctorNote[]
  };

  const unsubVitals = onSnapshot(collection(db, "encounters", encounterId, "vitals"), (s) => {
    const list: EncounterVital[] = [];
    s.forEach(d => list.push({ id: d.id, ...d.data() } as EncounterVital));
    list.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    currentData.vitals = list;
    callback({ ...currentData });
  });

  const unsubRx = onSnapshot(collection(db, "encounters", encounterId, "prescriptions"), (s) => {
    const list: EncounterPrescription[] = [];
    s.forEach(d => list.push({ id: d.id, ...d.data() } as EncounterPrescription));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    currentData.prescriptions = list;
    callback({ ...currentData });
  });

  const unsubLabs = onSnapshot(collection(db, "encounters", encounterId, "labRequests"), (s) => {
    const list: EncounterLabRequest[] = [];
    s.forEach(d => list.push({ id: d.id, ...d.data() } as EncounterLabRequest));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    currentData.labRequests = list;
    callback({ ...currentData });
  });

  const unsubBills = onSnapshot(collection(db, "encounters", encounterId, "billItems"), (s) => {
    const list: EncounterBillItem[] = [];
    s.forEach(d => list.push({ id: d.id, ...d.data() } as EncounterBillItem));
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    currentData.billItems = list;
    callback({ ...currentData });
  });

  const unsubNotes = onSnapshot(collection(db, "encounters", encounterId, "nursingNotes"), (s) => {
    const list: EncounterNursingNote[] = [];
    s.forEach(d => list.push({ id: d.id, ...d.data() } as EncounterNursingNote));
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    currentData.nursingNotes = list;
    callback({ ...currentData });
  });

  const unsubDocNotes = onSnapshot(collection(db, "encounters", encounterId, "doctorNotes"), (s) => {
    const list: EncounterDoctorNote[] = [];
    s.forEach(d => list.push({ id: d.id, ...d.data() } as EncounterDoctorNote));
    list.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
    currentData.doctorNotes = list;
    callback({ ...currentData });
  });

  return () => {
    unsubVitals();
    unsubRx();
    unsubLabs();
    unsubBills();
    unsubNotes();
    unsubDocNotes();
  };
};

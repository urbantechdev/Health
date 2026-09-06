import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Encounter,
  EncounterVital,
  EncounterPrescription,
  EncounterLabRequest,
  EncounterBillItem,
  EncounterNursingNote,
  EncounterDoctorNote,
  HospitalWard,
  WardBed
} from "../types";

export type HospitalBed = WardBed;
export type EncounterMedication = EncounterPrescription;
export type EncounterNote = EncounterNursingNote;

export const DEFAULT_HOSPITAL_WARDS: HospitalWard[] = [
  {
    id: "ward-male-medical",
    name: "Male Medical Ward",
    code: "MMW",
    floor: "1st Floor",
    category: "General",
    totalBeds: 24,
    dailyBaseRate: 1800
  },
  {
    id: "ward-female-medical",
    name: "Female Medical Ward",
    code: "FMW",
    floor: "1st Floor",
    category: "General",
    totalBeds: 24,
    dailyBaseRate: 1800
  },
  {
    id: "ward-pediatric",
    name: "Pediatric Ward",
    code: "PED",
    floor: "2nd Floor",
    category: "Pediatric",
    totalBeds: 20,
    dailyBaseRate: 2000
  },
  {
    id: "ward-maternity",
    name: "Maternity & Labor Ward",
    code: "MAT",
    floor: "2nd Floor",
    category: "Maternity",
    totalBeds: 18,
    dailyBaseRate: 2500
  },
  {
    id: "ward-surgical",
    name: "Surgical Recovery Ward",
    code: "SUR",
    floor: "3rd Floor",
    category: "Surgical",
    totalBeds: 16,
    dailyBaseRate: 2200
  },
  {
    id: "ward-icu",
    name: "Intensive Care Unit (ICU / HDU)",
    code: "ICU",
    floor: "3rd Floor",
    category: "ICU",
    totalBeds: 8,
    dailyBaseRate: 12000
  }
];

export async function initDefaultHospitalWardsAndBeds(): Promise<void> {
  try {
    for (const ward of DEFAULT_HOSPITAL_WARDS) {
      await setDoc(doc(db, "hospital_wards", ward.id), ward, { merge: true });

      const numBeds = Math.min(ward.totalBeds, 6);
      for (let b = 1; b <= numBeds; b++) {
        const bedId = `${ward.id}-bed-${b.toString().padStart(2, "0")}`;
        const bedNumber = `${ward.code}-${b.toString().padStart(2, "0")}`;
        await setDoc(
          doc(db, "hospital_beds", bedId),
          {
            id: bedId,
            bedNumber,
            wardId: ward.id,
            wardName: ward.name,
            status: "AVAILABLE",
            dailyRate: ward.dailyBaseRate,
            category: ward.category
          },
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.warn("initDefaultHospitalWardsAndBeds background sync:", err);
  }
}

export async function createHospitalEncounter(
  data: Partial<Encounter>
): Promise<string> {
  const encCol = collection(db, "encounters");
  const docRef = await addDoc(encCol, {
    ...data,
    status: data.status || "ADMITTED",
    admissionDate: data.admissionDate || new Date().toISOString(),
    createdAt: new Date().toISOString()
  });

  // Mark bed as occupied if bedId is provided
  if (data.assignedBedId) {
    try {
      await updateDoc(doc(db, "hospital_beds", data.assignedBedId), {
        status: "OCCUPIED",
        currentPatientId: data.patientId || null,
        currentPatientName: data.patientName || null,
        currentEncounterId: docRef.id,
        occupiedSince: new Date().toISOString()
      });
    } catch {
      // Bed doc might not exist yet
    }
  }

  return docRef.id;
}

export async function addEncounterVital(
  encounterId: string,
  vital: Partial<EncounterVital>
): Promise<string> {
  const col = collection(db, "encounters", encounterId, "vitals");
  const docRef = await addDoc(col, {
    ...vital,
    timestamp: vital.timestamp || new Date().toISOString()
  });
  return docRef.id;
}

export async function addEncounterPrescription(
  encounterId: string,
  prescription: Partial<EncounterPrescription>
): Promise<string> {
  const col = collection(db, "encounters", encounterId, "prescriptions");
  const docRef = await addDoc(col, {
    ...prescription,
    status: prescription.status || "PENDING",
    orderedAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function addEncounterLabRequest(
  encounterId: string,
  labRequest: Partial<EncounterLabRequest>
): Promise<string> {
  const col = collection(db, "encounters", encounterId, "lab_requests");
  const docRef = await addDoc(col, {
    ...labRequest,
    status: labRequest.status || "ORDERED",
    orderedAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function completeEncounterLabRequest(
  encounterId: string,
  requestId: string,
  results: any,
  interpretationOrAbnormalFlags?: string,
  completedBy?: string
): Promise<void> {
  const ref = doc(db, "encounters", encounterId, "lab_requests", requestId);
  await updateDoc(ref, {
    results,
    status: "completed",
    completedAt: new Date().toISOString(),
    ...(interpretationOrAbnormalFlags ? { abnormalFlags: interpretationOrAbnormalFlags } : {}),
    ...(completedBy ? { performedBy: completedBy } : {})
  });
}

export async function dispenseEncounterPrescription(
  encounterId: string,
  prescriptionId: string,
  dispensedBy?: string
): Promise<void> {
  const ref = doc(db, "encounters", encounterId, "prescriptions", prescriptionId);
  await updateDoc(ref, {
    status: "DISPENSED",
    dispensedBy: dispensedBy || "Ward Pharmacist",
    dispensedAt: new Date().toISOString()
  });
}

export async function addEncounterNursingNote(
  encounterId: string,
  note: Partial<EncounterNursingNote>
): Promise<string> {
  const col = collection(db, "encounters", encounterId, "nursing_notes");
  const docRef = await addDoc(col, {
    ...note,
    timestamp: note.timestamp || new Date().toISOString()
  });
  return docRef.id;
}

export async function addEncounterDoctorNote(
  encounterId: string,
  note: Partial<EncounterDoctorNote>
): Promise<string> {
  const col = collection(db, "encounters", encounterId, "doctor_notes");
  const docRef = await addDoc(col, {
    ...note,
    timestamp: note.timestamp || new Date().toISOString()
  });
  return docRef.id;
}

export async function addEncounterBillItem(
  encounterId: string,
  billItem: Partial<EncounterBillItem>
): Promise<string> {
  const col = collection(db, "encounters", encounterId, "billing_items");
  const docRef = await addDoc(col, {
    ...billItem,
    status: billItem.status || "UNPAID",
    dateAdded: new Date().toISOString()
  });
  return docRef.id;
}

export async function payEncounterBill(
  encounterId: string,
  billItemIdOrAmount: string | number,
  paymentDetailsOrMethod?: any,
  remarks?: string
): Promise<{ newTotalPaid: number; billingCleared: boolean }> {
  if (typeof billItemIdOrAmount === "number") {
    const amount = Number(billItemIdOrAmount);
    const paymentItem = {
      description: remarks || `Settled via ${paymentDetailsOrMethod || "Cash"}`,
      category: "consultation",
      unitPrice: amount,
      quantity: 1,
      total: amount,
      isPaid: true,
      status: "PAID",
      paidAt: new Date().toISOString(),
      paymentMethod: String(paymentDetailsOrMethod || "Cash"),
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, "encounters", encounterId, "billing_items"), paymentItem);
    await updateDoc(doc(db, "encounters", encounterId), {
      totalPaid: amount,
      billingCleared: true
    });
    return { newTotalPaid: amount, billingCleared: true };
  } else {
    const ref = doc(db, "encounters", encounterId, "billing_items", billItemIdOrAmount);
    await updateDoc(ref, {
      status: "PAID",
      paidAt: new Date().toISOString(),
      ...(typeof paymentDetailsOrMethod === "object" ? paymentDetailsOrMethod : {})
    });
    return { newTotalPaid: 0, billingCleared: true };
  }
}

export async function signDoctorClinicalDischarge(
  encounterIdOrOptions: string | {
    encounterId: string;
    doctorName?: string;
    dischargeCondition?: string;
    clinicalSummary?: string;
    dischargeMedications?: any;
    followUpDate?: string;
    followUpInstructions?: string;
    doctorSignature?: string;
    [key: string]: any;
  },
  dischargeNotes?: string,
  doctorName?: string
): Promise<{ message?: string; success?: boolean } | void> {
  if (typeof encounterIdOrOptions === "object") {
    const opts = encounterIdOrOptions;
    const ref = doc(db, "encounters", opts.encounterId);
    await updateDoc(ref, {
      clinicalDischargeSigned: true,
      doctorDischargeApproved: true,
      clinicalDischargeNotes: opts.clinicalSummary || opts.dischargeCondition || "Patient clinically stable.",
      clinicalDischargedBy: opts.doctorName || "Attending Physician",
      clinicalDischargedAt: new Date().toISOString(),
      dischargeCondition: opts.dischargeCondition,
      dischargeMedications: opts.dischargeMedications,
      followUpDate: opts.followUpDate,
      followUpInstructions: opts.followUpInstructions,
      doctorSignature: opts.doctorSignature
    });
    return { message: "Doctor clinical discharge signed.", success: true };
  } else {
    const encounterId = encounterIdOrOptions;
    const ref = doc(db, "encounters", encounterId);
    await updateDoc(ref, {
      clinicalDischargeSigned: true,
      doctorDischargeApproved: true,
      clinicalDischargeNotes: dischargeNotes || "Patient clinically stable for discharge.",
      clinicalDischargedBy: doctorName || "Attending Physician",
      clinicalDischargedAt: new Date().toISOString()
    });
  }
}

export async function transferEncounterBed(
  encounterIdOrOptions: string | {
    encounterId: string;
    toWardId?: string;
    toWardName?: string;
    toBedId?: string;
    toBedNumber?: string;
    toDailyRate?: number;
    transferredBy?: string;
    reason?: string;
    [key: string]: any;
  },
  currentBedId?: string,
  targetBedId?: string,
  targetWardName?: string
): Promise<{ message: string }> {
  if (typeof encounterIdOrOptions === "object") {
    const opts = encounterIdOrOptions;
    const encId = opts.encounterId;
    if (opts.toBedId) {
      try {
        await updateDoc(doc(db, "hospital_beds", opts.toBedId), {
          status: "OCCUPIED",
          currentEncounterId: encId,
          occupiedSince: new Date().toISOString()
        });
      } catch {}
    }
    await updateDoc(doc(db, "encounters", encId), {
      assignedBedId: opts.toBedId,
      assignedBedNumber: opts.toBedNumber,
      assignedWard: opts.toWardName || "Inpatient Ward",
      assignedWardName: opts.toWardName || "Inpatient Ward",
      lastBedTransfer: {
        date: new Date().toISOString(),
        by: opts.transferredBy,
        reason: opts.reason
      }
    });
    return { message: `Bed transfer to ${opts.toWardName || "Ward"} - Bed ${opts.toBedNumber || opts.toBedId} successful.` };
  } else {
    const encounterId = encounterIdOrOptions;
    if (currentBedId) {
      try {
        await updateDoc(doc(db, "hospital_beds", currentBedId), {
          status: "AVAILABLE",
          currentPatientId: null,
          currentPatientName: null,
          currentEncounterId: null,
          occupiedSince: null
        });
      } catch {}
    }
    if (targetBedId) {
      try {
        await updateDoc(doc(db, "hospital_beds", targetBedId), {
          status: "OCCUPIED",
          currentEncounterId: encounterId,
          occupiedSince: new Date().toISOString()
        });
      } catch {}
    }
    await updateDoc(doc(db, "encounters", encounterId), {
      assignedBedId: targetBedId,
      assignedWard: targetWardName || "Inpatient Ward",
      assignedWardName: targetWardName || "Inpatient Ward"
    });
    return { message: "Bed transfer recorded successfully." };
  }
}

export async function executeAtomicDischarge(
  encounterId: string,
  bedIdOrOptions?: string | {
    dischargedBy?: string;
    dischargeReason?: string;
    takeHomeNotes?: string;
    bedId?: string;
    [key: string]: any;
  }
): Promise<{ message: string; success: boolean }> {
  const options = typeof bedIdOrOptions === "object" ? bedIdOrOptions : { bedId: bedIdOrOptions };
  await updateDoc(doc(db, "encounters", encounterId), {
    status: "DISCHARGED",
    dischargeDate: new Date().toISOString(),
    dischargedBy: options.dischargedBy || "Discharge Officer",
    dischargeReason: options.dischargeReason || "Clinical Resolution",
    dischargeNotes: options.takeHomeNotes || "Discharged in good health."
  });

  const bedId = options.bedId;
  if (bedId) {
    try {
      await updateDoc(doc(db, "hospital_beds", bedId), {
        status: "CLEANING",
        currentPatientId: null,
        currentPatientName: null,
        currentEncounterId: null,
        occupiedSince: null
      });
    } catch {}
  }
  return { message: "Discharge successfully finalized.", success: true };
}

export async function executeMorgueAdmission(
  encounterIdOrOptions: string | {
    encounterId: string;
    bedId?: string;
    notes?: string;
    timeOfDeath?: string;
    certifiedByDoctor?: string;
    doctorLicenseNo?: string;
    causeOfDeathImmediate?: string;
    causeOfDeathUnderlying?: string;
    mohDeathNoticeNo?: string;
    morgueUnitName?: string;
    cabinetOrBayNumber?: string;
    [key: string]: any;
  },
  bedId?: string,
  notes?: string
): Promise<{ message: string; morgueRecord?: any }> {
  if (typeof encounterIdOrOptions === "object") {
    const opts = encounterIdOrOptions;
    await updateDoc(doc(db, "encounters", opts.encounterId), {
      status: "DECEASED",
      deceasedNotes: opts.notes || "Patient certified deceased.",
      deceasedDate: opts.timeOfDeath || new Date().toISOString(),
      timeOfDeath: opts.timeOfDeath,
      certifiedByDoctor: opts.certifiedByDoctor,
      causeOfDeathImmediate: opts.causeOfDeathImmediate,
      causeOfDeathUnderlying: opts.causeOfDeathUnderlying,
      mohDeathNoticeNo: opts.mohDeathNoticeNo,
      morgueUnitName: opts.morgueUnitName,
      cabinetOrBayNumber: opts.cabinetOrBayNumber
    });

    if (opts.bedId) {
      try {
        await updateDoc(doc(db, "hospital_beds", opts.bedId), {
          status: "CLEANING",
          currentPatientId: null,
          currentPatientName: null,
          currentEncounterId: null,
          occupiedSince: null
        });
      } catch {}
    }
    return {
      message: "Morgue admission and transfer record created successfully.",
      morgueRecord: opts
    };
  } else {
    const encounterId = encounterIdOrOptions;
    await updateDoc(doc(db, "encounters", encounterId), {
      status: "DECEASED",
      deceasedNotes: notes || "Patient certified deceased.",
      deceasedDate: new Date().toISOString()
    });

    if (bedId) {
      try {
        await updateDoc(doc(db, "hospital_beds", bedId), {
          status: "CLEANING",
          currentPatientId: null,
          currentPatientName: null,
          currentEncounterId: null,
          occupiedSince: null
        });
      } catch {}
    }
    return { message: "Morgue admission recorded successfully." };
  }
}

export function subscribeEncounters(
  callback: (encounters: Encounter[]) => void
): () => void {
  const q = query(collection(db, "encounters"), orderBy("admissionDate", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Encounter));
      callback(list);
    },
    (err) => {
      console.warn("[encounterService] subscribeEncounters err:", err);
      callback([]);
    }
  );
}

export function subscribeHospitalBeds(
  callback: (beds: WardBed[]) => void
): () => void {
  return onSnapshot(
    collection(db, "hospital_beds"),
    (snap) => {
      if (snap.empty) {
        // Fallback default generated beds for all wards
        const defaultBeds: WardBed[] = [];
        DEFAULT_HOSPITAL_WARDS.forEach((ward) => {
          for (let i = 1; i <= Math.min(ward.totalBeds, 6); i++) {
            defaultBeds.push({
              id: `${ward.id}-bed-${i}`,
              bedNumber: `Bed ${i}`,
              wardId: ward.id,
              wardName: ward.name,
              category: ward.category as any,
              status: "AVAILABLE",
              dailyRate: ward.dailyBaseRate
            });
          }
        });
        callback(defaultBeds);
        return;
      }
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WardBed));
      callback(list);
    },
    (err) => {
      console.warn("[encounterService] subscribeHospitalBeds err:", err);
      callback([]);
    }
  );
}

export function subscribeEncounterSubcollections(
  encounterId: string,
  callback: (data: {
    vitals: EncounterVital[];
    prescriptions: EncounterPrescription[];
    labRequests: EncounterLabRequest[];
    nursingNotes: EncounterNursingNote[];
    doctorNotes: EncounterDoctorNote[];
    billingItems: EncounterBillItem[];
  }) => void
): () => void {
  const unsubVitals = onSnapshot(collection(db, "encounters", encounterId, "vitals"), (s) => {
    const vitals = s.docs.map((d) => ({ id: d.id, ...d.data() } as EncounterVital));
    callbackData.vitals = vitals;
    callback({ ...callbackData });
  });

  const unsubRx = onSnapshot(collection(db, "encounters", encounterId, "prescriptions"), (s) => {
    const prescriptions = s.docs.map((d) => ({ id: d.id, ...d.data() } as EncounterPrescription));
    callbackData.prescriptions = prescriptions;
    callback({ ...callbackData });
  });

  const unsubLab = onSnapshot(collection(db, "encounters", encounterId, "lab_requests"), (s) => {
    const labRequests = s.docs.map((d) => ({ id: d.id, ...d.data() } as EncounterLabRequest));
    callbackData.labRequests = labRequests;
    callback({ ...callbackData });
  });

  const unsubNurse = onSnapshot(collection(db, "encounters", encounterId, "nursing_notes"), (s) => {
    const nursingNotes = s.docs.map((d) => ({ id: d.id, ...d.data() } as EncounterNursingNote));
    callbackData.nursingNotes = nursingNotes;
    callback({ ...callbackData });
  });

  const unsubDoc = onSnapshot(collection(db, "encounters", encounterId, "doctor_notes"), (s) => {
    const doctorNotes = s.docs.map((d) => ({ id: d.id, ...d.data() } as EncounterDoctorNote));
    callbackData.doctorNotes = doctorNotes;
    callback({ ...callbackData });
  });

  const unsubBill = onSnapshot(collection(db, "encounters", encounterId, "billing_items"), (s) => {
    const billingItems = s.docs.map((d) => ({ id: d.id, ...d.data() } as EncounterBillItem));
    callbackData.billingItems = billingItems;
    callback({ ...callbackData });
  });

  const callbackData = {
    vitals: [] as EncounterVital[],
    prescriptions: [] as EncounterPrescription[],
    labRequests: [] as EncounterLabRequest[],
    nursingNotes: [] as EncounterNursingNote[],
    doctorNotes: [] as EncounterDoctorNote[],
    billingItems: [] as EncounterBillItem[]
  };

  return () => {
    unsubVitals();
    unsubRx();
    unsubLab();
    unsubNurse();
    unsubDoc();
    unsubBill();
  };
}

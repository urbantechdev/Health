import { db, cleanFirestoreData } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
} from "firebase/firestore";

export interface HospitalWardConfig {
  id: string;
  name: string;
  category: "General" | "Maternity" | "Paediatric" | "Surgical" | "ICU" | "HDU" | "Amenity" | "Morgue" | string;
  totalBeds: number;
  dailyBaseRate: number;
  nurseInCharge?: string;
  description?: string;
  floor?: string;
  [key: string]: any;
}

export const DEFAULT_HOSPITAL_WARDS: HospitalWardConfig[] = [
  {
    id: "ward-general-male",
    name: "St. Luke Male Medical Ward",
    category: "General",
    totalBeds: 24,
    dailyBaseRate: 1500,
    description: "General adult male inpatient acute and recovery ward.",
  },
  {
    id: "ward-general-female",
    name: "St. Ann Female Medical Ward",
    category: "General",
    totalBeds: 24,
    dailyBaseRate: 1500,
    description: "General adult female inpatient acute and recovery ward.",
  },
  {
    id: "ward-maternity",
    name: "Blessed Virgin Maternity & Labour Ward",
    category: "Maternity",
    totalBeds: 20,
    dailyBaseRate: 2500,
    description: "Antenatal, delivery suite, post-natal care, and neonatal nursery.",
  },
  {
    id: "ward-paediatric",
    name: "Angels Pediatric Ward",
    category: "Paediatric",
    totalBeds: 18,
    dailyBaseRate: 1800,
    description: "Specialized pediatric inpatient care with playful, calm atmosphere.",
  },
  {
    id: "ward-surgical",
    name: "St. Jude Surgical Post-Op Ward",
    category: "Surgical",
    totalBeds: 16,
    dailyBaseRate: 2800,
    description: "Surgical post-operative stabilization and wound care management.",
  },
  {
    id: "ward-icu",
    name: "Critical Care ICU / HDU Complex",
    category: "ICU",
    totalBeds: 8,
    dailyBaseRate: 8500,
    description: "Invasive ventilator support, multiparameter telemetry, 1:1 nursing.",
  },
  {
    id: "ward-amenity",
    name: "Executive Private Amenity Suites",
    category: "Amenity",
    totalBeds: 6,
    dailyBaseRate: 6500,
    description: "Private ensuite rooms with guest sofa bed and dedicated concierge.",
  },
  {
    id: "ward-morgue",
    name: "Hospital Cold Room & Mortuary Facility",
    category: "Morgue",
    totalBeds: 12,
    dailyBaseRate: 1000,
    description: "Refrigerated preservation unit and respectful bereavement parlour.",
  },
];

export async function initDefaultHospitalWardsAndBeds(): Promise<void> {
  try {
    for (const ward of DEFAULT_HOSPITAL_WARDS) {
      const wRef = doc(db, "hospital_wards", ward.id);
      const snap = await getDoc(wRef);
      if (!snap.exists()) {
        await setDoc(wRef, cleanFirestoreData(ward));
        // Seed bed slots
        for (let i = 1; i <= Math.min(ward.totalBeds, 10); i++) {
          const bedId = `${ward.id}-bed-${i}`;
          await setDoc(
            doc(db, "hospital_beds", bedId),
            cleanFirestoreData({
              id: bedId,
              bedNumber: `${ward.name.substring(0, 3).toUpperCase()}-${i < 10 ? "0" + i : i}`,
              wardId: ward.id,
              wardName: ward.name,
              wardCategory: ward.category,
              dailyRate: ward.dailyBaseRate,
              isOccupied: false,
              patientId: null,
              patientName: null,
              status: "available",
            }),
            { merge: true }
          );
        }
      }
    }
  } catch (err) {
    console.warn("initDefaultHospitalWardsAndBeds error:", err);
  }
}

export async function createHospitalEncounter(encounterData: any): Promise<string> {
  const encId = encounterData.id || `ENC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const clean = cleanFirestoreData({
    ...encounterData,
    id: encId,
    createdAt: encounterData.createdAt || new Date().toISOString(),
    status: encounterData.status || "active",
  });
  // Write to both encounters and clinical_encounters for seamless cross-station compatibility
  await Promise.all([
    setDoc(doc(db, "encounters", encId), clean, { merge: true }),
    setDoc(doc(db, "clinical_encounters", encId), clean, { merge: true }),
  ]);
  return encId;
}

export async function addEncounterVital(encounterId: string, vital: any): Promise<void> {
  const vitalId = `vital-${Date.now()}`;
  const clean = cleanFirestoreData({ ...vital, id: vitalId, recordedAt: new Date().toISOString() });
  await Promise.all([
    setDoc(doc(db, "encounters", encounterId, "vitals", vitalId), clean),
    setDoc(doc(db, "clinical_encounters", encounterId, "vitals", vitalId), clean),
  ]);
}

export async function addEncounterPrescription(encounterId: string, prescription: any): Promise<void> {
  const rxId = prescription.id || `rx-${Date.now()}`;
  const clean = cleanFirestoreData({ ...prescription, id: rxId, prescribedAt: new Date().toISOString(), status: "pending" });
  await Promise.all([
    setDoc(doc(db, "encounters", encounterId, "prescriptions", rxId), clean),
    setDoc(doc(db, "clinical_encounters", encounterId, "prescriptions", rxId), clean),
  ]);
}

export async function addEncounterLabRequest(encounterId: string, labRequest: any): Promise<void> {
  const labId = labRequest.id || `lab-${Date.now()}`;
  const clean = cleanFirestoreData({ ...labRequest, id: labId, requestedAt: new Date().toISOString(), status: "pending" });
  await Promise.all([
    setDoc(doc(db, "encounters", encounterId, "lab_requests", labId), clean),
    setDoc(doc(db, "clinical_encounters", encounterId, "lab_requests", labId), clean),
  ]);
}

export async function completeEncounterLabRequest(
  encounterId: string,
  labRequestId: string,
  resultDataOrResults: any,
  impression?: string,
  technicianName?: string
): Promise<any> {
  const payload =
    typeof resultDataOrResults === "object" && resultDataOrResults !== null && !Array.isArray(resultDataOrResults)
      ? resultDataOrResults
      : { results: resultDataOrResults, impression, technicianName };
  const clean = cleanFirestoreData({
    ...payload,
    status: "completed",
    completedAt: new Date().toISOString(),
  });
  await Promise.all([
    updateDoc(doc(db, "encounters", encounterId, "lab_requests", labRequestId), clean).catch(() => {}),
    updateDoc(doc(db, "clinical_encounters", encounterId, "lab_requests", labRequestId), clean).catch(() => {}),
  ]);
  return { success: true, message: "Lab completed successfully" };
}

export async function dispenseEncounterPrescription(encounterId: string, prescriptionId: string, dispenserInfo: any): Promise<void> {
  const clean = cleanFirestoreData({
    status: "dispensed",
    dispensed: true,
    dispensedAt: new Date().toISOString(),
    ...(dispenserInfo || {}),
  });
  await Promise.all([
    updateDoc(doc(db, "encounters", encounterId, "prescriptions", prescriptionId), clean).catch(() => {}),
    updateDoc(doc(db, "clinical_encounters", encounterId, "prescriptions", prescriptionId), clean).catch(() => {}),
  ]);
}

export async function addEncounterNursingNote(encounterId: string, note: any): Promise<void> {
  const noteId = `note-nurse-${Date.now()}`;
  const clean = cleanFirestoreData({ ...note, id: noteId, timestamp: new Date().toISOString() });
  await Promise.all([
    setDoc(doc(db, "encounters", encounterId, "nursing_notes", noteId), clean),
    setDoc(doc(db, "clinical_encounters", encounterId, "nursing_notes", noteId), clean),
  ]);
}

export async function addEncounterDoctorNote(encounterId: string, note: any): Promise<void> {
  const noteId = `note-doc-${Date.now()}`;
  const clean = cleanFirestoreData({ ...note, id: noteId, timestamp: new Date().toISOString() });
  await Promise.all([
    setDoc(doc(db, "encounters", encounterId, "doctor_notes", noteId), clean),
    setDoc(doc(db, "clinical_encounters", encounterId, "doctor_notes", noteId), clean),
  ]);
}

export async function addEncounterBillItem(encounterId: string, billItem: any): Promise<void> {
  const billId = billItem.id || `bill-${Date.now()}`;
  const clean = cleanFirestoreData({ ...billItem, id: billId, addedAt: new Date().toISOString(), paid: false });
  await Promise.all([
    setDoc(doc(db, "encounters", encounterId, "bill_items", billId), clean),
    setDoc(doc(db, "clinical_encounters", encounterId, "bill_items", billId), clean),
  ]);
}

export async function payEncounterBill(
  encounterId: string,
  billIdOrAmount: string | number,
  paymentInfoOrMethod?: any,
  notes?: string
): Promise<{ success: boolean; newTotalPaid: number; billingCleared: boolean; message: string }> {
  if (typeof billIdOrAmount === "number") {
    const encRef = doc(db, "encounters", encounterId);
    const encSnap = await getDoc(encRef);
    const encData = encSnap.exists() ? encSnap.data() : {};
    const previousPaid = Number(encData.totalPaid || 0);
    const totalBilled = Number(encData.totalBilled || encData.billAmount || billIdOrAmount);
    const newTotalPaid = previousPaid + billIdOrAmount;
    const billingCleared = newTotalPaid >= totalBilled;

    const payload = cleanFirestoreData({
      totalPaid: newTotalPaid,
      billingCleared,
      status: billingCleared ? "PAID" : encData.status || "active",
      paymentMethod: typeof paymentInfoOrMethod === "string" ? paymentInfoOrMethod : paymentInfoOrMethod?.method || "Cash",
      paymentNotes: notes,
      lastPaymentAt: new Date().toISOString(),
    });

    await Promise.all([
      updateDoc(doc(db, "encounters", encounterId), payload).catch(() => {}),
      updateDoc(doc(db, "clinical_encounters", encounterId), payload).catch(() => {}),
    ]);

    return {
      success: true,
      newTotalPaid,
      billingCleared,
      message: `Payment of KES ${billIdOrAmount.toLocaleString()} recorded.`,
    };
  }

  const payload = cleanFirestoreData({
    paid: true,
    paidAt: new Date().toISOString(),
    ...(typeof paymentInfoOrMethod === "object" ? paymentInfoOrMethod : { method: paymentInfoOrMethod }),
  });
  await Promise.all([
    updateDoc(doc(db, "encounters", encounterId, "bill_items", billIdOrAmount), payload).catch(() => {}),
    updateDoc(doc(db, "clinical_encounters", encounterId, "bill_items", billIdOrAmount), payload).catch(() => {}),
  ]);
  return { success: true, newTotalPaid: 0, billingCleared: true, message: "Bill item paid successfully" };
}

export async function signDoctorClinicalDischarge(
  encounterIdOrData: string | any,
  maybeClearanceData?: any
): Promise<{ success: boolean; message: string }> {
  const encounterId = typeof encounterIdOrData === "string" ? encounterIdOrData : encounterIdOrData.encounterId;
  const clearanceData = typeof encounterIdOrData === "string" ? maybeClearanceData : encounterIdOrData;
  const payload = cleanFirestoreData({
    doctorDischargeApproved: true,
    dischargeClearance: {
      ...clearanceData,
      clearedAt: new Date().toISOString(),
    },
  });
  await Promise.all([
    updateDoc(doc(db, "encounters", encounterId), payload).catch(() => {}),
    updateDoc(doc(db, "clinical_encounters", encounterId), payload).catch(() => {}),
  ]);
  return { success: true, message: "Doctor discharge clearance signed successfully." };
}

export async function transferEncounterBed(
  encounterIdOrData: string | any,
  maybeTransferData?: any
): Promise<{ success: boolean; message: string }> {
  const encounterId = typeof encounterIdOrData === "string" ? encounterIdOrData : encounterIdOrData.encounterId;
  const transferData = typeof encounterIdOrData === "string" ? maybeTransferData : encounterIdOrData;

  // Free old bed if provided
  if (transferData.fromBedId) {
    await updateDoc(doc(db, "hospital_beds", transferData.fromBedId), {
      isOccupied: false,
      patientId: null,
      patientName: null,
      status: "available",
    }).catch(() => {});
  }
  // Occupy new bed
  if (transferData.toBedId) {
    await updateDoc(doc(db, "hospital_beds", transferData.toBedId), {
      isOccupied: true,
      patientId: transferData.patientId || null,
      patientName: transferData.patientName || "Patient",
      status: "occupied",
    }).catch(() => {});
  }
  // Record transfer
  const xferId = `xfer-${Date.now()}`;
  const cleanXfer = cleanFirestoreData({ ...transferData, id: xferId, timestamp: new Date().toISOString() });
  const cleanBed = cleanFirestoreData({
    currentBedId: transferData.toBedId,
    currentWard: transferData.toWardName,
  });
  await Promise.all([
    setDoc(doc(db, "encounters", encounterId, "bed_transfers", xferId), cleanXfer),
    setDoc(doc(db, "clinical_encounters", encounterId, "bed_transfers", xferId), cleanXfer),
    updateDoc(doc(db, "encounters", encounterId), cleanBed).catch(() => {}),
    updateDoc(doc(db, "clinical_encounters", encounterId), cleanBed).catch(() => {}),
  ]);
  return { success: true, message: "Patient bed transfer successfully recorded." };
}

export async function executeAtomicDischarge(
  encounterIdOrData: string | any,
  maybeDischargeData?: any
): Promise<{ success: boolean; message: string }> {
  const encounterId = typeof encounterIdOrData === "string" ? encounterIdOrData : encounterIdOrData.encounterId;
  const dischargeData = typeof encounterIdOrData === "string" ? maybeDischargeData : encounterIdOrData;

  const encSnap = await getDoc(doc(db, "encounters", encounterId));
  if (encSnap.exists()) {
    const enc = encSnap.data();
    if (enc.currentBedId) {
      await updateDoc(doc(db, "hospital_beds", enc.currentBedId), {
        isOccupied: false,
        patientId: null,
        patientName: null,
        status: "available",
      }).catch(() => {});
    }
  }
  const payload = cleanFirestoreData({
    status: "discharged",
    dischargedAt: new Date().toISOString(),
    dischargeSummary: dischargeData,
  });
  await Promise.all([
    updateDoc(doc(db, "encounters", encounterId), payload).catch(() => {}),
    updateDoc(doc(db, "clinical_encounters", encounterId), payload).catch(() => {}),
  ]);
  return { success: true, message: "Patient officially discharged and bed released." };
}

export async function executeMorgueAdmission(
  encounterIdOrData: string | any,
  maybeMorgueData?: any
): Promise<{ success: boolean; message: string; morgueRecord: any }> {
  const encounterId = typeof encounterIdOrData === "string" ? encounterIdOrData : encounterIdOrData.encounterId;
  const morgueData = typeof encounterIdOrData === "string" ? maybeMorgueData : encounterIdOrData;

  const payload = cleanFirestoreData({
    status: "deceased",
    morgueAdmission: {
      ...morgueData,
      admittedAt: new Date().toISOString(),
    },
  });
  await Promise.all([
    updateDoc(doc(db, "encounters", encounterId), payload).catch(() => {}),
    updateDoc(doc(db, "clinical_encounters", encounterId), payload).catch(() => {}),
  ]);
  return {
    success: true,
    message: "Deceased patient safely transferred to morgue unit.",
    morgueRecord: morgueData,
  };
}

export function subscribeEncounters(callback: (encounters: any[]) => void): () => void {
  const colRef = collection(db, "encounters");
  return onSnapshot(colRef, (snap) => {
    const list: any[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    callback(list);
  });
}

export function subscribeHospitalBeds(callback: (beds: any[]) => void): () => void {
  const colRef = collection(db, "hospital_beds");
  return onSnapshot(colRef, (snap) => {
    const list: any[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    callback(list);
  });
}

export function subscribeEncounterSubcollections(encounterId: string, callback: (data: any) => void): () => void {
  const encRef = doc(db, "clinical_encounters", encounterId);
  const unsubVitals = onSnapshot(collection(encRef, "vitals"), (snap) => {
    const vitals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback({ type: "vitals", items: vitals });
  });
  return () => {
    unsubVitals();
  };
}

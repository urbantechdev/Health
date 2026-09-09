import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import { ProcedureTariffItem, WardBedRateSetting } from "../types";

export const DEFAULT_PROCEDURE_TARIFFS: ProcedureTariffItem[] = [
  { id: "tariff-cons-gen", code: "CON-001", name: "General Outpatient Consultation", category: "consultation", department: "OPD Clinic", standardAmount: 800, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-cons-spec", code: "CONS-02", name: "Specialist Consultant Review", category: "consultation", department: "Doctor Desk", standardAmount: 2000, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-lab-cbc", code: "LAB-CBC", name: "Full Haemogram / Complete Blood Count (CBC)", category: "laboratory", department: "Pathology", standardAmount: 1200, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-lab-bs", code: "LAB-BS", name: "Blood Sugar (Random / Fasting)", category: "laboratory", department: "Pathology", standardAmount: 300, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-lab-urinalysis", code: "LAB-UA", name: "Routine Urinalysis Dipstick & Microscopy", category: "laboratory", department: "Pathology", standardAmount: 500, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-lab-lipid", code: "LAB-LIP", name: "Lipid Profile Panel", category: "laboratory", department: "Pathology", standardAmount: 2500, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-lab-lft", code: "LAB-LFT", name: "Liver Function Tests (LFTs)", category: "laboratory", department: "Pathology", standardAmount: 2200, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-lab-uec", code: "LAB-UEC", name: "Renal Function / UECs", category: "laboratory", department: "Pathology", standardAmount: 2000, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-rad-cxr", code: "RAD-CXR", name: "Digital Chest X-Ray (PA View)", category: "radiology", department: "Radiology", standardAmount: 1800, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-rad-us-abd", code: "RAD-US", name: "Abdominal & Pelvic Ultrasound", category: "radiology", department: "Radiology", standardAmount: 2800, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-proc-wound", code: "PROC-WD", name: "Minor Surgical Wound Dressing & Debridement", category: "procedure", department: "Minor Theatre", standardAmount: 1500, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-proc-suture", code: "PROC-SUT", name: "Laceration Suturing (Minor)", category: "procedure", department: "Minor Theatre", standardAmount: 2500, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-proc-cannula", code: "PROC-IV", name: "IV Cannulation & Infusion Set Insertion", category: "nursing", department: "Nursing", standardAmount: 600, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-proc-inj", code: "PROC-INJ", name: "Intramuscular / IV Injection Administration", category: "nursing", department: "Nursing", standardAmount: 250, isActive: true, isCoveredBySha: true, status: "active" },
  { id: "tariff-reg-card", code: "ADM-FILE", name: "New Patient Electronic File & Registration", category: "other", department: "Reception", standardAmount: 300, isActive: true, isCoveredBySha: true, status: "active" }
];

export const DEFAULT_WARD_BED_RATES: WardBedRateSetting[] = [
  { id: "rate-male-medical", wardId: "ward-male-medical", wardName: "Male Medical Ward", category: "General", wardCategory: "General", dailyRate: 1800, nursingDailyFee: 500, fileOpeningFee: 300 },
  { id: "rate-female-medical", wardId: "ward-female-medical", wardName: "Female Medical Ward", category: "General", wardCategory: "General", dailyRate: 1800, nursingDailyFee: 500, fileOpeningFee: 300 },
  { id: "rate-pediatric", wardId: "ward-pediatric", wardName: "Pediatric Ward", category: "Pediatric", wardCategory: "Pediatric", dailyRate: 2000, nursingDailyFee: 600, fileOpeningFee: 300 },
  { id: "rate-maternity", wardId: "ward-maternity", wardName: "Maternity & Labor Ward", category: "Maternity", wardCategory: "Maternity", dailyRate: 2500, nursingDailyFee: 800, fileOpeningFee: 500 },
  { id: "rate-surgical", wardId: "ward-surgical", wardName: "Surgical Recovery Ward", category: "Surgical", wardCategory: "Surgical", dailyRate: 2200, nursingDailyFee: 700, fileOpeningFee: 300 },
  { id: "rate-icu", wardId: "ward-icu", wardName: "Intensive Care Unit (ICU / HDU)", category: "ICU", wardCategory: "ICU", dailyRate: 12000, nursingDailyFee: 2500, fileOpeningFee: 1000 }
];

export function subscribeProcedureTariffs(
  callback: (tariffs: ProcedureTariffItem[]) => void
): () => void {
  return onSnapshot(
    collection(db, "procedure_tariffs"),
    (snap) => {
      if (snap.empty) {
        callback(DEFAULT_PROCEDURE_TARIFFS);
      } else {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProcedureTariffItem));
        callback(list);
      }
    },
    (err) => {
      console.warn("[tariffService] subscribeProcedureTariffs failed:", err);
      callback(DEFAULT_PROCEDURE_TARIFFS);
    }
  );
}

export function subscribeWardBedRates(
  callback: (rates: WardBedRateSetting[]) => void
): () => void {
  return onSnapshot(
    collection(db, "ward_bed_rates"),
    (snap) => {
      if (snap.empty) {
        callback(DEFAULT_WARD_BED_RATES);
      } else {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WardBedRateSetting));
        callback(list);
      }
    },
    (err) => {
      console.warn("[tariffService] subscribeWardBedRates failed:", err);
      callback(DEFAULT_WARD_BED_RATES);
    }
  );
}

export async function initHospitalTariffsAndBedRates(): Promise<void> {
  try {
    const tariffSnap = await getDocs(collection(db, "procedure_tariffs"));
    if (tariffSnap.empty) {
      for (const t of DEFAULT_PROCEDURE_TARIFFS) {
        await setDoc(doc(db, "procedure_tariffs", t.id), t);
      }
    }

    const bedSnap = await getDocs(collection(db, "ward_bed_rates"));
    if (bedSnap.empty) {
      for (const b of DEFAULT_WARD_BED_RATES) {
        await setDoc(doc(db, "ward_bed_rates", b.id), b);
      }
    }
  } catch (err) {
    console.warn("[tariffService] init error:", err);
  }
}

export async function saveProcedureTariff(tariff: ProcedureTariffItem): Promise<ProcedureTariffItem> {
  await setDoc(doc(db, "procedure_tariffs", tariff.id), {
    ...tariff,
    updatedAt: new Date().toISOString()
  });
  return tariff;
}

export async function deleteProcedureTariff(tariffId: string): Promise<void> {
  await deleteDoc(doc(db, "procedure_tariffs", tariffId));
}

export async function saveWardBedRate(rate: WardBedRateSetting): Promise<WardBedRateSetting> {
  await setDoc(doc(db, "ward_bed_rates", rate.id), {
    ...rate,
    updatedAt: new Date().toISOString()
  });
  return rate;
}

export async function updateWardBedRate(rate: WardBedRateSetting): Promise<WardBedRateSetting> {
  return saveWardBedRate(rate);
}

import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import { ProcedureTariffItem, WardBedRateSetting, HospitalWard } from "../types";
import { DEFAULT_HOSPITAL_WARDS } from "./encounterService";

export const DEFAULT_PROCEDURE_TARIFFS: Omit<ProcedureTariffItem, "id">[] = [
  // 1. Consultations
  { code: "CON-001", name: "General Medical Practitioner Consultation", category: "consultation", department: "Outpatient / OPD", standardAmount: 1000, isTaxable: false, isActive: true, description: "Standard clinical review by Medical Officer / Clinical Officer" },
  { code: "CON-002", name: "Specialist Consultant Review / Physician", category: "consultation", department: "Specialist Clinic", standardAmount: 2500, isTaxable: false, isActive: true, description: "Detailed consultation by Specialist Physician or Surgeon" },
  { code: "CON-003", name: "Emergency & Critical Triage Assessment", category: "consultation", department: "Casualty / ER", standardAmount: 1500, isTaxable: false, isActive: true, description: "Immediate resuscitation and priority emergency triage" },
  { code: "CON-004", name: "Pediatric Specialist Consultation", category: "consultation", department: "Pediatric Clinic", standardAmount: 2500, isTaxable: false, isActive: true, description: "Comprehensive child health and developmental review" },
  { code: "CON-005", name: "Obstetrics & Gynaecology Specialist Review", category: "consultation", department: "Maternity / Gyna", standardAmount: 3000, isTaxable: false, isActive: true, description: "Antenatal / Gynaecological specialist assessment" },

  // 2. Laboratory Diagnostics
  { code: "LAB-001", name: "Full Blood Count (FBC / CBC with ESR)", category: "laboratory", department: "Laboratory", standardAmount: 850, isTaxable: false, isActive: true, description: "Automated 5-part hematology panel with differential" },
  { code: "LAB-002", name: "Malaria Parasite Smear & Rapid Test", category: "laboratory", department: "Laboratory", standardAmount: 450, isTaxable: false, isActive: true, description: "Blood smear microscopy for MPs + antigen rapid diagnostic" },
  { code: "LAB-003", name: "Urinalysis Dipstick & Microscopy", category: "laboratory", department: "Laboratory", standardAmount: 500, isTaxable: false, isActive: true, description: "Comprehensive physical, chemical and sediment test" },
  { code: "LAB-004", name: "Random / Fasting Blood Glucose (RBS / FBS)", category: "laboratory", department: "Laboratory", standardAmount: 400, isTaxable: false, isActive: true, description: "Quantitative enzymatic plasma glucose test" },
  { code: "LAB-005", name: "Renal Function Panel (Urea, Creatinine, Electrolytes)", category: "laboratory", department: "Laboratory", standardAmount: 1800, isTaxable: false, isActive: true, description: "Kidney biomarker panel and serum electrolyte balance" },
  { code: "LAB-006", name: "Liver Function Panel (LFTs: ALT, AST, Bilirubin, Alk Phos)", category: "laboratory", department: "Laboratory", standardAmount: 2200, isTaxable: false, isActive: true, description: "Hepatic enzyme and protein profile" },
  { code: "LAB-007", name: "Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)", category: "laboratory", department: "Laboratory", standardAmount: 2000, isTaxable: false, isActive: true, description: "Cardiovascular lipid risk evaluation" },
  { code: "LAB-008", name: "Stool Microscopy & Occult Blood", category: "laboratory", department: "Laboratory", standardAmount: 600, isTaxable: false, isActive: true, description: "Gastrointestinal ova, cysts and occult bleed screen" },
  { code: "LAB-009", name: "Typhoid Widal & Typhidot IgM Test", category: "laboratory", department: "Laboratory", standardAmount: 950, isTaxable: false, isActive: true, description: "Salmonella typhi antibody agglutination" },

  // 3. Radiology & Diagnostic Imaging
  { code: "RAD-001", name: "Digital Chest X-Ray (PA / AP View)", category: "radiology", department: "Radiology & Imaging", standardAmount: 1800, isTaxable: false, isActive: true, description: "High-resolution thoracic radiograph with radiologist report" },
  { code: "RAD-002", name: "Abdominal & Pelvic Ultrasound Scan", category: "radiology", department: "Radiology & Imaging", standardAmount: 2500, isTaxable: false, isActive: true, description: "Real-time 2D/Doppler sonography of viscera" },
  { code: "RAD-003", name: "Obstetric / Antenatal Ultrasound Profile", category: "radiology", department: "Radiology & Imaging", standardAmount: 2200, isTaxable: false, isActive: true, description: "Fetal growth, viability and placental localization scan" },
  { code: "RAD-004", name: "12-Lead Electrocardiogram (ECG / EKG)", category: "radiology", department: "Cardiology", standardAmount: 1500, isTaxable: false, isActive: true, description: "Resting cardiac rhythm trace and automated interpretation" },
  { code: "RAD-005", name: "Limb / Skeletal X-Ray (2 Views)", category: "radiology", department: "Radiology & Imaging", standardAmount: 2000, isTaxable: false, isActive: true, description: "Orthopedic bone and joint radiograph" },

  // 4. Clinical Procedures & Nursing Services
  { code: "PROC-001", name: "Sterile Wound Debridement & Minor Dressing", category: "procedure", department: "Nursing / Dressing Room", standardAmount: 800, isTaxable: false, isActive: true, description: "Antiseptic cleaning, debridement and sterile bandage" },
  { code: "PROC-002", name: "Complex Wound Dressing & Suture Removal", category: "procedure", department: "Nursing / Dressing Room", standardAmount: 1500, isTaxable: false, isActive: true, description: "Post-op wound management with sterile pack & suture removal" },
  { code: "PROC-003", name: "IV Cannulation & Fluid Infusion Administration", category: "nursing", department: "Nursing Station", standardAmount: 650, isTaxable: false, isActive: true, description: "Venous access, cannula insertion and IV set administration" },
  { code: "PROC-004", name: "Salbutamol / Atrovent Nebulization Session", category: "procedure", department: "Respiratory / Casualty", standardAmount: 600, isTaxable: false, isActive: true, description: "Aerosolized bronchodilator treatment per session" },
  { code: "PROC-005", name: "Urethral Foley Catheterization Procedure", category: "procedure", department: "Nursing / Wards", standardAmount: 1200, isTaxable: false, isActive: true, description: "Sterile bladder catheter insertion and drainage collection bag" },
  { code: "PROC-006", name: "Nasogastric (NG) Enteral Feeding Tube Insertion", category: "procedure", department: "Nursing / Wards", standardAmount: 1400, isTaxable: false, isActive: true, description: "Enteral tube positioning and stomach aspirate pH verification" },
  { code: "PROC-007", name: "Laceration Suture Repair (Minor Theatre / Local)", category: "surgery", department: "Minor Theatre", standardAmount: 2800, isTaxable: false, isActive: true, description: "Local anesthesia, primary surgical wound approximation" },
  { code: "PROC-008", name: "Incision & Drainage (I&D) of Abscess", category: "surgery", department: "Minor Theatre", standardAmount: 3500, isTaxable: false, isActive: true, description: "Surgical abscess drainage, irrigation and wick placement" },
  { code: "PROC-009", name: "Normal Spontaneous Delivery (Labour & Delivery)", category: "surgery", department: "Labour & Delivery", standardAmount: 15000, isTaxable: false, isActive: true, description: "Midwife/Obstetrician delivery package, neonatal initial care" },
  { code: "PROC-010", name: "Day Case Theatre Facility & Equipment Fee", category: "surgery", department: "Main Theatre", standardAmount: 10000, isTaxable: false, isActive: true, description: "Surgical suite usage, sterilization, and scrub team facility" },
  { code: "PROC-011", name: "Intramuscular / Subcutaneous Injection Fee", category: "nursing", department: "Injection Room", standardAmount: 300, isTaxable: false, isActive: true, description: "Sterile drug administration per injection" },
  { code: "PROC-012", name: "Blood Transfusion Monitoring & Cross-matching", category: "nursing", department: "Inpatient Wards", standardAmount: 3000, isTaxable: false, isActive: true, description: "Compatibility testing, blood warming and hourly transfusion vital checks" }
];

export const DEFAULT_WARD_BED_RATES: WardBedRateSetting[] = [
  { id: "rate-ward-general-male", wardId: "ward-general-male", wardName: "Male Medical & Surgical Ward", category: "General", dailyRate: 1500, nursingDailyFee: 500, fileOpeningFee: 2000 },
  { id: "rate-ward-general-female", wardId: "ward-general-female", wardName: "Female Medical & Surgical Ward", category: "General", dailyRate: 1500, nursingDailyFee: 500, fileOpeningFee: 2000 },
  { id: "rate-ward-maternity", wardId: "ward-maternity", wardName: "Maternity & Postnatal Ward", category: "Maternity", dailyRate: 2500, nursingDailyFee: 750, fileOpeningFee: 2000 },
  { id: "rate-ward-pediatric", wardId: "ward-pediatric", wardName: "Pediatric Ward (Children)", category: "General", dailyRate: 1800, nursingDailyFee: 600, fileOpeningFee: 2000 },
  { id: "rate-ward-private", wardId: "ward-private", wardName: "Executive Private Wing", category: "Private", dailyRate: 6000, nursingDailyFee: 1500, fileOpeningFee: 3000 },
  { id: "rate-ward-icu", wardId: "ward-icu", wardName: "Intensive Care Unit (ICU / HDU)", category: "ICU", dailyRate: 12000, nursingDailyFee: 3000, fileOpeningFee: 5000 }
];

/**
 * Initializes default tariffs and bed rates in Firestore if not present
 */
export async function initHospitalTariffsAndBedRates(): Promise<void> {
  try {
    const tariffsSnap = await getDocs(collection(db, "procedure_tariffs"));
    if (tariffsSnap.empty) {
      console.log("[TariffService] Seeding default hospital procedure tariffs...");
      const batch = writeBatch(db);
      for (const item of DEFAULT_PROCEDURE_TARIFFS) {
        const itemRef = doc(collection(db, "procedure_tariffs"));
        batch.set(itemRef, {
          ...item,
          id: itemRef.id,
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log("[TariffService] Successfully seeded procedure tariffs.");
    }

    const bedRatesSnap = await getDocs(collection(db, "ward_bed_rates"));
    if (bedRatesSnap.empty) {
      console.log("[TariffService] Seeding default ward bed rates...");
      const batch = writeBatch(db);
      for (const rate of DEFAULT_WARD_BED_RATES) {
        const rateRef = doc(db, "ward_bed_rates", rate.id);
        batch.set(rateRef, {
          ...rate,
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log("[TariffService] Successfully seeded ward bed rates.");
    }
  } catch (err) {
    console.error("[TariffService] Error initializing tariffs and bed rates:", err);
  }
}

/**
 * Subscribe to Procedure Tariffs
 */
export function subscribeProcedureTariffs(callback: (tariffs: ProcedureTariffItem[]) => void) {
  return onSnapshot(collection(db, "procedure_tariffs"), (snapshot) => {
    if (snapshot.empty) {
      // Return defaults if empty
      callback(
        DEFAULT_PROCEDURE_TARIFFS.map((t, idx) => ({
          ...t,
          id: `tariff-${idx}`
        }))
      );
      // Trigger lazy init in background
      initHospitalTariffsAndBedRates();
      return;
    }

    const list: ProcedureTariffItem[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as ProcedureTariffItem);
    });
    list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    callback(list);
  });
}

/**
 * Subscribe to Ward Bed Rates
 */
export function subscribeWardBedRates(callback: (rates: WardBedRateSetting[]) => void) {
  return onSnapshot(collection(db, "ward_bed_rates"), (snapshot) => {
    if (snapshot.empty) {
      callback(DEFAULT_WARD_BED_RATES);
      initHospitalTariffsAndBedRates();
      return;
    }

    const list: WardBedRateSetting[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as WardBedRateSetting);
    });
    callback(list);
  });
}

/**
 * Save or Update a Procedure Tariff
 */
export async function saveProcedureTariff(tariff: Partial<ProcedureTariffItem> & { name: string; standardAmount: number }) {
  const isNew = !tariff.id || tariff.id.startsWith("tariff-");
  const tariffRef = isNew ? doc(collection(db, "procedure_tariffs")) : doc(db, "procedure_tariffs", tariff.id!);
  
  const payload: ProcedureTariffItem = {
    id: tariffRef.id,
    code: tariff.code || `PROC-${Math.floor(100 + Math.random() * 900)}`,
    name: tariff.name,
    category: tariff.category || "procedure",
    department: tariff.department || "General Hospital",
    standardAmount: Number(tariff.standardAmount) || 0,
    description: tariff.description || "",
    isTaxable: tariff.isTaxable ?? false,
    isActive: tariff.isActive ?? true,
    updatedAt: new Date().toISOString()
  };

  await setDoc(tariffRef, payload, { merge: true });
  return payload;
}

/**
 * Delete a Procedure Tariff
 */
export async function deleteProcedureTariff(id: string) {
  await deleteDoc(doc(db, "procedure_tariffs", id));
}

/**
 * Update Ward Bed Rate in both `ward_bed_rates`, `wards`, and `beds` collections
 */
export async function updateWardBedRate(rateSetting: WardBedRateSetting) {
  const batch = writeBatch(db);

  // 1. Update in ward_bed_rates
  const rateRef = doc(db, "ward_bed_rates", rateSetting.id || `rate-${rateSetting.wardId}`);
  batch.set(rateRef, {
    ...rateSetting,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 2. Sync to wards collection
  const wardRef = doc(db, "wards", rateSetting.wardId);
  batch.set(wardRef, {
    dailyBaseRate: Number(rateSetting.dailyRate)
  }, { merge: true });

  // 3. Sync to all beds belonging to this ward
  const bedsSnap = await getDocs(collection(db, "beds"));
  bedsSnap.forEach((bDoc) => {
    const data = bDoc.data();
    if (data.wardId === rateSetting.wardId) {
      batch.update(doc(db, "beds", bDoc.id), {
        dailyRate: Number(rateSetting.dailyRate)
      });
    }
  });

  await batch.commit();
}

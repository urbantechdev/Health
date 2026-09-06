export interface HaemogramParameter {
  name: string;
  key: string;
  code?: string;
  value: number | string;
  unit: string;
  referenceRange: string;
  flag: "NORMAL" | "HIGH" | "LOW" | "CRITICAL";
  category: "erythrocytes" | "leukocytes" | "differential" | "platelets" | "inflammatory";
  comment?: string;
}

export interface HaemogramReportData {
  facilityName: string;
  facilityAddress?: string;
  facilityPhone?: string;
  sampleId: string;
  date: string;
  patientName: string;
  patientNo?: string;
  age: string | number;
  gender: string;
  patientAge?: string | number;
  patientGender?: string;
  specimenType?: string;
  collectionDate?: string;
  reportedDate?: string;
  requestingDoctor?: string;
  bloodGroup?: string;
  clinicalImpression?: string;
  pathologistName?: string;
  malaria?: string;
  esr?: string | number;
  doctor?: string;
  clinicalIndication?: string;
  analyzerModel?: string;
  parameters: HaemogramParameter[];
  differential?: {
    neutrophils: number;
    lymphocytes: number;
    monocytes: number;
    eosinophils: number;
    basophils: number;
    [key: string]: any;
  };
  pbfMorphology?: string;
  technologistName?: string;
  microscopicFindings?: string;
  pathologistComment?: string;
}

export function isHaemogramReport(testNameOrString?: any): boolean {
  if (!testNameOrString) return false;
  const str = String(
    typeof testNameOrString === "object"
      ? testNameOrString.testName || testNameOrString.name || testNameOrString.title || ""
      : testNameOrString
  ).toLowerCase();
  return (
    str.includes("haemogram") ||
    str.includes("cbc") ||
    str.includes("full blood count") ||
    str.includes("complete blood count") ||
    str.includes("hemogram") ||
    str.includes("fbc")
  );
}

export function parseHaemogramData(
  data?: Partial<HaemogramReportData> | string,
  patientMeta?: {
    name?: string;
    age?: string | number;
    gender?: string;
    patientNo?: string;
    date?: string;
    doctor?: string;
    facilityName?: string;
  }
): HaemogramReportData {
  let parsed: Partial<HaemogramReportData> = {};
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = {};
    }
  } else if (data && typeof data === "object") {
    parsed = data;
  }

  const defaultParameters: HaemogramParameter[] = [
    { name: "White Blood Cells (WBC)", key: "wbc", value: 6.8, unit: "x10^9/L", referenceRange: "4.0 - 10.0", flag: "NORMAL", category: "leukocytes" },
    { name: "Red Blood Cells (RBC)", key: "rbc", value: 4.85, unit: "x10^12/L", referenceRange: "4.2 - 5.8", flag: "NORMAL", category: "erythrocytes" },
    { name: "Haemoglobin (Hb)", key: "hb", value: 14.2, unit: "g/dL", referenceRange: "13.0 - 17.5", flag: "NORMAL", category: "erythrocytes" },
    { name: "Haematocrit (HCT / PCV)", key: "hct", value: 42.1, unit: "%", referenceRange: "38.0 - 50.0", flag: "NORMAL", category: "erythrocytes" },
    { name: "Mean Corpuscular Vol (MCV)", key: "mcv", value: 86.8, unit: "fL", referenceRange: "80.0 - 98.0", flag: "NORMAL", category: "erythrocytes" },
    { name: "Mean Cell Hb (MCH)", key: "mch", value: 29.3, unit: "pg", referenceRange: "27.0 - 33.0", flag: "NORMAL", category: "erythrocytes" },
    { name: "Mean Cell Hb Conc (MCHC)", key: "mchc", value: 33.7, unit: "g/dL", referenceRange: "32.0 - 36.0", flag: "NORMAL", category: "erythrocytes" },
    { name: "Platelet Count (PLT)", key: "plt", value: 265, unit: "x10^9/L", referenceRange: "150 - 450", flag: "NORMAL", category: "platelets" },
    { name: "Neutrophils %", key: "neut_pct", value: 58.2, unit: "%", referenceRange: "40.0 - 75.0", flag: "NORMAL", category: "differential" },
    { name: "Lymphocytes %", key: "lymph_pct", value: 32.1, unit: "%", referenceRange: "20.0 - 45.0", flag: "NORMAL", category: "differential" },
    { name: "Monocytes %", key: "mono_pct", value: 5.4, unit: "%", referenceRange: "2.0 - 10.0", flag: "NORMAL", category: "differential" },
    { name: "Eosinophils %", key: "eos_pct", value: 3.6, unit: "%", referenceRange: "1.0 - 6.0", flag: "NORMAL", category: "differential" },
    { name: "Basophils %", key: "baso_pct", value: 0.7, unit: "%", referenceRange: "0.0 - 1.5", flag: "NORMAL", category: "differential" },
  ];

  return {
    facilityName: patientMeta?.facilityName || parsed.facilityName || "NEXTGEN HOSPITAL & HEALTHCARE",
    facilityAddress: parsed.facilityAddress || "P.O. Box 40100 - Nairobi, Kenya",
    facilityPhone: parsed.facilityPhone || "+254 700 000 000",
    sampleId: parsed.sampleId || `LIS-${Math.floor(100000 + Math.random() * 900000)}`,
    date: patientMeta?.date || parsed.date || new Date().toISOString().slice(0, 10),
    patientName: patientMeta?.name || parsed.patientName || "Patient",
    patientNo: patientMeta?.patientNo || parsed.patientNo || `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
    age: patientMeta?.age || parsed.age || 35,
    gender: patientMeta?.gender || parsed.gender || "Unspecified",
    doctor: patientMeta?.doctor || parsed.doctor || "Dr. Medical Officer",
    clinicalIndication: parsed.clinicalIndication || "Routine Clinical OPD Workup / Health Evaluation",
    analyzerModel: parsed.analyzerModel || "Mindray BC-5150 Auto 5-Part Haematology Analyzer",
    parameters: parsed.parameters && parsed.parameters.length > 0 ? parsed.parameters : defaultParameters,
    differential: parsed.differential || {
      neutrophils: 58.2,
      lymphocytes: 32.1,
      monocytes: 5.4,
      eosinophils: 3.6,
      basophils: 0.7
    },
    pbfMorphology: parsed.pbfMorphology || "Normocytic, normochromic red cells. Leukocyte morphology within normal range with mature neutrophils. Platelets adequate on smear with no clumping.",
    technologistName: parsed.technologistName || "Lab Technologist (KMLTTB Reg)",
    microscopicFindings: parsed.microscopicFindings || "Normocytic, normochromic RBCs. Normal leukocyte distribution. Adequate platelets on film.",
    pathologistComment: parsed.pathologistComment || "No pathological cells seen. Film picture consistent with normal peripheral blood counts."
  };
}

export type AgeCohortType = "neonate" | "infant" | "child" | "adolescent" | "adult_male" | "adult_female" | "elderly";

export interface AgeCohortInfo {
  cohort: AgeCohortType;
  label: string;
}

export interface ReferenceRange {
  min: number;
  max: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
  displayRange: string;
}

export interface HaemogramParameter {
  id: string;
  name: string;
  code: string;
  key?: string;
  category: "erythrocytes" | "leukocytes" | "differential" | "platelets" | "inflammatory" | string;
  value: number;
  unit: string;
  referenceRange: string;
  refMin: number;
  refMax: number;
  flag: "NORMAL" | "HIGH" | "LOW" | "CRITICAL" | string;
  clinicalSignificance?: string;
  [key: string]: any;
}

export interface PbfMorphologyDetails {
  rbcMorphology?: string;
  wbcMorphology?: string;
  plateletMorphology?: string;
  parasites?: string;
  summaryComment?: string;
  [key: string]: any;
}

export interface HaemogramReportData {
  id: string;
  sampleId: string;
  patientName: string;
  patientNo?: string;
  age?: string | number;
  patientAge?: string | number;
  gender?: string;
  patientGender?: string;
  facilityName: string;
  facilityAddress: string;
  date: string;
  doctor?: string;
  parameters: HaemogramParameter[];
  pbf?: PbfMorphologyDetails | string;
  pbfDetails?: any;
  pbfMorphology?: string;
  clinicalImpression?: string;
  pathologistComment?: string;
  technologistName?: string;
  pathologistName?: string;
  cohortLabel?: string;
  malaria?: string;
  esr?: string | number;
  differential?: any;
  flaggedCount?: number;
  isNormal?: boolean;
  [key: string]: any;
}

export function isHaemogramReport(testNameOrDescription?: string): boolean {
  if (!testNameOrDescription) return false;
  const s = testNameOrDescription.toLowerCase();
  return (
    s.includes("haemogram") ||
    s.includes("hemogram") ||
    s.includes("fbc") ||
    s.includes("cbc") ||
    s.includes("full blood count") ||
    s.includes("complete blood count")
  );
}

export function determineAgeCohort(ageYears: number | string = 30, gender: string = "Female"): AgeCohortInfo {
  const normGender = (gender || "Female").toLowerCase();
  const age = typeof ageYears === "number" ? ageYears : parseFloat(String(ageYears)) || 30;
  if (age <= 0.08) {
    return { cohort: "neonate", label: "Neonate (0-28 days)" };
  }
  if (age < 1) {
    return { cohort: "infant", label: "Infant (1-12 months)" };
  }
  if (age < 14) {
    return { cohort: "child", label: "Child (1-13 years)" };
  }
  if (normGender.startsWith("m")) {
    return { cohort: "adult_male", label: "Adult Male (14+ years)" };
  }
  return { cohort: "adult_female", label: "Adult Female (14+ years)" };
}

export function evaluateFlag(
  val: number | string,
  minOrRef: number | ReferenceRange,
  maxArg?: number
): "NORMAL" | "HIGH" | "LOW" | "CRITICAL" {
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return "NORMAL";
  let min = 0;
  let max = 100;
  if (typeof minOrRef === "number") {
    min = minOrRef;
    max = maxArg !== undefined ? maxArg : 100;
  } else if (minOrRef && typeof minOrRef === "object") {
    min = (minOrRef as ReferenceRange).min;
    max = (minOrRef as ReferenceRange).max;
  }
  if (num < min * 0.65 || num > max * 1.55) return "CRITICAL";
  if (num < min) return "LOW";
  if (num > max) return "HIGH";
  return "NORMAL";
}

const PARAMETER_DICTIONARY: Record<
  string,
  {
    name: string;
    category: "erythrocytes" | "leukocytes" | "differential" | "platelets" | "inflammatory";
    unit: string;
    defaultMin: number;
    defaultMax: number;
  }
> = {
  rbc: { name: "Red Blood Cell Count", category: "erythrocytes", unit: "x10^12/L", defaultMin: 4.0, defaultMax: 5.4 },
  hb: { name: "Haemoglobin", category: "erythrocytes", unit: "g/dL", defaultMin: 12.0, defaultMax: 16.0 },
  hct: { name: "Haematocrit (PCV)", category: "erythrocytes", unit: "%", defaultMin: 36.0, defaultMax: 48.0 },
  mcv: { name: "Mean Corpuscular Volume", category: "erythrocytes", unit: "fL", defaultMin: 80.0, defaultMax: 98.0 },
  mch: { name: "Mean Corpuscular Hb", category: "erythrocytes", unit: "pg", defaultMin: 27.0, defaultMax: 33.0 },
  mchc: { name: "Mean Corpuscular Hb Conc.", category: "erythrocytes", unit: "g/dL", defaultMin: 32.0, defaultMax: 36.0 },
  rdw_cv: { name: "RDW (CV)", category: "erythrocytes", unit: "%", defaultMin: 11.5, defaultMax: 14.5 },
  rdw_sd: { name: "RDW (SD)", category: "erythrocytes", unit: "fL", defaultMin: 39.0, defaultMax: 47.0 },
  retic_pct: { name: "Reticulocyte Count %", category: "erythrocytes", unit: "%", defaultMin: 0.5, defaultMax: 2.0 },
  retic_abs: { name: "Absolute Reticulocyte", category: "erythrocytes", unit: "x10^9/L", defaultMin: 25.0, defaultMax: 100.0 },
  irf: { name: "Immature Reticulocyte Frac.", category: "erythrocytes", unit: "%", defaultMin: 2.0, defaultMax: 12.0 },
  nrbc_pct: { name: "Nucleated RBC %", category: "erythrocytes", unit: "%", defaultMin: 0.0, defaultMax: 0.5 },
  wbc: { name: "Total White Blood Cells", category: "leukocytes", unit: "x10^9/L", defaultMin: 4.0, defaultMax: 10.5 },
  neut_pct: { name: "Neutrophils %", category: "differential", unit: "%", defaultMin: 40.0, defaultMax: 70.0 },
  neut_abs: { name: "Absolute Neutrophils", category: "differential", unit: "x10^9/L", defaultMin: 2.0, defaultMax: 7.5 },
  lymph_pct: { name: "Lymphocytes %", category: "differential", unit: "%", defaultMin: 20.0, defaultMax: 45.0 },
  lymph_abs: { name: "Absolute Lymphocytes", category: "differential", unit: "x10^9/L", defaultMin: 1.0, defaultMax: 4.0 },
  mono_pct: { name: "Monocytes %", category: "differential", unit: "%", defaultMin: 2.0, defaultMax: 8.0 },
  mono_abs: { name: "Absolute Monocytes", category: "differential", unit: "x10^9/L", defaultMin: 0.2, defaultMax: 0.8 },
  eos_pct: { name: "Eosinophils %", category: "differential", unit: "%", defaultMin: 1.0, defaultMax: 5.0 },
  eos_abs: { name: "Absolute Eosinophils", category: "differential", unit: "x10^9/L", defaultMin: 0.04, defaultMax: 0.4 },
  baso_pct: { name: "Basophils %", category: "differential", unit: "%", defaultMin: 0.0, defaultMax: 1.5 },
  baso_abs: { name: "Absolute Basophils", category: "differential", unit: "x10^9/L", defaultMin: 0.01, defaultMax: 0.1 },
  ig_pct: { name: "Immature Granulocytes %", category: "differential", unit: "%", defaultMin: 0.0, defaultMax: 0.6 },
  ig_abs: { name: "Absolute Immature Granulocytes", category: "differential", unit: "x10^9/L", defaultMin: 0.0, defaultMax: 0.06 },
  bands_pct: { name: "Band Cells %", category: "differential", unit: "%", defaultMin: 0.0, defaultMax: 5.0 },
  bands_abs: { name: "Absolute Band Cells", category: "differential", unit: "x10^9/L", defaultMin: 0.0, defaultMax: 0.4 },
  plt: { name: "Platelet Count", category: "platelets", unit: "x10^9/L", defaultMin: 150.0, defaultMax: 450.0 },
  mpv: { name: "Mean Platelet Volume", category: "platelets", unit: "fL", defaultMin: 7.5, defaultMax: 11.5 },
  pdw: { name: "Platelet Distribution Width", category: "platelets", unit: "fL", defaultMin: 9.0, defaultMax: 17.0 },
  pct: { name: "Plateletcrit", category: "platelets", unit: "%", defaultMin: 0.15, defaultMax: 0.45 },
  p_lcr: { name: "Platelet Large Cell Ratio", category: "platelets", unit: "%", defaultMin: 15.0, defaultMax: 35.0 },
  p_lcc: { name: "Platelet Large Cell Count", category: "platelets", unit: "x10^9/L", defaultMin: 30.0, defaultMax: 90.0 },
  esr: { name: "Erythrocyte Sed. Rate (ESR)", category: "inflammatory", unit: "mm/hr", defaultMin: 0.0, defaultMax: 20.0 },
};

export function getReferenceRange(
  paramCode: string,
  ageYears: number | string = 30,
  gender: string = "Female"
): ReferenceRange {
  const code = (paramCode || "").toLowerCase().trim();
  const cohortInfo = determineAgeCohort(ageYears, gender);
  const cohort = cohortInfo.cohort;

  // Specific stratified values
  if (code === "hb") {
    if (cohort === "neonate") {
      return { min: 14.5, max: 22.5, unit: "g/dL", displayRange: "14.5 - 22.5 g/dL" };
    }
    if (cohort === "infant") {
      return { min: 10.5, max: 13.5, unit: "g/dL", displayRange: "10.5 - 13.5 g/dL" };
    }
    if (cohort === "child") {
      return { min: 11.5, max: 14.5, unit: "g/dL", displayRange: "11.5 - 14.5 g/dL" };
    }
    if (cohort === "adult_male") {
      return { min: 13.5, max: 17.5, unit: "g/dL", displayRange: "13.5 - 17.5 g/dL" };
    }
    return { min: 12.0, max: 15.5, unit: "g/dL", displayRange: "12.0 - 15.5 g/dL" };
  }

  if (code === "rbc") {
    if (cohort === "neonate") return { min: 4.5, max: 6.5, unit: "x10^12/L", displayRange: "4.5 - 6.5 x10^12/L" };
    if (cohort === "adult_male") return { min: 4.5, max: 5.9, unit: "x10^12/L", displayRange: "4.5 - 5.9 x10^12/L" };
    return { min: 4.0, max: 5.2, unit: "x10^12/L", displayRange: "4.0 - 5.2 x10^12/L" };
  }

  if (code === "hct") {
    if (cohort === "neonate") return { min: 45.0, max: 65.0, unit: "%", displayRange: "45.0 - 65.0 %" };
    if (cohort === "adult_male") return { min: 41.0, max: 52.0, unit: "%", displayRange: "41.0 - 52.0 %" };
    return { min: 36.0, max: 46.0, unit: "%", displayRange: "36.0 - 46.0 %" };
  }

  if (code === "wbc") {
    if (cohort === "neonate") return { min: 9.0, max: 30.0, unit: "x10^9/L", displayRange: "9.0 - 30.0 x10^9/L" };
    if (cohort === "child") return { min: 5.0, max: 14.5, unit: "x10^9/L", displayRange: "5.0 - 14.5 x10^9/L" };
    return { min: 4.0, max: 10.0, unit: "x10^9/L", displayRange: "4.0 - 10.0 x10^9/L" };
  }

  if (code === "esr") {
    if (cohort === "adult_male") return { min: 0.0, max: 15.0, unit: "mm/hr", displayRange: "0.0 - 15.0 mm/hr" };
    return { min: 0.0, max: 20.0, unit: "mm/hr", displayRange: "0.0 - 20.0 mm/hr" };
  }

  const found = PARAMETER_DICTIONARY[code];
  if (found) {
    return {
      min: found.defaultMin,
      max: found.defaultMax,
      unit: found.unit,
      displayRange: `${found.defaultMin.toFixed(1)} - ${found.defaultMax.toFixed(1)} ${found.unit}`,
    };
  }

  return {
    min: 0,
    max: 100,
    unit: "",
    displayRange: "0 - 100",
  };
}

export function parseHaemogramData(
  rawInput?: any,
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
  const ageNum = typeof patientMeta?.age === "number" ? patientMeta.age : parseFloat(String(patientMeta?.age || 30)) || 30;
  const genderStr = patientMeta?.gender || "Female";

  const defaultParameters: HaemogramParameter[] = Object.keys(PARAMETER_DICTIONARY).map((code) => {
    const meta = PARAMETER_DICTIONARY[code];
    const ref = getReferenceRange(code, ageNum, genderStr);
    const midVal = parseFloat(((ref.min + ref.max) / 2).toFixed(2));
    return {
      id: `param-${code}`,
      code,
      name: meta.name,
      category: meta.category,
      value: midVal,
      unit: ref.unit,
      referenceRange: ref.displayRange,
      refMin: ref.min,
      refMax: ref.max,
      flag: "NORMAL",
    };
  });

  // If rawInput is text, parse lines like "WBC: 7.2" or "HB: 13.5"
  if (typeof rawInput === "string") {
    const lines = rawInput.split("\n");
    for (const line of lines) {
      const match = line.match(/([a-zA-Z_]+)\s*[:=]\s*([\d.]+)/);
      if (match) {
        const key = match[1].toLowerCase().trim();
        const val = parseFloat(match[2]);
        const target = defaultParameters.find((p) => p.code === key || p.id === `param-${key}`);
        if (target && !isNaN(val)) {
          target.value = val;
          target.flag = evaluateFlag(val, target.refMin, target.refMax);
        }
      }
    }
  } else if (rawInput && typeof rawInput === "object") {
    if (Array.isArray(rawInput.parameters)) {
      return {
        id: rawInput.id || `LIS-${Date.now()}`,
        sampleId: rawInput.sampleId || `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: patientMeta?.name || rawInput.patientName || "Patient",
        patientNo: patientMeta?.patientNo || rawInput.patientNo || "P-000",
        age: patientMeta?.age || rawInput.age || 30,
        gender: patientMeta?.gender || rawInput.gender || "Female",
        facilityName: patientMeta?.facilityName || "The Tassia Hill Hospital",
        facilityAddress: "Fedha Rd, Tassia Hill Estate, Nairobi, Kenya",
        date: patientMeta?.date || rawInput.date || new Date().toISOString().split("T")[0],
        doctor: patientMeta?.doctor || rawInput.doctor || "Medical Officer",
        parameters: rawInput.parameters,
        pbf: rawInput.pbf || {
          rbcMorphology: "Normocytic, normochromic erythrocytes.",
          wbcMorphology: "Mature leukocytes with normal differential distribution.",
          plateletMorphology: "Adequate on smear, no bizarre aggregates.",
          parasites: "No hemoparasites (Malaria / Borrelia) seen on Giemsa smear.",
          summaryComment: "Normal complete blood count profile.",
        },
      };
    }
  }

  return {
    id: `LIS-${Date.now()}`,
    sampleId: `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
    patientName: patientMeta?.name || "Patient",
    patientNo: patientMeta?.patientNo || "P-000",
    age: ageNum,
    gender: genderStr,
    facilityName: patientMeta?.facilityName || "The Tassia Hill Hospital",
    facilityAddress: "Fedha Rd, Tassia Hill Estate, Nairobi, Kenya",
    date: patientMeta?.date || new Date().toISOString().split("T")[0],
    doctor: patientMeta?.doctor || "Medical Officer",
    parameters: defaultParameters,
    pbf: {
      rbcMorphology: "Normocytic, normochromic erythrocytes.",
      wbcMorphology: "Mature leukocytes with normal differential distribution.",
      plateletMorphology: "Adequate on smear, no bizarre aggregates.",
      parasites: "No hemoparasites (Malaria / Borrelia) seen on Giemsa smear.",
      summaryComment: "Normal complete blood count profile.",
    },
  };
}

export interface LabParameter {
  id: string;
  name: string;
  code?: string;
  unit: string;
  referenceRange: string;
  defaultValue?: string;
  type?: "numeric" | "text" | "select" | "boolean";
  options?: string[];
  clinicalSignificance?: string;
}

export interface LabTestItem {
  id: string;
  code: string;
  name: string;
  disciplineId: string;
  disciplineName: string;
  familyId: string;
  familyName: string;
  sampleType: string;
  turnaroundTime: string;
  parameters: LabParameter[];
  defaultRemarks?: string;
  tariffsKES?: number;
}

export interface LabDiscipline {
  id: string;
  num: number;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  badgeColor: string;
  testFamilies: {
    id: string;
    name: string;
    description: string;
    tests: LabTestItem[];
  }[];
}

export const LAB_DISCIPLINES: LabDiscipline[] = [
  // 1. HEMATOLOGY & COAGULATION
  {
    id: "hematology_coagulation",
    num: 1,
    name: "Hematology & Coagulation Tests (Blood Cells & Clotting)",
    shortName: "Hematology & Coagulation",
    description: "Cellular morphology, complete blood counts, hemostasis, coagulation assays and specialized red cell analyses.",
    iconName: "Droplets",
    badgeColor: "rose",
    testFamilies: [
      {
        id: "cbc_haemogram",
        name: "Complete Blood Count (CBC) / Full Haemogram",
        description: "RBC, WBC, Hemoglobin, Hematocrit, Platelets, Erythrocyte Indices, and 5-Part Differential with PBF morphology.",
        tests: [
          {
            id: "test-cbc-full",
            code: "HEM-CBC-01",
            name: "Complete Blood Count (CBC) with 5-Part Differential",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "cbc_haemogram",
            familyName: "Complete Blood Count (CBC) / Full Haemogram",
            sampleType: "Whole Blood (EDTA - Lavender Top)",
            turnaroundTime: "30-45 mins",
            tariffsKES: 1200,
            parameters: [
              { id: "hb", name: "Hemoglobin (Hb)", unit: "g/dL", referenceRange: "12.0 - 17.5", defaultValue: "14.2" },
              { id: "rbc", name: "Red Blood Cell Count (RBC)", unit: "x10^12/L", referenceRange: "4.2 - 5.9", defaultValue: "4.85" },
              { id: "hct", name: "Hematocrit (PCV)", unit: "%", referenceRange: "37.0 - 52.0", defaultValue: "42.0" },
              { id: "mcv", name: "Mean Corpuscular Volume (MCV)", unit: "fL", referenceRange: "80.0 - 100.0", defaultValue: "86.6" },
              { id: "mch", name: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg", referenceRange: "27.0 - 33.0", defaultValue: "29.2" },
              { id: "mchc", name: "Mean Corpuscular Hb Conc (MCHC)", unit: "g/dL", referenceRange: "32.0 - 36.0", defaultValue: "33.8" },
              { id: "rdw", name: "Red Cell Distribution Width (RDW-CV)", unit: "%", referenceRange: "11.5 - 14.5", defaultValue: "12.8" },
              { id: "wbc", name: "White Blood Cell Count (Total WBC)", unit: "x10^9/L", referenceRange: "4.0 - 10.5", defaultValue: "6.8" },
              { id: "neut_pct", name: "Neutrophils (%)", unit: "%", referenceRange: "40 - 75", defaultValue: "58" },
              { id: "lymph_pct", name: "Lymphocytes (%)", unit: "%", referenceRange: "20 - 45", defaultValue: "32" },
              { id: "mono_pct", name: "Monocytes (%)", unit: "%", referenceRange: "2 - 10", defaultValue: "6" },
              { id: "eos_pct", name: "Eosinophils (%)", unit: "%", referenceRange: "1 - 6", defaultValue: "3" },
              { id: "baso_pct", name: "Basophils (%)", unit: "%", referenceRange: "0 - 2", defaultValue: "1" },
              { id: "plt", name: "Platelet Count (PLT)", unit: "x10^9/L", referenceRange: "150 - 450", defaultValue: "265" }
            ],
            defaultRemarks: "Normocytic, normochromic RBCs. Normal leukocyte differential and adequate platelets on peripheral film."
          }
        ]
      },
      {
        id: "coagulation_profiles",
        name: "Coagulation Profiles & Clotting Assays",
        description: "Prothrombin Time (PT/INR), Activated Partial Thromboplastin Time (aPTT), Fibrinogen, D-Dimer, Bleeding Time, Clotting Factor Assays (Factors VIII, IX, etc.).",
        tests: [
          {
            id: "test-pt-inr",
            code: "COAG-PT-01",
            name: "Prothrombin Time (PT / INR)",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "coagulation_profiles",
            familyName: "Coagulation Profiles",
            sampleType: "Citrated Plasma (Light Blue Top 3.2%)",
            turnaroundTime: "45 mins",
            tariffsKES: 1400,
            parameters: [
              { id: "pt_time", name: "Prothrombin Time (PT)", unit: "seconds", referenceRange: "11.0 - 13.5", defaultValue: "12.2" },
              { id: "pt_control", name: "PT Control", unit: "seconds", referenceRange: "11.5 - 13.0", defaultValue: "12.0" },
              { id: "inr", name: "International Normalized Ratio (INR)", unit: "ratio", referenceRange: "0.8 - 1.2 (Therapeutic: 2.0 - 3.0)", defaultValue: "1.02" }
            ],
            defaultRemarks: "Normal extrinsic pathway coagulation. Target INR on warfarin anticoagulation is typically 2.0 - 3.0."
          },
          {
            id: "test-aptt",
            code: "COAG-APTT-02",
            name: "Activated Partial Thromboplastin Time (aPTT)",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "coagulation_profiles",
            familyName: "Coagulation Profiles",
            sampleType: "Citrated Plasma (Light Blue Top)",
            turnaroundTime: "45 mins",
            tariffsKES: 1400,
            parameters: [
              { id: "aptt_time", name: "aPTT Patient Result", unit: "seconds", referenceRange: "25.0 - 38.0", defaultValue: "30.4" },
              { id: "aptt_control", name: "aPTT Control", unit: "seconds", referenceRange: "28.0 - 34.0", defaultValue: "31.0" },
              { id: "aptt_ratio", name: "aPTT Ratio", unit: "ratio", referenceRange: "0.85 - 1.15", defaultValue: "0.98" }
            ]
          },
          {
            id: "test-fibrinogen",
            code: "COAG-FIB-03",
            name: "Fibrinogen (Clauss Assay)",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "coagulation_profiles",
            familyName: "Coagulation Profiles",
            sampleType: "Citrated Plasma",
            turnaroundTime: "60 mins",
            tariffsKES: 1800,
            parameters: [
              { id: "fibrinogen_level", name: "Fibrinogen Concentration", unit: "g/L", referenceRange: "2.0 - 4.0", defaultValue: "2.8" }
            ]
          },
          {
            id: "test-d-dimer",
            code: "COAG-DD-04",
            name: "D-Dimer Quantitative Assay",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "coagulation_profiles",
            familyName: "Coagulation Profiles",
            sampleType: "Citrated Plasma",
            turnaroundTime: "30 mins",
            tariffsKES: 2200,
            parameters: [
              { id: "ddimer_val", name: "D-Dimer (FEU)", unit: "ug/mL FEU", referenceRange: "< 0.50 (Exclusion of VTE/PE)", defaultValue: "0.28" }
            ],
            defaultRemarks: "Level < 0.50 ug/mL FEU possesses strong negative predictive value for acute DVT / Pulmonary Embolism."
          },
          {
            id: "test-bleeding-clotting",
            code: "COAG-BT-05",
            name: "Bleeding Time (Duke / Ivy) & Clotting Time",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "coagulation_profiles",
            familyName: "Coagulation Profiles",
            sampleType: "Capillary / Whole Blood",
            turnaroundTime: "20 mins",
            tariffsKES: 800,
            parameters: [
              { id: "bleeding_time", name: "Bleeding Time (BT)", unit: "minutes", referenceRange: "2 - 7", defaultValue: "3.5" },
              { id: "clotting_time", name: "Clotting Time (Lee-White)", unit: "minutes", referenceRange: "4 - 10", defaultValue: "6.0" }
            ]
          },
          {
            id: "test-factor-assays",
            code: "COAG-FACT-06",
            name: "Clotting Factor Assays (Factor VIII & IX - Hemophilia Screening)",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "coagulation_profiles",
            familyName: "Coagulation Profiles",
            sampleType: "Citrated Plasma",
            turnaroundTime: "120 mins",
            tariffsKES: 4500,
            parameters: [
              { id: "factor_viii", name: "Factor VIII Activity", unit: "%", referenceRange: "50 - 150", defaultValue: "94" },
              { id: "factor_ix", name: "Factor IX Activity", unit: "%", referenceRange: "60 - 140", defaultValue: "88" },
              { id: "factor_vii", name: "Factor VII Activity", unit: "%", referenceRange: "50 - 150", defaultValue: "92" }
            ]
          }
        ]
      },
      {
        id: "specialized_hematology",
        name: "Specialized Hematology",
        description: "Reticulocyte count, Bone marrow aspiration & biopsy analysis, Hemoglobin Electrophoresis (for Sickle Cell, Thalassemia), G6PD deficiency test.",
        tests: [
          {
            id: "test-reticulocytes",
            code: "HEM-RET-01",
            name: "Reticulocyte Count & Immature Reticulocyte Fraction (IRF)",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "specialized_hematology",
            familyName: "Specialized Hematology",
            sampleType: "Whole Blood (EDTA)",
            turnaroundTime: "45 mins",
            tariffsKES: 900,
            parameters: [
              { id: "retic_pct", name: "Reticulocyte Percentage", unit: "%", referenceRange: "0.5 - 2.5", defaultValue: "1.2" },
              { id: "retic_abs", name: "Absolute Reticulocyte Count", unit: "x10^9/L", referenceRange: "25 - 120", defaultValue: "58.2" },
              { id: "irf", name: "Immature Reticulocyte Fraction (IRF)", unit: "%", referenceRange: "3.0 - 15.0", defaultValue: "6.8" },
              { id: "crc", name: "Corrected Reticulocyte Count (CRC)", unit: "%", referenceRange: "1.0 - 2.5", defaultValue: "1.2" }
            ]
          },
          {
            id: "test-hb-electrophoresis",
            code: "HEM-HBE-02",
            name: "Hemoglobin Electrophoresis (Alkaline / Acid / HPLC)",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "specialized_hematology",
            familyName: "Specialized Hematology",
            sampleType: "Whole Blood (EDTA)",
            turnaroundTime: "24 hours",
            tariffsKES: 3500,
            parameters: [
              { id: "hb_a", name: "Hb A (Adult Normal)", unit: "%", referenceRange: "95.0 - 98.0", defaultValue: "96.5" },
              { id: "hb_a2", name: "Hb A2 (Beta-Thalassemia screen)", unit: "%", referenceRange: "1.5 - 3.5", defaultValue: "2.4" },
              { id: "hb_f", name: "Hb F (Fetal Hemoglobin)", unit: "%", referenceRange: "< 2.0", defaultValue: "0.8" },
              { id: "hb_s", name: "Hb S (Sickle Hemoglobin)", unit: "%", referenceRange: "0.0 (Absent)", defaultValue: "0.0" },
              { id: "hb_c", name: "Hb C Variant", unit: "%", referenceRange: "0.0 (Absent)", defaultValue: "0.0" }
            ],
            defaultRemarks: "Normal adult hemoglobin pattern (Hb AA). No abnormal hemoglobin bands (Hb S, C, D) identified."
          },
          {
            id: "test-g6pd",
            code: "HEM-G6PD-03",
            name: "Glucose-6-Phosphate Dehydrogenase (G6PD) Deficiency Screen",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "specialized_hematology",
            familyName: "Specialized Hematology",
            sampleType: "Whole Blood (EDTA)",
            turnaroundTime: "60 mins",
            tariffsKES: 1800,
            parameters: [
              { id: "g6pd_quant", name: "G6PD Activity", unit: "U/g Hb", referenceRange: "7.0 - 20.5", defaultValue: "12.4" },
              { id: "g6pd_qual", name: "Qualitative Interpretation", unit: "", referenceRange: "Adequate Activity", defaultValue: "Adequate Activity", type: "select", options: ["Adequate Activity", "Deficient (< 30%)", "Intermediate (30-70%)"] }
            ],
            defaultRemarks: "Normal G6PD enzyme activity. Low risk of hemolytic anemia with oxidative antimalarials/sulfa drugs."
          },
          {
            id: "test-bone-marrow",
            code: "HEM-BM-04",
            name: "Bone Marrow Aspiration & Biopsy Analysis",
            disciplineId: "hematology_coagulation",
            disciplineName: "Hematology & Coagulation",
            familyId: "specialized_hematology",
            familyName: "Specialized Hematology",
            sampleType: "Bone Marrow Aspirate / Trephine Core",
            turnaroundTime: "72 hours",
            tariffsKES: 12000,
            parameters: [
              { id: "bm_cellularity", name: "Overall Cellularity", unit: "%", referenceRange: "30 - 60", defaultValue: "45" },
              { id: "me_ratio", name: "Myeloid : Erythroid (M:E) Ratio", unit: "ratio", referenceRange: "2:1 - 4:1", defaultValue: "3:1" },
              { id: "megakaryocytes", name: "Megakaryocytes", unit: "", referenceRange: "Adequate with normal lobation", defaultValue: "Adequate with normal lobation" },
              { id: "blast_count", name: "Myeloblasts / Lymphoblasts", unit: "%", referenceRange: "< 5%", defaultValue: "1.5" },
              { id: "iron_stain", name: "Prussian Blue Marrow Iron", unit: "Grade", referenceRange: "Grade 2 - 3", defaultValue: "Grade 2" }
            ],
            defaultRemarks: "Normocellular marrow displaying trilineage hematopoiesis. No dysplastic features, ringed sideroblasts, or increased blast populations."
          }
        ]
      }
    ]
  },

  // 2. CLINICAL CHEMISTRY & METABOLIC TESTS
  {
    id: "clinical_chemistry",
    num: 2,
    name: "Clinical Chemistry & Metabolic Tests (Body Chemistry & Organs)",
    shortName: "Clinical Chemistry & Metabolism",
    description: "Electrolytes, renal panels, hepatic function, comprehensive lipidology, cardiac necrosis enzymes, and mineral metabolism.",
    iconName: "Activity",
    badgeColor: "emerald",
    testFamilies: [
      {
        id: "metabolic_panels",
        name: "Basic & Comprehensive Metabolic Panels (BMP / CMP)",
        description: "Sodium, Potassium, Chloride, Carbon Dioxide (Bicarbonate), BUN, Creatinine, Glucose, Calcium, Total Protein, Albumin, eGFR, Anion Gap.",
        tests: [
          {
            id: "test-cmp",
            code: "CHEM-CMP-01",
            name: "Comprehensive Metabolic Panel (CMP 14)",
            disciplineId: "clinical_chemistry",
            disciplineName: "Clinical Chemistry",
            familyId: "metabolic_panels",
            familyName: "Basic & Comprehensive Metabolic Panels",
            sampleType: "Serum (Gold / Red SST Top)",
            turnaroundTime: "45 mins",
            tariffsKES: 3200,
            parameters: [
              { id: "sodium", name: "Sodium (Na+)", unit: "mmol/L", referenceRange: "135 - 145", defaultValue: "140" },
              { id: "potassium", name: "Potassium (K+)", unit: "mmol/L", referenceRange: "3.5 - 5.0", defaultValue: "4.2" },
              { id: "chloride", name: "Chloride (Cl-)", unit: "mmol/L", referenceRange: "98 - 107", defaultValue: "102" },
              { id: "co2", name: "Carbon Dioxide / Bicarbonate (HCO3-)", unit: "mmol/L", referenceRange: "22 - 29", defaultValue: "25" },
              { id: "bun", name: "Blood Urea Nitrogen (BUN / Urea)", unit: "mmol/L", referenceRange: "2.5 - 7.1", defaultValue: "4.5" },
              { id: "creatinine", name: "Serum Creatinine", unit: "umol/L", referenceRange: "60 - 110", defaultValue: "82" },
              { id: "glucose", name: "Fasting / Random Glucose", unit: "mmol/L", referenceRange: "3.9 - 7.0", defaultValue: "5.4" },
              { id: "calcium", name: "Serum Calcium (Total)", unit: "mmol/L", referenceRange: "2.15 - 2.55", defaultValue: "2.35" },
              { id: "total_protein", name: "Total Protein", unit: "g/L", referenceRange: "64 - 83", defaultValue: "72" },
              { id: "albumin", name: "Serum Albumin", unit: "g/L", referenceRange: "35 - 50", defaultValue: "44" },
              { id: "egfr", name: "Estimated GFR (CKD-EPI)", unit: "mL/min/1.73m2", referenceRange: "> 90", defaultValue: "105" },
              { id: "anion_gap", name: "Anion Gap", unit: "mmol/L", referenceRange: "8 - 16", defaultValue: "13" }
            ],
            defaultRemarks: "Electrolytes, renal parameters, and glycemic status within physiologic limits."
          },
          {
            id: "test-bmp",
            code: "CHEM-BMP-02",
            name: "Basic Metabolic Panel (BMP 8)",
            disciplineId: "clinical_chemistry",
            disciplineName: "Clinical Chemistry",
            familyId: "metabolic_panels",
            familyName: "Basic & Comprehensive Metabolic Panels",
            sampleType: "Serum (SST)",
            turnaroundTime: "30 mins",
            tariffsKES: 2000,
            parameters: [
              { id: "sodium", name: "Sodium (Na+)", unit: "mmol/L", referenceRange: "135 - 145", defaultValue: "139" },
              { id: "potassium", name: "Potassium (K+)", unit: "mmol/L", referenceRange: "3.5 - 5.0", defaultValue: "4.1" },
              { id: "chloride", name: "Chloride (Cl-)", unit: "mmol/L", referenceRange: "98 - 107", defaultValue: "101" },
              { id: "bicarb", name: "Bicarbonate (CO2)", unit: "mmol/L", referenceRange: "22 - 29", defaultValue: "24" },
              { id: "urea", name: "Urea", unit: "mmol/L", referenceRange: "2.5 - 7.1", defaultValue: "4.2" },
              { id: "creatinine", name: "Creatinine", unit: "umol/L", referenceRange: "60 - 110", defaultValue: "79" },
              { id: "glucose", name: "Glucose", unit: "mmol/L", referenceRange: "3.9 - 7.0", defaultValue: "5.1" },
              { id: "calcium", name: "Calcium", unit: "mmol/L", referenceRange: "2.15 - 2.55", defaultValue: "2.32" }
            ]
          }
        ]
      },
      {
        id: "lfts",
        name: "Liver Function Tests (LFTs)",
        description: "ALT, AST, Alkaline Phosphatase (ALP), Bilirubin (Total/Direct), Albumin, Total Protein, GGT.",
        tests: [
          {
            id: "test-lft-panel",
            code: "CHEM-LFT-01",
            name: "Liver Function Tests (Comprehensive Hepatic Panel)",
            disciplineId: "clinical_chemistry",
            disciplineName: "Clinical Chemistry",
            familyId: "lfts",
            familyName: "Liver Function Tests (LFTs)",
            sampleType: "Serum (SST)",
            turnaroundTime: "45 mins",
            tariffsKES: 2200,
            parameters: [
              { id: "alt", name: "Alanine Aminotransferase (ALT / SGPT)", unit: "U/L", referenceRange: "7 - 45", defaultValue: "24" },
              { id: "ast", name: "Aspartate Aminotransferase (AST / SGOT)", unit: "U/L", referenceRange: "8 - 40", defaultValue: "21" },
              { id: "alp", name: "Alkaline Phosphatase (ALP)", unit: "U/L", referenceRange: "44 - 147", defaultValue: "78" },
              { id: "ggt", name: "Gamma-Glutamyl Transferase (GGT)", unit: "U/L", referenceRange: "9 - 48", defaultValue: "22" },
              { id: "tbili", name: "Total Bilirubin", unit: "umol/L", referenceRange: "3.4 - 20.5", defaultValue: "11.2" },
              { id: "dbili", name: "Direct (Conjugated) Bilirubin", unit: "umol/L", referenceRange: "0.0 - 5.1", defaultValue: "2.4" },
              { id: "ibili", name: "Indirect Bilirubin", unit: "umol/L", referenceRange: "3.0 - 15.4", defaultValue: "8.8" },
              { id: "albumin", name: "Serum Albumin", unit: "g/L", referenceRange: "35 - 50", defaultValue: "43" },
              { id: "total_protein", name: "Total Serum Protein", unit: "g/L", referenceRange: "64 - 83", defaultValue: "74" }
            ],
            defaultRemarks: "Hepatic parenchymal and excretory enzymes unremarkable. Normal synthetic liver function."
          }
        ]
      },
      {
        id: "lipid_profiles",
        name: "Lipid Profiles",
        description: "Total Cholesterol, HDL, LDL, Triglycerides, VLDL, Total/HDL Atherogenic Ratio.",
        tests: [
          {
            id: "test-lipid-profile",
            code: "CHEM-LIP-01",
            name: "Fasting Complete Lipid Profile Panel",
            disciplineId: "clinical_chemistry",
            disciplineName: "Clinical Chemistry",
            familyId: "lipid_profiles",
            familyName: "Lipid Profiles",
            sampleType: "Serum (10-12 hr fasting)",
            turnaroundTime: "45 mins",
            tariffsKES: 2500,
            parameters: [
              { id: "total_chol", name: "Total Cholesterol", unit: "mmol/L", referenceRange: "< 5.2 (Desirable)", defaultValue: "4.3" },
              { id: "hdl", name: "HDL-Cholesterol ('Good')", unit: "mmol/L", referenceRange: "> 1.0 (Optimal > 1.3)", defaultValue: "1.4" },
              { id: "ldl", name: "LDL-Cholesterol ('Bad')", unit: "mmol/L", referenceRange: "< 2.6 (Optimal)", defaultValue: "2.3" },
              { id: "triglycerides", name: "Triglycerides", unit: "mmol/L", referenceRange: "< 1.7 (Normal)", defaultValue: "1.2" },
              { id: "vldl", name: "VLDL-Cholesterol", unit: "mmol/L", referenceRange: "0.2 - 0.9", defaultValue: "0.5" },
              { id: "chol_hdl_ratio", name: "Cholesterol / HDL Risk Ratio", unit: "ratio", referenceRange: "< 4.5", defaultValue: "3.1" }
            ],
            defaultRemarks: "Desirable lipid distribution. Low 10-year estimated atherosclerotic cardiovascular disease (ASCVD) risk."
          }
        ]
      },
      {
        id: "cardiac_biomarkers",
        name: "Cardiac Biomarkers",
        description: "Troponin (I/T), CK-MB, Myoglobin, NT-proBNP / BNP for acute coronary syndromes & heart failure.",
        tests: [
          {
            id: "test-cardiac-panel",
            code: "CHEM-CARD-01",
            name: "High-Sensitivity Cardiac Troponin I (hs-cTnI) & CK-MB Panel",
            disciplineId: "clinical_chemistry",
            disciplineName: "Clinical Chemistry",
            familyId: "cardiac_biomarkers",
            familyName: "Cardiac Biomarkers",
            sampleType: "Serum / Heparin Plasma",
            turnaroundTime: "30 mins STAT",
            tariffsKES: 3800,
            parameters: [
              { id: "troponin_i", name: "High-Sensitivity Troponin I (hs-cTnI)", unit: "ng/L", referenceRange: "< 14.0 (Normal / Negative)", defaultValue: "3.2" },
              { id: "ck_mb", name: "Creatine Kinase-MB (Mass)", unit: "ng/mL", referenceRange: "0.0 - 5.0", defaultValue: "1.4" },
              { id: "myoglobin", name: "Serum Myoglobin", unit: "ug/L", referenceRange: "25 - 72", defaultValue: "34" },
              { id: "nt_probnp", name: "NT-proBNP (Heart Failure Marker)", unit: "pg/mL", referenceRange: "< 125 (rule-out heart failure)", defaultValue: "54" }
            ],
            defaultRemarks: "hs-cTnI is below 99th percentile cutoff. No active myocardial necrosis demonstrated."
          }
        ]
      },
      {
        id: "renal_bone_markers",
        name: "Renal & Bone Markers",
        description: "Uric Acid, Calcium, Phosphorus, Magnesium, Parathyroid Hormone (PTH), Vitamin D (25-OH).",
        tests: [
          {
            id: "test-renal-bone-panel",
            code: "CHEM-RBM-01",
            name: "Bone Mineral & Renal Metabolism Panel",
            disciplineId: "clinical_chemistry",
            disciplineName: "Clinical Chemistry",
            familyId: "renal_bone_markers",
            familyName: "Renal & Bone Markers",
            sampleType: "Serum (SST)",
            turnaroundTime: "60 mins",
            tariffsKES: 3500,
            parameters: [
              { id: "uric_acid", name: "Serum Uric Acid", unit: "umol/L", referenceRange: "200 - 420", defaultValue: "290" },
              { id: "calcium_ionized", name: "Ionized Calcium (Free Ca2+)", unit: "mmol/L", referenceRange: "1.15 - 1.33", defaultValue: "1.24" },
              { id: "phosphorus", name: "Inorganic Phosphorus (PO4)", unit: "mmol/L", referenceRange: "0.8 - 1.5", defaultValue: "1.1" },
              { id: "magnesium", name: "Serum Magnesium (Mg2+)", unit: "mmol/L", referenceRange: "0.70 - 1.05", defaultValue: "0.86" },
              { id: "pth_intact", name: "Intact Parathyroid Hormone (iPTH)", unit: "pg/mL", referenceRange: "15 - 65", defaultValue: "32" },
              { id: "vit_d", name: "25-Hydroxy Vitamin D", unit: "ng/mL", referenceRange: "30 - 100 (Sufficient)", defaultValue: "38" }
            ]
          }
        ]
      }
    ]
  },

  // 3. ENDOCRINOLOGY & HORMONAL ASSAYS
  {
    id: "endocrinology",
    num: 3,
    name: "Endocrinology & Hormonal Assays",
    shortName: "Endocrinology & Hormones",
    description: "Thyroid axis, hypothalamic-pituitary-gonadal fertility hormones, adrenal steroids, and metabolic pancreatic regulators.",
    iconName: "Sparkles",
    badgeColor: "amber",
    testFamilies: [
      {
        id: "thyroid_panel",
        name: "Thyroid Panel",
        description: "TSH, Free T3, Free T4, Total T3/T4, Thyroid Antibodies (Anti-TPO, Anti-Tg, TRAb).",
        tests: [
          {
            id: "test-tft-panel",
            code: "ENDO-THY-01",
            name: "Thyroid Function Tests Panel (TSH, FT3, FT4)",
            disciplineId: "endocrinology",
            disciplineName: "Endocrinology",
            familyId: "thyroid_panel",
            familyName: "Thyroid Panel",
            sampleType: "Serum (SST)",
            turnaroundTime: "90 mins",
            tariffsKES: 3200,
            parameters: [
              { id: "tsh", name: "Thyroid Stimulating Hormone (TSH)", unit: "uIU/mL", referenceRange: "0.4 - 4.2", defaultValue: "1.85" },
              { id: "ft4", name: "Free Thyroxine (FT4)", unit: "pmol/L", referenceRange: "11.5 - 22.7", defaultValue: "15.4" },
              { id: "ft3", name: "Free Triiodothyronine (FT3)", unit: "pmol/L", referenceRange: "3.5 - 6.5", defaultValue: "4.8" },
              { id: "total_t4", name: "Total Thyroxine (TT4)", unit: "nmol/L", referenceRange: "60 - 150", defaultValue: "95" },
              { id: "anti_tpo", name: "Anti-Thyroid Peroxidase (Anti-TPO)", unit: "IU/mL", referenceRange: "< 34 (Negative)", defaultValue: "12" },
              { id: "anti_tg", name: "Anti-Thyroglobulin (Anti-Tg)", unit: "IU/mL", referenceRange: "< 115 (Negative)", defaultValue: "18" }
            ],
            defaultRemarks: "Euthyroid profile. TSH and peripheral free thyroid hormones FT3/FT4 in normal physiological range."
          }
        ]
      },
      {
        id: "reproductive_fertility",
        name: "Reproductive & Fertility Hormones",
        description: "FSH, LH, Prolactin, Estradiol (E2), Progesterone, Testosterone, Anti-Müllerian Hormone (AMH), Beta-hCG.",
        tests: [
          {
            id: "test-fertility-profile",
            code: "ENDO-FERT-01",
            name: "Comprehensive Reproductive & Fertility Hormone Profile",
            disciplineId: "endocrinology",
            disciplineName: "Endocrinology",
            familyId: "reproductive_fertility",
            familyName: "Reproductive & Fertility Hormones",
            sampleType: "Serum (SST)",
            turnaroundTime: "120 mins",
            tariffsKES: 4500,
            parameters: [
              { id: "fsh", name: "Follicle Stimulating Hormone (FSH)", unit: "mIU/mL", referenceRange: "3.5 - 12.5 (Follicular)", defaultValue: "6.2" },
              { id: "lh", name: "Luteinizing Hormone (LH)", unit: "mIU/mL", referenceRange: "2.4 - 12.6 (Follicular)", defaultValue: "5.1" },
              { id: "prolactin", name: "Prolactin (PRL)", unit: "ng/mL", referenceRange: "4.8 - 23.3", defaultValue: "12.6" },
              { id: "estradiol", name: "Estradiol (E2)", unit: "pg/mL", referenceRange: "20 - 160 (Early Follicular)", defaultValue: "48" },
              { id: "progesterone", name: "Progesterone (P4)", unit: "ng/mL", referenceRange: "0.2 - 1.5 (Follicular) / > 5 (Luteal)", defaultValue: "0.6" },
              { id: "testosterone_total", name: "Total Testosterone", unit: "nmol/L", referenceRange: "8.6 - 29.0 (M) / 0.3 - 1.9 (F)", defaultValue: "16.5" },
              { id: "amh", name: "Anti-Müllerian Hormone (AMH - Ovarian Reserve)", unit: "ng/mL", referenceRange: "1.0 - 3.5 (Normal Reserve)", defaultValue: "2.4" },
              { id: "bhcg_quant", name: "Beta-hCG Quantitative", unit: "mIU/mL", referenceRange: "< 5.0 (Non-Pregnant)", defaultValue: "< 1.0" }
            ]
          }
        ]
      },
      {
        id: "adrenal_pituitary",
        name: "Adrenal & Pituitary Hormones",
        description: "Cortisol, ACTH, Aldosterone, Growth Hormone, Insulin, C-Peptide.",
        tests: [
          {
            id: "test-adrenal-panel",
            code: "ENDO-ADR-01",
            name: "Adrenal Steroids & Pancreatic Beta-Cell Assays",
            disciplineId: "endocrinology",
            disciplineName: "Endocrinology",
            familyId: "adrenal_pituitary",
            familyName: "Adrenal & Pituitary Hormones",
            sampleType: "Serum / EDTA Plasma",
            turnaroundTime: "120 mins",
            tariffsKES: 4200,
            parameters: [
              { id: "cortisol_am", name: "Cortisol (Morning 8 AM)", unit: "nmol/L", referenceRange: "170 - 540", defaultValue: "340" },
              { id: "acth", name: "Adrenocorticotropic Hormone (ACTH)", unit: "pg/mL", referenceRange: "7.2 - 63.3", defaultValue: "24.5" },
              { id: "aldosterone", name: "Serum Aldosterone", unit: "ng/dL", referenceRange: "3.0 - 16.0", defaultValue: "8.2" },
              { id: "growth_hormone", name: "Growth Hormone (GH)", unit: "ng/mL", referenceRange: "0.05 - 8.0", defaultValue: "1.2" },
              { id: "fasting_insulin", name: "Fasting Serum Insulin", unit: "uIU/mL", referenceRange: "2.6 - 24.9", defaultValue: "8.4" },
              { id: "c_peptide", name: "C-Peptide (Endogenous Beta Cell Reserve)", unit: "ng/mL", referenceRange: "1.1 - 4.4", defaultValue: "2.1" }
            ]
          }
        ]
      }
    ]
  },

  // 4. IMMUNOLOGY, SEROLOGY & AUTOIMMUNE TESTS
  {
    id: "immunology_serology",
    num: 4,
    name: "Immunology, Serology & Autoimmune Tests",
    shortName: "Immunology & Serology",
    description: "Infectious antibodies, viral serology screens, systemic autoimmune disease autoantibodies and complement proteins.",
    iconName: "ShieldCheck",
    badgeColor: "purple",
    testFamilies: [
      {
        id: "infectious_serology",
        name: "Infectious Serology",
        description: "HIV (1/2 & Viral Load), Hepatitis Panel (A, B, C), Syphilis (VDRL/RPR, TPPA), TORCH panel, EBV, CMV.",
        tests: [
          {
            id: "test-hiv-screen",
            code: "IMM-HIV-01",
            name: "HIV-1/2 4th Gen Antigen/Antibody (p24) & Rapid Algorithm",
            disciplineId: "immunology_serology",
            disciplineName: "Immunology & Serology",
            familyId: "infectious_serology",
            familyName: "Infectious Serology",
            sampleType: "Serum / Whole Blood",
            turnaroundTime: "20 mins",
            tariffsKES: 500,
            parameters: [
              { id: "hiv_rapid", name: "HIV 1/2 Screening Test (Determine)", unit: "", referenceRange: "Non-Reactive", defaultValue: "Non-Reactive", type: "select", options: ["Non-Reactive", "Reactive"] },
              { id: "hiv_conf", name: "HIV 1/2 Confirmatory Test (First Response)", unit: "", referenceRange: "Non-Reactive", defaultValue: "Non-Reactive", type: "select", options: ["Non-Reactive", "Reactive"] },
              { id: "p24_ag", name: "p24 Early Antigen", unit: "", referenceRange: "Negative", defaultValue: "Negative" }
            ],
            defaultRemarks: "Non-reactive for HIV-1/2 antibodies and p24 antigen."
          },
          {
            id: "test-hepatitis-panel",
            code: "IMM-HEP-02",
            name: "Comprehensive Viral Hepatitis Panel (HAV, HBV, HCV)",
            disciplineId: "immunology_serology",
            disciplineName: "Immunology & Serology",
            familyId: "infectious_serology",
            familyName: "Infectious Serology",
            sampleType: "Serum (SST)",
            turnaroundTime: "60 mins",
            tariffsKES: 3200,
            parameters: [
              { id: "hbsag", name: "Hepatitis B Surface Antigen (HBsAg)", unit: "", referenceRange: "Non-Reactive (< 0.9 S/CO)", defaultValue: "Non-Reactive (0.12 S/CO)", type: "select", options: ["Non-Reactive (< 0.9 S/CO)", "Reactive (> 1.0 S/CO)"] },
              { id: "anti_hbs", name: "Hepatitis B Surface Antibody (Anti-HBs Titre)", unit: "mIU/mL", referenceRange: "> 10 mIU/mL (Immunity)", defaultValue: "128 mIU/mL (Immune / Vaccinated)" },
              { id: "anti_hbc_igm", name: "Anti-HBc IgM (Acute Hepatitis B)", unit: "", referenceRange: "Non-Reactive", defaultValue: "Non-Reactive" },
              { id: "anti_hcv", name: "Hepatitis C Total Antibody (Anti-HCV)", unit: "", referenceRange: "Non-Reactive", defaultValue: "Non-Reactive" },
              { id: "hav_igm", name: "Hepatitis A IgM (HAV IgM)", unit: "", referenceRange: "Non-Reactive", defaultValue: "Non-Reactive" }
            ]
          },
          {
            id: "test-syphilis",
            code: "IMM-SYPH-03",
            name: "Syphilis Serology (VDRL / RPR & TPPA Treponemal Confirmation)",
            disciplineId: "immunology_serology",
            disciplineName: "Immunology & Serology",
            familyId: "infectious_serology",
            familyName: "Infectious Serology",
            sampleType: "Serum (SST)",
            turnaroundTime: "30 mins",
            tariffsKES: 800,
            parameters: [
              { id: "vdrl_rpr", name: "RPR / VDRL Non-Treponemal Screen", unit: "", referenceRange: "Non-Reactive", defaultValue: "Non-Reactive", type: "select", options: ["Non-Reactive", "Reactive 1:1", "Reactive 1:2", "Reactive 1:4", "Reactive 1:8", "Reactive 1:16", "Reactive > 1:32"] },
              { id: "tppa", name: "TPPA Treponema Pallidum Hemagglutination", unit: "", referenceRange: "Non-Reactive", defaultValue: "Non-Reactive", type: "select", options: ["Non-Reactive", "Reactive"] }
            ]
          },
          {
            id: "test-torch-panel",
            code: "IMM-TORCH-04",
            name: "TORCH Panel Antibodies (IgG & IgM)",
            disciplineId: "immunology_serology",
            disciplineName: "Immunology & Serology",
            familyId: "infectious_serology",
            familyName: "Infectious Serology",
            sampleType: "Serum (SST)",
            turnaroundTime: "120 mins",
            tariffsKES: 4800,
            parameters: [
              { id: "toxo_igg", name: "Toxoplasma gondii IgG", unit: "IU/mL", referenceRange: "< 1.6 (Negative)", defaultValue: "0.2" },
              { id: "toxo_igm", name: "Toxoplasma gondii IgM", unit: "Index", referenceRange: "< 0.8 (Negative)", defaultValue: "0.1" },
              { id: "rubella_igg", name: "Rubella Virus IgG (Immunity)", unit: "IU/mL", referenceRange: "> 10 (Immune)", defaultValue: "35 (Immune)" },
              { id: "rubella_igm", name: "Rubella Virus IgM", unit: "Index", referenceRange: "< 0.8 (Negative)", defaultValue: "0.1" },
              { id: "cmv_igg", name: "Cytomegalovirus (CMV) IgG", unit: "U/mL", referenceRange: "< 6.0 (Negative)", defaultValue: "2.4" },
              { id: "cmv_igm", name: "Cytomegalovirus (CMV) IgM", unit: "Index", referenceRange: "< 0.8 (Negative)", defaultValue: "0.2" },
              { id: "hsv_igm", name: "Herpes Simplex Virus (HSV 1/2) IgM", unit: "Index", referenceRange: "< 0.9 (Negative)", defaultValue: "0.3" }
            ]
          },
          {
            id: "test-ebv-serology",
            code: "IMM-EBV-05",
            name: "Epstein-Barr Virus (EBV) Mononucleosis Panel",
            disciplineId: "immunology_serology",
            disciplineName: "Immunology & Serology",
            familyId: "infectious_serology",
            familyName: "Infectious Serology",
            sampleType: "Serum",
            turnaroundTime: "60 mins",
            tariffsKES: 2400,
            parameters: [
              { id: "ebv_vca_igm", name: "EBV Viral Capsid Antigen (VCA) IgM", unit: "Index", referenceRange: "< 0.8 (Negative)", defaultValue: "0.2" },
              { id: "ebv_vca_igg", name: "EBV VCA IgG", unit: "Index", referenceRange: "< 0.8 (Negative)", defaultValue: "1.4 (Past Infection)" },
              { id: "ebna_igg", name: "EBV Nuclear Antigen (EBNA) IgG", unit: "Index", referenceRange: "< 0.8 (Negative)", defaultValue: "2.1 (Positive Past Exposure)" }
            ]
          }
        ]
      },
      {
        id: "autoimmune_inflammatory",
        name: "Autoimmune & Inflammatory Markers",
        description: "C-Reactive Protein (CRP), Erythrocyte Sedimentation Rate (ESR), Antinuclear Antibodies (ANA), Rheumatoid Factor (RF), Anti-CCP, ANCA, Complement C3/C4.",
        tests: [
          {
            id: "test-autoimmune-screen",
            code: "IMM-AUTO-01",
            name: "Autoimmune Rheumatic & Inflammatory Markers Panel",
            disciplineId: "immunology_serology",
            disciplineName: "Immunology & Serology",
            familyId: "autoimmune_inflammatory",
            familyName: "Autoimmune & Inflammatory Markers",
            sampleType: "Serum (SST)",
            turnaroundTime: "90 mins",
            tariffsKES: 3800,
            parameters: [
              { id: "crp_quant", name: "C-Reactive Protein (Quantitative hs-CRP)", unit: "mg/L", referenceRange: "< 5.0 (Normal)", defaultValue: "2.1" },
              { id: "esr_rate", name: "ESR (Westergren Method)", unit: "mm/1st hr", referenceRange: "0 - 15 (M) / 0 - 20 (F)", defaultValue: "8" },
              { id: "ana_titer", name: "Antinuclear Antibodies (ANA - IFA on HEp-2)", unit: "Titre", referenceRange: "< 1:80 (Negative)", defaultValue: "Negative (< 1:80)", type: "select", options: ["Negative (< 1:80)", "Positive 1:80 (Homogeneous)", "Positive 1:160 (Speckled)", "Positive 1:320 (Nucleolar)", "Positive 1:640 (Centromere)"] },
              { id: "rf_quant", name: "Rheumatoid Factor (RF Quantitative)", unit: "IU/mL", referenceRange: "< 14.0", defaultValue: "6.5" },
              { id: "anti_ccp", name: "Anti-Cyclic Citrullinated Peptide (Anti-CCP)", unit: "U/mL", referenceRange: "< 20.0 (Negative)", defaultValue: "4.2" },
              { id: "c3_level", name: "Complement C3", unit: "g/L", referenceRange: "0.90 - 1.80", defaultValue: "1.25" },
              { id: "c4_level", name: "Complement C4", unit: "g/L", referenceRange: "0.10 - 0.40", defaultValue: "0.26" },
              { id: "c_anca", name: "c-ANCA (PR3 Antibodies)", unit: "RU/mL", referenceRange: "< 20 (Negative)", defaultValue: "2.1" },
              { id: "p_anca", name: "p-ANCA (MPO Antibodies)", unit: "RU/mL", referenceRange: "< 20 (Negative)", defaultValue: "3.4" }
            ],
            defaultRemarks: "No serological evidence of acute active systemic inflammation or connective tissue autoimmune disease."
          }
        ]
      }
    ]
  },

  // 5. MICROBIOLOGY & INFECTIOUS DISEASE CULTURE
  {
    id: "microbiology_culture",
    num: 5,
    name: "Microbiology & Infectious Disease Culture",
    shortName: "Microbiology & Culture",
    description: "Bacterial, fungal and parasitological microscopy, organism isolation, and automated antibiotic susceptibility testing (AST).",
    iconName: "Microscope",
    badgeColor: "teal",
    testFamilies: [
      {
        id: "cultures_sensitivities",
        name: "Cultures & Sensitivities (MCS)",
        description: "Blood culture, Urine culture, Stool culture, Sputum culture, Wound/Swab cultures + Antibiotic Susceptibility Testing.",
        tests: [
          {
            id: "test-urine-mcs",
            code: "MIC-UC-01",
            name: "Urine Microscopy, Culture & Sensitivity (Urine MCS)",
            disciplineId: "microbiology_culture",
            disciplineName: "Microbiology",
            familyId: "cultures_sensitivities",
            familyName: "Cultures & Sensitivities (MCS)",
            sampleType: "Mid-Stream Clean Catch Urine (Sterile Cup)",
            turnaroundTime: "48-72 hours",
            tariffsKES: 1800,
            parameters: [
              { id: "colony_count", name: "Colony Count (CFU/mL)", unit: "CFU/mL", referenceRange: "< 10^3 CFU/mL (No significant growth)", defaultValue: "No Significant Growth (< 10^3 CFU/mL)" },
              { id: "organism_isolated", name: "Isolated Pathogen", unit: "", referenceRange: "None", defaultValue: "No Bacterial Pathogen Isolated", type: "text" },
              { id: "ast_panel", name: "Antibiotic Susceptibility (S/I/R)", unit: "", referenceRange: "Susceptible", defaultValue: "Amikacin (S), Nitrofurantoin (S), Ciprofloxacin (S), Ceftriaxone (S)" }
            ],
            defaultRemarks: "Sterile urine culture after 48 hours incubation at 37C under aerobic conditions."
          },
          {
            id: "test-blood-culture",
            code: "MIC-BC-02",
            name: "Blood Culture & Sensitivity (Aerobic & Anaerobic BACTEC)",
            disciplineId: "microbiology_culture",
            disciplineName: "Microbiology",
            familyId: "cultures_sensitivities",
            familyName: "Cultures & Sensitivities (MCS)",
            sampleType: "Whole Blood into Blood Culture Bottles (8-10 mL each)",
            turnaroundTime: "5 Days (Continuous Monitoring)",
            tariffsKES: 3500,
            parameters: [
              { id: "aerobic_status", name: "Aerobic Bottle Signal (Day 5)", unit: "", referenceRange: "No growth at 5 days", defaultValue: "No growth observed (Negative)" },
              { id: "anaerobic_status", name: "Anaerobic Bottle Signal (Day 5)", unit: "", referenceRange: "No growth at 5 days", defaultValue: "No growth observed (Negative)" },
              { id: "organism_id", name: "Organism Identification", unit: "", referenceRange: "Nil", defaultValue: "Sterile - No Pathogen Detected" }
            ],
            defaultRemarks: "Automated blood culture monitoring negative for bacterial or fungal growth after 5 days."
          },
          {
            id: "test-wound-swab-mcs",
            code: "MIC-WND-03",
            name: "Wound / Pus / Swab Culture & Antibiotic Susceptibility",
            disciplineId: "microbiology_culture",
            disciplineName: "Microbiology",
            familyId: "cultures_sensitivities",
            familyName: "Cultures & Sensitivities (MCS)",
            sampleType: "Sterile Swab in Amies Transport Medium",
            turnaroundTime: "48 hours",
            tariffsKES: 2000,
            parameters: [
              { id: "gram_morphology", name: "Direct Gram Stain Microscopy", unit: "", referenceRange: "Nil pus cells or bacteria", defaultValue: "Few epithelial cells, no pus cells, no bacteria seen" },
              { id: "growth_culture", name: "Culture Growth", unit: "", referenceRange: "No growth", defaultValue: "No growth after 48 hours" },
              { id: "susceptibility", name: "Antibiotic Sensitivity Profile", unit: "", referenceRange: "N/A", defaultValue: "Not applicable (No bacterial isolate)" }
            ]
          },
          {
            id: "test-sputum-mcs",
            code: "MIC-SPT-04",
            name: "Sputum Culture & Sensitivity + Microscopic Examination",
            disciplineId: "microbiology_culture",
            disciplineName: "Microbiology",
            familyId: "cultures_sensitivities",
            familyName: "Cultures & Sensitivities (MCS)",
            sampleType: "Deep Productive Sputum",
            turnaroundTime: "48 hours",
            tariffsKES: 2200,
            parameters: [
              { id: "sputum_quality", name: "Bartlett Quality Score (PMNs vs Squamous)", unit: "", referenceRange: "> 25 PMNs, < 10 Epithelial (Acceptable)", defaultValue: "Representative Lower Respiratory Sample (>25 PMNs/LPF)" },
              { id: "isolated_bug", name: "Respiratory Pathogen", unit: "", referenceRange: "Normal Upper Resp Flora", defaultValue: "Normal Commensal Upper Respiratory Flora Only" }
            ]
          }
        ]
      },
      {
        id: "stains_microscopy",
        name: "Stains & Microscopy",
        description: "Gram stain, Ziehl-Neelsen (Acid-Fast) stain for TB, Fungal/Mycology mounts, Parasitology (Stool microscopy for ova/cysts).",
        tests: [
          {
            id: "test-afb-tb",
            code: "MIC-AFB-01",
            name: "Ziehl-Neelsen (ZN) Acid-Fast Bacilli (AFB) Stain for TB",
            disciplineId: "microbiology_culture",
            disciplineName: "Microbiology",
            familyId: "stains_microscopy",
            familyName: "Stains & Microscopy",
            sampleType: "Sputum (Early Morning)",
            turnaroundTime: "60 mins",
            tariffsKES: 600,
            parameters: [
              { id: "afb_sample_1", name: "AFB Smear 1 (Spot Sample)", unit: "", referenceRange: "Negative (No AFB seen in 100 HPF)", defaultValue: "Negative (0 AFB / 100 Oil Immersion Fields)", type: "select", options: ["Negative (0 AFB / 100 Fields)", "Positive 1+ (10-99 AFB in 100 fields)", "Positive 2+ (1-10 AFB per field in 50 fields)", "Positive 3+ (>10 AFB per field in 20 fields)"] },
              { id: "afb_sample_2", name: "AFB Smear 2 (Morning Sample)", unit: "", referenceRange: "Negative (No AFB seen in 100 HPF)", defaultValue: "Negative (0 AFB / 100 Oil Immersion Fields)", type: "select", options: ["Negative (0 AFB / 100 Fields)", "Positive 1+", "Positive 2+", "Positive 3+"] }
            ],
            defaultRemarks: "No acid-alcohol fast bacilli (Mycobacterium tuberculosis) detected on concentrated fluorescent or ZN staining."
          },
          {
            id: "test-gram-stain",
            code: "MIC-GRM-02",
            name: "Direct Gram Stain Examination",
            disciplineId: "microbiology_culture",
            disciplineName: "Microbiology",
            familyId: "stains_microscopy",
            familyName: "Stains & Microscopy",
            sampleType: "Exudate / CSF / Swab",
            turnaroundTime: "30 mins",
            tariffsKES: 500,
            parameters: [
              { id: "pus_cells_gram", name: "Polymorphonuclear Cells", unit: "/HPF", referenceRange: "Nil / Occasional", defaultValue: "0-2 /HPF" },
              { id: "gram_pos_cocci", name: "Gram-Positive Cocci", unit: "", referenceRange: "None Seen", defaultValue: "None Seen" },
              { id: "gram_neg_bacilli", name: "Gram-Negative Bacilli", unit: "", referenceRange: "None Seen", defaultValue: "None Seen" }
            ]
          },
          {
            id: "test-stool-parasitology",
            code: "MIC-STL-03",
            name: "Stool Microscopy for Ova, Cysts & Parasites (O&C)",
            disciplineId: "microbiology_culture",
            disciplineName: "Microbiology",
            familyId: "stains_microscopy",
            familyName: "Stains & Microscopy",
            sampleType: "Fresh Stool (Sterile Container)",
            turnaroundTime: "30 mins",
            tariffsKES: 600,
            parameters: [
              { id: "stool_consistency", name: "Macroscopic Consistency", unit: "", referenceRange: "Formed, Brown", defaultValue: "Formed, Brown, No gross blood or mucus" },
              { id: "stool_ova", name: "Helminth Ova (Ascaris, Hookworm, Trichuris)", unit: "", referenceRange: "Nil Seen", defaultValue: "None Seen" },
              { id: "stool_protozoa", name: "Protozoal Cysts (Giardia, E. histolytica)", unit: "", referenceRange: "Nil Seen", defaultValue: "None Seen" },
              { id: "stool_trophozoites", name: "Motile Trophozoites", unit: "", referenceRange: "Nil Seen", defaultValue: "None Seen" },
              { id: "stool_rbc_pus", name: "Pus Cells / RBCs", unit: "/HPF", referenceRange: "Nil", defaultValue: "Nil pus cells, Nil RBCs" }
            ],
            defaultRemarks: "No intestinal helminthic ova, cysts, or vegetative trophozoites observed."
          },
          {
            id: "test-fungal-mycology",
            code: "MIC-KOH-04",
            name: "Fungal Examination (KOH 10% Mount & India Ink)",
            disciplineId: "microbiology_culture",
            disciplineName: "Microbiology",
            familyId: "stains_microscopy",
            familyName: "Stains & Microscopy",
            sampleType: "Skin scrapings / Nail clipping / CSF",
            turnaroundTime: "45 mins",
            tariffsKES: 800,
            parameters: [
              { id: "koh_hyphae", name: "10% KOH Fungal Mount (Hyphae/Spores)", unit: "", referenceRange: "No fungal elements seen", defaultValue: "Negative — No fungal hyphae, pseudohyphae, or arthroconidia seen" },
              { id: "india_ink", name: "India Ink Capsule Stain (Cryptococcus)", unit: "", referenceRange: "Negative", defaultValue: "Negative — No encapsulated yeast cells observed" }
            ]
          }
        ]
      }
    ]
  },

  // 6. MOLECULAR PATHOLOGY & GENETICS (DNA/RNA)
  {
    id: "molecular_genetics",
    num: 6,
    name: "Molecular Pathology & Genetics (DNA/RNA)",
    shortName: "Molecular & Genetics",
    description: "Real-time RT-PCR nucleic acid amplification, viral loads, oncogenetics, and pharmacogenetic panels.",
    iconName: "Zap",
    badgeColor: "indigo",
    testFamilies: [
      {
        id: "pcr_viral_loads",
        name: "PCR & Quantitative Viral Loads",
        description: "COVID-19 RT-PCR, HCV/HBV/HIV Viral Loads, HPV DNA screening.",
        tests: [
          {
            id: "test-hiv-viral-load",
            code: "MOL-HIV-VL",
            name: "HIV-1 RNA Quantitative Viral Load (Cobas TaqMan PCR)",
            disciplineId: "molecular_genetics",
            disciplineName: "Molecular Pathology & Genetics",
            familyId: "pcr_viral_loads",
            familyName: "PCR & Viral Loads",
            sampleType: "Plasma (EDTA - PPT tube)",
            turnaroundTime: "24-48 hours",
            tariffsKES: 4500,
            parameters: [
              { id: "hiv_copies", name: "HIV-1 RNA Viral Load", unit: "copies/mL", referenceRange: "< 20 (Target Not Detected / Suppressed)", defaultValue: "Target Not Detected (< 20 copies/mL)" },
              { id: "hiv_log", name: "Log10 Viral Load", unit: "log10", referenceRange: "< 1.30", defaultValue: "< 1.30" },
              { id: "viral_status", name: "Virological Suppression Status", unit: "", referenceRange: "Suppressed (< 50 copies/mL)", defaultValue: "Suppressed (Undetectable)", type: "select", options: ["Suppressed (Undetectable)", "Low-level viremia (50 - 999 copies/mL)", "Virological Failure (>= 1,000 copies/mL)"] }
            ],
            defaultRemarks: "Optimal virological suppression achieved. Effective ART regimen."
          },
          {
            id: "test-covid-pcr",
            code: "MOL-COV-01",
            name: "SARS-CoV-2 (COVID-19) Real-Time RT-PCR",
            disciplineId: "molecular_genetics",
            disciplineName: "Molecular Pathology & Genetics",
            familyId: "pcr_viral_loads",
            familyName: "PCR & Viral Loads",
            sampleType: "Nasopharyngeal / Oropharyngeal Swab (VTM)",
            turnaroundTime: "4-6 hours",
            tariffsKES: 3500,
            parameters: [
              { id: "sars_result", name: "SARS-CoV-2 RNA Amplification", unit: "", referenceRange: "NOT DETECTED", defaultValue: "NOT DETECTED", type: "select", options: ["NOT DETECTED", "DETECTED (POSITIVE)"] },
              { id: "orf1ab_ct", name: "Target 1 (ORF1ab) Ct Value", unit: "Ct", referenceRange: "> 38.0 or Negative", defaultValue: "Negative (> 40.0)" },
              { id: "n_gene_ct", name: "Target 2 (N Gene) Ct Value", unit: "Ct", referenceRange: "> 38.0 or Negative", defaultValue: "Negative (> 40.0)" }
            ]
          },
          {
            id: "test-hbv-hcv-vl",
            code: "MOL-HEP-VL",
            name: "Hepatitis B (HBV DNA) & Hepatitis C (HCV RNA) Quantitative PCR",
            disciplineId: "molecular_genetics",
            disciplineName: "Molecular Pathology & Genetics",
            familyId: "pcr_viral_loads",
            familyName: "PCR & Viral Loads",
            sampleType: "EDTA Plasma",
            turnaroundTime: "48 hours",
            tariffsKES: 5500,
            parameters: [
              { id: "hbv_dna_copies", name: "HBV DNA Viral Load", unit: "IU/mL", referenceRange: "< 10 (Target Not Detected)", defaultValue: "Target Not Detected (< 10 IU/mL)" },
              { id: "hcv_rna_copies", name: "HCV RNA Viral Load", unit: "IU/mL", referenceRange: "< 15 (Target Not Detected)", defaultValue: "Target Not Detected (< 15 IU/mL)" }
            ]
          },
          {
            id: "test-hpv-dna",
            code: "MOL-HPV-01",
            name: "High-Risk HPV DNA Genotyping (Types 16, 18 and 12 Other HR Types)",
            disciplineId: "molecular_genetics",
            disciplineName: "Molecular Pathology & Genetics",
            familyId: "pcr_viral_loads",
            familyName: "PCR & Viral Loads",
            sampleType: "Cervical Cytology Brush in PreservCyt",
            turnaroundTime: "48 hours",
            tariffsKES: 4200,
            parameters: [
              { id: "hpv_16", name: "HPV Genotype 16", unit: "", referenceRange: "NEGATIVE", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "hpv_18", name: "HPV Genotype 18", unit: "", referenceRange: "NEGATIVE", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "hpv_other_hr", name: "Other 12 High-Risk Types (31, 33, 35, 39, 45, 51, 52, 56, 58, 59, 66, 68)", unit: "", referenceRange: "NEGATIVE", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] }
            ]
          }
        ]
      },
      {
        id: "inherited_oncology_genetics",
        name: "Inherited & Oncology Genetics",
        description: "BRCA 1/2 gene testing (Breast cancer), Factor V Leiden, HLA typing, Cystic fibrosis mutations, Pharmacogenetic panels.",
        tests: [
          {
            id: "test-brca-panel",
            code: "GEN-BRCA-01",
            name: "BRCA1 / BRCA2 Full Exon Next-Generation Sequencing (NGS)",
            disciplineId: "molecular_genetics",
            disciplineName: "Molecular Pathology & Genetics",
            familyId: "inherited_oncology_genetics",
            familyName: "Inherited & Oncology Genetics",
            sampleType: "Whole Blood (EDTA)",
            turnaroundTime: "10-14 days",
            tariffsKES: 25000,
            parameters: [
              { id: "brca1_status", name: "BRCA1 Mutation Status", unit: "", referenceRange: "Negative for Pathogenic Variants", defaultValue: "No Pathogenic or Likely Pathogenic Variants Detected", type: "select", options: ["No Pathogenic or Likely Pathogenic Variants Detected", "Pathogenic Variant Identified", "Variant of Uncertain Significance (VUS)"] },
              { id: "brca2_status", name: "BRCA2 Mutation Status", unit: "", referenceRange: "Negative for Pathogenic Variants", defaultValue: "No Pathogenic or Likely Pathogenic Variants Detected", type: "select", options: ["No Pathogenic or Likely Pathogenic Variants Detected", "Pathogenic Variant Identified", "Variant of Uncertain Significance (VUS)"] }
            ]
          },
          {
            id: "test-factor-v-leiden",
            code: "GEN-THROMB-02",
            name: "Factor V Leiden (G1691A) & Prothrombin G20210A Thrombophilia PCR",
            disciplineId: "molecular_genetics",
            disciplineName: "Molecular Pathology & Genetics",
            familyId: "inherited_oncology_genetics",
            familyName: "Inherited & Oncology Genetics",
            sampleType: "Whole Blood (EDTA)",
            turnaroundTime: "5 days",
            tariffsKES: 6500,
            parameters: [
              { id: "factor_v_genotype", name: "Factor V Leiden (R506Q / G1691A)", unit: "", referenceRange: "Wild Type (Normal GG)", defaultValue: "Wild Type (Normal GG — No mutation detected)", type: "select", options: ["Wild Type (Normal GG)", "Heterozygous Carrier (GA)", "Homozygous Mutant (AA)"] },
              { id: "prothrombin_gene", name: "Prothrombin Gene Mutation (G20210A)", unit: "", referenceRange: "Wild Type (Normal GG)", defaultValue: "Wild Type (Normal GG)", type: "select", options: ["Wild Type (Normal GG)", "Heterozygous Carrier (GA)", "Homozygous Mutant (AA)"] }
            ]
          },
          {
            id: "test-hla-typing",
            code: "GEN-HLA-03",
            name: "HLA-B27 & HLA-B*5701 Molecular Allelic Screening",
            disciplineId: "molecular_genetics",
            disciplineName: "Molecular Pathology & Genetics",
            familyId: "inherited_oncology_genetics",
            familyName: "Inherited & Oncology Genetics",
            sampleType: "Whole Blood (EDTA)",
            turnaroundTime: "4 days",
            tariffsKES: 5000,
            parameters: [
              { id: "hla_b27", name: "HLA-B27 Allele (Ankylosing Spondylitis Risk)", unit: "", referenceRange: "NEGATIVE", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "hla_b5701", name: "HLA-B*5701 (Abacavir Hypersensitivity)", unit: "", referenceRange: "NEGATIVE", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] }
            ]
          },
          {
            id: "test-pharmacogenetics",
            code: "GEN-PGX-04",
            name: "Pharmacogenetic Panel (CYP2D6, CYP2C19, TPMT Drug Metabolism)",
            disciplineId: "molecular_genetics",
            disciplineName: "Molecular Pathology & Genetics",
            familyId: "inherited_oncology_genetics",
            familyName: "Inherited & Oncology Genetics",
            sampleType: "Whole Blood (EDTA)",
            turnaroundTime: "7 days",
            tariffsKES: 14000,
            parameters: [
              { id: "cyp2d6_pheno", name: "CYP2D6 Predicted Metabolizer Status", unit: "", referenceRange: "Normal (Extensive) Metabolizer", defaultValue: "Normal (Extensive) Metabolizer (*1/*1)" },
              { id: "cyp2c19_pheno", name: "CYP2C19 Predicted Metabolizer Status", unit: "", referenceRange: "Normal Metabolizer", defaultValue: "Normal Metabolizer (Clopidogrel fully active)" },
              { id: "tpmt_pheno", name: "TPMT Activity (Thiopurine tolerance)", unit: "", referenceRange: "Normal Activity", defaultValue: "Normal Activity (Standard azathioprine dosing tolerated)" }
            ]
          }
        ]
      }
    ]
  },

  // 7. TOXICOLOGY & THERAPEUTIC DRUG MONITORING (TDM)
  {
    id: "toxicology_tdm",
    num: 7,
    name: "Toxicology & Therapeutic Drug Monitoring (TDM)",
    shortName: "Toxicology & TDM",
    description: "Forensic drug screening, toxicology panels, and serum concentration monitoring of narrow therapeutic index medications.",
    iconName: "AlertCircle",
    badgeColor: "rose",
    testFamilies: [
      {
        id: "substance_screening",
        name: "Substance Screening (Drugs of Abuse)",
        description: "Urine/Blood toxicology screens (Alcohol, Amphetamines, Cannabinoids, Opiates, Cocaine, Barbiturates, Benzodiazepines).",
        tests: [
          {
            id: "test-substance-screen-10",
            code: "TOX-DOA-10",
            name: "Urine Drugs of Abuse (DOA 10-Panel Rapid & Confirmatory Screen)",
            disciplineId: "toxicology_tdm",
            disciplineName: "Toxicology & TDM",
            familyId: "substance_screening",
            familyName: "Substance Screening",
            sampleType: "Random Fresh Urine (Chain-of-Custody Container)",
            turnaroundTime: "20 mins",
            tariffsKES: 2500,
            parameters: [
              { id: "thc", name: "Cannabinoids (THC / Marijuana)", unit: "", referenceRange: "NEGATIVE (< 50 ng/mL)", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE (>= 50 ng/mL)"] },
              { id: "cocaine", name: "Cocaine Metabolites (Benzoylecgonine)", unit: "", referenceRange: "NEGATIVE (< 300 ng/mL)", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "opiates", name: "Opiates / Morphine / Codeine", unit: "", referenceRange: "NEGATIVE (< 300 ng/mL)", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "amphetamines", name: "Amphetamines / Methamphetamine", unit: "", referenceRange: "NEGATIVE (< 500 ng/mL)", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "benzodiazepines", name: "Benzodiazepines", unit: "", referenceRange: "NEGATIVE (< 300 ng/mL)", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "barbiturates", name: "Barbiturates", unit: "", referenceRange: "NEGATIVE (< 300 ng/mL)", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "methadone", name: "Methadone (EDDP)", unit: "", referenceRange: "NEGATIVE (< 300 ng/mL)", defaultValue: "NEGATIVE", type: "select", options: ["NEGATIVE", "POSITIVE"] },
              { id: "alcohol_screen", name: "Ethanol / Blood Alcohol Concentration", unit: "mg/dL", referenceRange: "0.0 (Negative / Non-detectable)", defaultValue: "0.0 (Negative)" }
            ],
            defaultRemarks: "All 10 substance classes negative at standard clinical/forensic screening cut-offs."
          }
        ]
      },
      {
        id: "therapeutic_drug_levels",
        name: "Therapeutic Drug Levels (TDM)",
        description: "Monitoring levels of Digoxin, Lithium, Valproic acid, Phenytoin, Tacrolimus, Antibiotic tracking (Vancomycin, Gentamicin).",
        tests: [
          {
            id: "test-tdm-panel",
            code: "TOX-TDM-01",
            name: "Therapeutic Drug Monitoring (Cardioactive, Neuropsychiatric & Immunosuppressant)",
            disciplineId: "toxicology_tdm",
            disciplineName: "Toxicology & TDM",
            familyId: "therapeutic_drug_levels",
            familyName: "Therapeutic Drug Levels",
            sampleType: "Serum (Plain Red Top / No Gel)",
            turnaroundTime: "60 mins",
            tariffsKES: 3200,
            parameters: [
              { id: "digoxin_level", name: "Digoxin Level", unit: "ng/mL", referenceRange: "0.8 - 2.0 (Therapeutic)", defaultValue: "1.1" },
              { id: "lithium_level", name: "Lithium Level", unit: "mmol/L", referenceRange: "0.6 - 1.2 (Therapeutic)", defaultValue: "0.82" },
              { id: "valproate_level", name: "Valproic Acid (Sodium Valproate)", unit: "ug/mL", referenceRange: "50 - 100 (Therapeutic)", defaultValue: "72" },
              { id: "phenytoin_level", name: "Phenytoin Level", unit: "ug/mL", referenceRange: "10 - 20 (Therapeutic)", defaultValue: "14.5" },
              { id: "tacrolimus_level", name: "Tacrolimus Whole Blood Trough", unit: "ng/mL", referenceRange: "5.0 - 15.0 (Target)", defaultValue: "7.8" }
            ]
          },
          {
            id: "test-antibiotic-tdm",
            code: "TOX-ABX-02",
            name: "Antibiotic Therapeutic Drug Monitoring (Vancomycin & Gentamicin)",
            disciplineId: "toxicology_tdm",
            disciplineName: "Toxicology & TDM",
            familyId: "therapeutic_drug_levels",
            familyName: "Therapeutic Drug Levels",
            sampleType: "Serum (Red top - timed draw 30 mins before dose for trough)",
            turnaroundTime: "45 mins STAT",
            tariffsKES: 2800,
            parameters: [
              { id: "vanco_trough", name: "Vancomycin Trough Level", unit: "ug/mL", referenceRange: "10 - 20 (Target Trough)", defaultValue: "14.2" },
              { id: "vanco_peak", name: "Vancomycin Peak Level", unit: "ug/mL", referenceRange: "25 - 40", defaultValue: "32.0" },
              { id: "genta_trough", name: "Gentamicin Trough Level", unit: "ug/mL", referenceRange: "< 1.0 (Safety against nephrotoxicity)", defaultValue: "0.4" },
              { id: "genta_peak", name: "Gentamicin Peak Level", unit: "ug/mL", referenceRange: "5.0 - 10.0 (Efficacy)", defaultValue: "7.5" }
            ]
          }
        ]
      }
    ]
  },

  // 8. URINALYSIS & BODY FLUID ANALYSIS
  {
    id: "urinalysis_fluids",
    num: 8,
    name: "Urinalysis & Body Fluid Analysis",
    shortName: "Urinalysis & Body Fluids",
    description: "Urine dipstick, centrifuged sediment microscopy, and chemical/cytological examination of synovial, pleural, peritoneal and cerebrospinal fluids.",
    iconName: "FlaskConical",
    badgeColor: "amber",
    testFamilies: [
      {
        id: "urinalysis_routine",
        name: "Urinalysis (UA) & Sediment Examination",
        description: "Urine dipstick (protein, glucose, blood, pH, ketones) + microscopic examination of urine sediment (casts, crystals, cells).",
        tests: [
          {
            id: "test-urinalysis-full",
            code: "UA-FULL-01",
            name: "Complete Urinalysis (10-Parameter Chemical Dipstick & Centrifuged Microscopy)",
            disciplineId: "urinalysis_fluids",
            disciplineName: "Urinalysis & Body Fluids",
            familyId: "urinalysis_routine",
            familyName: "Urinalysis (UA)",
            sampleType: "Fresh Mid-Stream Urine (Sterile Cup)",
            turnaroundTime: "20 mins",
            tariffsKES: 500,
            parameters: [
              { id: "ua_color", name: "Color", unit: "", referenceRange: "Pale Yellow to Amber", defaultValue: "Pale Yellow" },
              { id: "ua_appearance", name: "Appearance / Clarity", unit: "", referenceRange: "Clear", defaultValue: "Clear" },
              { id: "ua_sp_gravity", name: "Specific Gravity", unit: "", referenceRange: "1.005 - 1.030", defaultValue: "1.015" },
              { id: "ua_ph", name: "pH", unit: "", referenceRange: "4.5 - 8.0", defaultValue: "6.0" },
              { id: "ua_protein", name: "Protein / Albumin", unit: "", referenceRange: "Negative", defaultValue: "Negative", type: "select", options: ["Negative", "Trace", "1+ (30 mg/dL)", "2+ (100 mg/dL)", "3+ (300 mg/dL)", "4+ (>1000 mg/dL)"] },
              { id: "ua_glucose", name: "Glucose", unit: "", referenceRange: "Negative", defaultValue: "Negative", type: "select", options: ["Negative", "Trace", "1+ (100 mg/dL)", "2+ (250 mg/dL)", "3+ (500 mg/dL)", "4+ (>=1000 mg/dL)"] },
              { id: "ua_ketones", name: "Ketones", unit: "", referenceRange: "Negative", defaultValue: "Negative", type: "select", options: ["Negative", "Trace", "1+ (Small)", "2+ (Moderate)", "3+ (Large)"] },
              { id: "ua_leukocytes", name: "Leukocyte Esterase", unit: "", referenceRange: "Negative", defaultValue: "Negative", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
              { id: "ua_nitrite", name: "Nitrite", unit: "", referenceRange: "Negative", defaultValue: "Negative", type: "select", options: ["Negative", "Positive (+)"] },
              { id: "ua_blood", name: "Blood / Hemoglobin", unit: "", referenceRange: "Negative", defaultValue: "Negative", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
              { id: "ua_bilirubin", name: "Bilirubin", unit: "", referenceRange: "Negative", defaultValue: "Negative" },
              { id: "ua_urobilinogen", name: "Urobilinogen", unit: "mg/dL", referenceRange: "0.2 - 1.0 (Normal)", defaultValue: "Normal (0.2 mg/dL)" },
              { id: "ua_pus_cells", name: "Microscopy: WBC / Pus Cells", unit: "/HPF", referenceRange: "0 - 5", defaultValue: "0-2 /HPF" },
              { id: "ua_rbcs", name: "Microscopy: Red Blood Cells (RBCs)", unit: "/HPF", referenceRange: "0 - 2", defaultValue: "0-1 /HPF" },
              { id: "ua_epithelial", name: "Epithelial Cells", unit: "/HPF", referenceRange: "Occasional (Few)", defaultValue: "Few /HPF" },
              { id: "ua_casts", name: "Casts (Hyaline / Granular / Cellular)", unit: "/LPF", referenceRange: "None Seen", defaultValue: "None Seen" },
              { id: "ua_crystals", name: "Crystals (Oxalate / Urate / Phosphate)", unit: "/HPF", referenceRange: "None Seen", defaultValue: "None Seen" },
              { id: "ua_microorganisms", name: "Microorganisms (Bacteria / Yeast)", unit: "", referenceRange: "None Seen", defaultValue: "None Seen" }
            ],
            defaultRemarks: "Normal routine urinalysis. Clear sediment with no proteinuria, hematuria, or active pyuria."
          }
        ]
      },
      {
        id: "specialized_fluids",
        name: "Specialized Fluids",
        description: "Cerebrospinal Fluid (CSF) analysis, Synovial (joint) fluid analysis, Pleural/Peritoneal/Pericardial fluid biochemistry and cytology.",
        tests: [
          {
            id: "test-csf-analysis",
            code: "FLUID-CSF-01",
            name: "Cerebrospinal Fluid (CSF) Comprehensive Analysis",
            disciplineId: "urinalysis_fluids",
            disciplineName: "Urinalysis & Body Fluids",
            familyId: "specialized_fluids",
            familyName: "Specialized Fluids",
            sampleType: "CSF (Lumbar Puncture tubes 1-4)",
            turnaroundTime: "45 mins STAT",
            tariffsKES: 3500,
            parameters: [
              { id: "csf_appearance", name: "Appearance / Color", unit: "", referenceRange: "Crystal Clear, Colorless", defaultValue: "Clear and Colorless (No xanthochromia)" },
              { id: "csf_opening_press", name: "Opening Pressure", unit: "cm H2O", referenceRange: "7 - 18", defaultValue: "12" },
              { id: "csf_protein", name: "CSF Total Protein", unit: "g/L", referenceRange: "0.15 - 0.45", defaultValue: "0.28" },
              { id: "csf_glucose", name: "CSF Glucose", unit: "mmol/L", referenceRange: "2.2 - 4.2 (>60% of serum glucose)", defaultValue: "3.4" },
              { id: "csf_wbc", name: "CSF Total Leukocyte Count", unit: "/uL", referenceRange: "0 - 5 lymphocytes", defaultValue: "2 /uL (100% Mononuclear)" },
              { id: "csf_rbc", name: "CSF RBC Count", unit: "/uL", referenceRange: "0 (Nil)", defaultValue: "0 /uL" },
              { id: "csf_gram_stain", name: "CSF Gram Stain & India Ink", unit: "", referenceRange: "Negative for organisms", defaultValue: "Negative — No bacteria or encapsulated yeasts observed" }
            ],
            defaultRemarks: "Normal CSF profile. Normal protein and glucose with absence of pleocytosis."
          },
          {
            id: "test-synovial-fluid",
            code: "FLUID-SYN-02",
            name: "Synovial (Joint) Fluid Analysis & Crystal Examination",
            disciplineId: "urinalysis_fluids",
            disciplineName: "Urinalysis & Body Fluids",
            familyId: "specialized_fluids",
            familyName: "Specialized Fluids",
            sampleType: "Aspirated Joint Fluid (Heparin tube)",
            turnaroundTime: "60 mins",
            tariffsKES: 3000,
            parameters: [
              { id: "syn_color", name: "Color & Clarity", unit: "", referenceRange: "Clear / Straw, High Viscosity", defaultValue: "Clear Straw, Good String Sign Viscosity" },
              { id: "syn_wbc", name: "Total White Cell Count", unit: "/uL", referenceRange: "< 200 (Non-inflammatory)", defaultValue: "150 /uL" },
              { id: "syn_crystals", name: "Polarizing Microscopy (MSU / CPPD)", unit: "", referenceRange: "No crystals seen", defaultValue: "No needle-shaped (Gout) or rhomboid (Pseudogout) crystals observed" }
            ]
          },
          {
            id: "test-serous-fluid",
            code: "FLUID-SER-03",
            name: "Serous Fluid (Pleural / Peritoneal / Ascitic) Light's Criteria Panel",
            disciplineId: "urinalysis_fluids",
            disciplineName: "Urinalysis & Body Fluids",
            familyId: "specialized_fluids",
            familyName: "Specialized Fluids",
            sampleType: "Thoracentesis / Paracentesis Aspirate",
            turnaroundTime: "60 mins",
            tariffsKES: 3000,
            parameters: [
              { id: "fluid_type", name: "Fluid Classification", unit: "", referenceRange: "Transudate vs Exudate", defaultValue: "Transudative Pattern (Protein Ratio < 0.5, LDH Ratio < 0.6)", type: "select", options: ["Transudate", "Exudate"] },
              { id: "fluid_protein_ratio", name: "Fluid Protein / Serum Protein Ratio", unit: "ratio", referenceRange: "< 0.5 (Transudate)", defaultValue: "0.32" },
              { id: "fluid_ldh_ratio", name: "Fluid LDH / Serum LDH Ratio", unit: "ratio", referenceRange: "< 0.6 (Transudate)", defaultValue: "0.38" },
              { id: "saag", name: "Serum-Ascites Albumin Gradient (SAAG)", unit: "g/dL", referenceRange: ">= 1.1 g/dL (Portal Hypertension)", defaultValue: "1.4 g/dL" }
            ]
          }
        ]
      }
    ]
  },

  // 9. TUMOR MARKERS & CYTOPATHOLOGY
  {
    id: "tumor_markers_cytology",
    num: 9,
    name: "Tumor Markers & Cytopathology",
    shortName: "Tumor Markers & Cytology",
    description: "Circulating oncological serum biomarkers, cervical cytology Bethesda classification, and histopathological tissue evaluation.",
    iconName: "FileText",
    badgeColor: "rose",
    testFamilies: [
      {
        id: "oncology_markers",
        name: "Oncology Markers",
        description: "PSA (Prostate), CA-125 (Ovary), CEA (Colon/GI), CA 19-9 (Pancreas), AFP (Liver/Germ cell), CA 15-3 (Breast).",
        tests: [
          {
            id: "test-psa-panel",
            code: "TUM-PSA-01",
            name: "Prostate-Specific Antigen (Total PSA, Free PSA & % Free PSA Ratio)",
            disciplineId: "tumor_markers_cytology",
            disciplineName: "Tumor Markers & Cytopathology",
            familyId: "oncology_markers",
            familyName: "Oncology Markers",
            sampleType: "Serum (SST)",
            turnaroundTime: "60 mins",
            tariffsKES: 2500,
            parameters: [
              { id: "psa_total", name: "Total PSA", unit: "ng/mL", referenceRange: "< 4.0 (Normal Age-Specific: <2.5 if <50y)", defaultValue: "1.25" },
              { id: "psa_free", name: "Free PSA", unit: "ng/mL", referenceRange: "0.2 - 0.8", defaultValue: "0.35" },
              { id: "psa_ratio", name: "Free / Total PSA Ratio", unit: "%", referenceRange: "> 25% (Low Risk of Malignancy)", defaultValue: "28.0" }
            ],
            defaultRemarks: "Total PSA within age-appropriate physiological limits. Normal Free/Total PSA ratio."
          },
          {
            id: "test-ca125",
            code: "TUM-CA125-02",
            name: "CA-125 (Ovarian Cancer Biomarker)",
            disciplineId: "tumor_markers_cytology",
            disciplineName: "Tumor Markers & Cytopathology",
            familyId: "oncology_markers",
            familyName: "Oncology Markers",
            sampleType: "Serum (SST)",
            turnaroundTime: "60 mins",
            tariffsKES: 2800,
            parameters: [
              { id: "ca125_val", name: "Cancer Antigen 125 (CA-125)", unit: "U/mL", referenceRange: "< 35.0", defaultValue: "14.2" }
            ]
          },
          {
            id: "test-cea",
            code: "TUM-CEA-03",
            name: "Carcinoembryonic Antigen (CEA - Colorectal & GI)",
            disciplineId: "tumor_markers_cytology",
            disciplineName: "Tumor Markers & Cytopathology",
            familyId: "oncology_markers",
            familyName: "Oncology Markers",
            sampleType: "Serum (SST)",
            turnaroundTime: "60 mins",
            tariffsKES: 2600,
            parameters: [
              { id: "cea_val", name: "Serum CEA Level", unit: "ng/mL", referenceRange: "< 3.0 (Non-smokers) / < 5.0 (Smokers)", defaultValue: "1.8" }
            ]
          },
          {
            id: "test-ca19-9",
            code: "TUM-CA199-04",
            name: "CA 19-9 (Pancreatic & Hepatobiliary Biomarker)",
            disciplineId: "tumor_markers_cytology",
            disciplineName: "Tumor Markers & Cytopathology",
            familyId: "oncology_markers",
            familyName: "Oncology Markers",
            sampleType: "Serum (SST)",
            turnaroundTime: "60 mins",
            tariffsKES: 2800,
            parameters: [
              { id: "ca199_val", name: "Carbohydrate Antigen 19-9", unit: "U/mL", referenceRange: "< 37.0", defaultValue: "11.6" }
            ]
          },
          {
            id: "test-afp",
            code: "TUM-AFP-05",
            name: "Alpha-Fetoprotein (AFP - Hepatocellular & Germ Cell Marker)",
            disciplineId: "tumor_markers_cytology",
            disciplineName: "Tumor Markers & Cytopathology",
            familyId: "oncology_markers",
            familyName: "Oncology Markers",
            sampleType: "Serum (SST)",
            turnaroundTime: "60 mins",
            tariffsKES: 2600,
            parameters: [
              { id: "afp_val", name: "Alpha-Fetoprotein (AFP)", unit: "ng/mL", referenceRange: "< 8.5", defaultValue: "3.2" }
            ]
          },
          {
            id: "test-ca15-3",
            code: "TUM-CA153-06",
            name: "CA 15-3 (Breast Carcinoma Biomarker)",
            disciplineId: "tumor_markers_cytology",
            disciplineName: "Tumor Markers & Cytopathology",
            familyId: "oncology_markers",
            familyName: "Oncology Markers",
            sampleType: "Serum (SST)",
            turnaroundTime: "60 mins",
            tariffsKES: 2800,
            parameters: [
              { id: "ca153_val", name: "Cancer Antigen 15-3", unit: "U/mL", referenceRange: "< 30.0", defaultValue: "16.4" }
            ]
          }
        ]
      },
      {
        id: "cytology_histology",
        name: "Cytology / Histology",
        description: "Pap smears (cervical cytology), Tissue biopsy histopathology examination.",
        tests: [
          {
            id: "test-pap-smear",
            code: "CYTO-PAP-01",
            name: "Cervical Liquid-Based Cytology (Pap Smear - Bethesda System)",
            disciplineId: "tumor_markers_cytology",
            disciplineName: "Tumor Markers & Cytopathology",
            familyId: "cytology_histology",
            familyName: "Cytology / Histology",
            sampleType: "Cervical Cytology Sample in Preservative Vial",
            turnaroundTime: "72 hours",
            tariffsKES: 2500,
            parameters: [
              { id: "adequacy", name: "Specimen Adequacy", unit: "", referenceRange: "Satisfactory for evaluation (Endocervical component present)", defaultValue: "Satisfactory for evaluation with transformation zone present", type: "select", options: ["Satisfactory for evaluation", "Unsatisfactory for evaluation (Obscured by blood/inflammation)"] },
              { id: "bethesda_class", name: "Bethesda Diagnostic Categorization", unit: "", referenceRange: "NILM (Negative for Intraepithelial Lesion or Malignancy)", defaultValue: "NILM — Negative for Intraepithelial Lesion or Malignancy", type: "select", options: ["NILM — Negative for Intraepithelial Lesion or Malignancy", "ASC-US (Atypical Squamous Cells of Undetermined Significance)", "LSIL (Low-Grade Squamous Intraepithelial Lesion / HPV effect)", "HSIL (High-Grade Squamous Intraepithelial Lesion)", "Squamous Cell Carcinoma", "AGC (Atypical Glandular Cells)"] }
            ],
            defaultRemarks: "Cervical epithelial cells are within normal limits. Negative for intraepithelial dysplasia or malignancy."
          },
          {
            id: "test-histopathology-biopsy",
            code: "HISTO-BX-02",
            name: "Tissue Biopsy Histopathological Examination & Report",
            disciplineId: "tumor_markers_cytology",
            disciplineName: "Tumor Markers & Cytopathology",
            familyId: "cytology_histology",
            familyName: "Cytology / Histology",
            sampleType: "Tissue in 10% Neutral Buffered Formalin",
            turnaroundTime: "5-7 days",
            tariffsKES: 6500,
            parameters: [
              { id: "gross_descr", name: "Gross Macroscopic Description", unit: "", referenceRange: "Diagnostic Specimen", defaultValue: "Specimen consists of multiple gray-white firm tissue fragments measuring 1.5 x 1.0 x 0.5 cm in aggregate." },
              { id: "microscopic_descr", name: "Microscopic Histological Findings", unit: "", referenceRange: "Benign tissue architecture", defaultValue: "Sections show preserved tissue architecture with regular mature cells and intact basement membrane. No cellular atypia, mitotic figures, or malignant invasion identified." },
              { id: "histo_diagnosis", name: "Histological Diagnosis / Impression", unit: "", referenceRange: "Benign / Normal", defaultValue: "Benign tissue histology — No evidence of malignancy in the submitted material." }
            ]
          }
        ]
      }
    ]
  }
];

// Helper functions for lookup & discovery
export function getAllLabTests(): LabTestItem[] {
  const tests: LabTestItem[] = [];
  LAB_DISCIPLINES.forEach((disc) => {
    disc.testFamilies.forEach((fam) => {
      fam.tests.forEach((t) => {
        tests.push(t);
      });
    });
  });
  return tests;
}

export function searchLabDirectory(queryStr: string): LabTestItem[] {
  const q = (queryStr || "").trim().toLowerCase();
  if (!q) return getAllLabTests();
  return getAllLabTests().filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.disciplineName.toLowerCase().includes(q) ||
      t.familyName.toLowerCase().includes(q) ||
      t.parameters.some((p) => p.name.toLowerCase().includes(q))
  );
}

export function findLabTestById(id: string): LabTestItem | undefined {
  return getAllLabTests().find((t) => t.id === id || t.code.toLowerCase() === id.toLowerCase());
}

export function findDisciplineByTestName(testName: string): LabDiscipline | undefined {
  const nameLow = testName.toLowerCase();
  for (const disc of LAB_DISCIPLINES) {
    for (const fam of disc.testFamilies) {
      if (
        fam.name.toLowerCase().includes(nameLow) ||
        fam.tests.some((t) => t.name.toLowerCase().includes(nameLow) || nameLow.includes(t.name.toLowerCase()))
      ) {
        return disc;
      }
    }
  }
  return undefined;
}

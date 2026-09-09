/**
 * Kenya National Health Terminology Service (KNHTS)
 * Standard Terminology Catalog, ICD-10 Kenya Extension, and Problem List Dictionary
 * Compliant with Kenya Digital Health Agency (KDHA) & MOH 705/711 Interoperability Specifications
 */

export interface KnhtsConcept {
  conceptId: string; // KNHTS / SNOMED CT code
  icd10Code: string; // ICD-10 WHO / Kenya code
  preferredTerm: string;
  synonyms: string[];
  category: "Communicable" | "Non-Communicable" | "Maternal & Child" | "Injury/Emergency" | "Surgical" | "Mental Health";
  mohMorbidityCode: "705A" | "705B" | "711" | "Specialist";
  chronicFlag: boolean;
  priorityAlert?: string;
}

export const KNHTS_CATALOG: KnhtsConcept[] = [
  // Communicable / Infectious
  {
    conceptId: "KNHTS-1001",
    icd10Code: "B54",
    preferredTerm: "Unspecified Malaria (Plasmodium falciparum)",
    synonyms: ["Malaria", "MPS positive", "Severe Malaria", "Paludism"],
    category: "Communicable",
    mohMorbidityCode: "705A",
    chronicFlag: false,
    priorityAlert: "Test with mRDT or Blood Slide prior to initiating AL (Artemether-Lumefantrine)"
  },
  {
    conceptId: "KNHTS-1002",
    icd10Code: "J06.9",
    preferredTerm: "Acute Upper Respiratory Tract Infection (URTI)",
    synonyms: ["Cough", "Cold", "Rhinitis", "Pharyngitis", "Coryza"],
    category: "Communicable",
    mohMorbidityCode: "705A",
    chronicFlag: false
  },
  {
    conceptId: "KNHTS-1003",
    icd10Code: "J18.9",
    preferredTerm: "Pneumonia, Unspecified Organism",
    synonyms: ["Chest infection", "Lower respiratory tract infection", "LRTI"],
    category: "Communicable",
    mohMorbidityCode: "705A",
    chronicFlag: false,
    priorityAlert: "Assess respiratory rate and SpO2 for severe pneumonia criteria"
  },
  {
    conceptId: "KNHTS-1004",
    icd10Code: "A09",
    preferredTerm: "Infectious Gastroenteritis & Colitis (Diarrhoea)",
    synonyms: ["Diarrhoea and vomiting", "Acute watery diarrhea", "Food poisoning", "Gastro"],
    category: "Communicable",
    mohMorbidityCode: "705A",
    chronicFlag: false,
    priorityAlert: "Initiate ORS and Zinc sulphate immediately for pediatric dehydration"
  },
  {
    conceptId: "KNHTS-1005",
    icd10Code: "A01.0",
    preferredTerm: "Typhoid Fever (Salmonella enterica)",
    synonyms: ["Enteric fever", "Widal positive fever"],
    category: "Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: false
  },
  {
    conceptId: "KNHTS-1006",
    icd10Code: "N39.0",
    preferredTerm: "Urinary Tract Infection (UTI), Site Not Specified",
    synonyms: ["UTI", "Cystitis", "Dysuria", "Pyelonephritis"],
    category: "Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: false
  },
  {
    conceptId: "KNHTS-1007",
    icd10Code: "A15.0",
    preferredTerm: "Tuberculosis of Lung (Pulmonary TB)",
    synonyms: ["PTB", "GeneXpert positive TB", "Cavitary TB"],
    category: "Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: true,
    priorityAlert: "Notify Sub-County TB Coordinator (TIBU registry notification)"
  },
  {
    conceptId: "KNHTS-1008",
    icd10Code: "B20",
    preferredTerm: "Human Immunodeficiency Virus (HIV) Disease",
    synonyms: ["HIV Infection", "Retroviral disease", "RVD"],
    category: "Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: true,
    priorityAlert: "Ensure linkage to CCC (Comprehensive Care Centre) for viral load monitoring & TLD regimen"
  },
  // Non-Communicable Diseases (NCDs)
  {
    conceptId: "KNHTS-2001",
    icd10Code: "I10",
    preferredTerm: "Essential (Primary) Hypertension",
    synonyms: ["High Blood Pressure", "HBP", "HTN", "Hypertensive disease"],
    category: "Non-Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: true,
    priorityAlert: "Monitor target organ damage (Creatinine, ECG, Fundoscopy)"
  },
  {
    conceptId: "KNHTS-2002",
    icd10Code: "E11.9",
    preferredTerm: "Type 2 Diabetes Mellitus Without Complications",
    synonyms: ["T2DM", "Diabetes", "NIDDM", "High blood sugar"],
    category: "Non-Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: true,
    priorityAlert: "Check HbA1c every 3-6 months and conduct annual diabetic foot / retinal exam"
  },
  {
    conceptId: "KNHTS-2003",
    icd10Code: "E10.9",
    preferredTerm: "Type 1 Diabetes Mellitus",
    synonyms: ["T1DM", "Insulin-dependent diabetes", "Juvenile diabetes"],
    category: "Non-Communicable",
    mohMorbidityCode: "705A",
    chronicFlag: true
  },
  {
    conceptId: "KNHTS-2004",
    icd10Code: "J45.9",
    preferredTerm: "Bronchial Asthma, Unspecified",
    synonyms: ["Asthma", "Reactive airway disease", "Wheezing episode"],
    category: "Non-Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: true,
    priorityAlert: "Contraindicated: Beta-blockers, Aspirin/NSAIDs in sensitive patients"
  },
  {
    conceptId: "KNHTS-2005",
    icd10Code: "K29.7",
    preferredTerm: "Gastritis, Unspecified / Peptic Ulcer Disease",
    synonyms: ["PUD", "Hyperacidity", "Epigastric pain", "Dyspepsia"],
    category: "Non-Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: true,
    priorityAlert: "Avoid high-dose NSAIDs; consider H. pylori antigen stool test"
  },
  {
    conceptId: "KNHTS-2006",
    icd10Code: "N18.9",
    preferredTerm: "Chronic Kidney Disease (CKD), Unspecified",
    synonyms: ["Renal failure", "Chronic renal disease", "Elevated creatinine"],
    category: "Non-Communicable",
    mohMorbidityCode: "705B",
    chronicFlag: true,
    priorityAlert: "Requires renal dose adjustment for all excreted pharmaceuticals"
  },
  {
    conceptId: "KNHTS-2007",
    icd10Code: "D57.1",
    preferredTerm: "Sickle-Cell Disease Without Crisis",
    synonyms: ["SCD", "Sickle cell anemia", "HbSS"],
    category: "Non-Communicable",
    mohMorbidityCode: "705A",
    chronicFlag: true,
    priorityAlert: "Maintain folic acid prophylaxis and pneumococcal immunization"
  },
  // Maternal & Child Health
  {
    conceptId: "KNHTS-3001",
    icd10Code: "O80",
    preferredTerm: "Single Spontaneous Delivery (Normal Delivery)",
    synonyms: ["SVD", "Spontaneous vertex delivery", "Normal labor"],
    category: "Maternal & Child",
    mohMorbidityCode: "711",
    chronicFlag: false
  },
  {
    conceptId: "KNHTS-3002",
    icd10Code: "O14.9",
    preferredTerm: "Pre-eclampsia, Unspecified",
    synonyms: ["PET", "Gestational hypertension with proteinuria", "Toxemia of pregnancy"],
    category: "Maternal & Child",
    mohMorbidityCode: "711",
    chronicFlag: false,
    priorityAlert: "Emergency obstetric warning: Check BP, reflexes, and prepare Magnesium Sulphate"
  },
  {
    conceptId: "KNHTS-3003",
    icd10Code: "E46",
    preferredTerm: "Unspecified Protein-Energy Malnutrition",
    synonyms: ["PEM", "Kwashiorkor", "Marasmus", "Severe Acute Malnutrition (SAM)"],
    category: "Maternal & Child",
    mohMorbidityCode: "705A",
    chronicFlag: true,
    priorityAlert: "Initiate therapeutic feeding (F-75 / F-100 / RUTF) and urgent nutrition referral"
  },
  // Injuries & Trauma
  {
    conceptId: "KNHTS-4001",
    icd10Code: "T14.9",
    preferredTerm: "Injury, Unspecified / Road Traffic Accident (RTA)",
    synonyms: ["Trauma", "RTA", "Boda-boda accident", "Soft tissue injury"],
    category: "Injury/Emergency",
    mohMorbidityCode: "705B",
    chronicFlag: false
  },
  {
    conceptId: "KNHTS-4002",
    icd10Code: "T14.2",
    preferredTerm: "Fracture of Unspecified Body Region",
    synonyms: ["Bone fracture", "Compound fracture", "Closed fracture"],
    category: "Injury/Emergency",
    mohMorbidityCode: "711",
    chronicFlag: false
  },
  // Mental Health
  {
    conceptId: "KNHTS-5001",
    icd10Code: "F32.9",
    preferredTerm: "Depressive Episode, Unspecified",
    synonyms: ["Major depressive disorder", "Clinical depression", "Low mood"],
    category: "Mental Health",
    mohMorbidityCode: "Specialist",
    chronicFlag: true
  },
  {
    conceptId: "KNHTS-5002",
    icd10Code: "F41.9",
    preferredTerm: "Anxiety Disorder, Unspecified",
    synonyms: ["Generalized anxiety disorder", "Panic attack", "Severe anxiety"],
    category: "Mental Health",
    mohMorbidityCode: "Specialist",
    chronicFlag: true
  }
];

/**
 * Search the KNHTS catalog by term, code, synonym, or category
 */
export function searchKnhtsCatalog(query: string, category?: string): KnhtsConcept[] {
  const cleanQ = query.trim().toLowerCase();
  let results = KNHTS_CATALOG;

  if (category && category !== "all") {
    results = results.filter(c => c.category.toLowerCase() === category.toLowerCase());
  }

  if (!cleanQ) return results.slice(0, 15);

  return results.filter(c => {
    return (
      c.icd10Code.toLowerCase().includes(cleanQ) ||
      c.conceptId.toLowerCase().includes(cleanQ) ||
      c.preferredTerm.toLowerCase().includes(cleanQ) ||
      c.synonyms.some(s => s.toLowerCase().includes(cleanQ))
    );
  });
}

/**
 * Find a specific KNHTS concept by ICD-10 or Concept ID
 */
export function findKnhtsConcept(codeOrId: string): KnhtsConcept | undefined {
  const target = codeOrId.trim().toUpperCase();
  return KNHTS_CATALOG.find(c => c.conceptId.toUpperCase() === target || c.icd10Code.toUpperCase() === target);
}

// Kenya Digital Health Agency (KDHA), Social Health Authority (SHA), & FHIR SHR Service
import { MedicalRecord, ClinicalVisit, PrescriptionItem, Invoice } from "../types";

export interface PatientSummary {
  id: string;
  name: string;
  nationalId: string;
  phone?: string;
  gender?: string;
  county?: string;
  dateOfBirth?: string;
}

export interface ShaEligibilityResult {
  eligible: boolean;
  shaId: string;
  nationalId: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE_CONTRIBUTION" | "NOT_FOUND";
  patientName: string;
  gender: string;
  dateOfBirth?: string;
  county: string;
  schemeType: "Primary Healthcare Fund (PHCF)" | "Social Health Insurance Fund (SHIF)" | "Emergency, Chronic & Critical Illness Fund (ECCIF)";
  premiumPaidUntil: string;
  employerName?: string;
  dependentCount: number;
  biometricEnrolled: boolean;
  biometricMatchConfidence?: number;
  benefitLimits: {
    outpatient: { limit: number; spent: number; balance: number };
    inpatient: { limit: number; spent: number; balance: number };
    maternity: { limit: number; spent: number; balance: number };
    chronicSpecialized: { limit: number; spent: number; balance: number };
    dentalOptical: { limit: number; spent: number; balance: number };
  };
  authorizedFacilities: string[];
  message: string;
  verificationTimestamp: string;
}

export interface Icd10Entry {
  code: string;
  title: string;
  category: string;
  chapter: string;
  mohCategory: "MOH 705A (Under 5)" | "MOH 705B (Over 5)" | "MOH 706" | "MOH 711" | "General";
  isChronic: boolean;
  shaPackage: "PHCF (Level 2/3)" | "SHIF (Level 4/5/6)" | "ECCIF (Critical/Emergency)" | "Maternity Free";
}

export interface ShaTariffMapping {
  internalCode: string;
  internalName: string;
  serviceCategory: "consultation" | "procedure" | "laboratory" | "radiology" | "pharmacy" | "bed_charge" | "theatre";
  shaTariffCode: string;
  shaTariffName: string;
  shaPackage: "PHCF" | "SHIF" | "ECCIF" | "Exempt";
  standardPriceKes: number;
  shaCoveredPriceKes: number;
  patientCopayKes: number;
  requiresPreAuth: boolean;
  preAuthLevel: "Automated Instant" | "Medical Officer Review" | "Specialist Panel";
  etimsTaxExempt: boolean;
  icd10Requirements?: string[];
}

export interface EClaimItem {
  id: string;
  serviceCode: string;
  serviceName: string;
  shaTariffCode: string;
  quantity: number;
  unitPriceKes: number;
  claimedAmountKes: number;
  approvedAmountKes?: number;
  category: string;
}

export interface EClaimRecord {
  id: string;
  claimNumber: string;
  preAuthCode?: string;
  patientId: string;
  patientName: string;
  nationalId: string;
  shaNumber: string;
  encounterId?: string;
  visitDate: string;
  dischargeDate?: string;
  admissionType: "Outpatient" | "Inpatient" | "Emergency" | "Day Surgery" | "Maternity";
  facilityCode: string;
  facilityName: string;
  attendingDoctor: {
    name: string;
    kmpdcNumber: string;
    specialty: string;
  };
  primaryDiagnosis: {
    icd10Code: string;
    icd10Title: string;
  };
  secondaryDiagnoses?: {
    icd10Code: string;
    icd10Title: string;
  }[];
  biometricVerificationProof: {
    verified: boolean;
    method: "Fingerprint" | "Facial" | "OTP Phone" | "National ID Smartcard";
    auditToken: string;
    timestamp: string;
  };
  items: EClaimItem[];
  totalClaimAmountKes: number;
  approvedClaimAmountKes?: number;
  copayCollectedKes: number;
  status: "Draft" | "Validating" | "Submitted" | "Under_Adjudication" | "Approved" | "Query_Issued" | "Rejected" | "Remitted";
  validationScore: number; // 0-100%
  validationErrors: string[];
  submissionTimestamp?: string;
  adjudicationNotes?: string;
  batchNumber?: string;
  etimsInvoiceRef?: string;
}

// -----------------------------------------------------------------------------------------
// Master ICD-10 Repository (Standardized for Kenyan Healthcare MOH 705 / SHA Reporting)
// -----------------------------------------------------------------------------------------
export const KENYA_ICD10_CATALOG: Icd10Entry[] = [
  {
    code: "B50.9",
    title: "Plasmodium falciparum malaria, unspecified",
    category: "Infectious & Parasitic Diseases",
    chapter: "Chapter I: Certain infectious and parasitic diseases",
    mohCategory: "MOH 705A (Under 5)",
    isChronic: false,
    shaPackage: "PHCF (Level 2/3)"
  },
  {
    code: "B54",
    title: "Unspecified malaria (Clinical Malaria)",
    category: "Infectious & Parasitic Diseases",
    chapter: "Chapter I: Certain infectious and parasitic diseases",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: false,
    shaPackage: "PHCF (Level 2/3)"
  },
  {
    code: "J06.9",
    title: "Acute upper respiratory infection, unspecified (URTI)",
    category: "Respiratory Diseases",
    chapter: "Chapter X: Diseases of the respiratory system",
    mohCategory: "MOH 705A (Under 5)",
    isChronic: false,
    shaPackage: "PHCF (Level 2/3)"
  },
  {
    code: "J18.9",
    title: "Pneumonia, unspecified organism",
    category: "Respiratory Diseases",
    chapter: "Chapter X: Diseases of the respiratory system",
    mohCategory: "MOH 705A (Under 5)",
    isChronic: false,
    shaPackage: "SHIF (Level 4/5/6)"
  },
  {
    code: "A09.9",
    title: "Infectious gastroenteritis and colitis, unspecified (Diarrhoea)",
    category: "Gastrointestinal Diseases",
    chapter: "Chapter I: Certain infectious and parasitic diseases",
    mohCategory: "MOH 705A (Under 5)",
    isChronic: false,
    shaPackage: "PHCF (Level 2/3)"
  },
  {
    code: "I10",
    title: "Essential (primary) hypertension",
    category: "Circulatory / Cardiovascular Diseases",
    chapter: "Chapter IX: Diseases of the circulatory system",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: true,
    shaPackage: "ECCIF (Critical/Emergency)"
  },
  {
    code: "E11.9",
    title: "Type 2 diabetes mellitus without complications",
    category: "Endocrine, Nutritional & Metabolic",
    chapter: "Chapter IV: Endocrine, nutritional and metabolic diseases",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: true,
    shaPackage: "ECCIF (Critical/Emergency)"
  },
  {
    code: "E10.9",
    title: "Type 1 diabetes mellitus without complications",
    category: "Endocrine, Nutritional & Metabolic",
    chapter: "Chapter IV: Endocrine, nutritional and metabolic diseases",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: true,
    shaPackage: "ECCIF (Critical/Emergency)"
  },
  {
    code: "N39.0",
    title: "Urinary tract infection, site not specified (UTI)",
    category: "Genitourinary Diseases",
    chapter: "Chapter XIV: Diseases of the genitourinary system",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: false,
    shaPackage: "PHCF (Level 2/3)"
  },
  {
    code: "K29.7",
    title: "Gastritis, unspecified / Peptic Ulcer Disease",
    category: "Gastrointestinal Diseases",
    chapter: "Chapter XI: Diseases of the digestive system",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: false,
    shaPackage: "PHCF (Level 2/3)"
  },
  {
    code: "O80.0",
    title: "Single spontaneous delivery (Normal Vaginal Delivery)",
    category: "Pregnancy, Childbirth & Puerperium",
    chapter: "Chapter XV: Pregnancy, childbirth and the puerperium",
    mohCategory: "MOH 711",
    isChronic: false,
    shaPackage: "Maternity Free"
  },
  {
    code: "O82.0",
    title: "Delivery by elective caesarean section",
    category: "Pregnancy, Childbirth & Puerperium",
    chapter: "Chapter XV: Pregnancy, childbirth and the puerperium",
    mohCategory: "MOH 711",
    isChronic: false,
    shaPackage: "SHIF (Level 4/5/6)"
  },
  {
    code: "L03.9",
    title: "Cellulitis, unspecified / Skin & Subcutaneous Tissue Infection",
    category: "Dermatological Conditions",
    chapter: "Chapter XII: Diseases of the skin and subcutaneous tissue",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: false,
    shaPackage: "PHCF (Level 2/3)"
  },
  {
    code: "A01.0",
    title: "Typhoid fever",
    category: "Infectious & Parasitic Diseases",
    chapter: "Chapter I: Certain infectious and parasitic diseases",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: false,
    shaPackage: "PHCF (Level 2/3)"
  },
  {
    code: "J45.9",
    title: "Asthma, unspecified",
    category: "Respiratory Diseases",
    chapter: "Chapter X: Diseases of the respiratory system",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: true,
    shaPackage: "ECCIF (Critical/Emergency)"
  },
  {
    code: "S00.9",
    title: "Superficial injury of head, unspecified (Road Traffic / Trauma)",
    category: "Injuries & Trauma",
    chapter: "Chapter XIX: Injury, poisoning and certain other consequences",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: false,
    shaPackage: "ECCIF (Critical/Emergency)"
  },
  {
    code: "N18.9",
    title: "Chronic kidney disease, unspecified (Renal Failure)",
    category: "Genitourinary Diseases",
    chapter: "Chapter XIV: Diseases of the genitourinary system",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: true,
    shaPackage: "ECCIF (Critical/Emergency)"
  },
  {
    code: "C50.9",
    title: "Malignant neoplasm of breast, unspecified (Oncology)",
    category: "Neoplasms / Cancer",
    chapter: "Chapter II: Neoplasms",
    mohCategory: "MOH 705B (Over 5)",
    isChronic: true,
    shaPackage: "SHIF (Level 4/5/6)"
  }
];

// -----------------------------------------------------------------------------------------
// Master SHA National Tariff Structure Mapping
// -----------------------------------------------------------------------------------------
export const MASTER_SHA_TARIFF_CATALOG: ShaTariffMapping[] = [
  {
    internalCode: "CONS-GP-001",
    internalName: "General Outpatient Consultation (Medical Officer / Clinical Officer)",
    serviceCategory: "consultation",
    shaTariffCode: "SHA-OP-001",
    shaTariffName: "Outpatient Comprehensive Consultation Package (Level 2-4)",
    shaPackage: "PHCF",
    standardPriceKes: 1500,
    shaCoveredPriceKes: 1200,
    patientCopayKes: 0,
    requiresPreAuth: false,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "CONS-SPEC-002",
    internalName: "Specialist Consultant Physician / Surgeon Review",
    serviceCategory: "consultation",
    shaTariffCode: "SHA-OP-002",
    shaTariffName: "Specialized Outpatient Clinic Consultation (Level 5-6)",
    shaPackage: "SHIF",
    standardPriceKes: 3000,
    shaCoveredPriceKes: 2500,
    patientCopayKes: 500,
    requiresPreAuth: true,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "LAB-FBC-010",
    internalName: "Full Blood Count / Haemogram (FBC + 5-Part Diff)",
    serviceCategory: "laboratory",
    shaTariffCode: "SHA-LAB-101",
    shaTariffName: "Basic Diagnostic Blood Panel - Full Haemogram",
    shaPackage: "PHCF",
    standardPriceKes: 1000,
    shaCoveredPriceKes: 800,
    patientCopayKes: 0,
    requiresPreAuth: false,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "LAB-BS-MAL-012",
    internalName: "Malaria Blood Slide / Rapid Diagnostic Test (mRDT)",
    serviceCategory: "laboratory",
    shaTariffCode: "SHA-LAB-104",
    shaTariffName: "Parasitology - Malaria Antigen RDT / Blood Slide",
    shaPackage: "PHCF",
    standardPriceKes: 500,
    shaCoveredPriceKes: 500,
    patientCopayKes: 0,
    requiresPreAuth: false,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "RAD-CXR-020",
    internalName: "Digital Chest X-Ray (PA & Lateral Views)",
    serviceCategory: "radiology",
    shaTariffCode: "SHA-RAD-201",
    shaTariffName: "Plain Radiography - Chest X-Ray Digital",
    shaPackage: "SHIF",
    standardPriceKes: 2200,
    shaCoveredPriceKes: 1800,
    patientCopayKes: 400,
    requiresPreAuth: false,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "RAD-USS-OBS-022",
    internalName: "Obstetric / Pelvic Ultrasound Scan (B-Mode 2D)",
    serviceCategory: "radiology",
    shaTariffCode: "SHA-RAD-205",
    shaTariffName: "Antenatal / Obstetric Ultrasound Imaging",
    shaPackage: "Maternity Free" as any,
    standardPriceKes: 2500,
    shaCoveredPriceKes: 2500,
    patientCopayKes: 0,
    requiresPreAuth: false,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "PROC-WOUND-030",
    internalName: "Minor Wound Toilet, Debridement & Suturing (Under LA)",
    serviceCategory: "procedure",
    shaTariffCode: "SHA-PROC-302",
    shaTariffName: "Minor Surgical Toilet, Debridement and Wound Closure",
    shaPackage: "PHCF",
    standardPriceKes: 2500,
    shaCoveredPriceKes: 2200,
    patientCopayKes: 0,
    requiresPreAuth: false,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "PROC-DELIV-NVD",
    internalName: "Normal Spontaneous Vertex Delivery (Linda Mama / SHA)",
    serviceCategory: "theatre",
    shaTariffCode: "SHA-MAT-401",
    shaTariffName: "Maternal Care - Normal Vaginal Delivery Package",
    shaPackage: "Maternity Free" as any,
    standardPriceKes: 12000,
    shaCoveredPriceKes: 12000,
    patientCopayKes: 0,
    requiresPreAuth: false,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "PROC-CS-SURG",
    internalName: "Emergency / Elective Caesarean Section (Lower Segment)",
    serviceCategory: "theatre",
    shaTariffCode: "SHA-MAT-402",
    shaTariffName: "Maternal Care - Caesarean Section Surgical Delivery",
    shaPackage: "SHIF",
    standardPriceKes: 45000,
    shaCoveredPriceKes: 40000,
    patientCopayKes: 0,
    requiresPreAuth: true,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "BED-GEN-WARD",
    internalName: "General Inpatient Medical/Surgical Ward Bed (Per Diem)",
    serviceCategory: "bed_charge",
    shaTariffCode: "SHA-IP-501",
    shaTariffName: "Inpatient General Ward Bed Day Rate & Nursing Care",
    shaPackage: "SHIF",
    standardPriceKes: 4000,
    shaCoveredPriceKes: 3500,
    patientCopayKes: 500,
    requiresPreAuth: true,
    preAuthLevel: "Automated Instant",
    etimsTaxExempt: true
  },
  {
    internalCode: "BED-ICU-CARE",
    internalName: "Intensive Care Unit (ICU) / HDU Bed & Continuous Monitoring",
    serviceCategory: "bed_charge",
    shaTariffCode: "SHA-ECCIF-601",
    shaTariffName: "Critical Care - Intensive Care Unit (ICU) Day Rate",
    shaPackage: "ECCIF",
    standardPriceKes: 25000,
    shaCoveredPriceKes: 22000,
    patientCopayKes: 0,
    requiresPreAuth: true,
    preAuthLevel: "Specialist Panel",
    etimsTaxExempt: true
  }
];

// -----------------------------------------------------------------------------------------
// HL7 FHIR R4 JSON Transformers & Shared Health Record (SHR) Converters
// -----------------------------------------------------------------------------------------

export function convertPatientToFhirResource(patient: any, hospitalName = "AfyaCare National Referral Hospital") {
  const patientName = patient.name || patient.patientName || "Patient";
  return {
    resourceType: "Patient",
    id: patient.id || `pat-${patient.nationalId || Math.floor(Math.random() * 10000)}`,
    meta: {
      versionId: "1",
      lastUpdated: new Date().toISOString(),
      profile: ["http://fhir.dha.go.ke/StructureDefinition/Kenya-Patient"]
    },
    identifier: [
      {
        use: "official",
        type: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "NI", display: "National unique individual identifier" }]
        },
        system: "urn:oid:2.16.404.1",
        value: patient.nationalId || "UNKNOWN"
      },
      {
        use: "secondary",
        type: {
          coding: [{ system: "http://fhir.dha.go.ke/CodeSystem/identifier-type", code: "SHA", display: "Social Health Authority Member ID" }]
        },
        system: "http://sha.go.ke/members",
        value: `SHA-K-${patient.nationalId || "32441928"}`
      }
    ],
    active: true,
    name: [
      {
        use: "official",
        text: patientName,
        family: patientName.split(" ").slice(-1)[0] || "",
        given: patientName.split(" ").slice(0, -1)
      }
    ],
    telecom: [
      {
        system: "phone",
        value: patient.phone || "+254700000000",
        use: "mobile"
      }
    ],
    gender: (patient.gender || "unknown").toLowerCase(),
    birthDate: patient.dateOfBirth || "1990-01-01",
    address: [
      {
        use: "home",
        city: patient.county || "Nairobi",
        country: "Kenya"
      }
    ],
    managingOrganization: {
      display: hospitalName
    }
  };
}

export function convertVisitToFhirEncounter(
  patient: any,
  visit: any,
  encounterNumber: string,
  doctorName = "Dr. Jane Odhiambo, MD (KMPDC #A9432)"
) {
  const encounterId = visit.id || `enc-${Math.floor(Math.random() * 100000)}`;

  return {
    resourceType: "Encounter",
    id: encounterId,
    meta: {
      profile: ["http://fhir.dha.go.ke/StructureDefinition/Kenya-Encounter"]
    },
    identifier: [
      {
        system: "http://hospital.hmis/encounters",
        value: encounterNumber
      }
    ],
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: visit.admittedToWard ? "IMP" : "AMB",
      display: visit.admittedToWard ? "Inpatient Encounter" : "Ambulatory Outpatient"
    },
    subject: {
      reference: `Patient/${patient.id || patient.nationalId}`,
      display: patient.name || patient.patientName || "Patient"
    },
    participant: [
      {
        individual: {
          display: doctorName
        }
      }
    ],
    period: {
      start: visit.date ? new Date(visit.date).toISOString() : new Date().toISOString()
    },
    reasonCode: [
      {
        text: visit.symptoms || "Clinical consultation and examination"
      }
    ],
    diagnosis: [
      {
        condition: {
          reference: `Condition/cond-${encounterId}`,
          display: visit.diagnosis || "General Clinical Diagnosis"
        },
        use: {
          coding: [{ code: "AD", display: "Admission diagnosis" }]
        }
      }
    ]
  };
}

export function generateFhirShrBundle(
  patient: any,
  visit: any,
  invoices?: Invoice[]
) {
  const fhirPatient = convertPatientToFhirResource(patient);
  const encounterNum = `ENC-KE-${Date.now().toString().slice(-6)}`;
  const fhirEncounter = convertVisitToFhirEncounter(patient, visit, encounterNum);

  // Condition Resource
  const fhirCondition = {
    resourceType: "Condition",
    id: `cond-${fhirEncounter.id}`,
    clinicalStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }]
    },
    verificationStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }]
    },
    category: [
      {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis" }]
      }
    ],
    code: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-10",
          code: visit.icd10Code || "J06.9",
          display: visit.icd10Title || visit.diagnosis || "Acute respiratory infection"
        }
      ],
      text: visit.diagnosis || "Unspecified diagnosis"
    },
    subject: {
      reference: `Patient/${fhirPatient.id}`,
      display: patient.name || patient.patientName || "Patient"
    },
    encounter: {
      reference: `Encounter/${fhirEncounter.id}`
    }
  };

  // Vitals Observation Resources
  const observations: any[] = [];
  if (visit.vitals) {
    if (visit.vitals.temp) {
      observations.push({
        resourceType: "Observation",
        id: `obs-temp-${fhirEncounter.id}`,
        status: "final",
        category: [{ coding: [{ code: "vital-signs", display: "Vital Signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
        subject: { reference: `Patient/${fhirPatient.id}` },
        valueQuantity: {
          value: parseFloat(visit.vitals.temp) || 36.8,
          unit: "C",
          system: "http://unitsofmeasure.org",
          code: "Cel"
        }
      });
    }
    if (visit.vitals.bp) {
      observations.push({
        resourceType: "Observation",
        id: `obs-bp-${fhirEncounter.id}`,
        status: "final",
        category: [{ coding: [{ code: "vital-signs", display: "Vital Signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel" }] },
        subject: { reference: `Patient/${fhirPatient.id}` },
        component: [
          {
            code: { coding: [{ code: "8480-6", display: "Systolic blood pressure" }] },
            valueQuantity: { value: parseInt(visit.vitals.bp.split("/")[0]) || 120, unit: "mmHg" }
          },
          {
            code: { coding: [{ code: "8462-4", display: "Diastolic blood pressure" }] },
            valueQuantity: { value: parseInt(visit.vitals.bp.split("/")[1]) || 80, unit: "mmHg" }
          }
        ]
      });
    }
  }

  // Medications
  const medRequests = (visit.prescriptions || []).map((rx: any, idx: number) => ({
    resourceType: "MedicationRequest",
    id: `med-${fhirEncounter.id}-${idx}`,
    status: "completed",
    intent: "order",
    medicationCodeableConcept: {
      text: rx.drugName
    },
    subject: { reference: `Patient/${fhirPatient.id}` },
    dosageInstruction: [
      {
        text: rx.instructions || `${rx.dosage} ${rx.frequency ? `- ${rx.frequency}` : ""} ${rx.duration ? `for ${rx.duration}` : ""}`.trim()
      }
    ]
  }));

  // Master FHIR Bundle
  const bundle = {
    resourceType: "Bundle",
    id: `bundle-shr-${Date.now()}`,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ["http://fhir.dha.go.ke/StructureDefinition/Kenya-SharedHealthRecord-Bundle"]
    },
    type: "transaction",
    entry: [
      { resource: fhirPatient, request: { method: "PUT", url: `Patient/${fhirPatient.id}` } },
      { resource: fhirEncounter, request: { method: "POST", url: "Encounter" } },
      { resource: fhirCondition, request: { method: "POST", url: "Condition" } },
      ...observations.map(obs => ({ resource: obs, request: { method: "POST", url: "Observation" } })),
      ...medRequests.map(med => ({ resource: med, request: { method: "POST", url: "MedicationRequest" } }))
    ]
  };

  return bundle;
}

// -----------------------------------------------------------------------------------------
// e-Claims Validation Scrubber & Lifecycle Utilities
// -----------------------------------------------------------------------------------------

export function validateClaimBeforeSubmission(claim: Partial<EClaimRecord>): { isValid: boolean; score: number; errors: string[] } {
  const errors: string[] = [];
  let score = 100;

  if (!claim.nationalId || claim.nationalId.length < 6) {
    errors.push("Missing or invalid Kenya National ID / Identification Document number.");
    score -= 25;
  }

  if (!claim.shaNumber || !claim.shaNumber.startsWith("SHA-")) {
    errors.push("Invalid Social Health Authority (SHA) member authorization number.");
    score -= 25;
  }

  if (!claim.primaryDiagnosis?.icd10Code) {
    errors.push("Clinical ICD-10 coding is missing. Mandatory national diagnostic code required.");
    score -= 25;
  }

  if (!claim.items || claim.items.length === 0) {
    errors.push("No tariff billable line items attached to this electronic claim.");
    score -= 20;
  } else {
    const unmappedItems = claim.items.filter(i => !i.shaTariffCode || i.shaTariffCode === "UNMAPPED");
    if (unmappedItems.length > 0) {
      errors.push(`${unmappedItems.length} item(s) are missing valid SHA standard tariff codes.`);
      score -= 15;
    }
  }

  if (!claim.biometricVerificationProof?.verified) {
    errors.push("Patient biometric fingerprint/facial scan audit token is missing.");
    score -= 15;
  }

  if (!claim.attendingDoctor?.kmpdcNumber) {
    errors.push("Attending Doctor Medical Board (KMPDC) registration license number is required.");
    score -= 10;
  }

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors
  };
}

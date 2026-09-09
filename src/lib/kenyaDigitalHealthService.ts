/**
 * Kenya Digital Health Agency (KDHA) & Social Health Authority (SHA / Taifa Care)
 * Integration Protocol, FHIR SHR Bundle Generator, and Claims Validation Engine
 */

export interface Icd10Entry {
  code: string;
  title: string;
  category: string;
  mohCategory: string;
  shaPackage: string;
  isCommonInKenya?: boolean;
}

export interface ShaTariffMapping {
  id: string;
  internalCode: string;
  internalName: string;
  shaTariffCode: string;
  shaTariffName: string;
  shaPackage: "Primary Healthcare (PC)" | "Social Health Insurance (SHIF)" | "Emergency, Chronic & Critical Illness (ECCIF)" | string;
  tariffAmountKes: number;
  standardPriceKes: number;
  shaCoveredPriceKes: number;
  patientCopayKes: number;
  copayKes: number;
  preAuthRequired: boolean;
}

export interface EClaimRecord {
  id: string;
  claimNumber: string;
  preAuthCode: string;
  patientId: string;
  patientName: string;
  nationalId: string;
  shaNumber: string;
  visitDate: string;
  admissionType: string;
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
  biometricVerificationProof: {
    verified: boolean;
    method: string;
    auditToken: string;
    timestamp: string;
  };
  items: Array<{
    id: string;
    serviceCode: string;
    serviceName: string;
    shaTariffCode: string;
    quantity: number;
    unitPriceKes: number;
    claimedAmountKes: number;
    approvedAmountKes: number;
    category: string;
  }>;
  totalClaimAmountKes: number;
  approvedClaimAmountKes?: number;
  validationScore?: number;
  validationErrors?: string[];
  submissionTimestamp?: string;
  adjudicationNotes?: string;
  batchNumber?: string;
  copayCollectedKes: number;
  status: "under_review" | "approved" | "rejected" | "submitted" | "Approved" | "Submitted" | "Pending" | string;
  submittedAt?: string;
}

export interface ShaEligibilityResult {
  eligible: boolean;
  status: string;
  shaNumber: string;
  shaId?: string;
  nationalId: string;
  fullName: string;
  patientName?: string;
  gender?: string;
  county?: string;
  message?: string;
  schemeType: string;
  premiumPaidUntil: string;
  employerName?: string;
  dependentCount: number;
  beneficiaryType: "Principal" | "Dependent";
  packageCoverage: string[];
  activeContributionStatus: "Active" | "Arrears" | "Defaulted";
  lastVerifiedAt: string;
  biometricStatus: "Verified" | "Pending" | "Failed";
  dailyBenefitRemainingKes: number;
  annualBenefitRemainingKes: number;
  benefitLimits: {
    outpatient: { balance: number; spent: number; limit: number };
    inpatient: { balance: number; spent: number; limit: number };
    maternity: { balance: number; spent: number; limit: number };
  };
}

export const KENYA_ICD10_CATALOG: Icd10Entry[] = [
  {
    code: "B54",
    title: "Unspecified malaria (Plasmodium falciparum)",
    category: "Infectious & Parasitic",
    mohCategory: "MOH Priority Communicable",
    shaPackage: "Primary Healthcare Fund (PHCF)",
    isCommonInKenya: true
  },
  {
    code: "B50.9",
    title: "Plasmodium falciparum malaria, unspecified",
    category: "Infectious & Parasitic",
    mohCategory: "MOH Priority Vector-Borne",
    shaPackage: "Primary Healthcare Fund (PHCF)",
    isCommonInKenya: true
  },
  {
    code: "J06.9",
    title: "Acute upper respiratory infection, unspecified (URTI)",
    category: "Respiratory Diseases",
    mohCategory: "Outpatient General Morbidity",
    shaPackage: "Primary Healthcare Fund (PHCF)",
    isCommonInKenya: true
  },
  {
    code: "J18.9",
    title: "Pneumonia, organism unspecified",
    category: "Respiratory Diseases",
    mohCategory: "Severe Respiratory Illness",
    shaPackage: "Social Health Insurance Fund (SHIF)",
    isCommonInKenya: true
  },
  {
    code: "A09.0",
    title: "Other and unspecified gastroenteritis and colitis of infectious origin",
    category: "Gastrointestinal",
    mohCategory: "Diarrhoeal & Enteric Morbidity",
    shaPackage: "Primary Healthcare Fund (PHCF)",
    isCommonInKenya: true
  },
  {
    code: "I10",
    title: "Essential (primary) hypertension",
    category: "Cardiovascular",
    mohCategory: "Non-Communicable Diseases (NCD)",
    shaPackage: "Social Health Insurance Fund (SHIF)",
    isCommonInKenya: true
  },
  {
    code: "E11.9",
    title: "Type 2 diabetes mellitus without complications",
    category: "Endocrine & Metabolic",
    mohCategory: "Chronic Endocrine Care",
    shaPackage: "Social Health Insurance Fund (SHIF)",
    isCommonInKenya: true
  },
  {
    code: "N39.0",
    title: "Urinary tract infection, site not specified (UTI)",
    category: "Genitourinary",
    mohCategory: "Urological Infection",
    shaPackage: "Primary Healthcare Fund (PHCF)",
    isCommonInKenya: true
  },
  {
    code: "O80",
    title: "Encounter for full-term uncomplicated spontaneous delivery",
    category: "Obstetrics & Maternity",
    mohCategory: "Maternal & Child Health (MCH)",
    shaPackage: "Linda Mama Maternity Package",
    isCommonInKenya: true
  },
  {
    code: "K29.7",
    title: "Gastritis, unspecified / Peptic ulcer disease",
    category: "Gastrointestinal",
    mohCategory: "Gastrointestinal Morbidity",
    shaPackage: "Primary Healthcare Fund (PHCF)",
    isCommonInKenya: true
  },
  {
    code: "L03.9",
    title: "Cellulitis, unspecified / Skin & soft tissue infection",
    category: "Dermatological",
    mohCategory: "Soft Tissue & Skin Care",
    shaPackage: "Primary Healthcare Fund (PHCF)",
    isCommonInKenya: true
  },
  {
    code: "S06.0",
    title: "Concussion / Minor head trauma",
    category: "Trauma & Injuries",
    mohCategory: "Emergency Trauma Response",
    shaPackage: "Emergency, Chronic & Critical Illness (ECCIF)",
    isCommonInKenya: true
  }
];

export const MASTER_SHA_TARIFF_CATALOG: ShaTariffMapping[] = [
  {
    id: "sha-tar-01",
    internalCode: "CONS-GP-001",
    internalName: "General Outpatient Consultation",
    shaTariffCode: "SHA-OP-001",
    shaTariffName: "Outpatient Primary Healthcare Consultation",
    shaPackage: "Primary Healthcare (PC)",
    tariffAmountKes: 900,
    standardPriceKes: 1000,
    shaCoveredPriceKes: 900,
    patientCopayKes: 0,
    copayKes: 0,
    preAuthRequired: false
  },
  {
    id: "sha-tar-02",
    internalCode: "LAB-BS-MAL-012",
    internalName: "Malaria Blood Slide / mRDT",
    shaTariffCode: "SHA-LAB-104",
    shaTariffName: "Rapid Diagnostic Blood Test for Malaria",
    shaPackage: "Primary Healthcare (PC)",
    tariffAmountKes: 400,
    standardPriceKes: 500,
    shaCoveredPriceKes: 400,
    patientCopayKes: 0,
    copayKes: 0,
    preAuthRequired: false
  },
  {
    id: "sha-tar-03",
    internalCode: "LAB-CBC-001",
    internalName: "Full Haemogram / Complete Blood Count",
    shaTariffCode: "SHA-LAB-201",
    shaTariffName: "Haematology Complete Automated Panel",
    shaPackage: "Social Health Insurance (SHIF)",
    tariffAmountKes: 1000,
    standardPriceKes: 1200,
    shaCoveredPriceKes: 1000,
    patientCopayKes: 0,
    copayKes: 0,
    preAuthRequired: false
  },
  {
    id: "sha-tar-04",
    internalCode: "RAD-CXR-002",
    internalName: "Digital Chest X-Ray (PA View)",
    shaTariffCode: "SHA-RAD-302",
    shaTariffName: "Plain Radiography - Chest PA",
    shaPackage: "Social Health Insurance (SHIF)",
    tariffAmountKes: 1500,
    standardPriceKes: 1800,
    shaCoveredPriceKes: 1500,
    patientCopayKes: 0,
    copayKes: 0,
    preAuthRequired: false
  },
  {
    id: "sha-tar-05",
    internalCode: "MAT-DELIV-001",
    internalName: "Normal Vaginal Delivery & Newborn Care",
    shaTariffCode: "SHA-MAT-001",
    shaTariffName: "Linda Mama Spontaneous Vaginal Delivery Package",
    shaPackage: "Primary Healthcare (PC)",
    tariffAmountKes: 11200,
    standardPriceKes: 12500,
    shaCoveredPriceKes: 11200,
    patientCopayKes: 0,
    copayKes: 0,
    preAuthRequired: false
  },
  {
    id: "sha-tar-06",
    internalCode: "IP-ICU-001",
    internalName: "Intensive Care Unit (ICU) Daily Care",
    shaTariffCode: "SHA-ECCIF-004",
    shaTariffName: "Critical Care Resuscitation & Mechanical Ventilation",
    shaPackage: "Emergency, Chronic & Critical Illness (ECCIF)",
    tariffAmountKes: 15000,
    standardPriceKes: 18000,
    shaCoveredPriceKes: 15000,
    patientCopayKes: 0,
    copayKes: 0,
    preAuthRequired: true
  }
];

export function validateClaimBeforeSubmission(claim: Partial<EClaimRecord>): {
  isValid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!claim.nationalId || claim.nationalId.length < 5) {
    errors.push("Valid Kenyan National ID / Alien ID is mandatory for SHA claims.");
  }
  if (!claim.patientName) {
    errors.push("Patient legal name missing from claim bundle.");
  }
  if (!claim.primaryDiagnosis?.icd10Code) {
    errors.push("Primary ICD-10 diagnostic code must be assigned by attending practitioner.");
  }
  if (!claim.attendingDoctor?.kmpdcNumber) {
    warnings.push("Doctor KMPDC retention registration number is recommended to avoid claim query.");
  }
  if (!claim.biometricVerificationProof?.verified) {
    warnings.push("Biometric proof of physical presence is unverified; manual review may apply.");
  }
  if (!claim.items || claim.items.length === 0) {
    errors.push("At least one billable medical service or medication item is required.");
  }

  let score = 100;
  score -= errors.length * 25;
  score -= warnings.length * 10;
  score = Math.max(0, Math.min(100, score));

  return {
    isValid: errors.length === 0,
    score,
    errors,
    warnings
  };
}

export function convertPatientToFhirResource(patient: any): any {
  return {
    resourceType: "Patient",
    id: patient?.id || "pat-default",
    identifier: [
      {
        system: "https://health.go.ke/identifiers/national-id",
        value: patient?.nationalId || ""
      },
      {
        system: "https://sha.go.ke/identifiers/member-no",
        value: `SHA-${patient?.nationalId || "MEMBER"}`
      }
    ],
    name: [{ text: patient?.patientName || patient?.name || "Anonymous Patient" }],
    telecom: [{ system: "phone", value: patient?.phone || "" }],
    gender: (patient?.gender || "unknown").toLowerCase(),
    birthDate: patient?.dob || patient?.dateOfBirth || "1990-01-01"
  };
}

export function convertVisitToFhirEncounter(patient: any, visit: any): any {
  return {
    resourceType: "Encounter",
    id: visit?.id || "enc-default",
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory"
    },
    subject: {
      reference: `Patient/${patient?.id || "pat-default"}`
    },
    period: {
      start: visit?.date || new Date().toISOString()
    },
    reasonCode: [
      {
        coding: [
          {
            system: "http://hl7.org/fhir/sid/icd-10",
            code: visit?.icd10Code || "J06.9",
            display: visit?.diagnosis || visit?.icd10Title || "General Clinical Encounter"
          }
        ]
      }
    ]
  };
}

export function generateFhirShrBundle(patient: any, visit: any): any {
  const bundleId = `bundle-shr-${patient?.nationalId || "gen"}-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const entries: any[] = [
    {
      resource: {
        resourceType: "Patient",
        id: patient?.id || "pat-default",
        identifier: [
          {
            system: "https://health.go.ke/identifiers/national-id",
            value: patient?.nationalId || ""
          },
          ...(patient?.passportNumber ? [{
            system: "https://health.go.ke/identifiers/passport-number",
            value: patient.passportNumber
          }] : []),
          ...(patient?.birthCertificateNumber ? [{
            system: "https://health.go.ke/identifiers/birth-certificate",
            value: patient.birthCertificateNumber
          }] : []),
          {
            system: "https://sha.go.ke/identifiers/member-no",
            value: `SHA-${patient?.nationalId || "MEMBER"}`
          }
        ],
        name: [{ text: patient?.patientName || patient?.name || "Anonymous Patient" }],
        telecom: [{ system: "phone", value: patient?.phone || "" }],
        gender: (patient?.gender || "unknown").toLowerCase(),
        birthDate: patient?.dob || patient?.dateOfBirth || "1990-01-01",
        address: [{ text: patient?.residence || "Nairobi, Kenya" }]
      }
    },
    {
      resource: {
        resourceType: "Encounter",
        id: visit?.id || "enc-default",
        status: "finished",
        class: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "AMB",
          display: "ambulatory"
        },
        subject: {
          reference: `Patient/${patient?.id || "pat-default"}`
        },
        period: {
          start: visit?.date || nowIso
        },
        reasonCode: [
          {
            coding: [
              {
                system: "https://knhts.health.go.ke/concept",
                code: visit?.icd10Code || "J06.9",
                display: visit?.diagnosis || visit?.icd10Title || "General Clinical Encounter"
              }
            ]
          }
        ]
      }
    }
  ];

  // 1. Condition (Problem List / Diagnosis)
  if (visit?.diagnosis || visit?.icd10Code) {
    entries.push({
      resource: {
        resourceType: "Condition",
        id: `cond-${visit?.id || Date.now()}`,
        clinicalStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }]
        },
        verificationStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }]
        },
        category: [
          {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis", display: "Encounter Diagnosis" }]
          }
        ],
        code: {
          coding: [
            {
              system: "https://knhts.health.go.ke/concept",
              code: visit?.icd10Code || "J06.9",
              display: visit?.diagnosis || "Clinical Diagnosis"
            }
          ]
        },
        subject: { reference: `Patient/${patient?.id || "pat-default"}` },
        recordedDate: visit?.date || nowIso
      }
    });
  }

  // Active Problem List entries if present
  if (Array.isArray(patient?.problemList)) {
    patient.problemList.forEach((prob: any, idx: number) => {
      entries.push({
        resource: {
          resourceType: "Condition",
          id: `problem-${prob.id || idx}`,
          clinicalStatus: {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: prob.status || "active" }]
          },
          category: [
            {
              coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "problem-list-item", display: "Problem List Item" }]
            }
          ],
          code: {
            coding: [{ system: "https://knhts.health.go.ke/concept", code: prob.code, display: prob.name }]
          },
          subject: { reference: `Patient/${patient?.id || "pat-default"}` },
          onsetDateTime: prob.onsetDate || nowIso
        }
      });
    });
  }

  // 2. AllergyIntolerance
  const allergies = patient?.allergies || visit?.allergies;
  if (allergies) {
    const allergyItems = Array.isArray(allergies) ? allergies : String(allergies).split(/[,;]+/);
    allergyItems.forEach((alg: string, idx: number) => {
      const cleanAlg = String(alg).trim();
      if (!cleanAlg) return;
      entries.push({
        resource: {
          resourceType: "AllergyIntolerance",
          id: `alg-${idx}-${Date.now()}`,
          clinicalStatus: {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }]
          },
          category: ["medication"],
          criticality: "high",
          code: { text: cleanAlg },
          patient: { reference: `Patient/${patient?.id || "pat-default"}` }
        }
      });
    });
  }

  // 3. Observations (Vitals Signs & Pediatric Growth)
  if (visit?.vitals) {
    const v = visit.vitals;
    if (v.bp) {
      entries.push({
        resource: {
          resourceType: "Observation",
          id: `obs-bp-${Date.now()}`,
          status: "final",
          code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel with all children optional" }] },
          subject: { reference: `Patient/${patient?.id || "pat-default"}` },
          valueString: String(v.bp)
        }
      });
    }
    if (v.pulse || v.heartRate) {
      entries.push({
        resource: {
          resourceType: "Observation",
          id: `obs-hr-${Date.now()}`,
          status: "final",
          code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
          subject: { reference: `Patient/${patient?.id || "pat-default"}` },
          valueQuantity: { value: Number(v.pulse || v.heartRate), unit: "beats/min" }
        }
      });
    }
    if (v.temperature || v.temp) {
      entries.push({
        resource: {
          resourceType: "Observation",
          id: `obs-temp-${Date.now()}`,
          status: "final",
          code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
          subject: { reference: `Patient/${patient?.id || "pat-default"}` },
          valueQuantity: { value: Number(v.temperature || v.temp), unit: "Cel" }
        }
      });
    }
    if (v.bmi) {
      entries.push({
        resource: {
          resourceType: "Observation",
          id: `obs-bmi-${Date.now()}`,
          status: "final",
          code: { coding: [{ system: "http://loinc.org", code: "39156-5", display: "Body mass index (BMI)" }] },
          subject: { reference: `Patient/${patient?.id || "pat-default"}` },
          valueString: String(v.bmi)
        }
      });
    }
  }

  // 4. MedicationRequest (Prescriptions)
  if (Array.isArray(visit?.prescriptions)) {
    visit.prescriptions.forEach((rx: any, idx: number) => {
      entries.push({
        resource: {
          resourceType: "MedicationRequest",
          id: `medrx-${idx}-${Date.now()}`,
          status: "active",
          intent: "order",
          medicationCodeableConcept: {
            coding: [{ system: "https://hpt.health.go.ke/registry", code: rx.drugName, display: rx.drugName }],
            text: `${rx.drugName} (${rx.formulation || "Oral"} ${rx.strength || ""})`
          },
          subject: { reference: `Patient/${patient?.id || "pat-default"}` },
          dosageInstruction: [{ text: `${rx.dosage || "As directed"} • ${rx.instructions || "Take as directed"}` }],
          dispenseRequest: { quantity: { value: rx.quantity || 1 } }
        }
      });
    });
  }

  // 5. CarePlan (Treatment Plan & Follow-up)
  entries.push({
    resource: {
      resourceType: "CarePlan",
      id: `careplan-${visit?.id || Date.now()}`,
      status: "active",
      intent: "order",
      title: "Interdisciplinary Clinical Outpatient Care Plan",
      description: visit?.clinicalNotes || "Standard clinical care protocol, medication reconciliation, and follow-up review.",
      subject: { reference: `Patient/${patient?.id || "pat-default"}` },
      period: {
        start: visit?.date || nowIso,
        end: visit?.followUpDate ? `${visit.followUpDate}T09:00:00Z` : undefined
      },
      activity: [
        {
          detail: {
            kind: "Appointment",
            description: visit?.followUpDate ? `Scheduled clinical follow-up on ${visit.followUpDate}` : "Routine follow-up as clinically indicated",
            status: "scheduled"
          }
        }
      ]
    }
  });

  return {
    resourceType: "Bundle",
    id: bundleId,
    type: "document",
    timestamp: nowIso,
    identifier: {
      system: "https://health.go.ke/fhir/NamingSystem/shr-bundle",
      value: bundleId
    },
    entry: entries
  };
}

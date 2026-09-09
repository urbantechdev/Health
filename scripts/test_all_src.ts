import { DRUG_REFERENCE_DICTIONARY, formatDrugDisplayName } from "../src/constants/drugDictionary";
import { TERMS_OF_USE_CLAUSES, DATA_PROTECTION_CLAUSES, INFOSEC_STANDARDS, REGULATORY_DIRECTORY } from "../src/constants/policyTermsContent";
import { TASSIAHILL_README_MARKDOWN } from "../src/constants/readmeContent";
import { ALL_SYSTEM_ROLES, SYSTEM_ROLES_DIRECTORY, getRoleConfig } from "../src/constants/roles";
import { HOSPITAL_SPECIALISTS_DIRECTORY, SPECIALIST_CATEGORIES, getSpecialistByName } from "../src/constants/specialists";
import { cleanFirestoreData } from "../src/lib/firebase";
import { isHaemogramReport, parseHaemogramData, determineAgeCohort, getReferenceRange } from "../src/lib/haemogramParser";
import { 
  KENYA_ICD10_CATALOG,
  MASTER_SHA_TARIFF_CATALOG,
  convertPatientToFhirResource,
  convertVisitToFhirEncounter,
  generateFhirShrBundle,
  validateClaimBeforeSubmission
} from "../src/lib/kenyaDigitalHealthService";
import { 
  SUPER_ADMIN_EMAILS, 
  isSuperAdminEmail, 
  MASTER_SUPER_ADMIN_SEEDS
} from "../src/lib/superAdmins";
import { 
  DEFAULT_PROCEDURE_TARIFFS, 
  DEFAULT_WARD_BED_RATES
} from "../src/lib/tariffService";
import { 
  normalizeSpecialtyTerm,
  getDoctorConsultationRoom,
  calculateAllDoctorsWorkload
} from "../src/lib/queueLoadBalancer";
import { 
  normalizeKey,
  checkDuplicatePatientRegistration
} from "../src/lib/deduplicationService";
import { getCartDocId } from "../src/lib/patientCartService";
import { logSettingsChange } from "../src/lib/auditService";
import { numberToKenyanShillingsWords } from "../src/lib/printUtils";
import { detectClientPlatform } from "../src/lib/biometricService";
import { shouldShowPopupNotification } from "../src/lib/messageTargeting";
import { normalizeString, normalizePhone, findUnifiedPatient } from "../src/lib/patientSyncService";
import { DEFAULT_HOSPITAL_WARDS } from "../src/lib/encounterService";

async function runStepByStepAudit() {
  console.log("=== STARTING STEP-BY-STEP AUDIT OF SRC CODE ===");
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}:`, err.message || err);
      failed++;
    }
  }

  // 1. Drug Dictionary
  test("Drug Dictionary: has items and format works", () => {
    if (!DRUG_REFERENCE_DICTIONARY || DRUG_REFERENCE_DICTIONARY.length === 0) {
      throw new Error("Drug dictionary is empty");
    }
    const amox = DRUG_REFERENCE_DICTIONARY.find(d => d.genericName.toLowerCase().includes("amoxicillin"));
    if (!amox) {
      throw new Error("Amoxicillin not found in dictionary");
    }
    const formatted = formatDrugDisplayName(amox);
    if (!formatted.toLowerCase().includes("amoxicillin")) {
      throw new Error("formatDrugDisplayName failed");
    }
  });

  // 2. Policy and Readme Content
  test("Policy and Readme content: non-empty strings", () => {
    if (!TERMS_OF_USE_CLAUSES || TERMS_OF_USE_CLAUSES.length === 0) {
      throw new Error("Terms of use clauses empty");
    }
    if (!DATA_PROTECTION_CLAUSES || DATA_PROTECTION_CLAUSES.length === 0) {
      throw new Error("Data protection clauses empty");
    }
    if (!INFOSEC_STANDARDS || INFOSEC_STANDARDS.length === 0) {
      throw new Error("Infosec standards empty");
    }
    if (!TASSIAHILL_README_MARKDOWN || TASSIAHILL_README_MARKDOWN.length < 50) {
      throw new Error("Readme content unexpectedly small");
    }
  });

  // 3. Roles and Specialists
  test("Roles and Portal Configs", () => {
    if (!ALL_SYSTEM_ROLES || ALL_SYSTEM_ROLES.length === 0) {
      throw new Error("ALL_SYSTEM_ROLES empty");
    }
    ALL_SYSTEM_ROLES.forEach(r => {
      const config = getRoleConfig(r);
      if (!config) {
        throw new Error(`Missing role config for ${r}`);
      }
    });
    if (!HOSPITAL_SPECIALISTS_DIRECTORY || HOSPITAL_SPECIALISTS_DIRECTORY.length === 0) {
      throw new Error("HOSPITAL_SPECIALISTS_DIRECTORY empty");
    }
  });

  // 4. Super Admins
  test("Super Admin verification", () => {
    if (!SUPER_ADMIN_EMAILS || SUPER_ADMIN_EMAILS.length === 0) {
      throw new Error("Super admin emails empty");
    }
    if (!isSuperAdminEmail("urbaninteriorkenya@gmail.com")) {
      throw new Error("urbaninteriorkenya@gmail.com should be super admin");
    }
    if (isSuperAdminEmail("randomuser@example.com")) {
      throw new Error("random user should not be super admin");
    }
    if (!MASTER_SUPER_ADMIN_SEEDS || MASTER_SUPER_ADMIN_SEEDS.length === 0) {
      throw new Error("MASTER_SUPER_ADMIN_SEEDS empty");
    }
  });

  // 5. Clean Firestore Data
  test("cleanFirestoreData removes undefined recursively without mutating valid fields", () => {
    const input = {
      name: "John Doe",
      age: undefined,
      nested: {
        id: "123",
        extra: undefined,
        tags: ["a", undefined, "b"]
      }
    };
    const cleaned = cleanFirestoreData(input) as any;
    if (cleaned.name !== "John Doe" || "age" in cleaned || "extra" in cleaned.nested) {
      throw new Error("cleanFirestoreData failed to remove undefined keys");
    }
    if (cleaned.nested.id !== "123") {
      throw new Error("cleanFirestoreData altered valid nested field");
    }
  });

  // 6. Haemogram Parser & Age/Gender Dynamic Stratification
  test("Haemogram Parser: parses mock clinical report text & determines age/gender reference ranges", () => {
    const isReport = isHaemogramReport("Full Blood Count FBC Haemogram");
    if (!isReport) {
      throw new Error("isHaemogramReport returned false for FBC");
    }
    const sample = `
      WBC: 7.2 x10^9/L (4.0 - 10.0)
      RBC: 4.8 x10^12/L (3.8 - 5.2)
      HB: 13.5 g/dL (12.0 - 15.0)
      HCT: 40.2 % (36.0 - 46.0)
      PLT: 250 x10^9/L (150 - 450)
    `;
    const result = parseHaemogramData(sample);
    if (!result || typeof result !== "object") {
      throw new Error("parseHaemogramData returned invalid result");
    }

    // Dynamic Age & Gender Cohort Tests
    const neonateCohort = determineAgeCohort(0.05, "Male");
    if (neonateCohort.cohort !== "neonate") {
      throw new Error(`Expected neonate cohort for 0.05 years, got ${neonateCohort.cohort}`);
    }

    const childCohort = determineAgeCohort(5, "Female");
    if (childCohort.cohort !== "child") {
      throw new Error(`Expected child cohort for 5 years, got ${childCohort.cohort}`);
    }

    const adultMaleCohort = determineAgeCohort(35, "Male");
    if (adultMaleCohort.cohort !== "adult_male") {
      throw new Error(`Expected adult_male cohort for 35 years male, got ${adultMaleCohort.cohort}`);
    }

    const adultFemaleCohort = determineAgeCohort(30, "Female");
    if (adultFemaleCohort.cohort !== "adult_female") {
      throw new Error(`Expected adult_female cohort for 30 years female, got ${adultFemaleCohort.cohort}`);
    }

    // Dynamic Reference Range Tests based on Age & Gender
    const hbMaleRef = getReferenceRange("hb", 30, "Male");
    const hbFemaleRef = getReferenceRange("hb", 30, "Female");
    const hbNeonateRef = getReferenceRange("hb", 0.02, "Male");

    if (hbMaleRef.min < hbFemaleRef.min) {
      throw new Error("Adult Male Hb lower limit should be higher than adult female");
    }

    if (hbNeonateRef.min < 14.0) {
      throw new Error("Neonatal Hb reference range lower limit should be elevated (>=14.0 g/dL)");
    }

    // Check comprehensive parameter coverage (RBC, WBC, Platelets, Precursors, ESR)
    const params = ["rbc", "hb", "hct", "mcv", "mch", "mchc", "rdw_cv", "rdw_sd", "retic_pct", "retic_abs", "irf", "nrbc_pct", "wbc", "neut_pct", "neut_abs", "lymph_pct", "lymph_abs", "mono_pct", "mono_abs", "eos_pct", "eos_abs", "baso_pct", "baso_abs", "ig_pct", "ig_abs", "bands_pct", "bands_abs", "plt", "mpv", "pdw", "pct", "p_lcr", "p_lcc", "esr"];
    for (const p of params) {
      const ref = getReferenceRange(p, 28, "Female");
      if (!ref || !ref.displayRange) {
        throw new Error(`Missing reference range for parameter: ${p}`);
      }
    }
  });

  // 7. Kenyan Digital Health Service (FHIR & SHA)
  test("Kenya Digital Health Service catalogs & FHIR generation", () => {
    if (!KENYA_ICD10_CATALOG || KENYA_ICD10_CATALOG.length === 0) {
      throw new Error("KENYA_ICD10_CATALOG empty");
    }
    if (!MASTER_SHA_TARIFF_CATALOG || MASTER_SHA_TARIFF_CATALOG.length === 0) {
      throw new Error("MASTER_SHA_TARIFF_CATALOG empty");
    }
    const patientMock = {
      id: "P-1001",
      name: "John Doe",
      nationalId: "12345678",
      phone: "0712345678",
      gender: "Male",
      dob: "1990-01-01"
    };
    const fhir = convertPatientToFhirResource(patientMock);
    if (!fhir || fhir.resourceType !== "Patient") {
      throw new Error("convertPatientToFhirResource failed");
    }
  });

  // 8. Tariff Rate Card & Bed Rates
  test("Tariff Service defaults", () => {
    if (!DEFAULT_PROCEDURE_TARIFFS || DEFAULT_PROCEDURE_TARIFFS.length === 0) {
      throw new Error("DEFAULT_PROCEDURE_TARIFFS empty");
    }
    if (!DEFAULT_WARD_BED_RATES || DEFAULT_WARD_BED_RATES.length === 0) {
      throw new Error("DEFAULT_WARD_BED_RATES empty");
    }
    const consultation = DEFAULT_PROCEDURE_TARIFFS.find(t => t.code === "CON-001");
    if (!consultation || consultation.standardAmount <= 0) {
      throw new Error("Invalid CON-001 tariff amount");
    }
  });

  // 9. Queue Load Balancer & Specialty Normalizer
  test("Queue Load Balancer specialty normalization", () => {
    const s1 = normalizeSpecialtyTerm("Cardiologist");
    const s2 = normalizeSpecialtyTerm("cardiology");
    if (s1 !== s2) {
      throw new Error(`normalizeSpecialtyTerm mismatch: ${s1} vs ${s2}`);
    }
  });

  // 10. Patient Deduplication
  test("Patient Deduplication key normalization", () => {
    const k1 = normalizeKey("  John  Doe  ");
    const k2 = normalizeKey("john doe");
    if (k1 !== "john doe" || k1 !== k2) {
      throw new Error(`normalizeKey failed: got "${k1}" and "${k2}"`);
    }
  });

  // 11. Patient Cart calculations
  test("Patient Cart ID generation", () => {
    const id = getCartDocId("P-1234/2026");
    if (!id || id.includes("/") || !id.startsWith("cart-")) {
      throw new Error(`Invalid sanitized cart ID: ${id}`);
    }
  });

  // 12. Print formatting utilities
  test("Print Utils words formatting", () => {
    const words = numberToKenyanShillingsWords(1500);
    if (!words.toLowerCase().includes("thousand") || !words.toLowerCase().includes("five hundred")) {
      throw new Error(`numberToKenyanShillingsWords failed: ${words}`);
    }
  });

  // 13. Client Platform & Biometrics
  test("Client Platform detection", () => {
    const plat = detectClientPlatform();
    if (typeof plat.isMobile !== "boolean" || typeof plat.isDesktop !== "boolean") {
      throw new Error("detectClientPlatform invalid response");
    }
  });

  // 14. Message Targeting
  test("Message Targeting notification filter", () => {
    const show = shouldShowPopupNotification(
      { targetType: "all", message: "Hospital emergency drill" },
      { id: "EMP-001", role: "Nurse", department: "Casualty" }
    );
    if (!show) {
      throw new Error("shouldShowPopupNotification failed for broadcast message");
    }
    const selfMsg = shouldShowPopupNotification(
      { senderId: "EMP-001", message: "My own note" },
      { id: "EMP-001", role: "Nurse", department: "Casualty" }
    );
    if (selfMsg) {
      throw new Error("shouldShowPopupNotification should return false for own message");
    }
  });

  // 15. Patient Sync & Phone Normalization
  test("Patient Sync phone and search normalization", () => {
    const p1 = normalizePhone("+254712345678");
    const p2 = normalizePhone("0712345678");
    const p3 = normalizePhone("254712345678");
    if (p1 !== "0712345678" || p2 !== "0712345678" || p3 !== "0712345678") {
      throw new Error(`normalizePhone mismatch: ${p1}, ${p2}, ${p3}`);
    }
    const mockList = [
      { id: "p1", patientName: "Grace Wanjiku Kamau", nationalId: "12345678", phone: "0712345678" } as any
    ];
    const found = findUnifiedPatient("+254 712 345 678", mockList);
    if (!found || found.id !== "p1") {
      throw new Error("findUnifiedPatient failed on normalized phone lookup");
    }
  });

  // 16. Hospital Wards Configuration
  test("Hospital Wards Defaults", () => {
    if (!DEFAULT_HOSPITAL_WARDS || DEFAULT_HOSPITAL_WARDS.length === 0) {
      throw new Error("DEFAULT_HOSPITAL_WARDS is empty");
    }
    const matWard = DEFAULT_HOSPITAL_WARDS.find(w => w.category === "Maternity");
    if (!matWard || matWard.totalBeds <= 0 || matWard.dailyBaseRate <= 0) {
      throw new Error("Maternity ward config invalid");
    }
  });

  // 17. E-Claim Pre-submission Validation
  test("SHA E-Claim Pre-submission Validation", () => {
    const invalidClaim = validateClaimBeforeSubmission({});
    if (invalidClaim.isValid) {
      throw new Error("Empty claim should be invalid");
    }
    if (!invalidClaim.errors || invalidClaim.errors.length === 0) {
      throw new Error("Empty claim should return validation error messages");
    }
  });

  console.log(`\n=== AUDIT SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runStepByStepAudit().catch((err) => {
  console.error("Audit runner crashed:", err);
  process.exit(1);
});

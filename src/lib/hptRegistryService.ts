/**
 * Kenya Health Products and Technologies (HPT) Registry
 * Kenya Essential Medicines List (KEML) Standard Directory & Safety Cross-Checking Engine
 */

export interface HptItem {
  hptCode: string;
  genericName: string;
  brandNames: string[];
  therapeuticClass: string;
  chemicalClass: string; // e.g., "Penicillins", "Cephalosporins", "Fluoroquinolones", "NSAIDs", "Macrolides", "Sulphonamides"
  standardFormulations: string[];
  kemlCategory: "Core" | "Complementary" | "Specialist";
  mohLevel: "Level 2 (Dispensary)" | "Level 3 (Health Centre)" | "Level 4 (Sub-County)" | "Level 5 (County)" | "Level 6 (National)";
  standardDosageAdult: string;
  standardDosagePediatric: string;
  contraindications: string[];
  knownCrossAllergens: string[];
}

export const HPT_REGISTRY: HptItem[] = [
  {
    hptCode: "HPT-00101",
    genericName: "Amoxicillin / Clavulanic Acid (Co-amoxiclav)",
    brandNames: ["Augmentin", "Curam", "Amoksiklav", "Clavam"],
    therapeuticClass: "Antibacterial",
    chemicalClass: "Penicillins",
    standardFormulations: ["625mg tabs", "1000mg tabs", "156.25mg/5ml susp", "312.5mg/5ml susp", "457mg/5ml susp"],
    kemlCategory: "Core",
    mohLevel: "Level 3 (Health Centre)",
    standardDosageAdult: "625mg PO TDS for 5-7 days",
    standardDosagePediatric: "25-45mg/kg/day in 2 divided doses",
    contraindications: ["Known penicillin hypersensitivity", "History of co-amoxiclav-associated cholestatic jaundice"],
    knownCrossAllergens: ["Penicillin V", "Ampicillin", "Amoxicillin", "Flucloxacillin", "Cephalexin"]
  },
  {
    hptCode: "HPT-00102",
    genericName: "Amoxicillin Trihydrate",
    brandNames: ["Amoxil", "Moxikem", "Amoxin"],
    therapeuticClass: "Antibacterial",
    chemicalClass: "Penicillins",
    standardFormulations: ["250mg caps", "500mg caps", "125mg/5ml susp", "250mg/5ml susp"],
    kemlCategory: "Core",
    mohLevel: "Level 2 (Dispensary)",
    standardDosageAdult: "500mg PO TDS for 5 days",
    standardDosagePediatric: "40-90mg/kg/day in 3 divided doses",
    contraindications: ["Penicillin allergy", "Infectious mononucleosis (risk of maculopapular rash)"],
    knownCrossAllergens: ["Penicillin", "Ampicillin", "Co-amoxiclav"]
  },
  {
    hptCode: "HPT-00103",
    genericName: "Ceftriaxone Sodium",
    brandNames: ["Rocephin", "Powercef", "Ceftriax"],
    therapeuticClass: "Antibacterial",
    chemicalClass: "Cephalosporins",
    standardFormulations: ["500mg vial", "1g vial", "2g vial"],
    kemlCategory: "Core",
    mohLevel: "Level 4 (Sub-County)",
    standardDosageAdult: "1-2g IV/IM Once daily",
    standardDosagePediatric: "50-80mg/kg/day IV/IM Once daily",
    contraindications: ["Severe anaphylactic reaction to penicillins/cephalosporins", "Neonates with hyperbilirubinemia"],
    knownCrossAllergens: ["Cefalexin", "Cefuroxime", "Cefixime", "Penicillins"]
  },
  {
    hptCode: "HPT-00104",
    genericName: "Ciprofloxacin Hydrochloride",
    brandNames: ["Cipro", "Cifran", "Ciprobay"],
    therapeuticClass: "Antibacterial",
    chemicalClass: "Fluoroquinolones",
    standardFormulations: ["250mg tabs", "500mg tabs", "2mg/ml IV infusion"],
    kemlCategory: "Core",
    mohLevel: "Level 3 (Health Centre)",
    standardDosageAdult: "500mg PO BD for 5-7 days",
    standardDosagePediatric: "Contraindicated in growing children unless strict anthrax/cystic fibrosis indication",
    contraindications: ["Pregnancy", "Children <18 yrs (arthropathy risk)", "Tendonitis / Myasthenia Gravis"],
    knownCrossAllergens: ["Levofloxacin", "Ofloxacin", "Norfloxacin"]
  },
  {
    hptCode: "HPT-00105",
    genericName: "Artemether + Lumefantrine (AL)",
    brandNames: ["Coartem", "Artefan", "Lumart"],
    therapeuticClass: "Antimalarial",
    chemicalClass: "Artemisinin Derivative",
    standardFormulations: ["20/120mg tabs (6-dose blister)", "Dispersible 20/120mg tabs"],
    kemlCategory: "Core",
    mohLevel: "Level 2 (Dispensary)",
    standardDosageAdult: "4 tablets at 0h, 8h, 24h, 36h, 48h, 60h with fatty meal",
    standardDosagePediatric: "Weight-tiered dosing: 5-14kg (1 tab), 15-24kg (2 tabs), 25-34kg (3 tabs)",
    contraindications: ["First trimester of pregnancy (use oral quinine)", "Severe cardiac arrhythmia / prolonged QT"],
    knownCrossAllergens: []
  },
  {
    hptCode: "HPT-00106",
    genericName: "Paracetamol (Acetaminophen)",
    brandNames: ["Panadol", "Calpol", "Painstop", "Para"],
    therapeuticClass: "Analgesic / Antipyretic",
    chemicalClass: "Anilide",
    standardFormulations: ["500mg tabs", "120mg/5ml syrup", "250mg/5ml susp", "1g IV infusion"],
    kemlCategory: "Core",
    mohLevel: "Level 2 (Dispensary)",
    standardDosageAdult: "500mg-1g PO QDS (Max 4g/24h)",
    standardDosagePediatric: "10-15mg/kg PO 4-6 hourly (Max 60mg/kg/day)",
    contraindications: ["Severe active hepatic disease / acute liver failure"],
    knownCrossAllergens: []
  },
  {
    hptCode: "HPT-00107",
    genericName: "Ibuprofen",
    brandNames: ["Brufen", "Profen", "Advil"],
    therapeuticClass: "NSAID",
    chemicalClass: "NSAIDs",
    standardFormulations: ["200mg tabs", "400mg tabs", "100mg/5ml susp"],
    kemlCategory: "Core",
    mohLevel: "Level 2 (Dispensary)",
    standardDosageAdult: "400mg PO TDS with or after meals",
    standardDosagePediatric: "5-10mg/kg PO TDS",
    contraindications: ["Active peptic ulcer disease", "Aspirin-induced asthma / triad", "Severe heart failure", "3rd trimester pregnancy"],
    knownCrossAllergens: ["Aspirin", "Diclofenac", "Naproxen", "Indomethacin", "Meloxicam"]
  },
  {
    hptCode: "HPT-00108",
    genericName: "Diclofenac Sodium",
    brandNames: ["Voltaren", "Diclofen", "Cataflam"],
    therapeuticClass: "NSAID",
    chemicalClass: "NSAIDs",
    standardFormulations: ["50mg tabs", "75mg/3ml ampoule", "100mg SR tabs"],
    kemlCategory: "Core",
    mohLevel: "Level 3 (Health Centre)",
    standardDosageAdult: "50mg PO BD-TDS or 75mg IM (deep intragluteal)",
    standardDosagePediatric: "Not recommended in children <12 years",
    contraindications: ["Ischemic heart disease", "Cerebrovascular disease", "Active gastrointestinal bleeding", "Asthma sensitive to NSAIDs"],
    knownCrossAllergens: ["Aspirin", "Ibuprofen", "Ketorolac"]
  },
  {
    hptCode: "HPT-00109",
    genericName: "Co-trimoxazole (Sulfamethoxazole + Trimethoprim)",
    brandNames: ["Bactrim", "Septrin"],
    therapeuticClass: "Antibacterial",
    chemicalClass: "Sulphonamides",
    standardFormulations: ["480mg tabs", "960mg Forte tabs", "240mg/5ml susp"],
    kemlCategory: "Core",
    mohLevel: "Level 2 (Dispensary)",
    standardDosageAdult: "960mg PO BD or prophylaxis 960mg OD",
    standardDosagePediatric: "6-8mg/kg TMP component PO BD",
    contraindications: ["Known sulphonamide allergy", "G6PD deficiency", "Late pregnancy near term (kernicterus)"],
    knownCrossAllergens: ["Sulfadiazine", "Sulfadoxine", "Glibenclamide", "Furosemide"]
  },
  {
    hptCode: "HPT-00110",
    genericName: "Metformin Hydrochloride",
    brandNames: ["Glucophage", "Metfor", "Formin"],
    therapeuticClass: "Antidiabetic",
    chemicalClass: "Biguanide",
    standardFormulations: ["500mg tabs", "850mg tabs", "1000mg XR tabs"],
    kemlCategory: "Core",
    mohLevel: "Level 3 (Health Centre)",
    standardDosageAdult: "500mg PO BD with food, titrate up to 2g/day",
    standardDosagePediatric: "Specialist approval required",
    contraindications: ["eGFR <30 mL/min (lactic acidosis risk)", "Acute metabolic acidosis", "Severe hypoxia"],
    knownCrossAllergens: []
  },
  {
    hptCode: "HPT-00111",
    genericName: "Amlodipine Besylate",
    brandNames: ["Norvasc", "Amlopin", "Amlodac"],
    therapeuticClass: "Antihypertensive",
    chemicalClass: "Dihydropyridine Calcium Channel Blocker",
    standardFormulations: ["5mg tabs", "10mg tabs"],
    kemlCategory: "Core",
    mohLevel: "Level 3 (Health Centre)",
    standardDosageAdult: "5mg PO Once daily, can increase to 10mg OD",
    standardDosagePediatric: "Not routinely used in pediatrics without nephrologist review",
    contraindications: ["Severe hypotension", "Cardiogenic shock", "Severe aortic stenosis"],
    knownCrossAllergens: ["Nifedipine", "Felodipine"]
  },
  {
    hptCode: "HPT-00112",
    genericName: "Omeprazole",
    brandNames: ["Losec", "Omez", "Gasec"],
    therapeuticClass: "Proton Pump Inhibitor (PPI)",
    chemicalClass: "Substituted Benzimidazole",
    standardFormulations: ["20mg caps", "40mg caps", "40mg IV vial"],
    kemlCategory: "Core",
    mohLevel: "Level 2 (Dispensary)",
    standardDosageAdult: "20mg PO OD 30 min before breakfast for 14-28 days",
    standardDosagePediatric: "0.7-1.4mg/kg PO OD",
    contraindications: ["Hypersensitivity to PPIs"],
    knownCrossAllergens: ["Esomeprazole", "Pantoprazole", "Rabeprazole"]
  }
];

export interface DrugSafetyAlert {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  source: "HPT Registry Allergy Rule" | "CDS Contraindication Rule" | "Pediatric Dosage Check";
  recommendation: string;
}

/**
 * Cross-checks a candidate prescription drug against patient recorded allergies,
 * active problems, and demographics to produce Clinical Decision Support (CDS) safety alerts.
 */
export function checkPrescriptionSafety(
  drugName: string,
  patientAllergies: string[] | string | undefined,
  activeProblems: string[] | undefined,
  patientAge: number | undefined
): DrugSafetyAlert[] {
  const alerts: DrugSafetyAlert[] = [];
  const lowerDrug = drugName.toLowerCase();

  // 1. Locate in HPT Registry
  const matchedHpt = HPT_REGISTRY.find(h =>
    lowerDrug.includes(h.genericName.toLowerCase()) ||
    h.brandNames.some(b => lowerDrug.includes(b.toLowerCase()))
  );

  // Normalize allergies
  const allergiesList: string[] = [];
  if (Array.isArray(patientAllergies)) {
    allergiesList.push(...patientAllergies.map(a => String(a).toLowerCase()));
  } else if (typeof patientAllergies === "string" && patientAllergies.trim()) {
    allergiesList.push(...patientAllergies.split(/[,;\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean));
  }

  // Check 1: Direct Allergy / Cross-allergy Match
  if (allergiesList.length > 0) {
    for (const allergy of allergiesList) {
      // Check if allergy directly matches drug name
      if (lowerDrug.includes(allergy) || allergy.includes(lowerDrug)) {
        alerts.push({
          severity: "critical",
          title: `Direct Allergen Match: ${drugName}`,
          description: `Patient has documented allergy to "${allergy}". Prescribing ${drugName} carries severe risk of acute hypersensitivity or anaphylaxis.`,
          source: "HPT Registry Allergy Rule",
          recommendation: "Stop prescription immediately and select a chemically distinct therapeutic alternative."
        });
      }

      // Check chemical class & cross allergens
      if (matchedHpt) {
        if (
          allergy.includes(matchedHpt.chemicalClass.toLowerCase()) ||
          matchedHpt.knownCrossAllergens.some(ca => allergy.includes(ca.toLowerCase()))
        ) {
          alerts.push({
            severity: "critical",
            title: `Class Cross-Reactivity Alert: ${matchedHpt.chemicalClass}`,
            description: `Patient is allergic to "${allergy}". ${matchedHpt.genericName} belongs to ${matchedHpt.chemicalClass} and shares high cross-reactivity.`,
            source: "HPT Registry Allergy Rule",
            recommendation: `Do not administer ${matchedHpt.genericName}. Cross-allergen class detected.`
          });
        }
      }
    }
  }

  // Check 2: Active Problem Contraindications (Problem List CDS)
  if (activeProblems && activeProblems.length > 0) {
    const problemsStr = activeProblems.join(" ").toLowerCase();

    // Peptic ulcer / Gastritis + NSAIDs
    if ((problemsStr.includes("ulcer") || problemsStr.includes("gastritis") || problemsStr.includes("pud")) &&
        (lowerDrug.includes("ibuprofen") || lowerDrug.includes("diclofenac") || lowerDrug.includes("brufen") || lowerDrug.includes("voltaren") || (matchedHpt?.chemicalClass === "NSAIDs"))) {
      alerts.push({
        severity: "warning",
        title: "Contraindication: NSAID in Peptic Ulcer Disease",
        description: "Patient has active Peptic Ulcer Disease / Gastritis. NSAIDs inhibit mucosal prostaglandins and exacerbate gastric bleeding.",
        source: "CDS Contraindication Rule",
        recommendation: "Consider Paracetamol or add gastro-protection with a PPI (e.g. Omeprazole 20mg)."
      });
    }

    // Asthma + NSAIDs
    if ((problemsStr.includes("asthma") || problemsStr.includes("bronchospasm")) &&
        (matchedHpt?.chemicalClass === "NSAIDs" || lowerDrug.includes("ibuprofen") || lowerDrug.includes("diclofenac"))) {
      alerts.push({
        severity: "warning",
        title: "Precaution: Aspirin/NSAID-Exacerbated Respiratory Disease (AERD)",
        description: "Patient has active Bronchial Asthma. Non-steroidal anti-inflammatory agents can induce acute bronchospasm.",
        source: "CDS Contraindication Rule",
        recommendation: "Confirm patient tolerance before prescribing NSAIDs; prefer Paracetamol."
      });
    }

    // Renal disease + Metformin / NSAIDs
    if ((problemsStr.includes("renal") || problemsStr.includes("kidney") || problemsStr.includes("ckd")) &&
        (lowerDrug.includes("metformin") || matchedHpt?.chemicalClass === "NSAIDs")) {
      alerts.push({
        severity: "critical",
        title: "Renal Function Alert: Nephrotoxic Agent / Lactic Acidosis",
        description: "Patient has documented Renal Disease / CKD. NSAIDs cause acute decline in GFR and Metformin increases lactic acidosis risk.",
        source: "CDS Contraindication Rule",
        recommendation: "Review serum Creatinine/eGFR and adjust dose or select renal-safe alternatives."
      });
    }
  }

  // Check 3: Pediatric Demographics Check
  if (patientAge !== undefined && patientAge < 12) {
    if (lowerDrug.includes("ciprofloxacin") || lowerDrug.includes("cipro")) {
      alerts.push({
        severity: "critical",
        title: "Pediatric Contraindication: Fluoroquinolone",
        description: `Patient is ${patientAge} years old. Ciprofloxacin is generally contraindicated in pediatric patients due to juvenile arthropathy risk.`,
        source: "Pediatric Dosage Check",
        recommendation: "Substitute with pediatric-approved antibiotic (e.g. Amoxicillin or Ceftriaxone)."
      });
    }
    if (lowerDrug.includes("diclofenac")) {
      alerts.push({
        severity: "warning",
        title: "Pediatric Precaution: Diclofenac",
        description: `Patient is ${patientAge} years old. High-potency systemic Diclofenac is not indicated in young children.`,
        source: "Pediatric Dosage Check",
        recommendation: "Use Paracetamol or Ibuprofen pediatric oral suspension."
      });
    }
  }

  return alerts;
}

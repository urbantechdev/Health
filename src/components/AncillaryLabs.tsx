import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, getDocs, query, where, addDoc } from "firebase/firestore";
import { QueueTicket, MedicalRecord, ClinicalVisit } from "../types";
import { findUnifiedPatient, upsertUnifiedPatientRecord } from "../lib/patientSyncService";
import {
  FlaskConical,
  Radio,
  ClipboardCheck,
  Send,
  RefreshCw,
  Eye,
  CheckCircle2,
  FlaskRound,
  Droplets,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Plus,
  Trash2,
  FileText,
  Check,
  Activity,
  Zap,
  Layers,
  Search,
  Filter
} from "lucide-react";
import { toast } from "../lib/promptService";
import HaemogramDocument from "./HaemogramDocument";

interface AncillaryLabsProps {
  toggles: any;
  onActionCompleted: () => void;
}

export interface CustomLabTestItem {
  id: string;
  testName: string;
  parameter: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: "NORMAL" | "HIGH" | "LOW" | "POSITIVE" | "NEGATIVE" | "ABNORMAL";
}

export default function AncillaryLabs({ toggles, onActionCompleted }: AncillaryLabsProps) {
  const [labTickets, setLabTickets] = useState<QueueTicket[]>([]);
  const [radTickets, setRadTickets] = useState<QueueTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<QueueTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Active Lab Worksheet Sub-tab
  const [activeLabTab, setActiveLabTab] = useState<"urinalysis" | "haemogram" | "blood_group" | "biochem" | "serology" | "custom">("urinalysis");
  const [showHaemogramDocModal, setShowHaemogramDocModal] = useState(false);

  // --- 1. URINALYSIS STATE ---
  const [urinalysisData, setUrinalysisData] = useState({
    // Physical Examination
    color: "Pale Yellow",
    appearance: "Clear",
    specificGravity: "1.015",
    ph: "6.0",
    // Chemical Dipstick
    protein: "Negative",
    glucose: "Negative",
    ketones: "Negative",
    leukocytes: "Negative",
    nitrite: "Negative",
    blood: "Negative",
    bilirubin: "Negative",
    urobilinogen: "Normal (0.2-1.0 mg/dL)",
    // Microscopic Examination
    pusCells: "0-2 /HPF",
    rbcs: "0-1 /HPF",
    epithelialCells: "Few /HPF",
    casts: "None Seen",
    crystals: "None Seen",
    microorganisms: "None Seen",
    // Clinical Impression
    impression: "Normal Routine Urinalysis — No active sediment or significant proteinuria."
  });

  // --- 2. FULL HAEMOGRAM (CBC / FBC) STATE ---
  const [haemogramData, setHaemogramData] = useState({
    // Primary CBC Indices
    hb: "13.8",
    wbc: "7.4",
    platelets: "260",
    rbc: "4.85",
    hct: "41.5",
    mcv: "87.0",
    mch: "29.2",
    mchc: "33.6",
    rdw: "12.8",
    // Differential Count (5-Part %)
    neutrophils: "58",
    lymphocytes: "32",
    monocytes: "6",
    eosinophils: "3",
    basophils: "1",
    // Special Hematology
    esr: "10",
    malaria: "Negative",
    pbf: "Normocytic normochromic red blood cells. Normal leucocyte count and distribution. Adequate platelets on film with normal morphology."
  });

  // --- 3. BLOOD GROUPING & IMMUNOHEMATOLOGY ---
  const [isBloodGroupTested, setIsBloodGroupTested] = useState(true);
  const [aboGroup, setAboGroup] = useState<"O" | "A" | "B" | "AB">("O");
  const [rhFactor, setRhFactor] = useState<"+" | "-">("+");
  const [exactBloodType, setExactBloodType] = useState<string>("O+");
  const [crossmatchStatus, setCrossmatchStatus] = useState("Compatible (No Agglutination)");
  const [updateMasterRecord, setUpdateMasterRecord] = useState(true);
  const [immediateUpdating, setImmediateUpdating] = useState(false);

  // --- 4. BIOCHEMISTRY & ORGAN FUNCTION ---
  const [biochemData, setBiochemData] = useState({
    creatinine: "82", // umol/L (60 - 110)
    urea: "4.5", // mmol/L (2.5 - 7.1)
    sodium: "140", // mmol/L (135 - 145)
    potassium: "4.2", // mmol/L (3.5 - 5.0)
    alt: "26", // U/L (0 - 45)
    ast: "22", // U/L (0 - 40)
    totalBilirubin: "12", // umol/L (3 - 21)
    rbs: "5.6", // mmol/L (4.4 - 7.8)
    fbs: "",
    hba1c: "",
    totalCholesterol: "",
    hdl: "",
    ldl: "",
    triglycerides: ""
  });

  // --- 5. SEROLOGY, RAPID TESTS & STOOL ---
  const [serologyData, setSerologyData] = useState({
    stoolMacroscopy: "Formed, Brown, No Blood or Mucus",
    stoolMicroscopy: "No Ova, Cysts, or Trophozoites seen. Nil pus cells or RBCs.",
    widalO: "< 1:80 (Negative)",
    widalH: "< 1:80 (Negative)",
    hPyloriAg: "Negative",
    pregnancyHcg: "Negative",
    vdrlSyphilis: "Non-Reactive",
    crp: "< 6.0 mg/L (Normal)",
    rheumatoidFactor: "Negative (< 14 IU/mL)"
  });

  // --- 6. DYNAMIC CUSTOM / ANY KIND OF TEST REQUIRED ---
  const [customTests, setCustomTests] = useState<CustomLabTestItem[]>([]);
  const [newCustomTest, setNewCustomTest] = useState<CustomLabTestItem>({
    id: "",
    testName: "",
    parameter: "",
    result: "",
    unit: "",
    referenceRange: "",
    flag: "NORMAL"
  });

  // General remarks & radiology
  const [testResults, setTestResults] = useState("");
  const [radiologyFinding, setRadiologyFinding] = useState("Lungs are clear. No active infiltration, pleural effusion, or cardiomegaly.");

  // Saving states
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    // Listen to patients for EHR updates
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const pats: MedicalRecord[] = [];
      snapshot.forEach((doc) => {
        pats.push({ id: doc.id, ...doc.data() } as MedicalRecord);
      });
      setPatients(pats);
    });

    // Listen to active Laboratory queue (both pending and serving)
    const qLab = query(collection(db, "queue"), where("currentDepartment", "==", "laboratory"), where("status", "in", ["pending", "serving"]));
    const unsubLab = onSnapshot(qLab, (snapshot) => {
      const tickets: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() } as QueueTicket);
      });
      setLabTickets(tickets);
    });

    // Listen to active Radiology queue (both pending and serving)
    const qRad = query(collection(db, "queue"), where("currentDepartment", "==", "radiology"), where("status", "in", ["pending", "serving"]));
    const unsubRad = onSnapshot(qRad, (snapshot) => {
      const tickets: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() } as QueueTicket);
      });
      setRadTickets(tickets);
    });

    return () => {
      unsubPatients();
      unsubLab();
      unsubRad();
    };
  }, []);

  // When selected ticket changes, synchronize patient info and auto-switch to doctor's requested test tab
  const matchedPatient = selectedTicket 
    ? findUnifiedPatient(selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName, patients) 
    : null;

  const handleSelectTicket = (t: QueueTicket) => {
    setSelectedTicket(t);
    setTestResults("");

    // Detect doctor-ordered tests and intelligently pre-select active tab
    const requested = (t.requestedTests || t.labTestsOrdered || []).join(" ").toLowerCase() + " " + (t.notes || "").toLowerCase() + " " + (t.service || "").toLowerCase();
    
    if (requested.includes("haemogram") || requested.includes("cbc") || requested.includes("full blood")) {
      setActiveLabTab("haemogram");
    } else if (requested.includes("urinalysis") || requested.includes("urine")) {
      setActiveLabTab("urinalysis");
    } else if (requested.includes("group") || requested.includes("rh") || requested.includes("crossmatch")) {
      setActiveLabTab("blood_group");
    } else if (requested.includes("lft") || requested.includes("renal") || requested.includes("sugar") || requested.includes("glucose") || requested.includes("u&e")) {
      setActiveLabTab("biochem");
    } else if (requested.includes("stool") || requested.includes("widal") || requested.includes("malaria") || requested.includes("pylori")) {
      setActiveLabTab("serology");
    } else {
      setActiveLabTab("urinalysis");
    }

    const p = findUnifiedPatient(t.patientId || t.nationalId || t.patientName, patients);
    if (p) {
      if (p.bloodType && p.bloodType !== "Not Sure" && p.bloodType !== "Unknown") {
        setExactBloodType(p.bloodType);
        if (p.bloodType.startsWith("AB")) {
          setAboGroup("AB");
          setRhFactor(p.bloodType.includes("-") ? "-" : "+");
        } else if (p.bloodType.startsWith("A")) {
          setAboGroup("A");
          setRhFactor(p.bloodType.includes("-") ? "-" : "+");
        } else if (p.bloodType.startsWith("B")) {
          setAboGroup("B");
          setRhFactor(p.bloodType.includes("-") ? "-" : "+");
        } else if (p.bloodType.startsWith("O")) {
          setAboGroup("O");
          setRhFactor(p.bloodType.includes("-") ? "-" : "+");
        }
      } else {
        setExactBloodType("O+");
        setAboGroup("O");
        setRhFactor("+");
        setUpdateMasterRecord(true);
      }
    }
  };

  const handleAboChange = (newAbo: "O" | "A" | "B" | "AB") => {
    setAboGroup(newAbo);
    setExactBloodType(`${newAbo}${rhFactor}`);
  };

  const handleRhChange = (newRh: "+" | "-") => {
    setRhFactor(newRh);
    setExactBloodType(`${aboGroup}${newRh}`);
  };

  const handlePillSelect = (bType: string) => {
    setExactBloodType(bType);
    if (bType === "Not Sure") return;
    if (bType.startsWith("AB")) {
      setAboGroup("AB");
      setRhFactor(bType.includes("-") ? "-" : "+");
    } else if (bType.startsWith("A")) {
      setAboGroup("A");
      setRhFactor(bType.includes("-") ? "-" : "+");
    } else if (bType.startsWith("B")) {
      setAboGroup("B");
      setRhFactor(bType.includes("-") ? "-" : "+");
    } else if (bType.startsWith("O")) {
      setAboGroup("O");
      setRhFactor(bType.includes("-") ? "-" : "+");
    }
  };

  // Quick preset templates for Urinalysis
  const applyUrinalysisPreset = (preset: "normal" | "uti" | "diabetes" | "hematuria") => {
    if (preset === "normal") {
      setUrinalysisData({
        color: "Pale Yellow",
        appearance: "Clear",
        specificGravity: "1.015",
        ph: "6.0",
        protein: "Negative",
        glucose: "Negative",
        ketones: "Negative",
        leukocytes: "Negative",
        nitrite: "Negative",
        blood: "Negative",
        bilirubin: "Negative",
        urobilinogen: "Normal (0.2-1.0 mg/dL)",
        pusCells: "0-2 /HPF",
        rbcs: "0-1 /HPF",
        epithelialCells: "Few /HPF",
        casts: "None Seen",
        crystals: "None Seen",
        microorganisms: "None Seen",
        impression: "Normal Routine Urinalysis — No active sediment or significant proteinuria."
      });
      toast.success("Applied Standard Normal Urinalysis Template");
    } else if (preset === "uti") {
      setUrinalysisData({
        color: "Amber / Turbid",
        appearance: "Cloudy",
        specificGravity: "1.025",
        ph: "7.5",
        protein: "1+ (30 mg/dL)",
        glucose: "Negative",
        ketones: "Negative",
        leukocytes: "3+ (+++)",
        nitrite: "Positive (+)",
        blood: "1+ (+)",
        bilirubin: "Negative",
        urobilinogen: "Normal",
        pusCells: ">25 /HPF (Abundant Pus Cells)",
        rbcs: "3-5 /HPF",
        epithelialCells: "Moderate /HPF",
        casts: "Leukocyte Casts Present",
        crystals: "Triple Phosphate Crystals (+)",
        microorganisms: "Bacteria Present (Heavy +++)",
        impression: "Active Urinary Tract Infection (UTI) — Significant Pyuria, Nitrite Positive & Bacteriuria."
      });
      toast.success("Applied Acute UTI Urinalysis Template");
    } else if (preset === "diabetes") {
      setUrinalysisData({
        color: "Straw",
        appearance: "Clear",
        specificGravity: "1.035",
        ph: "5.5",
        protein: "Trace",
        glucose: "3+ (500 mg/dL)",
        ketones: "2+ (Moderate)",
        leukocytes: "Negative",
        nitrite: "Negative",
        blood: "Negative",
        bilirubin: "Negative",
        urobilinogen: "Normal",
        pusCells: "1-2 /HPF",
        rbcs: "Nil /HPF",
        epithelialCells: "Few /HPF",
        casts: "None Seen",
        crystals: "None Seen",
        microorganisms: "None Seen",
        impression: "Marked Glucosuria & Moderate Ketonuria — Suggestive of Poor Glycemic Control / Diabetic Ketonuria."
      });
      toast.success("Applied Diabetic Glycosuria/Ketonuria Template");
    } else if (preset === "hematuria") {
      setUrinalysisData({
        color: "Red / Brown (Smoky)",
        appearance: "Turbid",
        specificGravity: "1.020",
        ph: "6.0",
        protein: "2+ (100 mg/dL)",
        glucose: "Negative",
        ketones: "Negative",
        leukocytes: "1+",
        nitrite: "Negative",
        blood: "3+ (Large)",
        bilirubin: "Negative",
        urobilinogen: "Normal",
        pusCells: "2-4 /HPF",
        rbcs: ">30 /HPF (Dysmorphic RBCs)",
        epithelialCells: "Few /HPF",
        casts: "Granular Casts (+)",
        crystals: "Calcium Oxalate Crystals (+)",
        microorganisms: "None Seen",
        impression: "Frank / Microscopic Hematuria with Proteinuria — Further renal/urological investigation advised."
      });
      toast.success("Applied Hematuria / Renal Screen Template");
    }
  };

  // Quick preset templates for Full Haemogram
  const applyHaemogramPreset = (preset: "normal" | "anemia" | "infection" | "malaria_thrombocytopenia") => {
    if (preset === "normal") {
      setHaemogramData({
        hb: "14.2",
        wbc: "6.8",
        platelets: "275",
        rbc: "4.90",
        hct: "42.0",
        mcv: "86.5",
        mch: "29.0",
        mchc: "33.8",
        rdw: "12.5",
        neutrophils: "60",
        lymphocytes: "30",
        monocytes: "6",
        eosinophils: "3",
        basophils: "1",
        esr: "8",
        malaria: "Negative",
        pbf: "Normocytic normochromic red cells. Normal white cell count & morphology. Platelets adequate."
      });
      toast.success("Applied Normal Full Haemogram Template");
    } else if (preset === "anemia") {
      setHaemogramData({
        hb: "8.4",
        wbc: "6.2",
        platelets: "310",
        rbc: "3.40",
        hct: "26.5",
        mcv: "68.0",
        mch: "21.5",
        mchc: "29.0",
        rdw: "18.5",
        neutrophils: "56",
        lymphocytes: "34",
        monocytes: "7",
        eosinophils: "2",
        basophils: "1",
        esr: "28",
        malaria: "Negative",
        pbf: "Microcytic hypochromic red blood cells with marked anisopoikilocytosis and pencil cells. Features consistent with Iron Deficiency Anemia."
      });
      toast.success("Applied Microcytic Anemia Template");
    } else if (preset === "infection") {
      setHaemogramData({
        hb: "13.0",
        wbc: "16.8",
        platelets: "380",
        rbc: "4.50",
        hct: "39.0",
        mcv: "86.0",
        mch: "28.8",
        mchc: "33.3",
        rdw: "13.2",
        neutrophils: "82",
        lymphocytes: "12",
        monocytes: "4",
        eosinophils: "1",
        basophils: "1",
        esr: "45",
        malaria: "Negative",
        pbf: "Marked neutrophilic leukocytosis with left shift (band forms) and toxic granulations. Consistent with acute bacterial infection."
      });
      toast.success("Applied Bacterial Infection (Leukocytosis) Template");
    } else if (preset === "malaria_thrombocytopenia") {
      setHaemogramData({
        hb: "10.2",
        wbc: "4.5",
        platelets: "78",
        rbc: "3.80",
        hct: "31.0",
        mcv: "83.0",
        mch: "27.5",
        mchc: "32.9",
        rdw: "14.8",
        neutrophils: "52",
        lymphocytes: "38",
        monocytes: "8",
        eosinophils: "1",
        basophils: "1",
        esr: "38",
        malaria: "Positive (Plasmodium Falciparum Ring Forms ++ / High Density)",
        pbf: "Normocytic red cells with intracellular ring-form trophozoites of P. falciparum. Moderate thrombocytopenia noted on film."
      });
      toast.success("Applied Malaria + Thrombocytopenia Template");
    }
  };

  // Add custom test row
  const handleAddCustomTest = () => {
    if (!newCustomTest.testName.trim() || !newCustomTest.parameter.trim()) {
      toast.warning("Please enter test name and parameter.", "Fields Required");
      return;
    }
    const item: CustomLabTestItem = {
      ...newCustomTest,
      id: `custom-test-${Date.now()}`
    };
    setCustomTests([...customTests, item]);
    setNewCustomTest({
      id: "",
      testName: newCustomTest.testName,
      parameter: "",
      result: "",
      unit: "",
      referenceRange: "",
      flag: "NORMAL"
    });
    toast.success(`Added ${item.parameter} to lab report!`);
  };

  const handleRemoveCustomTest = (id: string) => {
    setCustomTests(customTests.filter(t => t.id !== id));
  };

  // Direct EHR update for blood group
  const handleDirectUpdateBloodType = async () => {
    if (!matchedPatient) {
      toast.warning("Patient EHR not found to update.", "Cannot Update");
      return;
    }
    if (exactBloodType === "Not Sure") {
      toast.warning("Please specify confirmed blood group (e.g. O+, A+, B-, etc.).", "Exact Type Required");
      return;
    }

    setImmediateUpdating(true);
    try {
      const patientRef = doc(db, "patients", matchedPatient.id);
      await updateDoc(patientRef, {
        bloodType: exactBloodType,
        updatedAt: new Date().toISOString()
      });

      toast.success(
        `Patient blood type verified and updated to ${exactBloodType} in EHR!`,
        "EHR Master Record Updated"
      );
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update patient blood type: " + (error?.message || "Unknown error"));
    } finally {
      setImmediateUpdating(false);
    }
  };

  // Compile Comprehensive Results String
  const compileComprehensiveLabResults = () => {
    const sections: string[] = [];

    // 1. Urinalysis Report
    const uriText = [
      `=== URINALYSIS REPORT ===`,
      `• Physical: Color: ${urinalysisData.color}, Appearance: ${urinalysisData.appearance}, Sp. Gravity: ${urinalysisData.specificGravity}, pH: ${urinalysisData.ph}`,
      `• Chemical Dipstick: Protein: ${urinalysisData.protein}, Glucose: ${urinalysisData.glucose}, Ketones: ${urinalysisData.ketones}, Leukocytes: ${urinalysisData.leukocytes}, Nitrite: ${urinalysisData.nitrite}, Blood: ${urinalysisData.blood}, Bilirubin: ${urinalysisData.bilirubin}, Urobilinogen: ${urinalysisData.urobilinogen}`,
      `• Microscopy: WBC/Pus: ${urinalysisData.pusCells}, RBCs: ${urinalysisData.rbcs}, Epithelial: ${urinalysisData.epithelialCells}, Casts: ${urinalysisData.casts}, Crystals: ${urinalysisData.crystals}, Organisms: ${urinalysisData.microorganisms}`,
      `• Impression: ${urinalysisData.impression}`
    ].join("\n");
    sections.push(uriText);

    // 2. Full Haemogram Report
    const cbcText = [
      `=== FULL HAEMOGRAM (CBC + DIFF) ===`,
      `• Primary: Hb: ${haemogramData.hb} g/dL (Ref: 12.0-17.5), WBC: ${haemogramData.wbc} x10^9/L (4.0-11.0), Platelets: ${haemogramData.platelets} x10^9/L (150-450), RBC: ${haemogramData.rbc} x10^12/L, HCT: ${haemogramData.hct}%`,
      `• Red Cell Indices: MCV: ${haemogramData.mcv} fl, MCH: ${haemogramData.mch} pg, MCHC: ${haemogramData.mchc} g/dL, RDW: ${haemogramData.rdw}%`,
      `• Differential (5-Part %): Neut: ${haemogramData.neutrophils}%, Lymph: ${haemogramData.lymphocytes}%, Mono: ${haemogramData.monocytes}%, Eos: ${haemogramData.eosinophils}%, Baso: ${haemogramData.basophils}%`,
      `• ESR: ${haemogramData.esr} mm/hr • Malaria (MPS/RDT): ${haemogramData.malaria}`,
      `• Film Morphology (PBF): ${haemogramData.pbf}`
    ].join("\n");
    sections.push(cbcText);

    // 3. Immunohematology
    if (isBloodGroupTested) {
      sections.push(
        `=== IMMUNOHEMATOLOGY ===\n• Confirmed Blood Group: ${exactBloodType} (ABO: ${aboGroup}, Rh(D): ${rhFactor === "+" ? "Positive" : "Negative"}, Crossmatch: ${crossmatchStatus})`
      );
    }

    // 4. Biochemistry
    if (biochemData.creatinine || biochemData.rbs || biochemData.alt) {
      const biochemLines = [`=== CLINICAL BIOCHEMISTRY ===`];
      if (biochemData.rbs) biochemLines.push(`• Random Blood Sugar (RBS): ${biochemData.rbs} mmol/L`);
      if (biochemData.creatinine) biochemLines.push(`• Renal: Creatinine: ${biochemData.creatinine} umol/L, Urea: ${biochemData.urea} mmol/L, Na+: ${biochemData.sodium} mmol/L, K+: ${biochemData.potassium} mmol/L`);
      if (biochemData.alt) biochemLines.push(`• LFTs: ALT/SGPT: ${biochemData.alt} U/L, AST/SGOT: ${biochemData.ast} U/L, Total Bilirubin: ${biochemData.totalBilirubin} umol/L`);
      sections.push(biochemLines.join("\n"));
    }

    // 5. Serology & Rapid Immunoassays
    if (serologyData.widalO || serologyData.stoolMicroscopy) {
      sections.push(
        `=== SEROLOGY & PARASITOLOGY ===\n• Stool Exam: ${serologyData.stoolMacroscopy} • ${serologyData.stoolMicroscopy}\n• Typhoid Widal: O ${serologyData.widalO}, H ${serologyData.widalH} • H. Pylori: ${serologyData.hPyloriAg} • Pregnancy Test: ${serologyData.pregnancyHcg} • VDRL: ${serologyData.vdrlSyphilis}`
      );
    }

    // 6. Custom Lab Tests
    if (customTests.length > 0) {
      const customLines = [`=== ADDITIONAL DIAGNOSTIC TESTS ===`];
      customTests.forEach((t) => {
        customLines.push(`• [${t.testName}] ${t.parameter}: ${t.result} ${t.unit} (Ref: ${t.referenceRange}) [${t.flag}]`);
      });
      sections.push(customLines.join("\n"));
    }

    if (testResults.trim()) {
      sections.push(`=== LAB TECHNICIAN REMARKS ===\n${testResults.trim()}`);
    }

    return sections.join("\n\n");
  };

  const handleTransmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) {
      toast.warning("Please select a diagnostic queue patient.", "Patient Required");
      return;
    }

    setSubmitting(true);
    try {
      const matched = matchedPatient || findUnifiedPatient(selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName, patients);
      const type = selectedTicket.currentDepartment;
      
      const compileResults = type === "laboratory" 
        ? compileComprehensiveLabResults()
        : `PACS ID: DICOM-RAD-${Date.now().toString().substring(6)} • Description: ${radiologyFinding}. Remarks: ${testResults}`;

      if (matched) {
        const patientRef = doc(db, "patients", matched.id);
        const updatedVisits = [...(matched.visits || [])];

        const patientUpdatePayload: any = {
          updatedAt: new Date().toISOString()
        };

        if (type === "laboratory" && updateMasterRecord && exactBloodType !== "Not Sure") {
          patientUpdatePayload.bloodType = exactBloodType;
        }

        if (updatedVisits.length > 0) {
          const lastVisit = updatedVisits[updatedVisits.length - 1];
          const referrals = lastVisit.referrals || [];
          let foundRef = false;

          const updatedReferrals = referrals.map((ref) => {
            if (ref.department === type) {
              foundRef = true;
              return {
                ...ref,
                status: "completed" as const,
                results: compileResults,
              };
            }
            return ref;
          });

          if (!foundRef) {
            updatedReferrals.push({
              id: `ref-${Date.now()}`,
              department: type,
              testName: type === "laboratory" ? "Urinalysis, Full Haemogram & Comprehensive Diagnostic Panel" : "Radiology Chest / Abdominal X-Ray",
              notes: "Completed at Ancillary Counter",
              status: "completed" as const,
              results: compileResults,
            });
          }

          updatedVisits[updatedVisits.length - 1] = {
            ...lastVisit,
            referrals: updatedReferrals,
          };
          patientUpdatePayload.visits = updatedVisits;
        }

        await updateDoc(patientRef, patientUpdatePayload);
      }

      // Automated routing: Return patient to doctor desk with Results Ready metadata (Kenyan 2-Phase Loop)
      const baseNum = selectedTicket.ticketNo.includes("-") ? selectedTicket.ticketNo.split("-")[1] : Math.floor(100 + Math.random() * 900);
      const newTicketNo = `REV-${baseNum}`;
      await updateDoc(doc(db, "queue", selectedTicket.id), {
        currentDepartment: "doctor",
        ticketNo: newTicketNo,
        status: "pending",
        isResultsReview: true,
        resultsReady: true,
        labSummary: compileResults,
        service: "Doctor Results Review",
        notes: `🔬 Urinalysis & Full Haemogram results ready for Doctor Review (No double consultation charge). LIS findings posted.`,
        timestamp: new Date().toISOString(),
      });

      setSelectedTicket(null);
      setTestResults("");
      toast.success(
        "Urinalysis, Full Haemogram & Diagnostic findings electronically transmitted! Patient returned to Doctor Review Queue.",
        "Lab Results Dispatched"
      );
      onActionCompleted();
    } catch (error) {
      console.error(error);
      toast.error("Failed to transmit lab results.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPatientBloodUnconfirmed = !matchedPatient?.bloodType || matchedPatient.bloodType === "Not Sure" || matchedPatient.bloodType === "Unknown";

  const filteredLabTickets = labTickets.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.patientName.toLowerCase().includes(q) || t.ticketNo.toLowerCase().includes(q) || (t.nationalId && t.nationalId.toLowerCase().includes(q));
  });

  return (
    <div id="ancillary-labs" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-150 shadow-xs">
            <FlaskRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Laboratory Information System (LIS)</h2>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-500" />
                Live Sync Active
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Complete diagnostic worksheets for Urinalysis, Full Haemogram, Immunohematology & Any Custom Clinical Tests
            </p>
          </div>
        </div>

        {/* Counter Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {toggles.laboratory && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl">
              <FlaskConical className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-xs font-bold text-blue-900">Lab Waiting Queue:</span>
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-xs font-black">
                {labTickets.length} pending
              </span>
            </div>
          )}
          {toggles.radiology && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl">
              <Radio className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-900">Radiology:</span>
              <span className="px-2 py-0.5 bg-purple-600 text-white rounded-lg text-xs font-black">
                {radTickets.length}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Waiting Queue Intake List */}
        <div className="lg:col-span-4 space-y-4 lg:border-r border-gray-100 pr-0 lg:pr-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Incoming Lab Orders</span>
            </h3>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
              Instant Wire Enabled
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient name, ticket #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>
          
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {toggles.laboratory && (
              <div className="space-y-2">
                {filteredLabTickets.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-gray-200 text-center space-y-1">
                    <FlaskConical className="w-8 h-8 mx-auto text-gray-300" />
                    <p className="text-xs font-semibold text-gray-500">No patients waiting in lab queue</p>
                    <p className="text-[10px] text-gray-400">Patients cued from Doctor's Desk arrive instantly here.</p>
                  </div>
                ) : (
                  filteredLabTickets.map((t) => {
                    const pat = findUnifiedPatient(t.patientId || t.nationalId || t.patientName, patients);
                    const isUnsure = !pat?.bloodType || pat.bloodType === "Not Sure" || pat.bloodType === "Unknown";
                    const isSelected = selectedTicket?.id === t.id;
                    const testsRequested = t.requestedTests || t.labTestsOrdered || [];

                    return (
                      <button
                        key={t.id}
                        id={`btn-lab-pull-${t.id}`}
                        onClick={() => handleSelectTicket(t)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500 text-blue-950"
                            : "border-gray-150 hover:border-blue-300 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                              {t.ticketNo}
                            </span>
                            {isUnsure && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded border border-amber-300">
                                Blood: Unsure
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Cued to Lab
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-xs text-gray-900">{t.patientName}</p>
                          <p className="text-[10px] text-gray-500">
                            ID: {t.nationalId || "N/A"} • Age: {t.age || pat?.age || "—"}y, {t.gender || pat?.gender || "—"}
                          </p>
                        </div>

                        {/* Doctor's Ordered Tests Tags */}
                        {testsRequested.length > 0 ? (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
                            {testsRequested.map((test, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-900 border border-blue-200/60 flex items-center gap-0.5"
                              >
                                <Zap className="w-2.5 h-2.5 text-amber-500" />
                                {test}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-blue-700 font-medium italic">
                            Order: Urinalysis & Full Haemogram
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Radiology Intake */}
            {toggles.radiology && (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-bold text-purple-600 uppercase flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Radiology Intake ({radTickets.length})</span>
                </p>
                {radTickets.map((t) => (
                  <button
                    key={t.id}
                    id={`btn-rad-pull-${t.id}`}
                    onClick={() => handleSelectTicket(t)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      selectedTicket?.id === t.id
                        ? "border-purple-500 bg-purple-50/40 text-purple-900 shadow-xs"
                        : "border-gray-100 hover:border-gray-200 bg-white"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{t.ticketNo}</p>
                      <p className="text-[10px] text-gray-500">{t.patientName}</p>
                    </div>
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold uppercase">Pull File</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Comprehensive Testing Worksheet */}
        <div className="lg:col-span-8">
          {selectedTicket ? (
            <form onSubmit={handleTransmitResults} className="space-y-5">
              {/* Patient Banner */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl shadow-sm space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
                    Active Laboratory Diagnostic File
                  </span>
                  <span className="font-mono bg-blue-900/60 px-2 py-0.5 rounded-md border border-blue-400/30">
                    Queue Ref: {selectedTicket.ticketNo}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedTicket.patientName}</h3>
                    <p className="text-xs text-blue-200/90 mt-0.5">
                      National ID: <span className="font-mono font-bold text-white">{selectedTicket.nationalId || "N/A"}</span> • Department: <span className="capitalize font-bold text-emerald-300">{selectedTicket.currentDepartment}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-[11px] text-blue-100">Confirmed Blood Type:</span>
                    <span className="text-sm font-black text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-lg border border-amber-400/40">
                      {exactBloodType}
                    </span>
                  </div>
                </div>

                {/* Doctor's Orders Note Banner */}
                {selectedTicket.notes && (
                  <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-xs text-blue-100 flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-200">Doctor's Order Notes:</strong> {selectedTicket.notes}
                      {selectedTicket.requestedTests && Array.isArray(selectedTicket.requestedTests) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedTicket.requestedTests.map((req, i) => (
                            <span key={i} className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md text-white">
                              ✓ {req}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedTicket.currentDepartment === "laboratory" ? (
                /* MAIN LABORATORY TESTING SUITE */
                <div className="space-y-4">
                  {/* Tab Navigation for Testing Modules */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setActiveLabTab("urinalysis")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeLabTab === "urinalysis"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-slate-700 hover:bg-white/80"
                      }`}
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>1. Urinalysis Worksheet</span>
                      <span className="px-1.5 py-0.2 bg-black/20 rounded text-[10px]">Std</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveLabTab("haemogram")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeLabTab === "haemogram"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-slate-700 hover:bg-white/80"
                      }`}
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>2. Full Haemogram (CBC)</span>
                      <span className="px-1.5 py-0.2 bg-black/20 rounded text-[10px]">Std</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveLabTab("blood_group")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeLabTab === "blood_group"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-700 hover:bg-white/80"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>3. Blood Grouping</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveLabTab("biochem")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeLabTab === "biochem"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-700 hover:bg-white/80"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>4. Biochemistry & Organ Profiles</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveLabTab("serology")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeLabTab === "serology"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-slate-700 hover:bg-white/80"
                      }`}
                    >
                      <FlaskRound className="w-3.5 h-3.5" />
                      <span>5. Stool & Serology</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveLabTab("custom")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeLabTab === "custom"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-700 hover:bg-white/80"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Custom / Any Other Test</span>
                      {customTests.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-blue-500 text-white rounded text-[10px]">
                          {customTests.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* ======================================================== */}
                  {/* 1. COMPLETE URINALYSIS WORKSHEET */}
                  {/* ======================================================== */}
                  {activeLabTab === "urinalysis" && (
                    <div className="p-5 border-2 border-amber-200/90 rounded-2xl bg-amber-50/15 space-y-5 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/70">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                            <FlaskConical className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                              <span>Urinalysis (Complete Dipstick & Centrifuged Microscopy)</span>
                            </h4>
                            <p className="text-xs text-amber-800/80">
                              Standard 10-parameter biochemical urinalysis and microscopic sediment examination
                            </p>
                          </div>
                        </div>

                        {/* Quick 1-Click Urinalysis Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-amber-900 uppercase">Quick Presets:</span>
                          <button
                            type="button"
                            onClick={() => applyUrinalysisPreset("normal")}
                            className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            ✓ Normal Urine
                          </button>
                          <button
                            type="button"
                            onClick={() => applyUrinalysisPreset("uti")}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Acute UTI
                          </button>
                          <button
                            type="button"
                            onClick={() => applyUrinalysisPreset("diabetes")}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Glucosuria/DKA
                          </button>
                          <button
                            type="button"
                            onClick={() => applyUrinalysisPreset("hematuria")}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Hematuria
                          </button>
                        </div>
                      </div>

                      {/* Section A: Physical / Macroscopic Examination */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block">
                          A. Macroscopic & Physical Properties
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Color</label>
                            <select
                              value={urinalysisData.color}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, color: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg font-medium"
                            >
                              <option>Pale Yellow</option>
                              <option>Straw</option>
                              <option>Yellow</option>
                              <option>Deep Amber</option>
                              <option>Red / Brown (Smoky)</option>
                              <option>Orange</option>
                              <option>Turbid / Milky</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Appearance / Clarity</label>
                            <select
                              value={urinalysisData.appearance}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, appearance: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg font-medium"
                            >
                              <option>Clear</option>
                              <option>Slightly Hazy</option>
                              <option>Cloudy</option>
                              <option>Turbid</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Specific Gravity (1.005-1.030)</label>
                            <input
                              type="text"
                              value={urinalysisData.specificGravity}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, specificGravity: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">pH Reaction (4.5 - 8.0)</label>
                            <input
                              type="text"
                              value={urinalysisData.ph}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, ph: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section B: Chemical Dipstick Examination */}
                      <div className="space-y-2 pt-2 border-t border-amber-200/50">
                        <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block">
                          B. Chemical 10-Parameter Dipstick Findings
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Protein / Albumin</label>
                            <select
                              value={urinalysisData.protein}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, protein: e.target.value })}
                              className={`w-full px-2.5 py-1.5 bg-white border rounded-lg font-semibold ${
                                urinalysisData.protein !== "Negative" ? "border-rose-400 bg-rose-50/50 text-rose-900" : "border-gray-200"
                              }`}
                            >
                              <option>Negative</option>
                              <option>Trace</option>
                              <option>1+ (30 mg/dL)</option>
                              <option>2+ (100 mg/dL)</option>
                              <option>3+ (300 mg/dL)</option>
                              <option>4+ (1000 mg/dL)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Glucose / Sugar</label>
                            <select
                              value={urinalysisData.glucose}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, glucose: e.target.value })}
                              className={`w-full px-2.5 py-1.5 bg-white border rounded-lg font-semibold ${
                                urinalysisData.glucose !== "Negative" ? "border-purple-400 bg-purple-50/50 text-purple-900" : "border-gray-200"
                              }`}
                            >
                              <option>Negative</option>
                              <option>Normal</option>
                              <option>1+ (100 mg/dL)</option>
                              <option>2+ (250 mg/dL)</option>
                              <option>3+ (500 mg/dL)</option>
                              <option>4+ (1000+ mg/dL)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Ketones</label>
                            <select
                              value={urinalysisData.ketones}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, ketones: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>Negative</option>
                              <option>Trace (5 mg/dL)</option>
                              <option>1+ (Small 15 mg/dL)</option>
                              <option>2+ (Moderate 40 mg/dL)</option>
                              <option>3+ (Large 80+ mg/dL)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Leukocyte Esterase</label>
                            <select
                              value={urinalysisData.leukocytes}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, leukocytes: e.target.value })}
                              className={`w-full px-2.5 py-1.5 bg-white border rounded-lg font-semibold ${
                                urinalysisData.leukocytes !== "Negative" ? "border-amber-400 bg-amber-50/50 text-amber-900" : "border-gray-200"
                              }`}
                            >
                              <option>Negative</option>
                              <option>Trace</option>
                              <option>1+ (+)</option>
                              <option>2+ (++)</option>
                              <option>3+ (+++)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Nitrite Reaction</label>
                            <select
                              value={urinalysisData.nitrite}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, nitrite: e.target.value })}
                              className={`w-full px-2.5 py-1.5 bg-white border rounded-lg font-semibold ${
                                urinalysisData.nitrite === "Positive (+)" ? "border-rose-400 bg-rose-50 text-rose-900" : "border-gray-200"
                              }`}
                            >
                              <option>Negative</option>
                              <option>Positive (+)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Blood / Hemoglobin</label>
                            <select
                              value={urinalysisData.blood}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, blood: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>Negative</option>
                              <option>Trace</option>
                              <option>1+ (Small)</option>
                              <option>2+ (Moderate)</option>
                              <option>3+ (Large)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Bilirubin</label>
                            <select
                              value={urinalysisData.bilirubin}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, bilirubin: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>Negative</option>
                              <option>1+ (+)</option>
                              <option>2+ (++)</option>
                              <option>3+ (+++)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Urobilinogen</label>
                            <select
                              value={urinalysisData.urobilinogen}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, urobilinogen: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>Normal (0.2-1.0 mg/dL)</option>
                              <option>Elevated (2.0 mg/dL)</option>
                              <option>Elevated (4.0 mg/dL)</option>
                              <option>Elevated (8.0+ mg/dL)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section C: Centrifuged Microscopic Sediment */}
                      <div className="space-y-2 pt-2 border-t border-amber-200/50">
                        <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block">
                          C. Centrifuged Microscopic Sediment Examination (/HPF & /LPF)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">WBCs / Pus Cells (/HPF)</label>
                            <select
                              value={urinalysisData.pusCells}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, pusCells: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>0-2 /HPF</option>
                              <option>3-5 /HPF</option>
                              <option>5-10 /HPF</option>
                              <option>10-20 /HPF</option>
                              <option>&gt;25 /HPF (Abundant Pus Cells)</option>
                              <option>Packed / Overcrowded</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Red Blood Cells (RBCs /HPF)</label>
                            <select
                              value={urinalysisData.rbcs}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, rbcs: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>Nil /HPF</option>
                              <option>0-1 /HPF</option>
                              <option>3-5 /HPF</option>
                              <option>5-10 /HPF</option>
                              <option>&gt;10 /HPF (Abundant RBCs)</option>
                              <option>&gt;30 /HPF (Dysmorphic RBCs)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Epithelial Cells</label>
                            <select
                              value={urinalysisData.epithelialCells}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, epithelialCells: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>Nil</option>
                              <option>Few /HPF</option>
                              <option>Moderate /HPF</option>
                              <option>Many (+++)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Urinary Casts (/LPF)</label>
                            <select
                              value={urinalysisData.casts}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, casts: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>None Seen</option>
                              <option>Hyaline Casts (Occasional)</option>
                              <option>Granular Casts (+)</option>
                              <option>Leukocyte Casts Present</option>
                              <option>RBC Casts (Glomerular)</option>
                              <option>Waxy Casts</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Crystals</label>
                            <select
                              value={urinalysisData.crystals}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, crystals: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>None Seen</option>
                              <option>Calcium Oxalate Crystals (+)</option>
                              <option>Triple Phosphate Crystals (+)</option>
                              <option>Uric Acid Crystals (+)</option>
                              <option>Amorphous Urates</option>
                              <option>Amorphous Phosphates</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Microorganisms / Yeasts / Parasites</label>
                            <select
                              value={urinalysisData.microorganisms}
                              onChange={(e) => setUrinalysisData({ ...urinalysisData, microorganisms: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium"
                            >
                              <option>None Seen</option>
                              <option>Bacteria Present (Few +)</option>
                              <option>Bacteria Present (Heavy +++)</option>
                              <option>Candida / Yeast Cells (+ Budding)</option>
                              <option>Trichomonas vaginalis Trophozoites Seen</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section D: Urinalysis Clinical Impression */}
                      <div className="space-y-1 pt-2 border-t border-amber-200/50">
                        <label className="text-[10px] font-bold text-gray-600 uppercase">Urinalysis Clinical Impression / Summary</label>
                        <input
                          type="text"
                          value={urinalysisData.impression}
                          onChange={(e) => setUrinalysisData({ ...urinalysisData, impression: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-amber-950"
                        />
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* 2. COMPLETE FULL HAEMOGRAM (CBC) WORKSHEET */}
                  {/* ======================================================== */}
                  {activeLabTab === "haemogram" && (
                    <div className="p-5 border-2 border-rose-200/90 rounded-2xl bg-rose-50/15 space-y-5 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rose-200/70">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                            <Droplets className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                              <span>Full Haemogram (CBC, 5-Part Differential & Blood Film)</span>
                            </h4>
                            <p className="text-xs text-rose-800/80">
                              Complete hematology indices, leukocyte differential distribution, ESR and blood film morphology
                            </p>
                          </div>
                        </div>

                        {/* Quick 1-Click CBC Presets & Document Preview */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setShowHaemogramDocModal(true)}
                            className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-xs mr-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Preview Document (A4)</span>
                          </button>
                          <span className="text-[10px] font-bold text-rose-900 uppercase">Presets:</span>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("normal")}
                            className="px-2 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            ✓ Normal CBC
                          </button>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("anemia")}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Microcytic Anemia
                          </button>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("infection")}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Leukocytosis
                          </button>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("malaria_thrombocytopenia")}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Malaria + Low Plt
                          </button>
                        </div>
                      </div>

                      {/* Primary Hematology Indices */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-rose-900 uppercase tracking-wider block">
                          A. Primary Red Cell, White Cell & Platelet Counts
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Hemoglobin (Hb)</label>
                              <span className="text-[9px] text-gray-400 font-mono">12.0 - 17.5 g/dL</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.hb}
                              onChange={(e) => setHaemogramData({ ...haemogramData, hb: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold text-rose-950"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Total WBC Count</label>
                              <span className="text-[9px] text-gray-400 font-mono">4.0 - 11.0 x10^9/L</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.wbc}
                              onChange={(e) => setHaemogramData({ ...haemogramData, wbc: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold text-rose-950"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Platelet Count</label>
                              <span className="text-[9px] text-gray-400 font-mono">150 - 450 x10^9/L</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.platelets}
                              onChange={(e) => setHaemogramData({ ...haemogramData, platelets: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold text-rose-950"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">RBC Count</label>
                              <span className="text-[9px] text-gray-400 font-mono">4.50 - 5.90 x10^12/L</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.rbc}
                              onChange={(e) => setHaemogramData({ ...haemogramData, rbc: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Hematocrit (PCV / HCT)</label>
                              <span className="text-[9px] text-gray-400 font-mono">36.0 - 52.0%</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.hct}
                              onChange={(e) => setHaemogramData({ ...haemogramData, hct: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">MCV (Mean Cell Vol)</label>
                              <span className="text-[9px] text-gray-400 font-mono">80.0 - 100.0 fl</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.mcv}
                              onChange={(e) => setHaemogramData({ ...haemogramData, mcv: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">MCH / MCHC</label>
                              <span className="text-[9px] text-gray-400 font-mono">27-33 pg / 32-36 g/dL</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <input
                                type="text"
                                placeholder="MCH"
                                value={haemogramData.mch}
                                onChange={(e) => setHaemogramData({ ...haemogramData, mch: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono text-[11px]"
                              />
                              <input
                                type="text"
                                placeholder="MCHC"
                                value={haemogramData.mchc}
                                onChange={(e) => setHaemogramData({ ...haemogramData, mchc: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono text-[11px]"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">RDW-CV (Anisocytosis)</label>
                              <span className="text-[9px] text-gray-400 font-mono">11.5 - 14.5%</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.rdw}
                              onChange={(e) => setHaemogramData({ ...haemogramData, rdw: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Differential Leucocyte Count (5-Part %) */}
                      <div className="space-y-2 pt-2 border-t border-rose-200/50">
                        <label className="text-[11px] font-black text-rose-900 uppercase tracking-wider block">
                          B. 5-Part Differential Leucocyte Count (%)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Neutrophils</label>
                              <span className="text-[9px] text-gray-400">40 - 75%</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.neutrophils}
                              onChange={(e) => setHaemogramData({ ...haemogramData, neutrophils: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Lymphocytes</label>
                              <span className="text-[9px] text-gray-400">20 - 45%</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.lymphocytes}
                              onChange={(e) => setHaemogramData({ ...haemogramData, lymphocytes: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Monocytes</label>
                              <span className="text-[9px] text-gray-400">2 - 10%</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.monocytes}
                              onChange={(e) => setHaemogramData({ ...haemogramData, monocytes: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Eosinophils</label>
                              <span className="text-[9px] text-gray-400">1 - 6%</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.eosinophils}
                              onChange={(e) => setHaemogramData({ ...haemogramData, eosinophils: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-gray-600">Basophils</label>
                              <span className="text-[9px] text-gray-400">0 - 2%</span>
                            </div>
                            <input
                              type="text"
                              value={haemogramData.basophils}
                              onChange={(e) => setHaemogramData({ ...haemogramData, basophils: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Special Parasitology & Peripheral Blood Film (PBF) */}
                      <div className="space-y-3 pt-2 border-t border-rose-200/50">
                        <label className="text-[11px] font-black text-rose-900 uppercase tracking-wider block">
                          C. ESR, Malaria Parasites (MPS) & Peripheral Blood Film
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">ESR (Westergren mm/1hr)</label>
                            <input
                              type="text"
                              value={haemogramData.esr}
                              onChange={(e) => setHaemogramData({ ...haemogramData, esr: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Malaria Parasites (Giemsa Film / RDT)</label>
                            <select
                              value={haemogramData.malaria}
                              onChange={(e) => setHaemogramData({ ...haemogramData, malaria: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-bold text-slate-800"
                            >
                              <option>Negative</option>
                              <option>Positive (Plasmodium Falciparum Ring Forms +)</option>
                              <option>Positive (Plasmodium Falciparum Ring Forms ++ / High Density)</option>
                              <option>Positive (Plasmodium Vivax)</option>
                              <option>Borderline / Repeat Advised</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Peripheral Blood Film (PBF) Morphology</label>
                          <textarea
                            rows={2}
                            value={haemogramData.pbf}
                            onChange={(e) => setHaemogramData({ ...haemogramData, pbf: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* 3. BLOOD GROUPING & IMMUNOHEMATOLOGY */}
                  {/* ======================================================== */}
                  {activeLabTab === "blood_group" && (
                    <div className="p-5 border-2 border-indigo-200/90 rounded-2xl bg-indigo-50/15 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                              <span>Immunohematology: ABO & Rh Blood Group Verification</span>
                            </h4>
                            <p className="text-xs text-indigo-800/80">
                              Confirm and permanently update exact ABO/Rh blood type in patient EHR
                            </p>
                          </div>
                        </div>

                        {isPatientBloodUnconfirmed ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-xl text-amber-950 text-[10px] font-bold animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                            <span>Unconfirmed at Registration</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 text-[10px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>EHR Verified: {matchedPatient?.bloodType}</span>
                          </div>
                        )}
                      </div>

                      {/* Forward & Reverse Grouping */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">
                            ABO Forward Grouping
                          </label>
                          <select
                            value={aboGroup}
                            onChange={(e) => handleAboChange(e.target.value as any)}
                            className="w-full px-2.5 py-2 border border-indigo-200 rounded-xl text-xs bg-white font-bold text-slate-800"
                          >
                            <option value="O">Group O (No Agglutination)</option>
                            <option value="A">Group A (Anti-A Agglutination)</option>
                            <option value="B">Group B (Anti-B Agglutination)</option>
                            <option value="AB">Group AB (Anti-A & Anti-B)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">
                            Rh(D) Antigen Testing
                          </label>
                          <select
                            value={rhFactor}
                            onChange={(e) => handleRhChange(e.target.value as any)}
                            className="w-full px-2.5 py-2 border border-indigo-200 rounded-xl text-xs bg-white font-bold text-slate-800"
                          >
                            <option value="+">Rh Positive (+ve / D-Antigen Present)</option>
                            <option value="-">Rh Negative (-ve / D-Antigen Absent)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">
                            Crossmatch Screen
                          </label>
                          <select
                            value={crossmatchStatus}
                            onChange={(e) => setCrossmatchStatus(e.target.value)}
                            className="w-full px-2.5 py-2 border border-indigo-200 rounded-xl text-xs bg-white font-semibold text-slate-800"
                          >
                            <option value="Compatible (No Agglutination)">Compatible (No Agglutination)</option>
                            <option value="Crossmatch Not Requested / Routine Grouping">Not Requested / Routine Typing</option>
                            <option value="Antibody Screen Positive">Antibody Screen (+ve) Coombs Req.</option>
                          </select>
                        </div>
                      </div>

                      {/* Exact Blood Type Selector Grid */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">
                            Select Resulting Blood Group:
                          </label>
                          <span className="text-[11px] font-bold text-indigo-700">
                            Selected Finding: <strong className="text-sm font-black text-indigo-900 bg-white px-2 py-0.5 rounded-lg border border-indigo-300">{exactBloodType}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                          {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => handlePillSelect(b)}
                              className={`py-2 px-2 rounded-xl text-xs font-black text-center transition-all cursor-pointer border ${
                                exactBloodType === b
                                  ? "bg-indigo-600 text-white border-indigo-700 shadow-sm scale-105"
                                  : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                              }`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sync Controls */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-indigo-100 bg-white/70 p-3 rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={updateMasterRecord}
                            onChange={(e) => setUpdateMasterRecord(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span>Automatically update patient's permanent EHR & active encounter with verified blood group</span>
                        </label>

                        {matchedPatient && (
                          <button
                            type="button"
                            onClick={handleDirectUpdateBloodType}
                            disabled={immediateUpdating || exactBloodType === "Not Sure"}
                            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{immediateUpdating ? "Committing..." : `Commit [${exactBloodType}] to EHR Now`}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* 4. BIOCHEMISTRY & ORGAN FUNCTION */}
                  {/* ======================================================== */}
                  {activeLabTab === "biochem" && (
                    <div className="p-5 border-2 border-emerald-200/90 rounded-2xl bg-emerald-50/15 space-y-4 shadow-xs">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-emerald-200/70">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">Clinical Biochemistry & Organ Panels</h4>
                          <p className="text-xs text-emerald-800/80">Renal (U&Es), Liver Function (LFTs), Glycemia and Electrolytes</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Random Blood Sugar (RBS)</label>
                          <input
                            type="text"
                            placeholder="mmol/L (4.4 - 7.8)"
                            value={biochemData.rbs}
                            onChange={(e) => setBiochemData({ ...biochemData, rbs: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Serum Creatinine (umol/L)</label>
                          <input
                            type="text"
                            placeholder="60 - 110 umol/L"
                            value={biochemData.creatinine}
                            onChange={(e) => setBiochemData({ ...biochemData, creatinine: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">BUN / Blood Urea (mmol/L)</label>
                          <input
                            type="text"
                            placeholder="2.5 - 7.1 mmol/L"
                            value={biochemData.urea}
                            onChange={(e) => setBiochemData({ ...biochemData, urea: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Electrolytes (Na+ / K+)</label>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="text"
                              placeholder="Na+ (140)"
                              value={biochemData.sodium}
                              onChange={(e) => setBiochemData({ ...biochemData, sodium: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono text-[11px]"
                            />
                            <input
                              type="text"
                              placeholder="K+ (4.2)"
                              value={biochemData.potassium}
                              onChange={(e) => setBiochemData({ ...biochemData, potassium: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono text-[11px]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">ALT / SGPT (U/L)</label>
                          <input
                            type="text"
                            placeholder="0 - 45 U/L"
                            value={biochemData.alt}
                            onChange={(e) => setBiochemData({ ...biochemData, alt: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">AST / SGOT (U/L)</label>
                          <input
                            type="text"
                            placeholder="0 - 40 U/L"
                            value={biochemData.ast}
                            onChange={(e) => setBiochemData({ ...biochemData, ast: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Total Bilirubin (umol/L)</label>
                          <input
                            type="text"
                            placeholder="3 - 21 umol/L"
                            value={biochemData.totalBilirubin}
                            onChange={(e) => setBiochemData({ ...biochemData, totalBilirubin: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Fasting Blood Sugar / HbA1c</label>
                          <input
                            type="text"
                            placeholder="e.g. FBS: 5.2, HbA1c: 5.4%"
                            value={biochemData.fbs}
                            onChange={(e) => setBiochemData({ ...biochemData, fbs: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* 5. STOOL, SEROLOGY & RAPID TESTS */}
                  {/* ======================================================== */}
                  {activeLabTab === "serology" && (
                    <div className="p-5 border-2 border-purple-200/90 rounded-2xl bg-purple-50/15 space-y-4 shadow-xs">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-purple-200/70">
                        <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                          <FlaskRound className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-purple-950">Serology, Rapid Immunoassays & Parasitology</h4>
                          <p className="text-xs text-purple-800/80">Stool examination, Typhoid Widal, H. Pylori, Syphilis and Pregnancy Test</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Stool Macroscopy</label>
                          <input
                            type="text"
                            value={serologyData.stoolMacroscopy}
                            onChange={(e) => setSerologyData({ ...serologyData, stoolMacroscopy: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Stool Microscopy (Ova, Cysts & Trophozoites)</label>
                          <input
                            type="text"
                            value={serologyData.stoolMicroscopy}
                            onChange={(e) => setSerologyData({ ...serologyData, stoolMicroscopy: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Typhoid Widal Reaction (O & H)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="O Titre (e.g. <1:80)"
                              value={serologyData.widalO}
                              onChange={(e) => setSerologyData({ ...serologyData, widalO: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-mono"
                            />
                            <input
                              type="text"
                              placeholder="H Titre (e.g. <1:80)"
                              value={serologyData.widalH}
                              onChange={(e) => setSerologyData({ ...serologyData, widalH: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">H. Pylori Stool Antigen</label>
                          <select
                            value={serologyData.hPyloriAg}
                            onChange={(e) => setSerologyData({ ...serologyData, hPyloriAg: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-semibold"
                          >
                            <option>Negative</option>
                            <option>Positive (+)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Urine Pregnancy Test (hCG)</label>
                          <select
                            value={serologyData.pregnancyHcg}
                            onChange={(e) => setSerologyData({ ...serologyData, pregnancyHcg: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-semibold"
                          >
                            <option>Negative</option>
                            <option>Positive (+)</option>
                            <option>Not Indicated / Male Patient</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">VDRL / Syphilis Rapid</label>
                          <select
                            value={serologyData.vdrlSyphilis}
                            onChange={(e) => setSerologyData({ ...serologyData, vdrlSyphilis: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-semibold"
                          >
                            <option>Non-Reactive</option>
                            <option>Reactive (+)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* 6. DYNAMIC "ANY KIND OF TEST" CUSTOM CREATOR */}
                  {/* ======================================================== */}
                  {activeLabTab === "custom" && (
                    <div className="p-5 border-2 border-slate-300 rounded-2xl bg-slate-50/50 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Custom / Dynamic Diagnostic Test Creator</h4>
                            <p className="text-xs text-slate-500">
                              Add any laboratory test required (e.g. Thyroid TSH, PSA, D-Dimer, Troponin, HVS Swab, Semen Analysis)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Presets for Custom Tests */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Quick Add:</span>
                        {[
                          { name: "Thyroid Profile", param: "TSH", val: "2.1", unit: "uIU/mL", ref: "0.27 - 4.20" },
                          { name: "Cardiac Troponin", param: "Troponin I", val: "< 0.01", unit: "ng/mL", ref: "< 0.04" },
                          { name: "Inflammatory Screen", param: "C-Reactive Protein (CRP)", val: "3.2", unit: "mg/L", ref: "< 6.0" },
                          { name: "Serum Uric Acid", param: "Uric Acid", val: "320", unit: "umol/L", ref: "200 - 420" },
                          { name: "High Vaginal Swab (HVS)", param: "Wet Mount / Gram Stain", val: "Normal Flora, No Clue Cells", unit: "", ref: "Normal" }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCustomTests([
                                ...customTests,
                                {
                                  id: `cust-${Date.now()}-${idx}`,
                                  testName: preset.name,
                                  parameter: preset.param,
                                  result: preset.val,
                                  unit: preset.unit,
                                  referenceRange: preset.ref,
                                  flag: "NORMAL"
                                }
                              ]);
                              toast.success(`Added ${preset.name} (${preset.param}) to worksheet`);
                            }}
                            className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            + {preset.param}
                          </button>
                        ))}
                      </div>

                      {/* Input Row for New Custom Test */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs">
                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">Test / Panel Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Thyroid Panel"
                            value={newCustomTest.testName}
                            onChange={(e) => setNewCustomTest({ ...newCustomTest, testName: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">Parameter / Analyte</label>
                          <input
                            type="text"
                            placeholder="e.g. Free T4"
                            value={newCustomTest.parameter}
                            onChange={(e) => setNewCustomTest({ ...newCustomTest, parameter: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">Result Value</label>
                          <input
                            type="text"
                            placeholder="e.g. 14.5"
                            value={newCustomTest.result}
                            onChange={(e) => setNewCustomTest({ ...newCustomTest, result: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">Units & Ref Range</label>
                          <input
                            type="text"
                            placeholder="pmol/L (12 - 22)"
                            value={newCustomTest.referenceRange}
                            onChange={(e) => setNewCustomTest({ ...newCustomTest, referenceRange: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-end">
                          <button
                            type="button"
                            onClick={handleAddCustomTest}
                            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            + Add Row
                          </button>
                        </div>
                      </div>

                      {/* Render Custom Test Rows */}
                      {customTests.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Active Custom Test Parameters ({customTests.length})</p>
                          <div className="space-y-1.5">
                            {customTests.map((ct) => (
                              <div key={ct.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs">
                                <div>
                                  <span className="font-bold text-slate-900 uppercase text-[9px] bg-slate-100 px-1.5 py-0.5 rounded mr-2">
                                    {ct.testName}
                                  </span>
                                  <span className="font-bold text-slate-800">{ct.parameter}:</span>
                                  <span className="ml-1.5 font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    {ct.result} {ct.unit}
                                  </span>
                                  {ct.referenceRange && (
                                    <span className="ml-2 text-[10px] text-gray-400 font-mono">(Ref: {ct.referenceRange})</span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomTest(ct.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                  title="Delete test row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* RADIOLOGY DICOM / PACS WORK SHEET */
                <div className="p-4 border border-purple-100 rounded-xl bg-purple-50/5 space-y-4">
                  <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-purple-500" />
                    <span>Radiology DICOM / PACS Imaging Report Metadata</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">PACS Image Text / Diagnosis finding</label>
                    <textarea
                      id="input-rad-findings"
                      rows={3}
                      value={radiologyFinding}
                      onChange={(e) => setRadiologyFinding(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* General Tech Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Lab Technician Summary & Clinical Comments</label>
                <textarea
                  id="input-tech-remarks"
                  rows={2}
                  placeholder="Enter any additional technician remarks, calibration notes or sample condition remarks..."
                  value={testResults}
                  onChange={(e) => setTestResults(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Transmit Action Button */}
              <button
                id="btn-transmit-results"
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-700/20"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting
                    ? "Transmitting Laboratory Report to Doctor Review Queue..."
                    : `⚡ Transmit Urinalysis, Haemogram & Diagnostic Results to Doctor Station`}
                </span>
              </button>
            </form>
          ) : (
            <div className="h-full min-h-[420px] border border-dashed border-gray-200 bg-gray-50/30 rounded-2xl flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-3">
              <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl border border-blue-100">
                <FlaskConical className="w-10 h-10 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Laboratory Counter Ready</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  Select a cued patient ticket from the queue on the left to open their comprehensive Urinalysis, Full Haemogram and Diagnostic Testing worksheets.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Official Full Haemogram Document Modal */}
      {showHaemogramDocModal && (
        <HaemogramDocument
          mode="modal"
          isOpen={showHaemogramDocModal}
          onClose={() => setShowHaemogramDocModal(false)}
          data={{ ...haemogramData, bloodGroup: exactBloodType, crossmatchStatus }}
          patientMeta={{
            name: matchedPatient?.patientName || selectedTicket?.patientName || "Walk-in Patient",
            age: matchedPatient?.age || 30,
            gender: matchedPatient?.gender || "Adult",
            patientNo: matchedPatient?.nationalId || matchedPatient?.patientNumber || selectedTicket?.ticketNo || "LAB-OPD-99",
            facilityName: "TASSIAHILL HOSPITAL Diagnostic & Laboratory Center",
            doctor: "Attending Medical Officer",
            date: new Date().toISOString().replace("T", " ").substring(0, 16)
          }}
        />
      )}
    </div>
  );
}

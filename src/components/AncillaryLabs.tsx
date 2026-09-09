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
  Filter,
  Microscope,
  BookOpen
} from "lucide-react";
import { toast } from "../lib/promptService";
import HaemogramDocument from "./HaemogramDocument";
import { getReferenceRange, determineAgeCohort, evaluateFlag, PbfMorphologyDetails } from "../lib/haemogramParser";
import {
  LAB_DISCIPLINES,
  LabDiscipline,
  LabTestItem,
  getAllLabTests,
  findDisciplineByTestName
} from "../data/labTestDirectory";
import { LabDisciplineWorksheet } from "./LabDisciplineWorksheet";
import { LabDirectoryModal } from "./LabDirectoryModal";

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

  // Active Lab Worksheet Sub-tab (supports all 9 core international disciplines + specialized worksheets)
  const [activeLabTab, setActiveLabTab] = useState<string>("hematology_coagulation");
  const [showHaemogramDocModal, setShowHaemogramDocModal] = useState(false);
  const [disciplineResults, setDisciplineResults] = useState<Record<string, string>>({});
  const [disciplineRemarks, setDisciplineRemarks] = useState<Record<string, string>>({});
  const [isLabDirModalOpen, setIsLabDirModalOpen] = useState(false);

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
    // Patient demographic overrides for dynamic age/gender reference calibration
    customAge: "",
    customGender: "",
    // 1. Red Blood Cell (RBC) & Hemoglobin Parameters (13 items)
    hb: "13.8",
    rbc: "4.85",
    hct: "41.5",
    mcv: "85.6",
    mch: "28.5",
    mchc: "33.3",
    rdw: "12.8",
    rdw_sd: "42.5",
    retic_pct: "1.2",
    retic_abs: "58.2",
    irf: "6.5",
    nrbc_pct: "0.0",
    nrbc_abs: "0.00",
    // 2. White Blood Cell (WBC) Parameters & 5-Part Differential + Absolutes + Advanced (15 items)
    wbc: "7.4",
    neutrophils: "58",
    neut_abs: "4.29",
    lymphocytes: "32",
    lymph_abs: "2.37",
    monocytes: "6",
    mono_abs: "0.44",
    eosinophils: "3",
    eos_abs: "0.22",
    basophils: "1",
    baso_abs: "0.07",
    ig_pct: "0.2",
    ig_abs: "0.01",
    bands: "1",
    bands_abs: "0.07",
    // 3. Platelet (PLT) Parameters (6 items)
    platelets: "260",
    mpv: "9.4",
    pdw: "12.8",
    pct: "0.244",
    p_lcr: "26.5",
    p_lcc: "68.9",
    // 4. Systemic Inflammation & Microscopic Morphology Review
    esr: "10",
    malaria: "Negative",
    pbf: "Normocytic normochromic red blood cells. Normal leucocyte count and distribution. Adequate platelets on film with normal morphology.",
    // Structured Peripheral Smear (PBF) details
    anisocytosis: "None" as "None" | "Mild (+)" | "Moderate (++)" | "Marked (+++)",
    poikilocytosis: "None" as "None" | "Mild (+)" | "Moderate (++)" | "Marked (+++)",
    hypochromia: false,
    polychromasia: false,
    targetCells: false,
    sickleCells: false,
    spherocytes: false,
    schistocytes: false,
    rouleaux: false,
    toxicGranulation: "Absent" as "Absent" | "Mild (+)" | "Moderate (++)" | "Severe (+++)",
    vacuolation: false,
    reactiveLymphocytes: false,
    leftShift: false,
    plateletClumping: false,
    giantPlatelets: false,
    adequateSmear: true
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

    // Detect doctor-ordered tests and intelligently pre-select active tab among the 9 disciplines
    const requested = (t.requestedTests || t.labTestsOrdered || []).join(" ").toLowerCase() + " " + (t.notes || "").toLowerCase() + " " + (t.service || "").toLowerCase();
    
    if (requested.includes("cardiac") || requested.includes("troponin") || requested.includes("ck-mb") || requested.includes("bmp") || requested.includes("cmp") || requested.includes("lipid") || requested.includes("lft") || requested.includes("renal") || requested.includes("u&e") || requested.includes("glucose")) {
      setActiveLabTab("clinical_chemistry");
    } else if (requested.includes("thyroid") || requested.includes("tsh") || requested.includes("hormone") || requested.includes("fertility") || requested.includes("fsh") || requested.includes("prolactin") || requested.includes("cortisol") || requested.includes("testosterone") || requested.includes("amh")) {
      setActiveLabTab("endocrinology");
    } else if (requested.includes("hiv") || requested.includes("hepatitis") || requested.includes("syphilis") || requested.includes("torch") || requested.includes("ana") || requested.includes("crp") || requested.includes("esr") || requested.includes("rf") || requested.includes("autoimmune") || requested.includes("vdrl")) {
      setActiveLabTab("immunology_serology");
    } else if (requested.includes("culture") || requested.includes("mcs") || requested.includes("blood culture") || requested.includes("sputum") || requested.includes("wound") || requested.includes("tb") || requested.includes("afb") || requested.includes("gram") || requested.includes("stool")) {
      setActiveLabTab("microbiology_culture");
    } else if (requested.includes("pcr") || requested.includes("covid") || requested.includes("viral load") || requested.includes("hpv") || requested.includes("brca") || requested.includes("dna") || requested.includes("genetic")) {
      setActiveLabTab("molecular_genetics");
    } else if (requested.includes("toxicology") || requested.includes("drug") || requested.includes("substance") || requested.includes("doa") || requested.includes("tdm") || requested.includes("digoxin") || requested.includes("lithium") || requested.includes("valproat") || requested.includes("vancomycin")) {
      setActiveLabTab("toxicology_tdm");
    } else if (requested.includes("csf") || requested.includes("synovial") || requested.includes("pleural") || requested.includes("fluid") || requested.includes("urinalysis") || requested.includes("urine")) {
      setActiveLabTab("urinalysis_fluids");
    } else if (requested.includes("tumor") || requested.includes("psa") || requested.includes("ca-125") || requested.includes("cea") || requested.includes("ca 19-9") || requested.includes("afp") || requested.includes("pap") || requested.includes("biopsy") || requested.includes("histology")) {
      setActiveLabTab("tumor_markers_cytology");
    } else if (requested.includes("haemogram") || requested.includes("cbc") || requested.includes("coagulation") || requested.includes("pt") || requested.includes("inr") || requested.includes("aptt") || requested.includes("d-dimer")) {
      setActiveLabTab("hematology_coagulation");
    } else if (requested.includes("group") || requested.includes("rh") || requested.includes("crossmatch")) {
      setActiveLabTab("blood_group");
    } else {
      setActiveLabTab("hematology_coagulation");
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

  // Quick preset templates for Full Haemogram with age/gender calibrated profiles
  const applyHaemogramPreset = (preset: "normal" | "pediatric" | "anemia" | "infection" | "malaria_thrombocytopenia" | "sickle_cell") => {
    if (preset === "normal") {
      setHaemogramData(prev => ({
        ...prev,
        hb: "14.2",
        wbc: "6.8",
        platelets: "275",
        rbc: "4.90",
        hct: "42.0",
        mcv: "85.7",
        mch: "29.0",
        mchc: "33.8",
        rdw: "12.5",
        rdw_sd: "41.8",
        retic_pct: "1.1",
        retic_abs: "53.9",
        irf: "5.8",
        nrbc_pct: "0.0",
        nrbc_abs: "0.00",
        neutrophils: "60",
        neut_abs: "4.08",
        lymphocytes: "30",
        lymph_abs: "2.04",
        monocytes: "6",
        mono_abs: "0.41",
        eosinophils: "3",
        eos_abs: "0.20",
        basophils: "1",
        baso_abs: "0.07",
        ig_pct: "0.2",
        ig_abs: "0.01",
        bands: "1",
        bands_abs: "0.07",
        mpv: "9.2",
        pdw: "12.4",
        pct: "0.253",
        p_lcr: "24.5",
        p_lcc: "67.4",
        esr: "8",
        malaria: "Negative",
        pbf: "Normocytic normochromic red blood cells. Normal white cell count & mature morphology. Platelets adequate on film.",
        anisocytosis: "None",
        poikilocytosis: "None",
        hypochromia: false,
        polychromasia: false,
        targetCells: false,
        sickleCells: false,
        spherocytes: false,
        schistocytes: false,
        rouleaux: false,
        toxicGranulation: "Absent",
        vacuolation: false,
        reactiveLymphocytes: false,
        leftShift: false,
        plateletClumping: false,
        giantPlatelets: false,
        adequateSmear: true
      }));
      toast.success("Applied Normal Full Haemogram Profile");
    } else if (preset === "pediatric") {
      setHaemogramData(prev => ({
        ...prev,
        customAge: "3",
        hb: "12.2",
        wbc: "9.5",
        platelets: "320",
        rbc: "4.45",
        hct: "36.8",
        mcv: "82.7",
        mch: "27.4",
        mchc: "33.2",
        rdw: "13.0",
        rdw_sd: "40.5",
        retic_pct: "1.4",
        retic_abs: "62.3",
        irf: "7.2",
        nrbc_pct: "0.0",
        nrbc_abs: "0.00",
        neutrophils: "42",
        neut_abs: "3.99",
        lymphocytes: "48", // physiologic relative lymphocytosis in pediatric cohort
        lymph_abs: "4.56",
        monocytes: "6",
        mono_abs: "0.57",
        eosinophils: "3",
        eos_abs: "0.29",
        basophils: "1",
        baso_abs: "0.10",
        ig_pct: "0.1",
        ig_abs: "0.01",
        bands: "0",
        bands_abs: "0.00",
        mpv: "9.0",
        pdw: "11.8",
        pct: "0.288",
        p_lcr: "22.0",
        p_lcc: "70.4",
        esr: "6",
        malaria: "Negative",
        pbf: "Normal pediatric blood film. Predominance of small mature lymphocytes consistent with age. Normal platelets and red cells.",
        anisocytosis: "None",
        poikilocytosis: "None",
        hypochromia: false,
        polychromasia: false,
        targetCells: false,
        sickleCells: false,
        spherocytes: false,
        schistocytes: false,
        rouleaux: false,
        toxicGranulation: "Absent",
        vacuolation: false,
        reactiveLymphocytes: false,
        leftShift: false,
        plateletClumping: false,
        giantPlatelets: false,
        adequateSmear: true
      }));
      toast.success("Applied Pediatric/Infant Cohort Preset (Age: 3y, Lymphocyte Predominance)");
    } else if (preset === "anemia") {
      setHaemogramData(prev => ({
        ...prev,
        hb: "8.2",
        wbc: "6.2",
        platelets: "390",
        rbc: "3.35",
        hct: "26.0",
        mcv: "77.6",
        mch: "24.5",
        mchc: "31.5",
        rdw: "18.8",
        rdw_sd: "56.2",
        retic_pct: "0.8",
        retic_abs: "26.8",
        irf: "4.2",
        nrbc_pct: "0.0",
        nrbc_abs: "0.00",
        neutrophils: "56",
        neut_abs: "3.47",
        lymphocytes: "34",
        lymph_abs: "2.11",
        monocytes: "7",
        mono_abs: "0.43",
        eosinophils: "2",
        eos_abs: "0.12",
        basophils: "1",
        baso_abs: "0.06",
        ig_pct: "0.1",
        ig_abs: "0.01",
        bands: "1",
        bands_abs: "0.06",
        mpv: "8.8",
        pdw: "13.2",
        pct: "0.343",
        p_lcr: "21.0",
        p_lcc: "81.9",
        esr: "28",
        malaria: "Negative",
        pbf: "Microcytic hypochromic red blood cells with marked anisopoikilocytosis, pencil cells and target cells. Classical Iron Deficiency Anemia pattern.",
        anisocytosis: "Marked (+++)",
        poikilocytosis: "Moderate (++)",
        hypochromia: true,
        polychromasia: false,
        targetCells: true,
        sickleCells: false,
        spherocytes: false,
        schistocytes: false,
        rouleaux: false,
        toxicGranulation: "Absent",
        vacuolation: false,
        reactiveLymphocytes: false,
        leftShift: false,
        plateletClumping: false,
        giantPlatelets: false,
        adequateSmear: true
      }));
      toast.success("Applied Microcytic Hypochromic Anemia Preset");
    } else if (preset === "infection") {
      setHaemogramData(prev => ({
        ...prev,
        hb: "12.8",
        wbc: "18.6",
        platelets: "410",
        rbc: "4.40",
        hct: "38.5",
        mcv: "87.5",
        mch: "29.1",
        mchc: "33.2",
        rdw: "13.8",
        rdw_sd: "45.0",
        retic_pct: "1.6",
        retic_abs: "70.4",
        irf: "12.5",
        nrbc_pct: "0.5",
        nrbc_abs: "0.09",
        neutrophils: "84",
        neut_abs: "15.62",
        lymphocytes: "9",
        lymph_abs: "1.67",
        monocytes: "4",
        mono_abs: "0.74",
        eosinophils: "1",
        eos_abs: "0.19",
        basophils: "1",
        baso_abs: "0.19",
        ig_pct: "1.8",
        ig_abs: "0.33",
        bands: "8",
        bands_abs: "1.49",
        mpv: "10.4",
        pdw: "14.6",
        pct: "0.426",
        p_lcr: "32.0",
        p_lcc: "131.2",
        esr: "65",
        malaria: "Negative",
        pbf: "Marked neutrophilic leukocytosis with significant left shift (band forms & metamyelocytes), toxic granulation and cytoplasmic vacuolation. Severe bacterial sepsis / acute inflammatory response.",
        anisocytosis: "None",
        poikilocytosis: "None",
        hypochromia: false,
        polychromasia: true,
        targetCells: false,
        sickleCells: false,
        spherocytes: false,
        schistocytes: false,
        rouleaux: true,
        toxicGranulation: "Severe (+++)",
        vacuolation: true,
        reactiveLymphocytes: false,
        leftShift: true,
        plateletClumping: false,
        giantPlatelets: true,
        adequateSmear: true
      }));
      toast.success("Applied Acute Sepsis / Leukocytosis with Bandemia & Left Shift Preset");
    } else if (preset === "malaria_thrombocytopenia") {
      setHaemogramData(prev => ({
        ...prev,
        hb: "9.8",
        wbc: "4.1",
        platelets: "52",
        rbc: "3.50",
        hct: "29.5",
        mcv: "84.3",
        mch: "28.0",
        mchc: "33.2",
        rdw: "15.2",
        rdw_sd: "48.2",
        retic_pct: "2.8",
        retic_abs: "98.0",
        irf: "14.0",
        nrbc_pct: "0.2",
        nrbc_abs: "0.01",
        neutrophils: "52",
        neut_abs: "2.13",
        lymphocytes: "38",
        lymph_abs: "1.56",
        monocytes: "8",
        mono_abs: "0.33",
        eosinophils: "1",
        eos_abs: "0.04",
        basophils: "1",
        baso_abs: "0.04",
        ig_pct: "0.4",
        ig_abs: "0.02",
        bands: "2",
        bands_abs: "0.08",
        mpv: "11.2",
        pdw: "16.8",
        pct: "0.058",
        p_lcr: "38.5",
        p_lcc: "20.0",
        esr: "46",
        malaria: "Positive (Plasmodium Falciparum Ring Forms ++ / High Density)",
        pbf: "Intracellular ring-form trophozoites of Plasmodium falciparum observed in red cells. Severe thrombocytopenia with giant platelets noted on Wright-Giemsa film.",
        anisocytosis: "Mild (+)",
        poikilocytosis: "Mild (+)",
        hypochromia: false,
        polychromasia: true,
        targetCells: false,
        sickleCells: false,
        spherocytes: false,
        schistocytes: true,
        rouleaux: false,
        toxicGranulation: "Mild (+)",
        vacuolation: false,
        reactiveLymphocytes: true,
        leftShift: false,
        plateletClumping: false,
        giantPlatelets: true,
        adequateSmear: false
      }));
      toast.success("Applied Malaria + Severe Thrombocytopenia Preset");
    } else if (preset === "sickle_cell") {
      setHaemogramData(prev => ({
        ...prev,
        hb: "7.4",
        wbc: "15.2",
        platelets: "480",
        rbc: "2.65",
        hct: "22.8",
        mcv: "86.0",
        mch: "27.9",
        mchc: "32.5",
        rdw: "21.5",
        rdw_sd: "68.0",
        retic_pct: "9.8",
        retic_abs: "259.7",
        irf: "24.5",
        nrbc_pct: "5.0",
        nrbc_abs: "0.76",
        neutrophils: "72",
        neut_abs: "10.94",
        lymphocytes: "20",
        lymph_abs: "3.04",
        monocytes: "6",
        mono_abs: "0.91",
        eosinophils: "1",
        eos_abs: "0.15",
        basophils: "1",
        baso_abs: "0.15",
        ig_pct: "1.2",
        ig_abs: "0.18",
        bands: "3",
        bands_abs: "0.46",
        mpv: "9.6",
        pdw: "13.5",
        pct: "0.461",
        p_lcr: "28.0",
        p_lcc: "134.4",
        esr: "12",
        malaria: "Negative",
        pbf: "Irreversible sickle cells (drepanocytes), target cells, polychromasia, and frequent nucleated RBCs seen. Features typical of homozygous Sickle Cell Disease (HbSS) in acute vaso-occlusive crisis.",
        anisocytosis: "Marked (+++)",
        poikilocytosis: "Marked (+++)",
        hypochromia: false,
        polychromasia: true,
        targetCells: true,
        sickleCells: true,
        spherocytes: false,
        schistocytes: true,
        rouleaux: false,
        toxicGranulation: "Mild (+)",
        vacuolation: false,
        reactiveLymphocytes: false,
        leftShift: true,
        plateletClumping: false,
        giantPlatelets: true,
        adequateSmear: true
      }));
      toast.success("Applied Sickle Cell Disease Crisis Preset");
    }
  };

  // Clinical calculation utility for derived red cell and leukocyte indices
  const handleAutoCalculateHematologyIndices = () => {
    const rbc = parseFloat(haemogramData.rbc) || 4.85;
    const hb = parseFloat(haemogramData.hb) || 13.8;
    const hct = parseFloat(haemogramData.hct) || 41.5;
    const wbc = parseFloat(haemogramData.wbc) || 7.4;
    const plt = parseFloat(haemogramData.platelets) || 260;
    const mpv = parseFloat(haemogramData.mpv) || 9.4;
    const plcr = parseFloat(haemogramData.p_lcr) || 26.5;
    const neutP = parseFloat(haemogramData.neutrophils) || 58;
    const lymphP = parseFloat(haemogramData.lymphocytes) || 32;
    const monoP = parseFloat(haemogramData.monocytes) || 6;
    const eosP = parseFloat(haemogramData.eosinophils) || 3;
    const basoP = parseFloat(haemogramData.basophils) || 1;
    const igP = parseFloat(haemogramData.ig_pct) || 0.2;
    const bandsP = parseFloat(haemogramData.bands) || 1;
    const reticP = parseFloat(haemogramData.retic_pct) || 1.2;
    const nrbcP = parseFloat(haemogramData.nrbc_pct) || 0.0;

    // Standard clinical formulas
    const mcv = ((hct * 10) / rbc).toFixed(1);
    const mch = ((hb * 10) / rbc).toFixed(1);
    const mchc = ((hb * 100) / hct).toFixed(1);
    const neutAbs = ((wbc * neutP) / 100).toFixed(2);
    const lymphAbs = ((wbc * lymphP) / 100).toFixed(2);
    const monoAbs = ((wbc * monoP) / 100).toFixed(2);
    const eosAbs = ((wbc * eosP) / 100).toFixed(2);
    const basoAbs = ((wbc * basoP) / 100).toFixed(2);
    const igAbs = ((wbc * igP) / 100).toFixed(2);
    const bandsAbs = ((wbc * bandsP) / 100).toFixed(2);
    const pct = ((plt * mpv) / 10000).toFixed(3);
    const plcc = ((plt * plcr) / 100).toFixed(1);
    const reticAbs = (rbc * reticP * 10).toFixed(1);
    const nrbcAbs = ((wbc * nrbcP) / 100).toFixed(2);

    setHaemogramData(prev => ({
      ...prev,
      mcv,
      mch,
      mchc,
      neut_abs: neutAbs,
      lymph_abs: lymphAbs,
      mono_abs: monoAbs,
      eos_abs: eosAbs,
      baso_abs: basoAbs,
      ig_abs: igAbs,
      bands_abs: bandsAbs,
      pct,
      p_lcc: plcc,
      retic_abs: reticAbs,
      nrbc_abs: nrbcAbs
    }));
    toast.success("Recalculated MCV, MCH, MCHC, Absolute Differentials, Retic # and Platelet Indices!");
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

    // 2. Comprehensive Full Haemogram Report
    const effectivePatientAge = haemogramData.customAge || matchedPatient?.age || selectedTicket?.age || 30;
    const effectivePatientGender = haemogramData.customGender || matchedPatient?.gender || selectedTicket?.gender || "Male";
    const { label: activeCohortLabel } = determineAgeCohort(effectivePatientAge, effectivePatientGender);

    const cbcText = [
      `=== COMPREHENSIVE FULL HAEMOGRAM (CBC / FBC & 5-PART DIFFERENTIAL) ===`,
      `• Patient Biological Stratification: Age: ${effectivePatientAge}y, Gender: ${effectivePatientGender} [Cohort: ${activeCohortLabel}]`,
      `• 1. Red Cell Parameters: Hb: ${haemogramData.hb} g/dL, RBC: ${haemogramData.rbc} x10^12/L, HCT: ${haemogramData.hct}%, MCV: ${haemogramData.mcv} fL, MCH: ${haemogramData.mch} pg, MCHC: ${haemogramData.mchc} g/dL, RDW-CV: ${haemogramData.rdw}%, RDW-SD: ${haemogramData.rdw_sd} fL`,
      `• Reticulocytes: Retic %: ${haemogramData.retic_pct}%, Retic #: ${haemogramData.retic_abs} x10^9/L, IRF: ${haemogramData.irf}%, NRBC %: ${haemogramData.nrbc_pct}%, NRBC #: ${haemogramData.nrbc_abs} x10^9/L`,
      `• 2. White Cell & 5-Part Differential: Total WBC: ${haemogramData.wbc} x10^9/L`,
      `  - Neutrophils: ${haemogramData.neutrophils}% (ANC: ${haemogramData.neut_abs} x10^9/L) | Lymphocytes: ${haemogramData.lymphocytes}% (ALC: ${haemogramData.lymph_abs} x10^9/L)`,
      `  - Monocytes: ${haemogramData.monocytes}% (AMC: ${haemogramData.mono_abs} x10^9/L) | Eosinophils: ${haemogramData.eosinophils}% (AEC: ${haemogramData.eos_abs} x10^9/L) | Basophils: ${haemogramData.basophils}% (ABC: ${haemogramData.baso_abs} x10^9/L)`,
      `  - Advanced Precursors: Immature Granulocytes (IG): ${haemogramData.ig_pct}% (${haemogramData.ig_abs} x10^9/L) | Bands: ${haemogramData.bands}% (${haemogramData.bands_abs} x10^9/L)`,
      `• 3. Platelet Indices: PLT: ${haemogramData.platelets} x10^9/L, MPV: ${haemogramData.mpv} fL, PDW: ${haemogramData.pdw} fL, PCT: ${haemogramData.pct}%, P-LCR: ${haemogramData.p_lcr}%, P-LCC: ${haemogramData.p_lcc} x10^9/L`,
      `• 4. Inflammation & Special Hematology: ESR (Westergren): ${haemogramData.esr} mm/1hr, Malaria (MPS/RDT): ${haemogramData.malaria}`,
      `• Peripheral Blood Film (PBF): ${haemogramData.pbf}`,
      `  [PBF Details: Anisocytosis: ${haemogramData.anisocytosis}, Poikilocytosis: ${haemogramData.poikilocytosis}, Hypochromia: ${haemogramData.hypochromia ? "Yes" : "No"}, Target Cells: ${haemogramData.targetCells ? "Yes" : "No"}, Sickle Cells: ${haemogramData.sickleCells ? "Yes" : "No"}, Spherocytes: ${haemogramData.spherocytes ? "Yes" : "No"}, Schistocytes: ${haemogramData.schistocytes ? "Yes" : "No"}, Toxic Granulation: ${haemogramData.toxicGranulation}, Left Shift: ${haemogramData.leftShift ? "Yes" : "No"}, Platelet Clumping: ${haemogramData.plateletClumping ? "Yes" : "No"}]`
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

    // 7. Results from 9 Core International Disciplines & Major Test Families
    LAB_DISCIPLINES.forEach((disc) => {
      const discLines: string[] = [];
      disc.testFamilies.forEach((fam) => {
        fam.tests.forEach((t) => {
          const testParamLines: string[] = [];
          t.parameters.forEach((param) => {
            const key = `${t.id}_${param.id}`;
            const val = disciplineResults[key] !== undefined ? disciplineResults[key] : (disciplineResults[param.id] || "");
            if (val && val.trim() !== "") {
              testParamLines.push(`  - ${param.name}: ${val} ${param.unit} (Ref: ${param.referenceRange})`);
            }
          });
          if (testParamLines.length > 0) {
            discLines.push(`• [${t.code}] ${t.name} (${t.sampleType}):\n${testParamLines.join("\n")}`);
            if (disciplineRemarks[t.id] && disciplineRemarks[t.id].trim()) {
              discLines.push(`  Remarks: ${disciplineRemarks[t.id].trim()}`);
            }
          }
        });
      });
      if (discLines.length > 0) {
        sections.push(`=== ${disc.name.toUpperCase()} ===\n${discLines.join("\n")}`);
      }
    });

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
                  {/* Modern Tab Navigation: 9 Core International Disciplines & Specialized Workstations */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 pl-2">
                        <Microscope className="w-4 h-4 text-blue-400" />
                        <div>
                          <span className="text-xs font-bold tracking-wide uppercase">Core Laboratory Disciplines</span>
                          <span className="text-[10px] text-blue-300 ml-2 font-medium">Standardized International Hospital Test Families</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLabDirModalOpen(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Browse Global Test Catalog (All 9 Disciplines)</span>
                      </button>
                    </div>

                    {/* 9 Core Disciplines Strip */}
                    <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 scrollbar-thin">
                      {LAB_DISCIPLINES.map((disc, idx) => {
                        const isActive = activeLabTab === disc.id;
                        const totalTests = disc.testFamilies.reduce((acc, f) => acc + f.tests.length, 0);
                        return (
                          <button
                            key={disc.id}
                            type="button"
                            onClick={() => setActiveLabTab(disc.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                              isActive
                                ? "bg-blue-700 text-white shadow-xs"
                                : "text-slate-700 hover:bg-white/90 hover:text-blue-950"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                              isActive ? "bg-white text-blue-800" : "bg-slate-200 text-slate-700"
                            }`}>
                              {idx + 1}
                            </span>
                            <span>{disc.name.split("&")[0].trim()}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                              isActive ? "bg-blue-900/50 text-blue-100" : "bg-slate-200 text-slate-600"
                            }`}>
                              {totalTests}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Specialized Direct Workstations Bar */}
                    <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2 pr-1">Specialized Analyzers:</span>
                      
                      <button
                        type="button"
                        onClick={() => setActiveLabTab("haemogram")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          activeLabTab === "haemogram"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <Droplets className="w-3 h-3 text-rose-300" />
                        <span>Sysmex/Mindray Haemogram & PBF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveLabTab("urinalysis")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          activeLabTab === "urinalysis"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <FlaskConical className="w-3 h-3 text-amber-300" />
                        <span>Dipstick & Micro Urinalysis</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveLabTab("blood_group")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          activeLabTab === "blood_group"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3 text-indigo-300" />
                        <span>ABO & Rh Crossmatch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveLabTab("custom")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          activeLabTab === "custom"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <Plus className="w-3 h-3 text-slate-300" />
                        <span>+ Custom / Ad-Hoc Test</span>
                        {customTests.length > 0 && (
                          <span className="px-1.5 py-0.2 bg-blue-500 text-white rounded text-[9px]">
                            {customTests.length}
                          </span>
                        )}
                      </button>
                    </div>
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
                  {activeLabTab === "haemogram" && (() => {
                    const effectiveAge = haemogramData.customAge || matchedPatient?.age || selectedTicket?.age || 30;
                    const effectiveGender = haemogramData.customGender || matchedPatient?.gender || selectedTicket?.gender || "Male";
                    const { cohort, label: activeCohortLabel } = determineAgeCohort(effectiveAge, effectiveGender);

                    // Helper to get reference range for current active cohort
                    const getFieldRef = (paramKey: string) => getReferenceRange(paramKey, effectiveAge, effectiveGender);

                    // Helper to render flag styling
                    const getFlagBadge = (paramKey: string, value: string | number) => {
                      const ref = getFieldRef(paramKey);
                      const flag = evaluateFlag(value, ref);
                      if (flag === "CRITICAL") {
                        return <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-1 rounded animate-pulse">CRIT</span>;
                      }
                      if (flag === "HIGH") {
                        return <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 rounded">▲ HI</span>;
                      }
                      if (flag === "LOW") {
                        return <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">▼ LO</span>;
                      }
                      return <span className="text-[9px] text-emerald-700 font-semibold font-mono">OK</span>;
                    };

                    const totalDiffPct = (
                      (parseFloat(haemogramData.neutrophils) || 0) +
                      (parseFloat(haemogramData.lymphocytes) || 0) +
                      (parseFloat(haemogramData.monocytes) || 0) +
                      (parseFloat(haemogramData.eosinophils) || 0) +
                      (parseFloat(haemogramData.basophils) || 0)
                    );

                    return (
                      <div className="p-5 border-2 border-rose-200/90 rounded-2xl bg-rose-50/15 space-y-5 shadow-xs">
                        
                        {/* Header & Biological Cohort Determination Banner */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-rose-200/70">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                              <Droplets className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-rose-950">
                                  Full Haemogram (Complete Blood Count & Advanced Differential)
                                </h4>
                                <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded-md text-[10px] font-black tracking-wide">
                                  36+ Analytes
                                </span>
                              </div>
                              <p className="text-xs text-rose-800/80">
                                Comprehensive evaluation: Erythron, Leukon & Thrombocyte panels with age/gender calibrated biological intervals
                              </p>
                            </div>
                          </div>

                          {/* Quick Presets & Preview */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setShowHaemogramDocModal(true)}
                              className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-xs mr-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Official A4 Document</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleAutoCalculateHematologyIndices}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Auto-compute MCV, MCH, MCHC, Absolute Differentials, Retic #, NRBC # and Platelet Indices"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-300" />
                              <span>Auto-Calculate Indices</span>
                            </button>
                          </div>
                        </div>

                        {/* AGE & GENDER BIOLOGICAL STRATIFICATION STRIP */}
                        <div className="p-3 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-xs">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-white/10 rounded-lg">
                              <Sparkles className="w-4 h-4 text-rose-300" />
                            </div>
                            <div>
                              <span className="text-[10px] text-rose-200 uppercase font-bold tracking-wider block">
                                Dynamic Reference Interval Calibration:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white">
                                  {activeCohortLabel}
                                </span>
                                <span className="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.2 rounded border border-rose-400/30">
                                  Age: {effectiveAge}y • Gender: {effectiveGender}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
                            <span className="text-[10px] text-rose-200/80">Cohort Override:</span>
                            <input
                              type="text"
                              placeholder={`Age (${effectiveAge})`}
                              value={haemogramData.customAge}
                              onChange={(e) => setHaemogramData({ ...haemogramData, customAge: e.target.value })}
                              className="w-16 px-2 py-1 bg-white/10 border border-rose-400/40 rounded-lg text-white text-xs font-mono placeholder:text-rose-300/50"
                              title="Override patient age to evaluate neonatal/pediatric or geriatric reference intervals"
                            />
                            <select
                              value={haemogramData.customGender || effectiveGender}
                              onChange={(e) => setHaemogramData({ ...haemogramData, customGender: e.target.value })}
                              className="px-2 py-1 bg-white/10 border border-rose-400/40 rounded-lg text-white text-xs font-medium"
                            >
                              <option value="Male" className="text-slate-900">Male</option>
                              <option value="Female" className="text-slate-900">Female</option>
                            </select>
                          </div>
                        </div>

                        {/* Presets Bar */}
                        <div className="flex items-center gap-1.5 flex-wrap bg-white/80 p-2 rounded-xl border border-rose-200">
                          <span className="text-[10px] font-bold text-rose-950 uppercase mr-1">Quick Clinical Profiles:</span>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("normal")}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            ✓ Normal Adult
                          </button>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("pediatric")}
                            className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            ✓ Pediatric (3y) Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("anemia")}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Microcytic Anemia (IDA)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("infection")}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Acute Sepsis / Left Shift
                          </button>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("malaria_thrombocytopenia")}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            + Malaria + Thrombocytopenia
                          </button>
                          <button
                            type="button"
                            onClick={() => applyHaemogramPreset("sickle_cell")}
                            className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-950 border border-rose-300 rounded-lg text-[10px] font-black cursor-pointer"
                          >
                            + Sickle Cell Crisis (HbSS)
                          </button>
                        </div>

                        {/* ======================================================== */}
                        {/* 1. RED BLOOD CELL (RBC) & HEMOGLOBIN PARAMETERS (13 items) */}
                        {/* ======================================================== */}
                        <div className="space-y-3 p-4 bg-white rounded-xl border border-rose-200/90 shadow-2xs">
                          <div className="flex justify-between items-center border-b border-rose-100 pb-2">
                            <label className="text-[11px] font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                              <Droplets className="w-3.5 h-3.5 text-rose-600" />
                              <span>1. Red Blood Cell (RBC) & Hemoglobin Parameters (13 Parameters)</span>
                            </label>
                            <span className="text-[10px] text-rose-700 font-mono font-bold">
                              Calibrated for: {activeCohortLabel}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                            {/* RBC */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">RBC Count</label>
                                {getFlagBadge("rbc", haemogramData.rbc)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.rbc}
                                onChange={(e) => setHaemogramData({ ...haemogramData, rbc: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold text-slate-900"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("rbc").displayRange} x10¹²/L</span>
                            </div>

                            {/* Hb */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Hemoglobin (Hb)</label>
                                {getFlagBadge("hb", haemogramData.hb)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.hb}
                                onChange={(e) => setHaemogramData({ ...haemogramData, hb: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-black text-rose-950"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("hb").displayRange} g/dL</span>
                            </div>

                            {/* HCT / PCV */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">HCT / PCV</label>
                                {getFlagBadge("hct", haemogramData.hct)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.hct}
                                onChange={(e) => setHaemogramData({ ...haemogramData, hct: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold text-slate-900"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("hct").displayRange} %</span>
                            </div>

                            {/* MCV */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">MCV (Volume)</label>
                                {getFlagBadge("mcv", haemogramData.mcv)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.mcv}
                                onChange={(e) => setHaemogramData({ ...haemogramData, mcv: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold text-slate-900"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("mcv").displayRange} fL</span>
                            </div>

                            {/* MCH */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">MCH (Weight)</label>
                                {getFlagBadge("mch", haemogramData.mch)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.mch}
                                onChange={(e) => setHaemogramData({ ...haemogramData, mch: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("mch").displayRange} pg</span>
                            </div>

                            {/* MCHC */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">MCHC (Conc.)</label>
                                {getFlagBadge("mchc", haemogramData.mchc)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.mchc}
                                onChange={(e) => setHaemogramData({ ...haemogramData, mchc: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("mchc").displayRange} g/dL</span>
                            </div>

                            {/* RDW-CV */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">RDW-CV</label>
                                {getFlagBadge("rdw_cv", haemogramData.rdw)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.rdw}
                                onChange={(e) => setHaemogramData({ ...haemogramData, rdw: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("rdw_cv").displayRange} %</span>
                            </div>

                            {/* RDW-SD */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">RDW-SD</label>
                                {getFlagBadge("rdw_sd", haemogramData.rdw_sd)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.rdw_sd}
                                onChange={(e) => setHaemogramData({ ...haemogramData, rdw_sd: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("rdw_sd").displayRange} fL</span>
                            </div>

                            {/* Reticulocyte % */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Reticulocyte %</label>
                                {getFlagBadge("retic_pct", haemogramData.retic_pct)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.retic_pct}
                                onChange={(e) => setHaemogramData({ ...haemogramData, retic_pct: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("retic_pct").displayRange} %</span>
                            </div>

                            {/* Reticulocyte # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Reticulocyte #</label>
                                {getFlagBadge("retic_abs", haemogramData.retic_abs)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.retic_abs}
                                onChange={(e) => setHaemogramData({ ...haemogramData, retic_abs: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("retic_abs").displayRange} x10⁹/L</span>
                            </div>

                            {/* IRF */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">IRF (Immature Retic)</label>
                                {getFlagBadge("irf", haemogramData.irf)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.irf}
                                onChange={(e) => setHaemogramData({ ...haemogramData, irf: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("irf").displayRange} %</span>
                            </div>

                            {/* NRBC % & # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">NRBC % / #</label>
                                {getFlagBadge("nrbc_pct", haemogramData.nrbc_pct)}
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  placeholder="%"
                                  value={haemogramData.nrbc_pct}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, nrbc_pct: e.target.value })}
                                  className="w-full px-1.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="#"
                                  value={haemogramData.nrbc_abs}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, nrbc_abs: e.target.value })}
                                  className="w-full px-1.5 py-1.5 bg-white border border-rose-200 rounded-lg font-mono text-[11px]"
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: 0.0 - 0.1 %</span>
                            </div>
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 2. WHITE BLOOD CELL (WBC) PARAMETERS (15 items) */}
                        {/* ======================================================== */}
                        <div className="space-y-3 p-4 bg-white rounded-xl border border-blue-200/90 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-blue-100 pb-2">
                            <label className="text-[11px] font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                              <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                              <span>2. White Blood Cell (WBC) Parameters & 5-Part Differential with Absolutes (15 Parameters)</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                Math.abs(totalDiffPct - 100) < 0.5 ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                              }`}>
                                Relative Sum: {totalDiffPct.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Total WBC & Primary Differentials */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                            {/* Total WBC */}
                            <div className="sm:col-span-1 bg-blue-50/60 p-2 rounded-xl border border-blue-200">
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-black text-blue-950">Total WBC Count</label>
                                {getFlagBadge("wbc", haemogramData.wbc)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.wbc}
                                onChange={(e) => setHaemogramData({ ...haemogramData, wbc: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg font-mono font-black text-blue-950 text-sm"
                              />
                              <span className="text-[9px] text-blue-700 block mt-0.5 font-mono font-bold">Ref: {getFieldRef("wbc").displayRange} x10⁹/L</span>
                            </div>

                            {/* Neutrophils % & # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Neutrophils (% / ANC)</label>
                                {getFlagBadge("neut_pct", haemogramData.neutrophils)}
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  placeholder="%"
                                  value={haemogramData.neutrophils}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, neutrophils: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="ANC"
                                  value={haemogramData.neut_abs}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, neut_abs: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("neut_pct").displayRange}% (ANC: {getFieldRef("neut_abs").displayRange})</span>
                            </div>

                            {/* Lymphocytes % & # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Lymphocytes (% / ALC)</label>
                                {getFlagBadge("lymph_pct", haemogramData.lymphocytes)}
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  placeholder="%"
                                  value={haemogramData.lymphocytes}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, lymphocytes: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="ALC"
                                  value={haemogramData.lymph_abs}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, lymph_abs: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("lymph_pct").displayRange}% (ALC: {getFieldRef("lymph_abs").displayRange})</span>
                            </div>

                            {/* Monocytes % & # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Monocytes (% / AMC)</label>
                                {getFlagBadge("mono_pct", haemogramData.monocytes)}
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  placeholder="%"
                                  value={haemogramData.monocytes}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, monocytes: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="AMC"
                                  value={haemogramData.mono_abs}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, mono_abs: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("mono_pct").displayRange}%</span>
                            </div>

                            {/* Eosinophils % & # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Eosinophils (% / AEC)</label>
                                {getFlagBadge("eos_pct", haemogramData.eosinophils)}
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  placeholder="%"
                                  value={haemogramData.eosinophils}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, eosinophils: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="AEC"
                                  value={haemogramData.eos_abs}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, eos_abs: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("eos_pct").displayRange}%</span>
                            </div>

                            {/* Basophils % & # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Basophils (% / ABC)</label>
                                {getFlagBadge("baso_pct", haemogramData.basophils)}
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  placeholder="%"
                                  value={haemogramData.basophils}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, basophils: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="ABC"
                                  value={haemogramData.baso_abs}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, baso_abs: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("baso_pct").displayRange}%</span>
                            </div>

                            {/* Immature Granulocytes (IG) % & # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Immature Granulocytes (IG)</label>
                                {getFlagBadge("ig_pct", haemogramData.ig_pct)}
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  placeholder="%"
                                  value={haemogramData.ig_pct}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, ig_pct: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="#"
                                  value={haemogramData.ig_abs}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, ig_abs: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("ig_pct").displayRange}%</span>
                            </div>

                            {/* Bands (Stab Forms) % & # */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Band Neutrophils (Bands)</label>
                                {getFlagBadge("bands_pct", haemogramData.bands)}
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  placeholder="%"
                                  value={haemogramData.bands}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, bands: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="#"
                                  value={haemogramData.bands_abs}
                                  onChange={(e) => setHaemogramData({ ...haemogramData, bands_abs: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("bands_pct").displayRange}%</span>
                            </div>
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 3. PLATELET (PLT) PARAMETERS & INDICES (6 items) */}
                        {/* ======================================================== */}
                        <div className="space-y-3 p-4 bg-white rounded-xl border border-purple-200/90 shadow-2xs">
                          <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                            <label className="text-[11px] font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-purple-600" />
                              <span>3. Platelet (PLT) Parameters & Thrombocyte Indices (6 Parameters)</span>
                            </label>
                            <span className="text-[10px] text-purple-700 font-mono font-bold">
                              Thrombopoiesis & Aggregation Profile
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                            {/* Platelet Count */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Platelet Count (PLT)</label>
                                {getFlagBadge("plt", haemogramData.platelets)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.platelets}
                                onChange={(e) => setHaemogramData({ ...haemogramData, platelets: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-purple-300 rounded-lg font-mono font-black text-purple-950 text-sm"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("plt").displayRange} x10⁹/L</span>
                            </div>

                            {/* MPV */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">MPV (Mean Vol)</label>
                                {getFlagBadge("mpv", haemogramData.mpv)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.mpv}
                                onChange={(e) => setHaemogramData({ ...haemogramData, mpv: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("mpv").displayRange} fL</span>
                            </div>

                            {/* PDW */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">PDW (Dist. Width)</label>
                                {getFlagBadge("pdw", haemogramData.pdw)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.pdw}
                                onChange={(e) => setHaemogramData({ ...haemogramData, pdw: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("pdw").displayRange} fL</span>
                            </div>

                            {/* Plateletcrit (PCT) */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">Plateletcrit (PCT)</label>
                                {getFlagBadge("pct", haemogramData.pct)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.pct}
                                onChange={(e) => setHaemogramData({ ...haemogramData, pct: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("pct").displayRange} %</span>
                            </div>

                            {/* P-LCR */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">P-LCR (Large Ratio)</label>
                                {getFlagBadge("p_lcr", haemogramData.p_lcr)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.p_lcr}
                                onChange={(e) => setHaemogramData({ ...haemogramData, p_lcr: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("p_lcr").displayRange} %</span>
                            </div>

                            {/* P-LCC */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">P-LCC (Large Count)</label>
                                {getFlagBadge("p_lcc", haemogramData.p_lcc)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.p_lcc}
                                onChange={(e) => setHaemogramData({ ...haemogramData, p_lcc: e.target.value })}
                                className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg font-mono"
                              />
                              <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">Ref: {getFieldRef("p_lcc").displayRange} x10⁹/L</span>
                            </div>
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 4. INFLAMMATION (ESR) & STRUCTURED PBF MICROSCOPIC REVIEW */}
                        {/* ======================================================== */}
                        <div className="space-y-3 p-4 bg-white rounded-xl border border-emerald-200/90 shadow-2xs">
                          <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                            <label className="text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                              <Microscope className="w-3.5 h-3.5 text-emerald-600" />
                              <span>4. Systemic Inflammation (ESR) & Peripheral Blood Film (PBF) Morphology</span>
                            </label>
                            <span className="text-[10px] text-emerald-800 font-mono font-bold">
                              Wright-Giemsa Smear Examination
                            </span>
                          </div>

                          {/* ESR & Malaria */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="text-[10px] font-bold text-gray-700">ESR (Westergren mm/1hr)</label>
                                {getFlagBadge("esr", haemogramData.esr)}
                              </div>
                              <input
                                type="text"
                                value={haemogramData.esr}
                                onChange={(e) => setHaemogramData({ ...haemogramData, esr: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-slate-900"
                              />
                              <span className="text-[9px] text-emerald-700 block mt-0.5 font-mono font-semibold">Ref (Age/Gender Calibrated): {getFieldRef("esr").displayRange} mm/1hr</span>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-gray-700 block mb-1">Malaria Parasites (Giemsa Film / RDT)</label>
                              <select
                                value={haemogramData.malaria}
                                onChange={(e) => setHaemogramData({ ...haemogramData, malaria: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold text-slate-800"
                              >
                                <option>Negative</option>
                                <option>Positive (Plasmodium Falciparum Ring Forms +)</option>
                                <option>Positive (Plasmodium Falciparum Ring Forms ++ / High Density)</option>
                                <option>Positive (Plasmodium Vivax)</option>
                                <option>Borderline / Repeat Advised</option>
                              </select>
                            </div>
                          </div>

                          {/* Structured Morphology Checkboxes */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                            <span className="text-[10px] font-bold text-slate-700 uppercase block">Structured Morphology Findings:</span>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* RBC Morphology */}
                              <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-rose-900 uppercase block">RBC Features:</span>
                                <div className="space-y-1 text-[11px] text-slate-800">
                                  <div className="flex items-center justify-between">
                                    <span>Anisocytosis:</span>
                                    <select
                                      value={haemogramData.anisocytosis}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, anisocytosis: e.target.value as any })}
                                      className="px-1.5 py-0.5 border border-slate-200 rounded text-[10px]"
                                    >
                                      <option>None</option>
                                      <option>Mild (+)</option>
                                      <option>Moderate (++)</option>
                                      <option>Marked (+++)</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>Poikilocytosis:</span>
                                    <select
                                      value={haemogramData.poikilocytosis}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, poikilocytosis: e.target.value as any })}
                                      className="px-1.5 py-0.5 border border-slate-200 rounded text-[10px]"
                                    >
                                      <option>None</option>
                                      <option>Mild (+)</option>
                                      <option>Moderate (++)</option>
                                      <option>Marked (+++)</option>
                                    </select>
                                  </div>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.hypochromia}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, hypochromia: e.target.checked })}
                                      className="rounded text-rose-600"
                                    />
                                    <span>Hypochromia (Pale Cells)</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.targetCells}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, targetCells: e.target.checked })}
                                      className="rounded text-rose-600"
                                    />
                                    <span>Target Cells Present</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.sickleCells}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, sickleCells: e.target.checked })}
                                      className="rounded text-rose-600"
                                    />
                                    <span>Sickle Cells (Drepanocytes)</span>
                                  </label>
                                </div>
                              </div>

                              {/* WBC Morphology */}
                              <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-blue-900 uppercase block">WBC Features:</span>
                                <div className="space-y-1 text-[11px] text-slate-800">
                                  <div className="flex items-center justify-between">
                                    <span>Toxic Granulation:</span>
                                    <select
                                      value={haemogramData.toxicGranulation}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, toxicGranulation: e.target.value as any })}
                                      className="px-1.5 py-0.5 border border-slate-200 rounded text-[10px]"
                                    >
                                      <option>Absent</option>
                                      <option>Mild (+)</option>
                                      <option>Moderate (++)</option>
                                      <option>Severe (+++)</option>
                                    </select>
                                  </div>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.leftShift}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, leftShift: e.target.checked })}
                                      className="rounded text-blue-600"
                                    />
                                    <span>Left Shift (Bandemia)</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.vacuolation}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, vacuolation: e.target.checked })}
                                      className="rounded text-blue-600"
                                    />
                                    <span>Cytoplasmic Vacuolation</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.reactiveLymphocytes}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, reactiveLymphocytes: e.target.checked })}
                                      className="rounded text-blue-600"
                                    />
                                    <span>Atypical / Reactive Lymphocytes</span>
                                  </label>
                                </div>
                              </div>

                              {/* Platelet Morphology */}
                              <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-purple-900 uppercase block">Platelet Features:</span>
                                <div className="space-y-1 text-[11px] text-slate-800">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.giantPlatelets}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, giantPlatelets: e.target.checked })}
                                      className="rounded text-purple-600"
                                    />
                                    <span>Giant Platelets (Megathrombocytes)</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.plateletClumping}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, plateletClumping: e.target.checked })}
                                      className="rounded text-purple-600"
                                    />
                                    <span>Platelet Clumping (EDTA effect)</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={haemogramData.adequateSmear}
                                      onChange={(e) => setHaemogramData({ ...haemogramData, adequateSmear: e.target.checked })}
                                      className="rounded text-purple-600"
                                    />
                                    <span>Adequate Platelet Count on Smear</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Film Morphology Narrative Text */}
                          <div>
                            <label className="text-[10px] font-bold text-gray-700 block mb-1">Comprehensive Blood Film (PBF) Narrative & Clinical Impression</label>
                            <textarea
                              rows={2}
                              value={haemogramData.pbf}
                              onChange={(e) => setHaemogramData({ ...haemogramData, pbf: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium text-slate-900"
                            />
                          </div>
                        </div>

                      </div>
                    );
                  })()}

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

                  {/* ======================================================== */}
                  {/* 7. 9 CORE INTERNATIONAL DISCIPLINES WORKSHEETS */}
                  {/* ======================================================== */}
                  {LAB_DISCIPLINES.some((d) => d.id === activeLabTab) && (
                    <LabDisciplineWorksheet
                      disciplineId={activeLabTab}
                      patientData={{
                        fullName: matchedPatient?.patientName || selectedTicket?.patientName,
                        mrn: matchedPatient?.patientNumber || matchedPatient?.nationalId || selectedTicket?.patientId,
                        gender: matchedPatient?.gender || selectedTicket?.gender,
                        ageYears: Number(matchedPatient?.age || selectedTicket?.age || 30),
                        requestedTests: selectedTicket?.requestedTests || selectedTicket?.labTestsOrdered || []
                      }}
                      resultsState={disciplineResults}
                      onParameterChange={(paramKey, val) => {
                        setDisciplineResults((prev) => ({ ...prev, [paramKey]: val }));
                      }}
                      onApplyTestDefaults={(test) => {
                        setDisciplineResults((prev) => {
                          const next = { ...prev };
                          test.parameters.forEach((p) => {
                            const key = `${test.id}_${p.id}`;
                            if (p.defaultValue) next[key] = p.defaultValue;
                          });
                          return next;
                        });
                        if (test.defaultRemarks) {
                          setDisciplineRemarks((prev) => ({
                            ...prev,
                            [test.id]: test.defaultRemarks || ""
                          }));
                        }
                        toast.success(`Standard Normal Values loaded for ${test.name}`);
                      }}
                      remarksState={disciplineRemarks}
                      onRemarksChange={(testId, remarks) => {
                        setDisciplineRemarks((prev) => ({ ...prev, [testId]: remarks }));
                      }}
                    />
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
          data={{
            ...haemogramData,
            bloodGroup: exactBloodType,
            crossmatchStatus,
            pbfDetails: {
              rbc: {
                anisocytosis: haemogramData.anisocytosis,
                poikilocytosis: haemogramData.poikilocytosis,
                hypochromia: haemogramData.hypochromia,
                polychromasia: haemogramData.polychromasia,
                targetCells: haemogramData.targetCells,
                sickleCells: haemogramData.sickleCells,
                spherocytes: haemogramData.spherocytes,
                schistocytes: haemogramData.schistocytes,
                rouleaux: haemogramData.rouleaux
              },
              wbc: {
                toxicGranulation: haemogramData.toxicGranulation,
                vacuolation: haemogramData.vacuolation,
                reactiveLymphocytes: haemogramData.reactiveLymphocytes,
                leftShift: haemogramData.leftShift
              },
              platelets: {
                clumping: haemogramData.plateletClumping,
                giantPlatelets: haemogramData.giantPlatelets,
                adequateSmear: haemogramData.adequateSmear
              },
              summary: haemogramData.pbf
            }
          }}
          patientMeta={{
            name: matchedPatient?.patientName || selectedTicket?.patientName || "Walk-in Patient",
            age: haemogramData.customAge || matchedPatient?.age || selectedTicket?.age || 30,
            gender: haemogramData.customGender || matchedPatient?.gender || selectedTicket?.gender || "Male",
            patientNo: matchedPatient?.nationalId || matchedPatient?.patientNumber || selectedTicket?.ticketNo || "LAB-OPD-99",
            facilityName: "The Tassia Hill Hospital Diagnostic & Laboratory Center",
            doctor: "Attending Medical Officer",
            date: new Date().toISOString().replace("T", " ").substring(0, 16)
          }}
        />
      )}

      {/* Global Laboratory Directory & Reference Catalog Modal */}
      <LabDirectoryModal
        isOpen={isLabDirModalOpen}
        onClose={() => setIsLabDirModalOpen(false)}
        onSelectTest={(test) => {
          setActiveLabTab(test.disciplineId);
          toast.info(`Worksheet activated: ${test.disciplineName} -> ${test.name}`);
        }}
        title="Global Hospital Laboratory Test Directory (9 Core Disciplines)"
        actionButtonLabel="Open Worksheet"
      />
    </div>
  );
}

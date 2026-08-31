import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, getDocs, query, where } from "firebase/firestore";
import { MedicalRecord, Medication, QueueTicket, PrescriptionItem, ClinicalVisit } from "../types";
import { upsertUnifiedPatientRecord, findUnifiedPatient, normalizeString, normalizePhone } from "../lib/patientSyncService";
import { 
  Heart, 
  Stethoscope, 
  ClipboardList, 
  AlertTriangle, 
  Sparkles, 
  Check, 
  Send, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  Printer, 
  BellRing, 
  Volume2, 
  X, 
  ArrowRight, 
  UserCheck,
  CheckCircle2,
  ArrowRightLeft,
  MessageSquare,
  FileCheck,
  Award,
  Activity,
  Hospital,
  Search,
  History,
  CreditCard,
  Phone,
  User,
  ShoppingCart,
  Bed,
  FlaskRound,
  FlaskConical,
  Droplets,
  Zap,
  FilePlus,
  Pill,
  Trash2
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import KenyanHospitalFormsModal, { KenyanFormType, COMMON_ICD10_KENYA } from "./KenyanHospitalFormsModal";
import PatientHistoryLookupModal from "./PatientHistoryLookupModal";
import PatientCartPOSModal from "./PatientCartPOSModal";
import HaemogramDocument from "./HaemogramDocument";
import { isHaemogramReport } from "../lib/haemogramParser";
import { syncDoctorConsultationToCart } from "../lib/patientCartService";
import { DEFAULT_HOSPITAL_WARDS, createHospitalEncounter } from "../lib/encounterService";
import { toast } from "../lib/promptService";
import { voiceAnnouncer } from "../lib/voiceAnnouncementService";

interface DoctorsDeskProps {
  toggles: any;
  onRefreshQueue: () => void;
  activeSpecialistId?: string;
  onOpenTransferModal?: (patient?: any) => void;
  onOpenChatModal?: (targetRole?: string, patientInfo?: any) => void;
}

export interface RoutingCueInfo {
  ticketNo: string;
  stationName: string;
  stationDepartment: string;
  instructionText: string;
  patientName: string;
  nationalId: string;
  diagnosis: string;
  details: string;
}

export default function DoctorsDesk({
  toggles,
  onRefreshQueue,
  activeSpecialistId,
  onOpenTransferModal,
  onOpenChatModal
}: DoctorsDeskProps) {
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [pendingQueueTickets, setPendingQueueTickets] = useState<QueueTicket[]>([]);
  const [incomingPatientPrompt, setIncomingPatientPrompt] = useState<QueueTicket | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Audio-visual routing modal state
  const [routingCue, setRoutingCue] = useState<RoutingCueInfo | null>(null);

  // Patient Cart & POS Folio Modal State
  const [showCartModal, setShowCartModal] = useState(false);

  // Inpatient Direct Admission Modal State (Kenyan OPD -> IPD Handshake)
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [admissionWardId, setAdmissionWardId] = useState("ward-general-male");
  const [admissionNotes, setAdmissionNotes] = useState("");
  const [isAdmitting, setIsAdmitting] = useState(false);

  // Printing digital prescription states
  const [printOpen, setPrintOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<{ patient: MedicalRecord; visit: ClinicalVisit } | null>(null);

  // Kenyan Statutory & Medical Forms Modal State
  const [kenyanFormModalOpen, setKenyanFormModalOpen] = useState(false);
  const [activeKenyanFormType, setActiveKenyanFormType] = useState<KenyanFormType>("sick_sheet");
  const [selectedFormVisit, setSelectedFormVisit] = useState<ClinicalVisit | null>(null);
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);

  // History Lookup Modal state & Patient filter
  const [showDoctorHistoryModal, setShowDoctorHistoryModal] = useState(false);
  const [patientSearchFilter, setPatientSearchFilter] = useState("");

  // Clinical inputs
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [temp, setTemp] = useState("37.0");
  const [bp, setBp] = useState("120/80");
  const [pulse, setPulse] = useState("75");
  const [weight, setWeight] = useState("70");

  // Prescriptions being drafted
  const [draftPrescriptions, setDraftPrescriptions] = useState<PrescriptionItem[]>([]);
  const [searchDrugQuery, setSearchDrugQuery] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<Medication | null>(null);
  const [prescribeQty, setPrescribeQty] = useState(1);
  const [prescribeDosage, setPrescribeDosage] = useState("1x3");
  const [prescribeInstructions, setPrescribeInstructions] = useState("Take after meals");

  // E-Referral inputs
  const [referralDept, setReferralDept] = useState<"laboratory" | "radiology" | "labour_room" | "gyna" | string>("laboratory");
  const [referralTestName, setReferralTestName] = useState("");
  const [referralNotes, setReferralNotes] = useState("");
  const [draftReferrals, setDraftReferrals] = useState<{department: "laboratory" | "radiology" | "labour_room" | "gyna" | string, testName: string, notes: string}[]>([]);

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // Loading
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Helper to play synthesized audio beep
  const playAudioTone = (freq: number = 880, duration: number = 0.2) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log("Audio tone error:", e);
    }
  };

  // Helper to speak announcement aloud
  const speakStationAnnouncement = (text: string) => {
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = "en-KE";
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.log("Speech synthesis error:", e);
    }
  };

  useEffect(() => {
    // Listen to Patients
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const pats: MedicalRecord[] = [];
      snapshot.forEach((doc) => {
        pats.push({ id: doc.id, ...doc.data() } as MedicalRecord);
      });
      setPatients(pats);
      setLoading(false);
    });

    // Listen to Medications
    const unsubMeds = onSnapshot(collection(db, "medications"), (snapshot) => {
      const meds: Medication[] = [];
      snapshot.forEach((doc) => {
        meds.push({ id: doc.id, ...doc.data() } as Medication);
      });
      setMedications(meds);
    });

    // Listen to Active Serving Queue Tickets for Doctor Department
    const qServing = query(collection(db, "queue"), where("currentDepartment", "==", "doctor"), where("status", "==", "serving"));
    const unsubServingQueue = onSnapshot(qServing, (snapshot) => {
      const tickets: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        const tick = { id: doc.id, ...doc.data() } as QueueTicket;
        if (activeSpecialistId) {
          if (tick.assignedSpecialistId === activeSpecialistId || !tick.assignedSpecialistId) {
            tickets.push(tick);
          }
        } else {
          tickets.push(tick);
        }
      });
      setQueueTickets(tickets);

      // Auto select called patient if present
      if (tickets.length > 0 && !selectedPatientId) {
        const matched = patsFromDbAndQueue(tickets[0].patientName);
        if (matched) setSelectedPatientId(matched.id);
      }
    });

    // Listen to Pending Incoming Queue Tickets for Doctor Department (for Real-Time Popup Notification)
    const qPending = query(collection(db, "queue"), where("currentDepartment", "==", "doctor"), where("status", "==", "pending"));
    const unsubPendingQueue = onSnapshot(qPending, (snapshot) => {
      const pending: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        const tick = { id: doc.id, ...doc.data() } as QueueTicket;
        if (activeSpecialistId) {
          if (tick.assignedSpecialistId === activeSpecialistId || !tick.assignedSpecialistId) {
            pending.push(tick);
          }
        } else {
          pending.push(tick);
        }
      });
      setPendingQueueTickets(pending);

      // Show real-time popup if there is an incoming pending patient and no active consultation
      if (pending.length > 0) {
        const newest = pending[0];
        setIncomingPatientPrompt((prev) => {
          if (!prev || prev.id !== newest.id) {
            playAudioTone(750, 0.25);
            return newest;
          }
          return prev;
        });
      }
    });

    return () => {
      unsubPatients();
      unsubMeds();
      unsubServingQueue();
      unsubPendingQueue();
    };
  }, [activeSpecialistId]);

  const patsFromDbAndQueue = (nameOrId: string) => {
    return findUnifiedPatient(nameOrId, patients);
  };

  // Accept and call incoming patient from popup prompt
  const handleAcceptIncomingPatient = async (ticket: QueueTicket) => {
    try {
      playAudioTone(1050, 0.3);
      await updateDoc(doc(db, "queue", ticket.id), {
        status: "serving",
      });

      const matched = patsFromDbAndQueue(ticket.patientName);
      if (matched) {
        setSelectedPatientId(matched.id);
      }
      if (ticket.issue) {
        setSymptoms(ticket.issue);
      }
      setIncomingPatientPrompt(null);
      
      // PA Voice Queue Announcement with Banking/Hospital Chime
      const rawRoom = (ticket.consultationRoom || "Room 5").trim();
      const room = rawRoom.replace(/,\s*doctor$/i, "").replace(/\s+doctor$/i, "").trim() || "Room 5";
      voiceAnnouncer.announceTurnArrived({
        ticketNo: ticket.ticketNo,
        patientName: ticket.patientName,
        roomOrDesk: room,
        departmentOrRole: "Consultation"
      }).catch(err => console.warn("Voice broadcast error:", err));
    } catch (e) {
      console.error("Error accepting incoming patient:", e);
    }
  };

  // Auto-populate symptom fields from the queue ticket issue
  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const currentPat = patients.find(p => p.id === selectedPatientId);
      if (currentPat) {
        // Search in queue tickets (both pending and serving)
        const qSnap = query(collection(db, "queue"), where("patientName", "==", currentPat.patientName));
        getDocs(qSnap).then((snap) => {
          if (!snap.empty) {
            const activeTick = snap.docs.find(d => d.data().status !== "completed");
            if (activeTick && activeTick.data().issue) {
              setSymptoms(activeTick.data().issue);
            }
          }
        }).catch(err => console.log("Error fetching active ticket issue:", err));
      }
    }
  }, [selectedPatientId, patients]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Determine if this is a Diagnostic Results Review consultation (Loopback from Lab/Rad)
  const activeServingTicket = queueTickets.find(t => 
    (selectedPatient && t.patientName === selectedPatient.patientName) || 
    t.id === incomingPatientPrompt?.id
  );
  
  const isResultsReview = Boolean(
    activeServingTicket?.isResultsReview || 
    activeServingTicket?.resultsReady || 
    activeServingTicket?.ticketNo?.startsWith("REV-") ||
    selectedPatient?.visits?.some(v => v.referrals?.some(r => r.status === "completed" && r.results))
  );

  // Extract all returned diagnostic findings for fast clinical review
  const latestDiagnosticResults = useMemo(() => {
    if (!selectedPatient) return [];
    const list: { dept: string; test: string; findings: string; date: string }[] = [];
    selectedPatient.visits?.forEach(v => {
      v.referrals?.forEach(r => {
        if (r.status === "completed" && r.results) {
          list.push({
            dept: r.department,
            test: r.testName,
            findings: r.results,
            date: v.date
          });
        }
      });
    });
    return list;
  }, [selectedPatient]);

  // MOH 705 Category Determination
  const mohCategory = (selectedPatient?.age || 0) < 5 
    ? "MOH 705A (Under 5 Morbidity)" 
    : "MOH 705B (Over 5 Morbidity)";

  // Direct Inpatient Admission Handler (Seamless OPD -> IPD Handshake)
  const handleDirectInpatientAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.warning("Please select a patient first.", "No Patient Selected");
      return;
    }

    setIsAdmitting(true);
    try {
      const selectedWard = DEFAULT_HOSPITAL_WARDS.find(w => w.id === admissionWardId) || DEFAULT_HOSPITAL_WARDS[0];
      
      // Auto assign a bed number
      const bedNumber = `Bed ${Math.floor(1 + Math.random() * selectedWard.totalBeds)}`;
      const bedId = `${selectedWard.id}-bed-${bedNumber.replace("Bed ", "")}`;

      // 1. Create Inpatient Encounter
      const newEncounterId = await createHospitalEncounter({
        patientId: selectedPatient.id,
        patientName: selectedPatient.patientName,
        nationalId: selectedPatient.nationalId,
        phone: selectedPatient.phone,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        bloodType: selectedPatient.bloodType,
        admissionType: "INPATIENT",
        assignedWardId: selectedWard.id,
        assignedWardName: selectedWard.name,
        assignedBedId: bedId,
        assignedBedNumber: bedNumber,
        initialSymptoms: symptoms || "Direct Admission from Doctor's Desk",
        initialDiagnosis: diagnosis || "Inpatient Care Required",
        attendingDoctorName: "Dr. On Duty",
        recordedBy: "Doctor Consultation Desk"
      });

      // 2. Mark active queue ticket as admitted to ward
      const qSnap = await getDocs(
        query(
          collection(db, "queue"),
          where("patientName", "==", selectedPatient.patientName),
          where("currentDepartment", "==", "doctor")
        )
      );

      if (!qSnap.empty) {
        for (const docItem of qSnap.docs) {
          await updateDoc(doc(db, "queue", docItem.id), {
            status: "completed",
            currentDepartment: "inpatient_ward",
            admissionRequired: true,
            assignedWardName: selectedWard.name,
            assignedBedNumber: bedNumber,
            encounterId: newEncounterId,
            notes: `Admitted to ${selectedWard.name} (${bedNumber}) by Doctor.`
          });
        }
      }

      setShowAdmissionModal(false);
      setAdmissionNotes("");
      toast.success(
        `Patient ${selectedPatient.patientName} admitted to ${selectedWard.name} (${bedNumber})! Encounter #${newEncounterId} initiated.`,
        "Inpatient Admission Successful"
      );
      onRefreshQueue();
    } catch (err) {
      console.error("Admission error:", err);
      toast.error("Failed to process inpatient admission. Please try again.", "Admission Error");
    } finally {
      setIsAdmitting(false);
    }
  };

  // Trigger Gemini API to recommend alternatives
  const fetchAlternativeDrugs = async (outOfStockDrug: string) => {
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const response = await fetch("/api/gemini/suggest-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugName: outOfStockDrug,
          quantity: prescribeQty,
          symptoms,
          diagnosis,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAiSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  // Trigger Gemini API for EHR summary
  const fetchEHRAISummary = async () => {
    if (!selectedPatient) return;
    setAiSummaryLoading(true);
    setAiSummary(null);
    try {
      const response = await fetch("/api/gemini/summarize-ehr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: selectedPatient.patientName,
          visits: selectedPatient.visits,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAiSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handlePrescribeAdd = () => {
    if (!selectedDrug) return;

    if (selectedDrug.quantity <= 0) {
      // Out of stock -> trigger Gemini alternatives
      fetchAlternativeDrugs(selectedDrug.name);
      return;
    }

    const newItem: PrescriptionItem = {
      drugName: selectedDrug.name,
      quantity: prescribeQty,
      dosage: prescribeDosage,
      instructions: prescribeInstructions,
      status: "pending",
    };

    setDraftPrescriptions([...draftPrescriptions, newItem]);
    setSelectedDrug(null);
    setSearchDrugQuery("");
  };

  const addReferralDraft = (testNameOverride?: string, deptOverride?: string, notesOverride?: string) => {
    const tName = testNameOverride || referralTestName;
    const dept = deptOverride || referralDept;
    const notes = notesOverride || referralNotes;
    if (!tName) return;

    // Avoid duplicate draft test
    if (draftReferrals.some(r => r.testName.toLowerCase() === tName.toLowerCase() && r.department === dept)) {
      toast.info(`Test "${tName}" is already in the referral queue.`, "Duplicate Referral");
      return;
    }

    setDraftReferrals(prev => [
      ...prev,
      {
        department: dept,
        testName: tName,
        notes: notes || `Diagnostic investigation for ${tName}`,
      },
    ]);
    if (!testNameOverride) {
      setReferralTestName("");
      setReferralNotes("");
    }
  };

  // Instant 1-Click Wire Patient to Laboratory Queue
  const handleInstantCueToLab = async (specificTests?: string[], specificNotes?: string) => {
    if (!selectedPatientId || !selectedPatient) {
      toast.warning("Please select an active patient to wire to the Laboratory.", "No Patient Selected");
      return;
    }

    let testsToOrder = specificTests && specificTests.length > 0
      ? specificTests
      : draftReferrals.filter(r => r.department === "laboratory").map(r => r.testName);

    if (testsToOrder.length === 0) {
      testsToOrder = ["Urinalysis", "Full Haemogram"];
    }

    setSubmitting(true);
    try {
      // 1. Compile referrals and update patient EHR record
      const compiledReferrals = testsToOrder.map((test, idx) => ({
        id: `ref-${Date.now()}-${idx}`,
        department: "laboratory" as const,
        testName: test,
        notes: specificNotes || referralNotes || `Clinical Lab Order: ${test}`,
        status: "pending" as const,
      }));

      await upsertUnifiedPatientRecord({
        id: selectedPatientId,
        patientName: selectedPatient.patientName,
        nationalId: selectedPatient.nationalId,
        phone: selectedPatient.phone,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        bloodType: selectedPatient.bloodType,
        vitals: { temp, bp, pulse, weight },
        symptoms: symptoms || "Referred for Laboratory Diagnostics",
        diagnosis: diagnosis || `Investigation: ${testsToOrder.join(", ")}`,
        prescriptions: draftPrescriptions,
        referrals: compiledReferrals,
        sourceStation: "Doctor's Desk"
      });

      // 2. Synchronize to Patient's Cart
      try {
        await syncDoctorConsultationToCart({
          patientId: selectedPatientId,
          patientName: selectedPatient.patientName,
          nationalId: selectedPatient.nationalId,
          phone: selectedPatient.phone,
          ticketNo: selectedPatient.activeTicketNo,
          doctorName: "Doctor on Duty",
          isResultsReview,
          prescriptions: draftPrescriptions.map(p => ({
            drugName: p.drugName,
            quantity: p.quantity,
            dosage: p.dosage,
            unitPrice: p.price
          })),
          referrals: compiledReferrals.map(r => ({
            testName: r.testName,
            department: r.department
          }))
        });
      } catch (cartErr) {
        console.warn("Patient cart auto-sync notice:", cartErr);
      }

      // 3. Automated Routing logic: Wire instantly to Laboratory Queue
      const qSnap = await getDocs(
        query(
          collection(db, "queue"),
          where("patientName", "==", selectedPatient.patientName),
          where("currentDepartment", "==", "doctor")
        )
      );

      const baseNum = Math.floor(Math.random() * 900 + 100);
      let assignedTicketNo = `LAB-${baseNum}`;
      const assignedStationName = "Laboratory Diagnostic Station (Room 104)";
      const instructionPhrase = `Ticket No. ${assignedTicketNo}: Go to Laboratory`;
      const routingDetails = `Instantly wired to Lab Dashboard Queue for: ${testsToOrder.join(" & ")}.`;

      if (!qSnap.empty) {
        const ticketDoc = qSnap.docs[0];
        const ticketData = ticketDoc.data();
        const existingNum = ticketData.ticketNo?.includes("-") ? ticketData.ticketNo.split("-")[1] : baseNum;
        assignedTicketNo = `LAB-${existingNum}`;

        await updateDoc(doc(db, "queue", ticketDoc.id), {
          currentDepartment: "laboratory",
          ticketNo: assignedTicketNo,
          status: "pending",
          service: "Laboratory Diagnostics",
          requestedTests: testsToOrder,
          labTestsOrdered: testsToOrder,
          notes: `Doctor Order: ${testsToOrder.join(", ")}${diagnosis ? ` (Dx: ${diagnosis})` : ""}`,
          timestamp: new Date().toISOString(),
          originDoctorName: "Dr. On Duty"
        });
      } else {
        // Fallback: Create new queue ticket directly
        await addDoc(collection(db, "queue"), {
          ticketNo: assignedTicketNo,
          patientName: selectedPatient.patientName,
          patientId: selectedPatient.id,
          nationalId: selectedPatient.nationalId,
          phone: selectedPatient.phone || "",
          age: selectedPatient.age || 0,
          gender: selectedPatient.gender || "Unknown",
          biometricStatus: "verified",
          currentDepartment: "laboratory",
          status: "pending",
          service: "Laboratory Diagnostics",
          requestedTests: testsToOrder,
          labTestsOrdered: testsToOrder,
          notes: `Doctor Direct Cue: ${testsToOrder.join(", ")}${diagnosis ? ` (Dx: ${diagnosis})` : ""}`,
          timestamp: new Date().toISOString(),
          originDoctorName: "Dr. On Duty"
        });
      }

      // Audio-visual cues & speech announcement
      playAudioTone(880, 0.25);
      setTimeout(() => playAudioTone(1174, 0.35), 260);

      const speechAnnouncement = `Ticket No. ${assignedTicketNo}. ${selectedPatient.patientName}, please proceed immediately to the Laboratory Diagnostic Station for ${testsToOrder.join(" and ")}.`;
      speakStationAnnouncement(speechAnnouncement);

      setRoutingCue({
        ticketNo: assignedTicketNo,
        stationName: assignedStationName,
        stationDepartment: "laboratory",
        instructionText: `Ticket No. ${assignedTicketNo}: Go to Laboratory`,
        patientName: selectedPatient.patientName,
        nationalId: selectedPatient.nationalId,
        diagnosis: diagnosis || `Investigation: ${testsToOrder.join(", ")}`,
        details: routingDetails,
      });

      toast.success(
        `Patient ${selectedPatient.patientName} (${assignedTicketNo}) instantly wired to Laboratory Dashboard Queue for ${testsToOrder.join(", ")}!`,
        "Wired to Lab Queue"
      );

      // Reset states
      setSymptoms("");
      setDiagnosis("");
      setDraftPrescriptions([]);
      setDraftReferrals([]);
      setAiSuggestions([]);
      setAiSummary(null);
      setSelectedPatientId(null);
      onRefreshQueue();
    } catch (err) {
      console.error("Instant cue to lab error:", err);
      toast.error("Failed to wire patient to laboratory. Please check database connection.", "Lab Routing Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedPatient) {
      toast.warning("Please select a patient from the queue or directory first.", "No Patient Selected");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Compile visit record and auto-sync to Firestore master patient record
      const compiledReferrals = draftReferrals.map((r, idx) => ({
        id: `ref-${Date.now()}-${idx}`,
        department: r.department,
        testName: r.testName,
        notes: r.notes,
        status: "pending" as const,
      }));

      await upsertUnifiedPatientRecord({
        id: selectedPatientId,
        patientName: selectedPatient.patientName,
        nationalId: selectedPatient.nationalId,
        phone: selectedPatient.phone,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        bloodType: selectedPatient.bloodType,
        vitals: { temp, bp, pulse, weight },
        symptoms,
        diagnosis,
        prescriptions: draftPrescriptions,
        referrals: compiledReferrals,
        sourceStation: "Doctor's Desk"
      });

      // 2. Synchronize Consultation Fee, Prescriptions, and Diagnostic Referrals to Patient's Live Cart
      try {
        await syncDoctorConsultationToCart({
          patientId: selectedPatientId,
          patientName: selectedPatient.patientName,
          nationalId: selectedPatient.nationalId,
          phone: selectedPatient.phone,
          ticketNo: selectedPatient.activeTicketNo,
          doctorName: "Doctor on Duty",
          isResultsReview,
          prescriptions: draftPrescriptions.map(p => ({
            drugName: p.drugName,
            quantity: p.quantity,
            dosage: p.dosage,
            unitPrice: p.price
          })),
          referrals: compiledReferrals.map(r => ({
            testName: r.testName,
            department: r.department
          }))
        });
      } catch (cartErr) {
        console.warn("Patient cart auto-sync notice:", cartErr);
      }

      // 3. Automated Routing logic
      // Find active queue ticket for this patient (serving or pending in doctor)
      const qSnap = await getDocs(
        query(
          collection(db, "queue"),
          where("patientName", "==", selectedPatient.patientName),
          where("currentDepartment", "==", "doctor")
        )
      );

      let assignedStationName = "Billing & Accounts Clearance Desk";
      let assignedNextDept = "billing";
      let assignedTicketNo = `BIL-${Math.floor(Math.random() * 900 + 100)}`;
      let instructionPhrase = `Ticket No. ${assignedTicketNo}: Go to Billing & Accounts`;
      let routingDetails = "Consultation concluded. Proceed to Billing desk for final invoice clearance.";
      let ticketId: string | null = null;
      let baseNum = Math.floor(Math.random() * 900 + 100);

      if (!qSnap.empty) {
        const ticketDoc = qSnap.docs[0];
        ticketId = ticketDoc.id;
        const ticketData = ticketDoc.data();
        baseNum = ticketData.ticketNo?.split("-")[1] || baseNum;
      }

      const labReferralTests = draftReferrals.filter(r => r.department === "laboratory").map(r => r.testName);

      if (draftReferrals.length > 0) {
        // If e-referrals are present (e.g., Lab or Radiology), auto-route patient to that queue
        const nextDept = draftReferrals[0].department;
        let nextPrefix = "LAB";
        if (nextDept === "radiology") {
          nextPrefix = "RAD";
          assignedStationName = "Radiology & Imaging Unit (Room 106)";
          assignedNextDept = "radiology";
          routingDetails = `Diagnostic Imaging requested: ${draftReferrals.map(r => r.testName).join(", ")}`;
        } else if (nextDept === "labour_room") {
          nextPrefix = "LBR";
          assignedStationName = "Maternity & Labour Ward (Station 3)";
          assignedNextDept = "labour_room";
          routingDetails = `Maternity referral: ${draftReferrals.map(r => r.testName).join(", ")}`;
        } else if (nextDept === "gyna") {
          nextPrefix = "GYN";
          assignedStationName = "Gynaecology Clinic (Room 108)";
          assignedNextDept = "gyna";
          routingDetails = `Specialized Gynaecological consultation: ${draftReferrals.map(r => r.testName).join(", ")}`;
        } else {
          nextPrefix = "LAB";
          assignedStationName = "Laboratory Diagnostic Station (Room 104)";
          assignedNextDept = "laboratory";
          routingDetails = `Diagnostic Tests ordered: ${draftReferrals.map(r => r.testName).join(", ")}`;
        }
        
        assignedTicketNo = `${nextPrefix}-${baseNum}`;
        instructionPhrase = `Ticket No. ${assignedTicketNo}: Go to ${assignedStationName.split("(")[0].trim()}`;

        const updatePayload: any = {
          currentDepartment: nextDept,
          ticketNo: assignedTicketNo,
          status: "pending",
          service: nextDept === "laboratory" ? "Laboratory Diagnostics" : nextDept === "radiology" ? "Radiology Imaging" : "Specialist Referral",
          requestedTests: nextDept === "laboratory" ? labReferralTests : draftReferrals.map(r => r.testName),
          labTestsOrdered: labReferralTests,
          notes: `Referred by Doctor: ${diagnosis || "Diagnostic referral"}. Tests: ${draftReferrals.map(r => r.testName).join(", ")}`,
          timestamp: new Date().toISOString(),
          originDoctorName: "Dr. On Duty"
        };

        if (ticketId) {
          await updateDoc(doc(db, "queue", ticketId), updatePayload);
        } else {
          await addDoc(collection(db, "queue"), {
            ...updatePayload,
            patientName: selectedPatient.patientName,
            patientId: selectedPatient.id,
            nationalId: selectedPatient.nationalId,
            phone: selectedPatient.phone || "",
            age: selectedPatient.age || 0,
            gender: selectedPatient.gender || "Unknown",
            biometricStatus: "verified",
          });
        }
      } else if (draftPrescriptions.length > 0) {
        // If only pharmacy prescription was given, route directly to Pharmacy counter
        assignedTicketNo = `PHA-${baseNum}`;
        assignedStationName = "Hospital Pharmacy & POS (Dispensing Counter 1)";
        assignedNextDept = "pharmacy";
        instructionPhrase = `Ticket No. ${assignedTicketNo}: Go to Pharmacy`;
        routingDetails = `Prescriptions queued for dispensing (${draftPrescriptions.length} items): ${draftPrescriptions.map(p => p.drugName).join(", ")}`;

        const pharmaPayload: any = {
          currentDepartment: "pharmacy",
          ticketNo: assignedTicketNo,
          status: "pending",
          service: "Pharmacy Dispensing",
          notes: `Prescriptions ready (${draftPrescriptions.length} items)`,
          timestamp: new Date().toISOString()
        };

        if (ticketId) {
          await updateDoc(doc(db, "queue", ticketId), pharmaPayload);
        } else {
          await addDoc(collection(db, "queue"), {
            ...pharmaPayload,
            patientName: selectedPatient.patientName,
            patientId: selectedPatient.id,
            nationalId: selectedPatient.nationalId,
            phone: selectedPatient.phone || "",
            age: selectedPatient.age || 0,
            gender: selectedPatient.gender || "Unknown",
            biometricStatus: "verified",
          });
        }
      } else {
        // No referrals/prescriptions -> direct to Billing or discharge
        assignedTicketNo = `BIL-${baseNum}`;
        assignedStationName = "Billing & Accounts Clearance Desk";
        assignedNextDept = "billing";
        instructionPhrase = `Ticket No. ${assignedTicketNo}: Go to Billing & Accounts`;
        routingDetails = "Clinical consultation concluded without medications. Proceed to Billing desk for clearance.";

        const billPayload: any = {
          currentDepartment: "billing",
          ticketNo: assignedTicketNo,
          status: "pending",
          service: "Billing & Discharge Clearance",
          timestamp: new Date().toISOString()
        };

        if (ticketId) {
          await updateDoc(doc(db, "queue", ticketId), billPayload);
        } else {
          await addDoc(collection(db, "queue"), {
            ...billPayload,
            patientName: selectedPatient.patientName,
            patientId: selectedPatient.id,
            nationalId: selectedPatient.nationalId,
            phone: selectedPatient.phone || "",
            age: selectedPatient.age || 0,
            gender: selectedPatient.gender || "Unknown",
            biometricStatus: "verified",
          });
        }
      }

      // Trigger Audio-Visual Cues
      playAudioTone(880, 0.25);
      setTimeout(() => playAudioTone(1174, 0.35), 260);

      const speechAnnouncement = `${instructionPhrase}. ${selectedPatient.patientName}, please proceed immediately to ${assignedStationName.split("(")[0].trim()}.`;
      speakStationAnnouncement(speechAnnouncement);

      setRoutingCue({
        ticketNo: assignedTicketNo,
        stationName: assignedStationName,
        stationDepartment: assignedNextDept,
        instructionText: instructionPhrase,
        patientName: selectedPatient.patientName,
        nationalId: selectedPatient.nationalId,
        diagnosis: diagnosis || "General Clinical Encounter",
        details: routingDetails,
      });

      // Reset states
      setSymptoms("");
      setDiagnosis("");
      setDraftPrescriptions([]);
      setDraftReferrals([]);
      setAiSuggestions([]);
      setAiSummary(null);
      setSelectedPatientId(null);
      onRefreshQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMeds = medications.filter(m =>
    m.name.toLowerCase().includes(searchDrugQuery.toLowerCase())
  );

  return (
    <div id="doctors-desk" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Doctor's Clinical Station</h2>
            <p className="text-xs text-gray-500">Interactive Clinical EHR, Drug Checking & Automated Referrals</p>
          </div>
        </div>

        {/* Called queue select drop */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">Now Serving Room:</label>
          {queueTickets.length === 0 ? (
            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-150">
              No active queue calls
            </span>
          ) : (
            <select
              id="select-active-queue-patient"
              value={selectedPatientId || ""}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold focus:outline-hidden"
            >
              <option value="">-- Choose Queue Patient --</option>
              {queueTickets.map((tick) => {
                const pat = patsFromDbAndQueue(tick.patientName);
                return (
                  <option key={tick.id} value={pat?.id || ""}>
                    {tick.ticketNo} - {tick.patientName}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </div>

      {/* Real-Time Incoming Patient Queue Popup Notification Banner */}
      {incomingPatientPrompt && (
        <div className="mb-6 p-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl shadow-lg border border-emerald-500/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="relative p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl shrink-0">
              <BellRing className="w-6 h-6 text-emerald-300 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-400 text-emerald-950 font-mono font-black text-xs rounded-md shadow-xs">
                  {incomingPatientPrompt.ticketNo}
                </span>
                <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                  Incoming Patient in Queue
                </span>
                {incomingPatientPrompt.specialistTitle && (
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 rounded">
                    {incomingPatientPrompt.specialistTitle}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {incomingPatientPrompt.patientName}
                {incomingPatientPrompt.age ? ` (${incomingPatientPrompt.age} yrs)` : ""}
              </h3>
              <p className="text-xs text-emerald-100/80 line-clamp-1 mt-0.5">
                <strong>Chief Complaint:</strong> {incomingPatientPrompt.issue || "General Consultation / Triage intake"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              id="btn-dismiss-incoming-prompt"
              onClick={() => setIncomingPatientPrompt(null)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              id="btn-accept-incoming-patient"
              onClick={() => handleAcceptIncomingPatient(incomingPatientPrompt)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Accept & Call Patient In</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Selection & History timeline */}
        <div className="lg:col-span-4 space-y-4 border-r border-gray-100 pr-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-500">EHR Patient Selection</label>
              <button
                type="button"
                onClick={() => setShowDoctorHistoryModal(true)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Instant ID Lookup</span>
              </button>
            </div>

            {/* Quick Live Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                id="input-doctor-patient-search"
                type="text"
                value={patientSearchFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setPatientSearchFilter(val);
                  if (val.trim()) {
                    const clean = normalizeString(val);
                    const cleanPhone = normalizePhone(val);
                    const match = patients.find(
                      (p) =>
                        normalizeString(p.nationalId) === clean ||
                        normalizeString(p.id) === clean ||
                        (cleanPhone && normalizePhone(p.phone) === cleanPhone)
                    );
                    if (match) {
                      setSelectedPatientId(match.id);
                    }
                  }
                }}
                placeholder="Type National ID, Phone or Name..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
              {patientSearchFilter && (
                <button
                  type="button"
                  onClick={() => setPatientSearchFilter("")}
                  className="absolute right-2.5 top-2 text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              id="select-any-patient"
              value={selectedPatientId || ""}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-emerald-500 bg-white"
            >
              <option value="">-- Choose from Patient Files ({patients.length}) --</option>
              {patients
                .filter((p) => {
                  if (!patientSearchFilter.trim()) return true;
                  const clean = normalizeString(patientSearchFilter);
                  const cleanPhone = normalizePhone(patientSearchFilter);
                  return (
                    normalizeString(p.nationalId).includes(clean) ||
                    normalizeString(p.id).includes(clean) ||
                    normalizeString(p.patientName).includes(clean) ||
                    (cleanPhone && normalizePhone(p.phone).includes(cleanPhone))
                  );
                })
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patientName} (ID: {p.nationalId || "N/A"} • {p.age}y, {p.gender})
                  </option>
                ))}
            </select>
          </div>

          {selectedPatient ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2 relative">
                <button
                  id="btn-ai-summarize-timeline"
                  onClick={fetchEHRAISummary}
                  disabled={aiSummaryLoading}
                  className="absolute right-3 top-3 px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                  {aiSummaryLoading ? "Summarizing..." : "AI Timeline Synthesis"}
                </button>

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Active EHR Bio</h3>
                <p className="text-sm font-bold text-gray-900">{selectedPatient.patientName}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                  <p>National ID: <span className="font-mono font-bold text-gray-900">{selectedPatient.nationalId || "N/A"}</span></p>
                  <p>Age: <span className="font-semibold">{selectedPatient.age} years</span></p>
                  <p>Gender: <span className="font-semibold">{selectedPatient.gender}</span></p>
                  <p>
                    Blood Type:{" "}
                    {selectedPatient.bloodType === "Not Sure" || !selectedPatient.bloodType ? (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                        Not Sure (Lab Test Needed)
                      </span>
                    ) : (
                      <span className="font-semibold text-rose-700">{selectedPatient.bloodType}</span>
                    )}
                  </p>
                  <p>Past Visits: <span className="font-bold text-indigo-700">{selectedPatient.visits?.length || 1} on file</span></p>
                  <p>SHA Code: <span className="font-mono font-bold text-[10px]">{selectedPatient.shaId || "N/A"}</span></p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDoctorHistoryModal(true)}
                  className="w-full mt-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Inspect Full Historical Chart & Prior Treatments</span>
                </button>

                {/* Quick Referral, Staff Chat & Kenyan Statutory Forms Hub Actions */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {onOpenTransferModal && (
                      <button
                        id="btn-quick-patient-transfer"
                        type="button"
                        onClick={() => onOpenTransferModal({
                          patientName: selectedPatient.patientName,
                          nationalId: selectedPatient.nationalId || "",
                          age: selectedPatient.age,
                          gender: selectedPatient.gender,
                          symptoms: symptoms,
                          diagnosis: diagnosis,
                          vitals: { temp, bp, pulse, weight }
                        })}
                        className="flex-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-blue-200 transition-colors cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Transfer / Refer</span>
                      </button>
                    )}
                    {onOpenChatModal && (
                      <button
                        id="btn-quick-patient-chat"
                        type="button"
                        onClick={() => onOpenChatModal("all", {
                          patientName: selectedPatient.patientName,
                          nationalId: selectedPatient.nationalId || "",
                          diagnosis: diagnosis || symptoms
                        })}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Staff Chat</span>
                      </button>
                    )}
                    <button
                      id="btn-open-patient-cart"
                      type="button"
                      onClick={() => setShowCartModal(true)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors cursor-pointer"
                      title="View & Add Live Charges to Patient Cart"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Patient Cart</span>
                    </button>
                    <button
                      id="btn-open-direct-inpatient-admission"
                      type="button"
                      onClick={() => setShowAdmissionModal(true)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-amber-200 transition-colors cursor-pointer"
                      title="Admit Patient directly to Inpatient Ward"
                    >
                      <Bed className="w-3.5 h-3.5 text-amber-700" />
                      <span>Admit to Ward</span>
                    </button>
                  </div>

                  {/* Primary Kenyan Medical Forms Trigger Button */}
                  <button
                    id="btn-open-kenyan-forms-hub"
                    type="button"
                    onClick={() => {
                      setActiveKenyanFormType("discharge_summary");
                      setKenyanFormModalOpen(true);
                    }}
                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-200" />
                    <span>Discharge summary & Forms</span>
                  </button>
                </div>
              </div>

              {/* AI summary rendering */}
              {aiSummary && (
                <div id="ai-summary-card" className="p-4 bg-purple-50/40 border border-purple-100 rounded-xl text-xs text-purple-900 space-y-2">
                  <h4 className="font-bold flex items-center gap-1 text-purple-950">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Gemini Medical Insight</span>
                  </h4>
                  <div className="whitespace-pre-line leading-relaxed text-purple-950">{aiSummary}</div>
                </div>
              )}

              {/* Patient timeline events */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Chronological Visits Timeline</h3>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {selectedPatient.visits.map((v, idx) => (
                    <div key={v.id || idx} className="p-3 border border-gray-100 bg-white rounded-xl space-y-1 text-xs relative">
                      <span className="absolute right-2 top-2 text-[9px] text-gray-400 font-medium">{v.date}</span>
                      <p className="font-bold text-emerald-800">Clinical Event #{selectedPatient.visits.length - idx}</p>
                      <p className="font-medium text-gray-800">Diagnosis: <span className="font-normal text-gray-600">{v.diagnosis}</span></p>
                      <p className="text-gray-500">Symptoms: <span className="italic">{v.symptoms}</span></p>
                      {v.prescriptions?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1 border-t border-gray-50 pt-2">
                          <p className="text-[10px] text-gray-500 font-medium w-full">Prescribed: {v.prescriptions.map(p => p.drugName).join(", ")}</p>
                          <button
                            id={`btn-print-rx-${v.id || idx}`}
                            type="button"
                            onClick={() => {
                              setPrintTarget({ patient: selectedPatient, visit: v });
                              setPrintOpen(true);
                            }}
                            className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer border border-emerald-150 transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            <span>PPB e-Rx</span>
                          </button>
                          <button
                            id={`btn-print-sick-${v.id || idx}`}
                            type="button"
                            onClick={() => {
                              setSelectedFormVisit(v);
                              setActiveKenyanFormType("sick_sheet");
                              setKenyanFormModalOpen(true);
                            }}
                            className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer border border-amber-200 transition-colors"
                          >
                            <Award className="w-3 h-3" />
                            <span>Sick Sheet</span>
                          </button>
                          <button
                            id={`btn-print-ref-${v.id || idx}`}
                            type="button"
                            onClick={() => {
                              setSelectedFormVisit(v);
                              setActiveKenyanFormType("referral_moh268");
                              setKenyanFormModalOpen(true);
                            }}
                            className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer border border-blue-200 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>MOH 268</span>
                          </button>
                          <button
                            id={`btn-print-dis-${v.id || idx}`}
                            type="button"
                            onClick={() => {
                              setSelectedFormVisit(v);
                              setActiveKenyanFormType("discharge_summary");
                              setKenyanFormModalOpen(true);
                            }}
                            className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer border border-purple-200 transition-colors"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>Discharge</span>
                          </button>
                        </div>
                      )}
                      {v.referrals?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.referrals.map((r, rIdx) => (
                            <span key={rIdx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-semibold rounded uppercase border border-blue-100">
                              {r.department} referral
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-4 text-xs text-gray-400">
              <ClipboardList className="w-8 h-8 mb-2 opacity-30" />
              <span>Select called patient from queue drop or search EHR files above.</span>
            </div>
          )}
        </div>

        {/* Consultation Worksheets */}
        <div className="lg:col-span-8">
          {selectedPatient ? (
            <form onSubmit={handleSaveConsultation} className="space-y-6">
              {/* Diagnostic Results Loopback Review Card (Kenyan Standard: Lab/Rad -> Doctor Review without duplicate fee) */}
              {(isResultsReview || latestDiagnosticResults.length > 0) && (
                <div id="diagnostic-results-review-panel" className="p-4 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-400/40 space-y-3 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-indigo-700/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30">
                        <FlaskRound className="w-4 h-4 text-indigo-300 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black tracking-wide text-white uppercase">Diagnostic Results Received (LIS / PACS)</h4>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold rounded-full">
                            Results Review (No 2nd Consultation Charge)
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-200">Values returned by Ancillary Diagnostics Station for clinical decision-making</p>
                      </div>
                    </div>
                    {activeServingTicket?.labSummary && (
                      <span className="px-2.5 py-1 bg-white/10 text-white font-mono text-[10px] font-bold rounded-lg border border-white/20">
                        LIS Transmit Ready
                      </span>
                    )}
                  </div>

                  {/* Rendered diagnostic values */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {latestDiagnosticResults.length > 0 ? (
                      latestDiagnosticResults.slice(0, 4).map((res, rIdx) => {
                        const isHaemogram =
                          isHaemogramReport(res.findings) ||
                          res.test.toLowerCase().includes("haemogram") ||
                          res.test.toLowerCase().includes("cbc");

                        if (isHaemogram) {
                          return (
                            <div key={rIdx} className="col-span-1 md:col-span-2">
                              <HaemogramDocument
                                data={res.findings}
                                patientMeta={{
                                  name: selectedPatient?.patientName,
                                  age: selectedPatient?.age,
                                  gender: selectedPatient?.gender,
                                  patientNo: selectedPatient?.nationalId || selectedPatient?.patientNumber || selectedPatient?.phone,
                                  date: res.date,
                                  doctor: "Dr. On Duty",
                                  facilityName: "AfyaCare Diagnostic Center"
                                }}
                                mode="inline"
                              />
                            </div>
                          );
                        }

                        return (
                          <div key={rIdx} className="p-3.5 bg-white text-slate-900 rounded-2xl border border-indigo-200 text-xs space-y-2 shadow-xs">
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span className="font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded">
                                {res.dept}
                              </span>
                              <span className="font-mono">{res.date}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="font-black text-slate-900 text-xs">{res.test}</p>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Verified Result
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium text-xs leading-relaxed whitespace-pre-line">
                              {res.findings}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 p-3.5 bg-white/10 rounded-xl text-xs text-indigo-200">
                        {activeServingTicket?.labSummary || activeServingTicket?.notes || "Diagnostic parameters returned and attached to encounter record."}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical notes and vitals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vitals */}
                <div className="p-4 border border-gray-150 rounded-xl bg-gray-50/30 space-y-3">
                  <h3 className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span>Real-time Patient Vitals</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Temp (°C)</label>
                      <input
                        id="input-vital-temp"
                        type="text"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Blood Pressure</label>
                      <input
                        id="input-vital-bp"
                        type="text"
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Pulse (bpm)</label>
                      <input
                        id="input-vital-pulse"
                        type="text"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Weight (kg)</label>
                      <input
                        id="input-vital-weight"
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Patient Presenting Complaints */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Presenting Symptoms</label>
                    <textarea
                      id="input-complaints"
                      rows={2}
                      placeholder="Enter patient presenting complaints and history of present illness..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-gray-600">Clinical Diagnosis</label>
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200">
                          {mohCategory}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowIcdDropdown(!showIcdDropdown)}
                        className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Activity className="w-3 h-3 text-emerald-600" />
                        <span>{showIcdDropdown ? "Close ICD-10 List" : "Quick ICD-10 Kenya Pick"}</span>
                      </button>
                    </div>
                    <input
                      id="input-diagnosis"
                      type="text"
                      placeholder="e.g. B54 Unspecified Malaria or Acute Tonsillitis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                    />

                    {/* ICD-10 Quick picker popover */}
                    {showIcdDropdown && (
                      <div className="p-2.5 bg-white border border-emerald-200 rounded-xl shadow-lg z-20 space-y-2 mt-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Common Kenyan MOH Top Diagnoses</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {COMMON_ICD10_KENYA.map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => {
                                setDiagnosis(`${item.code} - ${item.name}`);
                                setShowIcdDropdown(false);
                              }}
                              className="text-left p-1.5 rounded-lg hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 text-xs transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="font-medium text-gray-800 text-[11px] truncate">{item.name}</span>
                              <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded ml-1">{item.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pharmacy Real-time verification & prescribing */}
              <div className="p-4 border border-gray-150 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>1. Intelligent Prescription & Stock Matching</span>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                    Real-time Pharmacy Stock Sync
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4 relative">
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Search Drug Inventory</label>
                    <input
                      id="input-search-med"
                      type="text"
                      placeholder="Type drug name (e.g. Amox)..."
                      value={searchDrugQuery}
                      onChange={(e) => setSearchDrugQuery(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    />
                    {searchDrugQuery && (
                      <div className="absolute left-0 right-0 mt-1 max-h-[140px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 text-xs">
                        {filteredMeds.map((med) => {
                          const isExpiringSoon = false; // logic placeholder
                          return (
                            <button
                              key={med.id}
                              id={`btn-select-med-${med.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedDrug(med);
                                setSearchDrugQuery("");
                              }}
                              className="w-full text-left p-2 hover:bg-gray-50 border-b border-gray-100 flex justify-between items-center"
                            >
                              <div>
                                <p className="font-bold text-gray-800">{med.name}</p>
                                <p className="text-[9px] text-gray-400 font-mono">Batch: {med.batchNo} • Exp: {med.expiryDate}</p>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                med.quantity <= 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                                  : med.quantity < med.minThreshold
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }`}>
                                {med.quantity <= 0 ? "Out of Stock" : `${med.quantity} tabs`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-4">
                    {selectedDrug && (
                      <div id="selected-drug-details" className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] h-full flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-gray-800">{selectedDrug.name}</p>
                          <p className="text-gray-400">Category: {selectedDrug.category}</p>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="font-semibold text-emerald-600 font-mono">Qty Avail: {selectedDrug.quantity}</span>
                          <span className="text-[9px] text-gray-400">Exp: {selectedDrug.expiryDate}</span>
                        </div>
                        {selectedDrug.quantity <= 0 && (
                          <div className="text-[9px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Triggers AI Alternatives suggestion on Prescribe</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-4 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">Dosage</label>
                      <input
                        id="input-prescribe-dosage"
                        type="text"
                        value={prescribeDosage}
                        onChange={(e) => setPrescribeDosage(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">Qty</label>
                      <input
                        id="input-prescribe-qty"
                        type="number"
                        min={1}
                        value={prescribeQty}
                        onChange={(e) => setPrescribeQty(parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    id="input-prescribe-instructions"
                    type="text"
                    placeholder="Instructions: e.g. Take after meals, twice daily"
                    value={prescribeInstructions}
                    onChange={(e) => setPrescribeInstructions(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-hidden"
                  />
                  <button
                    id="btn-add-prescription"
                    type="button"
                    onClick={handlePrescribeAdd}
                    disabled={!selectedDrug}
                    className="px-4 py-1.5 bg-gray-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    Prescribe Medication
                  </button>
                </div>

                {/* Render Draft prescriptions */}
                {draftPrescriptions.length > 0 && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Draft Prescriptions (Dispatched on Save)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {draftPrescriptions.map((p, idx) => (
                        <div key={idx} className="p-2 border border-emerald-100 bg-emerald-50/10 rounded-lg text-xs flex justify-between items-center">
                          <div>
                            <p className="font-bold text-gray-800">{p.drugName} (x{p.quantity})</p>
                            <p className="text-[10px] text-emerald-700">{p.dosage} • {p.instructions}</p>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Pending Dispense
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render AI drug suggestions when drug is out of stock */}
                {aiLoading && (
                  <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl text-center text-xs text-purple-900 flex justify-center items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                    <span>Clinical system is checking drug stock alternatives via Gemini AI...</span>
                  </div>
                )}

                {aiSuggestions.length > 0 && (
                  <div id="ai-alternative-suggestions" className="p-4 bg-purple-50/30 border-2 border-purple-100 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                      <span>Gemini-Suggested Alternatives (Generic Substitutes Available)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {aiSuggestions.map((sug, idx) => (
                        <div key={idx} className="bg-white p-3 border border-purple-150 rounded-lg text-xs flex flex-col justify-between space-y-2 shadow-xs">
                          <div>
                            <p className="font-bold text-purple-900">{sug.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">Dosage: {sug.dosageStrength}</p>
                            <p className="text-[10px] text-purple-950 mt-1 font-medium">{sug.justification}</p>
                          </div>
                          <div className="border-t border-purple-50 pt-2 text-[9px] text-amber-700">
                            <strong>Note:</strong> {sug.precaution}
                          </div>
                          <button
                            id={`btn-accept-ai-${idx}`}
                            type="button"
                            onClick={() => {
                              // Find matched medication in db by name to obtain batch/price details
                              const matchedMed = medications.find(m => m.name.toLowerCase().includes(sug.name.toLowerCase())) || {
                                name: sug.name,
                                quantity: 100,
                                batchNo: "AI-BATCH",
                                expiryDate: "2027-12-31",
                                price: 150
                              };
                              setSelectedDrug({ id: `ai-${idx}`, category: "AI-Suggested", minThreshold: 5, ...matchedMed } as Medication);
                              setAiSuggestions([]);
                            }}
                            className="w-full py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold"
                          >
                            Accept AI Alternative
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Department referrals & Instant Lab Wiring */}
              <div className="p-4 border-2 border-blue-100 bg-blue-50/20 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <FlaskConical className="w-4.5 h-4.5 text-blue-600" />
                      <span>2. Diagnostic Pathways & Ancillary E-Referrals</span>
                    </h3>
                    <p className="text-[11px] text-blue-800/80">
                      Instantly cued patients are transferred in real-time to the Laboratory / Imaging queue.
                    </p>
                  </div>

                  {/* Instant 1-Click Lab Wiring Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      id="btn-wire-standard-lab"
                      onClick={() => handleInstantCueToLab(["Urinalysis", "Full Haemogram"], "Doctor Order: Standard Diagnostic Workup (Urinalysis & Full Haemogram)")}
                      disabled={submitting}
                      className="px-3 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      title="Immediately dispatch patient to Lab Queue with Urinalysis & Full Haemogram"
                    >
                      <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
                      <span>⚡ Wire Urinalysis & Full Haemogram</span>
                    </button>

                    <button
                      type="button"
                      id="btn-instant-wire-lab"
                      onClick={() => handleInstantCueToLab()}
                      disabled={submitting}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      title="Dispatch selected queued referrals to Lab"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
                      <span>Send Selected to Lab</span>
                    </button>
                  </div>
                </div>

                {/* Quick Lab Presets Grid */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-rose-500" />
                      <span>Frequent Clinical Lab Order Presets (Click to add or wire):</span>
                    </label>
                    <span className="text-[10px] text-blue-600 font-medium">Auto-populates Lab Worksheet</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Urinalysis (Complete Dipstick & Micro)", dept: "laboratory", badge: "Urinalysis", color: "amber" },
                      { name: "Full Haemogram (CBC + Diff + Film)", dept: "laboratory", badge: "Full Haemogram", color: "rose" },
                      { name: "Blood Slide for Malaria (BS for MPS)", dept: "laboratory", badge: "BS Malaria", color: "purple" },
                      { name: "Blood Grouping & Rh Crossmatch", dept: "laboratory", badge: "Blood Grouping", color: "red" },
                      { name: "Stool Routine & Microscopy", dept: "laboratory", badge: "Stool O/C", color: "emerald" },
                      { name: "Liver Function Tests (LFTs)", dept: "laboratory", badge: "LFTs", color: "blue" },
                      { name: "Renal Profile / U&E", dept: "laboratory", badge: "Renal U&E", color: "indigo" },
                      { name: "Random Blood Sugar (RBS)", dept: "laboratory", badge: "RBS Glucose", color: "teal" },
                      { name: "Chest X-Ray PA View", dept: "radiology", badge: "CXR", color: "slate" },
                    ].map((item) => {
                      const isSelected = draftReferrals.some(r => r.testName.toLowerCase().includes(item.badge.toLowerCase()));
                      return (
                        <button
                          key={item.badge}
                          type="button"
                          onClick={() => {
                            addReferralDraft(item.name, item.dept, `Doctor requested: ${item.name}`);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                              : "bg-white text-slate-700 border-blue-200 hover:bg-blue-50 hover:border-blue-400"
                          }`}
                        >
                          <span>+ {item.badge}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                  <div className="md:col-span-3">
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Target Ancillary</label>
                    <select
                      id="select-referral-dept"
                      value={referralDept}
                      onChange={(e) => setReferralDept(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-medium"
                    >
                      <option value="laboratory">Laboratory (LIS)</option>
                      <option value="radiology">Radiology (DICOM)</option>
                      <option value="labour_room">Labour Room (Maternity)</option>
                      <option value="gyna">Gynecology (Gyna)</option>
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Requested Procedure/Test</label>
                    <input
                      id="input-referral-test"
                      type="text"
                      placeholder="e.g. Urinalysis, Full Haemogram, CXR..."
                      value={referralTestName}
                      onChange={(e) => setReferralTestName(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Clinical Indication / Instructions</label>
                    <div className="flex gap-2">
                      <input
                        id="input-referral-notes"
                        type="text"
                        placeholder="Clinical rationale or suspicion..."
                        value={referralNotes}
                        onChange={(e) => setReferralNotes(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                      />
                      <button
                        id="btn-add-referral-draft"
                        type="button"
                        onClick={() => addReferralDraft()}
                        disabled={!referralTestName}
                        className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Queue Test
                      </button>
                    </div>
                  </div>
                </div>

                {/* Referral list */}
                {draftReferrals.length > 0 && (
                  <div className="space-y-2 border-t border-blue-200/60 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-blue-950 uppercase tracking-wide">
                        E-Referrals Queue ({draftReferrals.length} Ordered — Dispatched Instantly to Lab Dashboard on Save)
                      </p>
                      <button
                        type="button"
                        onClick={() => handleInstantCueToLab(draftReferrals.filter(r => r.department === "laboratory").map(r => r.testName))}
                        className="text-[10px] text-blue-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>Send to Lab Now</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {draftReferrals.map((r, idx) => (
                        <div key={idx} className="px-3 py-2 border border-blue-200 bg-white rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs">
                          <div>
                            <span className="font-bold text-blue-950 uppercase text-[9px] bg-blue-100 px-1.5 py-0.5 rounded mr-1.5">
                              {r.department}
                            </span>
                            <span className="font-bold text-slate-800">{r.testName}</span>
                            {r.notes && <span className="text-[10px] text-slate-500 block">{r.notes}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => setDraftReferrals(draftReferrals.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                            title="Remove draft test"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Save Consultation & Instant Lab Dispatch */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <button
                  id="btn-save-consultation"
                  type="submit"
                  disabled={submitting}
                  className="sm:col-span-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting
                      ? "Signing Records & Dispatching Patient..."
                      : draftReferrals.some(r => r.department === "laboratory")
                      ? "Complete Consultation & Wire Patient to Lab"
                      : "Complete Consultation & Dispatch Patient"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInstantCueToLab()}
                  disabled={submitting}
                  className="sm:col-span-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Wire to Lab Directly</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <Heart className="w-12 h-12 mb-3 text-rose-300 opacity-50 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-800">EHR Workspace Waiting</h3>
              <p className="text-xs max-w-sm mt-1">
                Please select a patient using the EHR dropdown on the left or click "Call Now" in the Queue dashboard above to begin drafting the clinical consultation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Print Overlay Modal for Prescriptions */}
      <PrintDocument
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        type="prescription"
        prescriptionData={printTarget}
      />

      {/* Dynamic Audio-Visual Triage Routing Modal */}
      {routingCue && (
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border-2 border-emerald-500 overflow-hidden">
            {/* Header Banner */}
            <div className="p-6 bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl">
                    <Volume2 className="w-5 h-5 text-emerald-300 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-emerald-300">
                      Triage Routing & Audio-Visual Cue
                    </h3>
                    <p className="text-sm font-semibold text-white/90">Clinical Consultation Dispatched</p>
                  </div>
                </div>
                <button
                  onClick={() => setRoutingCue(null)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Station Instruction Banner */}
              <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-400/50 rounded-2xl text-center space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-200">Station Routing Order</p>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight text-emerald-300">
                  {routingCue.instructionText}
                </h2>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <span className="w-2 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-6 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-8 bg-emerald-200 rounded-full animate-bounce"></span>
                  <span className="w-2 h-6 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                </div>
              </div>
            </div>

            {/* Patient & Next Station Details */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Patient Name</span>
                  <span className="font-extrabold text-sm text-gray-900">{routingCue.patientName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">National ID / Passport</span>
                  <span className="font-mono font-bold text-gray-800">{routingCue.nationalId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Clinical Diagnosis</span>
                  <span className="font-semibold text-gray-800">{routingCue.diagnosis}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Target Station</span>
                  <span className="font-bold text-emerald-700">{routingCue.stationName}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                <p className="font-bold text-[11px] mb-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Clinical Handover Instructions:</span>
                </p>
                <p className="text-[11px] text-emerald-800">{routingCue.details}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playAudioTone(880, 0.25);
                    speakStationAnnouncement(`${routingCue.instructionText}. ${routingCue.patientName}, please proceed immediately to ${routingCue.stationName.split("(")[0].trim()}.`);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>Replay Audio Cue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRoutingCue(null)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Acknowledge & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kenyan Statutory Hospital Forms Hub Modal */}
      {selectedPatient && (
        <KenyanHospitalFormsModal
          isOpen={kenyanFormModalOpen}
          onClose={() => setKenyanFormModalOpen(false)}
          patient={selectedPatient}
          visit={
            selectedFormVisit || (selectedPatient.visits && selectedPatient.visits.length > 0 ? selectedPatient.visits[0] : {
              id: "active-draft",
              date: new Date().toISOString().split("T")[0],
              doctor: "Dr. Doctor In-Charge (KMPDC #A.4892)",
              symptoms: symptoms,
              diagnosis: diagnosis || "Clinical Outpatient Evaluation",
              vitals: { temp, bp, pulse, weight },
              prescriptions: draftPrescriptions,
              referrals: draftReferrals
            })
          }
          initialFormType={activeKenyanFormType}
        />
      )}

      {/* Instant Patient EHR History Lookup Modal */}
      <PatientHistoryLookupModal
        isOpen={showDoctorHistoryModal}
        onClose={() => setShowDoctorHistoryModal(false)}
        initialSearchId={selectedPatient?.nationalId || patientSearchFilter}
        onSelectPatientForDoctor={(p) => {
          setSelectedPatientId(p.id);
          toast.success(`Loaded clinical chart for ${p.patientName}`, "Patient Record Retrieved");
        }}
      />

      {/* Patient Live Cart & Charges Modal */}
      {selectedPatient && (
        <PatientCartPOSModal
          isOpen={showCartModal}
          onClose={() => setShowCartModal(false)}
          patientId={selectedPatient.id}
          patientName={selectedPatient.patientName}
          nationalId={selectedPatient.nationalId}
          phone={selectedPatient.phone}
          ticketNo={selectedPatient.activeTicketNo}
          currentUser={{ name: "Dr. Attending Physician", role: "Doctor" }}
          medications={medications}
        />
      )}

      {/* Direct Inpatient Ward Admission Modal (Kenyan OPD -> IPD Handshake) */}
      {showAdmissionModal && selectedPatient && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
                  <Bed className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Direct Inpatient Admission</h3>
                  <p className="text-xs text-amber-200">Initiate Hospital Admission & Ward Handshake</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdmissionModal(false)}
                className="p-1 text-white/70 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectInpatientAdmission} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1">
                <p className="font-bold text-amber-950 text-xs">Patient: {selectedPatient.patientName}</p>
                <p className="text-amber-800 text-[11px]">
                  ID: {selectedPatient.nationalId || "N/A"} • Age: {selectedPatient.age}y • Gender: {selectedPatient.gender}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Select Inpatient Ward</label>
                <select
                  id="select-admission-ward"
                  value={admissionWardId}
                  onChange={(e) => setAdmissionWardId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:border-amber-500 font-semibold"
                >
                  {DEFAULT_HOSPITAL_WARDS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.floor}) • Daily Rate: KES {w.dailyBaseRate.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Admission Working Diagnosis</label>
                <input
                  id="input-admission-diagnosis"
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Severe Dehydration / Acute Appendicitis"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:border-amber-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Clinical Admission Notes & Nursing Orders</label>
                <textarea
                  id="input-admission-notes"
                  rows={3}
                  value={admissionNotes}
                  onChange={(e) => setAdmissionNotes(e.target.value)}
                  placeholder="Enter initial ward orders (IV Fluids, Q4H Vitals, NPO, etc.)..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-inpatient-admission"
                  type="submit"
                  disabled={isAdmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Bed className="w-4 h-4" />
                  <span>{isAdmitting ? "Allocating Bed..." : "Admit & Book Ward Bed"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

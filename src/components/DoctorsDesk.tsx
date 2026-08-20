import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, getDocs, query, where } from "firebase/firestore";
import { MedicalRecord, Medication, QueueTicket, PrescriptionItem, ClinicalVisit } from "../types";
import { upsertUnifiedPatientRecord, findUnifiedPatient } from "../lib/patientSyncService";
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
  CheckCircle2
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import { toast } from "../lib/promptService";

interface DoctorsDeskProps {
  toggles: any;
  onRefreshQueue: () => void;
  activeSpecialistId?: string;
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

export default function DoctorsDesk({ toggles, onRefreshQueue, activeSpecialistId }: DoctorsDeskProps) {
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [pendingQueueTickets, setPendingQueueTickets] = useState<QueueTicket[]>([]);
  const [incomingPatientPrompt, setIncomingPatientPrompt] = useState<QueueTicket | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Audio-visual routing modal state
  const [routingCue, setRoutingCue] = useState<RoutingCueInfo | null>(null);

  // Printing digital prescription states
  const [printOpen, setPrintOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<{ patient: MedicalRecord; visit: ClinicalVisit } | null>(null);

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
      speakStationAnnouncement(`Calling ${ticket.patientName}. Ticket ${ticket.ticketNo}. Please enter consultation room.`);
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

  const addReferralDraft = () => {
    if (!referralTestName) return;
    setDraftReferrals([
      ...draftReferrals,
      {
        department: referralDept,
        testName: referralTestName,
        notes: referralNotes,
      },
    ]);
    setReferralTestName("");
    setReferralNotes("");
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

      // 3. Automated Routing logic
      // Find active queue ticket for this patient (serving in doctor)
      const qSnap = await getDocs(
        query(
          collection(db, "queue"),
          where("patientName", "==", selectedPatient.patientName),
          where("currentDepartment", "==", "doctor"),
          where("status", "==", "serving")
        )
      );

      let assignedStationName = "Billing & Accounts Clearance Desk";
      let assignedNextDept = "billing";
      let assignedTicketNo = `BIL-${Math.floor(Math.random() * 900 + 100)}`;
      let instructionPhrase = `Ticket No. ${assignedTicketNo}: Go to Billing & Accounts`;
      let routingDetails = "Consultation concluded. Proceed to Billing desk for final invoice clearance.";

      if (!qSnap.empty) {
        const ticketDoc = qSnap.docs[0];
        const ticketId = ticketDoc.id;
        const ticketData = ticketDoc.data();
        const baseNum = ticketData.ticketNo?.split("-")[1] || Math.floor(Math.random() * 900 + 100);

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

          await updateDoc(doc(db, "queue", ticketId), {
            currentDepartment: nextDept,
            ticketNo: assignedTicketNo,
            status: "pending", // place them back to pending queue for lab/rad
            notes: `Referred by Doctor: ${diagnosis || "Diagnostic referral"}`,
          });
        } else if (draftPrescriptions.length > 0) {
          // If only pharmacy prescription was given, route directly to Pharmacy counter
          assignedTicketNo = `PHA-${baseNum}`;
          assignedStationName = "Hospital Pharmacy & POS (Dispensing Counter 1)";
          assignedNextDept = "pharmacy";
          instructionPhrase = `Ticket No. ${assignedTicketNo}: Go to Pharmacy`;
          routingDetails = `Prescriptions queued for dispensing (${draftPrescriptions.length} items): ${draftPrescriptions.map(p => p.drugName).join(", ")}`;

          await updateDoc(doc(db, "queue", ticketId), {
            currentDepartment: "pharmacy",
            ticketNo: assignedTicketNo,
            status: "pending",
            notes: "Prescriptions ready for dispensing",
          });
        } else {
          // No referrals/prescriptions -> direct to Billing or discharge
          assignedTicketNo = `BIL-${baseNum}`;
          assignedStationName = "Billing & Accounts Clearance Desk";
          assignedNextDept = "billing";
          instructionPhrase = `Ticket No. ${assignedTicketNo}: Go to Billing & Accounts`;
          routingDetails = "Clinical consultation concluded without medications. Proceed to Billing desk for clearance.";

          await updateDoc(doc(db, "queue", ticketId), {
            currentDepartment: "billing",
            ticketNo: assignedTicketNo,
            status: "pending",
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
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">EHR Patient Selection</label>
            <select
              id="select-any-patient"
              value={selectedPatientId || ""}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 bg-white"
            >
              <option value="">-- Search EHR Archives --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patientName} ({p.age}y, {p.gender})
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
                  <p>Age: <span className="font-semibold">{selectedPatient.age} years</span></p>
                  <p>Gender: <span className="font-semibold">{selectedPatient.gender}</span></p>
                  <p>Blood Type: <span className="font-semibold">{selectedPatient.bloodType}</span></p>
                  <p>SHA Code: <span className="font-mono font-bold text-[10px]">{selectedPatient.shaId || "N/A"}</span></p>
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
                        <div className="flex flex-col gap-1.5 mt-1 border-t border-gray-50 pt-2">
                          <p className="text-[10px] text-gray-500 font-medium">Prescribed: {v.prescriptions.map(p => p.drugName).join(", ")}</p>
                          <button
                            id={`btn-print-rx-${v.id || idx}`}
                            type="button"
                            onClick={() => {
                              setPrintTarget({ patient: selectedPatient, visit: v });
                              setPrintOpen(true);
                            }}
                            className="w-fit px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded text-[9px] font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-150 transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Digital Prescription (PDF)</span>
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
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Clinical Diagnosis</label>
                    <input
                      id="input-diagnosis"
                      type="text"
                      placeholder="e.g. Acute Bacterial Tonsillitis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                    />
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

              {/* Dynamic Department referrals */}
              <div className="p-4 border border-gray-150 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <ClipboardList className="w-4.5 h-4.5 text-gray-400" />
                  <span>2. Dynamic E-Referrals (Diagnostic Pathways)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-3">
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Target Ancillary</label>
                    <select
                      id="select-referral-dept"
                      value={referralDept}
                      onChange={(e) => setReferralDept(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
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
                      placeholder="e.g. Full Blood Count, Chest X-Ray..."
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
                        placeholder="Clinical rationale..."
                        value={referralNotes}
                        onChange={(e) => setReferralNotes(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                      />
                      <button
                        id="btn-add-referral-draft"
                        type="button"
                        onClick={addReferralDraft}
                        disabled={!referralTestName}
                        className="px-3 py-1.5 bg-gray-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Queue Referral
                      </button>
                    </div>
                  </div>
                </div>

                {/* Referral list */}
                {draftReferrals.length > 0 && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">E-Referrals Queue (Dispatched on Save)</p>
                    <div className="flex flex-wrap gap-2">
                      {draftReferrals.map((r, idx) => (
                        <div key={idx} className="px-3 py-2 border border-blue-100 bg-blue-50/10 rounded-xl text-xs flex items-center justify-between gap-3">
                          <div>
                            <span className="font-bold text-blue-950 uppercase text-[9px] bg-blue-100 px-1.5 py-0.5 rounded mr-1.5">
                              {r.department}
                            </span>
                            <span className="font-semibold text-gray-800">{r.testName}</span>
                          </div>
                          <span className="text-[10px] text-blue-700 font-semibold italic">Auto routing enabled</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                id="btn-save-consultation"
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Signing Records & Re-routing Patient..." : "Complete Consultation & Dispatch Patient"}
              </button>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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
    </div>
  );
}

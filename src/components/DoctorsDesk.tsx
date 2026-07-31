import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, getDocs, query, where } from "firebase/firestore";
import { MedicalRecord, Medication, QueueTicket, PrescriptionItem, ClinicalVisit } from "../types";
import { Heart, Stethoscope, ClipboardList, AlertTriangle, Sparkles, Check, Send, AlertCircle, RefreshCw, FileText, Printer } from "lucide-react";
import PrintDocument from "./PrintDocument";

interface DoctorsDeskProps {
  toggles: any;
  onRefreshQueue: () => void;
  activeSpecialistId?: string;
}

export default function DoctorsDesk({ toggles, onRefreshQueue, activeSpecialistId }: DoctorsDeskProps) {
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
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

    // Listen to Active Queue Tickets for Doctor Department
    const q = query(collection(db, "queue"), where("currentDepartment", "==", "doctor"), where("status", "==", "serving"));
    const unsubQueue = onSnapshot(q, (snapshot) => {
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
        // Find corresponding patient ID
        const matched = patsFromDbAndQueue(tickets[0].patientName);
        if (matched) setSelectedPatientId(matched.id);
      }
    });

    return () => {
      unsubPatients();
      unsubMeds();
      unsubQueue();
    };
  }, [activeSpecialistId]);

  const patsFromDbAndQueue = (name: string) => {
    return patients.find(p => p.patientName.toLowerCase() === name.toLowerCase());
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
      alert("No patient selected.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Compile visit record
      const newVisit: ClinicalVisit = {
        id: `vst-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        vitals: { temp, bp, pulse, weight },
        symptoms,
        diagnosis,
        prescriptions: draftPrescriptions,
        referrals: draftReferrals.map((r, idx) => ({
          id: `ref-${Date.now()}-${idx}`,
          department: r.department,
          testName: r.testName,
          notes: r.notes,
          status: "pending",
        })),
      };

      const updatedVisits = [...selectedPatient.visits, newVisit];

      // 2. Update patient document in Firestore
      const patientRef = doc(db, "patients", selectedPatientId);
      await updateDoc(patientRef, { visits: updatedVisits });

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

      if (!qSnap.empty) {
        const ticketDoc = qSnap.docs[0];
        const ticketId = ticketDoc.id;
        const ticketData = ticketDoc.data();

        if (draftReferrals.length > 0) {
          // If e-referrals are present (e.g., Lab or Radiology), auto-route patient to that queue
          const nextDept = draftReferrals[0].department;
          let nextPrefix = "LAB";
          if (nextDept === "radiology") nextPrefix = "RAD";
          else if (nextDept === "labour_room") nextPrefix = "LBR";
          else if (nextDept === "gyna") nextPrefix = "GYN";
          const newTicketNo = `${nextPrefix}-${ticketData.ticketNo.split("-")[1] || Math.floor(Math.random() * 900 + 100)}`;

          await updateDoc(doc(db, "queue", ticketId), {
            currentDepartment: nextDept,
            ticketNo: newTicketNo,
            status: "pending", // place them back to pending queue for lab/rad
            notes: `Referred by Doctor: ${diagnosis}`,
          });
        } else if (draftPrescriptions.length > 0) {
          // If only pharmacy prescription was given, route directly to Pharmacy counter
          const newTicketNo = `PHA-${ticketData.ticketNo.split("-")[1] || Math.floor(Math.random() * 900 + 100)}`;
          await updateDoc(doc(db, "queue", ticketId), {
            currentDepartment: "pharmacy",
            ticketNo: newTicketNo,
            status: "pending",
            notes: "Prescriptions ready for dispensing",
          });
        } else {
          // No referrals/prescriptions -> direct to Billing or discharge
          const newTicketNo = `BIL-${ticketData.ticketNo.split("-")[1] || Math.floor(Math.random() * 900 + 100)}`;
          await updateDoc(doc(db, "queue", ticketId), {
            currentDepartment: "billing",
            ticketNo: newTicketNo,
            status: "pending",
          });
        }
      }

      // Reset states
      setSymptoms("");
      setDiagnosis("");
      setDraftPrescriptions([]);
      setDraftReferrals([]);
      setAiSuggestions([]);
      setAiSummary(null);
      setSelectedPatientId(null);
      onRefreshQueue();
      alert("Consultation complete. Patient routed to next department queue!");
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
    </div>
  );
}

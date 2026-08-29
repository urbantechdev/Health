import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy, getDocs, where, addDoc } from "firebase/firestore";
import { QueueTicket, MedicalRecord, ClinicalVisit } from "../types";
import { findUnifiedPatient, upsertUnifiedPatientRecord } from "../lib/patientSyncService";
import { addEncounterVital } from "../lib/encounterService";
import { toast } from "../lib/promptService";
import {
  HeartPulse,
  Activity,
  Thermometer,
  Gauge,
  Weight,
  Ruler,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Clock,
  ArrowRight,
  Send,
  Search,
  RefreshCw,
  FileText,
  Sparkles,
  ShieldAlert,
  Printer,
  ChevronRight,
  Phone,
  User,
  ShieldCheck,
  HelpCircle
} from "lucide-react";

interface NurseTriageStationProps {
  onNavigateToDoctor?: () => void;
  onNavigateToQueue?: () => void;
  activeSpecialistId?: string;
}

export default function NurseTriageStation({
  onNavigateToDoctor,
  onNavigateToQueue,
  activeSpecialistId
}: NurseTriageStationProps) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<QueueTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Vitals & Triage Measurement Form State
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [temp, setTemp] = useState("36.8");
  const [pulse, setPulse] = useState("72");
  const [respRate, setRespRate] = useState("18");
  const [spo2, setSpo2] = useState("98");
  const [rbs, setRbs] = useState("5.4"); // Random Blood Sugar (mmol/L)
  const [weight, setWeight] = useState("68");
  const [height, setHeight] = useState("170");
  const [painScale, setPainScale] = useState<number>(0);
  const [allergies, setAllergies] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [nurseNotes, setNurseNotes] = useState("");

  // Triage Urgency / TEWS Scoring
  const [triageCategory, setTriageCategory] = useState<"GREEN" | "YELLOW" | "RED">("GREEN");
  const [targetDoctorDepartment, setTargetDoctorDepartment] = useState("doctor");
  const [targetDoctorClinic, setTargetDoctorClinic] = useState("General OPD Consultation");

  // Listen to Active Queue tickets awaiting Triage
  useEffect(() => {
    const unsubQueue = onSnapshot(collection(db, "queue"), (snapshot) => {
      const allTickets: QueueTicket[] = [];
      snapshot.forEach((docSnap) => {
        allTickets.push({ id: docSnap.id, ...docSnap.data() } as QueueTicket);
      });
      // Sort newest first
      allTickets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTickets(allTickets);
    });

    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const allPatients: MedicalRecord[] = [];
      snapshot.forEach((docSnap) => {
        allPatients.push({ id: docSnap.id, ...docSnap.data() } as MedicalRecord);
      });
      setPatients(allPatients);
    });

    return () => {
      unsubQueue();
      unsubPatients();
    };
  }, []);

  // Filter queue tickets needing triage
  const triageTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Pending tickets in triage or reception stage
      const isTriageDept = t.currentDepartment === "triage" || t.currentDepartment === "reception";
      const isPending = t.status === "pending" || t.status === "serving";
      return isTriageDept && isPending;
    });
  }, [tickets]);

  // Derived BMI Calculation
  const bmiData = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (!w || !h || h <= 0) return { bmi: null, category: "N/A", color: "text-slate-500" };
    const val = parseFloat((w / (h * h)).toFixed(1));
    if (val < 18.5) return { bmi: val, category: "Underweight", color: "text-amber-600" };
    if (val < 25) return { bmi: val, category: "Normal Weight", color: "text-emerald-600" };
    if (val < 30) return { bmi: val, category: "Overweight", color: "text-amber-600" };
    if (val < 35) return { bmi: val, category: "Obesity Class I", color: "text-rose-600" };
    return { bmi: val, category: "Obesity Class II/III", color: "text-rose-700 font-bold" };
  }, [weight, height]);

  // Derived BP Evaluation
  const bpEvaluation = useMemo(() => {
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    if (!sys || !dia) return { label: "N/A", color: "text-slate-500", alert: false };
    if (sys >= 180 || dia >= 120) return { label: "🚨 Hypertensive Crisis (Emergency!)", color: "text-rose-700 bg-rose-50 border-rose-300 font-black", alert: true };
    if (sys >= 140 || dia >= 90) return { label: "⚠️ Stage 2 Hypertension", color: "text-rose-600 bg-rose-50 border-rose-200 font-bold", alert: false };
    if (sys >= 130 || dia >= 80) return { label: "Stage 1 Hypertension", color: "text-amber-700 bg-amber-50 border-amber-200 font-semibold", alert: false };
    if (sys >= 120 && dia < 80) return { label: "Elevated BP", color: "text-amber-600 bg-amber-50 border-amber-100", alert: false };
    if (sys < 90 || dia < 60) return { label: "Hypotension (Low BP)", color: "text-blue-700 bg-blue-50 border-blue-200", alert: false };
    return { label: "Optimal / Normal BP", color: "text-emerald-700 bg-emerald-50 border-emerald-200", alert: false };
  }, [systolic, diastolic]);

  // SpO2 Evaluation
  const spo2Evaluation = useMemo(() => {
    const s = parseInt(spo2);
    if (!s) return null;
    if (s < 90) return { label: "🚨 Critical Hypoxia (<90%)", color: "text-rose-700 font-black" };
    if (s < 95) return { label: "⚠️ Low SpO2 (<95%)", color: "text-amber-700 font-bold" };
    return { label: "Normal (Room Air)", color: "text-emerald-700" };
  }, [spo2]);

  // Auto-detect TEWS / Urgency based on vitals
  useEffect(() => {
    const sys = parseInt(systolic) || 120;
    const sp = parseInt(spo2) || 98;
    const p = parseInt(pulse) || 72;
    const t = parseFloat(temp) || 36.8;

    if (sys >= 180 || sp < 90 || p > 130 || p < 40 || t >= 39.5) {
      setTriageCategory("RED");
    } else if (sys >= 140 || sp < 95 || p > 100 || p < 55 || t >= 38.0 || painScale >= 7) {
      setTriageCategory("YELLOW");
    } else {
      setTriageCategory("GREEN");
    }
  }, [systolic, diastolic, spo2, pulse, temp, painScale]);

  // Select a patient ticket for triage
  const handleSelectTicket = (t: QueueTicket) => {
    setSelectedTicket(t);
    const pat = findUnifiedPatient(t.patientId || t.nationalId || t.patientName, patients);
    if (pat) {
      if (pat.allergies) setAllergies(pat.allergies);
      if (pat.chronicConditions) setChiefComplaint(t.issue || pat.chronicConditions);
      if (pat.latestVitals) {
        if (pat.latestVitals.bp && pat.latestVitals.bp.includes("/")) {
          const parts = pat.latestVitals.bp.split("/");
          setSystolic(parts[0].trim());
          setDiastolic(parts[1].trim());
        }
        if (pat.latestVitals.temp) setTemp(pat.latestVitals.temp);
        if (pat.latestVitals.pulse) setPulse(pat.latestVitals.pulse);
        if (pat.latestVitals.weight) setWeight(pat.latestVitals.weight);
      }
    } else {
      setChiefComplaint(t.issue || "");
    }
  };

  // Transmit vitals and forward to Doctor Desk
  const handleForwardToDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) {
      toast.warning("Please select a patient from the triage queue first.", "No Patient Selected");
      return;
    }

    setSubmitting(true);
    const bpString = `${systolic}/${diastolic}`;
    const compiledVitals = {
      bp: bpString,
      temp: temp.trim(),
      pulse: pulse.trim(),
      respRate: respRate.trim(),
      spo2: spo2.trim(),
      rbs: rbs.trim(),
      weight: weight.trim(),
      height: height.trim(),
      bmi: bmiData.bmi ? `${bmiData.bmi} (${bmiData.category})` : "N/A",
      painScale: `${painScale}/10`,
      recordedAt: new Date().toISOString(),
      recordedBy: "Triage Nurse Officer",
      triageScore: triageCategory,
      notes: nurseNotes.trim()
    };

    try {
      // 1. Locate patient master record
      const matched = findUnifiedPatient(
        selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName,
        patients
      );

      if (matched) {
        const patientRef = doc(db, "patients", matched.id);
        const updatedVisits = [...(matched.visits || [])];

        const notesSummary = `Triage (${triageCategory}) | BP: ${bpString} | Temp: ${temp}°C | HR: ${pulse} bpm | SpO2: ${spo2}% | BMI: ${bmiData.bmi || "-"} | Pain: ${painScale}/10. Complaint: ${chiefComplaint || "Routine Checkup"}. Notes: ${nurseNotes || "None"}`;

        if (updatedVisits.length > 0) {
          const lastVisit = updatedVisits[updatedVisits.length - 1];
          lastVisit.vitals = {
            temp: temp || "36.8",
            bp: bpString,
            pulse: pulse || "72",
            weight: weight || "68",
          };
          if (allergies) lastVisit.allergies = allergies;
          if (chiefComplaint) lastVisit.symptoms = chiefComplaint;
          await updateDoc(patientRef, {
            visits: updatedVisits,
            latestVitals: compiledVitals,
            allergies: allergies || matched.allergies || "",
            updatedAt: new Date().toISOString()
          });
        } else {
          // Create initial visit with triage record
          await updateDoc(patientRef, {
            visits: [{
              id: `vst-${Date.now()}`,
              date: new Date().toISOString().split("T")[0],
              vitals: { temp: temp || "36.8", bp: bpString, pulse: pulse || "72", weight: weight || "68" },
              symptoms: chiefComplaint || "Triage Intake",
              diagnosis: `Triage Priority: ${triageCategory}`,
              prescriptions: [],
              referrals: []
            }],
            latestVitals: compiledVitals,
            allergies: allergies || matched.allergies || "",
            updatedAt: new Date().toISOString()
          });
        }

        // 2. Also attach vital record into active encounter if encounter exists
        if (selectedTicket.encounterId || matched.activeEncounterId) {
          const encId = selectedTicket.encounterId || matched.activeEncounterId;
          if (encId) {
            await addEncounterVital(encId, {
              bp: bpString,
              pulse: pulse,
              respiratoryRate: respRate,
              temp: temp,
              spo2: spo2,
              weight: weight,
              recordedBy: "Triage Nurse Officer"
            });
          }
        }
      }

      // 3. Update Queue ticket to route to Doctor
      const queueRef = doc(db, "queue", selectedTicket.id);
      await updateDoc(queueRef, {
        currentDepartment: "doctor",
        service: targetDoctorClinic,
        status: "pending",
        vitals: {
          bp: bpString,
          temp: temp,
          pulse: pulse,
          weight: weight,
        },
        triageScore: triageCategory,
        notes: `Triage Completed [${triageCategory}] • BP: ${bpString}, HR: ${pulse} bpm, Temp: ${temp}°C, SpO2: ${spo2}%. ${chiefComplaint ? `Complaint: ${chiefComplaint}` : ""}`,
        triageCompletedAt: new Date().toISOString()
      });

      // 4. Vocal Announcement for Patient
      try {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `Ticket ${selectedTicket.ticketNo}, ${selectedTicket.patientName}, please proceed to Doctor Consultation Room for ${targetDoctorClinic}`
          );
          utterance.rate = 0.95;
          utterance.lang = "en-KE";
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.warn("Speech synthesis notice:", e);
      }

      toast.success(
        `Vitals recorded and Ticket #${selectedTicket.ticketNo} (${selectedTicket.patientName}) routed to ${targetDoctorClinic}!`,
        "Triage Complete"
      );

      setSelectedTicket(null);
      setNurseNotes("");
      if (onNavigateToQueue) onNavigateToQueue();
    } catch (err: any) {
      console.error("Triage submission error:", err);
      toast.error("Failed to forward patient to doctor: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="nurse-triage-station" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-pink-900 text-white rounded-3xl p-6 shadow-xl border border-rose-700/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <HeartPulse className="w-8 h-8 text-rose-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/40 text-rose-100 text-[10px] font-black uppercase tracking-wider border border-rose-400/30">
                  Kenya Clinical Protocol • TEWS Standard
                </span>
                <span className="text-xs text-rose-200">OPD / Emergency Intake</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight mt-1">Nurse Triage & Vital Signs Station</h1>
              <p className="text-xs text-rose-150 text-rose-100/80">
                Capture objective biometrics, compute BMI & emergency urgency scores, and route triaged patients to Doctor Stations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-rose-950/50 px-4 py-2.5 rounded-2xl border border-rose-700/60 backdrop-blur-xs">
            <div className="text-right">
              <p className="text-[10px] font-bold text-rose-300 uppercase">Awaiting Triage</p>
              <p className="text-lg font-black text-white">{triageTickets.length} Patients</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-600/50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-rose-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Waiting Triage Queue vs. Vitals Entry Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Triage Queue & Search (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>Triage Queue ({triageTickets.length})</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Real-time sync</span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient by name, ID, or ticket..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>

            {/* Queue Ticket List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {triageTickets.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-2">
                  <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">No patients in triage queue</p>
                  <p className="text-[11px] text-slate-400">Incoming registrations from reception will automatically appear here.</p>
                </div>
              ) : (
                triageTickets
                  .filter((t) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      t.patientName.toLowerCase().includes(q) ||
                      t.ticketNo.toLowerCase().includes(q) ||
                      (t.nationalId && t.nationalId.includes(q))
                    );
                  })
                  .map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    const pat = findUnifiedPatient(t.patientId || t.nationalId || t.patientName, patients);
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTicket(t)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-rose-50/80 border-rose-500 text-rose-950 shadow-sm ring-2 ring-rose-500/20"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                            #{t.ticketNo}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="mt-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{t.patientName}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{t.gender || pat?.gender || "Adult"}</span>
                            <span>•</span>
                            <span>{t.age || pat?.age || 30} yrs</span>
                            {pat?.bloodType && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-rose-700">Blood: {pat.bloodType}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {t.issue && (
                          <p className="mt-2 text-[11px] text-slate-600 bg-slate-100/80 px-2 py-1 rounded-lg line-clamp-1">
                            {t.issue}
                          </p>
                        )}

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="font-bold text-rose-700 flex items-center gap-1">
                            <span>Ready for Vitals</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                          <span className="text-slate-400 uppercase font-mono">
                            {t.service || "General OPD"}
                          </span>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Vitals Measurement & Clinical Triage Form (8 Cols) */}
        <div className="lg:col-span-8">
          {selectedTicket ? (
            <form onSubmit={handleForwardToDoctor} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              
              {/* Selected Patient Banner */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-mono text-[10px] font-black">
                      #{selectedTicket.ticketNo}
                    </span>
                    <span className="text-slate-400 text-xs">Active Triage Intake</span>
                  </div>
                  <h2 className="text-lg font-bold mt-1 text-white">{selectedTicket.patientName}</h2>
                  <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                    <span>National ID: {selectedTicket.nationalId || "N/A"}</span>
                    <span>•</span>
                    <span>Phone: {selectedTicket.phone || "N/A"}</span>
                    <span>•</span>
                    <span>Age: {selectedTicket.age || 30} yrs</span>
                  </p>
                </div>

                {/* Urgency Pill */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">TEWS Triage Score:</span>
                  <div className="flex items-center gap-1.5">
                    {(["GREEN", "YELLOW", "RED"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setTriageCategory(cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          triageCategory === cat
                            ? cat === "RED"
                              ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-400"
                              : cat === "YELLOW"
                              ? "bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300"
                              : "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {cat === "RED" ? "🔴 Emergency" : cat === "YELLOW" ? "🟡 Urgent" : "🟢 Routine"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. Hemodynamic Vital Signs & Biometrics Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-600" />
                    <span>1. Objective Vital Signs & Hemodynamics</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Standard WHO / MoH Clinical Range</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Blood Pressure (Systolic / Diastolic) */}
                  <div className="col-span-2 sm:col-span-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-rose-600" />
                        <span>Blood Pressure (mmHg)</span>
                      </label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bpEvaluation.color}`}>
                        {bpEvaluation.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">Systolic</span>
                        <input
                          type="number"
                          value={systolic}
                          onChange={(e) => setSystolic(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                          placeholder="120"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">Diastolic</span>
                        <input
                          type="number"
                          value={diastolic}
                          onChange={(e) => setDiastolic(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                          placeholder="80"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Body Temperature */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                        <span>Temp (°C)</span>
                      </span>
                      {parseFloat(temp) >= 38.0 && (
                        <span className="text-[9px] font-black text-rose-600 uppercase">Pyrexia / Fever</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="36.8"
                    />
                    <p className="text-[9px] text-slate-400">Normal: 36.5 - 37.5°C</p>
                  </div>

                  {/* Pulse / Heart Rate */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                        <span>Pulse (bpm)</span>
                      </span>
                      {parseInt(pulse) > 100 && (
                        <span className="text-[9px] font-black text-amber-600 uppercase">Tachy</span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="72"
                    />
                    <p className="text-[9px] text-slate-400">Normal: 60 - 100 bpm</p>
                  </div>

                  {/* Oxygen Saturation (SpO2) */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                        <span>SpO2 (%)</span>
                      </span>
                      {spo2Evaluation && (
                        <span className={`text-[9px] font-black ${spo2Evaluation.color}`}>
                          {parseInt(spo2) < 95 ? "Hypoxia" : "OK"}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="98"
                    />
                    <p className="text-[9px] text-slate-400">Normal: &ge; 95%</p>
                  </div>

                  {/* Respiratory Rate */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Resp. Rate (/min)</span>
                      {parseInt(respRate) > 20 && (
                        <span className="text-[9px] font-black text-amber-600 uppercase">Tachypnea</span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={respRate}
                      onChange={(e) => setRespRate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="18"
                    />
                    <p className="text-[9px] text-slate-400">Normal: 12 - 20 /min</p>
                  </div>

                  {/* Random Blood Sugar (RBS) */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      RBS (mmol/L)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={rbs}
                      onChange={(e) => setRbs(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="5.4"
                    />
                    <p className="text-[9px] text-slate-400">Normal: 4.0 - 7.8</p>
                  </div>

                  {/* Body Weight (kg) */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Weight className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Weight (kg)</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="68"
                    />
                  </div>
                </div>

                {/* Anthropometrics & Auto BMI Calculation Banner */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Ruler className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-950">Height & BMI Calculation</p>
                      <p className="text-[11px] text-indigo-700">
                        WHO Anthropometric Classification for adult dosages & care planning
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Height (cm)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-24 px-2 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                        placeholder="170"
                      />
                    </div>

                    <div className="bg-white px-3.5 py-2 rounded-xl border border-indigo-200 text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Computed BMI</p>
                      <p className={`text-sm font-black ${bmiData.color}`}>
                        {bmiData.bmi ? `${bmiData.bmi} kg/m²` : "N/A"}
                      </p>
                      <p className={`text-[10px] font-bold ${bmiData.color}`}>{bmiData.category}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Pain Scale & Allergies */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>2. Pain Assessment & Medical Safety Alerts</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Numeric Pain Rating Scale (0 to 10) */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Numeric Pain Scale (0 - 10):
                      </label>
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-rose-700">
                        {painScale === 0 ? "0 (No Pain)" : painScale < 4 ? `${painScale} (Mild)` : painScale < 7 ? `${painScale} (Moderate)` : `${painScale} (Severe / Excruciating)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-11 gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setPainScale(score)}
                          className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            painScale === score
                              ? score === 0
                                ? "bg-emerald-600 text-white shadow-xs"
                                : score < 4
                                ? "bg-amber-400 text-slate-950 shadow-xs"
                                : score < 7
                                ? "bg-orange-500 text-white shadow-xs"
                                : "bg-rose-600 text-white shadow-xs animate-pulse"
                              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drug Allergies & Safety Alerts */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-rose-800 font-black">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Known Drug / Food Allergies</span>
                      </span>
                      <span className="text-[10px] text-slate-400">e.g., Penicillin, Sulfa, Latex</span>
                    </label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, NSAIDs, None Known (NKDA)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Chief Complaint & Nurse Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Primary Presenting Complaint</label>
                    <input
                      type="text"
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="e.g. Severe throbbing headache with nausea for 3 days"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Nursing Clinical Notes / Observations</label>
                    <input
                      type="text"
                      value={nurseNotes}
                      onChange={(e) => setNurseNotes(e.target.value)}
                      placeholder="e.g. Patient conscious, oriented x3. Ambulatory with slight distress."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Destination Doctor Station / Specialist Clinic */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-rose-600" />
                    <span>3. Forward to Doctor / Specialist Clinic Destination</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    { name: "General OPD Consultation", dept: "doctor" },
                    { name: "Pediatrics & Child Health", dept: "doctor" },
                    { name: "Obstetrics & Gynecology (Gyna)", dept: "gyna" },
                    { name: "Casualty / Emergency Resuscitation", dept: "doctor" },
                    { name: "Dental Surgery Clinic", dept: "doctor" },
                    { name: "Eye / Ophthalmology Clinic", dept: "doctor" }
                  ].map((clinic) => (
                    <button
                      key={clinic.name}
                      type="button"
                      onClick={() => {
                        setTargetDoctorClinic(clinic.name);
                        setTargetDoctorDepartment(clinic.dept);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        targetDoctorClinic === clinic.name
                          ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50"
                      }`}
                    >
                      {clinic.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit & Forward Action Bar */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel / Clear Selection
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting
                      ? "Recording Vitals & Routing Ticket..."
                      : `Complete Triage & Forward Patient #${selectedTicket.ticketNo} to ${targetDoctorClinic}`}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-4 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <HeartPulse className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-800">Nurse Triage Desk Idle</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select a patient waiting in the Triage Queue on the left to begin taking clinical vital signs, assess urgency scores, and forward their file to the Doctor's Desk.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

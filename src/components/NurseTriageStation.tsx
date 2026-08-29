import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy, getDocs, where, addDoc } from "firebase/firestore";
import { QueueTicket, MedicalRecord, ClinicalVisit, Employee } from "../types";
import { findUnifiedPatient, upsertUnifiedPatientRecord } from "../lib/patientSyncService";
import { addEncounterVital } from "../lib/encounterService";
import { toast } from "../lib/promptService";
import { HOSPITAL_SPECIALISTS_DIRECTORY, SPECIALIST_CATEGORIES, SpecialistDefinition, getSpecialistByName } from "../constants/specialists";
import { voiceAnnouncer } from "../lib/voiceAnnouncementService";
import {
  getSmartQueueRecommendation,
  calculateAllDoctorsWorkload,
  getDoctorConsultationRoom,
  DoctorWorkload,
  SpecialtyQueueBalance
} from "../lib/queueLoadBalancer";
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
  HelpCircle,
  Building2,
  X,
  UserCheck2,
  Check,
  Volume2,
  Megaphone,
  Zap,
  Scale,
  Users,
  Award
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
  const [employees, setEmployees] = useState<Employee[]>([]);
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
  
  // Destination Department & Specialist Routing Selection
  const [targetDepartment, setTargetDepartment] = useState("doctor");
  const [targetClinicTitle, setTargetClinicTitle] = useState("General OPD Consultation");
  const [selectedSpecialistName, setSelectedSpecialistName] = useState<string>("");
  const [specialistCategory, setSpecialistCategory] = useState<string>("all");
  const [specialistSearch, setSpecialistSearch] = useState<string>("");
  const [assignedDoctorId, setAssignedDoctorId] = useState<string>("");
  const [targetRoom, setTargetRoom] = useState<string>("Room 101 - General OPD");
  const [autoBalanceMode, setAutoBalanceMode] = useState<boolean>(true);

  // Listen to Active Queue tickets awaiting Triage & Staff Directory
  useEffect(() => {
    const unsubQueue = onSnapshot(collection(db, "queue"), (snapshot) => {
      const allTickets: QueueTicket[] = [];
      snapshot.forEach((docSnap) => {
        allTickets.push({ id: docSnap.id, ...docSnap.data() } as QueueTicket);
      });
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

    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((docSnap) => {
        emps.push({ id: docSnap.id, ...docSnap.data() } as Employee);
      });
      setEmployees(emps);
    });

    return () => {
      unsubQueue();
      unsubPatients();
      unsubEmployees();
    };
  }, []);

  // Filter queue tickets needing triage
  const triageTickets = useMemo(() => {
    return tickets.filter((t) => {
      const dept = (t.currentDepartment || "").toLowerCase();
      const isTriageDept = dept === "triage" || dept === "reception" || dept === "nurse" || dept === "nursing" || dept === "";
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

    // Populate or auto-detect requested clinic/specialist
    if (t.targetClinic) {
      setTargetClinicTitle(t.targetClinic);
    } else if (t.service && !t.service.toLowerCase().includes("triage")) {
      setTargetClinicTitle(t.service);
    } else if (t.assignedSpecialistName) {
      setTargetClinicTitle(`Consultation with ${t.assignedSpecialistName}`);
    } else {
      setTargetClinicTitle("General OPD Consultation");
    }

    if (t.targetDepartment) {
      setTargetDepartment(t.targetDepartment);
    } else {
      setTargetDepartment("doctor");
    }

    if (t.consultationRoom) {
      setTargetRoom(t.consultationRoom);
    } else {
      setTargetRoom("Room 101 - General OPD");
    }

    if (t.assignedSpecialistId) {
      setAssignedDoctorId(t.assignedSpecialistId);
    } else {
      setAssignedDoctorId("");
    }

    if (t.specialistTitle) {
      setSelectedSpecialistName(t.specialistTitle);
    } else {
      setSelectedSpecialistName("");
    }

    if (t.allergies) setAllergies(t.allergies);
    if (t.issue) setChiefComplaint(t.issue);

    // Populate kiosk intake vitals if present
    if (t.vitals) {
      if (t.vitals.bp && t.vitals.bp.includes("/")) {
        const parts = t.vitals.bp.split("/");
        setSystolic(parts[0].trim());
        setDiastolic(parts[1].trim());
      }
      if (t.vitals.temp) setTemp(t.vitals.temp);
      if (t.vitals.pulse) setPulse(t.vitals.pulse);
      if (t.vitals.weight) setWeight(t.vitals.weight);
    }

    const pat = findUnifiedPatient(t.patientId || t.nationalId || t.patientName, patients);
    if (pat) {
      if (pat.allergies && !t.allergies) setAllergies(pat.allergies);
      if (pat.chronicConditions && !t.issue) setChiefComplaint(pat.chronicConditions);
      if (pat.latestVitals && !t.vitals) {
        if (pat.latestVitals.bp && pat.latestVitals.bp.includes("/")) {
          const parts = pat.latestVitals.bp.split("/");
          setSystolic(parts[0].trim());
          setDiastolic(parts[1].trim());
        }
        if (pat.latestVitals.temp) setTemp(pat.latestVitals.temp);
        if (pat.latestVitals.pulse) setPulse(pat.latestVitals.pulse);
        if (pat.latestVitals.weight) setWeight(pat.latestVitals.weight);
      }
    }
  };

  // Quick Department Presets
  const DEPARTMENT_PRESETS = [
    { id: "doctor", name: "General Outpatient (OPD)", dept: "doctor", defaultRoom: "Room 101 - General OPD" },
    { id: "peds", name: "Pediatrics & Child Health", dept: "doctor", defaultRoom: "Room 102 - Pediatrics Clinic" },
    { id: "gyna", name: "Obstetrics & Gynecology (Gyna)", dept: "gyna", defaultRoom: "Room 105 - OB/GYN Suite" },
    { id: "labour_room", name: "Labour & Delivery Ward", dept: "labour_room", defaultRoom: "Maternity Ward 1" },
    { id: "emergency", name: "Casualty / Emergency Resuscitation", dept: "doctor", defaultRoom: "Emergency Resus Bay A" },
    { id: "dental", name: "Dental Surgery Clinic", dept: "doctor", defaultRoom: "Room 201 - Dental Surgery" },
    { id: "eye", name: "Eye / Ophthalmology Clinic", dept: "doctor", defaultRoom: "Room 203 - Eye Clinic" },
    { id: "laboratory", name: "Direct Laboratory Diagnostics", dept: "laboratory", defaultRoom: "Main Clinical Lab" },
    { id: "radiology", name: "Radiology & Imaging (DICOM)", dept: "radiology", defaultRoom: "Imaging Suite 1" },
    { id: "pharmacy", name: "Pharmacy & Dispensary", dept: "pharmacy", defaultRoom: "Main Dispensary Window" }
  ];

  // Eligible Doctors for Assignment & Intelligent Least-Queue Load Balancer for Clinicians of same specialty
  const queueBalance: SpecialtyQueueBalance = useMemo(() => {
    return getSmartQueueRecommendation({
      specialtyName: selectedSpecialistName || targetClinicTitle,
      department: targetDepartment,
      fallbackRoom: targetRoom,
      employees,
      queueTickets: tickets
    });
  }, [selectedSpecialistName, targetClinicTitle, targetDepartment, targetRoom, employees, tickets]);

  // Synchronize doctor assignment when auto-balance is active
  useEffect(() => {
    if (autoBalanceMode && queueBalance.recommendedDoctor) {
      setAssignedDoctorId(queueBalance.recommendedDoctor.doctorId);
      if (queueBalance.recommendedRoom) {
        setTargetRoom(queueBalance.recommendedRoom);
      }
    }
  }, [
    autoBalanceMode,
    queueBalance.recommendedDoctor?.doctorId,
    queueBalance.recommendedRoom,
    selectedSpecialistName,
    targetClinicTitle,
    targetDepartment
  ]);

  // Transmit vitals and forward to Doctor / Specialist Desk
  const handleForwardToDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) {
      toast.warning("Please select a patient from the triage queue first.", "No Patient Selected");
      return;
    }

    setSubmitting(true);
    const bpString = `${systolic}/${diastolic}`;
    
    // Resolve chosen or auto-balanced doctor
    const matchedDoctorWorkload = queueBalance.matchingDoctors.find(d => d.doctorId === assignedDoctorId);
    const assignedDocObj = matchedDoctorWorkload?.doctor || employees.find(e => e.id === assignedDoctorId) || (autoBalanceMode ? queueBalance.recommendedDoctor?.doctor : undefined);
    const specialistDef = selectedSpecialistName ? getSpecialistByName(selectedSpecialistName) : undefined;
    
    // Resolve final destination details
    const finalDepartment = specialistDef?.department || targetDepartment || (assignedDocObj?.department) || "doctor";
    const finalClinicName = selectedSpecialistName
      ? `${selectedSpecialistName} Clinic`
      : targetClinicTitle || "General OPD Consultation";
    const finalDocName = assignedDocObj ? assignedDocObj.name : (queueBalance.recommendedDoctor?.doctorName || "");
    const finalDocId = assignedDocObj ? assignedDocObj.id : (queueBalance.recommendedDoctor?.doctorId || "");
    const finalRoom = targetRoom || (assignedDocObj ? getDoctorConsultationRoom(assignedDocObj) : queueBalance.recommendedRoom) || "Room 101 - General OPD";
    const finalSpecialistTitle = selectedSpecialistName || (assignedDocObj?.specialty || queueBalance.recommendedDoctor?.specialty || "Medical Doctor");

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
      // 1. Locate patient master record and persist vitals
      const matched = findUnifiedPatient(
        selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName,
        patients
      );

      if (matched) {
        const patientRef = doc(db, "patients", matched.id);
        const updatedVisits = [...(matched.visits || [])];

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
              diagnosis: `Triage Priority: ${triageCategory} • Assigned: ${finalClinicName}`,
              prescriptions: [],
              referrals: []
            }],
            latestVitals: compiledVitals,
            allergies: allergies || matched.allergies || "",
            updatedAt: new Date().toISOString()
          });
        }

        // 2. Attach vital record into active clinical encounter
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

      // 3. Update Queue ticket to route to assigned Department / Specialist Doctor
      const queueRef = doc(db, "queue", selectedTicket.id);
      await updateDoc(queueRef, {
        currentDepartment: finalDepartment,
        service: finalClinicName,
        status: "pending",
        assignedSpecialistId: finalDocId || "",
        assignedSpecialistName: finalDocName || "",
        specialistTitle: finalSpecialistTitle || "",
        consultationRoom: finalRoom,
        vitals: {
          bp: bpString,
          temp: temp,
          pulse: pulse,
          weight: weight,
          spo2: spo2,
          respRate: respRate,
          rbs: rbs,
          height: height,
          bmi: bmiData.bmi ? `${bmiData.bmi} (${bmiData.category})` : "N/A",
          painScale: `${painScale}/10`
        },
        triageScore: triageCategory,
        notes: `Triage Completed [${triageCategory}] • BP: ${bpString}, HR: ${pulse} bpm, Temp: ${temp}°C, SpO2: ${spo2}%. ${chiefComplaint ? `Complaint: ${chiefComplaint}` : ""}`,
        triageCompletedAt: new Date().toISOString()
      });

      // 4. Loud, Calm Female Voice Announcement for Patient
      try {
        voiceAnnouncer.resumeAudioContext();
        await voiceAnnouncer.announceTurnArrived({
          ticketNo: selectedTicket.ticketNo,
          patientName: selectedTicket.patientName,
          roomOrDesk: finalRoom,
          departmentOrRole: finalClinicName
        });
      } catch (e) {
        console.warn("Speech synthesis notice:", e);
      }

      toast.success(
        `Vitals recorded and Ticket #${selectedTicket.ticketNo} (${selectedTicket.patientName}) successfully assigned to ${finalClinicName} [${finalRoom}]${finalDocName ? ` - ${finalDocName}` : ""}!`,
        "Triage & Assignment Complete"
      );

      setSelectedTicket(null);
      setNurseNotes("");
      if (onNavigateToQueue) onNavigateToQueue();
    } catch (err: any) {
      console.error("Triage submission error:", err);
      toast.error("Failed to forward patient: " + (err?.message || "Unknown error"));
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
              <p className="text-xs text-rose-100/80">
                Capture vital signs, assess emergency urgency scores, and assign triaged patients directly to specific departments, specialist clinics, or on-duty doctors.
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
                          <p className="text-sm font-bold text-slate-900 leading-snug">{t.patientName}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>Age: {t.age || pat?.age || "—"}</span>
                            <span>•</span>
                            <span>ID: {t.nationalId || pat?.nationalId || "Walk-in"}</span>
                          </div>
                        </div>

                        {t.targetClinic && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-rose-700 font-semibold truncate max-w-[200px]">
                              {t.targetClinic}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              Triage <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Vitals Measurement, Triage TEWS, & Department / Specialist Assignment Desk (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTicket ? (
            <form onSubmit={handleForwardToDoctor} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              
              {/* Selected Patient Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50/50 border border-rose-200 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm px-2.5 py-0.5 bg-rose-600 text-white rounded-lg">
                      #{selectedTicket.ticketNo}
                    </span>
                    <h2 className="text-base font-black text-rose-950">{selectedTicket.patientName}</h2>
                  </div>
                  <p className="text-xs text-rose-800 mt-1">
                    National ID: <strong>{selectedTicket.nationalId || "Not on file"}</strong> • Age: {selectedTicket.age || 30} • Gender: {selectedTicket.gender || "Adult"} • Blood: {selectedTicket.bloodType || "N/A"}
                  </p>
                </div>

                {/* Priority Status Pill & Vocal Call Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      voiceAnnouncer.resumeAudioContext();
                      await voiceAnnouncer.announceTurnArrived({
                        ticketNo: selectedTicket.ticketNo,
                        patientName: selectedTicket.patientName,
                        roomOrDesk: "Nurse Triage Desk 1",
                        departmentOrRole: "Triage & Vitals"
                      });
                      toast.success(`Voice Announcement broadcast for Ticket #${selectedTicket.ticketNo} to Triage Desk 1`, "PA Broadcast Sent");
                    }}
                    className="px-3 py-2 bg-white hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-300 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    title="Broadcast Vocal Call across waiting lobby"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Call to Triage</span>
                  </button>

                  <div className={`px-4 py-2 rounded-xl text-center border font-bold text-xs ${
                    triageCategory === "RED"
                      ? "bg-rose-600 text-white border-rose-700 animate-pulse shadow-md"
                      : triageCategory === "YELLOW"
                      ? "bg-amber-100 text-amber-900 border-amber-300 shadow-xs"
                      : "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs"
                  }`}>
                    <p className="text-[9px] uppercase tracking-wider opacity-80 font-black">TEWS Urgency</p>
                    <p className="text-sm font-black">
                      {triageCategory === "RED" ? "🚨 EMERGENCY (RED)" : triageCategory === "YELLOW" ? "⚠️ PRIORITY (YELLOW)" : "✓ ROUTINE (GREEN)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Vital Signs Entry Form */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <span>1. Clinical Vital Signs & Biometrics</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Blood Pressure */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-rose-600" />
                      <span>Blood Pressure</span>
                    </label>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 text-center"
                        placeholder="120"
                      />
                      <span className="text-slate-400 font-bold">/</span>
                      <input
                        type="number"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 text-center"
                        placeholder="80"
                      />
                    </div>
                    <p className={`text-[10px] px-1.5 py-0.5 rounded-md border text-center font-bold truncate ${bpEvaluation.color}`}>
                      {bpEvaluation.label}
                    </p>
                  </div>

                  {/* Body Temperature */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                      <span>Temp (°C)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="36.8"
                    />
                    <p className="text-[10px] text-slate-500 text-center font-semibold">
                      {parseFloat(temp) >= 38.0 ? "🔥 Febrile (>38.0°)" : parseFloat(temp) < 35.5 ? "❄️ Hypothermia" : "Normal Afebrile"}
                    </p>
                  </div>

                  {/* Pulse / Heart Rate */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                      <span>Pulse (bpm)</span>
                    </label>
                    <input
                      type="number"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="72"
                    />
                    <p className="text-[10px] text-slate-500 text-center font-semibold">
                      {parseInt(pulse) > 100 ? "⚡ Tachycardia (>100)" : parseInt(pulse) < 60 ? "⚠️ Bradycardia (<60)" : "Normal Sinus"}
                    </p>
                  </div>

                  {/* Oxygen Saturation SpO2 */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      <span>SpO2 (%)</span>
                    </label>
                    <input
                      type="number"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="98"
                    />
                    <p className={`text-[10px] text-center font-bold ${spo2Evaluation?.color || "text-slate-500"}`}>
                      {spo2Evaluation?.label || "Normal"}
                    </p>
                  </div>
                </div>

                {/* Additional Clinical Vitals Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  {/* Respiratory Rate */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Resp Rate (cpm)</label>
                    <input
                      type="number"
                      value={respRate}
                      onChange={(e) => setRespRate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="18"
                    />
                  </div>

                  {/* Blood Sugar (RBS) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Random Blood Sugar (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rbs}
                      onChange={(e) => setRbs(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="5.4"
                    />
                  </div>

                  {/* Body Weight */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="68"
                    />
                  </div>

                  {/* Body Height */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Height (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="170"
                    />
                  </div>
                </div>

                {/* Anthropometrics & Computed BMI Banner */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Ruler className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-950">Height & BMI Classification (WHO Standard)</p>
                      <p className="text-[11px] text-indigo-700">Adult body mass index for clinical dosage planning</p>
                    </div>
                  </div>

                  <div className="bg-white px-4 py-1.5 rounded-xl border border-indigo-200 text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Computed BMI</p>
                    <p className={`text-sm font-black ${bmiData.color}`}>
                      {bmiData.bmi ? `${bmiData.bmi} kg/m² • ${bmiData.category}` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Pain Scale & Allergies */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>2. Pain Rating & Clinical Alerts</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Numeric Pain Rating Scale */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">Numeric Pain Scale (0 - 10):</label>
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-rose-700">
                        {painScale === 0 ? "0 (No Pain)" : painScale < 4 ? `${painScale} (Mild)` : painScale < 7 ? `${painScale} (Moderate)` : `${painScale} (Severe / Urgent)`}
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
                      <span className="text-[10px] text-slate-400">e.g., Penicillin, Sulfa, NKDA</span>
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

              {/* 3. DYNAMIC DEPARTMENT, SPECIALIST TAXONOMY & ATTENDING DOCTOR ASSIGNMENT */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-rose-600" />
                      <span>3. Clinical Assignment: Department, Specialist & Doctor</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select the destination department, hospital specialist specialty, or assign directly to an on-duty clinician.
                    </p>
                  </div>

                  {selectedSpecialistName && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpecialistName("");
                        setTargetClinicTitle("General OPD Consultation");
                        setTargetDepartment("doctor");
                        setTargetRoom("Room 101 - General OPD");
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset to General OPD</span>
                    </button>
                  )}
                </div>

                {/* Fast Department Selector Pills */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Select Target Department / OPD Unit:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {DEPARTMENT_PRESETS.map((preset) => {
                      const isSelected = !selectedSpecialistName && (targetClinicTitle === preset.name || targetDepartment === preset.dept);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedSpecialistName("");
                            setTargetClinicTitle(preset.name);
                            setTargetDepartment(preset.dept);
                            setTargetRoom(preset.defaultRoom);
                          }}
                          className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <span className="block text-xs truncate">{preset.name}</span>
                          <span className="text-[9px] opacity-75 font-normal block truncate">{preset.defaultRoom}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Hospital Specialist Directory Search & Dropdown */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Or Assign to Medical Specialist Taxonomy ({HOSPITAL_SPECIALISTS_DIRECTORY.length} Available)</span>
                    </label>
                  </div>

                  {/* Specialist Category Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setSpecialistCategory("all")}
                      className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                        specialistCategory === "all"
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      All Specialties
                    </button>
                    {SPECIALIST_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSpecialistCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                          specialistCategory === cat.id
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                        }`}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>

                  {/* Filter Input & Specialist Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={specialistSearch}
                        onChange={(e) => setSpecialistSearch(e.target.value)}
                        placeholder="Search specialist (e.g. Cardiology, Neuro, Gyna, ENT)..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <select
                      value={selectedSpecialistName}
                      onChange={(e) => {
                        const chosen = e.target.value;
                        setSelectedSpecialistName(chosen);
                        if (chosen) {
                          const specDef = getSpecialistByName(chosen);
                          if (specDef) {
                            setTargetClinicTitle(`${specDef.name} Clinic`);
                            setTargetDepartment(specDef.department);
                            setTargetRoom(specDef.defaultRoom || "Specialist Suite");
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Specialist Discipline --</option>
                      {HOSPITAL_SPECIALISTS_DIRECTORY
                        .filter((s) => {
                          const matchesCat = specialistCategory === "all" || s.category === specialistCategory;
                          const q = specialistSearch.toLowerCase().trim();
                          const matchesQ = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || (s.focusAreas && s.focusAreas.toLowerCase().includes(q));
                          return matchesCat && matchesQ;
                        })
                        .map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name} [{s.shortCode}] — {s.description.substring(0, 50)}...
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Active Specialist Preview Badge */}
                  {selectedSpecialistName && (() => {
                    const activeSpec = getSpecialistByName(selectedSpecialistName);
                    if (!activeSpec) return null;
                    return (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-black">
                              {activeSpec.shortCode}
                            </span>
                            <span>{activeSpec.name}</span>
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
                            {activeSpec.defaultRoom}
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-900">{activeSpec.description}</p>
                      </div>
                    );
                  })()}
                </div>

                {/* 4. SMART LEAST-QUEUE LOAD BALANCING ENGINE & CLINICAL ASSIGNMENT */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-md space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-white">
                            Smart Queue Rule: Least-Queue Doctor Balancing
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Distributes patients to the clinician with the lowest waiting queue of the same specialty.
                        </p>
                      </div>
                    </div>

                    {/* Auto-Balance Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = !autoBalanceMode;
                        setAutoBalanceMode(newMode);
                        if (newMode && queueBalance.recommendedDoctor) {
                          setAssignedDoctorId(queueBalance.recommendedDoctor.doctorId);
                          if (queueBalance.recommendedRoom) {
                            setTargetRoom(queueBalance.recommendedRoom);
                          }
                          toast.success(`Smart Auto-Balance active: Routed to ${queueBalance.recommendedDoctor.doctorName} (Least Queue)`, "Auto-Balance Enabled");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        autoBalanceMode
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{autoBalanceMode ? "Auto-Balance: ON" : "Manual Override"}</span>
                    </button>
                  </div>

                  {/* Recommendation Insight Banner */}
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 text-[11px] leading-relaxed">
                        {queueBalance.recommendationReason}
                      </span>
                    </div>
                    {queueBalance.matchingDoctors.length > 1 && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700 shrink-0">
                        {queueBalance.matchingDoctors.length} Specialists On Duty
                      </span>
                    )}
                  </div>

                  {/* Live Same-Specialty Doctor Queue Load Comparison Grid */}
                  {queueBalance.matchingDoctors.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>Real-Time Queue Depth for {selectedSpecialistName || targetClinicTitle}:</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {queueBalance.matchingDoctors.map((docWorkload, idx) => {
                          const isSelected = assignedDoctorId === docWorkload.doctorId || (autoBalanceMode && queueBalance.recommendedDoctor?.doctorId === docWorkload.doctorId);
                          const isBest = queueBalance.recommendedDoctor?.doctorId === docWorkload.doctorId;

                          return (
                            <button
                              key={docWorkload.doctorId}
                              type="button"
                              onClick={() => {
                                setAutoBalanceMode(false);
                                setAssignedDoctorId(docWorkload.doctorId);
                                setTargetRoom(docWorkload.assignedRoom);
                                toast.info(`Assigned to ${docWorkload.doctorName} [${docWorkload.assignedRoom}]`, "Doctor Selected");
                              }}
                              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-950/50 border-emerald-500 shadow-sm ring-1 ring-emerald-500/50"
                                  : "bg-slate-800/60 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-white truncate max-w-[150px]">
                                      {docWorkload.doctorName}
                                    </span>
                                    {isBest && (
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 text-[9px] font-black shrink-0">
                                        LEAST QUEUE
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                                    {docWorkload.specialty}
                                  </span>
                                </div>

                                {/* Queue Count Badge */}
                                <div className="text-right shrink-0">
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black inline-block border ${
                                      docWorkload.totalLoad === 0
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        : docWorkload.totalLoad <= 2
                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                        : docWorkload.totalLoad <= 4
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                    }`}
                                  >
                                    {docWorkload.totalLoad} in Queue
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                                <span className="text-slate-400 font-mono flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-slate-500" />
                                  {docWorkload.assignedRoom}
                                </span>
                                {isSelected ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                    <Check className="w-3 h-3" />
                                    Active Target
                                  </span>
                                ) : (
                                  <span className="text-slate-500 hover:text-slate-300">
                                    Click to Assign
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Specific Attending Clinician & Room Number Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
                        <UserCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Attending Clinician (Auto or Override):</span>
                      </label>
                      <select
                        value={assignedDoctorId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssignedDoctorId(val);
                          if (val) {
                            setAutoBalanceMode(false);
                            const chosenDoc = queueBalance.matchingDoctors.find(d => d.doctorId === val);
                            if (chosenDoc?.assignedRoom) {
                              setTargetRoom(chosenDoc.assignedRoom);
                            }
                          } else {
                            setAutoBalanceMode(true);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {queueBalance.recommendedDoctor && (
                          <option value={queueBalance.recommendedDoctor.doctorId}>
                            ⚡ Auto-Balance: {queueBalance.recommendedDoctor.doctorName} [{queueBalance.recommendedDoctor.totalLoad} in queue • Least Load]
                          </option>
                        )}
                        <option value="">-- General Clinic Pool (Next Available Doctor) --</option>
                        {queueBalance.matchingDoctors.map((docW) => (
                          <option key={docW.doctorId} value={docW.doctorId}>
                            {docW.doctorName} — {docW.specialty} [{docW.totalLoad} in Queue]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Target Consultation Room / Location:</span>
                      </label>
                      <input
                        type="text"
                        value={targetRoom}
                        onChange={(e) => setTargetRoom(e.target.value)}
                        placeholder="e.g. Room 104 - Cardiac Clinic"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit & Forward Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel / Clear Selection
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:flex-1 py-3.5 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting
                      ? "Recording Vitals & Routing Ticket..."
                      : `Forward Patient #${selectedTicket.ticketNo} to ${selectedSpecialistName || targetClinicTitle} [${targetRoom}]`}
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
                  Select a patient waiting in the Triage Queue on the left to begin recording clinical vital signs, computing TEWS emergency scores, and assigning the patient to any hospital department or specialist.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

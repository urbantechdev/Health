import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";
import {
  MaternityAdmission,
  DeliveryRecord,
  NewbornRecord,
  PartographEntry,
  QueueTicket,
  MedicalRecord
} from "../types";
import IncomingDepartmentPromptBanner from "./IncomingDepartmentPromptBanner";
import { toast } from "../lib/promptService";
import {
  Baby,
  HeartPulse,
  Activity,
  User,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  Bed,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Pill,
  Send,
  Printer,
  ChevronRight,
  TrendingUp,
  Award,
  X,
  Check,
  Zap,
  Gauge,
  Thermometer,
  Scale
} from "lucide-react";

interface MaternityHubProps {
  currentUser?: {
    name: string;
    email?: string;
    role?: string;
  };
  activeSpecialistId?: string;
  onNavigateToBilling?: (patientId?: string) => void;
  onNavigateToPharmacy?: () => void;
  onNavigateToDiagnostics?: () => void;
  onNavigateToDoctor?: () => void;
  onNavigateToQueue?: () => void;
}

export default function MaternityHub({
  currentUser,
  activeSpecialistId,
  onNavigateToBilling,
  onNavigateToPharmacy,
  onNavigateToDiagnostics,
  onNavigateToDoctor,
  onNavigateToQueue
}: MaternityHubProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "labour" | "partograph" | "deliveries" | "anc" | "requisitions"
  >("labour");

  // Real-time Firestore state
  const [admissions, setAdmissions] = useState<MaternityAdmission[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [partographs, setPartographs] = useState<PartographEntry[]>([]);
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAdmission, setSelectedAdmission] = useState<MaternityAdmission | null>(null);

  // Modals
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPartographModal, setShowPartographModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState<DeliveryRecord | null>(null);

  // Quick Admit Form State
  const [admitPatientName, setAdmitPatientName] = useState("");
  const [admitNationalId, setAdmitNationalId] = useState("");
  const [admitPhone, setAdmitPhone] = useState("");
  const [admitAge, setAdmitAge] = useState("24");
  const [admitGravida, setAdmitGravida] = useState(1);
  const [admitParity, setAdmitParity] = useState(0);
  const [admitGestationWeeks, setAdmitGestationWeeks] = useState(39);
  const [admitLmp, setAdmitLmp] = useState("");
  const [admitBloodGroup, setAdmitBloodGroup] = useState("O+");
  const [admitHivStatus, setAdmitHivStatus] = useState<"Non-Reactive" | "Reactive" | "Unknown">("Non-Reactive");
  const [admitStage, setAdmitStage] = useState<MaternityAdmission["stageOfLabor"]>("Stage 1 - Active");
  const [admitDilation, setAdmitDilation] = useState(4);
  const [admitFhr, setAdmitFhr] = useState(140);
  const [admitContractions, setAdmitContractions] = useState(3);
  const [admitMembranes, setAdmitMembranes] = useState<MaternityAdmission["membranesStatus"]>("Intact");
  const [admitBed, setAdmitBed] = useState("Labour Suite 1");
  const [admitHighRisks, setAdmitHighRisks] = useState<string[]>([]);
  const [admitNotes, setAdmitNotes] = useState("");

  // Partograph entry state
  const [partoHours, setPartoHours] = useState(1);
  const [partoCervix, setPartoCervix] = useState(4);
  const [partoDescent, setPartoDescent] = useState("0");
  const [partoFhr, setPartoFhr] = useState(142);
  const [partoContractionsCount, setPartoContractionsCount] = useState(3);
  const [partoContractionsDuration, setPartoContractionsDuration] = useState(35);
  const [partoLiquor, setPartoLiquor] = useState<"I" | "C" | "M" | "B">("I");
  const [partoMoulding, setPartoMoulding] = useState<"0" | "+" | "++" | "+++">("0");
  const [partoBp, setPartoBp] = useState("120/80");
  const [partoPulse, setPartoPulse] = useState(78);
  const [partoTemp, setPartoTemp] = useState(36.8);
  const [partoNotes, setPartoNotes] = useState("");

  // Delivery Form State
  const [delivMode, setDelivMode] = useState<DeliveryRecord["deliveryMode"]>("Spontaneous Vertex Delivery (SVD)");
  const [delivPerineum, setDelivPerineum] = useState<DeliveryRecord["perineumOutcome"]>("Intact");
  const [delivBloodLoss, setDelivBloodLoss] = useState(250);
  const [delivAmtsl, setDelivAmtsl] = useState(true);
  const [delivPlacentaComplete, setDelivPlacentaComplete] = useState(true);
  const [delivBabyGender, setDelivBabyGender] = useState<"Male" | "Female">("Female");
  const [delivBirthWeight, setDelivBirthWeight] = useState(3.2);
  const [delivBabyLength, setDelivBabyLength] = useState(50);
  const [delivApgar1, setDelivApgar1] = useState(9);
  const [delivApgar5, setDelivApgar5] = useState(10);
  const [delivVitK, setDelivVitK] = useState(true);
  const [delivTeo, setDelivTeo] = useState(true);
  const [delivBcg, setDelivBcg] = useState(true);
  const [delivOpv0, setDelivOpv0] = useState(true);
  const [delivSkinToSkin, setDelivSkinToSkin] = useState(true);
  const [delivBreastfeeding, setDelivBreastfeeding] = useState(true);
  const [delivNotes, setDelivNotes] = useState("");

  // Gestational Age & EDD Calculator State
  const [calcLmp, setCalcLmp] = useState("");
  const calculatedEdd = useMemo(() => {
    if (!calcLmp) return null;
    const lmpDate = new Date(calcLmp);
    if (isNaN(lmpDate.getTime())) return null;
    // Naegele's rule: +1 year, -3 months, +7 days (or +280 days)
    const edd = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = now.getTime() - lmpDate.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    const diffDays = Math.floor((diffTime % (7 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));

    return {
      eddFormatted: edd.toLocaleDateString("en-KE", { dateStyle: "medium" }),
      gestationalAgeWeeks: diffWeeks,
      gestationalAgeDays: diffDays
    };
  }, [calcLmp]);

  // Subscribe to Firestore collections
  useEffect(() => {
    const unsubAdmissions = onSnapshot(collection(db, "maternity_admissions"), (snap) => {
      const list: MaternityAdmission[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as MaternityAdmission));
      list.sort((a, b) => new Date(b.admittedAt || 0).getTime() - new Date(a.admittedAt || 0).getTime());
      setAdmissions(list);
      if (list.length > 0 && !selectedAdmission) {
        setSelectedAdmission(list[0]);
      }
    });

    const unsubDeliveries = onSnapshot(collection(db, "maternity_deliveries"), (snap) => {
      const list: DeliveryRecord[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as DeliveryRecord));
      list.sort((a, b) => new Date(b.deliveryDateTime || 0).getTime() - new Date(a.deliveryDateTime || 0).getTime());
      setDeliveries(list);
    });

    const unsubPartographs = onSnapshot(collection(db, "maternity_partographs"), (snap) => {
      const list: PartographEntry[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as PartographEntry));
      list.sort((a, b) => a.hoursInActiveLabor - b.hoursInActiveLabor);
      setPartographs(list);
    });

    const unsubPatients = onSnapshot(collection(db, "patients"), (snap) => {
      const list: MedicalRecord[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as MedicalRecord));
      setPatients(list);
    });

    const unsubQueue = onSnapshot(collection(db, "queue"), (snap) => {
      const list: QueueTicket[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as QueueTicket));
      setQueueTickets(list);
    });

    return () => {
      unsubAdmissions();
      unsubDeliveries();
      unsubPartographs();
      unsubPatients();
      unsubQueue();
    };
  }, []);

  // Filter active labor admissions
  const activeLaborAdmissions = useMemo(() => {
    return admissions.filter((a) => a.admissionStatus === "active_labor");
  }, [admissions]);

  // Selected admission partographs
  const currentPartographs = useMemo(() => {
    if (!selectedAdmission) return [];
    return partographs.filter((p) => p.admissionId === selectedAdmission.id);
  }, [partographs, selectedAdmission]);

  // High risk alerts count
  const highRiskCount = useMemo(() => {
    return activeLaborAdmissions.filter((a) => a.highRiskAlerts && a.highRiskAlerts.length > 0).length;
  }, [activeLaborAdmissions]);

  // Handle incoming queue acceptance
  const handleQuickAdmitFromTicket = (ticket: QueueTicket) => {
    setAdmitPatientName(ticket.patientName || "");
    setAdmitNationalId(ticket.nationalId || "");
    setAdmitPhone(ticket.phone || "");
    setAdmitAge(String(ticket.age || "24"));
    setAdmitNotes(ticket.issue || "");
    setShowAdmitModal(true);
  };

  // Submit New Admission
  const handleSubmitAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitPatientName.trim()) {
      toast.error("Please enter mother's name.");
      return;
    }

    try {
      const newAdmission: Omit<MaternityAdmission, "id"> = {
        patientId: "pat-" + Date.now(),
        patientName: admitPatientName.trim(),
        nationalId: admitNationalId.trim(),
        phone: admitPhone.trim(),
        age: Number(admitAge) || 24,
        ticketNo: `MAT-${Math.floor(100 + Math.random() * 900)}`,
        gravida: Number(admitGravida) || 1,
        parity: Number(admitParity) || 0,
        gestationWeeks: Number(admitGestationWeeks) || 39,
        lmp: admitLmp,
        bloodGroup: admitBloodGroup,
        hivStatus: admitHivStatus,
        stageOfLabor: admitStage,
        cervicalDilationCm: Number(admitDilation) || 4,
        fetalHeartRate: Number(admitFhr) || 140,
        contractionsPer10Min: Number(admitContractions) || 3,
        membranesStatus: admitMembranes,
        allocatedBed: admitBed,
        admissionStatus: "active_labor",
        highRiskAlerts: admitHighRisks,
        admittedBy: currentUser?.name || "Midwife Officer",
        admittedAt: new Date().toISOString(),
        notes: admitNotes
      };

      const docRef = await addDoc(collection(db, "maternity_admissions"), newAdmission);
      toast.success(`${admitPatientName} admitted to ${admitBed}!`);
      setShowAdmitModal(false);

      // Auto-select
      setSelectedAdmission({ id: docRef.id, ...newAdmission });
    } catch (err: any) {
      console.error("Admission error:", err);
      toast.error("Failed to admit mother: " + err.message);
    }
  };

  // Submit Partograph Observation
  const handleSubmitPartograph = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) {
      toast.error("No active admission selected for partograph.");
      return;
    }

    try {
      // Check Alert / Action line rules
      // Alert line starts at 4 cm at hour 0. Slope is 1 cm per hour.
      // Action line is 4 hours to the right.
      let alertStatus: PartographEntry["alertLineStatus"] = "normal";
      const expectedDilationAtHour = 4 + (partoHours - 1);
      if (partoCervix < expectedDilationAtHour - 3) {
        alertStatus = "action_line_crossed";
      } else if (partoCervix < expectedDilationAtHour) {
        alertStatus = "on_alert_line";
      }

      const newEntry: Omit<PartographEntry, "id"> = {
        admissionId: selectedAdmission.id,
        patientName: selectedAdmission.patientName,
        recordedAt: new Date().toISOString(),
        hoursInActiveLabor: Number(partoHours),
        cervicalDilationCm: Number(partoCervix),
        fetalDescentStation: partoDescent,
        fetalHeartRateBpm: Number(partoFhr),
        contractionsCountPer10Min: Number(partoContractionsCount),
        contractionsDurationSec: Number(partoContractionsDuration),
        liquorStatus: partoLiquor,
        moulding: partoMoulding,
        maternalBp: partoBp,
        maternalPulse: Number(partoPulse),
        maternalTemp: Number(partoTemp),
        alertLineStatus: alertStatus,
        recordedBy: currentUser?.name || "Midwife On-Duty",
        clinicalNotes: partoNotes
      };

      await addDoc(collection(db, "maternity_partographs"), newEntry);

      // Update cervical dilation and FHR on admission doc as well
      await updateDoc(doc(db, "maternity_admissions", selectedAdmission.id), {
        cervicalDilationCm: Number(partoCervix),
        fetalHeartRate: Number(partoFhr),
        contractionsPer10Min: Number(partoContractionsCount),
        stageOfLabor: partoCervix >= 10 ? "Stage 2 - Expulsive" : "Stage 1 - Active"
      });

      if (alertStatus === "action_line_crossed") {
        toast.warning(
          `Action Line Crossed! Cervical dilatation (${partoCervix}cm at Hr ${partoHours}) indicates prolonged labor. Notify Obstetrician!`,
          "Clinical Action Alert"
        );
      } else {
        toast.success(`Partograph observation logged for ${selectedAdmission.patientName} (${partoCervix} cm)!`);
      }

      setShowPartographModal(false);
      setPartoNotes("");
    } catch (err: any) {
      console.error("Partograph save error:", err);
      toast.error("Failed to log partograph: " + err.message);
    }
  };

  // Submit Safe Delivery Record
  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) {
      toast.error("No active mother selected for delivery.");
      return;
    }

    try {
      const babyTag = `BBY-${Date.now().toString().slice(-5)}`;
      const newborn: NewbornRecord = {
        babyTagNumber: babyTag,
        gender: delivBabyGender,
        birthWeightKg: Number(delivBirthWeight),
        lengthCm: Number(delivBabyLength),
        headCircumferenceCm: 34,
        apgar1Min: Number(delivApgar1),
        apgar5Min: Number(delivApgar5),
        resuscitationDone: delivApgar1 < 7,
        vitaminKGiven: delivVitK,
        eyeProphylaxisGiven: delivTeo,
        bcgVaccineGiven: delivBcg,
        opv0VaccineGiven: delivOpv0,
        skinToSkinInitiated: delivSkinToSkin,
        breastfeedingWithin1Hour: delivBreastfeeding,
        examinedBy: currentUser?.name || "Midwife Officer",
        timestamp: new Date().toISOString()
      };

      const isPph = Number(delivBloodLoss) > 500;

      const deliveryRecord: Omit<DeliveryRecord, "id"> = {
        admissionId: selectedAdmission.id,
        patientId: selectedAdmission.patientId,
        patientName: selectedAdmission.patientName,
        nationalId: selectedAdmission.nationalId,
        ticketNo: selectedAdmission.ticketNo,
        deliveryDateTime: new Date().toISOString(),
        deliveryMode: delivMode,
        perineumOutcome: delivPerineum,
        estimatedBloodLossMl: Number(delivBloodLoss),
        amtslOxytocinGiven: delivAmtsl,
        placentaComplete: delivPlacentaComplete,
        membranesComplete: true,
        conductedBy: currentUser?.name || "Midwife Officer",
        newborn: newborn,
        maternalStatusImmediate: isPph ? "PPH Alert" : "Stable",
        notes: delivNotes,
        moh333Registered: true,
        timestamp: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "maternity_deliveries"), deliveryRecord);

      // Update admission status to delivered
      await updateDoc(doc(db, "maternity_admissions", selectedAdmission.id), {
        admissionStatus: "delivered",
        stageOfLabor: "Stage 4 - Postpartum Recovery",
        deliveredAt: new Date().toISOString(),
        allocatedBed: "Postnatal Recovery Bed 1"
      });

      if (isPph) {
        toast.warning(
          `PPH ALERT: Blood loss ${delivBloodLoss}ml exceeds normal threshold! Initiate Kenya MOH PPH bundle (Uterine massage, IV Oxytocin + Misoprostol + Tranexamic Acid)!`,
          "Postpartum Haemorrhage Alert"
        );
      } else {
        toast.success(`Safe delivery registered! Baby ${delivBabyGender} (${delivBirthWeight}kg) with APGAR ${delivApgar1}/${delivApgar5}!`);
      }

      setShowDeliveryModal(false);
      setShowCertificateModal({ id: docRef.id, ...deliveryRecord });
    } catch (err: any) {
      console.error("Delivery submission error:", err);
      toast.error("Failed to record delivery: " + err.message);
    }
  };

  // Quick Clinical Requisition Order
  const handleQuickOrder = async (item: { name: string; type: "med" | "lab"; route: string; qty: string }) => {
    if (!selectedAdmission) {
      toast.warning("Please select an admitted mother to attach order.");
      return;
    }

    try {
      if (item.type === "med") {
        await addDoc(collection(db, "prescriptions"), {
          patientId: selectedAdmission.patientId,
          patientName: selectedAdmission.patientName,
          ticketNo: selectedAdmission.ticketNo,
          medication: item.name,
          dosage: item.qty,
          instructions: item.route,
          prescribedBy: currentUser?.name || "Maternity Clinician",
          prescribedAt: new Date().toISOString(),
          status: "pending_dispense",
          department: "maternity"
        });
        toast.success(`Ordered ${item.name} (${item.qty}) directly to Smart Pharmacy!`);
      } else {
        await addDoc(collection(db, "lab_orders"), {
          patientId: selectedAdmission.patientId,
          patientName: selectedAdmission.patientName,
          ticketNo: selectedAdmission.ticketNo,
          testName: item.name,
          urgency: "urgent",
          orderedBy: currentUser?.name || "Maternity Clinician",
          orderedAt: new Date().toISOString(),
          status: "pending",
          department: "maternity"
        });
        toast.success(`Ordered ${item.name} directly to Diagnostic Laboratory!`);
      }
    } catch (err: any) {
      console.error("Order error:", err);
      toast.error("Failed to dispatch order: " + err.message);
    }
  };

  return (
    <div id="maternity-hub" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-pink-900 via-rose-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-pink-700/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Baby className="w-8 h-8 text-pink-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/40 text-pink-100 text-[10px] font-black uppercase tracking-wider border border-pink-400/30">
                  Kenya MOH 333 • Safe Motherhood & Newborn
                </span>
                <span className="text-xs text-pink-200">Labour & Delivery Suite</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight mt-1">Maternity & Labour Ward</h1>
              <p className="text-xs text-pink-100/80">
                WHO Partograph labor monitoring, AMTSL safe delivery records, Kenya MOH newborn care & APGAR assessment, and Linda Mama / SHA clearance.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-pink-950/60 border border-pink-700/50 px-3.5 py-2 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-pink-300 uppercase">Active Labor</p>
              <p className="text-lg font-black text-white">{activeLaborAdmissions.length}</p>
            </div>

            <div className="bg-emerald-950/60 border border-emerald-700/50 px-3.5 py-2 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-emerald-300 uppercase">Safe Deliveries</p>
              <p className="text-lg font-black text-emerald-200">{deliveries.length}</p>
            </div>

            {highRiskCount > 0 && (
              <div className="bg-rose-950/80 border border-rose-500/80 px-3.5 py-2 rounded-2xl text-center animate-pulse">
                <p className="text-[10px] font-black text-rose-300 uppercase">High Risk Alerts</p>
                <p className="text-lg font-black text-rose-100">{highRiskCount}</p>
              </div>
            )}

            <button
              id="btn-admit-mother"
              onClick={() => setShowAdmitModal(true)}
              className="px-4 py-2.5 bg-pink-500 hover:bg-pink-400 text-pink-950 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Admit to Labour Suite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Universal Real-Time Incoming Queue Prompt Banner for Maternity */}
      <IncomingDepartmentPromptBanner
        department="maternity"
        stationLabel="Maternity & Labour Suite"
        activeSpecialistId={activeSpecialistId}
        themeColor="pink"
        acceptButtonLabel="Accept & Admit to Labour Ward"
        onAcceptTicket={(tick) => handleQuickAdmitFromTicket(tick)}
      />

      {/* Operational Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: "labour", label: "Labour Ward & Active Inflow", icon: Bed, count: activeLaborAdmissions.length },
          { id: "partograph", label: "Digital Partograph Monitor", icon: Activity, count: currentPartographs.length },
          { id: "deliveries", label: "MOH 333 Delivery & Newborns", icon: Baby, count: deliveries.length },
          { id: "anc", label: "Antenatal (ANC) & EDD Calculator", icon: Calendar },
          { id: "requisitions", label: "Maternity Pharmacy & Direct Orders", icon: Pill }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-pink-600 text-white shadow-md shadow-pink-600/20"
                  : "bg-white hover:bg-pink-50 text-slate-700 border border-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-pink-600"}`} />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-white text-pink-600" : "bg-pink-100 text-pink-800"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Labour Ward & Active Inflow */}
      {activeTab === "labour" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Admitted Mothers List (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Bed className="w-4 h-4 text-pink-600" />
                  <span>Admitted Mothers in Labour ({activeLaborAdmissions.length})</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-pink-50 text-pink-700 border border-pink-200 rounded-full">
                  Real-Time Bed State
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by mother's name or ticket..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* List */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto">
                {activeLaborAdmissions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Baby className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No mothers currently in active labor</p>
                    <p className="text-[11px] text-slate-400">
                      Click "Admit to Labour Suite" or accept an incoming queue prompt to admit a patient.
                    </p>
                  </div>
                ) : (
                  activeLaborAdmissions
                    .filter((a) =>
                      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (a.ticketNo && a.ticketNo.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((adm) => {
                      const isSelected = selectedAdmission?.id === adm.id;
                      const hasHighRisk = adm.highRiskAlerts && adm.highRiskAlerts.length > 0;

                      return (
                        <div
                          key={adm.id}
                          onClick={() => setSelectedAdmission(adm)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-pink-50/80 border-pink-500 shadow-sm"
                              : "bg-white hover:bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {adm.ticketNo && (
                                  <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-black text-[10px] rounded-md">
                                    {adm.ticketNo}
                                  </span>
                                )}
                                <h4 className="text-sm font-extrabold text-slate-900">{adm.patientName}</h4>
                                <span className="text-xs text-slate-500">({adm.age} yrs)</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                G{adm.gravida}P{adm.parity} • {adm.gestationWeeks} weeks • {adm.allocatedBed}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="inline-block px-2 py-0.5 bg-pink-100 text-pink-900 text-[11px] font-black rounded-lg">
                                {adm.cervicalDilationCm} cm
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">FHR: {adm.fetalHeartRate} bpm</p>
                            </div>
                          </div>

                          {/* High Risk Flags */}
                          {hasHighRisk && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {adm.highRiskAlerts?.map((r, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-md border border-rose-200 flex items-center gap-1"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                            <span>Stage: {adm.stageOfLabor}</span>
                            <span className="font-semibold text-pink-600">Select & Monitor →</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          {/* Detailed Bedside Clinical View (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedAdmission ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                {/* Mother Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-black text-xs rounded-md">
                        {selectedAdmission.ticketNo || "MAT-01"}
                      </span>
                      <h2 className="text-xl font-black text-slate-900">{selectedAdmission.patientName}</h2>
                      <span className="text-xs text-slate-500 font-medium">({selectedAdmission.age} yrs)</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Bed: <strong className="text-slate-800">{selectedAdmission.allocatedBed}</strong> • Admitted by{" "}
                      {selectedAdmission.admittedBy}
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setPartoCervix(selectedAdmission.cervicalDilationCm || 4);
                        setPartoFhr(selectedAdmission.fetalHeartRate || 140);
                        setShowPartographModal(true);
                      }}
                      className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Log Partograph</span>
                    </button>

                    <button
                      onClick={() => setShowDeliveryModal(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Baby className="w-3.5 h-3.5" />
                      <span>Record Delivery</span>
                    </button>
                  </div>
                </div>

                {/* Vitals & Obstetric Status Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Cervical Dilation</p>
                    <p className="text-2xl font-black text-pink-600 mt-0.5">
                      {selectedAdmission.cervicalDilationCm} <span className="text-xs font-medium text-slate-500">cm</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedAdmission.cervicalDilationCm >= 10 ? "Fully Dilated" : "Active Labor"}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Fetal Heart Rate</p>
                    <p
                      className={`text-2xl font-black mt-0.5 ${
                        selectedAdmission.fetalHeartRate < 110 || selectedAdmission.fetalHeartRate > 160
                          ? "text-rose-600 animate-pulse"
                          : "text-emerald-600"
                      }`}
                    >
                      {selectedAdmission.fetalHeartRate} <span className="text-xs font-medium text-slate-500">bpm</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedAdmission.fetalHeartRate < 110
                        ? "Bradycardia Alert"
                        : selectedAdmission.fetalHeartRate > 160
                        ? "Tachycardia Alert"
                        : "Normal (110-160)"}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Contractions</p>
                    <p className="text-2xl font-black text-slate-800 mt-0.5">
                      {selectedAdmission.contractionsPer10Min} <span className="text-xs font-medium text-slate-500">/10min</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Regular Uterine Activity</p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Membranes</p>
                    <p className="text-sm font-black text-slate-800 mt-1 truncate">
                      {selectedAdmission.membranesStatus}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Blood Group: {selectedAdmission.bloodGroup || "O+"}</p>
                  </div>
                </div>

                {/* Obstetric Summary & Notes */}
                <div className="bg-pink-50/50 rounded-2xl p-4 border border-pink-100 space-y-2">
                  <h4 className="text-xs font-black text-pink-950 uppercase tracking-wider flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-pink-600" />
                    <span>Clinical Profile & Antenatal History</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Gravida/Parity:</span>{" "}
                      <strong className="text-slate-800">
                        G{selectedAdmission.gravida}P{selectedAdmission.parity}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Gestational Age:</span>{" "}
                      <strong className="text-slate-800">{selectedAdmission.gestationWeeks} wks</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">HIV Status:</span>{" "}
                      <strong className="text-slate-800">{selectedAdmission.hivStatus || "Non-Reactive"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">VDRL/Syphilis:</span>{" "}
                      <strong className="text-slate-800">{selectedAdmission.vdrlStatus || "Negative"}</strong>
                    </div>
                  </div>

                  {selectedAdmission.notes && (
                    <p className="text-xs text-slate-600 pt-2 border-t border-pink-100">
                      <strong>Notes:</strong> {selectedAdmission.notes}
                    </p>
                  )}
                </div>

                {/* Quick Link Handshakes */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Department Handshakes:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateToPharmacy && onNavigateToPharmacy()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      Smart Pharmacy →
                    </button>
                    <button
                      onClick={() => onNavigateToDiagnostics && onNavigateToDiagnostics()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      Laboratory & Blood Bank →
                    </button>
                    <button
                      onClick={() => onNavigateToBilling && onNavigateToBilling(selectedAdmission.patientId)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      Linda Mama / SHA Billing →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                <Bed className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Select an Admitted Mother</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click on any patient card on the left to monitor labor progress, view fetal heart rate, log partograph recordings, or record safe deliveries.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Digital Partograph Monitor */}
      {activeTab === "partograph" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-black uppercase tracking-wider">
                    WHO Partograph Standard
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    Cervical Dilatation & Labor Progression Plot
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Active labor begins at 4 cm. Alert Line (1 cm/hr slope) and Action Line (4 hours to the right).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPartographModal(true)}
                  disabled={!selectedAdmission}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Partograph Entry</span>
                </button>
              </div>
            </div>

            {/* Mother Selection Bar */}
            {activeLaborAdmissions.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-500 shrink-0">Monitoring Mother:</span>
                {activeLaborAdmissions.map((adm) => (
                  <button
                    key={adm.id}
                    onClick={() => setSelectedAdmission(adm)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedAdmission?.id === adm.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {adm.patientName} ({adm.cervicalDilationCm} cm)
                  </button>
                ))}
              </div>
            )}

            {/* Visual Partograph Grid */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Dilatation of Cervix (cm) vs. Duration in Active Labour (Hours)</span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1 text-pink-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-600"></span> Patient Plot (cm)
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-3 h-0.5 bg-amber-500"></span> Alert Line (1cm/hr)
                  </span>
                  <span className="flex items-center gap-1 text-rose-600">
                    <span className="w-3 h-0.5 bg-rose-600"></span> Action Line (+4hrs)
                  </span>
                </div>
              </div>

              {/* Chart Representation */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 relative overflow-x-auto">
                <div className="min-w-[600px] h-64 flex flex-col justify-between relative border-l border-b border-slate-300">
                  {/* Y-Axis lines: 10cm down to 4cm */}
                  {[10, 9, 8, 7, 6, 5, 4].map((cm) => (
                    <div key={cm} className="flex items-center w-full border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      <span className="w-8 -ml-8 text-right pr-2 font-bold text-slate-600">{cm} cm</span>
                      <div className="flex-1"></div>
                    </div>
                  ))}

                  {/* Alert Line Visual Slope (From 4cm to 10cm over 6 hours) */}
                  <div
                    className="absolute border-t-2 border-dashed border-amber-500 pointer-events-none"
                    style={{
                      left: "5%",
                      bottom: "0%",
                      width: "45%",
                      transform: "rotate(-24deg)",
                      transformOrigin: "bottom left"
                    }}
                  />

                  {/* Action Line Visual Slope (4 hours later) */}
                  <div
                    className="absolute border-t-2 border-rose-600 pointer-events-none"
                    style={{
                      left: "35%",
                      bottom: "0%",
                      width: "45%",
                      transform: "rotate(-24deg)",
                      transformOrigin: "bottom left"
                    }}
                  />

                  {/* Plotted Points for Current Admission */}
                  {currentPartographs.map((p, idx) => {
                    // Normalize position
                    const leftPercent = Math.min(Math.max((p.hoursInActiveLabor / 12) * 90 + 5, 5), 95);
                    const bottomPercent = Math.min(Math.max(((p.cervicalDilationCm - 4) / 6) * 90, 0), 100);

                    return (
                      <div
                        key={p.id || idx}
                        className="absolute -translate-x-1/2 translate-y-1/2 group z-10 cursor-pointer"
                        style={{ left: `${leftPercent}%`, bottom: `${bottomPercent}%` }}
                      >
                        <div className="w-5 h-5 rounded-full bg-pink-600 border-2 border-white shadow-md flex items-center justify-center text-[10px] text-white font-black">
                          ✕
                        </div>
                        {/* Tooltip */}
                        <div className="hidden group-hover:block absolute bottom-6 -left-16 bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-xl w-36 pointer-events-none z-20">
                          <p className="font-bold">Hr {p.hoursInActiveLabor}: {p.cervicalDilationCm} cm</p>
                          <p>FHR: {p.fetalHeartRateBpm} bpm</p>
                          <p>BP: {p.maternalBp}</p>
                          <p>Liquor: {p.liquorStatus}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis: Hours in Active Labor */}
                <div className="flex justify-between pl-8 text-[10px] font-bold text-slate-500 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hr) => (
                    <span key={hr}>Hr {hr}</span>
                  ))}
                </div>
              </div>

              {/* Partograph Records Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Time / Hour</th>
                      <th className="p-2.5">Cervix (cm)</th>
                      <th className="p-2.5">Descent</th>
                      <th className="p-2.5">FHR (bpm)</th>
                      <th className="p-2.5">Contractions</th>
                      <th className="p-2.5">Liquor</th>
                      <th className="p-2.5">Maternal BP</th>
                      <th className="p-2.5">Alert State</th>
                      <th className="p-2.5">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentPartographs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-slate-400">
                          No partograph recordings entered for this admission yet. Click "Log Partograph Entry" above.
                        </td>
                      </tr>
                    ) : (
                      currentPartographs.map((entry) => (
                        <tr key={entry.id} className="hover:bg-pink-50/50">
                          <td className="p-2.5 font-bold">Hr {entry.hoursInActiveLabor}</td>
                          <td className="p-2.5 font-extrabold text-pink-600">{entry.cervicalDilationCm} cm</td>
                          <td className="p-2.5">{entry.fetalDescentStation}</td>
                          <td className="p-2.5 font-bold">{entry.fetalHeartRateBpm}</td>
                          <td className="p-2.5">{entry.contractionsCountPer10Min} / 10m ({entry.contractionsDurationSec}s)</td>
                          <td className="p-2.5 font-mono">{entry.liquorStatus}</td>
                          <td className="p-2.5">{entry.maternalBp}</td>
                          <td className="p-2.5">
                            {entry.alertLineStatus === "action_line_crossed" ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full text-[10px]">
                                Action Crossed
                              </span>
                            ) : entry.alertLineStatus === "on_alert_line" ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                                On Alert Line
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                                Normal
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-500">{entry.recordedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: MOH 333 Safe Delivery & Newborn Register */}
      {activeTab === "deliveries" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  MOH 333 Official Register
                </span>
                <h3 className="text-lg font-black text-slate-900">Maternity Delivery & Newborn Registry</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Official Kenya Ministry of Health birth logs, APGAR scoring, AMTSL verification, and Linda Mama certificates.
              </p>
            </div>

            <button
              onClick={() => setShowDeliveryModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Safe Delivery</span>
            </button>
          </div>

          {/* Delivery Records Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveries.length === 0 ? (
              <div className="col-span-full text-center py-16 text-slate-400 space-y-2">
                <Baby className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No safe delivery records logged yet</p>
                <p className="text-xs text-slate-400">
                  Deliveries registered from the Labour Ward will automatically appear here with APGAR scores and birth notifications.
                </p>
              </div>
            ) : (
              deliveries.map((deliv) => (
                <div
                  key={deliv.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-mono font-black rounded-md">
                        {deliv.newborn.babyTagNumber}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1">
                        Mother: {deliv.patientName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Delivered: {new Date(deliv.deliveryDateTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        deliv.maternalStatusImmediate === "PPH Alert"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {deliv.maternalStatusImmediate}
                    </span>
                  </div>

                  {/* Newborn Details */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Newborn Gender:</span>
                      <strong className="text-slate-900 font-bold">{deliv.newborn.gender}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Birth Weight:</span>
                      <strong className="text-slate-900 font-bold">{deliv.newborn.birthWeightKg} kg</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">APGAR (1m / 5m):</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-black rounded border border-emerald-200">
                        {deliv.newborn.apgar1Min} / {deliv.newborn.apgar5Min}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Mode:</span>
                      <span className="text-slate-800 text-[11px] font-medium">{deliv.deliveryMode}</span>
                    </div>
                  </div>

                  {/* Essential Newborn Care Badges */}
                  <div className="flex items-center gap-1 flex-wrap text-[10px]">
                    {deliv.newborn.vitaminKGiven && (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                        Vit K1 ✓
                      </span>
                    )}
                    {deliv.newborn.eyeProphylaxisGiven && (
                      <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-200">
                        TEO Eye ✓
                      </span>
                    )}
                    {deliv.newborn.skinToSkinInitiated && (
                      <span className="px-1.5 py-0.5 bg-pink-50 text-pink-700 rounded border border-pink-200">
                        Skin-to-Skin ✓
                      </span>
                    )}
                    {deliv.amtslOxytocinGiven && (
                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                        AMTSL Oxytocin ✓
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={() => setShowCertificateModal(deliv)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Birth Certificate</span>
                    </button>

                    <button
                      onClick={() => onNavigateToBilling && onNavigateToBilling(deliv.patientId)}
                      className="text-xs font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
                    >
                      Discharge Billing →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Antenatal (ANC) & EDD Calculator */}
      {activeTab === "anc" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* EDD Calculator & Clinical Profiling */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">EDD & Gestational Calculator</h3>
                  <p className="text-[11px] text-slate-500">Naegele's Rule calculation from Last Menstrual Period</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    First Day of Last Menstrual Period (LMP):
                  </label>
                  <input
                    type="date"
                    value={calcLmp}
                    onChange={(e) => setCalcLmp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {calculatedEdd && (
                  <div className="p-4 bg-pink-50 rounded-2xl border border-pink-200 space-y-2 animate-in fade-in">
                    <p className="text-xs font-bold text-pink-950">Expected Date of Delivery (EDD):</p>
                    <p className="text-xl font-black text-pink-700">{calculatedEdd.eddFormatted}</p>
                    <div className="pt-2 border-t border-pink-100 flex items-center justify-between text-xs text-pink-900">
                      <span>Current Gestational Age:</span>
                      <strong className="text-sm font-black">
                        {calculatedEdd.gestationalAgeWeeks} Weeks + {calculatedEdd.gestationalAgeDays} Days
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* WHO 8-Contact ANC Model Guidelines */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-pink-600" />
                <span>Kenya MOH / WHO 2016 8-Contact ANC Schedule</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { contact: "ANC Contact 1", weeks: "Up to 12 weeks", desc: "First visit, maternal profile, blood group, Hb, HIV, VDRL, ultrasound dating" },
                  { contact: "ANC Contact 2", weeks: "20 weeks", desc: "Anomaly ultrasound, BP & urinalysis, IFAS iron supplementation" },
                  { contact: "ANC Contact 3", weeks: "26 weeks", desc: "Maternal weight, fetal movement check, pre-eclampsia screening" },
                  { contact: "ANC Contact 4", weeks: "30 weeks", desc: "Repeat Hb, Tetanus Toxoid (TT), malaria prophylaxis (IPTp)" },
                  { contact: "ANC Contact 5", weeks: "34 weeks", desc: "Fetal presentation & growth assessment, birth preparedness plan" },
                  { contact: "ANC Contact 6", weeks: "36 weeks", desc: "Identify high-risk factors, Linda Mama enrollment verification" },
                  { contact: "ANC Contact 7", weeks: "38 weeks", desc: "Pelvic assessment, review danger signs, transport plan to Labour Ward" },
                  { contact: "ANC Contact 8", weeks: "40 weeks", desc: "Term review, membrane check, monitor for labor onset" }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-extrabold text-slate-800">
                      <span>{item.contact}</span>
                      <span className="text-pink-600 text-[11px]">{item.weeks}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Maternity Pharmacy & Direct Requisitions */}
      {activeTab === "requisitions" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Maternity Fast Clinical Requisitions</h3>
              <p className="text-xs text-slate-500 mt-1">
                One-click obstetric emergency and routine orders wired directly to Smart Pharmacy & Diagnostics Laboratory.
              </p>
            </div>
            {selectedAdmission && (
              <span className="px-3 py-1 bg-pink-100 text-pink-800 text-xs font-bold rounded-full">
                Attached to: {selectedAdmission.patientName} ({selectedAdmission.ticketNo})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Oxytocin 10 IU / 1ml Injection", type: "med" as const, route: "IM (AMTSL Active Management of 3rd Stage)", qty: "1 ampoule" },
              { name: "Misoprostol 200mcg Tablets", type: "med" as const, route: "Rectal / Sublingual (PPH Management)", qty: "4 tablets (800mcg)" },
              { name: "Magnesium Sulphate 50% Injection", type: "med" as const, route: "IM/IV Pritchard Regimen (Pre-eclampsia/Eclampsia)", qty: "4g IV + 10g IM" },
              { name: "Tranexamic Acid (TXA) 500mg/5ml", type: "med" as const, route: "Slow IV infusion over 10 min for PPH", qty: "2 ampoules (1000mg)" },
              { name: "Amoxicillin / Clavulanate 1.2g IV", type: "med" as const, route: "IV for Chorioamnionitis / Prolonged Rupture", qty: "1 vial" },
              { name: "Full Haemogram / CBC + Blood Group & Crossmatch", type: "lab" as const, route: "Urgent diagnostic intake for PPH/Pre-eclampsia", qty: "1 panel" }
            ].map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                      {item.type === "med" ? "PHARMACY" : "LAB"}
                    </span>
                    <span className="text-[10px] text-pink-600 font-bold uppercase">{item.qty}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-2">{item.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{item.route}</p>
                </div>

                <button
                  onClick={() => handleQuickOrder(item)}
                  className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Direct Order</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Admit Mother to Labour Ward */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Admit Mother to Labour Ward</h3>
                  <p className="text-xs text-slate-500">Maternity intake, obstetric baseline & bed allocation</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdmitModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdmission} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mother's Full Name *</label>
                  <input
                    type="text"
                    required
                    value={admitPatientName}
                    onChange={(e) => setAdmitPatientName(e.target.value)}
                    placeholder="e.g. Mary Wanjiku Mwangi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">National ID / Passport</label>
                  <input
                    type="text"
                    value={admitNationalId}
                    onChange={(e) => setAdmitNationalId(e.target.value)}
                    placeholder="e.g. 29384812"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={admitAge}
                    onChange={(e) => setAdmitAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gestational Age (Weeks)</label>
                  <input
                    type="number"
                    value={admitGestationWeeks}
                    onChange={(e) => setAdmitGestationWeeks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gravida (G)</label>
                  <input
                    type="number"
                    value={admitGravida}
                    onChange={(e) => setAdmitGravida(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parity (P)</label>
                  <input
                    type="number"
                    value={admitParity}
                    onChange={(e) => setAdmitParity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cervical Dilation (cm)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={admitDilation}
                    onChange={(e) => setAdmitDilation(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fetal Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={admitFhr}
                    onChange={(e) => setAdmitFhr(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bed Allocation</label>
                  <select
                    value={admitBed}
                    onChange={(e) => setAdmitBed(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  >
                    <option value="Labour Suite 1">Labour Suite 1</option>
                    <option value="Labour Suite 2">Labour Suite 2</option>
                    <option value="Delivery Bed 1">Delivery Bed 1</option>
                    <option value="Delivery Bed 2">Delivery Bed 2</option>
                    <option value="Antenatal Bed 3">Antenatal Bed 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Membranes Status</label>
                  <select
                    value={admitMembranes}
                    onChange={(e) => setAdmitMembranes(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500"
                  >
                    <option value="Intact">Intact</option>
                    <option value="Ruptured Clear">Ruptured Clear</option>
                    <option value="Ruptured Meconium">Ruptured Meconium</option>
                    <option value="Ruptured Blood">Ruptured Blood</option>
                  </select>
                </div>
              </div>

              {/* High Risk Toggles */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">High-Risk Obstetric Flags:</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {["Pre-eclampsia / HTN", "Previous C-Section", "Breech Presentation", "Severe Anemia", "Multiple Gestation", "Meconium Stained Liquor"].map((flag) => {
                    const isSelected = admitHighRisks.includes(flag);
                    return (
                      <button
                        type="button"
                        key={flag}
                        onClick={() => {
                          setAdmitHighRisks((prev) =>
                            isSelected ? prev.filter((f) => f !== flag) : [...prev, flag]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-rose-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {flag} {isSelected ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Confirm Admission to Labour Ward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Partograph Observation */}
      {showPartographModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Log Partograph Observation</h3>
                <p className="text-xs text-slate-500">Patient: {selectedAdmission.patientName}</p>
              </div>
              <button
                onClick={() => setShowPartographModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPartograph} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hours in Active Labour</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={partoHours}
                    onChange={(e) => setPartoHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cervical Dilation (cm) *</label>
                  <input
                    type="number"
                    min="4"
                    max="10"
                    value={partoCervix}
                    onChange={(e) => setPartoCervix(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-pink-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fetal Heart Rate (bpm) *</label>
                  <input
                    type="number"
                    value={partoFhr}
                    onChange={(e) => setPartoFhr(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head Descent Station</label>
                  <select
                    value={partoDescent}
                    onChange={(e) => setPartoDescent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="-3">-3 (High / Floating)</option>
                    <option value="-2">-2</option>
                    <option value="-1">-1</option>
                    <option value="0">0 (At Ischial Spines / Engaged)</option>
                    <option value="+1">+1</option>
                    <option value="+2">+2</option>
                    <option value="+3">+3 (Crowning)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contractions / 10 min</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={partoContractionsCount}
                    onChange={(e) => setPartoContractionsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    value={partoContractionsDuration}
                    onChange={(e) => setPartoContractionsDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amniotic Fluid / Liquor</label>
                  <select
                    value={partoLiquor}
                    onChange={(e) => setPartoLiquor(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="I">I - Membranes Intact</option>
                    <option value="C">C - Ruptured Clear</option>
                    <option value="M">M - Ruptured Meconium Stained</option>
                    <option value="B">B - Blood Stained</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maternal BP (mmHg)</label>
                  <input
                    type="text"
                    value={partoBp}
                    onChange={(e) => setPartoBp(e.target.value)}
                    placeholder="120/80"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Observation Notes</label>
                <textarea
                  rows={2}
                  value={partoNotes}
                  onChange={(e) => setPartoNotes(e.target.value)}
                  placeholder="e.g. Good maternal effort, FHR regular post-contraction."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPartographModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black shadow-md"
                >
                  Save to Partograph Plot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Safe Delivery & Newborn APGAR */}
      {showDeliveryModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Record Safe Delivery & Newborn Care</h3>
                <p className="text-xs text-slate-500">
                  Kenya MOH 333 Delivery Register • Mother: {selectedAdmission.patientName}
                </p>
              </div>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Mode</label>
                  <select
                    value={delivMode}
                    onChange={(e) => setDelivMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="Spontaneous Vertex Delivery (SVD)">SVD (Spontaneous Vertex)</option>
                    <option value="Vacuum Extraction">Vacuum Extraction</option>
                    <option value="Breech Delivery">Assisted Breech</option>
                    <option value="Emergency C-Section">Emergency C-Section</option>
                    <option value="Elective C-Section">Elective C-Section</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perineum Outcome</label>
                  <select
                    value={delivPerineum}
                    onChange={(e) => setDelivPerineum(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="Intact">Intact Perineum</option>
                    <option value="Episiotomy">Episiotomy Repaired</option>
                    <option value="1st Degree Tear">1st Degree Tear</option>
                    <option value="2nd Degree Tear">2nd Degree Tear</option>
                    <option value="3rd Degree Tear">3rd Degree Tear</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Loss (ml) *</label>
                  <input
                    type="number"
                    value={delivBloodLoss}
                    onChange={(e) => setDelivBloodLoss(Number(e.target.value))}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-black ${
                      delivBloodLoss > 500 ? "border-rose-500 text-rose-600" : "border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              {/* Newborn Details */}
              <div className="p-4 bg-pink-50 rounded-2xl border border-pink-200 space-y-3">
                <h4 className="text-xs font-black text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Baby className="w-4 h-4 text-pink-600" />
                  <span>Immediate Newborn Assessment & APGAR</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Baby Gender</label>
                    <select
                      value={delivBabyGender}
                      onChange={(e) => setDelivBabyGender(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Birth Weight (kg)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={delivBirthWeight}
                      onChange={(e) => setDelivBirthWeight(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">APGAR 1 min (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={delivApgar1}
                      onChange={(e) => setDelivApgar1(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-pink-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">APGAR 5 min (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={delivApgar5}
                      onChange={(e) => setDelivApgar5(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                    />
                  </div>
                </div>

                {/* Kenya MOH Essential Newborn Care Checklist */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delivVitK}
                      onChange={(e) => setDelivVitK(e.target.checked)}
                      className="rounded text-pink-600"
                    />
                    <span>Vitamin K1 (1mg IM)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delivTeo}
                      onChange={(e) => setDelivTeo(e.target.checked)}
                      className="rounded text-pink-600"
                    />
                    <span>TEO 1% Eye Ointment</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delivSkinToSkin}
                      onChange={(e) => setDelivSkinToSkin(e.target.checked)}
                      className="rounded text-pink-600"
                    />
                    <span>Skin-to-Skin Contact</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delivBreastfeeding}
                      onChange={(e) => setDelivBreastfeeding(e.target.checked)}
                      className="rounded text-pink-600"
                    />
                    <span>Breastfed in &lt; 1hr</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delivAmtsl}
                      onChange={(e) => setDelivAmtsl(e.target.checked)}
                      className="rounded text-pink-600"
                    />
                    <span>AMTSL Oxytocin 10IU</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delivBcg}
                      onChange={(e) => setDelivBcg(e.target.checked)}
                      className="rounded text-pink-600"
                    />
                    <span>BCG & bOPV 0 Given</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md"
                >
                  Complete Delivery & Register MOH 333
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Birth Certificate / Notification */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="border-4 border-double border-pink-200 p-6 rounded-2xl bg-gradient-to-b from-pink-50/50 to-white text-center space-y-3">
              <Baby className="w-10 h-10 mx-auto text-pink-600" />
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Notification of Birth</h2>
              <p className="text-xs text-slate-500 font-serif">Ministry of Health Kenya • Register MOH 333</p>

              <div className="py-3 border-y border-pink-200/60 space-y-1 text-xs text-slate-700">
                <p>
                  This is to certify that a healthy{" "}
                  <strong className="text-slate-950 uppercase">{showCertificateModal.newborn.gender}</strong> infant
                </p>
                <p>
                  weighing <strong className="text-slate-950">{showCertificateModal.newborn.birthWeightKg} kg</strong> was
                  safely delivered to
                </p>
                <p className="text-base font-extrabold text-pink-700">{showCertificateModal.patientName}</p>
                <p className="text-[11px] text-slate-500">
                  on {new Date(showCertificateModal.deliveryDateTime).toLocaleDateString("en-KE", { dateStyle: "full" })} at{" "}
                  {new Date(showCertificateModal.deliveryDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-[10px] text-slate-400">
                  Tag ID: <span className="font-mono font-bold text-slate-800">{showCertificateModal.newborn.babyTagNumber}</span> • APGAR:{" "}
                  {showCertificateModal.newborn.apgar1Min}/10 (1m), {showCertificateModal.newborn.apgar5Min}/10 (5m)
                </p>
              </div>

              <p className="text-[10px] text-slate-400">
                Conducted by: {showCertificateModal.conductedBy}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCertificateModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

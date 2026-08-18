import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { QueueTicket, Medication, Invoice, Employee, SystemRole } from "../types";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Building2, 
  Users, 
  Monitor, 
  Activity, 
  CreditCard, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Stethoscope, 
  CheckCircle2, 
  ShieldAlert, 
  ChevronRight, 
  ShieldCheck, 
  RefreshCw,
  ShoppingBag,
  Cpu,
  FlaskRound,
  DollarSign,
  UserCheck,
  Package,
  Calendar,
  Layers,
  ArrowUpRight,
  ClipboardList,
  Shield
} from "lucide-react";

interface DashboardOverviewProps {
  tenant: any;
  toggles: any;
  onNavigateToTab: (tabId: string) => void;
  currentUserRole?: SystemRole;
  currentUserEmail?: string;
  currentEmployee?: Employee | null;
}

export default function DashboardOverview({ 
  tenant, 
  toggles, 
  onNavigateToTab,
  currentUserRole = "Super Admin",
  currentUserEmail = "",
  currentEmployee = null
}: DashboardOverviewProps) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    // 1. Queue Listener
    const unsubQueue = onSnapshot(collection(db, "queue"), (snapshot) => {
      const ticketsData: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        ticketsData.push({ id: doc.id, ...doc.data() } as QueueTicket);
      });
      setTickets(ticketsData);
    });

    // 2. Medications Listener
    const unsubMeds = onSnapshot(collection(db, "medications"), (snapshot) => {
      const medsData: Medication[] = [];
      snapshot.forEach((doc) => {
        medsData.push({ id: doc.id, ...doc.data() } as Medication);
      });
      setMeds(medsData);
    });

    // 3. Invoices Listener
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
      const invoicesData: Invoice[] = [];
      snapshot.forEach((doc) => {
        invoicesData.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(invoicesData);
    });

    // 4. Employees Listener
    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const empData: Employee[] = [];
      snapshot.forEach((doc) => {
        empData.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(empData);
    });

    return () => {
      unsubQueue();
      unsubMeds();
      unsubInvoices();
      unsubEmployees();
    };
  }, []);

  // Format currency
  const formatKES = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(value);
  };

  // Determine user identity
  const userName = currentEmployee?.name || currentUserEmail?.split("@")[0] || currentUserRole;
  const userDept = currentEmployee?.department || currentUserRole;

  // Render role-specific tailored dashboards
  if (currentUserRole === "Doctor") {
    const doctorWaiting = tickets.filter(t => 
      (t.currentDepartment === "doctor" || t.service?.toLowerCase().includes("doctor")) && 
      t.status === "pending"
    );
    const doctorServing = tickets.filter(t => 
      (t.currentDepartment === "doctor" || t.service?.toLowerCase().includes("doctor")) && 
      t.status === "serving"
    );
    const doctorCompletedToday = tickets.filter(t => 
      (t.currentDepartment === "doctor" || t.service?.toLowerCase().includes("doctor")) && 
      t.status === "completed"
    );

    const triageChartData = [
      { name: "Waiting", count: doctorWaiting.length },
      { name: "Consulting", count: doctorServing.length },
      { name: "Completed", count: doctorCompletedToday.length }
    ];

    return (
      <div className="space-y-6">
        {/* Clinician Header Banner */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-cyan-800/40 bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-cyan-900/60 backdrop-blur-md text-cyan-300 border border-cyan-700/60 rounded-2xl shadow-lg">
                <Stethoscope className="w-8 h-8 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold uppercase tracking-tight text-white">Dr. {userName}</h1>
                  <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Clinical Desk
                  </span>
                </div>
                <p className="text-xs text-cyan-200/80 font-medium mt-1">
                  Active Consultation Room • Digital Triage & Prescription Station • {tenant.name}
                </p>
              </div>
            </div>

            <div className="bg-cyan-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-cyan-700/50 text-right">
              <span className="text-[9px] text-cyan-300 font-black tracking-widest uppercase block">TODAY'S CONSULTATIONS</span>
              <span className="text-3xl font-black text-cyan-200 font-mono">{doctorCompletedToday.length}</span>
              <p className="text-[10px] text-cyan-300/90 font-semibold">Patients Evaluated</p>
            </div>
          </div>
        </div>

        {/* Doctor Bento Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("doctor")}
            className="bg-white border border-cyan-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-cyan-700 uppercase">In Waiting Line</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{doctorWaiting.length}</span>
            <p className="text-xs text-slate-500 mt-2">Patients queued for clinical consultation</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("doctor")}
            className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-700 uppercase">Active Session</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{doctorServing.length}</span>
            <p className="text-xs text-slate-500 mt-2">Currently in consultation desk</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("doctor")}
            className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-purple-700 uppercase">Completed</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{doctorCompletedToday.length}</span>
            <p className="text-xs text-slate-500 mt-2">Finished diagnosis & prescriptions today</p>
          </motion.div>
        </div>

        {/* Doctor Quick Access & Live Patient Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:col-span-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600" />
                <span>My Patient Consultation Queue</span>
              </h3>
              <button 
                onClick={() => onNavigateToTab("doctor")}
                className="text-[11px] font-bold text-cyan-600 hover:underline uppercase"
              >
                Open Clinician Desk &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {doctorWaiting.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No patients waiting right now. Your consultation queue is clear!
                </div>
              ) : (
                doctorWaiting.slice(0, 5).map(t => (
                  <div key={t.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 font-mono font-bold text-xs rounded-lg">{t.ticketNo}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{t.patientName}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {t.nationalId} • Age: {t.age || "N/A"} • Case: "{t.issue || "General Checkup"}"</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigateToTab("doctor")}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Examine
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:col-span-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Consultation Flow Overview</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={triageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0891b2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUserRole === "Pharmacy") {
    const criticalStockCount = meds.filter(m => m.quantity <= m.minThreshold).length;
    const outOfStock = meds.filter(m => m.quantity === 0);
    const pharmacyQueue = tickets.filter(t => t.currentDepartment === "pharmacy" && t.status === "pending");

    return (
      <div className="space-y-6">
        {/* Pharmacy Banner */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-teal-800/40 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-teal-900/60 backdrop-blur-md text-teal-300 border border-teal-700/60 rounded-2xl shadow-lg">
                <ShoppingBag className="w-8 h-8 text-teal-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold uppercase tracking-tight text-white">{userName}</h1>
                  <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-200 border border-teal-500/40 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Smart Pharmacy Desk
                  </span>
                </div>
                <p className="text-xs text-teal-200/80 font-medium mt-1">
                  Prescription Dispensing & Pharmaceutical Inventory Control • {tenant.name}
                </p>
              </div>
            </div>

            <div className="bg-teal-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-teal-700/50 text-right">
              <span className="text-[9px] text-teal-300 font-black tracking-widest uppercase block">MEDICATION LINES</span>
              <span className="text-3xl font-black text-teal-200 font-mono">{meds.length}</span>
              <p className="text-[10px] text-teal-300/90 font-semibold">Active Formulary Items</p>
            </div>
          </div>
        </div>

        {/* Pharmacy Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("pharmacy")}
            className="bg-white border border-teal-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-teal-700 uppercase">Dispensing Queue</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{pharmacyQueue.length}</span>
            <p className="text-xs text-slate-500 mt-2">Patients waiting for medicine checkout</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("pharmacy")}
            className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-amber-700 uppercase">Low Stock Alerts</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{criticalStockCount}</span>
            <p className="text-xs text-slate-500 mt-2">Items below safety re-order point</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("pharmacy")}
            className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-rose-700 uppercase">Stockouts</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{outOfStock.length}</span>
            <p className="text-xs text-slate-500 mt-2">Completely depleted drugs</p>
          </motion.div>
        </div>

        {/* Pharmacy Alerts Table */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Pharmaceutical Re-order Alerts</span>
            </h3>
            <button 
              onClick={() => onNavigateToTab("pharmacy")}
              className="text-[11px] font-bold text-teal-600 hover:underline uppercase"
            >
              Open Pharmacy Dispenser &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {meds.filter(m => m.quantity <= m.minThreshold).map(m => (
              <div key={m.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{m.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Category: {m.category} • Batch: {m.batchNo} • Expiry: {m.expiryDate}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg ${
                    m.quantity === 0 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {m.quantity === 0 ? "0 In Stock" : `${m.quantity} Units Left`}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Threshold: {m.minThreshold}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentUserRole === "Reception") {
    const receptionQueue = tickets.filter(t => t.currentDepartment === "reception" || !t.currentDepartment);
    const registeredToday = tickets.length;
    const verifiedBiometric = tickets.filter(t => t.biometricStatus === "verified").length;

    return (
      <div className="space-y-6">
        {/* Reception Banner */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-emerald-800/40 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-emerald-900/60 backdrop-blur-md text-emerald-300 border border-emerald-700/60 rounded-2xl shadow-lg">
                <UserCheck className="w-8 h-8 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold uppercase tracking-tight text-white">{userName}</h1>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Front Desk Reception
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 font-medium mt-1">
                  Patient Intake & SHA / Biometric Verification Station • {tenant.name}
                </p>
              </div>
            </div>

            <div className="bg-emerald-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-emerald-700/50 text-right">
              <span className="text-[9px] text-emerald-300 font-black tracking-widest uppercase block">TOTAL REGISTRATIONS</span>
              <span className="text-3xl font-black text-emerald-200 font-mono">{registeredToday}</span>
              <p className="text-[10px] text-emerald-300/90 font-semibold">Patients Admitted Today</p>
            </div>
          </div>
        </div>

        {/* Reception Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("reception")}
            className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-700 uppercase">Intake Waiting</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{receptionQueue.length}</span>
            <p className="text-xs text-slate-500 mt-2">Patients awaiting ticket assignment</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("reception")}
            className="bg-white border border-cyan-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-cyan-700 uppercase">Biometric Verified</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{verifiedBiometric}</span>
            <p className="text-xs text-slate-500 mt-2">Verified via SHA / Fingerprint portal</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("journey")}
            className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-blue-700 uppercase">Active Care Journey</span>
            </div>
            <span className="text-4xl font-black text-slate-900 font-mono">{tickets.filter(t => t.status !== "completed").length}</span>
            <p className="text-xs text-slate-500 mt-2">Patients navigating hospital departments</p>
          </motion.div>
        </div>

        {/* Quick Reception Action Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Quick Patient Admission</h3>
            <p className="text-xs text-slate-500">Issue biometric tickets and register SHA claimants instantly</p>
          </div>
          <button 
            onClick={() => onNavigateToTab("reception")}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Open Registration Kiosk &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (currentUserRole === "Lab") {
    const labQueue = tickets.filter(t => t.currentDepartment === "laboratory" && t.status === "pending");
    const labServing = tickets.filter(t => t.currentDepartment === "laboratory" && t.status === "serving");

    return (
      <div className="space-y-6">
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-amber-800/40 bg-gradient-to-r from-slate-950 via-amber-950 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-amber-900/60 backdrop-blur-md text-amber-300 border border-amber-700/60 rounded-2xl shadow-lg">
                <FlaskRound className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold uppercase tracking-tight text-white">{userName}</h1>
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Diagnostic Lab Workstation
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 font-medium mt-1">
                  Specimen Intake & Diagnostic Analysis • {tenant.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("diagnostics")}
            className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <span className="text-xs font-bold text-amber-700 uppercase">Tests Pending</span>
            <div className="text-4xl font-black text-slate-900 font-mono mt-1">{labQueue.length}</div>
            <p className="text-xs text-slate-500 mt-2">Specimens awaiting analysis</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("diagnostics")}
            className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <span className="text-xs font-bold text-emerald-700 uppercase">In Processing</span>
            <div className="text-4xl font-black text-slate-900 font-mono mt-1">{labServing.length}</div>
            <p className="text-xs text-slate-500 mt-2">Tests currently on laboratory equipment</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (currentUserRole === "HR" || currentUserRole === "Payroll") {
    const totalPayrollEst = employees.reduce((sum, e) => sum + (e.salary || 45000), 0);

    return (
      <div className="space-y-6">
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-rose-800/40 bg-gradient-to-r from-slate-950 via-rose-950 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-rose-900/60 backdrop-blur-md text-rose-300 border border-rose-700/60 rounded-2xl shadow-lg">
                <Users className="w-8 h-8 text-rose-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold uppercase tracking-tight text-white">{userName}</h1>
                  <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-200 border border-rose-500/40 rounded-full text-[9px] font-black uppercase tracking-widest">
                    HR & Talent Management
                  </span>
                </div>
                <p className="text-xs text-rose-200/80 font-medium mt-1">
                  Employee Credentialing & Compensation Operations • {tenant.name}
                </p>
              </div>
            </div>

            <div className="bg-rose-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-rose-700/50 text-right">
              <span className="text-[9px] text-rose-300 font-black tracking-widest uppercase block">ACTIVE STAFF</span>
              <span className="text-3xl font-black text-rose-200 font-mono">{employees.length}</span>
              <p className="text-[10px] text-rose-300/90 font-semibold">Registered Workers</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("hr")}
            className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <span className="text-xs font-bold text-rose-700 uppercase">Facility Staff Strength</span>
            <div className="text-4xl font-black text-slate-900 font-mono mt-1">{employees.length}</div>
            <p className="text-xs text-slate-500 mt-2">{employees.filter(e => e.department === "medical").length} Clinicians on duty</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("payroll")}
            className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <span className="text-xs font-bold text-emerald-700 uppercase">Monthly Payroll Outlay</span>
            <div className="text-3xl font-black text-slate-900 font-mono mt-1">{formatKES(totalPayrollEst)}</div>
            <p className="text-xs text-slate-500 mt-2">Estimated base monthly compensation</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (currentUserRole === "Finance" || currentUserRole === "Billing & Accounts") {
    const totalRevenue = invoices
      .filter(inv => inv.paymentStatus === "paid")
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const mpesaRev = invoices
      .filter(inv => inv.paymentStatus === "paid" && inv.paymentMethod === "M-PESA")
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const shaRev = invoices
      .filter(inv => inv.paymentStatus === "paid" && (inv.paymentMethod === "SHA/NHIF" || inv.split?.sha > 0))
      .reduce((sum, inv) => sum + (inv.split?.sha || inv.total || 0), 0);

    return (
      <div className="space-y-6">
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-emerald-800/40 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-emerald-900/60 backdrop-blur-md text-emerald-300 border border-emerald-700/60 rounded-2xl shadow-lg">
                <CreditCard className="w-8 h-8 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold uppercase tracking-tight text-white">{userName}</h1>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Finance & Billing Workspace
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 font-medium mt-1">
                  KRA eTIMS Invoicing & M-Pesa / SHA Reconciliation • {tenant.name}
                </p>
              </div>
            </div>

            <div className="bg-emerald-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-emerald-700/50 text-right">
              <span className="text-[9px] text-emerald-300 font-black tracking-widest uppercase block">TOTAL RECONCILED</span>
              <span className="text-3xl font-black text-emerald-200 font-mono">{formatKES(totalRevenue)}</span>
              <p className="text-[10px] text-emerald-300/90 font-semibold">Cleared Collections</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("billing")}
            className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <span className="text-xs font-bold text-emerald-700 uppercase">M-PESA Collections</span>
            <div className="text-3xl font-black text-slate-900 font-mono mt-1">{formatKES(mpesaRev)}</div>
            <p className="text-xs text-slate-500 mt-2">Instant STK & C2B collections</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => onNavigateToTab("billing")}
            className="bg-white border border-cyan-100 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <span className="text-xs font-bold text-cyan-700 uppercase">SHA / NHIF Claims</span>
            <div className="text-3xl font-black text-slate-900 font-mono mt-1">{formatKES(shaRev)}</div>
            <p className="text-xs text-slate-500 mt-2">Transmitted government insurance claims</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Fallback for Super Admin / Admin (Master Comprehensive Operations Overview)
  const activePatients = tickets.filter(t => t.status === "pending" || t.status === "serving");
  const completedPatientsCount = tickets.filter(t => t.status === "completed").length;
  const criticalStockCount = meds.filter(m => m.quantity <= m.minThreshold).length;

  const totalRevenue = invoices
    .filter(inv => inv.paymentStatus === "paid")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const mpesaRevenue = invoices
    .filter(inv => inv.paymentStatus === "paid" && inv.paymentMethod === "M-PESA")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const shaClaimRevenue = invoices
    .filter(inv => inv.paymentStatus === "paid" && (inv.paymentMethod === "SHA/NHIF" || inv.split?.sha > 0))
    .reduce((sum, inv) => sum + (inv.split?.sha || inv.total || 0), 0);

  const cashRevenue = invoices
    .filter(inv => inv.paymentStatus === "paid" && inv.paymentMethod === "Cash")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const insuranceRevenue = invoices
    .filter(inv => inv.paymentStatus === "paid" && (inv.paymentMethod === "Insurance" || inv.split?.insurance > 0))
    .reduce((sum, inv) => sum + (inv.split?.insurance || 0), 0);

  const compliantInvoices = invoices.filter(inv => inv.kraCompliantInvoiceNo).length;

  const deptFlowData = [
    { name: "Reception", Count: tickets.filter(t => t.currentDepartment === "reception").length },
    { name: "Live Queue", Count: tickets.filter(t => t.currentDepartment === "queue").length },
    { name: "Doctors", Count: tickets.filter(t => t.currentDepartment === "doctor").length },
    { name: "Diagnostics", Count: tickets.filter(t => t.currentDepartment === "laboratory" || t.currentDepartment === "radiology").length },
    { name: "Pharmacy", Count: tickets.filter(t => t.currentDepartment === "pharmacy").length },
    { name: "Billing", Count: tickets.filter(t => t.currentDepartment === "billing").length }
  ];

  const financeBreakdownData = [
    { name: "M-PESA", Revenue: mpesaRevenue },
    { name: "SHA / NHIF", Revenue: shaClaimRevenue },
    { name: "Out of Pocket", Revenue: cashRevenue },
    { name: "Insurance", Revenue: insuranceRevenue }
  ];

  const recentTickets = [...tickets]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Upper Brand Showcase */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-pink-800/50 bg-gradient-to-r from-pink-950 via-rose-900 to-slate-950">
        <div className="p-6 pb-12 relative text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3.5 bg-pink-900/60 backdrop-blur-md text-pink-300 border border-pink-700/60 rounded-2xl shadow-lg">
              <Building2 className="w-8 h-8 text-pink-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold uppercase tracking-tight text-white font-comfortaa">{tenant.name}</h1>
                <span className="px-2.5 py-0.5 bg-pink-500/20 text-pink-200 border border-pink-500/40 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xs">
                  {currentUserRole}
                </span>
              </div>
              <p className="text-xs text-pink-200/80 font-medium">
                Registered Primary Care Facility • {tenant.county} County • SHA Portal Connected • KRA eTIMS v2.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 self-start md:self-auto bg-pink-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-pink-700/50 shadow-md">
            <div className="text-right">
              <span className="block text-[9px] text-pink-300 font-black tracking-widest uppercase">SYSTEM REVENUE</span>
              <span className="text-3xl font-black text-rose-200 tracking-tight font-mono drop-shadow-sm">
                {formatKES(totalRevenue)}
              </span>
              <p className="text-[10px] text-pink-300/90 font-semibold">Total Cleared Revenue Today</p>
            </div>
          </div>
        </div>

        {/* Single Wave Bottom Edge SVG Divider */}
        <div className="relative w-full overflow-hidden leading-none pointer-events-none -mt-8 z-20">
          <svg
            viewBox="0 0 1440 50"
            preserveAspectRatio="none"
            className="block w-full h-6 md:h-8 fill-gray-100"
          >
            <path d="M 0,0 C 360,55 1080,-15 1440,30 L 1440,50 L 0,50 Z" />
          </svg>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={() => onNavigateToTab("queue")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 cursor-pointer transition-colors group shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <span className="block text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Queue Load</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl font-black text-slate-950 font-mono tracking-tight">{activePatients.length}</span>
            <span className="text-[11px] text-slate-500 font-bold">waiting</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>{completedPatientsCount} discharged today</span>
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={() => onNavigateToTab("billing")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 cursor-pointer transition-colors group shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <span className="block text-xs text-slate-500 font-semibold uppercase tracking-wider">Split Billing Reconciled</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-black text-slate-950 font-mono tracking-tight truncate">{formatKES(totalRevenue)}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-bold rounded">eTIMS Compliant</span>
            <span>{compliantInvoices} transmitted</span>
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={() => onNavigateToTab("pharmacy")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 cursor-pointer transition-colors group shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl border ${
              criticalStockCount > 0 
                ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" 
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
            }`}>
              <ShoppingBag className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </div>
          <span className="block text-xs text-slate-500 font-semibold uppercase tracking-wider">Pharmacy Stock</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl font-black text-slate-950 font-mono tracking-tight">{meds.length}</span>
            <span className="text-[11px] text-slate-500 font-bold">active lines</span>
          </div>
          <p className="text-[10px] mt-2 text-amber-600 flex items-center gap-1 font-semibold">
            {criticalStockCount > 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{criticalStockCount} medications near minimum threshold</span>
              </>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All inventory healthy
              </span>
            )}
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={() => onNavigateToTab("hr")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 cursor-pointer transition-colors group shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
          <span className="block text-xs text-slate-500 font-semibold uppercase tracking-wider">Staff Strength</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl font-black text-slate-950 font-mono tracking-tight">{employees.length}</span>
            <span className="text-[11px] text-slate-500 font-bold">active workers</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
            <span>{employees.filter(e => e.department === "medical").length} clinicians registered</span>
          </p>
        </motion.div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:col-span-7 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wide flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-600" />
              <span>Patient Flow Load by Department</span>
            </h3>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
              Live
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:col-span-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Financial Distribution</span>
            </h3>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
              KES
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financeBreakdownData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip formatter={(value: any) => formatKES(value)} />
                <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

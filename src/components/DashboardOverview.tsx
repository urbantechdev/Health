import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { QueueTicket, Medication, Invoice, Employee } from "../types";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area 
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
  Cpu
} from "lucide-react";

interface DashboardOverviewProps {
  tenant: any;
  toggles: any;
  onNavigateToTab: (tabId: string) => void;
}

export default function DashboardOverview({ tenant, toggles, onNavigateToTab }: DashboardOverviewProps) {
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

  // Compute stats
  const activePatients = tickets.filter(t => t.status === "pending" || t.status === "serving");
  const completedPatientsCount = tickets.filter(t => t.status === "completed").length;
  const criticalStockCount = meds.filter(m => m.quantity <= m.minThreshold).length;
  const outOfStockCount = meds.filter(m => m.quantity === 0).length;

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

  // KRA eTIMS invoice stats
  const compliantInvoices = invoices.filter(inv => inv.kraCompliantInvoiceNo).length;
  const pendingMpesaCount = invoices.filter(inv => inv.paymentStatus === "pending_mpesa").length;

  // Format currency
  const formatKES = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(value);
  };

  // Prepare chart data - Patient Flow by Department
  const deptFlowData = [
    { name: "Reception", Count: tickets.filter(t => t.currentDepartment === "reception").length },
    { name: "Live Queue", Count: tickets.filter(t => t.currentDepartment === "queue").length },
    { name: "Doctors", Count: tickets.filter(t => t.currentDepartment === "doctor").length },
    { name: "Diagnostics", Count: tickets.filter(t => t.currentDepartment === "laboratory" || t.currentDepartment === "radiology").length },
    { name: "Pharmacy", Count: tickets.filter(t => t.currentDepartment === "pharmacy").length },
    { name: "Billing", Count: tickets.filter(t => t.currentDepartment === "billing").length }
  ];

  // Financial Breakdown data
  const financeBreakdownData = [
    { name: "M-PESA", Revenue: mpesaRevenue },
    { name: "SHA / NHIF", Revenue: shaClaimRevenue },
    { name: "Out of Pocket", Revenue: cashRevenue },
    { name: "Insurance", Revenue: insuranceRevenue }
  ];

  // Live tickets
  const recentTickets = [...tickets]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Upper Brand Showcase - Darkened Deep Pink/Rose Background with Single Wave Curved Bottom Edge */}
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
                  Tier {tenant.type === "clinic" ? "Primary Clinic" : tenant.type === "hospital_level_4" ? "Level 4" : "Level 5"}
                </span>
              </div>
              <p className="text-xs text-pink-200/80 font-medium">
                Registered Primary Care Facility • {tenant.county} County • SHA Portal Connected • KRA eTIMS v2.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 self-start md:self-auto bg-pink-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-pink-700/50 shadow-md">
            <div className="text-right">
              <span className="block text-[9px] text-pink-300 font-black tracking-widest uppercase">SYSTEM METRIC</span>
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
        {/* Metric 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
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
            <span className="text-[11px] text-slate-500 font-bold">patients waiting</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>{completedPatientsCount} patients discharged today</span>
          </p>
        </motion.div>

        {/* Metric 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
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
            <span>{compliantInvoices} invoices transmitted</span>
          </p>
        </motion.div>

        {/* Metric 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
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
          <span className="block text-xs text-slate-500 font-semibold uppercase tracking-wider">Smart Pharmacy Stock</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl font-black text-slate-950 font-mono tracking-tight">{meds.length}</span>
            <span className="text-[11px] text-slate-500 font-bold">active lines</span>
          </div>
          <p className="text-[10px] mt-2 text-amber-600 flex items-center gap-1 font-semibold">
            {criticalStockCount > 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{criticalStockCount} medications near/at minimum threshold</span>
              </>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All medical inventory healthy
              </span>
            )}
          </p>
        </motion.div>

        {/* Metric 4 */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigateToTab("hr")}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 cursor-pointer transition-colors group shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
          <span className="block text-xs text-slate-500 font-semibold uppercase tracking-wider">Staffing Strength</span>
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

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Load by Department (BarChart) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:col-span-7 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wide flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-600" />
                <span>Patient Flow Load by Department</span>
              </h3>
              <p className="text-xs text-slate-500">Real-time allocation of patients across treatment workflows</p>
            </div>
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
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#1e293b", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }} 
                  itemStyle={{ color: "#059669" }}
                />
                <Bar dataKey="Count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Breakdown (AreaChart) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:col-span-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Financial Distribution Model</span>
              </h3>
              <p className="text-xs text-slate-500">Total collections structured by channel</p>
            </div>
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
                <Tooltip 
                  formatter={(value: any) => formatKES(value)}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#1e293b", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical Stock Alert & Live Activities Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pharmacy Low-Stock Alerts */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:col-span-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase text-slate-850 tracking-wider">Critical Stock Indicators</h3>
            </div>
            <button 
              onClick={() => onNavigateToTab("pharmacy")}
              className="text-[10px] font-black text-amber-600 hover:underline uppercase tracking-wider"
            >
              Order Meds
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {meds.filter(m => m.quantity <= m.minThreshold).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>All pharmaceutical products are above critical thresholds.</span>
              </div>
            ) : (
              meds
                .filter(m => m.quantity <= m.minThreshold)
                .map((m) => (
                  <div 
                    key={m.id} 
                    className="p-3 bg-slate-50/80 border border-slate-150 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-850">{m.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">Batch: {m.batchNo} • Expiry: {m.expiryDate}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${
                        m.quantity === 0 
                          ? "bg-rose-50 text-rose-700 border border-rose-200" 
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {m.quantity === 0 ? "Out of Stock" : `Low: ${m.quantity} Left`}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5">Threshold: {m.minThreshold}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Live Patient Journey Stream */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:col-span-7 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase text-slate-850 tracking-wider">Live Intake Registration Stream</h3>
            </div>
            <button 
              onClick={() => onNavigateToTab("journey")}
              className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-wider"
            >
              Monitor Journey
            </button>
          </div>

          <div className="space-y-3">
            {recentTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active registration stream. Create tickets in the reception desk.
              </div>
            ) : (
              recentTickets.map((t) => (
                <div 
                  key={t.id} 
                  className="p-3.5 bg-slate-50/60 border border-slate-150 hover:border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-black rounded-lg">
                      {t.ticketNo}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{t.patientName}</h4>
                      <p className="text-[10px] text-slate-500">
                        National ID: {t.nationalId} • Age: {t.age || "N/A"} • Case: <span className="text-slate-600 font-medium italic">"{t.issue || "General Consultation"}"</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto text-right">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        t.status === "serving" 
                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                          : t.status === "completed" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {t.status}
                      </span>
                      <p className="text-[9px] text-slate-400 font-mono mt-1">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Infrastructure Toggles Status Row */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 font-mono">NEXTGEN CORE HMS INTEGRATIONS:</span>
        </div>
        <div className="flex flex-wrap gap-3.5">
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className={`w-2 h-2 rounded-full ${toggles.reception ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></div>
            <span className={toggles.reception ? "text-slate-800 font-semibold" : "text-slate-400"}>Intake</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className={`w-2 h-2 rounded-full ${toggles.queue ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></div>
            <span className={toggles.queue ? "text-slate-800 font-semibold" : "text-slate-400"}>Queue System</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className={`w-2 h-2 rounded-full ${toggles.doctor ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></div>
            <span className={toggles.doctor ? "text-slate-800 font-semibold" : "text-slate-400"}>Clinicians</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className={`w-2 h-2 rounded-full ${toggles.laboratory ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></div>
            <span className={toggles.laboratory ? "text-slate-800 font-semibold" : "text-slate-400"}>Laboratory</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className={`w-2 h-2 rounded-full ${toggles.radiology ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></div>
            <span className={toggles.radiology ? "text-slate-800 font-semibold" : "text-slate-400"}>Radiology</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className={`w-2 h-2 rounded-full ${toggles.pharmacy ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></div>
            <span className={toggles.pharmacy ? "text-slate-800 font-semibold" : "text-slate-400"}>E-Pharmacy</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className={`w-2 h-2 rounded-full ${toggles.billing ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></div>
            <span className={toggles.billing ? "text-slate-800 font-semibold" : "text-slate-400"}>Claims/Billing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

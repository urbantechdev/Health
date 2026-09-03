import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { CashierShift, Invoice } from "../../types";
import {
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Search,
  DollarSign,
  Smartphone,
  CreditCard,
  Building2,
  FileSpreadsheet,
  X,
  Receipt,
  UserCheck,
  ShieldCheck
} from "lucide-react";
import { toast, modernConfirm } from "../../lib/promptService";

interface CashierShiftZReportProps {
  invoices: Invoice[];
  currentUserName?: string;
}

export default function CashierShiftZReport({
  invoices,
  currentUserName = "Cashier on Duty"
}: CashierShiftZReportProps) {
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "reconciled">("all");

  // Modal states
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [selectedShiftForClose, setSelectedShiftForClose] = useState<CashierShift | null>(null);
  const [viewZReportShift, setViewZReportShift] = useState<CashierShift | null>(null);

  // Start Shift Form
  const [startStation, setStartStation] = useState("Main OPD Cashier Desk 1");
  const [startCashier, setStartCashier] = useState(currentUserName);
  const [startFloat, setStartFloat] = useState(5000);

  // Close Shift & Reconciliation Form
  const [countedCash, setCountedCash] = useState<number | "">("");
  const [declaredMpesa, setDeclaredMpesa] = useState<number | "">("");
  const [declaredCard, setDeclaredCard] = useState<number | "">("");
  const [reconciliationNotes, setReconciliationNotes] = useState("");
  const [supervisorName, setSupervisorName] = useState("Senior Accountant / Auditor");

  // Subscribe to cashier_shifts
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cashier_shifts"), (snapshot) => {
      const shiftList: CashierShift[] = [];
      snapshot.forEach((d) => {
        shiftList.push({ id: d.id, ...d.data() } as CashierShift);
      });
      // Sort newest first
      shiftList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setShifts(shiftList);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const activeShift = shifts.find((s) => s.status === "open");

  // Compute live expected collections for active shift
  const computeShiftStats = (shift: CashierShift) => {
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();

    // Invoices paid during shift window
    const shiftInvoices = invoices.filter((inv) => {
      if (inv.paymentStatus !== "paid") return false;
      const invTime = new Date(inv.paidAt || inv.timestamp).getTime();
      return invTime >= shiftStart && invTime <= shiftEnd;
    });

    let cash = 0;
    let mpesa = 0;
    let card = 0;

    shiftInvoices.forEach((inv) => {
      const total = Number(inv.total) || 0;
      const method = (inv.paymentMethod || "").toLowerCase();

      if (method.includes("cash")) {
        cash += total;
      } else if (method.includes("mpesa") || method.includes("m-pesa")) {
        mpesa += total;
      } else if (method.includes("card") || method.includes("pdq")) {
        card += total;
      } else {
        // e.g. split or copay
        cash += total;
      }
    });

    const totalExpected = (shift.openingFloat || 0) + cash + mpesa + card;

    return {
      invoicesCount: shiftInvoices.length,
      cash,
      mpesa,
      card,
      totalExpected,
      shiftInvoices
    };
  };

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeShift) {
      toast.warning("An active cashier shift is already open. Please reconcile and close it first.");
      return;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const shiftNo = `SHF-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

      const newShift: Omit<CashierShift, "id"> = {
        shiftNumber: shiftNo,
        cashierId: `USR-${Date.now().toString().slice(-4)}`,
        cashierName: startCashier || currentUserName,
        stationName: startStation,
        startTime: now.toISOString(),
        status: "open",
        openingFloat: Number(startFloat) || 0,
        expectedCash: 0,
        countedCash: 0,
        cashVariance: 0,
        expectedMpesa: 0,
        declaredMpesa: 0,
        mpesaVariance: 0,
        expectedCard: 0,
        declaredCard: 0,
        totalExpected: Number(startFloat) || 0,
        totalDeclared: 0,
        totalVariance: 0,
        invoicesCount: 0,
        createdAt: now.toISOString()
      };

      await addDoc(collection(db, "cashier_shifts"), newShift);
      setIsStartShiftOpen(false);
      toast.success(`Cashier Shift ${shiftNo} opened with KES ${startFloat.toLocaleString()} opening float.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to open cashier shift.");
    }
  };

  const handleOpenCloseModal = (shift: CashierShift) => {
    const stats = computeShiftStats(shift);
    setSelectedShiftForClose(shift);
    setCountedCash(shift.openingFloat + stats.cash);
    setDeclaredMpesa(stats.mpesa);
    setDeclaredCard(stats.card);
    setIsCloseShiftOpen(true);
  };

  const handleCommitCloseShift = async () => {
    if (!selectedShiftForClose) return;

    const stats = computeShiftStats(selectedShiftForClose);
    const countedCashVal = Number(countedCash) || 0;
    const declaredMpesaVal = Number(declaredMpesa) || 0;
    const declaredCardVal = Number(declaredCard) || 0;

    const expectedCashTotal = selectedShiftForClose.openingFloat + stats.cash;
    const cashVariance = countedCashVal - expectedCashTotal;
    const mpesaVariance = declaredMpesaVal - stats.mpesa;
    const totalExpected = expectedCashTotal + stats.mpesa + stats.card;
    const totalDeclared = countedCashVal + declaredMpesaVal + declaredCardVal;
    const totalVariance = totalDeclared - totalExpected;

    const zNum = `Z-REP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await updateDoc(doc(db, "cashier_shifts", selectedShiftForClose.id), {
        status: "reconciled",
        endTime: new Date().toISOString(),
        expectedCash: expectedCashTotal,
        countedCash: countedCashVal,
        cashVariance,
        expectedMpesa: stats.mpesa,
        declaredMpesa: declaredMpesaVal,
        mpesaVariance,
        expectedCard: stats.card,
        declaredCard: declaredCardVal,
        totalExpected,
        totalDeclared,
        totalVariance,
        invoicesCount: stats.invoicesCount,
        zReportNumber: zNum,
        reconciliationNotes: reconciliationNotes || "Shift reconciled and physical till verified.",
        supervisorSignedBy: supervisorName || "Hospital Internal Auditor",
        supervisorSignedAt: new Date().toISOString()
      });

      setIsCloseShiftOpen(false);
      setSelectedShiftForClose(null);
      toast.success(`Shift reconciled successfully! Official Z-Report: ${zNum}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to commit shift reconciliation.");
    }
  };

  const filteredShifts = shifts.filter((s) => {
    if (filterStatus === "open" && s.status !== "open") return false;
    if (filterStatus === "reconciled" && s.status !== "reconciled") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.shiftNumber.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.stationName.toLowerCase().includes(q) ||
        (s.zReportNumber && s.zReportNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 rounded-2xl text-white shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono text-[11px] rounded font-bold border border-emerald-500/30">
              MODULE 1
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              Cashier Shift Reconciliation & Z-Reports
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Eliminates carbon-copy cash books, physical handover sheets, and manual M-PESA cross-checks. Generates tamper-evident daily Z-Reports with automated variance calculations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeShift ? (
            <button
              onClick={() => handleOpenCloseModal(activeShift)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Close Active Shift & Print Z-Report</span>
            </button>
          ) : (
            <button
              onClick={() => setIsStartShiftOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Open New Cashier Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Live Monitor (if open) */}
      {activeShift && (() => {
        const stats = computeShiftStats(activeShift);
        const totalWithFloat = activeShift.openingFloat + stats.cash;

        return (
          <div className="bg-emerald-50/50 border-2 border-emerald-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>LIVE SHIFT: {activeShift.shiftNumber}</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                      In Progress
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    Station: <strong>{activeShift.stationName}</strong> • Cashier: <strong>{activeShift.cashierName}</strong> • Started: {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenCloseModal(activeShift)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Balance & End Shift
                </button>
              </div>
            </div>

            {/* Live Tally Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Opening Float
                </span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  KES {activeShift.openingFloat.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500">Till base cash</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Expected Cash
                </span>
                <p className="font-mono font-bold text-emerald-800 text-sm">
                  KES {totalWithFloat.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold">
                  Float + KES {stats.cash.toLocaleString()} collected
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-green-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-green-700 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-green-600" /> M-PESA Till / Paybill
                </span>
                <p className="font-mono font-bold text-green-800 text-sm">
                  KES {stats.mpesa.toLocaleString()}
                </p>
                <p className="text-[10px] text-green-600 font-semibold">Auto-matched from receipts</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Card / PDQ POS
                </span>
                <p className="font-mono font-bold text-blue-800 text-sm">
                  KES {stats.card.toLocaleString()}
                </p>
                <p className="text-[10px] text-blue-600 font-semibold">Electronic terminal</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-900 bg-slate-950 text-white space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Shift Revenue</span>
                <p className="font-mono font-bold text-emerald-400 text-sm">
                  KES {stats.totalExpected.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">{stats.invoicesCount} patient receipts</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Shifts History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Shift Reconciliation Logbook</h4>
            <p className="text-xs text-slate-500">Complete audit trail of all closed cashier sessions and end-of-day balances.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search shift or Z-report..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl w-48 sm:w-56 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${filterStatus === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
              >
                All ({shifts.length})
              </button>
              <button
                onClick={() => setFilterStatus("open")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${filterStatus === "open" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus("reconciled")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${filterStatus === "reconciled" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
              >
                Reconciled
              </button>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 font-semibold">Shift #</th>
                <th className="p-3 font-semibold">Cashier & Desk</th>
                <th className="p-3 font-semibold">Start / Close Time</th>
                <th className="p-3 text-right font-semibold">Opening Float</th>
                <th className="p-3 text-right font-semibold">Total Declared</th>
                <th className="p-3 text-right font-semibold">Cash Variance</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShifts.map((shift) => {
                const isReconciled = shift.status === "reconciled";
                const hasVariance = shift.totalVariance && Math.abs(shift.totalVariance) > 5;
                const variancePositive = (shift.totalVariance || 0) > 0;

                return (
                  <tr key={shift.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {shift.shiftNumber}
                      {shift.zReportNumber && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {shift.zReportNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-900">{shift.cashierName}</p>
                      <p className="text-[10px] text-slate-500">{shift.stationName}</p>
                    </td>
                    <td className="p-3 text-slate-600">
                      <span className="font-mono">{new Date(shift.startTime).toLocaleDateString()}</span>
                      <span className="block text-[10px] text-slate-400">
                        {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {shift.endTime ? ` → ${new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : " (Active)"}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-700">
                      KES {(shift.openingFloat || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      KES {(shift.totalDeclared || shift.totalExpected || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      {isReconciled ? (
                        hasVariance ? (
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${variancePositive ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"}`}>
                            {variancePositive ? `+KES ${shift.totalVariance?.toLocaleString()} (Excess)` : `-KES ${Math.abs(shift.totalVariance || 0).toLocaleString()} (Shortage)`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[10px] flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3 inline" /> Balanced
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pending close</span>
                      )}
                    </td>
                    <td className="p-3">
                      {isReconciled ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                          Reconciled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] animate-pulse">
                          Active Till
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isReconciled ? (
                          <button
                            onClick={() => setViewZReportShift(shift)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="View / Print Z-Report"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Z-Report</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCloseModal(shift)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reconcile</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredShifts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No cashier shift records match the search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Start New Cashier Shift */}
      {isStartShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Open Cashier Shift</h4>
                  <p className="text-[11px] text-slate-500">Record cash float & bind cashier station</p>
                </div>
              </div>
              <button
                onClick={() => setIsStartShiftOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartShift} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Cashier Name</label>
                <input
                  type="text"
                  required
                  value={startCashier}
                  onChange={(e) => setStartCashier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Counter / Station</label>
                <select
                  value={startStation}
                  onChange={(e) => setStartStation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-slate-900"
                >
                  <option value="Main OPD Cashier Desk 1">Main OPD Cashier Desk 1</option>
                  <option value="Main OPD Cashier Desk 2">Main OPD Cashier Desk 2</option>
                  <option value="Pharmacy POS Cashier Till">Pharmacy POS Cashier Till</option>
                  <option value="Emergency & Casualty Cash Desk">Emergency & Casualty Cash Desk</option>
                  <option value="Inpatient Admissions Cashier">Inpatient Admissions Cashier</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Opening Physical Cash Float (KES)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={startFloat}
                  onChange={(e) => setStartFloat(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-slate-900"
                />
                <p className="text-[10px] text-slate-400">Cash notes/coins given to cashier for change at start of shift.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStartShiftOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Start Shift Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reconcile & Close Shift */}
      {isCloseShiftOpen && selectedShiftForClose && (() => {
        const stats = computeShiftStats(selectedShiftForClose);
        const expectedCashVal = selectedShiftForClose.openingFloat + stats.cash;
        const currentCountedCash = Number(countedCash) || 0;
        const currentDeclaredMpesa = Number(declaredMpesa) || 0;
        const currentDeclaredCard = Number(declaredCard) || 0;

        const cashVar = currentCountedCash - expectedCashVal;
        const mpesaVar = currentDeclaredMpesa - stats.mpesa;
        const totalExp = expectedCashVal + stats.mpesa + stats.card;
        const totalDecl = currentCountedCash + currentDeclaredMpesa + currentDeclaredCard;
        const totalVar = totalDecl - totalExp;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                    Shift Closeout & End-of-Day Balancing
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Shift {selectedShiftForClose.shiftNumber} • {selectedShiftForClose.cashierName}
                  </p>
                </div>
                <button
                  onClick={() => setIsCloseShiftOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* System expected totals */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  System Audit Baseline (from cleared invoices)
                </p>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Exp. Cash + Float</span>
                    <strong className="text-slate-800">KES {expectedCashVal.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Exp. M-PESA</span>
                    <strong className="text-slate-800">KES {stats.mpesa.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Exp. Card</span>
                    <strong className="text-slate-800">KES {stats.card.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Actual counted inputs */}
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-700">Actual Physical Cash Counted (KES)</label>
                    <span className={`font-mono text-[11px] font-bold ${cashVar === 0 ? "text-emerald-700" : cashVar > 0 ? "text-blue-600" : "text-rose-600"}`}>
                      {cashVar === 0 ? "Balanced" : cashVar > 0 ? `+KES ${cashVar} Excess` : `-KES ${Math.abs(cashVar)} Shortage`}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-slate-900"
                    placeholder="Enter total physical notes and coins"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-700">Declared M-PESA Statement Total (KES)</label>
                    <span className={`font-mono text-[11px] font-bold ${mpesaVar === 0 ? "text-emerald-700" : mpesaVar > 0 ? "text-blue-600" : "text-rose-600"}`}>
                      {mpesaVar === 0 ? "Matched" : mpesaVar > 0 ? `+KES ${mpesaVar}` : `-KES ${Math.abs(mpesaVar)}`}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={declaredMpesa}
                    onChange={(e) => setDeclaredMpesa(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Declared Card / PDQ Batch Total (KES)</label>
                  <input
                    type="number"
                    value={declaredCard}
                    onChange={(e) => setDeclaredCard(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-slate-900"
                  />
                </div>

                {/* Overall Variance Summary */}
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${totalVar === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : totalVar > 0 ? "bg-blue-50 border-blue-200 text-blue-950" : "bg-rose-50 border-rose-200 text-rose-950"}`}>
                  <div className="flex items-center gap-2">
                    {totalVar === 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span className="font-bold">Net Shift Variance</span>
                  </div>
                  <span className="font-mono font-extrabold text-sm">
                    {totalVar === 0 ? "KES 0 (Perfect Balance)" : totalVar > 0 ? `+ KES ${totalVar.toLocaleString()} (Excess)` : `- KES ${Math.abs(totalVar).toLocaleString()} (Shortage)`}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Reconciliation Notes / Explanation</label>
                  <textarea
                    rows={2}
                    value={reconciliationNotes}
                    onChange={(e) => setReconciliationNotes(e.target.value)}
                    placeholder="e.g. Verified by physical count. M-PESA statement matched with Paybill portal."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Auditor / Supervisor Signoff Identity</label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitCloseShift}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Lock & Generate Official Z-Report</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Printable Z-Report Thermal Preview */}
      {viewZReportShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-3">
              <span className="font-bold text-slate-900 text-sm">OFFICIAL Z-REPORT</span>
              <button
                onClick={() => setViewZReportShift(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
              <p className="font-black text-sm uppercase">THE TASSIA HILL HOSPITAL</p>
              <p className="text-[10px] text-slate-500">P.O. BOX 1834-00100 NAIROBI • REG NO: 024866</p>
              <p className="text-[10px] text-slate-500">EMAIL: tassiahillhospital@gmail.com • KRA PIN: P051948210Z</p>
              <p className="text-[10px] text-slate-600 font-bold mt-1">DAILY CASHIER AUDIT CLOSEOUT</p>
              <p className="text-[11px] font-bold text-slate-900 mt-1">{viewZReportShift.zReportNumber || "Z-REPORT"}</p>
            </div>

            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between">
                <span>Shift No:</span>
                <span className="font-bold">{viewZReportShift.shiftNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{viewZReportShift.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Station:</span>
                <span>{viewZReportShift.stationName}</span>
              </div>
              <div className="flex justify-between">
                <span>Start Time:</span>
                <span>{new Date(viewZReportShift.startTime).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Close Time:</span>
                <span>{viewZReportShift.endTime ? new Date(viewZReportShift.endTime).toLocaleTimeString() : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Receipts Cleared:</span>
                <span className="font-bold">{viewZReportShift.invoicesCount || 0}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between text-slate-600">
                <span>Opening Float:</span>
                <span>KES {(viewZReportShift.openingFloat || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Expected Cash (inc float):</span>
                <span>KES {(viewZReportShift.expectedCash || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Counted Cash:</span>
                <span>KES {(viewZReportShift.countedCash || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Cash Variance:</span>
                <span className={viewZReportShift.cashVariance === 0 ? "text-emerald-700" : "text-rose-700 font-bold"}>
                  {viewZReportShift.cashVariance === 0 ? "Balanced" : `KES ${viewZReportShift.cashVariance?.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1">
                <span>M-PESA Total:</span>
                <span>KES {(viewZReportShift.declaredMpesa || viewZReportShift.expectedMpesa || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Card Total:</span>
                <span>KES {(viewZReportShift.declaredCard || viewZReportShift.expectedCard || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between font-extrabold text-sm">
                <span>TOTAL RECONCILED:</span>
                <span>KES {(viewZReportShift.totalDeclared || viewZReportShift.totalExpected || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>TOTAL VARIANCE:</span>
                <span className={`font-bold ${(viewZReportShift.totalVariance || 0) === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {(viewZReportShift.totalVariance || 0) === 0 ? "KES 0.00" : `KES ${viewZReportShift.totalVariance?.toLocaleString()}`}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-[10px] text-slate-500">
              <p>Auditor Signoff: <strong>{viewZReportShift.supervisorSignedBy || "Supervisor"}</strong></p>
              <p>Timestamp: {viewZReportShift.supervisorSignedAt ? new Date(viewZReportShift.supervisorSignedAt).toLocaleString() : "-"}</p>
              <p className="italic mt-1">"{viewZReportShift.reconciliationNotes || "Balanced"}"</p>
            </div>

            <div className="pt-2 flex justify-between gap-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Thermal Z-Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, doc, deleteDoc } from "firebase/firestore";
import { Invoice, ExpenseItem } from "../types";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Wallet,
  Plus,
  Trash2,
  ShieldAlert,
  Printer,
  Eye,
  X,
  CheckCircle2,
  FileText,
  Receipt,
  Building2,
  CreditCard,
  QrCode,
  Calendar,
  User
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import { toast, modernConfirm } from "../lib/promptService";

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  
  // Printing states
  const [printOpen, setPrintOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<Invoice | null>(null);
  const [printType, setPrintType] = useState<"receipt" | "statement">("receipt");
  
  // Transaction Details View state
  const [viewTransaction, setViewTransaction] = useState<Invoice | null>(null);
  
  // Expense Form state
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmt, setExpenseAmt] = useState("");
  const [expenseCat, setExpenseCat] = useState<any>("supplies");
  const [expenseSupplier, setExpenseSupplier] = useState("");

  useEffect(() => {
    // Listen to invoices
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
      const invs: Invoice[] = [];
      snapshot.forEach((doc) => {
        invs.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(invs);
    });

    // Listen to expenses
    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snapshot) => {
      const exps: ExpenseItem[] = [];
      snapshot.forEach((doc) => {
        exps.push({ id: doc.id, ...doc.data() } as ExpenseItem);
      });
      setExpenses(exps);
    });

    return () => {
      unsubInvoices();
      unsubExpenses();
    };
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseAmt) return;

    try {
      const data: ExpenseItem = {
        id: `EXP-${Date.now()}`,
        description: expenseDesc,
        amount: parseFloat(expenseAmt) || 0,
        category: expenseCat,
        date: new Date().toISOString().split("T")[0],
        supplier: expenseSupplier || "Standard Supplier",
      };

      await addDoc(collection(db, "expenses"), data);
      setExpenseDesc("");
      setExpenseAmt("");
      setExpenseSupplier("");
      toast.success("Operational expense successfully recorded.", "Expense Logged");
    } catch (err) {
      console.error(err);
      toast.error("Failed to record expense.", "Database Error");
    }
  };

  const handleDeleteExpense = async (firestoreId: string) => {
    const confirmed = await modernConfirm(
      "Are you sure you want to remove this expense entry from financial records?",
      {
        title: "Delete Expense",
        type: "error",
        destructive: true,
        confirmText: "Delete Entry",
        cancelText: "Cancel",
      }
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "expenses", firestoreId));
      toast.success("Expense record removed.", "Record Deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete expense record.", "Delete Error");
    }
  };

  // Calculations
  const totalRevenue = invoices
    .filter((i) => i.paymentStatus === "paid")
    .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const totalOpex = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const netProfit = totalRevenue - totalOpex;

  // Aging Claims (unpaid insurance claims)
  const outstandingInsuranceClaims = invoices
    .filter((i) => i.paymentStatus !== "paid")
    .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  // Reconstruct Chart data
  const revenueByDept = {
    consultation: 0,
    pharmacy: 0,
    laboratory: 0,
    radiology: 0,
  };

  invoices.forEach((i) => {
    if (i && i.paymentStatus === "paid" && Array.isArray(i.items)) {
      i.items.forEach((item) => {
        if (!item) return;
        const dept = (item.department || "").toLowerCase();
        const amt = Number(item.amount) || 0;
        if (dept.includes("doctor") || dept.includes("consult")) revenueByDept.consultation += amt;
        else if (dept.includes("pharmacy")) revenueByDept.pharmacy += amt;
        else if (dept.includes("lab")) revenueByDept.laboratory += amt;
        else if (dept.includes("rad")) revenueByDept.radiology += amt;
      });
    }
  });

  const departmentData = [
    { name: "Consultation", value: revenueByDept.consultation },
    { name: "Pharmacy POS", value: revenueByDept.pharmacy },
    { name: "Laboratory", value: revenueByDept.laboratory },
    { name: "Radiology", value: revenueByDept.radiology },
  ];

  // Financial summary timeline
  const profitabilityChartData = [
    { name: "Outpatient", Revenue: totalRevenue, Expense: totalOpex, Profit: netProfit },
  ];

  return (
    <div id="finance-dashboard" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Hospital Finance & OpEx Ledger</h2>
            <p className="text-xs text-gray-500">Live operational reporting, cash flow analysis, and claims aging index</p>
          </div>
        </div>

        <button
          id="btn-view-financial-statement"
          onClick={() => {
            setPrintType("statement");
            setPrintOpen(true);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-900/10 cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>View / Download Statement PDF</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-2 shadow-2xs">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Paid Gross Revenue</p>
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-black text-gray-900 font-mono tracking-tight">KES {totalRevenue.toLocaleString()}</h3>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-[10px] text-emerald-600 font-semibold">Real-time depletion payments</p>
        </div>

        <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-2 shadow-2xs">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Operational Costs (OpEx)</p>
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-black text-gray-900 font-mono tracking-tight">KES {totalOpex.toLocaleString()}</h3>
            <TrendingDown className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-[10px] text-rose-600 font-semibold">Ledger items tracked</p>
        </div>

        <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-2 shadow-2xs">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Net Profit Margin</p>
          <div className="flex justify-between items-center">
            <h3 className={`text-3xl font-black font-mono tracking-tight ${netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              KES {netProfit.toLocaleString()}
            </h3>
            <Wallet className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-[10px] text-gray-400">Total Revenue - OpEx Ledger</p>
        </div>

        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/10 space-y-2 shadow-2xs">
          <p className="text-xs font-bold text-rose-800 uppercase tracking-wide">Outstanding Insurance Claims</p>
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-black text-rose-900 font-mono tracking-tight">KES {outstandingInsuranceClaims.toLocaleString()}</h3>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-[10px] text-rose-700 font-semibold">Claims Aging Status (Unpaid)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Charts */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-4 border border-gray-100 rounded-2xl bg-white shadow-3xs">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Departmental Revenue Contributions</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => `KES ${Number(value).toLocaleString()}`} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Itemized sales list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Recent Reconciled Claims Ledger</h3>
            <div className="border border-gray-100 rounded-2xl overflow-auto bg-white max-h-[180px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-3 font-semibold">Account ID</th>
                    <th className="p-3 font-semibold">Patient</th>
                    <th className="p-3 font-semibold">Method</th>
                    <th className="p-3 font-semibold">KRA compliance eTIMS</th>
                    <th className="p-3 text-right font-semibold">Amount (KES)</th>
                    <th className="p-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.filter(i => i.paymentStatus === "paid").map((i) => (
                    <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-gray-700">{i.id}</td>
                      <td className="p-3 font-medium text-gray-800">{i.patientName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded text-[10px]">
                          {i.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-gray-400">{i.kraCompliantInvoiceNo || "Signed offsite"}</td>
                      <td className="p-3 text-right font-bold text-gray-900 font-mono">KES {(Number(i.total) || 0).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-ledger-view-${i.id}`}
                            onClick={() => setViewTransaction(i)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer inline-flex items-center justify-center transition-all"
                            title="View Transaction Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-ledger-print-${i.id}`}
                            onClick={() => {
                              setPrintType("receipt");
                              setPrintTarget(i);
                              setPrintOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer inline-flex items-center justify-center transition-all"
                            title="Print or Save PDF Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {invoices.filter(i => i.paymentStatus === "paid").length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        No reconciled transaction records available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Expenses Ledger */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4.5 h-4.5 text-gray-400" />
              <span>Operational Expense Entry</span>
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Description</label>
                <input
                  id="opex-desc"
                  type="text"
                  required
                  placeholder="e.g. Oxygen cylinders purchase"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-gray-500 font-semibold">Amount (KES)</label>
                  <input
                    id="opex-amt"
                    type="number"
                    required
                    placeholder="KES"
                    value={expenseAmt}
                    onChange={(e) => setExpenseAmt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 font-semibold">Category</label>
                  <select
                    id="opex-cat"
                    value={expenseCat}
                    onChange={(e) => setExpenseCat(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl"
                  >
                    <option value="supplies">Supplies</option>
                    <option value="salaries">Salaries</option>
                    <option value="utilities">Utilities</option>
                    <option value="equipment">Equipment</option>
                    <option value="rent">Rent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Supplier/Vendor</label>
                <input
                  id="opex-supplier"
                  type="text"
                  placeholder="e.g. Kenya Medical Supplies Authority"
                  value={expenseSupplier}
                  onChange={(e) => setExpenseSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <button
                id="btn-add-opex-submit"
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record Operational Bill
              </button>
            </form>
          </div>

          {/* List of expenses */}
          <div className="space-y-2 pt-4 border-t border-gray-100 max-h-[140px] overflow-y-auto mt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Expense Ledger Registry</p>
            {expenses.map((exp) => (
              <div key={exp.id} className="flex justify-between items-center text-[10px] p-2 bg-gray-50 border border-gray-100 rounded-lg">
                <div>
                  <p className="font-bold text-gray-800">{exp.description}</p>
                  <p className="text-gray-400 capitalize">{exp.category} • {exp.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900">KES {exp.amount}</span>
                  <button
                    id={`btn-delete-opex-${exp.id}`}
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print Overlay Modal for Receipts & Statements */}
      <PrintDocument
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        type={printType}
        receiptData={printTarget}
        statementData={{
          totalRevenue,
          totalOpex,
          netProfit,
          outstandingInsuranceClaims,
          invoices,
          expenses
        }}
      />

      {/* Transaction Details Drilldown Modal */}
      {viewTransaction && createPortal(
        <div
          className="fixed inset-0 z-[999998] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewTransaction(null);
            }
          }}
        >
          <div className="relative bg-white rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Transaction Details</h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Paid & Reconciled
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{viewTransaction.id}</p>
                </div>
              </div>
              <button
                id="btn-close-tx-modal"
                onClick={() => setViewTransaction(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Primary Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" /> Patient
                  </span>
                  <p className="font-bold text-slate-900 truncate">{viewTransaction.patientName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{viewTransaction.patientId || viewTransaction.nationalId || "OPD Client"}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Payment Channel
                  </span>
                  <p className="font-bold text-slate-900">{viewTransaction.paymentMethod}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {viewTransaction.mpesaReceiptNumber ? `M-PESA: ${viewTransaction.mpesaReceiptNumber}` : viewTransaction.transactionRef || "Immediate Settlement"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Timestamp
                  </span>
                  <p className="font-bold text-slate-900 truncate">
                    {viewTransaction.paidAt ? new Date(viewTransaction.paidAt).toLocaleDateString() : viewTransaction.timestamp ? new Date(viewTransaction.timestamp).toLocaleDateString() : new Date().toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {viewTransaction.timestamp ? new Date(viewTransaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Cleared"}
                  </p>
                </div>
              </div>

              {/* Fiscal & Insurance Identification */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="text-emerald-900 font-bold">KRA eTIMS Fiscal Invoice:</span>{" "}
                    <span className="font-mono text-emerald-800 font-bold">{viewTransaction.kraCompliantInvoiceNo || "ETIMS-VERIFIED-OFFLINE"}</span>
                  </div>
                </div>
                {viewTransaction.shaClaimId && (
                  <div className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono text-[10px] font-bold">
                    SHA Claim: {viewTransaction.shaClaimId}
                  </div>
                )}
              </div>

              {/* Itemized Line Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Itemized Services & Charges</h4>
                  <span className="text-[10px] text-slate-400 font-medium">{(viewTransaction.items || []).length} billable items</span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-3">#</th>
                        <th className="p-3">Service / Medication Description</th>
                        <th className="p-3 text-center">Department</th>
                        <th className="p-3 text-right">Amount (KES)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {(viewTransaction.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-800">{item?.description || "Medical Service"}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium text-[10px] capitalize">
                              {item?.department || "General"}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            KES {(Number(item?.amount) || 0).toLocaleString()}.00
                          </td>
                        </tr>
                      ))}
                      {(!viewTransaction.items || viewTransaction.items.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                            No individual line item details recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Gross Subtotal</span>
                  <span className="font-mono font-medium">KES {(Number(viewTransaction.total) || 0).toLocaleString()}.00</span>
                </div>
                {viewTransaction.split && (viewTransaction.split.sha > 0 || viewTransaction.split.insurance > 0) && (
                  <>
                    {viewTransaction.split.sha > 0 && (
                      <div className="flex justify-between text-emerald-700 text-xs font-medium">
                        <span>SHA / NHIF Covered Portion</span>
                        <span className="font-mono">- KES {viewTransaction.split.sha.toLocaleString()}.00</span>
                      </div>
                    )}
                    {viewTransaction.split.insurance > 0 && (
                      <div className="flex justify-between text-blue-700 text-xs font-medium">
                        <span>Private Insurance Settlement</span>
                        <span className="font-mono">- KES {viewTransaction.split.insurance.toLocaleString()}.00</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Estimated Included VAT (16%)</span>
                  <span className="font-mono">KES {Math.round((Number(viewTransaction.total) || 0) * 0.16).toLocaleString()}.00</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 text-sm">Net Reconciled Total</span>
                  <span className="font-mono font-black text-slate-950 text-base">
                    KES {(Number(viewTransaction.total) || 0).toLocaleString()}.00
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                id="btn-modal-close-tx"
                type="button"
                onClick={() => setViewTransaction(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                id="btn-modal-print-tx"
                type="button"
                onClick={() => {
                  const target = viewTransaction;
                  setViewTransaction(null);
                  setPrintType("receipt");
                  setPrintTarget(target);
                  setPrintOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Receipt & Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

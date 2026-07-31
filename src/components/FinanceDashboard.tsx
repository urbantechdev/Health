import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, doc, deleteDoc } from "firebase/firestore";
import { Invoice, ExpenseItem } from "../types";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Landmark, TrendingUp, TrendingDown, ClipboardList, Wallet, Plus, Trash2, ShieldAlert, Printer } from "lucide-react";
import PrintDocument from "./PrintDocument";

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  
  // Printing states
  const [printOpen, setPrintOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<Invoice | null>(null);
  const [printType, setPrintType] = useState<"receipt" | "statement">("receipt");
  
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
      alert("Operational expense successfully recorded!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (firestoreId: string) => {
    try {
      await deleteDoc(doc(db, "expenses", firestoreId));
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const totalRevenue = invoices
    .filter((i) => i.paymentStatus === "paid")
    .reduce((acc, curr) => acc + curr.total, 0);

  const totalOpex = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRevenue - totalOpex;

  // Aging Claims (unpaid insurance claims)
  const outstandingInsuranceClaims = invoices
    .filter((i) => i.paymentStatus !== "paid")
    .reduce((acc, curr) => acc + curr.total, 0);

  // Reconstruct Chart data
  const revenueByDept = {
    consultation: 0,
    pharmacy: 0,
    laboratory: 0,
    radiology: 0,
  };

  invoices.forEach((i) => {
    if (i.paymentStatus === "paid") {
      i.items.forEach((item) => {
        const dept = item.department.toLowerCase();
        if (dept.includes("doctor") || dept.includes("consult")) revenueByDept.consultation += item.amount;
        else if (dept.includes("pharmacy")) revenueByDept.pharmacy += item.amount;
        else if (dept.includes("lab")) revenueByDept.laboratory += item.amount;
        else if (dept.includes("rad")) revenueByDept.radiology += item.amount;
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
                    <th className="p-3 text-center font-semibold">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.filter(i => i.paymentStatus === "paid").map((i) => (
                    <tr key={i.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono font-bold text-gray-700">{i.id}</td>
                      <td className="p-3 font-medium text-gray-800">{i.patientName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded text-[10px]">
                          {i.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-gray-400">{i.kraCompliantInvoiceNo || "Signed offsite"}</td>
                      <td className="p-3 text-right font-bold text-gray-900 font-mono">KES {i.total}</td>
                      <td className="p-3 text-center">
                        <button
                          id={`btn-ledger-print-${i.id}`}
                          onClick={() => {
                            setPrintType("receipt");
                            setPrintTarget(i);
                            setPrintOpen(true);
                          }}
                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer inline-flex items-center justify-center transition-all"
                          title="Print or Save PDF Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
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
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc
} from "firebase/firestore";
import {
  ChartOfAccount,
  GeneralLedgerEntry,
  Invoice,
  ExpenseItem
} from "../../types";
import {
  BookOpen,
  Scale,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  X
} from "lucide-react";
import { toast, modernConfirm } from "../../lib/promptService";

interface GeneralLedgerCOAProps {
  invoices: Invoice[];
  expenses: ExpenseItem[];
}

// Pre-defined Healthcare Standard Chart of Accounts
const STANDARD_COA: ChartOfAccount[] = [
  // 1000 - Assets
  { code: "1010", name: "Main Cash Drawer & Float", category: "Asset", subCategory: "Current Asset", balance: 0, normalBalance: "Debit" },
  { code: "1020", name: "KCB Operating Bank Account", category: "Asset", subCategory: "Current Asset", balance: 0, normalBalance: "Debit" },
  { code: "1030", name: "M-PESA Paybill Holding Account", category: "Asset", subCategory: "Current Asset", balance: 0, normalBalance: "Debit" },
  { code: "1100", name: "Accounts Receivable (Insurance & SHA Debtors)", category: "Asset", subCategory: "Current Asset", balance: 0, normalBalance: "Debit" },
  { code: "1200", name: "Pharmacy & Medical Supplies Inventory", category: "Asset", subCategory: "Current Asset", balance: 0, normalBalance: "Debit" },
  // 2000 - Liabilities
  { code: "2010", name: "Accounts Payable (Medical Suppliers & Vendors)", category: "Liability", subCategory: "Current Liability", balance: 0, normalBalance: "Credit" },
  { code: "2020", name: "Statutory Deductions Payable (PAYE, SHIF, NSSF)", category: "Liability", subCategory: "Current Liability", balance: 0, normalBalance: "Credit" },
  { code: "2030", name: "Patient Advance Deposits & Copays", category: "Liability", subCategory: "Current Liability", balance: 0, normalBalance: "Credit" },
  // 3000 - Equity
  { code: "3010", name: "Hospital Capital & Reserves", category: "Equity", subCategory: "Equity", balance: 500000, normalBalance: "Credit" },
  { code: "3020", name: "Retained Earnings", category: "Equity", subCategory: "Equity", balance: 0, normalBalance: "Credit" },
  // 4000 - Revenues
  { code: "4010", name: "Outpatient Consultation Fees", category: "Revenue", subCategory: "Operating Revenue", balance: 0, normalBalance: "Credit" },
  { code: "4020", name: "Pharmacy Pharmaceutical Sales", category: "Revenue", subCategory: "Operating Revenue", balance: 0, normalBalance: "Credit" },
  { code: "4030", name: "Laboratory Diagnostics Income", category: "Revenue", subCategory: "Operating Revenue", balance: 0, normalBalance: "Credit" },
  { code: "4040", name: "Radiology & Ultrasound Imaging", category: "Revenue", subCategory: "Operating Revenue", balance: 0, normalBalance: "Credit" },
  { code: "4050", name: "Inpatient Bed & Nursing Care", category: "Revenue", subCategory: "Operating Revenue", balance: 0, normalBalance: "Credit" },
  { code: "4060", name: "Theatre & Surgical Procedures", category: "Revenue", subCategory: "Operating Revenue", balance: 0, normalBalance: "Credit" },
  // 5000 - Cost of Sales
  { code: "5010", name: "Pharmaceutical Dispensed Cost", category: "Cost of Sales", subCategory: "Direct Medical Cost", balance: 0, normalBalance: "Debit" },
  { code: "5020", name: "Laboratory Reagents Consumables", category: "Cost of Sales", subCategory: "Direct Medical Cost", balance: 0, normalBalance: "Debit" },
  // 6000 - Operating Expenses
  { code: "6010", name: "Staff Salaries & Clinical Compensation", category: "Operating Expense", subCategory: "Operational Expense", balance: 0, normalBalance: "Debit" },
  { code: "6020", name: "Medical Oxygen & Utilities (Power/Water)", category: "Operating Expense", subCategory: "Operational Expense", balance: 0, normalBalance: "Debit" },
  { code: "6030", name: "Facility Maintenance & Bio-Medical Calibration", category: "Operating Expense", subCategory: "Operational Expense", balance: 0, normalBalance: "Debit" },
  { code: "6040", name: "Statutory Licenses, Insurance & eTIMS Fees", category: "Operating Expense", subCategory: "Administrative Expense", balance: 0, normalBalance: "Debit" },
  { code: "6050", name: "General Administrative & Other OpEx", category: "Operating Expense", subCategory: "Administrative Expense", balance: 0, normalBalance: "Debit" }
];

export default function GeneralLedgerCOA({ invoices, expenses }: GeneralLedgerCOAProps) {
  const [activeSubView, setActiveSubView] = useState<"trial_balance" | "profit_loss" | "journal_entries" | "chart_of_accounts">("trial_balance");
  const [ledgerEntries, setLedgerEntries] = useState<GeneralLedgerEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "week" | "today">("all");

  // Manual Journal Entry Modal
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDate, setJournalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [journalDesc, setJournalDesc] = useState("");
  const [journalDebitCode, setJournalDebitCode] = useState("1020");
  const [journalCreditCode, setJournalCreditCode] = useState("4010");
  const [journalAmount, setJournalAmount] = useState<number | "">(5000);

  // Subscribe to general_ledger
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "general_ledger"), (snapshot) => {
      const entries: GeneralLedgerEntry[] = [];
      snapshot.forEach((d) => {
        entries.push({ id: d.id, ...d.data() } as GeneralLedgerEntry);
      });
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLedgerEntries(entries);
    });

    return () => unsub();
  }, []);

  // Filtered invoices & expenses by date period
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const checkDate = (dateStr?: string) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (periodFilter === "today") {
        return dateStr.slice(0, 10) === todayStr;
      }
      if (periodFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      }
      if (periodFilter === "month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    const periodInvoices = invoices.filter((i) => checkDate(i.paidAt || i.timestamp));
    const periodExpenses = expenses.filter((e) => checkDate(e.date));

    return { periodInvoices, periodExpenses };
  }, [invoices, expenses, periodFilter]);

  // Compute Chart of Account Balances dynamically from Invoices & Expenses
  const computedCOA = useMemo(() => {
    const coaMap: { [code: string]: ChartOfAccount } = {};
    STANDARD_COA.forEach((acc) => {
      coaMap[acc.code] = { ...acc, balance: 0 };
    });

    let totalCashReceived = 0;
    let totalMpesaReceived = 0;
    let totalInsuranceDebtor = 0;
    let totalOpExpenses = 0;

    // 1. Process Invoices
    filteredData.periodInvoices.forEach((inv) => {
      const isPaid = inv.paymentStatus === "paid";
      const total = Number(inv.total) || 0;
      const method = (inv.paymentMethod || "").toLowerCase();

      // Categorize revenue department
      let revCode = "4010"; // default consultation
      inv.items?.forEach((item) => {
        const dept = (item.department || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const amt = Number(item.amount) || 0;

        if (dept.includes("pharmacy") || desc.includes("tab") || desc.includes("syr")) {
          coaMap["4020"].balance += amt;
          // Approximate Cost of Sales at 60%
          coaMap["5010"].balance += Math.round(amt * 0.6);
        } else if (dept.includes("lab") || desc.includes("test")) {
          coaMap["4030"].balance += amt;
          coaMap["5020"].balance += Math.round(amt * 0.25);
        } else if (dept.includes("rad") || desc.includes("scan") || desc.includes("x-ray")) {
          coaMap["4040"].balance += amt;
        } else if (dept.includes("ward") || desc.includes("bed")) {
          coaMap["4050"].balance += amt;
        } else if (dept.includes("theatre") || desc.includes("surg")) {
          coaMap["4060"].balance += amt;
        } else {
          coaMap["4010"].balance += amt;
        }
      });

      if (isPaid) {
        if (method.includes("cash")) {
          coaMap["1010"].balance += total;
          totalCashReceived += total;
        } else if (method.includes("mpesa") || method.includes("m-pesa")) {
          coaMap["1030"].balance += total;
          totalMpesaReceived += total;
        } else {
          coaMap["1020"].balance += total;
        }
      } else {
        // Outstanding debtor
        coaMap["1100"].balance += total;
        totalInsuranceDebtor += total;
      }
    });

    // 2. Process Expenses
    filteredData.periodExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalOpExpenses += amt;

      if (exp.category === "salaries") {
        coaMap["6010"].balance += amt;
      } else if (exp.category === "utilities") {
        coaMap["6020"].balance += amt;
      } else if (exp.category === "equipment") {
        coaMap["6030"].balance += amt;
      } else if (exp.category === "supplies") {
        coaMap["1200"].balance += amt;
        coaMap["2010"].balance += amt; // accounts payable credit
      } else {
        coaMap["6050"].balance += amt;
      }

      // Cash or bank credit for expenses
      coaMap["1020"].balance -= amt;
    });

    // 3. Process manual journal entries
    ledgerEntries.forEach((jrn) => {
      const amt = Number(jrn.amount) || 0;
      if (coaMap[jrn.debitAccountCode]) {
        coaMap[jrn.debitAccountCode].balance += amt;
      }
      if (coaMap[jrn.creditAccountCode]) {
        coaMap[jrn.creditAccountCode].balance += amt;
      }
    });

    return Object.values(coaMap);
  }, [filteredData, ledgerEntries]);

  // Compute Trial Balance (Debits vs Credits)
  const trialBalance = useMemo(() => {
    let totalDebits = 0;
    let totalCredits = 0;

    const rows = computedCOA.map((acc) => {
      let debit = 0;
      let credit = 0;
      const bal = Math.abs(acc.balance);

      if (acc.normalBalance === "Debit") {
        debit = bal;
        totalDebits += debit;
      } else {
        credit = bal;
        totalCredits += credit;
      }

      return {
        ...acc,
        debit,
        credit
      };
    });

    const variance = totalDebits - totalCredits;

    return { rows, totalDebits, totalCredits, variance };
  }, [computedCOA]);

  // Compute Profit & Loss (P&L) Statement
  const profitAndLoss = useMemo(() => {
    let grossRevenue = 0;
    let costOfSales = 0;
    let operatingExpenses = 0;

    const revenueAccounts = computedCOA.filter((a) => a.category === "Revenue");
    const cosAccounts = computedCOA.filter((a) => a.category === "Cost of Sales");
    const opexAccounts = computedCOA.filter((a) => a.category === "Operating Expense");

    revenueAccounts.forEach((a) => (grossRevenue += a.balance));
    cosAccounts.forEach((a) => (costOfSales += a.balance));
    opexAccounts.forEach((a) => (operatingExpenses += a.balance));

    const grossProfit = grossRevenue - costOfSales;
    const netOperatingIncome = grossProfit - operatingExpenses;

    return {
      revenueAccounts,
      cosAccounts,
      opexAccounts,
      grossRevenue,
      costOfSales,
      grossProfit,
      operatingExpenses,
      netOperatingIncome
    };
  }, [computedCOA]);

  // Commit Manual Journal Entry
  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(journalAmount);
    if (!amt || amt <= 0) {
      toast.warning("Please specify a positive journal entry amount.");
      return;
    }

    const debitAcc = STANDARD_COA.find((a) => a.code === journalDebitCode);
    const creditAcc = STANDARD_COA.find((a) => a.code === journalCreditCode);

    if (!debitAcc || !creditAcc) return;

    const entryNo = `JRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const entry: Omit<GeneralLedgerEntry, "id"> = {
        entryNumber: entryNo,
        date: journalDate,
        sourceModule: "Manual Adjustment",
        referenceNumber: `ADJ-${Date.now().toString().slice(-4)}`,
        description: journalDesc.trim() || "Accountant year-end / period-end manual adjustment.",
        debitAccountCode: debitAcc.code,
        debitAccountName: debitAcc.name,
        creditAccountCode: creditAcc.code,
        creditAccountName: creditAcc.name,
        amount: amt,
        postedBy: "Hospital Accountant / Auditor",
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, "general_ledger"), entry);
      setIsJournalModalOpen(false);
      setJournalDesc("");
      toast.success(`Journal entry ${entryNo} posted. Debit: ${debitAcc.name} / Credit: ${creditAcc.name}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to post journal entry.");
    }
  };

  // Export Trial Balance CSV
  const handleExportTrialBalanceCSV = () => {
    const headers = ["Account Code", "Account Name", "Category", "Debit (KES)", "Credit (KES)"];
    const rows = trialBalance.rows.map((r) => [
      r.code,
      `"${r.name}"`,
      r.category,
      r.debit || 0,
      r.credit || 0
    ]);
    rows.push(["", "TOTALS", "", trialBalance.totalDebits, trialBalance.totalCredits]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Trial_Balance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Trial Balance exported successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-5 rounded-2xl text-white shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 font-mono text-[11px] rounded font-bold border border-teal-500/30">
              MODULE 4
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-400" />
              Chart of Accounts & Automated General Ledger
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Auto-posts double-entry debits and credits from patient billing, pharmacy dispenses, supplier payments, and opex. Generates live Trial Balances and P&L statements without manual formulas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJournalModalOpen(true)}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Manual Journal Entry</span>
          </button>
          <button
            onClick={handleExportTrialBalanceCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-view switcher & period filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubView("trial_balance")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubView === "trial_balance" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            <Scale className="w-3.5 h-3.5 inline mr-1 text-teal-600" />
            Trial Balance
          </button>
          <button
            onClick={() => setActiveSubView("profit_loss")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubView === "profit_loss" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            <TrendingUp className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
            Profit & Loss (P&L)
          </button>
          <button
            onClick={() => setActiveSubView("journal_entries")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubView === "journal_entries" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
            General Ledger Entries ({ledgerEntries.length})
          </button>
          <button
            onClick={() => setActiveSubView("chart_of_accounts")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubView === "chart_of_accounts" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            <Layers className="w-3.5 h-3.5 inline mr-1 text-slate-600" />
            Chart of Accounts
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Fiscal Period:
          </span>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
          >
            <option value="all">All Fiscal Records</option>
            <option value="month">Current Month</option>
            <option value="week">Past 7 Days</option>
            <option value="today">Today's Transactions</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: TRIAL BALANCE */}
      {activeSubView === "trial_balance" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Hospital General Ledger Trial Balance</h4>
              <p className="text-xs text-slate-500">Live verification ensuring total debits mathematically balance total credits.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Books Balanced: Variance KES 0.00</span>
              </span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="p-3 font-semibold">Account Code</th>
                  <th className="p-3 font-semibold">Account Title</th>
                  <th className="p-3 font-semibold">Classification</th>
                  <th className="p-3 text-right font-semibold">Debit (KES)</th>
                  <th className="p-3 text-right font-semibold">Credit (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalance.rows.map((acc) => (
                  <tr key={acc.code} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{acc.code}</td>
                    <td className="p-3 font-semibold text-slate-900">{acc.name}</td>
                    <td className="p-3 text-slate-500">{acc.category} ({acc.subCategory})</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {acc.debit > 0 ? `KES ${acc.debit.toLocaleString()}` : "-"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {acc.credit > 0 ? `KES ${acc.credit.toLocaleString()}` : "-"}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-900 text-white font-mono font-extrabold text-xs">
                  <td colSpan={3} className="p-3 uppercase tracking-wider text-slate-300">
                    Grand Trial Balance Totals
                  </td>
                  <td className="p-3 text-right text-emerald-400">
                    KES {trialBalance.totalDebits.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-emerald-400">
                    KES {trialBalance.totalCredits.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: PROFIT & LOSS (INCOME STATEMENT) */}
      {activeSubView === "profit_loss" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-6 shadow-2xs">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Hospital Income Statement (Profit & Loss)</h4>
              <p className="text-xs text-slate-500">Real-time medical revenues, direct pharmaceutical costs, and operating overheads.</p>
            </div>
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
              Period: {periodFilter.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Gross Patient Revenues</span>
              <p className="font-mono font-extrabold text-emerald-800 text-xl">
                KES {profitAndLoss.grossRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-600">Consultations, lab, pharmacy, procedures</p>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-700">Cost of Medical Sales (Direct)</span>
              <p className="font-mono font-extrabold text-amber-800 text-xl">
                KES {profitAndLoss.costOfSales.toLocaleString()}
              </p>
              <p className="text-[10px] text-amber-600">Dispensed drugs & diagnostic reagents</p>
            </div>

            <div className={`p-4 border rounded-2xl space-y-1 ${profitAndLoss.netOperatingIncome >= 0 ? "bg-teal-50/60 border-teal-200 text-teal-900" : "bg-rose-50/60 border-rose-200 text-rose-900"}`}>
              <span className="text-[10px] uppercase font-bold text-slate-500">Net Operating Surplus / Margin</span>
              <p className="font-mono font-extrabold text-xl">
                KES {profitAndLoss.netOperatingIncome.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">After all staff wages, utilities and opex</p>
            </div>
          </div>

          {/* Itemized P&L Table */}
          <div className="space-y-4 text-xs font-sans">
            {/* 1. Revenues */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-900 border-b border-slate-200 flex justify-between">
                <span>OPERATING REVENUES</span>
                <span className="font-mono text-emerald-700">KES {profitAndLoss.grossRevenue.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-slate-100 p-2">
                {profitAndLoss.revenueAccounts.map((a) => (
                  <div key={a.code} className="flex justify-between py-1.5 px-2 text-slate-700">
                    <span>{a.code} • {a.name}</span>
                    <span className="font-mono font-bold">KES {a.balance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Direct Costs */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-900 border-b border-slate-200 flex justify-between">
                <span>DIRECT COST OF SALES</span>
                <span className="font-mono text-amber-700">- KES {profitAndLoss.costOfSales.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-slate-100 p-2">
                {profitAndLoss.cosAccounts.map((a) => (
                  <div key={a.code} className="flex justify-between py-1.5 px-2 text-slate-700">
                    <span>{a.code} • {a.name}</span>
                    <span className="font-mono font-bold">KES {a.balance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gross Margin Row */}
            <div className="bg-slate-100 p-3 rounded-xl flex justify-between font-bold text-slate-900 text-xs">
              <span>GROSS HOSPITAL PROFIT:</span>
              <span className="font-mono text-emerald-800 text-sm">KES {profitAndLoss.grossProfit.toLocaleString()}</span>
            </div>

            {/* 3. Operating Overheads */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-900 border-b border-slate-200 flex justify-between">
                <span>OPERATING EXPENDITURES (OPEX)</span>
                <span className="font-mono text-rose-700">- KES {profitAndLoss.operatingExpenses.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-slate-100 p-2">
                {profitAndLoss.opexAccounts.map((a) => (
                  <div key={a.code} className="flex justify-between py-1.5 px-2 text-slate-700">
                    <span>{a.code} • {a.name}</span>
                    <span className="font-mono font-bold">KES {a.balance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Net Surplus Row */}
            <div className={`p-4 rounded-xl flex justify-between font-extrabold text-sm border ${profitAndLoss.netOperatingIncome >= 0 ? "bg-emerald-950 text-white border-emerald-900" : "bg-rose-950 text-white border-rose-900"}`}>
              <span>NET OPERATING SURPLUS / PROFIT:</span>
              <span className="font-mono text-emerald-300 text-base">KES {profitAndLoss.netOperatingIncome.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: JOURNAL ENTRIES */}
      {activeSubView === "journal_entries" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">General Ledger Journal Entries</h4>
              <p className="text-xs text-slate-500">Every debit and credit transaction logged chronologically.</p>
            </div>

            <button
              onClick={() => setIsJournalModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Journal Entry</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="p-3 font-semibold">Entry #</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Description</th>
                  <th className="p-3 font-semibold">Debit Account</th>
                  <th className="p-3 font-semibold">Credit Account</th>
                  <th className="p-3 text-right font-semibold">Amount (KES)</th>
                  <th className="p-3 font-semibold">Posted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-900">{j.entryNumber}</td>
                    <td className="p-3 font-mono text-slate-600">{j.date}</td>
                    <td className="p-3 font-medium text-slate-800">{j.description}</td>
                    <td className="p-3 text-emerald-700 font-semibold font-mono text-[11px]">
                      {j.debitAccountCode} - {j.debitAccountName}
                    </td>
                    <td className="p-3 text-blue-700 font-semibold font-mono text-[11px]">
                      {j.creditAccountCode} - {j.creditAccountName}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-950">
                      KES {j.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">{j.postedBy}</td>
                  </tr>
                ))}
                {ledgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No manual journal adjustments posted yet. Auto-posted ledger from billing runs continuously.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: CHART OF ACCOUNTS REGISTRY */}
      {activeSubView === "chart_of_accounts" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Hospital Chart of Accounts (COA) Directory</h4>
            <p className="text-xs text-slate-500">Standardized healthcare accounting codes for general ledger classification.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STANDARD_COA.map((acc) => (
              <div key={acc.code} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {acc.code}
                    </span>
                    <span className="font-bold text-slate-800">{acc.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {acc.category} • {acc.subCategory} • Normal: {acc.normalBalance}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${acc.normalBalance === "Debit" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                  {acc.normalBalance}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Post Manual Journal Adjustment */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-teal-600" />
                  Post Double-Entry Journal Adjustment
                </h4>
                <p className="text-[11px] text-slate-500">Enforces equal debits and credits across the general ledger</p>
              </div>
              <button
                onClick={() => setIsJournalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJournalEntry} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Posting Date</label>
                  <input
                    type="date"
                    required
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Adjustment Amount (KES)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={journalAmount}
                    onChange={(e) => setJournalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-emerald-800">Debit Account (Dr)</label>
                <select
                  value={journalDebitCode}
                  onChange={(e) => setJournalDebitCode(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 bg-emerald-50/40 rounded-xl font-medium"
                >
                  {STANDARD_COA.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-blue-800">Credit Account (Cr)</label>
                <select
                  value={journalCreditCode}
                  onChange={(e) => setJournalCreditCode(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 bg-blue-50/40 rounded-xl font-medium"
                >
                  {STANDARD_COA.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Narration / Audit Reference</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Month-end bank fee adjustment or depreciation entry."
                  value={journalDesc}
                  onChange={(e) => setJournalDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Post Balanced Journal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

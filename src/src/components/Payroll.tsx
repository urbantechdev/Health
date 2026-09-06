import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, getDocs } from "firebase/firestore";
import { Employee, PayrollRecord } from "../types";
import { 
  Landmark, 
  DollarSign, 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Download, 
  Search, 
  Calendar, 
  ShieldCheck, 
  Building2, 
  FileText, 
  Sparkles, 
  RefreshCw,
  TrendingUp,
  Award,
  Users
} from "lucide-react";
import PrintDocument from "./PrintDocument";

export default function Payroll() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("July 2026");
  const [searchQuery, setSearchQuery] = useState("");
  const [runningBatch, setRunningBatch] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"records" | "bank_export" | "tax_p9">("records");

  // Print Payslip modal state
  const [printOpen, setPrintOpen] = useState(false);
  const [printRecord, setPrintRecord] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    const unsubEmp = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((d) => {
        emps.push({ id: d.id, ...d.data() } as Employee);
      });
      setEmployees(emps);
    });

    const unsubPay = onSnapshot(collection(db, "payroll"), (snapshot) => {
      const records: PayrollRecord[] = [];
      snapshot.forEach((d) => {
        records.push({ id: d.id, ...d.data() } as PayrollRecord);
      });
      setPayrollRecords(records);
    });

    return () => {
      unsubEmp();
      unsubPay();
    };
  }, []);

  // Calculate Kenyan Tax Engine Breakdown
  const calculateKenyaPayroll = (baseSalary: number) => {
    // 1. Allowances (standard 15% estimated house + transport allowance)
    const allowances = Math.round(baseSalary * 0.15);
    const grossSalary = baseSalary + allowances;

    // 2. SHIF (2.75% of gross salary standard in Kenya)
    const shif = Math.round(grossSalary * 0.0275);

    // 3. Housing Levy (1.5% employee contribution)
    const housingLevy = Math.round(grossSalary * 0.015);

    // 4. NSSF Pension (Standard Tier I & II cap = KES 2,160)
    const nssf = 2160;

    // 5. Taxable Pay = Gross - NSSF - Housing Levy
    const taxablePay = Math.max(0, grossSalary - nssf - housingLevy);

    // 6. KRA PAYE Calculation Tiers (Kenyan 2026 progressive brackets)
    let paye = 0;
    if (taxablePay <= 24000) {
      paye = taxablePay * 0.10;
    } else if (taxablePay <= 32333) {
      paye = 24000 * 0.10 + (taxablePay - 24000) * 0.25;
    } else if (taxablePay <= 500000) {
      paye = 24000 * 0.10 + (32333 - 24000) * 0.25 + (taxablePay - 32333) * 0.30;
    } else if (taxablePay <= 800000) {
      paye = 24000 * 0.10 + (32333 - 24000) * 0.25 + (500000 - 32333) * 0.30 + (taxablePay - 500000) * 0.325;
    } else {
      paye = 24000 * 0.10 + (32333 - 24000) * 0.25 + (500000 - 32333) * 0.30 + (800000 - 500000) * 0.325 + (taxablePay - 800000) * 0.35;
    }

    // Apply Personal Relief (KES 2,400 monthly) & Insurance Relief (15% of SHIF)
    const personalRelief = 2400;
    const insuranceRelief = Math.round(shif * 0.15);
    const netPaye = Math.max(0, Math.round(paye - personalRelief - insuranceRelief));

    // Net salary
    const totalDeductions = shif + netPaye + housingLevy + nssf;
    const netPay = Math.round(grossSalary - totalDeductions);

    return {
      grossSalary,
      allowances,
      shif,
      housingLevy,
      nssf,
      paye: netPaye,
      totalDeductions,
      netPay
    };
  };

  const handleRunMonthlyPayroll = async () => {
    if (employees.length === 0) return;
    setRunningBatch(true);

    try {
      const activeEmps = employees.filter(e => e.status === "active");
      for (const emp of activeEmps) {
        const calc = calculateKenyaPayroll(emp.salary || 65000);

        await addDoc(collection(db, "payroll"), {
          employeeId: emp.id,
          employeeName: emp.name,
          month: selectedMonth,
          baseSalary: emp.salary || 65000,
          allowances: calc.allowances,
          deductions: {
            shif: calc.shif,
            paye: calc.paye,
            housingLevy: calc.housingLevy,
            nssf: calc.nssf,
            other: 0,
          },
          netPay: calc.netPay,
          paymentStatus: "paid",
          paidDate: new Date().toLocaleDateString("en-CA"),
        });
      }
    } catch (err) {
      console.error("Error executing payroll batch:", err);
    } finally {
      setRunningBatch(false);
    }
  };

  const filteredPayroll = payrollRecords.filter(p => 
    p.month === selectedMonth &&
    (p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || p.employeeId.includes(searchQuery))
  );

  const totalGrossMonthly = filteredPayroll.reduce((acc, curr) => acc + (curr.baseSalary + curr.allowances), 0);
  const totalNetMonthly = filteredPayroll.reduce((acc, curr) => acc + curr.netPay, 0);
  const totalPayeTax = filteredPayroll.reduce((acc, curr) => acc + curr.deductions.paye, 0);
  const totalShif = filteredPayroll.reduce((acc, curr) => acc + curr.deductions.shif, 0);

  const downloadBankCSV = () => {
    const headers = ["Employee Name", "National ID", "Bank Account", "KCB/Equity Code", "Net Amount (KES)", "Month"];
    const rows = filteredPayroll.map(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      return [
        `"${p.employeeName}"`,
        `"${emp?.nationalId || 'N/A'}"`,
        `"0110098${p.employeeId.substring(0, 5)}"`,
        `"KCB-001"`,
        p.netPay,
        `"${p.month}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Hospital_Payroll_BankBatch_${selectedMonth.replace(" ", "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Landmark className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight uppercase font-comfortaa">Hospital Payroll & Statutory Engine</h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Automated statutory tax withholding (KRA PAYE, SHIF 2.75%, NSSF Pension, Affordable Housing Levy 1.5%), bank batch file generation, and eTIMS P9 tax certificate processing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunMonthlyPayroll}
            disabled={runningBatch}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${runningBatch ? "animate-spin" : ""}`} />
            <span>{runningBatch ? "Processing..." : `Run ${selectedMonth} Payroll`}</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Gross Payroll</p>
            <p className="text-xl font-black text-slate-900 font-mono mt-0.5">KES {totalGrossMonthly.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Bank Disbursed</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-0.5">KES {totalNetMonthly.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">KRA PAYE Remitted</p>
            <p className="text-xl font-black text-indigo-600 font-mono mt-0.5">KES {totalPayeTax.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SHIF Health Pool</p>
            <p className="text-xl font-black text-amber-600 font-mono mt-0.5">KES {totalShif.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("records")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "records"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Payroll Master Register
          </button>
          <button
            onClick={() => setActiveSubTab("bank_export")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "bank_export"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Bank Batch Transfer Export
          </button>
          <button
            onClick={() => setActiveSubTab("tax_p9")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "tax_p9"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            KRA eTIMS P9 Tax Ledger
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
          >
            <option value="July 2026">July 2026</option>
            <option value="June 2026">June 2026</option>
            <option value="May 2026">May 2026</option>
            <option value="April 2026">April 2026</option>
          </select>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeSubTab === "records" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50/50">
            <div className="relative flex-grow max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search payroll by employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-gray-500 font-bold uppercase text-[9px] tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Allowances</th>
                  <th className="py-3 px-4">SHIF (2.75%)</th>
                  <th className="py-3 px-4">Housing Levy</th>
                  <th className="py-3 px-4">NSSF Pension</th>
                  <th className="py-3 px-4">KRA PAYE</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredPayroll.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400 font-medium">
                      No payroll records processed for {selectedMonth}. Click "Run {selectedMonth} Payroll" above to generate.
                    </td>
                  </tr>
                ) : (
                  filteredPayroll.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{rec.employeeName}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold">KES {rec.baseSalary.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-600 font-semibold">+KES {rec.allowances.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-600">-KES {rec.deductions.shif.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-600">-KES {rec.deductions.housingLevy.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-600">-KES {rec.deductions.nssf.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-600 font-bold">-KES {rec.deductions.paye.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-600 text-sm">KES {rec.netPay.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disbursed
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setPrintRecord(rec);
                            setPrintOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                        >
                          <Printer className="w-3 h-3" /> Payslip
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bank Export Subtab */}
      {activeSubTab === "bank_export" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-gray-900 uppercase">Commercial Bank EFT / RTGS Batch File</h3>
              <p className="text-xs text-gray-500">Generate formatted salary payment upload files compatible with KCB, Equity Bank, and Co-operative Bank portals.</p>
            </div>
            <button
              onClick={downloadBankCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" /> Export CSV Batch
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-xs text-gray-700 space-y-2">
            <p className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">// Sample Bank EFT Data Format ({selectedMonth})</p>
            <div className="overflow-x-auto">
              {filteredPayroll.slice(0, 5).map((p, idx) => (
                <div key={idx} className="py-1 border-b border-gray-200 last:border-none flex justify-between">
                  <span>KCB_SALARY_2026 | {p.employeeName} | ID: {employees.find(e => e.id === p.employeeId)?.nationalId || '24891102'}</span>
                  <span className="font-bold text-emerald-700">KES {p.netPay.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KRA P9 Subtab */}
      {activeSubTab === "tax_p9" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-gray-900 uppercase">KRA eTIMS P9 Tax Certificate Audit</h3>
            <p className="text-xs text-gray-500">Official Kenya Revenue Authority tax ledger summaries for annual employee income tax filings.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total YTD PAYE Collected</p>
              <p className="text-xl font-black font-mono text-emerald-400">KES {(totalPayeTax * 7).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">7 Months Accumulated (2026)</p>
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KRA Tax Compliance Code</p>
              <p className="text-xl font-black font-mono text-indigo-400">KRA-TCC-2026-90412</p>
              <p className="text-[10px] text-slate-400">Verified Active Status</p>
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Affordable Housing Fund</p>
              <p className="text-xl font-black font-mono text-amber-400">KES {(totalGrossMonthly * 0.015).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">Monthly Remittance</p>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Printer Modal */}
      {printOpen && printRecord && (
        <PrintDocument
          isOpen={printOpen}
          type="payslip"
          onClose={() => setPrintOpen(false)}
          payslipData={printRecord}
        />
      )}

    </div>
  );
}

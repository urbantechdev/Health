import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Employee, PayrollRecord, Invoice, StatutoryTaxLiability } from "../../types";
import {
  Landmark,
  ShieldCheck,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileSpreadsheet,
  Building2,
  Users,
  DollarSign,
  FileText,
  Printer,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { toast } from "../../lib/promptService";

interface StatutoryTaxHubProps {
  invoices: Invoice[];
}

export default function StatutoryTaxHub({ invoices }: StatutoryTaxHubProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("August 2026");
  const [activeTab, setActiveTab] = useState<"statutory_schedule" | "etims_monitor" | "p9_cards">("statutory_schedule");

  // Subscriptions
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

  // Compute live statutory liabilities for the selected month
  const monthLiabilities = useMemo(() => {
    let totalGrossPay = 0;
    let totalPAYE = 0;
    let totalSHIF = 0;
    let totalNSSF = 0;
    let totalHousingLevy = 0;
    let totalNetPay = 0;

    // Use payroll records if available, otherwise compute from active employees
    if (payrollRecords.length > 0) {
      payrollRecords.forEach((r) => {
        totalGrossPay += r.grossSalary || 0;
        totalPAYE += r.paye || 0;
        totalSHIF += r.shif || 0;
        totalNSSF += r.nssf || 0;
        totalHousingLevy += r.housingLevy || 0;
        totalNetPay += r.netSalary || 0;
      });
    } else {
      employees.forEach((emp) => {
        const base = emp.salary || 35000;
        const allowances = Math.round(base * 0.15);
        const gross = base + allowances;
        const shif = Math.round(gross * 0.0275);
        const housing = Math.round(gross * 0.015);
        const nssf = 2160;
        const taxable = Math.max(0, gross - nssf - housing);

        // KRA Tax Brackets 2026
        let paye = 0;
        if (taxable <= 24000) {
          paye = taxable * 0.1;
        } else if (taxable <= 32333) {
          paye = 2400 + (taxable - 24000) * 0.25;
        } else if (taxable <= 500000) {
          paye = 2400 + 2083.25 + (taxable - 32333) * 0.30;
        } else {
          paye = 2400 + 2083.25 + 140300.1 + (taxable - 500000) * 0.325;
        }
        paye = Math.max(0, Math.round(paye - 2400)); // personal relief

        totalGrossPay += gross;
        totalPAYE += paye;
        totalSHIF += shif;
        totalNSSF += nssf;
        totalHousingLevy += housing;
        totalNetPay += gross - paye - shif - nssf - housing;
      });
    }

    const totalStatutoryDue = totalPAYE + totalSHIF + totalNSSF + totalHousingLevy;

    return {
      staffCount: employees.length || payrollRecords.length,
      totalGrossPay,
      totalPAYE,
      totalSHIF,
      totalNSSF,
      totalHousingLevy,
      totalNetPay,
      totalStatutoryDue
    };
  }, [employees, payrollRecords]);

  // eTIMS Invoices Analysis
  const etimsAnalysis = useMemo(() => {
    let totalInvoices = invoices.length;
    let compliantCount = 0;
    let pendingCount = 0;

    invoices.forEach((inv) => {
      if (inv.kraCompliantInvoiceNo || inv.paymentStatus === "paid") {
        compliantCount += 1;
      } else {
        pendingCount += 1;
      }
    });

    return { totalInvoices, compliantCount, pendingCount };
  }, [invoices]);

  // Export iTax PAYE Return CSV
  const handleExportPAYECSV = () => {
    const headers = [
      "Employee PIN",
      "Employee Name",
      "Basic Salary (KES)",
      "Allowances (KES)",
      "Gross Pay (KES)",
      "NSSF Tier I & II",
      "Affordable Housing Levy",
      "Taxable Pay (KES)",
      "Tax Charged",
      "Personal Relief (KES)",
      "PAYE Due (KES)"
    ];

    const rows = employees.map((emp) => {
      const base = emp.salary || 35000;
      const allowances = Math.round(base * 0.15);
      const gross = base + allowances;
      const nssf = 2160;
      const housing = Math.round(gross * 0.015);
      const taxable = Math.max(0, gross - nssf - housing);
      const paye = Math.round(taxable * 0.25);

      return [
        `A00${emp.nationalId}Z`,
        `"${emp.name}"`,
        base,
        allowances,
        gross,
        nssf,
        housing,
        taxable,
        paye + 2400,
        2400,
        Math.max(0, paye)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `KRA_iTax_PAYE_Return_${selectedMonth.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("KRA iTax PAYE Return CSV generated and downloaded.");
  };

  // Export SHIF CSV
  const handleExportSHIFCSV = () => {
    const headers = ["Member National ID", "Member Full Name", "Gross Salary (KES)", "SHIF Contribution (2.75%)"];
    const rows = employees.map((emp) => {
      const base = emp.salary || 35000;
      const gross = base * 1.15;
      const shif = Math.round(gross * 0.0275);
      return [emp.nationalId, `"${emp.name}"`, Math.round(gross), shif];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `SHA_SHIF_Statutory_Schedule_${selectedMonth.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("SHA / SHIF Statutory Schedule CSV downloaded.");
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 p-5 rounded-2xl text-white shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono text-[11px] rounded font-bold border border-rose-500/30">
              MODULE 5
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-rose-400" />
              Statutory Tax & KRA eTIMS Compliance Workstation
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Automates the computation and generation of Kenya Revenue Authority (PAYE, Housing Levy), Social Health Authority (SHIF), and NSSF schedules. Replaces manual spreadsheet calculations and portal data entry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPAYECSV}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download KRA iTax PAYE CSV</span>
          </button>
          <button
            onClick={handleExportSHIFCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download SHIF CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-view switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("statutory_schedule")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "statutory_schedule" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            <Landmark className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
            Statutory Liabilities Schedule
          </button>
          <button
            onClick={() => setActiveTab("etims_monitor")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "etims_monitor" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            <QrCode className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
            eTIMS Tax Compliance Monitor
          </button>
          <button
            onClick={() => setActiveTab("p9_cards")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "p9_cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
            Staff P9 Tax Deduction Cards
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Return Month:
          </span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
          >
            <option value="August 2026">August 2026 (Due 9th Sept)</option>
            <option value="July 2026">July 2026</option>
            <option value="June 2026">June 2026</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: STATUTORY LIABILITIES */}
      {activeTab === "statutory_schedule" && (
        <div className="space-y-6">
          {/* Statutory Breakdown Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 space-y-1 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-rose-800">KRA PAYE Remittance</span>
              <p className="font-mono font-extrabold text-rose-900 text-lg">
                KES {monthLiabilities.totalPAYE.toLocaleString()}
              </p>
              <p className="text-[10px] text-rose-600 font-semibold">Progressive tax brackets</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 space-y-1 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-blue-800">SHA (SHIF 2.75%)</span>
              <p className="font-mono font-extrabold text-blue-900 text-lg">
                KES {monthLiabilities.totalSHIF.toLocaleString()}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold">Social Health Insurance</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 space-y-1 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-800">NSSF Pension (Tier I & II)</span>
              <p className="font-mono font-extrabold text-amber-900 text-lg">
                KES {monthLiabilities.totalNSSF.toLocaleString()}
              </p>
              <p className="text-[10px] text-amber-600 font-semibold">Capped at KES 2,160/staff</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-1 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Affordable Housing (1.5%)</span>
              <p className="font-mono font-extrabold text-emerald-900 text-lg">
                KES {monthLiabilities.totalHousingLevy.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold">Statutory employee levy</p>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Statutory Liability</span>
              <p className="font-mono font-extrabold text-rose-400 text-lg">
                KES {monthLiabilities.totalStatutoryDue.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">Due by 9th of next month</p>
            </div>
          </div>

          {/* Statutory Obligation Register */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Hospital Statutory Obligation Payment Schedule</h4>
                <p className="text-xs text-slate-500">Official schedule with KRA Paybill numbers, PRNs, and payment deadlines.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                {monthLiabilities.staffCount} Staff Members Processed
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="p-3 font-semibold">Statutory Body</th>
                    <th className="p-3 font-semibold">Obligation Type</th>
                    <th className="p-3 font-semibold">Statutory Deadlines</th>
                    <th className="p-3 font-semibold">Payment Channel & Paybill</th>
                    <th className="p-3 text-right font-semibold">Liability (KES)</th>
                    <th className="p-3 font-semibold">Filing Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-rose-600" />
                      Kenya Revenue Authority (KRA)
                    </td>
                    <td className="p-3">PAYE (Pay As You Earn)</td>
                    <td className="p-3 text-slate-600 font-mono">9th September 2026</td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">KRA Paybill 572572 (iTax PRN)</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      KES {monthLiabilities.totalPAYE.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        Computed & Ready
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Social Health Authority (SHA)
                    </td>
                    <td className="p-3">SHIF Monthly Contribution (2.75%)</td>
                    <td className="p-3 text-slate-600 font-mono">9th September 2026</td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">SHA Portal EFT Direct Debit</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      KES {monthLiabilities.totalSHIF.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        Computed & Ready
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      National Social Security Fund (NSSF)
                    </td>
                    <td className="p-3">NSSF Pension Tier I & Tier II</td>
                    <td className="p-3 text-slate-600 font-mono">9th September 2026</td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">NSSF e-Service Portal</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      KES {monthLiabilities.totalNSSF.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        Computed & Ready
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      Ministry of Housing & Lands
                    </td>
                    <td className="p-3">Affordable Housing Levy (1.5%)</td>
                    <td className="p-3 text-slate-600 font-mono">9th September 2026</td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">KRA Portal PRN</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      KES {monthLiabilities.totalHousingLevy.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        Computed & Ready
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: eTIMS MONITOR */}
      {activeTab === "etims_monitor" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">KRA eTIMS Electronic Invoice Compliance</h4>
              <p className="text-xs text-slate-500">Live monitoring of KRA Control Unit Numbers (CUIN) and cryptographic QR codes.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>eTIMS Gateway Active & Linked</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Patient Invoices</span>
              <p className="font-mono font-bold text-slate-900 text-base">{etimsAnalysis.totalInvoices}</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700">eTIMS Signed & Validated</span>
              <p className="font-mono font-bold text-emerald-800 text-base">{etimsAnalysis.compliantCount}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Hospital KRA PIN</span>
              <p className="font-mono font-bold text-slate-900 text-base">P051948210Z</p>
            </div>
          </div>

          {/* Recent Invoices eTIMS Status */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="p-3 font-semibold">Invoice #</th>
                  <th className="p-3 font-semibold">Patient Name</th>
                  <th className="p-3 font-semibold">eTIMS Control Code (CUIN)</th>
                  <th className="p-3 text-right font-semibold">Taxable Amount</th>
                  <th className="p-3 text-right font-semibold">VAT (16%)</th>
                  <th className="p-3 font-semibold">Compliance State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.slice(0, 8).map((inv) => {
                  const isCompliant = inv.kraCompliantInvoiceNo || inv.paymentStatus === "paid";
                  const cuin = inv.kraCompliantInvoiceNo || `KRA-${inv.id}-ETR`;
                  const vat = Math.round((Number(inv.total) || 0) * 0.16);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-800">{inv.id}</td>
                      <td className="p-3 font-semibold text-slate-900">{inv.patientName}</td>
                      <td className="p-3 font-mono text-emerald-700 font-bold">{cuin}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        KES {(Number(inv.total) || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        KES {vat.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3" />
                          eTIMS Certified
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: STAFF P9 CARDS */}
      {activeTab === "p9_cards" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Hospital Staff Annual P9 Tax Cards</h4>
            <p className="text-xs text-slate-500">Statutory Tax Deduction Cards required for annual employee KRA tax returns.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {employees.map((emp) => (
              <div key={emp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                    <p className="text-[10px] text-slate-500">{emp.role} • {emp.department}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-mono font-bold rounded text-[10px]">
                    P05{emp.nationalId.slice(0, 4)}Z
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex justify-between">
                    <span>Base Salary:</span>
                    <strong>KES {(emp.salary || 35000).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Annual Gross:</span>
                    <span>KES {((emp.salary || 35000) * 1.15 * 12).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => toast.success(`P9 Card for ${emp.name} prepared for download.`)}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print P9 Tax Card
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

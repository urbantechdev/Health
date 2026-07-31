import React, { useEffect, useState } from "react";
import { Invoice, MedicalRecord, ClinicalVisit, PayrollRecord, ExpenseItem } from "../types";
import { Printer, X, ShieldCheck, CheckCircle2, QrCode, FileText, Receipt, ClipboardList, Activity, TrendingUp, TrendingDown } from "lucide-react";

interface PrintDocumentProps {
  isOpen: boolean;
  onClose: () => void;
  type: "receipt" | "prescription" | "payslip" | "statement";
  receiptData?: Invoice | null;
  prescriptionData?: {
    patient: MedicalRecord;
    visit: ClinicalVisit;
  } | null;
  payslipData?: PayrollRecord | null;
  statementData?: {
    totalRevenue: number;
    totalOpex: number;
    netProfit: number;
    outstandingInsuranceClaims: number;
    invoices: Invoice[];
    expenses: ExpenseItem[];
  } | null;
}

export default function PrintDocument({
  isOpen,
  onClose,
  type,
  receiptData,
  prescriptionData,
  payslipData,
  statementData,
}: PrintDocumentProps) {
  const [receiptFormat, setReceiptFormat] = useState<"etr" | "a4">("etr");

  useEffect(() => {
    // Disable scrolling of parent when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to calculate eTIMS taxes if not pre-provided
  const totalAmount = type === "receipt" ? receiptData?.total || 0 : 0;
  const taxAmount = Math.round(totalAmount * 0.16); // 16% VAT standard in Kenya
  const netAmount = totalAmount - taxAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header (Screen-only) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-gray-50 shrink-0 gap-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-950 text-sm">
              {type === "receipt" && "Official eTIMS Tax Invoice & ETR Receipt"}
              {type === "prescription" && "Digital Electronic Prescription (e-Rx)"}
              {type === "payslip" && "Official Certified Staff Payslip"}
              {type === "statement" && "Official Clinic Financial Statement & OpEx Ledger"}
            </h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {type === "receipt" && (
              <div className="flex bg-gray-200/80 p-0.5 rounded-xl text-xs font-bold border border-gray-300/60">
                <button
                  id="btn-switch-receipt-etr"
                  onClick={() => setReceiptFormat("etr")}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    receiptFormat === "etr"
                      ? "bg-white text-emerald-800 shadow-xs font-extrabold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>80mm ETR Slip</span>
                </button>
                <button
                  id="btn-switch-receipt-a4"
                  onClick={() => setReceiptFormat("a4")}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    receiptFormat === "a4"
                      ? "bg-white text-emerald-800 shadow-xs font-extrabold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>A4 Tax Invoice</span>
                </button>
              </div>
            )}

            <button
              id="btn-trigger-print-dialog"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              id="btn-close-print-preview"
              onClick={onClose}
              className="p-2 hover:bg-gray-200 text-gray-500 hover:text-gray-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informative Note (Screen-only) */}
        <div className="bg-emerald-50 text-emerald-950 px-6 py-2.5 text-xs font-semibold flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>PRO-TIP: Select "Save as PDF" in the destination options of your system's print dialog to download this document as an official PDF file.</span>
        </div>

        {/* Printable Section Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 bg-slate-200/60 flex justify-center">
          
          {/* THERMAL 80mm ETR SLIP VIEW */}
          {type === "receipt" && receiptData && receiptFormat === "etr" ? (
            <div
              id="print-section"
              className="w-full max-w-sm bg-stone-50 text-slate-900 border border-slate-300 p-5 rounded-xl shadow-xl font-mono text-xs space-y-4 my-auto relative overflow-hidden"
            >
              {/* Thermal receipt top header */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                <div className="inline-flex items-center justify-center gap-1 font-sans font-black text-sm tracking-tight text-slate-950">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span>AFYA BORA MEDICAL CLINIC</span>
                </div>
                <p className="text-[11px] font-bold text-slate-800">KRA PIN: P051189432K</p>
                <p className="text-[10px] text-slate-600">AFYA CENTRE 12TH FLR, NAIROBI</p>
                <p className="text-[10px] text-slate-600">TEL: +254 (0) 711 943 210</p>
                <div className="pt-1">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-bold text-[9px] tracking-wider uppercase inline-block border border-emerald-300">
                    ★ KRA eTIMS ETR FISCAL RECEIPT ★
                  </span>
                </div>
              </div>

              {/* Invoice metadata */}
              <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-400 pb-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">RCT NO:</span>
                  <strong className="text-slate-950 font-bold uppercase">{receiptData.id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DATE/TIME:</span>
                  <span>{new Date(receiptData.timestamp || Date.now()).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PATIENT:</span>
                  <strong className="text-slate-950 font-bold">{receiptData.patientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NATIONAL ID:</span>
                  <span>{receiptData.nationalId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PAYMENT METHOD:</span>
                  <span className="font-bold text-emerald-800 uppercase">{receiptData.paymentMethod}</span>
                </div>
              </div>

              {/* Itemized charges table */}
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-2.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase pb-1 border-b border-slate-200">
                  <span>ITEM DESCRIPTION</span>
                  <span>AMT (KES)</span>
                </div>
                {receiptData.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] leading-tight py-0.5">
                    <span className="truncate max-w-[190px] text-slate-800">{item.description}</span>
                    <span className="font-bold text-slate-950">KES {item.amount.toLocaleString()}.00</span>
                  </div>
                ))}
              </div>

              {/* Financial & Tax calculations */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2.5">
                <div className="flex justify-between text-slate-600">
                  <span>NET TOTAL (TAX EXCL):</span>
                  <span>KES {netAmount.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>16% VAT (TAX CODE A):</span>
                  <span>KES {taxAmount.toLocaleString()}.00</span>
                </div>
                {receiptData.split && (
                  <>
                    {receiptData.split.sha > 0 && (
                      <div className="flex justify-between text-[10px] text-blue-800">
                        <span>SHA / TAIFA COVER:</span>
                        <span>- KES {receiptData.split.sha.toLocaleString()}.00</span>
                      </div>
                    )}
                    {receiptData.split.insurance > 0 && (
                      <div className="flex justify-between text-[10px] text-blue-800">
                        <span>PRIVATE INSURANCE:</span>
                        <span>- KES {receiptData.split.insurance.toLocaleString()}.00</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between font-extrabold text-sm text-slate-950 pt-1 border-t border-slate-300">
                  <span>TOTAL PAID (INCL TAX):</span>
                  <span className="text-emerald-800">KES {receiptData.total.toLocaleString()}.00</span>
                </div>
              </div>

              {/* KRA eTIMS Fiscal Digital Signature Box */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center space-y-2 text-[10px]">
                <div className="flex items-center justify-center gap-1 font-bold text-emerald-950 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>KRA eTIMS FISCAL DIGITAL SIGNATURE</span>
                </div>
                <div className="space-y-0.5 text-slate-700 font-mono text-[10px] text-left border-t border-emerald-200/80 pt-1.5">
                  <p className="flex justify-between">
                    <span className="text-slate-500">eTIMS CU NO:</span>
                    <strong className="text-slate-950 font-bold">{receiptData.kraCompliantInvoiceNo || "KRAETIMS-OFF-882310"}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">CONTROL CODE:</span>
                    <span className="font-bold text-slate-900">4B7A-9F22-81C0-5DE6</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">ESD DEV SERIAL:</span>
                    <span className="font-mono">ETIMS-MW-0099432</span>
                  </p>
                </div>
                
                {/* QR Verification Code */}
                <div className="pt-1 flex flex-col items-center">
                  <div className="p-2 bg-white rounded-lg border border-emerald-300 shadow-xs inline-block">
                    <QrCode className="w-16 h-16 text-slate-900" />
                  </div>
                  <p className="text-[9px] font-sans font-semibold text-slate-700 mt-1">Scan to verify ETR Fiscal Receipt with KRA iTax / eTIMS</p>
                  <p className="text-[7.5px] text-emerald-700 font-mono mt-0.5 break-all underline select-all">
                    https://itax.kra.go.ke/etims-verify?inv={receiptData.kraCompliantInvoiceNo || "KRAETIMS-OFF"}&amt={receiptData.total}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[9px] text-slate-500 space-y-0.5 pt-1">
                <p className="font-bold text-slate-700">*** THANK YOU FOR VISITING AFYA BORA CLINIC ***</p>
                <p>PROMPT PAYMENT & COMPLIANCE APPRECIATED • GET WELL SOON!</p>
              </div>
            </div>
          ) : (
            /* Main A4 Document Sheet */
            <div
              id="print-section"
              className="w-full max-w-2xl bg-white p-4 sm:p-6 md:p-10 lg:p-12 shadow-sm border border-gray-200 rounded-2xl relative text-slate-900 font-sans"
              style={{ minHeight: "297mm" }} // Standard A4 Aspect ratio
            >
              {/* Security Watermark for Screen View */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none z-0">
                <span className="text-6xl font-black rotate-45 text-slate-950">AFYA BORA CLINIC</span>
              </div>

              <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
                
                {/* DOCUMENT TOP HEADER */}
                <div className="border-b-2 border-slate-950 pb-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-950">AFYA BORA MEDICAL CLINIC</h1>
                      <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-1">Ministry of Health Reg: Reg No. ODPC-KE-2026</p>
                      <p className="text-xs text-slate-500">12th Floor, Afya Centre, Tom Mboya St, Nairobi, Kenya</p>
                      <p className="text-xs text-slate-500">Tel: +254 (0) 711 943 210 | Email: info@afyaboraclinic.co.ke</p>
                    </div>
                    <div className="text-right flex flex-col items-start md:items-end">
                      <span className="px-3 py-1 bg-slate-150 text-slate-800 rounded-full text-[10px] font-bold tracking-wider uppercase">
                        {type === "receipt" && "Tax Invoice / Receipt"}
                        {type === "prescription" && "Medical Prescription"}
                        {type === "payslip" && "Certified Staff Payslip"}
                        {type === "statement" && "Official Hospital Financial Ledger Statement"}
                      </span>
                      <p className="text-xs text-slate-500 font-mono mt-2">
                        Date: {
                          type === "receipt" ? new Date(receiptData?.timestamp || "").toLocaleDateString() : 
                          type === "prescription" ? new Date(prescriptionData?.visit.date || "").toLocaleDateString() :
                          new Date().toLocaleDateString()
                        }
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        Ref: <span className="font-bold text-slate-950 uppercase">
                          {type === "receipt" ? receiptData?.id : 
                           type === "prescription" ? `RX-${prescriptionData?.visit.id.split("-")[1]}` : 
                           type === "statement" ? `STATEMENT-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}` :
                           `SLIP-${payslipData?.id?.substring(0,6) || "PAYROLL"}`}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* RECEIPT RENDER LAYOUT */}
                {type === "receipt" && receiptData && (
                  <div className="space-y-6 flex-1">
                    
                    {/* Patient Info */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Bill To (Patient)</p>
                        <p className="font-extrabold text-slate-950 text-sm mt-0.5">{receiptData.patientName}</p>
                        <p className="text-slate-600 mt-0.5">National ID: {receiptData.nationalId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Compliance & Claims</p>
                        <p className="text-slate-600 mt-1">
                          eTIMS Serial: <span className="font-mono font-bold text-slate-950">{receiptData.kraCompliantInvoiceNo || "KRA-ETIMS-PENDING"}</span>
                        </p>
                        <p className="text-slate-600">
                          Method: <span className="font-bold text-slate-950">{receiptData.paymentMethod}</span>
                        </p>
                      </div>
                    </div>

                    {/* Charges Breakdown Table */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wide">Itemized Departmental Charges</h4>
                      <div className="border border-slate-200 rounded-xl overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                              <th className="p-3 font-bold uppercase tracking-wide">Service / Product Description</th>
                              <th className="p-3 font-bold uppercase tracking-wide text-center">Department</th>
                              <th className="p-3 font-bold uppercase tracking-wide text-right">Amount (KES)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {receiptData.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/40">
                                <td className="p-3 font-medium text-slate-900">{item.description}</td>
                                <td className="p-3 text-center capitalize text-slate-600 font-semibold">{item.department}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-950">KES {item.amount.toLocaleString()}.00</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pricing and Split Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      
                      {/* Tax Compliant Details */}
                      <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex items-center gap-3">
                        <QrCode className="w-16 h-16 text-slate-900 shrink-0" />
                        <div className="text-[10px] font-mono leading-tight text-slate-600">
                          <p className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> KRA eTIMS SECURE TAX
                          </p>
                          <p>KRA PIN: P051189432K</p>
                          <p>Total Exclusive of 16% VAT: KES {netAmount.toLocaleString()}.00</p>
                          <p>16% Value-Added Tax: KES {taxAmount.toLocaleString()}.00</p>
                          <p className="text-slate-400 font-sans mt-1">Scan QR code for verification</p>
                        </div>
                      </div>

                      {/* Revenue Ledger Breakdown */}
                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between font-mono">
                          <span>SHA Claim Share (Government):</span>
                          <span className="font-bold">KES {receiptData.split?.sha?.toLocaleString() || "0"}.00</span>
                        </div>
                        <div className="flex justify-between font-mono">
                          <span>Private Insurance Cover:</span>
                          <span className="font-bold">KES {receiptData.split?.insurance?.toLocaleString() || "0"}.00</span>
                        </div>
                        <div className="flex justify-between font-mono">
                          <span>Patient Out-of-Pocket Share:</span>
                          <span className="font-bold">KES {receiptData.split?.outOfPocket?.toLocaleString() || receiptData.total?.toLocaleString()}.00</span>
                        </div>
                        <div className="border-t border-slate-300 my-1 pt-1.5 flex justify-between text-slate-950 font-extrabold">
                          <span className="text-sm">Paid Total Receipts:</span>
                          <span className="text-sm font-mono">KES {receiptData.total.toLocaleString()}.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* PRESCRIPTION RENDER LAYOUT */}
              {type === "prescription" && prescriptionData && (
                <div className="space-y-6 flex-1">
                  
                  {/* Patient Bio Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Patient Details</p>
                      <p className="font-extrabold text-slate-950 text-sm mt-0.5">{prescriptionData.patient.patientName}</p>
                      <p className="text-slate-600 mt-0.5">ID: {prescriptionData.patient.nationalId}</p>
                      <p className="text-slate-600">Age: {prescriptionData.patient.age}y | Gender: {prescriptionData.patient.gender}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Clinical Vitals</p>
                      <div className="grid grid-cols-2 gap-1 mt-1 font-mono text-[11px] text-slate-700">
                        <p>Temp: <span className="font-bold text-slate-950">{prescriptionData.visit.vitals.temp}°C</span></p>
                        <p>BP: <span className="font-bold text-slate-950">{prescriptionData.visit.vitals.bp}</span></p>
                        <p>Pulse: <span className="font-bold text-slate-950">{prescriptionData.visit.vitals.pulse} bpm</span></p>
                        <p>Weight: <span className="font-bold text-slate-950">{prescriptionData.visit.vitals.weight} kg</span></p>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Clinical Diagnosis</p>
                      <p className="font-extrabold text-emerald-800 text-sm mt-1">{prescriptionData.visit.diagnosis || "General Review"}</p>
                      <p className="text-[10px] text-slate-500 italic mt-0.5">Symptoms: {prescriptionData.visit.symptoms || "N/A"}</p>
                    </div>
                  </div>

                  {/* Prescription Table */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wide flex items-center gap-1">
                        <ClipboardList className="w-4 h-4 text-emerald-600" />
                        <span>Prescribed Pharmacotherapy Regime</span>
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-semibold border border-purple-200 font-mono">
                        e-Prescription Signed
                      </span>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                            <th className="p-3 font-bold uppercase tracking-wide">Medication Name & Strength</th>
                            <th className="p-3 font-bold uppercase tracking-wide text-center">Qty</th>
                            <th className="p-3 font-bold uppercase tracking-wide text-center">Dosage</th>
                            <th className="p-3 font-bold uppercase tracking-wide">Usage Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {prescriptionData.visit.prescriptions?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="p-3 font-extrabold text-slate-900">{item.drugName}</td>
                              <td className="p-3 text-center font-mono font-bold text-slate-950">{item.quantity}</td>
                              <td className="p-3 text-center font-bold text-emerald-800 font-mono">{item.dosage}</td>
                              <td className="p-3 text-slate-600 font-medium">{item.instructions}</td>
                            </tr>
                          ))}
                          {(!prescriptionData.visit.prescriptions || prescriptionData.visit.prescriptions.length === 0) && (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                                No medications prescribed during this visit.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Referrals (if any) */}
                  {prescriptionData.visit.referrals && prescriptionData.visit.referrals.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wide flex items-center gap-1">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span>Diagnostics & Referral Pathways</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {prescriptionData.visit.referrals.map((ref) => (
                          <div key={ref.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/50 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold rounded uppercase tracking-wide">
                                {ref.department}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{ref.id}</span>
                            </div>
                            <p className="font-bold text-slate-950">{ref.testName}</p>
                            <p className="text-[10px] text-slate-500 italic mt-1">Note: {ref.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Digital Signature & Pharmacist Validation Block */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <QrCode className="w-16 h-16 text-slate-900 shrink-0" />
                      <div className="text-[9px] font-mono leading-tight text-slate-500">
                        <p className="font-bold text-slate-950">SECURE e-Rx QR VERIFICATION</p>
                        <p>Validates legal digital signature and compliance under KMPDC act Cap 253.</p>
                        <p className="text-slate-400 mt-1">Scan at dispensary terminal for automatic load.</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-end text-right">
                      {/* Signature graphic mock */}
                      <div className="border-b border-slate-400 pb-1 w-44 flex flex-col items-center">
                        <span className="font-serif italic text-emerald-800 text-lg font-bold tracking-wider select-none transform -rotate-2">
                          Dr. J. N. Omondi
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">
                          SHA256: d8f39b...c2f82d
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-900 mt-1.5">Dr. James N. Omondi, MD</p>
                      <p className="text-[9px] text-slate-500">Consultant Physician | KMPDC No: A-8422</p>
                      <p className="text-[9px] text-slate-400">Electronic Sign-Off Date: {new Date(prescriptionData.visit.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAYSLIP RENDER LAYOUT */}
              {type === "payslip" && payslipData && (
                <div className="space-y-6 flex-1 text-slate-900">
                  
                  {/* Title Bar */}
                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-350 text-center">
                    <h2 className="text-sm font-extrabold tracking-wider uppercase text-slate-950">OFFICIAL CERTIFIED STATUTORY PAYSLIP</h2>
                    <p className="text-[10px] text-slate-600 font-mono">PAY PERIOD: <span className="font-bold">{payslipData.month}</span> | STATUS: <span className="font-extrabold text-emerald-800">{payslipData.paymentStatus.toUpperCase()}</span></p>
                  </div>

                  {/* Employee Identity Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Employee Profile</p>
                      <p className="font-extrabold text-slate-950 text-sm">{payslipData.employeeName}</p>
                      <p className="text-slate-600">Employee ID: <span className="font-mono font-bold text-slate-900">{payslipData.employeeId.substring(0,8).toUpperCase()}</span></p>
                      <p className="text-slate-600">National ID: <span className="font-mono">{payslipData.employeeId}</span></p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Employer Information</p>
                      <p className="font-bold text-slate-900">Hospital Management System</p>
                      <p className="text-slate-500">KRA PIN: <span className="font-mono">P051189432K</span></p>
                      <p className="text-slate-500">SHIF Registered No: <span className="font-mono">SHIF-EMP-2026-NGB</span></p>
                    </div>
                  </div>

                  {/* Earnings vs Deductions Split Table */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    
                    {/* Earnings Side */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black uppercase text-slate-950 border-b border-slate-300 pb-1 flex justify-between">
                        <span>Description of Earnings</span>
                        <span>Amount (KES)</span>
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between font-medium">
                          <span>Basic Salary:</span>
                          <span className="font-mono">KES {payslipData.baseSalary.toLocaleString()}.00</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>House/Commuter Allowance:</span>
                          <span className="font-mono">KES {payslipData.allowances.toLocaleString()}.00</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-950 text-sm">
                          <span>Gross Salary:</span>
                          <span className="font-mono">KES {(payslipData.baseSalary + payslipData.allowances).toLocaleString()}.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions Side */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black uppercase text-slate-950 border-b border-slate-300 pb-1 flex justify-between">
                        <span>Statutory Deductions</span>
                        <span>Amount (KES)</span>
                      </h4>
                      <div className="space-y-2 text-slate-700">
                        <div className="flex justify-between">
                          <span>KRA PAYE Income Tax:</span>
                          <span className="font-mono">KES {payslipData.deductions.paye.toLocaleString()}.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>MoH SHIF Contribution (2.75%):</span>
                          <span className="font-mono">KES {payslipData.deductions.shif.toLocaleString()}.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Affordable Housing Levy (1.5%):</span>
                          <span className="font-mono">KES {payslipData.deductions.housingLevy.toLocaleString()}.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>NSSF Pension Fund (Standard):</span>
                          <span className="font-mono">KES {payslipData.deductions.nssf.toLocaleString()}.00</span>
                        </div>
                        {payslipData.deductions.other > 0 && (
                          <div className="flex justify-between">
                            <span>Other Deductions/Advances:</span>
                            <span className="font-mono">KES {payslipData.deductions.other.toLocaleString()}.00</span>
                          </div>
                        )}
                        <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-950 text-sm">
                          <span>Total Deductions:</span>
                          <span className="font-mono">KES {(
                            payslipData.deductions.paye + 
                            payslipData.deductions.shif + 
                            payslipData.deductions.housingLevy + 
                            payslipData.deductions.nssf + 
                            payslipData.deductions.other
                          ).toLocaleString()}.00</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Net Take-Home Highlight Panel */}
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest block">Net Salary Payout</span>
                      <span className="text-[11px] text-emerald-900 font-medium">Transmitted via central bank salary ledger</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-950 font-mono">KES {payslipData.netPay.toLocaleString()}.00</span>
                    </div>
                  </div>

                  {/* Signatures & Verifications */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <QrCode className="w-16 h-16 text-slate-900 shrink-0" />
                      <div className="text-[9px] font-mono leading-tight text-slate-500">
                        <p className="font-bold text-slate-950">DIGITAL AUDIT INTEGRITY</p>
                        <p>This is a computer generated document recognized under GOK laws. No physical stamp is required.</p>
                        <p className="text-slate-400 mt-1">Scan for direct payroll registry verification.</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-end text-right">
                      {/* Signature graphic mock */}
                      <div className="border-b border-slate-400 pb-1 w-44 flex flex-col items-center">
                        <span className="font-serif italic text-emerald-800 text-lg font-bold tracking-wider select-none transform -rotate-2">
                          M. Akinyi
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">
                          SHA256: pay772a...d651ff
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-900 mt-1.5">Margaret Akinyi, CPA-K</p>
                      <p className="text-[9px] text-slate-500">Director of Human Resources & Finance</p>
                      <p className="text-[9px] text-slate-400">Signed Date: {payslipData.paidDate ? new Date(payslipData.paidDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                </div>
              )}

              {/* STATEMENT RENDER LAYOUT */}
              {type === "statement" && statementData && (
                <div className="space-y-6 flex-1 text-slate-900">
                  
                  {/* Scope of Statement & Overview */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Statement Period</p>
                    <p className="font-extrabold text-slate-950 text-sm mt-0.5">Live Fiscal Health & Operational Activity Report</p>
                    <p className="text-slate-600 mt-1">
                      Covers all active and reconciled transactions, outstanding claims, and itemized operational expenses.
                    </p>
                  </div>

                  {/* Financial KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gross Revenue</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">KES {statementData.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Operational costs</span>
                      <span className="font-mono font-bold text-rose-700 text-sm">KES {statementData.totalOpex.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Net Profit Margin</span>
                      <span className={`font-mono font-bold text-sm ${statementData.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                        KES {statementData.netProfit.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-1 text-xs">
                      <span className="text-[9px] font-bold text-rose-800 uppercase tracking-wider block">Outstanding Claims</span>
                      <span className="font-mono font-bold text-rose-950 text-sm">KES {statementData.outstandingInsuranceClaims.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Reconciled Income Ledger */}
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold text-slate-950 uppercase tracking-wide flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reconciled Outpatient Income Registry</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                            <th className="p-2 font-bold uppercase tracking-wider">Ref ID</th>
                            <th className="p-2 font-bold uppercase tracking-wider">Patient Name</th>
                            <th className="p-2 font-bold uppercase tracking-wider">Payment Mode</th>
                            <th className="p-2 font-bold uppercase tracking-wider text-right">Settled Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {statementData.invoices.filter(i => i.paymentStatus === "paid").map((i, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/20">
                              <td className="p-2 font-mono font-bold text-slate-700">{i.id}</td>
                              <td className="p-2 font-semibold text-slate-950">{i.patientName}</td>
                              <td className="p-2">
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded text-[9px] uppercase">
                                  {i.paymentMethod}
                                </span>
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-950">KES {i.total.toLocaleString()}.00</td>
                            </tr>
                          ))}
                          {statementData.invoices.filter(i => i.paymentStatus === "paid").length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-3 text-center text-slate-400 italic">No reconciled income records.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Operational Expense Ledger */}
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold text-slate-950 uppercase tracking-wide flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      <span>Operating Expenditures (OpEx) Ledger</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                            <th className="p-2 font-bold uppercase tracking-wider">Date</th>
                            <th className="p-2 font-bold uppercase tracking-wider">Item/Description</th>
                            <th className="p-2 font-bold uppercase tracking-wider">Category</th>
                            <th className="p-2 font-bold uppercase tracking-wider">Supplier</th>
                            <th className="p-2 font-bold uppercase tracking-wider text-right">Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {statementData.expenses.map((exp, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/20">
                              <td className="p-2 font-mono text-slate-600">{exp.date}</td>
                              <td className="p-2 font-semibold text-slate-950">{exp.description}</td>
                              <td className="p-2 capitalize text-slate-600 font-medium">{exp.category}</td>
                              <td className="p-2 text-slate-600 truncate max-w-[120px]" title={exp.supplier}>{exp.supplier || "Standard Vendor"}</td>
                              <td className="p-2 text-right font-mono font-bold text-rose-950">KES {exp.amount.toLocaleString()}.00</td>
                            </tr>
                          ))}
                          {statementData.expenses.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-3 text-center text-slate-400 italic">No expenses reported.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Signatures & Verifications */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <QrCode className="w-16 h-16 text-slate-900 shrink-0" />
                      <div className="text-[9px] font-mono leading-tight text-slate-500">
                        <p className="font-bold text-slate-950">FINANCIAL INTEGRITY STAMP</p>
                        <p>Fully compliant with KRA requirements, signed off digitally by clinical treasury services.</p>
                        <p className="text-slate-400 mt-1">Scan for ledger audit check.</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-end text-right">
                      {/* Signature graphic mock */}
                      <div className="border-b border-slate-400 pb-1 w-44 flex flex-col items-center">
                        <span className="font-serif italic text-emerald-800 text-lg font-bold tracking-wider select-none transform -rotate-2">
                          M. Akinyi
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">
                          SHA256: fin883a...f929fa
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-900 mt-1.5">Margaret Akinyi, CPA-K</p>
                      <p className="text-[9px] text-slate-500">Director of Human Resources & Finance</p>
                      <p className="text-[9px] text-slate-400">Signed Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                </div>
              )}

              {/* DOCUMENT BOTTOM FOOTER */}
              <div className="border-t border-slate-300 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-[9px] text-slate-400 font-mono">
                <p>Generated by NextGen Central HMS. Confidential Medical Record.</p>
                <p className="font-bold text-slate-700">Digital Regulatory ID: GOK-MOH-ODPC-2026-NGB</p>
              </div>

            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}


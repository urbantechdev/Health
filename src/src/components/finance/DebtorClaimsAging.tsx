import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { DebtorInsuranceClaim, Invoice, RemittanceBatch } from "../../types";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  X,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { toast, modernConfirm } from "../../lib/promptService";

interface DebtorClaimsAgingProps {
  invoices: Invoice[];
}

export default function DebtorClaimsAging({ invoices }: DebtorClaimsAgingProps) {
  const [debtorClaims, setDebtorClaims] = useState<DebtorInsuranceClaim[]>([]);
  const [remittanceBatches, setRemittanceBatches] = useState<RemittanceBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInsurer, setSelectedInsurer] = useState<string>("all");
  const [selectedBucket, setSelectedBucket] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Remittance Allocation Modal State
  const [isRemittanceModalOpen, setIsRemittanceModalOpen] = useState(false);
  const [remitInsurer, setRemitInsurer] = useState("Social Health Authority (SHA)");
  const [remitBatchNo, setRemitBatchNo] = useState(() => `REM-${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7)}-${Math.floor(100 + Math.random() * 900)}`);
  const [remitBankRef, setRemitBankRef] = useState("KCB-EFT-994821");
  const [remitPaymentMode, setRemitPaymentMode] = useState<"EFT / Bank Transfer" | "Cheque" | "RTGS">("EFT / Bank Transfer");
  const [remitTotalAmount, setRemitTotalAmount] = useState<number | "">(50000);
  const [remitAllocations, setRemitAllocations] = useState<{ [claimId: string]: { paid: number; disallowed: number; reason: string } }>({});

  // Subscribe to debtor_claims and remittance_batches
  useEffect(() => {
    const unsubClaims = onSnapshot(collection(db, "debtor_claims"), (snapshot) => {
      const claims: DebtorInsuranceClaim[] = [];
      snapshot.forEach((d) => {
        claims.push({ id: d.id, ...d.data() } as DebtorInsuranceClaim);
      });
      setDebtorClaims(claims);
      setLoading(false);
    });

    const unsubBatches = onSnapshot(collection(db, "remittance_batches"), (snapshot) => {
      const batches: RemittanceBatch[] = [];
      snapshot.forEach((d) => {
        batches.push({ id: d.id, ...d.data() } as RemittanceBatch);
      });
      batches.sort((a, b) => new Date(b.remittanceDate).getTime() - new Date(a.remittanceDate).getTime());
      setRemittanceBatches(batches);
    });

    return () => {
      unsubClaims();
      unsubBatches();
    };
  }, []);

  // Sync / Synthesize insurance invoices that aren't yet in debtor_claims
  const allClaims: DebtorInsuranceClaim[] = useMemo(() => {
    const existingInvoiceIds = new Set(debtorClaims.map((c) => c.invoiceId));
    const syntheticClaims: DebtorInsuranceClaim[] = [];

    invoices.forEach((inv) => {
      const method = (inv.paymentMethod || "").toLowerCase();
      const isInsurance = method.includes("insurance") || method.includes("sha") || method.includes("nhif");

      if (isInsurance && !existingInvoiceIds.has(inv.id)) {
        const invDate = new Date(inv.timestamp || Date.now());
        const ageDays = Math.max(0, Math.floor((Date.now() - invDate.getTime()) / (1000 * 60 * 60 * 24)));

        let bucket: DebtorInsuranceClaim["agingBucket"] = "0-30 Days";
        if (ageDays > 90) bucket = "90+ Days";
        else if (ageDays > 60) bucket = "61-90 Days";
        else if (ageDays > 30) bucket = "31-60 Days";

        const insurer = method.includes("sha") || method.includes("nhif")
          ? "Social Health Authority (SHA)"
          : method.includes("jubilee")
          ? "Jubilee Insurance"
          : method.includes("britam")
          ? "Britam Insurance"
          : method.includes("cic")
          ? "CIC General Insurance"
          : "Social Health Authority (SHA)";

        const total = Number(inv.total) || 0;
        const paid = inv.paymentStatus === "paid" ? total : 0;
        const balance = total - paid;

        syntheticClaims.push({
          id: `syn-${inv.id}`,
          claimNumber: inv.shaClaimId || `CLM-${inv.id}`,
          invoiceId: inv.id,
          patientId: inv.patientId || "PAT-001",
          patientName: inv.patientName || "Patient Account",
          nationalId: inv.nationalId || "00000000",
          shaNumber: inv.nationalId ? `SHA-${inv.nationalId}` : undefined,
          insurerName: insurer,
          schemeType: insurer.includes("SHA") ? "SHA / NHIF Public" : "Comprehensive Corporate",
          claimDate: inv.timestamp || new Date().toISOString(),
          originalAmount: total,
          approvedAmount: total,
          copayAmount: 0,
          paidAmount: paid,
          disallowedAmount: 0,
          balance: balance,
          status: inv.paymentStatus === "paid" ? "Remitted" : "Submitted",
          agingDays: ageDays,
          agingBucket: bucket
        });
      }
    });

    return [...debtorClaims, ...syntheticClaims];
  }, [debtorClaims, invoices]);

  // Aging Bucket Metrics
  const agingTotals = useMemo(() => {
    let current = 0; // 0-30
    let bucket3160 = 0; // 31-60
    let bucket6190 = 0; // 61-90
    let bucket90Plus = 0; // 90+
    let totalOutstanding = 0;
    let totalRemitted = 0;

    allClaims.forEach((c) => {
      const bal = c.balance || 0;
      totalOutstanding += bal;
      totalRemitted += c.paidAmount || 0;

      if (c.agingBucket === "0-30 Days") current += bal;
      else if (c.agingBucket === "31-60 Days") bucket3160 += bal;
      else if (c.agingBucket === "61-90 Days") bucket6190 += bal;
      else if (c.agingBucket === "90+ Days") bucket90Plus += bal;
    });

    return {
      current,
      bucket3160,
      bucket6190,
      bucket90Plus,
      totalOutstanding,
      totalRemitted
    };
  }, [allClaims]);

  // Insurer breakdown
  const insurerBreakdown = useMemo(() => {
    const map: { [key: string]: { count: number; total: number; balance: number } } = {};
    allClaims.forEach((c) => {
      const ins = c.insurerName || "Other";
      if (!map[ins]) {
        map[ins] = { count: 0, total: 0, balance: 0 };
      }
      map[ins].count += 1;
      map[ins].total += c.originalAmount || 0;
      map[ins].balance += c.balance || 0;
    });
    return map;
  }, [allClaims]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return allClaims.filter((c) => {
      if (selectedInsurer !== "all" && c.insurerName !== selectedInsurer) return false;
      if (selectedBucket !== "all" && c.agingBucket !== selectedBucket) return false;
      if (selectedStatus !== "all" && c.status !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.claimNumber.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.nationalId.toLowerCase().includes(q) ||
          c.insurerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allClaims, selectedInsurer, selectedBucket, selectedStatus, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Claim Number",
      "Invoice ID",
      "Patient Name",
      "National ID",
      "Insurer Name",
      "Scheme",
      "Claim Date",
      "Claim Amount (KES)",
      "Paid Amount (KES)",
      "Disallowed (KES)",
      "Outstanding Balance (KES)",
      "Aging Days",
      "Aging Bracket",
      "Status"
    ];

    const rows = filteredClaims.map((c) => [
      c.claimNumber,
      c.invoiceId,
      `"${c.patientName.replace(/"/g, '""')}"`,
      c.nationalId,
      `"${c.insurerName.replace(/"/g, '""')}"`,
      c.schemeType,
      c.claimDate.slice(0, 10),
      c.originalAmount,
      c.paidAmount,
      c.disallowedAmount,
      c.balance,
      c.agingDays,
      c.agingBucket,
      c.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Hospital_Debtors_Aging_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Debtors Aging Schedule exported successfully.");
  };

  // Open Remittance Allocation for specific insurer
  const handleOpenRemittanceModal = (insurer: string) => {
    setRemitInsurer(insurer);
    // Pre-seed allocations for outstanding claims of this insurer
    const pendingClaims = allClaims.filter((c) => c.insurerName === insurer && c.balance > 0);
    const allocMap: { [claimId: string]: { paid: number; disallowed: number; reason: string } } = {};
    let totalBal = 0;
    pendingClaims.forEach((c) => {
      allocMap[c.id] = { paid: c.balance, disallowed: 0, reason: "" };
      totalBal += c.balance;
    });
    setRemitAllocations(allocMap);
    setRemitTotalAmount(totalBal);
    setIsRemittanceModalOpen(true);
  };

  const handleCommitRemittance = async () => {
    const claimsToProcess = allClaims.filter((c) => c.insurerName === remitInsurer && c.balance > 0);
    if (claimsToProcess.length === 0) {
      toast.warning("No pending claims to allocate for this insurer.");
      return;
    }

    let totalAlloc = 0;
    let totalDisallowed = 0;

    claimsToProcess.forEach((c) => {
      const alloc = remitAllocations[c.id] || { paid: 0, disallowed: 0, reason: "" };
      totalAlloc += Number(alloc.paid) || 0;
      totalDisallowed += Number(alloc.disallowed) || 0;
    });

    try {
      // 1. Record Remittance Batch
      const batch: Omit<RemittanceBatch, "id"> = {
        batchNumber: remitBatchNo,
        insurerName: remitInsurer,
        remittanceDate: new Date().toISOString(),
        bankReference: remitBankRef,
        paymentMethod: remitPaymentMode,
        totalRemittedAmount: Number(remitTotalAmount) || totalAlloc,
        allocatedAmount: totalAlloc,
        disallowedAmount: totalDisallowed,
        unallocatedAmount: Math.max(0, (Number(remitTotalAmount) || totalAlloc) - totalAlloc),
        claimsCount: claimsToProcess.length,
        status: "Allocated",
        processedBy: "Accounts Department",
        notes: `Electronic remittance allocated across ${claimsToProcess.length} insurance claims.`
      };

      await addDoc(collection(db, "remittance_batches"), batch);

      // 2. Update claims and corresponding invoices
      for (const claim of claimsToProcess) {
        const alloc = remitAllocations[claim.id] || { paid: 0, disallowed: 0, reason: "" };
        const paidAdd = Number(alloc.paid) || 0;
        const disallowAdd = Number(alloc.disallowed) || 0;
        const newPaid = (claim.paidAmount || 0) + paidAdd;
        const newDisallowed = (claim.disallowedAmount || 0) + disallowAdd;
        const newBalance = Math.max(0, claim.originalAmount - newPaid - newDisallowed);

        // If synthetic claim, add to debtor_claims
        if (claim.id.startsWith("syn-")) {
          await addDoc(collection(db, "debtor_claims"), {
            ...claim,
            id: undefined,
            paidAmount: newPaid,
            disallowedAmount: newDisallowed,
            disallowanceReason: alloc.reason || undefined,
            balance: newBalance,
            status: newBalance === 0 ? "Remitted" : "Approved",
            remittanceBatchNo: remitBatchNo
          });
        } else {
          await updateDoc(doc(db, "debtor_claims", claim.id), {
            paidAmount: newPaid,
            disallowedAmount: newDisallowed,
            disallowanceReason: alloc.reason || undefined,
            balance: newBalance,
            status: newBalance === 0 ? "Remitted" : "Approved",
            remittanceBatchNo: remitBatchNo
          });
        }

        // If fully paid, mark invoice as paid in Firestore
        if (newBalance === 0 && claim.invoiceId) {
          try {
            await updateDoc(doc(db, "invoices", claim.invoiceId), {
              paymentStatus: "paid",
              paidAt: new Date().toISOString(),
              paidAmount: newPaid,
              transactionRef: remitBankRef
            });
          } catch (e) {
            console.warn("Invoice update skip:", e);
          }
        }
      }

      setIsRemittanceModalOpen(false);
      toast.success(`Allocated KES ${totalAlloc.toLocaleString()} for ${remitInsurer}. Debtor ledger updated.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to commit electronic remittance allocation.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-5 rounded-2xl text-white shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono text-[11px] rounded font-bold border border-blue-500/30">
              MODULE 2
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-400" />
              Insurance & SHA Debtor Aging & Remittance Allocator
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Real-time aging analysis for all insurance receivables (Current, 30, 60, 90+ days). Easily reconcile bulk Electronic Remittance Advices (ERAs) from SHA and private insurers without spreadsheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenRemittanceModal("Social Health Authority (SHA)")}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Electronic Remittance Advice</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Aging CSV</span>
          </button>
        </div>
      </div>

      {/* Aging Bucket Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Insurance Receivables</span>
          <p className="font-mono font-extrabold text-slate-900 text-lg">
            KES {agingTotals.totalOutstanding.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500">{allClaims.length} active claims</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700">Current (0 - 30 Days)</span>
          <p className="font-mono font-extrabold text-emerald-800 text-lg">
            KES {agingTotals.current.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">Low risk / Fresh submissions</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-700">31 - 60 Days</span>
          <p className="font-mono font-extrabold text-amber-800 text-lg">
            KES {agingTotals.bucket3160.toLocaleString()}
          </p>
          <p className="text-[10px] text-amber-600 font-semibold">Under vetting / clearance</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 bg-orange-50/20 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-orange-700">61 - 90 Days</span>
          <p className="font-mono font-extrabold text-orange-800 text-lg">
            KES {agingTotals.bucket6190.toLocaleString()}
          </p>
          <p className="text-[10px] text-orange-600 font-semibold">Follow-up demand due</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-300 bg-rose-50/30 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-rose-800 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Overdue (90+ Days)
          </span>
          <p className="font-mono font-extrabold text-rose-900 text-lg">
            KES {agingTotals.bucket90Plus.toLocaleString()}
          </p>
          <p className="text-[10px] text-rose-700 font-bold">Critical write-off risk</p>
        </div>
      </div>

      {/* Breakdown by Insurer Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Debtor Balances by Insurance Underwriter</h4>
          <span className="text-[11px] text-slate-500">Click an insurer to filter or allocate batch payments</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {Object.entries(insurerBreakdown).map(([ins, rawData]) => {
            const data = rawData as { count: number; total: number; balance: number };
            const isSelected = selectedInsurer === ins;
            return (
              <div
                key={ins}
                onClick={() => setSelectedInsurer(isSelected ? "all" : ins)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? "border-blue-600 bg-blue-50/60 shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"}`}
              >
                <div className="flex justify-between items-start">
                  <p className="font-bold text-slate-900 text-xs truncate max-w-[140px]">{ins}</p>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-mono font-semibold">
                    {data.count} claims
                  </span>
                </div>
                <div className="mt-2 flex justify-between items-end">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">Outstanding Bal.</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">KES {data.balance.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRemittanceModal(ins);
                    }}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold"
                  >
                    Allocate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claims Ledger & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Individual Insurance Debtor Claims</h4>
            <p className="text-xs text-slate-500">Showing {filteredClaims.length} itemized claims ready for remittance allocation.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, claim #, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl w-48 sm:w-56 focus:outline-none focus:border-slate-900"
              />
            </div>

            <select
              value={selectedBucket}
              onChange={(e) => setSelectedBucket(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
            >
              <option value="all">All Aging Buckets</option>
              <option value="0-30 Days">0 - 30 Days (Current)</option>
              <option value="31-60 Days">31 - 60 Days</option>
              <option value="61-90 Days">61 - 90 Days</option>
              <option value="90+ Days">90+ Days (Overdue)</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Remitted">Remitted (Settled)</option>
              <option value="Disallowed">Disallowed</option>
            </select>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 font-semibold">Claim # / Invoice</th>
                <th className="p-3 font-semibold">Patient & ID</th>
                <th className="p-3 font-semibold">Insurer & Scheme</th>
                <th className="p-3 font-semibold">Claim Date</th>
                <th className="p-3 text-right font-semibold">Claimed (KES)</th>
                <th className="p-3 text-right font-semibold">Paid (KES)</th>
                <th className="p-3 text-right font-semibold">Balance Due</th>
                <th className="p-3 text-center font-semibold">Aging Bucket</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.map((claim) => {
                const isPaid = claim.balance === 0;

                return (
                  <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono">
                      <p className="font-bold text-slate-900">{claim.claimNumber}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{claim.invoiceId}</span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-900">{claim.patientName}</p>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {claim.nationalId}</span>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{claim.insurerName}</p>
                      <span className="text-[10px] text-slate-400">{claim.schemeType}</span>
                    </td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                      {new Date(claim.claimDate).toLocaleDateString()}
                      <span className="block text-[10px] text-slate-400">{claim.agingDays} days ago</span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      KES {claim.originalAmount.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                      KES {(claim.paidAmount || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-950">
                      KES {(claim.balance || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${claim.agingBucket === "0-30 Days" ? "bg-emerald-50 text-emerald-700" : claim.agingBucket === "31-60 Days" ? "bg-amber-50 text-amber-700" : claim.agingBucket === "61-90 Days" ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700"}`}>
                        {claim.agingBucket}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid ? "bg-emerald-100 text-emerald-800" : claim.status === "Approved" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                        {isPaid ? "Settled" : claim.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredClaims.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No insurance claims match the specified filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Electronic Remittance Advice (ERA) Allocator */}
      {isRemittanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Electronic Remittance Advice (ERA) Batch Allocator
                </h4>
                <p className="text-xs text-slate-500">Allocate bulk insurer cheque/EFT payment to patient accounts</p>
              </div>
              <button
                onClick={() => setIsRemittanceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch Header Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Insurer Underwriter</label>
                <input
                  type="text"
                  readOnly
                  value={remitInsurer}
                  className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Bank Ref / Cheque #</label>
                <input
                  type="text"
                  value={remitBankRef}
                  onChange={(e) => setRemitBankRef(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Remitted Cheque Total (KES)</label>
                <input
                  type="number"
                  value={remitTotalAmount}
                  onChange={(e) => setRemitTotalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            {/* Claims Allocation Grid */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wide">
                  Pending Claims for Allocation ({allClaims.filter((c) => c.insurerName === remitInsurer && c.balance > 0).length})
                </span>
                <span className="text-[11px] text-slate-500">Specify paid vs disallowed per account</span>
              </div>

              <div className="border border-slate-200 rounded-xl max-h-[260px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="p-2.5 font-semibold">Claim & Patient</th>
                      <th className="p-2.5 text-right font-semibold">Balance</th>
                      <th className="p-2.5 text-right font-semibold">Allocated (KES)</th>
                      <th className="p-2.5 text-right font-semibold">Disallowed</th>
                      <th className="p-2.5 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {allClaims
                      .filter((c) => c.insurerName === remitInsurer && c.balance > 0)
                      .map((claim) => {
                        const curAlloc = remitAllocations[claim.id] || { paid: claim.balance, disallowed: 0, reason: "" };

                        return (
                          <tr key={claim.id} className="hover:bg-slate-50/60">
                            <td className="p-2.5">
                              <p className="font-bold text-slate-900 font-mono text-[11px]">{claim.claimNumber}</p>
                              <span className="text-[10px] text-slate-500">{claim.patientName}</span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                              KES {claim.balance.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                value={curAlloc.paid}
                                max={claim.balance}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setRemitAllocations((prev) => ({
                                    ...prev,
                                    [claim.id]: { ...curAlloc, paid: val, disallowed: Math.max(0, claim.balance - val) }
                                  }));
                                }}
                                className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono text-rose-600 font-bold">
                              KES {curAlloc.disallowed?.toLocaleString() || 0}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                placeholder="e.g. SHA Tariff Cap"
                                value={curAlloc.reason || ""}
                                onChange={(e) => {
                                  setRemitAllocations((prev) => ({
                                    ...prev,
                                    [claim.id]: { ...curAlloc, reason: e.target.value }
                                  }));
                                }}
                                className="w-32 px-2 py-1 border border-slate-200 rounded-lg text-[10px]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRemittanceModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitRemittance}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Commit Remittance & Update Debtor Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

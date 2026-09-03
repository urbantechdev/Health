import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import {
  SupplierPayableInvoice,
  PurchaseOrder,
  GoodsReceivedNote,
  PaymentVoucher,
  Supplier
} from "../../types";
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  Filter,
  CreditCard,
  Building2,
  Plus,
  Receipt,
  X,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  Split,
  DollarSign
} from "lucide-react";
import { toast, modernConfirm } from "../../lib/promptService";

export default function AccountsPayable3WayMatch() {
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierPayableInvoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [paymentVouchers, setPaymentVouchers] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMatchStatus, setFilterMatchStatus] = useState<string>("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all");

  // Modals
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedInvoiceForVoucher, setSelectedInvoiceForVoucher] = useState<SupplierPayableInvoice | null>(null);
  const [viewVoucher, setViewVoucher] = useState<PaymentVoucher | null>(null);

  // Add Supplier Invoice Form state
  const [newInvNumber, setNewInvNumber] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("Kenya Medical Supplies Authority (KEMSA)");
  const [newSupplierPin, setNewSupplierPin] = useState("P051284910K");
  const [newPoNumber, setNewPoNumber] = useState("");
  const [newGrnNumber, setNewGrnNumber] = useState("");
  const [newCategory, setNewCategory] = useState<SupplierPayableInvoice["category"]>("Pharmaceuticals");
  const [newItemName, setNewItemName] = useState("Amoxicillin Trihydrate 500mg (Pack of 1000)");
  const [newBilledQty, setNewBilledQty] = useState<number>(20);
  const [newUnitPrice, setNewUnitPrice] = useState<number>(2400);
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // Voucher Form state
  const [voucherMethod, setVoucherMethod] = useState<PaymentVoucher["paymentMethod"]>("EFT");
  const [voucherBank, setVoucherBank] = useState("KCB Bank - Hospital Main Operations Acc #112849201");
  const [voucherRef, setVoucherRef] = useState(`EFT-${Date.now().toString().slice(-6)}`);
  const [voucherWhtRate, setVoucherWhtRate] = useState<number>(0); // 0% or 5% WHT
  const [voucherPreparedBy, setVoucherPreparedBy] = useState("Accounts Payable Officer");
  const [voucherApprovedBy, setVoucherApprovedBy] = useState("Financial Controller / Head of Finance");

  // Subscriptions
  useEffect(() => {
    const unsubInvoices = onSnapshot(collection(db, "supplier_invoices"), (snapshot) => {
      const list: SupplierPayableInvoice[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as SupplierPayableInvoice);
      });
      list.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
      setSupplierInvoices(list);
      setLoading(false);
    });

    const unsubPO = onSnapshot(collection(db, "purchase_orders"), (snapshot) => {
      const list: PurchaseOrder[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PurchaseOrder);
      });
      setPurchaseOrders(list);
    });

    const unsubGRN = onSnapshot(collection(db, "goods_received"), (snapshot) => {
      const list: GoodsReceivedNote[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GoodsReceivedNote);
      });
      setGrns(list);
    });

    const unsubSuppliers = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      const list: Supplier[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Supplier);
      });
      setSuppliers(list);
    });

    const unsubVouchers = onSnapshot(collection(db, "payment_vouchers"), (snapshot) => {
      const list: PaymentVoucher[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PaymentVoucher);
      });
      setPaymentVouchers(list);
    });

    return () => {
      unsubInvoices();
      unsubPO();
      unsubGRN();
      unsubSuppliers();
      unsubVouchers();
    };
  }, []);

  // Summary Metrics
  const summaryMetrics = React.useMemo(() => {
    let totalPayables = 0;
    let matchedCount = 0;
    let flaggedCount = 0;
    let paidTotal = 0;

    supplierInvoices.forEach((inv) => {
      totalPayables += inv.balanceDue || 0;
      paidTotal += inv.paidAmount || 0;
      if (inv.matchStatus === "3-Way Matched") matchedCount += 1;
      if (inv.matchStatus === "Variance Flagged") flaggedCount += 1;
    });

    return { totalPayables, matchedCount, flaggedCount, paidTotal };
  }, [supplierInvoices]);

  // Handle create new invoice with 3-way match validation
  const handleCreateSupplierInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    // Look for matching PO and GRN
    const matchedPo = purchaseOrders.find((p) => p.poNumber.toLowerCase() === newPoNumber.trim().toLowerCase());
    const matchedGrn = grns.find((g) => g.grnNumber.toLowerCase() === newGrnNumber.trim().toLowerCase() || (matchedPo && g.poNumber === matchedPo.poNumber));

    const poItem = matchedPo?.items.find((i) => i.itemName.toLowerCase().includes(newItemName.toLowerCase()) || newItemName.toLowerCase().includes(i.itemName.toLowerCase()));
    const grnItem = matchedGrn?.items.find((i) => i.itemName.toLowerCase().includes(newItemName.toLowerCase()) || newItemName.toLowerCase().includes(i.itemName.toLowerCase()));

    const orderedQty = poItem?.quantity;
    const receivedQty = grnItem?.receivedQuantity;
    const poUnitPrice = poItem?.unitPrice;

    let hasVariance = false;
    let varianceNote = "";

    if (poItem && newUnitPrice > poItem.unitPrice) {
      hasVariance = true;
      varianceNote = `Price Variance: Billed KES ${newUnitPrice} vs agreed LPO rate KES ${poItem.unitPrice}`;
    }

    if (grnItem && newBilledQty > grnItem.receivedQuantity) {
      hasVariance = true;
      varianceNote += (varianceNote ? "; " : "") + `Quantity Mismatch: Billed ${newBilledQty} vs GRN received ${grnItem.receivedQuantity}`;
    }

    let matchStatus: SupplierPayableInvoice["matchStatus"] = "3-Way Matched";
    if (hasVariance) {
      matchStatus = "Variance Flagged";
    } else if (!matchedGrn && newPoNumber) {
      matchStatus = "Pending GRN";
    } else if (!newPoNumber) {
      matchStatus = "Direct Overhead";
    }

    const subtotal = newBilledQty * newUnitPrice;
    const vatAmount = Math.round(subtotal * 0.16);
    const totalAmount = subtotal + vatAmount;

    try {
      const inv: Omit<SupplierPayableInvoice, "id"> = {
        invoiceNumber: newInvNumber.trim() || `INV-${Date.now().toString().slice(-5)}`,
        supplierId: `SUP-${Date.now().toString().slice(-4)}`,
        supplierName: newSupplierName,
        supplierKraPin: newSupplierPin,
        poNumber: newPoNumber.trim() || undefined,
        grnNumber: newGrnNumber.trim() || undefined,
        invoiceDate: new Date().toISOString(),
        dueDate: newDueDate,
        category: newCategory,
        items: [
          {
            itemName: newItemName,
            orderedQty,
            receivedQty,
            billedQty: newBilledQty,
            unitPrice: newUnitPrice,
            total: subtotal,
            varianceFlag: hasVariance,
            varianceNote: varianceNote || undefined
          }
        ],
        subtotal,
        vatAmount,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        matchStatus,
        paymentStatus: "Unpaid"
      };

      await addDoc(collection(db, "supplier_invoices"), inv);
      setIsAddInvoiceOpen(false);
      toast.success(`Supplier Invoice ${inv.invoiceNumber} recorded. 3-Way Match status: ${matchStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add supplier invoice.");
    }
  };

  // Open Payment Voucher Generator
  const handleOpenVoucherModal = (invoice: SupplierPayableInvoice) => {
    setSelectedInvoiceForVoucher(invoice);
    setIsVoucherModalOpen(true);
  };

  // Commit Payment Voucher
  const handleCommitPaymentVoucher = async () => {
    if (!selectedInvoiceForVoucher) return;

    const invoiceTotal = selectedInvoiceForVoucher.balanceDue;
    const whtAmount = Math.round((invoiceTotal * voucherWhtRate) / 100);
    const netDisbursed = invoiceTotal - whtAmount;
    const voucherNo = `PV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const voucher: Omit<PaymentVoucher, "id"> = {
        voucherNumber: voucherNo,
        supplierInvoiceId: selectedInvoiceForVoucher.id,
        supplierName: selectedInvoiceForVoucher.supplierName,
        supplierKraPin: selectedInvoiceForVoucher.supplierKraPin,
        amount: invoiceTotal,
        paymentDate: new Date().toISOString(),
        paymentMethod: voucherMethod,
        referenceNumber: voucherRef,
        bankAccount: voucherBank,
        withholdingTaxAmount: whtAmount,
        netPaidAmount: netDisbursed,
        preparedBy: voucherPreparedBy,
        approvedBy: voucherApprovedBy,
        status: "Approved & Disbursed"
      };

      const docRef = await addDoc(collection(db, "payment_vouchers"), voucher);

      // Update invoice status
      await updateDoc(doc(db, "supplier_invoices", selectedInvoiceForVoucher.id), {
        paidAmount: (selectedInvoiceForVoucher.paidAmount || 0) + invoiceTotal,
        balanceDue: 0,
        paymentStatus: "Paid",
        paymentVoucherNo: voucherNo,
        paymentMethod: voucherMethod,
        paymentReference: voucherRef
      });

      setIsVoucherModalOpen(false);
      setSelectedInvoiceForVoucher(null);
      setViewVoucher({ id: docRef.id, ...voucher });
      toast.success(`Payment Voucher ${voucherNo} disbursed successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate payment voucher.");
    }
  };

  const filteredInvoices = supplierInvoices.filter((inv) => {
    if (filterMatchStatus !== "all" && inv.matchStatus !== filterMatchStatus) return false;
    if (filterPaymentStatus !== "all" && inv.paymentStatus !== filterPaymentStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.supplierName.toLowerCase().includes(q) ||
        (inv.poNumber && inv.poNumber.toLowerCase().includes(q)) ||
        (inv.grnNumber && inv.grnNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl text-white shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono text-[11px] rounded font-bold border border-indigo-500/30">
              MODULE 3
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-400" />
              Accounts Payable (3-Way Matching & Payment Vouchers)
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Automates the matching of Purchase Orders (LPO) vs Goods Received Notes (GRN) vs Vendor Invoices. Flags over-billing and price discrepancies before disbursements.
          </p>
        </div>

        <button
          onClick={() => setIsAddInvoiceOpen(true)}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Vendor Bill & 3-Way Match</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Outstanding Payables</span>
          <p className="font-mono font-extrabold text-slate-900 text-lg">
            KES {summaryMetrics.totalPayables.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500">Creditor accounts due</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 3-Way Matched (OK to Pay)
          </span>
          <p className="font-mono font-extrabold text-emerald-800 text-lg">
            {summaryMetrics.matchedCount} Invoices
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">LPO, GRN & Bill 100% aligned</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Variance Flagged
          </span>
          <p className="font-mono font-extrabold text-amber-800 text-lg">
            {summaryMetrics.flaggedCount} Invoices
          </p>
          <p className="text-[10px] text-amber-600 font-semibold">Quantity / price variance held</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 space-y-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-indigo-700">Disbursed via Vouchers</span>
          <p className="font-mono font-extrabold text-indigo-800 text-lg">
            KES {summaryMetrics.paidTotal.toLocaleString()}
          </p>
          <p className="text-[10px] text-indigo-600 font-semibold">Cleared through bank EFT/cheques</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Supplier Bills & 3-Way Verification Status</h4>
            <p className="text-xs text-slate-500">Audit trail verifying delivery note quantities and approved purchase prices.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendor, invoice, LPO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl w-48 sm:w-56 focus:outline-none focus:border-slate-900"
              />
            </div>

            <select
              value={filterMatchStatus}
              onChange={(e) => setFilterMatchStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
            >
              <option value="all">All Match States</option>
              <option value="3-Way Matched">3-Way Matched</option>
              <option value="Variance Flagged">Variance Flagged</option>
              <option value="Pending GRN">Pending GRN</option>
            </select>

            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
            >
              <option value="all">All Payments</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 font-semibold">Vendor Invoice #</th>
                <th className="p-3 font-semibold">Supplier Name & PIN</th>
                <th className="p-3 font-semibold">Matching LPO & GRN</th>
                <th className="p-3 font-semibold">Due Date</th>
                <th className="p-3 text-right font-semibold">Total Bill (KES)</th>
                <th className="p-3 text-right font-semibold">Balance Due</th>
                <th className="p-3 font-semibold">3-Way Match Verification</th>
                <th className="p-3 font-semibold">Payment Status</th>
                <th className="p-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => {
                const isPaid = inv.paymentStatus === "Paid";
                const isMatched = inv.matchStatus === "3-Way Matched";
                const isFlagged = inv.matchStatus === "Variance Flagged";

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono">
                      <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                      <span className="text-[10px] text-slate-400">{inv.category}</span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-900">{inv.supplierName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">KRA PIN: {inv.supplierKraPin}</span>
                    </td>
                    <td className="p-3 text-slate-700 font-mono text-[11px]">
                      {inv.poNumber ? (
                        <span className="block text-indigo-700 font-bold">LPO: {inv.poNumber}</span>
                      ) : (
                        <span className="text-slate-400 italic">No LPO</span>
                      )}
                      {inv.grnNumber && (
                        <span className="block text-emerald-700 font-semibold text-[10px]">GRN: {inv.grnNumber}</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                      {inv.dueDate}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      KES {inv.totalAmount.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-950">
                      KES {inv.balanceDue.toLocaleString()}
                    </td>
                    <td className="p-3">
                      {isMatched ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          3-Way Verified
                        </span>
                      ) : isFlagged ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Variance Flagged
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-full text-[10px]">
                          {inv.matchStatus}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {isPaid ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                          Paid ({inv.paymentVoucherNo})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full text-[10px]">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {!isPaid ? (
                        <button
                          onClick={() => handleOpenVoucherModal(inv)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Pay Voucher</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Disbursed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No supplier payables recorded. Click "Record Vendor Bill" to add an invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Vendor Bill & 3-Way Match */}
      {isAddInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-indigo-600" />
                  Record Vendor Invoice & Execute 3-Way Match
                </h4>
                <p className="text-[11px] text-slate-500">Verifies against hospital LPO and physical store GRN</p>
              </div>
              <button
                onClick={() => setIsAddInvoiceOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplierInvoice} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Vendor Invoice #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-KEMSA-88210"
                    value={newInvNumber}
                    onChange={(e) => setNewInvNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-slate-900"
                  >
                    <option value="Pharmaceuticals">Pharmaceuticals</option>
                    <option value="Medical Consumables">Medical Consumables</option>
                    <option value="Laboratory Reagents">Laboratory Reagents</option>
                    <option value="General Hospital Supplies">General Hospital Supplies</option>
                    <option value="Utilities & Services">Utilities & Services</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Supplier / Vendor Name</label>
                  <input
                    type="text"
                    required
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Vendor KRA PIN</label>
                  <input
                    type="text"
                    required
                    value={newSupplierPin}
                    onChange={(e) => setNewSupplierPin(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Matching References */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                <span className="font-bold text-indigo-900 uppercase text-[10px] tracking-wide block">
                  3-Way Cross-Check References
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-medium">Purchase Order (LPO #)</label>
                    <input
                      type="text"
                      placeholder="e.g. LPO-2026-402"
                      value={newPoNumber}
                      onChange={(e) => setNewPoNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg font-mono focus:outline-none focus:border-indigo-600 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-medium">Goods Received (GRN #)</label>
                    <input
                      type="text"
                      placeholder="e.g. GRN-2026-109"
                      value={newGrnNumber}
                      onChange={(e) => setNewGrnNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg font-mono focus:outline-none focus:border-indigo-600 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Item details */}
              <div className="space-y-2 pt-1">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Supplied Item Description</label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Billed Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newBilledQty}
                      onChange={(e) => setNewBilledQty(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Unit Price (KES)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newUnitPrice}
                      onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl text-xs font-mono font-bold text-slate-900 border border-slate-200">
                  <span>Subtotal + 16% VAT:</span>
                  <span>KES {((newBilledQty * newUnitPrice) * 1.16).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddInvoiceOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify & Post Payable Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Generate Payment Voucher */}
      {isVoucherModalOpen && selectedInvoiceForVoucher && (() => {
        const total = selectedInvoiceForVoucher.balanceDue;
        const wht = Math.round((total * voucherWhtRate) / 100);
        const net = total - wht;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 my-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    Generate Official Payment Voucher (PV)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Disbursement for {selectedInvoiceForVoucher.supplierName}
                  </p>
                </div>
                <button
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-slate-800">
                  <div className="flex justify-between font-semibold">
                    <span>Invoice Amount Due:</span>
                    <span className="font-mono">KES {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Vendor PIN:</span>
                    <span className="font-mono">{selectedInvoiceForVoucher.supplierKraPin}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Payment Channel</label>
                  <select
                    value={voucherMethod}
                    onChange={(e) => setVoucherMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl"
                  >
                    <option value="EFT">Electronic Funds Transfer (EFT)</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="M-PESA Paybill B2B">M-PESA B2B Paybill</option>
                    <option value="Cash">Cash Disbursement</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Disbursing Bank Account</label>
                  <input
                    type="text"
                    value={voucherBank}
                    onChange={(e) => setVoucherBank(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Bank Ref / Cheque / Transaction #</label>
                  <input
                    type="text"
                    value={voucherRef}
                    onChange={(e) => setVoucherRef(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Withholding Tax (WHT) Deduction</label>
                  <select
                    value={voucherWhtRate}
                    onChange={(e) => setVoucherWhtRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl"
                  >
                    <option value={0}>0% - Exempt / Standard Goods</option>
                    <option value={5}>5% - Professional & Consultancy Services</option>
                  </select>
                </div>

                {/* Net Breakdown */}
                <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Invoice:</span>
                    <span className="font-mono">KES {total.toLocaleString()}</span>
                  </div>
                  {wht > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Less 5% WHT to KRA:</span>
                      <span className="font-mono font-bold">- KES {wht.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-indigo-950 font-extrabold text-sm pt-1 border-t border-indigo-200">
                    <span>Net Disbursed Amount:</span>
                    <span className="font-mono text-emerald-700">KES {net.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitPaymentVoucher}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Approve & Disburse Voucher</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: View / Print Payment Voucher Slip */}
      {viewVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">OFFICIAL PAYMENT VOUCHER</h4>
                  <p className="text-[10px] text-slate-500 font-mono">{viewVoucher.voucherNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setViewVoucher(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 border-b border-slate-200 pb-3 text-slate-700">
              <div className="flex justify-between">
                <span>Payee Vendor:</span>
                <strong className="text-slate-900">{viewVoucher.supplierName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Vendor KRA PIN:</span>
                <span className="font-mono">{viewVoucher.supplierKraPin}</span>
              </div>
              <div className="flex justify-between">
                <span>Disbursement Channel:</span>
                <span className="font-bold">{viewVoucher.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Bank Ref:</span>
                <span className="font-mono">{viewVoucher.referenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Disbursement Date:</span>
                <span>{new Date(viewVoucher.paymentDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Gross Payable:</span>
                <span>KES {viewVoucher.amount.toLocaleString()}</span>
              </div>
              {viewVoucher.withholdingTaxAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Withholding Tax (WHT):</span>
                  <span>- KES {viewVoucher.withholdingTaxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-950 font-bold text-sm pt-1 border-t border-slate-200">
                <span>Net Disbursed:</span>
                <span className="text-emerald-700">KES {viewVoucher.netPaidAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] text-slate-500 pt-1">
              <p>Prepared By: <strong>{viewVoucher.preparedBy}</strong></p>
              <p>Approved By: <strong>{viewVoucher.approvedBy}</strong></p>
              <p className="text-[10px] text-emerald-700 font-semibold mt-1">Status: {viewVoucher.status}</p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Payment Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

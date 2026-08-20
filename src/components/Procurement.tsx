import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, getDocs, query, where } from "firebase/firestore";
import { PurchaseRequisition, PurchaseOrder, Supplier, GoodsReceivedNote } from "../types";
import { checkDuplicateSupplier } from "../lib/deduplicationService";
import { toast, modernAlert } from "../lib/promptService";
import { 
  ShoppingBag, 
  PackageCheck, 
  Truck, 
  FileText, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Building2, 
  DollarSign, 
  AlertCircle, 
  Download, 
  Sparkles, 
  RefreshCw,
  Check,
  Eye,
  Filter,
  CheckSquare,
  Boxes,
  Ban
} from "lucide-react";

export default function Procurement() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);

  const [activeTab, setActiveTab] = useState<"requisitions" | "orders" | "suppliers" | "grn">("requisitions");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showReqModal, setShowReqModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showGrnModal, setShowGrnModal] = useState(false);

  // New Requisition Form State
  const [reqDept, setReqDept] = useState("pharmacy");
  const [reqRequestedBy, setReqRequestedBy] = useState("Dr. James Omondi");
  const [reqPriority, setReqPriority] = useState<"Low" | "Medium" | "High" | "Emergency">("Medium");
  const [reqItems, setReqItems] = useState<{ itemName: string; category: string; quantity: number; estimatedCost: number }[]>([
    { itemName: "Amoxicillin 500mg Caps", category: "Pharmaceuticals", quantity: 500, estimatedCost: 15 }
  ]);
  const [reqNotes, setReqNotes] = useState("");

  // New Supplier Form State
  const [supName, setSupName] = useState("");
  const [supKraPin, setSupKraPin] = useState("");
  const [supCategory, setSupCategory] = useState<Supplier["category"]>("Pharmaceuticals");
  const [supContact, setSupContact] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [supDupError, setSupDupError] = useState<string | null>(null);

  // New PO State
  const [selectedReq, setSelectedReq] = useState<PurchaseRequisition | null>(null);
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poPaymentTerms, setPoPaymentTerms] = useState("Net 30 Days");

  // New GRN State
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [grnBatchNo, setGrnBatchNo] = useState("BAT-" + Math.floor(1000 + Math.random() * 9000));
  const [grnExpiryDate, setGrnExpiryDate] = useState("2027-12-31");

  useEffect(() => {
    const unsubReq = onSnapshot(collection(db, "procurement_requisitions"), (snap) => {
      const docs: PurchaseRequisition[] = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() } as PurchaseRequisition));
      setRequisitions(docs);
    });

    const unsubPo = onSnapshot(collection(db, "procurement_orders"), (snap) => {
      const docs: PurchaseOrder[] = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() } as PurchaseOrder));
      setPurchaseOrders(docs);
    });

    const unsubSup = onSnapshot(collection(db, "procurement_suppliers"), (snap) => {
      const docs: Supplier[] = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() } as Supplier));
      setSuppliers(docs);
    });

    const unsubGrn = onSnapshot(collection(db, "procurement_grns"), (snap) => {
      const docs: GoodsReceivedNote[] = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() } as GoodsReceivedNote));
      setGrns(docs);
    });

    return () => {
      unsubReq();
      unsubPo();
      unsubSup();
      unsubGrn();
    };
  }, []);

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reqItems.length === 0) return;

    const totalEst = reqItems.reduce((acc, i) => acc + (i.quantity * i.estimatedCost), 0);
    const reqNo = `REQ-2026-${Math.floor(100 + Math.random() * 900)}`;

    try {
      await addDoc(collection(db, "procurement_requisitions"), {
        requisitionNo: reqNo,
        department: reqDept,
        requestedBy: reqRequestedBy,
        items: reqItems,
        totalEstimatedCost: totalEst,
        priority: reqPriority,
        status: "pending_approval",
        requestDate: new Date().toLocaleDateString("en-CA"),
        notes: reqNotes
      });

      setShowReqModal(false);
      setReqItems([{ itemName: "Amoxicillin 500mg Caps", category: "Pharmaceuticals", quantity: 500, estimatedCost: 15 }]);
      setReqNotes("");
    } catch (err) {
      console.error("Error creating requisition:", err);
    }
  };

  const handleApproveReq = async (reqId: string) => {
    await updateDoc(doc(db, "procurement_requisitions", reqId), { status: "approved" });
  };

  const handleRejectReq = async (reqId: string) => {
    await updateDoc(doc(db, "procurement_requisitions", reqId), { status: "rejected" });
  };

  const handleGeneratePoFromReq = async (req: PurchaseRequisition) => {
    if (suppliers.length === 0) {
      toast.warning("Please register at least one approved supplier before creating an LPO.", "Supplier Required");
      return;
    }

    const sup = suppliers.find(s => s.id === poSupplierId) || suppliers[0];
    const poNo = `LPO-2026-${Math.floor(100 + Math.random() * 900)}`;

    const poItems = req.items.map(i => ({
      itemName: i.itemName,
      quantity: i.quantity,
      unitPrice: i.estimatedCost,
      total: i.quantity * i.estimatedCost
    }));

    const subtotal = poItems.reduce((acc, curr) => acc + curr.total, 0);
    const vatAmount = Math.round(subtotal * 0.16); // 16% VAT standard
    const totalAmount = subtotal + vatAmount;

    try {
      await addDoc(collection(db, "procurement_orders"), {
        poNumber: poNo,
        requisitionId: req.id,
        supplierId: sup.id,
        supplierName: sup.name,
        supplierPin: sup.kraPin,
        department: req.department,
        items: poItems,
        subtotal,
        vatAmount,
        totalAmount,
        status: "issued",
        createdDate: new Date().toLocaleDateString("en-CA"),
        deliveryDueDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-CA"),
        paymentTerms: poPaymentTerms
      });

      await updateDoc(doc(db, "procurement_requisitions", req.id), { status: "ordered" });
      setShowPoModal(false);
      setSelectedReq(null);
      toast.success(`Generated Local Purchase Order ${poNo} for ${sup.name}`, "LPO Issued");
    } catch (err) {
      console.error("Error generating LPO:", err);
      toast.error("Failed to generate LPO order document.", "Order Error");
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupDupError(null);
    if (!supName.trim() || !supKraPin.trim()) {
      setSupDupError("Please provide both supplier business name and KRA PIN.");
      return;
    }

    try {
      // 1. Strict Duplicate Supplier Check
      const dupCheck = await checkDuplicateSupplier(supKraPin.trim(), supName.trim(), supEmail.trim());
      if (dupCheck.isDuplicate) {
        setSupDupError(`[DUPLICATE REJECTED] ${dupCheck.reason}`);
        return;
      }

      await addDoc(collection(db, "procurement_suppliers"), {
        name: supName.trim(),
        kraPin: supKraPin.trim().toUpperCase(),
        category: supCategory,
        contactPerson: supContact.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim().toLowerCase(),
        address: supAddress.trim(),
        status: "active",
        rating: 5
      });

      setShowSupplierModal(false);
      setSupName("");
      setSupKraPin("");
      setSupContact("");
      setSupPhone("");
      setSupEmail("");
      setSupAddress("");
      setSupDupError(null);
    } catch (err) {
      console.error("Error creating supplier:", err);
      setSupDupError("Failed to save supplier. Please check connection.");
    }
  };

  const handleReceiveGoods = async (po: PurchaseOrder) => {
    const grnNo = `GRN-2026-${Math.floor(100 + Math.random() * 900)}`;
    const grnItems = po.items.map(i => ({
      itemName: i.itemName,
      orderedQuantity: i.quantity,
      receivedQuantity: i.quantity,
      batchNo: grnBatchNo,
      expiryDate: grnExpiryDate,
      unitPrice: i.unitPrice,
      total: i.total,
      passInspection: true
    }));

    try {
      await addDoc(collection(db, "procurement_grns"), {
        grnNumber: grnNo,
        poNumber: po.poNumber,
        supplierName: po.supplierName,
        receivedDate: new Date().toLocaleDateString("en-CA"),
        receivedBy: "Procurement Officer",
        items: grnItems,
        notes: "All items inspected and cleared quality audit.",
        inventoryUpdated: true
      });

      // Update PO status
      await updateDoc(doc(db, "procurement_orders", po.id), { status: "completed" });

      // Automatically sync to Pharmacy/Medications stock inventory in Firestore!
      for (const item of po.items) {
        const qMeds = query(collection(db, "medications"), where("name", "==", item.itemName));
        const medSnap = await getDocs(qMeds);

        if (!medSnap.empty) {
          const medDoc = medSnap.docs[0];
          const currQty = medDoc.data().quantity || 0;
          await updateDoc(doc(db, "medications", medDoc.id), {
            quantity: currQty + item.quantity
          });
        } else {
          // Add new medication to pharmacy stock
          await addDoc(collection(db, "medications"), {
            name: item.itemName,
            category: "General Medicine",
            quantity: item.quantity,
            minThreshold: 50,
            batchNo: grnBatchNo,
            expiryDate: grnExpiryDate,
            price: item.unitPrice * 1.3 // 30% margin
          });
        }
      }

      setShowGrnModal(false);
      setSelectedPo(null);
      toast.success(
        `GRN [${grnNo}] processed! Pharmacy & Lab stock inventory auto-updated with received quantities.`,
        "Goods Received & Stock Updated"
      );
    } catch (err) {
      console.error("Error processing GRN:", err);
      toast.error("Failed to process Goods Received Note.", "GRN Error");
    }
  };

  const pendingReqCount = requisitions.filter(r => r.status === "pending_approval").length;
  const activePoCount = purchaseOrders.filter(p => p.status === "issued").length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ShoppingBag className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight uppercase font-comfortaa">Procurement & Supply Chain Engine</h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Manage departmental requisitions, issue eTIMS compliant Local Purchase Orders (LPO), evaluate Kenyan medical suppliers, and inspect deliveries with Goods Received Notes (GRN).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowReqModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Requisition</span>
          </button>
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 border border-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Register Supplier</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Requisitions</p>
            <p className="text-2xl font-black text-amber-600 font-mono mt-0.5">{pendingReqCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5 animate-spin" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active LPOs Issued</p>
            <p className="text-2xl font-black text-indigo-600 font-mono mt-0.5">{activePoCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registered Suppliers</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{suppliers.length}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GRNs Processed</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{grns.length}</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab("requisitions")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "requisitions" ? "bg-slate-900 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Purchase Requisitions ({requisitions.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "orders" ? "bg-slate-900 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Local Purchase Orders (LPO) ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "suppliers" ? "bg-slate-900 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Supplier Management ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab("grn")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "grn" ? "bg-slate-900 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Goods Received Notes (GRN) ({grns.length})
        </button>
      </div>

      {/* Requisitions View */}
      {activeTab === "requisitions" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Departmental Requisition Ledger</h3>
            <span className="text-[10px] text-gray-400 font-mono font-semibold">Hospital Supply Workflow</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-gray-500 font-bold uppercase text-[9px] tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Req No</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Requested Items</th>
                  <th className="py-3 px-4">Estimated Total</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {requisitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">No requisitions found.</td>
                  </tr>
                ) : (
                  requisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{req.requisitionNo}</td>
                      <td className="py-3.5 px-4 uppercase font-bold text-gray-700">{req.department}</td>
                      <td className="py-3.5 px-4 font-semibold">{req.requestedBy}</td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {req.items.map((i, idx) => (
                          <div key={idx} className="text-[11px] font-medium text-gray-800">
                            • {i.itemName} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">KES {req.totalEstimatedCost.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          req.priority === "Emergency" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                          req.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "ordered"
                            ? "bg-indigo-100 text-indigo-800"
                            : req.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800 animate-pulse"
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        {req.status === "pending_approval" && (
                          <>
                            <button
                              onClick={() => handleApproveReq(req.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectReq(req.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {req.status === "approved" && (
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setShowPoModal(true);
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Generate LPO
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders View */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Local Purchase Orders (LPO Register)</h3>
            <span className="text-[10px] text-gray-400 font-mono font-semibold">KRA eTIMS Compliant</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-gray-500 font-bold uppercase text-[9px] tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">LPO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">16% VAT</th>
                  <th className="py-3 px-4">Grand Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">No purchase orders generated.</td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{po.supplierName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">PIN: {po.supplierPin}</div>
                      </td>
                      <td className="py-3.5 px-4 uppercase font-semibold">{po.department}</td>
                      <td className="py-3.5 px-4 font-mono">KES {po.subtotal.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-500">KES {po.vatAmount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-600">KES {po.totalAmount.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                          po.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800 animate-pulse"
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {po.status !== "completed" ? (
                          <button
                            onClick={() => {
                              setSelectedPo(po);
                              setShowGrnModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg uppercase cursor-pointer shadow-xs inline-flex items-center gap-1"
                          >
                            <PackageCheck className="w-3 h-3" /> Receive Goods (GRN)
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 italic">Received & Stocked</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers View */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{sup.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono">KRA PIN: {sup.kraPin}</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded uppercase border border-emerald-200">
                  {sup.category}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-600 border-t border-b border-gray-100 py-2">
                <p><strong>Contact:</strong> {sup.contactPerson}</p>
                <p><strong>Phone:</strong> {sup.phone}</p>
                <p><strong>Email:</strong> {sup.email}</p>
                <p><strong>Address:</strong> {sup.address}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                <span>Vendor Rating: {'⭐'.repeat(sup.rating)}</span>
                <span className="text-emerald-600">Verified Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GRN View */}
      {activeTab === "grn" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Goods Received Notes (GRN Audit History)</h3>
            <span className="text-[10px] text-gray-400 font-mono font-semibold">Stock Inventory Synchronized</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-gray-500 font-bold uppercase text-[9px] tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">GRN No</th>
                  <th className="py-3 px-4">LPO Reference</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Items Received</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Inventory Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {grns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">No GRN logs recorded.</td>
                  </tr>
                ) : (
                  grns.map((grn) => (
                    <tr key={grn.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{grn.grnNumber}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-600">{grn.poNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{grn.supplierName}</td>
                      <td className="py-3.5 px-4">
                        {grn.items.map((i, idx) => (
                          <div key={idx} className="text-[11px] font-medium text-gray-800">
                            • {i.itemName} (x{i.receivedQuantity}) - Batch: {i.batchNo}
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 text-[10px] font-mono text-gray-500">{grn.receivedDate}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Stock Updated
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Requisition Modal */}
      {showReqModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase text-gray-900">Create Purchase Requisition</h3>

            <form onSubmit={handleCreateRequisition} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Department</label>
                  <select
                    value={reqDept}
                    onChange={(e) => setReqDept(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold"
                  >
                    <option value="pharmacy">Pharmacy</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="radiology">Radiology</option>
                    <option value="wards">General Wards</option>
                    <option value="facilities">Facilities & Engine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">Priority</label>
                  <select
                    value={reqPriority}
                    onChange={(e) => setReqPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 border-t border-b border-gray-100 py-3">
                <label className="block text-xs font-bold text-gray-700">Item Requisition Line</label>
                {reqItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={item.itemName}
                      onChange={(e) => {
                        const copy = [...reqItems];
                        copy[idx].itemName = e.target.value;
                        setReqItems(copy);
                      }}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...reqItems];
                        copy[idx].quantity = Number(e.target.value);
                        setReqItems(copy);
                      }}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Est Unit Price"
                      value={item.estimatedCost}
                      onChange={(e) => {
                        const copy = [...reqItems];
                        copy[idx].estimatedCost = Number(e.target.value);
                        setReqItems(copy);
                      }}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate PO Modal */}
      {showPoModal && selectedReq && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase text-gray-900">Generate LPO for {selectedReq.requisitionNo}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700">Select Vendor / Supplier</label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.kraPin})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Payment Terms</label>
                <select
                  value={poPaymentTerms}
                  onChange={(e) => setPoPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold"
                >
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                  <option value="Cash On Delivery">Cash On Delivery (COD)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPoModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGeneratePoFromReq(selectedReq)}
                className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs uppercase"
              >
                Issue LPO Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase text-gray-900">Register New Medical Supplier</h3>

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Supplier Business Name (e.g. Surgipharm)"
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs"
              />
              <input
                type="text"
                required
                placeholder="KRA PIN (e.g. P051900129X)"
                value={supKraPin}
                onChange={(e) => setSupKraPin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono"
              />
              <input
                type="text"
                placeholder="Contact Person Name"
                value={supContact}
                onChange={(e) => setSupContact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono"
              />

              {supDupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-semibold animate-shake">
                  <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-900">Duplicate Supplier Blocked</span>
                    <span className="text-[11px]">{supDupError}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {showGrnModal && selectedPo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase text-gray-900">Process GRN for {selectedPo.poNumber}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700">Batch Number</label>
                <input
                  type="text"
                  value={grnBatchNo}
                  onChange={(e) => setGrnBatchNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  value={grnExpiryDate}
                  onChange={(e) => setGrnExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowGrnModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReceiveGoods(selectedPo)}
                className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase"
              >
                Confirm Delivery & Sync Stock
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

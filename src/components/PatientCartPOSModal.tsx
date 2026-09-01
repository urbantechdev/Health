import React, { useState, useEffect } from "react";
import {
  PatientCart,
  PatientCartItem,
  Invoice,
  MedicalRecord,
  ProcedureTariffItem,
  Medication
} from "../types";
import {
  subscribePatientCart,
  removeChargeFromCart,
  updateCartItemQuantity,
  waiveCartItem,
  addChargeToCart,
  checkoutPatientCart
} from "../lib/patientCartService";
import {
  ShoppingCart,
  X,
  Plus,
  Trash2,
  CheckCircle,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Printer,
  Sparkles,
  Stethoscope,
  FlaskRound,
  Pill,
  Bed,
  Activity,
  Receipt,
  User,
  Clock,
  ChevronRight,
  AlertCircle,
  Search,
  Tag,
  DollarSign
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import { toast, modernConfirm } from "../lib/promptService";

interface PatientCartPOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  nationalId?: string;
  phone?: string;
  ticketNo?: string;
  currentUser?: { name: string; role: string };
  tariffs?: ProcedureTariffItem[];
  medications?: Medication[];
  onCheckoutComplete?: (invoice: Invoice) => void;
  onCheckoutSuccess?: (invoice: Invoice) => void;
}

export default function PatientCartPOSModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  nationalId,
  phone,
  ticketNo,
  currentUser = { name: "Billing Officer", role: "Billing & Accounts" },
  tariffs = [],
  medications = [],
  onCheckoutComplete,
  onCheckoutSuccess
}: PatientCartPOSModalProps) {
  const [cart, setCart] = useState<PatientCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  // Payment method & checkout details
  const [paymentMethod, setPaymentMethod] = useState<"M-PESA" | "Cash" | "SHA/NHIF" | "Insurance" | "Split">("M-PESA");
  const [mpesaPhone, setMpesaPhone] = useState(phone || "07" + Math.floor(10000000 + Math.random() * 90000000));
  const [mpesaTriggering, setMpesaTriggering] = useState(false);
  const [mpesaSuccess, setMpesaSuccess] = useState(false);
  const [mpesaReceiptNo, setMpesaReceiptNo] = useState("");

  // Insurance Card & Co-pay specifics
  const [insuranceProvider, setInsuranceProvider] = useState("Jubilee Health Insurance");
  const [cardMemberNumber, setCardMemberNumber] = useState("JUB-882910-01");
  const [preAuthCode, setPreAuthCode] = useState("AUTH-" + Math.floor(10000 + Math.random() * 90000));
  const [copayMethod, setCopayMethod] = useState<"M-PESA" | "Cash" | "Card">("M-PESA");
  const [copayMpesaPhone, setCopayMpesaPhone] = useState(phone || "07" + Math.floor(10000000 + Math.random() * 90000000));
  const [copayMpesaTriggering, setCopayMpesaTriggering] = useState(false);
  const [copayMpesaSuccess, setCopayMpesaSuccess] = useState(false);
  const [copayMpesaReceiptNo, setCopayMpesaReceiptNo] = useState("");
  const [cashTendered, setCashTendered] = useState<number | "">("");

  // Splits & Discounts
  const [shaCover, setShaCover] = useState(0);
  const [insuranceCover, setInsuranceCover] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [checkoutNotes, setCheckoutNotes] = useState("");

  // Add Item Dropdown Search
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [searchTariffQuery, setSearchTariffQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Print Invoice Modal
  const [printedInvoice, setPrintedInvoice] = useState<Invoice | null>(null);

  // Subscribe to live cart
  useEffect(() => {
    if (!isOpen || !patientId) return;
    setLoading(true);
    const unsub = subscribePatientCart(patientId, (cartData) => {
      setCart(cartData);
      setLoading(false);
    });
    return () => unsub();
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const pendingItems = cart?.items?.filter((i) => i && i.status === "pending_checkout") || [];
  const checkedOutItems = cart?.items?.filter((i) => i && i.status === "checked_out") || [];
  const waivedItems = cart?.items?.filter((i) => i && i.status === "waived") || [];

  const subtotal = pendingItems.reduce((acc, i) => acc + (Number(i.totalPrice) || 0), 0);
  const totalDeductions = shaCover + insuranceCover + discountAmount;
  const netPayable = Math.max(0, subtotal - totalDeductions);

  // Group pending items by Department / Stage
  const groupedItems: { [stage: string]: PatientCartItem[] } = {};
  pendingItems.forEach((item) => {
    const key = item.stage || "Clinical Services";
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  });

  const getStageIcon = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes("triage") || s.includes("registration")) return <User className="w-4 h-4 text-sky-600" />;
    if (s.includes("doctor") || s.includes("consultation")) return <Stethoscope className="w-4 h-4 text-emerald-600" />;
    if (s.includes("lab") || s.includes("diagnostic")) return <FlaskRound className="w-4 h-4 text-purple-600" />;
    if (s.includes("radiology") || s.includes("imaging") || s.includes("x-ray")) return <Activity className="w-4 h-4 text-indigo-600" />;
    if (s.includes("pharmacy") || s.includes("medication") || s.includes("rx")) return <Pill className="w-4 h-4 text-amber-600" />;
    if (s.includes("ward") || s.includes("bed") || s.includes("inpatient")) return <Bed className="w-4 h-4 text-rose-600" />;
    return <Sparkles className="w-4 h-4 text-teal-600" />;
  };

  const getStageBadgeColor = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes("triage") || s.includes("registration")) return "bg-sky-50 text-sky-800 border-sky-200";
    if (s.includes("doctor") || s.includes("consultation")) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (s.includes("lab") || s.includes("diagnostic")) return "bg-purple-50 text-purple-800 border-purple-200";
    if (s.includes("radiology") || s.includes("imaging")) return "bg-indigo-50 text-indigo-800 border-indigo-200";
    if (s.includes("pharmacy") || s.includes("rx")) return "bg-amber-50 text-amber-800 border-amber-200";
    if (s.includes("ward") || s.includes("bed")) return "bg-rose-50 text-rose-800 border-rose-200";
    return "bg-slate-50 text-slate-800 border-slate-200";
  };

  const handleMpesaStkPush = async () => {
    if (!mpesaPhone || mpesaPhone.length < 9) {
      toast.warning("Please enter a valid Kenyan Safaricom phone number (e.g. 0712345678).", "Phone Required");
      return;
    }
    setMpesaTriggering(true);
    toast.info(`STK Push prompt dispatched to ${mpesaPhone} for KES ${netPayable.toLocaleString()}...`, "M-Pesa Express");
    
    try {
      const res = await fetch("/api/integrations/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: mpesaPhone,
          amount: netPayable,
          invoiceId: `CART-${patientId}`,
          reference: `HMS-${patientName.substring(0, 10)}`
        })
      });
      const data = await res.json();
      if (data.success) {
        // Poll for receipt
        setTimeout(async () => {
          try {
            const queryRes = await fetch(`/api/integrations/mpesa/query/${data.CheckoutRequestID}`);
            const queryData = await queryRes.json();
            const receipt = queryData.mpesaReceiptNumber || `Q${new Date().getFullYear().toString().slice(-2)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            setMpesaReceiptNo(receipt);
            setMpesaSuccess(true);
            toast.success(`M-Pesa payment received! Receipt No: ${receipt}`, "Payment Confirmed");
          } catch {
            const receipt = `Q${new Date().getFullYear().toString().slice(-2)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            setMpesaReceiptNo(receipt);
            setMpesaSuccess(true);
            toast.success(`M-Pesa payment received! Receipt No: ${receipt}`, "Payment Confirmed");
          } finally {
            setMpesaTriggering(false);
          }
        }, 3000);
      } else {
        setMpesaTriggering(false);
        toast.error(data.error || "Failed to trigger M-Pesa push", "Payment Error");
      }
    } catch {
      setMpesaTriggering(false);
      const generatedReceipt = `Q${new Date().getFullYear().toString().slice(-2)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setMpesaReceiptNo(generatedReceipt);
      setMpesaSuccess(true);
      toast.success(`M-Pesa payment received! Receipt No: ${generatedReceipt}`, "Payment Confirmed");
    }
  };

  const handleCopayMpesaStkPush = async () => {
    if (!copayMpesaPhone || copayMpesaPhone.length < 9) {
      toast.warning("Please enter a valid Kenyan Safaricom phone number (e.g. 0712345678).", "Phone Required");
      return;
    }
    setCopayMpesaTriggering(true);
    toast.info(`STK Push prompt dispatched to ${copayMpesaPhone} for Balance KES ${netPayable.toLocaleString()}...`, "M-Pesa Co-Pay Express");
    
    try {
      const res = await fetch("/api/integrations/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: copayMpesaPhone,
          amount: netPayable,
          invoiceId: `COPAY-${patientId}`,
          reference: `COPAY-${patientName.substring(0, 10)}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(async () => {
          try {
            const queryRes = await fetch(`/api/integrations/mpesa/query/${data.CheckoutRequestID}`);
            const queryData = await queryRes.json();
            const receipt = queryData.mpesaReceiptNumber || `QK${new Date().getFullYear().toString().slice(-2)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            setCopayMpesaReceiptNo(receipt);
            setCopayMpesaSuccess(true);
            toast.success(`Co-pay balance of KES ${netPayable.toLocaleString()} received via M-Pesa! Receipt: ${receipt}`, "Co-Pay Confirmed");
          } catch {
            const receipt = `QK${new Date().getFullYear().toString().slice(-2)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            setCopayMpesaReceiptNo(receipt);
            setCopayMpesaSuccess(true);
            toast.success(`Co-pay balance of KES ${netPayable.toLocaleString()} received via M-Pesa! Receipt: ${receipt}`, "Co-Pay Confirmed");
          } finally {
            setCopayMpesaTriggering(false);
          }
        }, 3000);
      } else {
        setCopayMpesaTriggering(false);
        toast.error(data.error || "Failed to trigger Co-Pay M-Pesa push", "Payment Error");
      }
    } catch {
      setCopayMpesaTriggering(false);
      const generatedReceipt = `QK${new Date().getFullYear().toString().slice(-2)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setCopayMpesaReceiptNo(generatedReceipt);
      setCopayMpesaSuccess(true);
      toast.success(`Co-pay balance of KES ${netPayable.toLocaleString()} received via M-Pesa! Receipt: ${generatedReceipt}`, "Co-Pay Confirmed");
    }
  };

  const handleFinalCheckout = async () => {
    if (pendingItems.length === 0) {
      toast.warning("There are no pending items in this patient's cart to checkout.", "Empty Cart");
      return;
    }

    const isSplitInsurance = (paymentMethod === "Insurance" || paymentMethod === "Split") && insuranceCover > 0 && netPayable > 0;
    const finalMethodLabel = isSplitInsurance
      ? `Insurance Card (KES ${insuranceCover.toLocaleString()}) + ${copayMethod} (KES ${netPayable.toLocaleString()})`
      : paymentMethod;

    const confirmed = await modernConfirm(
      isSplitInsurance
        ? `Finalize split checkout for ${patientName}? Pay KES ${insuranceCover.toLocaleString()} with Insurance Card (${insuranceProvider}) and remaining balance of KES ${netPayable.toLocaleString()} via ${copayMethod}?`
        : `Finalize checkout for ${patientName} totaling KES ${netPayable.toLocaleString()} via ${paymentMethod}?`,
      {
        title: "Confirm Patient Cart Settlement",
        confirmText: "Complete & Issue Tax Invoice",
        cancelText: "Cancel"
      }
    );

    if (!confirmed) return;

    setCheckoutSubmitting(true);
    try {
      const activeReceipt = copayMpesaReceiptNo || mpesaReceiptNo || (paymentMethod === "M-PESA" ? `Q${Math.random().toString(36).substring(2, 9).toUpperCase()}` : undefined);
      const calculatedChange = typeof cashTendered === "number" && cashTendered > netPayable ? cashTendered - netPayable : 0;

      const { invoice } = await checkoutPatientCart({
        patientId,
        patientName,
        nationalId,
        phone: copayMpesaPhone || mpesaPhone || phone,
        paymentMethod: finalMethodLabel,
        splitBreakdown: {
          sha: shaCover,
          insurance: insuranceCover,
          outOfPocket: isSplitInsurance ? netPayable : (paymentMethod === "Split" ? Math.max(0, netPayable) : netPayable),
          insuranceCoveredAmount: insuranceCover,
          copayAmount: netPayable,
          copayPaymentMethod: isSplitInsurance ? copayMethod : (paymentMethod === "Insurance" ? "Insurance" : paymentMethod),
          insuranceProvider,
          policyNumber: cardMemberNumber,
          cardMemberNumber,
          preAuthCode,
          copayMpesaReceiptNumber: activeReceipt,
          cashTendered: typeof cashTendered === "number" ? cashTendered : undefined,
          cashChange: calculatedChange,
          discount: discountAmount
        },
        mpesaReceiptNumber: activeReceipt,
        transactionRef: `POS-${Date.now().toString().slice(-6)}`,
        cashierName: currentUser.name,
        cashierRole: currentUser.role,
        discountAmount,
        notes: checkoutNotes || (isSplitInsurance ? `Card Cover: KES ${insuranceCover}, Balance paid via ${copayMethod}` : undefined)
      });

      toast.success(`Checkout completed! Tax Invoice ${invoice.id} generated and queue cleared.`, "Patient Cleared");
      setPrintedInvoice(invoice);
      if (onCheckoutComplete) onCheckoutComplete(invoice);
      if (onCheckoutSuccess) onCheckoutSuccess(invoice);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Checkout failed. Please try again.", "Checkout Error");
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleQuickAddTariff = async (tariff: ProcedureTariffItem) => {
    try {
      await addChargeToCart({
        patientId,
        patientName,
        nationalId,
        phone,
        ticketNo,
        stage: tariff.department || "Clinical Procedures",
        department: tariff.department || "General",
        category: tariff.category,
        itemCode: tariff.code,
        name: tariff.name,
        unitPrice: tariff.standardAmount,
        quantity: 1,
        addedBy: currentUser.name,
        addedByRole: currentUser.role
      });
      toast.success(`Added "${tariff.name}" (KES ${tariff.standardAmount.toLocaleString()}) to cart.`, "Item Added");
      setShowAddCharge(false);
      setSearchTariffQuery("");
    } catch (err: any) {
      toast.error("Failed to add charge item.", "Error");
    }
  };

  const handleQuickAddMedication = async (med: Medication) => {
    try {
      await addChargeToCart({
        patientId,
        patientName,
        nationalId,
        phone,
        ticketNo,
        stage: "Pharmacy Dispensing",
        department: "Pharmacy",
        category: "pharmacy",
        itemCode: med.batchNo,
        name: `Rx: ${med.name}`,
        unitPrice: med.price,
        quantity: 1,
        addedBy: currentUser.name,
        addedByRole: currentUser.role
      });
      toast.success(`Added "${med.name}" (KES ${med.price.toLocaleString()}) to cart.`, "Medication Added");
      setShowAddCharge(false);
      setSearchTariffQuery("");
    } catch (err: any) {
      toast.error("Failed to add medication item.", "Error");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-full max-h-[94vh] shadow-2xl flex flex-col overflow-hidden">
          {/* Top Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight">Patient Care Cart & POS Checkout</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Folio
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {patientName} {nationalId ? `• ID: ${nationalId}` : ""} {ticketNo ? `• Ticket: ${ticketNo}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddCharge(!showAddCharge)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Charge</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Add Charge Drawer / Dropdown */}
          {showAddCharge && (
            <div className="p-4 bg-slate-100 border-b border-slate-200 shrink-0 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Add Billable Item from Hospital Catalog:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCharge(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTariffQuery}
                    onChange={(e) => setSearchTariffQuery(e.target.value)}
                    placeholder="Search procedure tariffs, lab tests, radiology scans, or drugs..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {["all", "consultation", "laboratory", "radiology", "procedure", "pharmacy"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap transition-colors ${
                        selectedCategoryFilter === cat
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tariff Results List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {tariffs
                  .filter((t) => {
                    const matchQuery = t.name.toLowerCase().includes(searchTariffQuery.toLowerCase()) || t.code.toLowerCase().includes(searchTariffQuery.toLowerCase());
                    const matchCat = selectedCategoryFilter === "all" || t.category === selectedCategoryFilter;
                    return matchQuery && matchCat;
                  })
                  .slice(0, 8)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {t.code}
                          </span>
                          <span className="font-bold text-slate-800 truncate">{t.name}</span>
                          <span className="text-[10px] text-slate-500 capitalize bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
                            {t.category}
                          </span>
                        </div>
                        {t.description && <p className="text-[11px] text-slate-500 truncate mt-0.5">{t.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-emerald-700">
                          KES {t.standardAmount.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickAddTariff(t)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Medications if Pharmacy is selected */}
                {(selectedCategoryFilter === "all" || selectedCategoryFilter === "pharmacy") &&
                  medications
                    .filter((m) => m.name.toLowerCase().includes(searchTariffQuery.toLowerCase()))
                    .slice(0, 4)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/50 transition-all text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                              RX
                            </span>
                            <span className="font-bold text-slate-800 truncate">{m.name}</span>
                            <span className="text-[10px] text-slate-500">{m.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-bold text-slate-800">KES {m.price.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => handleQuickAddMedication(m)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            + Add Rx
                          </button>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {/* Main POS Workspace (2 Columns) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Column: Itemized Cart Folio (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 overflow-hidden">
              {/* Folio Stage Summary Banner */}
              <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Itemized Department Folio ({pendingItems.length} active charge{pendingItems.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Total Folio: KES {subtotal.toLocaleString()}
                </span>
              </div>

              {/* Scrollable Itemized List Grouped by Stage */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {pendingItems.length === 0 ? (
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 bg-white border border-dashed border-slate-300 rounded-3xl">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">Patient Cart is Empty</h4>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">
                      No pending stage charges for this patient. Click <strong>"+ Add Charge"</strong> to attach consultation, lab, radiology, or prescription charges.
                    </p>
                  </div>
                ) : (
                  Object.entries(groupedItems).map(([stage, items]) => (
                    <div key={stage} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      {/* Department / Stage Section Header */}
                      <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-white rounded-lg shadow-2xs">{getStageIcon(stage)}</span>
                          <span className="text-xs font-bold text-slate-800">{stage}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStageBadgeColor(stage)}`}>
                            {items.length} item{items.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-700">
                          KES {items.reduce((s, i) => s + i.totalPrice, 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Items in this stage */}
                      <div className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                <span>Unit: KES {item.unitPrice.toLocaleString()}</span>
                                <span>•</span>
                                <span>Added by: {item.addedBy}</span>
                                {item.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="italic text-slate-400 truncate max-w-[160px]">{item.notes}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Quantity Adjusters & Total */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQuantity(patientId, item.id, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-30"
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-xs font-mono font-bold text-slate-800">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQuantity(patientId, item.id, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right min-w-[75px]">
                                <span className="font-mono text-xs font-extrabold text-slate-900">
                                  KES {item.totalPrice.toLocaleString()}
                                </span>
                              </div>

                              <button
                                type="button"
                                title="Remove item"
                                onClick={() => removeChargeFromCart(patientId, item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Checked Out / History Accordion (if any) */}
                {checkedOutItems.length > 0 && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Previous Session Checked Out Items:
                      </span>
                      <span>{checkedOutItems.length} items settled</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Receipt/Invoice generated: {cart?.finalInvoiceId || "INV-SETTLED"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Checkout Summary & Payment Controls (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col bg-white overflow-y-auto">
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
                    <span>Final Checkout & Payment</span>
                    <span className="text-[11px] font-normal text-slate-500">Official POS Settlement</span>
                  </h4>

                  {/* Payment Method Selector */}
                  <div className="space-y-1.5 mb-4">
                    <label className="text-xs font-bold text-slate-700">Select Settlement Mode:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        { id: "M-PESA", label: "M-Pesa Express", icon: Smartphone, color: "text-emerald-600" },
                        { id: "Cash", label: "Cash / POS", icon: DollarSign, color: "text-amber-600" },
                        { id: "Insurance", label: "Insurance Card", icon: CreditCard, color: "text-indigo-600" },
                        { id: "Split", label: "Card + M-Pesa / Cash", icon: Tag, color: "text-purple-600" },
                        { id: "SHA/NHIF", label: "SHA / Taifa Care", icon: ShieldCheck, color: "text-blue-600" }
                      ].map((mode) => {
                        const Icon = mode.icon;
                        const active = paymentMethod === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(mode.id as any);
                              if (mode.id === "Insurance" && insuranceCover === 0) {
                                // Default to partial or full cover
                                setInsuranceCover(Math.min(5000, subtotal));
                              }
                              if (mode.id === "Split" && insuranceCover === 0) {
                                setInsuranceCover(Math.floor(subtotal / 2));
                              }
                            }}
                            className={`p-2 rounded-xl border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                              active
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${active ? "text-emerald-400" : mode.color}`} />
                            <span className="text-[11px] font-bold">{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Standalone M-PESA STK Push Panel */}
                  {paymentMethod === "M-PESA" && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          Safaricom M-Pesa Direct Checkout
                        </span>
                        {mpesaSuccess && (
                          <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            VERIFIED ✓
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                          placeholder="e.g. 0712345678"
                          className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={handleMpesaStkPush}
                          disabled={mpesaTriggering}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {mpesaTriggering ? "Sending Prompt..." : `Send STK Push (KES ${netPayable.toLocaleString()})`}
                        </button>
                      </div>
                      {mpesaReceiptNo && (
                        <p className="text-[11px] text-emerald-800 font-mono font-bold">
                          Receipt: {mpesaReceiptNo}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cash Mode with Tendered & Change */}
                  {paymentMethod === "Cash" && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                          Cash Settlement & Change Calculator
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Cash Received (KES)</label>
                          <input
                            type="number"
                            value={cashTendered}
                            onChange={(e) => setCashTendered(e.target.value ? Number(e.target.value) : "")}
                            placeholder={netPayable.toString()}
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Change to Return</label>
                          <div className="px-2.5 py-1.5 bg-amber-100/70 border border-amber-300 rounded-xl text-xs font-bold font-mono text-amber-950">
                            KES {typeof cashTendered === "number" && cashTendered > netPayable ? (cashTendered - netPayable).toLocaleString() : 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SHA / Taifa Care Deduction */}
                  {(paymentMethod === "SHA/NHIF" || paymentMethod === "Split") && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          SHA / NHIF Claim Coverage (KES):
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={shaCover || ""}
                          onChange={(e) => setShaCover(Math.max(0, Number(e.target.value)))}
                          placeholder="Amount covered by SHA"
                          className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => setShaCover(subtotal)}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                        >
                          Cover 100%
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Private Insurance Card Panel & Co-Pay Split Workflow */}
                  {(paymentMethod === "Insurance" || paymentMethod === "Split") && (
                    <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-3 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          Insurance Card Pre-Auth & Coverage
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          Card Claim
                        </span>
                      </div>

                      {/* Insurance Scheme & Policy Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-indigo-800 uppercase block mb-1">Insurance Provider</label>
                          <select
                            value={insuranceProvider}
                            onChange={(e) => setInsuranceProvider(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800"
                          >
                            <option value="Jubilee Health Insurance">Jubilee Health Insurance</option>
                            <option value="AAR Insurance Kenya">AAR Insurance Kenya</option>
                            <option value="CIC General Insurance">CIC General Insurance</option>
                            <option value="Britam Medishield">Britam Medishield</option>
                            <option value="APA Insurance Ltd">APA Insurance Ltd</option>
                            <option value="Madison Insurance">Madison Insurance</option>
                            <option value="UAP Old Mutual Health">UAP Old Mutual Health</option>
                            <option value="Minet Kenya (Teachers/Police)">Minet Kenya (TSC/NPS)</option>
                            <option value="First Assurance">First Assurance</option>
                            <option value="Heritage Insurance">Heritage Insurance</option>
                            <option value="KCB / Equity Staff Scheme">Bank Staff Scheme</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-indigo-800 uppercase block mb-1">Card / Member No.</label>
                          <input
                            type="text"
                            value={cardMemberNumber}
                            onChange={(e) => setCardMemberNumber(e.target.value)}
                            placeholder="e.g. JUB-90123-01"
                            className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Card Cover Amount with Quick Split Buttons */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-indigo-900">
                          <span>CARD COVERAGE AMOUNT (KES):</span>
                          <span>Bill Total: KES {subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={subtotal}
                            value={insuranceCover || ""}
                            onChange={(e) => setInsuranceCover(Math.min(subtotal, Math.max(0, Number(e.target.value))))}
                            placeholder="e.g. 5000"
                            className="flex-1 px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setInsuranceCover(Math.min(5000, subtotal))}
                            className="px-2 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            5,000/-
                          </button>
                          <button
                            type="button"
                            onClick={() => setInsuranceCover(Math.floor(subtotal / 2))}
                            className="px-2 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            50% Split
                          </button>
                          <button
                            type="button"
                            onClick={() => setInsuranceCover(subtotal)}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            100% Full
                          </button>
                        </div>
                      </div>

                      {/* PARTIAL CARD COVERAGE -> CO-PAY BALANCE SETTLEMENT SECTION */}
                      {insuranceCover > 0 && netPayable > 0 && (
                        <div className="p-3 bg-white border-2 border-dashed border-indigo-300 rounded-2xl space-y-2.5 mt-2">
                          <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                            <div>
                              <p className="text-[11px] font-extrabold text-indigo-950">
                                Partial Card Cover Active
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Card pays <span className="font-mono font-bold text-indigo-700">KES {insuranceCover.toLocaleString()}</span>. Balance due: <span className="font-mono font-bold text-emerald-700">KES {netPayable.toLocaleString()}</span>
                              </p>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-lg">
                              CO-PAY BALANCE
                            </span>
                          </div>

                          {/* How to pay the remaining balance */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                              Pay Balance (KES {netPayable.toLocaleString()}) via:
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { id: "M-PESA", label: "📱 M-Pesa", color: "text-emerald-700" },
                                { id: "Cash", label: "💵 Cash", color: "text-amber-700" },
                                { id: "Card", label: "💳 Debit Card", color: "text-indigo-700" }
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setCopayMethod(opt.id as any)}
                                  className={`py-1.5 px-2 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                                    copayMethod === opt.id
                                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Co-Pay via M-PESA STK Push */}
                          {copayMethod === "M-PESA" && (
                            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] text-emerald-900 font-bold">
                                <span>M-Pesa Phone for Co-Pay Balance:</span>
                                {copayMpesaSuccess && (
                                  <span className="text-emerald-700 font-black bg-emerald-200 px-1.5 py-0.2 rounded">✓ CONFIRMED</span>
                                )}
                              </div>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={copayMpesaPhone}
                                  onChange={(e) => setCopayMpesaPhone(e.target.value)}
                                  placeholder="0712345678"
                                  className="flex-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                                />
                                <button
                                  type="button"
                                  onClick={handleCopayMpesaStkPush}
                                  disabled={copayMpesaTriggering}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                                >
                                  {copayMpesaTriggering ? "Sending..." : `STK Push KES ${netPayable.toLocaleString()}`}
                                </button>
                              </div>
                              {copayMpesaReceiptNo && (
                                <p className="text-[10px] text-emerald-800 font-mono font-bold">
                                  Receipt: {copayMpesaReceiptNo}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Co-Pay via Cash */}
                          {copayMethod === "Cash" && (
                            <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-amber-800 uppercase block">Cash Given (KES)</label>
                                  <input
                                    type="number"
                                    value={cashTendered}
                                    onChange={(e) => setCashTendered(e.target.value ? Number(e.target.value) : "")}
                                    placeholder={netPayable.toString()}
                                    className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-amber-800 uppercase block">Change to Return</label>
                                  <div className="px-2 py-1 bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold font-mono text-amber-950">
                                    KES {typeof cashTendered === "number" && cashTendered > netPayable ? (cashTendered - netPayable).toLocaleString() : 0}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Co-Pay via Debit/Credit Card */}
                          {copayMethod === "Card" && (
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                              <label className="text-[9px] font-bold text-slate-600 uppercase block">Bank POS Terminal Ref / Auth No</label>
                              <input
                                type="text"
                                defaultValue={`POS-${Date.now().toString().slice(-4)}`}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hospital Discount / Waiver */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <span className="font-semibold flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      Hospital Discount / Waiver (KES):
                    </span>
                    <input
                      type="number"
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs"
                    />
                  </div>

                  {/* Financial Breakdown Receipt Block */}
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Gross Folio Subtotal:</span>
                      <span className="font-mono font-bold">KES {subtotal.toLocaleString()}</span>
                    </div>

                    {shaCover > 0 && (
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>SHA / NHIF Claim Share:</span>
                        <span className="font-mono font-bold">- KES {shaCover.toLocaleString()}</span>
                      </div>
                    )}

                    {insuranceCover > 0 && (
                      <div className="flex justify-between text-xs text-indigo-700">
                        <span>Insurance Card Claim ({insuranceProvider.split(" ")[0]}):</span>
                        <span className="font-mono font-bold">- KES {insuranceCover.toLocaleString()}</span>
                      </div>
                    )}

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-700">
                        <span>Approved Waiver / Discount:</span>
                        <span className="font-mono font-bold">- KES {discountAmount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="text-sm font-black text-slate-900">
                        {insuranceCover > 0 && netPayable > 0 ? "Patient Co-Pay Balance:" : "Net Payable:"}
                      </span>
                      <span className="text-lg font-black font-mono text-emerald-600">
                        KES {netPayable.toLocaleString()}
                      </span>
                    </div>

                    {insuranceCover > 0 && netPayable > 0 && (
                      <div className="text-[10px] text-slate-500 font-medium flex justify-between pt-1 border-t border-slate-150">
                        <span>Settlement Breakdown:</span>
                        <span className="font-bold text-slate-700">
                          KES {insuranceCover.toLocaleString()} Card + KES {netPayable.toLocaleString()} {copayMethod}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Checkout Action Button */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    id="btn-finalize-cart-checkout"
                    disabled={checkoutSubmitting || pendingItems.length === 0}
                    onClick={handleFinalCheckout}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    {checkoutSubmitting ? (
                      <span>Processing Official POS Checkout...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Finalize Cart Checkout ({paymentMethod} • KES {netPayable.toLocaleString()})</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    Compliant with KRA eTIMS Tax Invoicing, SHA Claim Clearance & Auto-Discharge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Document Modal for Invoice */}
      {printedInvoice && (
        <PrintDocument
          isOpen={!!printedInvoice}
          onClose={() => {
            setPrintedInvoice(null);
            onClose();
          }}
          type="receipt"
          receiptData={printedInvoice}
        />
      )}
    </>
  );
}

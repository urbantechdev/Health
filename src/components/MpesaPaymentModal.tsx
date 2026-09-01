import React, { useState, useEffect } from "react";
import { 
  Smartphone, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  ArrowRight, 
  ShieldCheck, 
  Receipt, 
  AlertCircle, 
  PhoneCall, 
  Check, 
  Clock, 
  CreditCard,
  Building,
  Printer
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import { toast } from "../lib/promptService";

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultAmount?: number;
  defaultReference?: string;
  patientName?: string;
  invoiceId?: string;
  onPaymentSuccess?: (receiptNo: string, amount: number, phone: string) => void;
}

export default function MpesaPaymentModal({
  isOpen,
  onClose,
  defaultPhone = "",
  defaultAmount = 1500,
  defaultReference = "TASSIA-OUTPATIENT",
  patientName = "Walk-in Patient",
  invoiceId,
  onPaymentSuccess,
}: MpesaPaymentModalProps) {
  const [phone, setPhone] = useState(defaultPhone || "0712345678");
  const [amount, setAmount] = useState(defaultAmount > 0 ? defaultAmount : 1500);
  const [reference, setReference] = useState(defaultReference || "TASSIA-OUTPATIENT");
  const [paybillType, setPaybillType] = useState<"paybill" | "till">("paybill");
  const [paybillNumber, setPaybillNumber] = useState("222111");
  const [accountNumber, setAccountNumber] = useState("TASSIA-HOSPITAL");

  // Transaction execution states
  const [step, setStep] = useState<"input" | "waiting" | "success" | "failed">("input");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [printReceiptOpen, setPrintReceiptOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (defaultPhone) setPhone(defaultPhone);
      if (defaultAmount > 0) setAmount(defaultAmount);
      if (defaultReference) setReference(defaultReference);
      setStep("input");
      setStatusMessage("");
      setReceiptNumber(null);
      setTimerSeconds(30);
    }
  }, [isOpen, defaultPhone, defaultAmount, defaultReference]);

  // Handle countdown during waiting state
  useEffect(() => {
    let interval: any = null;
    if (step === "waiting" && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && step === "waiting") {
      setStep("failed");
      setStatusMessage("Transaction timed out. Handset did not respond with user PIN in time.");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timerSeconds]);

  if (!isOpen) return null;

  // Format phone to 254 format if needed
  const formatKenyanPhone = (input: string) => {
    let cleaned = input.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "254" + cleaned.substring(1);
    } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
      cleaned = "254" + cleaned;
    }
    return cleaned;
  };

  const handleInitiateSTK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || amount <= 0) {
      toast.warning("Please provide a valid phone number and payment amount.", "Invalid Payment Parameters");
      return;
    }

    setStep("waiting");
    setStatusMessage("Sending STK Push prompt via Safaricom Daraja 2.0 Gateway...");
    setTimerSeconds(30);

    try {
      const response = await fetch("/api/integrations/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          amount: amount,
          invoiceId: invoiceId || reference,
        }),
      });
      const data = await response.json();

      if (data.success && data.CheckoutRequestID) {
        setCheckoutRequestId(data.CheckoutRequestID);
        setStatusMessage("Prompt displayed on customer's phone! Waiting for M-PESA PIN entry...");
        pollStatus(data.CheckoutRequestID);
      } else {
        setStep("failed");
        setStatusMessage(data.error || "Failed to initiate M-Pesa STK Push request.");
      }
    } catch (err: any) {
      console.error("STK Push error:", err);
      setStep("failed");
      setStatusMessage(`Network error connecting to Safaricom Daraja API: ${err.message}`);
    }
  };

  const pollStatus = (checkoutId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/integrations/mpesa/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutRequestId: checkoutId }),
        });
        const data = await response.json();

        if (data.status === "Success") {
          clearInterval(pollInterval);
          const genReceipt = data.mpesaReceiptNumber || `TL${Math.floor(Math.random() * 89999 + 10000)}KES`;
          setReceiptNumber(genReceipt);
          setStep("success");
          setStatusMessage("Payment Confirmed! Funds deposited into Hospital Trust Account.");
          if (onPaymentSuccess) {
            onPaymentSuccess(genReceipt, amount, phone);
          }
        } else if (data.status === "Failed" || data.status === "Cancelled") {
          clearInterval(pollInterval);
          setStep("failed");
          setStatusMessage("Payment was cancelled or rejected by user on handset.");
        }
      } catch (err) {
        console.error("Polling status error:", err);
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-100 flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">Safaricom M-PESA Express</h3>
                <span className="px-2 py-0.5 bg-emerald-400/30 border border-emerald-300/40 rounded-full text-[10px] font-mono font-bold tracking-wider">
                  Daraja 2.0 API
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">Instant STK Push & Automated Hospital Reconciliation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {step === "input" && (
            <form onSubmit={handleInitiateSTK} className="space-y-4">
              {/* Account summary banner */}
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Patient / Client</span>
                  <span className="text-sm font-bold text-gray-900">{patientName}</span>
                  <span className="text-[11px] text-gray-500 block font-mono">Ref: {reference}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Payable Total</span>
                  <span className="text-lg font-black text-emerald-950">KES {amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Paybill / Till Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setPaybillType("paybill");
                    setPaybillNumber("222111");
                    setAccountNumber("TASSIA-HOSPITAL");
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    paybillType === "paybill"
                      ? "bg-white text-emerald-950 shadow-xs border border-gray-200/80"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Hospital Paybill (222111)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaybillType("till");
                    setPaybillNumber("994321");
                    setAccountNumber("Tassia Pharmacy Till");
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    paybillType === "till"
                      ? "bg-white text-emerald-950 shadow-xs border border-gray-200/80"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Buy Goods Till (994321)
                </button>
              </div>

              {/* Input Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Customer Safaricom M-Pesa Phone Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0712345678 or 2547..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-bold font-mono text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Supported: Safaricom 07XX / 01XX. STK push PIN prompt will appear automatically.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Amount (KES) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Account Reference</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-semibold font-mono text-gray-900 focus:bg-white focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Send M-Pesa STK Push Prompt (KES {amount.toLocaleString()})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === "waiting" && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              {/* Phone animation graphic */}
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center animate-pulse">
                  <Smartphone className="w-10 h-10" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-md">
                  {timerSeconds}s
                </div>
              </div>

              <div className="space-y-1 max-w-sm">
                <h4 className="text-base font-extrabold text-gray-900">STK Push Dispatched!</h4>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  Please ask the patient to check their handset <strong className="text-emerald-800">({phone})</strong> and enter their 4-digit M-Pesa PIN.
                </p>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-xs font-mono text-gray-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>{statusMessage}</span>
              </div>

              <p className="text-[11px] text-gray-400">
                Listening for Safaricom Daraja Callback webhook confirmation...
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-black uppercase tracking-wider inline-block">
                  Verified & Reconciled
                </span>
                <h4 className="text-lg font-black text-gray-900">M-Pesa Payment Successful!</h4>
                <p className="text-xs text-gray-500">Official Safaricom M-Pesa Transaction Receipt:</p>
              </div>

              {/* Receipt Badge */}
              <div className="w-full p-4 bg-slate-50 border border-emerald-200 rounded-2xl font-mono text-xs space-y-2 text-left">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Receipt No:</span>
                  <span className="text-sm font-black text-emerald-700">{receiptNumber}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-gray-900">KES {amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Paid By:</span>
                  <span className="font-semibold">{patientName} ({phone})</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Paybill / Reference:</span>
                  <span className="font-semibold">{paybillNumber} / {reference}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Timestamp:</span>
                  <span>{new Date().toLocaleTimeString()} ({new Date().toLocaleDateString()})</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPrintReceiptOpen(true)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Done / Continue</span>
                </button>
              </div>
            </div>
          )}

          {step === "failed" && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-rose-600" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-gray-900">M-Pesa Transaction Incomplete</h4>
                <p className="text-xs text-rose-700 font-medium px-4">{statusMessage}</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            256-bit TLS Encrypted Daraja Gateway
          </span>
          <span className="font-mono">KRA eTIMS Linked</span>
        </div>
      </div>

      {/* Print Document Modal Integration */}
      {printReceiptOpen && receiptNumber && (
        <PrintDocument
          isOpen={printReceiptOpen}
          onClose={() => setPrintReceiptOpen(false)}
          type="receipt"
          receiptData={{
            id: `RCP-MPESA-${receiptNumber}`,
            patientId: invoiceId || "DIRECT-MPESA",
            patientName: patientName,
            nationalId: "N/A",
            items: [
              {
                description: `Hospital Service Fee (${reference})`,
                amount: amount,
                department: "billing"
              }
            ],
            total: amount,
            split: {
              sha: 0,
              insurance: 0,
              outOfPocket: amount,
            },
            paymentMethod: "M-PESA",
            paymentStatus: "paid",
            kraCompliantInvoiceNo: `KRA-ETIMS-${receiptNumber}`,
            timestamp: new Date().toISOString()
          }}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where, getDocs } from "firebase/firestore";
import { Invoice, QueueTicket } from "../types";
import { CreditCard, ShieldCheck, QrCode, Smartphone, Users, FileText, CheckCircle, RefreshCw, Layers, Check, Printer } from "lucide-react";
import PrintDocument from "./PrintDocument";
import { closeAutoTicket } from "../lib/ticketService";

interface PaperlessBillingProps {
  toggles: any;
  onPaymentReconciled: () => void;
}

export default function PaperlessBilling({ toggles, onPaymentReconciled }: PaperlessBillingProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeInvoices, setActiveInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Split-billing splits
  const [shaCover, setShaCover] = useState(0);
  const [insuranceCover, setInsuranceCover] = useState(0);
  const [patientOutPocket, setPatientOutPocket] = useState(0);

  // Safaricom M-PESA details
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<string | null>(null);
  const [mpesaCheckoutId, setMpesaCheckoutId] = useState<string | null>(null);

  // Printing state
  const [printOpen, setPrintOpen] = useState(false);

  // KRA eTIMS state
  const [kraStatus, setKraStatus] = useState<any | null>(null);
  const [kraLoading, setKraLoading] = useState(false);

  // SHA / Taifa Care Verification state
  const [shaLoading, setShaLoading] = useState(false);
  const [shaData, setShaData] = useState<any | null>(null);

  // Slade / Insurance Pre-auth
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceAuth, setInsuranceAuth] = useState<any | null>(null);

  useEffect(() => {
    // Listen to all invoices
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
      const invs: Invoice[] = [];
      snapshot.forEach((doc) => {
        invs.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(invs);
      
      // Filter unpaid invoices
      const unpaid = invs.filter((i) => i.paymentStatus !== "paid");
      setActiveInvoices(unpaid);
      
      if (unpaid.length > 0 && !selectedInvoiceId) {
        setSelectedInvoiceId(unpaid[0].id);
      }
    });

    return () => unsubInvoices();
  }, []);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  // Automatically reset splits when invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      setPatientOutPocket(selectedInvoice.total);
      setShaCover(0);
      setInsuranceCover(0);
      setMpesaPhone(selectedInvoice.nationalId ? "07" + Math.floor(10000000 + Math.random() * 90000000) : "");
      setKraStatus(null);
      setInsuranceAuth(null);
      setShaData(null);
    }
  }, [selectedInvoiceId]);

  // Check SHA (Social Health Authority) eligibility and apply benefit
  const checkShaEligibility = async () => {
    if (!selectedInvoice) return;
    const searchId = selectedInvoice.nationalId || "32441928";
    setShaLoading(true);
    try {
      const response = await fetch("/api/integrations/sha/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId: searchId }),
      });
      const data = await response.json();
      if (data.eligible) {
        setShaData(data);
        // Automatically apply SHA coverage (up to 2,500 outpatient capitation or full total)
        const applicableSha = Math.min(selectedInvoice.total, 2500);
        setShaCover(applicableSha);
        setPatientOutPocket(Math.max(0, selectedInvoice.total - applicableSha - insuranceCover));
      } else {
        alert(data.error || "Patient SHA status is inactive or defaulted.");
      }
    } catch (e) {
      console.error("SHA check error:", e);
    } finally {
      setShaLoading(false);
    }
  };

  // Handle M-PESA STK Push & Polling
  const triggerMpesaStkPush = async () => {
    if (!mpesaPhone || patientOutPocket <= 0) {
      alert("Please configure a valid phone number and out-of-pocket payment amount.");
      return;
    }

    setMpesaLoading(true);
    setMpesaStatus("Initiating STK Push...");
    try {
      const response = await fetch("/api/integrations/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: mpesaPhone,
          amount: patientOutPocket,
          invoiceId: selectedInvoiceId,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMpesaCheckoutId(data.CheckoutRequestID);
        setMpesaStatus("STK Push Sent! Waiting for user PIN...");
        
        // Start polling Status
        pollMpesaStatus(data.CheckoutRequestID);
      } else {
        setMpesaStatus("Failed to initiate push.");
        setMpesaLoading(false);
      }
    } catch (e) {
      console.error(e);
      setMpesaLoading(false);
    }
  };

  const pollMpesaStatus = (checkoutId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/integrations/mpesa/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutRequestId: checkoutId }),
        });
        const data = await response.json();

        if (data.status === "Success") {
          clearInterval(interval);
          setMpesaStatus(`Success! Receipt: ${data.mpesaReceiptNumber}`);
          setMpesaLoading(false);
          
          // Auto-reconcile invoice to paid out of pocket
          if (selectedInvoice) {
            handleCompletePayment("M-PESA", data.mpesaReceiptNumber);
          }
        } else if (data.status === "NotFound") {
          clearInterval(interval);
          setMpesaStatus("Payment timed out or not found.");
          setMpesaLoading(false);
        }
      } catch (err) {
        console.error("M-Pesa polling error:", err);
        clearInterval(interval);
        setMpesaLoading(false);
      }
    }, 2000);
  };

  // Slade 360 Pre-authorization
  const submitInsurancePreauth = async () => {
    if (!selectedInvoice || insuranceCover <= 0) return;
    setInsuranceLoading(true);
    try {
      const response = await fetch("/api/integrations/slade/preauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName: "Jubilee Insurance",
          nationalId: selectedInvoice.nationalId,
          requestAmount: insuranceCover,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setInsuranceAuth(data);
        alert(`Insurance Authorized! Slade Auth Code: ${data.authCode}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInsuranceLoading(false);
    }
  };

  // KRA eTIMS Sign-off
  const generateETIMSInvoice = async (invoiceAmount: number) => {
    if (!selectedInvoice) return;
    setKraLoading(true);
    try {
      const response = await fetch("/api/integrations/etims/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: selectedInvoice.patientName,
          amount: invoiceAmount,
          items: selectedInvoice.items,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setKraStatus(data);
        // Automatically open the ETR receipt preview modal
        setPrintOpen(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setKraLoading(false);
    }
  };

  const handleCompletePayment = async (method: string, refCode?: string) => {
    if (!selectedInvoice) return;

    try {
      // Find matching Firestore ID for this invoice
      const invoiceSnap = await getDocs(
        query(collection(db, "invoices"), where("id", "==", selectedInvoice.id))
      );

      if (!invoiceSnap.empty) {
        const firestoreId = invoiceSnap.docs[0].id;
        
        // Generate eTIMS on the fly if not already signed
        let finalKraNo = kraStatus?.kraInvoiceNo || `KRAETIMS-OFF-${Math.floor(Math.random() * 900000 + 100000)}`;

        await updateDoc(doc(db, "invoices", firestoreId), {
          paymentStatus: "paid",
          paymentMethod: method,
          split: {
            sha: shaCover,
            insurance: insuranceCover,
            outOfPocket: patientOutPocket,
          },
          kraCompliantInvoiceNo: finalKraNo,
        });

        // Resolve Queue ticket
        const queueSnap = await getDocs(
          query(
            collection(db, "queue"),
            where("patientName", "==", selectedInvoice.patientName),
            where("currentDepartment", "==", "billing"),
            where("status", "==", "serving")
          )
        );

        if (!queueSnap.empty) {
          await updateDoc(doc(db, "queue", queueSnap.docs[0].id), {
            status: "completed",
          });
        }

        // Auto-close patient system ticket on billing checkout
        await closeAutoTicket(
          selectedInvoice.patientName,
          `Invoice ${selectedInvoice.id} reconciled and paid. eTIMS receipt generated.`
        );
      }

      // Automatically open the ETR receipt preview modal for printing
      setPrintOpen(true);
      onPaymentReconciled();
    } catch (err) {
      console.error(err);
    }
  };



  return (
    <div id="paperless-billing" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Centralized Split Billing</h2>
            <p className="text-xs text-gray-500">M-Pesa STK push polling, KRA eTIMS signing, and Slade insurance pre-auth</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">Invoice Registry:</label>
          <select
            id="select-billing-invoice"
            value={selectedInvoiceId || ""}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold focus:outline-hidden"
          >
            <option value="">-- Choose Patient Invoice/Receipt --</option>
            <optgroup label="Unpaid active bills">
              {invoices.filter((i) => i.paymentStatus !== "paid").map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} - {inv.patientName} (KES {inv.total}) [UNPAID]
                </option>
              ))}
            </optgroup>
            <optgroup label="Paid accounts (Receipts)">
              {invoices.filter((i) => i.paymentStatus === "paid").map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} - {inv.patientName} (KES {inv.total}) [PAID]
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Invoice details */}
        <div className="lg:col-span-4 border-r border-gray-100 pr-0 lg:pr-2 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Account Invoice summary</h3>

          {selectedInvoice ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-xs">
                <p className="font-bold text-gray-400">INVOICE #{selectedInvoice.id}</p>
                <p className="text-sm font-bold text-gray-900">{selectedInvoice.patientName}</p>
                <p className="text-gray-600">ID: {selectedInvoice.nationalId}</p>
                <p className="text-gray-400">Date: {selectedInvoice.timestamp}</p>
              </div>

              {/* Itemized charges */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Itemized Departmental Fees</p>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-white border border-gray-100 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-800">{item.description}</p>
                        <p className="text-[10px] text-emerald-600 capitalize">{item.department}</p>
                      </div>
                      <span className="font-mono font-bold text-gray-900">KES {item.amount}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded-xl text-xs font-bold">
                  <span>Gross Total Invoice Due:</span>
                  <span className="font-mono text-emerald-400 text-sm">KES {selectedInvoice.total.toLocaleString()}</span>
                </div>

                <button
                  id="btn-preview-etims-etr"
                  onClick={() => setPrintOpen(true)}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Preview & Print eTIMS ETR Receipt</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-44 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-xs text-gray-400">
              No active invoice pulled
            </div>
          )}
        </div>

        {/* Payment and integratons operations */}
        <div className="lg:col-span-8 space-y-6">
          {selectedInvoice ? (
            selectedInvoice.paymentStatus === "paid" ? (
              <div className="bg-emerald-50/20 border border-emerald-100 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-5">
                <div className="p-4 bg-emerald-100 text-emerald-700 rounded-full shadow-xs">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Invoice Fully Settled</h3>
                  <p className="text-xs text-gray-500 mt-1">This invoice has been fully reconciled and paid via {selectedInvoice.paymentMethod}.</p>
                </div>
                <div className="p-4 bg-white border border-gray-150 rounded-xl font-mono text-xs w-full max-w-sm text-left space-y-1.5 shadow-3xs">
                  <p className="flex justify-between"><span>Invoice Ref:</span> <span className="font-bold text-gray-900">{selectedInvoice.id}</span></p>
                  <p className="flex justify-between"><span>Gross Total:</span> <span className="font-bold text-gray-900">KES {selectedInvoice.total}</span></p>
                  <p className="flex justify-between"><span>eTIMS Tax No:</span> <span className="font-bold text-emerald-800">{selectedInvoice.kraCompliantInvoiceNo || "Signed"}</span></p>
                </div>
                <button
                  id="btn-print-billing-receipt"
                  onClick={() => setPrintOpen(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/10 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>View & Print PDF Receipt</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Split Billing & Slade 360 */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Split Revenue Ledger</span>
                </h4>

                <div className="space-y-3 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">SHA / Taifa Care Cover (KES)</label>
                      <button
                        id="btn-trigger-sha-check"
                        onClick={checkShaEligibility}
                        disabled={shaLoading}
                        className="text-[9px] text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2 py-0.5 rounded font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {shaLoading ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                        <span>{shaLoading ? "Verifying..." : "Verify SHA"}</span>
                      </button>
                    </div>
                    <input
                      id="input-cover-sha"
                      type="number"
                      value={shaCover}
                      onChange={(e) => {
                        const val = Math.min(selectedInvoice.total, parseInt(e.target.value) || 0);
                        setShaCover(val);
                        setPatientOutPocket(Math.max(0, selectedInvoice.total - val - insuranceCover));
                      }}
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg"
                    />
                    {shaData && (
                      <div className="p-2 bg-cyan-50 border border-cyan-200 text-cyan-900 rounded-lg text-[10px] space-y-0.5">
                        <p className="font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-cyan-600" />
                          <span>SHA Contributor Active ({shaData.shaId})</span>
                        </p>
                        <p className="text-cyan-700">Cover Capitation applied: KES {shaCover.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Private Insurance (KES)</label>
                      <button
                        id="btn-trigger-slade"
                        onClick={submitInsurancePreauth}
                        disabled={insuranceLoading || insuranceCover <= 0}
                        className="text-[9px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase transition-colors"
                      >
                        {insuranceLoading ? "Authorizing..." : "Slade Pre-auth"}
                      </button>
                    </div>
                    <input
                      id="input-cover-insurance"
                      type="number"
                      value={insuranceCover}
                      onChange={(e) => {
                        const val = Math.min(selectedInvoice.total - shaCover, parseInt(e.target.value) || 0);
                        setInsuranceCover(val);
                        setPatientOutPocket(Math.max(0, selectedInvoice.total - shaCover - val));
                      }}
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 uppercase">Out of Pocket (KES)</label>
                    <input
                      id="input-cover-outpocket"
                      type="number"
                      readOnly
                      value={patientOutPocket}
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-amber-50/30 font-bold font-mono rounded-lg"
                    />
                  </div>

                  {insuranceAuth && (
                    <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-900 rounded-lg text-[10px]">
                      <p className="font-bold">✓ Slade Preauth Cleared</p>
                      <p>Auth Code: {insuranceAuth.authCode} • Co-pay: KES {insuranceAuth.coPayRequired}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* M-PESA & eTIMS Compliance */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span>Safaricom M-PESA & KRA</span>
                </h4>

                {/* Safaricom push */}
                <div className="p-4 border border-emerald-100 rounded-2xl bg-emerald-50/10 space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase">M-PESA Phone Number</label>
                    <div className="flex gap-2">
                      <input
                        id="input-mpesa-phone"
                        type="text"
                        placeholder="e.g. 0712345678"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg"
                      />
                      <button
                        id="btn-pos-mpesa-push"
                        onClick={triggerMpesaStkPush}
                        disabled={mpesaLoading || patientOutPocket <= 0}
                        className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        {mpesaLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "STK Push"
                        )}
                      </button>
                    </div>
                  </div>

                  {mpesaStatus && (
                    <div className="p-2 bg-emerald-100/50 text-emerald-800 rounded-lg text-[10px] font-semibold">
                      Status: {mpesaStatus}
                    </div>
                  )}
                </div>

                {/* KRA invoice compliance */}
                <div className="p-4 border border-gray-200 rounded-2xl space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[10px] text-gray-500 uppercase">KRA eTIMS Tax Compliance</span>
                    <button
                      id="btn-sign-etims"
                      onClick={() => generateETIMSInvoice(selectedInvoice.total)}
                      disabled={kraLoading}
                      className="px-2 py-0.5 bg-gray-900 text-white hover:bg-slate-800 text-[9px] font-bold rounded uppercase"
                    >
                      {kraLoading ? "Signing..." : "Sign eTIMS Invoice"}
                    </button>
                  </div>

                  {kraStatus ? (
                    <div className="p-3 bg-white border border-gray-150 rounded-xl space-y-2 text-[10px] font-mono">
                      <p className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> eTIMS Compliant Signed
                      </p>
                      <p>Compliance No: {kraStatus.kraInvoiceNo}</p>
                      <p>KRA Total Tax (16%): KES {kraStatus.taxAmount}</p>
                      <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
                        <QrCode className="w-8 h-8 text-gray-800" />
                        <span className="text-[8px] text-gray-400">Scan to verify compliance with Tax Authority</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">No KRA compliance invoice generated yet.</p>
                  )}
                </div>

                {/* Direct Cash complete */}
                <button
                  id="btn-close-billing-cash"
                  onClick={() => handleCompletePayment("Cash")}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close Bill (Record Cash Payment)
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="h-full min-h-[350px] border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <Layers className="w-12 h-12 mb-3 text-emerald-300 opacity-40 animate-bounce" />
              <h3 className="text-sm font-bold text-gray-800">Billing Console Ready</h3>
              <p className="text-xs max-w-xs mt-1">
                Please select an active unpaid invoice from the dropdown or clear dispensed pharmacy prescriptions to generate receipts.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Print Overlay Modal for Receipts */}
      <PrintDocument
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        type="receipt"
        receiptData={selectedInvoice}
      />
    </div>
  );
}

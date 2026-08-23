import React, { useState } from "react";
import { ChatTicketAttachment, SystemRole } from "../types";
import { db } from "../lib/firebase";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  Receipt,
  FileText,
  ArrowRightLeft,
  FlaskRound,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  CreditCard,
  Printer,
  ChevronRight,
  User,
  Activity,
  DollarSign,
  Sparkles,
  Check,
  XCircle,
  PauseCircle,
  ExternalLink,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import { toast } from "../lib/promptService";

interface ChatTicketEmbedProps {
  messageId: string;
  ticket: ChatTicketAttachment;
  currentUser: {
    name: string;
    email: string;
    role: SystemRole | string;
  };
  onOpenPatientTicket?: (ticketNo: string) => void;
  onOpenPatientJourney?: () => void;
  onTriggerMpesa?: (amount: number, phone: string, invoiceNo: string) => void;
}

export default function ChatTicketEmbed({
  messageId,
  ticket,
  currentUser,
  onOpenPatientTicket,
  onOpenPatientJourney,
  onTriggerMpesa
}: ChatTicketEmbedProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const formatKES = (amt?: number) => {
    return `KES ${(amt || 0).toLocaleString("en-KE")}`;
  };

  // Helper to update ticket status in Firebase
  const updateTicketStatus = async (
    newStatus: ChatTicketAttachment["status"],
    notes?: string,
    additionalUpdates: Partial<ChatTicketAttachment> = {}
  ) => {
    setIsUpdating(true);
    try {
      const updatedTicket: ChatTicketAttachment = {
        ...ticket,
        status: newStatus,
        statusUpdatedBy: `${currentUser.name} (${currentUser.role})`,
        statusUpdatedAt: new Date().toISOString(),
        actionNotes: notes || ticket.actionNotes,
        ...additionalUpdates
      };

      // 1. Update the internal message's ticketAttachment
      await updateDoc(doc(db, "internal_messages", messageId), {
        ticketAttachment: updatedTicket
      });

      // 2. If it is linked to a patient_transfers document, update it as well
      if (ticket.linkedTransferDocId) {
        try {
          await updateDoc(doc(db, "patient_transfers", ticket.linkedTransferDocId), {
            status: newStatus === "accepted" ? "accepted" : newStatus === "declined" ? "declined" : newStatus === "on_hold" ? "on_hold" : "pending",
            actionBy: currentUser.name,
            actionByRole: currentUser.role,
            actionTimestamp: new Date().toISOString(),
            actionNotes: notes || ""
          });
        } catch (err) {
          console.warn("Could not sync with linkedTransferDocId:", err);
        }
      }

      // 3. If converting Pre-Quote to Invoice, also save an official invoice or notify
      if (newStatus === "invoiced") {
        toast.success(
          `Pre-Quote ${ticket.ticketNo} converted to Live Invoice #${ticket.ticketNo.replace("QUO", "INV")} and routed to Billing`,
          "Invoice Generated"
        );
      } else if (newStatus === "paid") {
        toast.success(`Invoice ${ticket.ticketNo} marked as PAID by ${currentUser.name}`, "Payment Recorded");
      } else if (newStatus === "accepted") {
        toast.success(`Ticket ${ticket.ticketNo} Accepted by ${currentUser.name}`, "Transfer Accepted");
      } else {
        toast.info(`Ticket ${ticket.ticketNo} updated to ${newStatus.toUpperCase()}`);
      }
    } catch (error: any) {
      console.error("Error updating ticket status:", error);
      toast.error("Failed to update ticket status in real-time database.", "Update Error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Convert Pre-Quote into an Invoice
  const handleConvertPreQuoteToInvoice = async () => {
    const invNo = ticket.ticketNo.replace("QUO", "INV");
    await updateTicketStatus("invoiced", "Converted from Pre-Quote Estimate into Active Billing Invoice", {
      type: "invoice",
      title: `Patient Invoice: ${ticket.patientName || "Client"}`,
      ticketNo: invNo,
      paymentStatus: "unpaid"
    });
  };

  // Print slip
  const handlePrintSlip = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print ticket.");
      return;
    }

    const itemsHtml = (ticket.items || [])
      .map(
        (it, idx) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">${idx + 1}. ${it.description}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px;">${it.quantity}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 12px;">KES ${it.unitPrice.toLocaleString()}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 12px;">KES ${it.amount.toLocaleString()}</td>
      </tr>
    `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${ticket.title} - ${ticket.ticketNo}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #0f172a; line-height: 1.4; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; background: #e2e8f0; }
            .section { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 12px; border-bottom: 2px solid #cbd5e1; }
            .total-box { margin-top: 16px; text-align: right; font-size: 14px; }
            .footer { margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 style="margin: 0; font-size: 18px; color: #047857;">NEXTGEN HOSPITAL HMIS</h2>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Official Clinical & Financial Transfer Slip</p>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: #047857; color: white;">${ticket.type.toUpperCase().replace("_", " ")}</span>
              <p style="margin: 4px 0 0 0; font-family: monospace; font-weight: bold; font-size: 14px;">${ticket.ticketNo}</p>
            </div>
          </div>

          <div class="section">
            <table style="width: 100%; border: none;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding: 4px 0;">
                  <strong>Patient:</strong> ${ticket.patientName || "N/A"}<br/>
                  <strong>National ID / SHA:</strong> ${ticket.nationalId || "N/A"}<br/>
                  <strong>Age / Gender:</strong> ${ticket.patientAge || "N/A"} / ${ticket.patientGender || "N/A"}
                </td>
                <td style="width: 50%; vertical-align: top; padding: 4px 0; text-align: right;">
                  <strong>From:</strong> ${ticket.fromDepartment || "Clinical"} (${ticket.fromRole || "Staff"})<br/>
                  <strong>To:</strong> ${ticket.toDepartment || ticket.toRole || "Billing & Accounts"}<br/>
                  <strong>Date:</strong> ${new Date(ticket.createdAt).toLocaleString()}
                </td>
              </tr>
            </table>
          </div>

          ${
            ticket.items && ticket.items.length > 0
              ? `
            <div class="section">
              <table>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              <div class="total-box">
                <p style="margin: 4px 0;">Subtotal: <strong>KES ${(ticket.subtotal || 0).toLocaleString()}</strong></p>
                <p style="margin: 4px 0; font-size: 16px; color: #047857;">Grand Total: <strong>KES ${(ticket.totalAmount || 0).toLocaleString()}</strong></p>
                ${ticket.paymentStatus ? `<p style="margin: 4px 0; font-size: 11px;">Payment Status: <strong>${ticket.paymentStatus.toUpperCase()}</strong></p>` : ""}
              </div>
            </div>
          `
              : ""
          }

          ${
            ticket.clinicalNotes || ticket.provisionalDiagnosis
              ? `
            <div class="section" style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <strong>Provisional Diagnosis / Symptoms:</strong> ${ticket.provisionalDiagnosis || ticket.symptoms || "N/A"}<br/>
              <strong>Handover Clinical Notes:</strong> ${ticket.clinicalNotes || "N/A"}<br/>
              ${
                ticket.vitals
                  ? `<strong>Vitals:</strong> BP: ${ticket.vitals.bp || "-"} | Temp: ${ticket.vitals.temp || "-"}°C | Pulse: ${ticket.vitals.pulse || "-"} bpm | Wt: ${ticket.vitals.weight || "-"} kg`
                  : ""
              }
            </div>
          `
              : ""
          }

          <div class="footer">
            <p>Generated by NextGen HMIS Internal Clinical Communications Hub • Authorized by ${ticket.createdBy} (${ticket.createdRole})</p>
            <p>Hospital Registry Reference: ${ticket.ticketNo} • Keep this slip for billing and verification</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Visual Theme Setup
  const isInvoice = ticket.type === "invoice";
  const isPreQuote = ticket.type === "pre_quote";
  const isTransfer = ticket.type === "patient_transfer";
  const isOrder = ticket.type === "service_order" || ticket.type === "clinical_handover";

  const getStatusBadge = () => {
    switch (ticket.status) {
      case "paid":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-white flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> PAID
          </span>
        );
      case "invoiced":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white flex items-center gap-1">
            <Receipt className="w-3 h-3" /> INVOICED
          </span>
        );
      case "accepted":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white flex items-center gap-1">
            <Check className="w-3 h-3" /> ACCEPTED
          </span>
        );
      case "on_hold":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950 flex items-center gap-1">
            <PauseCircle className="w-3 h-3" /> ON HOLD
          </span>
        );
      case "declined":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1">
            <XCircle className="w-3 h-3" /> DECLINED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" /> PENDING
          </span>
        );
    }
  };

  return (
    <div
      id={`chat-ticket-${ticket.ticketNo}`}
      className={`mt-3 rounded-2xl border transition-all overflow-hidden ${
        isInvoice
          ? "bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border-emerald-300 text-slate-900 shadow-sm"
          : isPreQuote
            ? "bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border-blue-300 text-slate-900 shadow-sm"
            : isTransfer
              ? ticket.urgency === "STAT Emergency"
                ? "bg-red-50/95 border-2 border-red-400 text-red-950 shadow-sm"
                : "bg-gradient-to-br from-cyan-50/90 to-sky-50/70 border-cyan-300 text-slate-900 shadow-sm"
              : "bg-slate-50 border-slate-300 text-slate-900 shadow-sm"
      }`}
    >
      {/* Top Banner */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between border-b ${
          isInvoice
            ? "bg-emerald-700 text-white border-emerald-800"
            : isPreQuote
              ? "bg-blue-800 text-white border-blue-900"
              : isTransfer
                ? ticket.urgency === "STAT Emergency"
                  ? "bg-red-700 text-white border-red-800"
                  : "bg-cyan-800 text-white border-cyan-900"
                : "bg-slate-800 text-white border-slate-900"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-white/10 shrink-0">
            {isInvoice ? (
              <Receipt className="w-4 h-4" />
            ) : isPreQuote ? (
              <FileText className="w-4 h-4" />
            ) : isTransfer ? (
              <ArrowRightLeft className="w-4 h-4" />
            ) : (
              <FlaskRound className="w-4 h-4" />
            )}
          </div>
          <div className="truncate">
            <span className="text-[10px] uppercase font-black tracking-wider opacity-80 block">
              {isInvoice
                ? "PATIENT INVOICE TICKET"
                : isPreQuote
                  ? "PRE-QUOTE ESTIMATE TICKET"
                  : isTransfer
                    ? "PATIENT TRANSFER / REFERRAL"
                    : "SERVICE ORDER TICKET"}
            </span>
            <span className="font-mono font-black text-xs tracking-tight">{ticket.ticketNo}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge()}
          <button
            type="button"
            onClick={handlePrintSlip}
            title="Print Official Slip"
            className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 space-y-3">
        {/* Patient Summary Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700 uppercase shrink-0">
              {ticket.patientName ? ticket.patientName.slice(0, 2) : "PT"}
            </div>
            <div className="truncate">
              <p className="font-extrabold text-slate-900 truncate">{ticket.patientName || "Walk-In Client"}</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {ticket.nationalId ? `ID: ${ticket.nationalId}` : "No ID on file"}
                {ticket.patientAge ? ` • ${ticket.patientAge} Yrs` : ""}
                {ticket.patientGender ? ` • ${ticket.patientGender}` : ""}
              </p>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-600">
            <p>
              Target: <strong className="text-slate-900 font-bold">{ticket.toDepartment || ticket.toRole || "Billing Desk"}</strong>
            </p>
            <p className="text-[10px] text-slate-500">
              Raised by {ticket.createdBy} ({ticket.createdRole})
            </p>
          </div>
        </div>

        {/* Financial Line Items Table (For Invoices & Pre-Quotes) */}
        {ticket.items && ticket.items.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1">
              <span>Itemized Breakdown ({ticket.items.length} items)</span>
              <span>Amount (KES)</span>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
              {ticket.items.map((it, idx) => (
                <div key={it.id || idx} className="p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{it.description}</p>
                    <p className="text-[10px] text-slate-400">
                      Qty: {it.quantity} @ {formatKES(it.unitPrice)}
                      {it.department ? ` • ${it.department}` : ""}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">{formatKES(it.amount)}</span>
                </div>
              ))}

              {/* Total Row */}
              <div className="p-2.5 bg-slate-100/80 flex items-center justify-between font-extrabold text-xs">
                <span className="text-slate-700">{isPreQuote ? "Total Estimated Cost:" : "Grand Total Payable:"}</span>
                <span className={`text-sm ${isInvoice ? "text-emerald-700 font-black" : "text-blue-800 font-black"}`}>
                  {formatKES(ticket.totalAmount || ticket.subtotal)}
                </span>
              </div>
            </div>

            {/* Pre-Quote specific details */}
            {isPreQuote && (
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                <span>Validity: <strong className="text-slate-700">{ticket.validUntil || "14 Days"}</strong></span>
                {ticket.depositRequired ? (
                  <span>Deposit Req: <strong className="text-blue-700">{formatKES(ticket.depositRequired)}</strong></span>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Clinical Summary & Vitals (For Transfers & Referrals) */}
        {(ticket.clinicalNotes || ticket.provisionalDiagnosis || ticket.symptoms || ticket.vitals) && (
          <div className="bg-white/80 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
            {ticket.provisionalDiagnosis && (
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Provisional Diagnosis</span>
                <p className="font-bold text-slate-800">{ticket.provisionalDiagnosis}</p>
              </div>
            )}

            {ticket.symptoms && (
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Presenting Symptoms / Reason</span>
                <p className="text-slate-700">{ticket.symptoms}</p>
              </div>
            )}

            {ticket.clinicalNotes && (
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Handover Notes</span>
                <p className="text-slate-700 whitespace-pre-wrap">{ticket.clinicalNotes}</p>
              </div>
            )}

            {ticket.vitals && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                {ticket.vitals.bp && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-mono text-[10px] font-bold border border-blue-200">
                    BP: {ticket.vitals.bp}
                  </span>
                )}
                {ticket.vitals.temp && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-mono text-[10px] font-bold border border-amber-200">
                    Temp: {ticket.vitals.temp}°C
                  </span>
                )}
                {ticket.vitals.pulse && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-mono text-[10px] font-bold border border-rose-200">
                    Pulse: {ticket.vitals.pulse} bpm
                  </span>
                )}
                {ticket.vitals.weight && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold border border-emerald-200">
                    Wt: {ticket.vitals.weight} kg
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Notes (if rejected or put on hold) */}
        {ticket.actionNotes && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <span className="font-bold block">Status Note:</span>
            <p>{ticket.actionNotes}</p>
            {ticket.statusUpdatedBy && (
              <p className="text-[10px] text-amber-700 mt-1">Updated by {ticket.statusUpdatedBy}</p>
            )}
          </div>
        )}

        {/* Interactive Action Control Toolbar */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
          {/* Invoice Actions */}
          {isInvoice && ticket.status !== "paid" && (
            <>
              <button
                type="button"
                id={`btn-pay-invoice-${ticket.ticketNo}`}
                disabled={isUpdating}
                onClick={() => {
                  if (onTriggerMpesa && ticket.totalAmount) {
                    onTriggerMpesa(ticket.totalAmount, ticket.mpesaPhone || "", ticket.ticketNo);
                  }
                  updateTicketStatus("paid", `Paid via Safaricom M-Pesa / Cashier POS`);
                }}
                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Mark Paid / Process POS ({formatKES(ticket.totalAmount)})</span>
              </button>

              {ticket.status === "pending" && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updateTicketStatus("accepted", "Invoice accepted and assigned to cashier desk")}
                  className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Accept Bill
                </button>
              )}
            </>
          )}

          {/* Pre-Quote Actions */}
          {isPreQuote && ticket.status !== "invoiced" && ticket.status !== "paid" && (
            <>
              <button
                type="button"
                id={`btn-convert-quote-${ticket.ticketNo}`}
                disabled={isUpdating}
                onClick={handleConvertPreQuoteToInvoice}
                className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convert to Active Invoice ({formatKES(ticket.totalAmount)})</span>
              </button>

              <button
                type="button"
                disabled={isUpdating}
                onClick={() => updateTicketStatus("accepted", "Pre-quote estimate approved by patient / insurance")}
                className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Approve Quote
              </button>
            </>
          )}

          {/* Patient Transfer Actions */}
          {isTransfer && ticket.status === "pending" && (
            <>
              <button
                type="button"
                id={`btn-accept-transfer-${ticket.ticketNo}`}
                disabled={isUpdating}
                onClick={() => updateTicketStatus("accepted", `Transfer accepted into ${currentUser.role} unit`)}
                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHoldModal(true)}
                className="py-1.5 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hold
              </button>

              <button
                type="button"
                onClick={() => setShowDeclineModal(true)}
                className="py-1.5 px-2.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Decline
              </button>
            </>
          )}

          {/* Open Linked Patient Case / Journey */}
          {ticket.patientName && onOpenPatientJourney && (
            <button
              type="button"
              onClick={onOpenPatientJourney}
              className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Journey</span>
            </button>
          )}
        </div>
      </div>

      {/* Hold Reason Modal */}
      {showHoldModal && (
        <div className="p-3 bg-amber-50 border-t border-amber-200 text-xs space-y-2">
          <p className="font-bold text-amber-900">Specify reason for placing transfer on hold (e.g. bed cleaning, awaiting doctor):</p>
          <input
            type="text"
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            placeholder="Reason for hold..."
            className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowHoldModal(false)}
              className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-md font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowHoldModal(false);
                updateTicketStatus("on_hold", holdReason || "Placed on hold pending unit clearance");
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-xs"
            >
              Confirm Hold
            </button>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="p-3 bg-rose-50 border-t border-rose-200 text-xs space-y-2">
          <p className="font-bold text-rose-900">Specify reason for declining transfer (e.g. ICU full, specialist unavailable):</p>
          <input
            type="text"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason for decline..."
            className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeclineModal(false)}
              className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-md font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDeclineModal(false);
                updateTicketStatus("declined", declineReason || "Declined by receiving unit");
              }}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold text-xs"
            >
              Confirm Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

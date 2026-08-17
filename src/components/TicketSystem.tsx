import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { SystemTicket } from "../types";
import { closeAutoTicketById, deleteTicketById, deleteMultipleTicketsById } from "../lib/ticketService";
import { 
  Ticket, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Plus, 
  User, 
  Phone, 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  X, 
  MessageSquare, 
  Activity,
  ArrowRight,
  Check,
  CheckSquare,
  Edit3,
  Pencil,
  FileEdit,
  ExternalLink,
  ChevronRight,
  BadgeAlert,
  ShieldAlert,
  HelpCircle,
  Copy,
  Trash2,
  Trash,
  AlertTriangle
} from "lucide-react";

export default function TicketSystem() {
  const [tickets, setTickets] = useState<SystemTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "closed">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "auto" | "manual">("all");

  // New Ticket Modal State
  const [showModal, setShowModal] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("reception");
  const [visitReason, setVisitReason] = useState("Outpatient Clinical Consultation");
  const [priority, setPriority] = useState<"Normal" | "Urgent" | "Emergency">("Normal");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Edit Ticket Modal State
  const [editingTicket, setEditingTicket] = useState<SystemTicket | null>(null);
  const [editPatientName, setEditPatientName] = useState("");
  const [editNationalId, setEditNationalId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("reception");
  const [editVisitReason, setEditVisitReason] = useState("");
  const [editPriority, setEditPriority] = useState<"Normal" | "Urgent" | "Emergency">("Normal");
  const [editStatus, setEditStatus] = useState<"open" | "in_progress" | "closed" | "cancelled">("open");
  const [editResolutionNotes, setEditResolutionNotes] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Close Resolution Modal State
  const [resolvingTicket, setResolvingTicket] = useState<SystemTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // Duplicate Rejection Alert Modal State
  const [duplicateRejection, setDuplicateRejection] = useState<{
    show: boolean;
    nationalId: string;
    patientName: string;
    existingTicket: SystemTicket;
    context: "create" | "edit";
  } | null>(null);

  // Success Prompt State
  const [successPrompt, setSuccessPrompt] = useState<{
    show: boolean;
    title: string;
    message: string;
    ticketNumber?: string;
    patientName?: string;
    department?: string;
    priority?: string;
    type: "create" | "edit" | "close";
  } | null>(null);
  const [copiedTicketNo, setCopiedTicketNo] = useState(false);

  // Auto-dismiss success prompt after 6 seconds
  useEffect(() => {
    if (successPrompt?.show) {
      const timer = setTimeout(() => {
        setSuccessPrompt(null);
        setCopiedTicketNo(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [successPrompt]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "system_tickets"), (snapshot) => {
      const docs: SystemTicket[] = [];
      snapshot.forEach((d) => {
        docs.push({ id: d.id, ...d.data() } as SystemTicket);
      });
      // Sort newest first
      docs.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
      setTickets(docs);
    });

    return () => unsub();
  }, []);

  // Helper to find existing active ticket for given National ID
  const findActiveDuplicate = (idToCheck: string, excludeTicketId?: string) => {
    const cleanId = idToCheck.trim().toLowerCase();
    if (!cleanId) return null;
    return tickets.find(
      (t) =>
        t.nationalId.trim().toLowerCase() === cleanId &&
        (t.status === "open" || t.status === "in_progress") &&
        (!excludeTicketId || t.id !== excludeTicketId)
    );
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !nationalId) return;

    const trimmedId = nationalId.trim();

    // 1. Anti-Duplication Check: Reject if patient already holds an active ticket
    const existingActiveTicket = findActiveDuplicate(trimmedId);
    if (existingActiveTicket) {
      setDuplicateRejection({
        show: true,
        nationalId: trimmedId,
        patientName: patientName.trim(),
        existingTicket: existingActiveTicket,
        context: "create"
      });
      return;
    }

    setIsSubmittingNew(true);
    try {
      const tckNo = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTicketData: Omit<SystemTicket, "id"> = {
        ticketNumber: tckNo,
        patientName: patientName.trim(),
        nationalId: trimmedId,
        phone: phone.trim() || "",
        department,
        visitReason: visitReason.trim() || "Outpatient Clinical Consultation",
        priority,
        status: "open",
        createdTime: new Date().toLocaleString("en-KE", { dateStyle: "short", timeStyle: "medium" }),
        autoGenerated: false,
      };

      await addDoc(collection(db, "system_tickets"), newTicketData);

      // Immediately hide the create modal window as requested
      setShowModal(false);

      // Display the success prompt popup
      setSuccessPrompt({
        show: true,
        title: "Ticket Created Successfully!",
        message: `Patient ticket ${tckNo} for ${patientName} has been queued into ${department.toUpperCase()}.`,
        ticketNumber: tckNo,
        patientName: patientName.trim(),
        department,
        priority,
        type: "create"
      });

      // Clear create form fields
      setPatientName("");
      setNationalId("");
      setPhone("");
      setVisitReason("Outpatient Clinical Consultation");
      setPriority("Normal");
      setDepartment("reception");
    } catch (err) {
      console.error("Error creating ticket:", err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleOpenEditModal = (ticket: SystemTicket) => {
    setEditingTicket(ticket);
    setEditPatientName(ticket.patientName || "");
    setEditNationalId(ticket.nationalId || "");
    setEditPhone(ticket.phone || "");
    setEditDepartment(ticket.department || "reception");
    setEditVisitReason(ticket.visitReason || "");
    setEditPriority(ticket.priority || "Normal");
    setEditStatus(ticket.status || "open");
    setEditResolutionNotes(ticket.resolutionNotes || "");
  };

  const handleSaveEditTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket || !editPatientName || !editNationalId) return;

    const cleanEditId = editNationalId.trim();

    // If changing National ID or keeping active status, ensure no other active ticket exists with this ID
    if (editStatus === "open" || editStatus === "in_progress") {
      const duplicateConflict = findActiveDuplicate(cleanEditId, editingTicket.id);
      if (duplicateConflict) {
        setDuplicateRejection({
          show: true,
          nationalId: cleanEditId,
          patientName: editPatientName.trim(),
          existingTicket: duplicateConflict,
          context: "edit"
        });
        return;
      }
    }

    setIsSubmittingEdit(true);
    try {
      const updates: Partial<SystemTicket> = {
        patientName: editPatientName.trim(),
        nationalId: cleanEditId,
        phone: editPhone.trim(),
        department: editDepartment,
        visitReason: editVisitReason.trim(),
        priority: editPriority,
        status: editStatus,
        resolutionNotes: editResolutionNotes || "",
      };

      if (editStatus === "closed" && !editingTicket.closedTime) {
        updates.closedTime = new Date().toLocaleString("en-KE", { dateStyle: "short", timeStyle: "medium" });
        updates.closedBy = "Staff Ticket Editor";
      }

      await updateDoc(doc(db, "system_tickets", editingTicket.id), updates);

      const updatedTicketNo = editingTicket.ticketNumber;
      const updatedName = editPatientName;
      const updatedDept = editDepartment;
      const updatedPriority = editPriority;

      // Close the edit modal immediately
      setEditingTicket(null);

      // Show success prompt
      setSuccessPrompt({
        show: true,
        title: "Ticket Updated Successfully!",
        message: `Changes for Ticket ${updatedTicketNo} (${updatedName}) have been saved.`,
        ticketNumber: updatedTicketNo,
        patientName: updatedName,
        department: updatedDept,
        priority: updatedPriority,
        type: "edit"
      });
    } catch (err) {
      console.error("Error updating ticket:", err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmCloseTicket = async () => {
    if (!resolvingTicket) return;
    setIsSubmittingClose(true);
    try {
      await closeAutoTicketById(resolvingTicket.id, resolutionNotes, "Staff Manual Action");
      const closedNo = resolvingTicket.ticketNumber;
      const closedName = resolvingTicket.patientName;
      const closedDept = resolvingTicket.department;
      
      setResolvingTicket(null);
      setResolutionNotes("");

      setSuccessPrompt({
        show: true,
        title: "Ticket Closed & Completed!",
        message: `Ticket ${closedNo} for ${closedName} was marked as resolved and checkout complete.`,
        ticketNumber: closedNo,
        patientName: closedName,
        department: closedDept,
        type: "close"
      });
    } catch (err) {
      console.error("Error closing ticket:", err);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedTicketNo(true);
    setTimeout(() => setCopiedTicketNo(false), 2500);
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = 
      t.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nationalId?.includes(searchQuery) ||
      t.visitReason?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchesType = 
      typeFilter === "all" || 
      (typeFilter === "auto" && t.autoGenerated) || 
      (typeFilter === "manual" && !t.autoGenerated);

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const openCount = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
  const closedCount = tickets.filter(t => t.status === "closed").length;
  const autoCount = tickets.filter(t => t.autoGenerated).length;
  const emergencyCount = tickets.filter(t => t.priority === "Emergency" && t.status !== "closed").length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in relative">
      
      {/* SUCCESS PROMPT POPUP / BANNER */}
      {successPrompt?.show && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-bounce-short">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-500/80 p-4.5 text-slate-900 relative overflow-hidden backdrop-blur-md">
            {/* Top glowing accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
            
            <div className="flex items-start gap-3 pt-1">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shadow-xs shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    {successPrompt.type === "create" ? "New Ticket Issued" : successPrompt.type === "edit" ? "Ticket Updated" : "Ticket Resolved"}
                  </span>
                  <button
                    onClick={() => setSuccessPrompt(null)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                  {successPrompt.title}
                </h3>
                <p className="text-xs text-slate-600 leading-snug">
                  {successPrompt.message}
                </p>

                {successPrompt.ticketNumber && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500">Ticket No:</span>
                      <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {successPrompt.ticketNumber}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(successPrompt.ticketNumber!)}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedTicketNo ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy No</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Ticket className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight uppercase font-comfortaa">Automated Patient Ticket System</h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Every patient keyed into the hospital system automatically triggers an encounter ticket. Tickets automatically transition through triage, consultation, diagnostics, and auto-close upon patient checkout.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Manual Patient Ticket</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Open Tickets</p>
            <p className="text-2xl font-black text-amber-600 font-mono mt-0.5">{openCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5 animate-spin" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Closed on Checkout</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{closedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Auto-Intake Tickets</p>
            <p className="text-2xl font-black text-indigo-600 font-mono mt-0.5">{autoCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Emergency Tickets</p>
            <p className="text-2xl font-black text-rose-600 font-mono mt-0.5">{emergencyCount}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Ticket No, Patient Name, National ID, or Complaint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open / Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed on Checkout</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Emergency">Emergency</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="auto">Auto-Generated</option>
              <option value="manual">Manual Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List / Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Hospital Patient Tickets ({filteredTickets.length})</h2>
          </div>
          <span className="text-[10px] font-bold text-gray-400 font-mono">Real-Time Sync Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/70 text-gray-500 font-bold uppercase text-[9px] tracking-wider border-b border-gray-200">
                <th className="py-3 px-4">Ticket No</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Visit Reason / Issue</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Intake Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">
                    No tickets found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{ticket.ticketNumber}</span>
                        {ticket.autoGenerated && (
                          <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded text-[8px] font-extrabold uppercase">AUTO</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{ticket.patientName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">ID: {ticket.nationalId} {ticket.phone ? `• ${ticket.phone}` : ""}</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-gray-800 truncate" title={ticket.visitReason}>{ticket.visitReason}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] uppercase">
                        {ticket.department}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                        ticket.priority === "Emergency"
                          ? "bg-rose-100 text-rose-700 border border-rose-200 animate-pulse"
                          : ticket.priority === "Urgent"
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {ticket.status === "closed" ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Closed
                          </span>
                          {ticket.closedTime && <p className="text-[9px] text-gray-400 font-mono">{ticket.closedTime}</p>}
                        </div>
                      ) : ticket.status === "in_progress" ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                          <Activity className="w-3 h-3 text-blue-600 animate-spin" /> In Progress
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Open Intake
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[10px] font-mono text-gray-500">
                      {ticket.createdTime}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Option to Edit Ticket */}
                        <button
                          onClick={() => handleOpenEditModal(ticket)}
                          title="Edit Ticket Details"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs border border-slate-200"
                        >
                          <Pencil className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        {ticket.status !== "closed" ? (
                          <button
                            onClick={() => setResolvingTicket(ticket)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Close</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 italic px-1">Resolved</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Ticket Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm uppercase">Create Manual Patient Ticket</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Mutua"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700">National ID / Passport *</label>
                    {nationalId.trim() && findActiveDuplicate(nationalId.trim()) && (
                      <span className="text-[10px] text-rose-600 font-extrabold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" /> Duplicate Active
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 28910482"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-emerald-500 font-mono ${
                      nationalId.trim() && findActiveDuplicate(nationalId.trim())
                        ? "border-rose-400 bg-rose-50/50 text-rose-900"
                        : "border-gray-300"
                    }`}
                  />
                  {nationalId.trim() && findActiveDuplicate(nationalId.trim()) && (
                    <p className="text-[10px] text-rose-600 font-medium">
                      ⚠️ Active Ticket ({findActiveDuplicate(nationalId.trim())?.ticketNumber}) exists in {findActiveDuplicate(nationalId.trim())?.department}. Creation will be rejected.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="reception">Reception Intake</option>
                    <option value="doctor">Doctor Consultation</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="radiology">Radiology</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="billing">Billing & Finance</option>
                    <option value="labour_room">Labour / Maternity</option>
                    <option value="gyna">Gynecology (Gyna)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Visit Reason / Clinical Issue</label>
                <textarea
                  rows={2}
                  placeholder="Describe patient symptoms or intake purpose..."
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-emerald-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingNew ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Create Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TICKET MODAL */}
      {editingTicket && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm uppercase">Edit Ticket: {editingTicket.ticketNumber}</h3>
                  <p className="text-[10px] text-slate-300">Created on {editingTicket.createdTime}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingTicket(null)} 
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTicket} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={editPatientName}
                  onChange={(e) => setEditPatientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700">National ID / Passport *</label>
                    {editNationalId.trim() && findActiveDuplicate(editNationalId.trim(), editingTicket.id) && (
                      <span className="text-[10px] text-rose-600 font-extrabold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" /> Duplicate Active
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={editNationalId}
                    onChange={(e) => setEditNationalId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-emerald-500 font-mono ${
                      editNationalId.trim() && findActiveDuplicate(editNationalId.trim(), editingTicket.id)
                        ? "border-rose-400 bg-rose-50/50 text-rose-900"
                        : "border-gray-300"
                    }`}
                  />
                  {editNationalId.trim() && findActiveDuplicate(editNationalId.trim(), editingTicket.id) && (
                    <p className="text-[10px] text-rose-600 font-medium">
                      ⚠️ Active Ticket ({findActiveDuplicate(editNationalId.trim(), editingTicket.id)?.ticketNumber}) exists for this ID.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Department</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-2.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="reception">Reception</option>
                    <option value="doctor">Doctor</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="radiology">Radiology</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="billing">Billing</option>
                    <option value="labour_room">Labour Room</option>
                    <option value="gyna">Gynecology</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Priority Level</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="open">Open / Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed / Resolved</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Visit Reason / Chief Complaint</label>
                <textarea
                  rows={2}
                  value={editVisitReason}
                  onChange={(e) => setEditVisitReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-emerald-500"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Resolution / Staff Progress Notes</label>
                <textarea
                  rows={2}
                  placeholder="Add any medical checkout remarks, diagnosis summary, or staff notes..."
                  value={editResolutionNotes}
                  onChange={(e) => setEditResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-emerald-500"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <span className="text-[10px] text-gray-400 font-mono">ID: {editingTicket.id}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTicket(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Ticket Confirmation Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckSquare className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase">Close Ticket: {resolvingTicket.ticketNumber}</h3>
            </div>

            <p className="text-xs text-gray-600">
              Closing ticket for <strong className="text-gray-900">{resolvingTicket.patientName}</strong> (ID: {resolvingTicket.nationalId}).
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Resolution / Checkout Notes</label>
              <textarea
                rows={3}
                placeholder="Enter completion details or checkout notes..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-emerald-500"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResolvingTicket(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCloseTicket}
                disabled={isSubmittingClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmittingClose ? "Closing..." : "Confirm Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE ENCOUNTER REJECTION MODAL */}
      {duplicateRejection?.show && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-60 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border-2 border-rose-200 overflow-hidden animate-scale-up">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-700/60 rounded-2xl">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">Duplicate Encounter Rejected</h3>
                  <p className="text-[11px] text-rose-100 font-medium">Hospital Policy: 1 Active Ticket Per Patient</p>
                </div>
              </div>
              <button 
                onClick={() => setDuplicateRejection(null)}
                className="p-1 rounded-xl hover:bg-rose-700/50 text-rose-100 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-rose-900 font-medium leading-relaxed">
                    Patient <strong className="font-bold text-rose-950">{duplicateRejection.patientName}</strong> (National ID: <span className="font-mono font-bold">{duplicateRejection.nationalId}</span>) already has an active hospital ticket currently in progress.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 font-sans">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Existing Active Ticket Details
                </div>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Ticket Number</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {duplicateRejection.existingTicket.ticketNumber}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Assigned Department</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {duplicateRejection.existingTicket.department}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Priority / Status</span>
                    <span className="font-bold text-slate-900 capitalize">
                      {duplicateRejection.existingTicket.priority} • {duplicateRejection.existingTicket.status}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Intake Time</span>
                    <span className="font-bold text-slate-900 text-[11px]">
                      {duplicateRejection.existingTicket.createdTime}
                    </span>
                  </div>
                </div>

                {duplicateRejection.existingTicket.visitReason && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Active Visit Reason</span>
                    <span className="font-semibold text-slate-800">
                      {duplicateRejection.existingTicket.visitReason}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setDuplicateRejection(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors text-center"
                >
                  Dismiss Warning
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ticketToView = duplicateRejection.existingTicket;
                    setDuplicateRejection(null);
                    setShowModal(false);
                    handleOpenEditModal(ticketToView);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <FileEdit className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Existing Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

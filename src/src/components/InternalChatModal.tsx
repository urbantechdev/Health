import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  arrayUnion,
  where
} from "firebase/firestore";
import { InternalMessage, SystemRole, Employee, QueueTicket, ChatTicketAttachment } from "../types";
import { ALL_SYSTEM_ROLES, getRoleConfig } from "../constants/roles";
import { HOSPITAL_SPECIALISTS_DIRECTORY } from "../constants/specialists";
import ChatTicketEmbed from "./ChatTicketEmbed";
import RaiseChatTicketModal from "./RaiseChatTicketModal";
import {
  MessageSquare,
  Send,
  X,
  AlertTriangle,
  Flame,
  Check,
  CheckCheck,
  Search,
  Bell,
  Users,
  User,
  Shield,
  Stethoscope,
  FlaskRound,
  ShoppingCart,
  PhoneCall,
  Activity,
  CornerDownRight,
  Filter,
  Sparkles,
  Paperclip,
  Radio,
  Clock,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  Receipt,
  FileText,
  ArrowRightLeft,
  ChevronLeft,
  Menu
} from "lucide-react";
import { toast } from "../lib/promptService";

interface InternalChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    email: string;
    role: SystemRole | string;
    id?: string;
    photoURL?: string;
  };
  initialTargetRole?: SystemRole | string;
  initialPatientContext?: {
    patientName: string;
    ticketNo: string;
    patientId?: string;
  };
  onOpenPatientTicket?: (ticketNo: string) => void;
  onOpenTransferModal?: (patientInfo?: any) => void;
}

export const CHAT_CHANNELS = [
  { id: "all", name: "Facility Wide (#all-staff)", desc: "Broadcast to all hospital units", icon: Users, color: "text-purple-600 bg-purple-50" },
  { id: "doctors", name: "Doctors & Clinical (#doctors-clinic)", desc: "Physicians & Medical Specialists", icon: Stethoscope, color: "text-cyan-600 bg-cyan-50" },
  { id: "nursing", name: "Nursing & Wards (#nursing-station)", desc: "Triage, Wards & Inpatient care", icon: Activity, color: "text-rose-600 bg-rose-50" },
  { id: "pharmacy", name: "Pharmacy & POS (#pharmacy-dispensary)", desc: "Drug orders, POS & Stock", icon: ShoppingCart, color: "text-teal-600 bg-teal-50" },
  { id: "laboratory", name: "Laboratory (#lab-diagnostics)", desc: "Lab tests, specimens & results", icon: FlaskRound, color: "text-amber-600 bg-amber-50" },
  { id: "reception", name: "Reception & Triage (#front-desk)", desc: "Intake, SHA verification & Queues", icon: PhoneCall, color: "text-emerald-600 bg-emerald-50" },
  { id: "emergency", name: "STAT Code Red (#emergency-alerts)", desc: "Critical resuscitations & alerts", icon: Flame, color: "text-red-600 bg-red-50" },
  { id: "admin", name: "Admin & Operations (#admin-ops)", desc: "Management & Facilities", icon: Shield, color: "text-indigo-600 bg-indigo-50" },
];

export const QUICK_TEMPLATES = [
  { label: "Doctor Needed at Triage", text: "Urgent: Doctor requested at Triage desk for rapid patient evaluation.", priority: "urgent" as const },
  { label: "Lab STAT Sample Ready", text: "STAT blood/specimen sample collected and dispatched to Laboratory for urgent processing.", priority: "urgent" as const },
  { label: "Medication Substitute Query", text: "Prescribed medicine temporarily out of stock. Requesting doctor authorization for generic equivalent.", priority: "normal" as const },
  { label: "Transfer Bed Ready", text: "Inpatient bed sanitized and prepped. Patient can now be transferred immediately.", priority: "normal" as const },
  { label: "CODE RED Emergency", text: "CODE RED: Trauma / Resuscitation in Progress at Emergency Bay 1. All available clinical staff respond.", priority: "stat_emergency" as const },
];

export default function InternalChatModal({
  isOpen,
  onClose,
  currentUser,
  initialTargetRole,
  initialPatientContext,
  onOpenPatientTicket,
  onOpenTransferModal
}: InternalChatModalProps) {
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [targetType, setTargetType] = useState<"channel" | "role" | "direct">("channel");
  const [selectedRole, setSelectedRole] = useState<SystemRole | string>(initialTargetRole || "Doctor");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  // Message composition
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState<"normal" | "urgent" | "stat_emergency">("normal");
  const [newCategory, setNewCategory] = useState<InternalMessage["category"]>("general");
  const [attachedPatient, setAttachedPatient] = useState<{
    name: string;
    ticketNo: string;
    patientId?: string;
  } | null>(initialPatientContext ? { name: initialPatientContext.patientName, ticketNo: initialPatientContext.ticketNo, patientId: initialPatientContext.patientId } : null);

  // Available tickets for linking
  const [activeTickets, setActiveTickets] = useState<QueueTicket[]>([]);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRecipientUser, setSelectedRecipientUser] = useState<Employee | null>(null);
  const [showRaiseTicketModal, setShowRaiseTicketModal] = useState(false);
  // Mobile app screen mode: 'list' (channels/roles) or 'chat' (active conversation thread)
  const [mobileView, setMobileView] = useState<"list" | "chat">("chat");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync initial props
  useEffect(() => {
    if (initialTargetRole) {
      setTargetType("role");
      setSelectedRole(initialTargetRole);
      setMobileView("chat");
    }
    if (initialPatientContext) {
      setAttachedPatient({
        name: initialPatientContext.patientName,
        ticketNo: initialPatientContext.ticketNo,
        patientId: initialPatientContext.patientId
      });
      setNewSubject(`Patient Case ${initialPatientContext.ticketNo}: ${initialPatientContext.patientName}`);
      setMobileView("chat");
    }
  }, [initialTargetRole, initialPatientContext, isOpen]);

  // Real-time listener for internal messages
  useEffect(() => {
    const q = query(collection(db, "internal_messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: InternalMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as InternalMessage);
      });
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  // Fetch active queue tickets for quick link
  useEffect(() => {
    const unsubQueue = onSnapshot(collection(db, "queue"), (snapshot) => {
      const tickets: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== "completed") {
          tickets.push({ id: doc.id, ...data } as QueueTicket);
        }
      });
      setActiveTickets(tickets);
    });
    return () => unsubQueue();
  }, []);

  // Fetch employees for direct messaging
  useEffect(() => {
    const unsubEmps = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((doc) => {
        emps.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(emps.filter(e => e.status === "active"));
    });
    return () => unsubEmps();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, activeChannel, targetType, isOpen]);

  // Mark message as read by current user
  const handleMarkAsRead = async (msgId: string) => {
    const userIdentifier = currentUser.email || currentUser.name || "user";
    try {
      await updateDoc(doc(db, "internal_messages", msgId), {
        readBy: arrayUnion(userIdentifier, currentUser.role)
      });
    } catch (e) {
      console.error("Error marking message read:", e);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const payload: Omit<InternalMessage, "id"> = {
        senderId: currentUser.id || currentUser.email || "staff-01",
        senderName: currentUser.name || "Hospital Staff",
        senderRole: currentUser.role || "Staff",
        senderAvatar: currentUser.photoURL,
        targetType: targetType === "channel" ? (activeChannel === "all" ? "all" : "department") : (targetType === "role" ? "role" : "direct"),
        targetRole: targetType === "role" ? selectedRole : undefined,
        targetDepartment: targetType === "channel" && activeChannel !== "all" ? activeChannel : undefined,
        targetUserId: targetType === "direct" ? selectedRecipientUser?.id : undefined,
        targetUserName: targetType === "direct" ? selectedRecipientUser?.name : undefined,
        targetUserEmail: targetType === "direct" ? selectedRecipientUser?.email : undefined,
        channelId: targetType === "channel" ? activeChannel : undefined,
        subject: newSubject.trim() || (newPriority === "stat_emergency" ? "🚨 CODE RED EMERGENCY ALERT" : `Message from ${currentUser.role}`),
        message: newMessage.trim(),
        priority: newPriority,
        category: newCategory,
        relatedPatientId: attachedPatient?.patientId,
        relatedPatientName: attachedPatient?.name,
        relatedTicketNo: attachedPatient?.ticketNo,
        readBy: [currentUser.email || currentUser.name || "author", currentUser.role],
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, "internal_messages"), payload);

      toast.success(
        targetType === "role" 
          ? `Dispatched message to all ${selectedRole} staff` 
          : targetType === "direct" 
            ? `Sent direct message to ${selectedRecipientUser?.name}` 
            : `Posted to #${activeChannel}`,
        "Message Transmitted"
      );

      // Reset input
      setNewMessage("");
      setNewSubject("");
      setNewPriority("normal");
      setAttachedPatient(null);
    } catch (err: any) {
      console.error("Failed to send internal message:", err);
      toast.error("Failed to transmit message across clinical network.", "Transmission Error");
    }
  };

  // Dispatch ticket raised from modal
  const handleTicketDispatched = async (
    ticket: ChatTicketAttachment,
    chatMessage: string,
    tgtType: "channel" | "role" | "direct",
    tgtVal: string
  ) => {
    try {
      const isDirectSpecialist = Boolean(ticket.toSpecialistName);
      const payload: Omit<InternalMessage, "id"> = {
        senderId: currentUser.id || currentUser.email || "staff-01",
        senderName: currentUser.name || "Hospital Staff",
        senderRole: currentUser.role || "Staff",
        senderAvatar: currentUser.photoURL,
        targetType: isDirectSpecialist
          ? "direct"
          : tgtType === "channel"
            ? (tgtVal === "all" ? "all" : "department")
            : (tgtType === "role" ? "role" : "direct"),
        targetRole: tgtType === "role" ? tgtVal : ticket.toRole || undefined,
        targetDepartment: tgtType === "channel" && tgtVal !== "all" ? tgtVal : ticket.toDepartment || undefined,
        targetUserName: ticket.toSpecialistName || undefined,
        channelId: tgtType === "channel" ? tgtVal : undefined,
        subject: ticket.title,
        message: chatMessage,
        priority: ticket.urgency === "STAT Emergency" ? "stat_emergency" : ticket.urgency === "Urgent" ? "urgent" : "normal",
        category: 
          ticket.type === "invoice" 
            ? "invoice_ticket" 
            : ticket.type === "pre_quote" 
              ? "pre_quote_estimate" 
              : ticket.type === "patient_transfer" 
                ? "patient_transfer" 
                : "service_order",
        relatedPatientId: ticket.patientId,
        relatedPatientName: ticket.patientName,
        relatedTicketNo: ticket.ticketNo,
        ticketAttachment: ticket,
        readBy: [currentUser.email || currentUser.name || "author", currentUser.role],
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, "internal_messages"), payload);

      // If user is viewing a different tab, switch to target
      if (tgtType === "role") {
        setTargetType("role");
        setSelectedRole(tgtVal);
      } else if (tgtType === "channel") {
        setTargetType("channel");
        setActiveChannel(tgtVal);
      }
    } catch (err) {
      console.error("Failed to post ticket to chat:", err);
      toast.error("Could not post ticket to chat stream.");
    }
  };

  // Filtering messages for current view
  const filteredMessages = messages.filter((m) => {
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        m.message.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.relatedPatientName && m.relatedPatientName.toLowerCase().includes(q)) ||
        (m.relatedTicketNo && m.relatedTicketNo.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Priority filter
    if (priorityFilter !== "all" && m.priority !== priorityFilter) {
      return false;
    }

    // Tab / channel view filter
    if (targetType === "channel") {
      if (activeChannel === "all") {
        return true; // Show all broadcast / public messages
      }
      return m.channelId === activeChannel || m.targetDepartment === activeChannel || m.targetType === "all";
    }

    if (targetType === "role") {
      return m.targetRole?.toLowerCase() === selectedRole.toLowerCase() || m.senderRole?.toLowerCase() === selectedRole.toLowerCase();
    }

    if (targetType === "direct") {
      if (!selectedRecipientUser) return true;
      return (
        (m.targetUserId === selectedRecipientUser.id && m.senderId === currentUser.id) ||
        (m.senderId === selectedRecipientUser.id && m.targetUserId === currentUser.id)
      );
    }

    return true;
  });

  // Calculate unread count for current user
  const userIdentifier = currentUser.email || currentUser.name || "";
  const getUnreadCountForChannel = (chanId: string) => {
    return messages.filter((m) => {
      const isForChannel = chanId === "all" ? true : (m.channelId === chanId || m.targetDepartment === chanId);
      const isRead = m.readBy?.includes(userIdentifier) || m.readBy?.includes(currentUser.role);
      return isForChannel && !isRead;
    }).length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div 
        id="internal-chat-modal"
        className="bg-white border-0 sm:border sm:border-slate-200 rounded-none sm:rounded-3xl w-full max-w-5xl h-full h-[100dvh] sm:h-[92vh] sm:max-h-[850px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header Bar */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Back button when in chat view */}
            {mobileView === "chat" && (
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="sm:hidden p-1.5 -ml-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 shrink-0"
                title="Back to Channels"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-xs font-bold">Channels</span>
              </button>
            )}

            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-base font-bold tracking-tight truncate">
                  Internal Role Chat
                </h3>
                <span className="flex px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 items-center gap-1 shrink-0">
                  <Radio className="w-2 h-2 text-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                <span className="text-white font-semibold">{currentUser.name}</span> ({currentUser.role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Mobile Channel Switcher button when in chat view */}
            {mobileView === "chat" && (
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="sm:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Switch Channel"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              id="btn-close-internal-chat"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close Chat"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Main Body: Mobile Responsive (Single View on Mobile, 2 Columns on Desktop) */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Navigation: Channels & Role Targets */}
          <div className={`w-full sm:w-72 md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 ${
            mobileView === "list" ? "flex" : "hidden sm:flex"
          }`}>
            {/* Target Type Selector */}
            <div className="p-2.5 sm:p-3 border-b border-slate-200">
              <div className="grid grid-cols-3 gap-1 bg-slate-200 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTargetType("channel")}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                    targetType === "channel" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Channels
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("role")}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                    targetType === "role" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  By Role
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("direct")}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                    targetType === "direct" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Staff DM
                </button>
              </div>
            </div>

            {/* List based on target type */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5">
              {targetType === "channel" && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                    Department Channels
                  </p>
                  {CHAT_CHANNELS.map((chan) => {
                    const Icon = chan.icon;
                    const isActive = activeChannel === chan.id;
                    const unread = getUnreadCountForChannel(chan.id);

                    return (
                      <button
                        key={chan.id}
                        onClick={() => {
                          setActiveChannel(chan.id);
                          setMobileView("chat");
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "hover:bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? "bg-emerald-700 text-white" : chan.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="truncate font-bold">{chan.name}</p>
                            <p className={`text-[10px] truncate ${isActive ? "text-emerald-100" : "text-slate-400"}`}>{chan.desc}</p>
                          </div>
                        </div>

                        {unread > 0 && (
                          <span className={`ml-2 px-1.5 py-0.5 text-[9px] font-black rounded-full shrink-0 ${
                            isActive ? "bg-white text-emerald-800" : "bg-rose-500 text-white"
                          }`}>
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {targetType === "role" && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                    Hospital Role Inboxes
                  </p>
                  {ALL_SYSTEM_ROLES.map((role) => {
                    const roleConfig = getRoleConfig(role);
                    const isActive = selectedRole === role;
                    const unread = messages.filter(
                      (m) => m.targetRole?.toLowerCase() === role.toLowerCase() && !(m.readBy?.includes(userIdentifier) || m.readBy?.includes(currentUser.role))
                    ).length;

                    return (
                      <button
                        key={role}
                        onClick={() => {
                          setSelectedRole(role);
                          setMobileView("chat");
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-slate-900 text-white shadow-sm"
                            : "hover:bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            role === "Doctor" ? "bg-cyan-500" :
                            role === "Pharmacy" ? "bg-teal-500" :
                            role === "Lab" ? "bg-amber-500" :
                            role === "Reception" ? "bg-emerald-500" :
                            role === "Super Admin" || role === "Admin" ? "bg-purple-500" : "bg-blue-500"
                          }`} />
                          <div className="truncate">
                            <p className="truncate font-bold">{role}</p>
                            <p className={`text-[10px] truncate ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                              {roleConfig.title}
                            </p>
                          </div>
                        </div>

                        {unread > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-rose-500 text-white shrink-0">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {targetType === "direct" && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                    Staff Directory ({employees.length})
                  </p>
                  {employees.map((emp) => {
                    const isActive = selectedRecipientUser?.id === emp.id;

                    return (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedRecipientUser(emp);
                          setMobileView("chat");
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "hover:bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center font-bold text-[11px] text-slate-700 shrink-0 uppercase">
                            {emp.name?.slice(0, 2) || "ST"}
                          </div>
                          <div className="truncate">
                            <p className="truncate font-bold">{emp.name}</p>
                            <p className={`text-[10px] truncate ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                              {emp.role} • {emp.department}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Transfer Quick Action Shortcut */}
            {onOpenTransferModal && (
              <div className="p-3 border-t border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTransferModal();
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer hover:shadow-md"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Refer / Transfer Patient
                </button>
              </div>
            )}
          </div>

          {/* Right Area: Messages Thread & Composer */}
          <div className={`w-full flex-1 flex flex-col bg-white overflow-hidden ${
            mobileView === "chat" ? "flex" : "hidden sm:flex"
          }`}>
            {/* Thread Header with Search & Filter */}
            <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700 shrink-0">
                    {targetType === "channel" ? (
                      <Users className="w-4 h-4 text-emerald-600" />
                    ) : targetType === "role" ? (
                      <Shield className="w-4 h-4 text-purple-600" />
                    ) : (
                      <User className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                      {targetType === "channel"
                        ? CHAT_CHANNELS.find((c) => c.id === activeChannel)?.name
                        : targetType === "role"
                          ? `Role Inbox: ${selectedRole}`
                          : selectedRecipientUser
                            ? `Direct Message: ${selectedRecipientUser.name}`
                            : "Select a Staff Member"}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                      {filteredMessages.length} message{filteredMessages.length !== 1 ? "s" : ""} in thread
                    </p>
                  </div>
                </div>

                {/* Mobile switch channel shortcut */}
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="sm:hidden px-2.5 py-1 text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Filters and Raise Ticket Action */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  id="btn-raise-ticket-chat-header"
                  onClick={() => setShowRaiseTicketModal(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95 shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">Raise Ticket</span>
                </button>

                <div className="relative flex-1 sm:flex-initial min-w-[110px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 sm:w-36 md:w-44"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shrink-0"
                >
                  <option value="all">All</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat_emergency">🚨 STAT</option>
                </select>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-slate-50/30">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 text-slate-400">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700">No messages in this thread yet</p>
                  <p className="text-[11px] sm:text-xs max-w-sm mt-1">
                    Send clinical handoffs, lab notifications, prescription queries, or general hospital memos to keep departments aligned.
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isCurrentUser = msg.senderName === currentUser.name || msg.senderId === currentUser.id;
                  const isStat = msg.priority === "stat_emergency";
                  const isUrgent = msg.priority === "urgent";
                  const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}
                    >
                      {/* Sender Info */}
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 px-1 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-700">
                          {isCurrentUser ? "You" : msg.senderName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 font-semibold">
                          {msg.senderRole}
                        </span>
                        <span className="text-[10px] text-slate-400">{formattedTime}</span>

                        {isStat && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-600 text-white flex items-center gap-1 animate-pulse">
                            <Flame className="w-2.5 h-2.5" /> STAT CODE RED
                          </span>
                        )}
                        {isUrgent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> URGENT
                          </span>
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`w-full max-w-[92vw] sm:max-w-xl rounded-2xl p-3 sm:p-4 shadow-xs text-xs sm:text-sm break-words overflow-hidden ${
                          isStat
                            ? "bg-red-50 border-2 border-red-500 text-red-950 ring-2 ring-red-300"
                            : isUrgent
                              ? "bg-amber-50 border border-amber-300 text-amber-950"
                              : isCurrentUser
                                ? "bg-emerald-700 text-white border border-emerald-600 rounded-tr-xs"
                                : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                        }`}
                      >
                        {msg.subject && (
                          <h5 className={`font-bold text-xs mb-1.5 pb-1 border-b ${
                            isCurrentUser && !isStat && !isUrgent ? "border-emerald-600/60 text-emerald-100" : "border-slate-200/80 text-slate-900"
                          }`}>
                            {msg.subject}
                          </h5>
                        )}

                        <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.message}</p>

                        {/* Embedded Actionable Chat Ticket (Invoice / Pre-Quote / Transfer / Order) */}
                        {msg.ticketAttachment && (
                          <div className="mt-3">
                            <ChatTicketEmbed
                              messageId={msg.id}
                              ticket={msg.ticketAttachment}
                              currentUser={currentUser}
                              onOpenPatientTicket={onOpenPatientTicket}
                              onOpenPatientJourney={() => {
                                if (onOpenTransferModal) {
                                  onOpenTransferModal({
                                    name: msg.ticketAttachment?.patientName,
                                    ticketNo: msg.ticketAttachment?.ticketNo,
                                    nationalId: msg.ticketAttachment?.nationalId
                                  });
                                }
                              }}
                            />
                          </div>
                        )}

                        {/* Linked Patient Ticket Badge */}
                        {msg.relatedTicketNo && !msg.ticketAttachment && (
                          <div className={`mt-3 p-2 rounded-xl flex items-center justify-between gap-2 text-xs border ${
                            isCurrentUser && !isStat && !isUrgent
                              ? "bg-emerald-800/80 border-emerald-600 text-emerald-100"
                              : "bg-slate-100 border-slate-200 text-slate-800"
                          }`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="font-mono font-bold">{msg.relatedTicketNo}</span>
                              <span className="truncate">({msg.relatedPatientName})</span>
                            </div>
                            {onOpenPatientTicket && (
                              <button
                                type="button"
                                onClick={() => onOpenPatientTicket(msg.relatedTicketNo!)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                                  isCurrentUser && !isStat && !isUrgent
                                    ? "bg-white text-emerald-900 hover:bg-emerald-50"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                              >
                                View Ticket
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Read status acknowledgment */}
                      <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                        {isCurrentUser && (
                          <span className="flex items-center gap-0.5">
                            {msg.readBy?.length > 1 ? (
                              <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                                <CheckCheck className="w-3 h-3" /> Read by {msg.readBy.length - 1} staff
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-slate-400">
                                <Check className="w-3 h-3" /> Delivered
                              </span>
                            )}
                          </span>
                        )}
                        {!isCurrentUser && !(msg.readBy?.includes(userIdentifier) || msg.readBy?.includes(currentUser.role)) && (
                          <button
                            onClick={() => handleMarkAsRead(msg.id)}
                            className="text-emerald-600 hover:underline font-bold"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Response Templates */}
            <div className="px-3 sm:px-6 py-1.5 sm:py-2 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span className="hidden xs:inline">Quick Memos:</span>
              </span>
              {QUICK_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewMessage(tmpl.text);
                    setNewSubject(tmpl.label);
                    setNewPriority(tmpl.priority);
                  }}
                  className="px-2 sm:px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-700 whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            {/* Composer Box */}
            <form onSubmit={handleSendMessage} className="p-2.5 sm:p-4 border-t border-slate-200 bg-white space-y-2 sm:space-y-3 shrink-0">
              {/* Linked Patient Pill (if any) */}
              {attachedPatient && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                    <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Case: <strong className="font-mono">{attachedPatient.ticketNo}</strong> — {attachedPatient.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedPatient(null)}
                    className="text-emerald-700 hover:text-emerald-950 font-bold p-1 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Subject & Controls Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Subject / Summary (e.g. STAT Lab Request)"
                  className="w-full sm:flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />

                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
                  {/* Priority Selector */}
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold border focus:outline-hidden cursor-pointer shrink-0 ${
                      newPriority === "stat_emergency"
                        ? "bg-red-100 text-red-800 border-red-300 font-extrabold ring-2 ring-red-400"
                        : newPriority === "urgent"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent ⚠️</option>
                    <option value="stat_emergency">🚨 STAT RED</option>
                  </select>

                  {/* Raise Structured Ticket in Chat */}
                  <button
                    type="button"
                    id="btn-raise-ticket-composer"
                    onClick={() => setShowRaiseTicketModal(true)}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Invoice/Transfer</span>
                  </button>

                  {/* Attach Patient Button */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowPatientPicker(!showPatientPicker)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                      <span>Attach Case</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {/* Patient Picker Dropdown */}
                    {showPatientPicker && (
                      <div className="absolute right-0 bottom-full mb-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-20 max-h-56 overflow-y-auto space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                          Active Hospital Tickets
                        </p>
                        {activeTickets.length === 0 ? (
                          <p className="text-xs text-slate-400 p-2 text-center">No active queue tickets</p>
                        ) : (
                          activeTickets.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setAttachedPatient({ name: t.patientName, ticketNo: t.ticketNo, patientId: t.id });
                                setShowPatientPicker(false);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                            >
                              <div>
                                <p className="font-bold text-slate-800">{t.patientName}</p>
                                <p className="text-[10px] text-slate-500 capitalize">{t.currentDepartment} visit</p>
                              </div>
                              <span className="font-mono text-emerald-700 font-bold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                {t.ticketNo}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message text area & Send button */}
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={`Message ${
                    targetType === "channel"
                      ? `#${activeChannel}`
                      : targetType === "role"
                        ? `all ${selectedRole}`
                        : selectedRecipientUser?.name || "staff"
                  }...`}
                  className="flex-1 p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                />

                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Raise Ticket / Invoice / Transfer Modal */}
      {showRaiseTicketModal && (
        <RaiseChatTicketModal
          isOpen={showRaiseTicketModal}
          onClose={() => setShowRaiseTicketModal(false)}
          currentUser={{
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            department: currentUser.role
          }}
          initialTargetRole={targetType === "role" ? selectedRole : "Billing & Accounts"}
          initialTargetChannel={targetType === "channel" ? activeChannel : "all"}
          initialPatient={attachedPatient ? { name: attachedPatient.name, ticketNo: attachedPatient.ticketNo, patientId: attachedPatient.patientId } : null}
          onTicketDispatched={handleTicketDispatched}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { SecurityLog } from "../types";
import { createAutoTicket, closeAutoTicket } from "../lib/ticketService";
import { upsertUnifiedPatientRecord } from "../lib/patientSyncService";
import { toast, modernAlert, modernConfirm } from "../lib/promptService";
import { 
  Shield, 
  UserCheck, 
  Car, 
  LogOut, 
  LogIn, 
  Search, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  FileCheck, 
  Users, 
  Activity, 
  Clock, 
  ShieldAlert,
  MapPin,
  CheckCircle,
  XCircle,
  Plus,
  Trash2
} from "lucide-react";

export interface WatchlistItem {
  id?: string;
  type: "vehicle" | "individual";
  identifier: string;
  reason: string;
  severity: "critical" | "warning";
  addedAt: string;
  addedBy: string;
}

export default function SecurityDesk() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [activeTab, setActiveTab] = useState<"register" | "inside" | "history">("register");
  
  // Incident & Security level state
  const [lockdown, setLockdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkpointFilter, setCheckpointFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Log Form states
  const [logType, setLogType] = useState<"individual" | "vehicle">("individual");
  const [nameOrPlate, setNameOrPlate] = useState("");
  const [entityType, setEntityType] = useState<SecurityLog["entityType"]>("patient");
  const [checkpoint, setCheckpoint] = useState("Main Gate");
  const [idOrPhone, setIdOrPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [officerName, setOfficerName] = useState("Officer Kipkorir");

  // Real Dynamic Watchlist state from Firestore
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);
  const [newWatchType, setNewWatchType] = useState<"vehicle" | "individual">("vehicle");
  const [newWatchIdentifier, setNewWatchIdentifier] = useState("");
  const [newWatchReason, setNewWatchReason] = useState("");
  const [newWatchSeverity, setNewWatchSeverity] = useState<"critical" | "warning">("critical");

  useEffect(() => {
    // Listen to live security checkpoint logs
    const unsubLogs = onSnapshot(collection(db, "security_logs"), (snapshot) => {
      const records: SecurityLog[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as SecurityLog);
      });
      // Sort logs by timestamp descending
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(records);
    });

    // Listen to live security watchlist records in Firestore
    const unsubWatchlist = onSnapshot(collection(db, "security_watchlists"), (snapshot) => {
      const items: WatchlistItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as WatchlistItem);
      });
      setWatchlists(items);
    });

    return () => {
      unsubLogs();
      unsubWatchlist();
    };
  }, []);

  const handleAddWatchlistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchIdentifier.trim()) {
      toast.warning("Please enter a valid License Plate or National ID.", "Missing Identifier");
      return;
    }

    try {
      await addDoc(collection(db, "security_watchlists"), {
        type: newWatchType,
        identifier: newWatchIdentifier.trim().toUpperCase(),
        reason: newWatchReason.trim() || "Security watchlist alert",
        severity: newWatchSeverity,
        addedAt: new Date().toISOString(),
        addedBy: officerName || "Security Officer Desk"
      });

      toast.success(`${newWatchType === "vehicle" ? "Vehicle Plate" : "National ID"} ${newWatchIdentifier.toUpperCase()} added to active watchlist!`);
      setNewWatchIdentifier("");
      setNewWatchReason("");
      setShowAddWatchlist(false);
    } catch (err: any) {
      toast.error("Failed to save watchlist entry: " + err.message);
    }
  };

  const handleDeleteWatchlistItem = async (id?: string) => {
    if (!id) return;
    const confirmed = await modernConfirm("Are you sure you want to remove this record from the active security watchlist?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "security_watchlists", id));
      toast.info("Record removed from security watchlist.");
    } catch (err: any) {
      toast.error("Failed to remove watchlist entry: " + err.message);
    }
  };

  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockdown) {
      modernAlert("Facility is currently in LOCKDOWN mode. All gate entries are restricted until authorized by senior administration.", {
        title: "Facility In Lockdown",
        type: "error",
      });
      return;
    }

    if (!nameOrPlate) {
      toast.warning("Please fill in the Name or License Plate number.", "Missing Entry Data");
      return;
    }

    // Check Live Blacklist / Watchlist database triggers
    let status: SecurityLog["status"] = "authorized";
    let customNotes = notes;

    const matchedVehicleWatch = watchlists.find(
      (w) => w.type === "vehicle" && w.identifier.toUpperCase() === nameOrPlate.trim().toUpperCase()
    );

    const matchedIdWatch = watchlists.find(
      (w) => w.type === "individual" && w.identifier.toUpperCase() === idOrPhone.trim().toUpperCase()
    );

    if (logType === "vehicle" && matchedVehicleWatch) {
      status = "flagged";
      customNotes = `[FLAGGED WATCHLIST: ${matchedVehicleWatch.reason}] ${notes || "Suspect vehicle entry flagged by security database"}`;
      modernAlert(`Vehicle plate "${nameOrPlate.toUpperCase()}" is on the ACTIVE SECURITY WATCHLIST: "${matchedVehicleWatch.reason}". Notification dispatched to internal guard posts.`, {
        title: "Security Threat Alert",
        type: "error",
      });
    }

    if (logType === "individual" && matchedIdWatch) {
      status = matchedIdWatch.severity === "critical" ? "denied" : "flagged";
      customNotes = `[WATCHLIST MATCH: ${matchedIdWatch.reason}] ${notes || "Individual ID matches flagged profile"}`;
      modernAlert(`National ID / Passport "${idOrPhone}" is flagged on the security watchlist: "${matchedIdWatch.reason}". ${matchedIdWatch.severity === "critical" ? "Gate pass rejected." : "Supervised entry required."}`, {
        title: matchedIdWatch.severity === "critical" ? "Entry Denied" : "Security Alert",
        type: "error",
      });
    }

    try {
      const cleanNationalId = (idOrPhone || "").trim();
      const cleanName = (nameOrPlate || "").trim();

      const newLog: Omit<SecurityLog, "id"> = {
        type: logType,
        nameOrPlate: logType === "vehicle" ? cleanName.toUpperCase() : cleanName,
        entityType,
        direction: "entry",
        checkpoint,
        idOrPhone: cleanNationalId,
        nationalId: cleanNationalId,
        patientName: entityType === "patient" ? cleanName : undefined,
        phone: cleanNationalId,
        timestamp: new Date().toISOString(),
        status,
        notes: customNotes,
        officerName,
        receptionStatus: "pending"
      };

      await addDoc(collection(db, "security_logs"), newLog);

      // Auto-trigger unified EHR patient record & system ticket for patient entry
      if (entityType === "patient" && cleanName) {
        try {
          await upsertUnifiedPatientRecord({
            patientName: cleanName,
            nationalId: cleanNationalId || `GATE-${Math.floor(100000 + Math.random() * 900000)}`,
            phone: cleanNationalId,
            currentDepartment: "reception",
            sourceStation: `Security Gate Entry (${checkpoint})`,
            symptoms: `Security Gate Entry logged at ${checkpoint} • Officer: ${officerName} • Note: ${customNotes || "Awaiting Reception Intake"}`
          });
        } catch (syncErr) {
          console.warn("Unified patient sync note from security desk:", syncErr);
        }

        await createAutoTicket({
          patientName: cleanName,
          nationalId: cleanNationalId || `ID-${Math.floor(100000 + Math.random() * 900000)}`,
          phone: cleanNationalId,
          department: "reception",
          visitReason: customNotes || `Gate Arrival at ${checkpoint} • Officer: ${officerName}`
        });
      }
      
      // Reset
      setNameOrPlate("");
      setIdOrPhone("");
      setNotes("");
      toast.success(
        entityType === "patient"
          ? `Patient ${cleanName} registered at ${checkpoint}. National ID #${cleanNationalId || "N/A"} is linked and retrievable at Reception.`
          : `${logType === "vehicle" ? "Vehicle" : "Individual"} entry registered at ${checkpoint}.`,
        "Security Entry Logged"
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to save security gate record.", "Database Error");
    }
  };

  // Checkout an entry (mark exit)
  const handleRegisterExit = async (originalLog: SecurityLog) => {
    try {
      // Add a new exit log to track history
      const exitLog: Omit<SecurityLog, "id"> = {
        type: originalLog.type,
        nameOrPlate: originalLog.nameOrPlate,
        entityType: originalLog.entityType,
        direction: "exit",
        checkpoint: originalLog.checkpoint,
        idOrPhone: originalLog.idOrPhone || "",
        timestamp: new Date().toISOString(),
        status: originalLog.status === "flagged" ? "flagged" : "authorized",
        notes: `Exit departure for entry ticket log: ${originalLog.notes || "No notes"}`,
        officerName
      };

      await addDoc(collection(db, "security_logs"), exitLog);

      // Also update original log status to record that it has exited
      await updateDoc(doc(db, "security_logs", originalLog.id), {
        notes: `${originalLog.notes || ""} (EXITED at ${new Date().toLocaleTimeString()})`
      });

      // Automatically close system ticket if entity is patient
      if (originalLog.entityType === "patient") {
        await closeAutoTicket(
          originalLog.idOrPhone || originalLog.nameOrPlate, 
          `Client checked out at gate ${originalLog.checkpoint}. Exit departure verified.`
        );
      }

      toast.info(`Checked out: ${originalLog.nameOrPlate} has departed via ${originalLog.checkpoint}.`, "Exit Verified");
    } catch (err) {
      console.error(err);
      toast.error("Failed to log exit timestamp.", "Exit Error");
    }
  };

  // Find individuals or vehicles that are currently inside (logged as 'entry' but have no corresponding 'exit' with same identity)
  const getEntitiesInside = () => {
    const entryMap = new Map<string, SecurityLog>();
    const exitedSet = new Set<string>();

    // Sort ascending to process historical entries first
    const chronologicalLogs = [...logs].reverse();

    for (const log of chronologicalLogs) {
      const key = `${log.type}-${log.nameOrPlate.toUpperCase()}`;
      if (log.direction === "entry") {
        entryMap.set(key, log);
      } else if (log.direction === "exit") {
        exitedSet.add(key);
        entryMap.delete(key); // Remove if they exited
      }
    }

    return Array.from(entryMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const entitiesInside = getEntitiesInside();

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.nameOrPlate.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (log.idOrPhone && log.idOrPhone.includes(searchQuery)) ||
                          (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCheckpoint = checkpointFilter === "all" || log.checkpoint === checkpointFilter;
    const matchesType = typeFilter === "all" || log.type === typeFilter;
    return matchesSearch && matchesCheckpoint && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Security Threat Banner / Top Panel */}
      <div className={`rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl transition-all duration-300 ${
        lockdown ? "bg-red-950 text-red-100 ring-4 ring-red-600 animate-pulse" : "bg-slate-900 text-white"
      }`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Shield className="w-48 h-48 text-emerald-400" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className={`px-3 py-1 text-[10px] font-extrabold tracking-widest uppercase rounded-full ${
              lockdown ? "bg-red-500 text-white animate-bounce" : "bg-emerald-500/10 text-emerald-400"
            }`}>
              {lockdown ? "EMERGENCY STATE: LOCKED DOWN" : "Active Security Checkpoint"}
            </span>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Shield className={`w-7 h-7 ${lockdown ? "text-red-500" : "text-emerald-500"}`} />
              <span>Smart Security Gate Control</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-xl">
              Log entries & departures of staff, visitors, patients, and delivery vehicles. Manage blacklists, flag suspect plates, and deploy facility lockdowns in real-time.
            </p>
          </div>
          
          <div className="flex gap-2.5 items-center">
            {/* Lockdown Toggle Button */}
            <button
              id="btn-trigger-lockdown"
              onClick={async () => {
                if (!lockdown) {
                  const confirmed = await modernConfirm(
                    "Initiate immediate facility lockdown? All security checkpoints will restrict gates and disable routine entrance registration.",
                    {
                      title: "CONFIRM FACILITY LOCKDOWN",
                      type: "error",
                      destructive: true,
                      confirmText: "Initiate Lockdown",
                      cancelText: "Cancel",
                      badgeText: "EMERGENCY PROTOCOL",
                    }
                  );
                  if (confirmed) {
                    setLockdown(true);
                    toast.error("EMERGENCY: Facility locked down! All terminal entrance forms disabled.", "Lockdown Active");
                  }
                } else {
                  setLockdown(false);
                  toast.success("Lockdown lifted. Normal security gate access resumed.", "All Clear");
                }
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                lockdown 
                  ? "bg-red-600 hover:bg-red-700 text-white animate-bounce shadow-red-600/35" 
                  : "bg-slate-800 hover:bg-slate-750 text-red-400 border border-red-900/40"
              }`}
            >
              {lockdown ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>LIFT LOCKDOWN</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>DEPLOY LOCKDOWN</span>
                </>
              )}
            </button>
            
            {/* Nav Tabs */}
            <div className="bg-slate-850 p-1 rounded-xl flex gap-1 border border-slate-850">
              <button
                id="btn-sec-tab-reg"
                onClick={() => setActiveTab("register")}
                className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-lg cursor-pointer ${
                  activeTab === "register" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Log Pass
              </button>
              <button
                id="btn-sec-tab-inside"
                onClick={() => setActiveTab("inside")}
                className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-lg relative cursor-pointer ${
                  activeTab === "inside" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Active On-Site
                {entitiesInside.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-600 text-white font-mono text-[8px] rounded-full">
                    {entitiesInside.length}
                  </span>
                )}
              </button>
              <button
                id="btn-sec-tab-hist"
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-lg cursor-pointer ${
                  activeTab === "history" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Audit Trails
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Currently On-Site</span>
            <span className="text-2xl font-black text-gray-950 mt-1 block">{entitiesInside.length}</span>
            <span className="text-[10px] text-gray-500 mt-1 block">Vehicles & Individuals registered</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Today's Gate Operations</span>
            <span className="text-2xl font-black text-gray-950 mt-1 block">
              {logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
            </span>
            <span className="text-[10px] text-gray-500 mt-1 block">Total checkpoints scanned</span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Suspicious Flags Triaged</span>
            <span className="text-2xl font-black text-red-600 mt-1 block">
              {logs.filter(l => l.status === "flagged" || l.status === "denied").length}
            </span>
            <span className="text-[10px] text-red-500 font-semibold block mt-1">Plate / ID Blacklist Hits</span>
          </div>
          <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Primary Officer On Duty</span>
            <span className="text-lg font-black text-slate-800 mt-1 block">{officerName}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">● Central Command Connected</span>
          </div>
          <div className="p-3 bg-slate-50 border border-gray-100 rounded-2xl text-slate-600">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {activeTab === "register" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Gate Pass Entry Form (LHS) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
                <h3 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>Register Gate Pass</span>
                </h3>

                {/* Log Type Selector */}
                <div className="bg-slate-100 p-1 rounded-lg flex gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLogType("individual")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                      logType === "individual" ? "bg-white text-gray-900 shadow-3xs" : "text-gray-500"
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>Individual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogType("vehicle")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                      logType === "vehicle" ? "bg-white text-gray-900 shadow-3xs" : "text-gray-500"
                    }`}
                  >
                    <Car className="w-3 h-3" />
                    <span>Vehicle</span>
                  </button>
                </div>
              </div>

              {lockdown ? (
                <div className="p-6 border border-dashed border-red-300 bg-red-50 text-red-950 rounded-2xl flex flex-col items-center text-center">
                  <ShieldAlert className="w-12 h-12 text-red-600 animate-bounce mb-2" />
                  <p className="font-extrabold text-sm">GATE TERMINALS LOCKED DOWN</p>
                  <p className="text-[11px] mt-1 max-w-xs">All manual entries are suspended. Lift lockdown state above to resume registering passes.</p>
                </div>
              ) : (
                <form onSubmit={handleRegisterEntry} className="space-y-4 text-xs font-semibold">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-gray-600 block">Checkpoint Gate</label>
                      <select
                        value={checkpoint}
                        onChange={(e) => setCheckpoint(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-xl focus:outline-hidden text-gray-800"
                      >
                        <option value="Main Gate">Main Gate (Vehicles)</option>
                        <option value="Reception Desk">Reception Desk (Walk-in)</option>
                        <option value="Emergency Gate">Emergency Gate (Ambulances)</option>
                        <option value="Staff Gate">Staff Gate</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-600 block">Duty Officer Name</label>
                      <input
                        type="text"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-xl focus:outline-hidden text-gray-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-600 block">
                      {logType === "vehicle" ? "Vehicle Plate Number (e.g., KCA 482B) *" : "Full Name / Contractor Org *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={nameOrPlate}
                      onChange={(e) => setNameOrPlate(e.target.value)}
                      placeholder={logType === "vehicle" ? "e.g. KCA 666X" : "e.g. Emily Chemutai"}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-hidden focus:border-emerald-500 text-sm font-bold placeholder-gray-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-gray-600 block">Entity Classification</label>
                      <select
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value as SecurityLog["entityType"])}
                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-xl focus:outline-hidden text-gray-800"
                      >
                        <option value="patient">Patient (Casualty/OPD)</option>
                        <option value="visitor">Visitor / Relative</option>
                        <option value="staff">Staff Personnel</option>
                        <option value="contractor">Technical Contractor</option>
                        <option value="delivery">Logistics / Delivery</option>
                        <option value="other">Other / Unknown</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-600 block">
                        {logType === "vehicle" ? "Driver Phone Number *" : "National ID / Phone No. *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={idOrPhone}
                        onChange={(e) => setIdOrPhone(e.target.value)}
                        placeholder="e.g. 34882910"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-hidden focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-600 block">Destination Details & Security Notes</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Ward 3 visitor pass, supply drop off, generator maintenance..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-hidden focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Authorize Entry & Issue Gate Pass</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick Security Advisory & Watchlists (RHS) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-extrabold text-red-700 uppercase tracking-wide flex items-center gap-2">
                  <ShieldAlert className="w-4.5 h-4.5" />
                  <span>Security Threat & Watchlist Registry ({watchlists.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddWatchlist(!showAddWatchlist)}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddWatchlist ? "Cancel" : "Add Flagged Target"}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">
                Real-time Firestore Threat Registry. Any gate entry matching these coordinates automatically flags security logs and alerts officers.
              </p>

              {/* Add Flagged Item Form */}
              {showAddWatchlist && (
                <form onSubmit={handleAddWatchlistItem} className="mb-4 p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-red-900">Add New Flagged Record</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-1">Target Type</label>
                      <select
                        value={newWatchType}
                        onChange={(e) => setNewWatchType(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="vehicle">Vehicle Plate</option>
                        <option value="individual">National ID / Passport</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-1">
                        {newWatchType === "vehicle" ? "Plate (e.g. KCA 123A)" : "ID No. (e.g. 23456789)"}
                      </label>
                      <input
                        type="text"
                        required
                        value={newWatchIdentifier}
                        onChange={(e) => setNewWatchIdentifier(e.target.value)}
                        placeholder={newWatchType === "vehicle" ? "KCA 999X" : "28472910"}
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-1">Threat Severity</label>
                      <select
                        value={newWatchSeverity}
                        onChange={(e) => setNewWatchSeverity(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="critical">Critical (Deny Gate Pass)</option>
                        <option value="warning">Warning (Alert Guard Only)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Threat Reason / Note</label>
                    <input
                      type="text"
                      value={newWatchReason}
                      onChange={(e) => setNewWatchReason(e.target.value)}
                      placeholder="e.g. Suspected pharmaceutical theft or unauthorized entry"
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWatchlist(false)}
                      className="px-3 py-1 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                    >
                      Save to Watchlist
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider block">
                    Flagged Vehicle Plates ({watchlists.filter(w => w.type === "vehicle").length})
                  </span>
                  {watchlists.filter(w => w.type === "vehicle").length === 0 ? (
                    <p className="text-[11px] text-gray-400 font-normal italic">No vehicle plates currently flagged.</p>
                  ) : (
                    <ul className="space-y-1.5 font-mono text-gray-700 text-[11px]">
                      {watchlists.filter(w => w.type === "vehicle").map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-1.5 text-red-900 font-bold p-1 bg-white/70 rounded border border-red-100">
                          <div className="flex items-center gap-1.5 truncate">
                            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span className="truncate">{item.identifier}</span>
                            <span className="text-[9px] text-gray-500 font-sans font-normal truncate">({item.reason})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteWatchlistItem(item.id)}
                            className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider block">
                    Flagged National IDs ({watchlists.filter(w => w.type === "individual").length})
                  </span>
                  {watchlists.filter(w => w.type === "individual").length === 0 ? (
                    <p className="text-[11px] text-gray-400 font-normal italic">No individual IDs currently flagged.</p>
                  ) : (
                    <ul className="space-y-1.5 font-mono text-gray-700 text-[11px]">
                      {watchlists.filter(w => w.type === "individual").map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-1.5 text-red-900 font-bold p-1 bg-white/70 rounded border border-red-100">
                          <div className="flex items-center gap-1.5 truncate">
                            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span className="truncate">ID: {item.identifier}</span>
                            <span className="text-[9px] text-gray-500 font-sans font-normal truncate">({item.reason})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteWatchlistItem(item.id)}
                            className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-5 p-4 border border-gray-150 rounded-xl bg-slate-50 flex items-start gap-3 text-xs text-gray-600 font-medium">
                <Activity className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-extrabold text-gray-800">MoH Digital Security Standards</p>
                  <p className="text-[11px]">Under GOK regulations for Healthcare Infrastructure Protection Act, security personnel must record national IDs for physical entries, verify ambulance codes, and reconcile vehicle exit passes to prevent drug theft.</p>
                </div>
              </div>
            </div>

            {/* Recent Gate Pass Feed */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs space-y-4">
              <h3 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide">Live Checkpoint Feeds</h3>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {logs.slice(0, 4).map((log) => (
                  <div key={log.id} className="p-3 border border-gray-100 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${
                        log.direction === "entry" 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                          : "bg-blue-50 border-blue-100 text-blue-600"
                      }`}>
                        {log.direction === "entry" ? <LogIn className="w-4.5 h-4.5" /> : <LogOut className="w-4.5 h-4.5" />}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 flex items-center gap-1.5">
                          <span>{log.nameOrPlate}</span>
                          <span className={`text-[8px] px-1.5 py-0.25 font-extrabold uppercase rounded-full ${
                            log.status === "flagged" ? "bg-amber-100 text-amber-800" :
                            log.status === "denied" ? "bg-red-100 text-red-800" : "bg-emerald-50 text-emerald-800"
                          }`}>{log.status}</span>
                        </p>
                        <p className="text-[10px] text-gray-500 capitalize">{log.entityType} • {log.checkpoint} • Officer {log.officerName.split(" ")[1]}</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono font-bold text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "inside" ? (
        /* Entities currently inside the hospital gate */
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs">
          <div className="border-b border-gray-100 pb-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide">On-Site Real-Time Presence Register</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Below is the roster of individuals and vehicles that have registered entry and have not been cleared for departure.</p>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold border border-amber-150 rounded-full">
              {entitiesInside.length} active pass sessions in progress
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Identity Name / Plate</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 font-mono">ID / Phone</th>
                  <th className="p-3">Scan Checkpoint</th>
                  <th className="p-3">Logged Entry Time</th>
                  <th className="p-3">Security Notes</th>
                  <th className="p-3 text-right">Clear Exit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {entitiesInside.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/40 font-semibold">
                    <td className="p-3 flex items-center gap-2">
                      {log.type === "vehicle" ? (
                        <Car className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Users className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="font-extrabold text-gray-950">{log.nameOrPlate}</span>
                    </td>
                    <td className="p-3 capitalize text-gray-600 text-[10px]">{log.entityType}</td>
                    <td className="p-3 font-mono text-gray-500">{log.idOrPhone || "N/A"}</td>
                    <td className="p-3 text-gray-700">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{log.checkpoint}</span>
                      </span>
                    </td>
                    <td className="p-3 font-mono text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3 text-gray-500 font-medium max-w-xs truncate" title={log.notes}>{log.notes || "—"}</td>
                    <td className="p-3 text-right">
                      <button
                        id={`btn-clear-exit-${log.id}`}
                        onClick={() => handleRegisterExit(log)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Log Exit</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {entitiesInside.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                      Zero vehicles or individuals currently registered on-site. Command centers cleared.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Full Historical Log Trails */
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide">Historical Security Registry Audit Trail</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Archived physical access logs compliant with National ODPC guidelines for medical premises.</p>
            </div>

            {/* Filters bar */}
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 border border-gray-200 bg-gray-50 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 font-medium w-44"
                />
              </div>

              <select
                value={checkpointFilter}
                onChange={(e) => setCheckpointFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-xl text-xs font-semibold focus:outline-hidden text-gray-700"
              >
                <option value="all">All Gates</option>
                <option value="Main Gate">Main Gate</option>
                <option value="Reception Desk">Reception Desk</option>
                <option value="Emergency Gate">Emergency Gate</option>
                <option value="Staff Gate">Staff Gate</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-xl text-xs font-semibold focus:outline-hidden text-gray-700"
              >
                <option value="all">All Types</option>
                <option value="individual">Individuals</option>
                <option value="vehicle">Vehicles</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Scanned Entity</th>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Checkpoint Location</th>
                  <th className="p-3 font-mono">Date & Time</th>
                  <th className="p-3">Verified ID / Contact</th>
                  <th className="p-3">Officer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Security Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/40">
                    <td className="p-3 font-extrabold text-gray-950 flex items-center gap-2">
                      {log.type === "vehicle" ? <Car className="w-4 h-4 text-slate-500" /> : <Users className="w-4 h-4 text-slate-500" />}
                      <span>{log.nameOrPlate}</span>
                      <span className="text-[10px] text-gray-400 capitalize">({log.entityType})</span>
                    </td>
                    <td className="p-3 font-bold text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black inline-flex items-center gap-1 ${
                        log.direction === "entry" 
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-150" 
                          : "bg-blue-50 text-blue-800 border border-blue-150"
                      }`}>
                        {log.direction === "entry" ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                        <span>{log.direction}</span>
                      </span>
                    </td>
                    <td className="p-3 text-gray-700 font-medium">{log.checkpoint}</td>
                    <td className="p-3 font-mono text-gray-500 font-semibold">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-mono text-gray-600">{log.idOrPhone || "—"}</td>
                    <td className="p-3 font-mono font-bold text-gray-600">{log.officerName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        log.status === "authorized" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" :
                        log.status === "flagged" ? "bg-amber-50 text-amber-700 border border-amber-150 animate-pulse" :
                        "bg-red-50 text-red-700 border border-red-150"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 font-medium max-w-xs" title={log.notes}>{log.notes || "No extra security remarks registered."}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-400 italic">
                      No matching historical logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

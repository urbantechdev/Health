import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, addDoc, updateDoc } from "firebase/firestore";
import { SecurityLog } from "../types";
import { createAutoTicket, closeAutoTicket } from "../lib/ticketService";
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
  Plus
} from "lucide-react";

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

  // Alert/Flag list (e.g., suspicious vehicles or VIP patients)
  const blacklistPlates = ["KCA 666X", "KBZ 911F", "KDN 007A"];
  const blacklistIds = ["22334455", "99887766"];

  useEffect(() => {
    // Listen to live security checkpoint logs
    const unsub = onSnapshot(collection(db, "security_logs"), (snapshot) => {
      const records: SecurityLog[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as SecurityLog);
      });
      // Sort logs by timestamp descending
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(records);

      // Seed if empty
      if (snapshot.empty) {
        seedSecurityLogs();
      }
    });

    return () => unsub();
  }, []);

  const seedSecurityLogs = async () => {
    const initialLogs: Omit<SecurityLog, "id">[] = [
      {
        type: "vehicle",
        nameOrPlate: "KCA 482B",
        entityType: "staff",
        direction: "entry",
        checkpoint: "Main Gate",
        idOrPhone: "0711002233",
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
        status: "authorized",
        notes: "Dr. Omondi personal vehicle entry",
        officerName: "Officer Kipkorir"
      },
      {
        type: "individual",
        nameOrPlate: "Emily Chemutai",
        entityType: "visitor",
        direction: "entry",
        checkpoint: "Reception Desk",
        idOrPhone: "34882910",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        status: "authorized",
        notes: "Visiting patient Alice Wambui in Ward 2",
        officerName: "Officer Wanjala"
      },
      {
        type: "vehicle",
        nameOrPlate: "KBC 904A",
        entityType: "delivery",
        direction: "entry",
        checkpoint: "Emergency Gate",
        idOrPhone: "0722334455",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        status: "authorized",
        notes: "Medical oxygen cylinder delivery from KEMSA",
        officerName: "Officer Kipkorir"
      }
    ];

    for (const log of initialLogs) {
      await addDoc(collection(db, "security_logs"), log);
    }
  };

  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockdown) {
      alert("ALERT: Facility is currently in LOCKDOWN. All entries are restricted until authorized by administration!");
      return;
    }

    if (!nameOrPlate) {
      alert("Please fill in the Name or License Plate number.");
      return;
    }

    // Check Blacklist / Suspect database triggers
    let status: SecurityLog["status"] = "authorized";
    let customNotes = notes;

    if (logType === "vehicle" && blacklistPlates.includes(nameOrPlate.toUpperCase())) {
      status = "flagged";
      customNotes = `[FLAGGED SUSPECT] ${notes || "Unscheduled suspect vehicle entry flagged by automated gate sensor"}`;
      alert(`⚠️ SECURITY ALERT! Vehicle plate "${nameOrPlate.toUpperCase()}" is registered on the SUSPECT WATCHLIST! Notification sent to police.`);
    }

    if (logType === "individual" && blacklistIds.includes(idOrPhone)) {
      status = "denied";
      customNotes = `[DENIED GATE PASS] ${notes || "Individual ID matches blacklisted contractor profile"}`;
      alert(`❌ ENTRY DENIED! National ID "${idOrPhone}" is blacklisted from this facility.`);
    }

    try {
      const newLog: Omit<SecurityLog, "id"> = {
        type: logType,
        nameOrPlate: logType === "vehicle" ? nameOrPlate.toUpperCase() : nameOrPlate,
        entityType,
        direction: "entry",
        checkpoint,
        idOrPhone,
        timestamp: new Date().toISOString(),
        status,
        notes: customNotes,
        officerName
      };

      await addDoc(collection(db, "security_logs"), newLog);

      // Auto-trigger system ticket for patient entry
      if (entityType === "patient") {
        await createAutoTicket({
          patientName: nameOrPlate,
          nationalId: idOrPhone || `ID-${Math.floor(100000 + Math.random() * 900000)}`,
          phone: idOrPhone,
          department: "reception",
          visitReason: customNotes || "Hospital Facility Entry & Consultation Intake"
        });
      }
      
      // Reset
      setNameOrPlate("");
      setIdOrPhone("");
      setNotes("");
      alert(`${logType === "vehicle" ? "Vehicle" : "Individual"} Entry logged successfully at ${checkpoint}!`);
    } catch (err) {
      console.error(err);
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

      alert(`Checked out: ${originalLog.nameOrPlate} has successfully exited through ${originalLog.checkpoint}.`);
    } catch (err) {
      console.error(err);
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
              onClick={() => {
                setLockdown(!lockdown);
                alert(lockdown ? "Lockdown lifted. Normal gates access resumed." : "EMERGENCY: Facility locked down! All terminal entrance forms disabled.");
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
              <h3 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide flex items-center gap-2 mb-3 text-red-700">
                <ShieldAlert className="w-4.5 h-4.5" />
                <span>Automated Watchlist Databases (Static Mock)</span>
              </h3>
              <p className="text-[11px] text-gray-400 mb-4">Any entry attempt matching these coordinates triggers a silent alarm and immediate gate denial.</p>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider block">Blacklisted Vehicle License Plates</span>
                  <ul className="space-y-1.5 font-mono text-gray-700 text-[11px]">
                    {blacklistPlates.map((plate, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-red-900 font-bold">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>{plate} (Suspicious tracking)</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider block">Banned/Flagged National IDs</span>
                  <ul className="space-y-1.5 font-mono text-gray-700 text-[11px]">
                    {blacklistIds.map((id, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-red-900 font-bold">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>ID: {id} (Theft/Fraud alert)</span>
                      </li>
                    ))}
                  </ul>
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

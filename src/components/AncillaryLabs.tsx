import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, getDocs, query, where, addDoc } from "firebase/firestore";
import { QueueTicket, MedicalRecord, ClinicalVisit } from "../types";
import { findUnifiedPatient, upsertUnifiedPatientRecord } from "../lib/patientSyncService";
import { FlaskConical, Radio, ClipboardCheck, Send, RefreshCw, Eye, CheckCircle2, FlaskRound, Droplets, AlertCircle, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { toast } from "../lib/promptService";

interface AncillaryLabsProps {
  toggles: any;
  onActionCompleted: () => void;
}

export default function AncillaryLabs({ toggles, onActionCompleted }: AncillaryLabsProps) {
  const [labTickets, setLabTickets] = useState<QueueTicket[]>([]);
  const [radTickets, setRadTickets] = useState<QueueTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<QueueTicket | null>(null);
  
  // Results form
  const [testResults, setTestResults] = useState("");
  const [labValues, setLabValues] = useState({
    hemoglobin: "13.5",
    wbc: "7.2",
    platelets: "250",
    malaria: "Negative",
  });
  const [radiologyFinding, setRadiologyFinding] = useState("Lungs are clear. No active infiltration, pleural effusion, or cardiomegaly.");

  // Blood Typing & Immunohematology states
  const [isBloodGroupTested, setIsBloodGroupTested] = useState(true);
  const [aboGroup, setAboGroup] = useState<"O" | "A" | "B" | "AB">("O");
  const [rhFactor, setRhFactor] = useState<"+" | "-">("+");
  const [exactBloodType, setExactBloodType] = useState<string>("O+");
  const [crossmatchStatus, setCrossmatchStatus] = useState("Compatible (No Agglutination)");
  const [updateMasterRecord, setUpdateMasterRecord] = useState(true);
  const [immediateUpdating, setImmediateUpdating] = useState(false);

  // Saving states
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    // Listen to patients for EHR updates
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const pats: MedicalRecord[] = [];
      snapshot.forEach((doc) => {
        pats.push({ id: doc.id, ...doc.data() } as MedicalRecord);
      });
      setPatients(pats);
    });

    // Listen to active Laboratory queue (both pending and serving)
    const qLab = query(collection(db, "queue"), where("currentDepartment", "==", "laboratory"), where("status", "in", ["pending", "serving"]));
    const unsubLab = onSnapshot(qLab, (snapshot) => {
      const tickets: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() } as QueueTicket);
      });
      setLabTickets(tickets);
    });

    // Listen to active Radiology queue (both pending and serving)
    const qRad = query(collection(db, "queue"), where("currentDepartment", "==", "radiology"), where("status", "in", ["pending", "serving"]));
    const unsubRad = onSnapshot(qRad, (snapshot) => {
      const tickets: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() } as QueueTicket);
      });
      setRadTickets(tickets);
    });

    return () => {
      unsubPatients();
      unsubLab();
      unsubRad();
    };
  }, []);

  // When selected ticket changes, synchronize patient blood type info
  const matchedPatient = selectedTicket 
    ? findUnifiedPatient(selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName, patients) 
    : null;

  const handleSelectTicket = (t: QueueTicket) => {
    setSelectedTicket(t);
    setTestResults("");
    
    const p = findUnifiedPatient(t.patientId || t.nationalId || t.patientName, patients);
    if (p) {
      if (p.bloodType && p.bloodType !== "Not Sure" && p.bloodType !== "Unknown") {
        setExactBloodType(p.bloodType);
        if (p.bloodType.startsWith("AB")) {
          setAboGroup("AB");
          setRhFactor(p.bloodType.includes("-") ? "-" : "+");
        } else if (p.bloodType.startsWith("A")) {
          setAboGroup("A");
          setRhFactor(p.bloodType.includes("-") ? "-" : "+");
        } else if (p.bloodType.startsWith("B")) {
          setAboGroup("B");
          setRhFactor(p.bloodType.includes("-") ? "-" : "+");
        } else if (p.bloodType.startsWith("O")) {
          setAboGroup("O");
          setRhFactor(p.bloodType.includes("-") ? "-" : "+");
        }
      } else {
        // Patient's blood type is unconfirmed ("Not Sure")
        setExactBloodType("O+");
        setAboGroup("O");
        setRhFactor("+");
        setUpdateMasterRecord(true);
      }
    }
  };

  const handleAboChange = (newAbo: "O" | "A" | "B" | "AB") => {
    setAboGroup(newAbo);
    setExactBloodType(`${newAbo}${rhFactor}`);
  };

  const handleRhChange = (newRh: "+" | "-") => {
    setRhFactor(newRh);
    setExactBloodType(`${aboGroup}${newRh}`);
  };

  const handlePillSelect = (bType: string) => {
    setExactBloodType(bType);
    if (bType === "Not Sure") return;
    if (bType.startsWith("AB")) {
      setAboGroup("AB");
      setRhFactor(bType.includes("-") ? "-" : "+");
    } else if (bType.startsWith("A")) {
      setAboGroup("A");
      setRhFactor(bType.includes("-") ? "-" : "+");
    } else if (bType.startsWith("B")) {
      setAboGroup("B");
      setRhFactor(bType.includes("-") ? "-" : "+");
    } else if (bType.startsWith("O")) {
      setAboGroup("O");
      setRhFactor(bType.includes("-") ? "-" : "+");
    }
  };

  // Instant direct update of patient's master record from lab findings
  const handleDirectUpdateBloodType = async () => {
    if (!matchedPatient) {
      toast.warning("Patient EHR not found to update.", "Cannot Update");
      return;
    }
    if (exactBloodType === "Not Sure") {
      toast.warning("Please specify the exact confirmed blood group (e.g. O+, A+, B-, etc.) before updating EHR.", "Exact Type Required");
      return;
    }

    setImmediateUpdating(true);
    try {
      // 1. Update patient master record
      const patientRef = doc(db, "patients", matchedPatient.id);
      await updateDoc(patientRef, {
        bloodType: exactBloodType,
        updatedAt: new Date().toISOString()
      });

      // 2. Also update any active inpatient / outpatient encounter
      try {
        const encSnap = await getDocs(
          query(
            collection(db, "encounters"),
            where("patientId", "==", matchedPatient.id),
            where("status", "in", ["ADMITTED", "ACTIVE", "DISCHARGING", "INPATIENT"])
          )
        );
        for (const encDoc of encSnap.docs) {
          await updateDoc(doc(db, "encounters", encDoc.id), {
            bloodType: exactBloodType,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn("Encounter sync error:", err);
      }

      toast.success(
        `Patient blood type verified and updated to ${exactBloodType} in EHR and active hospital encounters!`,
        "EHR Master Record Updated"
      );
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update patient blood type: " + (error?.message || "Unknown error"));
    } finally {
      setImmediateUpdating(false);
    }
  };

  const handleTransmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) {
      toast.warning("Please select a diagnostic queue patient.", "Patient Required");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Locate patient EHR using unified matcher
      const matched = matchedPatient || findUnifiedPatient(selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName, patients);
      const type = selectedTicket.currentDepartment;
      
      let bloodSummary = "";
      if (type === "laboratory" && isBloodGroupTested) {
        bloodSummary = ` • Immunohematology: Blood Group ${exactBloodType} (ABO: ${aboGroup}, Rh: ${rhFactor === "+" ? "Positive (+ve)" : "Negative (-ve)"}, Crossmatch: ${crossmatchStatus})`;
      }

      const compileResults = type === "laboratory" 
        ? `HB: ${labValues.hemoglobin} g/dL, WBC: ${labValues.wbc} x10^9/L, Platelets: ${labValues.platelets} x10^9/L, Malaria: ${labValues.malaria}${bloodSummary}. Remarks: ${testResults}`
        : `PACS ID: DICOM-RAD-${Date.now().toString().substring(6)} • Description: ${radiologyFinding}. Remarks: ${testResults}`;

      if (matched) {
        const patientRef = doc(db, "patients", matched.id);
        const updatedVisits = [...(matched.visits || [])];

        const patientUpdatePayload: any = {
          updatedAt: new Date().toISOString()
        };

        // If requested, update master bloodType in EHR
        if (type === "laboratory" && updateMasterRecord && exactBloodType !== "Not Sure") {
          patientUpdatePayload.bloodType = exactBloodType;
        }

        if (updatedVisits.length > 0) {
          const lastVisit = updatedVisits[updatedVisits.length - 1];
          const referrals = lastVisit.referrals || [];
          let foundRef = false;

          const updatedReferrals = referrals.map((ref) => {
            if (ref.department === type) {
              foundRef = true;
              return {
                ...ref,
                status: "completed" as const,
                results: compileResults,
              };
            }
            return ref;
          });

          if (!foundRef) {
            updatedReferrals.push({
              id: `ref-${Date.now()}`,
              department: type,
              testName: type === "laboratory" ? "Comprehensive Blood Panel & Immunohematology" : "Radiology Chest / Abdominal X-Ray",
              notes: testResults || "Diagnostic test completed",
              status: "completed" as const,
              results: compileResults,
            });
          }

          lastVisit.referrals = updatedReferrals;
          patientUpdatePayload.visits = updatedVisits;
          await updateDoc(patientRef, patientUpdatePayload);
        } else {
          // Add first visit with referral results
          patientUpdatePayload.visits = [{
            id: `vst-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            vitals: { temp: "37.0", bp: "120/80", pulse: "75", weight: "70" },
            symptoms: "Diagnostic referral",
            diagnosis: "Under evaluation",
            prescriptions: [],
            referrals: [{
              id: `ref-${Date.now()}`,
              department: type,
              testName: type === "laboratory" ? "Lab Diagnostic Panel & Blood Typing" : "Radiology Imaging",
              notes: testResults,
              status: "completed" as const,
              results: compileResults,
            }]
          }];
          await updateDoc(patientRef, patientUpdatePayload);
        }

        // Also sync any active encounter
        if (type === "laboratory" && updateMasterRecord && exactBloodType !== "Not Sure") {
          try {
            const encSnap = await getDocs(
              query(
                collection(db, "encounters"),
                where("patientId", "==", matched.id),
                where("status", "in", ["ADMITTED", "ACTIVE", "DISCHARGING", "INPATIENT"])
              )
            );
            for (const encDoc of encSnap.docs) {
              await updateDoc(doc(db, "encounters", encDoc.id), {
                bloodType: exactBloodType,
                updatedAt: new Date().toISOString()
              });
            }
          } catch (err) {
            console.warn("Active encounter blood type sync error:", err);
          }
        }
      }

      // 2. Automated routing: Return patient to doctor desk with Results Ready metadata (Kenyan 2-Phase Loop)
      const baseNum = selectedTicket.ticketNo.includes("-") ? selectedTicket.ticketNo.split("-")[1] : Math.floor(100 + Math.random() * 900);
      const newTicketNo = `REV-${baseNum}`;
      await updateDoc(doc(db, "queue", selectedTicket.id), {
        currentDepartment: "doctor", // route back to Doctor's queue
        ticketNo: newTicketNo,
        status: "pending",
        isResultsReview: true,
        resultsReady: true,
        labSummary: compileResults,
        service: "Doctor Results Review",
        notes: `🔬 Diagnostic results ready for Doctor Review (No double consultation charge). ${selectedTicket.currentDepartment === "laboratory" ? `Lab LIS values & Blood Type [${exactBloodType}]` : "Radiology PACS findings"} posted.`,
      });

      setSelectedTicket(null);
      setTestResults("");
      toast.success(
        "Diagnostic results electronically transmitted! Blood type and panel findings updated in EHR.",
        "Results Dispatched"
      );
      onActionCompleted();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const isPatientBloodUnconfirmed = !matchedPatient?.bloodType || matchedPatient.bloodType === "Not Sure" || matchedPatient.bloodType === "Unknown";

  return (
    <div id="ancillary-labs" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <FlaskRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ancillary Diagnostics Counter</h2>
            <p className="text-xs text-gray-500">Laboratory LIS, Blood Grouping/Immunohematology & DICOM/PACS transmittal</p>
          </div>
        </div>

        {/* Selected Intake Ticket */}
        <div className="flex flex-wrap gap-2">
          {toggles.laboratory && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500">Active Lab Queue:</span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-150 rounded-full text-xs font-black">
                {labTickets.length} pending
              </span>
            </div>
          )}
          {toggles.radiology && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs font-bold text-gray-500">Active Rad Queue:</span>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-150 rounded-full text-xs font-black">
                {radTickets.length} pending
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waiting Desk queue pulls */}
        <div className="lg:col-span-4 space-y-4 lg:border-r border-gray-100 pr-0 lg:pr-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Select Patient to Begin Testing</h3>
          
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {/* Laboratory List */}
            {toggles.laboratory && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Lab Intake Requests ({labTickets.length})</span>
                </p>
                {labTickets.length === 0 ? (
                  <p className="text-[11px] text-gray-400 bg-gray-50 p-2.5 rounded-xl border border-dashed border-gray-150 text-center">No active lab requests</p>
                ) : (
                  labTickets.map((t) => {
                    const pat = findUnifiedPatient(t.patientId || t.nationalId || t.patientName, patients);
                    const isUnsure = !pat?.bloodType || pat.bloodType === "Not Sure" || pat.bloodType === "Unknown";
                    return (
                      <button
                        key={t.id}
                        id={`btn-lab-pull-${t.id}`}
                        onClick={() => handleSelectTicket(t)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                          selectedTicket?.id === t.id
                            ? "border-blue-500 bg-blue-50/30 text-blue-900 shadow-xs"
                            : "border-gray-100 hover:border-gray-200 bg-white"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-xs">{t.ticketNo}</p>
                            {isUnsure && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded border border-amber-300">
                                Blood: Not Sure
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500">{t.patientName}</p>
                        </div>
                        <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Pull File</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Radiology List */}
            {toggles.radiology && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-purple-500 uppercase flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Radiology Intake Requests ({radTickets.length})</span>
                </p>
                {radTickets.length === 0 ? (
                  <p className="text-[11px] text-gray-400 bg-gray-50 p-2.5 rounded-xl border border-dashed border-gray-150 text-center">No active radiology requests</p>
                ) : (
                  radTickets.map((t) => (
                    <button
                      key={t.id}
                      id={`btn-rad-pull-${t.id}`}
                      onClick={() => handleSelectTicket(t)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedTicket?.id === t.id
                          ? "border-purple-500 bg-purple-50/30 text-purple-900 shadow-xs"
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs">{t.ticketNo}</p>
                        <p className="text-[10px] text-gray-500">{t.patientName}</p>
                      </div>
                      <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold uppercase">Pull File</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Entry Form */}
        <div className="lg:col-span-8">
          {selectedTicket ? (
            <form onSubmit={handleTransmitResults} className="space-y-5">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Working active record</span>
                  <span>Ticket Ref: {selectedTicket.ticketNo}</span>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-gray-900">{selectedTicket.patientName}</h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500">Current Blood Group:</span>
                    {isPatientBloodUnconfirmed ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-black flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        Not Sure (Unconfirmed)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-200 rounded-md text-[10px] font-black">
                        {matchedPatient?.bloodType}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-600">ID: {selectedTicket.nationalId} • Department: <span className="capitalize font-bold text-emerald-700">{selectedTicket.currentDepartment}</span></p>
                {selectedTicket.notes && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100 mt-1">
                    <strong>Doctor Notes:</strong> {selectedTicket.notes}
                  </p>
                )}
              </div>

              {selectedTicket.currentDepartment === "laboratory" ? (
                /* LAB WORK SHEET */
                <div className="space-y-4">
                  {/* 1. General Hematology & CBC Panel */}
                  <div className="p-4 border border-blue-100 rounded-xl bg-blue-50/10 space-y-4">
                    <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-blue-500" />
                      <span>1. Hematology & CBC Diagnostic Values</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Hemoglobin (g/dL)</label>
                        <input
                          id="input-lab-hb"
                          type="text"
                          value={labValues.hemoglobin}
                          onChange={(e) => setLabValues({ ...labValues, hemoglobin: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">WBC Count (x10^9/L)</label>
                        <input
                          id="input-lab-wbc"
                          type="text"
                          value={labValues.wbc}
                          onChange={(e) => setLabValues({ ...labValues, wbc: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Platelets (x10^9/L)</label>
                        <input
                          id="input-lab-platelets"
                          type="text"
                          value={labValues.platelets}
                          onChange={(e) => setLabValues({ ...labValues, platelets: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Malaria Rapid (RDT)</label>
                        <select
                          id="select-lab-malaria"
                          value={labValues.malaria}
                          onChange={(e) => setLabValues({ ...labValues, malaria: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                        >
                          <option>Negative</option>
                          <option>Positive (Plasmodium Falciparum)</option>
                          <option>Borderline</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2. DEDICATED BLOOD GROUPING & EXACT BLOOD TYPE FINDINGS SECTION */}
                  <div className="p-4 border-2 border-rose-200/90 rounded-2xl bg-rose-50/20 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-600 text-white rounded-lg shadow-xs">
                          <Droplets className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                            <span>2. Immunohematology: Blood Grouping & Rh Typing</span>
                          </h4>
                          <p className="text-[11px] text-rose-700">
                            Confirm and update exact ABO/Rh blood type from laboratory bench analysis
                          </p>
                        </div>
                      </div>

                      {isPatientBloodUnconfirmed ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-xl text-amber-950 text-[10px] font-bold animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          <span>Status: "Not Sure" at Registration — Confirmation Required</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 text-[10px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>EHR Currently Registered: {matchedPatient?.bloodType}</span>
                        </div>
                      )}
                    </div>

                    {/* Bench Serology Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block">
                          ABO Forward Grouping (Anti-A / Anti-B)
                        </label>
                        <select
                          value={aboGroup}
                          onChange={(e) => handleAboChange(e.target.value as any)}
                          className="w-full px-2.5 py-2 border border-rose-200 rounded-xl text-xs bg-white font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                        >
                          <option value="O">Group O (No Agglutination)</option>
                          <option value="A">Group A (Agglutination with Anti-A)</option>
                          <option value="B">Group B (Agglutination with Anti-B)</option>
                          <option value="AB">Group AB (Anti-A & Anti-B Agglutination)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block">
                          Rh(D) Antigen Testing
                        </label>
                        <select
                          value={rhFactor}
                          onChange={(e) => handleRhChange(e.target.value as any)}
                          className="w-full px-2.5 py-2 border border-rose-200 rounded-xl text-xs bg-white font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                        >
                          <option value="+">Rh Positive (+ve / D-Antigen Present)</option>
                          <option value="-">Rh Negative (-ve / D-Antigen Absent)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block">
                          Compatibility / Crossmatch Screen
                        </label>
                        <select
                          value={crossmatchStatus}
                          onChange={(e) => setCrossmatchStatus(e.target.value)}
                          className="w-full px-2.5 py-2 border border-rose-200 rounded-xl text-xs bg-white font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
                        >
                          <option value="Compatible (No Agglutination)">Compatible (No Agglutination)</option>
                          <option value="Crossmatch Not Requested / Routine Grouping">Not Requested / Routine Typing</option>
                          <option value="Antibody Screen Positive (Coombs Pending)">Antibody Screen (+ve) Coombs Req.</option>
                        </select>
                      </div>
                    </div>

                    {/* Exact Blood Type Selector Grid */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-rose-900 uppercase tracking-wider">
                          Exact Resulting Blood Group to Stamp into Record:
                        </label>
                        <span className="text-[11px] font-bold text-rose-700">
                          Selected Finding: <strong className="text-sm font-black text-rose-900 bg-white px-2 py-0.5 rounded-lg border border-rose-300">{exactBloodType}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => handlePillSelect(b)}
                            className={`py-2 px-2 rounded-xl text-xs font-black text-center transition-all cursor-pointer border ${
                              exactBloodType === b
                                ? "bg-rose-600 text-white border-rose-700 shadow-sm scale-105"
                                : "bg-white text-slate-800 border-slate-200 hover:border-rose-300 hover:bg-rose-50"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sync Controls & Immediate Update Button */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-rose-100 bg-white/70 p-3 rounded-xl">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={updateMasterRecord}
                          onChange={(e) => setUpdateMasterRecord(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                        />
                        <span>Automatically update patient's permanent EHR & active encounter with verified blood group</span>
                      </label>

                      {matchedPatient && (
                        <button
                          type="button"
                          onClick={handleDirectUpdateBloodType}
                          disabled={immediateUpdating || exactBloodType === "Not Sure"}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                          <span>{immediateUpdating ? "Committing..." : `Commit [${exactBloodType}] to EHR Now`}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* RADIOLOGY DICOM WORK SHEET */
                <div className="p-4 border border-purple-100 rounded-xl bg-purple-50/5 space-y-4">
                  <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-purple-500" />
                    <span>Radiology DICOM / PACS Imaging Report Metadata</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">PACS Image Text / Diagnosis finding</label>
                    <textarea
                      id="input-rad-findings"
                      rows={3}
                      value={radiologyFinding}
                      onChange={(e) => setRadiologyFinding(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* General Tech Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Technician Remarks & Recommendations</label>
                <textarea
                  id="input-tech-remarks"
                  rows={2}
                  placeholder="Enter remarks, specific sample states, cold chain or calibration alerts..."
                  value={testResults}
                  onChange={(e) => setTestResults(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Submit Transmit Button */}
              <button
                id="btn-transmit-results"
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-700/15"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting
                    ? "Signing & Transmitting via HL7..."
                    : `Transmit Results & Sync Blood Type [${selectedTicket.currentDepartment === "laboratory" ? exactBloodType : "EHR"}] to Doctor`}
                </span>
              </button>
            </form>
          ) : (
            <div className="h-full min-h-[350px] border border-dashed border-gray-200 bg-gray-50/20 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <ClipboardCheck className="w-12 h-12 mb-2 text-gray-300 opacity-50" />
              <h3 className="text-sm font-bold text-gray-800">Diagnostics Desk Idle</h3>
              <p className="text-xs max-w-xs mt-1">
                Please select an active Lab or Radiology intake ticket from the queue list on the left to begin compiling procedure results and verifying blood type.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

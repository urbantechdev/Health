import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, getDocs, query, where, addDoc } from "firebase/firestore";
import { QueueTicket, MedicalRecord, ClinicalVisit } from "../types";
import { findUnifiedPatient, upsertUnifiedPatientRecord } from "../lib/patientSyncService";
import { FlaskConical, Radio, ClipboardCheck, Send, RefreshCw, Eye, CheckCircle2, FlaskRound } from "lucide-react";
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

  const handleTransmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) {
      toast.warning("Please select a diagnostic queue patient.", "Patient Required");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Locate patient EHR using unified matcher
      const matchedPatient = findUnifiedPatient(selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName, patients);
      const type = selectedTicket.currentDepartment;
      const compileResults = type === "laboratory" 
        ? `HB: ${labValues.hemoglobin} g/dL, WBC: ${labValues.wbc} x10^9/L, Platelets: ${labValues.platelets} x10^9/L, Malaria: ${labValues.malaria}. Remarks: ${testResults}`
        : `PACS ID: DICOM-RAD-${Date.now().toString().substring(6)} • Description: ${radiologyFinding}. Remarks: ${testResults}`;

      if (matchedPatient) {
        const patientRef = doc(db, "patients", matchedPatient.id);
        const updatedVisits = [...matchedPatient.visits];

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
              testName: type === "laboratory" ? "Comprehensive Blood Panel & Malaria Smear" : "Radiology Chest / Abdominal X-Ray",
              notes: testResults || "Diagnostic test completed",
              status: "completed" as const,
              results: compileResults,
            });
          }

          lastVisit.referrals = updatedReferrals;
          await updateDoc(patientRef, { visits: updatedVisits, updatedAt: new Date().toISOString() });
        } else {
          // Add first visit with referral results
          await updateDoc(patientRef, {
            visits: [{
              id: `vst-${Date.now()}`,
              date: new Date().toISOString().split("T")[0],
              vitals: { temp: "37.0", bp: "120/80", pulse: "75", weight: "70" },
              symptoms: "Diagnostic referral",
              diagnosis: "Under evaluation",
              prescriptions: [],
              referrals: [{
                id: `ref-${Date.now()}`,
                department: type,
                testName: type === "laboratory" ? "Lab Diagnostic Panel" : "Radiology Imaging",
                notes: testResults,
                status: "completed" as const,
                results: compileResults,
              }]
            }],
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 2. Automated routing: Return patient to doctor desk or proceed to billing
      const baseNum = selectedTicket.ticketNo.includes("-") ? selectedTicket.ticketNo.split("-")[1] : Math.floor(100 + Math.random() * 900);
      const newTicketNo = `GEN-${baseNum}`;
      await updateDoc(doc(db, "queue", selectedTicket.id), {
        currentDepartment: "doctor", // route back to Doctor's queue
        ticketNo: newTicketNo,
        status: "pending",
        notes: `${selectedTicket.currentDepartment === "laboratory" ? "Lab" : "Radiology"} diagnostic values ready and transmitted to timeline.`,
      });

      setSelectedTicket(null);
      setTestResults("");
      toast.success(
        "Diagnostic results electronically transmitted! Patient routed back to the Doctor Desk.",
        "Results Dispatched"
      );
      onActionCompleted();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="ancillary-labs" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <FlaskRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ancillary Diagnostics Counter</h2>
            <p className="text-xs text-gray-500">Laboratory LIS and DICOM/PACS Radiology reports transmittal</p>
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
          
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
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
                  labTickets.map((t) => (
                    <button
                      key={t.id}
                      id={`btn-lab-pull-${t.id}`}
                      onClick={() => {
                        setSelectedTicket(t);
                        setTestResults("");
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedTicket?.id === t.id
                          ? "border-blue-500 bg-blue-50/30 text-blue-900"
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs">{t.ticketNo}</p>
                        <p className="text-[10px] text-gray-500">{t.patientName}</p>
                      </div>
                      <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold uppercase">Pull File</span>
                    </button>
                  ))
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
                      onClick={() => {
                        setSelectedTicket(t);
                        setTestResults("");
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedTicket?.id === t.id
                          ? "border-purple-500 bg-purple-50/30 text-purple-900"
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
                <h3 className="text-sm font-bold text-gray-900">{selectedTicket.patientName}</h3>
                <p className="text-xs text-gray-600">ID: {selectedTicket.nationalId} • Department: <span className="capitalize font-bold text-emerald-700">{selectedTicket.currentDepartment}</span></p>
                {selectedTicket.notes && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100 mt-1">
                    <strong>Doctor Notes:</strong> {selectedTicket.notes}
                  </p>
                )}
              </div>

              {selectedTicket.currentDepartment === "laboratory" ? (
                /* LAB WORK SHEET */
                <div className="p-4 border border-blue-100 rounded-xl bg-blue-50/5 space-y-4">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-blue-500" />
                    <span>Laboratory Information System (LIS) Entry Form</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Hemoglobin (g/dL)</label>
                      <input
                        id="input-lab-hb"
                        type="text"
                        value={labValues.hemoglobin}
                        onChange={(e) => setLabValues({ ...labValues, hemoglobin: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">WBC Count (x10^9/L)</label>
                      <input
                        id="input-lab-wbc"
                        type="text"
                        value={labValues.wbc}
                        onChange={(e) => setLabValues({ ...labValues, wbc: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Platelets (x10^9/L)</label>
                      <input
                        id="input-lab-platelets"
                        type="text"
                        value={labValues.platelets}
                        onChange={(e) => setLabValues({ ...labValues, platelets: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Malaria Rapid (RDT)</label>
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
                  placeholder="Enter remarks, specific sample states or calibration alerts..."
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
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Signing & Transmitting via HL7..." : "Transmit Diagnostic Results Back to EHR Timeline"}
              </button>
            </form>
          ) : (
            <div className="h-full min-h-[350px] border border-dashed border-gray-200 bg-gray-50/20 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <ClipboardCheck className="w-12 h-12 mb-2 text-gray-300 opacity-50" />
              <h3 className="text-sm font-bold text-gray-800">Diagnostics Desk Idle</h3>
              <p className="text-xs max-w-xs mt-1">
                Please select an active Lab or Radiology intake ticket from the queue list on the left to begin compiling procedure results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

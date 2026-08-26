import React, { useState, useEffect } from "react";
import { db, cleanFirestoreData } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  getDocs,
  where,
  deleteDoc
} from "firebase/firestore";
import { QueueTicket, MedicalRecord, Invoice, Medication, ClinicalVisit } from "../types";
import { findUnifiedPatient } from "../lib/patientSyncService";
import {
  Activity,
  User,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Stethoscope,
  FlaskRound,
  ShoppingCart,
  CreditCard,
  Building,
  Check,
  ChevronRight,
  Heart,
  FileText,
  BadgeAlert,
  Smartphone,
  Fingerprint,
  RotateCw,
  Zap,
  Trash2
} from "lucide-react";

export default function PatientJourneyTracker() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatingStep, setSimulatingStep] = useState<string | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const handleDeleteJourneyTicket = async (ticketId: string, ticketNo?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimistic removal (0ms)
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    if (selectedTicketId === ticketId) {
      setSelectedTicketId(null);
    }
    setSimulationLogs(prev => [`Ticket ${ticketNo || ticketId} removed instantly from queue.`, ...prev.slice(0, 15)]);

    try {
      await deleteDoc(doc(db, "queue", ticketId));
    } catch (err) {
      console.error("Error deleting journey ticket:", err);
    }
  };

  // Load Firestore data
  useEffect(() => {
    // 1. Subscribe to entire Queue Tickets sorted by newest
    const qQueue = query(collection(db, "queue"), orderBy("timestamp", "desc"));
    const unsubQueue = onSnapshot(qQueue, (snapshot) => {
      const ticks: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        ticks.push({ id: doc.id, ...doc.data() } as QueueTicket);
      });
      setTickets(ticks);
      setLoading(false);

      // Auto-select first ticket if none selected
      if (ticks.length > 0 && !selectedTicketId) {
        setSelectedTicketId(ticks[0].id);
      }
    });

    // 2. Subscribe to Patients EHR
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const pats: MedicalRecord[] = [];
      snapshot.forEach((doc) => {
        pats.push({ id: doc.id, ...doc.data() } as MedicalRecord);
      });
      setPatients(pats);
    });

    // 3. Subscribe to Invoices
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
      const invs: Invoice[] = [];
      snapshot.forEach((doc) => {
        invs.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(invs);
    });

    // 4. Subscribe to Medications
    const unsubMeds = onSnapshot(collection(db, "medications"), (snapshot) => {
      const meds: Medication[] = [];
      snapshot.forEach((doc) => {
        meds.push({ id: doc.id, ...doc.data() } as Medication);
      });
      setMedications(meds);
    });

    return () => {
      unsubQueue();
      unsubPatients();
      unsubInvoices();
      unsubMeds();
    };
  }, []);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const matchedPatient = selectedTicket
    ? findUnifiedPatient(selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName, patients)
    : null;
  const matchedInvoice = selectedTicket
    ? invoices.find((i) => (i.nationalId && selectedTicket.nationalId && i.nationalId === selectedTicket.nationalId) || i.patientName.toLowerCase() === selectedTicket.patientName.toLowerCase() && i.paymentStatus !== "paid") ||
      invoices.filter((i) => (i.nationalId && selectedTicket.nationalId && i.nationalId === selectedTicket.nationalId) || i.patientName.toLowerCase() === selectedTicket.patientName.toLowerCase()).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0]
    : null;

  // Helpers for identifying patient level of service, departments and live icons
  const getDeptLabel = (dept: string) => {
    switch (dept) {
      case "reception":
        return "Reception Intake";
      case "queue":
        return "Live Queue Waiting";
      case "doctor":
        return "Doctor Consultation";
      case "laboratory":
      case "lab":
        return "Laboratory (Lab)";
      case "radiology":
        return "Radiology DICOM Scans";
      case "pharmacy":
        return "Pharmacy Dispensary";
      case "billing":
        return "Billing & eTIMS checkout";
      case "labour_room":
        return "Labour Room (Maternity)";
      case "gyna":
      case "gynaecology":
        return "Gynecology (Gyna)";
      default:
        return dept.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }
  };

  const getStep3Label = (dept: string) => {
    if (dept === "labour_room") return "Labour Room";
    if (dept === "gyna" || dept === "gynaecology") return "Gynecology (Gyna)";
    if (dept === "radiology") return "Radiology";
    if (dept === "laboratory" || dept === "lab") return "Laboratory";
    return dept ? dept.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Diagnostics";
  };

  const getStep3Icon = (dept: string) => {
    if (dept === "labour_room") return Activity;
    if (dept === "gyna" || dept === "gynaecology") return Heart;
    if (dept === "radiology") return Zap;
    return FlaskRound;
  };

  // Derive Patient journey steps
  const getJourneyState = (ticket: QueueTicket, patient: MedicalRecord | null, invoice: Invoice | null) => {
    const currentDept = ticket.currentDepartment;
    const isCompleted = ticket.status === "completed";

    // Step definitions
    // 0. Reception
    // 1. Doctor Consultation
    // 2. Specialized Care Levels (Lab / Labour Room / Gyna / radiology etc)
    // 3. Pharmacy
    // 4. Billing
    // 5. Discharged

    const hasReferrals = patient?.visits && patient.visits.length > 0 && patient.visits[patient.visits.length - 1].referrals?.length > 0;
    const hasPrescriptions = patient?.visits && patient.visits.length > 0 && patient.visits[patient.visits.length - 1].prescriptions?.length > 0;

    let stepIndex = 0; // Reception
    if (currentDept === "doctor") {
      stepIndex = 1;
    } else if (currentDept === "pharmacy") {
      stepIndex = 3;
    } else if (currentDept === "billing") {
      stepIndex = 4;
    } else if (currentDept === "reception" || currentDept === "queue") {
      stepIndex = 0;
    } else {
      // laboratory, radiology, labour_room, gyna, or any other live streamed custom place
      stepIndex = 2;
    }

    if (isCompleted) {
      stepIndex = 5; // Discharged
    }

    return {
      stepIndex,
      hasReferrals,
      hasPrescriptions
    };
  };

  const journeyState = selectedTicket ? getJourneyState(selectedTicket, matchedPatient || null, matchedInvoice || null) : null;

  // Add Log Message helper
  const addLog = (msg: string) => {
    setSimulationLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 8)]);
  };

  // Automated Action Simulation to "Wire" things together instantly
  const handleSimulateStep = async (stepKey: string) => {
    if (!selectedTicket || !matchedPatient) return;
    setSimulatingStep(stepKey);
    const ticketId = selectedTicket.id;
    const patientId = matchedPatient.id;

    try {
      if (stepKey === "doctor") {
        addLog(`Initiating Medical Consultation simulation for ${selectedTicket.patientName}...`);
        
        // 1. Generate clinical visit with generic vitals & diagnosis
        const randomDiagnosisList = [
          "Acute Bacterial Tonsillitis",
          "Primary Essential Hypertension",
          "Community-Acquired Pneumonia",
          "Typhoid Fever",
          "Gastritis (H. Pylori associated)"
        ];
        const diagnosis = randomDiagnosisList[Math.floor(Math.random() * randomDiagnosisList.length)];
        
        // Let's decide if this simulated patient gets referred, prescribed or both
        const decisionNum = Math.random();
        let referrals: any[] = [];
        let prescriptions: any[] = [];

        if (decisionNum < 0.35) {
          // Lab referral
          referrals = [{
            id: `ref-${Date.now()}-0`,
            department: "laboratory",
            testName: "Full Blood Count (FBC) & Malaria Blood Smear",
            notes: "Patient presenting with high intermittent fevers and chills.",
            status: "pending"
          }];
          addLog(`Doctor ordered Lab diagnostics (FBC + Malaria test)...`);
        } else {
          // Pharmacy Prescriptions
          prescriptions = [
            {
              drugName: "Amoxicillin (500mg)",
              quantity: 21,
              dosage: "1x3",
              instructions: "Take for 7 days post meals",
              status: "pending"
            },
            {
              drugName: "Paracetamol (500mg)",
              quantity: 15,
              dosage: "1x3",
              instructions: "Take when fever occurs",
              status: "pending"
            }
          ];
          addLog(`Doctor generated e-prescriptions (Amoxicillin + Paracetamol)...`);
        }

        const newVisit: ClinicalVisit = {
          id: `vst-${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          vitals: {
            temp: (37 + Math.random() * 2).toFixed(1),
            bp: `${110 + Math.floor(Math.random() * 25)}/${70 + Math.floor(Math.random() * 15)}`,
            pulse: (70 + Math.floor(Math.random() * 20)).toString(),
            weight: (50 + Math.floor(Math.random() * 40)).toString()
          },
          symptoms: selectedTicket.issue || "High fever, body aches and general fatigue.",
          diagnosis,
          prescriptions,
          referrals
        };

        const updatedVisits = [...matchedPatient.visits, newVisit];
        await updateDoc(doc(db, "patients", patientId), { visits: updatedVisits });
        addLog(`Electronic Health Record (EHR) updated successfully.`);

        // 2. Route Queue ticket
        let nextDept = "billing";
        let nextPrefix = "BIL";
        let notes = "Consultation completed, cleared for billing.";

        if (referrals.length > 0) {
          nextDept = "laboratory";
          nextPrefix = "LAB";
          notes = `Referred for Diagnostics: ${diagnosis}`;
        } else if (prescriptions.length > 0) {
          nextDept = "pharmacy";
          nextPrefix = "PHA";
          notes = "Prescriptions ready for stock-matching and dispensing.";
        }

        const ticketNoParts = selectedTicket.ticketNo.split("-");
        const nextTicketNo = `${nextPrefix}-${ticketNoParts[1] || Math.floor(Math.random() * 900 + 100)}`;

        await updateDoc(doc(db, "queue", ticketId), {
          currentDepartment: nextDept,
          ticketNo: nextTicketNo,
          status: "pending",
          notes
        });

        addLog(`Patient automatically routed to ${nextDept.toUpperCase()} queue with Ticket ${nextTicketNo}.`);

      } else if (stepKey === "diagnostics") {
        addLog(`Initiating Laboratory Diagnostics LIS simulation...`);
        
        // Update patient's last visit referral to completed with test results
        const updatedVisits = [...matchedPatient.visits];
        if (updatedVisits.length > 0) {
          const lastVisit = updatedVisits[updatedVisits.length - 1];
          if (lastVisit.referrals && lastVisit.referrals.length > 0) {
            lastVisit.referrals = lastVisit.referrals.map(ref => ({
              ...ref,
              status: "completed",
              results: "HB: 12.8 g/dL (Normal), WBC: 8.9 x10^9/L, Malaria: POSITIVE (+ve). Remarks: Severe malaria parasite load detected."
            }));
            
            // Add prescription since malaria is positive
            lastVisit.prescriptions = [
              {
                drugName: "Artemether-Lumefantrine (Coartem)",
                quantity: 24,
                dosage: "4x2",
                instructions: "Take with fatty food/milk for 3 days",
                status: "pending"
              },
              {
                drugName: "Paracetamol (500mg)",
                quantity: 12,
                dosage: "1x3",
                instructions: "Take for fever relief",
                status: "pending"
              }
            ];

            await updateDoc(doc(db, "patients", patientId), { visits: updatedVisits });
            addLog(`Lab results transmitted to EHR. High-load Malaria positive (+ve) flagged.`);
            addLog(`Emergency Coartem prescription added to EHR visits.`);
          }
        }

        // Route to pharmacy since there are prescriptions now
        const ticketNoParts = selectedTicket.ticketNo.split("-");
        const nextTicketNo = `PHA-${ticketNoParts[1] || Math.floor(Math.random() * 900 + 100)}`;

        await updateDoc(doc(db, "queue", ticketId), {
          currentDepartment: "pharmacy",
          ticketNo: nextTicketNo,
          status: "pending",
          notes: "Diagnostics completed. Prescriptions ready for dispensing."
        });

        addLog(`Patient automatically routed to PHARMACY queue with Ticket ${nextTicketNo}.`);

      } else if (stepKey === "pharmacy") {
        addLog(`Initiating Pharmacy Stock Match & POS simulation...`);
        
        // Match & dispense prescriptions
        const updatedVisits = [...matchedPatient.visits];
        let dispensedItems: any[] = [];
        let itemsTotal = 300; // Standard Consultation & Triage Fee KES 300

        dispensedItems.push({
          description: "General Consultation & Triage Fee",
          amount: 300,
          department: "reception"
        });

        if (updatedVisits.length > 0) {
          const lastVisit = updatedVisits[updatedVisits.length - 1];
          if (lastVisit.prescriptions && lastVisit.prescriptions.length > 0) {
            lastVisit.prescriptions = lastVisit.prescriptions.map(p => {
              const drugUnitPrice = (p as any).unitPrice || 25;
              const itemCost = p.quantity * drugUnitPrice;
              dispensedItems.push({
                description: `${p.drugName} (${p.dosage} - x${p.quantity})`,
                amount: itemCost,
                department: "pharmacy"
              });
              itemsTotal += itemCost;
              return { ...p, status: "dispensed" };
            });
            await updateDoc(doc(db, "patients", patientId), { visits: updatedVisits });
            addLog(`Prescriptions status updated to 'dispensed'. Stock levels reduced.`);
          }
        }

        // Check if there's any diagnostic items to add
        const lastVisit = updatedVisits[updatedVisits.length - 1];
        if (lastVisit && lastVisit.referrals) {
          lastVisit.referrals.forEach(ref => {
            const testFee = (ref as any).cost || 850;
            dispensedItems.push({
              description: `Diagnostic Panel: ${ref.testName}`,
              amount: testFee,
              department: ref.department || "laboratory"
            });
            itemsTotal += testFee;
          });
        }

        // 1. Create invoice in collection
        const splitBilling = {
          sha: Math.floor(itemsTotal * 0.7), // 70% SHA cover
          insurance: 0,
          outOfPocket: Math.floor(itemsTotal * 0.3) // 30% patient out of pocket
        };

        const invoiceData: Invoice = {
          id: `inv-${Date.now()}`,
          patientId,
          patientName: selectedTicket.patientName,
          nationalId: selectedTicket.nationalId,
          items: [
            { description: "General Clinical Consultation", amount: 150, department: "medical" },
            ...dispensedItems
          ],
          total: itemsTotal,
          split: splitBilling,
          paymentMethod: "M-PESA",
          paymentStatus: "unpaid",
          timestamp: new Date().toISOString()
        };

        await addDoc(collection(db, "invoices"), cleanFirestoreData(invoiceData));
        addLog(`Paperless invoice generated for KES ${itemsTotal} (SHA cover KES ${splitBilling.sha}).`);

        // 2. Route Queue ticket
        const ticketNoParts = selectedTicket.ticketNo.split("-");
        const nextTicketNo = `BIL-${ticketNoParts[1] || Math.floor(Math.random() * 900 + 100)}`;

        await updateDoc(doc(db, "queue", ticketId), {
          currentDepartment: "billing",
          ticketNo: nextTicketNo,
          status: "pending",
          notes: "Drugs dispensed. Balance reconciliation required at checkout."
        });

        addLog(`Patient automatically routed to BILLING queue with Ticket ${nextTicketNo}.`);

      } else if (stepKey === "billing") {
        addLog(`Initiating Split-Ledger Billing & eTIMS checkout...`);

        // Update active invoice to paid
        const invSnap = await getDocs(
          query(collection(db, "invoices"), where("patientName", "==", selectedTicket.patientName), where("paymentStatus", "==", "unpaid"))
        );

        if (!invSnap.empty) {
          const invId = invSnap.docs[0].id;
          const eTIMSNo = `KRA-TIMS-${Math.floor(10000000 + Math.random() * 90000000)}`;
          const shaClaim = `SHA-CLM-${Math.floor(200000 + Math.random() * 800000)}`;

          await updateDoc(doc(db, "invoices", invId), {
            paymentStatus: "paid",
            paymentMethod: "M-PESA",
            mpesaCheckoutId: `ws_CO_${Date.now().toString().substring(4)}`,
            kraCompliantInvoiceNo: eTIMSNo,
            shaClaimId: shaClaim
          });

          addLog(`eTIMS Invoice Registered: ${eTIMSNo}`);
          addLog(`SHA Claim Dispatched: ${shaClaim}`);
        }

        // Close queue ticket
        await updateDoc(doc(db, "queue", ticketId), {
          status: "completed",
          notes: "Cleared and discharged from facility. Process complete."
        });

        addLog(`Patient cleared by security and officially DISCHARGED from clinic.`);
        addLog(`Journey successfully completed in 5/5 steps!`);
      }
    } catch (err) {
      console.error(err);
      addLog(`Error during simulation step: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSimulatingStep(null);
    }
  };

  return (
    <div id="patient-journey-wrapper" className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-950">Patient Journey Orchestrator</h2>
              <p className="text-xs text-gray-500">
                End-to-end interactive clinic operations flow from check-in, doctor consults, diagnostic paths, to final eTIMS/M-PESA discharge.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-emerald-50/50 px-3.5 py-1.5 rounded-xl border border-emerald-100">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-xs font-bold text-emerald-800">Operational Real-time Bus: Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Patient Selector in Facility */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Patients In Clinic ({tickets.length})</h3>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400 border border-dashed border-gray-150 rounded-xl">
                No patients currently checked in. Use the Reception Desk tab to register a patient.
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const statusColors =
                  t.status === "completed"
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : t.status === "serving"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-150 animate-pulse"
                    : "bg-amber-50 text-amber-700 border-amber-150";

                return (
                  <div
                    key={t.id}
                    id={`journey-patient-${t.id}`}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-950/20 translate-x-1"
                        : "bg-white hover:bg-gray-50 border-gray-150 text-gray-800 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="space-y-1.5 truncate flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${isSelected ? "bg-slate-800 text-emerald-400" : "bg-gray-100 text-gray-700"}`}>
                          {t.ticketNo}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${statusColors}`}>
                          {t.status === "completed" ? "Discharged" : t.status === "serving" ? "In Progress" : "Queued"}
                        </span>
                      </div>
                      <p className="font-bold text-xs truncate">{t.patientName}</p>
                      <p className={`text-[10px] flex items-center gap-1 ${isSelected ? "text-slate-300" : "text-gray-500"}`}>
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>At: <strong className="font-semibold text-emerald-400">{getDeptLabel(t.currentDepartment)}</strong></span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 self-center">
                      <button
                        onClick={(e) => handleDeleteJourneyTicket(t.id, t.ticketNo, e)}
                        title="Instant Delete Ticket"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isSelected ? "text-slate-400 hover:text-rose-400 hover:bg-slate-800" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? "text-white translate-x-0.5" : "text-gray-300"}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Simulation Console Logger */}
          {simulationLogs.length > 0 && (
            <div className="border border-slate-800 bg-slate-950 rounded-xl p-3.5 space-y-2 text-[10px] font-mono text-emerald-400">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-1.5">Simulation Bus Logs</p>
              <div className="space-y-1 max-h-[110px] overflow-y-auto">
                {simulationLogs.map((log, idx) => (
                  <p key={idx} className="leading-normal truncate">{log}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Step Timeline & Details */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          {selectedTicket && journeyState ? (
            <div className="space-y-6">
              {/* Patient Profile Snapshot */}
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-3">
                  <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl self-center font-mono font-black text-xs">
                    {selectedTicket.ticketNo}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{selectedTicket.patientName}</h4>
                    <p className="text-xs text-gray-500">
                      ID: <span className="font-mono">{selectedTicket.nationalId}</span> • Age: {selectedTicket.age} yrs • {selectedTicket.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Intake Time</span>
                    <span className="text-xs font-mono font-bold text-gray-800">
                      {new Date(selectedTicket.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteJourneyTicket(selectedTicket.id, selectedTicket.ticketNo, e)}
                    title="Instant Delete This Journey Ticket"
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Level-of-Service Attendance Dashboard */}
              <div className="p-5 border border-slate-200 bg-slate-50/50 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                      <span>Real-Time Level of Attendance Orchestrator</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">Live system status tracking patient clinical touchpoints and referral routes.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg font-mono tracking-tight bg-slate-900 text-emerald-400 shadow-xs border border-slate-850 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                      {getDeptLabel(selectedTicket.currentDepartment)}
                    </span>
                  </div>
                </div>

                {/* Current Attendance Phase Description */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-8 space-y-1">
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Current Attendance Phase</span>
                    {selectedTicket.currentDepartment === "doctor" ? (
                      <div>
                        <h5 className="text-sm font-extrabold text-blue-700 flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-blue-600 animate-pulse" />
                          <span>Currently At The Doctor Consultation</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          Patient is currently in the consulting room. The doctor is conducting vital checks, assessment of symptoms (<strong className="font-semibold">"{selectedTicket.issue}"</strong>), and compiling digital prescriptions or diagnostic e-referrals.
                        </p>
                      </div>
                    ) : (selectedTicket.currentDepartment === "laboratory" || selectedTicket.currentDepartment === "lab") ? (
                      <div>
                        <h5 className="text-sm font-extrabold text-indigo-700 flex items-center gap-1.5">
                          <FlaskRound className="w-4 h-4 text-indigo-600 animate-pulse" />
                          <span>Done with Doctor • Referred to Laboratory</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          Consultation with the doctor has successfully concluded. The patient was referred to the <strong className="font-black text-indigo-700">Lab Clinic</strong> for blood screenings, blood count, or malaria tests. Currently awaiting sample collection.
                        </p>
                      </div>
                    ) : selectedTicket.currentDepartment === "radiology" ? (
                      <div>
                        <h5 className="text-sm font-extrabold text-violet-700 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-violet-600 animate-pulse" />
                          <span>Done with Doctor • Referred to Radiology</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          Consultation with the doctor has successfully concluded. Patient is currently routed to the <strong className="font-semibold text-violet-700">Radiology Imaging Suite</strong> for specialized digital scans or X-ray imaging.
                        </p>
                      </div>
                    ) : selectedTicket.currentDepartment === "labour_room" ? (
                      <div>
                        <h5 className="text-sm font-extrabold text-rose-700 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-rose-600 animate-pulse" />
                          <span>Done with Doctor • Transferred to Labour Room (Maternity Care)</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          Patient transferred to the <strong className="font-semibold text-rose-700">Labour & Delivery Ward</strong> for active monitoring, uterine contraction rate logging, and cardiotocography (CTG) fetal heart-rate metrics.
                        </p>
                      </div>
                    ) : selectedTicket.currentDepartment === "gyna" ? (
                      <div>
                        <h5 className="text-sm font-extrabold text-pink-700 flex items-center gap-1.5">
                          <Heart className="w-4 h-4 text-pink-600 animate-pulse" />
                          <span>Done with Doctor • Transferred to Gynecology (Gyna Clinic)</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          Patient successfully routed to <strong className="font-semibold text-pink-700">OB/GYN Specialized Level of Care</strong> for pelvic sonography, maternity checkup, or gynecological assessment.
                        </p>
                      </div>
                    ) : selectedTicket.currentDepartment === "pharmacy" ? (
                      <div>
                        <h5 className="text-sm font-extrabold text-amber-700 flex items-center gap-1.5">
                          <ShoppingCart className="w-4 h-4 text-amber-600" />
                          <span>At Pharmacy Dispensary</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          Clinical work completed. Patient is currently at the <strong className="font-semibold text-amber-700">Smart Pharmacy Counter</strong> for medication stock-matching, dosage review, and drug dispensing.
                        </p>
                      </div>
                    ) : selectedTicket.currentDepartment === "billing" ? (
                      <div>
                        <h5 className="text-sm font-extrabold text-emerald-700 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span>At Cashier Billing Desk</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          All clinical checkups and pharmacy collections finished. Patient is clearing split-ledger balances (70% Social Health Cover / SHA, 30% out-of-pocket) and receiving compliance eTIMS receipting.
                        </p>
                      </div>
                    ) : selectedTicket.currentDepartment === "reception" || selectedTicket.currentDepartment === "queue" ? (
                      <div>
                        <h5 className="text-sm font-extrabold text-gray-700 flex items-center gap-1.5">
                          <Fingerprint className="w-4 h-4 text-gray-600" />
                          <span>Awaiting Consultation (Reception Intake)</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          Patient checked in with biometric verification and SHA eligibility matching. Patient is in the main lounge waiting to be called to the Doctor's Desk.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h5 className="text-sm font-extrabold text-purple-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 animate-pulse" />
                          <span>Live Attendance in {getDeptLabel(selectedTicket.currentDepartment)}</span>
                        </h5>
                        <p className="text-xs text-slate-600 leading-normal">
                          Patient routed to specialized care node: <strong className="font-semibold text-purple-700">{getDeptLabel(selectedTicket.currentDepartment)}</strong>. System streamer is monitoring diagnostic levels.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Live Step Progress Checklist */}
                  <div className="md:col-span-4 bg-white p-3 border border-gray-200/60 rounded-xl space-y-2">
                    <span className="text-[8px] uppercase font-black text-gray-400 tracking-wider block">Attendance Milestones</span>
                    
                    <div className="space-y-1.5 text-[10.5px]">
                      {/* Step 1: Check In */}
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[8px]">✓</span>
                        <span className="font-semibold text-gray-700">1. Reception Check-In</span>
                      </div>

                      {/* Step 2: At Doctor */}
                      <div className="flex items-center gap-2">
                        {selectedTicket.currentDepartment === "reception" || selectedTicket.currentDepartment === "queue" ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center font-bold text-[8px]">•</span>
                            <span className="text-gray-400">2. At the Doctor</span>
                          </>
                        ) : selectedTicket.currentDepartment === "doctor" ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[8px] animate-pulse">→</span>
                            <span className="font-bold text-blue-700">2. At the Doctor (Active)</span>
                          </>
                        ) : (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[8px]">✓</span>
                            <span className="font-semibold text-gray-700">2. Doctor Consulted</span>
                          </>
                        )}
                      </div>

                      {/* Step 3: Referred to Lab / Diagnostics */}
                      <div className="flex items-center gap-2">
                        {["reception", "queue", "doctor"].includes(selectedTicket.currentDepartment) ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center font-bold text-[8px]">•</span>
                            <span className="text-gray-400">3. Diagnostic Referrals</span>
                          </>
                        ) : ["laboratory", "radiology", "labour_room", "gyna", "lab"].includes(selectedTicket.currentDepartment) ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[8px] animate-pulse">→</span>
                            <span className="font-bold text-indigo-700">3. In Diagnostics Lab</span>
                          </>
                        ) : (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[8px]">✓</span>
                            <span className="font-semibold text-gray-700">3. Diagnostics Finished</span>
                          </>
                        )}
                      </div>

                      {/* Step 4: Pharmacy */}
                      <div className="flex items-center gap-2">
                        {["reception", "queue", "doctor", "laboratory", "radiology", "labour_room", "gyna", "lab"].includes(selectedTicket.currentDepartment) ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center font-bold text-[8px]">•</span>
                            <span className="text-gray-400">4. Smart Pharmacy</span>
                          </>
                        ) : selectedTicket.currentDepartment === "pharmacy" ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[8px] animate-pulse">→</span>
                            <span className="font-bold text-amber-700">4. At Pharmacy Counter</span>
                          </>
                        ) : (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[8px]">✓</span>
                            <span className="font-semibold text-gray-700">4. Drugs Dispensed</span>
                          </>
                        )}
                      </div>

                      {/* Step 5: Cashier Split-Billing */}
                      <div className="flex items-center gap-2">
                        {selectedTicket.currentDepartment === "billing" ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[8px] animate-pulse">→</span>
                            <span className="font-bold text-emerald-800">5. Cashier Balance Due</span>
                          </>
                        ) : selectedTicket.status === "completed" ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[8px]">✓</span>
                            <span className="font-semibold text-gray-700">5. Billing Cleared</span>
                          </>
                        ) : (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center font-bold text-[8px]">•</span>
                            <span className="text-gray-400">5. Cashier Split-Billing</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Location Streamer Controls */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h5 className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1.5 tracking-wider">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                      <span>Live Level-of-Service Streamer Feed</span>
                    </h5>
                    <p className="text-[11px] text-emerald-700/80">
                      Instantly stream patient's current clinical location live on the hospital-wide patient journey registry.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-600/15 text-emerald-800 font-mono font-bold text-[10px] rounded-lg border border-emerald-200">
                    Current: {getDeptLabel(selectedTicket.currentDepartment)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-100/60">
                  <span className="text-[10px] text-emerald-800 font-bold mr-1">Route & Stream Live:</span>
                  {[
                    { val: "reception", label: "Reception" },
                    { val: "doctor", label: "Consultation" },
                    { val: "laboratory", label: "Lab" },
                    { val: "labour_room", label: "Labour Room" },
                    { val: "gyna", label: "Gynecology" },
                    { val: "pharmacy", label: "Pharmacy" },
                    { val: "billing", label: "Billing" },
                  ].map((loc) => {
                    const isCurrent = selectedTicket.currentDepartment === loc.val;
                    return (
                      <button
                        key={loc.val}
                        onClick={async () => {
                          const ticketNoParts = selectedTicket.ticketNo.split("-");
                          let prefix = "GEN";
                          if (loc.val === "laboratory" || loc.val === "lab") prefix = "LAB";
                          else if (loc.val === "radiology") prefix = "RAD";
                          else if (loc.val === "pharmacy") prefix = "PHA";
                          else if (loc.val === "billing") prefix = "BIL";
                          else if (loc.val === "labour_room") prefix = "LBR";
                          else if (loc.val === "gyna") prefix = "GYN";

                          const nextTicketNo = `${prefix}-${ticketNoParts[1] || Math.floor(Math.random() * 900 + 100)}`;
                          
                          await updateDoc(doc(db, "queue", selectedTicket.id), {
                            currentDepartment: loc.val,
                            ticketNo: nextTicketNo,
                            notes: `Manually streamed live to ${loc.label} level of service.`
                          });
                          addLog(`Patient ${selectedTicket.patientName} streamed live to ${loc.label.toUpperCase()}.`);
                        }}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-slate-950 text-emerald-400 shadow-xs border border-slate-900"
                            : "bg-white hover:bg-emerald-50/50 border border-emerald-200/50 text-emerald-800"
                        }`}
                      >
                        {loc.label}
                      </button>
                    );
                  })}
                  
                  {/* Custom option input for any custom place! */}
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const customInput = form.elements.namedItem("custom_place") as HTMLInputElement;
                      const customPlace = customInput.value.trim();
                      if (!customPlace) return;

                      const ticketNoParts = selectedTicket.ticketNo.split("-");
                      const nextTicketNo = `SPC-${ticketNoParts[1] || Math.floor(Math.random() * 900 + 100)}`;

                      await updateDoc(doc(db, "queue", selectedTicket.id), {
                        currentDepartment: customPlace.toLowerCase().replace(/\s+/g, "_"),
                        ticketNo: nextTicketNo,
                        notes: `Manually streamed live to custom place: ${customPlace}`
                      });
                      addLog(`Patient ${selectedTicket.patientName} streamed live to custom location: ${customPlace}.`);
                      customInput.value = "";
                    }}
                    className="flex gap-1 items-center ml-auto"
                  >
                    <input
                      name="custom_place"
                      type="text"
                      placeholder="Other place..."
                      className="px-2 py-1 text-[11px] border border-emerald-200 bg-white rounded-lg w-28 focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                    >
                      Stream
                    </button>
                  </form>
                </div>
              </div>

              {/* High-Fidelity Process Steps Timeline */}
              <div className="relative">
                <div className="absolute top-5 left-6 right-6 h-0.5 bg-gray-100 -z-10 hidden md:block"></div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { key: "reception", label: "Check-In", icon: Fingerprint, dept: "reception" },
                    { key: "doctor", label: "Consult", icon: Stethoscope, dept: "doctor" },
                    { key: "diagnostics", label: getStep3Label(selectedTicket.currentDepartment), icon: getStep3Icon(selectedTicket.currentDepartment), dept: selectedTicket.currentDepartment, isCond: true },
                    { key: "pharmacy", label: "Pharmacy", icon: ShoppingCart, dept: "pharmacy", isCond: true },
                    { key: "billing", label: "Billing", icon: CreditCard, dept: "billing" },
                    { key: "discharged", label: "Discharged", icon: CheckCircle2, dept: "completed" }
                  ].map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = journeyState.stepIndex === idx;
                    const isPassed = journeyState.stepIndex > idx;
                    
                    // Conditional colors
                    let outlineColor = "border-gray-200 text-gray-400 bg-white";
                    if (isActive) outlineColor = "border-emerald-600 text-emerald-600 bg-emerald-50 shadow-md scale-105 font-black ring-2 ring-emerald-500/10";
                    if (isPassed) outlineColor = "border-emerald-500 text-white bg-emerald-500";

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                        <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all ${outlineColor}`}>
                          {isPassed ? <Check className="w-5.5 h-5.5" /> : <Icon className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className={`text-[11px] font-bold tracking-tight leading-none ${isActive ? "text-emerald-700" : isPassed ? "text-gray-800" : "text-gray-400"}`}>
                            {step.label}
                          </p>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">
                            {isActive ? "Serving" : isPassed ? "Completed" : "Waiting"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Step Detail Cards and Interactive Simulators */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <span>Real-time Clinical Node Registry</span>
                  </h4>

                  {/* Simulator action block */}
                  {journeyState.stepIndex < 5 && (
                    <button
                      onClick={() => {
                        const keys = ["reception", "doctor", "diagnostics", "pharmacy", "billing"];
                        handleSimulateStep(keys[journeyState.stepIndex]);
                      }}
                      disabled={simulatingStep !== null}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/20 cursor-pointer animate-pulse"
                    >
                      {simulatingStep ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing Bus...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Simulate Next Node ({
                            ["Consultation", "Consultation", "Diagnostics (Lab)", "Prescription Match", "Split-Billing Payment"][journeyState.stepIndex]
                          })</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Display dynamic details depending on completed step records */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Intake & Bio details card */}
                  <div className="border border-gray-150 rounded-xl p-4 space-y-3 bg-white shadow-xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4 text-gray-500" />
                      <span>Node 1: Kiosk Reception Intake</span>
                    </p>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Biometric Register:</span>
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold rounded">
                          {selectedTicket.biometricStatus === "verified" ? "Matched & Secured" : "Unverified"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Social Health Ins. (SHA):</span>
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold rounded">
                          {matchedPatient?.shaEligible === "eligible" ? "SHA / NHIF Verified" : "Self-Pay / Private"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Chief Complaint:</span>
                        <span className="font-semibold text-gray-800 italic truncate max-w-[140px]">
                          "{selectedTicket.issue || "General Consult"}"
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vitals & Consultation details card */}
                  <div className="border border-gray-150 rounded-xl p-4 space-y-3 bg-white shadow-xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>Node 2: Consultation & EHR Vitals</span>
                    </p>
                    {matchedPatient?.visits && matchedPatient.visits.length > 0 ? (
                      <div className="text-xs space-y-1.5">
                        {(() => {
                          const lastVisit = matchedPatient.visits[matchedPatient.visits.length - 1];
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Clinical Diagnosis:</span>
                                <span className="font-bold text-gray-800">{lastVisit.diagnosis}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Temp & Blood Pressure:</span>
                                <span className="font-semibold font-mono text-gray-800">
                                  {lastVisit.vitals.temp}°C • {lastVisit.vitals.bp} mmHg
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Pulse & Weight:</span>
                                <span className="font-semibold font-mono text-gray-800">
                                  {lastVisit.vitals.pulse} bpm • {lastVisit.vitals.weight} kg
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic py-2">Consultation records pending...</div>
                    )}
                  </div>

                  {/* Ancillary Diagnostics details card */}
                  <div className="border border-gray-150 rounded-xl p-4 space-y-3 bg-white shadow-xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      {selectedTicket.currentDepartment === "labour_room" ? (
                        <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                      ) : selectedTicket.currentDepartment === "gyna" ? (
                        <Heart className="w-4 h-4 text-pink-500" />
                      ) : (
                        <FlaskRound className="w-4 h-4 text-blue-500" />
                      )}
                      <span>Node 3: {getStep3Label(selectedTicket.currentDepartment)} Level of Service</span>
                    </p>
                    {selectedTicket.currentDepartment === "labour_room" ? (
                      <div className="text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Maternity Status:</span>
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-bold rounded animate-pulse">
                            Active Labour / Monitoring
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Contraction Rate:</span>
                          <span className="font-mono font-bold text-gray-800">3 in 10 mins (Moderate)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Fetal Heart Rate:</span>
                          <span className="font-mono font-bold text-emerald-600">142 bpm (Stable)</span>
                        </div>
                        <div className="text-[10px] bg-rose-50/50 border border-rose-100 p-2 rounded text-rose-800 italic">
                          "Patient placed on continuous cardiotocography (CTG) monitoring. Nurse on duty: Midwife Sarah Wambui."
                        </div>
                      </div>
                    ) : selectedTicket.currentDepartment === "gyna" ? (
                      <div className="text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Specialty Care:</span>
                          <span className="px-1.5 py-0.5 bg-pink-50 text-pink-700 border border-pink-100 text-[9px] font-bold rounded">
                            Obstetrics & Gynecology (OB-GYN)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Assigned Doctor:</span>
                          <span className="font-bold text-gray-800">Dr. Catherine Ngugi</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Procedure:</span>
                          <span className="font-semibold text-gray-800">Transvaginal Pelvic Ultrasound</span>
                        </div>
                        <div className="text-[10px] bg-pink-50/50 border border-pink-100 p-2 rounded text-pink-800 italic">
                          "Vitals checked and stable. Preparing for diagnostic obstetric sonography."
                        </div>
                      </div>
                    ) : !["reception", "queue", "doctor", "pharmacy", "billing", "completed", "laboratory", "radiology"].includes(selectedTicket.currentDepartment) ? (
                      <div className="text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Special Level of Care:</span>
                          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-bold rounded uppercase">
                            {getStep3Label(selectedTicket.currentDepartment)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Facility Streamer Status:</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            Live Feed Connected
                          </span>
                        </div>
                        <div className="text-[10px] bg-purple-50/30 border border-purple-100 p-2 rounded text-purple-900 italic">
                          Patient successfully routed and tracked live in the {getStep3Label(selectedTicket.currentDepartment)} department.
                        </div>
                      </div>
                    ) : matchedPatient?.visits && matchedPatient.visits.length > 0 && matchedPatient.visits[matchedPatient.visits.length - 1].referrals?.length > 0 ? (
                      <div className="text-xs space-y-1.5">
                        {(() => {
                          const lastVisit = matchedPatient.visits[matchedPatient.visits.length - 1];
                          const referral = lastVisit.referrals[0];
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Procedure Type:</span>
                                <span className="font-semibold text-gray-800 uppercase text-[10px] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-150">
                                  {referral.department}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Test / Status:</span>
                                <span className="font-bold text-gray-800 flex items-center gap-1">
                                  {referral.testName}
                                  {referral.status === "completed" ? (
                                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-150">Done</span>
                                  ) : (
                                    <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-150">Queued</span>
                                  )}
                                </span>
                              </div>
                              <div className="text-[10px] bg-gray-50 border border-gray-200 p-2 rounded text-gray-600 italic">
                                {referral.results ? referral.results : "Awaiting lab technician transmission..."}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic py-2">No active diagnostic e-referrals for current cycle.</div>
                    )}
                  </div>

                  {/* Smart Pharmacy Dispensing card */}
                  <div className="border border-gray-150 rounded-xl p-4 space-y-3 bg-white shadow-xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-amber-500" />
                      <span>Node 4: Smart Pharmacy & Stocks</span>
                    </p>
                    {matchedPatient?.visits && matchedPatient.visits.length > 0 && matchedPatient.visits[matchedPatient.visits.length - 1].prescriptions?.length > 0 ? (
                      <div className="text-xs space-y-1.5">
                        {(() => {
                          const lastVisit = matchedPatient.visits[matchedPatient.visits.length - 1];
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Dispensing Drugs:</span>
                                <span className="font-bold text-gray-800">{lastVisit.prescriptions.map(p => p.drugName).join(", ")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Inventory Sync Status:</span>
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  ✓ Stock Match Confirmed
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Dispensed Code:</span>
                                <span className="font-mono text-[10px] text-gray-500">
                                  {lastVisit.prescriptions[0].status === "dispensed" ? "Cleared & Dispatched" : "Awaiting Pharmacist checkout"}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic py-2">No prescriptions recorded for current cycle.</div>
                    )}
                  </div>

                  {/* Split-ledger Billing details card */}
                  <div className="border border-gray-150 rounded-xl p-4 space-y-3 bg-white shadow-xs md:col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span>Node 5: Financial Split-Ledger & eTIMS Compliance</span>
                    </p>
                    {matchedInvoice ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-gray-400 font-medium">Itemized Summary</p>
                          <div className="max-h-[80px] overflow-y-auto space-y-1 text-[11px]">
                            {matchedInvoice.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-gray-500 truncate max-w-[120px]">{item.description}</span>
                                <span className="font-mono text-gray-800 font-semibold">KES {item.amount}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-gray-150 pt-1 flex justify-between font-bold">
                            <span>Total Invoice:</span>
                            <span className="font-mono text-slate-900">KES {matchedInvoice.total}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 border-l border-gray-100 pl-4">
                          <p className="text-gray-400 font-medium">Split Allocation</p>
                          <div className="text-[11px] space-y-1">
                            <div className="flex justify-between">
                              <span>SHA Claim Cover:</span>
                              <span className="font-mono font-bold text-emerald-700">KES {matchedInvoice.split.sha}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Insurance Cover:</span>
                              <span className="font-mono font-bold text-blue-700">KES {matchedInvoice.split.insurance}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Patient Out-of-Pocket:</span>
                              <span className="font-mono font-bold text-slate-800">KES {matchedInvoice.split.outOfPocket}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 border-l border-gray-100 pl-4">
                          <p className="text-gray-400 font-medium">Compliance & Verification</p>
                          <div className="text-[11px] space-y-1">
                            <div className="flex justify-between">
                              <span>Invoice Stamp:</span>
                              <span className="font-mono font-bold text-slate-800 truncate max-w-[120px]">
                                {matchedInvoice.kraCompliantInvoiceNo || "Awaiting eTIMS transmission"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>SHA Claim ID:</span>
                              <span className="font-mono font-bold text-slate-800 truncate max-w-[120px]">
                                {matchedInvoice.shaClaimId || "Pending dispatch"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payment Status:</span>
                              <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase border ${
                                matchedInvoice.paymentStatus === "paid" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                                  : "bg-amber-50 text-amber-700 border-amber-150"
                              }`}>
                                {matchedInvoice.paymentStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic py-2">Billing and invoices pending clinical completion...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[450px] flex flex-col items-center justify-center text-center text-gray-400 p-6">
              <Activity className="w-16 h-16 text-emerald-500/20 mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-800">Awaiting Selection</h3>
              <p className="text-xs max-w-sm mt-1">
                Please select a patient from the checked-in list on the left to display their complete live operational journey timeline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

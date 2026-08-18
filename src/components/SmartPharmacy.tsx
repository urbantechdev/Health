import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where } from "firebase/firestore";
import { Medication, QueueTicket, PrescriptionItem, Invoice, MedicalRecord } from "../types";
import { 
  ShoppingCart, 
  PackageOpen, 
  AlertTriangle, 
  Check, 
  Search, 
  CreditCard, 
  RefreshCw, 
  Barcode, 
  Trash2, 
  Printer, 
  Camera, 
  CameraOff, 
  X,
  PackagePlus,
  DollarSign,
  Smartphone,
  Pill
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import { Html5Qrcode } from "html5-qrcode";
import PharmacyInventoryModal from "./PharmacyInventoryModal";
import PharmacyPOSCheckoutModal from "./PharmacyPOSCheckoutModal";

interface SmartPharmacyProps {
  toggles: any;
  onDispenseCompleted: () => void;
  userRole?: string;
}

export default function SmartPharmacy({ toggles, onDispenseCompleted, userRole = "Pharmacy" }: SmartPharmacyProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activePrescriptions, setActivePrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [cart, setCart] = useState<{ med: Medication; qty: number }[]>([]);
  
  // Modals
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [posCheckoutModalOpen, setPosCheckoutModalOpen] = useState(false);

  // Scannable search bar
  const [scanQuery, setScanQuery] = useState("");
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // Real Barcode Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastLoadedRef = useRef<string | null>(null);

  // Keyboard Emulation Scanner state
  const [keyboardScanInput, setKeyboardScanInput] = useState("");

  // Loading / saving
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Patients
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const pats: MedicalRecord[] = [];
      snapshot.forEach((doc) => {
        pats.push({ id: doc.id, ...doc.data() } as MedicalRecord);
      });
      setPatients(pats);
    });

    // Listen to Medications
    const unsubMeds = onSnapshot(collection(db, "medications"), (snapshot) => {
      const meds: Medication[] = [];
      snapshot.forEach((doc) => {
        meds.push({ id: doc.id, ...doc.data() } as Medication);
      });
      setMedications(meds);
      setLoading(false);
    });

    // Listen to patients that have been routed to Pharmacy in the queue (both pending and serving)
    const q = query(collection(db, "queue"), where("currentDepartment", "==", "pharmacy"), where("status", "in", ["pending", "serving"]));
    const unsubQueue = onSnapshot(q, (snapshot) => {
      const rxList: any[] = [];
      snapshot.forEach((doc) => {
        rxList.push({ id: doc.id, ...doc.data() });
      });
      setActivePrescriptions(rxList);
    });

    return () => {
      unsubPatients();
      unsubMeds();
      unsubQueue();
    };
  }, []);

  // Auto-fill cart when prescription is selected (one-time per selection)
  useEffect(() => {
    if (selectedPrescriptionId && medications.length > 0) {
      if (lastLoadedRef.current !== selectedPrescriptionId) {
        lastLoadedRef.current = selectedPrescriptionId;
        const ticket = activePrescriptions.find((p) => p.id === selectedPrescriptionId);
        if (ticket) {
          const pat = patients.find(
            (p) => p.patientName.toLowerCase() === ticket.patientName.toLowerCase() || p.nationalId === ticket.nationalId
          );
          const visit = pat && pat.visits.length > 0 ? pat.visits[pat.visits.length - 1] : null;
          if (visit && visit.prescriptions && visit.prescriptions.length > 0) {
            const newCart: { med: Medication; qty: number }[] = [];
            visit.prescriptions.forEach((rx) => {
              const match = medications.find(
                (m) =>
                  m.name.toLowerCase().includes(rx.drugName.toLowerCase()) ||
                  rx.drugName.toLowerCase().includes(m.name.toLowerCase())
              );
              if (match && match.quantity > 0) {
                const dispenseQty = Math.min(rx.quantity, match.quantity);
                newCart.push({ med: match, qty: dispenseQty });
              }
            });
            setCart(newCart);
          } else {
            setCart([]);
          }
        }
      }
    } else {
      if (lastLoadedRef.current !== null) {
        lastLoadedRef.current = null;
        setCart([]);
      }
    }
  }, [selectedPrescriptionId, activePrescriptions, patients, medications]);

  const addToCart = (med: Medication, quantity: number = 1) => {
    if (med.quantity <= 0) {
      alert("This medication is completely out of stock!");
      return;
    }

    const existingIndex = cart.findIndex((item) => item.med.id === med.id);
    if (existingIndex > -1) {
      const currentCartQty = cart[existingIndex].qty;
      if (currentCartQty + quantity > med.quantity) {
        alert(`Cannot add more. Only ${med.quantity} available in stock!`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].qty += quantity;
      setCart(updatedCart);
    } else {
      if (quantity > med.quantity) {
        alert(`Cannot add. Only ${med.quantity} available in stock!`);
        return;
      }
      setCart([...cart, { med, qty: quantity }]);
    }
  };

  const removeFromCart = (index: number) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  const handlePOSCheckout = async () => {
    if (cart.length === 0) {
      alert("POS cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Decrement inventory quantities in Firestore (Standard Transaction / Batch Update)
      for (const item of cart) {
        const medRef = doc(db, "medications", item.med.id);
        const newQty = Math.max(0, item.med.quantity - item.qty);
        await updateDoc(medRef, { quantity: newQty });
      }

      // 2. Generate a Centralised Invoice for Billing
      const invoiceItems = cart.map((item) => ({
        description: `${item.med.name} (x${item.qty}) - Dispensary`,
        amount: item.med.price * item.qty,
        department: "pharmacy",
      }));

      const total = invoiceItems.reduce((acc, curr) => acc + curr.amount, 0);

      // Extract details if checked out from a queue ticket
      let patientName = "Walk-in Cash Customer";
      let nationalId = "N/A";
      let ticketId: string | null = null;

      if (selectedPrescriptionId) {
        const matchingTicket = activePrescriptions.find((p) => p.id === selectedPrescriptionId);
        if (matchingTicket) {
          patientName = matchingTicket.patientName;
          nationalId = matchingTicket.nationalId;
          ticketId = matchingTicket.id;
        }
      }

      // Call backend eTIMS API for tax signing
      let kraNo = `KRAETIMS-OFF-${Math.floor(Math.random() * 900000 + 100000)}`;
      try {
        const etimsRes = await fetch("/api/integrations/etims/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: patientName,
            amount: total,
            items: invoiceItems,
          }),
        });
        const etimsData = await etimsRes.json();
        if (etimsData.success && etimsData.kraInvoiceNo) {
          kraNo = etimsData.kraInvoiceNo;
        }
      } catch (err) {
        console.warn("eTIMS background sign-off note:", err);
      }

      const invoiceData: Invoice = {
        id: `INV-${Date.now()}`,
        patientId: selectedPrescriptionId || "WALK-IN",
        patientName,
        nationalId,
        items: invoiceItems,
        total,
        split: {
          sha: 0,
          insurance: 0,
          outOfPocket: total,
        },
        paymentMethod: "Cash",
        paymentStatus: "unpaid",
        kraCompliantInvoiceNo: kraNo,
        timestamp: new Date().toISOString(),
      };

      await addDoc(collection(db, "invoices"), invoiceData);

      // 3. Update queue ticket -> route to billing
      if (ticketId) {
        await updateDoc(doc(db, "queue", ticketId), {
          currentDepartment: "billing",
          ticketNo: `BIL-${activePrescriptions.find((p) => p.id === ticketId)?.ticketNo.split("-")[1]}`,
          status: "pending",
          notes: `Pharmacy products dispensed (eTIMS #${kraNo}). Invoice routed to central billing.`,
        });
      }

      setCart([]);
      setSelectedPrescriptionId(null);
      alert(`Medications dispensed & signed with KRA eTIMS (${kraNo})! Invoice routed to central billing.`);
      onDispenseCompleted();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Real camera barcode scanner effect
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (isScanning) {
      const startCamera = async () => {
        try {
          setCameraError(null);
          html5QrCode = new Html5Qrcode("camera-scanner-view");
          scannerRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (width, height) => {
                const boxWidth = Math.min(width * 0.85, 300);
                const boxHeight = Math.min(height * 0.5, 180);
                return { width: Math.floor(boxWidth), height: Math.floor(boxHeight) };
              }
            },
            (decodedText) => {
              handleBarcodedItemScanned(decodedText);
              // Simple audio beep feedback
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
              } catch (e) {
                console.log("Audio feedback failed:", e);
              }
            },
            () => {
              // Ignore frame failures
            }
          );
        } catch (err: any) {
          console.error("Failed to start barcode camera:", err);
          setCameraError(err.message || "Failed to initialize camera. Check permissions or try the manual scanner.");
          setIsScanning(false);
        }
      };

      const timer = setTimeout(() => {
        startCamera();
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                console.log("Camera barcode scanner successfully stopped.");
              }).catch(err => {
                console.error("Error stopping barcode camera:", err);
              });
            }
          } catch (e) {
            console.error("Cleanup error in barcode camera:", e);
          }
        }
      };
    }
  }, [isScanning]);

  const handleBarcodedItemScanned = (code: string) => {
    if (!code) return;
    const cleanCode = code.trim();
    
    // Find matching medication by ID, Batch number, or partial match
    const matched = medications.find(
      (m) =>
        m.id === cleanCode ||
        m.batchNo.toLowerCase() === cleanCode.toLowerCase() ||
        m.name.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matched) {
      if (matched.quantity <= 0) {
        setScanStatus({
          type: "error",
          message: `🚫 Out of Stock: Scanned "${matched.name}" but current inventory is empty!`,
        });
      } else {
        addToCart(matched, 1);
        setScanStatus({
          type: "success",
          message: `✅ Item Detected & Added: ${matched.name} (Batch: ${matched.batchNo})`,
        });
      }
    } else {
      setScanStatus({
        type: "error",
        message: `⚠️ Unrecognized Barcode: "${cleanCode}". Try one of the test codes listed below.`,
      });
    }

    // Auto-clear notification after 4 seconds
    setTimeout(() => {
      setScanStatus(null);
    }, 4000);
  };

  const handleKeyboardGunScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyboardScanInput) return;
    handleBarcodedItemScanned(keyboardScanInput);
    setKeyboardScanInput("");
  };

  const triggerMockScanForCode = (code: string) => {
    handleBarcodedItemScanned(code);
  };

  // Medication product image fallback mapper
  const getMedicationImage = (med: Medication) => {
    if (med.imageUrl && med.imageUrl.trim().length > 0) return med.imageUrl;
    const name = med.name.toLowerCase();
    const cat = med.category.toLowerCase();
    if (name.includes("amoxicillin") || cat.includes("antibiotic")) {
      return "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80";
    }
    if (name.includes("paracetamol") || cat.includes("analgesic") || name.includes("pain")) {
      return "https://images.unsplash.com/photo-1550572017-edf792890586?auto=format&fit=crop&w=300&q=80";
    }
    if (name.includes("metformin") || cat.includes("diabet")) {
      return "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=300&q=80";
    }
    if (name.includes("atorvastatin") || cat.includes("cardio") || cat.includes("heart")) {
      return "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=300&q=80";
    }
    if (name.includes("omeprazole") || cat.includes("gastro") || cat.includes("stomach")) {
      return "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=300&q=80";
    }
    return "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=300&q=80";
  };

  // Expiry tracker check helper (FIFO model): flags if expires within 6 months
  const checkExpiryStatus = (expiryStr: string) => {
    const expDate = new Date(expiryStr);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return { status: "EXPIRED", color: "text-red-600 bg-red-100 border-red-200" };
    if (diffDays <= 180) return { status: "EXPIRING_SOON (FIFO alert)", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { status: "SAFE", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  };

  const selectedTicket = activePrescriptions.find((p) => p.id === selectedPrescriptionId);
  const matchedPatient = selectedTicket
    ? patients.find((p) => p.patientName.toLowerCase() === selectedTicket.patientName.toLowerCase() || p.nationalId === selectedTicket.nationalId)
    : null;
  const latestVisit = matchedPatient && matchedPatient.visits.length > 0
    ? matchedPatient.visits[matchedPatient.visits.length - 1]
    : null;

  const totalCartValue = cart.reduce((acc, curr) => acc + curr.med.price * curr.qty, 0);

  return (
    <div id="smart-pharmacy" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pharmacy POS & Dispensation Desk</h2>
            <p className="text-xs text-gray-500">Real-time depletion, FIFO expiry tracking, and stock reorder triggers</p>
          </div>
        </div>

        {/* Selected Prescription Queue & Inventory Control */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-drug-inventory"
            type="button"
            onClick={() => setInventoryModalOpen(true)}
            className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Pill className="w-4 h-4 text-teal-300" />
            <span>Drug Inventory Database</span>
          </button>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-gray-500">Queue Prescriptions:</label>
            {activePrescriptions.length === 0 ? (
              <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-150">
                No pending prescriptions
              </span>
            ) : (
              <select
                id="select-pending-prescription"
                value={selectedPrescriptionId || ""}
                onChange={(e) => {
                  setSelectedPrescriptionId(e.target.value || null);
                }}
                className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold focus:outline-hidden"
              >
                <option value="">-- Choose Queue Ticket --</option>
                {activePrescriptions.map((tick) => (
                  <option key={tick.id} value={tick.id}>
                    {tick.ticketNo} - {tick.patientName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventory Catalogue & Reorder Alerts */}
        <div className="lg:col-span-7 space-y-4 pr-0 lg:pr-2 lg:border-r border-gray-100">
          {/* Scan feedback status banner */}
          {scanStatus && (
            <div className={`p-3 rounded-xl text-xs font-bold border transition-all ${
              scanStatus.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-rose-50 text-rose-800 border-rose-200"
            } flex items-center justify-between`}>
              <span>{scanStatus.message}</span>
              <button onClick={() => setScanStatus(null)} className="p-1 hover:bg-black/5 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Camera Scan Window & Live Web Video Stream */}
          {isScanning && (
            <div className="p-4 border border-orange-200 bg-orange-50/30 rounded-2xl space-y-3 relative">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-extrabold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                    <span>Live Camera Barcode Scanner Active</span>
                  </h4>
                  <p className="text-[10px] text-orange-700">Hold a drug package barcode or QR code in front of your camera</p>
                </div>
                <button
                  id="btn-close-camera-scanner"
                  onClick={() => setIsScanning(false)}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Turn Off Camera</span>
                </button>
              </div>

              {cameraError && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-850 rounded-xl text-[11px] font-semibold">
                  ⚠️ Camera Access Error: {cameraError}
                  <p className="mt-1 text-[10px] opacity-80 font-normal">Please make sure this tab has camera permissions. If you are in a sandboxed iframe, you can use the Hardware Simulator below!</p>
                </div>
              )}

              {/* Viewfinder element for html5-qrcode library */}
              <div className="relative overflow-hidden bg-slate-950 rounded-xl aspect-video border-2 border-orange-400">
                <div id="camera-scanner-view" className="w-full h-full"></div>
                {/* Visual Scanner Overlay crosshair */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-orange-500"></div>
                    <div className="w-4 h-4 border-t-2 border-r-2 border-orange-500"></div>
                  </div>
                  {/* Flashing Laser Line */}
                  <div className="w-full h-0.5 bg-orange-500 shadow-lg shadow-orange-500/50 animate-pulse"></div>
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-orange-500"></div>
                    <div className="w-4 h-4 border-b-2 border-r-2 border-orange-500"></div>
                  </div>
                </div>
              </div>
              
              {/* Useful guide for scanning */}
              <div className="p-3 bg-white/80 border border-orange-100 rounded-xl text-[11px] space-y-2">
                <p className="font-bold text-gray-800">Scannable Drug Batches in current system:</p>
                <div className="flex flex-wrap gap-1.5">
                  {medications.map((m) => (
                    <div key={m.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => triggerMockScanForCode(m.batchNo)}
                        className="px-2 py-1 bg-slate-100 hover:bg-orange-100 hover:text-orange-900 border border-gray-200 rounded-md font-mono text-[9px] text-gray-700 cursor-pointer transition-all flex items-center gap-1"
                        title="Click to scan drug batch barcode into system"
                      >
                        <span>{m.batchNo}</span>
                        <span className="text-[8px] text-gray-400 font-sans">({m.name.split(" ")[0]})</span>
                      </button>
                      
                      {/* Show Real live QR code image generated on the fly for the camera to read! */}
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 w-40 text-center">
                        <p className="text-[9px] font-bold text-gray-800 mb-1">Scan me with webcam!</p>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${m.batchNo}`} 
                          alt="QR Code" 
                          className="w-28 h-28 mx-auto border border-gray-150"
                          referrerPolicy="no-referrer"
                        />
                        <p className="text-[8px] text-gray-400 font-mono mt-1">{m.batchNo}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-gray-400 italic">💡 Hover over any drug batch pill to display its live QR Code! You can scan it using your smartphone/webcam, or simply click it to trigger a quick test scan.</p>
              </div>
            </div>
          )}

          {/* Search bar & Barcode controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Direct Search input */}
            <div className="relative md:col-span-5">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                id="pos-search-input"
                type="text"
                placeholder="Search catalog by name..."
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-hidden"
              />
            </div>

            {/* Hardware simulated / handheld gun scanner input */}
            <form onSubmit={handleKeyboardGunScanSubmit} className="relative md:col-span-4 flex gap-1.5">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Scan batch/laser code..."
                  value={keyboardScanInput}
                  onChange={(e) => setKeyboardScanInput(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-orange-200 bg-orange-50/10 focus:bg-white rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  title="Simulate a hardware handheld laser barcode gun scan by typing or pasting a drug code and pressing Enter"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
              >
                Scan
              </button>
            </form>

            {/* Toggle Web-Camera QR & Barcode Scanner */}
            <button
              id="btn-pos-barcode-camera-toggle"
              type="button"
              onClick={() => setIsScanning(!isScanning)}
              className={`md:col-span-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isScanning 
                  ? "bg-rose-600 hover:bg-rose-700 text-white" 
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {isScanning ? (
                <>
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Camera</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-orange-400" />
                  <span>Scan with Camera</span>
                </>
              )}
            </button>
          </div>

          {/* Catalog grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pharmacy Drug Stock Catalog</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {medications
                .filter((m) => m.name.toLowerCase().includes(scanQuery.toLowerCase()))
                .map((med) => {
                  const isLowStock = med.quantity < med.minThreshold;
                  const expCheck = checkExpiryStatus(med.expiryDate);
                  const imgUrl = getMedicationImage(med);
                  
                  return (
                    <div
                      key={med.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 transition-all group ${
                        med.quantity <= 0
                          ? "bg-rose-50/20 border-rose-100 opacity-80"
                          : isLowStock
                          ? "bg-amber-50/10 border-amber-100"
                          : "bg-white border-gray-150 hover:border-emerald-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Drug Thumbnail Image */}
                        <div className="relative w-18 h-18 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                          <img
                            src={imgUrl}
                            alt={med.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-mono font-bold rounded">
                            {med.quantity} in stock
                          </span>
                        </div>

                        {/* Drug Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <p className="font-extrabold text-xs text-gray-900 truncate" title={med.name}>{med.name}</p>
                          </div>
                          <p className="text-xs font-extrabold text-emerald-700 font-mono mt-0.5">
                            KES {med.price}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                            {med.category} • <span className="font-mono">#{med.batchNo}</span>
                          </p>

                          {/* Expiry badge */}
                          <div className="mt-1">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border inline-block ${expCheck.color}`}>
                              Exp: {med.expiryDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Warnings / Expiry alerts */}
                      <div className="space-y-1">
                        {med.quantity <= 0 ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> REORDER: OUT OF STOCK!
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> LOW STOCK (Min: {med.minThreshold})
                          </span>
                        ) : null}
                      </div>

                      <button
                        id={`btn-pos-add-${med.id}`}
                        onClick={() => addToCart(med, 1)}
                        disabled={med.quantity <= 0}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add to Dispense Cart</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* POS Cart Summary */}
        <div className="lg:col-span-5 flex flex-col justify-between border border-gray-150 rounded-2xl p-5 bg-gray-50/40">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <ShoppingCart className="w-4.5 h-4.5 text-gray-400" />
              <span>Checkout Dispensing Register</span>
            </h3>

            {selectedPrescriptionId && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs text-emerald-950 space-y-3 shadow-2xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase font-black text-emerald-800 tracking-wider">Doctor Prescription Feed</span>
                    <h4 className="font-extrabold text-sm text-emerald-900">{selectedTicket?.patientName}</h4>
                    <p className="text-[10px] text-emerald-800/70 font-mono">ID: {selectedTicket?.nationalId}</p>
                  </div>
                  <span className="px-1.5 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[9px] rounded font-mono">
                    {selectedTicket?.ticketNo}
                  </span>
                </div>

                {latestVisit ? (
                  <div className="space-y-2.5">
                    {latestVisit.diagnosis && (
                      <p className="text-[11px] bg-white/70 p-2 rounded-lg border border-emerald-100/50">
                        <strong className="text-emerald-900 font-bold">Diagnosis:</strong> {latestVisit.diagnosis}
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <p className="font-bold text-[10px] uppercase text-emerald-800 tracking-wider">Prescribed Items:</p>
                      {latestVisit.prescriptions && latestVisit.prescriptions.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {latestVisit.prescriptions.map((rx, idx) => {
                            const match = medications.find(
                              (m) =>
                                m.name.toLowerCase().includes(rx.drugName.toLowerCase()) ||
                                rx.drugName.toLowerCase().includes(m.name.toLowerCase())
                            );
                            const inStock = match ? match.quantity : 0;
                            const isMatchFound = !!match;

                            return (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-emerald-100/50 flex flex-col gap-1 shadow-2xs">
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-slate-950">{rx.drugName}</span>
                                  {isMatchFound ? (
                                    inStock <= 0 ? (
                                      <span className="px-1 py-0.5 bg-red-100 border border-red-250 text-red-700 font-extrabold text-[8px] rounded-sm">OUT OF STOCK</span>
                                    ) : (
                                      <span className="px-1 py-0.5 bg-emerald-100 border border-emerald-250 text-emerald-800 font-extrabold text-[8px] rounded-sm">IN STOCK ({inStock})</span>
                                    )
                                  ) : (
                                    <span className="px-1 py-0.5 bg-amber-100 border border-amber-250 text-amber-700 font-extrabold text-[8px] rounded-sm">CATALOGUE MISMATCH</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-medium">
                                  <span>Qty: <strong className="font-semibold text-gray-800">{rx.quantity}</strong></span>
                                  <span>•</span>
                                  <span>Dosage: <strong className="font-semibold text-gray-800">{rx.dosage}</strong></span>
                                </div>
                                {rx.instructions && (
                                  <p className="text-[10px] text-emerald-800/80 bg-emerald-50/30 px-1.5 py-0.5 rounded-md italic">
                                    "{rx.instructions}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-800/60 italic">No specific medicines compiled in this clinical visit.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        id="btn-print-pharmacy-rx"
                        type="button"
                        onClick={() => setPrintOpen(true)}
                        className="py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 shadow-3xs transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Rx</span>
                      </button>

                      <button
                        id="btn-reload-prescriptions"
                        type="button"
                        onClick={() => {
                          const newCart: { med: Medication; qty: number }[] = [];
                          latestVisit.prescriptions?.forEach((rx) => {
                            const match = medications.find(
                              (m) =>
                                m.name.toLowerCase().includes(rx.drugName.toLowerCase()) ||
                                rx.drugName.toLowerCase().includes(m.name.toLowerCase())
                            );
                            if (match && match.quantity > 0) {
                              const dispenseQty = Math.min(rx.quantity, match.quantity);
                              newCart.push({ med: match, qty: dispenseQty });
                            }
                          });
                          setCart(newCart);
                        }}
                        className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 shadow-3xs transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Cart to Rx</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/60 border border-dashed border-emerald-200 rounded-xl text-center">
                    <p className="text-[11px] text-emerald-800/70 italic">Loading patient medical clinical visit history...</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-xs text-gray-400">
                  <PackageOpen className="w-10 h-10 mb-2 opacity-30" />
                  <span>Your dispensing register is empty. Scan barcodes or select medications from the catalogue to prepare.</span>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const itemImg = getMedicationImage(item.med);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-gray-100 rounded-xl flex items-center justify-between gap-2.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={itemImg}
                          alt={item.med.name}
                          className="w-10 h-10 shrink-0 rounded-lg object-cover border border-gray-200 bg-gray-50"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=300&q=80";
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-gray-800 truncate" title={item.med.name}>{item.med.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            KES {item.med.price} × {item.qty} = <span className="font-bold text-emerald-700">KES {(item.med.price * item.qty).toLocaleString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                          <button
                            id={`btn-cart-minus-${idx}`}
                            onClick={() => {
                              if (item.qty > 1) {
                                const updated = [...cart];
                                updated[idx].qty -= 1;
                                setCart(updated);
                              }
                            }}
                            className="px-2 py-0.5 hover:bg-gray-100 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 font-bold font-mono text-[11px]">{item.qty}</span>
                          <button
                            id={`btn-cart-plus-${idx}`}
                            onClick={() => {
                              if (item.qty + 1 <= item.med.quantity) {
                                const updated = [...cart];
                                updated[idx].qty += 1;
                                setCart(updated);
                              } else {
                                alert("Cannot add. Out of stock limits.");
                              }
                            }}
                            className="px-2 py-0.5 hover:bg-gray-100 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          id={`btn-cart-del-${idx}`}
                          onClick={() => removeFromCart(idx)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors border border-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-150 pt-4 mt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-600">Total Invoice Amount:</span>
              <span className="text-lg font-black text-gray-900 font-mono">
                KES {totalCartValue.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2">
              <button
                id="btn-open-pos-checkout"
                type="button"
                onClick={() => setPosCheckoutModalOpen(true)}
                disabled={submitting || cart.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-40 cursor-pointer"
              >
                <Smartphone className="w-4.5 h-4.5" />
                <span>Proceed to POS Checkout (M-Pesa / Cash)</span>
              </button>

              <button
                id="btn-pos-checkout-dispense"
                type="button"
                onClick={handlePOSCheckout}
                disabled={submitting || cart.length === 0}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{submitting ? "Processing..." : "Direct Dispense to Central Billing (eTIMS)"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drug Inventory Database Modal (Exclusive Authority) */}
      <PharmacyInventoryModal
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        medications={medications}
        userRole={userRole}
      />

      {/* Integrated Pharmacy POS Checkout Modal (M-Pesa / Cash) */}
      <PharmacyPOSCheckoutModal
        isOpen={posCheckoutModalOpen}
        onClose={() => setPosCheckoutModalOpen(false)}
        cart={cart}
        patientName={selectedTicket?.patientName || matchedPatient?.patientName || "Walk-in Patient"}
        nationalId={selectedTicket?.nationalId || matchedPatient?.nationalId || ""}
        patientPhone={matchedPatient?.phone || "0712345678"}
        ticketId={selectedPrescriptionId}
        onCheckoutComplete={() => {
          setCart([]);
          setSelectedPrescriptionId(null);
          onDispenseCompleted();
        }}
      />

      {/* Print Overlay Modal for Digital Prescriptions */}
      {matchedPatient && latestVisit && (
        <PrintDocument
          isOpen={printOpen}
          onClose={() => setPrintOpen(false)}
          type="prescription"
          prescriptionData={{
            patient: matchedPatient,
            visit: latestVisit,
          }}
        />
      )}
    </div>
  );
}

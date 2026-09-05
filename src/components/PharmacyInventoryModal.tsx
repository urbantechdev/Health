import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Medication } from "../types";
import { 
  PackagePlus, 
  X, 
  Pill, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Plus, 
  Minus, 
  Search,
  Layers,
  Calendar,
  DollarSign,
  ShieldAlert,
  Camera,
  CameraOff,
  Barcode,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Flame,
  Heart,
  Activity,
  Shield,
  Droplet,
  Wind,
  Sun,
  Syringe,
  ShieldCheck,
  Package,
  Check,
  ScanLine,
  Loader2,
  Tag,
  ShoppingCart,
  UploadCloud
} from "lucide-react";
import { toast, modernConfirm } from "../lib/promptService";
import { Html5Qrcode } from "html5-qrcode";
import { uploadDrugDictionaryToFirestore } from "../services/drugInventorySync";

export interface DrugCategoryMeta {
  name: string;
  icon: React.ElementType;
  badgeClass: string;
  borderClass: string;
  bgGrad: string;
  description: string;
  suggestedMeds: string[];
  defaultPrice: number;
}

export const DRUG_CATEGORY_DEFINITIONS: DrugCategoryMeta[] = [
  {
    name: "Antibiotics",
    icon: Pill,
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-blue-300 hover:border-blue-500",
    bgGrad: "from-blue-50 to-indigo-50",
    description: "Broad & narrow spectrum antibacterials, beta-lactams & fluoroquinolones",
    suggestedMeds: [
      "Amoxicillin 500mg Capsules",
      "Azithromycin 500mg Tablets",
      "Ceftriaxone 1g IV/IM Vial",
      "Ciprofloxacin 500mg Tablets",
      "Augmentin (Amoxicillin/Clav) 625mg",
      "Doxycycline 100mg Capsules",
      "Metronidazole 400mg Tablets"
    ],
    defaultPrice: 250
  },
  {
    name: "Analgesics & Antipyretics",
    icon: Flame,
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    borderClass: "border-rose-300 hover:border-rose-500",
    bgGrad: "from-rose-50 to-pink-50",
    description: "NSAIDs, pain management, fever reducers & antispasmodics",
    suggestedMeds: [
      "Paracetamol 500mg Tablets",
      "Ibuprofen 400mg Tablets",
      "Diclofenac Sodium 50mg",
      "Tramadol 50mg Capsules",
      "Mefenamic Acid 500mg",
      "Hyoscine Butylbromide 10mg (Buscopan)",
      "Meloxicam 15mg Tablets"
    ],
    defaultPrice: 150
  },
  {
    name: "Antihypertensives",
    icon: Heart,
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    borderClass: "border-red-300 hover:border-red-500",
    bgGrad: "from-red-50 to-rose-50",
    description: "Blood pressure regulation, CCBs, ARBs, ACE inhibitors & beta-blockers",
    suggestedMeds: [
      "Amlodipine 5mg Tablets",
      "Amlodipine 10mg Tablets",
      "Losartan Potassium 50mg",
      "Enalapril Maleate 10mg",
      "Atenolol 50mg Tablets",
      "Hydrochlorothiazide 25mg",
      "Telmisartan 40mg Tablets"
    ],
    defaultPrice: 350
  },
  {
    name: "Antidiabetics",
    icon: Activity,
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    borderClass: "border-amber-300 hover:border-amber-500",
    bgGrad: "from-amber-50 to-orange-50",
    description: "Oral hypoglycemics, insulin analogues, glycemic balance agents",
    suggestedMeds: [
      "Metformin HCl 500mg Tablets",
      "Metformin HCl 850mg Tablets",
      "Glimepiride 2mg Tablets",
      "Glibenclamide 5mg Tablets",
      "Insulin Mixtard 30/70 100IU/ml Vial",
      "Vildagliptin 50mg Tablets"
    ],
    defaultPrice: 400
  },
  {
    name: "Antimalarials",
    icon: Shield,
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    borderClass: "border-emerald-300 hover:border-emerald-500",
    bgGrad: "from-emerald-50 to-teal-50",
    description: "Artemisinin combinations, plasmodium eradication, prophylaxis",
    suggestedMeds: [
      "Artemether + Lumefantrine 20/120mg (AL 6x4)",
      "Artemether + Lumefantrine 20/120mg (AL 6x1 Paediatric)",
      "Quinine Sulphate 300mg Tablets",
      "Artesunate 60mg Injection Vial",
      "Dihydroartemisinin + Piperaquine (Duo-Cotecxin)"
    ],
    defaultPrice: 300
  },
  {
    name: "Antihistamines",
    icon: Sparkles,
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    borderClass: "border-purple-300 hover:border-purple-500",
    bgGrad: "from-purple-50 to-violet-50",
    description: "Allergic rhinitis, urticaria, pruritus & H1-receptor antagonists",
    suggestedMeds: [
      "Cetirizine 10mg Tablets",
      "Loratadine 10mg Tablets",
      "Chlorpheniramine Maleate 4mg (Piriton)",
      "Fexofenadine 120mg Tablets",
      "Hydroxyzine 25mg Tablets"
    ],
    defaultPrice: 180
  },
  {
    name: "Cardiovascular",
    icon: Heart,
    badgeClass: "bg-rose-100 text-rose-900 border-rose-200",
    borderClass: "border-rose-300 hover:border-rose-500",
    bgGrad: "from-rose-50 to-red-50",
    description: "Lipid-lowering statins, antiplatelets, antianginals, inotropes",
    suggestedMeds: [
      "Atorvastatin 20mg Tablets",
      "Rosuvastatin 10mg Tablets",
      "Clopidogrel 75mg Tablets",
      "Aspirin 75mg Gastro-resistant (Cardioprotective)",
      "Digoxin 0.25mg Tablets",
      "Isosorbide Dinitrate 10mg"
    ],
    defaultPrice: 450
  },
  {
    name: "Gastrointestinal",
    icon: Droplet,
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    borderClass: "border-teal-300 hover:border-teal-500",
    bgGrad: "from-teal-50 to-cyan-50",
    description: "Proton pump inhibitors, antacids, antiemetics & antidiarrheals",
    suggestedMeds: [
      "Omeprazole 20mg Capsules",
      "Pantoprazole 40mg Tablets",
      "Esomeprazole 40mg Tablets",
      "Magnesium Trisilicate Suspension 200ml",
      "Loperamide 2mg Capsules",
      "Metoclopramide 10mg Tablets",
      "Oral Rehydration Salts (ORS) Sachets"
    ],
    defaultPrice: 200
  },
  {
    name: "Respiratory",
    icon: Wind,
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    borderClass: "border-sky-300 hover:border-sky-500",
    bgGrad: "from-sky-50 to-blue-50",
    description: "Bronchodilators, inhaled corticosteroids, mucolytics & expectorants",
    suggestedMeds: [
      "Salbutamol Inhaler 100mcg (Ventolin)",
      "Budesonide Inhaler 200mcg",
      "Montelukast 10mg Tablets",
      "Salbutamol 4mg Tablets",
      "Cough Expectorant Syrup 100ml",
      "Bromhexine 8mg Tablets"
    ],
    defaultPrice: 380
  },
  {
    name: "Vitamins & Supplements",
    icon: Sun,
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
    borderClass: "border-yellow-300 hover:border-yellow-500",
    bgGrad: "from-yellow-50 to-amber-50",
    description: "Haematinics, antenatal micronutrients, electrolytes & vitamins",
    suggestedMeds: [
      "Multivitamin + Zinc Tablets",
      "Ferrous Sulphate + Folic Acid (FEFO) Tabs",
      "Vitamin C 500mg Chewable",
      "Calcium Carbonate + Vitamin D3 500mg",
      "Vitamin B Complex Tablets",
      "Zinc Sulphate 20mg Dispersible"
    ],
    defaultPrice: 160
  },
  {
    name: "Topical & Dermatology",
    icon: Layers,
    badgeClass: "bg-lime-100 text-lime-800 border-lime-200",
    borderClass: "border-lime-300 hover:border-lime-500",
    bgGrad: "from-lime-50 to-emerald-50",
    description: "Topical steroids, antifungals, antibacterial ointments & burn creams",
    suggestedMeds: [
      "Hydrocortisone 1% Cream 15g",
      "Clotrimazole 1% Cream 20g",
      "Silver Sulfadiazine 1% Burn Cream 50g",
      "Betamethasone + Neomycin Cream 15g",
      "Calamine Lotion 100ml",
      "Gentian Violet 1% Solution"
    ],
    defaultPrice: 220
  },
  {
    name: "Injectables & Infusions",
    icon: Syringe,
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    borderClass: "border-cyan-300 hover:border-cyan-500",
    bgGrad: "from-cyan-50 to-teal-50",
    description: "IV fluids, parenteral medications, resuscitation injectables",
    suggestedMeds: [
      "Normal Saline 0.9% 500ml IV Infusion",
      "Ringers Lactate 500ml IV Infusion",
      "5% Dextrose in Water 500ml IV Infusion",
      "Water for Injection 10ml Ampoules",
      "IV Cannula 20G Pink with Injection Port",
      "IV Infusion Giving Set with Air Vent"
    ],
    defaultPrice: 280
  },
  {
    name: "Vaccines & Biologics",
    icon: ShieldCheck,
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-200",
    borderClass: "border-emerald-300 hover:border-emerald-500",
    bgGrad: "from-emerald-50 to-green-50",
    description: "EPI immunizations, anti-tetanus, anti-rabies & biologics",
    suggestedMeds: [
      "Tetanus Toxoid 0.5ml IM Injection",
      "Anti-Rabies Vaccine 1ml Purified",
      "Hepatitis B Adult Recombinant Vaccine",
      "Anti-D Immunoglobulin 300mcg Injection"
    ],
    defaultPrice: 850
  },
  {
    name: "Other & Medical Supplies",
    icon: Package,
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    borderClass: "border-slate-300 hover:border-slate-500",
    bgGrad: "from-slate-50 to-gray-50",
    description: "Surgical consumables, disposables, bandages & specialized formulary",
    suggestedMeds: [
      "Surgical Syringe 5ml with 21G Needle",
      "Surgical Syringe 10ml with 21G Needle",
      "Sterile Gauze Bandage 10cm x 4m",
      "Cotton Wool 500g Roll",
      "Latex Examination Gloves Medium (Box 100)",
      "Surgical Spirit 70% 500ml"
    ],
    defaultPrice: 120
  }
];

export const DRUG_CATEGORIES = DRUG_CATEGORY_DEFINITIONS.map(c => c.name);

interface PharmacyInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  medications: Medication[];
  userRole?: string;
  initialMode?: "list" | "create" | "wizard";
  initialBarcode?: string;
  onFeedToPOS?: (med: Medication, qty?: number) => void;
}

export default function PharmacyInventoryModal({
  isOpen,
  onClose,
  medications,
  userRole = "Pharmacy",
  initialMode = "list",
  initialBarcode = "",
  onFeedToPOS,
}: PharmacyInventoryModalProps) {
  const [activeTab, setActiveTab] = useState<"list" | "create" | "wizard">(initialMode);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingMedId, setEditingMedId] = useState<string | null>(null);

  // Form states for creating / editing drug
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Antibiotics");
  const [quantity, setQuantity] = useState(100);
  const [minThreshold, setMinThreshold] = useState(20);
  const [price, setPrice] = useState(250);
  const [batchNo, setBatchNo] = useState(`BN-${Math.floor(Math.random() * 89999 + 10000)}`);
  const [expiryDate, setExpiryDate] = useState("2027-12-31");
  const [saving, setSaving] = useState(false);

  // Camera Barcode Scanning States for Wizard Step 2
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [scannedCodeFlash, setScannedCodeFlash] = useState(false);
  const [syncingDictionary, setSyncingDictionary] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleSyncDrugDictionary = async () => {
    const confirmed = await modernConfirm(
      "This will upload and synchronize the official 429+ Drug Reference Dictionary (Generic Names, Brand Labels, Formulations, Strengths, and Categorized Pricing) directly to your Firestore database. Existing custom inventory counts will be preserved. Continue?",
      {
        title: "Sync Drug Reference Inventory?",
        confirmText: "Yes, Sync Dictionary",
        cancelText: "Cancel",
      }
    );
    if (!confirmed) return;

    setSyncingDictionary(true);
    try {
      const res = await uploadDrugDictionaryToFirestore();
      if (res.success) {
        toast.success(res.message, "Catalog Synchronized");
      } else {
        toast.error(res.message, "Sync Failed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload drug reference inventory", "Sync Error");
    } finally {
      setSyncingDictionary(false);
    }
  };

  // Initialize or reset based on initialMode
  useEffect(() => {
    if (isOpen) {
      if (initialMode === "wizard") {
        startBarcodeWizard(initialBarcode);
      } else {
        setActiveTab(initialMode);
      }
    }
  }, [isOpen, initialMode, initialBarcode]);

  // Handle Camera Scanner Lifecycle for Wizard Step 2
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    if (isOpen && activeTab === "wizard" && wizardStep === 2) {
      const startCamera = async () => {
        try {
          setCameraError(null);
          setIsCameraActive(true);
          
          // Wait for DOM node to render
          await new Promise(r => setTimeout(r, 250));
          if (!isMounted) return;

          const container = document.getElementById("inventory-camera-scanner-view");
          if (!container) {
            console.warn("Scanner container not ready in DOM.");
            return;
          }

          html5QrCode = new Html5Qrcode("inventory-camera-scanner-view");
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (width, height) => {
                const boxWidth = Math.min(width * 0.85, 320);
                const boxHeight = Math.min(height * 0.6, 200);
                return { width: Math.floor(boxWidth), height: Math.floor(boxHeight) };
              }
            },
            (decodedText) => {
              if (!decodedText) return;
              handleBarcodeCaptured(decodedText);
            },
            () => {
              // Frame scan failure ignored
            }
          );
        } catch (err: any) {
          console.error("Camera scanner startup failed:", err);
          if (isMounted) {
            setCameraError(err?.message || "Camera access was denied or is unavailable. You can enter or laser scan the barcode below.");
            setIsCameraActive(false);
          }
        }
      };

      startCamera();

      return () => {
        isMounted = false;
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().catch(err => console.error("Error stopping inventory camera:", err));
            }
          } catch (e) {
            console.error("Cleanup error in camera scanner:", e);
          }
        }
      };
    } else {
      setIsCameraActive(false);
    }
  }, [isOpen, activeTab, wizardStep]);

  if (!isOpen) return null;

  const isAuthorized = userRole === "Pharmacy" || userRole === "Super Admin" || userRole === "Admin";

  const selectedCategoryDef = DRUG_CATEGORY_DEFINITIONS.find(c => c.name === category) || DRUG_CATEGORY_DEFINITIONS[0];

  const filteredMeds = medications.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.log("Audio beep failed:", e);
    }
  };

  const startBarcodeWizard = (prefilledBarcode?: string) => {
    setActiveTab("wizard");
    setWizardStep(1); // ALWAYS START WITH STEP 1: SELECT DRUG CATEGORY FIRST!
    setEditingMedId(null);
    setName("");
    setQuantity(100);
    setMinThreshold(20);
    setPrice(selectedCategoryDef.defaultPrice || 250);
    setExpiryDate(new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]); // 2 years default
    if (prefilledBarcode && prefilledBarcode.trim()) {
      setBatchNo(prefilledBarcode.trim());
    } else {
      setBatchNo(`BN-${Math.floor(Math.random() * 89999 + 10000)}`);
    }
  };

  const handleSelectCategoryAndContinue = (catName: string) => {
    setCategory(catName);
    const catDef = DRUG_CATEGORY_DEFINITIONS.find(c => c.name === catName);
    if (catDef && (!price || price === 250)) {
      setPrice(catDef.defaultPrice);
    }
    // Advance to Step 2 (Scan with Camera)
    setWizardStep(2);
  };

  const handleBarcodeCaptured = (rawCode: string) => {
    const clean = rawCode.trim();
    if (!clean) return;

    playBeep();
    setScannedCodeFlash(true);
    setTimeout(() => setScannedCodeFlash(false), 800);

    // If GS1 DataMatrix or EAN parsed, format cleanly
    let finalBatch = clean;
    if (clean.startsWith("(01)") || clean.includes("(10)")) {
      // Parse GS1 identifier
      const batchMatch = clean.match(/\(10\)([^\(]+)/);
      if (batchMatch && batchMatch[1]) {
        finalBatch = batchMatch[1].trim();
      }
    }

    setBatchNo(finalBatch);
    toast.success(`Barcode Scanned: ${finalBatch}`, "Code Captured");

    // Check if this barcode already exists in medications
    const existing = medications.find(m => m.batchNo.toLowerCase() === clean.toLowerCase());
    if (existing) {
      toast.info(`Note: Batch "${clean}" matches existing medication: "${existing.name}". You can update its stock or register as variant.`, "Existing Batch Detected");
      setName(existing.name);
      setPrice(existing.price);
    }

    // Stop scanner and advance to Step 3 (Medication specs)
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setWizardStep(3);
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcodeInput.trim()) return;
    handleBarcodeCaptured(manualBarcodeInput);
    setManualBarcodeInput("");
  };

  const handleStartStandardCreate = () => {
    setName("");
    setCategory("Antibiotics");
    setQuantity(100);
    setMinThreshold(20);
    setPrice(250);
    setBatchNo(`BN-${Math.floor(Math.random() * 89999 + 10000)}`);
    setExpiryDate(new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setEditingMedId(null);
    setActiveTab("create");
  };

  const handleStartEdit = (med: Medication) => {
    setEditingMedId(med.id);
    setName(med.name);
    setCategory(med.category || "Antibiotics");
    setQuantity(med.quantity);
    setMinThreshold(med.minThreshold || 20);
    setPrice(med.price);
    setBatchNo(med.batchNo);
    setExpiryDate(med.expiryDate);
    setActiveTab("create");
  };

  const handleSaveDrug = async (e: React.FormEvent, scanNext = false, feedToPos = false, feedQty = 1) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.warning("Please specify the medication name and strength.", "Name Required");
      return;
    }

    if (!batchNo.trim()) {
      toast.warning("Please specify a batch number or barcode.", "Batch Number Required");
      return;
    }

    setSaving(true);
    try {
      if (editingMedId) {
        // Update existing drug in Firestore
        await updateDoc(doc(db, "medications", editingMedId), {
          name: cleanName,
          category,
          quantity: Number(quantity),
          minThreshold: Number(minThreshold),
          price: Number(price),
          batchNo: batchNo.trim(),
          expiryDate,
        });
        toast.success(`Updated ${cleanName} in pharmacy formulary.`, "Formulary Updated");
        
        if (feedToPos && onFeedToPOS) {
          const updatedMed: Medication = {
            id: editingMedId,
            name: cleanName,
            category,
            quantity: Number(quantity),
            minThreshold: Number(minThreshold),
            price: Number(price),
            batchNo: batchNo.trim(),
            expiryDate,
          };
          onFeedToPOS(updatedMed, feedQty);
          playBeep();
          toast.success(`Loaded ${feedQty}x "${cleanName}" directly into active POS register!`, "Barcode Fed to POS");
          onClose();
        } else {
          setActiveTab("list");
          setEditingMedId(null);
        }
      } else {
        // Duplicate check across existing medications in list
        const existingMed = medications.find(
          (m) => m.name.toLowerCase().trim() === cleanName.toLowerCase() && m.batchNo.toLowerCase().trim() === batchNo.toLowerCase().trim()
        );
        if (existingMed) {
          if (feedToPos && onFeedToPOS) {
            onFeedToPOS(existingMed, feedQty);
            playBeep();
            toast.success(`Loaded existing batch of "${cleanName}" directly into active POS register!`, "Fed to POS");
            onClose();
            return;
          }
          toast.warning(`Medication "${cleanName}" with Batch "${batchNo}" already exists in the formulary list.`, "Duplicate Medication Blocked");
          setSaving(false);
          return;
        }

        // Create new drug in Firestore
        const docRef = await addDoc(collection(db, "medications"), {
          name: cleanName,
          category,
          quantity: Number(quantity),
          minThreshold: Number(minThreshold),
          price: Number(price),
          batchNo: batchNo.trim(),
          expiryDate,
        });

        const newMed: Medication = {
          id: docRef.id,
          name: cleanName,
          category,
          quantity: Number(quantity),
          minThreshold: Number(minThreshold),
          price: Number(price),
          batchNo: batchNo.trim(),
          expiryDate,
        };

        toast.success(`Registered ${cleanName} (Batch: ${batchNo.trim()}) to pharmacy inventory database.`, "Medication Registered");

        if (feedToPos && onFeedToPOS) {
          onFeedToPOS(newMed, feedQty);
          playBeep();
          toast.success(`🚀 Loaded ${feedQty}x "${cleanName}" directly into active POS register!`, "Barcode Fed to POS");
          onClose();
        } else if (scanNext) {
          // Restart wizard for next scan
          startBarcodeWizard();
        } else {
          setActiveTab("list");
          setEditingMedId(null);
        }
      }
    } catch (err: any) {
      console.error("Error saving medication to inventory:", err);
      toast.error(err?.message || "Failed to save medication to inventory formulary.", "Save Error");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickRestock = async (medId: string, currentQty: number, addQty: number) => {
    try {
      const newQty = Math.max(0, currentQty + addQty);
      await updateDoc(doc(db, "medications", medId), {
        quantity: newQty,
      });
      if (addQty > 0) {
        toast.success(`Added +${addQty} units to stock. (New balance: ${newQty})`, "Stock Replenished");
      } else {
        toast.info(`Adjusted stock by ${addQty}. (New balance: ${newQty})`, "Stock Adjusted");
      }
    } catch (err) {
      console.error("Error updating stock:", err);
      toast.error("Failed to update stock quantity.", "Update Error");
    }
  };

  const handleDeleteMed = async (medId: string, medName: string) => {
    const confirmed = await modernConfirm(
      `Are you sure you want to remove "${medName}" from the pharmacy inventory database? This will permanently delete its batch records and formulary pricing.`,
      {
        title: "Remove Medication Formulary",
        type: "error",
        destructive: true,
        confirmText: "Delete Medication",
        cancelText: "Keep In Stock",
      }
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteDoc(doc(db, "medications", medId));
      toast.success(`Removed "${medName}" from pharmacy inventory.`, "Medication Deleted");
    } catch (err) {
      console.error("Error deleting medication:", err);
      toast.error("Failed to remove medication from database.", "Delete Error");
    }
  };

  // Filtered categories for Step 1 search
  const visibleCategories = DRUG_CATEGORY_DEFINITIONS.filter(c => 
    c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
    c.suggestedMeds.some(m => m.toLowerCase().includes(categorySearchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl max-w-4xl w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] border-0 sm:border border-gray-100 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 md:p-6 bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-teal-500/20 border border-teal-400/40 rounded-xl sm:rounded-2xl shadow-inner shrink-0">
              <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-teal-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white truncate">Drug Inventory & Barcode Intake</h2>
                <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 bg-teal-400 text-teal-950 rounded-full font-mono shadow-xs shrink-0">
                  Pharmacist Authority
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-teal-200/80 mt-0.5 font-medium hidden sm:block truncate">
                GS1 2D barcode camera onboarding, drug categorization wizard, batch numbers & FIFO unit pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0 active:scale-95"
            title="Close Inventory Window"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Warning if not authorized */}
        {!isAuthorized && (
          <div className="p-2.5 sm:p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              <strong>Read-Only Mode:</strong> Your role ({userRole}) has restricted view access. Only Pharmacist & Super Admin can modify the drug inventory.
            </span>
          </div>
        )}

        {/* Primary Navigation Tabs */}
        <div className="p-2.5 sm:p-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
                activeTab === "list"
                  ? "bg-teal-800 text-white shadow-xs"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Catalog ({medications.length})</span>
            </button>

            {isAuthorized && (
              <>
                {/* Dedicated Barcode Camera Wizard Button */}
                <button
                  id="btn-open-barcode-inventory-wizard"
                  onClick={() => startBarcodeWizard()}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
                    activeTab === "wizard"
                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                  }`}
                  title="Step-by-step barcode scanning & drug categorization wizard"
                >
                  <ScanLine className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-extrabold">+ Camera Intake</span>
                  <span className="text-[9px] bg-emerald-700 text-emerald-100 px-1.5 py-0.2 rounded-full font-mono ml-0.5">Wizard</span>
                </button>

                {/* Standard Manual Form */}
                <button
                  onClick={handleStartStandardCreate}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
                    activeTab === "create" && !editingMedId
                      ? "bg-teal-800 text-white shadow-xs"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Manual Form</span>
                </button>

                {/* Upload & Sync Drug Reference Dictionary (429+ Items) */}
                <button
                  id="btn-sync-drug-dictionary"
                  type="button"
                  onClick={handleSyncDrugDictionary}
                  disabled={syncingDictionary}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] bg-sky-50 text-sky-850 hover:bg-sky-100 border border-sky-300 disabled:opacity-50"
                  title="Upload or sync 429+ documented formulations from the Drug Reference Dictionary"
                >
                  {syncingDictionary ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  <span>{syncingDictionary ? "Syncing..." : "Sync 429+ Drug Reference"}</span>
                </button>
              </>
            )}
          </div>

          {activeTab === "list" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 flex-1 sm:max-w-md justify-end">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search drug name, batch, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 sm:py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-500 font-medium"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-2 sm:py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-hidden font-semibold text-gray-700"
              >
                <option value="all">All Categories</option>
                {DRUG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Body Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 bg-slate-50/50">

          {/* ========================================================================= */}
          {/* TAB 1: BARCODE SCANNER & CATEGORY SELECTION WIZARD */}
          {/* ========================================================================= */}
          {activeTab === "wizard" && isAuthorized && (
            <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
              
              {/* Wizard Step Progress Header */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-xs">
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  
                  {/* Step 1: Category */}
                  <button 
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className={`flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all ${
                      wizardStep === 1 
                        ? "text-emerald-700 font-black" 
                        : wizardStep > 1 
                        ? "text-emerald-900 font-bold opacity-90" 
                        : "text-gray-400"
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      wizardStep === 1 
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs" 
                        : wizardStep > 1 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {wizardStep > 1 ? <Check className="w-4 h-4" /> : "1"}
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-400 font-bold">Step 1</div>
                      <div className="text-[11px] sm:text-xs font-bold">Category</div>
                    </div>
                  </button>

                  <div className={`flex-1 h-0.5 mx-1 sm:mx-2 rounded-full ${wizardStep >= 2 ? "bg-emerald-500" : "bg-gray-200"}`} />

                  {/* Step 2: Camera Scan */}
                  <button 
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className={`flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all ${
                      wizardStep === 2 
                        ? "text-emerald-700 font-black" 
                        : wizardStep > 2 
                        ? "text-emerald-900 font-bold opacity-90" 
                        : "text-gray-400"
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      wizardStep === 2 
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs" 
                        : wizardStep > 2 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {wizardStep > 2 ? <Check className="w-4 h-4" /> : "2"}
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-400 font-bold">Step 2</div>
                      <div className="text-[11px] sm:text-xs font-bold">Barcode</div>
                    </div>
                  </button>

                  <div className={`flex-1 h-0.5 mx-1 sm:mx-2 rounded-full ${wizardStep >= 3 ? "bg-emerald-500" : "bg-gray-200"}`} />

                  {/* Step 3: Details & Confirm */}
                  <div 
                    className={`flex items-center gap-1.5 sm:gap-2 ${
                      wizardStep === 3 
                        ? "text-emerald-700 font-black" 
                        : "text-gray-400"
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      wizardStep === 3 
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs" 
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      3
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-400 font-bold">Step 3</div>
                      <div className="text-[11px] sm:text-xs font-bold">Intake</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* WIZARD STEP 1: SELECT DRUG CATEGORY FIRST                     */}
              {/* ------------------------------------------------------------- */}
              {wizardStep === 1 && (
                <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="p-2 sm:p-2.5 bg-white/10 rounded-xl shrink-0">
                        <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-extrabold text-white">Step 1: Choose Drug Category</h3>
                        <p className="text-[11px] sm:text-xs text-emerald-200/80">
                          Select the therapeutic class for rapid formulary classification.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-mono bg-emerald-800 text-emerald-200 px-2.5 py-0.5 sm:py-1 rounded-lg font-bold">
                      14 Categories Available
                    </span>
                  </div>

                  {/* Category Search Filter */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter categories (e.g. Antibiotic, Pain, Diabetes, Inhaler, Syrup)..."
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-hidden focus:border-emerald-500 shadow-xs"
                    />
                  </div>

                  {/* Category Grid Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-h-[42vh] sm:max-h-[380px] overflow-y-auto pr-0.5">
                    {visibleCategories.map((catDef) => {
                      const Icon = catDef.icon;
                      const isSelected = category === catDef.name;
                      return (
                        <button
                          key={catDef.name}
                          type="button"
                          onClick={() => handleSelectCategoryAndContinue(catDef.name)}
                          className={`p-3 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left relative group active:scale-[0.99] ${
                            isSelected 
                              ? "bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-200" 
                              : "bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50/80 shadow-xs"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 sm:gap-3">
                            <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                              isSelected ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                            }`}>
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-black text-gray-900 truncate">{catDef.name}</h4>
                                {isSelected && (
                                  <span className="p-0.5 bg-emerald-600 text-white rounded-full">
                                    <Check className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-gray-500 line-clamp-1 mt-0.5">{catDef.description}</p>
                              
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {catDef.suggestedMeds.slice(0, 2).map((medExample, idx) => (
                                  <span key={idx} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono truncate max-w-[130px]">
                                    {medExample.split(" ")[0]}
                                  </span>
                                ))}
                                {catDef.suggestedMeds.length > 2 && (
                                  <span className="text-[9px] text-gray-400">+{catDef.suggestedMeds.length - 2} more</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Step 1 Sticky Action Bar */}
                  <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-md">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 font-medium">Selected:</span>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-300">
                        {category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 min-h-[42px]"
                    >
                      <span>Continue to Barcode Scan</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* WIZARD STEP 2: SCAN BARCODE WITH CAMERA                       */}
              {/* ------------------------------------------------------------- */}
              {wizardStep === 2 && (
                <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  
                  {/* Category Summary Header with Change option */}
                  <div className="p-3 sm:p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-emerald-900 font-bold shrink-0">Category:</span>
                      <span className="px-2.5 py-0.5 bg-emerald-700 text-white rounded-lg font-black truncate">
                        {category}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer flex items-center gap-1 shrink-0 py-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Change</span>
                    </button>
                  </div>

                  {/* Live Camera Viewfinder Card */}
                  <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-xl overflow-hidden relative">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[11px] sm:text-xs font-extrabold tracking-wide uppercase text-slate-200">
                          Live Barcode Scanner
                        </span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                        GS1 DataMatrix / 1D / QR
                      </span>
                    </div>

                    {/* Camera Scanner View Area */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[180px] sm:min-h-[220px] flex flex-col items-center justify-center">
                      
                      {cameraError ? (
                        <div className="p-4 sm:p-6 text-center space-y-2 max-w-md">
                          <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 mx-auto" />
                          <p className="text-xs font-bold text-amber-200">{cameraError}</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-400">
                            Use the manual barcode input below or tap one of the quick test batch codes.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div id="inventory-camera-scanner-view" className="w-full h-full min-h-[180px] sm:min-h-[220px]" />
                          {/* Visual Target Guide Overlay */}
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-44 sm:w-64 h-24 sm:h-32 border-2 border-emerald-400/80 rounded-xl relative shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />
                              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/60 animate-bounce" />
                            </div>
                          </div>
                        </>
                      )}

                      {scannedCodeFlash && (
                        <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-100">
                          <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-2xl flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Barcode Detected!</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] sm:text-[11px] text-slate-400 text-center mt-2">
                      Point camera at the barcode on the drug package to capture automatically.
                    </p>
                  </div>

                  {/* Fallback Laser Barcode Gun / Manual Input */}
                  <div className="p-3 sm:p-4 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-2.5">
                    <form onSubmit={handleManualBarcodeSubmit} className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Or enter barcode / scan with USB gun..."
                          value={manualBarcodeInput}
                          onChange={(e) => setManualBarcodeInput(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!manualBarcodeInput.trim()}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[40px] flex items-center justify-center"
                      >
                        Submit Barcode
                      </button>
                    </form>

                    {/* Quick Simulation Barcodes */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          Sample Test Barcodes:
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-gray-400">Tap to test</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          `GS1-${category.slice(0, 4).toUpperCase()}-${Math.floor(Math.random() * 8999 + 1000)}`,
                          `EAN-616400${Math.floor(Math.random() * 899999 + 100000)}`,
                          `BN-${Math.floor(Math.random() * 89999 + 10000)}`
                        ].map((sampleCode, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleBarcodeCaptured(sampleCode)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 rounded-lg text-[10px] font-mono font-bold border border-gray-200 transition-colors cursor-pointer active:scale-95"
                          >
                            ⚡ {sampleCode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Sticky Footer Navigation */}
                  <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-md">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Category</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!batchNo) setBatchNo(`BN-${Math.floor(Math.random() * 89999 + 10000)}`);
                        setWizardStep(3);
                      }}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] active:scale-95"
                    >
                      <span>Skip Camera & Enter Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* WIZARD STEP 3: DRUG SPECS & SAVE CONFIRMATION                */}
              {/* ------------------------------------------------------------- */}
              {wizardStep === 3 && (
                <form onSubmit={(e) => handleSaveDrug(e, false)} className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  
                  {/* Verified Step Summary Banner */}
                  <div className="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs">
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                      <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-[11px] sm:text-xs font-bold text-emerald-950">Category:</span>
                          <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-black text-xs">{category}</span>
                          <span className="text-[11px] sm:text-xs font-bold text-emerald-950 sm:ml-2">Batch:</span>
                          <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono font-bold text-xs">{batchNo}</span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-emerald-800 mt-0.5">
                          Specify medication details, unit price (KES), and initial warehouse stock quantity.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center gap-1 cursor-pointer shrink-0 self-end sm:self-auto"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Rescan Barcode</span>
                    </button>
                  </div>

                  {/* Category Fast Auto-fill suggestions */}
                  {selectedCategoryDef.suggestedMeds.length > 0 && (
                    <div className="p-3 bg-white border border-gray-200 rounded-2xl space-y-1.5 shadow-xs">
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Quick Suggestions for {category}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCategoryDef.suggestedMeds.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setName(sug)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer active:scale-95 ${
                              name === sug
                                ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                                : "bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 border-gray-200"
                            }`}
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form input fields */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                      
                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-gray-800 block mb-1">Medication Name & Strength *</label>
                        <input
                          type="text"
                          required
                          placeholder={`e.g. ${selectedCategoryDef.suggestedMeds[0] || "Amoxicillin 500mg Capsules"}`}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-900 focus:border-emerald-500 focus:outline-hidden shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-gray-800 block mb-1">Drug Category *</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                        >
                          {DRUG_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-extrabold text-gray-800 block mb-1">Scanned Batch / Barcode *</label>
                        <input
                          type="text"
                          required
                          value={batchNo}
                          onChange={(e) => setBatchNo(e.target.value)}
                          className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-mono font-bold focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-gray-800 block mb-1">Initial Stock Quantity (Units) *</label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            required
                            min="0"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-black text-emerald-950 focus:border-emerald-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setQuantity(q => q + 50)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-bold shrink-0 min-h-[38px] active:scale-95"
                          >
                            +50
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuantity(q => q + 100)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-bold shrink-0 min-h-[38px] active:scale-95"
                          >
                            +100
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="font-extrabold text-gray-800 block mb-1">Minimum Alert Threshold *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={minThreshold}
                          onChange={(e) => setMinThreshold(Number(e.target.value))}
                          className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-gray-800 block mb-1">Unit Price (KES) *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">KES</span>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.5"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            className="w-full pl-12 pr-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-black text-emerald-950 focus:border-emerald-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-extrabold text-gray-800 block mb-1">Expiry Date (FIFO Protocol) *</label>
                        <div className="flex gap-1.5">
                          <input
                            type="date"
                            required
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setFullYear(d.getFullYear() + 2);
                              setExpiryDate(d.toISOString().split("T")[0]);
                            }}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-bold shrink-0 min-h-[38px] active:scale-95"
                            title="Set to 2 years from now"
                          >
                            +2 Yrs
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Step 3 Sticky Action Bar */}
                  <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-md">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Camera</span>
                    </button>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {onFeedToPOS && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={(e) => handleSaveDrug(e, false, true, 1)}
                          className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 min-h-[42px]"
                          title="Save this medication and immediately load it into the active POS dispensing counter"
                        >
                          <ShoppingCart className="w-4 h-4 text-emerald-200" />
                          <span>Save & Feed to POS</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={saving}
                        onClick={(e) => handleSaveDrug(e, true)}
                        className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 min-h-[40px] flex items-center justify-center"
                      >
                        Save & Scan Next
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 min-h-[42px] active:scale-95"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Save to Inventory</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </form>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MANUAL FORM CREATION / EDITING                                    */}
          {/* ========================================================================= */}
          {activeTab === "create" && isAuthorized && (
            <form onSubmit={(e) => handleSaveDrug(e, false)} className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
              <div className="p-3.5 sm:p-4 bg-teal-50/70 border border-teal-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-teal-950 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-700" />
                    <span>{editingMedId ? "Edit Medication Profile" : "Register Drug in Pharmacy Database"}</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-teal-800/80 mt-0.5">
                    Maintain accurate unit pricing and stock thresholds for automated inventory alerts.
                  </p>
                </div>
                {!editingMedId && (
                  <button
                    type="button"
                    onClick={() => startBarcodeWizard()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 self-end sm:self-auto"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Switch to Camera Wizard</span>
                  </button>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-700 block mb-1">Medication Name & Strength *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Amoxicillin 500mg Capsules"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-semibold focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Drug Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs focus:border-teal-500 focus:outline-hidden"
                    >
                      {DRUG_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Batch Number / Barcode *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BN-84920"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-mono focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Current Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Minimum Alert Threshold *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Unit Price (KES) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">KES</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.5"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full pl-12 pr-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs font-black text-teal-900 focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Expiry Date (FIFO Protocol) *</label>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl bg-white text-xs focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 shadow-md">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
                >
                  Cancel
                </button>
                {onFeedToPOS && (
                  <button
                    type="button"
                    disabled={saving || !isAuthorized}
                    onClick={(e) => handleSaveDrug(e, false, true, 1)}
                    className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 min-h-[42px] active:scale-95"
                    title="Save medication and immediately load into active POS register"
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-200" />
                    <span>Save & Feed to POS</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !isAuthorized}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 min-h-[42px] active:scale-95"
                >
                  {saving ? (
                    <span>Saving to Database...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingMedId ? "Update Record" : "Add to Inventory"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MASTER CATALOG LISTING                                            */}
          {/* ========================================================================= */}
          {activeTab === "list" && (
            <div className="space-y-3">
              {filteredMeds.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
                  <Pill className="w-10 h-10 mx-auto mb-2 opacity-30 text-teal-600" />
                  <p className="text-sm font-bold text-gray-700">No medications match your search filter</p>
                  <p className="text-xs mt-1 text-gray-500">Try another keyword or scan a new medication with the camera wizard.</p>
                  {isAuthorized && (
                    <button
                      onClick={() => startBarcodeWizard()}
                      className="mt-4 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                    >
                      <ScanLine className="w-4 h-4" />
                      <span>Launch Barcode Camera Wizard</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* MOBILE CARDS VIEW (Clean, touch-first card layout on mobile screens) */}
                  <div className="block sm:hidden space-y-2.5">
                    {filteredMeds.map((med) => {
                      const isLow = med.quantity <= (med.minThreshold || 20);
                      const isOut = med.quantity <= 0;
                      return (
                        <div
                          key={med.id}
                          className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-extrabold text-gray-900 text-xs leading-snug">{med.name}</h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                                  {med.category || "General"}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {med.batchNo}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-teal-900 font-mono">
                                KES {med.price.toLocaleString()}
                              </div>
                              <div className="text-[9px] text-gray-400 mt-0.5">Exp: {med.expiryDate}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs">
                            <div>
                              {isOut ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold border border-rose-200">
                                  0 (OUT OF STOCK)
                                </span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold border border-amber-200">
                                  {med.quantity} (LOW STOCK)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200">
                                  {med.quantity} in stock
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {onFeedToPOS && (
                                <button
                                  type="button"
                                  disabled={isOut}
                                  onClick={() => {
                                    onFeedToPOS(med, 1);
                                    playBeep();
                                    toast.success(`Loaded 1x ${med.name} into POS.`, "Fed to POS");
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-black transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 disabled:opacity-40"
                                >
                                  <ShoppingCart className="w-3 h-3 text-emerald-600" />
                                  <span>+ Feed POS</span>
                                </button>
                              )}

                              {isAuthorized && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleQuickRestock(med.id, med.quantity, 10)}
                                    title="Add 10 units"
                                    className="px-2 py-1 bg-gray-50 hover:bg-teal-50 text-teal-700 border border-gray-200 rounded text-[10px] font-bold active:scale-95"
                                  >
                                    +10
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(med)}
                                    className="p-1.5 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMed(med.id, med.name)}
                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden sm:block overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-3">Medication / Category</th>
                          <th className="p-3">Batch & Expiry</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-center">Stock Level</th>
                          {onFeedToPOS && <th className="p-3 text-center">Feed POS</th>}
                          <th className="p-3 text-center">Quick Restock</th>
                          {isAuthorized && <th className="p-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {filteredMeds.map((med) => {
                          const isLow = med.quantity <= (med.minThreshold || 20);
                          const isOut = med.quantity <= 0;
                          return (
                            <tr key={med.id} className="hover:bg-teal-50/30 transition-colors">
                              <td className="p-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-black text-gray-900 text-xs">{med.name}</span>
                                  {(med.formulation || med.strength) && (
                                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold border border-slate-200">
                                      {[med.formulation, med.strength].filter(Boolean).join(" • ")}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-semibold">
                                  {med.category || "General Medication"}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-mono text-gray-700 text-[11px] font-bold">{med.batchNo}</div>
                                <div className="text-[10px] text-gray-400">Exp: {med.expiryDate}</div>
                              </td>
                              <td className="p-3 text-right font-bold text-teal-900 font-mono">
                                KES {med.price.toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                {isOut ? (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold border border-rose-200">
                                    0 (OUT OF STOCK)
                                  </span>
                                ) : isLow ? (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold border border-amber-200">
                                    {med.quantity} (LOW STOCK)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200">
                                    {med.quantity} in stock
                                  </span>
                                )}
                              </td>
                              {onFeedToPOS && (
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    disabled={isOut}
                                    onClick={() => {
                                      onFeedToPOS(med, 1);
                                      playBeep();
                                      toast.success(`Loaded 1x ${med.name} into active POS dispensing register.`, "Fed to POS");
                                    }}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Add 1 unit directly to active POS cart"
                                  >
                                    <ShoppingCart className="w-3 h-3 text-emerald-600" />
                                    <span>+ Feed POS</span>
                                  </button>
                                </td>
                              )}
                              <td className="p-3 text-center">
                                {isAuthorized ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleQuickRestock(med.id, med.quantity, 10)}
                                      title="Add 10 units"
                                      className="px-2 py-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                    >
                                      +10
                                    </button>
                                    <button
                                      onClick={() => handleQuickRestock(med.id, med.quantity, 50)}
                                      title="Add 50 units"
                                      className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                    >
                                      +50
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">Restricted</span>
                                )}
                              </td>
                              {isAuthorized && (
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleStartEdit(med)}
                                      className="p-1.5 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                      title="Edit medication details"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMed(med.id, med.name)}
                                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete from catalog"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

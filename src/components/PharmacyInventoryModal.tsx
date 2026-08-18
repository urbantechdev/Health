import React, { useState } from "react";
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
  ShieldAlert
} from "lucide-react";

interface PharmacyInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  medications: Medication[];
  userRole?: string;
}

const DRUG_CATEGORIES = [
  "Antibiotics",
  "Analgesics & Antipyretics",
  "Antihypertensives",
  "Antidiabetics",
  "Antimalarials",
  "Antihistamines",
  "Cardiovascular",
  "Gastrointestinal",
  "Respiratory",
  "Vitamins & Supplements",
  "Topical & Dermatology",
  "Other",
];

export default function PharmacyInventoryModal({
  isOpen,
  onClose,
  medications,
  userRole = "Pharmacy",
}: PharmacyInventoryModalProps) {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
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
  const [expiryDate, setExpiryDate] = useState("2026-12-31");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const isAuthorized = userRole === "Pharmacy" || userRole === "Super Admin" || userRole === "Admin";

  const filteredMeds = medications.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleStartCreate = () => {
    setName("");
    setCategory("Antibiotics");
    setQuantity(100);
    setMinThreshold(20);
    setPrice(250);
    setBatchNo(`BN-${Math.floor(Math.random() * 89999 + 10000)}`);
    setExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
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

  const handleSaveDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please specify the medication name.");
      return;
    }

    setSaving(true);
    try {
      if (editingMedId) {
        // Update existing drug in Firestore
        await updateDoc(doc(db, "medications", editingMedId), {
          name: name.trim(),
          category,
          quantity: Number(quantity),
          minThreshold: Number(minThreshold),
          price: Number(price),
          batchNo: batchNo.trim(),
          expiryDate,
        });
      } else {
        // Create new drug in Firestore
        await addDoc(collection(db, "medications"), {
          name: name.trim(),
          category,
          quantity: Number(quantity),
          minThreshold: Number(minThreshold),
          price: Number(price),
          batchNo: batchNo.trim(),
          expiryDate,
        });
      }
      setActiveTab("list");
      setEditingMedId(null);
    } catch (err) {
      console.error("Error saving medication to inventory:", err);
      alert("Failed to save medication to inventory.");
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
    } catch (err) {
      console.error("Error updating stock:", err);
    }
  };

  const handleDeleteMed = async (medId: string, medName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${medName}" from the pharmacy inventory?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "medications", medId));
    } catch (err) {
      console.error("Error deleting medication:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 border border-teal-400/40 rounded-2xl">
              <Pill className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Drug Inventory Control & Database</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-teal-400 text-teal-950 rounded-full font-mono">
                  Exclusive Pharmacist Authority
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                Maintain medications master catalog, batch numbers, unit pricing (KES), and stock thresholds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Warning if not authorized */}
        {!isAuthorized && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Read-Only Mode:</strong> Your role ({userRole}) has restricted view access. Only Pharmacist & Super Admin can modify the drug inventory database.
            </span>
          </div>
        )}

        {/* Navigation bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "list"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Master Catalog ({medications.length} Drugs)
            </button>
            {isAuthorized && (
              <button
                onClick={handleStartCreate}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "create" && !editingMedId
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"
                }`}
              >
                <PackagePlus className="w-4 h-4" />
                <span>+ Add New Medication</span>
              </button>
            )}
          </div>

          {activeTab === "list" && (
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search drug name or batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-hidden"
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "create" ? (
            <form onSubmit={handleSaveDrug} className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl">
                <h3 className="text-sm font-bold text-teal-950 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-700" />
                  <span>{editingMedId ? "Edit Medication Profile" : "Register New Drug in Pharmacy Database"}</span>
                </h3>
                <p className="text-xs text-teal-800/80 mt-0.5">
                  Ensure accurate unit price and minimum warning threshold for automated low-stock warnings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="font-bold text-gray-700 block mb-1">Medication Name & Strength *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Amoxicillin 500mg Capsules"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-semibold focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Drug Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs focus:border-teal-500 focus:outline-hidden"
                  >
                    {DRUG_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Batch Number (Tracking) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BN-84920"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-mono focus:border-teal-500 focus:outline-hidden"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:border-teal-500 focus:outline-hidden"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:border-teal-500 focus:outline-hidden"
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
                      className="w-full pl-12 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-black text-teal-900 focus:border-teal-500 focus:outline-hidden"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !isAuthorized}
                  className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <span>Saving to Database...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingMedId ? "Update Medication Record" : "Add to Inventory Database"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {filteredMeds.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Pill className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold text-gray-600">No medications match your filter</p>
                  <p className="text-xs mt-1">Try another search keyword or add a new medication.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3">Medication / Category</th>
                        <th className="p-3">Batch & Expiry</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-center">Stock Level</th>
                        <th className="p-3 text-center">Quick Restock</th>
                        {isAuthorized && <th className="p-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {filteredMeds.map((med) => {
                        const isLow = med.quantity <= (med.minThreshold || 20);
                        const isOut = med.quantity <= 0;
                        return (
                          <tr key={med.id} className="hover:bg-teal-50/20 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-gray-900">{med.name}</div>
                              <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {med.category || "General Medication"}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-mono text-gray-600 text-[11px]">{med.batchNo}</div>
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

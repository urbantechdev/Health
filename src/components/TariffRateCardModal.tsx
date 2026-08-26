import React, { useState, useEffect } from "react";
import {
  Bed,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Save,
  Sliders,
  DollarSign,
  Building,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Tag
} from "lucide-react";
import { ProcedureTariffItem, WardBedRateSetting } from "../types";
import {
  subscribeProcedureTariffs,
  subscribeWardBedRates,
  saveProcedureTariff,
  deleteProcedureTariff,
  updateWardBedRate
} from "../lib/tariffService";
import { logSettingsChange } from "../lib/auditService";
import { toast, modernConfirm } from "../lib/promptService";

interface TariffRateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userEmail?: string;
}

export default function TariffRateCardModal({
  isOpen,
  onClose,
  userRole = "Billing & Accounts",
  userEmail = "billing@afyacare.go.ke"
}: TariffRateCardModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"bed_rates" | "procedure_tariffs">("bed_rates");
  
  // Bed rates state
  const [bedRates, setBedRates] = useState<WardBedRateSetting[]>([]);
  const [editingBedRateId, setEditingBedRateId] = useState<string | null>(null);
  const [bedRateForm, setBedRateForm] = useState<Partial<WardBedRateSetting>>({});
  const [savingBedRate, setSavingBedRate] = useState(false);

  // Procedure tariffs state
  const [tariffs, setTariffs] = useState<ProcedureTariffItem[]>([]);
  const [tariffSearch, setTariffSearch] = useState("");
  const [tariffCategoryFilter, setTariffCategoryFilter] = useState("all");
  const [editingTariffId, setEditingTariffId] = useState<string | null>(null);
  const [tariffForm, setTariffForm] = useState<Partial<ProcedureTariffItem>>({});
  const [isAddingNewTariff, setIsAddingNewTariff] = useState(false);
  const [savingTariff, setSavingTariff] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubTariffs = subscribeProcedureTariffs((data) => {
      setTariffs(data);
    });

    const unsubBeds = subscribeWardBedRates((data) => {
      setBedRates(data);
    });

    return () => {
      unsubTariffs();
      unsubBeds();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // BED RATE HANDLERS
  // -------------------------------------------------------------
  const handleStartEditBedRate = (rate: WardBedRateSetting) => {
    setEditingBedRateId(rate.id || rate.wardId);
    setBedRateForm({ ...rate });
  };

  const handleSaveBedRate = async () => {
    if (!editingBedRateId || !bedRateForm.wardId) return;

    setSavingBedRate(true);
    try {
      const oldRate = bedRates.find((r) => r.id === editingBedRateId || r.wardId === bedRateForm.wardId);
      const updatedSetting: WardBedRateSetting = {
        id: editingBedRateId,
        wardId: bedRateForm.wardId,
        wardName: bedRateForm.wardName || "Ward",
        category: bedRateForm.category || "General",
        dailyRate: Number(bedRateForm.dailyRate) || 1500,
        nursingDailyFee: Number(bedRateForm.nursingDailyFee) || 500,
        fileOpeningFee: Number(bedRateForm.fileOpeningFee) || 2000,
        updatedAt: new Date().toISOString()
      };

      await updateWardBedRate(updatedSetting);

      // Audit Log
      await logSettingsChange({
        changeType: "SYSTEM_SECURITY_CONFIG",
        fieldName: `Ward Bed Daily Rate: ${updatedSetting.wardName}`,
        oldValue: oldRate ? `Daily: KES ${oldRate.dailyRate}, Nursing: KES ${oldRate.nursingDailyFee || 0}` : "N/A",
        newValue: `Daily: KES ${updatedSetting.dailyRate}, Nursing: KES ${updatedSetting.nursingDailyFee || 0}`,
        userEmail,
        userRole,
        reason: `Hospital administrator updated ward bed & nursing rates for ${updatedSetting.wardName}.`
      });

      toast.success(
        `Bed rates for ${updatedSetting.wardName} updated to KES ${updatedSetting.dailyRate.toLocaleString()}/day.`,
        "Ward Rate Updated"
      );
      setEditingBedRateId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update bed rate.", "Update Error");
    } finally {
      setSavingBedRate(false);
    }
  };

  // -------------------------------------------------------------
  // PROCEDURE TARIFF HANDLERS
  // -------------------------------------------------------------
  const handleStartEditTariff = (item: ProcedureTariffItem) => {
    setIsAddingNewTariff(false);
    setEditingTariffId(item.id);
    setTariffForm({ ...item });
  };

  const handleStartAddNewTariff = () => {
    setEditingTariffId(null);
    setIsAddingNewTariff(true);
    setTariffForm({
      code: `PROC-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      category: "procedure",
      department: "Clinical Procedures",
      standardAmount: 1000,
      description: "",
      isTaxable: false,
      isActive: true
    });
  };

  const handleSaveTariff = async () => {
    if (!tariffForm.name || !tariffForm.standardAmount) {
      toast.warning("Please provide a valid procedure name and standard rate.", "Incomplete Tariff");
      return;
    }

    setSavingTariff(true);
    try {
      const saved = await saveProcedureTariff({
        id: isAddingNewTariff ? undefined : editingTariffId || undefined,
        code: tariffForm.code || `PROC-${Math.floor(100 + Math.random() * 900)}`,
        name: tariffForm.name,
        category: tariffForm.category || "procedure",
        department: tariffForm.department || "Clinical Services",
        standardAmount: Number(tariffForm.standardAmount) || 0,
        description: tariffForm.description || "",
        isTaxable: tariffForm.isTaxable ?? false,
        isActive: tariffForm.isActive ?? true
      });

      // Audit Log
      await logSettingsChange({
        changeType: "SYSTEM_SECURITY_CONFIG",
        fieldName: `Procedure Tariff: ${saved.name}`,
        oldValue: isAddingNewTariff ? "New Record" : "Previous Rate",
        newValue: `Rate: KES ${saved.standardAmount.toLocaleString()} (${saved.category})`,
        userEmail,
        userRole,
        reason: `${isAddingNewTariff ? "Created new" : "Updated"} hospital procedure tariff charge.`
      });

      toast.success(
        `Procedure '${saved.name}' configured at KES ${saved.standardAmount.toLocaleString()}.`,
        "Tariff Saved"
      );
      setEditingTariffId(null);
      setIsAddingNewTariff(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save procedure tariff.", "Error");
    } finally {
      setSavingTariff(false);
    }
  };

  const handleDeleteTariff = async (item: ProcedureTariffItem) => {
    const confirmed = await modernConfirm(
      `Are you sure you want to delete the tariff for "${item.name}" (KES ${item.standardAmount.toLocaleString()})?`,
      {
        title: "Delete Procedure Tariff",
        type: "error",
        destructive: true,
        confirmText: "Delete Tariff",
        cancelText: "Keep Tariff"
      }
    );
    if (!confirmed) return;

    try {
      await deleteProcedureTariff(item.id);
      await logSettingsChange({
        changeType: "SYSTEM_SECURITY_CONFIG",
        fieldName: `Deleted Tariff: ${item.name}`,
        oldValue: `KES ${item.standardAmount}`,
        newValue: "Deleted",
        userEmail,
        userRole,
        reason: `Removed procedure tariff ${item.code} from hospital master billing rate card.`
      });
      toast.success(`Tariff '${item.name}' removed.`, "Tariff Deleted");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete procedure tariff.", "Delete Error");
    }
  };

  const filteredTariffs = tariffs.filter((t) => {
    const matchesSearch =
      tariffSearch === "" ||
      t.name.toLowerCase().includes(tariffSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(tariffSearch.toLowerCase()) ||
      t.department.toLowerCase().includes(tariffSearch.toLowerCase());
    const matchesCat = tariffCategoryFilter === "all" || t.category === tariffCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">Hospital Tariffs & Fee Rate Card</h3>
                <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-mono font-bold text-indigo-300">
                  Master Price Ledger
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Configure daily bed occupancy rates by ward and standard charges for clinical procedures and diagnostics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-3 shrink-0">
          <button
            onClick={() => {
              setActiveSubTab("bed_rates");
              setIsAddingNewTariff(false);
              setEditingTariffId(null);
            }}
            className={`pb-3 px-3 text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeSubTab === "bed_rates"
                ? "border-indigo-600 text-indigo-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Bed className="w-4 h-4" />
            <span>Ward Bed & Daily Care Rates ({bedRates.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab("procedure_tariffs");
              setEditingBedRateId(null);
            }}
            className={`pb-3 px-3 text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeSubTab === "procedure_tariffs"
                ? "border-indigo-600 text-indigo-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Procedure, Lab & Clinical Tariffs ({tariffs.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================= */}
          {/* 1. WARD BED RATES SUB-TAB */}
          {/* ========================================================= */}
          {activeSubTab === "bed_rates" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span>Inpatient Bed Charge Schedule</span>
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    Daily bed occupancy rates are automatically applied when calculating inpatient billing and discharge totals.
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-600 font-mono bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shrink-0">
                  Currency: KES (Kenyan Shillings)
                </div>
              </div>

              {/* Table of Ward Bed Rates */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3.5">Ward / Room Type</th>
                      <th className="p-3.5">Classification</th>
                      <th className="p-3.5">Daily Bed Rate (KES)</th>
                      <th className="p-3.5">Daily Nursing Fee (KES)</th>
                      <th className="p-3.5">Admission Intake Fee (KES)</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bedRates.map((rate) => {
                      const isEditing = editingBedRateId === (rate.id || rate.wardId);

                      return (
                        <tr key={rate.id || rate.wardId} className={isEditing ? "bg-amber-50/40" : "hover:bg-slate-50/60 transition-colors"}>
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>{rate.wardName}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              {rate.category}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                                value={bedRateForm.dailyRate ?? rate.dailyRate}
                                onChange={(e) => setBedRateForm({ ...bedRateForm, dailyRate: Number(e.target.value) })}
                                className="w-28 px-2 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-indigo-500"
                              />
                            ) : (
                              <span className="font-extrabold text-slate-900">
                                KES {rate.dailyRate.toLocaleString()}<span className="text-[10px] font-normal text-slate-400">/day</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                                value={bedRateForm.nursingDailyFee ?? rate.nursingDailyFee ?? 500}
                                onChange={(e) => setBedRateForm({ ...bedRateForm, nursingDailyFee: Number(e.target.value) })}
                                className="w-24 px-2 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-indigo-500"
                              />
                            ) : (
                              <span className="text-slate-700">
                                KES {(rate.nursingDailyFee || 500).toLocaleString()}<span className="text-[10px] font-normal text-slate-400">/day</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                                value={bedRateForm.fileOpeningFee ?? rate.fileOpeningFee ?? 2000}
                                onChange={(e) => setBedRateForm({ ...bedRateForm, fileOpeningFee: Number(e.target.value) })}
                                className="w-24 px-2 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-indigo-500"
                              />
                            ) : (
                              <span className="text-slate-700">
                                KES {(rate.fileOpeningFee || 2000).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={handleSaveBedRate}
                                  disabled={savingBedRate}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                >
                                  {savingBedRate ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingBedRateId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartEditBedRate(rate)}
                                className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit Rate</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. PROCEDURE TARIFFS SUB-TAB */}
          {/* ========================================================= */}
          {activeSubTab === "procedure_tariffs" && (
            <div className="space-y-4">
              {/* Top Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2 w-full">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search procedure name, code, or department..."
                      value={tariffSearch}
                      onChange={(e) => setTariffSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-indigo-500"
                    />
                  </div>
                  <select
                    value={tariffCategoryFilter}
                    onChange={(e) => setTariffCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-indigo-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="consultation">Doctor Consultations</option>
                    <option value="laboratory">Laboratory Tests</option>
                    <option value="radiology">Radiology & ECG</option>
                    <option value="procedure">Clinical Procedures</option>
                    <option value="nursing">Nursing & Injections</option>
                    <option value="surgery">Surgeries & Minor Theatre</option>
                  </select>
                </div>

                <button
                  onClick={handleStartAddNewTariff}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Procedure Tariff</span>
                </button>
              </div>

              {/* Add / Edit Form Card */}
              {(isAddingNewTariff || editingTariffId) && (
                <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-indigo-600" />
                      <span>{isAddingNewTariff ? "Create New Procedure Tariff" : "Edit Procedure Tariff"}</span>
                    </h5>
                    <button
                      onClick={() => {
                        setIsAddingNewTariff(false);
                        setEditingTariffId(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-3 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Tariff Code</label>
                      <input
                        type="text"
                        value={tariffForm.code || ""}
                        onChange={(e) => setTariffForm({ ...tariffForm, code: e.target.value })}
                        placeholder="e.g. PROC-101"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="sm:col-span-6 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Procedure / Service Name *</label>
                      <input
                        type="text"
                        value={tariffForm.name || ""}
                        onChange={(e) => setTariffForm({ ...tariffForm, name: e.target.value })}
                        placeholder="e.g. Salbutamol Nebulization Session"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Standard Rate (KES) *</label>
                      <input
                        type="number"
                        value={tariffForm.standardAmount || ""}
                        onChange={(e) => setTariffForm({ ...tariffForm, standardAmount: Number(e.target.value) })}
                        placeholder="1000"
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 text-indigo-900 rounded-xl text-xs font-mono font-extrabold"
                      />
                    </div>

                    <div className="sm:col-span-4 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Category</label>
                      <select
                        value={tariffForm.category || "procedure"}
                        onChange={(e) => setTariffForm({ ...tariffForm, category: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      >
                        <option value="consultation">Doctor Consultation</option>
                        <option value="laboratory">Laboratory Diagnostics</option>
                        <option value="radiology">Radiology & ECG</option>
                        <option value="procedure">Clinical Procedure</option>
                        <option value="nursing">Nursing & Injections</option>
                        <option value="surgery">Surgery & Minor Theatre</option>
                        <option value="other">Other Hospital Fee</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Department / Unit</label>
                      <input
                        type="text"
                        value={tariffForm.department || ""}
                        onChange={(e) => setTariffForm({ ...tariffForm, department: e.target.value })}
                        placeholder="e.g. Casualty / ER"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div className="sm:col-span-4 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Clinical Description / Notes</label>
                      <input
                        type="text"
                        value={tariffForm.description || ""}
                        onChange={(e) => setTariffForm({ ...tariffForm, description: e.target.value })}
                        placeholder="Clinical scope and consumables included"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setIsAddingNewTariff(false);
                        setEditingTariffId(null);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTariff}
                      disabled={savingTariff}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {savingTariff ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Tariff to System</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tariffs Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[50vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3">Code</th>
                      <th className="p-3">Procedure / Service</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Standard Fee (KES)</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTariffs.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-700">{t.code}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          {t.description && <div className="text-[10px] text-slate-400">{t.description}</div>}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                            t.category === "consultation" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            t.category === "laboratory" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            t.category === "radiology" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                            t.category === "surgery" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {t.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{t.department}</td>
                        <td className="p-3 font-mono font-extrabold text-slate-900">
                          KES {t.standardAmount.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEditTariff(t)}
                              title="Edit Tariff"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTariff(t)}
                              title="Delete Tariff"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredTariffs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          No procedure tariffs match your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tariff and bed rate updates immediately sync across Reception, Wards, and Paperless Billing.</span>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

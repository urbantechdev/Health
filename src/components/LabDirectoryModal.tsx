import React, { useState, useMemo } from "react";
import {
  LAB_DISCIPLINES,
  getAllLabTests,
  LabTestItem,
  LabDiscipline
} from "../data/labTestDirectory";
import {
  Search,
  X,
  BookOpen,
  Droplets,
  Activity,
  Sparkles,
  ShieldCheck,
  Microscope,
  Zap,
  AlertCircle,
  FlaskConical,
  FileText,
  Clock,
  Check
} from "lucide-react";

interface LabDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTest?: (test: LabTestItem) => void;
  title?: string;
  actionButtonLabel?: string;
}

export const LabDirectoryModal: React.FC<LabDirectoryModalProps> = ({
  isOpen,
  onClose,
  onSelectTest,
  title = "Comprehensive Global Laboratory Test Directory",
  actionButtonLabel = "Order Test"
}) => {
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTestDetail, setActiveTestDetail] = useState<LabTestItem | null>(null);

  const filteredTests = useMemo(() => {
    let list = getAllLabTests();

    if (selectedDisciplineId !== "all") {
      list = list.filter((t) => t.disciplineId === selectedDisciplineId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.familyName.toLowerCase().includes(q) ||
          t.disciplineName.toLowerCase().includes(q) ||
          t.parameters.some((p) => p.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [selectedDisciplineId, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-xs text-slate-400">
                9 Core International Disciplines • Over 35 Test Families • Certified Reference Standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tests by analyte (e.g. Troponin, D-Dimer, TSH, PCR, CBC, LFTs)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedDisciplineId}
            onChange={(e) => setSelectedDisciplineId(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
          >
            <option value="all">All 9 Disciplines ({getAllLabTests().length} tests)</option>
            {LAB_DISCIPLINES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.num}. {d.shortName}
              </option>
            ))}
          </select>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-4">
          {/* List of Tests */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[55vh]">
            {filteredTests.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No lab tests matched your search.</p>
              </div>
            ) : (
              filteredTests.map((test) => {
                const isSelected = activeTestDetail?.id === test.id;
                return (
                  <div
                    key={test.id}
                    onClick={() => setActiveTestDetail(test)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-500 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {test.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{test.name}</h4>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-emerald-700">{test.disciplineName}</span>
                        <span>•</span>
                        <span>{test.familyName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {test.turnaroundTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {test.tariffsKES && (
                        <span className="text-xs font-mono font-bold text-slate-700">
                          KES {test.tariffsKES.toLocaleString()}
                        </span>
                      )}
                      {onSelectTest && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTest(test);
                            onClose();
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> {actionButtonLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Test Detail Pane */}
          <div className="w-full md:w-96 border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between overflow-y-auto max-h-[55vh]">
            {activeTestDetail ? (
              <div className="space-y-4">
                <div>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                    {activeTestDetail.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {activeTestDetail.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeTestDetail.familyName} ({activeTestDetail.disciplineName})
                  </p>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div>
                    <span className="font-semibold text-slate-700">Specimen Requirement:</span>
                    <p className="text-slate-600">{activeTestDetail.sampleType}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Turnaround Time (TAT):</span>
                    <p className="text-slate-600">{activeTestDetail.turnaroundTime}</p>
                  </div>
                  {activeTestDetail.tariffsKES && (
                    <div>
                      <span className="font-semibold text-slate-700">Standard NHIF/SHA Rate:</span>
                      <p className="text-emerald-700 font-mono font-bold">
                        KES {activeTestDetail.tariffsKES.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Parameters & Reference Ranges ({activeTestDetail.parameters.length})
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeTestDetail.parameters.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white p-2 rounded border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800">{p.name}</span>
                        <div className="text-right">
                          <span className="font-mono text-[11px] text-slate-600">
                            {p.referenceRange} {p.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {activeTestDetail.defaultRemarks && (
                  <div className="text-xs text-slate-500 italic bg-amber-50/60 p-2.5 rounded border border-amber-200">
                    <span className="font-semibold text-amber-900 not-italic block">Clinical Note:</span>
                    {activeTestDetail.defaultRemarks}
                  </div>
                )}

                {onSelectTest && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTest(activeTestDetail);
                      onClose();
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> {actionButtonLabel}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Click on any test to inspect parameters, specimen specs, and normal reference ranges.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Standardized laboratory taxonomy compliant with WHO / CLSI / ISO 15189 specifications.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};

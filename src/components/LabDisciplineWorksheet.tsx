import React, { useState, useMemo } from "react";
import {
  LAB_DISCIPLINES,
  LabDiscipline,
  LabTestItem,
  LabParameter
} from "../data/labTestDirectory";
import {
  Droplets,
  Activity,
  Sparkles,
  ShieldCheck,
  Microscope,
  Zap,
  AlertCircle,
  FlaskConical,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Sparkle,
  Plus,
  Info,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface LabDisciplineWorksheetProps {
  disciplineId: string;
  patientData?: {
    fullName?: string;
    mrn?: string;
    gender?: string;
    ageYears?: number;
    requestedTests?: string[];
  };
  resultsState: Record<string, string>;
  onParameterChange: (paramId: string, value: string) => void;
  onApplyTestDefaults: (test: LabTestItem) => void;
  remarksState: Record<string, string>;
  onRemarksChange: (testId: string, remarks: string) => void;
  readOnly?: boolean;
}

export const LabDisciplineWorksheet: React.FC<LabDisciplineWorksheetProps> = ({
  disciplineId,
  patientData,
  resultsState,
  onParameterChange,
  onApplyTestDefaults,
  remarksState,
  onRemarksChange,
  readOnly = false
}) => {
  const [searchFilter, setSearchFilter] = useState("");
  const [collapsedFamilies, setCollapsedFamilies] = useState<Record<string, boolean>>({});

  const discipline = useMemo(() => {
    return LAB_DISCIPLINES.find((d) => d.id === disciplineId) || LAB_DISCIPLINES[0];
  }, [disciplineId]);

  const requestedTestsSet = useMemo(() => {
    const list = patientData?.requestedTests || [];
    return new Set(list.map((t) => t.toLowerCase().trim()));
  }, [patientData?.requestedTests]);

  const toggleFamily = (famId: string) => {
    setCollapsedFamilies((prev) => ({
      ...prev,
      [famId]: !prev[famId]
    }));
  };

  // Helper to evaluate value vs reference range
  const getFlag = (param: LabParameter, value: string): { label: string; color: string } | null => {
    if (!value || value.trim() === "") return null;
    const cleanVal = value.trim();

    // Qualitative flags
    if (param.type === "select" || param.options) {
      if (cleanVal.toLowerCase().includes("positive") || cleanVal.toLowerCase().includes("reactive") || cleanVal.toLowerCase().includes("detected")) {
        return { label: "REACTIVE / POSITIVE", color: "bg-rose-100 text-rose-800 border-rose-300" };
      }
      if (cleanVal.toLowerCase().includes("negative") || cleanVal.toLowerCase().includes("non-reactive") || cleanVal.toLowerCase().includes("not detected")) {
        return { label: "NORMAL / NEGATIVE", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
      }
    }

    // Numeric range checking e.g. "12.0 - 17.5"
    const rangeMatch = param.referenceRange.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      const num = parseFloat(cleanVal);
      if (!isNaN(num)) {
        if (num < low) return { label: "LOW", color: "bg-amber-100 text-amber-800 border-amber-300" };
        if (num > high) return { label: "HIGH", color: "bg-rose-100 text-rose-800 border-rose-300" };
        return { label: "NORMAL", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
      }
    }

    return null;
  };

  // Render Discipline Icon
  const renderIcon = (name: string) => {
    switch (name) {
      case "Droplets": return <Droplets className="w-6 h-6 text-rose-600" />;
      case "Activity": return <Activity className="w-6 h-6 text-emerald-600" />;
      case "Sparkles": return <Sparkles className="w-6 h-6 text-amber-600" />;
      case "ShieldCheck": return <ShieldCheck className="w-6 h-6 text-purple-600" />;
      case "Microscope": return <Microscope className="w-6 h-6 text-teal-600" />;
      case "Zap": return <Zap className="w-6 h-6 text-indigo-600" />;
      case "AlertCircle": return <AlertCircle className="w-6 h-6 text-rose-600" />;
      case "FlaskConical": return <FlaskConical className="w-6 h-6 text-amber-600" />;
      default: return <FileText className="w-6 h-6 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Discipline Header & Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
            {renderIcon(discipline.iconName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-800 text-white">
                DISCIPLINE #{discipline.num}
              </span>
              <h2 className="text-xl font-bold text-slate-900">{discipline.name}</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">{discipline.description}</p>
          </div>
        </div>

        {/* Quick Search inside discipline */}
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search parameters or tests..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Test Families */}
      {discipline.testFamilies.map((family) => {
        const isCollapsed = !!collapsedFamilies[family.id];

        // Filter tests if search active
        const filteredTests = family.tests.filter((t) => {
          if (!searchFilter) return true;
          const q = searchFilter.toLowerCase();
          return (
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            t.parameters.some((p) => p.name.toLowerCase().includes(q))
          );
        });

        if (filteredTests.length === 0) return null;

        return (
          <div
            key={family.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
          >
            {/* Family Header */}
            <div
              onClick={() => toggleFamily(family.id)}
              className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-base font-bold text-slate-800">{family.name}</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({filteredTests.length} test{filteredTests.length > 1 ? "s" : ""})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{family.description}</p>
              </div>
              <button
                type="button"
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>

            {!isCollapsed && (
              <div className="divide-y divide-slate-200 p-5 space-y-6">
                {filteredTests.map((test) => {
                  // Check if requested by doctor
                  const isOrdered = requestedTestsSet.has(test.name.toLowerCase()) ||
                    test.parameters.some((p) => requestedTestsSet.has(p.name.toLowerCase()));

                  return (
                    <div key={test.id} className="pt-4 first:pt-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {test.code}
                          </span>
                          <h4 className="text-base font-bold text-slate-900">{test.name}</h4>
                          {isOrdered && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ordered by Doctor
                            </span>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> TAT: {test.turnaroundTime}
                          </span>
                        </div>

                        {!readOnly && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onApplyTestDefaults(test)}
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md flex items-center gap-1 transition-colors"
                              title="Auto-fill with normal clinical reference standards"
                            >
                              <Sparkle className="w-3.5 h-3.5" /> Normal Reference Values
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                        <span className="font-semibold text-slate-600">Sample Specimen:</span> {test.sampleType}
                        {test.tariffsKES && (
                          <span className="ml-auto font-mono text-slate-600">
                            Standard Tariff: KES {test.tariffsKES.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Parameters Table */}
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">Test Parameter / Analyte</th>
                              <th className="py-2.5 px-3">Reference Range</th>
                              <th className="py-2.5 px-3">Unit</th>
                              <th className="py-2.5 px-3 w-48">Patient Result</th>
                              <th className="py-2.5 px-3">Flag / Interpretation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {test.parameters.map((param) => {
                              const key = `${test.id}_${param.id}`;
                              const val = resultsState[key] !== undefined ? resultsState[key] : (resultsState[param.id] || "");
                              const flag = getFlag(param, val);

                              return (
                                <tr key={param.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2 px-3 font-medium text-slate-800">
                                    {param.name}
                                    {param.clinicalSignificance && (
                                      <p className="text-[11px] text-slate-400 font-normal">{param.clinicalSignificance}</p>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-slate-600 font-mono">
                                    {param.referenceRange}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-slate-500 font-mono">
                                    {param.unit || "—"}
                                  </td>
                                  <td className="py-2 px-3">
                                    {param.type === "select" && param.options ? (
                                      <select
                                        disabled={readOnly}
                                        value={val}
                                        onChange={(e) => onParameterChange(key, e.target.value)}
                                        className="w-full px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                      >
                                        <option value="">Select Result...</option>
                                        {param.options.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        disabled={readOnly}
                                        placeholder={param.defaultValue || "Enter result"}
                                        value={val}
                                        onChange={(e) => onParameterChange(key, e.target.value)}
                                        className="w-full px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                      />
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {flag ? (
                                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${flag.color}`}>
                                        {flag.label}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Test Remarks / Clinical Pathologist Interpretation */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Pathologist / Laboratory Technician Remarks & Observations ({test.name}):
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder={test.defaultRemarks || "Enter specific observations, comments, or reflex testing findings..."}
                          value={remarksState[test.id] || ""}
                          onChange={(e) => onRemarksChange(test.id, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

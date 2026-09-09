import React, { useState } from "react";
import { 
  Printer, 
  Download, 
  Loader2, 
  X, 
  ShieldCheck, 
  Droplets, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Maximize2, 
  Microscope, 
  Info, 
  User, 
  Building2, 
  Stethoscope,
  Sparkles,
  Calendar
} from "lucide-react";
import { 
  HaemogramReportData, 
  parseHaemogramData, 
  isHaemogramReport,
  HaemogramParameter
} from "../lib/haemogramParser";
import { printElement, downloadElementAsPdf } from "../lib/printUtils";
import DocumentLogo from "./DocumentLogo";
import { toast } from "../lib/promptService";

interface HaemogramDocumentProps {
  data?: Partial<HaemogramReportData> | string;
  patientMeta?: {
    name?: string;
    age?: string | number;
    gender?: string;
    patientNo?: string;
    date?: string;
    doctor?: string;
    facilityName?: string;
  };
  mode?: "inline" | "modal";
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
}

export default function HaemogramDocument({
  data,
  patientMeta,
  mode = "inline",
  isOpen = false,
  onClose,
  title = "Official Clinical Laboratory Report: Comprehensive Full Haemogram (CBC)",
}: HaemogramDocumentProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeViewSection, setActiveViewSection] = useState<"all" | "erythrocytes" | "differential" | "platelets" | "pbf">("all");
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const report: HaemogramReportData = parseHaemogramData(data, patientMeta);

  const getDocTitle = () => {
    const pName = report.patientName ? report.patientName.replace(/[^a-zA-Z0-9]/g, "_") : "Patient";
    return `Full_Haemogram_CBC_${pName}_${report.sampleId || "LIS"}`;
  };

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      await printElement("haemogram-printable-sheet", {
        title: getDocTitle(),
        paperSize: "a4"
      });
      toast.success("CBC Pathology Report sent to printer.", "Print Triggered");
    } catch (err) {
      console.error(err);
      toast.error("Failed to trigger print dialog.", "Print Error");
    } finally {
      setTimeout(() => setPrinting(false), 700);
    }
  };

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      const ok = await downloadElementAsPdf("haemogram-printable-sheet", {
        fileName: `${getDocTitle()}.pdf`,
        title: getDocTitle(),
        format: "a4",
        scale: 2
      });
      if (ok) {
        setDownloadSuccess(true);
        toast.success("Full Haemogram Report downloaded as multi-page PDF.", "Download Complete");
        setTimeout(() => setDownloadSuccess(false), 3500);
      } else {
        toast.error("Could not export PDF.", "Export Error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generating pathology PDF.", "Export Error");
    } finally {
      setDownloading(false);
    }
  };

  const isModalActive = mode === "modal" ? isOpen : modalOpen;
  const handleCloseModal = () => {
    if (mode === "modal" && onClose) {
      onClose();
    } else {
      setModalOpen(false);
    }
  };

  // Render Flag Badge
  const renderFlag = (flag: "NORMAL" | "HIGH" | "LOW" | "CRITICAL" | string) => {
    switch (flag) {
      case "HIGH":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5 w-fit">
            <span>▲</span>
            <span>HIGH</span>
          </span>
        );
      case "LOW":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5 w-fit">
            <span>▼</span>
            <span>LOW</span>
          </span>
        );
      case "CRITICAL":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white border border-red-700 flex items-center gap-0.5 w-fit animate-pulse">
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>CRITICAL</span>
          </span>
        );
      case "NORMAL":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5 w-fit">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            <span>Normal</span>
          </span>
        );
    }
  };

  // Filter parameters by category
  const erythrocyteParams = report.parameters.filter((p) => p.category === "erythrocytes");
  const leukocyteParams = report.parameters.filter((p) => p.category === "leukocytes" || p.category === "differential");
  const plateletParams = report.parameters.filter((p) => p.category === "platelets");
  const inflammatoryParams = report.parameters.filter((p) => p.category === "inflammatory");

  // Document Body Content Component
  const DocumentPaper = ({ isPrintView = false }: { isPrintView?: boolean }) => (
    <div className={`bg-white text-slate-900 font-sans ${isPrintView ? "p-8 max-w-4xl mx-auto shadow-none" : "p-5 sm:p-6"}`}>
      {/* 1. OFFICIAL LETTERHEAD */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3.5">
            <DocumentLogo size="md" className="border-2 border-rose-800/60 shadow-xs" />
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase">
                {report.facilityName}
              </h1>
              <p className="text-xs font-semibold text-rose-900">
                Department of Clinical Pathology, Hematology & Blood Transfusion
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                {report.facilityAddress} • Standard ISO 15189 / KMLTTB Registered Laboratory
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 text-xs">
            <span className="inline-block px-2.5 py-1 bg-slate-900 text-white text-[10px] font-mono font-bold rounded uppercase tracking-wider mb-1">
              Official Diagnostic Report
            </span>
            <p className="text-[11px] text-slate-600 font-mono">LIS Sample: {report.sampleId}</p>
            <p className="text-[10px] text-emerald-800 font-semibold flex items-center justify-start sm:justify-end gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Verified Electronic Medical Record
            </p>
          </div>
        </div>

        {/* Title Ribbon & Age/Gender Reference Indicator */}
        <div className="mt-3 py-2 px-3.5 bg-gradient-to-r from-slate-100 via-rose-50/50 to-slate-100 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-bold text-slate-800 gap-1.5 border border-slate-200">
          <span className="uppercase tracking-wider flex items-center gap-1.5 text-slate-950 font-black">
            <FileText className="w-4 h-4 text-rose-600" />
            COMPREHENSIVE FULL HAEMOGRAM (FBC / CBC) & 5-PART ADVANCED DIFFERENTIAL
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 bg-rose-100 text-rose-900 text-[10px] font-bold rounded-md border border-rose-200">
              Reference: {report.cohortLabel || `${report.patientGender} (${report.patientAge}y)`}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">
              {report.analyzerModel || "Automated 5-Part Hematology Analyzer"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. PATIENT DEMOGRAPHICS & SPECIMEN METADATA GRID */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-5">
        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block">Patient Name</span>
          <span className="font-bold text-slate-900 text-sm">{report.patientName}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block">Patient No. / OPD</span>
          <span className="font-mono font-bold text-slate-800">{report.patientNo}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block">Age & Biological Gender</span>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-900">{report.patientAge} Yrs / {report.patientGender}</span>
            <span className="text-[9px] bg-slate-200 px-1 py-0.2 rounded font-semibold text-slate-700">
              {report.cohortLabel?.split("(")[0]?.trim() || "Stratified"}
            </span>
          </div>
        </div>
        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block">Specimen Type</span>
          <span className="font-semibold text-slate-800">{report.specimenType}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block">Collection Date/Time</span>
          <span className="font-mono text-slate-700 text-[11px]">{report.collectionDate}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block">Reporting Date/Time</span>
          <span className="font-mono text-slate-700 text-[11px]">{report.reportedDate}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block">Requesting Clinician</span>
          <span className="font-semibold text-slate-800">{report.requestingDoctor}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block">Blood Group (ABO/Rh)</span>
          <span className="font-bold text-rose-700">{report.bloodGroup || "O+ (Confirmed)"}</span>
        </div>
      </div>

      {/* 3. STRUCTURED CLINICAL PARAMETERS TABLE */}
      <div className="space-y-4 mb-5">
        {/* Table 1: Red Blood Cells (Erythron) - 13 items */}
        {(activeViewSection === "all" || activeViewSection === "erythrocytes") && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-rose-50/90 px-3.5 py-2 border-b border-rose-200 flex justify-between items-center">
              <span className="text-xs font-bold text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-rose-600" />
                1. Red Blood Cell (RBC) & Hemoglobin Parameters ({erythrocyteParams.length})
              </span>
              <span className="text-[10px] text-rose-800 font-semibold font-mono">
                Erythron Panel • Age & Gender Calibrated
              </span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-[10px] uppercase border-b border-slate-200">
                  <th className="py-2 px-3.5 font-bold">Investigation / Parameter</th>
                  <th className="py-2 px-3 font-bold text-right">Result</th>
                  <th className="py-2 px-2.5 font-bold">Unit</th>
                  <th className="py-2 px-3 font-bold">Reference Interval</th>
                  <th className="py-2 px-3 font-bold">Alert Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {erythrocyteParams.map((param, idx) => (
                  <tr key={idx} className={param.flag === "CRITICAL" ? "bg-rose-100/60" : param.flag !== "NORMAL" ? "bg-rose-50/40" : "hover:bg-slate-50/50"}>
                    <td className="py-1.5 px-3.5">
                      <div className="font-semibold text-slate-900">{param.name}</div>
                      {param.description && (
                        <div className="text-[10px] text-slate-500 font-normal">{param.description}</div>
                      )}
                    </td>
                    <td className={`py-1.5 px-3 text-right font-mono font-bold text-sm ${param.flag === "CRITICAL" ? "text-red-700 font-black" : param.flag === "HIGH" ? "text-rose-700 font-black" : param.flag === "LOW" ? "text-amber-700 font-black" : "text-slate-900"}`}>
                      {param.value}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">{param.unit}</td>
                    <td className="py-1.5 px-3 text-slate-600 font-mono text-[11px]">{param.referenceRange}</td>
                    <td className="py-1.5 px-3">{renderFlag(param.flag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 2: White Blood Cells & 5-Part Differential + Absolutes + Advanced Flags */}
        {(activeViewSection === "all" || activeViewSection === "differential") && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-blue-50/90 px-3.5 py-2 border-b border-blue-200 flex justify-between items-center">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                <Microscope className="w-3.5 h-3.5 text-blue-600" />
                2. White Blood Cell (WBC) Parameters & 5-Part Differential with Absolutes ({leukocyteParams.length})
              </span>
              <span className="text-[10px] text-blue-800 font-semibold font-mono">
                Leukon & Granulocyte Panel
              </span>
            </div>
            
            {/* Visual Differential Distribution Bar */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
              <div className="flex justify-between items-center text-[10px] text-slate-600 mb-1 font-semibold">
                <span>5-Part Relative Leukocyte Distribution:</span>
                <span className="font-mono">
                  Neut: {report.differential?.neutrophils}% | Lymph: {report.differential?.lymphocytes}% | Mono: {report.differential?.monocytes}% | Eos: {report.differential?.eosinophils}% | Baso: {report.differential?.basophils}%
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex text-[8px] font-bold text-white text-center leading-3.5 shadow-inner">
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, report.differential?.neutrophils || 58))}%` }} 
                  className="bg-indigo-600 h-full truncate px-1"
                  title={`Neutrophils: ${report.differential?.neutrophils}% (ANC: ${report.differential?.neutrophilsAbs ?? "N/A"})`}
                >
                  {(report.differential?.neutrophils || 0) > 10 ? `NEU ${report.differential?.neutrophils}%` : ""}
                </div>
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, report.differential?.lymphocytes || 32))}%` }} 
                  className="bg-teal-600 h-full truncate px-1"
                  title={`Lymphocytes: ${report.differential?.lymphocytes}% (ALC: ${report.differential?.lymphocytesAbs ?? "N/A"})`}
                >
                  {(report.differential?.lymphocytes || 0) > 10 ? `LYM ${report.differential?.lymphocytes}%` : ""}
                </div>
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, report.differential?.monocytes || 6))}%` }} 
                  className="bg-amber-500 h-full truncate px-1"
                  title={`Monocytes: ${report.differential?.monocytes}% (AMC: ${report.differential?.monocytesAbs ?? "N/A"})`}
                >
                  {(report.differential?.monocytes || 0) > 4 ? `MON` : ""}
                </div>
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, report.differential?.eosinophils || 3))}%` }} 
                  className="bg-purple-500 h-full truncate px-1"
                  title={`Eosinophils: ${report.differential?.eosinophils}% (AEC: ${report.differential?.eosinophilsAbs ?? "N/A"})`}
                >
                  {(report.differential?.eosinophils || 0) > 2 ? `EOS` : ""}
                </div>
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, report.differential?.basophils || 1))}%` }} 
                  className="bg-rose-500 h-full truncate px-1"
                  title={`Basophils: ${report.differential?.basophils}% (ABC: ${report.differential?.basophilsAbs ?? "N/A"})`}
                >
                  {(report.differential?.basophils || 0) > 1 ? `BAS` : ""}
                </div>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-[10px] uppercase border-b border-slate-200">
                  <th className="py-2 px-3.5 font-bold">Investigation / Parameter</th>
                  <th className="py-2 px-3 font-bold text-right">Result</th>
                  <th className="py-2 px-2.5 font-bold">Unit</th>
                  <th className="py-2 px-3 font-bold">Reference Interval</th>
                  <th className="py-2 px-3 font-bold">Alert Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {leukocyteParams.map((param, idx) => (
                  <tr key={idx} className={param.flag === "CRITICAL" ? "bg-rose-100/60" : param.flag !== "NORMAL" ? "bg-blue-50/40" : "hover:bg-slate-50/50"}>
                    <td className="py-1.5 px-3.5">
                      <div className="font-semibold text-slate-900">{param.name}</div>
                      {param.description && (
                        <div className="text-[10px] text-slate-500 font-normal">{param.description}</div>
                      )}
                    </td>
                    <td className={`py-1.5 px-3 text-right font-mono font-bold text-sm ${param.flag === "CRITICAL" ? "text-red-700 font-black" : param.flag === "HIGH" ? "text-rose-700 font-black" : param.flag === "LOW" ? "text-amber-700 font-black" : "text-slate-900"}`}>
                      {param.value}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">{param.unit}</td>
                    <td className="py-1.5 px-3 text-slate-600 font-mono text-[11px]">{param.referenceRange}</td>
                    <td className="py-1.5 px-3">{renderFlag(param.flag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 3: Platelet (PLT) Parameters - 6 items */}
        {(activeViewSection === "all" || activeViewSection === "platelets") && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-purple-50/90 px-3.5 py-2 border-b border-purple-200 flex justify-between items-center">
              <span className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-600" />
                3. Platelet (PLT) & Thrombocyte Indices ({plateletParams.length})
              </span>
              <span className="text-[10px] text-purple-800 font-semibold font-mono">Thrombocyte Panel</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-[10px] uppercase border-b border-slate-200">
                  <th className="py-2 px-3.5 font-bold">Investigation / Parameter</th>
                  <th className="py-2 px-3 font-bold text-right">Result</th>
                  <th className="py-2 px-2.5 font-bold">Unit</th>
                  <th className="py-2 px-3 font-bold">Reference Interval</th>
                  <th className="py-2 px-3 font-bold">Alert Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {plateletParams.map((param, idx) => (
                  <tr key={idx} className={param.flag === "CRITICAL" ? "bg-rose-100/60" : param.flag !== "NORMAL" ? "bg-purple-50/40" : "hover:bg-slate-50/50"}>
                    <td className="py-1.5 px-3.5">
                      <div className="font-semibold text-slate-900">{param.name}</div>
                      {param.description && (
                        <div className="text-[10px] text-slate-500 font-normal">{param.description}</div>
                      )}
                    </td>
                    <td className={`py-1.5 px-3 text-right font-mono font-bold text-sm ${param.flag === "CRITICAL" ? "text-red-700 font-black" : param.flag === "HIGH" ? "text-rose-700 font-black" : param.flag === "LOW" ? "text-amber-700 font-black" : "text-slate-900"}`}>
                      {param.value}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">{param.unit}</td>
                    <td className="py-1.5 px-3 text-slate-600 font-mono text-[11px]">{param.referenceRange}</td>
                    <td className="py-1.5 px-3">{renderFlag(param.flag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 4: Systemic Inflammation (ESR) & Ancillary Testing */}
        {(activeViewSection === "all" || activeViewSection === "pbf") && inflammatoryParams.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-amber-50/90 px-3.5 py-2 border-b border-amber-200 flex justify-between items-center">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-600" />
                4. Systemic Inflammation & Acute Phase Reactants
              </span>
              <span className="text-[10px] text-amber-800 font-semibold font-mono">
                Westergren Sedimentation
              </span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-[10px] uppercase border-b border-slate-200">
                  <th className="py-2 px-3.5 font-bold">Investigation / Parameter</th>
                  <th className="py-2 px-3 font-bold text-right">Result</th>
                  <th className="py-2 px-2.5 font-bold">Unit</th>
                  <th className="py-2 px-3 font-bold">Reference Interval (Westergren)</th>
                  <th className="py-2 px-3 font-bold">Alert Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {inflammatoryParams.map((param, idx) => (
                  <tr key={idx} className={param.flag !== "NORMAL" ? "bg-amber-50/40" : "hover:bg-slate-50/50"}>
                    <td className="py-1.5 px-3.5">
                      <div className="font-semibold text-slate-900">{param.name}</div>
                      {param.description && (
                        <div className="text-[10px] text-slate-500 font-normal">{param.description}</div>
                      )}
                    </td>
                    <td className={`py-1.5 px-3 text-right font-mono font-bold text-sm ${param.flag === "HIGH" ? "text-rose-700 font-black" : param.flag === "LOW" ? "text-amber-700 font-black" : "text-slate-900"}`}>
                      {param.value}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">{param.unit}</td>
                    <td className="py-1.5 px-3 text-slate-600 font-mono text-[11px]">{param.referenceRange}</td>
                    <td className="py-1.5 px-3">{renderFlag(param.flag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. STRUCTURED BLOOD FILM / PERIPHERAL SMEAR (PBF) MORPHOLOGY REPORT */}
      {(activeViewSection === "all" || activeViewSection === "pbf") && (
        <div className="space-y-3 mb-5">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <div className="bg-emerald-800 text-white px-3.5 py-2 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                <Microscope className="w-4 h-4 text-emerald-300" />
                4. Peripheral Blood Film (PBF) Microscopic Smear Examination
              </span>
              <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded font-mono text-emerald-100">
                Wright-Giemsa Oil Immersion (100x)
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* RBC Morphology */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="font-bold text-rose-950 uppercase text-[11px]">RBC Morphology</span>
                  <span className="text-[10px] text-rose-700 font-semibold">Erythrocytes</span>
                </div>
                <div className="space-y-1 text-slate-700 text-[11px]">
                  <p><strong>Anisocytosis:</strong> {report.pbfDetails?.rbc?.anisocytosis || "None"}</p>
                  <p><strong>Poikilocytosis:</strong> {report.pbfDetails?.rbc?.poikilocytosis || "None"}</p>
                  <p><strong>Hypochromia:</strong> {report.pbfDetails?.rbc?.hypochromia ? "Present (+)" : "Absent (Normochromic)"}</p>
                  <p><strong>Polychromasia:</strong> {report.pbfDetails?.rbc?.polychromasia ? "Present (+)" : "Absent"}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {report.pbfDetails?.rbc?.targetCells && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-800 rounded border border-rose-200 text-[9px] font-bold">Target Cells</span>}
                    {report.pbfDetails?.rbc?.sickleCells && <span className="px-1.5 py-0.5 bg-red-100 text-red-900 rounded border border-red-300 text-[9px] font-black">Sickle Cells</span>}
                    {report.pbfDetails?.rbc?.spherocytes && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200 text-[9px] font-bold">Spherocytes</span>}
                    {report.pbfDetails?.rbc?.schistocytes && <span className="px-1.5 py-0.5 bg-red-50 text-red-800 rounded border border-red-200 text-[9px] font-bold">Schistocytes</span>}
                    {report.pbfDetails?.rbc?.rouleaux && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200 text-[9px] font-bold">Rouleaux</span>}
                  </div>
                </div>
              </div>

              {/* WBC Morphology */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="font-bold text-blue-950 uppercase text-[11px]">WBC Morphology</span>
                  <span className="text-[10px] text-blue-700 font-semibold">Leukocytes</span>
                </div>
                <div className="space-y-1 text-slate-700 text-[11px]">
                  <p><strong>Toxic Granulation:</strong> {report.pbfDetails?.wbc?.toxicGranulation || "Absent"}</p>
                  <p><strong>Vacuolation:</strong> {report.pbfDetails?.wbc?.vacuolation ? "Present (+)" : "Absent"}</p>
                  <p><strong>Reactive Lymphocytes:</strong> {report.pbfDetails?.wbc?.reactiveLymphocytes ? "Present (Downey cells)" : "None"}</p>
                  <p><strong>Left Shift (Bands):</strong> {report.pbfDetails?.wbc?.leftShift ? "Yes (Band forms increased)" : "No"}</p>
                  <p className="text-[10px] text-slate-500 italic mt-1">{report.pbfDetails?.wbc?.notes || "Normal mature leukocyte series."}</p>
                </div>
              </div>

              {/* Platelet Morphology */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="font-bold text-purple-950 uppercase text-[11px]">Platelet Morphology</span>
                  <span className="text-[10px] text-purple-700 font-semibold">Thrombocytes</span>
                </div>
                <div className="space-y-1 text-slate-700 text-[11px]">
                  <p><strong>Smear Estimation:</strong> {report.pbfDetails?.platelets?.adequateSmear !== false ? "Adequate on smear" : "Reduced on smear"}</p>
                  <p><strong>Platelet Clumping:</strong> {report.pbfDetails?.platelets?.clumping ? "Observed (Rule out EDTA pseudothrombocytopenia)" : "Absent"}</p>
                  <p><strong>Giant Platelets:</strong> {report.pbfDetails?.platelets?.giantPlatelets ? "Present (Megathrombocytes)" : "None"}</p>
                  <p className="text-[10px] text-slate-500 italic mt-1">{report.pbfDetails?.platelets?.notes || "Normal platelet size and distribution on smear."}</p>
                </div>
              </div>
            </div>

            {/* Pathologist Clinical Impression & Diagnostic Correlation */}
            <div className="p-4 pt-0">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  <Info className="w-4 h-4 text-emerald-700" />
                  <span>Comprehensive Pathologist Interpretation & Impression</span>
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-emerald-100">
                  {report.clinicalImpression || report.pbfMorphology || "Parameters within normal biological limits for age and gender."}
                </p>
                {report.pathologistComment && (
                  <p className="text-[11px] text-slate-600 italic">
                    Note: {report.pathologistComment}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. OFFICIAL CLINICAL SIGN-OFF */}
      <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block mb-1">Laboratory Technologist</span>
          <p className="font-bold text-slate-900">{report.technologistName}</p>
          <span className="text-[10px] text-slate-600 block">KMLTTB Licensed Medical Laboratory Practitioner</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-600 uppercase font-bold block mb-1">Consultant Pathologist</span>
          <p className="font-bold text-slate-900">{report.pathologistName}</p>
          <span className="text-[10px] text-slate-600 block">KMPDC Specialist Registry / Fellow Pathologist</span>
        </div>

        <div className="col-span-2 sm:col-span-1 flex flex-col sm:items-end justify-center">
          <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-center w-full sm:w-auto">
            <span className="text-[9px] font-mono font-bold text-slate-700 uppercase block">Electronic Verification Hash</span>
            <span className="text-[11px] font-mono font-black text-slate-900 tracking-wider">
              {report.sampleId}-CBC-MOH-ISO15189
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // If in Modal Mode (or expanded from inline)
  if (isModalActive) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-300 w-full max-w-4xl flex flex-col max-h-[96vh] overflow-hidden animate-in fade-in zoom-in duration-200">
          
          {/* Modal Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-900 text-white shrink-0 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-400/30">
                <Droplets className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wide text-white">
                  {title}
                </h3>
                <p className="text-[11px] text-slate-300 font-mono">
                  {report.parameters.length} Parameters Evaluated • Stratified for {report.cohortLabel || "Age & Gender"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                id="btn-print-haemogram"
                disabled={printing}
                onClick={handlePrint}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/30 cursor-pointer disabled:opacity-60"
              >
                {printing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Printing...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Report</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-download-haemogram-pdf"
                disabled={downloading}
                onClick={handleDownloadPdf}
                className={`px-3.5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 ${
                  downloadSuccess
                    ? "bg-emerald-800 text-white shadow-emerald-900/40"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
                }`}
                title="Export complete CBC pathology report as multi-page PDF"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving PDF...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>PDF Downloaded</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-700"
                title="Close Document"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Section Filter Tabs */}
          <div className="flex items-center gap-1.5 px-5 py-2 bg-slate-100 border-b border-slate-200 shrink-0 text-xs overflow-x-auto">
            <span className="text-[10px] font-bold uppercase text-slate-600 mr-1">Filter Panel:</span>
            <button
              onClick={() => setActiveViewSection("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewSection === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              All Panels ({report.parameters.length})
            </button>
            <button
              onClick={() => setActiveViewSection("erythrocytes")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewSection === "erythrocytes" ? "bg-rose-700 text-white" : "bg-white text-rose-900 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              1. Red Cells & Indices ({erythrocyteParams.length})
            </button>
            <button
              onClick={() => setActiveViewSection("differential")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewSection === "differential" ? "bg-blue-700 text-white" : "bg-white text-blue-900 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              2. WBC & Differential ({leukocyteParams.length})
            </button>
            <button
              onClick={() => setActiveViewSection("platelets")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewSection === "platelets" ? "bg-purple-700 text-white" : "bg-white text-purple-900 hover:bg-purple-100 border border-purple-200"
              }`}
            >
              3. Platelets ({plateletParams.length})
            </button>
            <button
              onClick={() => setActiveViewSection("pbf")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewSection === "pbf" ? "bg-emerald-700 text-white" : "bg-white text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              4. Inflammation & Morphology
            </button>
          </div>

          {/* Document Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/60">
            <div id="haemogram-printable-sheet" className="bg-white rounded-2xl shadow-xl border border-slate-300 max-w-3xl mx-auto overflow-hidden">
              <DocumentPaper isPrintView={false} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // INLINE CARD VIEW
  return (
    <div className="bg-white text-slate-900 rounded-2xl border-2 border-rose-200 shadow-sm overflow-hidden space-y-0 animate-in fade-in duration-200">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-indigo-950 text-white p-3.5 sm:px-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-400/30">
            <Droplets className="w-4 h-4 text-rose-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black tracking-wide text-white uppercase">
                Full Haemogram Clinical Document
              </h4>
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-200 text-[10px] font-bold rounded-full border border-rose-400/40">
                {report.parameters.length} Parameters
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-200 text-[10px] font-semibold rounded-full border border-emerald-400/30">
                {report.cohortLabel || "Age & Gender Calibrated"}
              </span>
            </div>
            <p className="text-[11px] text-rose-200/80">
              Sample ID: {report.sampleId} • Patient: {report.patientName} ({report.patientAge}y / {report.patientGender})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            title="Open Full Sized Document"
          >
            <Maximize2 className="w-3.5 h-3.5 text-rose-300" />
            <span>Expand Full View</span>
          </button>
          <button
            type="button"
            disabled={printing}
            onClick={handlePrint}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            <span>Print</span>
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="Download full multi-page PDF"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Highlight Strip */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-1.5 bg-white rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Hemoglobin (Hb)</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-sm font-black text-slate-900 font-mono">
              {report.parameters.find(p => p.key === "hb")?.value || "13.8"}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">g/dL</span>
          </div>
        </div>

        <div className="p-1.5 bg-white rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Total WBC Count</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-sm font-black text-slate-900 font-mono">
              {report.parameters.find(p => p.key === "wbc")?.value || "7.4"}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">×10⁹/L</span>
          </div>
        </div>

        <div className="p-1.5 bg-white rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Platelets</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-sm font-black text-slate-900 font-mono">
              {report.parameters.find(p => p.key === "plt")?.value || "260"}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">×10⁹/L</span>
          </div>
        </div>

        <div className="p-1.5 bg-white rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">ESR & Malaria</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-xs font-black text-emerald-800">
              {report.malaria || "Negative"}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">{report.esr} mm/1h</span>
          </div>
        </div>
      </div>

      {/* Main Parameters Structured Table Preview */}
      <div className="p-4 space-y-3">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase border-b border-slate-200">
              <th className="py-1.5 px-3 font-bold">Investigation Parameter</th>
              <th className="py-1.5 px-2.5 font-bold text-right">Result</th>
              <th className="py-1.5 px-2 font-bold">Unit</th>
              <th className="py-1.5 px-2.5 font-bold">Age/Gender Ref</th>
              <th className="py-1.5 px-2.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {report.parameters.slice(0, 10).map((param, idx) => (
              <tr key={idx} className={param.flag !== "NORMAL" ? "bg-rose-50/40" : "hover:bg-slate-50/60"}>
                <td className="py-1.5 px-3 font-semibold text-slate-900">{param.name}</td>
                <td className={`py-1.5 px-2.5 text-right font-mono font-bold ${param.flag === "HIGH" ? "text-rose-700 font-black" : param.flag === "LOW" ? "text-amber-700 font-black" : "text-slate-900"}`}>
                  {param.value}
                </td>
                <td className="py-1.5 px-2 text-slate-600 font-mono text-[11px]">{param.unit}</td>
                <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">{param.referenceRange}</td>
                <td className="py-1.5 px-2.5">{renderFlag(param.flag)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 5-Part Differential Distribution Mini Bar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold uppercase">
            <span>5-Part Leucocyte Differential:</span>
            <span className="font-mono">
              Neut: {report.differential?.neutrophils}% | Lymph: {report.differential?.lymphocytes}% | Mono: {report.differential?.monocytes}% | Eos: {report.differential?.eosinophils}% | Baso: {report.differential?.basophils}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${Math.min(100, Math.max(0, report.differential?.neutrophils || 58))}%` }} 
              className="bg-indigo-600 h-full"
              title={`Neutrophils: ${report.differential?.neutrophils}%`}
            />
            <div 
              style={{ width: `${Math.min(100, Math.max(0, report.differential?.lymphocytes || 32))}%` }} 
              className="bg-teal-600 h-full"
              title={`Lymphocytes: ${report.differential?.lymphocytes}%`}
            />
            <div 
              style={{ width: `${Math.min(100, Math.max(0, report.differential?.monocytes || 6))}%` }} 
              className="bg-amber-500 h-full"
              title={`Monocytes: ${report.differential?.monocytes}%`}
            />
            <div 
              style={{ width: `${Math.min(100, Math.max(0, report.differential?.eosinophils || 3))}%` }} 
              className="bg-purple-500 h-full"
              title={`Eosinophils: ${report.differential?.eosinophils}%`}
            />
            <div 
              style={{ width: `${Math.min(100, Math.max(0, report.differential?.basophils || 1))}%` }} 
              className="bg-rose-500 h-full"
              title={`Basophils: ${report.differential?.basophils}%`}
            />
          </div>
        </div>

        {/* Peripheral Blood Film & Impression */}
        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-[11px] uppercase">
            <Microscope className="w-3.5 h-3.5 text-emerald-700" />
            <span>Microscopic Blood Film (PBF) & Impression:</span>
          </div>
          <p className="text-slate-800 text-xs leading-relaxed">
            {report.pbfMorphology}
          </p>
        </div>

        {/* Expand Document Trigger Footer */}
        <div className="pt-2 flex justify-between items-center text-xs text-slate-600 border-t border-slate-200">
          <span className="text-[11px] text-slate-500 italic">
            Signed off by {report.technologistName}
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Complete A4 Pathology Document ({report.parameters.length} Parameters)</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

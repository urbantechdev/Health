import React, { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Employee, SystemRole } from "../types";
import { SYSTEM_ROLES_DIRECTORY, getRoleConfig } from "../constants/roles";
import { checkDuplicateEmployee } from "../lib/deduplicationService";
import { toast } from "../lib/promptService";
import { 
  UserPlus, 
  X, 
  KeyRound, 
  Sparkles, 
  ShieldCheck, 
  Copy, 
  Check, 
  Printer, 
  Download,
  Loader2,
  Building2, 
  Mail, 
  Phone, 
  CreditCard, 
  IdCard, 
  RefreshCw,
  Lock,
  Award,
  AlertCircle
} from "lucide-react";
import { printElement, downloadElementAsPdf } from "../lib/printUtils";

interface StaffOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalName?: string;
  onStaffCreated?: (newEmp: Employee) => void;
}

export default function StaffOnboardingModal({
  isOpen,
  onClose,
  hospitalName = "TASSIAHILL HOSPITAL",
  onStaffCreated
}: StaffOnboardingModalProps) {
  // Form State
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+254 7");
  const [selectedRole, setSelectedRole] = useState<SystemRole>("Doctor");
  const [department, setDepartment] = useState("medical");
  const [accessLevel, setAccessLevel] = useState<"Super Admin" | "Department Admin" | "Standard Staff">("Standard Staff");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("General Practitioner");
  const [salary, setSalary] = useState("120000");
  const [pin, setPin] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  // Status & Success state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdStaffResult, setCreatedStaffResult] = useState<Employee | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateNewPin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(randomPin);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!email || email.includes("@tassiahillhospital.co.ke") || email.includes("@afyacare.co.ke") || email.includes("@afyaboraclinic.co.ke")) {
      const slug = val.toLowerCase().trim().replace(/[^a-z0-9]/g, ".");
      if (slug) {
        setEmail(`${slug}@tassiahillhospital.co.ke`);
      }
    }
  };

  const handleRoleChange = (role: SystemRole) => {
    setSelectedRole(role);
    const cfg = getRoleConfig(role);
    setDepartment(cfg.department);
    if (role === "Super Admin") {
      setAccessLevel("Super Admin");
    } else if (role === "Admin" || role === "Finance" || role === "HR") {
      setAccessLevel("Department Admin");
    } else {
      setAccessLevel("Standard Staff");
    }

    // Auto set typical specialty
    if (role === "Doctor") setSpecialty("General Practitioner");
    else if (role === "Pharmacy") setSpecialty("Lead Pharmacist");
    else if (role === "Lab") setSpecialty("Medical Lab Technologist");
    else if (role === "Reception") setSpecialty("Triage & Reception In-Charge");
    else if (role === "Billing & Accounts") setSpecialty("Cashier & Split Billing Specialist");
    else if (role === "Finance") setSpecialty("Senior Financial Accountant");
    else if (role === "Procurement") setSpecialty("Procurement & LPO Officer");
    else if (role === "HR") setSpecialty("Human Resources Specialist");
    else if (role === "Payroll") setSpecialty("Payroll Officer");
    else setSpecialty(cfg.title);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanNationalId = nationalId.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPin = pin.trim() || Math.floor(1000 + Math.random() * 9000).toString();

    if (!cleanName || !cleanEmail || !cleanNationalId) {
      const msg = "Please complete all required fields (Name, National ID, Email).";
      setErrorMessage(msg);
      toast.warning(msg, "Missing Information");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Strict Duplicate Check
      const dup = await checkDuplicateEmployee(cleanNationalId, cleanEmail);
      if (dup.isDuplicate) {
        const dupMsg = `[DUPLICATE REJECTED] ${dup.reason}`;
        setErrorMessage(dupMsg);
        toast.warning(dupMsg, "Duplicate Staff Member");
        setSubmitting(false);
        return;
      }

      const generatedEmpId = `EMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      const newEmployeeData: Omit<Employee, "id"> = {
        name: cleanName,
        nationalId: cleanNationalId,
        email: cleanEmail,
        phone: cleanPhone,
        role: selectedRole,
        systemRole: selectedRole,
        department: department,
        specialty: specialty || selectedRole,
        accessLevel: accessLevel,
        pin: cleanPin,
        salary: parseInt(salary) || 80000,
        status: "active",
        hireDate: new Date().toISOString().split("T")[0]
      };

      const docRef = await addDoc(collection(db, "employees"), {
        ...newEmployeeData,
        employeeNumber: generatedEmpId,
        licenseNumber: licenseNumber.trim(),
        createdAt: new Date().toISOString()
      });

      const fullEmployee: Employee = {
        id: docRef.id,
        ...newEmployeeData
      };

      if (onStaffCreated) {
        onStaffCreated(fullEmployee);
      }
      toast.success(
        `Staff member ${cleanName} (${selectedRole}) successfully onboarded with PIN ${cleanPin}.`, 
        "Staff Created Successfully"
      );

      // Automatically close modal window as requested
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      console.error("Error onboarding staff:", err);
      const errMsg = "Failed to save staff record: " + (err?.message || "Unknown error");
      setErrorMessage(errMsg);
      toast.error(errMsg, "Staff Onboarding Error");
    } finally {
      setSubmitting(false);
    }
  };

  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const copyCredentialsToClipboard = () => {
    if (!createdStaffResult) return;
    const credText = `🏥 ${hospitalName} - Staff Login Credentials
========================================
Staff Member: ${createdStaffResult.name}
Role / Station: ${createdStaffResult.role} (${createdStaffResult.department.toUpperCase()})
Access Level: ${createdStaffResult.accessLevel}
Corporate Email: ${createdStaffResult.email}
Login Security PIN: ${createdStaffResult.pin}
National ID / Pass: ${createdStaffResult.nationalId}
Status: Active & Authorized
========================================
Please keep your security PIN confidential.`;

    navigator.clipboard.writeText(credText);
    setCopied(true);
    toast.success("Credentials copied to clipboard.", "Copied");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintPasscard = async () => {
    if (printing || !createdStaffResult) return;
    setPrinting(true);
    try {
      await printElement("printable-staff-credential-passcard", {
        title: `Staff_Passcard_${createdStaffResult.name.replace(/\s+/g, "_")}`,
        paperSize: "a4"
      });
      toast.success("Staff credential card sent to printer.", "Print Triggered");
    } catch (err) {
      console.error(err);
      toast.error("Failed to print credential passcard.", "Print Error");
    } finally {
      setTimeout(() => setPrinting(false), 700);
    }
  };

  const handleDownloadPasscardPdf = async () => {
    if (downloading || !createdStaffResult) return;
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      const fileName = `Staff_Passcard_${createdStaffResult.name.replace(/\s+/g, "_")}.pdf`;
      const ok = await downloadElementAsPdf("printable-staff-credential-passcard", {
        fileName,
        title: `Staff Credential: ${createdStaffResult.name}`,
        format: "a4",
        scale: 2
      });
      if (ok) {
        setDownloadSuccess(true);
        toast.success("Credential passcard downloaded as PDF.", "Download Complete");
        setTimeout(() => setDownloadSuccess(false), 3500);
      } else {
        toast.error("Could not export passcard PDF.", "Export Error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generating passcard PDF.", "Export Error");
    } finally {
      setDownloading(false);
    }
  };

  const handleResetForNext = () => {
    setName("");
    setNationalId("");
    setEmail("");
    setPhone("+254 7");
    setLicenseNumber("");
    setPin(Math.floor(1000 + Math.random() * 9000).toString());
    setCreatedStaffResult(null);
    setErrorMessage(null);
    setPrinting(false);
    setDownloading(false);
    setDownloadSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-800 rounded-2xl shadow-xs">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Staff Onboarding & Credential Generator
                </h3>
                <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black rounded-md uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Register new hospital personnel, assign authorized role permissions, and generate instant login PIN passcards.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-lg cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Passcard Slip View */}
        {createdStaffResult ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-extrabold text-sm">Staff Member Successfully Onboarded!</p>
                <p className="text-emerald-700">Their login credentials and security PIN have been securely recorded in the live database.</p>
              </div>
            </div>

            {/* Official Passcard Voucher Graphic */}
            <div id="printable-staff-credential-passcard" className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl border border-slate-700 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
              
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      {hospitalName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">STAFF ACCESS CREDENTIAL CARD</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-black rounded-full uppercase">
                  {createdStaffResult.accessLevel}
                </span>
              </div>

              {/* Card Body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                  <span className="text-sm font-black text-white">{createdStaffResult.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Station & Role</span>
                  <span className="text-sm font-black text-amber-400">{createdStaffResult.role}</span>
                  <span className="text-[10px] text-slate-400 block capitalize">Dept: {createdStaffResult.department}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Corporate Login Email</span>
                  <span className="font-mono text-emerald-300 font-bold">{createdStaffResult.email}</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-amber-400/30">
                  <span className="text-[10px] uppercase font-black text-amber-400 block flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>LOGIN SECURITY PIN</span>
                  </span>
                  <span className="font-mono text-xl font-black text-white tracking-widest">{createdStaffResult.pin}</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>National ID: {createdStaffResult.nationalId}</span>
                <span>Hire Date: {createdStaffResult.hireDate}</span>
                <span className="text-emerald-400 font-bold">Status: Active</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForNext}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Onboard Another Staff</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyCredentialsToClipboard}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Copied!" : "Copy Login"}</span>
                </button>
                <button
                  type="button"
                  id="btn-print-passcard"
                  disabled={printing}
                  onClick={handlePrintPasscard}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  {printing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Printing...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Print Card</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  id="btn-download-passcard-pdf"
                  disabled={downloading}
                  onClick={handleDownloadPasscardPdf}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-60 ${
                    downloadSuccess
                      ? "bg-emerald-800 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  title="Download credential passcard as PDF"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>PDF Saved</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Save PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Onboarding Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Brian Mwangi"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-purple-500"
                />
              </div>

              {/* National ID / Passport */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  National ID / Passport No. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 29482019"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-purple-500"
                />
              </div>

              {/* Corporate Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Corporate Staff Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. brian.mwangi@tassiahillhospital.co.ke"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-purple-500"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+254 700 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-purple-500"
                />
              </div>

              {/* Assigned Role */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                  Assigned System Role (RBAC) *
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value as SystemRole)}
                  className="w-full px-3 py-2 bg-purple-50/60 border border-purple-300 rounded-xl text-xs font-black text-purple-950 focus:outline-purple-500 cursor-pointer"
                >
                  {SYSTEM_ROLES_DIRECTORY.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role} — {r.department.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Access Level */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  System Clearance Level
                </label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-purple-500 cursor-pointer"
                >
                  <option value="Standard Staff">Standard Staff (Single Station Access)</option>
                  <option value="Department Admin">Department Admin (Elevated Department Tools)</option>
                  <option value="Super Admin">Super Admin (Global System Access)</option>
                </select>
              </div>

              {/* Medical / Professional License Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Professional License # (KMPDC / PPB / NCK)
                </label>
                <input
                  type="text"
                  placeholder="e.g. KMPDC-A8492 or PPB-5921"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-purple-500"
                />
              </div>

              {/* Security PIN / Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Login Security PIN *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateNewPin}
                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Regenerate PIN</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={8}
                  placeholder="e.g. 4829"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-sm font-mono font-black tracking-widest text-amber-950 focus:outline-amber-500"
                />
              </div>
            </div>

            {/* Need-to-Know Workspaces Preview */}
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs space-y-1">
              <span className="text-[10px] font-black text-purple-900 uppercase">
                Authorized Need-To-Know Workspaces for {selectedRole}:
              </span>
              <div className="flex flex-wrap gap-1">
                {getRoleConfig(selectedRole).allowedModules.map((mod) => (
                  <span key={mod} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md capitalize">
                    {mod}
                  </span>
                ))}
              </div>
            </div>

            {/* Submit & Cancel */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-onboard-staff"
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{submitting ? "Onboarding Staff..." : "Onboard Staff & Generate Passcard"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

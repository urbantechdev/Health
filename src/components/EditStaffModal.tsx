import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Employee, SystemRole } from "../types";
import { DEPARTMENT_SPECIALTIES } from "./HumanResources";
import { toast } from "../lib/promptService";
import { 
  Pencil, 
  X, 
  Save, 
  DollarSign, 
  User, 
  Briefcase, 
  Shield, 
  Building2, 
  Phone, 
  Mail, 
  CreditCard, 
  Calendar, 
  KeyRound, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Landmark,
  BadgeAlert
} from "lucide-react";

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onStaffUpdated?: (updatedStaff: Employee) => void;
}

export default function EditStaffModal({
  isOpen,
  onClose,
  employee,
  onStaffUpdated
}: EditStaffModalProps) {
  if (!isOpen || !employee) return null;

  // Editable Form States
  const [name, setName] = useState(employee.name || "");
  const [nationalId, setNationalId] = useState(employee.nationalId || "");
  const [phone, setPhone] = useState(employee.phone || "");
  const [email, setEmail] = useState(employee.email || "");
  const [department, setDepartment] = useState(employee.department || "medical");
  const [role, setRole] = useState(employee.role || "");
  const [specialty, setSpecialty] = useState(employee.specialty || "");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [salary, setSalary] = useState(employee.salary ? String(employee.salary) : "0");
  const [pin, setPin] = useState(employee.pin || "2026");
  const [accessLevel, setAccessLevel] = useState<"Super Admin" | "Department Admin" | "Standard Staff">(
    employee.accessLevel || "Standard Staff"
  );
  const [status, setStatus] = useState<"active" | "on_leave" | "terminated">(
    employee.status || "active"
  );
  const [bankName, setBankName] = useState((employee as any).bankName || "Equity Bank Kenya");
  const [bankAccount, setBankAccount] = useState((employee as any).bankAccount || "");
  const [hireDate, setHireDate] = useState(employee.hireDate || new Date().toISOString().slice(0, 10));
  const [licenseNumber, setLicenseNumber] = useState((employee as any).licenseNumber || "");

  const [saving, setSaving] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Sync state whenever selected employee changes
  useEffect(() => {
    if (employee) {
      setName(employee.name || "");
      setNationalId(employee.nationalId || "");
      setPhone(employee.phone || "");
      setEmail(employee.email || "");
      setDepartment(employee.department || "medical");
      setRole(employee.role || "");
      setSpecialty(employee.specialty || "");
      setCustomSpecialty("");
      setSalary(employee.salary ? String(employee.salary) : "0");
      setPin(employee.pin || "2026");
      setAccessLevel(employee.accessLevel || "Standard Staff");
      setStatus(employee.status || "active");
      setBankName((employee as any).bankName || "Equity Bank Kenya");
      setBankAccount((employee as any).bankAccount || "");
      setHireDate(employee.hireDate || new Date().toISOString().slice(0, 10));
      setLicenseNumber((employee as any).licenseNumber || "");
    }
  }, [employee]);

  // Quick PIN generator
  const handleRegeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(randomPin);
    toast.info(`Generated new 4-digit security PIN: ${randomPin}`, "PIN Generated");
  };

  // Kenyan Statutory Deductions Real-Time Estimator
  const salaryNum = Math.max(0, parseInt(salary) || 0);
  const nssfEst = salaryNum > 18000 ? 1080 : Math.round(salaryNum * 0.06);
  const shifEst = Math.round(salaryNum * 0.0275);
  const ahlEst = Math.round(salaryNum * 0.015);
  
  const taxableInc = Math.max(0, salaryNum - nssfEst);
  let payeRaw = 0;
  if (taxableInc <= 24000) {
    payeRaw = taxableInc * 0.10;
  } else if (taxableInc <= 32333) {
    payeRaw = (24000 * 0.10) + ((taxableInc - 24000) * 0.25);
  } else {
    payeRaw = (24000 * 0.10) + (8333 * 0.25) + ((taxableInc - 32333) * 0.30);
  }
  const payeEst = Math.max(0, Math.round(payeRaw - 2400));
  const totalDeductionsEst = nssfEst + shifEst + ahlEst + payeEst;
  const netPayEst = Math.max(0, salaryNum - totalDeductionsEst);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.warning("Staff name is required.", "Validation Error");
      return;
    }
    if (!nationalId.trim()) {
      toast.warning("National ID / Passport number is required.", "Validation Error");
      return;
    }
    if (!phone.trim()) {
      toast.warning("Phone contact is required.", "Validation Error");
      return;
    }
    if (!role.trim()) {
      toast.warning("Role title is required.", "Validation Error");
      return;
    }
    if (isNaN(salaryNum) || salaryNum < 0) {
      toast.warning("Please provide a valid salary amount.", "Validation Error");
      return;
    }

    setSaving(true);
    try {
      const finalSpecialty = specialty.startsWith("Other") 
        ? (customSpecialty.trim() || specialty) 
        : (specialty || role);

      const updatePayload: Partial<Employee> & Record<string, any> = {
        name: name.trim(),
        nationalId: nationalId.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        department,
        role: role.trim(),
        specialty: finalSpecialty,
        salary: salaryNum,
        pin: pin.trim() || "2026",
        accessLevel,
        status,
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        hireDate: hireDate || employee.hireDate,
        licenseNumber: licenseNumber.trim(),
        updatedAt: new Date().toISOString()
      };

      // 1. Update Employee document in Firestore
      const empRef = doc(db, "employees", employee.id);
      await updateDoc(empRef, updatePayload);

      // 2. Synchronize PIN / Role in system_users if an account exists with this email
      if (email) {
        try {
          const userSnap = await getDocs(
            query(collection(db, "system_users"), where("email", "==", email.trim().toLowerCase()))
          );
          userSnap.forEach(async (uDoc) => {
            await updateDoc(doc(db, "system_users", uDoc.id), {
              name: name.trim(),
              role: role.trim(),
              department,
              accessLevel,
              pin: pin.trim() || "2026",
              status: status === "terminated" ? "inactive" : "active"
            });
          });
        } catch (syncErr) {
          console.warn("Non-blocking: could not sync system_users profile:", syncErr);
        }
      }

      const updatedRecord: Employee = {
        ...employee,
        ...updatePayload
      };

      toast.success(
        `Staff profile and salary for ${name.trim()} successfully updated!`,
        "Changes Saved"
      );

      if (onStaffUpdated) {
        onStaffUpdated(updatedRecord);
      }
      onClose();
    } catch (err: any) {
      console.error("Error updating employee:", err);
      toast.error(
        err?.message || "Failed to update employee details. Please try again.",
        "Update Failed"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shadow-inner">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Edit Staff & Salary Details
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-md font-mono text-[10px] font-bold">
                  {employee.id.slice(-6)}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Update credentials, monthly base salary, regulatory department, and statutory payroll configuration.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700">
          {/* Top Quick Status Pill Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                {name ? name.charAt(0).toUpperCase() : "S"}
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-900">{name || "Staff Member"}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {role} • {email || "No email assigned"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employment Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className={`px-3 py-1 text-xs font-bold rounded-xl border focus:outline-hidden cursor-pointer ${
                  status === "active"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : status === "on_leave"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                <option value="active">Active Duty</option>
                <option value="on_leave">On Authorized Leave</option>
                <option value="terminated">Terminated / Deactivated</option>
              </select>
            </div>
          </div>

          {/* Section 1: Personal & Identification Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-900">
                1. Personal & Regulatory Identity
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Arthur Conan Doyle"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">National ID / Passport Number *</label>
                <input
                  type="text"
                  required
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="e.g. 30511894"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Official Corporate Email (Login Username) *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. arthur.conan@tassiahillhospital.co.ke"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Primary Contact Phone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +254 711 943 210"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Department, Role & Specialty */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-900">
                2. Departmental Assignment & Clinical Role
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Primary Department</label>
                <select
                  value={department}
                  onChange={(e) => {
                    const newDept = e.target.value;
                    setDepartment(newDept);
                    const specs = DEPARTMENT_SPECIALTIES[newDept] || [];
                    if (specs.length > 0) {
                      setSpecialty(specs[0]);
                      setRole(specs[0]);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="reception">Reception & Front Desk</option>
                  <option value="medical">Medical Practice (Clinical / OPD)</option>
                  <option value="gynaecology">Obstetrics & Gynecology (OB-GYN)</option>
                  <option value="dentistry">Dentistry (Dental Practice)</option>
                  <option value="pediatrics">Pediatrics (Child Medicine)</option>
                  <option value="nursing">Nursing & Ward Inpatient Care</option>
                  <option value="pharmacy">Pharmacy POS & Dispensing</option>
                  <option value="laboratory">Laboratory Medicine & Diagnostics</option>
                  <option value="radiology">Radiology & Medical Imaging</option>
                  <option value="finance">Finance Ledger & Accounts</option>
                  <option value="security">Security & Gate Access</option>
                  <option value="administration">Administration & Human Resources</option>
                  <option value="procurement">Procurement & Stores</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Role Title *</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Medical Officer"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Specialist Attachment / Specialty</label>
                <select
                  value={specialty}
                  onChange={(e) => {
                    setSpecialty(e.target.value);
                    if (!e.target.value.startsWith("Other")) {
                      setRole(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                >
                  {(DEPARTMENT_SPECIALTIES[department] || []).map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                  <option value="Other / Custom Attachment">Other / Custom Attachment</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Professional License / Board Registration</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. KMPDC/A49201, PPB/P8829"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {specialty.startsWith("Other") && (
              <div className="space-y-1 pt-1 animate-slide-up">
                <label className="font-bold text-slate-600">Specify Custom Attachment *</label>
                <input
                  type="text"
                  required
                  value={customSpecialty}
                  onChange={(e) => setCustomSpecialty(e.target.value)}
                  placeholder="e.g. Laparoscopic Surgeon, Forensic Pathologist"
                  className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 rounded-xl font-semibold text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Section 3: Compensation, Monthly Salary & Statutory Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-900">
                3. Base Compensation & Live Kenyan Statutory Estimates
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 flex items-center justify-between">
                  <span>Base Monthly Salary (KES) *</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">Gross Pay</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 font-mono text-xs">KES</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full pl-12 pr-3.5 py-2.5 bg-emerald-50/20 border border-emerald-300 rounded-xl font-mono font-black text-sm text-slate-950 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Employment Hire Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Direct Deposit Bank</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Equity Bank, KCB, Standard Chartered"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Bank Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. 0180293847291"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Live Statutory Deductions Computation Preview */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-2">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Automated Monthly Statutory Deductions Preview (2026 Kenyan Tax Framework)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  Relief: KES 2,400 applied
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">KRA PAYE</span>
                  <span className="font-mono font-bold text-amber-300 text-xs mt-0.5 block">
                    KES {payeEst.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">SHIF (2.75%)</span>
                  <span className="font-mono font-bold text-blue-300 text-xs mt-0.5 block">
                    KES {shifEst.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">AHL (1.5%)</span>
                  <span className="font-mono font-bold text-purple-300 text-xs mt-0.5 block">
                    KES {ahlEst.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">NSSF Pension</span>
                  <span className="font-mono font-bold text-teal-300 text-xs mt-0.5 block">
                    KES {nssfEst.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-emerald-950/70 rounded-xl border border-emerald-500/40 col-span-2 sm:col-span-1">
                  <span className="text-[9px] uppercase font-bold text-emerald-300 block">Estimated Net</span>
                  <span className="font-mono font-black text-emerald-400 text-xs mt-0.5 block">
                    KES {netPayEst.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Security Credentials & Access Level */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-900">
                4. Security PIN & Portal Access Level
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 flex items-center justify-between">
                  <span>Portal Login Security PIN *</span>
                  <button
                    type="button"
                    onClick={handleRegeneratePin}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto Generate New PIN</span>
                  </button>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 4821"
                    className="w-32 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-base text-slate-900 text-center tracking-widest focus:bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pin);
                      setCopiedPin(true);
                      toast.success(`Copied PIN ${pin} to clipboard.`, "PIN Copied");
                      setTimeout(() => setCopiedPin(false), 2000);
                    }}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Copy PIN"
                  >
                    {copiedPin ? <Check className="w-4 h-4 text-emerald-600" /> : <KeyRound className="w-4 h-4" />}
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Used to authenticate at department portals and kiosk stations.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">System Access Level *</label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Standard Staff">Standard Staff (Assigned Department Only)</option>
                  <option value="Department Admin">Department Admin (Manage Department & Audits)</option>
                  <option value="Super Admin">Super Admin (Full Hospital Root ERP Access)</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Controls permission boundaries and module visibility in the navigation menu.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">
              All modifications are persisted directly to Cloud Firestore and reflected immediately across all clinical workstations.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Staff & Salary Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

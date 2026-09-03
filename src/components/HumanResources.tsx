import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, addDoc, updateDoc, writeBatch, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { Employee, PayrollRecord } from "../types";
import { checkDuplicateEmployee } from "../lib/deduplicationService";
import StaffOnboardingModal from "./StaffOnboardingModal";
import EditStaffModal from "./EditStaffModal";
import { 
  Users, 
  UserPlus, 
  Landmark, 
  CreditCard, 
  ShieldAlert, 
  FileText, 
  Plus, 
  Trash2, 
  Check, 
  DollarSign, 
  Activity, 
  Briefcase, 
  Calendar, 
  Search, 
  Sparkles, 
  Printer, 
  Download,
  Loader2,
  AlertCircle,
  TrendingUp,
  Award,
  Eye,
  X,
  Ban,
  Copy,
  KeyRound,
  IdCard,
  UserCheck,
  RefreshCw,
  ArrowRight,
  Stethoscope,
  BedDouble,
  AlertTriangle,
  Pencil
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import DocumentLogo from "./DocumentLogo";
import { printElement, downloadElementAsPdf } from "../lib/printUtils";
import { toast, modernConfirm } from "../lib/promptService";

export const DEPARTMENT_SPECIALTIES: Record<string, string[]> = {
  reception: [
    "Front Desk Receptionist",
    "Patient Registration Officer",
    "Customer Care & Triage Receptionist",
    "SHA / NHIF Verification Clerk",
    "Records & Registration Officer",
    "Lead Receptionist / Front Desk Supervisor",
    "Other Reception Specialist"
  ],
  medical: [
    "General Practitioner (GP)",
    "Consulting Physician",
    "Chief Medical Officer",
    "General Surgeon",
    "Cardiologist",
    "Dermatologist",
    "Other Specialist"
  ],
  gynaecology: [
    "Gynecologist / Obstetrician",
    "Fertility Specialist",
    "Midwife",
    "OB-GYN Nurse Practitioner",
    "Other OB-GYN Specialist"
  ],
  dentistry: [
    "Dentist / Dental Surgeon",
    "Orthodontist",
    "Pediatric Dentist",
    "Dental Hygienist",
    "Dental Assistant",
    "Other Dental Specialist"
  ],
  pediatrics: [
    "Pediatrician",
    "Neonatologist",
    "Pediatric Nurse",
    "Other Pediatric Specialist"
  ],
  nursing: [
    "Registered Nurse (RN)",
    "Senior Charge Nurse",
    "Triage Nurse",
    "Nurse Anesthetist",
    "Critical Care Nurse",
    "Other Nursing Specialization"
  ],
  pharmacy: [
    "Head Pharmacist",
    "Pharmaceutical Technologist",
    "Pharmacy Assistant",
    "Clinical Pharmacist"
  ],
  laboratory: [
    "Laboratory Technologist",
    "Medical Lab Technician",
    "Pathologist",
    "Phlebotomist",
    "Lab Assistant"
  ],
  radiology: [
    "Radiologist",
    "Radiographer / X-Ray Tech",
    "Sonographer",
    "MRI Technologist"
  ],
  finance: [
    "Lead Financial Accountant",
    "Billing & Coding Specialist",
    "Insurance Claims Analyst",
    "Finance Cashier"
  ],
  security: [
    "Security Chief Officer",
    "Security Guard",
    "Biometric Access Officer",
    "CCTV Operator"
  ],
  administration: [
    "Hospital Administrator",
    "Human Resources Specialist",
    "Systems Administrator",
    "Receptionist / Clerk"
  ]
};

export default function HumanResources() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"directory" | "payroll">("directory");
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [payrollMonth, setPayrollMonth] = useState("July 2026");

  // New Employee Form States
  const [empName, setEmpName] = useState("");
  const [empId, setEmpId] = useState("");
  const [empRole, setEmpRole] = useState("General Practitioner (GP)");
  const [empDept, setEmpDept] = useState("medical");
  const [empSpecialty, setEmpSpecialty] = useState("General Practitioner (GP)");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [empSalary, setEmpSalary] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empNationalId, setEmpNationalId] = useState("");
  const [empAccessLevel, setEmpAccessLevel] = useState<"Super Admin" | "Department Admin" | "Standard Staff">("Standard Staff");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Payslip Printer states
  const [printOpen, setPrintOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<PayrollRecord | null>(null);

  // Detailed Employee profile & edit states
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showStaffOnboardingModal, setShowStaffOnboardingModal] = useState(false);
  const [copiedStaffId, setCopiedStaffId] = useState<string | null>(null);
  const [dossierPrinting, setDossierPrinting] = useState(false);
  const [dossierDownloading, setDossierDownloading] = useState(false);
  const [dossierDownloadSuccess, setDossierDownloadSuccess] = useState(false);

  const handlePrintDossier = async () => {
    if (dossierPrinting || !viewingEmployee) return;
    setDossierPrinting(true);
    try {
      await printElement("dossier-print-section", {
        title: `Staff_Dossier_${viewingEmployee.name.replace(/\s+/g, "_")}_${viewingEmployee.employeeId}`,
        paperSize: "a4"
      });
      toast.success("Staff personnel dossier sent to printer.", "Print Triggered");
    } catch (err) {
      console.error(err);
      toast.error("Failed to print dossier.", "Print Error");
    } finally {
      setTimeout(() => setDossierPrinting(false), 700);
    }
  };

  const handleDownloadDossierPdf = async () => {
    if (dossierDownloading || !viewingEmployee) return;
    setDossierDownloading(true);
    setDossierDownloadSuccess(false);
    try {
      const fileName = `Staff_Dossier_${viewingEmployee.name.replace(/\s+/g, "_")}_${viewingEmployee.employeeId}.pdf`;
      const ok = await downloadElementAsPdf("dossier-print-section", {
        fileName,
        title: `Staff Personnel Dossier: ${viewingEmployee.name}`,
        format: "a4",
        scale: 2
      });
      if (ok) {
        setDossierDownloadSuccess(true);
        toast.success("Staff dossier downloaded as multi-page PDF.", "Download Complete");
        setTimeout(() => setDossierDownloadSuccess(false), 3500);
      } else {
        toast.error("Could not export PDF.", "Export Error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generating dossier PDF.", "Export Error");
    } finally {
      setDossierDownloading(false);
    }
  };

  // Status flags
  const [submitting, setSubmitting] = useState(false);
  const [runningPayroll, setRunningPayroll] = useState(false);

  // Clinical Handover & Reassignment Modal States
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverStaff, setHandoverStaff] = useState<Employee | null>(null);
  const [successorEmpId, setSuccessorEmpId] = useState<string>("");
  const [handoverNotes, setHandoverNotes] = useState<string>("");
  const [activeCases, setActiveCases] = useState<Array<{ id: string; type: "encounter" | "ticket"; patientName: string; details: string; department?: string }>>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [isExecutingHandover, setIsExecutingHandover] = useState(false);

  useEffect(() => {
    // 1. Listen to Employees
    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((doc) => {
        emps.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(emps);
    });

    // 2. Listen to Payroll Records
    const unsubPayroll = onSnapshot(collection(db, "payroll"), (snapshot) => {
      const records: PayrollRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as PayrollRecord);
      });
      setPayrollRecords(records);
    });

    return () => {
      unsubEmployees();
      unsubPayroll();
    };
  }, []);

  // Synchronize specialty and role when department changes
  useEffect(() => {
    if (DEPARTMENT_SPECIALTIES[empDept]) {
      const defaultSpec = DEPARTMENT_SPECIALTIES[empDept][0];
      setEmpSpecialty(defaultSpec);
      setEmpRole(defaultSpec);
      setCustomSpecialty("");
    }
  }, [empDept]);

  // Lock scrolling when viewingEmployee is active
  useEffect(() => {
    if (viewingEmployee) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [viewingEmployee]);

  // Helper to calculate Kenyan statutory deductions
  // 1. NSSF: Pension Fund - standard Tier I + Tier II in Kenya (usually ~ KES 400 - KES 1080)
  // 2. SHIF (Social Health Insurance Fund) - replaces NHIF, standard 2.75% of Gross Income
  // 3. Affordable Housing Levy (AHL) - 1.5% of Gross Income
  // 4. PAYE (KRA tax bands for 2024-2026):
  //    - Up to KES 24,000: 10%
  //    - Next KES 8,333 (24,001 - 32,333): 25%
  //    - Above KES 32,333: 30%
  //    - High earners (> 500k is 32.5%, > 800k is 35% but we use 30% average capped bands for ease)
  //    - Personal relief of KES 2,400 monthly applied.
  const calculateKenyanPayroll = (baseSalary: number, allowances: number) => {
    const gross = baseSalary + allowances;
    
    // NSSF: Flat KES 1,080 standard rate for middle/high Tier, or capped
    const nssf = baseSalary > 18000 ? 1080 : Math.round(baseSalary * 0.06);
    
    // SHIF: 2.75% of Gross
    const shif = Math.round(gross * 0.0275);
    
    // Housing Levy: 1.5% of Gross
    const housingLevy = Math.round(gross * 0.015);
    
    // KRA PAYE Bracket calculations (with KES 2,400 Personal Relief)
    let taxableIncome = gross - nssf; // NSSF is tax-exempt
    let payeRaw = 0;
    
    if (taxableIncome <= 24000) {
      payeRaw = taxableIncome * 0.10;
    } else if (taxableIncome <= 32333) {
      payeRaw = (24000 * 0.10) + ((taxableIncome - 24000) * 0.25);
    } else {
      payeRaw = (24000 * 0.10) + (8333 * 0.25) + ((taxableIncome - 32333) * 0.30);
    }
    
    // Apply monthly Personal Relief of KES 2,400
    const paye = Math.max(0, Math.round(payeRaw - 2400));
    const totalDeductions = shif + paye + housingLevy + nssf;
    const netPay = gross - totalDeductions;

    return {
      nssf,
      shif,
      housingLevy,
      paye,
      totalDeductions,
      netPay
    };
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);
    if (!empName || !empRole || !empSalary || !empPhone || !empNationalId) {
      const msg = "Please fill all required fields (Name, National ID, Phone, Role, Salary).";
      setDuplicateError(msg);
      toast.warning(msg, "Missing Information");
      return;
    }

    const calculatedEmail = empEmail.trim().toLowerCase() || `${empName.trim().toLowerCase().replace(/\s+/g, ".")}@tassiahillhospital.co.ke`;
    const cleanNationalId = empNationalId.trim();

    setSubmitting(true);
    try {
      // 1. Strict Duplicate Check across National ID and Email
      const dupCheck = await checkDuplicateEmployee(cleanNationalId, calculatedEmail);
      if (dupCheck.isDuplicate) {
        const dupMsg = `[DUPLICATE REJECTED] ${dupCheck.reason}`;
        setDuplicateError(dupMsg);
        toast.warning(dupMsg, "Duplicate Employee Blocked");
        setSubmitting(false);
        return;
      }

      // Check local cache
      const existingInCache = employees.find(
        (emp) => 
          (emp.nationalId && emp.nationalId.trim().toLowerCase() === cleanNationalId.toLowerCase()) ||
          (emp.email && emp.email.trim().toLowerCase() === calculatedEmail)
      );
      if (existingInCache) {
        const dupMsg = `[DUPLICATE REJECTED] An employee with National ID ${cleanNationalId} or email ${calculatedEmail} is already registered (${existingInCache.name}).`;
        setDuplicateError(dupMsg);
        toast.warning(dupMsg, "Duplicate Staff Member Blocked");
        setSubmitting(false);
        return;
      }

      const finalSpecialty = empSpecialty.startsWith("Other") ? (customSpecialty || empSpecialty) : empSpecialty;
      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
      const newEmp = {
        name: empName.trim(),
        nationalId: cleanNationalId,
        role: empRole,
        department: empDept,
        specialty: finalSpecialty,
        salary: parseInt(empSalary),
        phone: empPhone.trim(),
        email: calculatedEmail,
        status: "active",
        hireDate: new Date().toISOString().split("T")[0],
        accessLevel: empAccessLevel,
        pin: generatedPin
      };

      await addDoc(collection(db, "employees"), newEmp);
      
      toast.success(
        `Staff member ${empName.trim()} registered successfully with PIN ${generatedPin}.`,
        "Employee Onboarded"
      );

      // Reset form
      setEmpName("");
      setEmpNationalId("");
      setEmpRole("General Practitioner (GP)");
      setEmpSalary("");
      setEmpPhone("");
      setEmpEmail("");
      setEmpDept("medical");
      setEmpSpecialty("General Practitioner (GP)");
      setCustomSpecialty("");
      setEmpAccessLevel("Standard Staff");
      setDuplicateError(null);
    } catch (err: any) {
      console.error("Error creating employee:", err);
      const errMsg = "Failed to save employee profile: " + (err?.message || "Please check database connection.");
      setDuplicateError(errMsg);
      toast.error(errMsg, "Employee Creation Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateTermination = async (emp: Employee) => {
    setHandoverStaff(emp);
    setSuccessorEmpId("");
    setHandoverNotes(`Clinical & administrative handover upon deactivation of ${emp.name} (${emp.role}).`);
    setLoadingCases(true);
    setIsHandoverModalOpen(true);

    try {
      const foundCases: Array<{ id: string; type: "encounter" | "ticket"; patientName: string; details: string; department?: string }> = [];

      // 1. Check for active Inpatient / Triage / Consult encounters
      const encSnap = await getDocs(query(collection(db, "encounters"), where("status", "in", ["ADMITTED", "TRIAGE", "DOCTOR_CONSULT"])));
      encSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (
          (d.attendingDoctorName && d.attendingDoctorName.toLowerCase() === emp.name.toLowerCase()) ||
          (d.admittingDoctorName && d.admittingDoctorName.toLowerCase() === emp.name.toLowerCase()) ||
          d.doctorId === emp.id ||
          d.nurseId === emp.id
        ) {
          foundCases.push({
            id: docSnap.id,
            type: "encounter",
            patientName: d.patientName || "Admitted Patient",
            details: `Ward: ${d.wardName || "General"}, Bed: ${d.bedNumber || "Assigned"} (Encounter: ${docSnap.id.slice(-6)})`,
            department: d.department || "Ward Inpatient",
          });
        }
      });

      // 2. Check for active Queue tickets
      const qSnap = await getDocs(query(collection(db, "queue"), where("status", "in", ["waiting", "in_progress", "in_consultation"])));
      qSnap.forEach((docSnap) => {
        const qd = docSnap.data();
        if (
          (qd.doctorName && qd.doctorName.toLowerCase() === emp.name.toLowerCase()) ||
          qd.assignedSpecialistId === emp.id ||
          (qd.assignedSpecialistName && qd.assignedSpecialistName.toLowerCase() === emp.name.toLowerCase())
        ) {
          foundCases.push({
            id: docSnap.id,
            type: "ticket",
            patientName: qd.patientName || "Queue Patient",
            details: `Ticket #${qd.ticketNumber || docSnap.id.slice(-4)} - ${qd.department || "Consultation Room"}`,
            department: qd.department || "Clinical Queue",
          });
        }
      });

      setActiveCases(foundCases);
    } catch (err) {
      console.error("Error querying active cases for staff handover:", err);
    } finally {
      setLoadingCases(false);
    }
  };

  const handleExecuteHandoverAndDeactivate = async () => {
    if (!handoverStaff) return;
    if (activeCases.length > 0 && !successorEmpId) {
      toast.warning("Please select an active clinical colleague to receive the active cases.", "Successor Required");
      return;
    }

    const targetEmp = employees.find((e) => e.id === successorEmpId);
    setIsExecutingHandover(true);

    try {
      const batch = writeBatch(db);

      // 1. Reassign each active encounter & queue ticket to the selected colleague
      if (targetEmp) {
        for (const item of activeCases) {
          if (item.type === "encounter") {
            const encRef = doc(db, "encounters", item.id);
            batch.update(encRef, {
              attendingDoctorName: targetEmp.name,
              doctorId: targetEmp.id,
              lastHandoverAt: new Date().toISOString(),
              handoverLog: `Duty Handover from ${handoverStaff.name} to ${targetEmp.name}. Notes: ${handoverNotes}`,
            });

            // Log nursing transition entry
            const noteRef = doc(collection(db, "encounters", item.id, "nursing_notes"));
            batch.set(noteRef, {
              note: `[CLINICAL HANDOVER] Primary attending doctor reassigned from ${handoverStaff.name} to ${targetEmp.name}. Handover Brief: ${handoverNotes}`,
              shift: "Duty Handover",
              nurseName: "HR Administrative Desk",
              timestamp: new Date().toISOString(),
            });
          } else if (item.type === "ticket") {
            const qRef = doc(db, "queue", item.id);
            batch.update(qRef, {
              doctorName: targetEmp.name,
              assignedSpecialistId: targetEmp.id,
              assignedSpecialistName: targetEmp.name,
              notes: `Queue case transferred from ${handoverStaff.name} to ${targetEmp.name}. Handover: ${handoverNotes}`,
            });
          }
        }
      }

      // 2. Mark employee as terminated
      const empRef = doc(db, "employees", handoverStaff.id);
      batch.update(empRef, {
        status: "terminated",
        terminatedAt: new Date().toISOString(),
        handoverTo: targetEmp ? targetEmp.name : "None",
        handoverNotes: handoverNotes,
      });

      // 3. Suspend system user credentials if present
      const userAccountsSnap = await getDocs(query(collection(db, "system_users"), where("email", "==", handoverStaff.email)));
      userAccountsSnap.forEach((uDoc) => {
        batch.update(doc(db, "system_users", uDoc.id), {
          status: "suspended",
        });
      });

      await batch.commit();

      toast.success(
        `Staff member ${handoverStaff.name} deactivated. ${activeCases.length} active caseload item(s) reassigned to ${targetEmp ? targetEmp.name : "N/A"}.`,
        "Handover & Deactivation Complete"
      );

      setIsHandoverModalOpen(false);
      setHandoverStaff(null);
      setActiveCases([]);
      setSuccessorEmpId("");
    } catch (err: any) {
      console.error("Error executing staff handover:", err);
      toast.error(`Failed to execute handover: ${err?.message || "Check network"}`, "Handover Error");
    } finally {
      setIsExecutingHandover(false);
    }
  };

  const handleTerminateEmployee = async (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      handleInitiateTermination(emp);
    }
  };

  // Generate payroll for all active employees for the active month
  const handleGeneratePayroll = async () => {
    if (employees.length === 0) return;
    setRunningPayroll(true);
    try {
      const batch = writeBatch(db);
      
      // Check existing payroll for this month to avoid duplicates
      const monthRecords = payrollRecords.filter(r => r.month === payrollMonth);
      const processedEmployeeIds = new Set(monthRecords.map(r => r.employeeId));

      const activeEmployees = employees.filter(e => e.status === "active");
      let count = 0;

      for (const emp of activeEmployees) {
        if (processedEmployeeIds.has(emp.id)) continue;

        // Base allowances (mocking standard medical + commuter allowances in Kenya ~ KES 15,000 average)
        const allowances = emp.salary > 100000 ? 15000 : 5000;
        const deductions = calculateKenyanPayroll(emp.salary, allowances);

        const recordRef = doc(collection(db, "payroll"));
        batch.set(recordRef, {
          employeeId: emp.id,
          employeeName: emp.name,
          month: payrollMonth,
          baseSalary: emp.salary,
          allowances,
          deductions: {
            shif: deductions.shif,
            paye: deductions.paye,
            housingLevy: deductions.housingLevy,
            nssf: deductions.nssf,
            other: 0,
          },
          netPay: deductions.netPay,
          paymentStatus: "pending",
        });
        count++;
      }

      if (count > 0) {
        await batch.commit();
        toast.success(
          `Generated ${count} pending payslips for ${payrollMonth}. Ready for bank disbursement.`,
          "Payroll Generated"
        );
      } else {
        toast.info("Payroll has already been generated for all active employees for this period.", "Up to Date");
      }
    } catch (err) {
      console.error("Payroll run failed:", err);
      toast.error("Failed to run payroll batch. Please check database connectivity.", "Payroll Error");
    } finally {
      setRunningPayroll(false);
    }
  };

  // Release Bank Payout / Pay Salary
  const handlePaySalary = async (recordId: string, empName: string, amount: number) => {
    try {
      // 1. Mark Payroll Record as Paid in Firestore
      await updateDoc(doc(db, "payroll", recordId), {
        paymentStatus: "paid",
        paidDate: new Date().toISOString().split("T")[0]
      });

      // 2. Automatically record this inside the central Business Expenses Ledger
      await addDoc(collection(db, "expenses"), {
        description: `Staff Payroll: Gross & Statutory payouts for ${empName}`,
        amount: amount,
        category: "salaries",
        date: new Date().toISOString().split("T")[0],
        supplier: "Internal Staff Disbursement"
      });

      toast.success(
        `Salary for ${empName} released! Statutory taxes (PAYE, SHIF, Housing Levy) scheduled for transmission.`,
        "Salary Disbursed"
      );
    } catch (err) {
      console.error(err);
      toast.error(`Failed to process salary disbursement for ${empName}.`, "Transaction Error");
    }
  };

  // Pay all pending salaries
  const handlePayAllSalaries = async () => {
    const pendings = payrollRecords.filter(r => r.month === payrollMonth && r.paymentStatus === "pending");
    if (pendings.length === 0) {
      toast.info("No pending payrolls for this month.", "Payroll Current");
      return;
    }

    const totalNet = pendings.reduce((sum, r) => sum + r.netPay, 0);
    const confirmed = await modernConfirm(
      `Disburse bank transactions for all ${pendings.length} pending staff members? Net total payout: KES ${totalNet.toLocaleString()}`,
      {
        title: "Disburse Batch Payroll",
        type: "question",
        confirmText: `Disburse KES ${totalNet.toLocaleString()}`,
        cancelText: "Cancel",
      }
    );
    if (!confirmed) {
      return;
    }

    try {
      for (const r of pendings) {
        await handlePaySalary(r.id, r.employeeName, r.baseSalary + r.allowances);
      }
      toast.success("All pending salaries disbursed successfully.", "Batch Payout Completed");
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while disbursing batch salaries.", "Batch Error");
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.nationalId.includes(searchQuery);
    const matchesDept = deptFilter === "all" || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  // Calculate high-level HR metrics
  const totalSalaryExpense = employees.filter(e => e.status === "active").reduce((sum, e) => sum + e.salary, 0);
  const averageSalary = employees.length > 0 ? Math.round(totalSalaryExpense / employees.length) : 0;
  const activeEmployeeCount = employees.filter(e => e.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Top Welcome Title Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Users className="w-48 h-48 text-emerald-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold tracking-widest uppercase rounded-full">
              Administrative Suite
            </span>
            <h1 className="text-2xl font-black tracking-tight">Human Resources Department</h1>
            <p className="text-xs text-slate-300 max-w-xl">
              Manage clinical & administrative staff records, track duty shifts, monitor professional licensing (KMPDC, NCK, PPB), and handle staff onboarding & appraisals.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              id="btn-hr-view-directory"
              onClick={() => setActiveTab("directory")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "directory"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-750"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Register</span>
            </button>
            <button
              id="btn-hr-view-payroll"
              onClick={() => setActiveTab("payroll")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "payroll"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-750"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payroll & Deductions</span>
            </button>
          </div>
        </div>
      </div>

      {/* HR Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Staff</span>
            <span className="text-2xl font-black text-gray-950 mt-1 block">{activeEmployeeCount}</span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              Fully credentialed KMPDC
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-gray-100 rounded-2xl text-slate-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Est. Monthly Opex</span>
            <span className="text-2xl font-black text-gray-950 mt-1 block">KES {totalSalaryExpense.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Base Staff Allocation
            </span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Average Salary</span>
            <span className="text-2xl font-black text-gray-950 mt-1 block">KES {averageSalary.toLocaleString()}</span>
            <span className="text-[10px] text-gray-500 block mt-1">Across all departments</span>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-purple-600">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Statutory Transfers</span>
            <span className="text-2xl font-black text-gray-950 mt-1 block">
              KES {payrollRecords.filter(r => r.month === payrollMonth).reduce((acc, curr) => acc + curr.deductions.paye + curr.deductions.shif + curr.deductions.housingLevy, 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold text-emerald-700 block mt-1">
              KRA eTIMS & MoH SHIF ready
            </span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {activeTab === "directory" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Employee Form (LHS) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs">
              <h3 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide flex items-center gap-2 mb-4">
                <UserPlus className="w-4.5 h-4.5 text-emerald-600" />
                <span>Onboard New Employee</span>
              </h3>
              
              <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-gray-600">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Dr. Arthur Conan"
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">National ID *</label>
                    <input
                      type="text"
                      required
                      value={empNationalId}
                      onChange={(e) => setEmpNationalId(e.target.value)}
                      placeholder="e.g. 30511894"
                      className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Phone Contact *</label>
                    <input
                      type="text"
                      required
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      placeholder="e.g. 0711943210"
                      className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Department</label>
                    <select
                      value={empDept}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        setEmpDept(newDept);
                        const specs = DEPARTMENT_SPECIALTIES[newDept] || [];
                        if (specs.length > 0) {
                          setEmpSpecialty(specs[0]);
                          setEmpRole(specs[0]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-semibold text-gray-800 animate-fade-in"
                    >
                      <option value="reception">Reception & Front Desk</option>
                      <option value="medical">Medical Practice (Clinical)</option>
                      <option value="gynaecology">Obstetrics & Gynecology (OB-GYN)</option>
                      <option value="dentistry">Dentistry (Dental Practice)</option>
                      <option value="pediatrics">Pediatrics (Child Medicine)</option>
                      <option value="nursing">Nursing & Triage</option>
                      <option value="pharmacy">Pharmacy POS</option>
                      <option value="laboratory">Laboratory Medicine</option>
                      <option value="radiology">Radiology & Imaging</option>
                      <option value="finance">Finance Ledger</option>
                      <option value="security">Security Desk</option>
                      <option value="administration">Administration & HR</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Role Title *</label>
                    <input
                      type="text"
                      required
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      placeholder="e.g. Consultant Surgeon"
                      className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-600">Specialist Attachment / Specialty *</label>
                  <select
                    value={empSpecialty}
                    onChange={(e) => {
                      setEmpSpecialty(e.target.value);
                      if (!e.target.value.startsWith("Other")) {
                        setEmpRole(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-semibold text-gray-800"
                  >
                    {(DEPARTMENT_SPECIALTIES[empDept] || []).map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {empSpecialty.startsWith("Other") && (
                  <div className="space-y-1 animate-slide-up">
                    <label className="font-bold text-gray-600">Specify Custom Specialty *</label>
                    <input
                      type="text"
                      required
                      value={customSpecialty}
                      onChange={(e) => {
                        setCustomSpecialty(e.target.value);
                        setEmpRole(e.target.value);
                      }}
                      placeholder="e.g. Gyna Oncologist"
                      className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/20 rounded-xl focus:outline-hidden focus:border-emerald-500 font-semibold text-gray-800"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-gray-600">Base Monthly Salary (KES) *</label>
                  <input
                    type="number"
                    required
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    placeholder="e.g. 125000"
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-600">Corporate Email Address (Staff Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="e.g. staff.user@tassiahillhospital.co.ke"
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-600">System Access Level *</label>
                  <select
                    value={empAccessLevel}
                    onChange={(e) => setEmpAccessLevel(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-hidden focus:border-emerald-500 font-semibold text-gray-800"
                  >
                    <option value="Standard Staff">Standard Staff (Assigned Dept Only)</option>
                    <option value="Department Admin">Department Admin (Dept Management)</option>
                    <option value="Super Admin">Super Admin (Full Platform Root)</option>
                  </select>
                </div>

                {duplicateError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-semibold animate-shake">
                    <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-rose-900">Duplicate Employee Blocked</span>
                      <span className="text-[11px]">{duplicateError}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/15 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Onboard & Credentials Entry</span>
                </button>
              </form>
            </div>
          </div>

          {/* Directory Listings (RHS) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide">Credentialed Employee Register</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Filter, monitor and update regulatory registration details of standard personnel.</p>
                </div>
                
                {/* Search Bar & Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStaffOnboardingModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Generate Passcard & Credentials</span>
                  </button>

                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 border border-gray-200 bg-gray-50 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 font-medium w-40"
                    />
                  </div>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-xl text-xs font-semibold focus:outline-hidden text-gray-700"
                  >
                    <option value="all">All Depts</option>
                    <option value="reception">Reception</option>
                    <option value="medical">Medical</option>
                    <option value="gynaecology">Gynecology</option>
                    <option value="dentistry">Dentistry</option>
                    <option value="pediatrics">Pediatrics</option>
                    <option value="nursing">Nursing</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="radiology">Radiology</option>
                    <option value="finance">Finance</option>
                    <option value="security">Security</option>
                    <option value="administration">Admin/HR</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                      <th className="p-3">Personnel Profile</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">National ID</th>
                      <th className="p-3">Security PIN</th>
                      <th className="p-3 text-right">Base Salary</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {filteredEmployees.map((emp) => {
                      const staffPin = emp.pin || "2026";
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50/40">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {emp.photoURL || emp.avatarUrl ? (
                                <img
                                  src={emp.photoURL || emp.avatarUrl}
                                  alt={emp.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-emerald-300 shadow-xs shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-extrabold text-gray-950 text-sm">{emp.name}</p>
                                  {emp.specialty && (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-extrabold uppercase tracking-wide">
                                      {emp.specialty}
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-500 text-[10px] font-medium">{emp.role} • {emp.email}</p>
                                <p className="text-gray-400 text-[9px] font-mono mt-0.5">Tel: {emp.phone} • Hired: {emp.hireDate}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-semibold uppercase text-[10px] text-emerald-800">
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-150 rounded">
                              {emp.department}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-600">{emp.nationalId}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs px-2 py-0.5 bg-slate-100 text-emerald-950 rounded-md border border-slate-200">
                                {staffPin}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = `Hospital Credentials for ${emp.name}:\nRole: ${emp.role}\nEmail: ${emp.email}\nSecurity PIN: ${staffPin}\nLogin Portal: Select station and enter PIN ${staffPin}`;
                                  navigator.clipboard.writeText(text);
                                  setCopiedStaffId(emp.id);
                                  toast.success(`Copied login credentials for ${emp.name}!`, "Credentials Copied");
                                  setTimeout(() => setCopiedStaffId(null), 2500);
                                }}
                                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                                title="Copy Credentials to Clipboard"
                              >
                                {copiedStaffId === emp.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold text-gray-900 font-mono">
                            KES {emp.salary.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              emp.status === "active" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-150"
                                : "bg-red-50 text-red-700 border border-red-150"
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`btn-edit-staff-${emp.id}`}
                                onClick={() => setEditingEmployee(emp)}
                                className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 border border-emerald-200/80 rounded-lg cursor-pointer transition-all inline-flex items-center gap-1 font-bold text-xs shadow-2xs"
                                title="Edit Staff Details, Role & Salary"
                              >
                                <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden md:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => setViewingEmployee(emp)}
                                className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg cursor-pointer transition-all inline-flex items-center justify-center"
                                title="View & Print Full Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {emp.status === "active" && (
                                <button
                                  onClick={() => handleTerminateEmployee(emp.id)}
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg cursor-pointer transition-all inline-flex items-center justify-center"
                                  title="Terminate Employee"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-400 italic">
                          No matching active staff personnel cataloged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Payroll Console Tab */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
              <div>
                <h3 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide">Regulatory Monthly Payroll Console</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Run cycles with statutory 2026 deductions: MoH SHIF (2.75%), Affordable Housing Levy (1.5%), NSSF (KES 1,080), and tiered KRA PAYE taxes.</p>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Pay Period:</label>
                  <select
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-xl text-xs font-bold focus:outline-hidden text-gray-800"
                  >
                    <option value="June 2026">June 2026</option>
                    <option value="July 2026">July 2026</option>
                    <option value="August 2026">August 2026</option>
                    <option value="September 2026">September 2026</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-5">
                  <button
                    id="btn-trigger-payroll-cycle"
                    onClick={handleGeneratePayroll}
                    disabled={runningPayroll || employees.filter(e => e.status === "active").length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/10 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Run Payroll Cycle</span>
                  </button>
                  <button
                    id="btn-pay-all-payouts"
                    onClick={handlePayAllSalaries}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Disburse All Salaries</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Payroll Grid List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Staff Profile</th>
                    <th className="p-3 text-right">Gross Earnings</th>
                    <th className="p-3 text-center">SHIF (2.75%)</th>
                    <th className="p-3 text-center">Housing Levy (1.5%)</th>
                    <th className="p-3 text-center">NSSF Pension</th>
                    <th className="p-3 text-center">KRA PAYE Tax</th>
                    <th className="p-3 text-right">Net Take-Home</th>
                    <th className="p-3 text-center">Payout</th>
                    <th className="p-3 text-center">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {payrollRecords
                    .filter(r => r.month === payrollMonth)
                    .map((rec) => {
                      const totalDeductions = rec.deductions.paye + rec.deductions.shif + rec.deductions.housingLevy + rec.deductions.nssf;
                      const linkedEmp = employees.find(e => e.id === rec.employeeId);
                      return (
                        <tr key={rec.id} className="hover:bg-gray-50/40">
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-gray-950">{rec.employeeName}</p>
                              {linkedEmp && (
                                <button
                                  type="button"
                                  onClick={() => setEditingEmployee(linkedEmp)}
                                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                  title={`Edit details and base salary for ${rec.employeeName}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold">Month: {rec.month}</p>
                          </td>
                          <td className="p-3 text-right font-bold text-gray-800 font-mono">
                            KES {(rec.baseSalary + rec.allowances).toLocaleString()}
                            <p className="text-[10px] text-gray-400 font-normal">Base: {rec.baseSalary.toLocaleString()}</p>
                          </td>
                          <td className="p-3 text-center font-mono font-medium text-amber-800">KES {rec.deductions.shif.toLocaleString()}</td>
                          <td className="p-3 text-center font-mono font-medium text-amber-800">KES {rec.deductions.housingLevy.toLocaleString()}</td>
                          <td className="p-3 text-center font-mono font-medium text-amber-800">KES {rec.deductions.nssf.toLocaleString()}</td>
                          <td className="p-3 text-center font-mono font-bold text-red-700">KES {rec.deductions.paye.toLocaleString()}</td>
                          <td className="p-3 text-right font-black text-emerald-800 font-mono text-sm">
                            KES {rec.netPay.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {rec.paymentStatus === "paid" ? (
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-150 rounded text-[9px] uppercase">
                                PAID
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePaySalary(rec.id, rec.employeeName, rec.baseSalary + rec.allowances)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 mx-auto transition-colors cursor-pointer shadow-sm"
                              >
                                <Check className="w-3 h-3" />
                                <span>Disburse</span>
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              id={`btn-payroll-slip-${rec.id}`}
                              onClick={() => {
                                setPrintTarget(rec);
                                setPrintOpen(true);
                              }}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors inline-flex items-center justify-center"
                              title="Print payslip document"
                            >
                              <Printer className="w-4.5 h-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {payrollRecords.filter(r => r.month === payrollMonth).length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-gray-400 italic">
                        No payroll processed for {payrollMonth} yet. Run the payroll cycle to start calculations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payslip PDF Modal Integration */}
      <PrintDocument
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        type="payslip"
        payslipData={printTarget}
      />

      {/* Detailed Employee Profile Modal with Printing Capabilities */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header (Screen-only) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-950 text-sm">
                  Staff Personnel Dossier: {viewingEmployee.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-edit-from-dossier"
                  onClick={() => setEditingEmployee(viewingEmployee)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-slate-700"
                  title="Edit staff details, role and salary"
                >
                  <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Edit Details & Salary</span>
                </button>

                <button
                  type="button"
                  id="btn-print-dossier"
                  disabled={dossierPrinting}
                  onClick={handlePrintDossier}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-60"
                >
                  {dossierPrinting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Printing...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Print Dossier</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-download-dossier-pdf"
                  disabled={dossierDownloading}
                  onClick={handleDownloadDossierPdf}
                  className={`px-3.5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 ${
                    dossierDownloadSuccess
                      ? "bg-emerald-800 text-white"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                  title="Download complete employee dossier as multi-page PDF"
                >
                  {dossierDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : dossierDownloadSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>PDF Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Full PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setViewingEmployee(null)}
                  className="p-2 hover:bg-gray-200 text-gray-500 hover:text-gray-800 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Informative Pro-tip Note */}
            <div className="bg-emerald-50 text-emerald-950 px-6 py-2.5 text-xs font-semibold flex items-center gap-2 shrink-0">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full multi-page document export is supported. You can print directly or click "Download Full PDF" to save an offline copy.</span>
            </div>

            {/* Scrollable Printable Profile Sheet */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-100/50 flex justify-center">
              <div
                id="dossier-print-section"
                className="w-full max-w-2xl bg-white p-8 md:p-12 shadow-sm border border-gray-200 rounded-2xl relative text-slate-900 font-sans"
              >
                {/* Security Watermark for Screen View */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none z-0">
                  <span className="text-5xl font-black rotate-45 text-slate-950 uppercase">THE TASSIA HILL HOSPITAL</span>
                </div>

                <div className="relative z-10 space-y-8">
                  {/* Clinic Header Block */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6 gap-4">
                    <div className="flex items-center gap-3.5">
                      <DocumentLogo size="md" className="border border-slate-300 shadow-xs" />
                      <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-950">THE TASSIA HILL HOSPITAL</h2>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Reg No: 024866 • P.O. Box 1834-00100 Nairobi</p>
                        <p className="text-[10px] text-gray-500 font-medium">Email: tassiahillhospital@gmail.com • Staff Registry</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-widest">
                        CONFIDENTIAL
                      </span>
                      <p className="text-[10px] text-gray-400 font-mono mt-2">Printed: 2026-07-07 UTC</p>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center">
                    <h3 className="text-sm font-black tracking-widest text-slate-900 uppercase underline decoration-2 decoration-emerald-600 underline-offset-4">
                      OFFICIAL STAFF PERSONNEL FILE
                    </h3>
                  </div>

                  {/* Body Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Left: Beautiful Photo/Badge area */}
                    <div className="flex flex-col items-center justify-center p-6 border border-gray-150 bg-gray-50/50 rounded-2xl text-center space-y-3">
                      <div className="w-20 h-20 bg-indigo-100 border-2 border-indigo-200 text-indigo-700 rounded-full flex items-center justify-center shadow-inner">
                        <Users className="w-10 h-10" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-xs">{viewingEmployee.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{viewingEmployee.role}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        viewingEmployee.status === "active" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {viewingEmployee.status}
                      </span>
                    </div>

                    {/* Right: Primary Bio Columns */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100 pb-1">
                        General Identity Data
                      </h4>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr className="border-b border-gray-100">
                            <td className="font-bold text-gray-500 py-1.5 w-1/3">Full Name:</td>
                            <td className="font-extrabold text-slate-950 py-1.5">{viewingEmployee.name}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="font-bold text-gray-500 py-1.5">National ID:</td>
                            <td className="font-mono font-bold text-slate-950 py-1.5">{viewingEmployee.nationalId}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="font-bold text-gray-500 py-1.5">Staff System ID:</td>
                            <td className="font-mono text-gray-600 py-1.5">{viewingEmployee.id}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="font-bold text-gray-500 py-1.5">Primary Department:</td>
                            <td className="font-bold uppercase text-emerald-800 py-1.5">{viewingEmployee.department}</td>
                          </tr>
                          {viewingEmployee.specialty && (
                            <tr className="border-b border-gray-100">
                              <td className="font-bold text-gray-500 py-1.5">Specialty Attachment:</td>
                              <td className="font-extrabold text-indigo-700 py-1.5">{viewingEmployee.specialty}</td>
                            </tr>
                          )}
                          <tr className="border-b border-gray-100">
                            <td className="font-bold text-gray-500 py-1.5">Employment Date:</td>
                            <td className="font-semibold text-slate-900 py-1.5">{viewingEmployee.hireDate}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Contact Details section */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100 pb-1">
                      Direct Communication & Contact Channels
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 border border-gray-150 bg-gray-50/30 rounded-xl">
                        <span className="font-bold text-gray-500 block text-[9px] uppercase">Official Email</span>
                        <span className="font-semibold text-slate-950">{viewingEmployee.email}</span>
                      </div>
                      <div className="p-3 border border-gray-150 bg-gray-50/30 rounded-xl">
                        <span className="font-bold text-gray-500 block text-[9px] uppercase">Primary Telephone</span>
                        <span className="font-semibold text-slate-950">{viewingEmployee.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details and Statutory compliance */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100 pb-1">
                      Statutory Ledger & Bank Accounts
                    </h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="font-bold text-gray-500 py-1.5 w-1/3">Base Monthly Salary:</td>
                          <td className="font-bold text-slate-950 py-1.5 font-mono">KES {viewingEmployee.salary.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="font-bold text-gray-500 py-1.5">Direct Deposit Bank:</td>
                          <td className="font-semibold text-slate-950 py-1.5 uppercase">{viewingEmployee.bankName}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="font-bold text-gray-500 py-1.5">Bank Account Number:</td>
                          <td className="font-mono text-slate-950 py-1.5 font-bold">{viewingEmployee.bankAccount}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="font-bold text-gray-500 py-1.5">Statutory Tax Rules:</td>
                          <td className="text-gray-500 py-1.5 font-medium">
                            Tiered KRA PAYE Deductions, MoH SHIF (2.75%), Affordable Housing Levy (1.5%), NSSF Pension Contribution (Tier II)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Endorsements */}
                  <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
                    <div>
                      <span className="font-bold text-gray-400 block text-[9px] uppercase mb-12">Authorized Registrar Endorsement</span>
                      <div className="border-b border-slate-950 w-full mb-1"></div>
                      <p className="font-bold text-slate-900">System Administrator / HR</p>
                      <p className="text-[10px] text-gray-400">NEXTGEN HMS Central Register</p>
                    </div>
                    <div className="text-right flex flex-col items-end justify-between">
                      <div className="p-1 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-mono text-slate-400 text-center">
                          QR STAMP
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-mono">Verification Hash: E-STAFF-{viewingEmployee.id.substring(0,8).toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff & Salary Modal */}
      {editingEmployee && (
        <EditStaffModal
          isOpen={!!editingEmployee}
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onStaffUpdated={(updatedStaff) => {
            setEmployees((prev) =>
              prev.map((emp) => (emp.id === updatedStaff.id ? updatedStaff : emp))
            );
            if (viewingEmployee && viewingEmployee.id === updatedStaff.id) {
              setViewingEmployee(updatedStaff);
            }
          }}
        />
      )}

      {/* Super Admin Staff Onboarding & Passcard Modal */}
      {showStaffOnboardingModal && (
        <StaffOnboardingModal
          isOpen={showStaffOnboardingModal}
          onClose={() => setShowStaffOnboardingModal(false)}
          onStaffCreated={() => {
            setShowStaffOnboardingModal(false);
            toast.success("Staff member onboarded and credentials generated!", "Staff Onboarded");
          }}
        />
      )}

      {/* Clinical Handover & Case Reassignment Modal */}
      {isHandoverModalOpen && handoverStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-rose-100 flex flex-col relative animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base tracking-tight text-white">Clinical Handover & Staff Deactivation</h3>
                    <span className="px-2 py-0.5 bg-rose-900/40 border border-white/30 rounded-full text-[10px] font-mono font-bold tracking-wider">
                      Patient Safety Protocol
                    </span>
                  </div>
                  <p className="text-xs text-rose-100 font-medium">
                    Reassign active inpatients and queue consults before terminating <strong className="text-white">{handoverStaff.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsHandoverModalOpen(false);
                  setHandoverStaff(null);
                }}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Staff Target Profile Banner */}
              <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {handoverStaff.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">{handoverStaff.name}</h4>
                    <p className="text-xs text-rose-800 font-medium">{handoverStaff.role} • Dept: {handoverStaff.department}</p>
                    <p className="text-[10px] text-gray-500 font-mono">National ID: {handoverStaff.nationalId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Status Change</span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-black rounded-lg border border-rose-200">
                    Active → Terminated
                  </span>
                </div>
              </div>

              {/* Active Caseload Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <BedDouble className="w-4 h-4 text-rose-600" />
                    <span>Active Caseloads Requiring Handover ({activeCases.length})</span>
                  </label>
                  {loadingCases && (
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                      <RefreshCw className="w-3 h-3 animate-spin text-rose-600" /> Scanning Firestore...
                    </span>
                  )}
                </div>

                {activeCases.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {activeCases.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{c.patientName}</span>
                            <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-bold uppercase">
                              {c.type === "encounter" ? "Inpatient Ward" : "Queue Case"}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500">{c.details}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No currently active inpatients or consultation tickets assigned to this staff member.</span>
                  </div>
                )}
              </div>

              {/* Successor Practitioner Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                  Reassign Caseload & Duties To Successor Clinician {activeCases.length > 0 && <span className="text-rose-600">*</span>}
                </label>
                <select
                  value={successorEmpId}
                  onChange={(e) => setSuccessorEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-rose-500"
                >
                  <option value="">-- Select Active Colleague to Receive Handover --</option>
                  {employees
                    .filter((e) => e.status === "active" && e.id !== handoverStaff.id)
                    .map((colleague) => (
                      <option key={colleague.id} value={colleague.id}>
                        {colleague.name} ({colleague.role} - {colleague.department})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-gray-400">
                  Active in-ward encounters and queue items will be transferred to this practitioner's active shift list.
                </p>
              </div>

              {/* Handover Brief & Clinical Transition Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                  Handover Notes & Administrative Audit Reason
                </label>
                <textarea
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  rows={2}
                  placeholder="Provide handover instructions, in-flight treatments, or reasons for staffing transition..."
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-rose-500"
                />
              </div>

              {/* Safety notice banner */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-[11px] text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Deactivating this staff profile will immediately terminate active system login PINs and cease payroll calculations. All clinical records will maintain historical audit attribution.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsHandoverModalOpen(false);
                  setHandoverStaff(null);
                }}
                disabled={isExecutingHandover}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteHandoverAndDeactivate}
                disabled={isExecutingHandover || (activeCases.length > 0 && !successorEmpId)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isExecutingHandover ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Handover...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Confirm Handover & Deactivate Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

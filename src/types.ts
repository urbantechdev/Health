export type SystemRole =
  | "Super Admin"
  | "Admin"
  | "Reception"
  | "Nurse"
  | "Doctor"
  | "Pharmacy"
  | "Lab"
  | "HR"
  | "Payroll"
  | "Finance"
  | "Procurement"
  | "Billing & Accounts"
  | string;

export interface DepartmentToggles {
  reception?: boolean;
  triage?: boolean;
  doctor?: boolean;
  pharmacy?: boolean;
  laboratory?: boolean;
  radiology?: boolean;
  billing?: boolean;
  finance?: boolean;
  hr?: boolean;
  payroll?: boolean;
  procurement?: boolean;
  transfers?: boolean;
  admissions?: boolean;
  forms?: boolean;
  admin?: boolean;
  [key: string]: boolean | undefined;
}

export interface Tenant {
  id: string;
  name: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  currency?: string;
  country?: string;
  shaFacilityCode?: string;
  shaFacilityName?: string;
  pwaIconUrl?: string;
  pwaAppName?: string;
  pwaThemeColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  [key: string]: any;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role: SystemRole;
  department: string;
  status: "active" | "inactive" | "terminated" | "on_leave" | string;
  phone?: string;
  nationalId?: string;
  specialty?: string;
  room?: string;
  roomNumber?: string;
  basicSalary?: number;
  allowances?: number;
  deductions?: number;
  netSalary?: number;
  kraPin?: string;
  nssfNo?: string;
  nhifNo?: string;
  shaNo?: string;
  bankName?: string;
  bankAccount?: string;
  hireDate?: string;
  createdAt?: string;
  isSuperAdmin?: boolean;
  avatarUrl?: string;
  [key: string]: any;
}

export interface QueueTicket {
  id: string;
  ticketNumber: string;
  patientId: string;
  patientName: string;
  nationalId?: string;
  phone?: string;
  age?: number | string;
  gender?: string;
  category?: string;
  priority?: "normal" | "urgent" | "emergency" | string;
  status:
    | "waiting"
    | "called"
    | "in_triage"
    | "in_consultation"
    | "in_pharmacy"
    | "in_lab"
    | "in_billing"
    | "completed"
    | "cancelled"
    | "transferred"
    | string;
  department: string;
  station?: string;
  assignedDoctor?: string;
  assignedDoctorId?: string;
  room?: string;
  consultationRoom?: string;
  vitals?: {
    bp?: string;
    temperature?: number | string;
    pulse?: number | string;
    respiratoryRate?: number | string;
    spo2?: number | string;
    weight?: number | string;
    height?: number | string;
    bmi?: number | string;
    bloodSugar?: number | string;
    triageNotes?: string;
    triageCategory?: string;
    [key: string]: any;
  };
  symptoms?: string;
  notes?: string;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  servedBy?: string;
  source?: string;
  [key: string]: any;
}

export interface MedicalRecord {
  id: string;
  patientNumber?: string;
  patientNo?: string;
  name: string;
  patientName?: string;
  nationalId: string;
  phone?: string;
  email?: string;
  gender: string;
  dob?: string;
  age?: number | string;
  bloodGroup?: string;
  allergies?: string[] | string;
  chronicConditions?: string[] | string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  insuranceProvider?: string;
  insuranceMemberNo?: string;
  shaNo?: string;
  residence?: string;
  occupation?: string;
  createdAt: string;
  updatedAt?: string;
  biometricEnrolled?: boolean;
  biometricTemplate?: string;
  photoUrl?: string;
  [key: string]: any;
}

export interface ClinicalVisit {
  id: string;
  patientId?: string;
  patientName?: string;
  doctorName?: string;
  doctorId?: string;
  date: string;
  symptoms?: string;
  diagnosis?: string;
  icd10Code?: string;
  icd10Description?: string;
  clinicalNotes?: string;
  prescriptions?: PrescriptionItem[];
  labRequests?: string[];
  radiologyRequests?: string[];
  vitals?: any;
  referrals?: any[];
  status?: string;
  followUpDate?: string;
  [key: string]: any;
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  category: string;
  strength?: string;
  dosageForm?: string;
  unitPrice?: number;
  price?: number;
  costPrice?: number;
  stockQuantity?: number;
  quantity?: number;
  reorderLevel?: number;
  minThreshold?: number;
  batchNumber?: string;
  batchNo?: string;
  expiryDate?: string;
  barcode?: string;
  location?: string;
  manufacturer?: string;
  status?: "available" | "low_stock" | "out_of_stock" | "expired" | string;
  [key: string]: any;
}

export interface PrescriptionItem {
  id?: string;
  medicationId?: string;
  medicationName?: string;
  drugName?: string;
  genericName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  instructions?: string;
  dispensed?: boolean;
  status?: "pending" | "dispensed" | "cancelled" | string;
  [key: string]: any;
}

export interface InvoiceItem {
  id?: string;
  name?: string;
  description: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  totalPrice?: number;
  waived?: boolean;
  department?: string;
  [key: string]: any;
}

export interface Invoice {
  id: string;
  invoiceNumber?: string;
  patientId: string;
  patientName: string;
  nationalId?: string;
  date?: string;
  timestamp?: string;
  items: InvoiceItem[];
  subtotal?: number;
  total?: number;
  discount?: number;
  tax?: number;
  shaCoverageAmount?: number;
  insuranceCoverageAmount?: number;
  totalAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentStatus?: "unpaid" | "partial" | "paid" | "waived" | string;
  paymentMethod?: "Cash" | "M-Pesa" | "Insurance" | "SHA" | "Card" | "Bank Transfer" | string;
  mpesaReceiptNumber?: string;
  cashierName?: string;
  cashierId?: string;
  shiftId?: string;
  notes?: string;
  createdAt?: string;
  paidAt?: string;
  [key: string]: any;
}

export interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  approvedBy?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  [key: string]: any;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  paye: number;
  nssf: number;
  nhif: number;
  housingLevy?: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: "pending" | "paid" | "processed" | string;
  paymentDate?: string;
  paymentReference?: string;
  kraPin?: string;
  [key: string]: any;
}

export interface InternalMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  senderEmail?: string;
  senderRole?: SystemRole;
  targetType?: "all" | "role" | "department" | "user" | "individual" | string;
  targetRole?: string;
  targetDepartment?: string;
  targetUserId?: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientRole?: string;
  recipientDepartment?: string;
  message: string;
  priority?: "normal" | "urgent" | "stat_emergency" | string;
  timestamp: string;
  readBy?: string[];
  attachments?: ChatTicketAttachment[];
  [key: string]: any;
}

export interface ChatTicketAttachment {
  id?: string;
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  ticketId?: string;
  ticketNo?: string;
  title?: string;
  patientName?: string;
  patientId?: string;
  nationalId?: string;
  patientAge?: string;
  patientGender?: string;
  fromDepartment?: string;
  fromRole?: string;
  fromUserName?: string;
  [key: string]: any;
}

export interface ChatTicketItem {
  id: string;
  ticketId?: string;
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent" | string;
  status?: "open" | "in_progress" | "resolved" | "closed" | string;
  assignedToRole?: SystemRole;
  assignedToUser?: string;
  createdBy?: string;
  createdAt?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  department?: string;
  [key: string]: any;
}

export interface SystemTicket {
  id: string;
  title: string;
  description: string;
  department: string;
  priority: "low" | "medium" | "high" | "critical" | string;
  status: "open" | "assigned" | "in_progress" | "resolved" | "closed" | string;
  patientId?: string;
  patientName?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  [key: string]: any;
}

export interface PatientTransfer {
  id: string;
  patientId?: string;
  patientName?: string;
  fromDepartment?: string;
  toDepartment?: string;
  fromDoctor?: string;
  toDoctor?: string;
  reason?: string;
  clinicalSummary?: string;
  vitals?: any;
  priority?: "routine" | "urgent" | "emergency" | string;
  status?: "pending" | "accepted" | "rejected" | "completed" | string;
  initiatedBy?: string;
  initiatedAt?: string;
  acceptedBy?: string;
  acceptedAt?: string;
  [key: string]: any;
}

export interface PurchaseRequisition {
  id: string;
  requisitionNumber: string;
  department: string;
  requestedBy: string;
  date: string;
  items: {
    name?: string;
    itemName?: string;
    quantity: number;
    estimatedCost?: number;
    unit?: string;
    specifications?: string;
    [key: string]: any;
  }[];
  totalEstimatedCost: number;
  status: "pending_approval" | "approved" | "rejected" | "ordered" | string;
  approvalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  [key: string]: any;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  deliveryDueDate?: string;
  items: {
    name?: string;
    itemName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    [key: string]: any;
  }[];
  subtotal: number;
  tax?: number;
  totalAmount: number;
  status: "draft" | "issued" | "partially_received" | "fulfilled" | "cancelled" | string;
  issuedBy: string;
  [key: string]: any;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  kraPin?: string;
  paymentTerms?: string;
  rating?: number;
  status: "active" | "inactive" | "blacklisted" | string;
  [key: string]: any;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  poNumber: string;
  supplierName: string;
  receivedDate: string;
  receivedBy: string;
  items: {
    name?: string;
    itemName?: string;
    orderedQty?: number;
    orderedQuantity?: number;
    receivedQty?: number;
    receivedQuantity?: number;
    unitPrice: number;
    totalPrice: number;
    batchNo?: string;
    expiryDate?: string;
    [key: string]: any;
  }[];
  totalValue: number;
  inspectionStatus: "passed" | "rejected" | "conditional" | string;
  remarks?: string;
  [key: string]: any;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  ipAddress?: string;
  device?: string;
  severity: "info" | "warning" | "critical" | string;
  details?: string;
  [key: string]: any;
}

export interface SettingsAuditLog {
  id: string;
  timestamp: string;
  changedBy: string;
  changeType: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  [key: string]: any;
}

export type AdmissionType = "Inpatient" | "Day Surgery" | "Observation" | "Emergency" | "Maternity" | string;
export type EncounterStatus = "active" | "discharged" | "transferred" | "deceased" | "cancelled" | string;

export interface WardBed {
  id: string;
  bedNumber: string;
  wardId: string;
  wardName: string;
  wardCategory: string;
  dailyRate: number;
  isOccupied: boolean;
  patientId?: string | null;
  patientName?: string | null;
  status: "available" | "occupied" | "maintenance" | "cleaning" | string;
  [key: string]: any;
}

export interface HospitalWard {
  id: string;
  name: string;
  category: "General" | "Maternity" | "Paediatric" | "Surgical" | "ICU" | "HDU" | "Amenity" | "Morgue" | string;
  totalBeds: number;
  dailyBaseRate: number;
  nurseInCharge?: string;
  description?: string;
  [key: string]: any;
}

export interface EncounterVital {
  id: string;
  bp?: string;
  temperature?: number | string;
  pulse?: number | string;
  respiratoryRate?: number | string;
  spo2?: number | string;
  recordedAt: string;
  recordedBy?: string;
  [key: string]: any;
}

export interface EncounterPrescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  status: "pending" | "dispensed" | "cancelled" | string;
  prescribedAt: string;
  prescribedBy?: string;
  [key: string]: any;
}

export interface EncounterLabRequest {
  id: string;
  testName: string;
  category?: string;
  status: "pending" | "in_progress" | "completed" | string;
  requestedAt: string;
  requestedBy?: string;
  results?: any;
  [key: string]: any;
}

export interface EncounterBillItem {
  id: string;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  total?: number;
  amount?: number;
  paid?: boolean;
  isPaid?: boolean;
  paymentMethod?: string;
  invoiceId?: string;
  addedAt?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface EncounterNursingNote {
  id: string;
  note: string;
  category?: string;
  nurseName?: string;
  timestamp: string;
  [key: string]: any;
}

export interface EncounterDoctorNote {
  id: string;
  note: string;
  doctorName?: string;
  timestamp: string;
  [key: string]: any;
}

export interface BedTransferRecord {
  id: string;
  fromWardName?: string;
  toWardName: string;
  fromBedId?: string;
  toBedId: string;
  reason?: string;
  transferredBy?: string;
  timestamp: string;
  [key: string]: any;
}

export interface DoctorDischargeClearance {
  doctorName: string;
  dischargeDate: string;
  clinicalSummary: string;
  dischargeMedications?: string;
  followUpPlan?: string;
  fitForDischarge: boolean;
  clearedAt: string;
  [key: string]: any;
}

export interface Encounter {
  id: string;
  patientId: string;
  patientName: string;
  nationalId?: string;
  phone?: string;
  age?: number | string;
  gender?: string;
  admissionType: AdmissionType;
  status: EncounterStatus;
  currentWard?: string;
  currentBedId?: string;
  admittingDoctor?: string;
  admittedAt: string;
  dischargedAt?: string;
  doctorDischargeApproved?: boolean;
  dischargeClearance?: DoctorDischargeClearance;
  vitals?: EncounterVital[];
  prescriptions?: EncounterPrescription[];
  labRequests?: EncounterLabRequest[];
  billItems?: EncounterBillItem[];
  nursingNotes?: EncounterNursingNote[];
  doctorNotes?: EncounterDoctorNote[];
  [key: string]: any;
}

export interface CashierShift {
  id: string;
  cashierId: string;
  cashierName: string;
  shiftNumber: string;
  startTime: string;
  endTime?: string;
  openingFloat: number;
  totalCashCollected: number;
  totalMpesaCollected: number;
  totalCardCollected: number;
  totalShaCollected: number;
  totalCollected: number;
  invoicesCount: number;
  status: "open" | "closed" | "reconciled" | string;
  closingNotes?: string;
  zReportGenerated?: boolean;
  [key: string]: any;
}

export interface ChartOfAccount {
  id?: string;
  accountNumber?: string;
  accountName?: string;
  name?: string;
  code?: string;
  category?: string;
  subCategory?: string;
  normalBalance?: string;
  balance?: number;
  currency?: string;
  status?: "active" | "inactive" | string;
  [key: string]: any;
}

export interface GeneralLedgerEntry {
  id: string;
  transactionDate: string;
  referenceNumber: string;
  description: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  postedBy: string;
  postedAt: string;
  [key: string]: any;
}

export interface DebtorInsuranceClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  insuranceName?: string;
  insurerName?: string;
  shaMemberNo?: string;
  invoiceId: string;
  invoiceNumber?: string;
  claimAmount?: number;
  originalAmount?: number;
  approvedAmount?: number;
  status: "draft" | "submitted" | "approved" | "remitted" | "rejected" | "disputed" | string;
  submissionDate?: string;
  claimDate?: string;
  remittanceDate?: string;
  agingDays?: number;
  agingBucket?: string;
  [key: string]: any;
}

export interface RemittanceBatch {
  id: string;
  batchNumber: string;
  payerName: string;
  totalAmount: number;
  claimsCount: number;
  receivedDate: string;
  paymentReference: string;
  status: "reconciled" | "partial" | "pending" | string;
  [key: string]: any;
}

export interface StatutoryTaxLiability {
  period: string;
  payeAmount: number;
  nssfAmount: number;
  nhifAmount: number;
  housingLevyAmount: number;
  totalPayable: number;
  dueDate: string;
  status: "pending" | "filed" | "paid" | string;
  krapin?: string;
  [key: string]: any;
}

export interface SupplierPayableInvoice {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  grnNumber: string;
  supplierName: string;
  invoiceAmount: number;
  dueDate: string;
  matchStatus?: "matched" | "variance" | "pending" | string;
  paymentStatus?: "unpaid" | "approved_for_payment" | "paid" | string;
  [key: string]: any;
}

export interface PaymentVoucher {
  id: string;
  voucherNumber?: string;
  payee?: string;
  amount?: number;
  date?: string;
  description?: string;
  paymentMethod?: string;
  approvedBy?: string;
  status?: "draft" | "approved" | "paid" | string;
  [key: string]: any;
}

export interface ProcedureTariffItem {
  id: string;
  code: string;
  name: string;
  category: string;
  standardAmount: number;
  shaReimbursementAmount?: number;
  department: string;
  isCoveredBySha?: boolean;
  status?: "active" | "inactive" | string;
  isActive?: boolean;
  [key: string]: any;
}

export interface WardBedRateSetting {
  id: string;
  wardCategory?: string;
  category?: string;
  wardId?: string;
  wardName?: string;
  dailyRate: number;
  nursingDailyFee?: number;
  fileOpeningFee?: number;
  description?: string;
  [key: string]: any;
}

export interface PatientCartItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  waived?: boolean;
  waiverReason?: string;
  department?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface PatientCart {
  id: string;
  patientId: string;
  patientName?: string;
  nationalId?: string;
  items: PatientCartItem[];
  subtotal: number;
  status: "active" | "cleared" | "invoiced" | string;
  updatedAt?: string;
  [key: string]: any;
}

export interface BillItemDraft {
  id?: string;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  totalPrice?: number;
  category?: string;
  department?: string;
  sourceType?: string;
  sourceId?: string;
  notes?: string;
  drugDosage?: string;
  durationDays?: number;
  addedAt?: string;
  [key: string]: any;
}

export interface ProblemItem {
  id: string;
  patientId?: string;
  code: string; // KNHTS / ICD-10 Code
  name: string;
  category?: string;
  onsetDate?: string;
  status: "active" | "chronic" | "resolved" | "inactive";
  severity?: "mild" | "moderate" | "severe";
  notes?: string;
  recordedBy?: string;
  recordedAt?: string;
  resolvedAt?: string;
  updatedAt?: string;
}

export interface AllergyRecord {
  id: string;
  patientId?: string;
  allergen: string;
  category: "drug" | "food" | "environmental" | "other";
  reaction: string;
  severity: "mild" | "moderate" | "severe_anaphylaxis";
  hptDrugClass?: string; // e.g. Penicillins, Sulphonamides, NSAIDs, Cephalosporins
  onsetDate?: string;
  recordedAt?: string;
  recordedBy?: string;
  status?: "active" | "resolved";
}

export interface FamilyHistoryRecord {
  id: string;
  patientId?: string;
  relationship: "Father" | "Mother" | "Sibling" | "Grandparent" | "Other";
  condition: string;
  icd10Code?: string;
  notes?: string;
  ageAtOnset?: number;
  recordedAt?: string;
}

export interface CpoeMultidisciplinaryOrder {
  id: string;
  patientId: string;
  ticketNo?: string;
  patientName?: string;
  discipline: "physiotherapy" | "occupational_therapy" | "nutrition_dietetics" | "social_work" | "counselling" | "radiology" | "laboratory";
  targetService: string;
  frequencyOrSessions?: string;
  clinicalIndication: string;
  therapeuticGoals?: string;
  dietType?: string; // for nutrition/dietetics
  mobilityOrAffectedArea?: string; // for physio & occupational therapy
  orderedBy: string;
  orderedAt: string;
  status: "ordered" | "in_progress" | "completed" | "cancelled";
  completedAt?: string;
  notes?: string;
}

export interface MchEncounterRecord {
  id: string;
  patientId: string;
  patientName?: string;
  encounterType: "ANC" | "PNC" | "CWC_Immunization";
  visitNumber: number;
  gestationWeeks?: number;
  gravida?: number;
  parity?: number;
  fundalHeightCm?: number;
  fetalHeartRateBpm?: number;
  fetalPresentation?: string;
  tetanusToxoidDose?: string;
  ifasSupplementsGiven?: boolean;
  childWeightKg?: number;
  childHeightCm?: number;
  immunizationGiven?: string[]; // e.g., BCG, OPV, Pentavalent, PCV10, Rota, Measles-Rubella
  dewormingGiven?: boolean;
  vitaminAGiven?: boolean;
  counselingTopics?: string[];
  nextAppointmentDate?: string;
  doctorOrNurseName?: string;
  notes?: string;
  date: string;
}

export interface QualityMeasureRecord {
  id: string;
  measureId: string; // e.g. QM-HYP-01, QM-MAL-02, QM-MCH-03, QM-IMM-04, QM-DM-05
  name: string;
  category: "Maternal & Child Health" | "Communicable Diseases" | "Non-Communicable Diseases" | "Clinical Safety";
  mohCode: string; // e.g. MOH 705 / 711
  numerator: number;
  denominator: number;
  ratePercentage: number;
  targetThreshold: number;
  period: string; // e.g. 2026-Q3
  status: "compliant" | "sub-optimal" | "critical";
  calculatedAt: string;
  exportFormat?: "DHIS2-JSON" | "MOH-CSV" | "FHIR-MeasureReport";
  dhis2DataElementId?: string;
}

export interface GrowthChartMeasurement {
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  gender: "Male" | "Female" | string;
  wfaZScore?: number; // Weight-for-Age Z-score
  wfaPercentile?: number;
  hfaZScore?: number; // Height-for-Age Z-score
  hfaPercentile?: number;
  bmiZScore?: number; // BMI-for-Age Z-score
  bmiPercentile?: number;
  classification: "Severely Wasted" | "Underweight" | "Normal / Healthy" | "Overweight" | "Obese";
}


// NextGen HMS Shared TypeScript Types

export interface Tenant {
  id: string;
  name: string;
  type: "clinic" | "hospital_level_4" | "hospital_level_5";
  county: string;
}

export interface DepartmentToggles {
  reception: boolean;
  queue: boolean;
  doctor: boolean;
  pharmacy: boolean;
  laboratory: boolean;
  radiology: boolean;
  billing: boolean;
}

export interface QueueTicket {
  id: string;
  ticketNo: string; // e.g., GEN-002, LAB-045, RAD-012, PHA-089
  patientName: string;
  patientId?: string;
  nationalId: string;
  biometricStatus: "verified" | "not_verified";
  service: string; // e.g., "General Doctor", "Laboratory", "Pharmacy", "Radiology"
  currentDepartment: "reception" | "queue" | "doctor" | "laboratory" | "radiology" | "pharmacy" | "billing" | "labour_room" | "gyna" | "inpatient_ward" | string;
  status: "pending" | "serving" | "completed" | "skipped";
  notes?: string;
  timestamp: string;
  phone?: string;
  age?: number;
  gender?: string;
  issue?: string;
  assignedSpecialistId?: string;
  assignedSpecialistName?: string;
  specialistTitle?: string;
  consultationRoom?: string;
  targetDepartment?: string;
  targetClinic?: string;
  allergies?: string;
  chronicConditions?: string;
  vitals?: {
    temp?: string;
    bp?: string;
    pulse?: string;
    respRate?: string;
    spo2?: string;
    rbs?: string;
    weight?: string;
    height?: string;
    bmi?: string;
    painScale?: string;
    [key: string]: any;
  };
  triageScore?: "GREEN" | "YELLOW" | "RED" | string;
  triageCompletedAt?: string;
  // Modern Kenyan Journey Extensions
  isResultsReview?: boolean;
  resultsReady?: boolean;
  labSummary?: string;
  originDoctorName?: string;
  encounterId?: string;
  mohCategory?: "MOH 705A (Under 5)" | "MOH 705B (Over 5)" | string;
  billingStatus?: "PAY_BEFORE_SERVICE" | "RENDER_THEN_CLAIM" | "PAID" | "PENDING";
  paymentMode?: "Cash" | "M-PESA" | "SHA/NHIF" | "Insurance" | "Split";
  gatePassIssued?: boolean;
  gatePassCode?: string;
  gatePassTimestamp?: string;
  admissionRequired?: boolean;
  assignedWardName?: string;
  assignedBedNumber?: string;
  requestedTests?: string[];
  labTestsOrdered?: string[];
  labPriority?: "routine" | "urgent" | "stat";
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  brandLabel?: string;
  formulation?: string;
  strength?: string;
  category: string;
  quantity: number;
  minThreshold: number;
  batchNo: string;
  expiryDate: string; // YYYY-MM-DD
  price: number;
  imageUrl?: string;
}

export interface PrescriptionItem {
  drugName: string;
  quantity: number;
  dosage: string;
  instructions: string;
  status: "pending" | "dispensed";
  medicationId?: string;
  unitPrice?: number;
  totalPrice?: number;
  formulation?: string;
  strength?: string;
  pricedBy?: "doctor" | "pharmacist" | "default";
}

export interface MedicalRecord {
  id: string;
  patientName: string;
  name?: string; // Compatibility alias
  patientNumber?: string;
  insuranceScheme?: string;
  nationalId: string;
  phone: string;
  age: number;
  gender: string;
  bloodType: string;
  shaEligible: "eligible" | "not_eligible" | "unchecked";
  shaId?: string;
  visits: ClinicalVisit[];
  latestVitals?: {
    temp?: string;
    bp?: string;
    pulse?: string;
    weight?: string;
    height?: string;
    respRate?: string;
    spo2?: string;
    rbs?: string;
    bmi?: string;
    recordedAt?: string;
    recordedBy?: string;
    triageScore?: string;
    notes?: string;
  };
  latestDiagnosis?: string;
  latestSymptoms?: string;
  currentDepartment?: string;
  activeTicketNo?: string;
  activeEncounterId?: string;
  chronicConditions?: string;
  allergies?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicalVisit {
  id: string;
  date: string;
  doctor?: string;
  doctorName?: string;
  vitals: {
    temp: string; // °C
    bp: string; // mmHg e.g. 120/80
    pulse: string; // bpm
    weight: string; // kg
  };
  symptoms: string;
  diagnosis: string;
  mohCategory?: "MOH 705A (Under 5)" | "MOH 705B (Over 5)" | string;
  icd10Code?: string;
  icd10Title?: string;
  encounterId?: string;
  allergies?: string;
  admittedToWard?: string;
  prescriptions: PrescriptionItem[];
    referrals: {
      id: string;
      department: "laboratory" | "radiology" | "labour_room" | "gyna" | string;
      testName: string;
      notes: string;
      status: "pending" | "completed";
      results?: string;
    }[];
}

export interface SplitBilling {
  sha: number;
  insurance: number;
  outOfPocket: number;
  insuranceCoveredAmount?: number;
  copayAmount?: number;
  copayPaymentMethod?: "Cash" | "M-PESA" | "Card" | "Credit Card" | "Debit Card" | string;
  insuranceProvider?: string;
  policyNumber?: string;
  cardMemberNumber?: string;
  preAuthCode?: string;
  copayMpesaReceiptNumber?: string;
  cashTendered?: number;
  cashChange?: number;
  notes?: string;
}

// -------------------------------------------------------------
// ADMISSION-TO-DISCHARGE PARENT & SUBCOLLECTION ENCOUNTER TYPES
// -------------------------------------------------------------

export type EncounterStatus =
  | "REGISTERED"
  | "TRIAGE"
  | "DOCTOR_CONSULT"
  | "ADMITTED"
  | "DISCHARGING"
  | "DISCHARGED"
  | "MORGUE"
  | "DECEASED";

export type AdmissionType =
  | "OUTPATIENT"
  | "INPATIENT"
  | "EMERGENCY"
  | "DAY_SURGERY"
  | "MATERNITY";

export interface MorgueAdmissionRecord {
  id: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  nationalId: string;
  age?: number;
  gender?: string;
  fromWardId?: string;
  fromWardName: string;
  fromBedNumber?: string;
  timeOfDeath: string;
  certifiedByDoctor: string;
  doctorLicenseNo?: string;
  causeOfDeathImmediate: string;
  causeOfDeathUnderlying?: string;
  mohDeathNoticeNo?: string; // MOH 214 Death Notification No
  admittedToMorgueAt: string;
  morgueUnitName: string; // e.g. "Hospital Mortuary & Cold Room A", "Cabinet C-04"
  cabinetOrBayNumber: string; // e.g. "Bay 04", "Cabinet 12"
  morgueAttendantName: string;
  nurseHandoverName: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  belongingsInventory?: string;
  tagsVerified: boolean;
  notes?: string;
}

export interface BedTransferRecord {
  id: string;
  fromWardId?: string;
  fromWardName: string;
  fromBedId?: string;
  fromBedNumber: string;
  toWardId: string;
  toWardName: string;
  toBedId: string;
  toBedNumber: string;
  transferredAt: string;
  transferredBy: string;
  reason?: string;
  dailyRate: number;
  daysSpent?: number;
  accumulatedCost?: number;
}

export interface DoctorDischargeClearance {
  cleared: boolean;
  doctorName: string;
  doctorId?: string;
  clearedAt: string;
  dischargeCondition: "Recovered" | "Improved / Stable for Home Care" | "Transferred / Referred" | "Against Medical Advice (DAMA)" | "Deceased";
  clinicalSummary: string;
  dischargeMedications?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  doctorSignature?: string;
}

export interface Encounter {
  id: string; // e.g. "ENC-2026-001" or Firestore ID
  patientId: string;
  patientName: string;
  nationalId: string;
  phone?: string;
  age?: number;
  gender?: string;
  bloodType?: string;
  status: EncounterStatus;
  admissionType: AdmissionType;
  assignedWard?: string;
  assignedWardId?: string;
  assignedBed?: string;
  assignedBedId?: string;
  admittedAt?: string;
  dischargedAt?: string | null;
  dischargedBy?: string;
  dischargeReason?: string;
  dischargeNotes?: string;
  doctorDischargeApproved?: boolean;
  doctorDischargeApprovedBy?: string;
  doctorDischargeApprovedAt?: string;
  doctorClearance?: DoctorDischargeClearance;
  bedTransfers?: BedTransferRecord[];
  morgueAdmission?: MorgueAdmissionRecord;
  morgueTransferredAt?: string;
  billingCleared: boolean;
  totalBilled: number;
  totalPaid: number;
  pendingLabOrders: number;
  pendingPrescriptions: number;
  latestDiagnosis?: string;
  latestSymptoms?: string;
  attendingDoctorName?: string;
  attendingDoctorId?: string;
  activeQueueTicketId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterVital {
  id: string;
  temp: string; // °C
  bp: string; // e.g. 120/80
  pulse: string; // bpm
  weight: string; // kg
  spo2?: string; // %
  respiratoryRate?: string; // /min
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

export interface EncounterPrescription {
  id: string;
  drugName: string;
  quantity: number;
  dosage: string;
  instructions: string;
  unitPrice: number;
  totalPrice: number;
  status: "pending" | "dispensed" | "cancelled";
  prescribedBy: string;
  dispensedBy?: string;
  dispensedAt?: string;
  createdAt: string;
}

export interface EncounterLabRequest {
  id: string;
  testName: string;
  department: "laboratory" | "radiology" | "labour_room" | "gyna" | string;
  sampleType?: string;
  notes?: string;
  unitPrice: number;
  status: "pending" | "sample_collected" | "processing" | "completed" | "cancelled";
  results?: string;
  abnormalFlags?: string;
  orderedBy: string;
  performedBy?: string;
  completedAt?: string;
  createdAt: string;
}

export interface EncounterBillItem {
  id: string;
  description: string;
  category: "consultation" | "pharmacy" | "laboratory" | "radiology" | "ward_bed" | "nursing" | "procedure" | "other";
  unitPrice: number;
  quantity: number;
  total: number;
  isPaid: boolean;
  paidAt?: string;
  paymentMethod?: string;
  invoiceId?: string;
  timestamp: string;
}

export interface EncounterNursingNote {
  id: string;
  note: string;
  shift: "Morning" | "Afternoon" | "Night";
  nurseName: string;
  nurseId?: string;
  timestamp: string;
}

export interface EncounterDoctorNote {
  id: string;
  category?: "Ward Round Review" | "Treatment Plan" | "Specialist Consultation" | "Clinical Progress" | "Procedure / Intervention" | "Emergency Assessment" | "General" | string;
  note: string;
  doctorName: string;
  doctorId?: string;
  doctorKmpdc?: string;
  clinicalPlan?: string;
  orders?: string;
  timestamp: string;
}

export interface WardBed {
  id: string;
  bedNumber: string; // e.g. "Bed-1", "Bed-2"
  wardId: string;
  wardName: string; // e.g. "Male Medical Ward", "Female Surgical Ward", "Maternity & Labour Ward", "Pediatric Ward", "ICU / HDU"
  category: "General" | "Semi-Private" | "Private" | "ICU" | "Maternity";
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "CLEANING";
  dailyRate: number; // KES e.g. 1500, 3500, 8000
  currentPatientId?: string | null;
  currentPatientName?: string | null;
  currentEncounterId?: string | null;
  occupiedSince?: string | null;
}

export interface HospitalWard {
  id: string;
  name: string;
  code: string;
  floor: string;
  category: string;
  totalBeds: number;
  dailyBaseRate: number;
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  nationalId: string;
  items: {
    description: string;
    amount: number;
    department: string;
  }[];
  total: number;
  split: SplitBilling;
  paymentMethod: "Cash" | "M-PESA" | "SHA/NHIF" | "Insurance" | "Split" | "Insurance + Copay" | "Card" | string;
  paymentStatus: "unpaid" | "pending_mpesa" | "paid";
  mpesaCheckoutId?: string;
  mpesaReceiptNumber?: string;
  transactionRef?: string;
  kraCompliantInvoiceNo?: string;
  shaClaimId?: string;
  timestamp: string;
  encounterId?: string;
  paidAt?: string;
  paidAmount?: number;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: "supplies" | "salaries" | "utilities" | "equipment" | "rent" | "other";
  date: string;
  supplier?: string;
}

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
  | "Billing & Accounts";

export interface SystemUserAccount {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  department: string;
  phone?: string;
  nationalId?: string;
  photoURL?: string;
  avatarUrl?: string;
  pin?: string;
  password?: string;
  status: "active" | "inactive" | "suspended";
  createdDate: string;
  createdBy?: string;
  lastLogin?: string;
}

export interface Employee {
  id: string;
  name: string;
  nationalId: string;
  role: SystemRole | string;
  department: string; // e.g. "medical", "pharmacy", "finance", "hr", "security", "nursing", "administration", "procurement", "laboratory", "billing"
  specialty?: string; // e.g. "Gynecology", "Dentistry", "Laboratory Medicine", "Radiology", "General Practice"
  salary: number; // Base salary in KES
  phone: string;
  email: string;
  photoURL?: string;
  avatarUrl?: string;
  pin?: string;
  password?: string;
  signatureUrl?: string;
  status: "active" | "on_leave" | "terminated";
  hireDate: string;
  accessLevel?: "Super Admin" | "Department Admin" | "Standard Staff";
  systemRole?: SystemRole;
  lastLogin?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g., "July 2026"
  baseSalary: number;
  allowances: number;
  deductions: {
    shif: number; // Social Health Insurance Fund (2.75% standard in Kenya)
    paye: number; // KRA PAYE tax
    housingLevy: number; // Affordable Housing Levy (1.5% employee share)
    nssf: number; // National Social Security Fund (standard pension contribution)
    other: number;
  };
  netPay: number;
  paymentStatus: "paid" | "pending";
  paidDate?: string;
}

export interface SecurityLog {
  id: string;
  type: "individual" | "vehicle";
  nameOrPlate: string; // Name for individual, License plate for vehicle
  entityType: "staff" | "patient" | "visitor" | "contractor" | "delivery" | "other";
  direction: "entry" | "exit";
  checkpoint: string; // "Main Gate", "Reception Desk", "Emergency Gate", "Staff Gate"
  idOrPhone?: string; // National ID / Passport or phone number
  nationalId?: string;
  patientName?: string;
  phone?: string;
  timestamp: string;
  status: "authorized" | "flagged" | "denied";
  notes?: string;
  officerName: string;
  receptionStatus?: "pending" | "retrieved" | "registered";
  receptionTicketNo?: string;
}

export interface SystemTicket {
  id: string;
  ticketNumber: string; // e.g. TCK-8492
  patientId?: string;
  patientName: string;
  nationalId: string;
  phone?: string;
  visitReason: string;
  department: string;
  priority: "Normal" | "Urgent" | "Emergency";
  status: "open" | "in_progress" | "closed" | "cancelled";
  createdTime: string;
  closedTime?: string;
  closedBy?: string;
  resolutionNotes?: string;
  autoGenerated: boolean;
  assignedSpecialistId?: string;
  assignedSpecialistName?: string;
  specialistTitle?: string;
  consultationRoom?: string;
}

export interface Supplier {
  id: string;
  name: string;
  kraPin: string;
  category: "Pharmaceuticals" | "Medical Consumables" | "Laboratory Reagents" | "Radiology Equipment" | "General Supplies";
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: "active" | "under_review" | "blacklisted";
  rating: number; // 1 to 5
}

export interface PurchaseRequisition {
  id: string;
  requisitionNo: string; // e.g., REQ-2026-081
  department: string;
  requestedBy: string;
  items: {
    itemName: string;
    category: string;
    quantity: number;
    estimatedCost: number;
  }[];
  totalEstimatedCost: number;
  priority: "Low" | "Medium" | "High" | "Emergency";
  status: "pending_approval" | "approved" | "rejected" | "ordered";
  requestDate: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g., LPO-2026-402
  requisitionId?: string;
  supplierId: string;
  supplierName: string;
  supplierPin: string;
  department: string;
  items: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: "draft" | "issued" | "partially_fulfilled" | "completed" | "cancelled";
  createdDate: string;
  deliveryDueDate: string;
  paymentTerms: string; // e.g., "Net 30 Days", "Cash On Delivery"
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string; // e.g., GRN-2026-109
  poNumber: string;
  supplierName: string;
  receivedDate: string;
  receivedBy: string;
  items: {
    itemName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    batchNo: string;
    expiryDate: string;
    unitPrice: number;
    total: number;
    passInspection: boolean;
  }[];
  notes?: string;
  inventoryUpdated: boolean;
}

export interface ChatTicketItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  department?: string;
}

export interface ChatTicketAttachment {
  ticketId: string;
  ticketNo: string; // e.g. "INV-4821", "QUO-9201", "TRF-3810", "ORD-1029"
  type: "invoice" | "pre_quote" | "patient_transfer" | "service_order" | "clinical_handover";
  title: string;
  patientName?: string;
  patientId?: string;
  nationalId?: string;
  patientAge?: number | string;
  patientGender?: string;
  fromDepartment?: string;
  fromRole?: string;
  fromUserName?: string;
  toDepartment?: string;
  toRole?: string;
  toSpecialistName?: string;
  toUserName?: string;
  // Invoice / Pre-Quote Financial details
  items?: ChatTicketItem[];
  subtotal?: number;
  taxOrDiscount?: number;
  totalAmount?: number;
  currency?: string; // "KES"
  paymentMethod?: "Cash" | "M-PESA" | "SHA/NHIF" | "Insurance" | "Split";
  paymentStatus?: "unpaid" | "pending_mpesa" | "paid";
  mpesaPhone?: string;
  validUntil?: string; // e.g. "14 Days" for pre-quotes
  depositRequired?: number;
  // Clinical / Transfer details
  symptoms?: string;
  provisionalDiagnosis?: string;
  clinicalNotes?: string;
  vitals?: {
    temp?: string;
    bp?: string;
    pulse?: string;
    weight?: string;
  };
  urgency?: "Routine" | "Urgent" | "STAT Emergency";
  status: "pending" | "accepted" | "invoiced" | "paid" | "completed" | "declined" | "on_hold";
  statusUpdatedBy?: string;
  statusUpdatedAt?: string;
  actionNotes?: string;
  linkedTransferDocId?: string;
  linkedInvoiceId?: string;
  createdAt?: string;
  createdBy?: string;
  createdRole?: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: SystemRole | string;
  senderAvatar?: string;
  targetType: "role" | "department" | "all" | "direct";
  targetRole?: SystemRole | string;
  targetDepartment?: string;
  targetUserId?: string;
  targetUserName?: string;
  channelId?: string; // e.g. "general", "doctors", "pharmacy", "lab", "nursing", "emergency"
  subject: string;
  message: string;
  priority: "normal" | "urgent" | "stat_emergency";
  category: "clinical_handover" | "general" | "stat_alert" | "pharmacy_query" | "lab_result" | "security" | "referral_notice" | "invoice_ticket" | "pre_quote_estimate" | "patient_transfer" | "service_order";
  relatedPatientId?: string;
  relatedPatientName?: string;
  relatedTicketNo?: string;
  ticketAttachment?: ChatTicketAttachment;
  readBy: string[]; // IDs or emails or roles that have read it
  timestamp: string; // ISO 8601
}

export interface PatientTransfer {
  id: string;
  ticketId: string;
  ticketNo: string;
  patientId?: string;
  patientName: string;
  nationalId: string;
  age?: number;
  phone?: string;
  gender?: string;
  fromDepartment: string;
  fromUnitName: string;
  referredByDoctorName: string;
  referredByEmail?: string;
  toDepartment: string; // e.g. "doctor", "cardiology", "surgery", "laboratory", "radiology", "gyna", "labour_room", "pharmacy", "inpatient", "icu", "emergency"
  toSpecialistId?: string;
  toSpecialistName?: string;
  toSpecialistTitle?: string;
  reasonForTransfer: string;
  clinicalSummary: string;
  priority: "Routine" | "Urgent" | "STAT Emergency";
  vitalsSummary?: {
    temp?: string;
    bp?: string;
    pulse?: string;
    weight?: string;
  };
  status: "pending" | "accepted" | "declined" | "on_hold";
  actionBy?: string;
  actionByRole?: string;
  actionTimestamp?: string;
  actionNotes?: string;
  holdReason?: string;
  declineReason?: string;
  assignedRoomOrBed?: string;
  timestamp: string;
}

export interface SettingsAuditLog {
  id: string;
  timestamp: string;
  changedBy: string;
  userEmail: string;
  userRole: string;
  changeType: "KRA_PIN_MODIFIED" | "LICENSE_NO_MODIFIED" | "HOSPITAL_NAME_CHANGED" | "FACILITY_TIER_CHANGED" | "LEGAL_DETAILS_UPDATED" | "SYSTEM_SECURITY_CONFIG";
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason?: string;
  ipAddress?: string;
}

export interface MpesaTransactionRecord {
  id: string;
  checkoutRequestId: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
  phoneNumber: string;
  amount: number;
  invoiceId?: string;
  patientName?: string;
  status: "Pending" | "Success" | "Failed" | "Cancelled";
  resultDesc?: string;
  initiatedAt: string;
  completedAt?: string;
  reconciled: boolean;
}

export interface ProcedureTariffItem {
  id: string;
  code: string;
  name: string;
  category: "consultation" | "pharmacy" | "laboratory" | "radiology" | "ward_bed" | "nursing" | "procedure" | "surgery" | "other";
  department: string;
  standardAmount: number;
  description?: string;
  isTaxable?: boolean;
  isActive: boolean;
  updatedAt?: string;
}

export interface WardBedRateSetting {
  id: string;
  wardId: string;
  wardName: string;
  category: string;
  dailyRate: number;
  nursingDailyFee?: number;
  fileOpeningFee?: number;
  updatedAt?: string;
}

export interface BillItemDraft {
  id: string;
  sourceId?: string;
  sourceType: "prescription" | "lab_order" | "bed_stay" | "consultation" | "procedure" | "tariff" | "custom";
  description: string;
  category: "consultation" | "pharmacy" | "laboratory" | "radiology" | "ward_bed" | "nursing" | "procedure" | "surgery" | "other";
  department: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes?: string;
  drugDosage?: string;
  durationDays?: number;
  addedAt: string;
}

export interface PatientCartItem {
  id: string;
  patientId: string;
  patientName: string;
  ticketNo?: string;
  encounterId?: string;
  stage: "Registration & Triage" | "Doctor Consultation" | "Laboratory Diagnostics" | "Radiology & Imaging" | "Pharmacy Dispensing" | "Nursing & Consumables" | "Ward & Inpatient Bed" | "Surgical & Theatre" | string;
  department: string;
  category: "consultation" | "pharmacy" | "laboratory" | "radiology" | "ward_bed" | "nursing" | "procedure" | "surgery" | "supplies" | "other";
  itemCode?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  notes?: string;
  addedBy: string;
  addedByRole?: string;
  addedAt: string;
  status: "pending_checkout" | "checked_out" | "waived" | "cancelled";
}

export interface PatientCart {
  id: string; // cart-${patientId}
  patientId: string;
  patientName: string;
  nationalId: string;
  phone?: string;
  activeTicketNo?: string;
  encounterId?: string;
  items: PatientCartItem[];
  totalAmount: number;
  itemCount: number;
  status: "active" | "checked_out" | "closed";
  lastAddedStage?: string;
  createdAt: string;
  updatedAt: string;
  checkedOutAt?: string;
  checkedOutBy?: string;
  finalInvoiceId?: string;
}

// ==========================================
// ACCOUNTING & FINANCIAL OPERATIONS TYPES
// ==========================================

export interface CashierShift {
  id: string;
  shiftNumber: string; // e.g. SHF-20260903-01
  cashierId: string;
  cashierName: string;
  stationName: string; // e.g. "Main OPD Cashier Desk 1", "Pharmacy POS Till"
  startTime: string;
  endTime?: string;
  status: "open" | "reconciled" | "closed";
  openingFloat: number;
  expectedCash: number;
  countedCash: number;
  cashVariance: number;
  expectedMpesa: number;
  declaredMpesa: number;
  mpesaVariance: number;
  expectedCard: number;
  declaredCard: number;
  totalExpected: number;
  totalDeclared: number;
  totalVariance: number;
  invoicesCount: number;
  zReportNumber?: string;
  reconciliationNotes?: string;
  supervisorSignedBy?: string;
  supervisorSignedAt?: string;
  createdAt: string;
}

export interface DebtorInsuranceClaim {
  id: string;
  claimNumber: string; // e.g. CLM-SHA-2026-091
  invoiceId: string;
  patientId: string;
  patientName: string;
  nationalId: string;
  shaNumber?: string;
  insurerName: "Social Health Authority (SHA)" | "Jubilee Insurance" | "Britam Insurance" | "CIC General Insurance" | "AAR Health Services" | "Madison Insurance" | "First Assurance" | "Corporate Direct" | string;
  schemeType: "SHA / NHIF Public" | "Comprehensive Corporate" | "Standard Inpatient/OPD" | "Managed Care";
  claimDate: string;
  originalAmount: number;
  approvedAmount: number;
  copayAmount: number;
  paidAmount: number;
  disallowedAmount: number;
  disallowanceReason?: string;
  balance: number;
  status: "Submitted" | "Vetted" | "Approved" | "Remitted" | "Disallowed" | "Under Review";
  agingDays: number;
  agingBucket: "0-30 Days" | "31-60 Days" | "61-90 Days" | "90+ Days";
  remittanceBatchNo?: string;
  preAuthCode?: string;
  icd10Code?: string;
}

export interface RemittanceBatch {
  id: string;
  batchNumber: string; // e.g. REM-2026-W36-JUB
  insurerName: string;
  remittanceDate: string;
  bankReference: string;
  paymentMethod: "EFT / Bank Transfer" | "Cheque" | "RTGS";
  totalRemittedAmount: number;
  allocatedAmount: number;
  disallowedAmount: number;
  unallocatedAmount: number;
  claimsCount: number;
  status: "Allocated" | "Partially Allocated" | "Draft";
  processedBy: string;
  notes?: string;
}

export interface SupplierPayableInvoice {
  id: string;
  invoiceNumber: string; // e.g. INV-MEDS-8841
  supplierId: string;
  supplierName: string;
  supplierKraPin: string;
  poNumber?: string; // Matching LPO
  grnNumber?: string; // Matching GRN
  invoiceDate: string;
  dueDate: string;
  category: "Pharmaceuticals" | "Medical Consumables" | "Laboratory Reagents" | "Radiology Equipment" | "General Hospital Supplies" | "Utilities & Services";
  items: {
    itemName: string;
    orderedQty?: number;
    receivedQty?: number;
    billedQty: number;
    unitPrice: number;
    total: number;
    varianceFlag?: boolean;
    varianceNote?: string;
  }[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  matchStatus: "3-Way Matched" | "Variance Flagged" | "Pending GRN" | "Direct Overhead";
  paymentStatus: "Unpaid" | "Partially Paid" | "Paid" | "On Hold";
  paymentVoucherNo?: string;
  paymentMethod?: "EFT" | "Cheque" | "M-PESA Paybill B2B" | "Cash";
  paymentReference?: string;
  notes?: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string; // e.g. PV-2026-0428
  supplierInvoiceId: string;
  supplierName: string;
  supplierKraPin: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "EFT" | "Cheque" | "M-PESA B2B" | "Cash";
  referenceNumber: string;
  bankAccount: string;
  withholdingTaxAmount: number; // 5% WHT where applicable
  netPaidAmount: number;
  preparedBy: string;
  approvedBy: string;
  status: "Approved & Disbursed" | "Pending Approval" | "Cancelled";
}

export interface ChartOfAccount {
  code: string;
  name: string;
  category: "Asset" | "Liability" | "Equity" | "Revenue" | "Cost of Sales" | "Operating Expense";
  subCategory: string;
  balance: number;
  normalBalance: "Debit" | "Credit";
}

export interface GeneralLedgerEntry {
  id: string;
  entryNumber: string; // e.g. JRN-2026-1049
  date: string;
  sourceModule: "Patient Billing" | "Pharmacy POS" | "Procurement & AP" | "Payroll & Staff" | "Cashier Shift Closeout" | "Manual Adjustment";
  referenceNumber: string;
  description: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  amount: number;
  postedBy: string;
  timestamp: string;
}

export interface StatutoryTaxLiability {
  periodMonth: string; // e.g. "August 2026"
  dueDate: string; // e.g. "9th September 2026"
  payeAmount: number;
  shifAmount: number;
  nssfAmount: number;
  housingLevyAmount: number;
  withholdingTaxAmount: number;
  totalStatutoryDue: number;
  status: "Pending Remittance" | "Paid & Cleared" | "Overdue";
  kraReceiptNo?: string;
  remittedDate?: string;
}

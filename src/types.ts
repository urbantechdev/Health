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
  nationalId: string;
  biometricStatus: "verified" | "not_verified";
  service: string; // e.g., "General Doctor", "Laboratory", "Pharmacy", "Radiology"
  currentDepartment: "reception" | "queue" | "doctor" | "laboratory" | "radiology" | "pharmacy" | "billing" | "labour_room" | "gyna" | string;
  status: "pending" | "serving" | "completed" | "skipped";
  notes?: string;
  timestamp: string;
  phone?: string;
  age?: number;
  issue?: string;
  assignedSpecialistId?: string;
  assignedSpecialistName?: string;
  specialistTitle?: string;
  consultationRoom?: string;
}

export interface Medication {
  id: string;
  name: string;
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
}

export interface MedicalRecord {
  id: string;
  patientName: string;
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
    recordedAt?: string;
  };
  latestDiagnosis?: string;
  latestSymptoms?: string;
  currentDepartment?: string;
  activeTicketNo?: string;
  allergies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicalVisit {
  id: string;
  date: string;
  vitals: {
    temp: string; // °C
    bp: string; // mmHg e.g. 120/80
    pulse: string; // bpm
    weight: string; // kg
  };
  symptoms: string;
  diagnosis: string;
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
  paymentMethod: "Cash" | "M-PESA" | "SHA/NHIF" | "Insurance";
  paymentStatus: "unpaid" | "pending_mpesa" | "paid";
  mpesaCheckoutId?: string;
  kraCompliantInvoiceNo?: string;
  shaClaimId?: string;
  timestamp: string;
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
  timestamp: string;
  status: "authorized" | "flagged" | "denied";
  notes?: string;
  officerName: string;
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




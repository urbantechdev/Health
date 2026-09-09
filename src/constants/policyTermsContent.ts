export interface PolicyClause {
  id: string;
  section: string;
  title: string;
  summary: string;
  fullText: string;
  legalReference?: string;
  tags: string[];
}

export const REGULATORY_DIRECTORY = {
  effectiveDate: "01-Jan-2026",
  hospitalName: "The Tassia Hill Hospital",
  odpcRegistrationNumber: "ODPC/CR/2026/00482",
  dpoName: "Dr. Evans Kiprotich (Chief Medical Compliance Officer)",
  dpoEmail: "dpo@tassiahillhospital.co.ke",
  postalAddress: "P.O. Box 48201-00100, Fedha-Tassia Road, Embakasi East, Nairobi",
  dpoHotline: "+254 722 000 482 / Ext 104",
  odpcNationalOffice: "Britam Tower, 12th Floor, Upper Hill, Nairobi, Kenya",
  odpcWebsite: "https://www.odpc.go.ke",
  dhaFacilityCode: "DHA-FAC-NRB-08842",
  kmhflCode: "KMHFL-22814"
};

export const DATA_PROTECTION_CLAUSES: PolicyClause[] = [
  {
    id: "kdpa-sec44-sensitive",
    section: "KDPA SECTION 44 & 45",
    title: "Processing of Health & Biometric Data as Sensitive Personal Data",
    summary: "Mandatory statutory conditions for processing patient records, lab results, and biometric hashes.",
    fullText: `1. In accordance with Section 44 and 45 of the Kenya Data Protection Act 2019, patient health data, clinical observations, diagnostic findings, prescriptions, and biometric templates constitute 'Sensitive Personal Data'.
2. Such data shall only be processed by or under the responsibility of a health care provider subject to statutory professional confidentiality (KMPDC, NCK, PPB, COC, KMLTTB).
3. Biometric identifiers captured at Tassia Hill Hospital (fingerprint templates, facial geometry) are encrypted using one-way SHA-256 salted hashes and stored strictly for patient identification and SHA/KDHA fraud prevention. Raw biometric images are never retained on unencrypted local storage.`,
    legalReference: "Kenya Data Protection Act 2019, Section 44, 45 & 46",
    tags: ["kdpa", "sensitive data", "biometrics", "kmpdc", "privacy"]
  },
  {
    id: "kdpa-sec25-principles",
    section: "KDPA SECTION 25 & 26",
    title: "Principles of Data Protection & Patient Rights",
    summary: "Lawful, fair, and transparent data processing, purpose limitation, data accuracy, and patient access rights.",
    fullText: `1. All electronic medical records (EMR) created within this HMIS must be processed lawfully, fairly, and in a transparent manner in relation to the data subject.
2. Patients have the right to be informed of the collection and use of their data, request access to their health records, request correction of inaccurate clinical entries (subject to medical audit approval), and object to commercial profiling.
3. Clinical data is stored for statutory medical-legal retention periods (minimum 7 years for adults, 21 years for pediatric files from birth) as dictated by Kenya Medical Practitioners and Dentists Council (KMPDC) guidelines.`,
    legalReference: "Kenya Data Protection Act 2019, Section 25, 26, 30",
    tags: ["principles", "retention", "patient rights", "access"]
  },
  {
    id: "kdpa-sec43-breach",
    section: "KDPA SECTION 43",
    title: "Data Breach Notification & Security Governance",
    summary: "72-hour mandatory reporting protocol to the Data Protection Commissioner in the event of an incident.",
    fullText: `1. In the event of an unauthorized access, exfiltration, or tampering with patient health data, the Data Protection Officer (DPO) and IT Administrator shall notify the Office of the Data Protection Commissioner (ODPC) within seventy-two (72) hours of becoming aware of the breach.
2. Affected data subjects shall be communicated to in writing without undue delay where the breach poses a high risk to their rights and freedoms.
3. Every staff terminal maintains immutable audit logs recording timestamp, user role, patient national ID, and specific field accessed.`,
    legalReference: "Kenya Data Protection Act 2019, Section 43 & Guidance Note on Breach Notification",
    tags: ["breach", "odpc", "audit", "security incident"]
  }
];

export const TERMS_OF_USE_CLAUSES: PolicyClause[] = [
  {
    id: "hmis-tou-access",
    section: "ROLE-BASED ACCESS & AUTHENTICATION",
    title: "Authorized System Usage & Staff Credential Confidentiality",
    summary: "Strict prohibition on sharing logins, PINs, or leaving terminals unlocked in patient consultation areas.",
    fullText: `1. Access to the Tassia Hill Hospital Management Information System (HMIS) is restricted to authenticated clinical, nursing, administrative, and finance personnel.
2. Each user is assigned a role-based authorization level (Admin, Doctor, Nurse, Laboratory, Pharmacy, Billing, Reception, HR, Procurement, Security). Sharing credentials, passwords, or RFID smartcards is a gross disciplinary offense and violation of hospital medical records protocol.
3. Terminals automatically lock after 5 minutes of idle time. Clinical personnel must manually lock screens when leaving desks.`,
    legalReference: "Digital Health Act 2023 & Hospital Standard Operating Procedure HR-IT-004",
    tags: ["authentication", "passwords", "rbac", "clean desk"]
  },
  {
    id: "hmis-tou-clinical",
    section: "CLINICAL ACCURACY & LEGAL RECORD",
    title: "Electronic Clinical Notes, E-Prescriptions & Audit Integrity",
    summary: "Notes entered into this HMIS constitute legal medical records admissible in Kenyan courts of law.",
    fullText: `1. Every diagnosis, procedure code, prescription, and triage score logged by a doctor or clinician represents an official medical chart entry.
2. Prescriptions dispatched to the pharmacy POS automatically deduct from live batch stock. Off-label or contraindicated orders flagged by the AI pharmacologist require conscious clinician confirmation.
3. Tampering with or retroactively altering signed consultation notes without leaving an audit trail is strictly prohibited under KMPDC rules.`,
    legalReference: "Evidence Act Cap 80 (Electronic Evidence) & KMPDC Code of Ethics",
    tags: ["clinical notes", "prescriptions", "legal evidence", "audit"]
  },
  {
    id: "hmis-tou-billing",
    section: "FINANCIAL FIDUCIARY & INVOICING",
    title: "Paperless Billing, KRA eTIMS & M-PESA Reconciliation",
    summary: "Real-time automated billing, fiscal signature compliance, and instant payment validation.",
    fullText: `1. All cashier stations and automated department charges must be settled prior to patient exit or managed through approved corporate/SHA credit agreements.
2. Generated electronic invoices are signed with fiscal QR codes and transmitted to Kenya Revenue Authority (KRA eTIMS) endpoints.
3. Receipts issued upon Safaricom M-PESA STK confirmation cannot be modified except through authorized Credit Note / Void procedures with dual manager authorization.`,
    legalReference: "Tax Procedures Act (eTIMS Regulations 2023) & Public Finance Management Act",
    tags: ["etims", "mpesa", "billing", "audit"]
  }
];

export const INFOSEC_STANDARDS: PolicyClause[] = [
  {
    id: "sec-std-encryption",
    section: "CRYPTOGRAPHY & TRANSPORT",
    title: "TLS 1.3 Transmission & AES-256 Data-at-Rest Encryption",
    summary: "All communications between hospital terminals, local PWA cache, and cloud databases are encrypted.",
    fullText: `1. All HTTP traffic is strictly routed over TLS 1.3 with HSTS enforced.
2. Database records stored in Cloud Firestore and indexed in IndexedDB offline cache are encrypted at rest using AES-256.
3. Sensitive patient identification keys (National ID, Phone, SHA Policy Number) are masked in front-facing customer display kiosks.`,
    legalReference: "ISO/IEC 27001:2022 Annex A.8.24 & NIST SP 800-52r2",
    tags: ["encryption", "tls", "aes-256", "infosec"]
  },
  {
    id: "sec-std-pwa",
    section: "OFFLINE RESILIENCE & CACHE ISOLATION",
    title: "Service Worker PWA Offline Governance & Synchronization",
    summary: "Strict sandboxing of offline IndexedDB queue cache to prevent data leaks during network disruptions.",
    fullText: `1. When the hospital local area network (LAN) suffers fiber connectivity failure, the HMIS operates in offline resilience mode via Service Worker Workbox caches.
2. Queued patient visits and offline emergency triage records are committed to local browser IndexedDB and automatically synchronized once connectivity is restored.
3. Private session storage is cleared upon explicit staff sign-out to prevent session hijacking on shared ward tablets.`,
    legalReference: "W3C Service Worker Security Model & OWASP Mobile/PWA Guidelines",
    tags: ["pwa", "offline", "indexeddb", "workbox", "sync"]
  },
  {
    id: "sec-std-ai",
    section: "AI ASSISTANT SAFETY & ETHICAL USE",
    title: "Gemini Clinical Pharmacology & Prescription Safeguards",
    summary: "AI generated recommendations are advisory only; clinician holds full diagnostic responsibility.",
    fullText: `1. The Gemini AI integration assists with alternative medication suggestions, drug-drug interaction warnings, and automated clinical summaries.
2. All AI suggestions must be reviewed and countersigned by a registered medical doctor or clinical officer. The AI system does not execute autonomous prescriptions.
3. De-identified symptom strings are sanitized before server-side API calls; patient national identifiers and names are never transmitted to LLM training endpoints.`,
    legalReference: "WHO Guidance on Ethics & Governance of AI for Health (2021) & MOH AI Policy",
    tags: ["gemini", "ai ethics", "clinical safety", "pharmacology"]
  }
];

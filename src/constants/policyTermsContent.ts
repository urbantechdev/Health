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
  lastReviewedDate: "08-Sep-2026",
  hospitalName: "The Tassia Hill Hospital",
  odpcRegistrationNumber: "ODPC/CR/2026/00482",
  dpoName: "Dr. Evans Kiprotich, MBChB, MSc (Chief Medical Compliance & Data Protection Officer)",
  dpoEmail: "dpo@tassiahillhospital.co.ke",
  complianceEmail: "compliance@tassiahillhospital.co.ke",
  postalAddress: "P.O. Box 48201-00100, Fedha-Tassia Road, Embakasi East, Nairobi, Kenya",
  dpoHotline: "+254 722 000 482 / Ext 104",
  odpcNationalOffice: "Britam Tower, 12th Floor, Hospital Road, Upper Hill, Nairobi, Kenya",
  odpcWebsite: "https://www.odpc.go.ke",
  dhaFacilityCode: "DHA-FAC-NRB-08842",
  kmhflCode: "KMHFL-22814",
  kmpdcFacilityReg: "KMPDC/F-2026/0491",
  mohSurveillanceDesk: "EOC Kenya: +254 729 471 414 / 0800 721 316"
};

export const DATA_PROTECTION_CLAUSES: PolicyClause[] = [
  {
    id: "kdpa-sec44-sensitive",
    section: "KDPA SECTION 44, 45 & 46",
    title: "Processing of Health & Biometric Data as Sensitive Personal Data",
    summary: "Mandatory statutory conditions for processing electronic medical records, lab findings, and biometric templates.",
    fullText: `1. In accordance with Section 44 and 45 of the Kenya Data Protection Act 2019, patient health data, clinical observations, diagnostic findings, prescriptions, and biometric templates constitute 'Sensitive Personal Data'.
2. Such data shall only be processed by or under the responsibility of licensed healthcare practitioners subject to statutory professional confidentiality (KMPDC, NCK, PPB, COC, KMLTTB).
3. Biometric identifiers captured at The Tassia Hill Hospital (fingerprint templates, optical MRZ hashes) are encrypted using irreversible SHA-256 salted hashes strictly for patient identification, medical safety, and SHA/KDHA fraud prevention. Raw biometric images are never stored in unencrypted form or transmitted to external servers.`,
    legalReference: "Kenya Data Protection Act 2019, Section 44, 45 & 46; KMPDC Code of Conduct",
    tags: ["kdpa", "sensitive data", "biometrics", "kmpdc", "privacy", "encryption"]
  },
  {
    id: "kdpa-sec25-principles",
    section: "KDPA SECTION 25, 26 & 30",
    title: "Principles of Data Protection & Patient Rights",
    summary: "Lawful, fair, and transparent data processing, purpose limitation, data accuracy, and patient access rights.",
    fullText: `1. All electronic medical records (EMR) created within this HMIS must be processed lawfully, fairly, and in a transparent manner in relation to the data subject.
2. Patients have the right to:
   a) Be informed of the collection, purpose, and lawful basis for processing their health data.
   b) Access their health records and diagnostic reports upon formal request to the Medical Records Officer.
   c) Request correction or rectifying notation of inaccurate clinical entries (subject to medical audit board review).
   d) Receive their health history in a standardized, machine-readable format (FHIR / JSON) for inter-facility portability.
   e) Object to processing for secondary or non-clinical commercial purposes.
3. Clinical data is stored for statutory medical-legal retention periods (minimum 7 years for adults, 21 years for pediatric files from birth) as dictated by Kenya Medical Practitioners and Dentists Council (KMPDC) guidelines.`,
    legalReference: "Kenya Data Protection Act 2019, Section 25, 26, 30; KMPDC Guidelines",
    tags: ["principles", "retention", "patient rights", "access", "portability", "fhir"]
  },
  {
    id: "kdpa-sec43-breach",
    section: "KDPA SECTION 43",
    title: "Data Breach Notification & Forensic Security Governance",
    summary: "Mandatory 72-hour notification protocol to the Data Protection Commissioner and immediate containment.",
    fullText: `1. In the event of an unauthorized access, exfiltration, loss, or tampering with patient health data, the Data Protection Officer (DPO) and IT Administrator shall notify the Office of the Data Protection Commissioner (ODPC) within seventy-two (72) hours of becoming aware of the incident.
2. Affected data subjects shall be communicated to in writing without undue delay where the breach poses a high risk to their rights and freedoms, stating the nature of the breach and recommended mitigation steps.
3. Every staff terminal maintains immutable audit logs recording timestamp, user identity, clinical role, patient ID, client IP, and specific database fields accessed. Tampering with audit logs is a strict criminal offense under Section 73 of the KDPA.`,
    legalReference: "Kenya Data Protection Act 2019, Section 43 & ODPC Guidance Note on Breach Notification",
    tags: ["breach", "odpc", "audit logs", "security incident", "containment"]
  },
  {
    id: "kdpa-sec48-crossborder",
    section: "KDPA SECTION 48, 49 & 50",
    title: "Sovereign Kenyan Cloud Data Residency & Cross-Border Restrictions",
    summary: "Strict prohibition of unapproved overseas transfers; patient health data resides within secure cloud zones.",
    fullText: `1. In compliance with Section 48 and 49 of the KDPA and the Data Protection (General) Regulations 2021, all electronic medical records, clinical notes, and patient identifiers must be stored within data centers adhering to Kenyan sovereign data residency guidelines.
2. Cross-border transmission of patient clinical charts is strictly prohibited unless:
   a) The recipient jurisdiction provides proof of adequate data protection safeguards certified by the ODPC; or
   b) Explicit informed consent is given by the patient for specialized cross-border medical teleconsultation or medical evacuation; or
   c) Necessary for reasons of public interest or vital medical necessity under Section 49(1)(c).
3. The Tassia Hill Hospital HMIS enforces localized data encryption and restricts third-party cloud integrations to ODPC-registered cloud service providers.`,
    legalReference: "Kenya Data Protection Act 2019, Section 48, 49 & 50; Data Protection (General) Regulations 2021",
    tags: ["cross-border", "sovereign data", "data residency", "cloud security", "odpc"]
  },
  {
    id: "kdpa-surveillance-exemption",
    section: "KDPA SEC 45(1)(b) & PUBLIC HEALTH ACT",
    title: "Lawful Disease Surveillance & IDSR / IHR 2005 Reporting",
    summary: "Statutory exemption for disease surveillance reporting to Ministry of Health, County Health Management, and WHO.",
    fullText: `1. In accordance with Section 45(1)(b) and 45(1)(c) of the Kenya Data Protection Act 2019 and Cap 242 of the Public Health Act, the processing and transmission of reportable disease data (MOH 505 eIDSR, Cholera, Measles, VHF, Polio, Mpox, Yellow Fever, Rabies) does not require individual patient consent as it is mandated by law for reasons of public interest in the area of public health.
2. When transmitting epidemiologic notifications to the Sub-County Disease Surveillance Coordinator (SCDSC), Kenya National Emergency Operations Center (EOC), and WHO International Health Regulations (IHR 2005) Focal Point:
   a) Only the minimum necessary demographic and clinical indicators required by statutory reporting forms are transmitted.
   b) Epidemiological line listings and weekly IDSR aggregation matrices are pseudonymized and encrypted in transit via secure health information protocols.
   c) Public-facing dashboards, epidemiological bulletins, and outbreak signal clusters are fully anonymized and aggregated at population level.`,
    legalReference: "Kenya Data Protection Act 2019, Section 45(1)(b); Public Health Act Cap 242; WHO IHR (2005)",
    tags: ["surveillance", "idsr", "public health", "eidsr", "ihr 2005", "anonymization"]
  },
  {
    id: "dha-2023-governance",
    section: "DIGITAL HEALTH ACT 2023",
    title: "Kenya Digital Health Agency (KDHA) & AfyaLink Interoperability",
    summary: "Compliance with Kenya Digital Health Superhighway standards, Master Patient Index, and SHA claims integrity.",
    fullText: `1. The Tassia Hill Hospital HMIS is aligned with the provisions of the Digital Health Act 2023 (Act No. 15 of 2023) established under the Kenya Digital Health Agency (KDHA).
2. The system adheres to national health data exchange architectures, including:
   a) Integration with the National Master Patient Index (MPI) and AfyaLink DHA enterprise service bus using HL7 FHIR Release 4 / 5 data bundles.
   b) Digital Health Registry compliance for verified health practitioners (KMPDC, NCK, PPB).
   c) Real-time biometric and OTP eligibility validation with the Social Health Authority (SHA / Taifa Care), preventing impersonation and phantom billing.
3. Patient electronic consent tokens are logged and managed through the integrated Digital Consent Register prior to inter-facility clinical record exchange.`,
    legalReference: "Digital Health Act 2023 (No. 15 of 2023); Kenya Health Information System (KHIS) Guidelines",
    tags: ["digital health act", "dha 2023", "kdha", "afyalink", "sha", "fhir", "interoperability"]
  },
  {
    id: "kdpa-sec31-dpia",
    section: "KDPA SECTION 31",
    title: "Data Protection Impact Assessment (DPIA) & Privacy-by-Design",
    summary: "Systematic risk evaluation, privacy-by-default architecture, and continuous vulnerability mitigation.",
    fullText: `1. In accordance with Section 31 of the KDPA 2019, The Tassia Hill Hospital conducts regular Data Protection Impact Assessments (DPIA) covering all automated processing of sensitive health data, AI clinical assistants, and biometric authentication devices.
2. The HMIS incorporates Privacy by Design and Default:
   a) Strict segregation of duties ensuring clinicians only view patient charts assigned to their consultation or ward roster.
   b) Front-facing patient kiosks mask National ID and telephone numbers.
   c) All database tables enforce row-level security and tenant isolation.
   d) Annual independent third-party cybersecurity and privacy audits submitted to the ODPC.`,
    legalReference: "Kenya Data Protection Act 2019, Section 31 & ODPC DPIA Guidelines",
    tags: ["dpia", "privacy by design", "security audit", "risk assessment"]
  },
  {
    id: "fin-privacy-etims",
    section: "TAX & PAYMENT REGULATIONS",
    title: "Financial Data Privacy, KRA eTIMS & Safaricom M-PESA Security",
    summary: "Strict isolation of payment channels, cryptographic fiscal signatures, and zero storage of customer PINs.",
    fullText: `1. Financial and billing transactions processed via the Cashier POS, Safaricom M-PESA Daraja API, and Kenya Revenue Authority (KRA eTIMS v2.0) are strictly segregated from clinical notes.
2. The HMIS never records, intercepts, or stores customer M-PESA PINs or bank card CVVs. All USSD STK pushes are processed directly through Safaricom's encrypted payment gateway.
3. Invoices submitted to KRA eTIMS contain only statutory fiscal invoice parameters (Control Code, QR verification URL, taxable supply classification) and exclude private diagnosis text, preserving patient confidentiality on tax receipts.`,
    legalReference: "Tax Procedures Act (eTIMS Regulations 2023); National Payment System Act Cap 491C; PCI-DSS Level 1",
    tags: ["etims", "mpesa", "financial privacy", "kra", "pci-dss"]
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
  },
  {
    id: "hmis-tou-surveillance",
    section: "STATUTORY REPORTING DUTY",
    title: "Mandatory Disease Notification & Outbreak Escalation",
    summary: "Legal obligation of attending clinicians to immediately log priority notifiable diseases into the IDSR hub.",
    fullText: `1. All attending doctors, clinical officers, nurses, and laboratory technologists have a statutory legal duty under the Public Health Act (Cap 242) to immediately report suspected or confirmed cases of priority notifiable diseases within 24 hours.
2. Logging an immediate reportable condition (e.g. Cholera, Measles, VHF, Mpox, Anthrax) in the clinical module automatically notifies the Hospital Infection Prevention & Control (IPC) Committee and the Sub-County Disease Surveillance Coordinator.
3. Failure to report statutory infectious conditions constitutes professional negligence punishable under KMPDC and Public Health statutes.`,
    legalReference: "Public Health Act (Cap 242); IDSR Technical Guidelines (MOH Kenya 3rd Ed)",
    tags: ["public health", "notification", "legal duty", "idsr", "surveillance"]
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


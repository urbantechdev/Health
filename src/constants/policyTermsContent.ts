export interface PolicyClause {
  id: string;
  section: string;
  title: string;
  summary: string;
  fullText: string;
  legalReference?: string;
  tags: string[];
}

export const TERMS_OF_USE_CLAUSES: PolicyClause[] = [
  {
    id: "TOU-01",
    section: "1. System Authorization & Permitted Purpose",
    title: "Authorized Practitioner & Staff Access Only",
    summary: "Access to this Hospital Management Information System (HMIS) is restricted to credentialed healthcare workers and authorized administrative personnel.",
    fullText: `1.1. This Hospital Management Information System (The Tassia Hill Hospital HMIS) is licensed exclusively for legitimate healthcare administration, patient triage, clinical consultation, diagnostic ordering, pharmacy dispensing, inpatient bed management, and revenue cycle reconciliation.
1.2. Users must only access patient data for individuals directly under their active clinical care or administrative responsibility ("Need-to-Know Principle").
1.3. Sharing of login credentials, PINs, smartcard tokens, or biometric override codes is strictly prohibited and constitutes a direct breach of employment contract and professional licensure rules.`,
    legalReference: "Health Act No. 21 of 2017 (Sec 10-14); KMPDC Code of Professional Conduct",
    tags: ["access", "authorization", "credentials", "need-to-know"]
  },
  {
    id: "TOU-02",
    section: "2. Clinical Decision Support & Professional Responsibility",
    title: "Practitioner Prerogative & Clinical Responsibility",
    summary: "AI clinical suggestions, triage scores, drug interaction alerts, and automated triage priority calculators are advisory tools and do not substitute independent medical judgment.",
    fullText: `2.1. The AI Diagnostic Assistant, triage priority calculators, automatic ICD-10 coders, and drug-drug interaction warning systems embedded within this application serve exclusively as clinical decision-support aids.
2.2. The licensed medical officer, clinical officer, nurse, or pharmacist retains sole, non-delegable legal and ethical responsibility for all diagnoses, prescriptions, surgical referrals, and discharge decisions.
2.3. Practitioners must independently cross-examine all suggested dosages, contraindications, and laboratory interpretations against accepted Kenya National Clinical Guidelines.`,
    legalReference: "Medical Practitioners and Dentists Act (Cap 253); Clinical Officers Act 2017",
    tags: ["clinical-decision", "ai", "responsibility", "prescriptions"]
  },
  {
    id: "TOU-03",
    section: "3. Patient Confidentiality & Non-Disclosure",
    title: "Absolute Duty of Medical Confidentiality",
    summary: "All health records, diagnoses, biometric tokens, financial statements, and identifiers are confidential medical communications.",
    fullText: `3.1. Every clinical interaction recorded within this platform is protected under statutory doctor-patient privilege and medical confidentiality rules.
3.2. Users must never photograph, screen-capture, print, export, or transmit patient records, imaging scans, or identifiers to unauthorized personal devices, messaging apps, or public networks.
3.3. Any authorized disclosure for referral, statutory reporting (e.g., MOH 705/711 surveillance), or insurance claim verification (SHA) must occur strictly through designated system channels.`,
    legalReference: "Kenya Constitution 2010 Art. 31; Data Protection Act 2019 Sec. 44",
    tags: ["confidentiality", "privacy", "disclosure", "patient-records"]
  },
  {
    id: "TOU-04",
    section: "4. Prohibited System Activities",
    title: "Strictly Prohibited Actions & Security Violations",
    summary: "Tampering with clinical audit logs, fraudulent billing entries, and unauthorized modifications carry immediate disciplinary and criminal penalties.",
    fullText: `4.1. The following activities are strictly prohibited:
  a) Attempting to modify, alter, or back-date finalized clinical notes, prescriptions, or laboratory results without formal addendum procedures;
  b) Fabricating ghost services, inflated tariffs, or duplicate SHA/e-Claims submissions;
  c) Bypassing biometric authentication, eTIMS fiscal signing, or role-based privilege guardrails;
  d) Introducing unauthorized scripts, reverse-engineering client bundles, or probing system endpoints.
4.2. Violations will be escalated immediately to Hospital Management, the Directorate of Criminal Investigations (DCI Cybercrime Unit), and relevant licensing councils.`,
    legalReference: "Computer Misuse and Cybercrimes Act No. 5 of 2018 (Sec 14-21)",
    tags: ["prohibited", "fraud", "cybercrime", "audit-tampering"]
  },
  {
    id: "TOU-05",
    section: "5. Availability, Uptime & Downtime Contingency",
    title: "System Availability & Offline Clinical Continuity",
    summary: "The platform operates with offline queue caching and automated sync, requiring staff to maintain standard paper downtime protocols during extended outages.",
    fullText: `5.1. While this HMIS targets 99.9% operational availability across outpatient and inpatient departments, scheduled maintenance and infrastructure outages may occur.
5.2. In the event of network disruption, staff must switch to the built-in offline caching queue and, if necessary, activate the facility's approved Physical Downtime Procedure (Manual MOH Triage and Consultation Forms) until connectivity is verified.
5.3. All paper encounters generated during downtime must be retrospectively reconciled and transcribed into the system within 12 hours of system restoration.`,
    legalReference: "Digital Health Act 2023 Sec. 38 (Health System Resilience)",
    tags: ["uptime", "offline", "downtime", "contingency"]
  }
];

export const DATA_PROTECTION_CLAUSES: PolicyClause[] = [
  {
    id: "DPA-01",
    section: "1. Lawful Basis for Processing Health Data",
    title: "Processing Sensitive Personal Health Data",
    summary: "Health data is categorized as Sensitive Personal Data under Section 44 of the Kenya Data Protection Act (KDPA) 2019.",
    fullText: `1.1. In compliance with the Kenya Data Protection Act 2019 and the Digital Health Act 2023, health data (including medical histories, diagnostic tests, prescriptions, and biometrics) is processed strictly on the following lawful grounds:
  a) Vital interests and direct provision of medical treatment, diagnosis, and emergency healthcare (Section 45);
  b) Explicit statutory obligations under the Social Health Insurance Act 2023 and Public Health Act (Cap 242);
  c) Written or biometrically authenticated patient consent obtained at registration/triage.
1.2. Data processing is bounded by the principles of Lawfulness, Fairness, Transparency, Purpose Limitation, and Data Minimization.`,
    legalReference: "Kenya Data Protection Act 2019 Sec. 29, 44 & 45; ODPC Health Guidelines 2023",
    tags: ["kdpa", "lawful-basis", "sensitive-data", "consent"]
  },
  {
    id: "DPA-02",
    section: "2. Rights of the Data Subject (Patient Rights)",
    title: "Patient Data Subject Entitlements & Execution",
    summary: "Patients possess statutory rights to access, rectify, restrict, and receive a copy of their health records.",
    fullText: `2.1. Every patient registered on this platform possesses the following enforceable statutory rights:
  a) Right of Access: To obtain confirmation and a legible electronic or printed copy of their health records;
  b) Right to Rectification: To request correction of inaccurate demographic, emergency contact, or insurance information without undue delay;
  c) Right to Data Portability: To have their summary medical record exported in standardized HL7 FHIR R4 JSON format for transmission to another accredited healthcare facility;
  d) Right to Object: To object to non-clinical secondary uses (e.g., anonymized medical research or institutional audits).
2.2. Requests must be addressed to the Hospital Data Protection Officer (DPO) and resolved within 21 calendar days.`,
    legalReference: "Kenya Data Protection Act 2019 Part IV (Sec 25-40)",
    tags: ["data-subject-rights", "patient-rights", "access", "portability", "fhir"]
  },
  {
    id: "DPA-03",
    section: "3. Biometric Verification & National Data Exchange",
    title: "Biometric Protection & Digital Health Agency (DHA) Exchange",
    summary: "Biometric templates are hashed, encrypted, and processed strictly for patient identity validation and SHA pre-authorization.",
    fullText: `3.1. Biometric minutiae captured via optical scanners or WebAuthn modules are never stored as raw unencrypted image files; they are converted into irreversible SHA-256 cryptographic audit tokens.
3.2. Transmission of clinical summaries to the National Shared Health Record (SHR) via HL7 FHIR R4 is governed by the Digital Health Act 2023 and authenticated through OAuth2 Mutual TLS certificates.
3.3. Cross-border transmission of patient clinical records is strictly prohibited unless authorized by the Cabinet Secretary and Data Protection Commissioner under Section 48 of the Act.`,
    legalReference: "Digital Health Act 2023 Sec. 21-27; KDPA 2019 Sec. 48 & 49",
    tags: ["biometrics", "sha", "dha", "shr", "cross-border"]
  },
  {
    id: "DPA-04",
    section: "4. Data Retention & Archival Schedules",
    title: "Statutory Medical Record Retention & Disposal",
    summary: "In accordance with Kenyan medical law, clinical records are retained for mandatory legal timeframes prior to secure cryptographic destruction.",
    fullText: `4.1. Adult Patient Records: Retained for a minimum of 20 years from the date of the last clinical visit.
4.2. Paediatric / Minor Records: Retained until the patient reaches 25 years of age (7 years past the age of legal majority in Kenya).
4.3. Maternity & Obstetric Records: Retained for 25 years in compliance with national obstetric audit regulations.
4.4. Financial & eTIMS Invoices: Retained for 7 years as mandated by the Tax Procedures Act No. 29 of 2015.
4.5. Following expiration of statutory retention, records are purged using DoD 5220.22-M cryptographic sanitization standards.`,
    legalReference: "Public Archives and Documentation Service Act (Cap 19); KMPDC Medical Records Code",
    tags: ["retention", "archival", "disposal", "etims"]
  },
  {
    id: "DPA-05",
    section: "5. Security Safeguards & 72-Hour Breach Reporting",
    title: "Incident Response & Mandatory Breach Notification",
    summary: "Any unauthorized access, loss, or leakage of sensitive health data triggers an immediate internal containment procedure and notification to the ODPC within 72 hours.",
    fullText: `5.1. The hospital maintains administrative, technical, and physical security measures including AES-256 database encryption, role-scoped API tokens, and tamper-evident audit logs.
5.2. In the event of a detected data breach involving personal or sensitive health data:
  a) The Security Desk and DPO must be alerted within 1 hour;
  b) Containment and forensic snapshotting must initiate immediately;
  c) The Office of the Data Protection Commissioner (ODPC) must be formally notified in writing within 72 hours of becoming aware of the breach;
  d) Affected data subjects will be notified promptly if the breach poses high risk to their rights and freedoms.`,
    legalReference: "Kenya Data Protection Act 2019 Sec. 43; ODPC Breach Notification Guidelines",
    tags: ["security", "breach-notification", "odpc", "encryption"]
  }
];

export const INFOSEC_STANDARDS: PolicyClause[] = [
  {
    id: "SEC-01",
    section: "1. Authentication & Credential Hygiene",
    title: "Multi-Factor Authentication & Password Standards",
    summary: "Mandatory complexity rules, session timeout locks, and multi-factor authorization for clinical roles.",
    fullText: `1.1. Passwords must contain a minimum of 10 characters with mixed uppercase, lowercase, numbers, and symbols.
1.2. Clinical workstations automatically lock after 5 minutes of inactivity to prevent unauthorized bystander viewing in examination rooms and triage cubicles.
1.3. Emergency override accounts ("Break-Glass Access") are strictly monitored and trigger immediate automated SMS and email notifications to the Hospital Administrator and Chief Medical Officer.`,
    legalReference: "ISO/IEC 27001:2022 Controls 5.15, 8.5; Health Information Security Standard",
    tags: ["passwords", "timeout", "break-glass", "mfa"]
  },
  {
    id: "SEC-02",
    section: "2. Workstation & Device Security (Clean Desk Standard)",
    title: "Workstation Protocol in Clinical & Public Areas",
    summary: "Rules governing physical computers, receipt printers, barcode readers, and mobile ward tablets.",
    fullText: `2.1. Monitors in reception, billing, and nursing stations must be angled away from public waiting areas or fitted with privacy privacy filters.
2.2. Unattended printouts containing patient summaries, discharge sheets, or lab results must not remain on communal printers.
2.3. Staff must physically lock their workstation (Windows Key + L or System Logout) whenever leaving their desk, even for brief consultations.`,
    legalReference: "Kenya National e-Health Policy 2016-2030; ODPC Physical Security Guidelines",
    tags: ["clean-desk", "workstation", "physical-security", "printers"]
  },
  {
    id: "SEC-03",
    section: "3. Immutable Audit Trails & System Telemetry",
    title: "Continuous Forensic Logging & Non-Repudiation",
    summary: "Every view, modification, printout, and deletion of a patient record is permanently stamped with practitioner ID, IP address, and microsecond timestamp.",
    fullText: `3.1. The platform maintains an immutable audit ledger recording every query, record creation, prescription issuance, eTIMS invoice generation, and SHA pre-authorization request.
3.2. Audit logs are cryptographically sealed and cannot be altered or deleted by system users, including system administrators.
3.3. Log records are reviewed on a weekly basis by the Data Governance Committee to identify anomalous access patterns or unauthorized chart reviews.`,
    legalReference: "Evidence Act (Cap 80) Sec. 106B (Electronic Records Admissibility)",
    tags: ["audit-trail", "forensics", "non-repudiation", "logging"]
  }
];

export const REGULATORY_DIRECTORY = {
  hospitalName: "The Tassia Hill Hospital",
  registrationNumber: "024866",
  postalAddress: "P.O. Box 1834-00100 Nairobi",
  hospitalEmail: "tassiahillhospital@gmail.com",
  odpcRegistrationNumber: "024866",
  dhaFacilityCode: "DHA-FAC-NRB-04281",
  kmhflCode: "KMHFL-24019",
  dpoName: "Dr. Emmanuel Mutua, LL.M, CIPP/E",
  dpoEmail: "tassiahillhospital@gmail.com",
  dpoHotline: "+254 (020) 794-2000 / Ext 404",
  odpcNationalOffice: "Office of the Data Protection Commissioner, Britam Tower, 13th Floor, Hospital Rd, Nairobi",
  odpcWebsite: "https://www.odpc.go.ke",
  effectiveDate: "2026-01-01",
  lastReviewedDate: "2026-08-30"
};

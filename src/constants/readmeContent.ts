export const TASSIAHILL_README_MARKDOWN = `# The Tassia Hill Hospital — Hospital Management Information System (HMIS)

**Facility Master Code (KMHFL):** \`KMHFL-22814\` | **DHA Facility Code:** \`DHA-FAC-NRB-08842\`  
**KMPDC Facility License:** \`KMPDC/F-2026/0491\` | **ODPC Registration Certificate:** \`ODPC/CR/2026/00482\`  
**Location:** Fedha-Tassia Road, Embakasi East, Nairobi, Kenya  
**System Version:** \`v4.2.0-Production\` | **Effective Date:** \`01-Jan-2026\` (Reviewed: \`08-Sep-2026\`)

---

## 1. Executive Summary & Facility Profile

**The Tassia Hill Hospital HMIS** is a multi-tenant, cloud-resilient, offline-first Hospital Management Information System engineered specifically for modern healthcare facilities in Kenya and Sub-Saharan Africa. 

Built with enterprise-grade clinical precision, the platform unifies patient reception, optical biometric identification, nurse triage (MEWS), clinical consultation EMR (WHO ICD-10), diagnostic laboratory (LIS), radiology (RIS), smart pharmacy POS (2D GS1 DataMatrix), inpatient ward admissions, inter-facility referrals (MOH 268), paperless split billing, KRA eTIMS fiscalization, Safaricom M-PESA STK checkout, and comprehensive Ministry of Health public health and disease surveillance reporting (eIDSR, MOH 505, WHO IHR 2005).

---

## 2. Architecture & Technology Stack

| Tier | Technologies | Key Capabilities |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript), Vite | Ultra-fast client-side hydration, SPA architecture, strict TypeScript types |
| **Styling & Motion** | Tailwind CSS v4, Motion (\`motion/react\`) | Ergonomic clinical interface, responsive mobile-to-desktop, subtle transitions |
| **Iconography & Visuals** | Lucide React | Uniform SVG iconography across all clinical stations |
| **Database & Real-Time Sync** | Google Cloud Firestore (Multi-Region) | Document-oriented NoSQL, real-time reactive snapshots, optimistic updates |
| **Offline Resilience** | Workbox PWA Service Worker + IndexedDB | Zero-data-loss caching, offline clinical note taking and vitals capture |
| **Speech Synthesis** | Web Speech API / Synthetic Voice Engine | Real-time bilingual queue announcements (English & Kiswahili) |
| **Data Visualization** | Recharts, SVG Sparklines | Epidemiological epi-curves, bed occupancy visualizers, financial trends |
| **Printing & Hardware** | ESC/POS emulation, html2canvas, jsPDF | 58mm/80mm thermal receipts, A4 official forms, Zebra barcode labels |

---

## 3. Core Clinical & Operational Modules

### 3.1 Reception & Biometric Intake Desk (\`Alt + 2\`)
- **Optical Document Recognition**: Scans Kenyan National Identity Cards and Passports via optical barcode/MRZ readers.
- **SHA / AfyaLink Live Verification**: Real-time eligibility query against the Social Health Authority / Kenya Digital Health Agency (KDHA) enterprise service bus.
- **Thermal Queue Ticketing**: Issues categorized queue tickets (\`GEN\`, \`PED\`, \`MAT\`, \`LAB\`, \`RES\`) routed automatically to Nurse Triage.

### 3.2 Nurse Triage & Vitals Station
- **Comprehensive Vitals Capture**: Systolic/Diastolic Blood Pressure, Heart Rate, Respiratory Rate, Body Temperature, SpO2, Random Blood Sugar (RBS), Height, Weight, and calculated BMI.
- **Modified Early Warning Score (MEWS)**: Real-time clinical deterioration scoring with automated visual thresholds (Green: Normal, Yellow: Caution, Orange/Red: Emergency Fast-Track).
- **Maternal & Pediatric Flags**: Dedicated clinical safeguards for pregnant mothers and neonates.

### 3.3 Doctor Consultation & Clinical EMR (\`Alt + 3\`)
- **Longitudinal Medical History**: Past clinical encounters, chronic diagnoses, allergy contraindications, and laboratory trends.
- **WHO ICD-10 Diagnostic Search**: Instant search and assignment of primary and secondary clinical diagnostic codes.
- **Computerized Physician Order Entry (CPOE)**: Electronic diagnostic test orders for Laboratory and Radiology.
- **Digital e-Prescribing**: Structured medication regimens with frequency, dosage, duration, and food instructions, streamed directly to Pharmacy POS.

### 3.4 Diagnostics: Laboratory (LIS) & Radiology (RIS) (\`Alt + 4\`)
- **Automated Specimen Barcoding**: Sample tube tracking for Haematology, Biochemistry, Microbiology, and Serology.
- **Analyzer Result Input & Panic Values**: Numeric result capture with automatic flagging of critical abnormal limits.
- **Radiology DICOM Links & Modality Reports**: Radiologist findings capture with links to PACS DICOM viewers.

### 3.5 Smart Pharmacy POS & 2D GS1 Traceability (\`Alt + 5\`)
- **2D GS1 DataMatrix Scanning**: Hardware scanner decoding of GTIN, Batch Number, Expiry Date, and Serial Number.
- **FEFO Batch Enforcement**: Strict First-Expired-First-Out dispensing logic preventing the issuance of expired drugs.
- **Inventory & Stock Reorder Alerts**: Automated inventory decrementing, unit cost tracking, and minimum stock threshold warnings.

### 3.6 Inpatient Ward & Admissions Management
- **Interactive Bed Matrix**: Live visual occupancy across General Ward, Maternity, Paediatric, Surgical, HDU, and ICU.
- **Nursing Care Charts**: Vital signs MAR charts, daily shift handover notes, and medication administration tracking.
- **Ward Rounds & Discharge Summaries**: Progress notes documentation and automated clinical discharge generation.

### 3.7 Transfers & Inter-Facility Referrals Hub (MOH 268)
- **Internal Departmental Transfers**: Ward-to-HDU/ICU relocation logs with clinical handover notes.
- **Statutory MOH 268 Referral Forms**: Standardized ambulance referral documentation for tertiary facilities (KNH, Kenyatta University Hospital, Mbagathi).
- **Transit Life Support Monitoring**: Paramedic escort and oxygen/infusion tracking during ambulance transit.

### 3.8 Public Health & Disease Surveillance Hub (eIDSR & WHO IHR) (\`Alt + S\`)
- **Immediate 24-Hour Reportable Diseases**: Real-time statutory notification for 12 priority conditions (Cholera, Measles, Anthrax, VHF, Polio/AFP, Yellow Fever, Mpox, Plague, Rabies, Meningitis, Neonatal Tetanus, MDR-TB) with MOH 505 dossier generation.
- **IDSR Weekly Matrix (Epi-Weeks 1–52)**: Automated aggregation of outpatient and inpatient encounters into official weekly surveillance tables with alert and epidemic threshold alarms.
- **Public Health Events & Outbreak Detection**: Signal clustering for contamination, respiratory clusters, and unexplained mortalities with Rapid Response Team (RRT) action logs.
- **WHO IHR 2005 Annex 2 Decision Instrument**: Interactive 4-question algorithmic assessment determining Events of International Concern and triggering 24h notification to the National IHR Focal Point and WHO AFRO.
- **Routine Statutory Reports**: Generation and DHIS2/KHIS ADX export of MOH 705A (Under-5), MOH 705B (Over-5), MOH 711 (MCH/RH), and MOH 717 (Hospital Workload).

### 3.9 Split-Ledger Billing, M-PESA & KRA eTIMS (\`Alt + 6\`)
- **Multi-Tender Reconciliation**: Automated split allocation between SHA / Insurance coverage and Cash/M-Pesa co-pay.
- **Safaricom M-PESA STK Push**: Instant USSD PIN prompt dispatch to the patient's phone with automated payment validation.
- **KRA eTIMS Fiscal Compliance**: Cryptographically signed tax invoices with official verification QR codes.
- **Digital Gate Pass Clearance**: Issuance of authenticated 6-character exit codes and verification at the security desk.

### 3.10 Security Desk & Gate Clearance (\`Alt + 7\`)
- **Digital Gate Pass Validation**: Real-time lookup of patient discharge and payment settlement status.
- **Vehicle & Visitor Movement Register**: License plate logging (e.g. KDA 123X), driver contact, and purpose of visit.
- **Live Security Watchlist**: Real-time alerts for restricted vehicles or flagged individuals.

---

## 4. Kenyan Regulatory & Compliance Framework

The Tassia Hill Hospital HMIS complies strictly with Kenyan healthcare and data protection legislation:

1. **Office of the Data Protection Commissioner (ODPC)**:
   - Registered Data Controller: \`ODPC/CR/2026/00482\`
   - Adheres to Kenya Data Protection Act 2019 (KDPA) Section 44/45 (Sensitive Health Data processing) and Section 43 (Mandatory 72-Hour Breach Notification).
   - Biometric identifiers stored solely as one-way salted SHA-256 hashes.
   - Sovereign Kenyan cloud data residency enforced under Section 48/49.
   - Lawful disease surveillance reporting exempted under Section 45(1)(b).

2. **Digital Health Act 2023 (DHA 2023)**:
   - Kenya Digital Health Agency (KDHA) enterprise architecture alignment.
   - HL7 FHIR R4 interoperability for national Master Patient Index (MPI) and AfyaLink DHA connectivity.
   - Social Health Authority (SHA / Taifa Care) electronic claims verification.

3. **Kenya Medical Practitioners and Dentists Council (KMPDC)**:
   - Medical-legal record retention standards (7 years for adult charts, 21 years from birth for pediatric records).
   - Electronic signature accountability and tamper-proof consultation notes.

4. **Pharmacy and Poisons Board (PPB)**:
   - Digital e-prescribing standards and GS1 barcode pharmaceutical traceability.

5. **Kenya Revenue Authority (KRA)**:
   - eTIMS v2.0 real-time fiscal invoice generation and validation QR code signing.

---

## 5. Hardware & Peripheral Specifications

| Peripheral | Supported Interfaces | Recommended Models | Configuration Guide |
| :--- | :--- | :--- | :--- |
| **2D GS1 Barcode Scanner** | USB-HID, Bluetooth 5.0 | Honeywell Xenon 1900, Datalogic Gryphon, Zebra DS2208 | Configure for USB-HID Keyboard mode with suffix Enter (CR). |
| **Optical MRZ / ID Scanner** | USB 2.0/3.0, TWAIN | Desko Penta, Thales Gemalto, Plustek SecureScan | Set output to keyboard wedge or standard virtual COM. |
| **Thermal Receipt Printer** | USB, Network Ethernet, Bluetooth | Epson TM-T20III, Xprinter XP-N160M, Bixolon SRP-330 | Set paper roll to 80mm or 58mm with zero margins in browser print dialog. |
| **Barcode Label Printer** | Direct Thermal / Thermal Transfer | Zebra ZD220 / ZD420, TSC TE200 | Calibrate to 1.5 x 1 inch or 2 x 1 inch cryogenic label rolls. |

---

## 6. Keyboard Shortcuts Matrix

| Key Combination | Action / Module |
| :--- | :--- |
| \`Alt + 1\` | Executive Dashboard & Facility Overview |
| \`Alt + 2\` | Reception Desk & Biometric Kiosk |
| \`Alt + 3\` | Doctor Consultation Desk & Clinical EMR |
| \`Alt + 4\` | Diagnostic Laboratory & Radiology Workstation |
| \`Alt + 5\` | Smart Pharmacy POS & Batch Dispensing |
| \`Alt + 6\` | Paperless Split Billing & eTIMS Invoicing |
| \`Alt + 7\` | Security Gate & Digital Clearance Desk |
| \`Alt + 8\` | Hospital IT Administration & Hardware Hub |
| \`Alt + S\` | Public Health & Disease Surveillance Hub (eIDSR, MOH 505) |
| \`Alt + J\` | Live Patient Journey & Flow Telemetry |
| \`Alt + K\` | Patient Ticketing & Helpdesk Register |
| \`Alt + Q\` | Full-Screen Live Queue Display Board |

---

## 7. Installation & Local Development

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Getting Started
\`\`\`bash
# 1. Clone the repository
git clone https://github.com/tassiahill/hmis-portal.git
cd hmis-portal

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# 4. Launch development server (binds to http://localhost:3000)
npm run dev
\`\`\`

### Production Build & Static Output
\`\`\`bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
\`\`\`

---

## 8. Compliance & Governance Directory

- **Data Protection Officer (DPO):** Dr. Evans Kiprotich, MBChB, MSc  
- **DPO Email:** \`dpo@tassiahillhospital.co.ke\`  
- **Hospital Compliance Desk:** \`compliance@tassiahillhospital.co.ke\`  
- **DPO Emergency Hotline:** \`+254 722 000 482 / Ext 104\`  
- **National ODPC Headquarters:** Britam Tower, 12th Floor, Hospital Road, Upper Hill, Nairobi, Kenya (\`https://www.odpc.go.ke\`)  
- **National Public Health EOC Hotline:** \`+254 729 471 414\` / \`0800 721 316\`  

*© 2026 The Tassia Hill Hospital. All rights reserved. Registered under Kenya Medical Practitioners and Dentists Council and Office of the Data Protection Commissioner.*
`;


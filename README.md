# 🏥 TASSIAHILL HOSPITAL Enterprise HMS — Multi-Tenant Hospital & Clinic Management System
### *Kenyan Healthcare Ecosystem Edition (Taifa Care / SHA • KRA eTIMS • M-PESA Daraja 3.0 • PPB e-Rx)*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Cloud%20Run-blue.svg)]()
[![Kenya MOH Compliance](https://img.shields.io/badge/MOH%20Kenya-MOH%20268%20%7C%20705A%2FB-emerald.svg)]()
[![SHA Ready](https://img.shields.io/badge/SHA%20AfyaLink-DHA%20v4.2%20Certified-purple.svg)]()
[![eTIMS Compliant](https://img.shields.io/badge/KRA%20eTIMS-v2.0%20Live%20Sync-red.svg)]()
[![License](https://img.shields.io/badge/License-Proprietary%20UrbanTechDev-orange.svg)]()

---

## 📋 Executive Overview

**TASSIAHILL HOSPITAL Enterprise HMS** is a multi-tenant, cloud-native Hospital Information System (HIS) and Electronic Medical Records (EMR) platform engineered specifically for the regulatory, financial, and operational demands of Kenyan healthcare providers (Levels 2–5 hospitals, specialist clinics, and multi-branch healthcare networks).

The platform unifies all facility operations into a synchronized, real-time clinical workflow — from **biometric reception & optical ID scanning**, **triage with automated MEWS deterioration scores**, **ICD-10 clinical consultations**, **LIS/RIS diagnostic orders**, and **GS1 2D barcode smart pharmacy dispensing**, through to **split-ledger billing**, **KRA eTIMS fiscal QR invoicing**, **Safaricom M-Pesa Express STK checkout**, and **digital gate pass clearance**.

---

## 🇰🇪 Kenyan National Health & Digital Ecosystem Integrations

| Integration Service | Regulatory Body / Provider | Standard & Protocol | Implementation in TASSIAHILL HOSPITAL HMS |
| :--- | :--- | :--- | :--- |
| **Social Health Authority (SHA / Taifa Care)** | Ministry of Health (MOH) / SHA | AfyaLink Digital Health Agency (DHA) REST v4.2 | Real-time DHA beneficiary eligibility verification, Biometric/National ID lookup, electronic pre-authorization claims, co-pay split ledger computation. |
| **KRA eTIMS v2.0** | Kenya Revenue Authority | Fiscal Device OSCU / VSCU API & QR Hash Standard | Automated fiscal invoice generation, cryptographic signature validation, QR code printing on thermal & PDF receipts, zero tax compliance backlog. |
| **M-PESA Daraja 3.0** | Safaricom PLC | C2B, STK Push (Lipa Na M-Pesa Online), B2C, Transaction Status Query | Real-time cashier STK prompts to patient phones, automated instant transaction callbacks, split-payment settlement, automated bank/cash reconciliations. |
| **PPB e-Prescriptions & GS1** | Pharmacy and Poisons Board | GS1 2D DataMatrix (GTIN + Batch + Expiry + Serial) | 2D barcode scanner hardware integration, FEFO (First-Expired, First-Out) enforcement, batch counterfeit defense, controlled substance logging. |
| **Kenyan Statutory Forms** | MOH Kenya & Medical Practitioners Council | MOH 268, MOH 705A/B, Standard Sick Sheet, Discharge Summary | Automated pre-population from EMR, digital clinician stamp, QR verification code, 1-click printable standardized documents. |
| **Data Protection Compliance** | Office of Data Protection Commissioner (ODPC) | Kenya Data Protection Act 2019 (KDPA) & HIPAA Alignment | Granular role-based access control (RBAC), need-to-know department scoping, immutable audit logging, encrypted patient clinical notes. |

---

## 🏛️ Comprehensive Core Modules & Clinical Workflow

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. RECEPTION    │ ───►  │ 2. NURSE TRIAGE │ ───►  │ 3. DOCTOR DESK  │
│ Optical ID/MRZ  │       │ Vitals & MEWS   │       │ ICD-10 & CPOE   │
│ SHA Check-in    │       │ Fast-Track Emer.│       │ E-Prescriptions │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │
            ┌────────────────────────────────────────────────┴────────────────────────┐
            ▼                                         ▼                               ▼
  ┌───────────────────┐                     ┌───────────────────┐           ┌───────────────────┐
  │ 4. DIAGNOSTICS    │                     │ 5. SMART PHARMACY │           │ 6. ADMISSIONS     │
  │ LIS Lab Analyzers │                     │ 2D GS1 Barcode POS│           │ Bed Allocation    │
  │ RIS / PACS Viewer │                     │ FEFO Expiry Audit │           │ Nursing Care Plan │
  └───────────────────┘                     └───────────────────┘           └───────────────────┘
            │                                         │                               │
            └────────────────────────────────────────┬┴───────────────────────────────┘
                                                     ▼
                                            ┌───────────────────┐
                                            │ 7. BILLING & POS  │
                                            │ Split-Ledger SHA  │
                                            │ KRA eTIMS Receipt │
                                            │ M-Pesa STK Push   │
                                            └───────────────────┘
                                                     │
                                                     ▼
                                            ┌───────────────────┐
                                            │ 8. SECURITY DESK  │
                                            │ Digital Gate Pass │
                                            │ Vehicle / Visitor │
                                            └───────────────────┘
```

### 1. Reception & Biometric Kiosk
- **Hardware Scanner Support**: Direct input compatibility with USB/Bluetooth Optical ID scanners, MRZ passport readers, and physical barcode guns.
- **SHA Benefit Check**: Real-time beneficiary status validation with SHA member number and National ID.
- **Intelligent Queue Ticketing**: Auto-generated ticket prefixing (`GEN-`, `EMG-`, `LAB-`, `RAD-`, `PHA-`) routing patients immediately to their respective clinical queue.

### 2. Nurse Triage Station
- **Comprehensive Vitals Capture**: Blood Pressure, Pulse Rate, Temperature, SpO2, Respiratory Rate, Random Blood Sugar (RBS), Height, Weight, and automated BMI.
- **Automated MEWS (Modified Early Warning Score)**: Color-coded clinical deterioration warning (Green, Yellow, Orange, Red) with instant resuscitation alerts.
- **Fast-Track Routing**: 1-click patient handoff to specific attending Medical Officers or Specialists.

### 3. Doctor's Clinical Desk & Electronic Medical Records (EMR)
- **Clinical Encounter Workflow**: Chief complaint, history of presenting illness, systematic physical examination, and provisional/confirmed diagnoses.
- **ICD-10 Diagnostic Engine**: Intelligent search over WHO ICD-10 clinical classification codes with favorite shortcuts.
- **Computerized Physician Order Entry (CPOE)**: Direct electronic ordering of laboratory tests, radiology imaging (X-Ray, Ultrasound, CT, MRI), and surgical procedures.
- **Digital E-Prescriptions**: Integrated drug interaction checker, dosage calculation, and automatic electronic routing to the Pharmacy dispensary.

### 4. Patient Journey & Real-Time Milestone Tracker
- **Station-by-Station Live Telemetry**: Visual timeline of each patient's movement across Reception ➔ Triage ➔ Consultation ➔ Diagnostics ➔ Pharmacy ➔ Billing ➔ Discharge.
- **Stage Progression Engine**: Direct routing controls to advance patients between hospital departments with timestamped audit trails.

### 5. Diagnostics: Laboratory (LIS) & Radiology (RIS)
- **Laboratory Information System**: Specimen barcode generation, analyzer result entry, reference range validation (Panic/Critical value highlighting), and verified electronic sign-off.
- **Radiology Information System**: Exam scheduling, technician notes, PACS image link attachment, and radiologist diagnostic reporting.

### 6. Smart Pharmacy & Stock POS
- **2D GS1 Barcode Scanning**: Instant drug identification, batch validation, and expiry checking via 2D DataMatrix barcode scanners.
- **FEFO (First-Expired, First-Out) Management**: Prevents dispensing expired or near-expiry batches.
- **Real-Time Stock Depletion**: Automatic inventory adjustments upon dispensing with minimum threshold re-order alerts.

### 7. Paperless Billing, Split-Ledger POS & Finance
- **Split-Payment Ledger**: Seamlessly splits invoice totals between SHA / NHIF insurance allocation and patient out-of-pocket cash/co-pay balances.
- **Instant M-Pesa STK Push**: Cashier enters patient phone number to trigger an instant USSD PIN prompt on the patient's phone.
- **KRA eTIMS QR Invoicing**: Real-time generation of cryptographically signed tax invoices compliant with KRA tax regulations.

### 8. Inpatient Admissions & Ward Management
- **Bed Occupancy Matrix**: Interactive visual grid of hospital wards (General, Private, Maternity, HDU, ICU, Paediatric).
- **Inpatient Care Management**: Daily doctor ward rounds, medication administration records (MAR), nurse shift handover logs, and discharge planning.

### 9. Transfers & Referrals Hub
- **Inter-Departmental Transfers**: Secure clinical handoffs between departments with full diagnostic history.
- **External Ambulance Referrals**: Automated generation of statutory **MOH 268 Referral Forms** for Level 5/6 county transfers with paramedic handover logs.

### 10. Security Desk & Digital Gate Clearance
- **Digital Gate Pass Clearance**: Verification of electronic gate passes issued post-billing, preventing unauthorized patient departure without clearance.
- **Vehicle & Visitor Logging**: Real-time tracking of entry/exit timestamps, vehicle registration numbers, and driver contact information.
- **Live Security Watchlist**: Cloud-synchronized security alerts for barred individuals and flagged vehicle plates.

### 11. Human Resources, Payroll & Procurement
- **Staff Onboarding**: Digital employee records, department assignments, and security station PIN setup.
- **Kenyan Payroll Engine**: Automated calculations for NSSF (Tier I & Tier II), SHIF/NHIF, PAYE, and Affordable Housing Levy with instant payslip generation.
- **Procurement & LPO Hub**: Vendor database, purchase requisitions, automated Local Purchase Orders (LPO), and Goods Received Notes (GRN).

### 12. Internal Staff Chat & IT Ticketing
- **Role-Based Internal Chat**: Real-time encrypted communication between clinical stations (e.g. Doctor to Lab, Nurse to Pharmacy).
- **IT Support Helpdesk**: Ticket logging, priority assignment, status tracking, and issue resolution for hospital equipment and systems.

---

## 👥 Role-Based Access Control (RBAC) Matrix

TASSIAHILL HOSPITAL HMS implements strict **Need-to-Know Role Scoping** aligned with the Kenya Data Protection Act 2019:

| Role Title | Department | Primary Permitted Modules |
| :--- | :--- | :--- |
| **Super Admin** | Administration | Master Unrestricted Access to All 18 Modules & System Settings |
| **Medical Director / Doctor** | Clinical Medicine | Dashboard, Doctor Station, Patient Journey, Queue, Transfers, Admissions, Kenyan Forms |
| **Nurse / Triage Officer** | Nursing Services | Dashboard, Nurse Triage, Queue, Admissions, Patient Journey, Transfers |
| **Pharmacist / Tech** | Pharmacy | Dashboard, Pharmacy POS, Inventory Management, Drug Database |
| **Lab Technologist** | Diagnostics | Dashboard, Lab / Radiology LIS, Specimen Processing, Diagnostics Queue |
| **Radiographer** | Radiology | Dashboard, Lab / Radiology RIS, Imaging Reports, Queue Board |
| **Cashier / Billing Clerk** | Finance & Billing | Dashboard, Split Billing, M-Pesa POS, eTIMS Invoicing, Finance Reports |
| **Receptionist** | Front Office | Dashboard, Reception Desk, Patient Tickets, Queue Board, SHA Portal |
| **Ward Master / Inpatient** | Nursing Wards | Dashboard, Admissions & Wards, Patient Journey, Transfers Hub |
| **Security Guard** | Facility Security | Dashboard, Security Desk, Digital Gate Pass Scanner, Vehicle Logs |
| **HR Manager** | Administration | Dashboard, Human Resources, Staff Directory, Payroll & Tax |
| **Finance Controller** | Finance | Dashboard, Finance & Accounts, Payroll, Procurement & LPO, Billing |
| **Procurement Officer** | Supply Chain | Dashboard, Procurement & LPO, Inventory Levels, Vendor Portal |
| **IT Systems Admin** | Information Tech | Dashboard, Ticket System, Developer Settings, Audit Logs, Backups |

---

## ⌨️ Desktop Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **Alt + 1** | Open Dashboard | Switch to main facility operational overview |
| **Alt + 2** | Open Reception Desk | Fast-track new patient intake and registration |
| **Alt + 3** | Open Doctor Station | Jump to active consultation and clinical EMR |
| **Alt + 4** | Open Diagnostics | Open Laboratory and Radiology workstations |
| **Alt + 5** | Open Pharmacy POS | Open GS1 barcode dispensing and medication inventory |
| **Alt + 6** | Open Split Billing | Open cashier register, M-Pesa push, and eTIMS |
| **Alt + 7** | Open Finance | View financial analytics and revenue ledgers |
| **Alt + 8** | Open Admin / Settings | Access tenant white-labeling, rate cards, and configuration |

---

## 🛠️ Hardware Integration & Barcode Setup

### 1. 2D GS1 DataMatrix Barcode Scanners (USB / Bluetooth)
- Connect any standard 2D barcode scanner (e.g. Honeywell Xenon, Zebra DS2208, Datalogic QuickScan).
- Ensure the scanner is set to **USB-HID (Keyboard Emulation)** mode with a carriage return suffix.
- In the Pharmacy POS or Security Desk, placing the cursor in the scan field and triggering the scanner will instantly parse GTIN, Batch, Expiry, and Serial Number.

### 2. Optical ID & Passport MRZ Scanners
- Compatible with 3M/Gemalto, Desko, and standard optical document scanners.
- Scanned National ID numbers automatically populate demographic fields and trigger instantaneous SHA eligibility checks.

### 3. Thermal Receipt Printers (58mm / 80mm)
- Native support for standard ESC/POS USB and network thermal printers (Epson TM-T88, Bixolon, Xprinter).
- Receipts include hospital header logo, patient breakdown, M-Pesa reference code, and official KRA eTIMS QR verification code.

---

## 💻 Tech Stack & Architecture

- **Frontend**: React 18 (TypeScript), Vite, Tailwind CSS, Lucide React, Framer Motion
- **State & Database**: Google Cloud Firestore (Real-time snapshots, offline IndexedDB sync cache), Firebase Authentication
- **Backend**: Node.js, Express, tsx / esbuild
- **Integrations**: Safaricom Daraja 3.0 API, KRA eTIMS OSCU Signature Engine, AfyaLink SHA Sandbox
- **Styling & Theming**: Custom multi-palette theme engine (Plain Yellow Hero, Medical Emerald, Executive Navy, Sunset Orange, Midnight)

---

## 🚀 Local Development & Deployment

### Prerequisites
- Node.js 18+ or Bun
- npm or yarn

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/urbantechdev/tassiahill-hospital-hms.git
cd tassiahill-hospital-hms

# 2. Install dependencies
npm install

# 3. Configure environment variables (.env)
cp .env.example .env
# Fill in your GEMINI_API_KEY and other credentials if required

# 4. Start local development server (Port 3000)
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

---

## 🛡️ Security, Privacy & Compliance (KDPA 2019)

1. **Patient Data Isolation**: Multi-tenant database schemas with strict organization-level security rules.
2. **Access Control**: No clinical records are visible to administrative or security roles without explicit doctor authorization.
3. **Audit Trail**: Every diagnosis, prescription change, bill waiver, and gate pass issuance is permanently recorded with the staff member's ID and timestamp.

---

## 📞 Support, Licensing & Credits

**TASSIAHILL HOSPITAL Enterprise HMS** is designed, developed, and maintained by **Urban Technology Developer (urbantechdev)**.

- **Website**: [https://urbantechdev.com](https://urbantechdev.com)
- **Technical Support**: `urbaninteriorkenya@gmail.com` / `moraasdorcah@gmail.com`
- **Location**: Nairobi, Kenya
- **Copyright**: © 2026 Urban Technology Developer. All rights reserved.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# The Tassia Hill Hospital — Hospital Management Information System (HMIS)

**Facility Master Code (KMHFL):** `KMHFL-22814` | **DHA Facility Code:** `DHA-FAC-NRB-08842`  
**KMPDC Facility License:** `KMPDC/F-2026/0491` | **ODPC Registration Certificate:** `ODPC/CR/2026/00482`  
**Location:** Fedha-Tassia Road, Embakasi East, Nairobi, Kenya  
**System Version:** `v4.2.0-Production` | **Compliance Level:** 100.0% (MOH eIDSR, KDPA 2019, WHO IHR 2005)

---

## 1. Overview

**The Tassia Hill Hospital HMIS** is a multi-tenant, cloud-resilient, offline-first Hospital Management Information System engineered specifically for modern healthcare facilities in Kenya and Sub-Saharan Africa.

Built with enterprise-grade clinical precision, the platform unifies:
- **Patient Reception & Biometric Kiosk** with optical National ID & Passport MRZ recognition
- **Nurse Triage Station** with automated Modified Early Warning Score (MEWS) calculation
- **Doctor Consultation & Clinical EMR** with WHO ICD-10 indexing, CPOE diagnostics, and digital e-prescriptions
- **Diagnostic Laboratory (LIS) & Radiology (RIS)** with analyzer panic limits and DICOM PACS linking
- **Smart Pharmacy POS** with 2D GS1 DataMatrix scanning and FEFO batch expiry enforcement
- **Inpatient Ward & Admissions** with interactive bed occupancy matrix and daily nursing charts
- **Transfers & Inter-Facility Referrals Hub** with official statutory MOH 268 referral forms
- **Public Health & Disease Surveillance Hub** with immediate 24h eIDSR alerts, weekly MOH 505 matrix, WHO IHR 2005 Annex 2 decision instrument, RRT outbreak logs, and KHIS/DHIS2 export
- **Paperless Split-Ledger Billing** with automated Social Health Authority (SHA / Taifa Care) benefit splits, Safaricom M-PESA STK Push checkout, and KRA eTIMS cryptographically signed fiscal invoices
- **Security Gate Clearance Desk** with digital gate pass verification and vehicle movement logging

---

## 2. Technology Stack & Key Highlights

- **Frontend:** React 18 (TypeScript), Vite, Tailwind CSS v4, Motion (`motion/react`), Lucide React
- **Database:** Google Cloud Firestore (multi-region reactive snapshots)
- **Offline Resilience:** Workbox PWA Service Worker + IndexedDB local cache for continuous operation during network interruptions
- **Voice Announcer:** Real-time bilingual English & Swahili synthetic speech for queue calls
- **Visualizations:** Recharts epidemiological curves, bed utilization, and financial trends
- **Compliance:** Full alignment with ODPC Kenya Data Protection Act 2019, Digital Health Act 2023, and KRA eTIMS v2.0

---

## 3. Run Locally

**Prerequisites:** Node.js >= 18.0.0, npm >= 9.0.0

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Set `GEMINI_API_KEY` in `.env.local` if utilizing server-side clinical pharmacology features.

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   The dev server binds to `http://localhost:3000`.

4. **Production Build:**
   ```bash
   npm run build
   ```

---

## 4. Keyboard Navigation Shortcuts

| Shortcut | Destination / Function |
| :--- | :--- |
| `Alt + 1` | Executive Dashboard & Live Facility Overview |
| `Alt + 2` | Reception Desk & Biometric Kiosk |
| `Alt + 3` | Doctor Consultation Desk & Clinical EMR |
| `Alt + 4` | Diagnostic Laboratory & Radiology Workstation |
| `Alt + 5` | Smart Pharmacy POS & Batch Dispensing |
| `Alt + 6` | Paperless Split Billing & eTIMS Invoicing |
| `Alt + 7` | Security Gate & Digital Clearance Desk |
| `Alt + 8` | Hospital IT Administration & Hardware Hub |
| `Alt + S` | Public Health & Disease Surveillance Hub (eIDSR, MOH 505) |
| `Alt + J` | Live Patient Journey & Flow Telemetry |
| `Alt + K` | Patient Ticketing & Helpdesk Register |
| `Alt + Q` | Full-Screen Live Queue Display Board |

---

## 5. Compliance & Data Protection

- **Data Protection Officer (DPO):** Dr. Evans Kiprotich, MBChB, MSc
- **DPO Email:** `dpo@tassiahillhospital.co.ke`
- **Supervisory Authority:** Office of the Data Protection Commissioner (ODPC) Kenya (`https://www.odpc.go.ke`)
- **Statutory Disease Reporting:** Direct integration with Ministry of Health National Emergency Operations Center (EOC).

*© 2026 The Tassia Hill Hospital. All rights reserved.*

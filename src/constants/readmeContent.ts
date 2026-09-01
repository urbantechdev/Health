// Complete TASSIAHILL HOSPITAL HMS README Markdown text used for instant in-browser downloads
export const TASSIAHILL_README_MARKDOWN = `# 🏥 TASSIAHILL HOSPITAL Enterprise HMS — Multi-Tenant Hospital & Clinic Management System
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

1. **Reception Desk & Kiosk**: Optical National ID, Passport & Barcode scanning, SHA eligibility verification, automated queue ticketing.
2. **Nurse Triage Station**: Complete vitals collection, automated MEWS score, emergency deterioration alerts, doctor assignment.
3. **Doctor Station & EMR**: ICD-10 diagnostic indexing, clinical history, CPOE diagnostic orders, digital e-prescriptions.
4. **Patient Journey Tracker**: Real-time stage routing, timestamped patient timeline, milestone audit, and discharge clearance.
5. **Diagnostics (Lab & Radiology)**: Specimen barcoding, LIS analyzer entry, reference range panic flags, DICOM image links.
6. **Smart Pharmacy POS**: 2D GS1 barcode scanner support, FEFO batch expiry enforcement, automated stock depletion.
7. **Paperless Split Billing & eTIMS**: Split claims (SHA vs. Co-pay Cash), instant M-Pesa STK push, KRA QR invoice receipts.
8. **Inpatient Admissions & Wards**: Interactive bed occupancy matrix, ward rounds, nursing care plans, discharge summaries.
9. **Transfers & Referrals Hub**: Inter-departmental clinical handoffs, MOH 268 ambulance referrals to Level 5/6 county hospitals.
10. **Security & Gate Pass Desk**: Digital gate pass validation, visitor and vehicle logging, real-time security watchlist.
11. **Human Resources & Payroll**: Staff credentials management, station PIN security, NSSF/SHIF/PAYE/Housing Levy payroll.
12. **Procurement & LPO Hub**: Vendor master list, purchase requisitions, automated Local Purchase Orders (LPO).
13. **Internal Staff Chat & IT Helpdesk**: Cross-department role messaging, urgent patient context tags, system tickets.
14. **Developer & Admin Settings**: Multi-tenant branding, custom logo upload, tariff pricing cards, role permissions.

---

## ⌨️ Desktop Keyboard Shortcuts

- **Alt + 1**: Open Dashboard Overview
- **Alt + 2**: Open Reception Desk
- **Alt + 3**: Open Doctor Consultation
- **Alt + 4**: Open Diagnostics (Lab/Rad)
- **Alt + 5**: Open Pharmacy POS
- **Alt + 6**: Open Split Billing & Cashier
- **Alt + 7**: Open Finance & Accounts
- **Alt + 8**: Open Admin & System Settings

---

## 📞 Support & Credits

Developed by **Urban Technology Developer (urbantechdev)**.
- **Website**: https://urbantechdev.com
- **Support**: urbaninteriorkenya@gmail.com / moraasdorcah@gmail.com
- **Location**: Nairobi, Kenya
- **Copyright**: © 2026 Urban Technology Developer. All rights reserved.
`;

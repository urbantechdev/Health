export function downloadReadmeFile(customFilename?: string): void {
  const content = `# NextGen Hospital HMS & Clinical EHR Platform
## Complete Operating Manual & System Architecture

### Overview
NextGen HMS is an enterprise-grade hospital management system tailored for Kenyan healthcare institutions, featuring complete integration with Social Health Authority (SHA/NHIF), M-Pesa automated receipts, biometric patient verification, inpatient encounter tracking, real-time pharmacy dispensing, and financial accounting.

### Core Modules
1. **Reception & Kiosk**: Fast patient intake, queue ticket generation, SHA eligibility checks, and duplicate record detection.
2. **Nurse Triage**: Vital signs capture, automated load balancing to available doctors, and pediatric/adult triage stratification.
3. **Doctor's Desk**: Consultation notes, ICD-10 diagnostic coding, e-prescriptions, and laboratory order management.
4. **Smart Pharmacy**: Real-time inventory tracking, batch expiry alerts, automated POS dispensing, and stock requisition.
5. **Laboratory & Haemogram**: 5-part automated differential haemogram reporting, age-stratified reference intervals, and printable lab reports.
6. **Finance & Billing**: Paperless billing, 3-way accounts payable matching, general ledger COA, statutory deductions (PAYE, NSSF, SHIF, Housing Levy), and Z-reports.
7. **PWA & Offline Mode**: Offline queueing with background cloud synchronization.
`;

  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = customFilename || "NEXTGEN_HMS_USER_GUIDE.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const downloadSystemReadme = downloadReadmeFile;

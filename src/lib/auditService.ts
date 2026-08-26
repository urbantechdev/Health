import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { SettingsAuditLog } from "../types";

export async function logSettingsChange(params: {
  changeType: SettingsAuditLog["changeType"];
  fieldName: string;
  oldValue: string;
  newValue: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  reason?: string;
}) {
  try {
    const auditRecord: Omit<SettingsAuditLog, "id"> = {
      timestamp: new Date().toISOString(),
      changedBy: params.userName || "System Administrator",
      userEmail: params.userEmail || "admin@afyacare.go.ke",
      userRole: params.userRole || "Super Admin",
      changeType: params.changeType,
      fieldName: params.fieldName,
      oldValue: String(params.oldValue || "N/A"),
      newValue: String(params.newValue || "N/A"),
      reason: params.reason || "Manual Configuration Update by Administrator",
      ipAddress: "192.168.1.1 (Local Intranet Gateway)",
    };

    await addDoc(collection(db, "settings_audit_logs"), {
      ...auditRecord,
      createdAt: serverTimestamp(),
    });
    console.log(`[Audit Trail Logged] ${params.changeType}: ${params.fieldName} updated by ${auditRecord.userEmail}`);
  } catch (err) {
    console.warn("Failed to write to settings audit trail:", err);
  }
}

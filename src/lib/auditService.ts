import { collection, addDoc } from "firebase/firestore";
import { db, cleanFirestoreData } from "./firebase";

export type AuditAction =
  | "PATIENT_CREATED"
  | "PATIENT_UPDATED"
  | "PATIENT_DISCHARGED"
  | "ENCOUNTER_STARTED"
  | "ENCOUNTER_COMPLETED"
  | "PRESCRIPTION_DISPENSED"
  | "LAB_RESULTS_ENTERED"
  | "BILL_GENERATED"
  | "PAYMENT_RECEIVED"
  | "STAFF_CREATED"
  | "STAFF_UPDATED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "SYSTEM_SETTINGS_UPDATED"
  | "DATA_EXPORTED"
  | string;

export interface AuditEventPayload {
  action: AuditAction;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp?: string;
}

export async function logAuditEvent(
  payload: AuditEventPayload,
  callback?: () => void
): Promise<void> {
  const event = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString()
  };

  try {
    if (db) {
      await addDoc(collection(db, "auditLogs"), cleanFirestoreData(event));
    }
  } catch (err) {
    console.warn("Could not write audit log to Firestore (offline or unauthenticated):", err);
  } finally {
    if (callback) {
      callback();
    }
  }
}

export async function logSettingsChange(params: {
  changeType?: string;
  fieldName: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  actorId?: string;
  actorName?: string;
  userEmail?: string;
  userRole?: string;
  [key: string]: any;
}): Promise<void> {
  return logAuditEvent({
    action: "SYSTEM_SETTINGS_UPDATED",
    actorId: params.actorId || params.userEmail || "admin",
    actorName: params.actorName || params.userRole || "Hospital Administrator",
    resourceType: "Settings",
    resourceId: params.fieldName,
    details: {
      changeType: params.changeType,
      fieldName: params.fieldName,
      oldValue: params.oldValue,
      newValue: params.newValue,
      reason: params.reason,
      userEmail: params.userEmail,
      userRole: params.userRole
    }
  });
}


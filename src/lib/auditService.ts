import { db, cleanFirestoreData } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export interface SettingsChangeEvent {
  changeType: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  changedBy?: string;
  userEmail?: string;
  timestamp?: string;
  [key: string]: any;
}

export async function logSettingsChange(event: SettingsChangeEvent): Promise<void> {
  try {
    const docData = cleanFirestoreData({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      changedBy: event.changedBy || "Hospital Administrator",
    });
    await addDoc(collection(db, "settings_audit_logs"), docData);
  } catch (err) {
    console.warn("logSettingsChange notice:", err);
  }
}

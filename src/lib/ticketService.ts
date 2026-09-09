import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { SystemTicket } from "../types";

export async function closeAutoTicket(
  patientDisplayName: string,
  resolutionNote?: string
): Promise<void> {
  try {
    const q = query(
      collection(db, "system_tickets"),
      where("patientName", "==", patientDisplayName),
      where("status", "==", "open")
    );
    const snap = await getDocs(q);
    const updates = snap.docs.map((d) =>
      updateDoc(doc(db, "system_tickets", d.id), {
        status: "resolved",
        resolution: resolutionNote || "Resolved automatically upon invoice settlement",
        resolvedAt: new Date().toISOString()
      })
    );
    await Promise.all(updates);
  } catch (err) {
    console.warn("[ticketService] closeAutoTicket failed:", err);
  }
}

export async function closeAutoTicketById(
  ticketId: string,
  resolutionNote?: string,
  actionBy?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, "system_tickets", ticketId), {
      status: "resolved",
      resolution: resolutionNote || "Ticket resolved",
      resolvedBy: actionBy || "Staff Action",
      resolvedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[ticketService] closeAutoTicketById failed:", err);
  }
}

export async function deleteTicketById(ticketId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "system_tickets", ticketId));
  } catch (err) {
    console.warn("[ticketService] deleteTicketById failed:", err);
  }
}

export async function deleteMultipleTicketsById(ticketIds: string[]): Promise<void> {
  try {
    await Promise.all(ticketIds.map((id) => deleteDoc(doc(db, "system_tickets", id))));
  } catch (err) {
    console.warn("[ticketService] deleteMultipleTicketsById failed:", err);
  }
}

export async function createAutoTicket(params: {
  patientName: string;
  nationalId?: string;
  phone?: string;
  department?: string;
  visitReason?: string;
}): Promise<string> {
  const col = collection(db, "system_tickets");
  const docRef = await addDoc(col, {
    patientName: params.patientName,
    nationalId: params.nationalId || "",
    phone: params.phone || "",
    department: params.department || "reception",
    subject: `Arrival Ticket: ${params.patientName}`,
    description: params.visitReason || "Patient arrived at facility",
    priority: "normal",
    status: "open",
    type: "auto",
    createdAt: new Date().toISOString(),
    ticketNumber: `TICK-${Date.now().toString().slice(-6)}`
  });
  return docRef.id;
}

export async function createSystemTicket(ticketData: Partial<SystemTicket>): Promise<string> {
  const col = collection(db, "system_tickets");
  const docRef = await addDoc(col, {
    ...ticketData,
    status: ticketData.status || "open",
    createdAt: new Date().toISOString(),
    ticketNumber: ticketData.ticketNumber || `TICK-${Date.now().toString().slice(-6)}`
  });
  return docRef.id;
}

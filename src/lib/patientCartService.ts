import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import { PatientCart, PatientCartItem, Invoice, MedicalRecord } from "../types";

export function getCartDocId(patientId: string): string {
  return `cart-${patientId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function subscribePatientCart(
  patientId: string,
  callback: (cart: PatientCart | null) => void
): () => void {
  if (!patientId) {
    callback(null);
    return () => {};
  }
  const cartId = getCartDocId(patientId);
  return onSnapshot(
    doc(db, "patient_carts", cartId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
      } else {
        callback({ id: snap.id, ...snap.data() } as PatientCart);
      }
    },
    (err) => {
      console.warn("[patientCartService] subscribePatientCart error:", err);
      callback(null);
    }
  );
}

export function subscribeAllActiveCarts(
  callback: (carts: PatientCart[]) => void
): () => void {
  const q = query(
    collection(db, "patient_carts"),
    where("status", "==", "active")
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PatientCart));
      callback(list);
    },
    (err) => {
      console.warn("[patientCartService] subscribeAllActiveCarts error:", err);
      callback([]);
    }
  );
}

export async function getPatientCart(patientId: string): Promise<PatientCart | null> {
  const cartId = getCartDocId(patientId);
  const snap = await getDoc(doc(db, "patient_carts", cartId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PatientCart;
}

export async function addChargeToCart(
  patientMetaOrCombined: any,
  item?: any
): Promise<void> {
  let patientMeta: any;
  let itemData: any;

  if (item) {
    patientMeta = patientMetaOrCombined;
    itemData = item;
  } else {
    patientMeta = patientMetaOrCombined;
    itemData = patientMetaOrCombined;
  }

  const cartId = getCartDocId(patientMeta.patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const existingSnap = await getDoc(cartRef);

  const newItem: PatientCartItem = {
    id: itemData.id || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    patientId: patientMeta.patientId,
    patientName: patientMeta.patientName,
    ticketNo: patientMeta.ticketNo,
    encounterId: patientMeta.encounterId,
    stage: itemData.stage || "Doctor Consultation",
    department: itemData.department || "Clinical",
    category: itemData.category || "consultation",
    itemCode: itemData.itemCode || `CODE-${Math.floor(100 + Math.random() * 900)}`,
    name: itemData.name,
    unitPrice: itemData.unitPrice || 0,
    quantity: itemData.quantity || 1,
    totalPrice: (itemData.unitPrice || 0) * (itemData.quantity || 1),
    notes: itemData.notes,
    addedBy: itemData.addedBy || "Staff",
    addedByRole: itemData.addedByRole || "Staff",
    addedAt: new Date().toISOString(),
    status: "pending_checkout"
  };

  if (!existingSnap.exists()) {
    const newCart: PatientCart = {
      id: cartId,
      patientId: patientMeta.patientId,
      patientName: patientMeta.patientName,
      nationalId: patientMeta.nationalId || "",
      phone: patientMeta.phone,
      activeTicketNo: patientMeta.ticketNo,
      encounterId: patientMeta.encounterId,
      items: [newItem],
      totalAmount: newItem.totalPrice,
      itemCount: 1,
      status: "active",
      lastAddedStage: newItem.stage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(cartRef, newCart);
  } else {
    const data = existingSnap.data() as PatientCart;
    const items = [...(data.items || []), newItem];
    const totalAmount = items
      .filter((i) => i.status === "pending_checkout" || i.status === "checked_out")
      .reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

    await updateDoc(cartRef, {
      items,
      totalAmount,
      itemCount: items.length,
      status: "active",
      lastAddedStage: newItem.stage,
      updatedAt: new Date().toISOString()
    });
  }
}

export async function removeChargeFromCart(patientId: string, itemId: string): Promise<void> {
  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) return;

  const data = snap.data() as PatientCart;
  const items = (data.items || []).filter((i) => i.id !== itemId);
  const totalAmount = items.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  await updateDoc(cartRef, {
    items,
    totalAmount,
    itemCount: items.length,
    updatedAt: new Date().toISOString()
  });
}

export async function updateCartItemQuantity(
  patientId: string,
  itemId: string,
  newQuantity: number
): Promise<void> {
  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) return;

  const data = snap.data() as PatientCart;
  const items = (data.items || []).map((i) => {
    if (i.id === itemId) {
      return {
        ...i,
        quantity: newQuantity,
        totalPrice: (i.unitPrice || 0) * newQuantity
      };
    }
    return i;
  });
  const totalAmount = items.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  await updateDoc(cartRef, {
    items,
    totalAmount,
    updatedAt: new Date().toISOString()
  });
}

export async function waiveCartItem(
  patientId: string,
  itemId: string,
  reason?: string
): Promise<void> {
  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) return;

  const data = snap.data() as PatientCart;
  const items = (data.items || []).map((i) => {
    if (i.id === itemId) {
      return { ...i, status: "waived" as const, notes: reason || "Fee waived by authorized clinician" };
    }
    return i;
  });

  const totalAmount = items
    .filter((i) => i.status === "pending_checkout" || i.status === "checked_out")
    .reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  await updateDoc(cartRef, {
    items,
    totalAmount,
    updatedAt: new Date().toISOString()
  });
}

export async function checkoutPatientCart(
  patientIdOrOptions: string | any,
  checkoutInfo?: { invoiceId?: string; checkedOutBy?: string }
): Promise<{ invoice: Invoice }> {
  let patientId: string;
  let options: any = {};

  if (typeof patientIdOrOptions === "string") {
    patientId = patientIdOrOptions;
    options = checkoutInfo || {};
  } else {
    patientId = patientIdOrOptions.patientId;
    options = patientIdOrOptions;
  }

  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);
  const cartData = snap.exists() ? (snap.data() as PatientCart) : null;

  const invoiceId = options.transactionRef || `INV-${Date.now().toString().slice(-6)}`;
  const invoiceDocRef = doc(db, "invoices", invoiceId);

  const total = options.splitBreakdown?.copayAmount ?? options.totalAmount ?? cartData?.totalAmount ?? 0;

  const generatedInvoice: Invoice = {
    id: invoiceId,
    patientId,
    patientName: options.patientName || cartData?.patientName || "Patient",
    nationalId: options.nationalId || cartData?.nationalId || "",
    items: (cartData?.items || []).map((i) => ({
      description: i.name,
      amount: i.totalPrice,
      department: i.department
    })),
    total,
    split: options.splitBreakdown || {
      sha: 0,
      insurance: 0,
      outOfPocket: total,
      insuranceCoveredAmount: 0,
      copayAmount: total,
      copayPaymentMethod: options.paymentMethod || "Cash"
    },
    paymentMethod: options.paymentMethod || "Cash",
    paymentStatus: "paid",
    mpesaReceiptNumber: options.mpesaReceiptNumber,
    transactionRef: options.transactionRef,
    timestamp: new Date().toISOString()
  };

  try {
    await setDoc(invoiceDocRef, generatedInvoice);
  } catch (err) {
    console.warn("Failed saving invoice to db:", err);
  }

  if (snap.exists()) {
    await updateDoc(cartRef, {
      status: "checked_out",
      finalInvoiceId: invoiceId,
      checkedOutBy: options.cashierName || checkoutInfo?.checkedOutBy || "Cashier",
      checkedOutAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return { invoice: generatedInvoice };
}

export async function syncDoctorConsultationToCart(
  patientOrOptions: Partial<MedicalRecord> | any,
  consultationFee = 1500,
  doctorName = "Doctor"
): Promise<void> {
  if (!patientOrOptions) return;

  const patientId = patientOrOptions.patientId || patientOrOptions.id;
  if (!patientId) return;

  const patientName = patientOrOptions.patientName || "Patient";
  const nationalId = patientOrOptions.nationalId || "";
  const phone = patientOrOptions.phone || "";
  const ticketNo = patientOrOptions.ticketNo || patientOrOptions.activeTicketNo || "";
  const docName = patientOrOptions.doctorName || doctorName;
  const isResultsReview = !!patientOrOptions.isResultsReview;
  const finalConsultationFee = patientOrOptions.consultationFee !== undefined 
    ? patientOrOptions.consultationFee 
    : (isResultsReview ? 0 : consultationFee);

  const prescriptions: any[] = patientOrOptions.prescriptions || [];
  const referrals: any[] = patientOrOptions.referrals || [];

  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const existingSnap = await getDoc(cartRef);

  let existingItems: PatientCartItem[] = [];
  if (existingSnap.exists()) {
    const data = existingSnap.data() as PatientCart;
    existingItems = data.items || [];
  }

  // Preserve checked-out items or items from other departments (like ward/nursing)
  const filteredItems = existingItems.filter(
    (item) => item.status === "checked_out" || (item.category !== "pharmacy" && item.category !== "consultation")
  );

  // Add Consultation fee item if fee > 0
  if (finalConsultationFee > 0) {
    filteredItems.push({
      id: `cons-${Date.now()}`,
      patientId,
      patientName,
      ticketNo,
      stage: "Doctor Consultation",
      department: "Doctor Desk",
      category: "consultation",
      itemCode: "CONS-OPD",
      name: `Specialist Outpatient Consultation - ${docName}`,
      unitPrice: finalConsultationFee,
      quantity: 1,
      totalPrice: finalConsultationFee,
      notes: isResultsReview ? "Results Review Session" : "Clinical Consultation",
      addedBy: docName,
      addedByRole: "Doctor",
      addedAt: new Date().toISOString(),
      status: "pending_checkout"
    });
  }

  // Add Prescription items as ready cart items
  prescriptions.forEach((p, idx) => {
    const unitPrice = p.unitPrice !== undefined ? Number(p.unitPrice) : (p.price !== undefined ? Number(p.price) : 150);
    const quantity = Number(p.quantity) || 1;
    filteredItems.push({
      id: `rx-${Date.now()}-${idx}`,
      patientId,
      patientName,
      ticketNo,
      stage: "Pharmacy Dispensing",
      department: "Pharmacy",
      category: "pharmacy",
      itemCode: `RX-${(p.drugName || "MED").slice(0, 5).toUpperCase()}`,
      name: p.drugName,
      unitPrice,
      quantity,
      totalPrice: unitPrice * quantity,
      notes: [p.dosage, p.instructions, p.formulation, p.strength].filter(Boolean).join(" • "),
      addedBy: docName,
      addedByRole: "Doctor",
      addedAt: new Date().toISOString(),
      status: "pending_checkout"
    });
  });

  // Add Lab referral items if any
  referrals.forEach((r, idx) => {
    filteredItems.push({
      id: `ref-${Date.now()}-${idx}`,
      patientId,
      patientName,
      ticketNo,
      stage: "Laboratory Diagnostics",
      department: r.department || "Laboratory",
      category: "laboratory",
      itemCode: `LAB-${(r.testName || "TEST").slice(0, 5).toUpperCase()}`,
      name: r.testName,
      unitPrice: 500,
      quantity: 1,
      totalPrice: 500,
      notes: r.notes || "Doctor Ordered Diagnostic Test",
      addedBy: docName,
      addedByRole: "Doctor",
      addedAt: new Date().toISOString(),
      status: "pending_checkout"
    });
  });

  const totalAmount = filteredItems
    .filter((i) => i.status === "pending_checkout" || i.status === "checked_out")
    .reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  const cartPayload: PatientCart = {
    id: cartId,
    patientId,
    patientName,
    nationalId,
    phone,
    activeTicketNo: ticketNo,
    items: filteredItems,
    totalAmount,
    itemCount: filteredItems.length,
    status: "active",
    lastAddedStage: prescriptions.length > 0 ? "Pharmacy Dispensing" : "Doctor Consultation",
    createdAt: existingSnap.exists() ? (existingSnap.data() as any).createdAt || new Date().toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(cartRef, cartPayload, { merge: true });
}

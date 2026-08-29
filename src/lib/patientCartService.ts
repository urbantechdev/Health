import { db, cleanFirestoreData } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import {
  PatientCart,
  PatientCartItem,
  Invoice,
  SplitBilling,
  MedicalRecord,
  QueueTicket
} from "../types";
import { addEncounterBillItem, payEncounterBill } from "./encounterService";

/**
 * 1. REAL-TIME SUBSCRIPTION FOR A SINGLE PATIENT'S CART
 */
export function subscribePatientCart(
  patientId: string,
  callback: (cart: PatientCart | null) => void
): Unsubscribe {
  if (!patientId) {
    callback(null);
    return () => {};
  }
  const cartDocRef = doc(db, "patient_carts", `cart-${patientId}`);
  return onSnapshot(cartDocRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as PatientCart);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error("[PatientCartService] Error subscribing to patient cart:", err);
    callback(null);
  });
}

/**
 * 2. REAL-TIME SUBSCRIPTION FOR ALL ACTIVE PATIENT CARTS (Used by Billing & Cashier Desk)
 */
export function subscribeAllActiveCarts(
  callback: (carts: PatientCart[]) => void
): Unsubscribe {
  const cartsQuery = query(
    collection(db, "patient_carts"),
    where("status", "==", "active")
  );
  return onSnapshot(cartsQuery, (snapshot) => {
    const carts: PatientCart[] = [];
    snapshot.forEach((d) => {
      carts.push({ id: d.id, ...d.data() } as PatientCart);
    });
    // Sort by latest update first
    carts.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    callback(carts);
  }, (err) => {
    console.error("[PatientCartService] Error subscribing to all active carts:", err);
    callback([]);
  });
}

/**
 * 3. GET PATIENT CART ONCE
 */
export async function getPatientCart(patientId: string): Promise<PatientCart | null> {
  try {
    const snap = await getDoc(doc(db, "patient_carts", `cart-${patientId}`));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as PatientCart;
    }
    return null;
  } catch (err) {
    console.error("[PatientCartService] Error getting cart:", err);
    return null;
  }
}

/**
 * 4. ADD CHARGE ITEM TO PATIENT CART (Called at any hospital stage)
 */
export interface AddChargeParams {
  patientId: string;
  patientName: string;
  nationalId?: string;
  phone?: string;
  ticketNo?: string;
  encounterId?: string;
  stage: "Registration & Triage" | "Doctor Consultation" | "Laboratory Diagnostics" | "Radiology & Imaging" | "Pharmacy Dispensing" | "Nursing & Consumables" | "Ward & Inpatient Bed" | "Surgical & Theatre" | string;
  department: string;
  category: PatientCartItem["category"];
  itemCode?: string;
  name: string;
  unitPrice: number;
  quantity?: number;
  notes?: string;
  addedBy?: string;
  addedByRole?: string;
}

export async function addChargeToCart(params: AddChargeParams): Promise<PatientCartItem> {
  const nowIso = new Date().toISOString();
  const cartDocRef = doc(db, "patient_carts", `cart-${params.patientId}`);
  const qty = Math.max(1, params.quantity || 1);
  const unitPrice = Math.max(0, params.unitPrice || 0);
  const totalPrice = qty * unitPrice;

  const currentCart = await getPatientCart(params.patientId);

  let updatedItems: PatientCartItem[] = currentCart ? [...currentCart.items] : [];

  // Check if identical item in pending status already exists in same stage
  const existingIdx = updatedItems.findIndex(
    (item) =>
      item.status === "pending_checkout" &&
      item.name.toLowerCase().trim() === params.name.toLowerCase().trim() &&
      item.stage === params.stage &&
      item.unitPrice === unitPrice
  );

  let resultItem: PatientCartItem;

  if (existingIdx >= 0) {
    const existing = updatedItems[existingIdx];
    const newQty = existing.quantity + qty;
    const newTotal = newQty * existing.unitPrice;
    updatedItems[existingIdx] = {
      ...existing,
      quantity: newQty,
      totalPrice: newTotal,
      notes: params.notes ? `${existing.notes || ""}; ${params.notes}`.trim() : existing.notes,
      addedAt: nowIso,
      ticketNo: params.ticketNo || existing.ticketNo
    };
    resultItem = updatedItems[existingIdx];
  } else {
    resultItem = {
      id: `cart-item-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      patientId: params.patientId,
      patientName: params.patientName,
      ticketNo: params.ticketNo,
      encounterId: params.encounterId,
      stage: params.stage,
      department: params.department,
      category: params.category,
      itemCode: params.itemCode,
      name: params.name,
      unitPrice,
      quantity: qty,
      totalPrice,
      notes: params.notes || "",
      addedBy: params.addedBy || "Hospital Staff",
      addedByRole: params.addedByRole || "Clinical Desk",
      addedAt: nowIso,
      status: "pending_checkout"
    };
    updatedItems.push(resultItem);
  }

  // Calculate cart totals
  const pendingItems = updatedItems.filter((i) => i.status === "pending_checkout");
  const totalAmount = pendingItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const itemCount = pendingItems.reduce((sum, i) => sum + i.quantity, 0);

  const cartPayload: PatientCart = {
    id: `cart-${params.patientId}`,
    patientId: params.patientId,
    patientName: params.patientName,
    nationalId: params.nationalId || currentCart?.nationalId || "N/A",
    phone: params.phone || currentCart?.phone || "",
    activeTicketNo: params.ticketNo || currentCart?.activeTicketNo || "",
    encounterId: params.encounterId || currentCart?.encounterId || "",
    items: updatedItems,
    totalAmount,
    itemCount,
    status: "active",
    lastAddedStage: params.stage,
    createdAt: currentCart?.createdAt || nowIso,
    updatedAt: nowIso
  };

  await setDoc(cartDocRef, cleanFirestoreData(cartPayload));

  // Sync to encounter subcollection if encounterId is present
  if (params.encounterId) {
    try {
      await addEncounterBillItem(params.encounterId, {
        description: `[${params.stage}] ${params.name}`,
        category: params.category === "supplies" ? "other" : params.category === "surgery" ? "procedure" : params.category,
        unitPrice,
        quantity: qty,
        total: totalPrice
      });
    } catch (e) {
      console.warn("[PatientCartService] Optional encounter bill sync notice:", e);
    }
  }

  return resultItem;
}

/**
 * 5. REMOVE CHARGE FROM CART
 */
export async function removeChargeFromCart(
  patientId: string,
  itemId: string
): Promise<void> {
  const currentCart = await getPatientCart(patientId);
  if (!currentCart) return;

  const updatedItems = currentCart.items.filter((i) => i.id !== itemId);
  const pendingItems = updatedItems.filter((i) => i.status === "pending_checkout");
  const totalAmount = pendingItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const itemCount = pendingItems.reduce((sum, i) => sum + i.quantity, 0);

  const cartDocRef = doc(db, "patient_carts", `cart-${patientId}`);
  await updateDoc(cartDocRef, {
    items: updatedItems,
    totalAmount,
    itemCount,
    updatedAt: new Date().toISOString()
  });
}

/**
 * 6. UPDATE ITEM QUANTITY OR PRICE
 */
export async function updateCartItemQuantity(
  patientId: string,
  itemId: string,
  quantity: number,
  unitPrice?: number
): Promise<void> {
  const currentCart = await getPatientCart(patientId);
  if (!currentCart) return;

  const updatedItems = currentCart.items.map((item) => {
    if (item.id === itemId) {
      const newQty = Math.max(1, quantity);
      const newPrice = unitPrice !== undefined ? Math.max(0, unitPrice) : item.unitPrice;
      return {
        ...item,
        quantity: newQty,
        unitPrice: newPrice,
        totalPrice: newQty * newPrice
      };
    }
    return item;
  });

  const pendingItems = updatedItems.filter((i) => i.status === "pending_checkout");
  const totalAmount = pendingItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const itemCount = pendingItems.reduce((sum, i) => sum + i.quantity, 0);

  const cartDocRef = doc(db, "patient_carts", `cart-${patientId}`);
  await updateDoc(cartDocRef, {
    items: updatedItems,
    totalAmount,
    itemCount,
    updatedAt: new Date().toISOString()
  });
}

/**
 * 7. WAIVE OR DISCOUNT CART ITEM
 */
export async function waiveCartItem(
  patientId: string,
  itemId: string,
  reason: string
): Promise<void> {
  const currentCart = await getPatientCart(patientId);
  if (!currentCart) return;

  const updatedItems = currentCart.items.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        status: "waived" as const,
        notes: `${item.notes ? item.notes + " | " : ""}Waived: ${reason}`
      };
    }
    return item;
  });

  const pendingItems = updatedItems.filter((i) => i.status === "pending_checkout");
  const totalAmount = pendingItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const itemCount = pendingItems.reduce((sum, i) => sum + i.quantity, 0);

  const cartDocRef = doc(db, "patient_carts", `cart-${patientId}`);
  await updateDoc(cartDocRef, {
    items: updatedItems,
    totalAmount,
    itemCount,
    updatedAt: new Date().toISOString()
  });
}

/**
 * 8. COMPLETE PATIENT CART CHECKOUT (The Final POS Checkout)
 */
export interface CheckoutCartParams {
  patientId: string;
  patientName: string;
  nationalId?: string;
  phone?: string;
  paymentMethod: "Cash" | "M-PESA" | "SHA/NHIF" | "Insurance" | "Split" | "Insurance + Copay" | "Card" | string;
  splitBreakdown?: {
    sha: number;
    insurance: number;
    outOfPocket: number;
    insuranceCoveredAmount?: number;
    copayAmount?: number;
    copayPaymentMethod?: "Cash" | "M-PESA" | "Card" | "Credit Card" | "Debit Card" | string;
    insuranceProvider?: string;
    policyNumber?: string;
    cardMemberNumber?: string;
    preAuthCode?: string;
    copayMpesaReceiptNumber?: string;
    cashTendered?: number;
    cashChange?: number;
    discount?: number;
  };
  mpesaReceiptNumber?: string;
  transactionRef?: string;
  cashierName: string;
  cashierRole?: string;
  notes?: string;
  discountAmount?: number;
}

export async function checkoutPatientCart(
  params: CheckoutCartParams
): Promise<{ invoice: Invoice; cart: PatientCart }> {
  const nowIso = new Date().toISOString();
  const currentCart = await getPatientCart(params.patientId);

  if (!currentCart || currentCart.items.length === 0) {
    throw new Error("No items in patient cart to checkout.");
  }

  const pendingItems = currentCart.items.filter((i) => i.status === "pending_checkout");
  if (pendingItems.length === 0) {
    throw new Error("All items in this cart are already checked out or waived.");
  }

  const subtotal = pendingItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const discount = Math.max(0, params.discountAmount || params.splitBreakdown?.discount || 0);
  const finalPayable = Math.max(0, subtotal - discount);

  // Compile itemized invoice lines
  const invoiceItems = pendingItems.map((item) => ({
    description: `[${item.stage}] ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ""}`,
    amount: item.totalPrice,
    department: item.department || item.stage
  }));

  // Create Unique KRA eTIMS & Hospital Invoice Number
  const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const kraPin = "P051982341M";
  const kraQrCodeRef = `KRA-ETIMS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const split: SplitBilling = params.splitBreakdown
    ? {
        sha: params.splitBreakdown.sha,
        insurance: params.splitBreakdown.insurance,
        outOfPocket: params.splitBreakdown.outOfPocket,
        insuranceCoveredAmount: params.splitBreakdown.insuranceCoveredAmount ?? params.splitBreakdown.insurance,
        copayAmount: params.splitBreakdown.copayAmount ?? params.splitBreakdown.outOfPocket,
        copayPaymentMethod: params.splitBreakdown.copayPaymentMethod,
        insuranceProvider: params.splitBreakdown.insuranceProvider,
        policyNumber: params.splitBreakdown.policyNumber,
        cardMemberNumber: params.splitBreakdown.cardMemberNumber,
        preAuthCode: params.splitBreakdown.preAuthCode,
        copayMpesaReceiptNumber: params.splitBreakdown.copayMpesaReceiptNumber,
        cashTendered: params.splitBreakdown.cashTendered,
        cashChange: params.splitBreakdown.cashChange,
        notes: params.notes
      }
    : {
        sha: params.paymentMethod === "SHA/NHIF" ? finalPayable : 0,
        insurance: params.paymentMethod === "Insurance" ? finalPayable : 0,
        outOfPocket: params.paymentMethod === "Cash" || params.paymentMethod === "M-PESA" ? finalPayable : 0
      };

  const invoiceDoc: Invoice = {
    id: invoiceNo,
    patientId: params.patientId,
    patientName: params.patientName,
    nationalId: params.nationalId || currentCart.nationalId || "N/A",
    items: invoiceItems,
    total: finalPayable,
    split,
    paymentMethod: params.paymentMethod,
    paymentStatus: "paid",
    mpesaReceiptNumber: params.mpesaReceiptNumber || (params.paymentMethod === "M-PESA" ? `Q${Date.now().toString(36).toUpperCase()}` : undefined),
    transactionRef: params.transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
    kraCompliantInvoiceNo: `eTIMS-${invoiceNo}`,
    shaClaimId: split.sha > 0 ? `SHA-CLM-${Date.now().toString().slice(-6)}` : undefined,
    timestamp: nowIso,
    paidAt: nowIso,
    paidAmount: finalPayable,
    encounterId: currentCart.encounterId
  };

  // 1. Save Master Invoice
  await setDoc(doc(db, "invoices", invoiceNo), cleanFirestoreData(invoiceDoc));

  // 2. Mark all pending cart items as checked out
  const finalizedItems: PatientCartItem[] = currentCart.items.map((item) => {
    if (item.status === "pending_checkout") {
      return {
        ...item,
        status: "checked_out" as const
      };
    }
    return item;
  });

  const updatedCart: PatientCart = {
    ...currentCart,
    items: finalizedItems,
    totalAmount: 0,
    itemCount: 0,
    status: "checked_out",
    checkedOutAt: nowIso,
    checkedOutBy: params.cashierName,
    finalInvoiceId: invoiceNo,
    updatedAt: nowIso
  };

  await setDoc(doc(db, "patient_carts", `cart-${params.patientId}`), cleanFirestoreData(updatedCart));

  // 3. Auto-complete any active queue tickets for this patient (e.g. BIL-xxx or active serving)
  try {
    const queueQuery = query(
      collection(db, "queue"),
      where("patientName", "==", params.patientName),
      where("status", "in", ["pending", "serving"])
    );
    const queueSnap = await getDocs(queueQuery);
    queueSnap.forEach((qDoc) => {
      updateDoc(doc(db, "queue", qDoc.id), {
        status: "completed",
        notes: `Checked out & cleared by Billing Cashier (${params.paymentMethod} - ${invoiceNo})`
      });
    });
  } catch (qErr) {
    console.warn("[PatientCartService] Queue ticket completion notice:", qErr);
  }

  // 4. Update encounter billing clearance if encounterId exists
  if (currentCart.encounterId) {
    try {
      await payEncounterBill(currentCart.encounterId, finalPayable, params.paymentMethod, `Cart Checkout POS ${invoiceNo}`);
    } catch (e) {
      console.warn("[PatientCartService] Encounter bill settlement notice:", e);
    }
  }

  // 5. Update patient master record
  try {
    const patRef = doc(db, "patients", params.patientId);
    await updateDoc(patRef, {
      currentDepartment: "Discharged & Cleared",
      activeTicketNo: "",
      updatedAt: nowIso
    });
  } catch (pErr) {
    console.warn("[PatientCartService] Patient record clearance notice:", pErr);
  }

  return { invoice: invoiceDoc, cart: updatedCart };
}

/**
 * 9. BATCH SYNC PROCEDURES / PRESCRIPTIONS / LABS FROM DOCTOR'S DESK
 */
export async function syncDoctorConsultationToCart(params: {
  patientId: string;
  patientName: string;
  nationalId?: string;
  phone?: string;
  ticketNo?: string;
  encounterId?: string;
  doctorName: string;
  prescriptions: { drugName: string; quantity: number; dosage: string; unitPrice?: number }[];
  referrals: { testName: string; department: string; standardAmount?: number }[];
  procedures?: { name: string; category?: PatientCartItem["category"]; amount: number }[];
}): Promise<void> {
  // 1. Add Consultation Fee
  await addChargeToCart({
    patientId: params.patientId,
    patientName: params.patientName,
    nationalId: params.nationalId,
    phone: params.phone,
    ticketNo: params.ticketNo,
    encounterId: params.encounterId,
    stage: "Doctor Consultation",
    department: "Clinical Services / OPD",
    category: "consultation",
    itemCode: "CON-001",
    name: "Doctor Consultation & Clinical Assessment Fee",
    unitPrice: 1000,
    quantity: 1,
    notes: `Attending Doctor: ${params.doctorName}`,
    addedBy: params.doctorName,
    addedByRole: "Doctor"
  });

  // 2. Add Prescriptions
  for (const rx of params.prescriptions) {
    const unitPrice = rx.unitPrice || 450;
    await addChargeToCart({
      patientId: params.patientId,
      patientName: params.patientName,
      nationalId: params.nationalId,
      phone: params.phone,
      ticketNo: params.ticketNo,
      encounterId: params.encounterId,
      stage: "Pharmacy Dispensing",
      department: "Pharmacy",
      category: "pharmacy",
      name: `Rx: ${rx.drugName} (${rx.dosage || "Standard"})`,
      unitPrice,
      quantity: rx.quantity || 1,
      notes: `Prescribed by Dr. ${params.doctorName}`,
      addedBy: params.doctorName,
      addedByRole: "Doctor"
    });
  }

  // 3. Add Diagnostic Referrals (Lab & Radiology)
  for (const ref of params.referrals) {
    const isRad = ref.department === "radiology";
    const stage = isRad ? "Radiology & Imaging" : "Laboratory Diagnostics";
    const defaultCost = isRad ? 1800 : 850;
    await addChargeToCart({
      patientId: params.patientId,
      patientName: params.patientName,
      nationalId: params.nationalId,
      phone: params.phone,
      ticketNo: params.ticketNo,
      encounterId: params.encounterId,
      stage,
      department: ref.department || (isRad ? "Radiology" : "Laboratory"),
      category: isRad ? "radiology" : "laboratory",
      name: `${isRad ? "Imaging" : "Lab Test"}: ${ref.testName}`,
      unitPrice: ref.standardAmount || defaultCost,
      quantity: 1,
      notes: `Ordered by Dr. ${params.doctorName}`,
      addedBy: params.doctorName,
      addedByRole: "Doctor"
    });
  }

  // 4. Add any Procedures if present
  if (params.procedures) {
    for (const proc of params.procedures) {
      await addChargeToCart({
        patientId: params.patientId,
        patientName: params.patientName,
        nationalId: params.nationalId,
        phone: params.phone,
        ticketNo: params.ticketNo,
        encounterId: params.encounterId,
        stage: "Doctor Consultation",
        department: "Clinical Procedures",
        category: proc.category || "procedure",
        name: `Procedure: ${proc.name}`,
        unitPrice: proc.amount,
        quantity: 1,
        notes: `Performed by Dr. ${params.doctorName}`,
        addedBy: params.doctorName,
        addedByRole: "Doctor"
      });
    }
  }
}

import { db, cleanFirestoreData } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";

export function getCartDocId(patientId: string): string {
  const sanitized = String(patientId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `cart-${sanitized}`;
}

export interface CartItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  waived?: boolean;
  waiverReason?: string;
  department?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface PatientCart {
  id: string;
  patientId: string;
  patientName?: string;
  nationalId?: string;
  items: CartItem[];
  subtotal: number;
  status: "active" | "cleared" | "invoiced";
  updatedAt?: string;
}

export function subscribePatientCart(patientId: string, callback: (cart: PatientCart | null) => void): () => void {
  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  return onSnapshot(cartRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as PatientCart);
    } else {
      callback(null);
    }
  });
}

export function subscribeAllActiveCarts(callback: (carts: PatientCart[]) => void): () => void {
  const colRef = collection(db, "patient_carts");
  return onSnapshot(colRef, (snap) => {
    const list: PatientCart[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as PatientCart);
    });
    callback(list);
  });
}

export async function getPatientCart(patientId: string): Promise<PatientCart | null> {
  const cartId = getCartDocId(patientId);
  const snap = await getDoc(doc(db, "patient_carts", cartId));
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as PatientCart;
  }
  return null;
}

export async function addChargeToCart(
  patientIdOrObj: string | any,
  itemArg?: any,
  metadataArg?: any
): Promise<void> {
  let patientId: string;
  let item: any;
  let metadata: any;

  if (typeof patientIdOrObj === "object" && patientIdOrObj !== null) {
    patientId = patientIdOrObj.patientId || "anonymous";
    item = patientIdOrObj;
    metadata = {
      patientName: patientIdOrObj.patientName,
      nationalId: patientIdOrObj.nationalId,
      phone: patientIdOrObj.phone,
      ...metadataArg,
    };
  } else {
    patientId = String(patientIdOrObj || "anonymous");
    item = itemArg || {};
    metadata = metadataArg || {};
  }

  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);

  const newItem: CartItem = {
    id: item.id || `item-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    name: item.name || item.description || "Medical Service",
    description: item.description || "",
    category: item.category || "General",
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || item.price || item.amount || 0,
    totalPrice: (item.quantity || 1) * (item.unitPrice || item.price || item.amount || 0),
    department: item.department || "Clinical",
    timestamp: new Date().toISOString(),
    ...item,
  };

  if (snap.exists()) {
    const existing = snap.data() as PatientCart;
    const items = [...(existing.items || []), newItem];
    const subtotal = items.reduce((acc, curr) => acc + (curr.waived ? 0 : curr.totalPrice), 0);
    await updateDoc(
      cartRef,
      cleanFirestoreData({
        items,
        subtotal,
        updatedAt: new Date().toISOString(),
        ...(metadata || {}),
      })
    );
  } else {
    const initial: PatientCart = {
      id: cartId,
      patientId,
      patientName: metadata?.patientName || "Patient",
      nationalId: metadata?.nationalId || "",
      items: [newItem],
      subtotal: newItem.totalPrice,
      status: "active",
      updatedAt: new Date().toISOString(),
      ...(metadata || {}),
    };
    await setDoc(cartRef, cleanFirestoreData(initial));
  }
}

export async function removeChargeFromCart(patientId: string, itemId: string): Promise<void> {
  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) return;

  const data = snap.data() as PatientCart;
  const items = (data.items || []).filter((i) => i.id !== itemId);
  const subtotal = items.reduce((acc, curr) => acc + (curr.waived ? 0 : curr.totalPrice), 0);
  await updateDoc(cartRef, cleanFirestoreData({ items, subtotal, updatedAt: new Date().toISOString() }));
}

export async function updateCartItemQuantity(patientId: string, itemId: string, quantity: number): Promise<void> {
  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) return;

  const data = snap.data() as PatientCart;
  const items = (data.items || []).map((i) => {
    if (i.id === itemId) {
      const q = Math.max(1, quantity);
      return { ...i, quantity: q, totalPrice: q * i.unitPrice };
    }
    return i;
  });
  const subtotal = items.reduce((acc, curr) => acc + (curr.waived ? 0 : curr.totalPrice), 0);
  await updateDoc(cartRef, cleanFirestoreData({ items, subtotal, updatedAt: new Date().toISOString() }));
}

export async function waiveCartItem(patientId: string, itemId: string, waiverReason?: string): Promise<void> {
  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) return;

  const data = snap.data() as PatientCart;
  const items = (data.items || []).map((i) => {
    if (i.id === itemId) {
      return { ...i, waived: true, waiverReason: waiverReason || "Administrative Waiver" };
    }
    return i;
  });
  const subtotal = items.reduce((acc, curr) => acc + (curr.waived ? 0 : curr.totalPrice), 0);
  await updateDoc(cartRef, cleanFirestoreData({ items, subtotal, updatedAt: new Date().toISOString() }));
}

export async function checkoutPatientCart(
  patientIdOrData: string | any,
  paymentDataArg?: any
): Promise<any> {
  let patientId: string;
  let paymentData: any;
  if (typeof patientIdOrData === "object" && patientIdOrData !== null) {
    patientId = patientIdOrData.patientId || "anonymous";
    paymentData = patientIdOrData;
  } else {
    patientId = String(patientIdOrData || "anonymous");
    paymentData = paymentDataArg || {};
  }

  const cartId = getCartDocId(patientId);
  const cartRef = doc(db, "patient_carts", cartId);
  const snap = await getDoc(cartRef);
  let invoice: any = null;

  if (snap.exists()) {
    const cart = snap.data() as PatientCart;
    invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber: `INV-${Date.now()}`,
      patientId,
      patientName: cart.patientName || paymentData.patientName || "Patient",
      nationalId: cart.nationalId || paymentData.nationalId || "",
      items: cart.items || [],
      subtotal: cart.subtotal || 0,
      totalAmount: cart.subtotal || 0,
      paymentMethod: paymentData.paymentMethod || "Cash",
      paymentStatus: "paid",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  await updateDoc(
    cartRef,
    cleanFirestoreData({
      status: "cleared",
      paymentData,
      clearedAt: new Date().toISOString(),
    })
  );
  return { status: "cleared", cartId, invoice };
}

export async function syncDoctorConsultationToCart(encounter: any, doctorName?: string): Promise<void> {
  if (!encounter || !encounter.patientId) return;
  const patientId = encounter.patientId;

  await addChargeToCart(
    patientId,
    {
      id: `charge-consult-${encounter.id || Date.now()}`,
      name: "Medical Doctor Consultation & Evaluation",
      category: "Consultation",
      quantity: 1,
      unitPrice: 1000,
      doctor: doctorName || encounter.doctorName || "General Practitioner",
    },
    {
      patientName: encounter.patientName,
      nationalId: encounter.nationalId,
    }
  );
}

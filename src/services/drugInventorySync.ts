import { db, cleanFirestoreData } from "../lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { DRUG_REFERENCE_DICTIONARY } from "../constants/drugDictionary";

export interface DrugSyncResult {
  success: boolean;
  message: string;
  totalSynced?: number;
}

export async function uploadDrugDictionaryToFirestore(): Promise<DrugSyncResult> {
  try {
    const existingSnap = await getDocs(collection(db, "medications"));
    const existingNames = new Set(
      existingSnap.docs.map((d) => (d.data().name || "").toLowerCase().trim())
    );

    let count = 0;
    for (const drug of DRUG_REFERENCE_DICTIONARY) {
      const norm = drug.genericName.toLowerCase().trim();
      if (!existingNames.has(norm)) {
        const id = `med-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        await setDoc(
          doc(db, "medications", id),
          cleanFirestoreData({
            id,
            name: drug.genericName,
            genericName: drug.genericName,
            brandName: drug.brandLabel || drug.genericName,
            category: drug.category || "General",
            strength: drug.strength || "Standard",
            dosageForm: drug.formulation || "Tablet",
            unitPrice: drug.defaultPrice || 50,
            costPrice: Math.round((drug.defaultPrice || 50) * 0.6),
            stockQuantity: drug.initialStock || 100,
            reorderLevel: drug.minThreshold || 25,
            batchNumber: `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 2).toISOString().split("T")[0],
            status: "available",
            location: "Main Pharmacy Shelf A-1",
            createdAt: new Date().toISOString(),
          })
        );
        count++;
      }
    }
    return {
      success: true,
      message: `Successfully synchronized ${count} medications from master drug reference dictionary to pharmacy inventory.`,
      totalSynced: count,
    };
  } catch (err: any) {
    console.error("uploadDrugDictionaryToFirestore error:", err);
    return {
      success: false,
      message: err?.message || "Failed to synchronize drug dictionary.",
    };
  }
}

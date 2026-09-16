import { db, cleanFirestoreData } from "../lib/firebase";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { DRUG_REFERENCE_DICTIONARY } from "../constants/drugDictionary";

export interface DrugSyncResult {
  success: boolean;
  message: string;
  totalSynced?: number;
  importedCount?: number;
  existingCount?: number;
}

/**
 * Imports and synchronizes the entire master pharmacy stock catalog (440+ medications)
 * defined in the repository into the Firestore `medications` collection.
 */
export async function importPharmacyStockFromRepo(options?: { overwriteExisting?: boolean }): Promise<DrugSyncResult> {
  try {
    const existingSnap = await getDocs(collection(db, "medications"));
    const existingMap = new Map<string, string>();
    
    existingSnap.docs.forEach((d) => {
      const data = d.data();
      const nameKey = (data.name || "").toLowerCase().trim();
      const specKey = `${(data.genericName || data.name || "").toLowerCase().trim()}__${(data.strength || "").toLowerCase().trim()}__${(data.dosageForm || data.formulation || "").toLowerCase().trim()}`;
      if (nameKey) existingMap.set(nameKey, d.id);
      if (specKey) existingMap.set(specKey, d.id);
    });

    let importedCount = 0;
    const batchLimit = 350; // Firestore maximum batch limit is 500
    let currentBatch = writeBatch(db);
    let batchOps = 0;

    for (let idx = 0; idx < DRUG_REFERENCE_DICTIONARY.length; idx++) {
      const drug = DRUG_REFERENCE_DICTIONARY[idx];
      const displayName = drug.strength
        ? `${drug.genericName} ${drug.strength} (${drug.formulation})`
        : `${drug.genericName} (${drug.formulation})`;
      
      const nameKey = displayName.toLowerCase().trim();
      const specKey = `${drug.genericName.toLowerCase().trim()}__${drug.strength.toLowerCase().trim()}__${drug.formulation.toLowerCase().trim()}`;

      const existingDocId = existingMap.get(nameKey) || existingMap.get(specKey);

      if (!existingDocId || options?.overwriteExisting) {
        const docRef = existingDocId
          ? doc(db, "medications", existingDocId)
          : doc(collection(db, "medications"));

        const shelfLetter = String.fromCharCode(65 + (idx % 8)); // A through H
        const shelfNumber = (idx % 6) + 1; // 1 through 6
        const batchCode = `BN-2026-${String(idx + 101).padStart(4, "0")}`;
        const barcodeVal = `616400${String(idx + 1).padStart(6, "0")}`;

        const payload = cleanFirestoreData({
          id: docRef.id,
          name: displayName,
          genericName: drug.genericName,
          brandName: drug.brandLabel || drug.genericName,
          brandLabel: drug.brandLabel || drug.genericName,
          category: drug.category || "General Formulary",
          strength: drug.strength || "Standard",
          dosageForm: drug.formulation || "Tablet",
          formulation: drug.formulation || "Tablet",
          price: drug.defaultPrice || 50,
          unitPrice: drug.defaultPrice || 50,
          costPrice: Math.round((drug.defaultPrice || 50) * 0.65),
          quantity: drug.initialStock || 100,
          stockQuantity: drug.initialStock || 100,
          minThreshold: drug.minThreshold || 20,
          reorderLevel: drug.minThreshold || 20,
          batchNo: batchCode,
          batchNumber: batchCode,
          expiryDate: "2027-12-31",
          barcode: barcodeVal,
          location: `Main Pharmacy Shelf ${shelfLetter}-${shelfNumber}`,
          status: "available",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        currentBatch.set(docRef, payload, { merge: true });
        batchOps++;
        importedCount++;

        if (batchOps >= batchLimit) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          batchOps = 0;
        }
      }
    }

    if (batchOps > 0) {
      await currentBatch.commit();
    }

    return {
      success: true,
      message: `Successfully imported and synchronized ${importedCount} pharmacy medications into database formulary (${existingSnap.size} previously existing).`,
      importedCount,
      existingCount: existingSnap.size,
      totalSynced: importedCount,
    };
  } catch (err: any) {
    console.error("importPharmacyStockFromRepo error:", err);
    return {
      success: false,
      message: err?.message || "Failed to import pharmacy stock from repository.",
    };
  }
}

/**
 * Backward compatibility wrapper
 */
export async function uploadDrugDictionaryToFirestore(): Promise<DrugSyncResult> {
  return importPharmacyStockFromRepo();
}

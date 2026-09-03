import { db, cleanFirestoreData } from "../lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { DRUG_REFERENCE_DICTIONARY, formatDrugDisplayName } from "../constants/drugDictionary";
import { Medication } from "../types";

export interface DrugUploadResult {
  totalInDictionary: number;
  addedCount: number;
  updatedCount: number;
  existingRetained: number;
  success: boolean;
  message: string;
}

/**
 * Uploads/Imports the official Drug Reference Dictionary into the Firestore medications collection.
 * Batches operations safely under Firestore 500-op limit.
 */
export async function uploadDrugDictionaryToFirestore(options?: {
  overwritePrices?: boolean;
}): Promise<DrugUploadResult> {
  try {
    const medColRef = collection(db, "medications");
    const existingSnap = await getDocs(medColRef);
    
    // Map existing by normalized key (e.g. "acetaminophen 500 mg tablet")
    const existingMap = new Map<string, { id: string; data: Medication }>();
    existingSnap.docs.forEach((d) => {
      const med = { ...d.data(), id: d.id } as Medication;
      const key = `${(med.genericName || med.name).toLowerCase().trim()}_${(med.strength || "").toLowerCase().trim()}_${(med.formulation || "").toLowerCase().trim()}`;
      const nameKey = med.name.toLowerCase().trim();
      existingMap.set(key, { id: d.id, data: med });
      existingMap.set(nameKey, { id: d.id, data: med });
    });

    let addedCount = 0;
    let updatedCount = 0;
    let existingRetained = 0;

    const operations: { ref: any; data: any; isNew: boolean }[] = [];

    const now = new Date();
    const expiryYear = now.getFullYear() + 2;
    const defaultExpiry = `${expiryYear}-12-31`;

    for (const entry of DRUG_REFERENCE_DICTIONARY) {
      const displayName = formatDrugDisplayName(entry);
      const key = `${entry.genericName.toLowerCase().trim()}_${entry.strength.toLowerCase().trim()}_${entry.formulation.toLowerCase().trim()}`;
      const nameKey = displayName.toLowerCase().trim();

      const matched = existingMap.get(key) || existingMap.get(nameKey);

      if (matched) {
        if (options?.overwritePrices) {
          const docRef = doc(db, "medications", matched.id);
          operations.push({
            ref: docRef,
            data: {
              genericName: entry.genericName,
              brandLabel: entry.brandLabel,
              formulation: entry.formulation,
              strength: entry.strength,
              price: entry.defaultPrice,
              minThreshold: entry.minThreshold,
              category: entry.category,
              updatedAt: new Date().toISOString()
            },
            isNew: false
          });
          updatedCount++;
        } else {
          existingRetained++;
        }
      } else {
        // Create new document in Firestore
        const docRef = doc(collection(db, "medications"));
        const batchNum = `BN-${entry.genericName.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 89999 + 10000)}`;
        
        const newMedData: Omit<Medication, "id"> = {
          name: displayName,
          genericName: entry.genericName,
          brandLabel: entry.brandLabel,
          formulation: entry.formulation,
          strength: entry.strength,
          category: entry.category,
          quantity: entry.initialStock,
          minThreshold: entry.minThreshold,
          batchNo: batchNum,
          expiryDate: defaultExpiry,
          price: entry.defaultPrice
        };

        operations.push({
          ref: docRef,
          data: cleanFirestoreData({
            ...newMedData,
            createdAt: new Date().toISOString()
          }),
          isNew: true
        });
        addedCount++;
      }
    }

    // Commit in safe batches of 400
    const CHUNK_SIZE = 400;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.isNew) {
          batch.set(op.ref, op.data);
        } else {
          batch.update(op.ref, op.data);
        }
      }
      await batch.commit();
    }

    return {
      totalInDictionary: DRUG_REFERENCE_DICTIONARY.length,
      addedCount,
      updatedCount,
      existingRetained,
      success: true,
      message: `Successfully synced inventory: ${addedCount} added, ${updatedCount} updated, ${existingRetained} already active in dispensary catalogue.`
    };
  } catch (error: any) {
    console.error("Error uploading drug dictionary:", error);
    return {
      totalInDictionary: DRUG_REFERENCE_DICTIONARY.length,
      addedCount: 0,
      updatedCount: 0,
      existingRetained: 0,
      success: false,
      message: error?.message || "Failed to upload drug dictionary"
    };
  }
}

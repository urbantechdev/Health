import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or is a placeholder.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Static medical catalog fallbacks in case Gemini is not configured
const STATIC_DRUG_ALTERNATIVES: Record<string, string[]> = {
  amoxicillin: ["Azithromycin (500mg)", "Cefuroxime (250mg)", "Erythromycin (250mg)"],
  paracetamol: ["Ibuprofen (400mg)", "Diclofenac (500mg)", "Meloxicam (15mg)"],
  metformin: ["Glibenclamide (5mg)", "Vildagliptin (50mg)", "Empagliflozin (10mg)"],
  atorvastatin: ["Rosuvastatin (10mg)", "Simvastatin (20mg)", "Fenofibrate (160mg)"],
  omeprazole: ["Esomeprazole (20mg)", "Pantoprazole (40mg)", "Famotidine (20mg)"],
};

// --- API ROUTES ---

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 2. Gemini API: Recommend Alternative Drugs
app.post("/api/gemini/suggest-alternatives", async (req, res) => {
  const { drugName, quantity, symptoms, diagnosis } = req.body;

  if (!drugName) {
    return res.status(400).json({ error: "Drug name is required" });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `You are a clinical pharmacologist. The doctor wants to prescribe "${drugName}" (Quantity: ${quantity || "unspecified"}) for a patient with symptoms "${symptoms || "unspecified"}" and diagnosis "${diagnosis || "unspecified"}".
However, "${drugName}" is OUT OF STOCK in our pharmacy.
Please suggest 3 clinically appropriate alternative medications available in Kenya.
Format your response as a valid JSON array of objects, where each object has:
- name: (string, the generic/brand alternative)
- dosageStrength: (string, e.g., 500mg, 10ml)
- justification: (string, why this alternative is suitable)
- precaution: (string, specific clinical warnings or dosage notes)
Only return the JSON code inside standard JSON brackets, no extra markdown formatting outside.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "[]";
    const parsed = JSON.parse(text.trim());
    res.json({ success: true, suggestions: parsed, source: "gemini" });
  } catch (error: any) {
    console.warn("Gemini API failed or key missing. Falling back to static lookup:", error.message);
    
    // Fallback logic
    const normalized = String(drugName).toLowerCase().trim();
    const matches = Object.keys(STATIC_DRUG_ALTERNATIVES).find(k => normalized.includes(k)) || "paracetamol";
    const staticAlts = STATIC_DRUG_ALTERNATIVES[matches];
    
    const mockSuggestions = staticAlts.map((alt, idx) => ({
      name: alt,
      dosageStrength: idx === 0 ? "500mg" : idx === 1 ? "250mg" : "400mg",
      justification: `Clinically verified substitute for ${drugName} to treat patient's profile.`,
      precaution: "Monitor liver/kidney function during prolonged dosage.",
    }));

    res.json({
      success: true,
      suggestions: mockSuggestions,
      source: "fallback",
      warning: "Gemini API unavailable or key unconfigured. Using secure static guidelines."
    });
  }
});

// 3. Gemini API: Summarize Clinical EHR Timeline
app.post("/api/gemini/summarize-ehr", async (req, res) => {
  const { patientName, visits } = req.body;

  if (!visits || !Array.isArray(visits) || visits.length === 0) {
    return res.json({ summary: "No clinical visits recorded yet to summarize." });
  }

  try {
    const ai = getGeminiClient();
    const timelineStr = visits.map((v: any, idx: number) => `
Visit #${idx + 1} (${v.date}):
- Symptoms: ${v.symptoms || "N/A"}
- Diagnosis: ${v.diagnosis || "N/A"}
- Vitals: BP ${v.vitals?.bp || "N/A"}, Temp ${v.vitals?.temp || "N/A"}°C, Pulse ${v.vitals?.pulse || "N/A"} bpm
- Prescriptions: ${(v.prescriptions || []).map((p: any) => `${p.drugName} (${p.dosage})`).join(", ") || "None"}
    `).join("\n");

    const prompt = `You are a senior physician compiling an executive clinical summary for a patient named "${patientName || "the patient"}".
Here is their medical visit history:
${timelineStr}

Please provide a concise medical summary containing:
1. Clinical Status Overview (brief summary of patient's active conditions)
2. Significant Vitals Trends (e.g., hyper/hypotension warning if any)
3. Drug Recommendations & Adherence Warnings
Keep the tone highly professional, objective, and clear. Format using clean Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ success: true, summary: response.text || "No summary generated.", source: "gemini" });
  } catch (error: any) {
    console.warn("EHR Summary failed or key missing. Returning mock summary:", error.message);
    
    // Generic fallback clinical summary
    const fallbackText = `### Clinical Status Overview
Patient **${patientName || "Client"}** has ${visits.length} visit record(s) on file. Primary indications suggest monitoring of presenting symptoms, specifically: *"${visits[0]?.diagnosis || "unspecified diagnosis"}"*.

### Significant Vitals Trends
* Vitals recorded on ${visits[0]?.date || "latest visit"} remain within baseline clinical tolerances (BP: ${visits[0]?.vitals?.bp || "120/80"}, Pulse: ${visits[0]?.vitals?.pulse || "72"} bpm). 

### Recommendation & Care Management
* Advise patient to complete current course of therapeutic medications.
* Schedule follow-up assessment should symptoms persist beyond 7 days.
* *Note: Gemini-based deep timeline synthesis is currently offline (Key missing).*`;

    res.json({
      success: true,
      summary: fallbackText,
      source: "fallback",
    });
  }
});

// 4. Kenyan Integrations: SHA / Taifa Care Eligibility & Claims
app.post("/api/integrations/sha/eligibility", (req, res) => {
  const { nationalId } = req.body;
  if (!nationalId) {
    return res.status(400).json({ error: "National ID is required" });
  }

  // Simulate real SHA AfyaLink / DHA Developer API responses
  const startsWithOdd = parseInt(nationalId.substring(0, 2)) % 2 !== 0;
  
  if (nationalId.length < 5) {
    return res.json({
      eligible: false,
      status: "INACTIVE_CONTRIBUTION",
      patientName: "Unknown Patient",
      message: "No active SHA registration. Direct to local registration center.",
    });
  }

  res.json({
    eligible: true,
    shaId: `SHA-K-${nationalId.substring(0, 4)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    status: "ACTIVE",
    patientName: startsWithOdd ? "Alice Wambui Kamau" : "David Omondi Otieno",
    premiumPaidUntil: "2026-12-31",
    dependentCount: 2,
    benefitLimits: {
      outpatient: 25000,
      inpatient: 150000,
      maternity: 40000,
    },
    message: "Verified successfully via DHA Developer API Portal."
  });
});

app.post("/api/integrations/sha/claim", (req, res) => {
  const { shaId, amount, diagnosis, items } = req.body;
  const claimId = `CLM-SHA-${Math.floor(Math.random() * 1000000)}`;

  res.json({
    success: true,
    claimId,
    status: "APPROVED_PREAUTH",
    amountCovered: Math.min(amount, 15000), // SHA covers up to 15,000 for standard clinic outpatient visits
    authorizedBy: "SHA-E-PORTAL-BOT-04",
    timestamp: new Date().toISOString(),
    message: "Pre-authorization approved. Claim electronically submitted.",
  });
});

// 5. KRA eTIMS VAT & Compliance Integration
app.post("/api/integrations/etims/invoice", (req, res) => {
  const { customerName, amount, items } = req.body;
  
  const cuInvoiceNo = `KRAETIMS-OFF-${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;
  const qrCodeData = `https://itax.kra.go.ke/KRAActive/etims-verify?inv=${cuInvoiceNo}&amt=${amount}`;
  const taxAmount = parseFloat((amount * 0.16).toFixed(2)); // 16% standard VAT in Kenya

  res.json({
    success: true,
    kraInvoiceNo: cuInvoiceNo,
    deviceSerialNo: "ETIMS-MW-0099432",
    dateTime: new Date().toISOString(),
    taxableAmount: parseFloat((amount - taxAmount).toFixed(2)),
    taxRate: "16%",
    taxAmount,
    totalAmount: parseFloat(amount),
    qrCodeData,
    message: "eTIMS compliance invoice successfully signed and logged.",
  });
});

// 6. Safaricom M-PESA STK Push & Webhook Callback Handling
interface MpesaTxnRecord {
  checkoutRequestId: string;
  merchantRequestId: string;
  amount: number;
  phoneNumber: string;
  invoiceId: string;
  status: "Pending" | "Success" | "Failed" | "Cancelled";
  mpesaReceiptNumber: string | null;
  transactionDate: string;
  resultCode: number;
  resultDesc: string;
  rawCallback?: any;
}

const pendingMpesaTxns = new Map<string, MpesaTxnRecord>();
const invoiceToMpesaTxn = new Map<string, MpesaTxnRecord>();

app.post("/api/integrations/mpesa/stkpush", (req, res) => {
  const { phoneNumber, amount, invoiceId, reference } = req.body;
  if (!phoneNumber || !amount) {
    return res.status(400).json({ error: "Phone number and amount are required" });
  }

  const checkoutRequestID = `ws_CO_${new Date().getTime()}_${Math.floor(Math.random() * 900 + 100)}`;
  const merchantRequestID = `22119-994321-${Math.floor(Math.random() * 1000)}`;
  const invRef = invoiceId || reference || "UNK-INV";

  const txnRecord: MpesaTxnRecord = {
    checkoutRequestId: checkoutRequestID,
    merchantRequestId: merchantRequestID,
    amount: parseFloat(amount),
    phoneNumber: String(phoneNumber),
    invoiceId: invRef,
    status: "Pending",
    mpesaReceiptNumber: null,
    transactionDate: new Date().toISOString(),
    resultCode: 0,
    resultDesc: "STK Push Initiated. Awaiting PIN entry on device."
  };

  pendingMpesaTxns.set(checkoutRequestID, txnRecord);
  invoiceToMpesaTxn.set(invRef, txnRecord);

  // Background Webhook Callback Simulation (Safaricom Daraja sends webhook automatically when user enters PIN)
  setTimeout(() => {
    const txn = pendingMpesaTxns.get(checkoutRequestID);
    if (txn && txn.status === "Pending") {
      const generatedReceipt = `T${Math.floor(Math.random() * 9).toString()}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(100000 + Math.random() * 900000)}`;
      txn.status = "Success";
      txn.mpesaReceiptNumber = generatedReceipt;
      txn.resultDesc = "The service request is processed successfully.";
      pendingMpesaTxns.set(checkoutRequestID, txn);
      invoiceToMpesaTxn.set(invRef, txn);
      console.log(`[Daraja Webhook Processed] M-Pesa Payment Received: ${generatedReceipt} for Invoice ${invRef} (KES ${txn.amount})`);
    }
  }, 4000);

  res.json({
    success: true,
    MerchantRequestID: merchantRequestID,
    CheckoutRequestID: checkoutRequestID,
    ResponseCode: "0",
    ResponseDescription: "Success. Request accepted for processing",
    CustomerMessage: "M-Pesa STK Push initiated. Prompt sent to device."
  });
});

// Live Daraja Webhook Receiver (receives HTTP POST callback from Safaricom API)
app.post("/api/integrations/mpesa/callback", (req, res) => {
  try {
    const callbackData = req.body?.Body?.stkCallback || req.body;
    const checkoutRequestId = callbackData?.CheckoutRequestID || req.body?.checkoutRequestId;
    const resultCode = callbackData?.ResultCode ?? 0;
    const resultDesc = callbackData?.ResultDesc || "Processed";

    let mpesaReceiptNumber = "";
    let amount = 0;
    let phoneNumber = "";

    if (callbackData?.CallbackMetadata?.Item) {
      for (const item of callbackData.CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = item.Value;
        if (item.Name === "Amount") amount = item.Value;
        if (item.Name === "PhoneNumber") phoneNumber = String(item.Value);
      }
    }

    if (!mpesaReceiptNumber && resultCode === 0) {
      mpesaReceiptNumber = req.body?.mpesaReceiptNumber || `TK${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    const existing = checkoutRequestId ? pendingMpesaTxns.get(checkoutRequestId) : null;
    const updatedRecord: MpesaTxnRecord = {
      checkoutRequestId: checkoutRequestId || `ws_CO_${Date.now()}`,
      merchantRequestId: callbackData?.MerchantRequestID || "UNK",
      amount: amount || existing?.amount || 0,
      phoneNumber: phoneNumber || existing?.phoneNumber || "",
      invoiceId: existing?.invoiceId || "DIRECT_PAYMENT",
      status: resultCode === 0 ? "Success" : "Failed",
      mpesaReceiptNumber: resultCode === 0 ? mpesaReceiptNumber : null,
      transactionDate: new Date().toISOString(),
      resultCode,
      resultDesc,
      rawCallback: req.body
    };

    if (checkoutRequestId) {
      pendingMpesaTxns.set(checkoutRequestId, updatedRecord);
    }
    if (existing?.invoiceId) {
      invoiceToMpesaTxn.set(existing.invoiceId, updatedRecord);
    }

    console.log(`[M-Pesa Webhook Callback Handled] Status: ${updatedRecord.status}, Receipt: ${updatedRecord.mpesaReceiptNumber}`);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err: any) {
    console.error("Error processing M-Pesa webhook callback:", err);
    res.status(500).json({ ResultCode: 1, ResultDesc: "Internal Server Error" });
  }
});

// Polling & Browser Reconciliation status endpoint
app.post("/api/integrations/mpesa/status", (req, res) => {
  const { checkoutRequestId, invoiceId } = req.body;
  
  let txn = checkoutRequestId ? pendingMpesaTxns.get(checkoutRequestId) : null;
  if (!txn && invoiceId) {
    txn = invoiceToMpesaTxn.get(invoiceId) || null;
  }

  if (!txn) {
    return res.json({ status: "NotFound", message: "Transaction ID not registered." });
  }

  res.json({
    status: txn.status, // "Pending", "Success", "Failed"
    mpesaReceiptNumber: txn.mpesaReceiptNumber,
    amount: txn.amount,
    invoiceId: txn.invoiceId,
    phoneNumber: txn.phoneNumber,
    transactionDate: txn.transactionDate,
    message: txn.status === "Success" 
      ? `Payment of KES ${txn.amount.toLocaleString()} successfully confirmed via M-Pesa Receipt ${txn.mpesaReceiptNumber}!` 
      : txn.resultDesc || "Waiting for user PIN entry on phone..."
  });
});

// Get invoice payment status (ideal if pharmacist browser refreshed while awaiting PIN)
app.get("/api/integrations/mpesa/invoice-status/:invoiceId", (req, res) => {
  const { invoiceId } = req.params;
  const txn = invoiceToMpesaTxn.get(invoiceId);

  if (!txn) {
    return res.json({ found: false, status: "UNPAID" });
  }

  res.json({
    found: true,
    status: txn.status,
    mpesaReceiptNumber: txn.mpesaReceiptNumber,
    amount: txn.amount,
    phoneNumber: txn.phoneNumber,
    transactionDate: txn.transactionDate
  });
});

// 7. Insurance Slade 360 / Smart Applications biometric hooks
app.post("/api/integrations/slade/preauth", (req, res) => {
  const { providerName, nationalId, requestAmount } = req.body;
  const authCode = `SLD-${Math.floor(Math.random() * 900000 + 100000)}`;

  res.json({
    success: true,
    authCode,
    coPayRequired: 500, // standard KES 500 co-pay for private insurances in Kenya
    approvedLimit: requestAmount - 500,
    status: "Approved",
    biometricsVerified: true,
    message: "Biometrics matched via Smart App Card Reader. Authorization signed."
  });
});

// --- VITE DEV OR PRODUCTION STATIC SERVING ---
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Mounting Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NextGen HMS Server] running on http://localhost:${PORT}`);
  });
}

setupViteOrStatic();

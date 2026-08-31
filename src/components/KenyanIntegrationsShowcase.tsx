import React, { useState } from "react";
import { Terminal, ShieldCheck, CheckCircle2, Cpu, FileJson, Link2, KeyRound, ExternalLink, Activity, CreditCard, Stethoscope, Fingerprint } from "lucide-react";
import ShaIntegrationHubModal from "./ShaIntegrationHubModal";

export default function KenyanIntegrationsShowcase() {
  const [activeTab, setActiveTab] = useState<"sha" | "coding" | "claims" | "fhir" | "etims" | "mpesa">("sha");
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);

  const testAPICall = async (endpoint: string, body: any) => {
    setLoading(true);
    setSandboxResponse(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setSandboxResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setSandboxResponse(`API NETWORK ERROR:\n${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div id="integrations-showcase" className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Kenya Digital Health Sandbox & Regulatory Switchboard</h2>
              <p className="text-xs text-slate-400">Digital Health Act 2023 • SHA / KDHA • HL7 FHIR R4 Shared Health Record (SHR)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHubOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Full Integration Hub</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-800">
              <ShieldCheck className="w-4 h-4" />
              <span>DHA Gateway Active</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* API Navigator */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Select Digital Standard Switch</p>
            <div className="space-y-2">
              {[
                { id: "sha", title: "1. SHA Patient Eligibility & Biometrics", desc: "DHA National Registry (IPRS) & Benefit Limit Check", icon: Fingerprint },
                { id: "coding", title: "2. Clinical Coding & Tariff Mapping", desc: "MOH 705/711 ICD-10 Classifications & Tariffs", icon: Stethoscope },
                { id: "claims", title: "3. Electronic Claims (e-Claims)", desc: "Pre-auth auto-scrubber & electronic treasury remittance", icon: CreditCard },
                { id: "fhir", title: "4. FHIR R4 Shared Health Record (SHR)", desc: "National HIE encounter bundle push/pull interchange", icon: Activity },
                { id: "etims", title: "5. KRA eTIMS Fiscal Compliance", desc: "Signed VAT compliance invoices with QR signature", icon: ShieldCheck },
                { id: "mpesa", title: "6. Safaricom M-PESA Express", desc: "Instant C2B STK push prompt and ledgering", icon: Link2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`btn-sandbox-tab-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSandboxResponse(null);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-slate-800/90 border-emerald-500 text-white font-semibold shadow-sm"
                      : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-300"
                  }`}
                >
                  <tab.icon className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === tab.id ? "text-emerald-400" : "text-slate-500"}`} />
                  <div className="flex flex-col">
                    <span className="text-xs">{tab.title}</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">{tab.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-850 space-y-1.5 text-[11px] text-slate-400 font-mono">
              <p className="font-bold text-slate-200 flex items-center gap-1 font-sans">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> DHA Developer Switchboard
              </p>
              <p>Env: <strong>KDHA AfyaLink Production Sandbox</strong></p>
              <p>Profile: <strong>http://fhir.dha.go.ke/Kenya-IPS</strong></p>
            </div>
          </div>

          {/* Console / Playback screen */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="flex-1 bg-slate-950 rounded-2xl p-5 border border-slate-850 font-mono text-xs text-slate-300 min-h-[280px] flex flex-col justify-between relative overflow-hidden">
              <Terminal className="absolute right-4 top-4 text-slate-800 w-12 h-12" />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 pb-2 border-b border-slate-850">
                  <FileJson className="w-4 h-4 text-emerald-400" />
                  <span>Interactive JSON Payload Inspection</span>
                </div>
                <pre className="overflow-auto max-h-[240px] whitespace-pre-wrap leading-relaxed text-emerald-400">
                  {sandboxResponse || `// Waiting to execute sandbox request...\n// Tap "Trigger Live API Test Packet" below to verify handshake.`}
                </pre>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-850">
                <span>TLS 1.3 Encryption Active</span>
                <span className="text-emerald-500 font-semibold">200 OK Live Handshake</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                id="btn-trigger-sandbox-test"
                onClick={() => {
                  if (activeTab === "sha") {
                    testAPICall("/api/integrations/sha/eligibility", { nationalId: "32441928" });
                  } else if (activeTab === "coding") {
                    testAPICall("/api/integrations/coding/icd10", { query: "malaria" });
                  } else if (activeTab === "claims") {
                    testAPICall("/api/integrations/sha/submit-claim", {
                      nationalId: "32441928",
                      patientName: "Alice Wambui Kamau",
                      totalClaimAmountKes: 2500,
                      primaryDiagnosis: { icd10Code: "B50.9", icd10Title: "Plasmodium falciparum malaria" }
                    });
                  } else if (activeTab === "fhir") {
                    testAPICall("/api/integrations/fhir/pull-shr", { nationalId: "32441928" });
                  } else if (activeTab === "etims") {
                    testAPICall("/api/integrations/etims/invoice", { customerName: "David Omondi", amount: 2500, items: [{ description: "Consultation Fee", amount: 2500, department: "doctor" }] });
                  } else if (activeTab === "mpesa") {
                    testAPICall("/api/integrations/mpesa/stkpush", { phoneNumber: "0712345678", amount: 500 });
                  }
                }}
                disabled={loading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Link2 className="w-4 h-4" />
                {loading ? "Routing payload through AfyaLink DHA Gateway..." : "Trigger Live API Test Packet"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Hub Modal Trigger */}
      <ShaIntegrationHubModal
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        defaultNationalId="32441928"
        defaultPatientName="Alice Wambui Kamau"
      />
    </>
  );
}

import React, { useState } from "react";
import { Terminal, ShieldCheck, CheckCircle2, Cpu, FileJson, Link2, KeyRound } from "lucide-react";

export default function KenyanIntegrationsShowcase() {
  const [activeTab, setActiveTab] = useState<"sha" | "etims" | "mpesa" | "slade">("sha");
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div id="integrations-showcase" className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xl border border-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Kenya Digital Health Sandbox</h2>
            <p className="text-xs text-slate-400">Compliance & Regulatory Integration Switchboards</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800">
          <ShieldCheck className="w-4 h-4" />
          <span>AfyaLink DHA Sandbox - Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* API Navigator */}
        <div className="lg:col-span-5 space-y-3">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Select Digital Standard</p>
          <div className="space-y-2">
            {[
              { id: "sha", title: "SHA (Taifa Care) AfyaLink", desc: "DHA Patient Eligibility Outpatient Claims" },
              { id: "etims", title: "KRA eTIMS Fiscal API", desc: "Signed VAT invoice generation & IRS ledgering" },
              { id: "mpesa", title: "Safaricom M-PESA Express", desc: "STK Push polling, callbacks & automated reconciliation" },
              { id: "slade", title: "Slade 360 / Smart App", desc: "Biometric card reader verification & insurance pre-auth" },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`btn-sandbox-tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSandboxResponse(null);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col ${
                  activeTab === tab.id
                    ? "bg-slate-800/80 border-emerald-500 text-white font-semibold"
                    : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-300"
                }`}
              >
                <span className="text-xs">{tab.title}</span>
                <span className="text-[10px] text-slate-400 font-normal mt-0.5">{tab.desc}</span>
              </button>
            ))}
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-2 text-[11px] text-slate-400">
            <p className="font-bold text-slate-200 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> Credentials Switchboard
            </p>
            <p><strong>Environment:</strong> Stage-v2 Developer Sandbox</p>
            <p><strong>DHA API Key:</strong> <span className="font-mono text-emerald-500 font-semibold">dha_live_994321...</span></p>
            <p><strong>M-PESA Passkey:</strong> <span className="font-mono text-emerald-500 font-semibold">bfb279f9aa99...</span></p>
          </div>
        </div>

        {/* Console / Playback screen */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex-1 bg-slate-950 rounded-2xl p-5 border border-slate-850 font-mono text-xs text-slate-300 min-h-[280px] flex flex-col justify-between relative overflow-hidden">
            <Terminal className="absolute right-4 top-4 text-slate-800 w-12 h-12" />
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 pb-2 border-b border-slate-850">
                <FileJson className="w-4 h-4 text-emerald-400" />
                <span>JSON Sandbox response packet</span>
              </div>
              <pre className="overflow-auto max-h-[220px] whitespace-pre-wrap leading-relaxed text-emerald-400">
                {sandboxResponse || `// Waiting to execute sandbox request...\n// Tap "Trigger API Callback Test" below to verify HL7 schemas.`}
              </pre>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-850">
              <span>SSL: Secure SHA-256</span>
              <span className="text-emerald-500 font-semibold">API Callback Code: 200 OK</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              id="btn-trigger-sandbox-test"
              onClick={() => {
                if (activeTab === "sha") {
                  testAPICall("/api/integrations/sha/eligibility", { nationalId: "32441928" });
                } else if (activeTab === "etims") {
                  testAPICall("/api/integrations/etims/invoice", { customerName: "David Omondi", amount: 2500, items: [{ description: "Consultation Fee", amount: 2500, department: "doctor" }] });
                } else if (activeTab === "mpesa") {
                  testAPICall("/api/integrations/mpesa/stkpush", { phoneNumber: "0712345678", amount: 500 });
                } else if (activeTab === "slade") {
                  testAPICall("/api/integrations/slade/preauth", { providerName: "Slade 360", nationalId: "20445981", requestAmount: 3400 });
                }
              }}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Link2 className="w-4 h-4" />
              {loading ? "Routing payload through AfyaLink DHA Gateway..." : "Trigger API Callback Test Packet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { fetchTrustConfig, saveTrustConfig } from "@/lib/trust/client-api";
import { DEFAULT_TRUST_CONFIG } from "@/lib/trust/defaults";
import type { TrustConfig } from "@/lib/trust/types";

type FieldDef = { key: keyof TrustConfig; label: string; type?: "text" | "textarea"; placeholder?: string };

const GROUPS: { title: string; note?: string; fields: FieldDef[] }[] = [
  {
    title: "Ownership & Funding",
    note: "Shown on the public Ownership & Funding page. Empty fields are hidden (never faked).",
    fields: [
      { key: "siteOwnerName", label: "Owner name" },
      { key: "legalEntityName", label: "Legal entity name" },
      { key: "entityType", label: "Entity type", placeholder: "e.g. Sole proprietorship / Pvt Ltd" },
      { key: "registrationNumber", label: "Registration number" },
      { key: "registeredAddress", label: "Registered address", type: "textarea" },
      { key: "operatingAddress", label: "Operating address", type: "textarea" },
      { key: "founderName", label: "Founder / Proprietor" },
      { key: "editorialHead", label: "Editorial head" },
      { key: "fundingSources", label: "Funding sources", type: "textarea" },
      { key: "advertisingDisclosure", label: "Advertising disclosure", type: "textarea" },
      { key: "affiliateDisclosure", label: "Affiliate disclosure", type: "textarea" },
      { key: "politicalAffiliationDisclosure", label: "Political affiliation disclosure", type: "textarea" },
      { key: "ownershipContactEmail", label: "Ownership contact email" },
    ],
  },
  {
    title: "Contact Channels",
    note: "Shown on the Contact page. Add only the emails you actually monitor.",
    fields: [
      { key: "generalEmail", label: "General enquiries email" },
      { key: "editorialEmail", label: "Editorial email" },
      { key: "correctionsEmail", label: "Corrections email" },
      { key: "legalEmail", label: "Legal notice email" },
      { key: "advertisingEmail", label: "Advertising email" },
      { key: "partnershipEmail", label: "Partnership email" },
      { key: "techSupportEmail", label: "Technical support email" },
      { key: "privacyEmail", label: "Privacy email" },
      { key: "grievanceOfficerName", label: "Grievance officer name" },
      { key: "grievanceEmail", label: "Grievance email" },
      { key: "phone", label: "Phone" },
      { key: "contactHours", label: "Contact hours", placeholder: "e.g. Mon–Fri, 10am–6pm IST" },
      { key: "postalAddress", label: "Postal address", type: "textarea" },
      { key: "responseTimeNote", label: "Response-time note", type: "textarea" },
    ],
  },
  {
    title: "Legal (Terms & Conditions)",
    note: "Governing law and jurisdiction. Leave blank if not yet decided — nothing is invented on the public page.",
    fields: [
      { key: "governingLaw", label: "Governing law", placeholder: "e.g. Laws of India" },
      { key: "jurisdictionCity", label: "Jurisdiction (city/court)" },
      { key: "legalContactEmail", label: "Legal contact email" },
      { key: "effectiveDate", label: "Effective date", placeholder: "e.g. 15 July 2026" },
    ],
  },
  {
    title: "Editorial & AI Wording",
    note: "Describe your ACTUAL review workflow. This wording is reused across policy pages and article disclosures.",
    fields: [
      { key: "editorialReviewWordingEn", label: "Editorial review wording (English)", type: "textarea" },
      { key: "editorialReviewWordingHi", label: "Editorial review wording (Hindi)", type: "textarea" },
      { key: "aiDisclosureDefaultEn", label: "Default AI disclosure (English)", type: "textarea" },
      { key: "aiDisclosureDefaultHi", label: "Default AI disclosure (Hindi)", type: "textarea" },
    ],
  },
];

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]";

export default function TrustConfigPage() {
  const [config, setConfig] = useState<TrustConfig>(DEFAULT_TRUST_CONFIG);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTrustConfig()
      .then((r) => {
        setConfig(r.config);
        setMissing(r.missing);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof TrustConfig, v: string) => setConfig((c) => ({ ...c, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveTrustConfig(config);
      setConfig(res.config);
      setMissing(res.missing);
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard requireSuperAdmin>
      <AdminTopbar title="Ownership & Contact Settings" />

      <div className="mb-3 flex items-center justify-between">
        <Link href="/admin/trust" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#1a2b4c]">
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#c41e20] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
        >
          <Save size={14} /> {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {missing.length > 0 ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertTriangle size={18} /> {missing.length} required detail(s) still missing
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((m) => (
              <span key={m} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                {m}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={18} /> All required details are filled.
        </div>
      )}

      <div className="space-y-5">
        {GROUPS.map((g) => (
          <div key={g.title} className="rounded-xl bg-white p-4 shadow-sm md:p-5">
            <h2 className="font-semibold text-[#1a2b4c]">{g.title}</h2>
            {g.note ? <p className="mt-0.5 text-xs text-gray-500">{g.note}</p> : null}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {g.fields.map((f) => (
                <label key={String(f.key)} className={f.type === "textarea" ? "block md:col-span-2" : "block"}>
                  <span className="mb-1 block text-xs font-medium text-gray-600">{f.label}</span>
                  {f.type === "textarea" ? (
                    <textarea
                      className={`${inputCls} min-h-[70px] resize-y`}
                      value={String(config[f.key] ?? "")}
                      placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className={inputCls}
                      value={String(config[f.key] ?? "")}
                      placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#c41e20] px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </RoleGuard>
  );
}

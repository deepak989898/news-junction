"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  AlertTriangle,
} from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import { fetchPolicyPage, savePolicyPage } from "@/lib/trust/client-api";
import { POLICY_PAGE_MAP } from "@/lib/trust/page-config";
import type { SitePage, SitePageKey, PolicySection } from "@/lib/trust/types";

const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]";
const textarea = `${input} min-h-[120px] resize-y font-mono text-[13px] leading-relaxed`;

export default function PolicyEditorPage() {
  const params = useParams<{ pageKey: string }>();
  const key = params.pageKey as SitePageKey;
  const meta = POLICY_PAGE_MAP[key];

  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(meta));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!meta) return;
    fetchPolicyPage(key)
      .then((r) => setPage(r.page))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [key, meta]);

  const requireSuper = meta?.editPermission === "super_admin";

  const set = <K extends keyof SitePage>(field: K, value: SitePage[K]) =>
    setPage((p) => (p ? { ...p, [field]: value } : p));

  const setSection = (idx: number, patch: Partial<PolicySection>) =>
    setPage((p) =>
      p ? { ...p, sections: p.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)) } : p
    );

  const moveSection = (idx: number, dir: -1 | 1) =>
    setPage((p) => {
      if (!p) return p;
      const arr = [...p.sections];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return p;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...p, sections: arr.map((s, i) => ({ ...s, order: i })) };
    });

  const addSection = () =>
    setPage((p) =>
      p
        ? {
            ...p,
            sections: [
              ...p.sections,
              {
                id: `section-${Date.now()}`,
                headingEn: "",
                headingHi: "",
                bodyEn: "",
                bodyHi: "",
                order: p.sections.length,
                highlight: false,
              },
            ],
          }
        : p
    );

  const removeSection = (idx: number) =>
    setPage((p) => (p ? { ...p, sections: p.sections.filter((_, i) => i !== idx) } : p));

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const res = await savePolicyPage(key, page);
      setPage(res.page);
      toast.success("Saved. Public page updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const helpText = useMemo(
    () =>
      "Formatting: blank line = new paragraph, lines starting with '- ' = bullet list, **bold**, and [text](https://link) for links.",
    []
  );

  if (loading) return <LoadingSpinner size="lg" />;
  if (!meta) {
    return (
      <div className="rounded-xl bg-white p-6 text-center text-gray-500">
        Unknown policy page.{" "}
        <Link href="/admin/trust" className="text-[#c41e20] underline">
          Back to Trust &amp; Policies
        </Link>
      </div>
    );
  }

  return (
    <RoleGuard requireSuperAdmin={requireSuper}>
      <AdminTopbar title={`Edit: ${meta.titleEn}`} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/trust" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#1a2b4c]">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={meta.path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-[#1a2b4c] hover:text-[#1a2b4c]"
          >
            <ExternalLink size={13} /> Preview
          </a>
          <button
            onClick={handleSave}
            disabled={saving || !page}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#c41e20] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {meta.legalReview ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            This is a legal/ownership page. Review the final wording against your actual business and data practices
            before publishing. Business-specific fields (owner, addresses, emails, governing law) are managed in{" "}
            <Link href="/admin/trust/config" className="font-semibold underline">
              Ownership &amp; Contact settings
            </Link>
            .
          </span>
        </div>
      ) : null}

      {page ? (
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#1a2b4c]">Page basics</h2>
              <ToggleSwitch
                label="Published"
                checked={page.published}
                onChange={(v) => set("published", v)}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Title (English)">
                <input className={input} value={page.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
              </Field>
              <Field label="Title (Hindi)">
                <input className={input} value={page.titleHi} onChange={(e) => set("titleHi", e.target.value)} />
              </Field>
              <Field label="Summary / intro (English)">
                <textarea
                  className={`${input} min-h-[70px] resize-y`}
                  value={page.summaryEn}
                  onChange={(e) => set("summaryEn", e.target.value)}
                />
              </Field>
              <Field label="Summary / intro (Hindi)">
                <textarea
                  className={`${input} min-h-[70px] resize-y`}
                  value={page.summaryHi}
                  onChange={(e) => set("summaryHi", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Sections */}
          <div className="rounded-xl bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#1a2b4c]">Sections ({page.sections.length})</h2>
              <button
                onClick={addSection}
                className="inline-flex items-center gap-1 rounded-md border border-[#1a2b4c] px-3 py-1.5 text-sm font-medium text-[#1a2b4c] hover:bg-[#1a2b4c] hover:text-white"
              >
                <Plus size={14} /> Add section
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">{helpText}</p>

            <div className="mt-4 space-y-4">
              {page.sections.map((s, idx) => (
                <div key={s.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-[#1a2b4c] disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === page.sections.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-[#1a2b4c] disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button
                        onClick={() => removeSection(idx)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-[#c41e20]"
                        title="Delete section"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Heading (English)">
                      <input
                        className={input}
                        value={s.headingEn}
                        onChange={(e) => setSection(idx, { headingEn: e.target.value })}
                      />
                    </Field>
                    <Field label="Heading (Hindi)">
                      <input
                        className={input}
                        value={s.headingHi}
                        onChange={(e) => setSection(idx, { headingHi: e.target.value })}
                      />
                    </Field>
                    <Field label="Body (English)">
                      <textarea
                        className={textarea}
                        value={s.bodyEn}
                        onChange={(e) => setSection(idx, { bodyEn: e.target.value })}
                      />
                    </Field>
                    <Field label="Body (Hindi)">
                      <textarea
                        className={textarea}
                        value={s.bodyHi}
                        onChange={(e) => setSection(idx, { bodyHi: e.target.value })}
                      />
                    </Field>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={s.highlight === true}
                      onChange={(e) => setSection(idx, { highlight: e.target.checked })}
                    />
                    Show as a highlighted callout box
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-xl bg-white p-4 shadow-sm md:p-5">
            <h2 className="font-semibold text-[#1a2b4c]">SEO</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="SEO title (English)">
                <input className={input} value={page.seoTitleEn} onChange={(e) => set("seoTitleEn", e.target.value)} />
              </Field>
              <Field label="SEO title (Hindi)">
                <input className={input} value={page.seoTitleHi} onChange={(e) => set("seoTitleHi", e.target.value)} />
              </Field>
              <Field label="SEO description (English)">
                <textarea
                  className={`${input} min-h-[70px] resize-y`}
                  value={page.seoDescriptionEn}
                  onChange={(e) => set("seoDescriptionEn", e.target.value)}
                />
              </Field>
              <Field label="SEO description (Hindi)">
                <textarea
                  className={`${input} min-h-[70px] resize-y`}
                  value={page.seoDescriptionHi}
                  onChange={(e) => set("seoDescriptionHi", e.target.value)}
                />
              </Field>
            </div>
          </div>

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
      ) : null}
    </RoleGuard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

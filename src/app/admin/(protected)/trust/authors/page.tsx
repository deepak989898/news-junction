"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2, Pencil, ExternalLink, Save, X, BadgeCheck } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import {
  fetchAuthorsAdmin,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from "@/lib/trust/client-api";
import { AUTHOR_TYPES, type Author, type AuthorType } from "@/lib/trust/types";

type AuthorRow = Author & { id: string };

type FormState = {
  id?: string;
  nameEn: string;
  nameHi: string;
  slug: string;
  roleEn: string;
  roleHi: string;
  authorType: AuthorType;
  isActive: boolean;
  isVerified: boolean;
  bioEn: string;
  bioHi: string;
  expertiseEn: string;
  expertiseHi: string;
  languages: string;
  coverageAreas: string;
  profileImageUrl: string;
  emailPublic: string;
  x: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  website: string;
};

const EMPTY: FormState = {
  nameEn: "",
  nameHi: "",
  slug: "",
  roleEn: "",
  roleHi: "",
  authorType: "human",
  isActive: true,
  isVerified: false,
  bioEn: "",
  bioHi: "",
  expertiseEn: "",
  expertiseHi: "",
  languages: "",
  coverageAreas: "",
  profileImageUrl: "",
  emailPublic: "",
  x: "",
  facebook: "",
  instagram: "",
  linkedin: "",
  website: "",
};

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]";

function toForm(a: AuthorRow): FormState {
  return {
    id: a.id,
    nameEn: a.nameEn,
    nameHi: a.nameHi,
    slug: a.slug,
    roleEn: a.roleEn,
    roleHi: a.roleHi,
    authorType: a.authorType,
    isActive: a.isActive,
    isVerified: a.isVerified,
    bioEn: a.bioEn,
    bioHi: a.bioHi,
    expertiseEn: (a.expertiseEn || []).join(", "),
    expertiseHi: (a.expertiseHi || []).join(", "),
    languages: (a.languages || []).join(", "),
    coverageAreas: (a.coverageAreas || []).join(", "),
    profileImageUrl: a.profileImageUrl,
    emailPublic: a.emailPublic,
    x: a.socialLinks?.x || "",
    facebook: a.socialLinks?.facebook || "",
    instagram: a.socialLinks?.instagram || "",
    linkedin: a.socialLinks?.linkedin || "",
    website: a.socialLinks?.website || "",
  };
}

export default function AuthorsAdminPage() {
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetchAuthorsAdmin()
      .then((r) => setAuthors(r.authors as AuthorRow[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const set = (k: keyof FormState, v: string | boolean) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleSave = async () => {
    if (!form) return;
    if (!form.nameEn && !form.nameHi) {
      toast.error("Author name is required.");
      return;
    }
    setSaving(true);
    const payload = {
      ...(form.id ? { id: form.id } : {}),
      nameEn: form.nameEn,
      nameHi: form.nameHi,
      slug: form.slug,
      roleEn: form.roleEn,
      roleHi: form.roleHi,
      authorType: form.authorType,
      isActive: form.isActive,
      isVerified: form.isVerified,
      bioEn: form.bioEn,
      bioHi: form.bioHi,
      expertiseEn: form.expertiseEn,
      expertiseHi: form.expertiseHi,
      languages: form.languages,
      coverageAreas: form.coverageAreas,
      profileImageUrl: form.profileImageUrl,
      emailPublic: form.emailPublic,
      socialLinks: {
        x: form.x,
        facebook: form.facebook,
        instagram: form.instagram,
        linkedin: form.linkedin,
        website: form.website,
      },
    } as unknown as Partial<Author> & { id?: string };

    try {
      if (form.id) {
        await updateAuthor(payload as Partial<Author> & { id: string });
        toast.success("Author updated.");
      } else {
        await createAuthor(payload);
        toast.success("Author created.");
      }
      setForm(null);
      setLoading(true);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: AuthorRow) => {
    if (!confirm(`Delete author "${a.nameEn || a.nameHi}"? This cannot be undone.`)) return;
    try {
      await deleteAuthor(a.id);
      setAuthors((prev) => prev.filter((x) => x.id !== a.id));
      toast.success("Author deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="Authors" />

      <div className="mb-3 flex items-center justify-between">
        <Link href="/admin/trust" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#1a2b4c]">
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          onClick={() => setForm({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#c41e20] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-95"
        >
          <Plus size={14} /> Add author
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-800">
        Transparency note: do not represent an AI system as a human journalist. Use the &quot;Editorial team&quot; or
        &quot;System / automated&quot; type for automated content, and avoid fake names or photos.
      </div>

      {/* Editor */}
      {form ? (
        <div className="mb-5 rounded-xl border border-[#1a2b4c]/20 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1a2b4c]">{form.id ? "Edit author" : "New author"}</h2>
            <button onClick={() => setForm(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <F label="Name (English)"><input className={inputCls} value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></F>
            <F label="Name (Hindi)"><input className={inputCls} value={form.nameHi} onChange={(e) => set("nameHi", e.target.value)} /></F>
            <F label="Slug (optional)"><input className={inputCls} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" /></F>
            <F label="Author type">
              <select className={inputCls} value={form.authorType} onChange={(e) => set("authorType", e.target.value)}>
                {AUTHOR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.labelEn}</option>
                ))}
              </select>
            </F>
            <F label="Role (English)"><input className={inputCls} value={form.roleEn} onChange={(e) => set("roleEn", e.target.value)} /></F>
            <F label="Role (Hindi)"><input className={inputCls} value={form.roleHi} onChange={(e) => set("roleHi", e.target.value)} /></F>
            <F label="Bio (English)"><textarea className={`${inputCls} min-h-[80px] resize-y`} value={form.bioEn} onChange={(e) => set("bioEn", e.target.value)} /></F>
            <F label="Bio (Hindi)"><textarea className={`${inputCls} min-h-[80px] resize-y`} value={form.bioHi} onChange={(e) => set("bioHi", e.target.value)} /></F>
            <F label="Expertise EN (comma separated)"><input className={inputCls} value={form.expertiseEn} onChange={(e) => set("expertiseEn", e.target.value)} /></F>
            <F label="Expertise HI (comma separated)"><input className={inputCls} value={form.expertiseHi} onChange={(e) => set("expertiseHi", e.target.value)} /></F>
            <F label="Languages (comma separated)"><input className={inputCls} value={form.languages} onChange={(e) => set("languages", e.target.value)} placeholder="Hindi, English" /></F>
            <F label="Coverage areas (comma separated)"><input className={inputCls} value={form.coverageAreas} onChange={(e) => set("coverageAreas", e.target.value)} /></F>
            <F label="Profile image URL"><input className={inputCls} value={form.profileImageUrl} onChange={(e) => set("profileImageUrl", e.target.value)} placeholder="https://…" /></F>
            <F label="Public email"><input className={inputCls} value={form.emailPublic} onChange={(e) => set("emailPublic", e.target.value)} /></F>
            <F label="X (Twitter) URL"><input className={inputCls} value={form.x} onChange={(e) => set("x", e.target.value)} /></F>
            <F label="Facebook URL"><input className={inputCls} value={form.facebook} onChange={(e) => set("facebook", e.target.value)} /></F>
            <F label="Instagram URL"><input className={inputCls} value={form.instagram} onChange={(e) => set("instagram", e.target.value)} /></F>
            <F label="LinkedIn URL"><input className={inputCls} value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} /></F>
            <F label="Website URL"><input className={inputCls} value={form.website} onChange={(e) => set("website", e.target.value)} /></F>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ToggleSwitch label="Active (visible on site)" checked={form.isActive} onChange={(v) => set("isActive", v)} />
            <ToggleSwitch label="Verified badge" checked={form.isVerified} onChange={(v) => set("isVerified", v)} />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="rounded-md border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#c41e20] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              <Save size={14} /> {saving ? "Saving…" : "Save author"}
            </button>
          </div>
        </div>
      ) : null}

      {/* List */}
      {authors.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No authors yet. Create your first author profile (e.g. a &quot;News Junction Team&quot; editorial-team
          profile).
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {authors.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-semibold text-[#1a2b4c]">
                      {a.nameEn || a.nameHi}
                      {a.isVerified ? <BadgeCheck size={14} className="text-[#1d4e89]" /> : null}
                    </div>
                    <div className="text-xs text-gray-400">/{a.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {AUTHOR_TYPES.find((t) => t.value === a.authorType)?.labelEn || a.authorType}
                  </td>
                  <td className="px-4 py-3">
                    {a.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/authors/${a.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-[#1a2b4c] hover:text-[#1a2b4c]"
                      >
                        <ExternalLink size={12} /> Preview
                      </a>
                      <button
                        onClick={() => setForm(toForm(a))}
                        className="inline-flex items-center gap-1 rounded-md bg-[#1a2b4c] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-[#c41e20]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RoleGuard>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import FormInput from "@/components/admin/FormInput";
import FormTextarea from "@/components/admin/FormTextarea";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import ConfirmModal from "@/components/admin/ConfirmModal";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAllAdSlots, createAdSlot, updateAdSlot, deleteAdSlot } from "@/firebase/firestore";
import { AdSlot, AdLocation } from "@/types";
import toast from "react-hot-toast";

const emptySlot = { name: "", location: "sidebar" as AdLocation, code: "", isActive: false };

export default function AdsPage() {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdSlot | null>(null);
  const [form, setForm] = useState(emptySlot);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setSlots(await getAllAdSlots());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateAdSlot(editing.id, form);
        toast.success("Ad slot updated");
      } else {
        await createAdSlot(form);
        toast.success("Ad slot created");
      }
      setShowForm(false);
      await load();
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAdSlot(deleteId);
    toast.success("Deleted");
    setDeleteId(null);
    await load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard requireSuperAdmin>
      <AdminTopbar
        title="Ad Management"
        actions={
          <button onClick={() => { setEditing(null); setForm(emptySlot); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-bold text-white">
            <Plus size={16} /> Add Ad Slot
          </button>
        }
      />

      <p className="mb-4 text-sm text-gray-500">Placeholder ad slots for future Google AdSense integration.</p>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div>
              <label className="mb-1 block text-sm font-medium">Location</label>
              <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as AdLocation })} className="w-full rounded-lg border px-4 py-2.5 text-sm">
                {(["header", "sidebar", "inArticle", "footer", "mobile"] as const).map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <FormTextarea label="Ad Code (HTML/AdSense)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} rows={4} placeholder="<!-- AdSense code or placeholder HTML -->" />
            <ToggleSwitch label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <div className="flex gap-3">
              <button type="submit" className="rounded-lg bg-[#1a2b4c] px-6 py-2 text-sm font-bold text-white">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-6 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {slots.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No ad slots configured.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td className="px-4 py-3 font-medium">{slot.name}</td>
                  <td className="px-4 py-3">{slot.location}</td>
                  <td className="px-4 py-3"><StatusBadge status={slot.isActive ? "active" : "draft"} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(slot); setForm({ name: slot.name, location: slot.location, code: slot.code, isActive: slot.isActive }); setShowForm(true); }} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
                      <button onClick={() => setDeleteId(slot.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal open={!!deleteId} title="Delete Ad Slot" message="Delete this ad slot?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </RoleGuard>
  );
}

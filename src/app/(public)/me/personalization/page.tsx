"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  addBookmarkApi,
  generateDigestApi,
  getBookmarksApi,
  getDigestApi,
  getFollowApi,
  getHistoryApi,
  getPreferencesApi,
  getRecommendationsApi,
  removeBookmarkApi,
  updateFollowApi,
  updatePreferencesApi,
} from "@/lib/personalization/client-api";
import toast from "react-hot-toast";

export default function PersonalizationPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(true);
  const [prefs, setPrefs] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [bookmarks, setBookmarks] = useState<Record<string, unknown>[]>([]);
  const [follows, setFollows] = useState<Record<string, unknown> | null>(null);
  const [recs, setRecs] = useState<Record<string, unknown>[]>([]);
  const [digests, setDigests] = useState<Record<string, unknown>[]>([]);
  const [searchBookmark, setSearchBookmark] = useState("");
  const [followInput, setFollowInput] = useState("");

  const refresh = async () => {
    const [p, h, b, f, r, d] = await Promise.all([
      getPreferencesApi(),
      getHistoryApi(),
      getBookmarksApi(searchBookmark || undefined),
      getFollowApi(),
      getRecommendationsApi(),
      getDigestApi(),
    ]);
    setPrefs(p as Record<string, unknown>);
    setHistory(((h as Record<string, unknown>).items as Record<string, unknown>[]) || []);
    setBookmarks(((b as Record<string, unknown>).items as Record<string, unknown>[]) || []);
    setFollows(f as Record<string, unknown>);
    setRecs((((r as Record<string, unknown>).recommendations as Record<string, unknown>[]) || []).slice(0, 20));
    setDigests((((d as Record<string, unknown>).items as Record<string, unknown>[]) || []).slice(0, 20));
  };

  useEffect(() => {
    if (!loading && user) {
      (async () => {
        await refresh();
        setBusy(false);
      })().catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load personalization");
        setBusy(false);
      });
    } else if (!loading) {
      setBusy(false);
    }
  }, [loading, user]);

  const categories = useMemo(() => (Array.isArray(follows?.categories) ? (follows?.categories as string[]) : []), [follows]);
  const topics = useMemo(() => (Array.isArray(follows?.topics) ? (follows?.topics as string[]) : []), [follows]);
  const authors = useMemo(() => (Array.isArray(follows?.authors) ? (follows?.authors as string[]) : []), [follows]);
  const locations = useMemo(() => (Array.isArray(follows?.locations) ? (follows?.locations as string[]) : []), [follows]);

  const savePrefs = async () => {
    await updatePreferencesApi(prefs || {});
    toast.success("Preferences updated");
    await refresh();
  };

  const toggleFollow = async (target: "categories" | "topics" | "authors" | "locations", value: string) => {
    if (!value.trim()) return;
    const list = target === "categories" ? categories : target === "topics" ? topics : target === "authors" ? authors : locations;
    const exists = list.includes(value.trim());
    await updateFollowApi({
      target,
      action: exists ? "unfollow" : "follow",
      value: value.trim(),
    });
    setFollowInput("");
    await refresh();
  };

  const addBookmarkById = async () => {
    const articleId = prompt("Enter article ID to bookmark:");
    const slug = prompt("Enter article slug:");
    const title = prompt("Enter article title:");
    if (!articleId || !slug || !title) return;
    await addBookmarkApi({ articleId, slug, title });
    toast.success("Bookmarked");
    await refresh();
  };

  if (loading || busy) return <LoadingSpinner size="lg" />;
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-[#1a2b4c]">AI Personalization</h1>
        <p className="mt-2 text-gray-600">Login to use bookmarks, follows, recommendations, and personalized digests.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1a2b4c]">Personalization Settings & Experience</h1>
      <p className="mt-1 text-sm text-gray-600">
        Personalization is optional and based on explicit actions and preferences only.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#1a2b4c]">Preferences</h2>
          <div className="space-y-2 text-sm">
            <label>Preferred language
              <select className="mt-1 w-full rounded border px-2 py-1" value={String(prefs?.preferredLanguage || "hi")} onChange={(e) => setPrefs((p) => ({ ...(p || {}), preferredLanguage: e.target.value }))}>
                <option value="hi">Hindi</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>Theme
              <select className="mt-1 w-full rounded border px-2 py-1" value={String(prefs?.themePreference || "system")} onChange={(e) => setPrefs((p) => ({ ...(p || {}), themePreference: e.target.value }))}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>Font
              <select className="mt-1 w-full rounded border px-2 py-1" value={String(prefs?.fontPreference || "medium")} onChange={(e) => setPrefs((p) => ({ ...(p || {}), fontPreference: e.target.value }))}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
            <label><input type="checkbox" checked={Boolean(prefs?.personalizationEnabled)} onChange={(e) => setPrefs((p) => ({ ...(p || {}), personalizationEnabled: e.target.checked }))} /> Personalization enabled</label>
            <button className="rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={savePrefs}>Save Preferences</button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#1a2b4c]">Follow</h2>
          <div className="mb-2 flex gap-2">
            <input className="w-full rounded border px-2 py-1 text-sm" value={followInput} onChange={(e) => setFollowInput(e.target.value)} placeholder="Add category/topic/author/location" />
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            <button className="rounded border px-2 py-1 text-xs" onClick={() => toggleFollow("categories", followInput)}>Toggle Category</button>
            <button className="rounded border px-2 py-1 text-xs" onClick={() => toggleFollow("topics", followInput)}>Toggle Topic</button>
            <button className="rounded border px-2 py-1 text-xs" onClick={() => toggleFollow("authors", followInput)}>Toggle Author</button>
            <button className="rounded border px-2 py-1 text-xs" onClick={() => toggleFollow("locations", followInput)}>Toggle Location</button>
          </div>
          <div className="text-sm">
            <p><strong>Categories:</strong> {categories.join(", ") || "None"}</p>
            <p><strong>Topics:</strong> {topics.join(", ") || "None"}</p>
            <p><strong>Authors:</strong> {authors.join(", ") || "None"}</p>
            <p><strong>Locations:</strong> {locations.join(", ") || "None"}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#1a2b4c]">Bookmarks</h2>
          <div className="mb-2 flex gap-2">
            <input className="w-full rounded border px-2 py-1 text-sm" placeholder="Search bookmarks" value={searchBookmark} onChange={(e) => setSearchBookmark(e.target.value)} />
            <button className="rounded border px-3 py-1 text-sm" onClick={refresh}>Search</button>
          </div>
          <button className="mb-2 rounded border px-3 py-1 text-sm" onClick={addBookmarkById}>Bookmark by article id</button>
          <div className="space-y-2 text-sm">
            {bookmarks.map((b) => (
              <div key={String(b.id)} className="rounded border p-2">
                <Link href={`/article/${String(b.slug)}`} className="font-medium text-[#c41e20] hover:underline">
                  {String(b.title)}
                </Link>
                <div>
                  <button className="text-xs text-red-700" onClick={() => removeBookmarkApi(String(b.articleId)).then(refresh)}>Remove</button>
                </div>
              </div>
            ))}
            {!bookmarks.length && <p className="text-gray-500">No bookmarks yet.</p>}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#1a2b4c]">Reading History</h2>
          <div className="space-y-2 text-sm">
            {history.map((h) => (
              <div key={String(h.id)} className="rounded border p-2">
                <p>Article: {String(h.articleId)}</p>
                <p className="text-xs text-gray-500">
                  Time: {String(h.readingTimeSec || 0)}s · Completed: {String(Boolean(h.completed))}
                </p>
              </div>
            ))}
            {!history.length && <p className="text-gray-500">No reading history yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#1a2b4c]">Recommended For You</h2>
          <div className="space-y-2 text-sm">
            {recs.map((r) => (
              <div key={`${String(r.articleId)}-${String(r.createdAt)}`} className="rounded border p-2">
                <p>Article: {String(r.articleId)}</p>
                <p className="text-xs text-gray-500">Reason: {String(r.reason)} · Score: {String(r.score)}</p>
              </div>
            ))}
            {!recs.length && <p className="text-gray-500">No recommendations currently.</p>}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#1a2b4c]">Digest Settings & History</h2>
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
            {["morning", "evening", "weekly", "technology", "business", "sports", "entertainment"].map((type) => (
              <button key={type} className="rounded border px-2 py-1" onClick={() => generateDigestApi(type).then(refresh)}>{type}</button>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            {digests.map((d) => (
              <div key={String(d.id)} className="rounded border p-2">
                <p className="font-medium">{String(d.title)}</p>
                <pre className="mt-1 whitespace-pre-wrap text-xs text-gray-600">{String(d.summary || "")}</pre>
              </div>
            ))}
            {!digests.length && <p className="text-gray-500">No digests yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

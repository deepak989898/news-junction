"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  Copy,
  RefreshCw,
  Check,
  X,
  Save,
  Shield,
  Activity,
} from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAllNewsForAdmin } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { CONTENT_ACTION_LABELS } from "@/lib/ai-studio/defaults";
import { ContentActionType, AIRiskReport, AIUsageStats, AISettings } from "@/lib/ai-studio/types";
import { getTargetField } from "@/lib/ai-studio/field-map";
import {
  runContentAction,
  runRiskCheck,
  applyAIContent,
  fetchAIUsage,
  fetchAISettingsClient,
  updateAISettingsClient,
  reviewPendingChange,
} from "@/lib/ai-studio/client-api";
import { getAuthToken } from "@/lib/automation/client-api";
import toast from "react-hot-toast";

interface PendingItem {
  id: string;
  articleId: string;
  actionType: string;
  field: string;
  oldValue: string;
  newValue: string;
  requestedBy: string;
  requestedByName?: string;
  status: string;
  createdAt: string | null;
}

interface LogItem {
  id: string;
  articleId: string;
  actionType: string;
  provider: string;
  outputPreview: string;
  tokensUsed: number;
  estimatedCost: number;
  status: string;
  createdAt: string | null;
}

const ACTION_OPTIONS = Object.entries(CONTENT_ACTION_LABELS).map(([value, label]) => ({
  value: value as ContentActionType,
  label,
}));

export default function AIContentStudioPage() {
  const { adminUser } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState<ContentActionType>("rewrite_headline");
  const [language, setLanguage] = useState<"hi" | "en" | "both">("both");
  const [customInstruction, setCustomInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [aiField, setAiField] = useState("");
  const [pendingChangeId, setPendingChangeId] = useState<string | undefined>();
  const [riskReport, setRiskReport] = useState<AIRiskReport | null>(null);
  const [usage, setUsage] = useState<AIUsageStats | null>(null);
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [checkingRisk, setCheckingRisk] = useState(false);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedId) || null,
    [articles, selectedId]
  );

  const filteredArticles = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return articles.slice(0, 50);
    return articles
      .filter(
        (a) =>
          a.titleHi.toLowerCase().includes(term) ||
          a.titleEn.toLowerCase().includes(term) ||
          a.slug.toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [articles, search]);

  const currentValue = useMemo(() => {
    if (!selectedArticle || !aiField) return "";
    const a = selectedArticle as unknown as Record<string, unknown>;
    const val = a[aiField];
    if (Array.isArray(val)) return val.join(", ");
    return String(val || "");
  }, [selectedArticle, aiField]);

  const loadMeta = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const [usageData, settingsData, logsRes] = await Promise.all([
        fetchAIUsage(),
        fetchAISettingsClient(),
        fetch("/api/ai/logs", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);
      setUsage(usageData);
      setSettings(settingsData);
      setLogs(logsRes.logs || []);
      setPending(logsRes.pending || []);
    } catch {
      /* optional on first load */
    }
  }, []);

  useEffect(() => {
    (async () => {
      const news = await getAllNewsForAdmin();
      setArticles(news);
      if (news.length) setSelectedId(news[0].id);
      await loadMeta();
      setLoading(false);
    })();
  }, [loadMeta]);

  const handleGenerate = async () => {
    if (!selectedId) {
      toast.error("Select an article");
      return;
    }
    if (usage?.limitExceeded) {
      toast.error("AI usage limit exceeded");
      return;
    }
    if (settings && !settings.aiEnabled) {
      toast.error("AI is disabled in settings");
      return;
    }

    setGenerating(true);
    setAiOutput("");
    setPendingChangeId(undefined);
    try {
      const result = await runContentAction({
        articleId: selectedId,
        actionType,
        language,
        customInstruction: customInstruction || undefined,
      });
      setAiOutput(result.output);
      setAiField(result.field || getTargetField(actionType, language));
      setPendingChangeId(result.pendingChangeId);
      if (result.pendingChangeId) {
        toast.success("Change submitted for approval");
      } else {
        toast.success("AI output ready — review before applying");
      }
      await loadMeta();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRiskCheck = async () => {
    if (!selectedId) return;
    setCheckingRisk(true);
    try {
      const result = await runRiskCheck(selectedId);
      setRiskReport(result.report);
      toast.success("Risk check complete");
      await loadMeta();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Risk check failed");
    } finally {
      setCheckingRisk(false);
    }
  };

  const handleApply = async (saveAsDraft = false) => {
    if (!selectedId || !aiField || !aiOutput) return;
    if (settings?.requireApprovalForAIChanges && pendingChangeId) {
      toast.error("This change requires super admin approval first");
      return;
    }
    try {
      await applyAIContent({
        articleId: selectedId,
        field: aiField,
        newValue: aiOutput,
        actionType,
        saveAsDraft,
        pendingChangeId,
      });
      toast.success(saveAsDraft ? "Saved as draft" : "Applied to article");
      const news = await getAllNewsForAdmin();
      setArticles(news);
      await loadMeta();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiOutput);
    toast.success("Copied to clipboard");
  };

  const handleReview = async (pendingChangeId: string, action: "approve" | "reject") => {
    try {
      await reviewPendingChange({ pendingChangeId, action });
      toast.success(action === "approve" ? "Approved and applied" : "Rejected");
      await loadMeta();
      const news = await getAllNewsForAdmin();
      setArticles(news);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    }
  };

  const updateSetting = async (patch: Partial<AISettings>) => {
    try {
      const updated = await updateAISettingsClient(patch);
      setSettings(updated);
      toast.success("AI settings updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const riskColor =
    riskReport?.riskLevel === "high"
      ? "text-red-600 bg-red-50 border-red-200"
      : riskReport?.riskLevel === "medium"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-green-700 bg-green-50 border-green-200";

  return (
    <RoleGuard>
      <AdminTopbar
        title="AI Content Studio"
        actions={
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <Sparkles size={16} className="text-[#c41e20]" />
            Provider: {settings?.provider || "openai"}
          </span>
        }
      />

      {usage?.limitExceeded && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mr-2 inline" size={16} />
          Daily token or monthly cost limit reached. AI calls are paused until limits reset.
        </div>
      )}

      {adminUser?.role === "super_admin" && settings && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">AI Provider Settings</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Provider</label>
              <select
                value={settings.provider}
                onChange={(e) => updateSetting({ provider: e.target.value as AISettings["provider"] })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Daily token limit</label>
              <input
                type="number"
                value={settings.dailyTokenLimit}
                onChange={(e) => updateSetting({ dailyTokenLimit: Number(e.target.value) })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Monthly cost limit ($)</label>
              <input
                type="number"
                step="0.01"
                value={settings.monthlyCostLimit}
                onChange={(e) => updateSetting({ monthlyCostLimit: Number(e.target.value) })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.requireApprovalForAIChanges}
              onChange={(e) => updateSetting({ requireApprovalForAIChanges: e.target.checked })}
            />
            Require approval before applying AI changes
          </label>
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 font-semibold text-[#1a2b4c]">
            <Activity size={18} /> AI Usage
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Daily tokens</p>
              <p className="font-bold">
                {(usage?.dailyTokens || 0).toLocaleString()} / {(usage?.dailyLimit || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Monthly cost</p>
              <p className="font-bold">
                ${(usage?.monthlyCost || 0).toFixed(4)} / ${(usage?.monthlyLimit || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-[#1a2b4c]">
              <Shield size={18} /> Risk Report
            </div>
            <button
              onClick={handleRiskCheck}
              disabled={!selectedId || checkingRisk}
              className="rounded-lg bg-[#1a2b4c] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {checkingRisk ? "Checking..." : "Run Risk Check"}
            </button>
          </div>
          {riskReport ? (
            <div className={`rounded-lg border p-3 text-sm ${riskColor}`}>
              <p className="font-bold capitalize">Level: {riskReport.riskLevel}</p>
              {riskReport.riskReasons.length > 0 && (
                <ul className="mt-2 list-inside list-disc">
                  {riskReport.riskReasons.slice(0, 4).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
              {riskReport.needsHumanApproval && (
                <p className="mt-2 font-medium">Human approval recommended before publishing.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select an article and run risk check.</p>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Select Article</h3>
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
          />
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            size={8}
          >
            {filteredArticles.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.status}] {a.titleEn || a.titleHi}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 font-semibold text-[#1a2b4c]">AI Action</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as ContentActionType)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "hi" | "en" | "both")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="both">Both / Auto</option>
                <option value="hi">Hindi</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-500">Custom instruction (optional)</label>
            <textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. Keep under 80 characters, formal tone..."
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedId || usage?.limitExceeded}
            className="mt-4 flex items-center gap-2 rounded-lg bg-[#c41e20] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Sparkles size={16} />
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {(aiOutput || generating) && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#1a2b4c]">Preview — Current vs AI Suggested</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-500">Current ({aiField || "field"})</p>
              <div className="min-h-[160px] rounded-lg border bg-gray-50 p-4 text-sm whitespace-pre-wrap">
                {currentValue || "—"}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-500">AI Suggested</p>
              <div className="min-h-[160px] rounded-lg border border-[#c41e20]/30 bg-red-50/30 p-4 text-sm whitespace-pre-wrap">
                {generating ? "Generating..." : aiOutput || "—"}
              </div>
            </div>
          </div>
          {aiOutput && (
            <div className="mt-4 flex flex-wrap gap-2">
              {!settings?.requireApprovalForAIChanges && (
                <>
                  <button
                    onClick={() => handleApply(false)}
                    className="flex items-center gap-1 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-bold text-white"
                  >
                    <Check size={16} /> Apply to Article
                  </button>
                  <button
                    onClick={() => handleApply(true)}
                    className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium"
                  >
                    <Save size={16} /> Save as Draft
                  </button>
                </>
              )}
              <button onClick={handleCopy} className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium">
                <Copy size={16} /> Copy
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium"
              >
                <RefreshCw size={16} /> Regenerate
              </button>
              <button
                onClick={() => { setAiOutput(""); setPendingChangeId(undefined); }}
                className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium text-red-600"
              >
                <X size={16} /> Reject
              </button>
            </div>
          )}
          {pendingChangeId && (
            <p className="mt-3 text-xs text-amber-600">
              Pending approval ID: {pendingChangeId}. Super admin must approve before applying.
            </p>
          )}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#1a2b4c]">Pending AI Changes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 pr-4">Article</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Field</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Review</th>
                </tr>
              </thead>
              <tbody>
                {pending.filter((p) => p.status === "pending").map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 pr-4">{p.articleId.slice(0, 8)}...</td>
                    <td className="py-2 pr-4">{CONTENT_ACTION_LABELS[p.actionType] || p.actionType}</td>
                    <td className="py-2 pr-4">{p.field}</td>
                    <td className="py-2 pr-4 capitalize">{p.status}</td>
                    <td className="py-2">
                      {adminUser?.role === "super_admin" ? (
                        <span className="flex gap-2">
                          <button
                            onClick={() => handleReview(p.id, "approve")}
                            className="text-xs font-bold text-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(p.id, "reject")}
                            className="text-xs font-bold text-red-600"
                          >
                            Reject
                          </button>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Awaiting super admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-[#1a2b4c]">Recent AI Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">Tokens</th>
                <th className="py-2 pr-4">Cost</th>
                <th className="py-2">Preview</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4">{CONTENT_ACTION_LABELS[log.actionType] || log.actionType}</td>
                  <td className="py-2 pr-4">{log.provider}</td>
                  <td className="py-2 pr-4">{log.tokensUsed}</td>
                  <td className="py-2 pr-4">${(log.estimatedCost || 0).toFixed(4)}</td>
                  <td className="py-2 max-w-xs truncate">{log.outputPreview}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">
                    No AI actions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGuard>
  );
}

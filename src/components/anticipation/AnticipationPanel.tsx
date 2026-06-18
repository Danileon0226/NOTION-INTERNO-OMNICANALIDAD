"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  Check,
  X,
  Wand2,
  ChevronRight,
  EyeOff,
} from "lucide-react";
import { sourceMeta } from "@/lib/activity";
import { resolveAnticipations, type Anticipation } from "@/lib/anticipation/engine";
import { useAnticipation } from "@/lib/anticipation/store";
import { runAgent } from "@/lib/ai/agent";

export function AnticipationPanel({ limit }: { limit?: number }) {
  const enabled = useAnticipation((s) => s.enabled);
  const recordFeedback = useAnticipation((s) => s.recordFeedback);
  const [items, setItems] = useState<Anticipation[]>([]);
  const [shadow, setShadow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await resolveAnticipations();
      setItems(limit ? res.visible.slice(0, limit) : res.visible);
      setShadow(res.shadow);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function act(a: Anticipation) {
    if (!a.suggestPrompt) return;
    setBusy(a.key);
    setResult(null);
    try {
      const res = await runAgent(a.suggestPrompt, [], undefined, "anticipación");
      recordFeedback(a.key, a.type, "accepted");
      setResult({ key: a.key, text: res.text });
      setItems((prev) => prev.filter((x) => x.key !== a.key));
    } catch (e) {
      setResult({ key: a.key, text: `⚠️ ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  }

  function dismiss(a: Anticipation) {
    recordFeedback(a.key, a.type, "dismissed");
    setItems((prev) => prev.filter((x) => x.key !== a.key));
  }

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed glass-card p-4 text-sm text-muted">
        <EyeOff size={15} className="mr-1 inline" /> Anticipación desactivada.{" "}
        <Link href="/anticipation" className="text-accent underline">
          Actívala
        </Link>{" "}
        para que ZERO se adelante a tus necesidades.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Sparkles size={15} className="text-accent" /> ZERO se adelanta
          {shadow > 0 && (
            <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] font-normal text-muted">
              {shadow} en observación
            </span>
          )}
        </h2>
        <button
          onClick={refresh}
          className="flex items-center gap-1 text-xs text-muted hover:text-ink"
          title="Recalcular"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Recalcular
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border glass-card px-3 py-4 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Anticipando…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed glass-card px-3 py-6 text-center text-sm text-muted">
          Sin anticipaciones por ahora. Todo bajo control. ✨
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.key} className="rounded-xl border glass-card p-3">
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: sourceMeta[a.source].color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <ModeBadge mode={a.mode} />
                    {a.leadTime && (
                      <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] text-muted">{a.leadTime}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{a.reason}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ConfidenceBar value={a.confidence} />
                    <span className="text-[10px] tabular-nums text-muted">
                      {Math.round(a.confidence * 100)}% confianza
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {a.suggestPrompt ? (
                      <button
                        onClick={() => act(a)}
                        disabled={busy === a.key}
                        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {busy === a.key ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        Que ZERO lo haga
                      </button>
                    ) : (
                      <Link
                        href="/connectors"
                        className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Conectar <ChevronRight size={12} />
                      </Link>
                    )}
                    <button
                      onClick={() => dismiss(a)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted hover:bg-bg-subtle"
                    >
                      <X size={12} /> Descartar
                    </button>
                  </div>

                  {result?.key === a.key && (
                    <div className="mt-2 rounded-lg bg-bg-subtle px-3 py-2 text-xs text-ink">
                      <p className="whitespace-pre-wrap">{result.text}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {result && !items.some((x) => x.key === result.key) && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <p className="mb-1 flex items-center gap-1 font-medium">
                <Check size={13} /> Hecho por ZERO
              </p>
              <p className="whitespace-pre-wrap">{result.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeBadge({ mode }: { mode?: string }) {
  if (!mode || mode === "shadow") return null;
  const map: Record<string, string> = {
    suggest: "bg-violet-100 text-violet-700",
    auto: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${map[mode] ?? ""}`}>{mode}</span>;
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-subtle">
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

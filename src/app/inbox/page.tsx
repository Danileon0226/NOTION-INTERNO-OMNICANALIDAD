"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { EmailCategory, EmailItem } from "@/lib/types";
import { categoryColors, categoryLabels } from "@/lib/data/emails";
import { useConnectors, googleTokenValid, GMAIL_SCOPE } from "@/lib/connectors/store";
import { gmailFetchInbox } from "@/lib/connectors/google";
import { connectGoogle } from "@/lib/connectors/googleConnect";

export default function InboxPage() {
  const conn = useConnectors();
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [filter, setFilter] = useState<EmailCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const connected = googleTokenValid(conn.google, GMAIL_SCOPE);

  const load = useCallback(async () => {
    if (!googleTokenValid(useConnectors.getState().google, GMAIL_SCOPE)) {
      setEmails([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      setEmails(await gmailFetchInbox(useConnectors.getState().google.accessToken, 40));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function connect() {
    setErr("");
    setLoading(true);
    try {
      await connectGoogle();
      await load();
    } catch (e) {
      setErr((e as Error).message);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<EmailCategory>();
    emails.forEach((e) => set.add(e.category));
    return Array.from(set);
  }, [emails]);

  const filtered = filter === "all" ? emails : emails.filter((e) => e.category === filter);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bandeja unificada</h1>
          <p className="mt-1 text-sm text-muted">Correo de la agencia, en vivo, clasificado por categoría.</p>
        </div>
        {connected && (
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sincronizar
          </button>
        )}
      </header>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>
      )}

      {!connected && !loading ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-6 py-12 text-center">
          <Sparkles size={28} className="text-accent" />
          <p className="text-sm font-semibold text-ink">Conecta Gmail para ver tu bandeja real</p>
          <p className="max-w-sm text-xs text-muted">
            Un clic conecta Gmail, Drive y Calendar. También puedes gestionarlo en{" "}
            <Link href="/connectors" className="font-medium text-accent underline">
              Conectores
            </Link>
            .
          </p>
          <button
            onClick={connect}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Conectar Google
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Sincronizando bandeja…
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Chip active={filter === "all"} onClick={() => setFilter("all")} label={`Todos (${emails.length})`} />
            {categories.map((c) => (
              <Chip
                key={c}
                active={filter === c}
                onClick={() => setFilter(c)}
                label={categoryLabels[c]}
                color={categoryColors[c]}
              />
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted">
              Sin correos en esta vista.
            </div>
          ) : (
            <div className="divide-y rounded-lg border bg-card">
              {filtered.map((e) => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-bg-subtle">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: categoryColors[e.category] }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm ${e.unread ? "font-semibold text-ink" : "text-ink/80"}`}>
                        {e.subject}
                      </span>
                      <span className="shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] text-muted">
                        {e.senderName}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{e.snippet}</p>
                    {e.actionItem && <p className="mt-1 text-xs text-accent">→ {e.actionItem}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted">
                    {new Date(e.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
        active ? "border-ink bg-ink text-white" : "bg-card text-ink hover:bg-bg-subtle"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  );
}

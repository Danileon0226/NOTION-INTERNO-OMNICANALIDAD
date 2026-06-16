"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmailCategory, EmailItem } from "@/lib/types";
import { categoryColors, categoryLabels } from "@/lib/data/emails";

export default function InboxPage() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [filter, setFilter] = useState<EmailCategory | "all">("all");

  useEffect(() => {
    fetch("/api/emails")
      .then((r) => r.json())
      .then((d) => setEmails(d.emails));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<EmailCategory>();
    emails.forEach((e) => set.add(e.category));
    return Array.from(set);
  }, [emails]);

  const filtered = filter === "all" ? emails : emails.filter((e) => e.category === filter);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Bandeja unificada</h1>
        <p className="mt-1 text-sm text-muted">Correo de la agencia clasificado por categoría.</p>
      </header>

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

      <div className="divide-y rounded-lg border bg-white">
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
              {e.actionItem && (
                <p className="mt-1 text-xs text-accent">→ {e.actionItem}</p>
              )}
            </div>
            <span className="shrink-0 text-[11px] text-muted">
              {new Date(e.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
            </span>
          </div>
        ))}
      </div>
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
        active ? "border-ink bg-ink text-white" : "bg-white text-ink hover:bg-bg-subtle"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  );
}

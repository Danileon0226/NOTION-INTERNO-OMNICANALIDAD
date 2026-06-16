"use client";

import { useEffect, useState } from "react";
import { Mail, HardDrive, Github, Send, ExternalLink, Check } from "lucide-react";
import type { Connector, ConnectorId } from "@/lib/types";

const icons: Record<ConnectorId, React.ReactNode> = {
  gmail: <Mail size={22} />,
  "google-drive": <HardDrive size={22} />,
  github: <Github size={22} />,
  telegram: <Send size={22} />,
};

const statusLabel: Record<Connector["status"], string> = {
  connected: "Conectado",
  pending: "Pendiente",
  error: "Error",
  disconnected: "Sin conectar",
};

const statusStyle: Record<Connector["status"], string> = {
  connected: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
  error: "bg-red-50 text-red-600",
  disconnected: "bg-gray-100 text-gray-500",
};

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [busy, setBusy] = useState<ConnectorId | null>(null);

  useEffect(() => {
    fetch("/api/connectors")
      .then((r) => r.json())
      .then((d) => setConnectors(d.connectors));
  }, []);

  async function connect(id: ConnectorId) {
    setBusy(id);
    const res = await fetch("/api/connectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "connect" }),
    }).then((r) => r.json());
    setBusy(null);
    alert(`${res.message}\n\nSiguiente paso: ${res.next}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Conectores omnicanal</h1>
        <p className="mt-1 text-sm text-muted">
          Integra tus herramientas con el workspace usando los conectores de Claude. Toda la data se
          monta automáticamente en el dashboard.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {connectors.map((c) => (
          <div key={c.id} className="flex flex-col rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-subtle text-ink">
                  {icons[c.id]}
                </div>
                <div>
                  <h2 className="font-semibold text-ink">{c.name}</h2>
                  <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${statusStyle[c.status]}`}>
                    {statusLabel[c.status]}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted">{c.description}</p>

            {c.metrics && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {c.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg bg-bg-subtle px-3 py-2">
                    <div className="text-lg font-semibold text-ink">{m.value}</div>
                    <div className="text-[11px] text-muted">{m.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 border-t pt-3">
              {c.status === "connected" ? (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <Check size={15} /> {c.detail}
                </span>
              ) : (
                <button
                  onClick={() => connect(c.id)}
                  disabled={busy === c.id}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy === c.id ? "Conectando…" : c.status === "pending" ? "Completar conexión" : "Conectar"}
                </button>
              )}
              {c.docsUrl && (
                <a
                  href={c.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-ink"
                >
                  Docs <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

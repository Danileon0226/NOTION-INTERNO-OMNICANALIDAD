"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Sun, Save, Check } from "lucide-react";
import { runAgent } from "@/lib/ai/agent";
import { useAi } from "@/lib/ai/store";

const BRIEFING_PROMPT = `Genera mi BRIEFING EJECUTIVO del día como gestor de conciencia de la agencia.
Pasos: 1) llama a anticipate para las próximas mejores acciones; 2) llama a site_status para
el estado del sitio web; 3) si hay acceso, revisa correos urgentes/no leídos (gmail_search) y
eventos próximos (calendar_upcoming); 4) usa recall para traer contexto recordado relevante.
Devuelve un resumen MUY conciso: saludo de una línea, luego 3 a 5 viñetas accionables ordenadas
por prioridad (con el porqué). Si detectas algún dato estable e importante que no estuviera ya
en memoria, guárdalo con remember. No inventes datos; si un conector no está disponible, omítelo.`;

export function DailyBriefing() {
  const apiKey = useAi((s) => s.apiKey);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    setText("");
    setSaved(false);
    try {
      const res = await runAgent(BRIEFING_PROMPT, [], undefined, "briefing");
      setText(res.text);
      // Si el agente usó create_note, lo damos por guardado.
      setSaved(res.steps.some((s) => s.tool === "create_note"));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    setBusy(true);
    try {
      await runAgent(
        `Crea una nota titulada "Briefing del día (${new Date().toLocaleDateString("es-CO")})" con este contenido:\n\n${text}`,
        [],
        undefined,
        "briefing"
      );
      setSaved(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sun size={18} className="text-accent" />
        <span className="text-sm font-semibold text-ink">Briefing del día</span>
        <span className="text-xs text-muted">ZERO reúne tus prioridades en un clic</span>
        <button
          onClick={run}
          disabled={busy || !apiKey}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          title={apiKey ? "" : "Configura la API key de Gemini en Conectores"}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {text ? "Regenerar" : "Generar"}
        </button>
      </div>

      {!apiKey && (
        <p className="mt-2 text-xs text-muted">
          Necesita la API key de Gemini —{" "}
          <Link href="/connectors" className="font-medium text-accent underline">
            configúrala en Conectores
          </Link>
          .
        </p>
      )}

      {err && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}

      {text && (
        <div className="mt-3">
          <div className="max-h-72 overflow-y-auto rounded-lg glass-card px-3 py-2.5 text-sm text-ink">
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {saved ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <Check size={13} /> Guardado en el workspace
              </span>
            ) : (
              <button
                onClick={saveNote}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-ink hover:bg-bg-subtle disabled:opacity-50"
              >
                <Save size={12} /> Guardar como nota
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

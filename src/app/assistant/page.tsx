"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, Loader2, Wrench, Plug, Sparkles } from "lucide-react";
import { runAgent, type ChatMsg, type AgentStep } from "@/lib/ai/agent";
import { useAi } from "@/lib/ai/store";

interface Turn {
  role: "user" | "model";
  text: string;
  steps?: AgentStep[];
}

const SUGGESTIONS = [
  "Resume mis correos no leídos y dime qué es urgente",
  "¿Qué eventos tengo próximamente?",
  "Dame un resumen de la actividad de GitHub",
  "Busca en Drive los archivos de propuestas",
  "Crea una nota con el plan de la semana",
];

export default function AssistantPage() {
  const { apiKey } = useAi();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, liveSteps, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    const history: ChatMsg[] = turns.map((t) => ({ role: t.role, text: t.text }));
    setTurns((t) => [...t, { role: "user", text }]);
    setBusy(true);
    setLiveSteps([]);
    try {
      const res = await runAgent(text, history, (s) => setLiveSteps((p) => [...p, s]));
      setTurns((t) => [...t, { role: "model", text: res.text, steps: res.steps }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "model", text: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
      setLiveSteps([]);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Bot size={22} className="text-accent" /> Asistente IA · Gemini
        </h1>
        <p className="mt-1 text-sm text-muted">
          Gemini es el gestor único: orquesta Gmail, Drive, Calendar, GitHub y Telegram, y crea
          notas en tu workspace.
        </p>
      </header>

      {!apiKey && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <Plug size={15} />
          Configura tu API key de Gemini en{" "}
          <Link href="/connectors" className="font-medium underline">
            Conectores → Asistente IA
          </Link>
          .
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border bg-card p-4">
        {turns.length === 0 && (
          <div className="py-6 text-center">
            <Sparkles size={28} className="mx-auto text-accent" />
            <p className="mt-2 text-sm text-muted">Pídele algo al gestor. Por ejemplo:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border bg-card px-3 py-1.5 text-xs text-ink hover:bg-bg-subtle"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                t.role === "user" ? "bg-accent text-white" : "bg-bg-subtle text-ink"
              }`}
            >
              {t.steps && t.steps.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {t.steps.map((s, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-accent"
                    >
                      <Wrench size={10} /> {s.tool}
                    </span>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{t.text}</p>
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-bg-subtle px-3.5 py-2 text-sm text-muted">
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Gemini está trabajando…
              </span>
              {liveSteps.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {liveSteps.map((s, j) => (
                    <span key={j} className="inline-flex items-center gap-1 rounded bg-card px-1.5 py-0.5 text-[10px] text-accent">
                      <Wrench size={10} /> {s.tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Pregunta o pide una acción…"
          className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Enviar
        </button>
      </div>
    </div>
  );
}

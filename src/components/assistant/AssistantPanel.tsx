"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, X, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { useAi } from "@/lib/ai/store";
import { runAgent, type ChatMsg } from "@/lib/ai/agent";

const SUGGESTIONS = [
  "¿Qué es lo más urgente hoy en la agencia?",
  "Analiza los datos de la agencia y crea un reporte",
  "Crea una landing page para el cliente Aurora",
  "Avísale al equipo por Telegram las tareas urgentes",
];

export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = useAi((s) => s.apiKey);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const prior = messages;
    setMessages([...messages, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // Gemini orquesta los conectores y ejecuta operaciones (function calling).
      const res = await runAgent(question, prior);
      setMessages((m) => [...m, { role: "model", text: res.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar el asistente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-lg transition hover:scale-105"
          title="Preguntar a Zero"
        >
          <Bot size={22} />
        </button>
      )}

      {/* Panel lateral */}
      {open && (
        <div className="zero-pop fixed bottom-5 right-5 z-40 flex h-[min(620px,calc(100vh-2.5rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border bg-bg shadow-2xl">
          {/* Cabecera */}
          <div className="flex items-center justify-between border-b bg-sidebar px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-white">
                <Bot size={16} />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-ink">Zero · Copiloto</div>
                <div className="text-[11px] text-muted">Consciencia del banco de datos</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-ink"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!apiKey && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  Falta la API key de Gemini. Pégala en{" "}
                  <Link href="/connectors" className="font-semibold underline" onClick={() => setOpen(false)}>
                    Conectores → Asistente IA
                  </Link>{" "}
                  para empezar.
                </span>
              </div>
            )}

            {messages.length === 0 && apiKey && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-ink">
                  <Sparkles size={16} className="text-accent" />
                  Pregúntame sobre los proyectos, clientes, finanzas o correos.
                </div>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-lg border bg-card px-3 py-2 text-left text-sm text-ink/90 transition hover:border-accent hover:bg-bg-subtle"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} />
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 size={15} className="animate-spin" />
                Pensando…
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                {error}
              </div>
            )}
          </div>

          {/* Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t bg-sidebar px-3 py-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Escribe tu pregunta…"
              className="max-h-28 flex-1 resize-none rounded-lg border bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-white transition hover:opacity-90 disabled:opacity-40"
              title="Enviar"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, text }: { role: "user" | "model"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
          isUser ? "bg-ink text-white" : "border bg-card text-ink"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

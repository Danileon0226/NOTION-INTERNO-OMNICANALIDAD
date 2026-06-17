"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, MicOff, Square, Volume2, Plug, Wrench } from "lucide-react";
import { runAgent, type ChatMsg, type AgentStep } from "@/lib/ai/agent";
import { useAi } from "@/lib/ai/store";
import {
  createRecognition,
  recognitionSupported,
  speak,
  stopSpeaking,
  synthesisSupported,
} from "@/lib/voice";

type Status = "idle" | "listening" | "thinking" | "speaking";

interface Turn {
  role: "user" | "model";
  text: string;
  steps?: AgentStep[];
}

export default function ZeroVoicePage() {
  const { apiKey } = useAi();
  const [status, setStatus] = useState<Status>("idle");
  const [handsFree, setHandsFree] = useState(true);
  const [interim, setInterim] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [supported, setSupported] = useState(true);
  const [steps, setSteps] = useState<AgentStep[]>([]);

  const recRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const historyRef = useRef<ChatMsg[]>([]);
  const busyRef = useRef(false);
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;

  useEffect(() => {
    setSupported(recognitionSupported());
  }, []);

  const startListening = useCallback(() => {
    if (busyRef.current) return;
    let rec = recRef.current;
    if (!rec) {
      rec = createRecognition("es-ES");
      if (!rec) {
        setSupported(false);
        return;
      }
      recRef.current = rec;
    }
    rec.onresult = (e: any) => {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        setInterim("");
        process(finalText.trim());
      }
    };
    rec.onend = () => {
      // Reanuda si seguimos en modo manos libres y no estamos procesando.
      if (handsFreeRef.current && !busyRef.current && status !== "thinking") {
        try {
          rec.start();
        } catch {
          /* ya iniciado */
        }
      }
    };
    try {
      rec.start();
      setStatus("listening");
    } catch {
      /* ya iniciado */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const stopAll = useCallback(() => {
    setHandsFree(false);
    handsFreeRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    stopSpeaking();
    busyRef.current = false;
    setStatus("idle");
    setInterim("");
  }, []);

  const process = useCallback(async (text: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    setTurns((t) => [...t, { role: "user", text }]);
    setStatus("thinking");
    setSteps([]);
    try {
      const res = await runAgent(text, historyRef.current, (s) => setSteps((p) => [...p, s]));
      historyRef.current = [
        ...historyRef.current,
        { role: "user", text } as ChatMsg,
        { role: "model", text: res.text } as ChatMsg,
      ].slice(-12);
      setTurns((t) => [...t, { role: "model", text: res.text, steps: res.steps }]);
      setStatus("speaking");
      speak(res.text, {
        onEnd: () => {
          busyRef.current = false;
          if (handsFreeRef.current) {
            setStatus("listening");
            try {
              recRef.current?.start();
            } catch {
              /* noop */
            }
          } else {
            setStatus("idle");
          }
        },
      });
    } catch (e) {
      const msg = `Error: ${(e as Error).message}`;
      setTurns((t) => [...t, { role: "model", text: msg }]);
      if (synthesisSupported()) speak(msg);
      busyRef.current = false;
      setStatus("idle");
    }
  }, []);

  function toggle() {
    if (status === "idle") {
      setHandsFree(true);
      handsFreeRef.current = true;
      startListening();
    } else {
      stopAll();
    }
  }

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      stopSpeaking();
    };
  }, []);

  const label =
    status === "listening"
      ? "Escuchando…"
      : status === "thinking"
        ? "Analizando…"
        : status === "speaking"
          ? "Respondiendo…"
          : "Toca para hablar con ZERO";

  return (
    <div className="flex min-h-full flex-col items-center bg-gradient-to-b from-[#0a0e1a] to-[#0a0a0f] px-4 py-8 text-white">
      <header className="mb-2 text-center">
        <h1 className="text-2xl font-bold tracking-[0.3em] text-violet-300">Z E R O</h1>
        <p className="mt-1 text-xs text-violet-100/60">Asistente de voz · gestor omnicanal con IA</p>
      </header>

      {!apiKey && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          <Plug size={15} />
          Configura la API key de Gemini en{" "}
          <Link href="/connectors" className="font-semibold underline">
            Conectores
          </Link>
          .
        </div>
      )}

      {/* Orbe */}
      <div className="relative my-6 flex h-56 w-56 items-center justify-center">
        <span
          className={`absolute inset-0 rounded-full bg-violet-500/20 ${
            status === "listening" ? "animate-ping" : ""
          }`}
        />
        <span
          className={`absolute inset-4 rounded-full border border-violet-400/40 ${
            status === "speaking" ? "animate-pulse" : ""
          }`}
        />
        <button
          onClick={toggle}
          className={`relative flex h-36 w-36 items-center justify-center rounded-full shadow-[0_0_60px] transition ${
            status === "idle"
              ? "bg-violet-600 shadow-violet-900"
              : status === "thinking"
                ? "bg-violet-600 shadow-violet-700"
                : status === "speaking"
                  ? "bg-emerald-500 shadow-emerald-700"
                  : "bg-violet-500 shadow-violet-500"
          }`}
        >
          {status === "idle" ? (
            <Mic size={44} />
          ) : status === "speaking" ? (
            <Volume2 size={44} />
          ) : status === "thinking" ? (
            <Wrench size={40} className="animate-spin" />
          ) : (
            <MicOff size={44} />
          )}
        </button>
      </div>

      <p className="text-sm text-violet-100/80">{label}</p>
      {interim && <p className="mt-1 max-w-md text-center text-xs italic text-violet-200/60">“{interim}”</p>}

      {steps.length > 0 && status === "thinking" && (
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {steps.map((s, j) => (
            <span key={j} className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-violet-200">
              <Wrench size={10} /> {s.tool}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-violet-100/70">
          <input
            type="checkbox"
            checked={handsFree}
            onChange={(e) => setHandsFree(e.target.checked)}
            className="accent-violet-400"
          />
          Manos libres (conversación continua)
        </label>
        {status !== "idle" && (
          <button
            onClick={stopAll}
            className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
          >
            <Square size={12} /> Detener
          </button>
        )}
      </div>

      {!supported && (
        <p className="mt-4 max-w-md text-center text-xs text-amber-200/80">
          El reconocimiento de voz requiere Chrome o Edge. La síntesis de voz (respuestas habladas)
          sí funciona en este navegador.
        </p>
      )}

      {/* Transcripción */}
      <div className="mt-6 w-full max-w-md space-y-2">
        {turns.slice(-6).map((t, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-2 text-sm ${
              t.role === "user"
                ? "ml-8 bg-violet-500/15 text-violet-50"
                : "mr-8 bg-white/5 text-violet-50/90"
            }`}
          >
            {t.role === "model" && t.steps && t.steps.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
                {t.steps.map((s, j) => (
                  <span key={j} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-violet-200">
                    {s.tool}
                  </span>
                ))}
              </div>
            )}
            <span className="whitespace-pre-wrap">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

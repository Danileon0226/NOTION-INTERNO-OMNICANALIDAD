"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, MicOff, Square, Volume2, Plug, Wrench, Settings2, Play, Sparkles, Loader2 } from "lucide-react";
import { runAgent, type ChatMsg, type AgentStep } from "@/lib/ai/agent";
import { useAi } from "@/lib/ai/store";
import {
  createRecognition,
  recognitionSupported,
  speak,
  stopSpeaking,
  synthesisSupported,
  listVoices,
} from "@/lib/voice";
import { speakGeminiQueued, stopGemini, getAnalyser, GEMINI_VOICES } from "@/lib/voiceGemini";

// Dirección de estilo para máxima naturalidad (timbre JARVIS).
const JARVIS_STYLE = "Habla con tono grave, calmado, profesional y seguro, a ritmo pausado";

type Status = "idle" | "listening" | "thinking" | "synth" | "speaking";

interface Turn {
  role: "user" | "model";
  text: string;
  steps?: AgentStep[];
}

export default function ZeroVoicePage() {
  const ai = useAi();
  const { apiKey, voiceEngine, geminiVoice, voiceURI, voiceRate, voicePitch, setVoice } = ai;
  const [status, setStatus] = useState<Status>("idle");
  const [handsFree, setHandsFree] = useState(true);
  const [interim, setInterim] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [supported, setSupported] = useState(true);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoice, setShowVoice] = useState(false);
  const [testing, setTesting] = useState(false);

  const aiRef = useRef(ai);
  aiRef.current = ai;
  const recRef = useRef<any>(null);
  const historyRef = useRef<ChatMsg[]>([]);
  const busyRef = useRef(false);
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;

  useEffect(() => {
    setSupported(recognitionSupported());
    if (!synthesisSupported()) return;
    const load = () => setVoices(listVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // Locución según el motor elegido (neural Gemini o sistema), con respaldo.
  const speakOut = useCallback((text: string, onEnd: () => void) => {
    const { voiceEngine, geminiVoice, voiceURI, voiceRate, voicePitch, apiKey } = aiRef.current;
    const systemSpeak = () => {
      setStatus("speaking");
      speak(text, { voiceURI, rate: voiceRate, pitch: voicePitch, onEnd });
    };
    if (voiceEngine === "gemini" && apiKey) {
      setStatus("synth");
      speakGeminiQueued(text, {
        voiceName: geminiVoice,
        style: JARVIS_STYLE,
        onStart: () => setStatus("speaking"),
        onEnd,
        onError: systemSpeak, // si el TTS neural falla, usa la voz del sistema
      });
    } else {
      systemSpeak();
    }
  }, []);

  const stopVoice = useCallback(() => {
    stopSpeaking();
    stopGemini();
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
    stopVoice();
    busyRef.current = false;
    setStatus("idle");
    setInterim("");
  }, [stopVoice]);

  const process = useCallback(
    async (text: string) => {
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
        const res = await runAgent(text, historyRef.current, (s) => setSteps((p) => [...p, s]), "voz");
        historyRef.current = [
          ...historyRef.current,
          { role: "user", text } as ChatMsg,
          { role: "model", text: res.text } as ChatMsg,
        ].slice(-12);
        setTurns((t) => [...t, { role: "model", text: res.text, steps: res.steps }]);
        speakOut(res.text, () => {
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
        });
      } catch (e) {
        const msg = `Error: ${(e as Error).message}`;
        setTurns((t) => [...t, { role: "model", text: msg }]);
        speakOut(msg, () => {
          busyRef.current = false;
          setStatus("idle");
        });
      }
    },
    [speakOut]
  );

  function toggle() {
    if (status === "idle") {
      setHandsFree(true);
      handsFreeRef.current = true;
      startListening();
    } else {
      stopAll();
    }
  }

  async function testVoice() {
    setTesting(true);
    stopVoice();
    const line = "Sistemas en línea. Soy ZERO, su gestor de conciencia. ¿En qué puedo asistirle?";
    speakOut(line, () => setTesting(false));
  }

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      stopVoice();
    };
  }, [stopVoice]);

  const label =
    status === "listening"
      ? "Escuchando…"
      : status === "thinking"
        ? "Analizando…"
        : status === "synth"
          ? "Generando voz…"
          : status === "speaking"
            ? "Respondiendo…"
            : "Toca para hablar con ZERO";

  const active = status !== "idle";

  return (
    <div className="relative flex min-h-full flex-col items-center overflow-hidden bg-gradient-to-b from-[#0b0814] via-[#0e0a1c] to-[#080611] px-4 py-10 text-white">
      {/* Aura de fondo */}
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(50%_40%_at_50%_18%,rgba(123,90,210,0.35),transparent_70%)]" />

      <header className="relative z-10 mb-3 text-center">
        <h1 className="text-2xl font-bold tracking-[0.4em] text-violet-200">Z E R O</h1>
        <p className="mt-1 text-xs text-violet-100/55">Asistente de voz · gestor de conciencia</p>
      </header>

      {!apiKey && (
        <div className="relative z-10 mb-3 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          <Plug size={15} /> Configura la API key de Gemini en{" "}
          <Link href="/connectors" className="font-semibold underline">Conectores</Link>.
        </div>
      )}

      {/* Orbe + visualizador */}
      <div className="relative z-10 my-6 flex h-60 w-60 items-center justify-center">
        <span className={`absolute inset-0 rounded-full bg-violet-500/15 ${status === "listening" ? "animate-ping" : ""}`} />
        <span className="absolute inset-0 rounded-full border border-violet-400/20" />
        <span
          className={`absolute -inset-2 rounded-full opacity-60 blur-xl transition-all duration-500 ${
            status === "speaking" ? "bg-emerald-500/30" : status === "thinking" || status === "synth" ? "bg-violet-500/40" : "bg-violet-700/20"
          }`}
        />
        {/* Anillo cónico giratorio */}
        <span
          className={`absolute inset-3 rounded-full ${active ? "animate-spin" : ""}`}
          style={{ animationDuration: "8s", background: "conic-gradient(from 0deg, transparent, rgba(167,139,250,0.55), transparent 60%)", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)", mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)" }}
        />
        <button
          onClick={toggle}
          className={`relative flex h-36 w-36 items-center justify-center rounded-full border border-white/15 backdrop-blur-md transition active:scale-95 ${
            status === "idle"
              ? "bg-violet-600/80 shadow-[0_0_70px] shadow-violet-900"
              : status === "speaking"
                ? "bg-emerald-500/80 shadow-[0_0_70px] shadow-emerald-700"
                : "bg-violet-600/80 shadow-[0_0_70px] shadow-violet-700"
          }`}
        >
          {status === "idle" ? (
            <Mic size={44} />
          ) : status === "speaking" ? (
            <Volume2 size={44} />
          ) : status === "thinking" || status === "synth" ? (
            <Wrench size={38} className="animate-spin" />
          ) : (
            <MicOff size={44} />
          )}
        </button>
      </div>

      <Visualizer active={status === "speaking" || status === "listening"} mode={status === "speaking" ? "speak" : "listen"} />

      <p className="relative z-10 mt-4 text-sm text-violet-100/80">{label}</p>
      {interim && <p className="relative z-10 mt-1 max-w-md text-center text-xs italic text-violet-200/60">“{interim}”</p>}

      {steps.length > 0 && status === "thinking" && (
        <div className="relative z-10 mt-2 flex flex-wrap justify-center gap-1">
          {steps.map((s, j) => (
            <span key={j} className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-violet-200">
              <Wrench size={10} /> {s.tool}
            </span>
          ))}
        </div>
      )}

      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-violet-100/70">
          <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="accent-violet-400" />
          Manos libres
        </label>
        {status !== "idle" && (
          <button onClick={stopAll} className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10">
            <Square size={12} /> Detener
          </button>
        )}
        <button onClick={() => setShowVoice((v) => !v)} className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10">
          <Settings2 size={12} /> Voz
        </button>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${voiceEngine === "gemini" ? "bg-violet-500/25 text-violet-100" : "bg-white/10 text-violet-100/70"}`}>
          {voiceEngine === "gemini" ? "Neural · Gemini" : "Sistema"}
        </span>
      </div>

      {/* Ajustes de voz */}
      {showVoice && (
        <div className="zero-pop relative z-10 mt-4 w-full max-w-md space-y-3 rounded-2xl border border-violet-400/25 bg-white/5 p-4 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Motor de voz</p>
          <div className="grid grid-cols-2 gap-2">
            <EngineCard
              active={voiceEngine === "gemini"}
              title="Neural (Gemini)"
              desc="Realista, recomendado"
              onClick={() => setVoice({ voiceEngine: "gemini" })}
            />
            <EngineCard
              active={voiceEngine === "system"}
              title="Sistema"
              desc="Web Speech, sin coste"
              onClick={() => setVoice({ voiceEngine: "system" })}
            />
          </div>

          {voiceEngine === "gemini" ? (
            <label className="block text-xs text-violet-100/70">
              Voz neural
              <select
                value={geminiVoice}
                onChange={(e) => setVoice({ geminiVoice: e.target.value })}
                className="mt-1 w-full rounded-md border border-white/15 bg-[#0a0e1a] px-2 py-1.5 text-sm text-white"
              >
                {GEMINI_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="block text-xs text-violet-100/70">
                Voz del sistema
                <select
                  value={voiceURI}
                  onChange={(e) => setVoice({ voiceURI: e.target.value })}
                  className="mt-1 w-full rounded-md border border-white/15 bg-[#0a0e1a] px-2 py-1.5 text-sm text-white"
                >
                  <option value="">Automática (perfil JARVIS)</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-violet-100/70">
                Velocidad: {voiceRate.toFixed(2)}
                <input type="range" min={0.7} max={1.2} step={0.01} value={voiceRate} onChange={(e) => setVoice({ voiceRate: Number(e.target.value) })} className="mt-1 w-full accent-violet-400" />
              </label>
              <label className="block text-xs text-violet-100/70">
                Tono: {voicePitch.toFixed(2)}
                <input type="range" min={0.5} max={1.3} step={0.01} value={voicePitch} onChange={(e) => setVoice({ voicePitch: Number(e.target.value) })} className="mt-1 w-full accent-violet-400" />
              </label>
            </>
          )}

          <button
            onClick={testVoice}
            disabled={testing || (voiceEngine === "gemini" && !apiKey)}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Probar voz
          </button>
          {voiceEngine === "gemini" && (
            <p className="flex items-start gap-1 text-[11px] text-violet-100/50">
              <Sparkles size={11} className="mt-0.5 shrink-0" /> Voz neural realista vía tu API key de Gemini. Si el modelo TTS no
              está disponible para tu key, ZERO usa automáticamente la voz del sistema.
            </p>
          )}
        </div>
      )}

      {!supported && (
        <p className="relative z-10 mt-4 max-w-md text-center text-xs text-amber-200/80">
          El reconocimiento de voz requiere Chrome o Edge. La voz hablada sí funciona aquí.
        </p>
      )}

      {/* Transcripción */}
      <div className="relative z-10 mt-6 w-full max-w-md space-y-2">
        {turns.slice(-6).map((t, i) => (
          <div key={i} className={`rounded-xl border border-white/10 px-3 py-2 text-sm backdrop-blur ${t.role === "user" ? "ml-8 bg-violet-500/15 text-violet-50" : "mr-8 bg-white/5 text-violet-50/90"}`}>
            {t.role === "model" && t.steps && t.steps.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
                {t.steps.map((s, j) => (
                  <span key={j} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-violet-200">{s.tool}</span>
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

function EngineCard({ active, title, desc, onClick }: { active: boolean; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-2.5 text-left transition ${active ? "border-violet-400 bg-violet-500/20" : "border-white/15 hover:bg-white/5"}`}
    >
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="text-[10px] text-violet-100/60">{desc}</div>
    </button>
  );
}

// Visualizador de barras: usa el AnalyserNode del audio neural si existe; si no,
// anima de forma sintética mientras escucha/habla.
function Visualizer({ active, mode }: { active: boolean; mode: "speak" | "listen" }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const N = 32;

  useEffect(() => {
    const bars = Array.from(ref.current?.children ?? []) as HTMLElement[];
    if (!bars.length) return;
    const data = new Uint8Array(128);
    let t = 0;
    const tick = () => {
      const analyser = getAnalyser();
      if (active && analyser) {
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < N; i++) {
          const v = data[Math.floor((i / N) * data.length)] / 255;
          bars[i].style.transform = `scaleY(${0.08 + v * 1.6})`;
        }
      } else if (active) {
        t += 0.18;
        for (let i = 0; i < N; i++) {
          const base = mode === "speak" ? 0.5 : 0.28;
          const v = base + Math.abs(Math.sin(t + i * 0.5)) * (mode === "speak" ? 0.7 : 0.35);
          bars[i].style.transform = `scaleY(${v})`;
        }
      } else {
        for (let i = 0; i < N; i++) bars[i].style.transform = "scaleY(0.08)";
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, mode]);

  return (
    <div ref={ref} className="relative z-10 flex h-12 items-center justify-center gap-[3px]">
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          className="h-8 w-[3px] origin-center rounded-full bg-gradient-to-t from-violet-500 to-violet-200 transition-transform duration-75"
          style={{ transform: "scaleY(0.08)" }}
        />
      ))}
    </div>
  );
}

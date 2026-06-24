"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { runAgent, type ChatMsg } from "@/lib/ai/agent";
import { speakOut, stopVoice } from "@/lib/voiceManager";
import { unlockAudioOutput } from "@/lib/audioPlayer";
import { createRecognition, recognitionSupported } from "@/lib/voice";
import { useAi } from "@/lib/ai/store";

// Manos libres global: escucha continua de la palabra de activación ("Zero") en
// cualquier pantalla. Al oírla, navega/ejecuta y responde con voz — sin tocar
// nada. (Reconocimiento Web Speech: Chrome/Edge de escritorio.)

export type HFStatus = "off" | "listening" | "awake" | "thinking" | "speaking";

interface HFState {
  enabled: boolean; // preferencia del usuario (persistida)
  status: HFStatus;
  heard: string; // transcripción en vivo (interim) para feedback
  lastText: string;
  error: string | null;
  setEnabled: (b: boolean) => void;
  _set: (p: Partial<Pick<HFState, "status" | "heard" | "lastText" | "error" | "enabled">>) => void;
}

export const useHandsFree = create<HFState>()(
  persist(
    (set) => ({
      enabled: false,
      status: "off",
      heard: "",
      lastText: "",
      error: null,
      setEnabled: (enabled) => set({ enabled }),
      _set: (p) => set(p),
    }),
    { name: "zero-agency-handsfree", partialize: (s) => ({ enabled: s.enabled }) }
  )
);

// ── Palabra de activación ────────────────────────────────────
// Frases fuertes: válidas en cualquier posición temprana. Palabras sueltas
// ("zero"/"cero"): solo al INICIO del enunciado (evita falsos positivos).
const WAKE_PHRASES = ["oye zero", "hey zero", "ok zero", "hola zero", "oye cero"];
const WAKE_BARE = ["zero", "cero"];
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function parseWake(text: string): { wake: boolean; cmd: string } {
  const n = norm(text).trim();
  for (const w of WAKE_PHRASES) {
    const idx = n.indexOf(w);
    if (idx >= 0 && idx <= 6) return { wake: true, cmd: n.slice(idx + w.length).replace(/^[\s,.:;¿?!¡]+/, "") };
  }
  for (const w of WAKE_BARE) {
    if (n === w) return { wake: true, cmd: "" };
    if (n.startsWith(w + " ")) return { wake: true, cmd: n.slice(w.length).replace(/^[\s,.:;¿?!¡]+/, "") };
  }
  return { wake: false, cmd: "" };
}

// ── Intenciones locales (sin round-trip al agente) ───────────
const NAV: { keys: string[]; path: string; label: string }[] = [
  { keys: ["dashboard", "tablero", "panel", "inicio"], path: "/dashboard", label: "el Dashboard" },
  { keys: ["leads", "prospectos"], path: "/leads", label: "Leads" },
  { keys: ["bandeja", "correo", "correos", "inbox", "email"], path: "/inbox", label: "la Bandeja" },
  { keys: ["calendario", "agenda"], path: "/calendar", label: "el Calendario" },
  { keys: ["drive", "archivos"], path: "/drive", label: "Drive" },
  { keys: ["conectores", "conexiones", "integraciones"], path: "/connectors", label: "Conectores" },
  { keys: ["reportes", "informes"], path: "/reports", label: "Reportes" },
  { keys: ["notificaciones", "sileo", "avisos"], path: "/notificaciones", label: "Notificaciones" },
  { keys: ["anticipacion"], path: "/anticipation", label: "Anticipación" },
  { keys: ["asistente", "copiloto", "chat"], path: "/assistant", label: "el Asistente" },
  { keys: ["orquestacion", "orquestador"], path: "/orquestacion", label: "Orquestación" },
  { keys: ["equipo", "usuarios"], path: "/team", label: "Equipo" },
  { keys: ["memoria"], path: "/memory", label: "Memoria" },
  { keys: ["progreso", "nivel", "logros"], path: "/progreso", label: "Progreso" },
  { keys: ["monitoreo", "monitor", "sitio"], path: "/monitor", label: "Monitoreo" },
  { keys: ["piloto", "autopilot", "automatico"], path: "/autopilot", label: "el Piloto automático" },
  { keys: ["canvas", "grafo"], path: "/canvas", label: "el Canvas" },
  { keys: ["configuracion", "estado"], path: "/setup", label: "Estado de configuración" },
  { keys: ["paginas", "notas", "workspace"], path: "/pages", label: "Páginas" },
];
const STOP = ["para", "parate", "detente", "cancela", "silencio", "callate", "calla", "stop", "basta", "ya"];

function navTarget(cmd: string): { path: string; label: string } | null {
  const n = norm(cmd);
  const isNavVerb = /\b(abre|abreme|abrir|ve|vete|ir|vamos|llevame|lleva|muestra|muestrame|navega|pon|ponme)\b/.test(n);
  const short = n.split(/\s+/).filter(Boolean).length <= 2;
  for (const r of NAV) {
    if (r.keys.some((k) => new RegExp(`\\b${k}\\b`).test(n))) {
      if (isNavVerb || short) return { path: r.path, label: r.label };
    }
  }
  return null;
}
function isStop(cmd: string): boolean {
  const n = norm(cmd).trim();
  return STOP.includes(n) || /^(para|detente|cancela|silencio|stop|basta)\b/.test(n);
}

// ── Estado del controlador ───────────────────────────────────
let rec: any = null;
let active = false;
let armed = false;
let busy = false;
let armTimer: any = null;
let history: ChatMsg[] = [];
let navigate: ((path: string) => void) | null = null;
let actx: AudioContext | null = null;

export function setNavigator(fn: ((path: string) => void) | null) {
  navigate = fn;
}

function setStatus(s: HFStatus) {
  useHandsFree.getState()._set({ status: s });
}

// Chime de activación (más rápido y menos intrusivo que hablar).
function earcon(up = true) {
  try {
    if (!actx) actx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const seq = up ? [660, 990] : [880, 480];
    seq.forEach((f, i) => {
      const o = actx!.createOscillator();
      const g = actx!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = actx!.currentTime + i * 0.085;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g);
      g.connect(actx!.destination);
      o.start(t);
      o.stop(t + 0.11);
    });
  } catch {
    /* sin audio */
  }
}

function resumeAfterSpeak() {
  busy = false;
  useHandsFree.getState()._set({ heard: "" });
  if (active && useHandsFree.getState().enabled) startRec();
  else setStatus("off");
}

/** Decide la intención: parar / navegar / preguntar al agente. */
function dispatch(raw: string) {
  if (busy || !raw.trim()) return;
  const text = raw.trim();

  // Parar / cancelar
  if (isStop(text)) {
    stopVoice();
    armed = false;
    clearTimeout(armTimer);
    earcon(false);
    setStatus("listening");
    return;
  }

  // Navegación local (instantánea, sin agente)
  const nav = navTarget(text);
  if (nav && navigate) {
    busy = true;
    armed = false;
    clearTimeout(armTimer);
    stopRec();
    setStatus("speaking");
    navigate(nav.path);
    speakOut(`Abriendo ${nav.label}.`, { onEnd: resumeAfterSpeak });
    return;
  }

  // Pregunta/acción al agente
  if (!useAi.getState().apiKey) {
    busy = true;
    armed = false;
    stopRec();
    setStatus("speaking");
    speakOut("Configura la API key de Gemini en Conectores para que pueda ayudarte.", { onEnd: resumeAfterSpeak });
    return;
  }
  handleCommand(text);
}

async function handleCommand(raw: string) {
  busy = true;
  armed = false;
  clearTimeout(armTimer);
  stopRec();
  setStatus("thinking");
  useHandsFree.getState()._set({ lastText: raw, heard: "" });
  try {
    await unlockAudioOutput();
    const res = await runAgent(raw, history, undefined, "voz manos libres");
    history = [...history, { role: "user", text: raw } as ChatMsg, { role: "model", text: res.text } as ChatMsg].slice(-12);
    setStatus("speaking");
    speakOut(res.text, { onEnd: resumeAfterSpeak });
  } catch (e) {
    setStatus("speaking");
    speakOut(`No pude completar eso. ${(e as Error).message}`, { onEnd: resumeAfterSpeak });
  }
}

function onResult(e: any) {
  if (busy) return;
  let finalText = "";
  let interim = "";
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const t = e.results[i][0].transcript;
    if (e.results[i].isFinal) finalText += t;
    else interim += t;
  }
  if (interim && (armed || useHandsFree.getState().status === "listening")) {
    useHandsFree.getState()._set({ heard: interim.trim() });
  }
  if (!finalText.trim()) return;

  if (armed) {
    dispatch(finalText.trim());
    return;
  }
  const { wake, cmd } = parseWake(finalText);
  if (!wake) return;
  if (cmd) {
    dispatch(cmd);
    return;
  }
  // Solo la palabra de activación: chime y queda atento (sin detener el micro).
  armed = true;
  setStatus("awake");
  earcon(true);
  useHandsFree.getState()._set({ heard: "" });
  clearTimeout(armTimer);
  armTimer = setTimeout(() => {
    if (armed && !busy) {
      armed = false;
      setStatus("listening");
      useHandsFree.getState()._set({ heard: "" });
    }
  }, 9000);
}

function onErr(e: any) {
  const code = String(e?.error || "");
  if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
    useHandsFree.getState()._set({ enabled: false, status: "off", error: "Micrófono bloqueado o no disponible." });
    stopHandsFree();
  }
}

function onEnd() {
  if (active && useHandsFree.getState().enabled && !busy) {
    try {
      rec.start();
    } catch {
      /* ya iniciado */
    }
  }
}

function startRec() {
  if (busy) return;
  if (!recognitionSupported()) {
    useHandsFree.getState()._set({ error: "El reconocimiento de voz requiere Chrome o Edge." });
    return;
  }
  if (!rec) {
    rec = createRecognition("es-ES");
    if (!rec) return;
    rec.onresult = onResult;
    rec.onerror = onErr;
    rec.onend = onEnd;
  }
  try {
    rec.start();
    setStatus(armed ? "awake" : "listening");
  } catch {
    /* ya iniciado */
  }
}

function stopRec() {
  try {
    rec?.stop();
  } catch {
    /* noop */
  }
}

/** Arranca el controlador (lo llama el daemon cuando procede). */
export function startHandsFree() {
  if (active) return;
  active = true;
  armed = false;
  busy = false;
  startRec();
}

/** Detiene el controlador sin cambiar la preferencia del usuario. */
export function stopHandsFree() {
  active = false;
  armed = false;
  busy = false;
  clearTimeout(armTimer);
  stopRec();
  stopVoice();
  useHandsFree.getState()._set({ heard: "" });
  setStatus("off");
}

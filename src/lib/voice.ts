"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Capa de voz: reconocimiento (Web Speech API) + síntesis (SpeechSynthesis).
// Perfil "JARVIS": timbre grave, locución calmada y medida, preferencia por
// voces masculinas/británicas. La voz es seleccionable desde la UI de ZERO.

export function recognitionSupported(): boolean {
  return typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
}
export function synthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function createRecognition(lang = "es-ES"): any | null {
  if (typeof window === "undefined") return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = lang;
  r.continuous = true;
  r.interimResults = true;
  return r;
}

// Perfil JARVIS por defecto: grave (pitch bajo) y pausado (rate algo lento).
export const JARVIS_RATE = 0.97;
export const JARVIS_PITCH = 0.82;

/** Lista de voces disponibles (para el selector de la UI). */
export function listVoices(): SpeechSynthesisVoice[] {
  if (!synthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
}

// Heurística JARVIS: puntúa cada voz por cuánto se acerca al timbre deseado
// (masculina, británica/neural, en español o inglés). Mayor = mejor.
function jarvisScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let s = 0;
  // Masculino explícito o nombres masculinos comunes en los TTS del SO.
  if (/male|hombre|masculin/.test(n)) s += 40;
  if (/\b(diego|jorge|carlos|pablo|enrique|miguel|daniel|david|james|george|arthur|oliver|guy|brian|matthew|ryan|fred|alex)\b/.test(n)) s += 30;
  // Británico = el acento clásico de JARVIS.
  if (/en-gb/.test(lang)) s += 25;
  if (/uk|british|england|arthur|george|oliver|ryan/.test(n)) s += 15;
  // Voces de mayor calidad.
  if (/google|natural|neural|premium|enhanced/.test(n)) s += 12;
  // Idioma: priorizamos español (la app está en español) y luego inglés.
  if (/^es/.test(lang)) s += 10;
  else if (/^en/.test(lang)) s += 6;
  // Penaliza voces claramente femeninas.
  if (/female|mujer|femenin|mónica|monica|paulina|laura|sara|helena|google español/.test(n)) s -= 35;
  return s;
}

let cachedVoice: SpeechSynthesisVoice | null = null;

/** Devuelve la voz a usar: la elegida por URI, o la mejor según el perfil JARVIS. */
export function pickVoice(preferredURI?: string): SpeechSynthesisVoice | null {
  if (!synthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  if (preferredURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredURI);
    if (chosen) return chosen;
  }
  if (cachedVoice) return cachedVoice;
  const ranked = [...voices].sort((a, b) => jarvisScore(b) - jarvisScore(a));
  cachedVoice = ranked[0] ?? null;
  return cachedVoice;
}

// Precarga de voces (algunas se cargan async).
if (typeof window !== "undefined" && synthesisSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  rate?: number;
  pitch?: number;
  /** voiceURI de la voz elegida en la UI. */
  voiceURI?: string;
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!synthesisSupported() || !text.trim()) {
    opts.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  // Trocea en frases para una locución más natural y estable.
  const chunks = text.match(/[^.!?\n]+[.!?]?/g) ?? [text];
  let i = 0;
  const voice = pickVoice(opts.voiceURI);
  opts.onStart?.();
  const speakNext = () => {
    if (i >= chunks.length) {
      opts.onEnd?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[i].trim());
    u.lang = voice?.lang || "es-ES";
    if (voice) u.voice = voice;
    u.rate = opts.rate ?? JARVIS_RATE;
    u.pitch = opts.pitch ?? JARVIS_PITCH;
    u.onend = () => {
      i += 1;
      speakNext();
    };
    u.onerror = () => {
      i += 1;
      speakNext();
    };
    synth.speak(u);
  };
  speakNext();
}

export function stopSpeaking(): void {
  if (synthesisSupported()) window.speechSynthesis.cancel();
}

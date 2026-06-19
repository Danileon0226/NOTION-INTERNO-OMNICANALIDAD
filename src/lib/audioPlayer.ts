"use client";

// Reproductor de audio compartido (Gemini TTS, Miso One). Desbloquea AudioContext
// tras gesto del usuario y propaga errores de play() para activar respaldo.

let currentAudio: HTMLAudioElement | null = null;
let currentCtx: AudioContext | null = null;
let currentAnalyser: AnalyserNode | null = null;
let unlocked = false;

/** Llámalo en el primer clic del usuario (orbe, probar voz…) para cumplir autoplay. */
export async function unlockAudioOutput(): Promise<void> {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!currentCtx) {
    currentCtx = new Ctx();
    currentAnalyser = currentCtx.createAnalyser();
    currentAnalyser.fftSize = 256;
    currentAnalyser.connect(currentCtx.destination);
  }
  if (currentCtx.state === "suspended") await currentCtx.resume();
  unlocked = true;
}

export function getSharedAnalyser(): AnalyserNode | null {
  return currentAnalyser;
}

export function stopSharedAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}

export function closeSharedAudioContext(): void {
  stopSharedAudio();
  if (currentCtx) {
    currentCtx.close().catch(() => {});
    currentCtx = null;
  }
  currentAnalyser = null;
  unlocked = false;
}

/** Reproduce un blob URL; rechaza si el navegador bloquea el audio. */
export function playBlobUrl(url: string, onFirst?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;

    const done = (ok: boolean) => {
      URL.revokeObjectURL(url);
      if (ok) resolve();
      else reject(new Error("No se pudo reproducir el audio (autoplay bloqueado o formato inválido)."));
    };

    try {
      if (!currentCtx && typeof window !== "undefined") {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          currentCtx = new Ctx();
          currentAnalyser = currentCtx.createAnalyser();
          currentAnalyser.fftSize = 256;
          currentAnalyser.connect(currentCtx.destination);
        }
      }
      if (currentCtx) {
        const src = currentCtx.createMediaElementSource(audio);
        src.connect(currentAnalyser!);
      }
    } catch {
      /* sin visualizador: el <audio> reproduce directo al altavoz */
    }

    let started = false;
    audio.onplay = () => {
      if (!started) {
        started = true;
        onFirst?.();
      }
    };
    audio.onended = () => done(true);
    audio.onerror = () => done(false);

    const tryPlay = async () => {
      if (currentCtx?.state === "suspended") {
        try {
          await currentCtx.resume();
        } catch {
          /* sigue intentando play */
        }
      }
      try {
        await audio.play();
      } catch (e) {
        if (!unlocked) {
          reject(new Error("Pulsa el orbe o «Probar voz» para activar el audio del navegador."));
          return;
        }
        reject(e instanceof Error ? e : new Error("Reproducción bloqueada"));
      }
    };
    void tryPlay();
  });
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles, Palette, KeyRound, ArrowRight, Check, Sun, Moon, X } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding";
import { useTheme } from "@/lib/theme";
import { usePrefs, ACCENTS } from "@/lib/prefs";
import { useAi } from "@/lib/ai/store";
import zeroMark from "@/brand/zero-mark.png";

// Bienvenida de primer arranque, fiel al brandbook (glass + violeta).
// Tres pasos: presentación → personalización → conectar Gemini. Se ve una vez.
export function Onboarding() {
  const done = useOnboarding((s) => s.done);
  const finish = useOnboarding((s) => s.finish);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => setMounted(true), []);
  if (!mounted || done) return null;

  const steps = [<Welcome key="w" />, <Personalize key="p" />, <ConnectKey key="k" />];
  const last = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--night)]/55 px-4 backdrop-blur-sm">
      <div className="brand-halo relative w-full max-w-md overflow-hidden rounded-2xl border glass-card p-7 shadow-2xl">
        <button
          onClick={finish}
          aria-label="Omitir bienvenida"
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted hover:bg-bg-subtle hover:text-ink"
        >
          <X size={16} />
        </button>

        <div className="min-h-[16rem]">{steps[step]}</div>

        {/* Pasos + navegación */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-accent" : "w-1.5 bg-bg-subtle"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-ink">
                Atrás
              </button>
            )}
            <button
              onClick={() => (last ? finish() : setStep((s) => s + 1))}
              className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold"
            >
              {last ? (
                <>
                  <Check size={15} /> Empezar
                </>
              ) : (
                <>
                  Siguiente <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--night)] shadow-lg">
        <Image src={zeroMark} alt="ZERO AGENCY" width={40} height={40} className="h-10 w-10 rounded-lg" />
      </div>
      <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full glass-inset px-2.5 py-1 text-[11px] font-medium text-accent">
        <Sparkles size={12} /> Bienvenido a tu OS
      </div>
      <h2 className="text-xl font-black tracking-tight text-ink">ZERO AGENCY</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
        Tu centro de operaciones omnicanal: leads, equipo, conectores y un copiloto con IA y manos libres. Hecho para moverse rápido.
      </p>
    </div>
  );
}

function Personalize() {
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const accent = usePrefs((s) => s.accent);
  const setAccent = usePrefs((s) => s.setAccent);

  return (
    <div>
      <Head icon={<Palette size={18} />} title="Personaliza tu espacio" hint="Puedes cambiarlo cuando quieras en Ajustes." />
      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted">Tema</div>
          <div className="flex gap-2">
            <PickBtn active={mode === "light"} onClick={() => setMode("light")}>
              <Sun size={14} /> Claro
            </PickBtn>
            <PickBtn active={mode === "dark"} onClick={() => setMode("dark")}>
              <Moon size={14} /> Oscuro
            </PickBtn>
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted">Color de acento</div>
          <div className="flex flex-wrap items-center gap-2">
            <Swatch active={!accent} color="" onClick={() => setAccent("")} title="Marca" />
            {ACCENTS.map((a) => (
              <Swatch key={a.id} active={accent.toLowerCase() === a.color} color={a.color} onClick={() => setAccent(a.color)} title={a.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectKey() {
  const apiKey = useAi((s) => s.apiKey);
  const setApiKey = useAi((s) => s.setApiKey);

  return (
    <div>
      <Head icon={<KeyRound size={18} />} title="Conecta la IA (opcional)" hint="Pega tu API key de Gemini para activar el copiloto y la voz." />
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="AIza… (Google AI Studio)"
        spellCheck={false}
        autoComplete="off"
        className="mt-4 w-full rounded-lg border bg-bg-subtle px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
      />
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {apiKey ? (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Check size={12} /> Clave guardada en este dispositivo.
          </span>
        ) : (
          <>
            Consíguela gratis en{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              aistudio.google.com/apikey
            </a>
            . Se guarda solo en tu navegador.
          </>
        )}
      </p>
    </div>
  );
}

function Head({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl glass-inset text-accent">{icon}</div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="text-[12px] leading-relaxed text-muted">{hint}</p>
      </div>
    </div>
  );
}

function PickBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
        active ? "border-accent bg-accent/10 font-medium text-accent" : "glass-card text-ink hover:border-accent/40"
      }`}
    >
      {children}
    </button>
  );
}

function Swatch({ active, color, onClick, title }: { active: boolean; color: string; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`h-8 w-8 rounded-full border-2 transition ${active ? "border-ink scale-110" : "border-transparent hover:scale-105"}`}
      style={color ? { background: color } : { backgroundImage: "linear-gradient(120deg,var(--violet),var(--violet-bright))" }}
    >
      {active && <Check size={14} className="mx-auto text-white" />}
    </button>
  );
}

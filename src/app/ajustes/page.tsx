"use client";

import { SlidersHorizontal, Sun, Moon, Type, Zap, Contrast, Lock, Check } from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { usePrefs, ACCENTS, type TextScale } from "@/lib/prefs";
import { useTheme } from "@/lib/theme";
import { authMode } from "@/lib/account";

const SCALES: { id: TextScale; label: string }[] = [
  { id: "sm", label: "Compacto" },
  { id: "base", label: "Normal" },
  { id: "lg", label: "Grande" },
  { id: "xl", label: "Máximo" },
];

const LOCKS = [0, 5, 15, 30, 60];

export default function AjustesPage() {
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const { accent, scale, reduceMotion, highContrast, lockMinutes, setAccent, setScale, setReduceMotion, setHighContrast, setLockMinutes } = usePrefs();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<SlidersHorizontal size={20} />}
        title="Ajustes"
        subtitle="Personaliza la apariencia, la accesibilidad y la seguridad del OS. Se guarda en tu dispositivo."
      />

      {/* Apariencia */}
      <Section title="Apariencia">
        <Row label="Tema">
          <div className="flex gap-2">
            <Toggle active={mode === "light"} onClick={() => setMode("light")}>
              <Sun size={14} /> Claro
            </Toggle>
            <Toggle active={mode === "dark"} onClick={() => setMode("dark")}>
              <Moon size={14} /> Oscuro
            </Toggle>
          </div>
        </Row>

        <Row label="Color de acento" hint="De la paleta de marca, o elige uno propio.">
          <div className="flex flex-wrap items-center gap-2">
            <Swatch active={!accent} color="" onClick={() => setAccent("")} title="Marca (por tema)" />
            {ACCENTS.map((a) => (
              <Swatch key={a.id} active={accent.toLowerCase() === a.color} color={a.color} onClick={() => setAccent(a.color)} title={a.label} />
            ))}
            <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full border glass-card px-2.5 py-1 text-xs text-muted hover:border-accent/40">
              Personalizado
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#5e20be"}
                onChange={(e) => setAccent(e.target.value)}
                className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
          </div>
        </Row>

        <Row label="Tamaño de texto" hint="Escala toda la interfaz (accesibilidad).">
          <div className="flex flex-wrap gap-2">
            {SCALES.map((s) => (
              <Toggle key={s.id} active={scale === s.id} onClick={() => setScale(s.id)}>
                <Type size={13} /> {s.label}
              </Toggle>
            ))}
          </div>
        </Row>
      </Section>

      {/* Accesibilidad */}
      <Section title="Accesibilidad">
        <SwitchRow
          icon={<Zap size={15} />}
          label="Reducir movimiento"
          hint="Desactiva animaciones y transiciones."
          checked={reduceMotion}
          onChange={setReduceMotion}
        />
        <SwitchRow
          icon={<Contrast size={15} />}
          label="Alto contraste"
          hint="Sube el contraste de texto y bordes (WCAG AAA)."
          checked={highContrast}
          onChange={setHighContrast}
        />
      </Section>

      {/* Seguridad */}
      <Section title="Seguridad">
        <Row label="Bloqueo por inactividad" hint={authMode === "open" ? "Configura un acceso (Firebase o clave) para usar el bloqueo." : "Cierra la sesión tras estar inactivo."}>
          <select
            value={lockMinutes}
            onChange={(e) => setLockMinutes(Number(e.target.value))}
            disabled={authMode === "open"}
            className="rounded-md border glass-card px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
          >
            {LOCKS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "Desactivado" : `${m} min`}
              </option>
            ))}
          </select>
        </Row>
        <p className="px-1 pt-1 text-[11px] text-muted">
          Tus credenciales y datos viven solo en este dispositivo. Para borrarlos por completo usa “Borrar sesión y credenciales” en Conectores.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border glass-card p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-[11px] text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SwitchRow({ icon, label, hint, checked, onChange }: { icon: React.ReactNode; label: string; hint?: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <Row label={label} hint={hint}>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "btn-brand" : "bg-bg-subtle border"}`}
      >
        <span className={`mx-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-accent shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}>
          {checked && <Check size={11} />}
        </span>
        <span className="sr-only">{icon}</span>
      </button>
    </Row>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
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
      className={`h-7 w-7 rounded-full border-2 transition ${active ? "border-ink scale-110" : "border-transparent hover:scale-105"}`}
      style={color ? { background: color } : { backgroundImage: "linear-gradient(120deg,var(--violet),var(--violet-bright))" }}
    >
      {active && <Check size={13} className="mx-auto text-white" />}
    </button>
  );
}

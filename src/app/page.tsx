"use client";

import Link from "next/link";
import {
  ArrowRight,
  Radar,
  Bot,
  Brain,
  Activity,
  Globe,
  FileBarChart,
  Mail,
  Calendar,
  FolderOpen,
  Github,
  Send,
  Sparkles,
  ShieldCheck,
  Zap,
  BookOpen,
} from "lucide-react";

const FEATURES = [
  { icon: <Radar size={20} />, title: "Anticipación", desc: "Lee señales reales y propone las próximas mejores acciones con confianza y explicabilidad." },
  { icon: <Bot size={20} />, title: "Autonomía", desc: "Ejecuta sola lo de bajo riesgo, con guardrails, cooldown y auditoría de cada acción." },
  { icon: <Brain size={20} />, title: "Memoria", desc: "ZERO recuerda preferencias, clientes y decisiones entre sesiones y las usa como contexto." },
  { icon: <Zap size={20} />, title: "Banco de datos instantáneo", desc: "Caché caliente del estado de la agencia: respuestas inmediatas, sin esperar a cada API." },
  { icon: <Globe size={20} />, title: "Monitoreo + SEO", desc: "Uptime y latencia del sitio, más Search Console y Analytics reales, en un panel." },
  { icon: <FileBarChart size={20} />, title: "Reportes con marca", desc: "Diarios, semanales y mensuales del estado general, exportables a PDF de marca." },
];

const CONNECTORS = [
  { icon: <Mail size={16} />, label: "Gmail" },
  { icon: <FolderOpen size={16} />, label: "Drive" },
  { icon: <Calendar size={16} />, label: "Calendar" },
  { icon: <Github size={16} />, label: "GitHub" },
  { icon: <Send size={16} />, label: "Telegram" },
  { icon: <Activity size={16} />, label: "Slack" },
  { icon: <Sparkles size={16} />, label: "Gemini" },
];

const CYCLE = [
  { n: "01", t: "Integra", d: "Conecta correo, drive, calendario, repos y analítica reales." },
  { n: "02", t: "Anticipa", d: "Detecta prioridades, riesgos y oportunidades antes de que pregunten." },
  { n: "03", t: "Actúa", d: "Ejecuta, redacta y notifica con autonomía gobernada." },
  { n: "04", t: "Aprende", d: "Recuerda, calibra la confianza y reporta. Mejora con cada ciclo." },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-30 glass-bar border-b border-border/60">
        <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <span className="zero-monogram h-9 w-9 text-lg">Z</span>
          <span className="font-semibold tracking-[0.18em] text-ink">ZERO AGENCY</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/docs" className="hidden rounded-md px-3 py-1.5 text-sm text-muted hover:text-ink sm:inline">
              Documentación
            </Link>
            <Link
              href="/dashboard"
              className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium hover:opacity-95"
            >
              Entrar al OS <ArrowRight size={15} />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="brand-halo relative">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-8 sm:py-28">
          <div className="zero-rise mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles size={13} /> El gestor de conciencia de tu agencia
          </div>
          <h1 className="zero-rise text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl" style={{ animationDelay: "60ms" }}>
            Una sola mente que <span className="brand-text">orquesta</span> toda la operación
          </h1>
          <p className="zero-rise mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg" style={{ animationDelay: "120ms" }}>
            ZERO OS es un workspace omnicanal tipo Notion con un cerebro de IA que integra tu correo,
            drive, calendario, repos y analítica reales — y se adelanta, actúa y reporta por ti.
          </p>
          <div className="zero-rise mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "180ms" }}>
            <Link
              href="/dashboard"
              className="btn-brand inline-flex items-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold hover:opacity-95"
            >
              Entrar al OS <ArrowRight size={16} />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-xl border px-5 py-3 text-sm font-semibold text-ink hover:bg-bg-subtle"
            >
              <BookOpen size={16} /> Leer la documentación
            </Link>
          </div>

          {/* Conectores */}
          <div className="zero-rise mt-12 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: "240ms" }}>
            {CONNECTORS.map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full border glass-card px-3 py-1.5 text-xs text-muted">
                <span className="text-accent">{c.icon}</span> {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Ciclo de conciencia */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">El ciclo de conciencia</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
          Un bucle que mejora con cada vuelta: integra, anticipa, actúa y aprende.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CYCLE.map((s) => (
            <div key={s.n} className="surface surface-glow p-5">
              <div className="brand-text text-3xl font-extrabold">{s.n}</div>
              <div className="mt-1 text-lg font-semibold text-ink">{s.t}</div>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Todo, en un solo cerebro</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="hover-lift surface p-5">
              <span className="zero-monogram h-10 w-10">{f.icon}</span>
              <h3 className="mt-3 font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <div className="brand-gradient relative overflow-hidden rounded-3xl px-8 py-14 text-center text-white">
          <div className="relative z-10">
            <ShieldCheck size={28} className="mx-auto mb-3 opacity-90" />
            <h2 className="text-2xl font-bold sm:text-3xl">Tu agencia, gobernada por una conciencia</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/85">
              Datos reales, privacidad en tu navegador, autonomía con guardrails. Empieza en minutos.
            </p>
            <Link
              href="/dashboard"
              className="mt-7 inline-flex items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand hover:opacity-90"
            >
              Abrir ZERO OS <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-8">
          <span className="flex items-center gap-2">
            <span className="zero-monogram h-7 w-7 text-sm">Z</span> ZERO AGENCY · OS Omnicanal
          </span>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-ink">Documentación</Link>
            <Link href="/dashboard" className="hover:text-ink">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

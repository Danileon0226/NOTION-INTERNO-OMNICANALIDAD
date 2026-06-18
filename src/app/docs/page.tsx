"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

const TOC = [
  { id: "intro", label: "Qué es ZERO OS" },
  { id: "inicio", label: "Primeros pasos" },
  { id: "conciencia", label: "El gestor de conciencia" },
  { id: "banco", label: "Banco de datos" },
  { id: "integraciones", label: "Integraciones" },
  { id: "reportes", label: "Reportes" },
  { id: "seguridad", label: "Seguridad y privacidad" },
  { id: "despliegue", label: "Despliegue" },
];

export default function Docs() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass-bar border-b border-border/60">
        <nav className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="zero-monogram h-8 w-8 text-base">Z</span>
            <span className="font-semibold tracking-[0.16em] text-ink">ZERO · DOCS</span>
          </Link>
          <Link href="/dashboard" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle">
            <ArrowLeft size={15} /> Volver al OS
          </Link>
        </nav>
      </header>

      <div className="mx-auto flex max-w-5xl gap-10 px-4 py-10 sm:px-8">
        {/* TOC */}
        <aside className="sticky top-20 hidden h-max w-52 shrink-0 lg:block">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <BookOpen size={13} /> Contenido
          </p>
          <nav className="space-y-1 border-l border-border">
            {TOC.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="block border-l-2 border-transparent pl-3 text-sm text-muted hover:border-accent hover:text-ink">
                {t.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Contenido */}
        <article className="min-w-0 flex-1 space-y-12">
          <Section id="intro" title="Qué es ZERO OS">
            <p>
              <strong>ZERO Agency OS</strong> es una plataforma interna tipo Notion con un cerebro de IA
              (Gemini) que actúa como <em>gestor de conciencia</em> de la agencia: integra tus datos
              reales (Gmail, Drive, Calendar, GitHub, Telegram, Slack, Search Console y Analytics),
              se adelanta a las necesidades, automatiza tareas y reporta.
            </p>
            <p>
              Es <strong>100% client-side</strong>: tus credenciales y tu información viven solo en tu
              navegador; las llamadas van directo a las APIs oficiales. Funciona en Vercel y en GitHub Pages.
            </p>
          </Section>

          <Section id="inicio" title="Primeros pasos">
            <ol>
              <li><strong>API key de Gemini</strong>: créala en aistudio.google.com/apikey y pégala en <Code>Conectores → Asistente IA</Code>.</li>
              <li><strong>Google (Gmail/Drive/Calendar)</strong>: crea un <em>OAuth Client ID</em> (Aplicación web) en Google Cloud Console, añade tu dominio a “Orígenes de JavaScript autorizados”, y pégalo en <Code>Conectores → Google</Code>. Un clic conecta los tres.</li>
              <li><strong>GitHub / Telegram / Slack</strong>: pega token/usuario o el webhook en sus tarjetas.</li>
              <li><strong>Verifica todo</strong> en <Code>Estado de configuración</Code> (/setup): prueba cada API en vivo y te da el enlace exacto para habilitar lo que falte en tu proyecto.</li>
            </ol>
            <Callout>Mantén el Client ID, la API key y las APIs habilitadas en un <strong>mismo proyecto</strong> de Google Cloud.</Callout>
          </Section>

          <Section id="conciencia" title="El gestor de conciencia">
            <p>El núcleo de ZERO es un bucle gobernado:</p>
            <ul>
              <li><strong>Anticipación</strong> (/anticipation): reglas deterministas sobre señales reales → próximas mejores acciones con confianza, lead-time y la señal que las justifica. Escalera <Code>shadow → suggest → auto</Code>, opt-out, feedback y auditoría.</li>
              <li><strong>Autonomía</strong>: un demonio ejecuta las acciones por encima del umbral con guardrails (tope por ciclo, cooldown, solo acciones reversibles).</li>
              <li><strong>Memoria</strong> (/memory): ZERO recuerda hechos entre sesiones y los inyecta como contexto. Herramientas <Code>remember / recall / forget</Code>.</li>
              <li><strong>Briefing del día</strong>: resumen ejecutivo en un clic, y envío programado a tus canales cada mañana (Piloto automático).</li>
              <li><strong>Trazabilidad</strong> (/runs): cada ejecución del agente queda registrada (origen, herramientas, resultado).</li>
            </ul>
          </Section>

          <Section id="banco" title="Banco de datos">
            <p>
              ZERO mantiene un <strong>banco de datos en caché</strong> caliente (correo, calendario,
              GitHub, Drive, sitio) que se refresca en segundo plano y se inyecta como contexto. Así el
              acceso a la información es <strong>instantáneo</strong>: responde sin esperar a consultar
              cada API en cada pregunta.
            </p>
          </Section>

          <Section id="integraciones" title="Integraciones">
            <ul>
              <li><strong>Telegram &amp; Slack</strong>: alertas del equipo (caídas, briefings, acciones).</li>
              <li><strong>Webhooks salientes</strong>: dispara eventos a Zapier, Make, n8n o Discord.</li>
              <li><strong>Search Console + Analytics</strong>: SEO (clics, impresiones, posición) y tráfico (sesiones, usuarios) reales en el panel y en los reportes.</li>
              <li><strong>Monitoreo</strong> (/monitor): uptime y latencia del sitio; las caídas se convierten en anticipaciones.</li>
            </ul>
          </Section>

          <Section id="reportes" title="Reportes">
            <p>
              Reportes <strong>diarios, semanales y mensuales</strong> del estado general de la agencia,
              generados por ZERO con todas las señales y exportables a <strong>PDF con la marca</strong>.
              Se autogeneran cuando toca (diario, lunes, día 1) y quedan en el historial (/reports).
            </p>
          </Section>

          <Section id="seguridad" title="Seguridad y privacidad">
            <ul>
              <li>Credenciales y datos viven en tu navegador (localStorage); nada se versiona ni se envía a terceros salvo a las APIs oficiales.</li>
              <li>Tokens OAuth de solo lectura y de mínimo alcance; la API key de Gemini va en cabecera <Code>X-goog-api-key</Code>.</li>
              <li>El HTML generado se renderiza en iframes <Code>sandbox</Code>; respaldo/restauración para mover tus datos entre dominios.</li>
            </ul>
          </Section>

          <Section id="despliegue" title="Despliegue">
            <p>
              Dos modos del mismo código: <Code>npm run build</Code> para Vercel (SSR) y
              <Code>NEXT_OUTPUT_EXPORT=true npm run build</Code> para GitHub Pages (export estático).
              Mobile-first, PWA instalable y modo oscuro incluidos.
            </p>
          </Section>

          <div className="border-t pt-8 text-sm text-muted">
            ¿Listo? <Link href="/dashboard" className="font-medium text-accent underline">Entra al OS</Link> o revisa tu{" "}
            <Link href="/setup" className="font-medium text-accent underline">Estado de configuración</Link>.
          </div>
        </article>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-2xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink/80 [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-bg-subtle px-1.5 py-0.5 text-[13px] text-accent">{children}</code>;
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-ink">{children}</div>
  );
}

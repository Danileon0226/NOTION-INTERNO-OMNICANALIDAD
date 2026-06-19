"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

const TOC = [
  { id: "intro", label: "Qué es ZERO OS" },
  { id: "inicio", label: "Primeros pasos" },
  { id: "tutorial", label: "Tutorial · 5 minutos" },
  { id: "modulos", label: "Tour por módulos" },
  { id: "conciencia", label: "El gestor de conciencia" },
  { id: "banco", label: "Banco de datos" },
  { id: "integraciones", label: "Integraciones" },
  { id: "reportes", label: "Reportes" },
  { id: "acceso", label: "Acceso y roles" },
  { id: "firebase", label: "Equipo con Firebase" },
  { id: "entorno", label: "Variables de entorno" },
  { id: "seguridad", label: "Seguridad y privacidad" },
  { id: "despliegue", label: "Despliegue" },
  { id: "faq", label: "Preguntas frecuentes" },
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

          <Section id="tutorial" title="Tutorial · tus primeros 5 minutos">
            <ol>
              <li><strong>Entra al OS</strong> y abre <Code>Conectores</Code>. Pega tu API key de Gemini → pulsa “Probar IA”.</li>
              <li>Conecta Google (un clic = Gmail + Drive + Calendar). Conecta GitHub/Telegram si los usas.</li>
              <li>Ve a <Code>Estado de configuración</Code> y pulsa <strong>Probar todo</strong>: deja todo en verde.</li>
              <li>Abre el <strong>Dashboard</strong>: verás tu bandeja en vivo, la torre de control y las <strong>anticipaciones</strong> de ZERO.</li>
              <li>Pulsa <strong>⌘K</strong> (o el buscador) y escribe una orden: <em>“resume mis correos urgentes”</em> o <em>“¿qué tengo hoy?”</em>. ZERO responde al instante (banco de datos en caché).</li>
              <li>Genera tu primer <strong>Briefing del día</strong> en el Dashboard, o un <strong>Reporte</strong> en <Code>/reports</Code> y expórtalo a PDF de marca.</li>
              <li>Habla con <strong>ZERO (voz)</strong>: elige el motor <em>Neural (Gemini)</em> y pulsa el orbe.</li>
            </ol>
            <Callout>Consejo: dile a ZERO <em>“recuerda que…”</em> para que guarde datos de la agencia y los use siempre como contexto.</Callout>
          </Section>

          <Section id="modulos" title="Tour por módulos">
            <ul>
              <li><strong>Dashboard</strong>: estado general, accesos rápidos, bandeja en vivo, briefing y anticipaciones.</li>
              <li><strong>Anticipación</strong>: madurez, escalera de confianza, autonomía y auditoría.</li>
              <li><strong>Asistente IA / ZERO (voz)</strong>: copiloto en texto y por voz (con streaming).</li>
              <li><strong>Memoria</strong>: lo que ZERO recuerda entre sesiones.</li>
              <li><strong>Bandeja · Calendario · Drive · Canvas/Grafo · Monitoreo</strong>: tus datos reales.</li>
              <li><strong>Piloto automático · Orquestación · Reportes · Actividad agéntica</strong>: automatización, entrega de software (Orquestador → Documentación → Código → Prueba E2E con bucle de feedback), informes y trazabilidad.</li>
              <li><strong>Conectores · Estado de configuración</strong>: integraciones y diagnóstico de APIs.</li>
            </ul>
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

          <Section id="acceso" title="Acceso y roles (multi-tenant)">
            <p>
              El OS es <strong>multi-tenant por rol</strong>: cada persona entra con su propia clave y ve
              solo los módulos de su perfil. La landing y esta documentación quedan públicas; el acceso se
              recuerda en tu navegador y puedes cerrar sesión desde la barra lateral.
            </p>
            <p>Hay tres perfiles:</p>
            <ul>
              <li><strong>Administrador</strong> (tú): acceso total — configuración, conectores, autonomía (Piloto automático), estado de APIs y todos los módulos.</li>
              <li><strong>Chief Comercial</strong>: dashboard, anticipación, asistente y voz, memoria, bandeja, calendario, Drive, monitoreo, reportes, actividad y conectores. <em>Sin</em> Piloto automático ni estado de configuración.</li>
              <li><strong>Desarrollador</strong>: dashboard, anticipación, asistente y voz, memoria, canvas/grafo, Drive, monitoreo, reportes, actividad y conectores. <em>Sin</em> bandeja/calendario, Piloto automático ni estado de configuración.</li>
            </ul>
            <p><strong>Configurar el equipo</strong> — con la variable <Code>NEXT_PUBLIC_APP_USERS</Code> (JSON, una entrada por persona):</p>
            <pre className="overflow-x-auto rounded-lg border bg-bg-subtle p-3 text-[12px] leading-relaxed text-ink/80">{`[
  {"name":"Daniel","role":"admin","sha256":"<hash>"},
  {"name":"Comercial","role":"comercial","pass":"clave-comercial"},
  {"name":"Dev","role":"dev","sha256":"<hash>"}
]`}</pre>
            <p>Cada entrada usa <Code>pass</Code> (clave en claro) o <Code>sha256</Code> (hash, recomendado). Roles válidos: <Code>admin</Code>, <Code>comercial</Code>, <Code>dev</Code>.</p>
            <p>
              Alternativa simple (un solo administrador): <Code>NEXT_PUBLIC_APP_PASSWORD</Code> (clave en claro) o
              <Code>NEXT_PUBLIC_APP_PASSWORD_SHA256</Code> (hash). Si no defines ninguna, el OS entra abierto en modo administrador.
            </p>
            <Callout>
              Es una <strong>puerta de acceso por rol</strong>, no seguridad fuerte: la app es client-side y los datos viven en
              cada navegador. Para el hash de una clave: <Code>echo -n &quot;tu-clave&quot; | shasum -a 256</Code>.
            </Callout>
          </Section>

          <Section id="firebase" title="Equipo con Firebase (login social + perfiles + permisos)">
            <p>
              Para que cada persona tenga su <strong>perfil completo</strong>, inicie sesión con <strong>Google, GitHub o
              Facebook</strong>, y para que tú (admin) puedas <strong>aprobar accesos, asignar roles, activar/desactivar
              módulos por persona y ver su actividad</strong>, conecta un proyecto de <strong>Firebase</strong> (gratis). Sigue
              funcionando como sitio estático: los SDK hablan directo con Firebase.
            </p>
            <p><strong>Pasos (una sola vez):</strong></p>
            <ol>
              <li>Crea un proyecto en <Code>console.firebase.google.com</Code> y registra una <em>app web</em>; copia la configuración (apiKey, authDomain, projectId, appId…).</li>
              <li>En <strong>Authentication → Sign-in method</strong>, habilita <strong>Google</strong>, <strong>GitHub</strong> y <strong>Facebook</strong> (para GitHub/Facebook necesitas crear una app OAuth en cada plataforma y pegar su Client ID/Secret).</li>
              <li>En <strong>Authentication → Settings → Authorized domains</strong>, añade tu dominio (p. ej. <Code>danileon0226.github.io</Code> y/o tu dominio de Vercel).</li>
              <li>Crea <strong>Firestore Database</strong> (modo producción) y pega las reglas del archivo <Code>firestore.rules</Code> del repositorio (edita <Code>adminEmails()</Code> con tu correo).</li>
              <li>Define las variables de entorno de Firebase y tu(s) correo(s) admin (ver abajo). Despliega.</li>
            </ol>
            <p><strong>Variables:</strong></p>
            <ul>
              <li><Code>NEXT_PUBLIC_FIREBASE_API_KEY</Code>, <Code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</Code>, <Code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</Code>, <Code>NEXT_PUBLIC_FIREBASE_APP_ID</Code> (y opcional <Code>STORAGE_BUCKET</Code>, <Code>MESSAGING_SENDER_ID</Code>).</li>
              <li><Code>NEXT_PUBLIC_ADMIN_EMAILS</Code>: correos admin separados por coma (deben coincidir con <Code>adminEmails()</Code> de las reglas).</li>
              <li><Code>NEXT_PUBLIC_AUTH_PROVIDERS</Code> (opcional): <Code>google,github,facebook</Code> para elegir qué botones mostrar.</li>
            </ul>
            <Callout>
              <strong>Cómo funciona el control:</strong> al entrar por primera vez, una persona queda <em>pendiente</em> (sin acceso)
              hasta que tú la apruebes en <Code>/team</Code>. Allí asignas su rol, activas o bloqueas módulos concretos y revisas su
              actividad. Los cambios se aplican <strong>al instante</strong> en su sesión. La seguridad la imponen las reglas de
              Firestore (un usuario no puede cambiarse su propio rol ni permisos).
            </Callout>
            <p className="text-sm text-muted">
              Sin Firebase, la app sigue funcionando con el login por clave/rol (sección anterior), pero sin perfiles centralizados
              ni seguimiento entre personas.
            </p>
          </Section>

          <Section id="entorno" title="Variables de entorno">
            <ul>
              <li><Code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</Code>: Client ID de OAuth para conectar Google de un clic.</li>
              <li><Code>NEXT_PUBLIC_AGENCY_EMAIL</Code>: correo de la agencia mostrado en la UI.</li>
              <li><Code>NEXT_PUBLIC_FIREBASE_*</Code> + <Code>NEXT_PUBLIC_ADMIN_EMAILS</Code>: backend de equipo (login social, perfiles, permisos y seguimiento). Ver sección anterior.</li>
              <li><Code>NEXT_PUBLIC_AUTH_PROVIDERS</Code>: proveedores de login social a mostrar (<Code>google,github,facebook</Code>).</li>
              <li><Code>NEXT_PUBLIC_APP_USERS</Code>: equipo multi-rol por clave (JSON con name/role/pass o sha256), si no usas Firebase.</li>
              <li><Code>NEXT_PUBLIC_APP_PASSWORD</Code> / <Code>NEXT_PUBLIC_APP_PASSWORD_SHA256</Code>: clave de acceso única (un admin).</li>
              <li><Code>NEXT_PUBLIC_BASE_PATH</Code>: subruta para GitHub Pages (p. ej. <Code>/NOTION-INTERNO-OMNICANALIDAD</Code>).</li>
              <li><Code>NEXT_OUTPUT_EXPORT=true</Code>: activa la exportación estática (Pages).</li>
            </ul>
            <p>En Vercel se configuran en <em>Settings → Environment Variables</em>; en local, en <Code>.env.local</Code>.</p>
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

          <Section id="faq" title="Preguntas frecuentes">
            <ul>
              <li><strong>“invalid_client” al conectar Google</strong>: el Client ID no existe o es de otro proyecto. Cópialo exacto desde Credenciales y pégalo en Conectores → Google (mismo proyecto que el consent y las APIs).</li>
              <li><strong>“API blocked / are blocked”</strong>: tu API key de Gemini está restringida. Crea una sin restricciones en aistudio.google.com/apikey.</li>
              <li><strong>“access_denied”</strong>: añade tu Gmail como <em>usuario de prueba</em> en la pantalla de consentimiento, o publica la app.</li>
              <li><strong>“origin_mismatch”</strong>: añade tu dominio exacto (sin barra final) a “Orígenes de JavaScript autorizados”.</li>
              <li><strong>La voz no suena</strong>: usa el motor Neural (Gemini) con la API key activa; si no, ZERO usa la voz del sistema.</li>
              <li><strong>Perdí mis datos al cambiar de dominio</strong>: el estado vive en localStorage por origen. Usa <em>Conectores → Datos y respaldo</em> para exportar/importar.</li>
            </ul>
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

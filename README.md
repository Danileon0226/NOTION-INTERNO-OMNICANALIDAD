# Zero Agency OS · Notion Interno Omnicanal

Plataforma interna tipo **Notion** para Zero Agency: un **workspace** con editor de bloques,
un **dashboard alimentado en vivo por el correo de la agencia** e integraciones omnicanal con
**Gmail, Google Drive, Google Calendar, GitHub y Telegram**, orquestadas por **ZERO**, el
gestor de IA (Gemini) que anticipa, automatiza y monitorea.

> **Sin datos de ejemplo.** Todo se alimenta en vivo desde tus conectores; nada sale del
> navegador salvo a las APIs oficiales de cada servicio.

## ✨ Funcionalidades

- **Workspace tipo Notion** — editor de bloques completo (encabezados, listas, tareas, código,
  imágenes, citas, resaltados, divisores), **menú slash (`/`)**, **atajos de Markdown**,
  acciones de bloque, **subpáginas anidadas**, plantillas y **exportar a Markdown**. Persistencia local.
- **Dashboard de la agencia** — métricas en vivo del correo, accesos rápidos y estado de conectores.
- **Anticipación** — motor de reglas que lee señales reales de tus conectores y propone las
  próximas mejores acciones (NBA) con confianza, lead-time y explicabilidad. Escalera de
  confianza `shadow → suggest → auto` con opt-out, feedback y auditoría.
- **Autonomía** — demonio que ejecuta las anticipaciones por encima del umbral con guardrails
  (tope por ciclo, cooldown, solo acciones reversibles).
- **Monitoreo web** — vigila el sitio de la agencia (zeroagency.com.co): disponibilidad,
  latencia y uptime; las caídas/lentitud se convierten en anticipaciones accionables.
- **ZERO (voz)** — asistente estilo JARVIS (reconocimiento + síntesis de voz, voz configurable).
- **Asistente IA + Piloto automático** — copiloto y rutinas que ZERO ejecuta con function calling.
- **Canvas / Grafo** — visualización en tiempo real de lo que la IA integra (estilo Obsidian).
- **Conectores omnicanal** — Gmail, Drive, Calendar (OAuth de un clic), GitHub y Telegram.
- **PWA instalable**, **modo oscuro**, **paleta de comandos (⌘K)** y diseño **mobile-first**.

## 🧱 Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Zustand** (estado persistido en `localStorage`)
- **lucide-react** (iconografía)
- **Gemini** (REST, client-side) como motor de IA / function calling

Arquitectura **100% client-side**: las credenciales viven solo en el navegador y las llamadas
van directo a cada API. Compatible con **Vercel** (SSR) y **GitHub Pages** (export estático).

## 🚀 Desarrollo

```bash
npm install
npm run dev                         # http://localhost:3000
npm run build                       # build de producción (Vercel)
NEXT_OUTPUT_EXPORT=true npm run build  # export estático (GitHub Pages)
```

## 🔌 Conectar datos reales

1. Configura `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Client ID OAuth tipo Web) en Vercel o `.env.local`:
   conectar Gmail + Drive + Calendar es de un solo clic.
2. En **Conectores**: pega la API key de **Gemini**, conecta **GitHub** (usuario/token) y
   **Telegram** (bot token + chat id).
3. El dashboard, la bandeja, el calendario, Drive, el Canvas y la anticipación se hidratan
   automáticamente desde esos conectores.

## 📁 Estructura

```
src/
├── app/                 # rutas (dashboard, inbox, calendar, drive, monitor,
│   │                    #         anticipation, autopilot, canvas, zero, connectors, pages)
│   └── manifest.ts      # PWA
├── components/          # Sidebar, AppShell, editor, anticipación, monitor, ...
└── lib/
    ├── store.ts         # workspace (Zustand)
    ├── connectors/      # Gmail/Drive/Calendar, GitHub, Telegram
    ├── ai/              # agente Gemini + herramientas (function calling)
    ├── anticipation/    # motor, gobernanza y autonomía
    ├── monitor/         # monitoreo de sitios
    └── data/            # configuración de UI, plantillas, página en blanco
```

---

Hecho para Zero Agency. Despliegue recomendado: **Vercel**.

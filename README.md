# Zero Agency OS · Notion Interno Omnicanal

Plataforma interna tipo **Notion** para Zero Agency, con un **dashboard alimentado por el
correo de la agencia** e integraciones omnicanal con **Gmail, Google Drive, GitHub y Telegram**.

## ✨ Funcionalidades

- **Workspace tipo Notion** — editor de bloques completo: encabezados, texto, listas de
  tareas, viñetas, **listas numeradas, código, imágenes, citas, resaltados y divisores**.
  **Menú slash (`/`)** flotante y filtrable, **atajos de Markdown** (`#`, `-`, `[]`, `>`,
  ` ``` `), **acciones de bloque** (subir/bajar, duplicar, eliminar), **subpáginas anidadas**
  con breadcrumbs, y **barra lateral con árbol de páginas y búsqueda**. Persistencia local.
- **Bloques de conectores en vivo** — inserta con `/` bloques que muestran datos reales
  dentro de tus páginas: **GitHub** (repos/PRs), **Gmail** (bandeja), **Google Drive**
  (archivos) y **Telegram** (enviar alertas al equipo desde la propia nota).
- **Dashboard de la agencia** — métricas en vivo derivadas del correo: no leídos, acciones
  sugeridas por IA, prioridad alta y alertas de finanzas; desglose por categoría, lista de
  acciones y estado de los conectores.
- **Bandeja unificada** — correo clasificado por categoría (Finanzas, Colaboración,
  Marketing, Seguridad, Leads, Comunidad, Producto) con acciones sugeridas.
- **Conectores omnicanal** — tarjetas de integración para Gmail, Google Drive, GitHub y
  Telegram, con estado, métricas y flujos de conexión (OAuth / token / webhook).

La demo pública viene **sembrada con datos de ejemplo anonimizados** que representan el
flujo típico de una agencia: alertas de facturación, carpetas compartidas de clientes,
métricas SEO, alertas de seguridad y leads. En producción, el módulo de datos se reemplaza
por la sincronización vía OAuth con la cuenta de Gmail real de la agencia.

## 🧱 Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Zustand** (estado del workspace, persistido en `localStorage`)
- **lucide-react** (iconografía)

## 🚀 Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
```

## 🔌 Conectar datos reales

La app **no usa datos de ejemplo**: todo se alimenta en vivo desde los conectores.

1. Configura `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Client ID OAuth de tipo Web) en Vercel o en
   `.env.local`. Con eso, conectar Gmail + Drive + Calendar es de un solo clic.
2. En **Conectores** conecta GitHub (token/usuario) y Telegram (bot token + chat id).
3. El dashboard, la bandeja y el Canvas/Grafo se hidratan automáticamente desde esos
   conectores. ZERO (Gemini) los orquesta con function calling.

## 📁 Estructura

```
src/
├── app/
│   ├── dashboard/        # dashboard principal
│   ├── inbox/            # bandeja unificada clasificada
│   ├── connectors/       # gestión de integraciones
│   ├── pages/[id]/       # editor de páginas tipo Notion
│   └── api/
│       ├── emails/       # correos + métricas derivadas
│       └── connectors/   # estado y flujos de conexión
├── components/
│   ├── Sidebar.tsx
│   ├── editor/BlockEditor.tsx
│   └── ...
└── lib/
    ├── types.ts
    ├── store.ts          # store Zustand del workspace
    ├── dashboard.ts      # cálculo de métricas
    └── data/             # datos sembrados (emails, conectores, workspace)
```

---

Hecho para Zero Agency. Despliegue recomendado: **Vercel**.

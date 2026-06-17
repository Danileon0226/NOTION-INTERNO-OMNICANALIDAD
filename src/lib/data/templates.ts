import type { Block, BlockType } from "@/lib/types";

// Plantillas de página para el workspace. Los ids de bloque se regeneran
// al aplicar la plantilla (ver `cloneBlocks` en el store).

export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  blocks: Block[];
}

let n = 0;
const b = (type: BlockType, content = "", extra: Partial<Block> = {}): Block => ({
  id: `t${n++}`,
  type,
  content,
  ...extra,
});

export const templates: Template[] = [
  {
    id: "blank",
    name: "En blanco",
    icon: "📄",
    description: "Empieza desde cero.",
    blocks: [b("text", "")],
  },
  {
    id: "client-brief",
    name: "Brief de cliente",
    icon: "🤝",
    description: "Objetivos, alcance y entregables de un cliente.",
    blocks: [
      b("heading1", "Brief — [Cliente]"),
      b("callout", "Resumen del proyecto en una frase."),
      b("heading2", "Objetivos"),
      b("bulleted", "Objetivo de negocio"),
      b("bulleted", "Métrica de éxito (KPI)"),
      b("heading2", "Alcance"),
      b("todo", "Identidad / branding"),
      b("todo", "Sitio web / landing"),
      b("todo", "Gestión de redes"),
      b("todo", "Campañas de ads"),
      b("heading2", "Entregables y fechas"),
      b("numbered", "Entregable 1 — fecha"),
      b("numbered", "Entregable 2 — fecha"),
      b("heading2", "Presupuesto"),
      b("text", "Retainer / proyecto: "),
      b("divider"),
      b("heading3", "Carpeta compartida del cliente"),
      b("embed-drive", ""),
    ],
  },
  {
    id: "monthly-report",
    name: "Reporte mensual",
    icon: "📈",
    description: "Resultados, métricas y próximos pasos del mes.",
    blocks: [
      b("heading1", "Reporte mensual — [Mes]"),
      b("callout", "Titular del mes: lo más importante en una línea."),
      b("heading2", "Métricas clave"),
      b("bulleted", "Tráfico / alcance: "),
      b("bulleted", "Conversiones / leads: "),
      b("bulleted", "Ingresos / ROI: "),
      b("heading2", "Qué funcionó"),
      b("bulleted", ""),
      b("heading2", "Qué mejorar"),
      b("bulleted", ""),
      b("heading2", "Próximos pasos"),
      b("todo", ""),
      b("todo", ""),
      b("divider"),
      b("heading3", "Actividad de desarrollo"),
      b("embed-github", ""),
    ],
  },
  {
    id: "meeting-notes",
    name: "Acta de reunión",
    icon: "📝",
    description: "Asistentes, temas, decisiones y tareas.",
    blocks: [
      b("heading1", "Acta — [Tema] · [Fecha]"),
      b("text", "Asistentes: "),
      b("heading2", "Agenda"),
      b("numbered", ""),
      b("numbered", ""),
      b("heading2", "Decisiones"),
      b("bulleted", ""),
      b("heading2", "Tareas asignadas"),
      b("todo", "Responsable — tarea — fecha"),
      b("todo", ""),
      b("divider"),
      b("heading3", "Avisar al equipo"),
      b("embed-telegram", ""),
    ],
  },
  {
    id: "roadmap",
    name: "Roadmap de proyecto",
    icon: "🗺️",
    description: "Fases, hitos y estado del proyecto.",
    blocks: [
      b("heading1", "Roadmap — [Proyecto]"),
      b("callout", "Visión y meta del proyecto."),
      b("heading2", "Ahora"),
      b("todo", ""),
      b("heading2", "Siguiente"),
      b("todo", ""),
      b("heading2", "Después"),
      b("todo", ""),
      b("divider"),
      b("heading3", "Issues y PRs"),
      b("embed-github", ""),
    ],
  },
  {
    id: "wiki",
    name: "Wiki / Base de conocimiento",
    icon: "📚",
    description: "Documentación interna y procesos.",
    blocks: [
      b("heading1", "Wiki del equipo"),
      b("text", "Índice de procesos, guías y recursos internos."),
      b("heading2", "Procesos"),
      b("bulleted", "Onboarding de clientes"),
      b("bulleted", "Flujo de aprobaciones"),
      b("heading2", "Guías"),
      b("bulleted", "Tono y estilo de marca"),
      b("heading2", "Snippet útil"),
      b("code", "# comando frecuente\nnpm run build"),
    ],
  },
  {
    id: "crm",
    name: "CRM de leads",
    icon: "🎯",
    description: "Pipeline de prospectos y seguimiento.",
    blocks: [
      b("heading1", "Pipeline de leads"),
      b("heading2", "🟢 Nuevos"),
      b("todo", "Lead — fuente — contacto"),
      b("heading2", "🟡 En conversación"),
      b("todo", ""),
      b("heading2", "🔵 Propuesta enviada"),
      b("todo", ""),
      b("heading2", "✅ Ganados"),
      b("bulleted", ""),
      b("divider"),
      b("heading3", "Leads desde el correo"),
      b("embed-gmail", ""),
    ],
  },
];

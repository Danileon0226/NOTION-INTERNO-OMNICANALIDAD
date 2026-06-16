import { NextResponse } from "next/server";
import { seedConnectors } from "@/lib/data/connectors";
import type { ConnectorId } from "@/lib/types";

// GET /api/connectors — estado de todas las integraciones.
export async function GET() {
  return NextResponse.json({ connectors: seedConnectors });
}

// POST /api/connectors — punto de entrada para iniciar/actualizar una conexión.
// Aquí se dispararía el flujo OAuth (Google), la validación de token (GitHub)
// o el registro del webhook (Telegram). Por ahora responde con la URL/estado
// que el frontend debe seguir.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: ConnectorId; action?: string };
  const id = body.id;

  const flows: Record<ConnectorId, { next: string; message: string }> = {
    gmail: {
      next: "/api/connectors/google/start?scope=gmail",
      message: "Redirige al consentimiento OAuth de Google para Gmail.",
    },
    "google-drive": {
      next: "/api/connectors/google/start?scope=drive",
      message: "Redirige al consentimiento OAuth de Google para Drive.",
    },
    github: {
      next: "https://github.com/apps/zero-agency-os/installations/new",
      message: "Instala la GitHub App o registra un Personal Access Token.",
    },
    telegram: {
      next: "/connectors?setup=telegram",
      message: "Configura TELEGRAM_BOT_TOKEN y registra el webhook del bot.",
    },
  };

  if (!id || !(id in flows)) {
    return NextResponse.json({ error: "Conector desconocido" }, { status: 400 });
  }

  return NextResponse.json({ id, ...flows[id] });
}

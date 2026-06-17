"use client";

// Helper reutilizable para conectar Google en un solo clic (Gmail + Drive +
// Calendar). Usa el store directamente, así sirve en cualquier pantalla
// (dashboard, bandeja, conectores) sin duplicar la lógica del hook.

import { requestGoogleToken } from "@/lib/connectors/google";
import {
  useConnectors,
  googleTokenValid,
  GOOGLE_SCOPES,
  GOOGLE_CLIENT_ID,
} from "@/lib/connectors/store";

/**
 * Garantiza un access token de Google con los scopes pedidos (por defecto los
 * tres: Gmail, Drive y Calendar). Reutiliza el token si ya es válido.
 */
export async function connectGoogle(scopes: string[] = GOOGLE_SCOPES): Promise<string> {
  const { google, setGoogle } = useConnectors.getState();
  const clientId = (google.clientId || GOOGLE_CLIENT_ID).trim();
  if (!clientId) {
    throw new Error(
      "Falta el Google OAuth Client ID. Configúralo en Vercel como NEXT_PUBLIC_GOOGLE_CLIENT_ID o pégalo en Conectores."
    );
  }
  if (scopes.every((s) => googleTokenValid(google, s))) return google.accessToken;
  const wanted = Array.from(new Set([...google.scopes, ...scopes]));
  const tok = await requestGoogleToken(clientId, wanted);
  setGoogle({
    clientId,
    accessToken: tok.access_token,
    expiry: Date.now() + tok.expires_in * 1000,
    scopes: tok.scope ? tok.scope.split(" ") : wanted,
  });
  return tok.access_token;
}

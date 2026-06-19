// Referencia: normalización a LeadPayload v1.0 + tipado para Firestore REST.
// Este mismo código va embebido en los nodos "Code" de los workflows de n8n.
// Modo del nodo Code: "Run Once for Each Item".

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Construye el LeadPayload canónico a partir de un objeto plano de cualquier canal. */
function toLead(input, channel) {
  const now = new Date().toISOString();
  return {
    schemaVersion: "1.0",
    leadId: input.leadId || uuid(),
    receivedAt: now,
    status: "received",
    source: {
      channel: channel || input.channel || "web",
      campaign: input.campaign || "",
      adId: input.adId || "",
      referrer: input.referrer || "",
    },
    contact: {
      fullName: input.fullName || input.name || "",
      phone: (input.phone || "").replace(/[^\d+]/g, ""),
      email: input.email || "",
      preferredChannel: input.preferredChannel || (channel === "whatsapp" ? "whatsapp" : "email"),
      consent: input.consent === true || input.consent === "true",
    },
    intent: {
      rawMessage: input.message || input.rawMessage || "",
      vehicleOfInterest: input.vehicleOfInterest || "",
      newOrUsed: input.newOrUsed || "",
      budget: input.budget ? Number(input.budget) : null,
      financing: !!input.financing,
      tradeIn: !!input.tradeIn,
      timeframe: input.timeframe || "",
    },
    meta: { locale: "es-CO" },
  };
}

// ── Tipado para la REST de Firestore ─────────────────────────
function fsVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsVal) } };
  if (typeof v === "object") return { mapValue: { fields: fsFields(v) } };
  return { stringValue: String(v) };
}
function fsFields(o) {
  const f = {};
  for (const k in o) f[k] = fsVal(o[k]);
  return f;
}

module.exports = { uuid, toLead, fsVal, fsFields };

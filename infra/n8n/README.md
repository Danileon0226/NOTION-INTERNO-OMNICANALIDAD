# Entrada omnicanal · Workflows de n8n (PamaMotors → ZERO)

Workflows **importables** que reciben leads/mensajes entrantes desde los canales de
captación y los normalizan al esquema canónico **`LeadPayload`** (ver `lead.schema.json`),
escribiéndolos en **Firestore** (`leads/{leadId}`), donde ZERO OS los procesa.

> Contexto y arquitectura completa: `docs/OMNICANAL_PAMAMOTORS.md`.
> Estos workflows cubren la **fase de captación → ingesta** (F0–F1).

## Contenido

| Archivo | Webhook | Qué hace |
|---|---|---|
| `wf-lead-ingest.json` | `POST /webhook/lead` | Lead de **web/landing** (o cualquier canal que postee el payload) → Firestore. |
| `wf-whatsapp-inbound.json` | `GET+POST /webhook/whatsapp` | Verifica el webhook de **WhatsApp Cloud** y convierte cada mensaje entrante en un lead (`wa-<telefono>`). |
| `wf-meta-leadads.json` | `GET+POST /webhook/meta-leads` | Verifica el webhook de **Meta Lead Ads (FB/IG)**, trae el lead por Graph API y lo normaliza. |
| `lead-normalize.js` | — | Referencia de la normalización (el mismo código va en los nodos *Code*). |
| `lead.schema.json` | — | JSON Schema del `LeadPayload`. |

## Requisitos

- Una instancia de **n8n** (la VM del diagrama).
- Un proyecto de **Firebase/Firestore** (el mismo que usa ZERO OS para el equipo).
- Apps de Meta (WhatsApp Cloud API y/o Lead Ads) con sus tokens.

## Variables de entorno (en n8n)

```
FIREBASE_PROJECT_ID=tu-proyecto-firebase
META_VERIFY_TOKEN=una-cadena-secreta-que-tu-eliges   # para verificar los webhooks de Meta
META_PAGE_TOKEN=EAAG...                               # token de página (Lead Ads → traer el lead)
PAMA_WEBHOOK_SECRET=...                               # opcional, HMAC del webhook web
```

## Credenciales

Los nodos **HTTP Request → Firestore** usan el tipo de credencial
`Google Firebase Cloud Firestore OAuth2`. Al importar, cada nodo mostrará
`REPLACE_ME`: selecciona/crea una credencial con un **service account** con permiso de
escritura en Firestore. (Alternativa: usa el nodo nativo *Google Cloud Firestore*.)

## Cómo importar

1. En n8n: **Workflows → Import from File** y sube cada `.json`.
2. Abre cada nodo **Firestore** y selecciona tu credencial.
3. Define las variables de entorno de arriba (o sustitúyelas por valores fijos).
4. Activa el workflow (toggle **Active**).
5. Copia la **Production URL** del nodo Webhook para registrarla en cada canal.

## Registro de webhooks en cada canal

- **Web / Landing**: que el formulario haga `POST` a `.../webhook/lead` con JSON
  (`name`, `phone`, `email`, `consent`, `vehicleOfInterest`, `message`, `campaign`…).
  Campos mínimos: `consent: true` + `phone` o `email`.
- **WhatsApp Cloud API** (Meta → WhatsApp → Configuration): Callback URL =
  `.../webhook/whatsapp`, Verify Token = `META_VERIFY_TOKEN`. Suscríbete a `messages`.
- **Meta Lead Ads** (App → Webhooks → page → `leadgen`): Callback URL =
  `.../webhook/meta-leads`, Verify Token = `META_VERIFY_TOKEN`.

## Modelo de datos (Firestore)

Cada lead se guarda en `leads/{leadId}` con el `LeadPayload` y `status: "received"`.
WhatsApp y Lead Ads usan **upsert** (`PATCH`) con clave estable (`wa-<telefono>` /
`meta-<leadgenId>`) para no duplicar. ZERO OS lee esta colección como cockpit.

## Seguridad / cumplimiento

- `consent` es **obligatorio**; sin opt-in no se debe contactar (habeas data, Ley 1581 CO).
- Los tokens viven en n8n (servidor), nunca en el navegador.
- Verifica siempre el `verify_token` (ya incluido) y, para el webhook web, valida el
  HMAC con `PAMA_WEBHOOK_SECRET` antes de aceptar (gancho señalado en `lead-normalize.js`).

## Siguiente paso (procesamiento)

Tras la ingesta, los workflows del **Agente Central** y los **Orquestadores**
(Requerimientos → Documentación → Distribución) consumen `leads/{leadId}` y avanzan
la máquina de estados. Ver `docs/OMNICANAL_PAMAMOTORS.md` §5–§9.

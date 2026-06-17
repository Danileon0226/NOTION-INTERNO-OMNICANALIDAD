# Certificación de Gobierno de Datos
### Zero Agency OS · Notion Interno Omnicanal
**Entregable para:** Dafton Media
**Versión:** 1.0 · **Fecha de emisión:** 17 de junio de 2026
**Responsable de datos:** Zero Agency (`equipo@zeroagency.example`)

---

## 1. Propósito

Este documento certifica las políticas, controles y prácticas de **gobierno de datos**
aplicadas en la plataforma *Zero Agency OS* (en adelante "la Plataforma"), un workspace
interno tipo Notion con dashboard alimentado por el correo de la agencia e integraciones
omnicanal (Gmail, Google Drive, GitHub, Telegram).

Su objetivo es servir como evidencia de cumplimiento para la certificación de gobierno de
datos requerida por **Dafton Media**.

---

## 2. Clasificación de datos

| Categoría | Ejemplos | Sensibilidad | Tratamiento |
|---|---|---|---|
| **Datos de demostración** | Correos de ejemplo, métricas, conectores | Pública | Anonimizados, incluidos en el repositorio |
| **Datos operativos (producción)** | Bandeja Gmail real, archivos Drive, repos GitHub | Confidencial | Solo vía OAuth en tiempo de ejecución; **nunca** persistidos en el repositorio |
| **Credenciales** | Tokens OAuth, `TELEGRAM_BOT_TOKEN`, `GITHUB_TOKEN` | Secreta | Variables de entorno (`.env.local`), fuera de control de versiones |
| **Estado del workspace** | Páginas, bloques y notas del usuario | Interna | `localStorage` del navegador del usuario; no sale del dispositivo |

---

## 3. Principio rector: minimización y anonimización

La Plataforma se entrega con **datos de ejemplo anonimizados** (`src/lib/data/emails.ts`).
Cualquier contenido derivado de bandejas reales fue reemplazado por registros ficticios
(dominios `.example`) que representan el *flujo típico* de una agencia (facturación,
colaboración, marketing, seguridad, leads) **sin exponer información personal identificable
(PII)**.

> ✅ **Estado actual (working tree):** el árbol de trabajo **no contiene** correos reales,
> nombres de clientes reales ni credenciales. Verificable: `git grep` sobre la rama no
> retorna PII real.
>
> ⚠️ **Hallazgo abierto (historial de git):** los commits **previos** a la anonimización
> (`0b6b5c0`, `2312fa9`, `2305f0b`) todavía contienen datos reales extraídos. Un repositorio
> incluye su historial, por lo que **antes de hacer público o entregar externamente el repo**
> debe ejecutarse la remediación de la sección 8.1. Esta acción es **destructiva** (reescritura
> de historial + `push --force`) y requiere **autorización expresa del titular**.

---

## 4. Flujos de datos por conector

Cada integración opera bajo el principio de **menor privilegio** y consentimiento explícito:

| Conector | Datos accedidos | Scope mínimo | Autenticación | Persistencia |
|---|---|---|---|---|
| **Gmail** | Asunto, remitente, fecha, snippet | `gmail.readonly` | OAuth 2.0 (Google) | En memoria / sesión |
| **Google Drive** | Metadatos de carpetas y archivos compartidos | `drive.readonly` | OAuth 2.0 (Google) | En memoria / sesión |
| **GitHub** | Issues, PRs, estado de CI | `repo` (lectura) | GitHub App / PAT | En memoria / sesión |
| **Telegram** | Envío de alertas salientes | Bot API | `TELEGRAM_BOT_TOKEN` | Sin almacenamiento |

Ningún conector escribe datos personales en el repositorio ni en una base de datos
persistente del lado del servidor.

---

## 5. Controles de seguridad

- **Credenciales fuera de versionado:** `.gitignore` excluye `.env`, `.env*.local` y `.vercel`.
- **Plantilla de configuración:** `.env.example` documenta las variables sin valores reales.
- **Transporte cifrado:** todas las integraciones usan HTTPS/TLS hacia las APIs de Google,
  GitHub y Telegram.
- **Sin backend con estado:** la demo es una exportación estática; no expone endpoints que
  almacenen PII.
- **Aislamiento del estado del usuario:** las páginas del workspace viven en `localStorage`
  del cliente; no se transmiten a terceros.

---

## 6. Retención y eliminación

| Dato | Retención | Mecanismo de borrado |
|---|---|---|
| Estado del workspace (`localStorage`) | Hasta que el usuario lo borre | Limpiar datos del navegador |
| Datos OAuth en sesión | Duración de la sesión | Cierre de sesión / expiración de token |
| Datos de demostración | Permanente (anonimizados) | N/A — no son PII |

El usuario puede **revocar** el acceso de cualquier conector en cualquier momento desde la
consola del proveedor (Google, GitHub, Telegram), invalidando inmediatamente el flujo.

---

## 7. Cumplimiento normativo

La arquitectura es compatible con:

- **Ley 1581 de 2012 (Habeas Data, Colombia)** — tratamiento basado en autorización,
  finalidad y minimización.
- **RGPD / GDPR (UE)** — derecho de acceso, portabilidad y supresión; datos en el dispositivo
  del titular.
- **Principio de privacidad por diseño** — anonimización por defecto en la entrega.

---

## 8. Trazabilidad y auditoría

### 8.1 Remediación pendiente — purga de historial

| Hallazgo | Severidad | Remediación | Estado |
|---|---|---|---|
| PII real en commits previos a la anonimización | Alta | Reescribir historial (squash a un commit limpio) + `push --force` | ⏳ Pendiente de autorización del titular |

Procedimiento autorizado:
```bash
git checkout --orphan limpio
git add -A && git commit -m "MVP omnicanal (datos anonimizados)"
git branch -M limpio claude/notion-platform-email-dashboard-a561hv
git push --force origin claude/notion-platform-email-dashboard-a561hv
```
Tras ejecutarse, el repositorio (incluido su historial) quedará **libre de PII real** y este
hallazgo se marcará como cerrado.


- **Control de versiones:** todo el código y la configuración están versionados en Git, con
  historial de commits firmados por el responsable.
- **Pipeline reproducible:** el build (`npm run build`) y el despliegue están definidos como
  código (`.github/workflows/pages.yml`), auditables y reproducibles.
- **Separación de entornos:** la demo usa datos anonimizados; producción se conecta a fuentes
  reales solo mediante credenciales inyectadas en tiempo de ejecución.

---

## 9. Declaración de certificación

Por medio del presente, se deja constancia del estado de los controles de gobierno de datos
de la Plataforma *Zero Agency OS* a la fecha de emisión:

- ✅ Working tree (rama de entrega) sin PII real.
- ✅ Credenciales gestionadas fuera de versionado.
- ✅ Acceso a fuentes reales bajo OAuth y menor privilegio.
- ✅ Anonimización por defecto y minimización de datos.
- ✅ Pipeline auditable y reproducible.
- ⚠️ **Hallazgo abierto:** historial de git con PII real previa — remediación definida en la
  sección 8.1, **pendiente de autorización del titular** para su ejecución.

> La certificación plena de "repositorio sin PII" queda **condicionada** a la ejecución de la
> remediación 8.1. Hasta entonces, el repositorio **no debe** hacerse público ni entregarse a
> terceros fuera de este canal controlado.

**Emitido por:** Zero Agency
**Dirigido a:** Dafton Media — Área de Certificación de Gobierno de Datos
**Estado del MVP:** Completo y compilando (`npm run build` ✓ · exportación estática verificada).

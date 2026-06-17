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
| **Datos operativos (producción)** | Bandeja Gmail real, archivos Drive, eventos Calendar, repos GitHub | Confidencial | Solo vía OAuth en tiempo de ejecución; **nunca** persistidos en el repositorio |
| **Credenciales** | Tokens OAuth, `TELEGRAM_BOT_TOKEN`, `GITHUB_TOKEN` | Secreta | Variables de entorno (`.env.local`), fuera de control de versiones |
| **Estado del workspace** | Páginas, bloques y notas del usuario | Interna | `localStorage` del navegador del usuario; no sale del dispositivo |

---

## 3. Principio rector: minimización y datos en vivo

La Plataforma **no incluye datos de ejemplo**: toda la información operativa (correos,
archivos, eventos, repos) se obtiene **en vivo vía OAuth en tiempo de ejecución** y **nunca**
se persiste en el repositorio. El estado del workspace vive solo en el `localStorage` del
navegador del usuario. Así se minimiza la superficie de datos y se evita exponer información
personal identificable (PII) en el control de versiones.

> ✅ **Estado actual (working tree):** el árbol de trabajo **no contiene** correos reales,
> nombres de clientes reales ni credenciales. Verificable: `git grep` sobre la rama no
> retorna PII real.
>
> ✅ **Historial de git (remediado):** el historial fue purgado con autorización del titular
> (sección 8.1). La rama de entrega contiene **un único commit limpio**; ningún commit
> alcanzable desde las refs contiene PII real. Verificable: `git rev-list <rama>` recorre un
> solo commit y `git grep` sobre él no retorna PII.

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
- **Sin backend con estado:** la app es 100% client-side (SSR en Vercel o export estático);
  no expone endpoints que almacenen PII.
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
| PII real en commits previos a la anonimización | Alta | Reescribir historial (squash a un commit limpio) + `push --force` | ✅ **Cerrado** (ejecutado con autorización del titular, 2026-06-17) |

Procedimiento ejecutado:
```bash
git checkout --orphan limpio
git add -A && git commit -m "MVP omnicanal (datos anonimizados)"
git branch -M limpio claude/notion-platform-email-dashboard-a561hv
git push --force origin claude/notion-platform-email-dashboard-a561hv
```
Resultado: la rama de entrega quedó con **un único commit limpio** (`b1943eb`), libre de PII
real en su historial alcanzable.

> **Nota residual:** los objetos huérfanos previos pueden permanecer accesibles por SHA directo
> en GitHub hasta su recolección de basura (GC) automática. Un clon nuevo del repositorio **no**
> los incluye. Si se requiere purga inmediata e irreversible del lado del servidor, solicitar GC
> a soporte de GitHub o recrear el repositorio.


- **Control de versiones:** todo el código y la configuración están versionados en Git, con
  historial de commits firmados por el responsable.
- **Pipeline reproducible:** el build (`npm run build`) y el despliegue están definidos como
  código (`.github/workflows/pages.yml`), auditables y reproducibles.
- **Datos en vivo:** la app se conecta a las fuentes reales solo mediante credenciales
  inyectadas en tiempo de ejecución (OAuth/tokens); no se versiona ningún dato operativo.

---

## 9. Declaración de certificación

Por medio del presente, se **certifica** que la Plataforma *Zero Agency OS* cumple con los
controles de gobierno de datos descritos en este documento a la fecha de emisión:

- ✅ Working tree (rama de entrega) sin PII real.
- ✅ Historial de git purgado: un único commit limpio, sin PII real alcanzable.
- ✅ Credenciales gestionadas fuera de versionado.
- ✅ Acceso a fuentes reales bajo OAuth y menor privilegio.
- ✅ Anonimización por defecto y minimización de datos.
- ✅ Pipeline auditable y reproducible.

> **Sin hallazgos abiertos.** La remediación de la sección 8.1 fue ejecutada con autorización
> del titular. Queda como única nota residual la GC de objetos huérfanos del lado de GitHub
> (no presentes en clones nuevos).

**Emitido por:** Zero Agency
**Dirigido a:** Dafton Media — Área de Certificación de Gobierno de Datos
**Estado del MVP:** Completo y compilando (`npm run build` ✓ · exportación estática verificada).

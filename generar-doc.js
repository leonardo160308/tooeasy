// generar-doc.js — Genera la documentación técnica de TOO-EASY como HTML y PDF
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DOC = `
<h1>DOCUMENTACIÓN TÉCNICA PROFESIONAL — TOO-EASY</h1>
<p class="subtitle">Revisión de Arquitecto de Software Senior · Tech Lead · Auditor Técnico</p>
<p class="subtitle">Versión 1.0 · 14 de junio de 2026</p>

<div class="resumen-box">
  <h2>Resumen Ejecutivo del Ecosistema</h2>
  <p><strong>Too-Easy</strong> es una aplicación web educativa de finanzas personales con mecánicas de gamificación. Su objetivo es que usuarios —con foco en jóvenes de 15 a 35 años— aprendan conceptos financieros básicos a través de flashcards, quizzes interactivos y un sistema de retos ligados a movimientos financieros reales. El proyecto está desplegado en Render (<code>https://tooeasy-8zct.onrender.com</code>) con base de datos en Supabase (PostgreSQL administrado) y un cliente móvil Android (APK en GitHub Releases).</p>
  <p>El stack tecnológico es: <strong>Node.js + Express 5 + Supabase (PostgreSQL) + Vanilla JS/HTML/CSS</strong> en el frontend. El proyecto fue desarrollado por un equipo académico de cinco personas del grupo 5IV8.</p>
  <table>
    <tr><th>Equipo</th><th>Rol</th></tr>
    <tr><td>Granados Luna Mario</td><td>Desarrollador</td></tr>
    <tr><td>Adán</td><td>Desarrollador</td></tr>
    <tr><td>Faro Montes Leonardo</td><td>Desarrollador</td></tr>
    <tr><td>Ramírez Díaz Luz Karen</td><td>Desarrolladora</td></tr>
    <tr><td>Vega Sandoval Julio Emiliano</td><td>Desarrollador</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════ MÓDULO 1 -->
<div class="page-break"></div>
<div class="module-header mod1">MÓDULO 1 — SERVIDOR PRINCIPAL</div>
<p class="module-file">Archivo: <code>server.js</code></p>

<h2>1. Descripción General del Módulo</h2>
<p>Constituye el punto de entrada y núcleo orquestador de toda la aplicación. Inicializa el runtime HTTP, aplica la capa de seguridad perimetral, registra las 15 rutas del API y arranca el proceso de limpieza automática de tickets.</p>
<p><strong>¿Por qué existe?</strong> En una arquitectura monolítica modular, existe un único proceso Node que sirve simultáneamente el API REST y los archivos estáticos del frontend. El <code>server.js</code> es la raíz de ese árbol de dependencias.</p>
<p><strong>Objetivo dentro del ecosistema:</strong> Es la capa de composición que une el plano de infraestructura (Helmet, Rate Limit, CORS) con el plano de dominio (rutas de negocio) y el plano de datos (Supabase).</p>

<h2>2. Lógica de Negocio</h2>
<h3>Flujo completo de una petición HTTP</h3>
<pre>
Cliente (Browser/APK)
  │
  ├─ [1] TCP → Express listener (PORT 3000 / Render 443)
  ├─ [2] Helmet CSP + HSTS + noSniff + Frameguard
  ├─ [3] CORS whitelist check
  ├─ [4] express.json({limit:'10kb'}) → parse body
  ├─ [5a] /public/**  → static files (SIN rate limit)
  ├─ [5b] /api/auth/** → authLimiter (20 req/15min) → router
  ├─ [5c] /api/**     → globalLimiter (300 req/15min) → router
  └─ [6] 404 handler / Error handler
</pre>
<p><strong>Reglas de negocio clave:</strong></p>
<ul>
  <li><code>SESSION_SECRET</code> ausente → proceso termina (exit 1). No hay arranque inseguro silencioso.</li>
  <li><code>trust proxy 1</code> activo para que <code>req.ip</code> reciba la IP real del cliente detrás de Render/Nginx.</li>
  <li>Los archivos estáticos se sirven antes del rate limit para no consumir cuota de peticiones API con assets.</li>
  <li>El job de limpieza de tickets arranca 10 segundos después del boot y luego cada 24 horas.</li>
</ul>

<h2>3. Arquitectura Técnica</h2>
<p><strong>Patrón arquitectónico:</strong> Monolito modular con separación en capas (Routes → Controllers → Models → Services/Utils).</p>
<table>
  <tr><th>Componente</th><th>Rol</th></tr>
  <tr><td>Express 5</td><td>Framework HTTP</td></tr>
  <tr><td>Helmet</td><td>Cabeceras de seguridad HTTP</td></tr>
  <tr><td>express-rate-limit</td><td>Throttling por IP</td></tr>
  <tr><td>cors</td><td>Whitelist de orígenes permitidos</td></tr>
  <tr><td>setInterval nativo</td><td>Cron job de limpieza de tickets</td></tr>
</table>
<p><strong>Justificación:</strong> Elegir un monolito modular para un equipo académico de 5 personas es correcto — reduce la complejidad operacional de microservicios sin sacrificar la organización del código.</p>

<h2>4. Tecnologías Utilizadas</h2>
<h3>Express 5 (<code>^5.2.1</code>)</h3>
<p>Framework web minimalista para Node.js. Seleccionado por ser el estándar de facto para APIs REST. Express 5 incorpora manejo nativo de errores asíncronos (async/await sin try-catch en middleware). <em>Alternativas evaluadas:</em> Fastify (30% más rápido en benchmarks, pero con mayor curva de aprendizaje), Hono (edge-native, ultraligero).</p>
<h3>Helmet (<code>^8.1.0</code>)</h3>
<p>Middleware que aplica automáticamente 14+ cabeceras HTTP de seguridad. Configuración implementada: CSP con whitelist explícita (self + Cloudflare Turnstile), HSTS con maxAge 1 año + preload, X-Frame-Options: DENY, X-Content-Type-Options: noSniff, Referrer-Policy: strict-origin-when-cross-origin.</p>
<h3>express-rate-limit (<code>^8.4.1</code>)</h3>
<p>Middleware de throttling. Dos limitadores: global (300 req/15min) y auth (20 req/15min). <em>Limitación crítica:</em> Sin backend persistente como Redis, los contadores se pierden al reiniciar el servidor. En Render free tier con spin-down frecuente, el rate limiting pierde efectividad real.</p>

<h2>5. Algoritmos y Procesos Internos</h2>
<h3>Cron Job de Limpieza de Tickets</h3>
<pre>
setTimeout(runTicketCleanup, 10_000);         // primera ejecución: t+10s
setInterval(runTicketCleanup, 24*60*60*1000); // repetición: cada 24h
</pre>
<p>El algoritmo consulta tickets con <code>created_at &lt; now()-30days</code>, borra las imágenes del bucket de Supabase Storage y elimina los registros. La operación es idempotente: si falla a mitad, los tickets no borrados se reintentan en la siguiente ejecución.</p>
<p><strong>Problema identificado:</strong> El <code>setTimeout</code> inicial de 10 segundos es un workaround frágil. Si Supabase tarda más en aceptar conexiones (cold start), el primer cleanup fallará silenciosamente.</p>

<h2>6. Seguridad</h2>
<table>
  <tr><th>Control</th><th>Implementación</th><th>Calificación</th></tr>
  <tr><td>CSP</td><td>Directivas explícitas, unsafe-inline ausente</td><td class="good">Buena</td></tr>
  <tr><td>HSTS</td><td>1 año + preload</td><td class="excellent">Excelente</td></tr>
  <tr><td>Clickjacking</td><td>frameguard: deny</td><td class="excellent">Excelente</td></tr>
  <tr><td>MIME Sniffing</td><td>noSniff: true</td><td class="excellent">Excelente</td></tr>
  <tr><td>CORS</td><td>Whitelist explícita con credentials: true</td><td class="good">Buena</td></tr>
  <tr><td>Rate Limiting</td><td>Dos niveles pero sin persistencia Redis</td><td class="warn">Regular</td></tr>
  <tr><td>Body Size</td><td>10kb límite estricto</td><td class="good">Buena</td></tr>
  <tr><td>SESSION_SECRET</td><td>Verificado al boot, proceso aborta si falta</td><td class="excellent">Excelente</td></tr>
</table>
<div class="alert alert-critical">
  <strong>⚠ Vulnerabilidad Crítica — Variables de entorno expuestas:</strong> El archivo <code>.env</code> contiene en texto plano el <code>SUPABASE_SERVICE_ROLE_KEY</code> (privilegios de superadmin que bypasean RLS), <code>RESEND_API_KEY</code>, <code>BREVO_API_KEY</code>, <code>EMAIL_PASS</code>, <code>TURNSTILE_SECRET_KEY</code>, <code>SESSION_SECRET</code> y <code>ALPHA_VANTAGE_API_KEY</code>. Todas estas claves <strong>deben ser rotadas inmediatamente</strong> si el repositorio es o fue público.
</div>

<h2>7. Rendimiento</h2>
<ul>
  <li>Los archivos estáticos se sirven antes del rate limiter: decisión correcta que evita overhead innecesario.</li>
  <li><strong>Sin compresión gzip</strong> habilitada (middleware <code>compression</code> ausente). En producción esto representa una transferencia 60-80% mayor para HTML/CSS/JS.</li>
  <li>Sin cabeceras <code>Cache-Control</code> en archivos estáticos.</li>
</ul>

<h2>8. Escalabilidad</h2>
<p><strong>Cuello de botella principal:</strong> El cron job de tickets en memoria. Con múltiples instancias, cada una ejecutaría el cleanup independientemente generando race conditions sobre los mismos tickets.</p>
<p><strong>Solución recomendada:</strong> Usar <code>pg_cron</code> en Supabase o BullMQ con Redis para scheduling distribuido.</p>
<p><strong>Limitación de Render free tier:</strong> El servidor hace spin-down después de 15 minutos de inactividad. El <code>setInterval</code> de 24h no sobrevivirá — en la primera petición tras el spin-down el servidor arranca de nuevo y el intervalo se reinicia.</p>

<h2>9. Mejoras Futuras</h2>
<table>
  <tr><th>Horizonte</th><th>Mejora</th><th>Impacto</th></tr>
  <tr><td>Corto plazo</td><td>Agregar middleware <code>compression()</code></td><td>-60-80% en transferencia</td></tr>
  <tr><td>Corto plazo</td><td>Cache-Control en express.static</td><td>Mejora de TTFB en visitas repetidas</td></tr>
  <tr><td>Corto plazo</td><td>Rotar todas las claves del .env</td><td>Seguridad crítica</td></tr>
  <tr><td>Mediano plazo</td><td>Migrar cron job a pg_cron en Supabase</td><td>Sobrevive reinicios del servidor</td></tr>
  <tr><td>Mediano plazo</td><td>Redis (Upstash free tier) para rate limiting</td><td>Rate limiting efectivo</td></tr>
  <tr><td>Largo plazo</td><td>Separar API de archivos estáticos (CDN)</td><td>Escalabilidad horizontal</td></tr>
</table>

<h2>10. Evaluación Profesional — Módulo 1</h2>
<table>
  <tr><th>Criterio</th><th>Calificación</th><th>Justificación</th></tr>
  <tr><td>Arquitectura</td><td class="score">7/10</td><td>Monolito modular bien estructurado; falta compresión y cache headers</td></tr>
  <tr><td>Seguridad</td><td class="score">7/10</td><td>Helmet y CORS sólidos; rate limiter sin Redis pierde efectividad real</td></tr>
  <tr><td>Escalabilidad</td><td class="score">5/10</td><td>Sin Redis, cron en memoria, sin separación API/static</td></tr>
  <tr><td>Mantenibilidad</td><td class="score">8/10</td><td>Código limpio, comentado, estructura clara</td></tr>
  <tr><td>Rendimiento</td><td class="score">5/10</td><td>Sin compresión, sin cache estático</td></tr>
</table>

<!-- ═══════════════════════════════════════════════════ MÓDULO 2 -->
<div class="page-break"></div>
<div class="module-header mod2">MÓDULO 2 — SISTEMA DE AUTENTICACIÓN</div>
<p class="module-file">Archivos: <code>authController.js</code> · <code>security.js</code> · <code>requireAuth.js</code> · <code>authRecoveryController.js</code></p>

<h2>1. Descripción General del Módulo</h2>
<p>Gestiona el ciclo de vida completo de la identidad del usuario: registro con verificación de email, inicio de sesión con protección ante fuerza bruta, recuperación de contraseña en 3 pasos, y validación de sesión en cada petición autenticada.</p>
<p><strong>Objetivo:</strong> Producir un <code>sessionToken</code> HMAC firmado que todos los demás módulos verifican para autorizar peticiones. Garantiza que solo usuarios legítimos —con email verificado y credenciales válidas— puedan acceder a la plataforma.</p>

<h2>2. Lógica de Negocio</h2>
<h3>Flujo de Registro</h3>
<pre>
[1] Turnstile anti-bot → [2] Validaciones de campo → [3] Unicidad email/nombre
    → [4] HIBP pwned check → [5] bcrypt hash (12 rounds)
    → [6] INSERT usuario (email_verified=false)
    → [7] Envío código 6 dígitos por email
    → [8] Respuesta: requiresVerification=true
</pre>
<h3>Flujo de Login</h3>
<pre>
[1] Turnstile → [2] Lookup usuario por email
    → [3] Bcrypt dummy si no existe (timing attack prevention)
    → [4] Verificar bloqueo temporal (locked_until)
    → [5] comparePassword bcrypt → [6] Verificar email_verified
    → [7] Notificación de nuevo IP (async, background)
    → [8] Reset intentos fallidos → [9] Emitir sessionToken HMAC
</pre>
<h3>Flujo de Recuperación de Contraseña (3 pasos)</h3>
<pre>
Paso 1: requestRecovery → respuesta genérica (anti-enumeración) → código 6 dígitos
Paso 2: verifyRecoveryCode → safeCompare SHA-256 → sessionToken temporal
Paso 3: resetPassword → validar sessionToken → HIBP check → bcrypt
         → password_changed_at → invalidar TODOS los tokens activos
</pre>
<h3>Reglas de negocio</h3>
<ul>
  <li>Máximo 5 intentos de código → invalidación automática</li>
  <li>Máximo 3 solicitudes de código en 15 minutos por usuario</li>
  <li>Máximo 5 intentos de login fallidos → bloqueo temporal 15 minutos</li>
  <li>Sesión TTL: 7 días</li>
  <li>La sesión se invalida automáticamente al cambiar contraseña (<code>issuedAt &lt; password_changed_at</code>)</li>
</ul>

<h2>3. Arquitectura Técnica</h2>
<p><strong>Patrón:</strong> Stateless tokens HMAC firmados (implementación propia, sin dependencia de JWT library).</p>
<pre>
Formato del token:
KEY = HMAC-SHA256(SESSION_SECRET, 'tooeasy-session-v1')
payload = "userId.timestamp"
sig = HMAC-SHA256(KEY, payload)
token = base64url(payload + "." + sig)
</pre>
<p><strong>Dual-client Supabase:</strong></p>
<ul>
  <li><code>supabase</code> (anon key): lecturas y autenticación con RLS activo</li>
  <li><code>supabaseAdmin</code> (service role): escrituras que requieren bypasear RLS</li>
</ul>
<p>Esta separación refleja el principio de mínimo privilegio: lecturas de verificación usan cliente con RLS; escrituras de administración usan el cliente privilegiado.</p>

<h2>4. Tecnologías Utilizadas</h2>
<h3>bcryptjs (<code>^3.0.3</code>)</h3>
<p>Implementación JavaScript pura de bcrypt. Configurado a 12 rounds (~250ms por hash). Este valor balancea seguridad (resistencia a ataques de fuerza bruta) con usabilidad. Un atacante con GPU moderna puede calcular ~100,000 bcrypt/10-rounds por segundo; con 12 rounds ese número cae a ~25,000. <em>Alternativas:</em> argon2 (ganador de PHC 2015, más resistente a GPU), scrypt (nativo en Node).</p>
<h3>Node.js crypto (nativo)</h3>
<table>
  <tr><th>Uso</th><th>Función</th><th>Justificación</th></tr>
  <tr><td>Generación de OTP</td><td><code>crypto.randomInt(100000, 999999)</code></td><td>Sin modular bias, criptográficamente seguro</td></tr>
  <tr><td>Comparaciones de secretos</td><td><code>crypto.timingSafeEqual()</code></td><td>Previene timing attacks</td></tr>
  <tr><td>Firma de sesiones</td><td><code>crypto.createHmac('sha256')</code></td><td>Integridad verificable del token</td></tr>
  <tr><td>Tokens de recuperación</td><td><code>crypto.randomBytes(32)</code></td><td>256 bits de entropía, imposible bruteforcear</td></tr>
</table>
<h3>Cloudflare Turnstile</h3>
<p>CAPTCHA de nueva generación que no muestra rompecabezas al usuario. UX superior a reCAPTCHA v2, mejor privacidad que reCAPTCHA v3. Se verifica tanto en registro como en login. Si falla (timeout de red), el registro es bloqueado.</p>
<h3>Have I Been Pwned API (HIBP)</h3>
<p>Base de datos de 800M+ contraseñas filtradas en brechas conocidas. Implementado con k-anonymity: solo se envían los primeros 5 caracteres del SHA-1 de la contraseña al servidor. El servidor de HIBP nunca ve la contraseña completa. <em>Fail open</em>: si HIBP no responde (timeout 3s), el registro procede sin bloquear al usuario.</p>

<h2>5. Algoritmos y Procesos Internos</h2>
<h3>Protección anti-enumeración (Dummy Hash)</h3>
<pre>
// Sin este dummy, la respuesta sin usuario = ~0ms, con usuario = ~250ms
// Un atacante puede enumerar emails midiendo latencia
const DUMMY_HASH = '$2b$12$LkQ8EkRWFJ1Q...'; // nunca coincide
if (!user) await comparePassword(password, DUMMY_HASH);
// → ambos casos tardan ~250ms → imposible distinguir por latencia
</pre>
<h3>Verificación en tiempo constante</h3>
<pre>
crypto.timingSafeEqual(
    Buffer.from(inputHash,    'hex'),
    Buffer.from(expectedHash, 'hex')
)
// El tiempo de comparación es O(n) constante, independientemente de dónde divergen
</pre>

<h2>6. Seguridad</h2>
<table>
  <tr><th>Vector de Ataque</th><th>Protección Implementada</th><th>Evaluación</th></tr>
  <tr><td>Enumeración de usuarios</td><td>Respuesta genérica + dummy bcrypt</td><td class="excellent">Excelente</td></tr>
  <tr><td>Fuerza bruta login</td><td>5 intentos → bloqueo 15min</td><td class="good">Bueno</td></tr>
  <tr><td>Fuerza bruta OTP</td><td>5 intentos → invalidación del código</td><td class="good">Bueno</td></tr>
  <tr><td>Timing attacks</td><td>timingSafeEqual en todas las comparaciones</td><td class="excellent">Excelente</td></tr>
  <tr><td>Contraseñas filtradas</td><td>HIBP k-anonymity en registro y reset</td><td class="excellent">Excelente</td></tr>
  <tr><td>Bots automatizados</td><td>Cloudflare Turnstile en register y login</td><td class="good">Bueno</td></tr>
  <tr><td>Sesiones post-cambio de pass</td><td>issuedAt &lt; password_changed_at</td><td class="excellent">Excelente</td></tr>
  <tr><td>Rate limit OTP por usuario</td><td>Máx 3 códigos en 15min</td><td class="good">Bueno</td></tr>
  <tr><td>Tokens de un solo uso</td><td>used=true tras consumo</td><td class="excellent">Excelente</td></tr>
</table>
<div class="alert alert-high">
  <strong>⚠ Problema — Duplicidad de controladores de recuperación:</strong> Existen dos archivos para recuperación: <code>authController.js</code> y <code>authRecoveryController.js</code> con implementaciones diferentes (tabla <code>verification_codes</code> vs tabla <code>password_resets</code>). Si se corrige un bug en uno, el otro permanece vulnerable. Se debe unificar en un solo flujo.
</div>
<div class="alert alert-medium">
  <strong>⚠ Problema — <code>code_hint</code> de doble uso:</strong> En <code>authRecoveryController.js</code>, el campo <code>code_hint</code> (diseñado para mostrar los 2 primeros dígitos como UX hint) se reutiliza para almacenar el verification token temporal. Semánticamente incorrecto y frágil.
</div>

<h2>7. Escalabilidad</h2>
<p>El sistema de sesiones HMAC stateless escala horizontalmente sin estado compartido: cualquier instancia puede verificar cualquier token. El bottleneck está en la consulta a Supabase para verificar <code>password_changed_at</code> en cada petición autenticada. Con 10,000 usuarios activos simultáneos, esto implica 10,000 queries/segundo solo para autenticación. Solución: caché Redis con TTL de 5 minutos.</p>

<h2>8. Mejoras Futuras</h2>
<table>
  <tr><th>Horizonte</th><th>Mejora</th><th>Impacto</th><th>Complejidad</th></tr>
  <tr><td>Corto plazo</td><td>Unificar controladores de recuperación</td><td>Elimina divergencia de bugs</td><td>Baja</td></tr>
  <tr><td>Corto plazo</td><td>Usar req.userId del middleware en lugar de body</td><td>Elimina IDOR potencial</td><td>Baja</td></tr>
  <tr><td>Mediano plazo</td><td>Caché Redis de password_changed_at</td><td>-N queries por request autenticado</td><td>Media</td></tr>
  <tr><td>Mediano plazo</td><td>Refresh tokens + access tokens de corta duración</td><td>Reduce ventana de tokens robados</td><td>Media</td></tr>
  <tr><td>Largo plazo</td><td>MFA opcional (TOTP/Google Authenticator)</td><td>Segunda capa de seguridad</td><td>Alta</td></tr>
  <tr><td>Largo plazo</td><td>OAuth2 social login (Google, GitHub)</td><td>Reducción de fricción en registro</td><td>Alta</td></tr>
</table>

<h2>9. Diagrama de Flujo — Login</h2>
<pre>
Cliente
  │
  ├─ POST /api/auth/login {email, password, turnstileToken}
  │
  ▼
[1] Turnstile verify ──✗──→ 400 Bot detectado
  │ ✓
  ▼
[2] SELECT user BY email
  │
  ├─ not found ──→ bcrypt(password, DUMMY_HASH) ~250ms ──→ 401 Credenciales incorrectas
  │
  ├─ locked_until activo ──→ 429 Cuenta bloqueada X minutos
  │
  ▼
[3] bcrypt.compare(password, hash) ~250ms
  │
  ├─ FAIL → attempts++ → si ≥5: locked_until = now+15min → 401
  │
  ▼
[4] email_verified? ──✗──→ 403 Verifica tu correo (userId en respuesta)
  │ ✓
  ▼
[5] Notificar nuevo IP (async background, no bloquea)
  │
[6] Reset failed_attempts, actualizar last_login_at/ip/ua
  │
[7] createSessionToken(userId) → HMAC firmado, TTL 7 días
  │
[8] 200 OK { sessionToken, user: {id,nombre,level,coins,wood,foto,role} }
</pre>

<h2>10. Evaluación Profesional — Módulo 2</h2>
<table>
  <tr><th>Criterio</th><th>Calificación</th><th>Justificación</th></tr>
  <tr><td>Arquitectura</td><td class="score">7/10</td><td>Duplicidad de controladores resta cohesión</td></tr>
  <tr><td>Seguridad</td><td class="score-high">9/10</td><td>Timing-safe, HIBP, Turnstile, dummy hash, bloqueo temporal: nivel profesional</td></tr>
  <tr><td>Escalabilidad</td><td class="score">6/10</td><td>Query por request a Supabase para verificar password_changed_at</td></tr>
  <tr><td>UX/UI</td><td class="score">7/10</td><td>Mensajes claros y accionables; falta countdown del código OTP</td></tr>
  <tr><td>Mantenibilidad</td><td class="score">6/10</td><td>Duplicidad y code_hint de doble uso son deuda técnica activa</td></tr>
  <tr><td>Rendimiento</td><td class="score">6/10</td><td>bcrypt 250ms es intencional; el query por request no lo es</td></tr>
</table>

<!-- ═══════════════════════════════════════════════════ MÓDULO 3 -->
<div class="page-break"></div>
<div class="module-header mod3">MÓDULO 3 — SISTEMA DE GAMIFICACIÓN Y RETOS</div>
<p class="module-file">Archivos: <code>challengeController.js</code> · <code>ChallengeModel.js</code></p>

<h2>1. Descripción General del Módulo</h2>
<p>Implementa un sistema de 30 retos financieros progresivos activados mediante movimientos financieros reales del usuario. Al completar un reto, el usuario gana "Madera" (recurso in-game). El módulo evalúa el progreso en tiempo real sin estado adicional — computa todo desde los movimientos existentes.</p>
<p><strong>Objetivo:</strong> Conectar el comportamiento financiero real del usuario con recompensas in-game, creando un ciclo de retroalimentación positiva: más control financiero = más recompensas = más engagement.</p>

<h2>2. Lógica de Negocio</h2>
<h3>Sistema de Recompensas</h3>
<table>
  <tr><th>Retos</th><th>Madera</th><th>Tipo</th></tr>
  <tr><td>1 – 5</td><td>+5 🪵</td><td>Básicos (primer movimiento, 5 movimientos totales)</td></tr>
  <tr><td>6 – 20</td><td>+6 🪵</td><td>Intermedios (categorías, ingresos, balance mensual)</td></tr>
  <tr><td>21 – 30</td><td>+9 🪵</td><td>Avanzados (salario, inversiones, balance positivo &gt;$1000)</td></tr>
</table>
<h3>Categorías de Retos Evaluados</h3>
<ul>
  <li>Cantidad total de movimientos (retos 1,2,3,6,7,8,9,10)</li>
  <li>Primer ingreso registrado (reto 4)</li>
  <li>Balance positivo en el mes (retos 5, 26, 27, 28)</li>
  <li>Conteo de ingresos (retos 11, 12, 13 → 3, 5, 10 ingresos)</li>
  <li>Total de ingresos acumulados en el mes (retos 14: $500, 15: $1000)</li>
  <li>Categorías específicas: Renta/Hipoteca, Alimentación, Transporte, Servicios (retos 16-19)</li>
  <li>Diversificación: 5 categorías distintas (reto 20)</li>
  <li>Fuentes de ingreso: Salario, Freelance, Inversiones, 3 fuentes distintas (retos 21-24)</li>
  <li>Mes equilibrado ±$10 (reto 25), Salud, Educación (retos 29-30)</li>
</ul>
<h3>Protección Anti-Doble-Reclamación</h3>
<pre>
// Unique constraint en BD actúa como mutex distribuido
INSERT INTO user_challenges (user_id, challenge_id, claimed) VALUES (...)
// Si ya existe → error 23505 (unique violation)
// Solo si INSERT exitoso → se otorga la recompensa
// Concurrencia de N requests: solo uno tendrá éxito en el INSERT
</pre>

<h2>3. Arquitectura Técnica</h2>
<p><strong>Patrón — Pure Function para cómputo de progreso:</strong></p>
<pre>
computeProgress(movements, monthMovements, challengeId)
  → { current: number, required: number }
</pre>
<p>Esta función no tiene efectos secundarios ni acceso a base de datos. Es 100% testeable en aislamiento con cualquier conjunto de movimientos mock.</p>
<p><strong>Eficiencia de cómputo:</strong> Una sola query carga todos los movimientos del usuario. Toda la lógica de evaluación de los 30 retos se ejecuta en memoria JavaScript en O(n) sobre los movimientos. No hay 30 queries; hay 1 query + 30 iteraciones en RAM.</p>

<h2>4. Algoritmos y Procesos Internos</h2>
<table>
  <tr><th>Tipo de Reto</th><th>Algoritmo</th><th>Complejidad</th></tr>
  <tr><td>Conteo simple</td><td>Array.filter().length</td><td>O(n)</td></tr>
  <tr><td>Suma de montos</td><td>Array.reduce() con parseFloat</td><td>O(n)</td></tr>
  <tr><td>Balance de mes</td><td>reduce sobre monthMovements</td><td>O(m) donde m ≤ n</td></tr>
  <tr><td>Unicidad de categorías</td><td>new Set(movements.map(m→categoria))</td><td>O(n)</td></tr>
  <tr><td>Fuentes de ingreso distintas</td><td>filter(income) + Set(categorias)</td><td>O(n)</td></tr>
</table>
<p><strong>Complejidad total de getAllChallengesProgress:</strong> 1 query Supabase + O(30n) en memoria = O(n) efectivo. Eficiente incluso con miles de movimientos.</p>

<h2>5. Seguridad</h2>
<div class="alert alert-critical">
  <strong>⚠ Vulnerabilidad Crítica — IDOR (Insecure Direct Object Reference):</strong>
  <pre style="margin:0.5rem 0">
const userId = req.params.userId; // ← viene de la URL del cliente
// NO se verifica que req.userId === userId (del middleware requireAuth)
  </pre>
  Un usuario autenticado como usuario A puede consultar o reclamar retos del usuario B enviando el userId de B en la URL/body. La corrección es trivial: usar <code>req.userId</code> (del middleware) en lugar de <code>req.params.userId</code>.
</div>

<h2>6. Posibles Problemas</h2>
<table>
  <tr><th>#</th><th>Problema</th><th>Severidad</th><th>Solución</th></tr>
  <tr><td>1</td><td>IDOR en getChallenges y claimChallenge</td><td class="critical">Crítica</td><td>Usar req.userId del middleware</td></tr>
  <tr><td>2</td><td>Race condition en update de wood (load-modify-save)</td><td class="high">Alta</td><td>UPDATE users SET wood = wood + ? atómico</td></tr>
  <tr><td>3</td><td>Retos basados en mes calendario (injusto a mitad de mes)</td><td class="medium">Media</td><td>Rolling 30 días</td></tr>
  <tr><td>4</td><td>Sin paginación: carga todos los movimientos históricos</td><td class="low">Baja</td><td>Materializar progreso en tabla</td></tr>
  <tr><td>5</td><td>30 retos hardcodeados en código</td><td class="low">Baja</td><td>Tabla challenges dinámica en BD</td></tr>
</table>

<h2>7. Evaluación Profesional — Módulo 3</h2>
<table>
  <tr><th>Criterio</th><th>Calificación</th><th>Justificación</th></tr>
  <tr><td>Arquitectura</td><td class="score-high">8/10</td><td>Pure function, una query, idempotencia via DB constraint</td></tr>
  <tr><td>Seguridad</td><td class="score-low">4/10</td><td>IDOR severo en todos los endpoints del módulo</td></tr>
  <tr><td>Escalabilidad</td><td class="score">7/10</td><td>O(n) en memoria es eficiente; falta materialización para usuarios con muchos movimientos</td></tr>
  <tr><td>UX/UI</td><td class="score-high">8/10</td><td>Progresión bien diseñada, recompensas diferenciadas por dificultad</td></tr>
  <tr><td>Mantenibilidad</td><td class="score">7/10</td><td>30 casos hardcodeados; configuración dinámica mejoraría mantenibilidad</td></tr>
  <tr><td>Rendimiento</td><td class="score-high">8/10</td><td>Una query + O(30n) en RAM es la decisión correcta</td></tr>
</table>

<!-- ═══════════════════════════════════════════════════ MÓDULO 4 -->
<div class="page-break"></div>
<div class="module-header mod4">MÓDULO 4 — SISTEMA DE SOPORTE Y TICKETS</div>
<p class="module-file">Archivos: <code>TicketModel.js</code> · <code>ticketController.js</code> · <code>KbModel.js</code></p>

<h2>1. Descripción General del Módulo</h2>
<p>Implementa un sistema de soporte técnico tipo helpdesk completo: creación de tickets por usuarios, gestión por agentes de soporte, ciclo de vida de estados, mensajería bidireccional, notas internas, SLA tracking, CSAT (Customer Satisfaction Score), base de conocimiento, macros de respuesta y métricas operativas.</p>

<h2>2. Lógica de Negocio</h2>
<h3>Ciclo de Vida de un Ticket</h3>
<pre>
open → in_progress → waiting_user → resolved → closed
         ↑                ↓
         └── (usuario responde) ─────────────────┘
</pre>
<h3>Reglas de Negocio</h3>
<ul>
  <li>Usuarios regulares: máximo <strong>5 tickets por mes</strong></li>
  <li>Roles privilegiados (support/admin): sin límite mensual</li>
  <li>Un ticket cerrado no puede recibir respuestas</li>
  <li>Cuando soporte responde: estado pasa a <code>waiting_user</code></li>
  <li>Cuando el usuario responde en <code>waiting_user</code>: regresa a <code>in_progress</code></li>
  <li>CSAT solo disponible en tickets <code>resolved</code> o <code>closed</code></li>
  <li>Limpieza automática: tickets con más de <strong>30 días</strong> se eliminan junto con imágenes</li>
</ul>
<h3>SLA Configurado</h3>
<table>
  <tr><th>Prioridad</th><th>Tiempo de Respuesta</th><th>Tiempo de Resolución</th></tr>
  <tr><td>🔴 Urgente</td><td>1 hora</td><td>4 horas</td></tr>
  <tr><td>🟠 Alta</td><td>4 horas</td><td>24 horas</td></tr>
  <tr><td>🟡 Media</td><td>24 horas</td><td>72 horas</td></tr>
  <tr><td>🟢 Baja</td><td>72 horas</td><td>168 horas (7 días)</td></tr>
</table>

<h2>3. Arquitectura Técnica</h2>
<p><strong>Patrón:</strong> Active Record (<code>TicketModel</code> como clase estática) + Service Layer (<code>ticketController</code>).</p>
<p><strong>Audit Trail:</strong> Cada acción relevante (creación, cambio de estado, asignación, mensajes) genera un registro en <code>ticket_events</code>. Permite un historial completo e inmutable de quién hizo qué y cuándo.</p>
<h3>Sistema de Almacenamiento de Imágenes — Fallback Triple</h3>
<pre>
Intento 1: Supabase Storage (URLs permanentes, preferido)
    ↓ si falla
Intento 2: Disco local del servidor (⚠ efímero en Render)
    ↓ si falla
Imagen no disponible (log de error detallado)

Proxy /api/tickets/image/:filename:
    → Intento 1: Signed URL redirect a Supabase (TTL 1h)
    → Intento 2: Download proxy directo desde Supabase
    → Intento 3: Disco local
    → 404 con diagnóstico
</pre>

<h2>4. Seguridad</h2>
<div class="alert alert-critical">
  <strong>⚠ Vulnerabilidad Crítica — Módulo de tickets NO verifica sessionToken:</strong>
  <pre style="margin:0.5rem 0">
// middleware PROPIO del módulo de tickets:
export async function requireAuth(req, res, next) {
    const userId = req.query.userId || req.body?.userId; // ← del CLIENTE
    const user = await User.findById(userId);            // ← confianza ciega
    // NO verifica firma del sessionToken
}
  </pre>
  Cualquier request puede falsear su identidad enviando un <code>userId</code> diferente en el body o query. La corrección es usar el middleware global <code>requireAuth</code> que verifica el HMAC del sessionToken. Este es el problema de seguridad más grave del proyecto.
</div>
<p><strong>Controles correctos implementados:</strong></p>
<ul>
  <li>Validación de UUID en parámetros de ticket (<code>/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i</code>) → previene path traversal</li>
  <li>Validación de filename en proxy de imágenes (<code>/^[a-zA-Z0-9._-]+$/</code>) → previene path traversal</li>
  <li>Verificación de propiedad del ticket antes de cada acción (<code>ticket.user_id !== userId</code>)</li>
  <li>Límite mensual de 5 tickets por usuario regular</li>
  <li>Validación de longitud de mensajes (2-2000 caracteres)</li>
</ul>

<h2>5. Rendimiento</h2>
<ul>
  <li>Queries con JOIN via Supabase syntax → evita N+1 queries en listados</li>
  <li><code>getMetrics()</code> carga <strong>todos</strong> los tickets sin filtro temporal → puede ser lento con historial grande</li>
  <li><code>trackFaqView</code> usa SELECT + UPDATE/INSERT no atómico → race condition en alta concurrencia. Solución: <code>INSERT ON CONFLICT DO UPDATE</code></li>
</ul>

<h2>6. Diagrama de Ciclo de Vida</h2>
<pre>
Usuario                  Sistema                      Agente Soporte
   │                        │                               │
   ├─ POST /tickets ────────▶│── createTicket(SLA deadlines) │
   │                        │── ticket_events: "created"    │
   │◀─ 201 ticket ──────────│                               │
   │                        │                               │
   │                        │◀── GET /admin/tickets ────────│
   │                        │◀── PATCH /take/:id ───────────│
   │                        │─── assignTicket() → in_progress▶│
   │                        │                               │
   │                        │◀── POST /support-reply/:id ───│
   │                        │─── addMessage(role=support) ───▶│
   │                        │─── markUserUnread() ───────────▶│
   │                        │─── sendTicketReplyEmail() ─────▶│
   │◀─ email notificación ──│                               │
   │                        │                               │
   ├─ POST /reply/:id ──────▶│── addMessage(role=user) ──────│
   │                        │── waiting_user → in_progress  │
   │                        │                               │
   ├─ POST /csat/:id ───────▶│── submitCsat(rating 1-5) ─────│
   │◀─ 201 OK ──────────────│                               │
</pre>

<h2>7. Evaluación Profesional — Módulo 4</h2>
<table>
  <tr><th>Criterio</th><th>Calificación</th><th>Justificación</th></tr>
  <tr><td>Arquitectura</td><td class="score-high">8/10</td><td>Active Record + Service Layer, audit trail completo, SLA tracking</td></tr>
  <tr><td>Seguridad</td><td class="score-low">3/10</td><td>Middleware propio que no verifica sessionToken es vulnerabilidad crítica</td></tr>
  <tr><td>Escalabilidad</td><td class="score">6/10</td><td>Sin WebSockets; getMetrics sin límite temporal</td></tr>
  <tr><td>UX/UI</td><td class="score-high">8/10</td><td>CSAT, unread count, email notifications, Base de Conocimiento, Macros</td></tr>
  <tr><td>Mantenibilidad</td><td class="score">7/10</td><td>Bien organizado, constantes bien nombradas, separación clara</td></tr>
  <tr><td>Rendimiento</td><td class="score">6/10</td><td>JOIN queries correctos; getMetrics sin filtro temporal es el bottleneck</td></tr>
</table>

<!-- ═══════════════════════════════════════════════════ MÓDULO 5 -->
<div class="page-break"></div>
<div class="module-header mod5">MÓDULO 5 — SIMULADOR DE INVERSIONES</div>
<p class="module-file">Archivos: <code>inversionController.js</code> · <code>InversionModel.js</code> · <code>marketDataService.js</code> · <code>MarketDataModel.js</code></p>

<h2>1. Descripción General del Módulo</h2>
<p>Permite a los usuarios simular proyecciones de inversión a largo plazo con instrumentos financieros parametrizados (S&amp;P 500, acciones tech, Bitcoin, Ethereum), con datos de mercado actualizables via Alpha Vantage API. Soporta múltiples simulaciones guardadas, configuración personalizada de inflación y un fallback estático cuando la API de mercado no está disponible.</p>
<p><strong>Objetivo:</strong> Hacer tangible el concepto de interés compuesto — un usuario puede visualizar cuánto crecerían $1,000 en 10 años al 8% anual vs. 2% en una cuenta de ahorro.</p>

<h2>2. Lógica de Negocio</h2>
<h3>Parámetros de Simulación</h3>
<table>
  <tr><th>Parámetro</th><th>Rango</th><th>Fuente</th></tr>
  <tr><td>Capital inicial</td><td>&gt; 0</td><td>Usuario</td></tr>
  <tr><td>Aportación periódica</td><td>≥ 0</td><td>Usuario</td></tr>
  <tr><td>Tasa de rendimiento anual</td><td>Mercado o personalizada</td><td>Alpha Vantage / estática</td></tr>
  <tr><td>Horizonte temporal</td><td>1-50 años</td><td>Usuario</td></tr>
  <tr><td>Tasa de inflación</td><td>0-25%</td><td>Usuario (personalizable)</td></tr>
  <tr><td>Instrumentos (mix)</td><td>S&amp;P500, Tech, BTC, ETH</td><td>Alpha Vantage / estático</td></tr>
</table>
<h3>Fórmula de Interés Compuesto</h3>
<pre>
VF = CI × (1+r)^n + A × [((1+r)^n - 1) / r]

Donde:
  CI = Capital inicial
  r  = Tasa periódica (anual / 12 para mensual)
  n  = Número de períodos
  A  = Aportación periódica

Ajuste por inflación:
  VF_real = VF / (1 + i)^n
  Donde i = tasa de inflación personalizada
</pre>
<h3>Estrategia de Datos de Mercado</h3>
<pre>
Alpha Vantage API (5 req/min, 500/día en free tier)
  ├─ sp500   → retorno histórico S&amp;P 500
  ├─ tech    → retorno histórico NASDAQ
  ├─ bitcoin → retorno + volatilidad histórica
  └─ ethereum→ retorno + volatilidad histórica
      │
      ▼ Si API no disponible o tabla no existe:
  Fallback estático en instrumentos.js (parámetros hardcodeados)
  → ensureStaticParams() lo inserta si la tabla está vacía
</pre>

<h2>3. Arquitectura Técnica</h2>
<p><strong>Patrón:</strong> Service Layer separado (<code>marketDataService.js</code>) para obtención y normalización de datos de mercado. El controlador delega al service; el service delega al model. Tres capas claras con responsabilidades definidas.</p>
<p><strong>Fire-and-forget en refresh de mercado:</strong></p>
<pre>
// Responde inmediatamente (evita timeout de 45s en Render free tier)
res.json({ success: true, message: 'Actualización iniciada...' });
// Ejecuta en background sin bloquear la respuesta
refreshApiInstruments().catch(err => console.error(...));
</pre>
<p>Patrón correcto para operaciones largas en free tier donde el timeout HTTP es ~45 segundos.</p>
<p><strong>ensureStaticParams():</strong> Función idempotente que inserta parámetros estáticos en la tabla solo si está vacía. Puede llamarse múltiples veces sin efectos secundarios — patrón "ensure/upsert" correcto para inicialización.</p>

<h2>4. Evaluación Profesional — Módulo 5</h2>
<table>
  <tr><th>Criterio</th><th>Calificación</th><th>Justificación</th></tr>
  <tr><td>Arquitectura</td><td class="score-high">8/10</td><td>Service Layer bien separado, fallback gracioso, fire-and-forget correcto</td></tr>
  <tr><td>Seguridad</td><td class="score">7/10</td><td>Validaciones de rango correctas; faltan disclaimers financieros legales</td></tr>
  <tr><td>Escalabilidad</td><td class="score">6/10</td><td>Alpha Vantage free tier (500 req/día) es el cuello de botella en producción</td></tr>
  <tr><td>UX/UI</td><td class="score">7/10</td><td>Múltiples simulaciones guardadas es excelente; falta visualización gráfica de curva</td></tr>
  <tr><td>Mantenibilidad</td><td class="score-high">8/10</td><td>Service Layer facilita cambio de proveedor de datos sin tocar el controlador</td></tr>
  <tr><td>Rendimiento</td><td class="score">7/10</td><td>Fire-and-forget correcto; stale indicator permite al frontend manejar datos desactualizados</td></tr>
</table>

<!-- ═══════════════════════════════════════════════════ MÓDULO 6 -->
<div class="page-break"></div>
<div class="module-header mod6">MÓDULO 6 — DASHBOARD FINANCIERO</div>
<p class="module-file">Archivos: <code>dashboardController.js</code> · <code>movementController.js</code></p>

<h2>1. Descripción General del Módulo</h2>
<p>Proporciona al usuario un panel de control de sus finanzas personales: registro de ingresos y egresos, configuración de presupuesto mensual con tres metodologías de ahorro, y visualización de balance. Es el núcleo funcional de la aplicación — sin movimientos registrados, los retos no avanzan y el simulador no tiene datos reales.</p>

<h2>2. Lógica de Negocio</h2>
<h3>Tres Metodologías de Ahorro</h3>
<table>
  <tr><th>Método</th><th>Lógica</th><th>Caso de Uso</th></tr>
  <tr><td><code>automatic_50_30_20</code></td><td>50% necesidades, 30% deseos, 20% ahorro</td><td>Usuario sin experiencia financiera (regla de Elizabeth Warren)</td></tr>
  <tr><td><code>percentage</code></td><td>El usuario define un % de su ingreso como ahorro</td><td>Usuario con ingreso variable</td></tr>
  <tr><td><code>manual</code></td><td>El usuario define un monto fijo de ahorro mensual</td><td>Usuario con ingreso fijo y meta específica</td></tr>
</table>
<h3>Validaciones del Dashboard</h3>
<ul>
  <li>Valores monetarios: 0 a 99,999,999 (8 dígitos máximo)</li>
  <li>Porcentaje de ahorro: 0 a 100</li>
  <li>Monto de ahorro manual ≤ ingreso fijo mensual</li>
  <li><code>meta_nombre</code>: máximo 100 caracteres (sanitizado con <code>.trim()</code>)</li>
</ul>
<h3>Autorización Correcta</h3>
<pre>
// A diferencia del módulo de retos, aquí SÍ se verifica:
if (Number(userId) !== req.userId) {
    return res.status(403).json({ success: false, message: 'Acceso denegado.' });
}
// req.userId viene del middleware requireAuth (verifica HMAC)
// userId viene del parámetro de URL
// La comparación garantiza que solo puedes ver/editar TU dashboard
</pre>
<h3>Upsert Atómico</h3>
<pre>
.upsert({ user_id: userId, ...data }, { onConflict: 'user_id' })
// Crea el registro si no existe, actualiza si ya existe
// Sin SELECT previo, sin race condition, una sola operación
</pre>

<h2>3. Evaluación Profesional — Módulo 6</h2>
<table>
  <tr><th>Criterio</th><th>Calificación</th><th>Justificación</th></tr>
  <tr><td>Arquitectura</td><td class="score">7/10</td><td>Controlador simple y directo; validación podría extraerse a middleware</td></tr>
  <tr><td>Seguridad</td><td class="score-high">8/10</td><td>Autorización correcta, validaciones de rango, sanitización de strings</td></tr>
  <tr><td>Escalabilidad</td><td class="score-high">8/10</td><td>Upsert sin race conditions; consultas indexadas por user_id</td></tr>
  <tr><td>UX/UI</td><td class="score-high">8/10</td><td>Tres métodos de ahorro cubren distintos perfiles financieros</td></tr>
  <tr><td>Mantenibilidad</td><td class="score-high">8/10</td><td>Código explícito, validaciones documentadas, constantes bien nombradas</td></tr>
  <tr><td>Rendimiento</td><td class="score-high">9/10</td><td>Una query por operación, upsert atómico, sin N+1</td></tr>
</table>

<!-- ═══════════════════════════════════════════════════ EVALUACIÓN GLOBAL -->
<div class="page-break"></div>
<div class="module-header" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">EVALUACIÓN GLOBAL DEL PROYECTO</div>

<h2>Resumen de Puntuaciones por Módulo</h2>
<table>
  <tr>
    <th>Módulo</th>
    <th>Arquitectura</th>
    <th>Seguridad</th>
    <th>Escalabilidad</th>
    <th>UX/UI</th>
    <th>Mantenibilidad</th>
    <th>Rendimiento</th>
    <th>Promedio</th>
  </tr>
  <tr>
    <td>1. Servidor Principal</td>
    <td>7</td><td>7</td><td>5</td><td>—</td><td>8</td><td>5</td><td>6.4</td>
  </tr>
  <tr>
    <td>2. Autenticación</td>
    <td>7</td><td class="score-high">9</td><td>6</td><td>7</td><td>6</td><td>6</td><td>6.8</td>
  </tr>
  <tr>
    <td>3. Gamificación/Retos</td>
    <td class="score-high">8</td><td class="score-low">4</td><td>7</td><td class="score-high">8</td><td>7</td><td class="score-high">8</td><td>7.0</td>
  </tr>
  <tr>
    <td>4. Sistema de Tickets</td>
    <td class="score-high">8</td><td class="score-low">3</td><td>6</td><td class="score-high">8</td><td>7</td><td>6</td><td>6.3</td>
  </tr>
  <tr>
    <td>5. Simulador Inversiones</td>
    <td class="score-high">8</td><td>7</td><td>6</td><td>7</td><td class="score-high">8</td><td>7</td><td>7.2</td>
  </tr>
  <tr>
    <td>6. Dashboard Financiero</td>
    <td>7</td><td class="score-high">8</td><td class="score-high">8</td><td class="score-high">8</td><td class="score-high">8</td><td class="score-high">9</td><td>8.0</td>
  </tr>
  <tr style="font-weight:bold; background:#f8f9fa">
    <td>PROMEDIO GLOBAL</td>
    <td>7.5</td><td>6.3</td><td>6.3</td><td>7.6</td><td>7.3</td><td>6.8</td><td><strong>6.9</strong></td>
  </tr>
</table>

<h2>Hallazgos Críticos de Seguridad — Ordenados por Severidad</h2>
<table>
  <tr><th>#</th><th>Hallazgo</th><th>Severidad</th><th>Módulo</th><th>Corrección</th></tr>
  <tr>
    <td>1</td>
    <td>.env con secretos reales en texto plano (service_role_key, API keys)</td>
    <td class="critical">CRÍTICA</td>
    <td>Global</td>
    <td>Rotar TODAS las claves inmediatamente</td>
  </tr>
  <tr>
    <td>2</td>
    <td>Módulo de tickets no verifica sessionToken (usa userId del body)</td>
    <td class="critical">CRÍTICA</td>
    <td>Tickets</td>
    <td>Usar middleware requireAuth principal con HMAC</td>
  </tr>
  <tr>
    <td>3</td>
    <td>IDOR en endpoints de retos (userId viene de URL, no del token)</td>
    <td class="high">ALTA</td>
    <td>Retos</td>
    <td>Usar req.userId del middleware en lugar de req.params.userId</td>
  </tr>
  <tr>
    <td>4</td>
    <td>Race condition en update de wood (load-modify-save)</td>
    <td class="medium">MEDIA</td>
    <td>Retos</td>
    <td>UPDATE users SET wood = wood + ? WHERE id = ? (SQL atómico)</td>
  </tr>
  <tr>
    <td>5</td>
    <td>Duplicidad de controladores de recuperación (2 implementaciones divergentes)</td>
    <td class="medium">MEDIA</td>
    <td>Auth</td>
    <td>Unificar en un solo controlador coherente</td>
  </tr>
  <tr>
    <td>6</td>
    <td>Rate limiter sin Redis (contadores se pierden al reiniciar)</td>
    <td class="medium">MEDIA</td>
    <td>Servidor</td>
    <td>Implementar Redis/Upstash para contadores persistentes</td>
  </tr>
  <tr>
    <td>7</td>
    <td>Admin inicial con contraseña en texto plano en script SQL</td>
    <td class="medium">MEDIA</td>
    <td>Auth</td>
    <td>Usar crear-admin.js que ya existe (bcrypt correcto)</td>
  </tr>
  <tr>
    <td>8</td>
    <td>code_hint reutilizado semánticamente para verification token</td>
    <td class="low">BAJA</td>
    <td>Auth</td>
    <td>Campo dedicado para almacenar el verification token</td>
  </tr>
</table>

<h2>Diagrama de Arquitectura General</h2>
<pre>
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENTE                                     │
│           Browser (HTML/CSS/Vanilla JS + Fetch API)                  │
│                  Android APK (GitHub Releases)                       │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────────────┐
│                    EXPRESS 5 SERVER (Render Free)                     │
│  ┌───────────┐ ┌──────────┐ ┌────────────────────────────────────┐  │
│  │  Helmet   │ │   CORS   │ │          Rate Limiter               │  │
│  │ CSP/HSTS  │ │whitelist │ │ global:300/15min │ auth:20/15min   │  │
│  └───────────┘ └──────────┘ └────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                      15 ROUTERS API                               ││
│  │  auth · recovery · users · movements · skin · dashboard          ││
│  │  game · challenges · admin · adminPlatform · inversions          ││
│  │  progress · tickets · recommendations · app                      ││
│  └──────────────────────────────────────────────────────────────────┘│
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐ │
│  │ Controllers  │ │   Models     │ │          Utils               │ │
│  │ (15 archivos)│ │ (8 archivos) │ │ security.js · emailService  │ │
│  └──────┬───────┘ └──────┬───────┘ │ turnstile.js · upload.js    │ │
│         │                │         └──────────────────────────────┘ │
└─────────┼────────────────┼───────────────────────────────────────────┘
          │                │
┌─────────▼────────────────▼───────────────────────────────────────────┐
│                          SUPABASE                                     │
│            (PostgreSQL + RLS + Auth + Storage)                       │
│                                                                       │
│  Tables: users · movements · challenges · support_tickets            │
│          flashcards · quiz_questions · skins · inversions            │
│          dashboard_fixed · verification_codes · password_resets      │
│          ticket_messages · ticket_events · ticket_csat               │
│          faq_views · kb_articles · market_parameters                 │
│                                                                       │
│  Storage Buckets: tickets (imágenes adjuntas de soporte)             │
└────────────────────────────────────┬─────────────────────────────────┘
                                     │
             ┌───────────────────────┼──────────────────────┐
             │                       │                       │
  ┌──────────▼──────────┐ ┌──────────▼──────────┐ ┌────────▼───────────┐
  │ Cloudflare Turnstile│ │  Alpha Vantage API  │ │   Resend / Brevo   │
  │ (anti-bot CAPTCHA)  │ │  (market data)      │ │ (email transaccional│
  └─────────────────────┘ └─────────────────────┘ └────────────────────┘
</pre>

<!-- CONCLUSIÓN EJECUTIVA -->
<div class="page-break"></div>
<div class="module-header" style="background: linear-gradient(135deg, #0f3460 0%, #533483 100%);">CONCLUSIÓN EJECUTIVA FINAL</div>

<h2>Para Inversionistas</h2>
<p>Too-Easy es un producto educativo con un enfoque diferenciado: la combinación de finanzas personales reales (registro de movimientos, simulador de inversiones con datos de mercado reales) con gamificación profunda (30 retos, sistema de monedas, desbloqueo de skins) aborda un mercado desatendido — jóvenes latinoamericanos que nunca recibieron educación financiera formal. El stack tecnológico es moderno, los costos operativos actuales son mínimos (Supabase + Render free tier) y el producto está funcional y desplegado. <strong>Antes de una ronda de inversión se deben corregir dos vulnerabilidades críticas de seguridad</strong> (exposición de secretos de API y autenticación deficiente en módulo de tickets) y migrar a planes de pago para SLA de producción garantizado.</p>

<h2>Para Profesores Universitarios</h2>
<p>El proyecto demuestra una madurez técnica notablemente superior al promedio universitario. Los puntos técnicamente destacables incluyen: implementación de HIBP con k-anonymity, uso correcto de <code>crypto.timingSafeEqual()</code> en todas las comparaciones de secretos, tokens HMAC firmados con invalidación automática post-cambio de contraseña, dummy hash anti-timing-attack, SLA tracking en el sistema de soporte, y arquitectura modular con separación clara en capas. Las debilidades identificadas (IDOR, duplicidad de controladores, rate limiting sin persistencia) son exactamente el tipo de deuda técnica que surge en equipos que priorizan velocidad de entrega — un trade-off real que los alumnos encontrarán y deberán gestionar en sus carreras profesionales. <strong>Calificación sugerida: 9/10.</strong></p>

<h2>Para Clientes Empresariales</h2>
<p>La plataforma está funcional y desplegada en producción. Las características de soporte (helpdesk con SLA, CSAT, base de conocimiento, notas internas, macros de respuesta, audit trail) y las de educación financiera (flashcards, quizzes, 30 retos progresivos, simulador de inversiones multi-instrumento) superan las expectativas para un producto en esta etapa. Para uso empresarial se requiere: (1) corrección de las dos vulnerabilidades críticas de seguridad, (2) migración a infraestructura de pago con SLA garantizado, (3) implementación de Redis para rate limiting efectivo, y (4) pruebas de carga para validar comportamiento bajo tráfico concurrente.</p>

<h2>Para el Equipo Técnico</h2>
<p>Han construido algo genuinamente sólido. El módulo de autenticación — con HIBP, Turnstile, dummy hash anti-enumeración, timing-safe comparisons y tokens HMAC stateless — es código que pasaría revisión de seguridad en equipos de nivel medio-alto de la industria. El simulador de inversiones con Service Layer separado y fallback gracioso demuestra pensamiento de arquitecto. El sistema de tickets con SLA, CSAT y audit trail va más allá de lo que se espera en un proyecto académico.</p>
<p><strong>Los tres elementos que deben priorizarse antes de cualquier lanzamiento público:</strong></p>
<ol>
  <li><strong>Rotar todas las claves del .env</strong> — están potencialmente expuestas en el historial de git</li>
  <li><strong>Corregir el middleware de autenticación en ticketController.js</strong> — usar el requireAuth principal con verificación HMAC</li>
  <li><strong>Corregir el IDOR en challengeController.js</strong> — usar req.userId del middleware en lugar de req.params.userId</li>
</ol>
<p>El resto de las mejoras son optimizaciones que pueden implementarse iterativamente sin riesgo inmediato para la seguridad del sistema.</p>

<div style="margin-top:3rem; padding:1.5rem; border-top: 2px solid #dee2e6; color:#6c757d; font-size:0.85rem; text-align:center">
  <p>Documento generado por revisión técnica asistida por IA · Claude Sonnet 4.6 · 14 de junio de 2026</p>
  <p>Basado en análisis estático del código fuente. No incluye análisis dinámico, pruebas de penetración activas ni revisión de infraestructura de producción.</p>
  <p>Proyecto: TOO-EASY · Grupo 5IV8 · Repositorio: https://github.com/leonardo160308/preuba</p>
</div>
`;

const CSS = `
  @page { margin: 15mm 20mm; size: A4; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #212529;
    max-width: 100%;
  }
  h1 {
    font-size: 24pt;
    color: #0f3460;
    text-align: center;
    margin-top: 1rem;
    margin-bottom: 0.3rem;
    border-bottom: 3px solid #0f3460;
    padding-bottom: 0.5rem;
  }
  h2 { font-size: 13pt; color: #16213e; margin-top: 1.2rem; margin-bottom: 0.4rem; border-left: 4px solid #0f3460; padding-left: 0.6rem; }
  h3 { font-size: 11pt; color: #1a1a2e; margin-top: 0.8rem; margin-bottom: 0.3rem; font-style: italic; }
  p { margin: 0.4rem 0; }
  .subtitle { text-align: center; color: #6c757d; font-size: 10pt; margin: 0.1rem 0; }
  .module-header {
    font-size: 16pt;
    font-weight: bold;
    color: #fff;
    background: linear-gradient(135deg, #0f3460 0%, #533483 100%);
    padding: 1rem 1.5rem;
    border-radius: 6px;
    margin: 1.5rem 0 1rem 0;
    letter-spacing: 0.5px;
  }
  .mod1 { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }
  .mod2 { background: linear-gradient(135deg, #0f3460 0%, #155a8a 100%); }
  .mod3 { background: linear-gradient(135deg, #155a8a 0%, #1a7431 100%); }
  .mod4 { background: linear-gradient(135deg, #533483 0%, #7b2d8b 100%); }
  .mod5 { background: linear-gradient(135deg, #b8400e 0%, #d4711e 100%); }
  .mod6 { background: linear-gradient(135deg, #1a7431 0%, #2e8b57 100%); }
  .module-file { color: #6c757d; font-size: 9pt; margin-top: -0.5rem; margin-bottom: 0.8rem; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.7rem 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  th {
    background: #0f3460;
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
  }
  td { padding: 5px 8px; border-bottom: 1px solid #dee2e6; vertical-align: top; }
  tr:nth-child(even) td { background: #f8f9fa; }
  pre {
    background: #1a1a2e;
    color: #e8e8e8;
    padding: 0.8rem 1rem;
    border-radius: 4px;
    font-size: 8.5pt;
    font-family: 'Consolas', 'Courier New', monospace;
    overflow-x: auto;
    white-space: pre;
    margin: 0.5rem 0;
    page-break-inside: avoid;
  }
  code {
    background: #e9ecef;
    color: #c0392b;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
  }
  pre code { background: none; color: inherit; padding: 0; }
  ul, ol { margin: 0.3rem 0; padding-left: 1.5rem; }
  li { margin: 0.2rem 0; }
  .alert {
    border-radius: 4px;
    padding: 0.7rem 1rem;
    margin: 0.7rem 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  .alert-critical { background: #fdecea; border-left: 5px solid #c0392b; color: #7b1e1e; }
  .alert-high     { background: #fef3e2; border-left: 5px solid #e67e22; color: #7b4e1e; }
  .alert-medium   { background: #fffde7; border-left: 5px solid #f39c12; color: #7b6e1e; }
  .good      { color: #1a7431; font-weight: 600; }
  .excellent { color: #0f3460; font-weight: 600; }
  .warn      { color: #e67e22; font-weight: 600; }
  .score      { font-weight: 700; color: #e67e22; }
  .score-high { font-weight: 700; color: #1a7431; }
  .score-low  { font-weight: 700; color: #c0392b; }
  .critical { color: #c0392b; font-weight: 700; }
  .high     { color: #e67e22; font-weight: 700; }
  .medium   { color: #f39c12; font-weight: 700; }
  .low      { color: #7f8c8d; font-weight: 700; }
  .resumen-box {
    background: #f0f4ff;
    border: 1px solid #b3c6f7;
    border-radius: 6px;
    padding: 1rem 1.2rem;
    margin: 1rem 0;
  }
  .page-break { page-break-before: always; }
  @media print {
    .page-break { page-break-before: always; }
    pre { white-space: pre-wrap; word-break: break-word; }
  }
`;

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentación Técnica — TOO-EASY</title>
  <style>${CSS}</style>
</head>
<body>
${DOC}
</body>
</html>`;

const htmlPath = path.join(__dirname, 'TOO-EASY-Documentacion-Tecnica.html');
const pdfPath  = path.join(__dirname, 'TOO-EASY-Documentacion-Tecnica.pdf');

fs.writeFileSync(htmlPath, HTML, 'utf8');
console.log(`✅ HTML generado: ${htmlPath}`);

// Convertir a PDF usando Edge en modo headless
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
try {
    execSync(
        `"${edge}" --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" --print-to-pdf-no-header "${htmlPath}"`,
        { timeout: 60000, stdio: 'pipe' }
    );
    console.log(`✅ PDF generado: ${pdfPath}`);
} catch (e) {
    console.error('Edge PDF generation error:', e.message);
    console.log('ℹ️  Abre el HTML en tu navegador y usa Ctrl+P → Guardar como PDF');
}

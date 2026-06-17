// generar-estudio-auth.js
// Genera el documento de estudio de autenticación como HTML y PDF
// Ejecuta: node generar-estudio-auth.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10.5pt;
    color: #1a1a2e;
    background: #fff;
    padding: 2cm 2.2cm;
    line-height: 1.6;
  }
  h1 {
    font-size: 22pt;
    font-weight: 900;
    color: #2C405B;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .portada {
    text-align: center;
    padding: 60px 0 40px;
    border-bottom: 3px solid #2C405B;
    margin-bottom: 30px;
  }
  .portada .titulo-app {
    font-size: 36pt;
    font-weight: 900;
    color: #2C405B;
    letter-spacing: 4px;
  }
  .portada .titulo-doc {
    font-size: 16pt;
    color: #B6823E;
    font-weight: 700;
    margin: 8px 0 4px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .portada .subtitulo {
    font-size: 10pt;
    color: #718096;
    margin-top: 10px;
  }
  .portada .badge {
    display: inline-block;
    background: #2C405B;
    color: #fff;
    font-size: 9pt;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 20px;
    margin: 4px 4px;
    letter-spacing: 1px;
  }
  .portada .badges { margin-top: 18px; }
  h2 {
    font-size: 14pt;
    font-weight: 800;
    color: #2C405B;
    margin: 22px 0 8px;
    padding-bottom: 4px;
    border-bottom: 2px solid #e2e8f0;
  }
  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #B6823E;
    margin: 14px 0 6px;
  }
  p { margin: 6px 0 10px; color: #2d3748; }
  .seccion-header {
    background: linear-gradient(135deg, #2C405B 0%, #3d5a80 100%);
    color: #fff;
    font-size: 13pt;
    font-weight: 800;
    padding: 10px 18px;
    border-radius: 6px;
    margin: 28px 0 14px;
    letter-spacing: 1px;
    page-break-after: avoid;
  }
  .seccion-num {
    background: #B6823E;
    color: #fff;
    font-size: 10pt;
    font-weight: 900;
    padding: 2px 10px;
    border-radius: 12px;
    margin-right: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th {
    background: #2C405B;
    color: #fff;
    font-weight: 700;
    padding: 8px 10px;
    text-align: left;
    font-size: 9pt;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    color: #2d3748;
  }
  tr:nth-child(even) td { background: #f7fafc; }
  pre {
    background: #1a1a2e;
    color: #e8e8e8;
    padding: 12px 14px;
    border-radius: 6px;
    font-size: 8.5pt;
    font-family: 'Consolas', 'Courier New', monospace;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 8px 0 12px;
    page-break-inside: avoid;
    border-left: 4px solid #B6823E;
  }
  code {
    background: #edf2f7;
    color: #c0392b;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
  }
  pre code { background: none; color: inherit; padding: 0; }
  ul, ol { margin: 6px 0 10px; padding-left: 1.6rem; }
  li { margin: 3px 0; color: #2d3748; }
  .highlight-box {
    background: #f0f7ff;
    border: 1px solid #b3c6f7;
    border-left: 5px solid #2C405B;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 10px 0;
    page-break-inside: avoid;
  }
  .warn-box {
    background: #fff8f0;
    border-left: 5px solid #B6823E;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 10px 0;
    page-break-inside: avoid;
  }
  .pregunta {
    background: #f0f4f8;
    border-radius: 6px;
    padding: 12px 14px;
    margin: 10px 0;
    page-break-inside: avoid;
  }
  .pregunta .q {
    font-weight: 800;
    color: #2C405B;
    font-size: 10.5pt;
    margin-bottom: 6px;
  }
  .pregunta .a {
    color: #2d3748;
    font-size: 10pt;
    line-height: 1.6;
  }
  .glosario-item {
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 0;
    page-break-inside: avoid;
  }
  .glosario-term {
    font-weight: 800;
    color: #2C405B;
    font-size: 10.5pt;
  }
  .glosario-def {
    color: #4a5568;
    font-size: 10pt;
    margin-top: 2px;
  }
  .flujo-tabla table { font-size: 9pt; }
  .page-break { page-break-before: always; }
  @media print {
    .page-break { page-break-before: always; }
    pre { white-space: pre-wrap; }
  }
`;

const DOC = `
<div class="portada">
  <div class="titulo-app">TOO-EASY</div>
  <div class="titulo-doc">Documento de Estudio — Módulo 1</div>
  <p class="subtitulo">Autenticación, Arquitectura y Seguridad del Sistema</p>
  <div class="badges">
    <span class="badge">Registro</span>
    <span class="badge">Login</span>
    <span class="badge">Recuperación</span>
    <span class="badge">JWT</span>
    <span class="badge">Seguridad BD</span>
    <span class="badge">Correos</span>
    <span class="badge">Preguntas de Repaso</span>
  </div>
  <p class="subtitulo" style="margin-top:20px;">Equipo: Granados · Adán · Faro · Ramírez · Vega &nbsp;|&nbsp; Grupo 5IV8</p>
</div>

<!-- ═══════════════════════ SECCIÓN 1 — ARQUITECTURA -->
<div class="seccion-header"><span class="seccion-num">1</span>ARQUITECTURA DEL SISTEMA</div>

<h2>Modelo utilizado</h2>
<p>El sistema usa dos modelos combinados:</p>
<ul>
  <li><strong>Cliente-Servidor</strong>: hay dos bloques principales — el cliente (lo que ve el usuario en el navegador) y el servidor (todo lo que corre detrás).</li>
  <li><strong>MVC (Modelo-Vista-Controlador)</strong>: patrón que organiza el código del servidor en tres responsabilidades separadas.</li>
</ul>

<h2>¿Qué hace cada capa del MVC?</h2>
<table>
  <tr><th>Capa</th><th>Carpeta en el proyecto</th><th>Responsabilidad</th></tr>
  <tr><td><strong>Vista</strong></td><td><code>frontend/views/</code> + <code>frontend/public/</code></td><td>Lo que el usuario ve: HTML, CSS, imágenes</td></tr>
  <tr><td><strong>Controlador</strong></td><td><code>backend/controllers/</code></td><td>Recibe la petición, aplica las reglas, decide qué responder</td></tr>
  <tr><td><strong>Modelo</strong></td><td><code>backend/models/</code></td><td>Habla con la base de datos (queries)</td></tr>
</table>

<h2>Flujo de una petición de principio a fin</h2>
<pre>
[Usuario en el navegador]
        │
        │  1. Abre login.html → el servidor sirve el archivo HTML
        ▼
[frontend/views/login.html]
        │
        │  2. El JS hace fetch('/api/auth/login', { email, password })
        ▼
[server.js → backend/routes/authRoutes.js]
        │
        │  3. La ruta dirige al controlador correcto
        ▼
[backend/controllers/authController.js]
        │
        │  4. El controlador valida, procesa y le pide datos al modelo
        ▼
[backend/models/UserModel.js]
        │
        │  5. El modelo hace la query a Supabase y devuelve el resultado
        ▼
[Base de datos: Supabase — PostgreSQL]
        │
        │  6. El controlador responde con JSON { success: true, token: "..." }
        ▼
[El JS del navegador recibe el JSON y actualiza la pantalla]</pre>

<h3>Responsabilidades en una línea</h3>
<div class="highlight-box">
  <p><strong>FRONT</strong> — Lo que el usuario ve y toca. Manda peticiones, recibe JSON, actualiza la pantalla.</p>
  <p><strong>BACK</strong> — El cerebro. Recibe peticiones, aplica reglas, decide si algo está bien o mal, habla con la BD.</p>
  <p><strong>BD</strong> — Solo guarda y devuelve datos. No piensa, no valida, no decide.</p>
</div>

<!-- ═══════════════════════ SECCIÓN 2 — TECNOLOGÍAS -->
<div class="page-break"></div>
<div class="seccion-header"><span class="seccion-num">2</span>TECNOLOGÍAS USADAS Y POR QUÉ</div>

<table>
  <tr><th>Tecnología</th><th>Para qué</th><th>Por qué se eligió</th></tr>
  <tr><td><strong>Node.js</strong></td><td>Ejecuta JavaScript en el servidor</td><td>Permite usar JS tanto en front como en back</td></tr>
  <tr><td><strong>Express 5</strong></td><td>Framework HTTP</td><td>Evita construir el servidor desde cero; estándar de facto</td></tr>
  <tr><td><strong>Supabase (PostgreSQL)</strong></td><td>Base de datos en la nube</td><td>Incluye RLS, backups automáticos y API lista</td></tr>
  <tr><td><strong>JWT</strong></td><td>Identificar quién está logueado</td><td>El servidor no guarda estado; el token viaja en cada petición</td></tr>
  <tr><td><strong>bcryptjs</strong></td><td>Encriptar contraseñas</td><td>Lento a propósito — dificulta ataques de fuerza bruta</td></tr>
  <tr><td><strong>Helmet</strong></td><td>Cabeceras de seguridad HTTP</td><td>Reduce riesgos comunes con una línea de configuración</td></tr>
  <tr><td><strong>CORS</strong></td><td>Controla qué orígenes acceden al servidor</td><td>Evita que sitios externos consuman la API sin permiso</td></tr>
  <tr><td><strong>express-rate-limit</strong></td><td>Limita peticiones por IP</td><td>Previene abuso y ataques de fuerza bruta</td></tr>
  <tr><td><strong>Brevo (API HTTP)</strong></td><td>Correos transaccionales automáticos</td><td>Gratis hasta 300/día, sin configurar servidor de correo</td></tr>
  <tr><td><strong>nodemailer + Gmail</strong></td><td>Correos masivos manuales (broadcast)</td><td>Script que se corre a mano desde la terminal</td></tr>
  <tr><td><strong>Cloudflare Turnstile</strong></td><td>Anti-bot en registro y login</td><td>Captcha inteligente que no interrumpe al usuario normal</td></tr>
  <tr><td><strong>dotenv</strong></td><td>Lee variables de entorno desde .env</td><td>Mantiene credenciales fuera del código fuente</td></tr>
  <tr><td><strong>Vanilla JS</strong></td><td>Frontend sin frameworks</td><td>Sin dependencias; se entiende exactamente qué hace cada línea</td></tr>
</table>

<h2>Vanilla JS — ventajas y límites</h2>
<p><strong>¿Qué es?</strong> JavaScript puro sin librerías externas (sin React, Vue, Angular). Ideal para proyectos académicos.</p>
<div class="warn-box">
  <strong>Su límite:</strong> cuando la app crece, el código de cada página se vuelve difícil de mantener porque no hay componentes reutilizables ni estado centralizado. Para escalar se recomendaría React o Vue en el front y TypeScript en el back.
</div>

<h2>¿Qué es un framework?</h2>
<p>Conjunto de herramientas y convenciones predefinidas que resuelven problemas comunes para que no tengas que construir todo desde cero. Express maneja el routing HTTP sin que tengas que programar cómo leer una petición TCP raw.</p>

<!-- ═══════════════════════ SECCIÓN 3 — ESTRUCTURA -->
<div class="seccion-header"><span class="seccion-num">3</span>ESTRUCTURA DEL PROYECTO</div>

<pre>
TOO-EASY/
│
├── server.js                  ← Punto de entrada. Configura todo y levanta el servidor.
│
├── backend/
│   ├── config/supabase.js     ← Conexión a la BD (dos clientes: normal y admin)
│   ├── controllers/           ← Lógica de negocio
│   ├── models/                ← Queries a la BD
│   ├── routes/                ← Define qué URLs existen y a qué controlador van
│   ├── middleware/            ← Filtros que se ejecutan antes del controlador
│   ├── services/              ← Servicios compartidos
│   └── utils/                 ← Herramientas: email, seguridad, validaciones
│
└── frontend/
    ├── views/                 ← Páginas HTML
    └── public/
        ├── css/               ← Estilos por pantalla
        ├── js/pages/          ← JS específico de cada página
        ├── js/modules/        ← JS reutilizable
        └── img/               ← Imágenes</pre>

<h3>¿Qué es server.js?</h3>
<p>Es el punto de arranque. Cuando ejecutas <code>npm start</code> lo primero que corre es este archivo. Hace tres cosas: (1) configura middlewares de seguridad, (2) registra todas las rutas, (3) levanta el servidor en el puerto 3000.</p>

<h3>¿Qué son los middlewares?</h3>
<p>Intermediarios que se ejecutan entre que llega la petición y llega al controlador. Pueden dejar pasar, modificar o rechazar la petición.</p>
<table>
  <tr><th>Middleware</th><th>Qué hace</th></tr>
  <tr><td><code>requireAuth</code></td><td>Verifica que el JWT sea válido antes de dejar pasar</td></tr>
  <tr><td><code>requireLevelAccess</code></td><td>Verifica que el usuario tenga nivel suficiente</td></tr>
  <tr><td><code>helmet()</code></td><td>Agrega cabeceras de seguridad a todas las respuestas</td></tr>
  <tr><td><code>rateLimit()</code></td><td>Bloquea IPs que hagan demasiadas peticiones</td></tr>
</table>

<!-- ═══════════════════════ SECCIÓN 4 — AUTENTICACIÓN -->
<div class="page-break"></div>
<div class="seccion-header"><span class="seccion-num">4</span>MÓDULO DE AUTENTICACIÓN — ENDPOINTS</div>

<table>
  <tr><th>Método</th><th>Endpoint</th><th>Para qué</th></tr>
  <tr><td>POST</td><td><code>/api/auth/register</code></td><td>Crear cuenta nueva</td></tr>
  <tr><td>POST</td><td><code>/api/auth/login</code></td><td>Iniciar sesión</td></tr>
  <tr><td>POST</td><td><code>/api/auth/verify-email</code></td><td>Verificar código enviado al correo</td></tr>
  <tr><td>POST</td><td><code>/api/auth/resend-verification</code></td><td>Pedir otro código de verificación</td></tr>
  <tr><td>POST</td><td><code>/api/auth/request-recovery</code></td><td>Solicitar código para recuperar contraseña</td></tr>
  <tr><td>POST</td><td><code>/api/auth/verify-recovery-code</code></td><td>Verificar ese código</td></tr>
  <tr><td>POST</td><td><code>/api/auth/reset-password</code></td><td>Guardar nueva contraseña</td></tr>
</table>

<div class="warn-box"><strong>¿Por qué todo POST?</strong> Los datos sensibles (contraseña, código) no deben ir en la URL. POST manda los datos en el cuerpo de la petición, que viaja encriptado con HTTPS.</div>

<!-- ═══════════════════════ SECCIÓN 5 — REGISTRO -->
<div class="seccion-header"><span class="seccion-num">5</span>FLUJO DE REGISTRO</div>

<div class="flujo-tabla">
<table>
  <tr><th>Paso</th><th>FRONT</th><th>BACK</th><th>BD</th></tr>
  <tr><td>1</td><td>Muestra el formulario</td><td>—</td><td>—</td></tr>
  <tr><td>2</td><td>Envía datos con fetch POST</td><td>Recibe los datos</td><td>—</td></tr>
  <tr><td>3</td><td>—</td><td>Verifica Cloudflare Turnstile (anti-bot)</td><td>—</td></tr>
  <tr><td>4</td><td>—</td><td>Valida campos: nombre, email, contraseña, edad</td><td>—</td></tr>
  <tr><td>5</td><td>—</td><td>Consulta si email/nombre ya existen</td><td>Busca en tabla <code>users</code></td></tr>
  <tr><td>6</td><td>—</td><td>Verifica contraseña contra HIBP</td><td>Consulta API externa</td></tr>
  <tr><td>7</td><td>—</td><td>Encripta la contraseña con bcrypt</td><td>—</td></tr>
  <tr><td>8</td><td>—</td><td>Crea el usuario con <code>email_verified = false</code></td><td>INSERT en <code>users</code></td></tr>
  <tr><td>9</td><td>—</td><td>Genera código 6 dígitos, lo hashea con SHA-256</td><td>INSERT en <code>verification_codes</code></td></tr>
  <tr><td>10</td><td>—</td><td>Manda el código al correo (Brevo)</td><td>—</td></tr>
  <tr><td>11</td><td>Muestra pantalla para ingresar el código</td><td>Devuelve <code>{ requiresVerification: true }</code></td><td>—</td></tr>
  <tr><td>12</td><td>Usuario ingresa código y lo envía</td><td>Verifica hash del código</td><td>Actualiza <code>email_verified = true</code></td></tr>
  <tr><td>13</td><td>Guarda el JWT, redirige al juego</td><td>Genera y devuelve el JWT</td><td>—</td></tr>
</table>
</div>

<h3>Validaciones del registro</h3>
<ul>
  <li>Nombre: entre 3 y 16 caracteres</li>
  <li>Contraseña: entre 8 y 64 caracteres</li>
  <li>Email: formato válido (regex)</li>
  <li>Edad: número entero entre 15 y 99</li>
  <li>Email/nombre: no deben existir ya en la BD</li>
  <li>Contraseña: no debe estar en bases de datos de filtraciones conocidas (HIBP)</li>
</ul>

<div class="warn-box"><strong>¿Qué pasa si el usuario no verifica su correo?</strong> La cuenta queda con <code>email_verified = false</code>. No puede hacer login. Si pasan 24 horas sin verificar, una tarea automática la elimina de la BD (la persona puede volver a registrarse con el mismo email y nombre).</div>

<!-- ═══════════════════════ SECCIÓN 6 — LOGIN -->
<div class="page-break"></div>
<div class="seccion-header"><span class="seccion-num">6</span>FLUJO DE INICIO DE SESIÓN</div>

<div class="flujo-tabla">
<table>
  <tr><th>Paso</th><th>FRONT</th><th>BACK</th><th>BD</th></tr>
  <tr><td>1</td><td>Muestra formulario</td><td>—</td><td>—</td></tr>
  <tr><td>2</td><td>Envía email + contraseña</td><td>Recibe datos</td><td>—</td></tr>
  <tr><td>3</td><td>—</td><td>Verifica Cloudflare Turnstile</td><td>—</td></tr>
  <tr><td>4</td><td>—</td><td>Busca usuario por email</td><td>SELECT en <code>users</code></td></tr>
  <tr><td>5</td><td>—</td><td>Si no existe: bcrypt dummy (protección timing attack)</td><td>—</td></tr>
  <tr><td>6</td><td>—</td><td>Verifica si la cuenta está bloqueada (<code>locked_until</code>)</td><td>—</td></tr>
  <tr><td>7</td><td>—</td><td>Compara contraseña con hash guardado (bcrypt)</td><td>—</td></tr>
  <tr><td>8</td><td>—</td><td>Si falla: suma intentos; al llegar a 5 bloquea 15 min</td><td>UPDATE <code>failed_login_attempts</code></td></tr>
  <tr><td>9</td><td>—</td><td>Verifica que <code>email_verified = true</code></td><td>—</td></tr>
  <tr><td>10</td><td>—</td><td>Login exitoso: genera JWT, guarda IP y fecha</td><td>UPDATE <code>last_login_at</code>, resetea intentos</td></tr>
  <tr><td>11</td><td>Guarda JWT, redirige al juego</td><td>Devuelve JWT + datos del usuario</td><td>—</td></tr>
</table>
</div>

<!-- ═══════════════════════ SECCIÓN 7 — RECUPERACIÓN -->
<div class="seccion-header"><span class="seccion-num">7</span>FLUJO DE OLVIDE MI CONTRASEÑA</div>

<h3>Paso 1 — Solicitar código &nbsp;<code>POST /api/auth/request-recovery</code></h3>
<ul>
  <li>Siempre responde igual: <em>"Si el correo está registrado, recibirás un código"</em></li>
  <li>Si el correo existe: genera código, lo hashea, lo guarda en BD, manda email</li>
  <li>Si no existe: responde igual (no revela si el correo está registrado → evita enumeración)</li>
</ul>

<h3>Paso 2 — Verificar código &nbsp;<code>POST /api/auth/verify-recovery-code</code></h3>
<ul>
  <li>Busca el código activo no usado del usuario</li>
  <li>Máximo 5 intentos antes de invalidar el código</li>
  <li>Si es correcto: devuelve <code>{ sessionToken, resetId }</code> temporales</li>
</ul>

<h3>Paso 3 — Nueva contraseña &nbsp;<code>POST /api/auth/reset-password</code></h3>
<ul>
  <li>Valida el sessionToken temporal</li>
  <li>Verifica la nueva contraseña contra HIBP</li>
  <li>Guarda la nueva contraseña hasheada</li>
  <li>Invalida TODAS las sesiones activas del usuario (sessions anteriores al cambio de contraseña quedan inútiles)</li>
</ul>

<!-- ═══════════════════════ SECCIÓN 8 — JWT -->
<div class="seccion-header"><span class="seccion-num">8</span>EL TOKEN JWT — ¿QUÉ ES Y CÓMO FUNCIONA?</div>

<p>JWT (JSON Web Token) es una cadena de texto firmada digitalmente que contiene información del usuario. El servidor la genera al hacer login y el cliente la guarda.</p>

<h3>¿Por qué JWT y no sesiones tradicionales?</h3>
<p>Con sesiones tradicionales el servidor guarda en memoria "el usuario X está logueado". Con JWT el servidor no guarda nada — el token viaja en cada petición y el servidor solo verifica la firma. Ventaja: el servidor puede reiniciarse sin perder sesiones.</p>

<h3>¿Qué contiene el token en este proyecto?</h3>
<pre>Token = base64url( userId . issuedAt . firmaHMAC )</pre>

<h3>¿Cómo se usa en cada petición?</h3>
<pre>El frontend manda:
Header: Authorization: Bearer &lt;token&gt;

El middleware requireAuth:
1. Lee el token del header
2. Verifica la firma HMAC
3. Verifica que no haya expirado (7 días)
4. Verifica que no sea anterior al último cambio de contraseña
5. Mete req.userId para que el controlador lo use</pre>

<div class="highlight-box"><strong>Invalidación automática:</strong> si el usuario cambia su contraseña, todas las sesiones anteriores quedan invalidadas. Esto se logra guardando <code>password_changed_at</code> en la BD y comparándolo con <code>issuedAt</code> del token.</div>

<!-- ═══════════════════════ SECCIÓN 9 — SEGURIDAD BACK -->
<div class="page-break"></div>
<div class="seccion-header"><span class="seccion-num">9</span>MEDIDAS DE SEGURIDAD EN EL BACKEND</div>

<h3>bcrypt — encriptación de contraseñas</h3>
<p>Algoritmo de hash diseñado para ser lento. Con 12 rounds tarda ~250ms por contraseña, haciendo un ataque de fuerza bruta imprácticamente lento. <strong>¿Por qué no MD5 o SHA-256?</strong> Porque son rápidos — un atacante puede probar millones de combinaciones por segundo. bcrypt es intencionalmente lento.</p>

<h3>HIBP — Have I Been Pwned</h3>
<p>Base de datos pública con contraseñas robadas en brechas conocidas. Se consulta con <strong>k-anonymity</strong>: se mandan solo los primeros 5 caracteres del hash SHA-1 de la contraseña. La API devuelve los hashes que empiecen así y el sistema verifica localmente. La contraseña nunca sale completa del servidor.</p>

<h3>Cloudflare Turnstile — anti-bot</h3>
<p>Captcha inteligente que analiza el comportamiento del usuario. Si detecta algo sospechoso muestra un desafío visual; si no, lo deja pasar sin interrumpirlo. Se usa en registro y login.</p>

<h3>Timing Attack — protección</h3>
<p>Si el servidor responde más rápido cuando el usuario no existe, un atacante puede medir esos tiempos para saber qué correos están registrados. <strong>Solución:</strong> cuando el usuario no existe, el backend hace bcrypt con un hash dummy de todas formas, nivelando el tiempo de respuesta.</p>

<h3>Rate Limiting — límites de peticiones</h3>
<table>
  <tr><th>Límite</th><th>Valor</th></tr>
  <tr><td>Peticiones generales</td><td>300 / 15 min por IP</td></tr>
  <tr><td>Endpoints de auth</td><td>20 / 15 min por IP</td></tr>
  <tr><td>Solicitudes de código</td><td>3 / 15 min por usuario</td></tr>
  <tr><td>Intentos de código</td><td>5 intentos → código invalidado</td></tr>
  <tr><td>Intentos de login fallidos</td><td>5 intentos → cuenta bloqueada 15 min</td></tr>
</table>

<h3>Helmet — cabeceras de seguridad</h3>
<p>Agrega automáticamente cabeceras HTTP que protegen contra ataques comunes: CSP (controla qué recursos carga la página), X-Frame-Options: DENY (evita clickjacking), HSTS (fuerza HTTPS), X-Content-Type-Options: noSniff.</p>

<!-- ═══════════════════════ SECCIÓN 10 — SEGURIDAD BD -->
<div class="seccion-header"><span class="seccion-num">10</span>SEGURIDAD EN LA BASE DE DATOS (SUPABASE)</div>

<h3>Lo que Supabase da automáticamente</h3>
<table>
  <tr><th>Qué</th><th>Para qué</th></tr>
  <tr><td>SSL/TLS</td><td>Toda conexión entre backend y BD viaja encriptada</td></tr>
  <tr><td>Backups automáticos</td><td>Supabase guarda copias periódicamente</td></tr>
  <tr><td>API Keys</td><td>Solo quien tenga las keys puede hablar con la BD</td></tr>
  <tr><td>RLS (Row Level Security)</td><td>Políticas que controlan quién puede ver qué filas</td></tr>
</table>

<h3>Los dos clientes de Supabase</h3>
<table>
  <tr><th>Cliente</th><th>Key usada</th><th>Qué puede</th></tr>
  <tr><td><code>supabase</code></td><td>ANON KEY</td><td>Respeta políticas RLS — para lecturas</td></tr>
  <tr><td><code>supabaseAdmin</code></td><td>SERVICE ROLE KEY</td><td>Bypasea RLS — para escrituras y operaciones críticas</td></tr>
</table>

<h3>Campos de seguridad en la tabla <code>users</code></h3>
<table>
  <tr><th>Campo</th><th>Para qué</th></tr>
  <tr><td><code>password_hash</code></td><td>Contraseña nunca en texto plano</td></tr>
  <tr><td><code>email_verified</code></td><td>No se puede entrar sin verificar el correo</td></tr>
  <tr><td><code>is_active</code></td><td>Cuentas desactivadas no pueden hacer login</td></tr>
  <tr><td><code>failed_login_attempts</code></td><td>Contador de intentos fallidos</td></tr>
  <tr><td><code>locked_until</code></td><td>Fecha hasta la que está bloqueada la cuenta</td></tr>
  <tr><td><code>password_changed_at</code></td><td>Para invalidar sesiones anteriores al cambio</td></tr>
  <tr><td><code>last_login_ip</code></td><td>Detectar accesos desde nueva IP</td></tr>
  <tr><td><code>last_login_ua</code></td><td>Dispositivo/navegador del último acceso</td></tr>
</table>

<h3>Índice en <code>password_changed_at</code></h3>
<p>Cada request autenticado hace una query para verificar si la sesión sigue válida. Sin índice PostgreSQL escanea toda la tabla en cada petición. Con índice la búsqueda es instantánea. Los índices son estructuras auxiliares como el índice de un libro.</p>

<!-- ═══════════════════════ SECCIÓN 11 — SOFT/HARD DELETE -->
<div class="page-break"></div>
<div class="seccion-header"><span class="seccion-num">11</span>SOFT DELETE vs HARD DELETE</div>

<p><strong>Soft Delete:</strong> marcar con <code>is_active = false</code> en vez de borrar físicamente. El registro sigue en la BD pero el sistema lo trata como si no existiera. Permite reactivar la cuenta.</p>
<p><strong>Hard Delete:</strong> borrado físico con <code>DELETE FROM tabla WHERE id = X</code>. No hay vuelta atrás.</p>

<table>
  <tr><th>Quién borra</th><th>Cómo</th><th>Reversible</th><th>Tiempo</th></tr>
  <tr><td>Admin desactiva cuenta</td><td><code>is_active = false</code> (soft delete)</td><td>Sí</td><td>Hasta 90 días</td></tr>
  <tr><td>Usuario borra su cuenta</td><td>DELETE directo (hard delete)</td><td>No</td><td>Inmediato</td></tr>
  <tr><td>Cuenta zombie (no verificó)</td><td>DELETE automático</td><td>No</td><td>A las 24 horas</td></tr>
  <tr><td>Cuenta inactiva 90 días</td><td>DELETE automático</td><td>No</td><td>A los 90 días</td></tr>
</table>

<div class="warn-box"><strong>El trigger eliminado:</strong> existía uno llamado <code>trg_hard_delete_on_deactivate</code> que interceptaba cualquier <code>UPDATE SET is_active = false</code> y lo convertía en un DELETE. Se eliminó porque causaba un bug y porque la lógica se movió al backend para tener más control.</div>

<!-- ═══════════════════════ SECCIÓN 12 — CORREOS -->
<div class="seccion-header"><span class="seccion-num">12</span>SISTEMA DE CORREOS</div>

<table>
  <tr><th>Sistema</th><th>Tecnología</th><th>Para qué</th><th>Cómo se activa</th></tr>
  <tr><td><code>emailService.js</code></td><td>Brevo (API HTTP)</td><td>Correos automáticos del sistema</td><td>Se dispara solo cuando el usuario hace algo</td></tr>
  <tr><td><code>send-broadcast.js</code></td><td>Gmail + nodemailer (SMTP)</td><td>Correos masivos manuales</td><td>A mano desde la terminal</td></tr>
</table>

<h3>Brevo vs SMTP</h3>
<p>SMTP conecta directamente a un servidor de correo por puerto 587/465. Brevo es un intermediario: el backend manda un <code>fetch</code> HTTPS con la API key y Brevo se encarga de entregar el correo. Más fácil, mejor tasa de entrega, gratis hasta 300/día.</p>

<h3>¿Cómo se genera y verifica el código de 6 dígitos?</h3>
<pre>
1. crypto.randomInt(100000, 999999)  → número aleatorio sin sesgo
2. hashCode(code)                    → SHA-256 del código
3. Guarda el HASH en verification_codes (nunca el código en texto plano)
4. Manda el código original al correo del usuario
5. Usuario ingresa el código → se hashea → se compara con el hash guardado</pre>

<h3>¿Por qué los correos usan estilos en línea?</h3>
<p>Los clientes de correo (Gmail, Outlook) bloquean hojas de estilo externas. El único CSS que respetan es el pegado directamente en cada elemento con <code>style="..."</code>. Por eso todos los correos tienen <code>style="color:#2C405B"</code> directo en cada etiqueta.</p>

<div class="warn-box"><strong>¿Qué hace el paquete <code>resend</code>?</strong> Está instalado en package.json pero <strong>nunca se usa</strong>. Es una dependencia muerta de cuando el proyecto usaba Resend antes de migrar a Brevo. La función <code>resendVerificationCode</code> en el código no tiene nada que ver con el servicio Resend — solo significa "volver a enviar el código".</div>

<!-- ═══════════════════════ SECCIÓN 13 — CRON JOBS -->
<div class="seccion-header"><span class="seccion-num">13</span>LIMPIEZAS AUTOMÁTICAS (CRON JOBS)</div>

<table>
  <tr><th>Tarea</th><th>Condición</th><th>Frecuencia</th></tr>
  <tr><td>Tickets expirados</td><td>Tickets con más de 30 días</td><td>Cada 24 horas</td></tr>
  <tr><td>Cuentas zombie</td><td><code>email_verified = false</code> + más de 24 horas desde el registro</td><td>Cada 24 horas</td></tr>
  <tr><td>Cuentas inactivas</td><td><code>is_active = false</code> + más de 90 días sin reactivarse</td><td>Cada 24 horas</td></tr>
</table>

<p>Todas se ejecutan también unos segundos después de que el servidor arranca para limpiar lo acumulado.</p>

<!-- ═══════════════════════ SECCIÓN 14 — GLOSARIO -->
<div class="page-break"></div>
<div class="seccion-header"><span class="seccion-num">14</span>GLOSARIO DE CONCEPTOS CLAVE</div>

<div class="glosario-item">
  <div class="glosario-term">Algoritmo</div>
  <div class="glosario-def">Secuencia de pasos para resolver un problema. Es una receta, no código. <em>Ej: bcrypt define cómo hashear una contraseña.</em></div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Función</div>
  <div class="glosario-def">Bloque de código reutilizable que ejecuta una tarea concreta. <em>Ej: <code>hashPassword(plainText)</code></em></div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Método</div>
  <div class="glosario-def">Una función que pertenece a un objeto. <em>Ej: <code>supabase.from('users').select()</code> — select es un método del objeto supabase.</em></div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Lógica de negocio</div>
  <div class="glosario-def">Las reglas que definen qué debe pasar y cuándo. <em>Ej: "si hay 5 intentos fallidos, bloquear 15 minutos".</em></div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Endpoint</div>
  <div class="glosario-def">URL específica de la API que acepta peticiones. <em>Ej: <code>POST /api/auth/login</code></em></div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Hash</div>
  <div class="glosario-def">Transformación de texto a una cadena de longitud fija que no se puede revertir. <em>Ej: "hola123" → "$2b$12$..."</em></div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Salt</div>
  <div class="glosario-def">Valor aleatorio añadido a la contraseña antes de hashearla para que dos contraseñas iguales produzcan hashes diferentes.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">JWT (JSON Web Token)</div>
  <div class="glosario-def">Token firmado que contiene información del usuario. El servidor lo genera al login y el cliente lo manda en cada petición para identificarse.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Middleware</div>
  <div class="glosario-def">Función que se ejecuta entre que llega la petición y llega al controlador. Puede dejar pasar, modificar o rechazar la petición.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Trigger (BD)</div>
  <div class="glosario-def">Acción automática que la BD ejecuta sola cuando ocurre un evento (INSERT, UPDATE, DELETE), sin que el backend se lo pida.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Soft Delete</div>
  <div class="glosario-def">Marcar un registro como inactivo (<code>is_active = false</code>) en vez de borrarlo físicamente. Permite reactivarlo después.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Hard Delete</div>
  <div class="glosario-def">Borrado físico de una fila. <code>DELETE FROM tabla WHERE id = X</code>. No hay vuelta atrás.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Índice (BD)</div>
  <div class="glosario-def">Estructura auxiliar que hace las búsquedas más rápidas. Como el índice de un libro — en vez de leer todo, vas directo a la página.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">RLS (Row Level Security)</div>
  <div class="glosario-def">Sistema de PostgreSQL que define políticas sobre qué filas puede ver o modificar cada tipo de conexión.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">SQL Injection</div>
  <div class="glosario-def">Ataque donde se mete código SQL en un campo de texto para manipular las queries. Se previene con queries parametrizadas y validación de inputs.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Timing Attack</div>
  <div class="glosario-def">Ataque donde se miden tiempos de respuesta para deducir información. Se previene nivelando los tiempos de respuesta con operaciones dummy.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">K-Anonymity</div>
  <div class="glosario-def">Técnica para consultar una API sin revelar el dato completo. En HIBP: se mandan los primeros 5 caracteres del hash, no la contraseña completa.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Rate Limiting</div>
  <div class="glosario-def">Límite de peticiones por IP en un período de tiempo. Previene abuso y ataques de fuerza bruta.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Brute Force</div>
  <div class="glosario-def">Ataque que prueba millones de combinaciones de contraseñas hasta encontrar la correcta. Se mitiga con bcrypt, rate limiting y bloqueo de cuenta.</div>
</div>
<div class="glosario-item">
  <div class="glosario-term">Framework</div>
  <div class="glosario-def">Conjunto de herramientas predefinidas que resuelven problemas comunes para no construir todo desde cero. Express es un framework HTTP para Node.js.</div>
</div>

<!-- ═══════════════════════ SECCIÓN 15 — PREGUNTAS -->
<div class="page-break"></div>
<div class="seccion-header"><span class="seccion-num">15</span>PREGUNTAS DE REPASO</div>

<div class="pregunta">
  <div class="q">¿Por qué se hashea la contraseña antes de guardarla?</div>
  <div class="a">Porque si alguien roba la BD no obtiene las contraseñas reales. Solo obtiene hashes que no se pueden revertir directamente. El usuario puede seguir usando esa contraseña en otros servicios sin que el atacante la sepa.</div>
</div>

<div class="pregunta">
  <div class="q">¿Por qué bcrypt y no MD5 o SHA-256 para contraseñas?</div>
  <div class="a">MD5 y SHA-256 son rápidos — un atacante puede probar millones de combinaciones por segundo. bcrypt es intencionalmente lento (~250ms por hash con 12 rounds), haciendo los ataques de fuerza bruta imprácticamente lentos.</div>
</div>

<div class="pregunta">
  <div class="q">¿Qué es un timing attack y cómo se previene?</div>
  <div class="a">Si el servidor responde más rápido cuando el usuario no existe, un atacante puede medir esos tiempos para saber qué correos están registrados. Se previene haciendo bcrypt con un hash dummy cuando el usuario no existe, nivelando el tiempo de respuesta en ambos casos.</div>
</div>

<div class="pregunta">
  <div class="q">¿Qué pasa si alguien intenta registrarse con un correo que ya existe?</div>
  <div class="a">El backend consulta la BD antes del INSERT. Si encuentra el correo o el nombre, responde con error 409 (Conflict) indicando qué campo está duplicado, sin crear nada.</div>
</div>

<div class="pregunta">
  <div class="q">¿Por qué la recuperación siempre dice "si el correo está registrado te llegará un código"?</div>
  <div class="a">Para evitar enumeración de usuarios. Si dijera "ese correo no existe", un atacante podría probar miles de correos y armar una lista de cuáles están registrados en el sistema.</div>
</div>

<div class="pregunta">
  <div class="q">¿Qué es el soft delete y por qué se usa?</div>
  <div class="a">Es desactivar con <code>is_active = false</code> en vez de borrar físicamente. Se usa para conservar historial, poder reactivar cuentas y mantener integridad referencial — si el usuario tiene movimientos o lecciones, borrar la fila rompería esas relaciones.</div>
</div>

<div class="pregunta">
  <div class="q">¿Qué es RLS y para qué sirve en Supabase?</div>
  <div class="a">Row Level Security define políticas sobre qué filas puede ver cada tipo de conexión. Funciona como segunda capa de seguridad — aunque alguien acceda a Supabase directamente, solo ve lo que las políticas permiten.</div>
</div>

<div class="pregunta">
  <div class="q">¿Por qué hay dos clientes de Supabase?</div>
  <div class="a">El cliente anon respeta las políticas RLS y se usa para lecturas. El cliente admin bypasea RLS y se usa para escrituras y operaciones críticas. Principio de mínimo privilegio: cada operación usa solo el acceso que necesita.</div>
</div>

<div class="pregunta">
  <div class="q">¿Qué es un índice en la BD y por qué crearon uno en <code>password_changed_at</code>?</div>
  <div class="a">Un índice hace búsquedas más rápidas, como el índice de un libro. Se creó ahí porque cada request autenticado hace una query para verificar si la sesión sigue válida. Sin índice PostgreSQL recorre toda la tabla en cada petición; con índice es instantáneo.</div>
</div>

<div class="pregunta">
  <div class="q">¿Por qué el código de verificación se guarda hasheado?</div>
  <div class="a">Si alguien accede a la BD no obtiene los códigos activos y no puede usarlos para verificar cuentas ajenas. El código real solo existe en el correo del usuario — en la BD solo vive su huella (hash SHA-256).</div>
</div>

<div class="pregunta">
  <div class="q">¿Qué pasa si el usuario se registra pero nunca verifica su correo?</div>
  <div class="a">La cuenta queda con <code>email_verified = false</code> y no puede hacer login. Si pasan 24 horas sin verificar, una tarea automática del servidor la elimina. La persona puede volver a registrarse con el mismo correo y nombre.</div>
</div>

<div class="pregunta">
  <div class="q">¿Por qué la sesión se invalida cuando el usuario cambia su contraseña?</div>
  <div class="a">Si alguien robó el token de sesión de otro usuario, al cambiar la contraseña todas las sesiones anteriores quedan inútiles. Esto se logra guardando <code>password_changed_at</code> y comparándolo con <code>issuedAt</code> del JWT en cada request.</div>
</div>

<div class="pregunta">
  <div class="q">¿Qué es HIBP y cómo funciona sin enviar la contraseña completa?</div>
  <div class="a">Have I Been Pwned es una BD de contraseñas filtradas en brechas conocidas. Se consulta con k-anonymity: se mandan solo los primeros 5 caracteres del hash SHA-1. La API devuelve hashes que empiecen así y el sistema verifica localmente. La contraseña nunca sale completa del servidor.</div>
</div>

<div class="pregunta">
  <div class="q">¿Qué diferencia hay entre cómo borra su cuenta el usuario vs el admin?</div>
  <div class="a">El usuario hace un DELETE directo e inmediato (hard delete, sin recuperación). El admin pone <code>is_active = false</code> (soft delete, recuperable hasta 90 días). Si el admin no reactiva en 90 días, una tarea automática lo elimina definitivamente.</div>
</div>

<div class="pregunta">
  <div class="q">Diferencia entre algoritmo, función, método y lógica</div>
  <div class="a"><strong>Algoritmo:</strong> la receta (secuencia de pasos para resolver algo). <strong>Función:</strong> el código que ejecuta esa receta. <strong>Método:</strong> una función que pertenece a un objeto. <strong>Lógica:</strong> las reglas de negocio que dicen qué debe pasar y cuándo.</div>
</div>

<div style="margin-top: 40px; padding-top: 16px; border-top: 2px solid #2C405B; text-align: center; color: #718096; font-size: 9pt;">
  TOO-EASY · Documento de Estudio — Módulo 1: Autenticación &nbsp;|&nbsp; Grupo 5IV8 · 2026
</div>
`;

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TOO-EASY — Documento de Estudio: Autenticación</title>
  <style>${CSS}</style>
</head>
<body>
${DOC}
</body>
</html>`;

const htmlPath = path.join(__dirname, 'TOO-EASY-Estudio-Autenticacion.html');
const pdfPath  = path.join(__dirname, 'TOO-EASY-Estudio-Autenticacion.pdf');

fs.writeFileSync(htmlPath, HTML, 'utf8');
console.log(`✅ HTML generado: ${htmlPath}`);

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
try {
    execSync(
        `"${edge}" --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" --print-to-pdf-no-header "${htmlPath}"`,
        { timeout: 60000, stdio: 'pipe' }
    );
    console.log(`✅ PDF generado: ${pdfPath}`);
} catch (e) {
    console.error('Error generando PDF:', e.message);
    console.log('ℹ️  Abre el HTML en tu navegador y usa Ctrl+P → Guardar como PDF');
}

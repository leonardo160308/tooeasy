// backend/utils/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// ── Validar config al arrancar ────────────────────────────────────────────────
['EMAIL_USER', 'EMAIL_PASS'].forEach(key => {
    if (!process.env[key]) {
        console.error(`❌ Variable de entorno faltante: ${key}`);
    }
});

const transporter = nodemailer.createTransport({
    host:               process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:               parseInt(process.env.EMAIL_PORT || '587'),
    secure:             process.env.EMAIL_SECURE === 'true', // false = STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,                        // App Password de Google
    },
    connectionTimeout:  10_000,
    greetingTimeout:    5_000,
    socketTimeout:      15_000,
    // Reintento automático en errores de red transitorios
    pool:               true,
    maxConnections:     3,
    maxMessages:        100,
});

// Verificar conexión al iniciar
transporter.verify((err) => {
    if (err) {
        const hint = err.code === 'EAUTH'
            ? ' → Usa App Password de Google, no tu contraseña normal'
            : '';
        console.error(`❌ SMTP no disponible: ${err.message}${hint}`);
    } else {
        console.log('✅ SMTP listo para enviar correos');
    }
});

// ── Función base de envío ─────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
    try {
        const info = await transporter.sendMail({
            from:    process.env.EMAIL_FROM || `"Too Easy 💰" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`📧 Email enviado → ${to} | ID: ${info.messageId}`);
        return { success: true };
    } catch (error) {
        const messages = {
            EAUTH:      'Credenciales SMTP inválidas. Verifica tu App Password de Google.',
            ECONNECTION:'No se pudo conectar al servidor SMTP.',
            EMESSAGE:   'El mensaje tiene formato inválido.',
        };
        console.error(`❌ Error enviando a ${to}: ${messages[error.code] || error.message}`);
        throw new Error(messages[error.code] || 'Error al enviar correo.');
    }
}

// ── Template base ─────────────────────────────────────────────────────────────
function baseTemplate(title, content, accentColor = '#2C405B') {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="500" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:20px;overflow:hidden;
                  box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">
      <tr>
        <td style="background:${accentColor};padding:28px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:3px;">
            TOO EASY 💸
          </h1>
          <p style="margin:8px 0 0;color:#B6823E;font-size:11px;letter-spacing:2px;
                    text-transform:uppercase;">${title}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px;">
          ${content}
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;padding:18px 40px;text-align:center;
                   border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#a0aec0;font-size:11px;">
            © 2025 Too Easy · Proyecto educativo<br>
            Si no solicitaste esto, ignora este correo.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Email: verificar cuenta nueva ────────────────────────────────────────────
export async function sendVerificationEmail(toEmail, code, userName) {
    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  Hola, <strong style="color:#2C405B;">${userName}</strong> 👋
</p>
<p style="color:#718096;font-size:15px;line-height:1.6;margin:0 0 28px;">
  Gracias por registrarte en Too Easy. Usa este código para <strong>verificar tu correo</strong>.
  Expira en <strong>10 minutos</strong>.
</p>
<div style="background:#f0f7ff;border:2px dashed #6585AA;border-radius:16px;
            padding:28px;text-align:center;margin:0 0 28px;">
  <p style="margin:0 0 8px;color:#718096;font-size:11px;text-transform:uppercase;
            letter-spacing:1px;">Código de verificación</p>
  <p style="margin:0;font-size:46px;font-weight:900;letter-spacing:14px;
            color:#2C405B;font-family:monospace;">${code}</p>
</div>
<p style="margin:0;color:#e53e3e;font-size:13px;font-weight:600;">
  ⚠️ Nunca compartas este código con nadie.
</p>`;
    return sendEmail({
        to:      toEmail,
        subject: `${code} — Verifica tu cuenta en Too Easy`,
        html:    baseTemplate('Verifica tu correo electrónico', content),
    });
}

// ── Email: recuperar contraseña ───────────────────────────────────────────────
export async function sendRecoveryEmail(toEmail, code, userName) {
    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  Hola, <strong style="color:#2C405B;">${userName}</strong>
</p>
<p style="color:#718096;font-size:15px;line-height:1.6;margin:0 0 28px;">
  Recibimos una solicitud para recuperar tu cuenta. Usa este código.
  <strong>Expira en 10 minutos</strong>.
</p>
<div style="background:#fff8f0;border:2px dashed #BA8E58;border-radius:16px;
            padding:28px;text-align:center;margin:0 0 28px;">
  <p style="margin:0 0 8px;color:#718096;font-size:11px;text-transform:uppercase;
            letter-spacing:1px;">Código de recuperación</p>
  <p style="margin:0;font-size:46px;font-weight:900;letter-spacing:14px;
            color:#7c4a03;font-family:monospace;">${code}</p>
</div>
<p style="margin:0;color:#e53e3e;font-size:13px;font-weight:600;">
  ⚠️ Si no solicitaste esto, cambia tu contraseña de inmediato.
</p>`;
    return sendEmail({
        to:      toEmail,
        subject: `${code} — Recupera tu cuenta en Too Easy`,
        html:    baseTemplate('Recuperación de contraseña', content, '#7c4a03'),
    });
}

// ── Email: bienvenida (post-verificación) ─────────────────────────────────────
export async function sendWelcomeEmail(toEmail, userName) {
    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  ¡Bienvenido/a, <strong style="color:#2C405B;">${userName}</strong>! 🎉
</p>
<p style="color:#718096;font-size:15px;line-height:1.6;margin:0 0 24px;">
  Tu cuenta ha sido verificada exitosamente. Ya puedes acceder a todas las funciones de Too Easy.
</p>
<div style="text-align:center;margin:28px 0;">
  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login.html"
     style="background:#2C405B;color:#fff;text-decoration:none;padding:14px 32px;
            border-radius:30px;font-weight:700;font-size:15px;display:inline-block;">
    Ir a mi cuenta →
  </a>
</div>`;
    return sendEmail({
        to:      toEmail,
        subject: `¡Bienvenido/a a Too Easy, ${userName}!`,
        html:    baseTemplate('¡Tu cuenta está lista!', content, '#27ae60'),
    });
}
// backend/utils/emailService.js
// Usa Brevo (Sendinblue) HTTP API
// ✅ Funciona en Render Free (no usa SMTP, usa HTTPS)
// ✅ Manda a cualquier correo sin verificar dominio
// ✅ Gratis hasta 300 emails/día
import dotenv from 'dotenv';
dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL    = process.env.EMAIL_USER || 'tooeasycontactanos@gmail.com';
const FROM_NAME     = 'Too Easy';

// ── Función base de envío via Brevo REST API ──────────────────────────────────
async function sendEmail({ to, subject, html }) {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept':       'application/json',
                'api-key':      BREVO_API_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender:  { name: FROM_NAME, email: FROM_EMAIL },
                to:      [{ email: to }],
                subject,
                htmlContent: html,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ Error enviando a ${to}:`, data);
            throw new Error(data.message || 'Error al enviar correo.');
        }

        console.log(`📧 Email enviado → ${to} | ID: ${data.messageId}`);
        return { success: true };
    } catch (err) {
        console.error(`❌ Excepción enviando email a ${to}:`, err.message);
        throw err;
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
            TOO EASY 
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
  <a href="${process.env.FRONTEND_URL || 'https://tooeasy-8zct.onrender.com'}/login.html"
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
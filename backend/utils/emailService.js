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

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

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
    const safeName = escapeHtml(userName);
    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  Hola, <strong style="color:#2C405B;">${safeName}</strong> 👋
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
    const safeName = escapeHtml(userName);
    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  Hola, <strong style="color:#2C405B;">${safeName}</strong>
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

// ── Email: respuesta de soporte a ticket ─────────────────────────────────────
export async function sendTicketReplyEmail(toEmail, userName, ticketSubject, replyMessage) {
    const safeName    = escapeHtml(userName);
    const safeSubject = escapeHtml(ticketSubject);
    const safeMessage = escapeHtml(replyMessage).replace(/\n/g, '<br>');
    const appUrl      = process.env.FRONTEND_URL || 'https://tooeasy-8zct.onrender.com';
    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  Hola, <strong style="color:#2C405B;">${safeName}</strong> 👋
</p>
<p style="color:#718096;font-size:15px;line-height:1.6;margin:0 0 20px;">
  El equipo de soporte ha respondido tu ticket:
</p>
<div style="background:#f0f4f8;border-left:4px solid #2C405B;border-radius:8px;
            padding:18px 24px;margin:0 0 24px;">
  <p style="margin:0 0 8px;color:#4a5568;font-size:13px;font-weight:700;
            text-transform:uppercase;letter-spacing:1px;">Asunto</p>
  <p style="margin:0 0 16px;color:#2C405B;font-size:15px;font-weight:600;">${safeSubject}</p>
  <p style="margin:0 0 8px;color:#4a5568;font-size:13px;font-weight:700;
            text-transform:uppercase;letter-spacing:1px;">Respuesta</p>
  <p style="margin:0;color:#4a5568;font-size:15px;line-height:1.7;">${safeMessage}</p>
</div>
<div style="text-align:center;margin:28px 0;">
  <a href="${appUrl}/soporte.html"
     style="background:#2C405B;color:#fff;text-decoration:none;padding:14px 32px;
            border-radius:30px;font-weight:700;font-size:15px;display:inline-block;">
    Ver mi ticket →
  </a>
</div>
<p style="margin:0;color:#a0aec0;font-size:13px;">
  Si ya resolviste tu duda, puedes cerrar el ticket desde la plataforma.
</p>`;
    return sendEmail({
        to:      toEmail,
        subject: `Too Easy Soporte: Respuesta a tu ticket "${ticketSubject.substring(0, 60)}"`,
        html:    baseTemplate('Respuesta de Soporte', content),
    });
}

// ── Email: ticket resuelto ────────────────────────────────────────────────────
export async function sendTicketResolvedEmail(toEmail, userName, ticketSubject) {
    const safeName    = escapeHtml(userName);
    const safeSubject = escapeHtml(ticketSubject);
    const appUrl      = process.env.FRONTEND_URL || 'https://tooeasy-8zct.onrender.com';
    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  Hola, <strong style="color:#2C405B;">${safeName}</strong> 👋
</p>
<p style="color:#718096;font-size:15px;line-height:1.6;margin:0 0 24px;">
  Tu ticket ha sido <strong style="color:#16a34a;">resuelto</strong> por nuestro equipo de soporte.
</p>
<div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:8px;
            padding:16px 24px;margin:0 0 24px;">
  <p style="margin:0;color:#166534;font-size:15px;font-weight:600;">${safeSubject}</p>
</div>
<p style="color:#718096;font-size:14px;line-height:1.6;margin:0 0 24px;">
  Si tu problema fue resuelto, puedes calificar la atención desde la plataforma.<br>
  Si aún tienes dudas, puedes responder el ticket o abrir uno nuevo.
</p>
<div style="text-align:center;margin:28px 0;">
  <a href="${appUrl}/soporte.html"
     style="background:#16a34a;color:#fff;text-decoration:none;padding:14px 32px;
            border-radius:30px;font-weight:700;font-size:15px;display:inline-block;">
    Ver mi ticket →
  </a>
</div>`;
    return sendEmail({
        to:      toEmail,
        subject: `Too Easy Soporte: Tu ticket ha sido resuelto`,
        html:    baseTemplate('Ticket Resuelto', content, '#16a34a'),
    });
}

// ── Email: cambio de estado de ticket ────────────────────────────────────────
const STATUS_INFO = {
    open: {
        label:      'En Cola',
        desc:       'Tu ticket ha sido recibido y está en la cola de atención. Nuestro equipo lo tomará pronto.',
        accentColor:'#3498db',
        icon:       '📥',
    },
    in_progress: {
        label:      'En Progreso',
        desc:       'Un agente de soporte está trabajando activamente en tu solicitud en este momento.',
        accentColor:'#e67e22',
        icon:       '⚙️',
    },
    waiting_user: {
        label:      'Esperando tu Respuesta',
        desc:       'Hemos respondido tu ticket. Por favor revisa nuestra respuesta y escríbenos si necesitas algo más.',
        accentColor:'#f39c12',
        icon:       '⏳',
    },
    resolved: {
        label:      'Resuelto',
        desc:       'Tu ticket ha sido marcado como resuelto. Puedes calificar la atención o reabrir el ticket si el problema persiste.',
        accentColor:'#27ae60',
        icon:       '✅',
    },
    closed: {
        label:      'Cerrado',
        desc:       'Tu ticket ha sido cerrado y archivado. Si tienes una nueva duda, puedes abrir un nuevo ticket en cualquier momento.',
        accentColor:'#95a5a6',
        icon:       '🔒',
    },
};

export async function sendTicketStatusChangeEmail(toEmail, userName, ticketSubject, newStatus) {
    const safeName    = escapeHtml(userName);
    const safeSubject = escapeHtml(ticketSubject);
    const appUrl      = process.env.FRONTEND_URL || 'https://tooeasy-8zct.onrender.com';
    const info        = STATUS_INFO[newStatus] || {
        label:      newStatus,
        desc:       'El estado de tu ticket ha cambiado.',
        accentColor:'#2C405B',
        icon:       '📋',
    };

    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  Hola, <strong style="color:#2C405B;">${safeName}</strong> 👋
</p>
<p style="color:#718096;font-size:15px;line-height:1.6;margin:0 0 20px;">
  Tu ticket ha cambiado de estado. Aquí tienes el resumen:
</p>
<div style="background:#f0f4f8;border-radius:14px;padding:22px 28px;margin:0 0 24px;">
  <p style="margin:0 0 6px;color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Asunto del ticket</p>
  <p style="margin:0 0 18px;color:#2C405B;font-size:15px;font-weight:600;">${safeSubject}</p>
  <p style="margin:0 0 6px;color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Nuevo estado</p>
  <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:${info.accentColor};">
    ${info.icon} ${info.label}
  </p>
</div>
<div style="background:#fff8f0;border-left:4px solid ${info.accentColor};border-radius:8px;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0;color:#4a5568;font-size:14px;line-height:1.7;">${info.desc}</p>
</div>
<div style="text-align:center;margin:28px 0;">
  <a href="${appUrl}/soporte.html"
     style="background:${info.accentColor};color:#fff;text-decoration:none;padding:14px 32px;
            border-radius:30px;font-weight:700;font-size:15px;display:inline-block;">
    Ver mi ticket →
  </a>
</div>`;

    return sendEmail({
        to:      toEmail,
        subject: `Too Easy Soporte: Tu ticket está "${info.label}"`,
        html:    baseTemplate(`Estado del ticket: ${info.label}`, content, info.accentColor),
    });
}

// ── Email: bienvenida (post-verificación) ─────────────────────────────────────
export async function sendWelcomeEmail(toEmail, userName) {
    const safeName = escapeHtml(userName);
    const content = `
<p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
  ¡Bienvenido/a, <strong style="color:#2C405B;">${safeName}</strong>! 🎉
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
        subject: `¡Bienvenido/a a Too Easy, ${safeName}!`,
        html:    baseTemplate('¡Tu cuenta está lista!', content, '#27ae60'),
    });
}
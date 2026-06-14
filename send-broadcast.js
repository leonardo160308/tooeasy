// send-broadcast.js
// Manda el comunicado a todos los usuarios verificados via Gmail (nodemailer).
// Ejecuta: node send-broadcast.js

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function buildEmailHtml(nombre) {
    const safeName = escapeHtml(nombre);
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
        <td style="background:#2C405B;padding:28px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:3px;">
            TOO EASY
          </h1>
          <p style="margin:8px 0 0;color:#B6823E;font-size:11px;letter-spacing:2px;
                    text-transform:uppercase;">Comunicado Equipo 1</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px;">
          <p style="color:#4a5568;font-size:16px;margin:0 0 20px;">
            Hola, <strong style="color:#2C405B;">${safeName}</strong> 👋
          </p>

          <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Si ya <strong>probaste</strong> nuestro sistema, te pedimos que contestes
            la siguiente encuesta, ¡nos ayuda mucho!
          </p>

          <div style="text-align:center;margin:0 0 28px;">
            <a href="https://forms.gle/yyRetfU8sisJYuPq9"
               style="background:#B6823E;color:#fff;text-decoration:none;
                      padding:14px 32px;border-radius:30px;font-weight:700;
                      font-size:15px;display:inline-block;">
              Contestar encuesta →
            </a>
          </div>

          <div style="background:#f0f4f8;border-left:4px solid #2C405B;border-radius:8px;
                      padding:18px 24px;margin:0 0 24px;">
            <p style="margin:0 0 10px;color:#4a5568;font-size:15px;line-height:1.7;">
              En caso de no haber probado todavía nuestro sistema,
              ¡les rogamos lo hagan! 🥺
            </p>
            <p style="margin:0;color:#718096;font-size:14px;line-height:1.7;">
              👉👈 Les compartimos el enlace:
            </p>
          </div>

          <div style="text-align:center;margin:0 0 28px;">
            <a href="https://tooeasy-8zct.onrender.com/"
               style="background:#2C405B;color:#fff;text-decoration:none;
                      padding:14px 32px;border-radius:30px;font-weight:700;
                      font-size:15px;display:inline-block;">
              Entrar a Too Easy →
            </a>
          </div>

          <p style="color:#718096;font-size:14px;text-align:center;margin:0;
                    font-style:italic;">
            Prueben nuestro sistema y nosotros probamos el suyo 🙂‍↕️
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;padding:18px 40px;text-align:center;
                   border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#a0aec0;font-size:11px;">
            © 2025 Too Easy · Proyecto educativo<br>
            Recibes este correo porque eres usuario registrado de Too Easy.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function sendEmail(to, nombre) {
    await transporter.sendMail({
        from:    `"Too Easy" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Comunicado Equipo 1 - TooEasy',
        html:    buildEmailHtml(nombre),
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    // Verificar conexión SMTP antes de empezar
    try {
        await transporter.verify();
        console.log('✅ Conexión Gmail OK');
    } catch (err) {
        console.error('❌ Error conectando a Gmail:', err.message);
        process.exit(1);
    }

    console.log('📋 Obteniendo usuarios verificados...');

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, nombre, email, email_verified')
        .eq('email_verified', true)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Error consultando usuarios:', error.message);
        process.exit(1);
    }

    if (!users || users.length === 0) {
        console.log('⚠️  No hay usuarios verificados.');
        process.exit(0);
    }

    console.log(`✅ ${users.length} usuario(s) encontrado(s). Iniciando envío...\n`);

    let enviados = 0;
    let fallidos  = 0;

    for (const user of users) {
        try {
            await sendEmail(user.email, user.nombre);
            console.log(`✅ [${enviados + fallidos + 1}/${users.length}] ${user.email}`);
            enviados++;
        } catch (err) {
            console.error(`❌ [${enviados + fallidos + 1}/${users.length}] ${user.email} — ${err.message}`);
            fallidos++;
        }

        // 800ms entre envíos para no activar límites de Gmail
        if (enviados + fallidos < users.length) {
            await sleep(800);
        }
    }

    console.log(`\n📊 Resultado: ${enviados} enviados, ${fallidos} fallidos de ${users.length} total.`);
}

main();

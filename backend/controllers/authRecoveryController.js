// backend/controllers/authRecoveryController.js
import crypto from 'crypto';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { sendRecoveryEmail } from '../utils/emailService.js';
import { hashPassword } from '../utils/security.js';

// ─── CONSTANTES DE SEGURIDAD ──────────────────────────────────────────────────
const CODE_EXPIRY_MINUTES  = 10;
const MAX_ATTEMPTS         = 5;
const RATE_LIMIT_MINUTES   = 15;  // No más de 1 código cada N minutos
const MAX_CODES_PER_USER   = 3;   // Máx códigos activos simultáneos (invalidar los anteriores)

// ─── UTILIDADES CRIPTOGRÁFICAS ────────────────────────────────────────────────

/** Genera un código numérico de 6 dígitos criptográficamente seguro */
function generateSecureCode() {
    // crypto.randomInt es seguro y no tiene modular bias
    const code = crypto.randomInt(100000, 999999);
    return String(code);
}

/** Hashea el código con SHA-256 (nunca guardar en texto plano) */
function hashCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

// ─── 1. SOLICITAR CÓDIGO ─────────────────────────────────────────────────────
/**
 * POST /api/auth/request-code
 * Body: { email }
 */
export const requestRecoveryCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Email inválido.' });
        }

        // 1. Buscar usuario por email (no revelar si existe o no → misma respuesta siempre)
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, nombre, email')
            .eq('email', email.toLowerCase().trim())
            .limit(1);

        if (userError) throw userError;

        // Respuesta genérica: no revela si el email existe (previene enumeración)
        const genericResponse = {
            success: true,
            message: 'Si el correo está registrado, recibirás un código en los próximos minutos.'
        };

        if (!users || users.length === 0) {
            return res.json(genericResponse);
        }

        const user = users[0];

        // 2. Rate limiting: ¿ya envió un código recientemente?
        const rateWindow = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();
        const { count: recentCount } = await supabase
            .from('password_resets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'password_reset')
            .eq('used', false)
            .gte('created_at', rateWindow);

        if (recentCount >= MAX_CODES_PER_USER) {
            return res.status(429).json({
                success: false,
                message: `Demasiados intentos. Espera ${RATE_LIMIT_MINUTES} minutos antes de solicitar otro código.`
            });
        }

        // 3. Invalidar códigos anteriores no usados de este usuario
        await supabaseAdmin
            .from('password_resets')
            .update({ used: true })
            .eq('user_id', user.id)
            .eq('type', 'password_reset')
            .eq('used', false);

        // 4. Generar código y guardar su HASH en la BD
        const code      = generateSecureCode();
        const codeHash  = hashCode(code);
        const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

        const { error: insertError } = await supabaseAdmin
            .from('password_resets')
            .insert({
                user_id:    user.id,
                token_hash: codeHash,
                expires_at: expiresAt,
                used:       false,
                type:       'password_reset',
                attempts:   0,
                code_hint:  code.substring(0, 2) // los 2 primeros dígitos (UX hint)
            });

        if (insertError) throw insertError;

        // 5. Enviar email (el código en texto plano, solo aquí)
        await sendRecoveryEmail(user.email, code, user.nombre);

        console.log(`📧 Código de recuperación enviado a: ${user.email} (ID: ${user.id})`);

        return res.json(genericResponse);

    } catch (error) {
        console.error('Error en requestRecoveryCode:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor. Intenta más tarde.' });
    }
};

// ─── 2. VERIFICAR CÓDIGO ──────────────────────────────────────────────────────
/**
 * POST /api/auth/verify-code
 * Body: { email, code }
 * Response: { success, userId, verificationToken, codeHint }
 */
export const verifyRecoveryCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email y código son requeridos.' });
        }

        // Solo 6 dígitos numéricos
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: 'El código debe ser de 6 dígitos numéricos.' });
        }

        // 1. Buscar usuario
        const { data: users } = await supabase
            .from('users')
            .select('id, nombre, email, role, level, coins, wood')
            .eq('email', email.toLowerCase().trim())
            .limit(1);

        if (!users || users.length === 0) {
            return res.status(400).json({ success: false, message: 'Código inválido o expirado.' });
        }

        const user = users[0];

        // 2. Buscar el registro de reset más reciente, no usado, no expirado
        const { data: resets, error: resetError } = await supabase
            .from('password_resets')
            .select('id, token_hash, expires_at, used, attempts')
            .eq('user_id', user.id)
            .eq('type', 'password_reset')
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (resetError) throw resetError;

        if (!resets || resets.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El código no existe, ya fue usado o expiró. Solicita uno nuevo.'
            });
        }

        const resetRecord = resets[0];

        // 3. Verificar límite de intentos (brute-force protection)
        if (resetRecord.attempts >= MAX_ATTEMPTS) {
            await supabaseAdmin
                .from('password_resets')
                .update({ used: true })
                .eq('id', resetRecord.id);

            return res.status(429).json({
                success: false,
                message: 'Demasiados intentos fallidos. El código fue invalidado. Solicita uno nuevo.'
            });
        }

        // 4. Comparar hash (timing-safe usando el hash, no comparación directa)
        const inputHash = hashCode(code);
        const isValid   = crypto.timingSafeEqual(
            Buffer.from(inputHash,             'hex'),
            Buffer.from(resetRecord.token_hash, 'hex')
        );

        if (!isValid) {
            // Incrementar intentos fallidos
            await supabaseAdmin
                .from('password_resets')
                .update({ attempts: resetRecord.attempts + 1 })
                .eq('id', resetRecord.id);

            const remaining = MAX_ATTEMPTS - (resetRecord.attempts + 1);
            return res.status(400).json({
                success: false,
                message: `Código incorrecto. ${remaining > 0 ? `Te quedan ${remaining} intentos.` : 'Código invalidado.'}`
            });
        }

        // 5. Código correcto: generar un token temporal de sesión (NO marcar como usado aún)
        //    Se marcará como usado cuando el usuario finalmente ejecute la acción (login/reset)
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Guardar el token temporal en el registro (reutilizamos code_hint para almacenarlo)
        // En producción podrías usar una tabla separada o Redis
        await supabaseAdmin
            .from('password_resets')
            .update({ code_hint: verificationToken.substring(0, 40) })
            .eq('id', resetRecord.id);

        // 6. Respuesta exitosa con información mínima necesaria
        return res.json({
            success: true,
            message: 'Código verificado correctamente.',
            userId:             user.id,
            resetId:            resetRecord.id,
            verificationToken:  verificationToken.substring(0, 40)
        });

    } catch (error) {
        console.error('Error en verifyRecoveryCode:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// ─── 3a. INICIAR SESIÓN DIRECTO (post-verificación) ──────────────────────────
/**
 * POST /api/auth/recovery-login
 * Body: { userId, resetId, verificationToken }
 */
export const recoveryLogin = async (req, res) => {
    try {
        const { userId, resetId, verificationToken } = req.body;

        if (!userId || !resetId || !verificationToken) {
            return res.status(400).json({ success: false, message: 'Datos de verificación incompletos.' });
        }

        // 1. Validar que el reset existe, no fue usado, y el token temporal coincide
        const { data: resets } = await supabase
            .from('password_resets')
            .select('id, code_hint, used, expires_at')
            .eq('id', resetId)
            .eq('user_id', userId)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .limit(1);

        if (!resets || resets.length === 0) {
            return res.status(400).json({ success: false, message: 'Sesión de recuperación inválida o expirada.' });
        }

        const reset = resets[0];

        const tokenA = Buffer.from(reset.code_hint || '', 'utf8');
        const tokenB = Buffer.from(verificationToken.substring(0, 40), 'utf8');
        const tokenValid = tokenA.length === tokenB.length &&
            crypto.timingSafeEqual(tokenA, tokenB);
        if (!tokenValid) {
            return res.status(400).json({ success: false, message: 'Token de verificación inválido.' });
        }

        // 2. Marcar como usado (de un solo uso)
        await supabaseAdmin
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetId);

        // 3. Obtener datos del usuario para la sesión
        const { data: user } = await supabase
            .from('users')
            .select('id, nombre, level, coins, wood, role, foto')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        console.log(`✅ Inicio de sesión por recuperación: usuario ${user.nombre} (ID: ${user.id})`);

        return res.json({
            success: true,
            message: '¡Bienvenido de vuelta!',
            user: {
                id:     user.id,
                nombre: user.nombre,
                level:  user.level,
                coins:  user.coins,
                wood:   user.wood,
                foto:   user.foto,
                role:   user.role || 'user'
            }
        });

    } catch (error) {
        console.error('Error en recoveryLogin:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// ─── 3b. CAMBIAR CONTRASEÑA (post-verificación) ───────────────────────────────
/**
 * POST /api/auth/reset-password
 * Body: { userId, resetId, verificationToken, newPassword }
 */
export const resetPassword = async (req, res) => {
    try {
        const { userId, resetId, verificationToken, newPassword } = req.body;

        // 1. Validaciones de entrada
        if (!userId || !resetId || !verificationToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
        }

        if (newPassword.length < 6 || newPassword.length > 16) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener entre 6 y 16 caracteres.' });
        }

        // 2. Validar sesión de recuperación
        const { data: resets } = await supabase
            .from('password_resets')
            .select('id, code_hint, used, expires_at')
            .eq('id', resetId)
            .eq('user_id', userId)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .limit(1);

        if (!resets || resets.length === 0) {
            return res.status(400).json({ success: false, message: 'Sesión de recuperación inválida o expirada.' });
        }

        const reset = resets[0];

        const resetTokenA = Buffer.from(reset.code_hint || '', 'utf8');
        const resetTokenB = Buffer.from(verificationToken.substring(0, 40), 'utf8');
        const resetTokenValid = resetTokenA.length === resetTokenB.length &&
            crypto.timingSafeEqual(resetTokenA, resetTokenB);
        if (!resetTokenValid) {
            return res.status(400).json({ success: false, message: 'Token de verificación inválido.' });
        }

        // 3. Hash y actualizar contraseña
        const hashed = await hashPassword(newPassword);
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                password_hash:         hashed,
                failed_login_attempts: 0,
                locked_until:          null,
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 4. Marcar el código como USADO (de un solo uso, irreversible)
        await supabaseAdmin
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetId);

        // 5. Invalidar TODOS los códigos activos de este usuario (seguridad)
        await supabaseAdmin
            .from('password_resets')
            .update({ used: true })
            .eq('user_id', userId)
            .eq('used', false);

        console.log(`🔐 Contraseña cambiada exitosamente para usuario ID: ${userId}`);

        return res.json({
            success: true,
            message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
        });

    } catch (error) {
        console.error('Error en resetPassword:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};
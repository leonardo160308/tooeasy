// backend/controllers/authController.js
import { supabase, supabaseAdmin } from '../config/supabase.js';
import {
    hashPassword, comparePassword,
    generateCode, hashCode, safeCompare, generateSessionToken
} from '../utils/security.js';
import {
    sendVerificationEmail,
    sendRecoveryEmail,
    sendWelcomeEmail
} from '../utils/emailService.js';

// ── Constantes ────────────────────────────────────────────────────────────────
const CODE_EXPIRY_MINUTES  = 10;
const MAX_CODE_ATTEMPTS    = 5;
const MAX_CODES_PER_WINDOW = 3;    // máx 3 solicitudes cada 15 min
const RATE_WINDOW_MINUTES  = 15;
const MAX_LOGIN_ATTEMPTS   = 5;    // bloqueo temporal después de 5 fallos
const LOCK_MINUTES         = 15;

// ── Helper: crear y guardar un código ────────────────────────────────────────
async function createVerificationCode(userId, type) {
    // Invalidar códigos anteriores del mismo tipo
    await supabaseAdmin
        .from('verification_codes')
        .update({ used: true })
        .eq('user_id', userId)
        .eq('type', type)
        .eq('used', false);

    const code      = generateCode();
    const codeHash  = hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60_000).toISOString();

    const { error } = await supabaseAdmin
        .from('verification_codes')
        .insert({ user_id: userId, code_hash: codeHash, type, expires_at: expiresAt });

    if (error) throw error;
    return code; // Solo se retorna aquí para enviarlo por email
}

// ── Helper: verificar rate limit ──────────────────────────────────────────────
async function checkRateLimit(userId, type) {
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await supabase
        .from('verification_codes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', type)
        .gte('created_at', since);

    return count < MAX_CODES_PER_WINDOW;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. REGISTRO (con email verification)
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════════════════════════
export const registerUser = async (req, res) => {
    try {
        const { nombre, email, password, edad, genero } = req.body;

        // Validaciones básicas
        if (!nombre || !email || !password || edad === undefined) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
        }
        if (nombre.length < 3 || nombre.length > 16) {
            return res.status(400).json({ success: false, message: 'El nombre debe tener entre 3 y 16 caracteres.' });
        }
        if (password.length < 6 || password.length > 16) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener entre 6 y 16 caracteres.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Correo inválido.' });
        }
        const edadNum = Number(edad);
        if (!Number.isInteger(edadNum) || edadNum < 15 || edadNum > 99) {
            return res.status(400).json({ success: false, message: 'Edad inválida (15–99).' });
        }

        // Verificar si el email/nombre ya existe
        const { data: existing } = await supabase
            .from('users')
            .select('id, nombre, email')
            .or(`email.eq.${email.toLowerCase().trim()},nombre.eq.${nombre.trim()}`)
            .limit(1);

        if (existing && existing.length > 0) {
            const field = existing[0].email === email.toLowerCase().trim() ? 'correo' : 'nombre de usuario';
            return res.status(409).json({ success: false, message: `Ese ${field} ya está registrado.` });
        }

        // Hashear contraseña con bcrypt
        const hashedPassword = await hashPassword(password);

        // Crear usuario con email_verified = false
        const { data: newUser, error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
                nombre:         nombre.trim(),
                email:          email.toLowerCase().trim(),
                password_hash:  hashedPassword,
                edad:           edadNum,
                genero:         genero || 'no_especificado',
                email_verified: false,
                is_active:      true,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Generar y enviar código de verificación
        const code = await createVerificationCode(newUser.id, 'email_verification');
        await sendVerificationEmail(newUser.email, code, newUser.nombre);

        return res.status(201).json({
            success: true,
            message: 'Cuenta creada. Revisa tu correo para verificar tu cuenta.',
            userId:  newUser.id,
            // Indicar al frontend que debe verificar email antes de continuar
            requiresVerification: true,
        });

    } catch (error) {
        console.error('Error en registerUser:', error);
        return res.status(500).json({ success: false, message: 'Error al crear la cuenta.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. VERIFICAR EMAIL (post-registro)
// POST /api/auth/verify-email
// Body: { userId, code }
// ═══════════════════════════════════════════════════════════════════════════════
export const verifyEmail = async (req, res) => {
    try {
        const { userId, code } = req.body;
        if (!userId || !code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: 'Datos inválidos.' });
        }

        // Buscar código activo
        const { data: records } = await supabase
            .from('verification_codes')
            .select('id, code_hash, attempts, expires_at, used')
            .eq('user_id', userId)
            .eq('type', 'email_verification')
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (!records || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El código no existe o expiró. Solicita uno nuevo.',
                expired: true,
            });
        }

        const record = records[0];

        // Brute-force protection
        if (record.attempts >= MAX_CODE_ATTEMPTS) {
            await supabaseAdmin
                .from('verification_codes')
                .update({ used: true })
                .eq('id', record.id);
            return res.status(429).json({
                success: false,
                message: 'Demasiados intentos. Solicita un nuevo código.',
            });
        }

        // Comparar hash en tiempo constante
        const inputHash = hashCode(code);
        const isValid   = safeCompare(inputHash, record.code_hash);

        if (!isValid) {
            await supabaseAdmin
                .from('verification_codes')
                .update({ attempts: record.attempts + 1 })
                .eq('id', record.id);
            const remaining = MAX_CODE_ATTEMPTS - (record.attempts + 1);
            return res.status(400).json({
                success: false,
                message: `Código incorrecto. ${remaining > 0 ? `Te quedan ${remaining} intentos.` : 'Código invalidado.'}`,
            });
        }

        // Código válido — marcar código como usado y usuario como verificado
        await Promise.all([
            supabaseAdmin
                .from('verification_codes')
                .update({ used: true })
                .eq('id', record.id),
            supabaseAdmin
                .from('users')
                .update({ email_verified: true, email_verified_at: new Date().toISOString() })
                .eq('id', userId),
        ]);

        // Obtener datos del usuario para la sesión
        const { data: user } = await supabase
            .from('users')
            .select('id, nombre, level, coins, wood, foto, role')
            .eq('id', userId)
            .single();

        // Enviar email de bienvenida en segundo plano (no bloquear respuesta)
        sendWelcomeEmail(user.email || req.body.email, user.nombre).catch(console.error);

        return res.json({
            success: true,
            message: '¡Correo verificado! Bienvenido/a.',
            user: {
                id:     user.id,
                nombre: user.nombre,
                level:  user.level,
                coins:  user.coins,
                wood:   user.wood,
                foto:   user.foto,
                role:   user.role || 'user',
            },
        });

    } catch (error) {
        console.error('Error en verifyEmail:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. REENVIAR CÓDIGO DE VERIFICACIÓN
// POST /api/auth/resend-verification
// Body: { userId }
// ═══════════════════════════════════════════════════════════════════════════════
export const resendVerificationCode = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'userId requerido.' });

        const { data: user } = await supabase
            .from('users')
            .select('id, nombre, email, email_verified')
            .eq('id', userId)
            .single();

        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        if (user.email_verified) {
            return res.status(400).json({ success: false, message: 'El correo ya está verificado.' });
        }

        const withinLimit = await checkRateLimit(userId, 'email_verification');
        if (!withinLimit) {
            return res.status(429).json({
                success: false,
                message: `Demasiados intentos. Espera ${RATE_WINDOW_MINUTES} minutos.`,
            });
        }

        const code = await createVerificationCode(userId, 'email_verification');
        await sendVerificationEmail(user.email, code, user.nombre);

        return res.json({ success: true, message: 'Nuevo código enviado a tu correo.' });

    } catch (error) {
        console.error('Error en resendVerificationCode:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LOGIN (con verificación de email_verified)
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════════════════════════
export const loginUser = async (req, res) => {
    try {
        const { nombre, password } = req.body;
        if (!nombre || !password) {
            return res.status(400).json({ success: false, message: 'Nombre y contraseña requeridos.' });
        }

        const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('nombre', nombre.trim())
            .limit(1);

        const user = users?.[0];

        // Respuesta genérica para no revelar si el usuario existe
        if (!user || !user.is_active) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        // Verificar bloqueo temporal (brute-force protection)
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const minutosRestantes = Math.ceil(
                (new Date(user.locked_until) - new Date()) / 60_000
            );
            return res.status(429).json({
                success: false,
                message: `Cuenta bloqueada temporalmente. Intenta en ${minutosRestantes} minutos.`,
            });
        }

        // Verificar contraseña
        const passwordOk = await comparePassword(password, user.password_hash);

        if (!passwordOk) {
            // Incrementar intentos fallidos
            const newAttempts = (user.failed_login_attempts || 0) + 1;
            const updateData  = { failed_login_attempts: newAttempts };

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                updateData.locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
                updateData.failed_login_attempts = 0;
            }

            await supabaseAdmin.from('users').update(updateData).eq('id', user.id);

            const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
            return res.status(401).json({
                success: false,
                message: remaining > 0
                    ? `Credenciales incorrectas. ${remaining} intentos restantes.`
                    : `Cuenta bloqueada ${LOCK_MINUTES} minutos por seguridad.`,
            });
        }

        // ── Verificar si el email está confirmado ──────────────────────────
        if (!user.email_verified) {
            return res.status(403).json({
                success:             false,
                message:             'Debes verificar tu correo antes de iniciar sesión.',
                requiresVerification: true,
                userId:              user.id,
            });
        }

        // Login exitoso — resetear intentos fallidos
        await supabaseAdmin
            .from('users')
            .update({
                failed_login_attempts: 0,
                locked_until:          null,
                last_login_at:         new Date().toISOString(),
            })
            .eq('id', user.id);

        return res.json({
            success: true,
            message: 'Bienvenido/a.',
            user: {
                id:     user.id,
                nombre: user.nombre,
                level:  user.level,
                coins:  user.coins,
                wood:   user.wood,
                foto:   user.foto,
                role:   user.role || 'user',
            },
        });

    } catch (error) {
        console.error('Error en loginUser:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SOLICITAR CÓDIGO DE RECUPERACIÓN
// POST /api/auth/request-recovery
// Body: { email }
// ═══════════════════════════════════════════════════════════════════════════════
export const requestRecoveryCode = async (req, res) => {
    // Respuesta genérica siempre — no revelar si el email existe (previene enumeración)
    const genericOk = {
        success: true,
        message: 'Si el correo está registrado, recibirás un código en los próximos minutos.',
    };

    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Email inválido.' });
        }

        const { data: users } = await supabase
            .from('users')
            .select('id, nombre, email, is_active')
            .eq('email', email.toLowerCase().trim())
            .limit(1);

        if (!users?.length || !users[0].is_active) {
            return res.json(genericOk); // No revelar que no existe
        }

        const user = users[0];

        const withinLimit = await checkRateLimit(user.id, 'password_reset');
        if (!withinLimit) {
            return res.status(429).json({
                success: false,
                message: `Demasiados intentos. Espera ${RATE_WINDOW_MINUTES} minutos.`,
            });
        }

        const code = await createVerificationCode(user.id, 'password_reset');

        try {
            await sendRecoveryEmail(user.email, code, user.nombre);
        } catch (emailError) {
            // Si falla el email, borrar el código para no dejarlo huérfano
            await supabaseAdmin
                .from('verification_codes')
                .update({ used: true })
                .eq('user_id', user.id)
                .eq('type', 'password_reset')
                .eq('used', false);
            return res.status(500).json({
                success: false,
                message: 'No se pudo enviar el correo. Intenta más tarde.',
            });
        }

        return res.json(genericOk);

    } catch (error) {
        console.error('Error en requestRecoveryCode:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. VERIFICAR CÓDIGO DE RECUPERACIÓN
// POST /api/auth/verify-recovery-code
// Body: { email, code }
// Response: { sessionToken, userId, resetId }
// ═══════════════════════════════════════════════════════════════════════════════
export const verifyRecoveryCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: 'Datos inválidos.' });
        }

        const { data: users } = await supabase
            .from('users')
            .select('id, nombre, email')
            .eq('email', email.toLowerCase().trim())
            .limit(1);

        if (!users?.length) {
            return res.status(400).json({ success: false, message: 'Código inválido o expirado.' });
        }
        const user = users[0];

        const { data: records } = await supabase
            .from('verification_codes')
            .select('id, code_hash, attempts')
            .eq('user_id', user.id)
            .eq('type', 'password_reset')
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (!records?.length) {
            return res.status(400).json({
                success: false,
                message: 'El código no existe, ya fue usado o expiró.',
                expired: true,
            });
        }

        const record = records[0];

        if (record.attempts >= MAX_CODE_ATTEMPTS) {
            await supabaseAdmin
                .from('verification_codes')
                .update({ used: true })
                .eq('id', record.id);
            return res.status(429).json({
                success: false,
                message: 'Código invalidado por demasiados intentos.',
            });
        }

        const isValid = safeCompare(hashCode(code), record.code_hash);

        if (!isValid) {
            const newAttempts = record.attempts + 1;
            await supabaseAdmin
                .from('verification_codes')
                .update({ attempts: newAttempts })
                .eq('id', record.id);
            const remaining = MAX_CODE_ATTEMPTS - newAttempts;
            return res.status(400).json({
                success: false,
                message: `Código incorrecto. ${remaining > 0 ? `${remaining} intentos restantes.` : 'Código invalidado.'}`,
            });
        }

        // Código correcto — generar session token temporal (no marcar como usado todavía)
        const sessionToken = generateSessionToken();

        // Guardar el token hasheado en el registro para validar el siguiente paso
        await supabaseAdmin
            .from('verification_codes')
            .update({ code_hash: hashCode(sessionToken) }) // reutilizar el campo
            .eq('id', record.id);

        return res.json({
            success:      true,
            message:      'Código verificado.',
            userId:       user.id,
            resetId:      record.id,
            sessionToken,                   // el frontend lo guarda en memoria
        });

    } catch (error) {
        console.error('Error en verifyRecoveryCode:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CAMBIAR CONTRASEÑA (post-verificación)
// POST /api/auth/reset-password
// Body: { userId, resetId, sessionToken, newPassword }
// ═══════════════════════════════════════════════════════════════════════════════
export const resetPassword = async (req, res) => {
    try {
        const { userId, resetId, sessionToken, newPassword } = req.body;

        if (!userId || !resetId || !sessionToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
        }
        if (newPassword.length < 6 || newPassword.length > 16) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener entre 6 y 16 caracteres.' });
        }

        // Validar session token
        const { data: records } = await supabase
            .from('verification_codes')
            .select('id, code_hash, expires_at, used')
            .eq('id', resetId)
            .eq('user_id', userId)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .limit(1);

        if (!records?.length) {
            return res.status(400).json({ success: false, message: 'Sesión de recuperación inválida o expirada.' });
        }

        const isValidToken = safeCompare(hashCode(sessionToken), records[0].code_hash);
        if (!isValidToken) {
            return res.status(400).json({ success: false, message: 'Token inválido.' });
        }

        // Todo ok — hashear nueva contraseña y guardar
        const hashedNewPassword = await hashPassword(newPassword);

        await Promise.all([
            supabaseAdmin
                .from('users')
                .update({
                    password_hash:         hashedNewPassword,
                    failed_login_attempts: 0,       // resetear bloqueos
                    locked_until:          null,
                })
                .eq('id', userId),
            // Invalidar TODOS los códigos activos del usuario (seguridad)
            supabaseAdmin
                .from('verification_codes')
                .update({ used: true })
                .eq('user_id', userId)
                .eq('used', false),
        ]);

        console.log(`🔐 Contraseña cambiada: usuario ID ${userId}`);

        return res.json({
            success: true,
            message: 'Contraseña actualizada. Ya puedes iniciar sesión.',
        });

    } catch (error) {
        console.error('Error en resetPassword:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};
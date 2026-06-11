// backend/utils/security.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_ROUNDS = 12; // ~250ms por hash — buen balance seguridad/velocidad

// ── Contraseñas ──────────────────────────────────────────────────────────────

export async function hashPassword(plainText) {
    return bcrypt.hash(plainText, BCRYPT_ROUNDS);
}

export async function comparePassword(plainText, hash) {
    // Todos los hashes nuevos son bcrypt. Si por alguna razón legacy existe texto plano,
    // comparamos con timingSafeEqual para evitar timing attacks.
    if (!hash.startsWith('$2b$') && !hash.startsWith('$2a$')) {
        const bufA = Buffer.from(plainText);
        const bufB = Buffer.from(hash);
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
    }
    return bcrypt.compare(plainText, hash);
}

// ── Códigos de verificación ──────────────────────────────────────────────────

export function generateCode() {
    // crypto.randomInt no tiene modular bias → distribución uniforme
    return String(crypto.randomInt(100000, 999999));
}

export function hashCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

export function safeCompare(a, b) {
    // Comparación en tiempo constante → previene timing attacks
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

// ── HIBP — verificar contraseñas filtradas (k-anonymity) ─────────────────────
// Fail open: si la API no responde, no bloquea al usuario.

export async function checkPwnedPassword(password) {
    try {
        const sha1   = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
        const prefix = sha1.slice(0, 5);
        const suffix = sha1.slice(5);

        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: { 'Add-Padding': 'true', 'User-Agent': 'TooEasy-AuthCheck/1.0' },
            signal:  AbortSignal.timeout(3000),
        });
        if (!res.ok) return false;

        const text = await res.text();
        return text.split('\n').some(line => line.split(':')[0].trim() === suffix);
    } catch {
        return false;
    }
}

// ── Token de sesión post-verificación (recovery) ────────────────────────────

export function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// ── Session tokens HMAC firmados (login/auth) ────────────────────────────────
// Formato interno: userId.issuedAt.hmacSignature   (codificado en base64url)
// La clave se deriva del SUPABASE_SERVICE_ROLE_KEY para no requerir env var extra.

const _rawSecret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SESSION_HMAC_KEY = crypto
    .createHmac('sha256', 'tooeasy-session-v1')
    .update(_rawSecret)
    .digest('hex');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export function createSessionToken(userId) {
    const payload = `${userId}.${Date.now()}`;
    const sig = crypto.createHmac('sha256', SESSION_HMAC_KEY).update(payload).digest('hex');
    return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

// Retorna el userId (número) si el token es válido, o null si no lo es.
export function verifySessionToken(token) {
    if (!token) return null;
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const dotLast = decoded.lastIndexOf('.');
        if (dotLast === -1) return null;

        const sig     = decoded.slice(dotLast + 1);
        const payload = decoded.slice(0, dotLast);

        // Verificar firma en tiempo constante
        const expectedSig = crypto
            .createHmac('sha256', SESSION_HMAC_KEY)
            .update(payload)
            .digest('hex');
        const bufA = Buffer.from(sig,         'hex');
        const bufB = Buffer.from(expectedSig, 'hex');
        if (bufA.length !== bufB.length) return null;
        if (!crypto.timingSafeEqual(bufA, bufB)) return null;

        // Verificar expiración
        const dotFirst   = payload.indexOf('.');
        const userIdStr  = payload.slice(0, dotFirst);
        const issuedAt   = parseInt(payload.slice(dotFirst + 1), 10);
        if (isNaN(issuedAt) || Date.now() - issuedAt > SESSION_TTL_MS) return null;

        return { userId: Number(userIdStr), issuedAt };
    } catch {
        return null;
    }
}
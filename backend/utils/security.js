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

// ── Token de sesión post-verificación ────────────────────────────────────────

export function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}
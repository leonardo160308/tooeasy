// backend/utils/turnstile.js
// Verificación server-side de Cloudflare Turnstile
// Si TURNSTILE_SECRET_KEY no está definido (entorno local sin configurar), pasa sin verificar.

export async function verifyTurnstile(token, ip) {
    if (!process.env.TURNSTILE_SECRET_KEY) {
        console.warn('[Turnstile] TURNSTILE_SECRET_KEY no definido — verificación omitida en desarrollo.');
        return true;
    }
    if (!token) return false;

    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                secret:   process.env.TURNSTILE_SECRET_KEY,
                response: token,
                remoteip: ip,
            }),
            signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        return data.success === true;
    } catch (err) {
        console.error('[Turnstile] Error verificando token:', err.message);
        return false;
    }
}

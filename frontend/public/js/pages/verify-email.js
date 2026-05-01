import { mostrarAlerta, alertaExito, alertaError, alertaInfo } from '../modules/alerts.js';
import { saveAuthData } from '../modules/auth.js';

const API = '/api';

const userId = sessionStorage.getItem('pendingVerificationUserId');

if (!userId) {
    alertaError('No hay una verificación pendiente. Redirigiendo...', {
        duration: 3000,
        onClose: () => { window.location.href = '/login.html'; }
    });
    setTimeout(() => { window.location.href = '/login.html'; }, 3000);
}

const emailBadge = document.getElementById('email-badge');
const savedEmail = sessionStorage.getItem('pendingVerificationEmail') || 'tu correo';
emailBadge.textContent = savedEmail;

let timerInterval = null;

function startTimer(minutes = 10) {
    clearInterval(timerInterval);
    let seconds = minutes * 60;
    const display   = document.getElementById('timer-count');
    const timerEl   = document.getElementById('timer-display');
    const resendBtn = document.getElementById('btn-resend');

    timerInterval = setInterval(() => {
        seconds--;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

        if (seconds <= 60) timerEl.classList.add('expired');

        if (seconds <= 0) {
            clearInterval(timerInterval);
            display.textContent = '00:00';
            resendBtn.disabled  = false;
            timerEl.innerHTML   = 'El código ha <span>expirado</span>. Solicita uno nuevo.';
        }
    }, 1000);
}

startTimer(10);

const inputs = document.querySelectorAll('.otp-input');

inputs.forEach((inp, i) => {
    inp.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '');
        if (e.target.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) inputs[i - 1].focus();
    });
    inp.addEventListener('paste', e => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
        inputs.forEach((inp2, j) => { inp2.value = text[j] || ''; });
        if (text.length === 6) inputs[5].focus();
    });
});

inputs[0].focus();

function getCode() {
    return Array.from(inputs).map(i => i.value).join('');
}

async function verifyCode() {
    const code = getCode();
    if (code.length !== 6) {
        alertaError('Ingresa los 6 dígitos del código.');
        return;
    }

    const btn = document.getElementById('btn-verify');
    btn.disabled    = true;
    btn.textContent = 'Verificando...';

    try {
        const res  = await fetch(`${API}/auth/verify-email`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId, code })
        });
        const data = await res.json();

        if (data.success) {
            clearInterval(timerInterval);
            sessionStorage.removeItem('pendingVerificationUserId');
            sessionStorage.removeItem('pendingVerificationEmail');

            saveAuthData(data.user);

            document.getElementById('verify-view').style.display  = 'none';
            document.getElementById('success-view').style.display = 'block';

            alertaExito('¡Correo verificado! Bienvenido/a.', { duration: 3000 });

            setTimeout(() => { window.location.href = '/dashboard.html'; }, 3000);

        } else if (data.expired) {
            alertaError('El código expiró. Solicita uno nuevo.');
            inputs.forEach(i => i.classList.add('error'));
            setTimeout(() => inputs.forEach(i => i.classList.remove('error')), 1500);
            document.getElementById('btn-resend').disabled = false;

        } else {
            alertaError(data.message || 'Código incorrecto.');
            inputs.forEach(i => { i.classList.add('error'); i.value = ''; });
            setTimeout(() => inputs.forEach(i => i.classList.remove('error')), 1500);
            inputs[0].focus();
        }

    } catch {
        alertaError('Error de conexión. Intenta de nuevo.');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Verificar código';
    }
}

async function resendCode() {
    const btn = document.getElementById('btn-resend');
    btn.disabled    = true;
    btn.textContent = 'Enviando...';

    try {
        const res  = await fetch(`${API}/auth/resend-verification`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId })
        });
        const data = await res.json();

        if (data.success) {
            alertaInfo('Nuevo código enviado. Revisa tu correo.', { duration: 4000 });
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
            document.getElementById('timer-display').classList.remove('expired');
            startTimer(10);
        } else {
            alertaError(data.message || 'No se pudo reenviar el código.');
            btn.disabled = false;
        }

    } catch {
        alertaError('Error al reenviar. Intenta de nuevo.');
        btn.disabled = false;
    }

    btn.textContent = 'Reenviar código';
}

// ── Wire up event listeners ───────────────────────────────────────────────────
document.getElementById('btn-verify').addEventListener('click', verifyCode);
document.getElementById('btn-resend').addEventListener('click', resendCode);
document.querySelector('#verify-view .btn-link').addEventListener('click', () => {
    window.location.href = 'login.html';
});
document.querySelector('#success-view .btn-primary').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
});

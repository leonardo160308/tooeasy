import { mostrarAlerta, alertaExito, alertaError, alertaInfo } from '../modules/alerts.js';
import { saveAuthData } from '../modules/auth.js';

const API = '/api';

let state = {
    email: '',
    userId: null,
    resetId: null,
    verificationToken: null
};

let timerInterval = null;

function startTimer(minutes = 10) {
    clearInterval(timerInterval);
    let seconds = minutes * 60;
    const display = document.getElementById('timer-count');
    const timerEl = document.getElementById('timer-display');
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
            resendBtn.disabled = false;
            timerEl.innerHTML = 'El código ha <span>expirado</span>. Solicita uno nuevo.';
        }
    }, 1000);
}

function goToStep(n) {
    document.querySelectorAll('.step').forEach((s, i) => {
        s.classList.toggle('active', i + 1 === n);
    });
}

function initOtpInputs() {
    const inputs = document.querySelectorAll('.otp-input');
    inputs.forEach((inp, i) => {
        inp.value = '';
        inp.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/\D/g, '');
            if (e.target.value && i < inputs.length - 1) inputs[i + 1].focus();
        });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !e.target.value && i > 0) inputs[i - 1].focus();
            if (e.key === 'Enter') {
                const btn = document.querySelector('#step-2 .btn-primary');
                if (getOtpValue().length === 6 && !btn.disabled) verifyCode();
            }
        });
        inp.addEventListener('paste', e => {
            e.preventDefault();
            const text = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
            inputs.forEach((inp2, j) => { inp2.value = text[j] || ''; });
            if (text.length === 6) inputs[5].focus();
        });
    });
    inputs[0].focus();
}

function getOtpValue() {
    return Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');
}

async function sendCode() {
    const email = document.getElementById('input-email').value.trim();
    if (!email) return alertaError('Ingresa tu correo electrónico.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return alertaError('El formato del correo no es válido.');

    state.email = email;

    const btn = document.querySelector('#step-1 .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch(`${API}/auth/request-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('display-email').textContent = email;
            goToStep(2);
            startTimer(10);
            initOtpInputs();
            alertaInfo('Código enviado. Revisa tu bandeja de entrada.', { duration: 4000 });
        } else {
            alertaError(data.message);
        }
    } catch {
        alertaError('Error de conexión. Verifica el servidor.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar código';
    }
}

async function verifyCode() {
    const code = getOtpValue();
    if (code.length !== 6) return alertaError('Ingresa los 6 dígitos del código.');

    const btn = document.querySelector('#step-2 .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
        const res = await fetch(`${API}/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: state.email, code })
        });
        const data = await res.json();

        if (data.success) {
            state.userId            = data.userId;
            state.resetId           = data.resetId;
            state.verificationToken = data.verificationToken;
            clearInterval(timerInterval);
            goToStep(3);
        } else {
            alertaError(data.message);
            document.querySelectorAll('.otp-input').forEach(i => {
                i.classList.add('otp-error');
                setTimeout(() => i.classList.remove('otp-error'), 1500);
            });
        }
    } catch {
        alertaError('Error de conexión.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Verificar código';
    }
}

async function resendCode() {
    const btn = document.getElementById('btn-resend');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch(`${API}/auth/request-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: state.email })
        });
        const data = await res.json();

        if (data.success) {
            alertaInfo('Nuevo código enviado.');
            startTimer(10);
            document.querySelectorAll('.otp-input').forEach(i => i.value = '');
            document.querySelector('.otp-input').focus();
            document.getElementById('timer-display').classList.remove('expired');
        } else {
            alertaError(data.message);
            btn.disabled = false;
        }
    } catch {
        alertaError('Error al reenviar.');
        btn.disabled = false;
    }
    btn.textContent = 'Reenviar código';
}

async function doLogin() {
    try {
        const res = await fetch(`${API}/auth/recovery-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId:            state.userId,
                resetId:           state.resetId,
                verificationToken: state.verificationToken
            })
        });
        const data = await res.json();

        if (data.success) {
            saveAuthData(data.user);
            alertaExito('¡Bienvenido! Redirigiendo...', { duration: 1500 });
            setTimeout(() => window.location.href = '/dashboard.html', 1500);
        } else {
            alertaError(data.message);
        }
    } catch {
        alertaError('Error de conexión.');
    }
}

function checkStrength(pwd) {
    const fill = document.getElementById('strength-fill');
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    const colors = ['#e53e3e','#dd6b20','#d69e2e','#38a169','#27ae60'];
    const widths = [20, 40, 60, 80, 100];
    fill.style.width      = (widths[strength - 1] || 0) + '%';
    fill.style.background = colors[strength - 1] || 'transparent';
}

function togglePass(id, btn) {
    const inp = document.getElementById(id);
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.classList.toggle('active', inp.type === 'text');
}

async function changePassword() {
    const newPassword     = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!newPassword || !confirmPassword) return alertaError('Completa ambos campos.');
    if (newPassword.length < 6 || newPassword.length > 16)
        return alertaError('La contraseña debe tener entre 6 y 16 caracteres.');
    if (newPassword !== confirmPassword)
        return alertaError('Las contraseñas no coinciden.');

    const btn = document.querySelector('#step-4 .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const res = await fetch(`${API}/auth/recovery-reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId:            state.userId,
                resetId:           state.resetId,
                verificationToken: state.verificationToken,
                newPassword
            })
        });
        const data = await res.json();

        if (data.success) {
            goToStep(5);
        } else {
            alertaError(data.message);
        }
    } catch {
        alertaError('Error de conexión.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar contraseña';
    }
}

// ── Wire up event listeners ───────────────────────────────────────────────────
document.querySelector('#step-1 .btn-primary').addEventListener('click', sendCode);

document.getElementById('input-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const btn = document.querySelector('#step-1 .btn-primary');
        if (!btn.disabled) sendCode();
    }
});

document.querySelector('#step-2 .btn-primary').addEventListener('click', verifyCode);
document.getElementById('btn-resend').addEventListener('click', resendCode);
document.querySelector('#step-2 .btn-back').addEventListener('click', () => goToStep(1));
document.querySelectorAll('.action-card')[0].addEventListener('click', doLogin);
document.querySelectorAll('.action-card')[1].addEventListener('click', () => goToStep(4));
document.getElementById('new-password').addEventListener('input', e => checkStrength(e.target.value));
document.querySelectorAll('.toggle-pass')[0].addEventListener('click', function() { togglePass('new-password', this); });
document.querySelectorAll('.toggle-pass')[1].addEventListener('click', function() { togglePass('confirm-password', this); });
document.querySelector('#step-4 .btn-primary').addEventListener('click', changePassword);

['new-password', 'confirm-password'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const btn = document.querySelector('#step-4 .btn-primary');
            if (!btn.disabled) changePassword();
        }
    });
});

document.querySelector('#step-4 .btn-back').addEventListener('click', () => goToStep(3));
document.querySelector('#step-5 .btn-primary').addEventListener('click', () => { window.location.href = 'login.html'; });

import { protectRoute, getAuthData } from '../modules/auth.js';
import { getUserData, getChallengesStatus, getChallengesProgress, completeChallenge } from '../modules/api.js';
import { challengesData } from '../data/challenges.js';
import { alertaExito, alertaError, alertaInfo } from '../modules/alerts.js';

document.addEventListener('DOMContentLoaded', async () => {

    if (!protectRoute()) return;
    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    const challengesContainer = document.getElementById('challenges-container');

    let completedChallengesIds = [];
    let challengeProgress = {};

    // ─── ACTUALIZAR MADERA EN PANTALLA ────────────────────────────────────
    async function updateWoodDisplay() {
        try {
            const userData = await getUserData(userId);
            const woodEl = document.getElementById('wood-count');
            if (woodEl) woodEl.textContent = userData.wood ?? 0;
        } catch (e) {
            console.error('Error actualizando madera:', e);
        }
    }

    // ─── CARGAR ESTADO DE RETOS ───────────────────────────────────────────
    async function fetchChallengesData() {
        try {
            const [statusRes, progressRes] = await Promise.all([
                getChallengesStatus(userId),
                getChallengesProgress(userId)
            ]);
            completedChallengesIds = statusRes.completedIds || [];
            challengeProgress = progressRes.progress || {};
        } catch (error) {
            console.error('Error al cargar estado de retos:', error);
        }
    }

    // ─── RENDERIZAR TARJETAS ──────────────────────────────────────────────
    function renderChallenges() {
        if (!challengesContainer) return;
        challengesContainer.innerHTML = '';

        challengesData.forEach(challenge => {
            const isCompleted = completedChallengesIds.includes(challenge.id);
            const prog = challengeProgress[challenge.id] || { current: 0, required: 1, percentage: 0 };

            const percentage = isCompleted ? 100 : prog.percentage;
            const canClaim   = percentage >= 100 && !isCompleted;

            let btnText     = isCompleted ? '✓ Reclamado' : (canClaim ? 'Reclamar' : 'En progreso');
            let btnClass    = isCompleted ? 'btn-claim claimed' : (canClaim ? 'btn-claim ready' : 'btn-claim');
            let btnDisabled = isCompleted || !canClaim;

            let progressLabel;
            if (isCompleted) {
                progressLabel = '100%';
            } else if (prog.required > 1) {
                progressLabel = `${prog.current} / ${prog.required}`;
            } else {
                progressLabel = `${percentage}%`;
            }

            const card = document.createElement('div');
            card.classList.add('challenge-card');
            if (isCompleted) card.classList.add('completed');
            if (canClaim)    card.classList.add('claimable');

            card.innerHTML = `
                <div class="card-top-row">
                    <h3>${challenge.title}</h3>
                    <button
                        class="${btnClass}"
                        data-challenge-id="${challenge.id}"
                        ${btnDisabled ? 'disabled' : ''}
                    >${btnText}</button>
                </div>

                <p class="card-desc">${challenge.description}</p>

                <div class="progress-row">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${percentage}%; transition: width 0.8s ease;"></div>
                    </div>
                    <span class="progress-text" style="color:#fff; font-weight:bold; min-width:60px; text-align:right;">
                        ${progressLabel}
                    </span>
                    <div class="reward-pill">
                        <img src="../public/img/madera.png" alt="Madera" class="reward-icon">
                        <span>${challenge.reward_wood}</span>
                    </div>
                </div>
            `;

            challengesContainer.appendChild(card);
        });

        document.querySelectorAll('.btn-claim.ready[data-challenge-id]').forEach(button => {
            button.addEventListener('click', handleCompleteChallenge);
        });
    }

    // ─── MANEJAR RECLAMACIÓN ──────────────────────────────────────────────
    async function handleCompleteChallenge(event) {
        const button = event.target;
        const challengeId = parseInt(button.dataset.challengeId);

        const originalText = button.textContent;
        button.disabled    = true;
        button.textContent = '⏳';

        alertaInfo('Verificando progreso del reto...', { duration: 2000 });

        try {
            const result = await completeChallenge(userId, challengeId);

            if (result.success) {
                button.textContent       = '✓';
                button.style.borderColor = '#27ae60';
                button.style.color       = '#27ae60';

                alertaExito(result.message || '¡Reto completado!', {
                    title: '🎉 ¡Felicidades!',
                    duration: 4000
                });

                // Actualizar madera y retos con datos frescos
                await Promise.all([
                    updateWoodDisplay(),
                    fetchChallengesData()
                ]);
                renderChallenges();

            } else {
                alertaError(result.message || 'No cumples los requisitos del reto.', {
                    title: 'Reto incompleto',
                    duration: 5000
                });
                button.disabled    = false;
                button.textContent = originalText;
            }
        } catch (error) {
            console.error('Error:', error);
            alertaError('Error de conexión. Intenta nuevamente.');
            button.disabled    = false;
            button.textContent = originalText;
        }
    }

    // ─── INICIALIZAR ──────────────────────────────────────────────────────
    await Promise.all([
        fetchChallengesData(),
        updateWoodDisplay()
    ]);
    renderChallenges();
});
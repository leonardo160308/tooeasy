import { protectRoute, getAuthData } from '../modules/auth.js';
import { getChallengesStatus, completeChallenge } from '../modules/api.js'; 
import { challengesData } from '../data/challenges.js';
import { alertaExito, alertaError, alertaInfo } from '../modules/alerts.js';
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Seguridad
    if (!protectRoute()) return;
    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    const challengesContainer = document.getElementById('challenges-container');

    // 2. Obtener estado de retos (IDs completados)
    let completedChallengesIds = [];

    async function fetchChallengesStatus() {
        try {
            const response = await getChallengesStatus(userId);
            completedChallengesIds = response.completedIds || [];
            // Opcional: Si tu API devuelve el progreso actual (ej: 5/10), guárdalo aquí también.
        } catch (error) {
            console.error("Error al cargar el estado de retos:", error);
        }
    }

    // 3. Renderizar los Retos (AQUÍ ESTÁ EL CAMBIO VISUAL)
    function renderChallenges() {
        if (!challengesContainer) return;
        challengesContainer.innerHTML = '';

        challengesData.forEach(challenge => {
            const isCompleted = completedChallengesIds.includes(challenge.id);
            
            // --- Lógica de Progreso ---
            // Si tu backend aún no envía el progreso numérico (ej: "llevas 3 de 5"),
            // simularemos: 100% si está completado, 0% (o un valor fijo) si no.
            // En el futuro, cambia esto por: let currentProgress = challenge.userProgress || 0;
            let percentage = isCompleted ? 100 : (challenge.initialProgress || 0); 

            // Determinar texto y estado del botón
            let btnText = isCompleted ? 'Reclamado' : 'Reclamar';
            let btnClass = isCompleted ? 'btn-claim claimed' : 'btn-claim';
            let disabledAttr = isCompleted ? 'disabled' : '';

            const card = document.createElement('div');
            card.classList.add('challenge-card');
            if(isCompleted) card.classList.add('completed');

            // --- HTML NUEVO (Ajustado al CSS del diseño) ---
            card.innerHTML = `
                <div class="card-top-row">
                    <h3>${challenge.title}</h3>
                    <button 
                        class="${btnClass}" 
                        data-challenge-id="${challenge.id}" 
                        ${disabledAttr}
                    >
                        ${btnText}
                    </button>
                </div>

                <p class="card-desc">${challenge.description}</p>
                
                <div class="progress-row">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="progress-text" style="color: #333; font-weight:bold;">${percentage}%</span>
                    
                    <div class="reward-pill">
                        🪵 ${challenge.reward_wood}
                    </div>
                </div>
            `;
            
            challengesContainer.appendChild(card);
        });
        
        // 4. Asignar Eventos (Usando la nueva clase .btn-claim)
        document.querySelectorAll('.btn-claim[data-challenge-id]').forEach(button => {
            if (!button.disabled) {
                button.addEventListener('click', handleCompleteChallenge);
            }
        });
    }
    
    // 5. Manejar la Acción de Completar
async function handleCompleteChallenge(event) {
    const button = event.target;
    const challengeId = parseInt(button.dataset.challengeId);
    
    // UI Feedback inmediato
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "⏳";

    // ✅ Alerta de verificación
    alertaInfo('Verificando progreso del reto...', { duration: 2000 });

    try {
        const result = await completeChallenge(userId, challengeId); 
        
        if (result.success) {
            // ✅ Éxito con animación
            button.textContent = "✓";
            button.style.borderColor = "#27ae60";
            button.style.color = "#27ae60";
            
            // ✅ Alerta de recompensa ganada
            const mensaje = result.message || '¡Reto completado!';
            alertaExito(mensaje, {
                title: '🎉 ¡Felicidades!',
                duration: 4000
            });

            // Recargar estado
            await fetchChallengesStatus(); 
            
            // Animar barra de progreso
            const card = button.closest('.challenge-card');
            const progressBar = card.querySelector('.progress-fill');
            const progressText = card.querySelector('.progress-text');
            if(progressBar) {
                progressBar.style.transition = 'width 0.8s ease';
                progressBar.style.width = '100%';
            }
            if(progressText) progressText.textContent = '100%';

        } else {
            // ✅ Mostrar requisito faltante
            alertaError(result.message || 'No cumples los requisitos del reto.', {
                title: 'Reto incompleto',
                duration: 5000
            });
            
            button.disabled = false;
            button.textContent = originalText;
        }
    } catch (error) {
        console.error("Error:", error);
        alertaError('Error de conexión. Intenta nuevamente.'); // ✅ Error de red
        button.disabled = false;
        button.textContent = originalText;
    }
}

    // Inicializar
    await fetchChallengesStatus();
    renderChallenges();
});
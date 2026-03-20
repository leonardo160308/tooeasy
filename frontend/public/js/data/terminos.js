// terminos.js — Modal de Términos y Condiciones (versión simplificada y estable)

document.addEventListener("DOMContentLoaded", () => {
    // ⚠️ Importante: Usamos document.getElementById para evitar problemas de resolución de módulos
    const checkbox = document.getElementById("terminos");
    // Seleccionamos la etiqueta que contiene el texto de 'Términos y condiciones'
    const label = document.querySelector('label[for="terminos"]');

    // Si no existen los elementos, no sigue (evita errores en páginas que no son registro)
    if (!checkbox || !label) {
        // console.warn("No se encontró el checkbox o el label de 'Términos y condiciones'.");
        return;
    }

    // Contenido del modal
    const contenidoHTML = `
        <h2 style="margin-top:0;">Términos y Condiciones</h2>
        <p>
            Bienvenido a <strong>TOO EASY</strong>. Antes de continuar, por favor lee los siguientes puntos:
        </p>
        <ul style="text-align:left; margin-left:20px; list-style-type: disc;">
            <li>Esta plataforma es un proyecto educativo y no ofrece asesoramiento financiero profesional.</li>
            <li>El contenido tiene fines de aprendizaje y práctica.</li>
            <li>**Almacenamiento:** Tus datos de usuario y financieros se almacenan de forma segura en Firestore.</li>
            <li>Podemos actualizar estos términos sin previo aviso.</li>
            <li>Al continuar, aceptas completamente estos términos.</li>
        </ul>
        <p style="font-size:0.9em; margin-top:10px;">© 2025 Proyecto TOO EASY — “Juega hoy, triunfa mañana”.</p>
    `;

    // Función para crear el modal
    function abrirModal() {
        const overlay = document.createElement("div");
        overlay.id = "modalTerminos";
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;

        const modal = document.createElement("div");
        modal.style.cssText = `
            background: #fff;
            color: #333;
            border-radius: 15px;
            padding: 25px 30px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 0 15px rgba(0,0,0,0.4);
            position: relative;
            font-family: 'Inter', sans-serif;
            text-align: center;
        `;

        // Botón cerrar (x)
        const cerrar = document.createElement("span");
        cerrar.textContent = "×";
        cerrar.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 24px;
            cursor: pointer;
            color: #888;
        `;
        cerrar.addEventListener("click", () => overlay.remove());

        // Botón aceptar
        const btnAceptar = document.createElement("button");
        btnAceptar.textContent = "Aceptar Términos";
        btnAceptar.style.cssText = `
            background: #10B981; /* Un color de acento verde para aceptación */
            border: none;
            color: white;
            font-weight: bold;
            border-radius: 8px;
            padding: 10px 20px;
            margin-top: 20px;
            cursor: pointer;
            transition: background 0.3s;
        `;
        // Al hacer click en aceptar, se marca el checkbox y se cierra el modal.
        btnAceptar.addEventListener("click", () => {
            checkbox.checked = true;
            overlay.remove();
        });

        modal.innerHTML = contenidoHTML;
        modal.appendChild(btnAceptar);
        modal.appendChild(cerrar);
        overlay.appendChild(modal);

        // Cerrar si se hace clic fuera del modal
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
    }

    // Evento al hacer clic en el texto del label (para abrir el modal)
    // Usamos el label completo para capturar el click
    label.style.cursor = "pointer";
    label.addEventListener("click", (e) => {
        // Solo abrimos el modal si el usuario hace clic en el texto (evitamos que marque el checkbox)
        // Si el checkbox ya está marcado y se le da click, el modal no se abre.
        if (e.target.tagName !== 'INPUT') {
            e.preventDefault(); 
            abrirModal();
        }
    });
});
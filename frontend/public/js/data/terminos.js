// terminos.js — Modal de Términos y Condiciones (versión profesional y extensa)
// Compatible con registro.html e index.html

document.addEventListener("DOMContentLoaded", () => {
    const checkbox = document.getElementById("terminos");
    const label    = document.querySelector('label[for="terminos"]');

    if (!checkbox || !label) return;

    // ─────────────────────────────────────────────────────────────────────────
    // CONTENIDO DE LOS TÉRMINOS Y CONDICIONES
    // Texto profesional, extenso y bien estructurado.
    // ─────────────────────────────────────────────────────────────────────────
    const contenidoHTML = `
        <div style="text-align:left; font-family:'Nunito','Segoe UI',sans-serif; color:#2d3748;">

            <!-- ENCABEZADO -->
            <div style="text-align:center; margin-bottom:24px; padding-bottom:16px;
                        border-bottom:2px solid #B6823E;">
                <h2 style="margin:0 0 6px; font-size:1.25rem; font-weight:900; color:#2C405B;">
                    Términos y Condiciones de Uso
                </h2>
                <p style="margin:0; font-size:0.78rem; color:#718096; font-weight:600;">
                    Plataforma educativa Too Easy &nbsp;·&nbsp; Versión 1.0
                    &nbsp;·&nbsp; Vigente desde septiembre de 2025
                </p>
            </div>

            <!-- INTRODUCCIÓN -->
            <p style="font-size:0.88rem; line-height:1.7; color:#4a5568; margin:0 0 20px;
                      background:#f0f7ff; border-left:4px solid #6585AA; padding:12px 16px;
                      border-radius:0 8px 8px 0;">
                <strong>Bienvenido/a a Too Easy.</strong> Antes de utilizar nuestra plataforma,
                lee atentamente los presentes Términos y Condiciones. Al crear una cuenta o
                acceder a cualquier funcionalidad del servicio, aceptas plena e incondicionalmente
                las disposiciones aquí contenidas.
            </p>

            <!-- SECCIÓN 1 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">1</span>
                Descripción del Servicio
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                Too Easy es una aplicación web educativa de finanzas personales, desarrollada con
                fines académicos por el equipo de desarrollo Macro-Ware. La plataforma ofrece herramientas
                interactivas que incluyen: lecciones mediante flashcards, cuestionarios de
                evaluación (quizzes), un dashboard financiero personal, un simulador de inversiones
                y un sistema de retos gamificado. Su propósito exclusivo es facilitar el aprendizaje
                de conceptos financieros básicos de forma dinámica y accesible.
            </p>

            <!-- SECCIÓN 2 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">2</span>
                Aceptación de los Términos
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                El uso de Too Easy implica la aceptación libre, voluntaria e irrevocable de estos
                Términos y Condiciones. Si el usuario no estuviera de acuerdo con alguna de las
                disposiciones aquí contenidas, deberá abstenerse de utilizar el servicio. El equipo
                de desarrollo se reserva el derecho de actualizar estos términos en cualquier momento,
                notificando a los usuarios mediante correo electrónico o aviso en la plataforma.
            </p>

            <!-- SECCIÓN 3 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">3</span>
                Registro y Cuentas de Usuario
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 6px;">
                Al crear una cuenta en Too Easy, el usuario se compromete a:
            </p>
            <ul style="font-size:0.85rem; line-height:1.8; color:#4a5568; margin:0 0 14px;
                       padding-left:20px;">
                <li>Proporcionar información verídica, completa y actualizada durante el registro.</li>
                <li>Mantener la confidencialidad de sus credenciales de acceso (usuario y contraseña).</li>
                <li>Notificar de forma inmediata al equipo en caso de detectar cualquier acceso no
                    autorizado a su cuenta.</li>
                <li>No compartir su cuenta con terceros ni permitir el acceso a otros usuarios.</li>
                <li>Ser el único responsable de las actividades realizadas desde su cuenta.</li>
            </ul>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                El equipo no se responsabiliza por pérdidas o daños derivados del incumplimiento
                de estas obligaciones por parte del usuario.
            </p>

            <!-- SECCIÓN 4 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">4</span>
                Uso Permitido y Prohibido
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 6px;">
                La plataforma Too Easy está habilitada exclusivamente para uso educativo personal.
                Queda expresamente prohibido:
            </p>
            <ul style="font-size:0.85rem; line-height:1.8; color:#4a5568; margin:0 0 14px;
                       padding-left:20px;">
                <li>Reproducir, distribuir o comercializar cualquier contenido de la plataforma sin
                    autorización escrita previa del equipo.</li>
                <li>Intentar vulnerar, interferir o comprometer la seguridad del sistema o de las
                    cuentas de otros usuarios.</li>
                <li>Utilizar la plataforma para actividades ilícitas, fraudulentas o contrarias a
                    la ley aplicable.</li>
                <li>Crear cuentas falsas, suplantar identidades o registrar información engañosa.</li>
                <li>Realizar ingeniería inversa, descompilar o modificar el software de la plataforma.</li>
                <li>Publicar, transmitir o almacenar contenido ofensivo, difamatorio, obsceno o
                    que infrinja derechos de terceros.</li>
                <li>Usar herramientas automatizadas (bots, scrapers) para acceder masivamente a
                    los datos o funcionalidades del sistema.</li>
            </ul>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                El incumplimiento de estas restricciones faculta al equipo a suspender o cancelar
                definitivamente la cuenta del usuario sin previo aviso.
            </p>

            <!-- SECCIÓN 5 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">5</span>
                Datos Personales y Privacidad
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                Too Easy recopila los siguientes datos personales con el consentimiento expreso
                del usuario: nombre de usuario, dirección de correo electrónico, edad, género e
                información financiera ingresada voluntariamente (movimientos, metas y simulaciones).
                Estos datos son almacenados de forma segura en la plataforma Supabase y se utilizan
                exclusivamente para el funcionamiento y personalización del servicio.
            </p>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                Too Easy <strong>no venderá ni compartirá los datos personales del usuario</strong>
                con terceros sin consentimiento previo, salvo obligación legal. El usuario puede
                solicitar la eliminación permanente e irreversible de su cuenta y todos sus datos
                asociados en cualquier momento desde la sección de Perfil dentro de la plataforma.
            </p>

            <!-- SECCIÓN 6 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">6</span>
                Carácter Educativo del Contenido
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;
                      background:#fff8f0; border-left:4px solid #BA8E58; padding:12px 16px;
                      border-radius:0 8px 8px 0;">
                <strong>⚠ Aviso importante:</strong> Todo el contenido de Too Easy —incluyendo
                lecciones, flashcards, quizzes, simulaciones de inversión y retos— tiene un propósito
                <strong>exclusivamente educativo</strong>. La información proporcionada por la
                plataforma <strong>no constituye asesoría financiera, fiscal, legal ni de inversión</strong>.
                Las simulaciones de inversión son modelos educativos con fines ilustrativos y no
                representan resultados reales ni proyecciones garantizadas. El equipo de desarrollo
                no se hace responsable por decisiones económicas o financieras que el usuario
                tome basándose en el contenido de la plataforma.
            </p>

            <!-- SECCIÓN 7 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">7</span>
                Propiedad Intelectual
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                Todo el contenido disponible en Too Easy —incluyendo pero no limitado a: diseño
                gráfico, código fuente, imágenes, íconos, textos, materiales educativos, flashcards,
                preguntas de quizzes y elementos de gamificación— es propiedad intelectual del
                equipo desarrollador Macro-Ware o está licenciado para su uso por dicho equipo.
                Queda prohibida su reproducción total o parcial, distribución, modificación o
                uso comercial sin autorización escrita previa. El acceso al servicio no otorga al
                usuario ningún derecho de propiedad sobre los elementos de la plataforma.
            </p>

            <!-- SECCIÓN 8 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">8</span>
                Disponibilidad del Servicio y Modificaciones
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                El equipo de Too Easy se reserva el derecho de modificar, suspender, ampliar
                o descontinuar el servicio —total o parcialmente— en cualquier momento y sin
                necesidad de previo aviso. Asimismo, podrá actualizar, corregir o ampliar estos
                Términos y Condiciones cuando lo considere oportuno. En caso de modificaciones
                sustanciales, el usuario será notificado mediante correo electrónico o aviso
                visible dentro de la plataforma. El uso continuado del servicio tras la publicación
                de las actualizaciones implica la aceptación de las nuevas condiciones.
            </p>

            <!-- SECCIÓN 9 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">9</span>
                Limitación de Responsabilidad
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 14px;">
                El servicio se proporciona en su estado actual ("tal como está"), sin garantías
                de ningún tipo, expresas o implícitas. El equipo de Too Easy no garantiza la
                disponibilidad ininterrumpida del servicio, la exactitud o completitud absoluta de
                la información contenida en la plataforma, ni la ausencia de errores técnicos.
                En ningún caso el equipo de desarrollo será responsable por daños directos,
                indirectos, incidentales, especiales, consecuentes o ejemplares derivados del
                uso o imposibilidad de uso de la plataforma.
            </p>

            <!-- SECCIÓN 10 -->
            <h3 style="font-size:0.9rem; font-weight:800; color:#2C405B; margin:20px 0 8px;
                       display:flex; align-items:center; gap:8px;">
                <span style="background:#2C405B; color:#fff; width:22px; height:22px;
                             border-radius:50%; display:inline-flex; align-items:center;
                             justify-content:center; font-size:0.75rem; flex-shrink:0;">10</span>
                Contacto y Soporte
            </h3>
            <p style="font-size:0.85rem; line-height:1.7; color:#4a5568; margin:0 0 0;">
                Para dudas, reportes de errores, solicitudes de eliminación de datos o cualquier
                consulta relacionada con estos Términos y Condiciones, el usuario puede comunicarse
                con el equipo de Too Easy a través del correo electrónico oficial:
                <a href="mailto:tooeasycontactanos@gmail.com"
                   style="color:#2C405B; font-weight:700; text-decoration:underline;">
                    tooeasycontactanos@gmail.com
                </a>.
                Nos comprometemos a dar respuesta.
            </p>

            <!-- PIE DEL MODAL -->
            <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0;
                        text-align:center; font-size:0.78rem; color:#a0aec0; font-weight:600;">
                © 2025 Too Easy — Proyecto Académico Equipo Macro-Ware<br>
                <em>"Juega hoy, triunfa mañana"</em>
            </div>

        </div>
    `;

    // ─────────────────────────────────────────────────────────────────────────
    // FUNCIÓN: Abrir el modal de Términos y Condiciones
    // ─────────────────────────────────────────────────────────────────────────
    function abrirModal() {
        // Evitar duplicados
        if (document.getElementById('modalTerminos')) return;

        /* Fondo oscuro */
        const overlay = document.createElement("div");
        overlay.id = "modalTerminos";
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(26, 35, 50, 0.72);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99998;
            padding: 20px;
            backdrop-filter: blur(3px);
            animation: ttFadeIn 0.25s ease;
        `;

        /* Animación */
        const styleAnim = document.createElement("style");
        styleAnim.textContent = `
            @keyframes ttFadeIn  { from { opacity:0 } to { opacity:1 } }
            @keyframes ttSlideUp { from { transform:translateY(28px) scale(0.97); opacity:0 }
                                   to   { transform:translateY(0)     scale(1);    opacity:1 } }
        `;
        document.head.appendChild(styleAnim);

        /* Contenedor del modal */
        const modal = document.createElement("div");
        modal.style.cssText = `
            background: #ffffff;
            color: #2d3748;
            border-radius: 20px;
            padding: 28px 30px 24px;
            width: 95%;
            max-width: 580px;
            max-height: 82vh;
            overflow-y: auto;
            box-shadow: 0 24px 64px rgba(26, 35, 50, 0.28);
            position: relative;
            font-family: 'Nunito', 'Segoe UI', sans-serif;
            animation: ttSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            scrollbar-width: thin;
            scrollbar-color: #6585AA #f0f4f8;
        `;

        modal.innerHTML = contenidoHTML;

        /* Botón cerrar (X) */
        const cerrar = document.createElement("button");
        cerrar.innerHTML = "&times;";
        cerrar.style.cssText = `
            position: absolute;
            top: 14px;
            right: 18px;
            background: #f0f4f8;
            border: none;
            font-size: 22px;
            font-weight: 700;
            color: #718096;
            cursor: pointer;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, color 0.2s, transform 0.2s;
            line-height: 1;
        `;
        cerrar.onmouseover  = () => { cerrar.style.background = '#fdecea'; cerrar.style.color = '#e53e3e'; cerrar.style.transform = 'rotate(90deg)'; };
        cerrar.onmouseout   = () => { cerrar.style.background = '#f0f4f8'; cerrar.style.color = '#718096'; cerrar.style.transform = 'rotate(0deg)'; };
        cerrar.addEventListener("click", () => overlay.remove());

        /* Botón Aceptar */
        const btnAceptar = document.createElement("button");
        btnAceptar.textContent = "Acepto los Términos y Condiciones";
        btnAceptar.style.cssText = `
            display: block;
            width: 100%;
            background: linear-gradient(135deg, #2C405B 0%, #3a5272 100%);
            border: none;
            color: white;
            font-family: 'Nunito', 'Segoe UI', sans-serif;
            font-weight: 800;
            font-size: 0.95rem;
            border-radius: 30px;
            padding: 13px 24px;
            margin-top: 22px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 4px 14px rgba(44, 64, 91, 0.3);
        `;
        btnAceptar.onmouseover = () => { btnAceptar.style.transform = 'translateY(-2px)'; btnAceptar.style.boxShadow = '0 8px 22px rgba(44,64,91,0.35)'; };
        btnAceptar.onmouseout  = () => { btnAceptar.style.transform = 'translateY(0)';    btnAceptar.style.boxShadow = '0 4px 14px rgba(44,64,91,0.3)';  };
        btnAceptar.addEventListener("click", () => {
            checkbox.checked = true;
            overlay.remove();
        });

        modal.appendChild(cerrar);
        modal.appendChild(btnAceptar);
        overlay.appendChild(modal);

        /* Cerrar al clic fuera del modal */
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EVENTO: Clic en el label abre el modal (sin marcar el checkbox)
    // ─────────────────────────────────────────────────────────────────────────
    label.style.cursor = "pointer";
    label.addEventListener("click", (e) => {
        if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
            abrirModal();
        }
    });
});
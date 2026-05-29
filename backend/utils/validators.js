// backend/utils/validators.js
// Funciones de validación estricta compartidas por middleware y controladores.

// Un levelId válido es un entero positivo entre 1 y 99999.
// El regex /^[1-9]\d{0,4}$/ garantiza:
//   - Sin cero inicial
//   - Sin notación científica (nada de 'e')
//   - Sin decimales (nada de '.')
//   - Sin signo negativo o positivo
//   - Sin espacios, letras ni caracteres especiales
//   - Longitud máxima 5 dígitos → valor máximo 99999
const LEVEL_ID_REGEX = /^[1-9]\d{0,4}$/;
const MAX_LEVEL_ID   = 99999;

export function isValidLevelId(val) {
    const str = String(val ?? '').trim();
    if (!LEVEL_ID_REGEX.test(str)) return false;
    const n = parseInt(str, 10);
    return n >= 1 && n <= MAX_LEVEL_ID;
}

// Devuelve el entero parseado o null si el valor no es válido.
export function sanitizeLevelId(val) {
    if (!isValidLevelId(val)) return null;
    return parseInt(String(val).trim(), 10);
}

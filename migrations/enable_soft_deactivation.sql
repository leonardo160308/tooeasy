-- migrations/enable_soft_deactivation.sql
--
-- INSTRUCCIONES: Ejecuta este script en el Editor SQL de Supabase (una sola vez).
--
-- PROPÓSITO:
-- Elimina el trigger trg_hard_delete_on_deactivate, que interceptaba
-- UPDATE SET is_active=false y realizaba un DELETE físico del usuario.
-- El flujo de eliminación de cuenta ya usa DELETE directo (UserModel.deleteLogical),
-- por lo que el trigger ya no es necesario y bloquea la desactivación administrativa.
--
-- EFECTO:
-- Después de ejecutar este script, actualizar is_active=false en un usuario
-- lo deshabilita (impide el login) sin eliminar sus datos.
-- El campo is_active=true reactiva la cuenta.

DROP TRIGGER   IF EXISTS trg_hard_delete_on_deactivate ON users;
DROP FUNCTION  IF EXISTS handle_deactivate();

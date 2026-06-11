-- Migración: añadir password_changed_at a la tabla users
-- Ejecutar en Supabase SQL Editor
-- Propósito: invalidar sesiones activas cuando el usuario cambia su contraseña

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para acelerar el check en requireAuth (una query por request autenticado)
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at
    ON users (id, password_changed_at)
    WHERE password_changed_at IS NOT NULL;

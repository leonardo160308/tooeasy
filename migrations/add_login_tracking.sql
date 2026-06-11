-- Migración: tracking de IP y User-Agent por login
-- Ejecutar en Supabase SQL Editor
-- Propósito: detectar inicios de sesión desde nuevos dispositivos/IPs y notificar al usuario

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login_ip  VARCHAR(45) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS last_login_ua  TEXT        DEFAULT NULL;

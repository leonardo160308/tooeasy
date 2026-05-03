-- ================================================================
-- TOO-EASY — Migraciones Supabase
-- Ejecutar en Supabase SQL Editor (en este orden)
-- ================================================================

-- BLOQUE 1: Tablas de soporte (si no existen)
-- ================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject              VARCHAR(200) NOT NULL,
    description          TEXT NOT NULL,
    type                 VARCHAR(20) NOT NULL DEFAULT 'otro'
                           CHECK (type IN ('bug','duda','sugerencia','otro')),
    priority             VARCHAR(10) NOT NULL DEFAULT 'low'
                           CHECK (priority IN ('low','medium','high','urgent')),
    status               VARCHAR(20) NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open','in_progress','waiting_user','resolved','closed')),
    assigned_to          UUID REFERENCES users(id) ON DELETE SET NULL,
    first_response_at    TIMESTAMPTZ,
    response_deadline    TIMESTAMPTZ,
    resolution_deadline  TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at            TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id    UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_role  VARCHAR(20) NOT NULL,
    message      TEXT NOT NULL,
    is_internal  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    type       VARCHAR(50) NOT NULL,
    data       JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BLOQUE 2: Nuevas tablas (CSAT, KB, Macros)
-- ================================================================

CREATE TABLE IF NOT EXISTS ticket_csat (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ticket_id)
);

CREATE TABLE IF NOT EXISTS kb_articles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(200) NOT NULL,
    content      TEXT NOT NULL,
    tags         TEXT[] NOT NULL DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_macros (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title      VARCHAR(100) NOT NULL,
    body       TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BLOQUE 3: Columnas faltantes en investment_simulations
-- ================================================================

ALTER TABLE investment_simulations
    ADD COLUMN IF NOT EXISTS inflacion       DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS analisis        TEXT,
    ADD COLUMN IF NOT EXISTS datos_grafica   TEXT,
    ADD COLUMN IF NOT EXISTS tabla_anual     TEXT;

ALTER TABLE simulation_instruments
    ADD COLUMN IF NOT EXISTS posicion          INTEGER,
    ADD COLUMN IF NOT EXISTS tasa_base         DECIMAL(8,6),
    ADD COLUMN IF NOT EXISTS capital_asignado  DECIMAL(20,2),
    ADD COLUMN IF NOT EXISTS ganancia          DECIMAL(20,2);

-- BLOQUE 4: Índices
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id  ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status   ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket   ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket     ON ticket_events(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published    ON kb_articles(is_published, created_at);

-- BLOQUE 5: Columnas SLA en tickets existentes (si ya existía la tabla sin ellas)
-- ================================================================

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS first_response_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS response_deadline    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolution_deadline  TIMESTAMPTZ;

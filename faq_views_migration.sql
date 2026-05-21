-- =====================================================
-- Migration: faq_views table
-- Tracks how many times each FAQ answer is opened
-- =====================================================

CREATE TABLE IF NOT EXISTS faq_views (
    id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    faq_key        TEXT        UNIQUE NOT NULL,
    views          INTEGER     DEFAULT 1 NOT NULL CHECK (views >= 0),
    last_viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering by popularity
CREATE INDEX IF NOT EXISTS idx_faq_views_views ON faq_views (views DESC);

-- ============================================================
-- Migration 08: P&L Cell Notes table
-- This table stores notes/comments for any P&L cell,
-- decoupled from the value editing logic.
-- ============================================================

CREATE TABLE IF NOT EXISTS pl_cell_notes (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year int         NOT NULL,
    view_type   text        NOT NULL CHECK (view_type IN ('real', 'budget')),
    section     text        NOT NULL,   -- 'revenue', 'expense', 'personal', etc.
    dept        text        NOT NULL,
    item        text        NOT NULL,
    fiscal_month int        NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),
    comment     text,
    assigned_to text[]      DEFAULT '{}',
    created_by  uuid        REFERENCES auth.users(id),
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),

    UNIQUE (fiscal_year, view_type, section, dept, item, fiscal_month)
);

-- Index for fast lookups by year
CREATE INDEX IF NOT EXISTS idx_pl_cell_notes_year ON pl_cell_notes (fiscal_year, view_type);

-- RLS: All authenticated users can read notes
ALTER TABLE pl_cell_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_pl_notes"
    ON pl_cell_notes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_write_pl_notes"
    ON pl_cell_notes FOR ALL
    USING (auth.role() = 'authenticated');

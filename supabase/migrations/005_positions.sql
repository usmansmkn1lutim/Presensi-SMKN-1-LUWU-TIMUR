-- ============================================================================
-- Migration: 005_positions.sql
-- Description: Create positions table, triggers, and Row Level Security
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto updating updated_at
DROP TRIGGER IF EXISTS trigger_set_positions_updated_at ON public.positions;
CREATE TRIGGER trigger_set_positions_updated_at
    BEFORE UPDATE ON public.positions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_positions_code ON public.positions(code);
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON public.positions(is_active);

-- Row Level Security (RLS)
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read active positions
CREATE POLICY "positions_select_authenticated"
    ON public.positions
    FOR SELECT
    TO authenticated
    USING (is_active = true OR private.is_admin(auth.uid()));

-- Policy 2: Admins can manage positions
CREATE POLICY "positions_all_admin"
    ON public.positions
    FOR ALL
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- ============================================================================
-- Migration: 035_employees_email_normalized_unique.sql
-- Description:
--   Adds normalized case-insensitive unique index on public.employees(email)
--   to prevent duplicate employee emails including casing and leading/trailing whitespace.
-- ============================================================================

CREATE UNIQUE INDEX employees_email_normalized_unique
ON public.employees (LOWER(TRIM(email)))
WHERE email IS NOT NULL;

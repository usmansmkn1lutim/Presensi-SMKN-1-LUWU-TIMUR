-- ============================================================================
-- Migration: 033_add_must_change_password.sql
-- Module: PHASE 4D-1 — MANDATORY PASSWORD CHANGE FOR EMPLOYEE RESET
-- Description:
--   Adds must_change_password column to public.profiles table.
--   Allows administrators (Super Admin) to mandate password change upon next login.
--   Default is false for all existing and new profiles.
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Ensure index for fast query filter on mandatory password change if needed
CREATE INDEX IF NOT EXISTS idx_profiles_must_change_password ON public.profiles(must_change_password) WHERE must_change_password = true;

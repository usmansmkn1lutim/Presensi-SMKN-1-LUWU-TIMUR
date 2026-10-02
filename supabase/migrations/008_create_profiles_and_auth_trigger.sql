-- ============================================================================
-- Migration: 008_create_profiles_and_auth_trigger.sql
-- Name: create_profiles_and_auth_trigger
-- Description: 
--   1. Ensures 'app_role' enum exists.
--   2. Creates reusable timestamp trigger function 'set_updated_at()'.
--   3. Creates table 'public.profiles' linked 1:1 with 'auth.users(id)'.
--   4. Creates trigger 'on_auth_user_created' calling 'handle_new_user()'.
--   5. Configures Row Level Security (RLS) on 'public.profiles'.
--   6. Creates 'record_last_login()' security definer function.
--   7. Backfills all existing users from 'auth.users' into 'public.profiles'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ensure Enum 'app_role' Exists
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM (
            'super_admin',
            'admin',
            'headmaster',
            'verifier',
            'employee'
        );
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Timestamp Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Create Table 'public.profiles'
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    role app_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update 'updated_at' column on row modification
DROP TRIGGER IF EXISTS trigger_set_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- ----------------------------------------------------------------------------
-- 4. Private Schema & Security Helper Functions
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_user_role(check_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = check_user_id AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = check_user_id
          AND role IN ('admin', 'super_admin')
          AND is_active = true
    );
$$;

-- ----------------------------------------------------------------------------
-- 5. Auto Profile Trigger: handle_new_user()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        avatar_url,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            NULLIF(NEW.raw_user_meta_data->>'name', ''),
            split_part(NEW.email, '@', 1),
            'Pegawai'
        ),
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
        'employee', -- Default role, strictly non-privileged
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. Helper RPC: record_last_login()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        UPDATE public.profiles
        SET
            last_login_at = now(),
            updated_at = now()
        WHERE id = auth.uid();
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_last_login() TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Policies on 'public.profiles'
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;

-- Policy 1: Authenticated users can view active profiles or their own profile
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (is_active = true OR id = auth.uid() OR private.is_admin(auth.uid()));

-- Policy 2: Users can update their own non-privileged details (full_name, avatar_url)
-- Users CANNOT change their own role or active status
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
        AND (is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid()))
    );

-- Policy 3: Administrators can manage all profiles
CREATE POLICY "profiles_all_admin"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 8. Backfill Existing Users from auth.users into public.profiles
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    role,
    is_active,
    created_at,
    updated_at
)
SELECT
    u.id,
    COALESCE(
        NULLIF(u.raw_user_meta_data->>'full_name', ''),
        NULLIF(u.raw_user_meta_data->>'name', ''),
        split_part(u.email, '@', 1),
        'Pegawai'
    ) AS full_name,
    NULLIF(u.raw_user_meta_data->>'avatar_url', '') AS avatar_url,
    'employee'::app_role AS role,
    true AS is_active,
    COALESCE(u.created_at, now()) AS created_at,
    now() AS updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

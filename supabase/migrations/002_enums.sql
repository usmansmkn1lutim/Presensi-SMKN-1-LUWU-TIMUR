-- ============================================================================
-- Migration: 002_enums.sql
-- Description: Define PostgreSQL enums for application roles and employee types
-- ============================================================================

-- 1. App Role Enum (Strict role hierarchy authoritative in PostgreSQL)
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

-- 2. Employee Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status') THEN
        CREATE TYPE employee_status AS ENUM (
            'active',
            'inactive'
        );
    END IF;
END $$;

-- 3. Employee Type Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_type') THEN
        CREATE TYPE employee_type AS ENUM (
            'teacher',
            'education_staff',
            'administrative_staff',
            'principal',
            'vice_principal',
            'laboratory_staff',
            'librarian',
            'technician',
            'security',
            'other'
        );
    END IF;
END $$;

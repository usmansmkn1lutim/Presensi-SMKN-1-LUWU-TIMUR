-- ============================================================================
-- Migration: 001_extensions.sql
-- Description: Enable required PostgreSQL extensions and setup PostGIS preparation
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pg_trgm for fast text search on names, NIP, and employee numbers
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- PostGIS Preparation for future Phase 8 (Geofencing & GPS Radius Validation)
-- Creates a dedicated schema 'gis' if supported by the PostgreSQL environment
DO $$
BEGIN
    CREATE SCHEMA IF NOT EXISTS gis;
    BEGIN
        CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA gis;
    EXCEPTION WHEN OTHERS THEN
        -- If postgis is not available in the current environment, log notice without blocking core schema
        RAISE NOTICE 'PostGIS extension not available in this environment, skipping. Core schema will proceed.';
    END;
END $$;

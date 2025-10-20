-- Migration: Add notes column to demo_requests table
-- Date: 2025-10-20
-- Purpose: Fix PostgreSQL error 42703 - column "notes" does not exist
-- Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready migration

-- Add notes column if it doesn't exist
ALTER TABLE demo_requests 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for faster queries on notes (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_demo_requests_notes ON demo_requests(notes) WHERE notes IS NOT NULL;

-- Verify column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'demo_requests' 
        AND column_name = 'notes'
    ) THEN
        RAISE EXCEPTION 'Migration failed: notes column was not created';
    END IF;
END $$;


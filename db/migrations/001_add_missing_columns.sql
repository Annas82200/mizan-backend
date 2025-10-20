-- Migration: Add missing columns to multiple tables
-- Date: 2025-10-20
-- Purpose: Fix PostgreSQL error 42703 for notes and additional_comments
-- Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready migration

-- Add notes column to demo_requests
ALTER TABLE demo_requests 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add additional_comments column to culture_assessments
ALTER TABLE culture_assessments
ADD COLUMN IF NOT EXISTS additional_comments TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_requests_notes 
ON demo_requests(notes) WHERE notes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_culture_assessments_comments
ON culture_assessments(additional_comments) WHERE additional_comments IS NOT NULL;

-- Verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_requests' AND column_name = 'notes'
    ) THEN
        RAISE EXCEPTION 'Migration failed: demo_requests.notes not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'culture_assessments' AND column_name = 'additional_comments'
    ) THEN
        RAISE EXCEPTION 'Migration failed: culture_assessments.additional_comments not created';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully: notes and additional_comments columns created';
END $$;


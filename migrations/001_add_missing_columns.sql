-- ============================================================================
-- Migration: Add Strategic Columns for Production Alignment
-- Created: 2025-01-23
-- Purpose: Align database schema with TypeScript schema definitions
-- ============================================================================

-- Add strategic columns to tenants table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS market_position text,
  ADD COLUMN IF NOT EXISTS location text;

-- Add updated_at to culture_assessments table
ALTER TABLE culture_assessments
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to culture_assessments
DROP TRIGGER IF EXISTS update_culture_assessments_updated_at ON culture_assessments;
CREATE TRIGGER update_culture_assessments_updated_at
  BEFORE UPDATE ON culture_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'market_position'
  ) THEN
    RAISE EXCEPTION 'Migration failed: market_position column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'location'
  ) THEN
    RAISE EXCEPTION 'Migration failed: location column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'culture_assessments' AND column_name = 'updated_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: updated_at column not created';
  END IF;
END $$;

-- Success confirmation
SELECT 'Migration 001_add_missing_columns completed successfully' AS status;

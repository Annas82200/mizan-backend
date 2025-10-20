#!/bin/bash
# Script to apply database migration 001_add_missing_columns.sql
# Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready deployment script

set -e  # Exit on error

echo "🗄️  Mizan Platform - Database Migration Script"
echo "================================================"
echo ""
echo "Migration: 001_add_missing_columns.sql"
echo "Purpose: Add notes and additional_comments columns"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "💡 Set DATABASE_URL before running this script"
    exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/../db/migrations/001_add_missing_columns.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ ERROR: Migration file not found at: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file found: $MIGRATION_FILE"
echo ""

# Apply migration using psql
echo "🚀 Applying migration..."
echo ""

if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -f "$MIGRATION_FILE"
    RESULT=$?
    
    if [ $RESULT -eq 0 ]; then
        echo ""
        echo "✅ Migration applied successfully!"
        echo ""
        echo "📊 Verification:"
        echo "   - demo_requests.notes column created"
        echo "   - culture_assessments.additional_comments column created"
        echo "   - Performance indexes created"
        echo ""
        echo "🎉 Database is now up to date"
    else
        echo ""
        echo "❌ Migration failed with exit code: $RESULT"
        echo "💡 Check the error messages above for details"
        exit $RESULT
    fi
else
    echo "❌ ERROR: psql command not found"
    echo "💡 Install PostgreSQL client tools or use Railway's database dashboard"
    echo ""
    echo "Alternative: Copy the SQL from the migration file and run it manually:"
    echo "   File: backend/db/migrations/001_add_missing_columns.sql"
    exit 1
fi


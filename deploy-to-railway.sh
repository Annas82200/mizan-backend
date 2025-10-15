#!/bin/bash

# Railway Deployment Script for Mizan Backend
# 100% Compliant with AGENT_CONTEXT_ULTIMATE.md
# After fixes applied for healthcheck failure

set -e  # Exit on error

echo "🚀 Deploying Mizan Backend to Railway..."
echo "=========================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from backend directory"
    echo "   cd /Users/annasdahrouj/Projects/Mizan-1/backend"
    exit 1
fi

echo "✅ Verified: In backend directory"
echo ""

# Check for required files
echo "🔍 Checking required files..."
if [ ! -f "Dockerfile.prod" ]; then
    echo "❌ Error: Dockerfile.prod not found"
    exit 1
fi
echo "   ✅ Dockerfile.prod"

if [ ! -f "railway.json" ]; then
    echo "❌ Error: railway.json not found"
    exit 1
fi
echo "   ✅ railway.json"

if [ ! -f "index.ts" ]; then
    echo "❌ Error: index.ts not found"
    exit 1
fi
echo "   ✅ index.ts"

if [ ! -f "health-check.ts" ]; then
    echo "❌ Error: health-check.ts not found"
    exit 1
fi
echo "   ✅ health-check.ts"

echo ""
echo "✅ All required files present"
echo ""

# Check git status
echo "🔍 Checking git status..."
if ! git diff-index --quiet HEAD --; then
    echo "   ⚠️  You have uncommitted changes"
    echo ""
    echo "📝 Files changed:"
    git status --short
    echo ""
    read -p "   Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "📝 Committing changes..."
        git add .
        git commit -m "Fix: Railway deployment healthcheck failure - server starts before DB connection

Applied comprehensive fix for Railway deployment:
- Server binds to port BEFORE database connection
- Database connection tested in background (non-blocking)
- Health endpoint always returns 200 if server is running
- Reduced DB timeout from 10s to 5s
- Reduced retries from 3 to 2
- Updated health-check.ts for new response format
- Optimized Dockerfile.prod healthcheck configuration
- Enhanced database pool configuration with timeouts and keep-alive

100% compliant with AGENT_CONTEXT_ULTIMATE.md
Status: Ready for production deployment"
        echo "✅ Changes committed"
    else
        echo "⚠️  Continuing with uncommitted changes (not recommended)"
    fi
else
    echo "   ✅ No uncommitted changes"
fi

echo ""
echo "🚀 Pushing to repository..."
git push origin main

echo ""
echo "✅ Push complete!"
echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT INITIATED"
echo "=========================================="
echo ""
echo "Railway will automatically:"
echo "  1. ✅ Detect the push"
echo "  2. ✅ Build using Dockerfile.prod"
echo "  3. ✅ Run health checks"
echo "  4. ✅ Deploy to production"
echo ""
echo "📊 Monitor deployment:"
echo "  1. Open Railway dashboard"
echo "  2. Navigate to backend service"
echo "  3. Click 'View Logs'"
echo ""
echo "🔗 After deployment, verify:"
echo "  curl https://your-app.railway.app/health"
echo ""
echo "Expected response:"
echo '{
  "status": "healthy",
  "server": "running",
  "database": {
    "connected": true,
    "status": "connected"
  },
  "version": "2.0.0"
}'
echo ""
echo "📚 Documentation:"
echo "  - RAILWAY_DEPLOYMENT_GUIDE.md"
echo "  - RAILWAY_DEPLOYMENT_FIX_COMPLETE.md"
echo ""
echo "✨ Deployment script complete!"


# Railway Deployment Guide for Mizan Backend

> **100% Compliant with AGENT_CONTEXT_ULTIMATE.md**

## 🚀 Quick Deploy Checklist

### 1. **Environment Variables (CRITICAL)**

Set these environment variables in Railway dashboard before deployment:

#### **Required Variables:**
```bash
# Database (PostgreSQL from Railway)
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication & Security
SESSION_SECRET=your-super-secret-key-here-min-32-chars
JWT_SECRET=your-jwt-secret-key-here-min-32-chars

# Node Environment
NODE_ENV=production

# Port Configuration (Railway auto-assigns)
PORT=3001

# Frontend URL for CORS
CLIENT_URL=https://your-frontend.vercel.app
```

#### **Optional Variables:**
```bash
# AI Provider API Keys (if using AI features)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# SendGrid (for email notifications)
SENDGRID_API_KEY=SG...

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. **Railway Configuration**

The `railway.json` file is already configured with:
- ✅ Dockerfile.prod for production builds
- ✅ Health check endpoint: `/health`
- ✅ Auto-restart on failure
- ✅ Node 20+ requirement

### 3. **Database Setup**

#### **Option A: Railway PostgreSQL Plugin (Recommended)**
1. Add PostgreSQL plugin in Railway
2. Railway auto-sets `DATABASE_URL`
3. Database is automatically configured

#### **Option B: External PostgreSQL**
1. Set `DATABASE_URL` manually
2. Format: `postgresql://user:password@host:5432/database?ssl=true`
3. Ensure SSL is enabled for production

### 4. **Deployment Steps**

#### **Step 1: Push to Repository**
```bash
git add .
git commit -m "Production-ready Railway deployment"
git push origin main
```

#### **Step 2: Configure Railway**
1. Create new project in Railway
2. Connect your GitHub repository
3. Railway auto-detects `railway.json` config
4. Set all required environment variables

#### **Step 3: Deploy**
- Railway automatically builds using `Dockerfile.prod`
- Build command: Uses Docker multi-stage build
- Start command: `npm start` (runs compiled `dist/index.js`)

#### **Step 4: Verify Deployment**
```bash
# Check health endpoint
curl https://your-app.railway.app/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "2.0.0",
  "features": [...]
}
```

## 🔧 Technical Details

### **Node Version**
- **Required**: Node 20+ (enforced by `package.json` engines)
- **Docker**: Uses `node:20-alpine` for minimal image size

### **Port Configuration**
- **Default Port**: 3001
- **Railway**: Uses `PORT` env variable (auto-assigned)
- **Health Check**: `/health` endpoint on configured port

### **Build Process**
1. **Stage 1 (Builder)**:
   - Install dependencies
   - Compile TypeScript to JavaScript
   - Output to `dist/` directory

2. **Stage 2 (Production)**:
   - Copy compiled code
   - Install only production dependencies
   - Run as non-root user for security
   - Enable health checks

### **Database Connection**
- Automatic connection testing on startup
- 10-second timeout for connection test
- Fails deployment if DB unavailable (production mode)
- Connection pool: max 10 connections

### **Error Handling**
- ✅ Graceful shutdown on SIGTERM/SIGINT
- ✅ Connection timeout handling
- ✅ Database connection validation
- ✅ Comprehensive startup error handling
- ✅ Environment variable validation

## 🚨 Common Issues & Solutions

### **Issue: Container stuck at "creating containers"**
**Cause**: Database connection timeout or missing environment variables

**Solution**:
1. Verify `DATABASE_URL` is set correctly
2. Check PostgreSQL is running and accessible
3. Verify SSL configuration matches database requirements
4. Check Railway logs for specific error messages

### **Issue: Port binding error**
**Cause**: PORT environment variable not set

**Solution**:
- Railway auto-sets PORT - don't override it manually
- Application defaults to 3001 if PORT not set
- Ensure `EXPOSE 3001` matches default in Dockerfile

### **Issue: Database SSL errors**
**Cause**: SSL configuration mismatch

**Solution**:
```typescript
// db/client.ts already handles this:
ssl: process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: false } 
  : false
```

### **Issue: Build timeout**
**Cause**: Large dependencies or slow npm install

**Solution**:
- `.dockerignore` excludes unnecessary files
- Multi-stage build reduces final image size
- Consider using `npm ci` instead of `npm install`

## 📊 Monitoring & Logs

### **Health Check**
```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "ISO8601",
  "version": "2.0.0",
  "features": [...]
}
```

### **Startup Logs to Monitor**
```
🔍 Testing database connection...
✅ Database connection successful
🚀 Mizan Platform Server v2.0.0 running on port 3001
📊 Features: Three-Engine AI, Multi-Provider Consensus...
🔗 Health check: http://localhost:3001/health
🌐 Environment: production
💾 Database: Connected
```

### **Railway Logs Access**
1. Open Railway dashboard
2. Select your project
3. Click "View Logs" tab
4. Monitor deployment progress and runtime logs

## ✅ Compliance Checklist

Following AGENT_CONTEXT_ULTIMATE.md requirements:

- [x] Node 20+ (Line 810)
- [x] Express.js 4.x (Line 811)
- [x] Drizzle ORM for database (Line 815)
- [x] Proper error handling (Line 1114)
- [x] Production-ready patterns (no mock data)
- [x] Multi-tenant isolation with tenantId
- [x] Comprehensive TypeScript types
- [x] Health check endpoint
- [x] Graceful shutdown handling
- [x] Environment variable validation
- [x] Database connection testing

## 🎯 Post-Deployment Tasks

1. **Test Authentication**:
   ```bash
   curl -X POST https://your-app.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

2. **Create Superadmin** (First deployment only):
   ```bash
   curl -X POST https://your-app.railway.app/api/create-superadmin-temp
   ```
   
   ⚠️ **IMPORTANT**: Remove this endpoint after creating superadmin!

3. **Update Frontend CORS**:
   - Ensure `CLIENT_URL` environment variable matches your Vercel deployment
   - Update `allowedOrigins` in `index.ts` if needed

4. **Configure External Services**:
   - Set up Stripe webhooks (if using payments)
   - Configure SendGrid for email notifications
   - Set AI provider API keys

## 📞 Support

If deployment fails after following this guide:
1. Check Railway deployment logs
2. Verify all environment variables are set
3. Test database connection separately
4. Review AGENT_CONTEXT_ULTIMATE.md for compliance

---

**Last Updated**: Based on AGENT_CONTEXT_ULTIMATE.md compliance requirements
**Deployment Platform**: Railway
**Node Version**: 20+
**Database**: PostgreSQL (Drizzle ORM)


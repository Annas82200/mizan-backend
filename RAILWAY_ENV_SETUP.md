# Railway Environment Variables Setup - CRITICAL FOR CORS FIX

## 🚨 URGENT: Required Environment Variables for CORS to Work

To fix the login issue and CORS errors, you **MUST** set these environment variables in your Railway dashboard:

### Access Railway Dashboard:
1. Go to: https://railway.app
2. Navigate to your `mizan-backend-production` project
3. Click on **Variables** tab

---

## ✅ REQUIRED ENVIRONMENT VARIABLES

### 1. Frontend URL Configuration (CRITICAL for CORS)

```bash
# Main production frontend URL
CLIENT_URL=https://www.mizan.work

# Frontend URL (alternative variable for compatibility)
FRONTEND_URL=https://www.mizan.work

# CORS Origins (comma-separated list)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://mizan.work,https://www.mizan.work,https://mizan-platform-final.vercel.app,https://mizan-frontend-ten.vercel.app
```

### 2. Database Configuration (Already Set)

```bash
# Railway automatically provides this
DATABASE_URL=postgresql://postgres:rGCnmIBSqZkiPqFZmkbkQshewsNGxEmL@yamabiko.proxy.rlwy.net:23010/railway
```

### 3. Authentication & Security (CRITICAL - Generate Strong Secrets!)

```bash
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<GENERATE_STRONG_SECRET_64_CHARS>
SESSION_SECRET=<GENERATE_ANOTHER_STRONG_SECRET_64_CHARS>

# Token expiration
JWT_EXPIRES_IN=7d
```

### 4. Application Configuration

```bash
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

---

## 🔧 Step-by-Step Railway Setup

### Step 1: Generate Strong Secrets

Run this command locally to generate secrets:

```bash
# Generate JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and save for next step.

### Step 2: Add Variables to Railway

1. **Login to Railway Dashboard**: https://railway.app/dashboard
2. **Select Project**: `mizan-backend-production`
3. **Click Variables Tab**
4. **Add/Update Variables**:

   Click **+ New Variable** for each:

   | Variable Name | Value | Notes |
   |---------------|-------|-------|
   | `CLIENT_URL` | `https://www.mizan.work` | Main frontend URL |
   | `FRONTEND_URL` | `https://www.mizan.work` | Alternative frontend URL |
   | `CORS_ORIGINS` | See above full list | Comma-separated origins |
   | `JWT_SECRET` | Generated 64-char hex | From Step 1 |
   | `SESSION_SECRET` | Generated 64-char hex | From Step 1 |
   | `NODE_ENV` | `production` | Environment mode |
   | `PORT` | `3001` | Server port |
   | `LOG_LEVEL` | `info` | Logging level |

5. **Click Deploy** after adding all variables

### Step 3: Verify Deployment

After deployment completes (2-3 minutes):

```bash
# Test health endpoint
curl https://mizan-backend-production.up.railway.app/health

# Should return:
# {"status":"healthy","server":"running","database":{"connected":true,...},...}
```

### Step 4: Test CORS Configuration

```bash
# Test CORS from www.mizan.work origin
curl -i -X OPTIONS https://mizan-backend-production.up.railway.app/api/auth/login \
  -H "Origin: https://www.mizan.work" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"

# Should return headers:
# Access-Control-Allow-Origin: https://www.mizan.work
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
```

---

## 🎯 Vercel Frontend Environment Variables

You also need to configure Vercel with the backend URL:

### Access Vercel Dashboard:
1. Go to: https://vercel.com/dashboard
2. Navigate to your frontend project (mizan.work)
3. Click **Settings** → **Environment Variables**

### Required Variables:

```bash
NEXT_PUBLIC_API_URL=https://mizan-backend-production.up.railway.app
```

**Important**: After adding this variable, you must **redeploy** the frontend:
- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment

---

## 🚀 Quick Deployment Commands

### Deploy Backend to Railway:

```bash
# From backend directory
cd /Users/annasdahrouj/Projects/Mizan-1/backend

# Commit changes
git add .
git commit -m "fix: Update CORS configuration for production deployment"

# Push to trigger Railway deployment
git push origin main
```

Railway will automatically deploy when you push to main branch.

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Railway backend is running: https://mizan-backend-production.up.railway.app/health
- [ ] CORS preflight works (see test command above)
- [ ] Frontend can connect: Check browser Network tab
- [ ] Superadmin login works: Try logging in at https://www.mizan.work/login
- [ ] No CORS errors in browser console

---

## 🐛 Troubleshooting

### Issue: Still getting CORS errors

**Check:**
1. Verify `CLIENT_URL` is set to `https://www.mizan.work` in Railway
2. Verify `FRONTEND_URL` is set to `https://www.mizan.work` in Railway
3. Check Railway logs: `railway logs` or view in dashboard
4. Verify deployment completed successfully

### Issue: Login still fails

**Check:**
1. Verify `JWT_SECRET` is set in Railway (not the placeholder)
2. Verify database connection in health endpoint
3. Check backend logs for authentication errors
4. Verify superadmin user exists in database

### Issue: Database connection fails

**Check:**
1. Verify `DATABASE_URL` is correct in Railway
2. Test database connection:
   ```bash
   PGPASSWORD="rGCnmIBSqZkiPqFZmkbkQshewsNGxEmL" psql -h yamabiko.proxy.rlwy.net -p 23010 -U postgres -d railway -c "SELECT version();"
   ```

---

## 📞 Next Steps After Setup

1. **Set all environment variables in Railway dashboard**
2. **Push backend code to trigger deployment**
3. **Verify Vercel frontend has correct `NEXT_PUBLIC_API_URL`**
4. **Redeploy Vercel frontend**
5. **Test superadmin login at https://www.mizan.work/login**
6. **Monitor Railway logs for any issues**

---

**Created**: 2025-10-15
**Purpose**: Fix CORS issues preventing superadmin login
**Status**: Ready for deployment

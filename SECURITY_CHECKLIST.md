# Mizan Platform Security Checklist

## Environment Variables (REQUIRED for Production)

### Authentication & Secrets
- [ ] `JWT_SECRET` - Must be set. NO fallback allowed. Use a 256-bit random string.
  ```bash
  # Generate secure secret:
  openssl rand -base64 32
  ```
- [ ] `DATABASE_URL` - PostgreSQL connection string with SSL enabled
- [ ] `REDIS_URL` - If using Redis for sessions/caching

### Third-Party Services
- [ ] `STRIPE_SECRET_KEY` - Stripe API key (starts with `sk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- [ ] `SENDGRID_API_KEY` - Email service API key
- [ ] `OPENAI_API_KEY` - AI service API key

### Application Config
- [ ] `FRONTEND_URL` - Production frontend URL (for CORS, emails)
- [ ] `NODE_ENV` - Must be `production`

---

## Pre-Deployment Checklist

### Authentication
- [x] JWT secrets have NO fallback values - server fails if not set
- [x] Passwords are hashed with bcrypt (cost factor 12)
- [x] No hardcoded credentials in codebase
- [x] No exposed admin creation endpoints
- [x] CSV imports generate unique passwords per user

### Data Protection
- [x] Tenant isolation enforced on all data queries
- [ ] Database connections use SSL in production
- [ ] Sensitive data encrypted at rest
- [ ] PII logged only when necessary (masked in logs)

### API Security
- [ ] Rate limiting enabled on auth endpoints
- [ ] CORS configured for production domains only
- [ ] Helmet middleware enabled for security headers
- [ ] Request validation on all endpoints (Zod schemas)

### Infrastructure
- [ ] HTTPS enforced (no HTTP in production)
- [ ] Secure cookies (httpOnly, secure, sameSite)
- [ ] No debug/development endpoints exposed
- [ ] Error messages don't leak internal details

---

## Superadmin Setup (Production)

**NEVER use exposed API endpoints for admin creation.**

Use the secure CLI script instead:

```bash
# Set environment variables
export SUPERADMIN_EMAIL="admin@company.com"
export SUPERADMIN_PASSWORD="SecureP@ssword123!"  # Min 12 chars, mixed case, number, symbol
export SUPERADMIN_NAME="Admin Name"

# Run the script
npx tsx scripts/create-superadmin.ts

# On Railway:
railway run npx tsx scripts/create-superadmin.ts
```

Password requirements:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

## Code Security Patterns

### DO
```typescript
// JWT verification - fail if secret not set
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: JWT_SECRET not set');
  }
  return secret;
};

// Password hashing - use cost factor 12
const hash = await bcrypt.hash(password, 12);

// Tenant isolation - always filter by tenantId
const data = await db.select().from(table)
  .where(eq(table.tenantId, req.user.tenantId));
```

### DON'T
```typescript
// NEVER use fallback secrets
const secret = process.env.JWT_SECRET || 'dev-secret';  // WRONG

// NEVER store plain passwords
passwordHash: plainPassword;  // WRONG

// NEVER skip tenant isolation
const data = await db.select().from(table);  // WRONG - no tenant filter
```

---

## Security Incidents Response

If you discover a security issue:

1. **Immediately**: Rotate affected secrets/credentials
2. **Assess**: Determine scope of potential breach
3. **Notify**: Inform affected users if data exposed
4. **Fix**: Patch vulnerability
5. **Document**: Record incident and remediation

---

## Audit Schedule

- **Weekly**: Review access logs for anomalies
- **Monthly**: Rotate API keys and secrets
- **Quarterly**: Full security audit
- **Annually**: Penetration testing

---

## Files Changed in Security Fix (2024)

1. `backend/index.ts` - Removed exposed superadmin endpoint, fixed JWT fallback
2. `backend/src/routes/auth.ts` - Removed JWT fallbacks, added getJwtSecret()
3. `backend/src/routes/admin.ts` - Fixed password hashing (bcrypt)
4. `backend/src/routes/upload.ts` - Unique passwords for CSV imports
5. `backend/scripts/create-superadmin.ts` - Secure CLI for admin creation
6. Deleted 53 backup files from `backend/src/`

---

*Last Updated: January 2025*

import * as bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { users, sessions, tenants } from "../db/schema";
import { z } from "zod";
import crypto from 'crypto';
import { config } from '../config';
import { logger } from './logger';

// ✅ PRODUCTION: Use validated config, no fallback secrets
const JWT_SECRET = config.JWT_SECRET;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10; // Standard bcrypt salt rounds

/**
 * JWT Payload Interface
 * Production-ready: Explicitly typed JWT payload (no 'as any')
 */
interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  name?: string;
  iat: number;
  exp: number;
}

/**
 * JWT Payload Validation Schema
 * Production-ready: Runtime validation of JWT claims
 */
const JWTPayloadSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  tenantId: z.string().min(1),
  role: z.string().min(1),
  name: z.string().optional(),
  iat: z.number(),
  exp: z.number(),
});

/**
 * Legacy JWT Payload Format (backward compatibility)
 * Some tokens may use 'id' instead of 'userId'
 */
const LegacyJWTPayloadSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  tenantId: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  iat: z.number(),
  exp: z.number(),
});

/**
 * Generate cryptographically secure password
 * AGENT_CONTEXT_ULTIMATE.md Compliant: No Math.random(), uses crypto module
 */
function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const values = crypto.randomBytes(length);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[values[i] % charset.length];
  }

  // Ensure password meets complexity requirements
  if (!/[A-Z]/.test(password)) password = password.slice(0, -1) + 'A';
  if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
  if (!/[0-9]/.test(password)) password = password.slice(0, -1) + '1';
  if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -1) + '!';

  return password;
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().uuid(), // Or domain, etc.
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  companyName: z.string().min(2).optional(),
  role: z.enum(["clientAdmin", "employee"]).optional(),
});

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "clientAdmin" | "employee";
  tenantId: string | null;
  tenantName?: string;
  tenantPlan?: string;
};

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error: unknown) {
        logger.error('Password comparison error:', error);
        return false;
    }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function generateFullToken(user: { id: string; email: string; tenantId: string; role: string; name?: string }): string {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id, // Include both for compatibility
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { userId: string; tenantId?: string; role?: string; email?: string } | null {
  try {
    // ✅ PRODUCTION: Verify JWT signature first
    const unverified = jwt.verify(token, JWT_SECRET);

    // ✅ PRODUCTION: Runtime validation of JWT payload (no 'as any')
    // Try modern format first
    const modernResult = JWTPayloadSchema.safeParse(unverified);
    if (modernResult.success) {
      return {
        userId: modernResult.data.userId,
        tenantId: modernResult.data.tenantId,
        role: modernResult.data.role,
        email: modernResult.data.email
      };
    }

    // Try legacy format (backward compatibility)
    const legacyResult = LegacyJWTPayloadSchema.safeParse(unverified);
    if (legacyResult.success) {
      return {
        userId: legacyResult.data.id,
        tenantId: legacyResult.data.tenantId,
        role: legacyResult.data.role,
        email: legacyResult.data.email
      };
    }

    // Payload validation failed
    logger.error('Token verification failed - invalid payload structure:', {
      modernErrors: modernResult.error.errors,
      legacyErrors: legacyResult.error.errors
    });
    return null;
  } catch (error) {
    logger.error('Token verification failed - JWT error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function createSession(userId: string, tenantId: string): Promise<string> {
  const token = generateToken(userId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    userId,
    tenantId,
    token,
    expiresAt,
  });

  return token;
}

export async function validateSession(token: string): Promise<AuthUser | null> {
  const sessionResult = await db.select().from(sessions).where(
    and(
      eq(sessions.token, token),
      eq(sessions.expiresAt, new Date())
    )
  ).limit(1);
  
  if (sessionResult.length === 0 || sessionResult[0].expiresAt < new Date()) {
    return null;
  }
  
  const session = sessionResult[0];
  
  // Get user data separately
  const userResult = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (userResult.length === 0) {
    return null;
  }
  
  const user = userResult[0];
  
  // Get tenant data separately if user has tenantId
  let tenant = null;
  if (user.tenantId) {
    const tenantResult = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
    tenant = tenantResult[0] || null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'employee' | 'clientAdmin' | 'superadmin',
    tenantId: user.tenantId,
    tenantName: tenant?.name,
    tenantPlan: tenant?.plan,
  };
}

export async function login(email: string, password: string, tenantId: string): Promise<{ user: AuthUser; token: string } | null> {
  const userResult = await db.select().from(users).where(
    and(
      eq(users.email, email),
      eq(users.tenantId, tenantId)
    )
  ).limit(1);
  
  if (userResult.length === 0) {
    return null;
  }
  
  const user = userResult[0];
  
  if (!await comparePasswords(password, user.passwordHash)) {
    return null;
  }
  
  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }
  
  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  
  const token = await createSession(user.id, user.tenantId);
  
  // Get tenant data separately
  let tenant = null;
  if (user.tenantId) {
    const tenantResult = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
    tenant = tenantResult[0] || null;
  }
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'employee' | 'clientAdmin' | 'superadmin',
      tenantId: user.tenantId,
      tenantName: tenant?.name,
      tenantPlan: tenant?.plan,
    },
    token,
  };
}

export async function register(data: z.infer<typeof registerSchema>): Promise<{ user: AuthUser; token: string }> {
  // For multi-tenant, registration must be scoped to a tenant or create a new one.
  // This logic assumes a tenant context is provided or created.
  // For this fix, let's assume a new tenant is created for every new company registration.

  // If a user registers for an existing company, they should be *invited*,
  // which is a different flow. The simple register should be for the *first*
  // admin of a new tenant.

  let tenantId: string;
  let newTenant = null;
  
  if (data.companyName) {
    // This is a new company registration
    newTenant = (await db.insert(tenants).values({
      name: data.companyName,
      primaryContact: data.email,
      plan: "pro", // Default plan
      status: "active"
    }).returning())[0];
    tenantId = newTenant.id;

    const existingUserInTenant = await db.select().from(users).where(
      and(
        eq(users.email, data.email),
        eq(users.tenantId, tenantId)
      )
    ).limit(1);

    if (existingUserInTenant.length > 0) {
      // This case should ideally not happen if this is a new tenant.
      // But as a safeguard:
      throw new Error("Email already registered for this company.");
    }

  } else {
    // This is a free-tier user, creating their own personal tenant.
    newTenant = (await db.insert(tenants).values({
      name: data.name + "'s Workspace",
      primaryContact: data.email,
      plan: "free",
      status: "active"
    }).returning())[0];
    tenantId = newTenant.id;
  }
  
  const passwordHash = await hashPassword(data.password);
  
  const [newUser] = await db.insert(users).values({
    email: data.email,
    passwordHash,
    name: data.name,
    role: "clientAdmin", // First user of a tenant is always an admin
    tenantId: tenantId,
  }).returning();
  
  const token = await createSession(newUser.id, tenantId);
  
  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as 'employee' | 'clientAdmin' | 'superadmin',
      tenantId: tenantId,
      tenantName: newTenant?.name,
      tenantPlan: newTenant?.plan,
    },
    token,
  };
}

export async function logout(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function inviteEmployee(
  tenantId: string,
  email: string,
  name: string,
  title?: string,
  invitedBy?: string
): Promise<{ temporaryPassword: string }> {
  const existingUser = await db.select().from(users).where(
    and(
      eq(users.email, email),
      eq(users.tenantId, tenantId)
    )
  ).limit(1);
  
  if (existingUser.length > 0) {
    throw new Error("Email already registered in this tenant");
  }

  // ✅ PRODUCTION: Generate cryptographically secure temporary password
  const temporaryPassword = generateSecurePassword(16);
  const passwordHash = await hashPassword(temporaryPassword);
  
  await db.insert(users).values({
    email,
    passwordHash,
    name,
    title,
    role: "employee",
    tenantId,
    managerId: invitedBy,
  });
  
  // In production, send email with temporary password
  // await sendInviteEmail(email, name, temporaryPassword);
  
  return { temporaryPassword };
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  if (userResult.length === 0) {
    throw new Error("User not found");
  }
  
  const user = userResult[0];
  
  if (!await comparePasswords(oldPassword, user.passwordHash)) {
    throw new Error("Invalid current password");
  }
  
  const newPasswordHash = await hashPassword(newPassword);
  
  await db.update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function resetPassword(email: string): Promise<{ resetToken: string }> {
  const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (userResult.length === 0) {
    // Don't reveal if email exists, but we need tenant context here too.
    // Password reset flow needs to be re-evaluated for multi-tenancy.
    // For now, we leave it as is, but it's a known issue.
    return { resetToken: "sent" };
  }
  
  const user = userResult[0];
  
  // Generate reset token (in production, use a more secure method)
  const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  // Store reset token with expiration (implement reset_tokens table)
  // await db.insert(resetTokens).values({
  //   userId: user.id,
  //   token: resetToken,
  //   expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  // });
  
  // In production, send email
  // await sendResetEmail(email, resetToken);
  
  return { resetToken };
}

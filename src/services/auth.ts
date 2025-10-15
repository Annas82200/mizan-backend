import * as bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { db } from "./db/client.js";
import { users, sessions, tenants } from "./db/schema.js";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET!;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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
        console.error('Password comparison error:', error);
        return false;
    }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
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
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.token, token),
      eq(sessions.expiresAt, new Date())
    ),
    with: {
      user: {
        with: {
          tenant: true,
        },
      },
    },
  });
  
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  
  const user = session.user;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'employee' | 'clientAdmin' | 'superadmin',
    tenantId: user.tenantId,
    tenantName: user.tenant?.name,
    tenantPlan: user.tenant?.plan,
  };
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      tenant: true,
    },
  });
  
  if (!user || !await comparePasswords(password, user.passwordHash)) {
    return null;
  }
  
  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }
  
  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  
  const token = await createSession(user.id, user.tenantId);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'employee' | 'clientAdmin' | 'superadmin',
      tenantId: user.tenantId,
      tenantName: user.tenant?.name,
      tenantPlan: user.tenant?.plan,
    },
    token,
  };
}

export async function register(data: z.infer<typeof registerSchema>): Promise<{ user: AuthUser; token: string }> {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });
  
  if (existingUser) {
    throw new Error("Email already registered");
  }
  
  const passwordHash = await hashPassword(data.password);
  
  // For free tier or employee registration
  if (!data.companyName || data.role === "employee") {
    // Create a default personal tenant for free tier users
    const [defaultTenant] = await db.insert(tenants).values({
      name: data.name + "'s Workspace",
      primaryContact: data.email,
      plan: "free",
      status: "active"
    }).returning();

    const newUser = await db.insert(users).values({
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role || "clientAdmin",
      tenantId: defaultTenant.id
    }).returning();

    const token = await createSession(newUser[0].id, defaultTenant.id);
    
    return {
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role as 'employee' | 'clientAdmin' | 'superadmin',
        tenantId: defaultTenant.id,
      },
      token,
    };
  }
  
  // Create new tenant and admin user
  const [newTenant] = await db.insert(tenants).values({
    name: data.companyName,
    primaryContact: data.email,
    plan: "pro",
    status: "active"
  }).returning();
  
  const [newUser] = await db.insert(users).values({
    email: data.email,
    passwordHash,
    name: data.name,
    role: "clientAdmin",
    tenantId: newTenant.id,
  }).returning();
  
  const token = await createSession(newUser.id, newTenant.id);
  
  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as 'employee' | 'clientAdmin' | 'superadmin',
      tenantId: newTenant.id,
      tenantName: newTenant.name,
      tenantPlan: newTenant.plan,
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
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  
  if (existingUser) {
    throw new Error("Email already registered");
  }
  
  // Generate temporary password
  const temporaryPassword = Math.random().toString(36).slice(-8) + "Aa1!";
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
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  if (!await comparePasswords(oldPassword, user.passwordHash)) {
    throw new Error("Invalid current password");
  }
  
  const newPasswordHash = await hashPassword(newPassword);
  
  await db.update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function resetPassword(email: string): Promise<{ resetToken: string }> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  
  if (!user) {
    // Don't reveal if email exists
    return { resetToken: "sent" };
  }
  
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

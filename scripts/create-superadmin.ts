/**
 * Secure Superadmin Creation Script
 *
 * Run this script from the server command line to create the superadmin account.
 * NEVER expose this functionality as an API endpoint.
 *
 * Usage:
 *   SUPERADMIN_EMAIL=admin@company.com SUPERADMIN_PASSWORD=SecureP@ss123 npx tsx scripts/create-superadmin.ts
 *
 * Or with Railway:
 *   railway run npx tsx scripts/create-superadmin.ts
 */

import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, tenants } from '../db/schema';
import { eq } from 'drizzle-orm';

async function createSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'System Admin';

  if (!email || !password) {
    console.error('ERROR: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD environment variables are required');
    console.error('');
    console.error('Usage:');
    console.error('  SUPERADMIN_EMAIL=admin@company.com SUPERADMIN_PASSWORD=SecureP@ss123 npx tsx scripts/create-superadmin.ts');
    process.exit(1);
  }

  // Validate password strength
  if (password.length < 12) {
    console.error('ERROR: Password must be at least 12 characters long');
    process.exit(1);
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    console.error('ERROR: Password must contain uppercase, lowercase, number, and special character');
    process.exit(1);
  }

  console.log('Creating superadmin account...');
  console.log(`Email: ${email}`);

  try {
    // Hash password with strong salt rounds
    const passwordHash = await bcrypt.hash(password, 12);

    // Find or create tenant
    const tenantResult = await db.select().from(tenants).where(eq(tenants.name, 'Mizan Platform')).limit(1);
    let tenant = tenantResult.length > 0 ? tenantResult[0] : null;

    if (!tenant) {
      [tenant] = await db.insert(tenants).values({
        name: 'Mizan Platform',
        plan: 'enterprise',
        status: 'active'
      }).returning();
      console.log('Created platform tenant');
    }

    // Check if user exists
    const existingResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const existing = existingResult.length > 0 ? existingResult[0] : null;

    if (existing) {
      // Update existing user
      await db.update(users)
        .set({
          passwordHash,
          role: 'superadmin',
          isActive: true,
          name
        })
        .where(eq(users.email, email));

      console.log('SUCCESS: Superadmin account updated');
    } else {
      // Create new user
      await db.insert(users).values({
        tenantId: tenant.id,
        email,
        passwordHash,
        name,
        role: 'superadmin',
        isActive: true
      });

      console.log('SUCCESS: Superadmin account created');
    }

    console.log('');
    console.log('You can now log in at: /login');

    process.exit(0);
  } catch (error) {
    console.error('ERROR creating superadmin:', error);
    process.exit(1);
  }
}

createSuperadmin();

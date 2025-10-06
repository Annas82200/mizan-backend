// Temporary endpoint to create superadmin user
// Add this to your backend routes temporarily

import bcrypt from 'bcryptjs';
import { db } from './db/index.js';
import { users, tenants } from './db/schema.js';

export async function createSuperadminUser(req, res) {
  try {
    const email = 'anna@mizan.com';
    const password = 'MizanAdmin2024!';
    const name = 'Anna Dahrouj';

    console.log('🔐 Creating superadmin user...');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed');

    // First, try to find or create a superadmin tenant
    let tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.name, 'Mizan Superadmin')
    });

    if (!tenant) {
      console.log('📝 Creating superadmin tenant...');
      [tenant] = await db.insert(tenants).values({
        name: 'Mizan Superadmin',
        plan: 'enterprise',
        status: 'active'
      }).returning();
      console.log('✅ Tenant created:', tenant.id);
    } else {
      console.log('✅ Using existing tenant:', tenant.id);
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });

    if (existingUser) {
      console.log('📝 User exists, updating...');
      // Update existing user
      const [updatedUser] = await db.update(users)
        .set({
          passwordHash,
          role: 'superadmin',
          isActive: true,
          updatedAt: new Date()
        })
        .where((users, { eq }) => eq(users.email, email))
        .returning();

      return res.json({
        success: true,
        message: 'Superadmin user updated successfully!',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role
        }
      });
    } else {
      console.log('📝 Creating new user...');
      // Create new user
      const [newUser] = await db.insert(users).values({
        tenantId: tenant.id,
        email,
        passwordHash,
        name,
        role: 'superadmin',
        isActive: true
      }).returning();

      return res.json({
        success: true,
        message: 'Superadmin user created successfully!',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      });
    }
  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
}

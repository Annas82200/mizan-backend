import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function createSuperadmin() {
  // Use the public DATABASE_URL
  const connectionString = 'postgresql://postgres:rGCnmIBSqZkiPqFZmkbkQshewsNGxEmL@yamabiko.proxy.rlwy.net:23010/railway';

  console.log('🔌 Connecting to database...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database!');

    // Step 1: Create tenant
    console.log('📦 Creating superadmin tenant...');
    const tenantResult = await client.query(`
      INSERT INTO tenants (id, name, plan, status, created_at, updated_at)
      VALUES ('3fb789ff-63de-4e94-aee9-3c8bae9806e8', 'Mizan Superadmin', 'enterprise', 'active', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `);
    console.log('✅ Tenant ready');

    // Step 2: Create user
    console.log('👤 Creating superadmin user...');
    const passwordHash = '$2a$10$kO2oUDRzDSd0idWHNgyg8OUz96HviixDqSORbFA/ZdfPN7nwFykXS';

    const userResult = await client.query(`
      INSERT INTO users (tenant_id, email, password_hash, name, role, is_active, created_at, updated_at)
      VALUES ('3fb789ff-63de-4e94-aee9-3c8bae9806e8', 'anna@mizan.com', $1, 'Anna Dahrouj', 'superadmin', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        role = 'superadmin',
        is_active = true,
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
      RETURNING id, email, name, role;
    `, [passwordHash]);

    console.log('✅ Superadmin user created/updated!');
    console.log('\n📋 User Details:');
    console.log(userResult.rows[0]);

    console.log('\n🎉 SUCCESS! You can now login with:');
    console.log('   Email: anna@mizan.com');
    console.log('   Password: MizanAdmin2024!');

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createSuperadmin();

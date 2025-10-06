import pg from 'pg';

const { Pool } = pg;

async function setup() {
  const connectionString = 'postgresql://postgres:rGCnmIBSqZkiPqFZmkbkQshewsNGxEmL@yamabiko.proxy.rlwy.net:23010/railway';

  console.log('🔌 Connecting to database...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database!');

    // Create tenants table
    console.log('📦 Creating tenants table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'pro_plus', 'enterprise')),
        status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Tenants table created');

    // Create users table
    console.log('👤 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('superadmin', 'clientAdmin', 'admin', 'employee')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Users table created');

    // Create superadmin tenant
    console.log('🏢 Creating superadmin tenant...');
    await client.query(`
      INSERT INTO tenants (id, name, plan, status)
      VALUES ('superadmin-tenant', 'Mizan Superadmin', 'enterprise', 'active')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Tenant created');

    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const passwordHash = '$2a$10$kO2oUDRzDSd0idWHNgyg8OUz96HviixDqSORbFA/ZdfPN7nwFykXS';

    const result = await client.query(`
      INSERT INTO users (tenant_id, email, password_hash, name, role, is_active)
      VALUES ('superadmin-tenant', 'anna@mizan.com', $1, 'Anna Dahrouj', 'superadmin', true)
      ON CONFLICT (email) DO UPDATE SET
        role = 'superadmin',
        is_active = true,
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
      RETURNING id, email, name, role;
    `, [passwordHash]);

    console.log('✅ Superadmin user created!');
    console.log('\n📋 User Details:');
    console.log(result.rows[0]);

    console.log('\n🎉 SUCCESS! Database setup complete!');
    console.log('\n🔐 Login Credentials:');
    console.log('   Email: anna@mizan.com');
    console.log('   Password: MizanAdmin2024!');
    console.log('\n🌐 Login at: https://mizan.work/login');

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

setup();

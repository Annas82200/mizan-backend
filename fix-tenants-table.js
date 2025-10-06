import pg from 'pg';

const { Pool } = pg;

async function fixTenantsTable() {
  const connectionString = 'postgresql://postgres:rGCnmIBSqZkiPqFZmkbkQshewsNGxEmL@yamabiko.proxy.rlwy.net:23010/railway';

  console.log('🔌 Connecting to database...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected!');

    // Add missing columns to tenants table
    console.log('📝 Adding missing columns to tenants table...');

    await client.query(`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS domain TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS industry TEXT,
      ADD COLUMN IF NOT EXISTS vision TEXT,
      ADD COLUMN IF NOT EXISTS mission TEXT,
      ADD COLUMN IF NOT EXISTS strategy TEXT,
      ADD COLUMN IF NOT EXISTS values JSONB,
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS primary_contact TEXT,
      ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0;
    `);

    console.log('✅ Tenants table updated with all required columns!');

    // Verify columns
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Current tenants table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    client.release();
    await pool.end();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixTenantsTable();

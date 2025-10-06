import pg from 'pg';

const { Pool } = pg;

async function fixUsersTable() {
  const connectionString = 'postgresql://postgres:rGCnmIBSqZkiPqFZmkbkQshewsNGxEmL@yamabiko.proxy.rlwy.net:23010/railway';

  console.log('🔌 Connecting to database...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected!');

    // Add missing columns to users table
    console.log('📝 Adding missing columns to users table...');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS department_id TEXT,
      ADD COLUMN IF NOT EXISTS manager_id TEXT,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
    `);

    console.log('✅ Users table updated with all required columns!');

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Current users table structure:');
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

fixUsersTable();

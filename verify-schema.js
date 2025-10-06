import pg from 'pg';

const { Pool } = pg;

async function verifySchema() {
  const connectionString = 'postgresql://postgres:rGCnmIBSqZkiPqFZmkbkQshewsNGxEmL@yamabiko.proxy.rlwy.net:23010/railway';

  console.log('🔌 Connecting to database...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected!\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📋 DATABASE TABLES:');
    console.log('==================');
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;

      // Get columns for each table
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.log(`\n📦 ${tableName}:`);
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
    }

    client.release();
    await pool.end();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifySchema();

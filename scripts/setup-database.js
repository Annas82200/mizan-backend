#!/usr/bin/env node

/**
 * Database Setup Script
 * Following AGENT_CONTEXT_ULTIMATE.md requirements for production-ready database setup
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('⚠️ DATABASE_URL not found. Using development configuration.');
    return {
      connectionString: 'postgresql://localhost:5432/mizan',
      ssl: false
    };
  }

  return {
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
};

// Test database connection
async function testConnection() {
  const config = getDatabaseConfig();
  const pool = new Pool(config);
  
  try {
    console.log('🔍 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Provide helpful suggestions
    if (error.message.includes('role "postgres" does not exist')) {
      console.log('\n💡 Suggestions:');
      console.log('1. Create PostgreSQL user: CREATE USER postgres WITH PASSWORD \'password\';');
      console.log('2. Grant privileges: GRANT ALL PRIVILEGES ON DATABASE mizan TO postgres;');
      console.log('3. Or use a different connection string in DATABASE_URL');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Suggestions:');
      console.log('1. Ensure PostgreSQL is running: brew services start postgresql (macOS)');
      console.log('2. Check if PostgreSQL is listening on the correct port');
      console.log('3. Verify connection string format');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n💡 Suggestions:');
      console.log('1. Create database: CREATE DATABASE mizan;');
      console.log('2. Or use an existing database in DATABASE_URL');
    }
    
    await pool.end();
    return false;
  }
}

// Create database if it doesn't exist
async function createDatabase() {
  const config = getDatabaseConfig();
  
  // Try to connect to postgres database first
  const postgresConfig = {
    ...config,
    connectionString: config.connectionString.replace(/\/[^\/]+$/, '/postgres')
  };
  
  const pool = new Pool(postgresConfig);
  
  try {
    console.log('🔍 Checking if database exists...');
    const client = await pool.connect();
    
    // Check if mizan database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'mizan'"
    );
    
    if (result.rows.length === 0) {
      console.log('📦 Creating mizan database...');
      await client.query('CREATE DATABASE mizan');
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Failed to create database:', error.message);
    await pool.end();
    return false;
  }
}

// Run database migrations
async function runMigrations() {
  const config = getDatabaseConfig();
  const pool = new Pool(config);
  const client = await pool.connect();

  try {
    console.log('🔄 Running database migrations...');

    // 1. Create a custom migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _mizan_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Migration tracking table is ready.');

    // 2. Get already applied migrations
    const appliedMigrationsResult = await client.query('SELECT name FROM _mizan_migrations');
    const appliedMigrations = appliedMigrationsResult.rows.map(r => r.name);
    console.log('🔍 Found applied migrations:', appliedMigrations);

    // 3. Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'drizzle');
    const allMigrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log('🔍 Found migration files:', allMigrationFiles);

    // 4. Filter out applied migrations
    const pendingMigrations = allMigrationFiles.filter(file => !appliedMigrations.includes(file));

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations to apply.');
      client.release();
      await pool.end();
      return true;
    }

    console.log('⏳ Applying pending migrations:', pendingMigrations);

    // 5. Apply pending migrations
    for (const migrationFile of pendingMigrations) {
      console.log(`\nApplying migration: ${migrationFile}`);
      const filePath = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const statements = sql.split('--> statement-breakpoint').filter(s => s.trim() !== '');

      await client.query('BEGIN');
      try {
        for (const statement of statements) {
            console.log(`Executing statement...`);
            await client.query(statement);
        }
        
        await client.query('INSERT INTO _mizan_migrations (name) VALUES ($1)', [migrationFile]);
        await client.query('COMMIT');
        console.log(`✅ Migration ${migrationFile} applied successfully.`);

      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply migration ${migrationFile}`);
        throw e;
      }
    }

    console.log('\n✅ All migrations completed successfully.');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Main setup function
async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');
  
  // Step 1: Test connection
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('\n❌ Database setup failed: Connection test failed');
    process.exit(1);
  }
  
  // Step 2: Create database if needed
  const dbCreated = await createDatabase();
  if (!dbCreated) {
    console.log('\n❌ Database setup failed: Could not create database');
    process.exit(1);
  }
  
  // Step 3: Run migrations
  const migrationsOk = await runMigrations();
  if (!migrationsOk) {
    console.log('\n❌ Database setup failed: Migrations failed');
    process.exit(1);
  }
  
  console.log('\n🎉 Database setup completed successfully!');
  console.log('✅ Connection: Working');
  console.log('✅ Database: Ready');
  console.log('✅ Migrations: Applied');
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase, testConnection, createDatabase, runMigrations };
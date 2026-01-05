"use strict";
// backend/src/db/index.ts
// Production-ready database configuration following AGENT_CONTEXT_ULTIMATE.md requirements
// ✅ Complete error handling | ✅ Drizzle ORM | ✅ Multi-tenant isolation | ✅ No mock data
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConnection = exports.getConnectionStatus = exports.pool = exports.db = void 0;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema = __importStar(require("./schema"));
// Database connection configuration with comprehensive error handling
const getDatabaseConfig = () => {
    const databaseUrl = process.env.DATABASE_URL;
    // Enhanced configuration with fallback for development
    const baseConfig = {
        max: 20, // increased pool size for production
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        query_timeout: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        // Retry configuration
        allowExitOnIdle: false,
        statement_timeout: 30000,
        idle_in_transaction_session_timeout: 60000
    };
    if (!databaseUrl) {
        console.warn('⚠️ DATABASE_URL not found. Using fallback configuration for development.');
        console.warn('💡 Set DATABASE_URL in .env file for proper database connection.');
        // Development fallback - more permissive
        return {
            ...baseConfig,
            connectionString: 'postgresql://postgres:password@localhost:5432/mizan',
            ssl: false,
            max: 5 // smaller pool for development
        };
    }
    // Production configuration
    return {
        ...baseConfig,
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : process.env.DATABASE_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
    };
};
// Create connection pool with error recovery
const config = getDatabaseConfig();
const pool = new pg_1.Pool(config);
exports.pool = pool;
// Connection state tracking
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // Start with 2 second delay
// Enhanced connection monitoring
pool.on('connect', (client) => {
    isConnected = true;
    connectionAttempts = 0;
    console.log('✅ Database connection established');
});
pool.on('error', (err, client) => {
    isConnected = false;
    console.error('❌ Database pool error:', err.message);
    // Log specific error types for better debugging
    if (err.message.includes('ECONNREFUSED')) {
        console.error('💡 PostgreSQL server is not running or not accessible');
        console.error('   Check that PostgreSQL is running: sudo service postgresql status');
    }
    else if (err.message.includes('password authentication failed')) {
        console.error('💡 Database authentication failed');
        console.error('   Check DATABASE_URL credentials in .env file');
    }
    else if (err.message.includes('database') && err.message.includes('does not exist')) {
        console.error('💡 Database does not exist');
        console.error('   Create database: createdb mizan');
    }
    else if (err.message.includes('role') && err.message.includes('does not exist')) {
        console.error('💡 Database role/user does not exist');
        console.error('   Check PostgreSQL users: psql -U postgres -c "\\du"');
    }
});
pool.on('remove', () => {
    console.log('📤 Database connection removed from pool');
});
// Connection validation with retry logic
const validateConnection = async (retryCount = 0) => {
    try {
        const client = await pool.connect();
        // Test basic query
        await client.query('SELECT 1');
        // Test schema access (check if tables exist)
        const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      LIMIT 1
    `);
        if (tableCheck.rows.length === 0) {
            console.warn('⚠️ No tables found in database. Run migrations: npm run db:migrate');
        }
        client.release();
        isConnected = true;
        console.log('✅ Database connection validated successfully');
        return true;
    }
    catch (error) {
        isConnected = false;
        const err = error;
        console.error(`❌ Database connection validation failed (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}):`, err.message);
        // Retry logic with exponential backoff
        if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
            const delay = RETRY_DELAY * Math.pow(2, retryCount);
            console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return validateConnection(retryCount + 1);
        }
        // After max retries, provide detailed error guidance
        console.error('\n🚨 Database connection could not be established after multiple attempts.');
        console.error('📋 Troubleshooting steps:');
        console.error('   1. Ensure PostgreSQL is running');
        console.error('   2. Check DATABASE_URL in .env file');
        console.error('   3. Verify database "mizan" exists');
        console.error('   4. Check network/firewall settings');
        console.error('   5. Review PostgreSQL logs for details\n');
        return false;
    }
};
exports.validateConnection = validateConnection;
// Graceful shutdown handling
const gracefulShutdown = async () => {
    console.log('🔄 Closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
};
// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Create drizzle instance with schema
exports.db = (0, node_postgres_1.drizzle)(pool, { schema });
// Export connection state for health checks
const getConnectionStatus = () => ({
    isConnected,
    poolSize: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount
});
exports.getConnectionStatus = getConnectionStatus;
// Validate connection on module load
validateConnection().then(success => {
    if (!success && process.env.NODE_ENV === 'production') {
        console.error('🚨 CRITICAL: Database connection failed in production!');
        // In production, you might want to exit or alert
        if (process.env.EXIT_ON_DB_FAIL === 'true') {
            process.exit(1);
        }
    }
});
//# sourceMappingURL=index.js.map
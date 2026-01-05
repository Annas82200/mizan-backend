import { Pool } from 'pg';
import * as schema from './schema';
declare const pool: Pool;
declare const validateConnection: (retryCount?: number) => Promise<boolean>;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema>;
export { pool };
export declare const getConnectionStatus: () => {
    isConnected: boolean;
    poolSize: number;
    idleConnections: number;
    waitingClients: number;
};
export { validateConnection };
//# sourceMappingURL=index.d.ts.map
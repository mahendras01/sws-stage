import { Pool, type PoolClient, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable for the PostgreSQL database.");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export type DbClient = Pool | PoolClient;

export function toDbError(error: unknown): { message: string; code: string } {
  if (error && typeof error === "object") {
    const err = error as { message?: string; code?: string };
    return {
      message: err.message ?? "Database query failed",
      code: err.code ?? "DB_ERROR",
    };
  }

  return { message: "Database query failed", code: "DB_ERROR" };
}

export async function queryRows<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: DbClient = pool,
): Promise<T[]> {
  const result = await client.query<T>(sql, params);
  return result.rows;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
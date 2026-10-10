import { Pool, type QueryResultRow } from "pg";

import { log } from "./logger";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable for the local PostgreSQL database.");
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function normalizeSqlValue(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (value === undefined) return null;
  return value;
}

class PostgresQueryBuilder {
  private table: string;
  private conditions: string[] = [];
  private params: unknown[] = [];
  private selectColumns = "*";
  private orderBy: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private onConflict?: string;
  private countExact = false;
  private headOnly = false;
  private singleRowExpected = false;
  private maybeSingleRow = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    // After insert/update/upsert/delete, select() only chooses the RETURNING columns.
    // The operation stays as-is (it defaults to "select"); overwriting it here would
    // silently turn a write into a plain SELECT.
    this.selectColumns = columns || "*";
    this.countExact = options?.count === "exact";
    this.headOnly = Boolean(options?.head);
    return this;
  }

  eq(column: string, value: unknown) {
    this.conditions.push(`${quoteIdentifier(column)} = $${this.params.length + 1}`);
    this.params.push(normalizeSqlValue(value));
    return this;
  }

  ilike(column: string, value: string) {
    this.conditions.push(`${quoteIdentifier(column)} ILIKE $${this.params.length + 1}`);
    this.params.push(normalizeSqlValue(value));
    return this;
  }

  in(column: string, values: unknown[]) {
    if (!Array.isArray(values) || values.length === 0) {
      this.conditions.push(`FALSE`);
      return this;
    }

    const placeholders = values.map((_, index) => `$${this.params.length + index + 1}`).join(", ");
    this.conditions.push(`${quoteIdentifier(column)} IN (${placeholders})`);
    this.params.push(...values.map((value) => normalizeSqlValue(value)));
    return this;
  }

  or(expression: string) {
    const clauses: string[] = [];
    const chunks = expression.split(",").filter(Boolean);

    for (const chunk of chunks) {
      const [columnName, operator, ...rest] = chunk.split(".");
      const rawValue = rest.join(".");

      if (!columnName || !operator) {
        continue;
      }

      if (operator.toLowerCase() === "ilike") {
        clauses.push(`${quoteIdentifier(columnName)} ILIKE $${this.params.length + 1}`);
        this.params.push(`%${rawValue.replace(/^%|%$/g, "")}%`);
      }
    }

    if (clauses.length > 0) {
      this.conditions.push(`(${clauses.join(" OR ")})`);
    }

    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy.push(`${quoteIdentifier(column)} ${options?.ascending === false ? "DESC" : "ASC"}`);
    return this;
  }

  range(start: number, end: number) {
    this.offsetValue = Number(start) || 0;
    const safeEnd = Number(end) || 0;
    if (safeEnd >= this.offsetValue) {
      this.limitValue = safeEnd - this.offsetValue + 1;
    }
    return this;
  }

  limit(limit: number) {
    this.limitValue = Number(limit) || undefined;
    return this;
  }

  is(column: string, value: unknown) {
    if (value === null) {
      this.conditions.push(`${quoteIdentifier(column)} IS NULL`);
      return this;
    }
    this.conditions.push(`${quoteIdentifier(column)} IS $${this.params.length + 1}`);
    this.params.push(normalizeSqlValue(value));
    return this;
  }

  maybeSingle() {
    this.maybeSingleRow = true;
    return this;
  }

  single() {
    this.singleRowExpected = true;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = Array.isArray(payload) ? "insert" : "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  upsert(payload: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = payload;
    this.onConflict = options?.onConflict;
    return this;
  }

  private async executeSelect(): Promise<{ data: any; error: any; count?: number | null }> {
    const whereClause = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(" AND ")}` : "";
    const orderClause = this.orderBy.length > 0 ? ` ORDER BY ${this.orderBy.join(", ")}` : "";
    const limitClause = this.limitValue ? ` LIMIT ${this.limitValue}` : "";
    const offsetClause = this.offsetValue !== undefined ? ` OFFSET ${this.offsetValue}` : "";

    if (this.countExact && this.headOnly) {
      const countQuery = `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(this.table)}${whereClause};`;
      const result = await pool.query(countQuery, this.params);
      const count = Number(result.rows[0]?.count ?? 0);
      return { data: [], count, error: null };
    }

    if (this.countExact) {
      const countQuery = `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(this.table)}${whereClause};`;
      const countResult = await pool.query(countQuery, this.params);
      const count = Number(countResult.rows[0]?.count ?? 0);
      const dataQuery = `SELECT ${this.selectColumns} FROM ${quoteIdentifier(this.table)}${whereClause}${orderClause}${limitClause}${offsetClause};`;
      const dataResult = await pool.query(dataQuery, this.params);
      return { data: dataResult.rows, count, error: null };
    }

    const query = `SELECT ${this.selectColumns} FROM ${quoteIdentifier(this.table)}${whereClause}${orderClause}${limitClause}${offsetClause};`;
    const result = await pool.query(query, this.params);
    const rows = result.rows;

    if (this.singleRowExpected) {
      if (rows.length === 0) {
        return { data: null, error: new Error("No rows returned") };
      }
      return { data: rows[0], error: null };
    }

    if (this.maybeSingleRow) {
      return { data: rows[0] ?? null, error: null };
    }

    return { data: rows, error: null };
  }

  private shapeWriteResult(rows: any[]): { data: any; error: any } {
    // Matches the Supabase client: single()/maybeSingle() return one row (or null), otherwise an array.
    if (this.singleRowExpected || this.maybeSingleRow) {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  private async executeInsert(): Promise<{ data: any; error: any }> {
    const records = Array.isArray(this.payload) ? this.payload : [this.payload];
    const entries = records.filter(Boolean) as Record<string, unknown>[];

    if (entries.length === 0) {
      return { data: [], error: null };
    }

    const keys = Object.keys(entries[0]);
    const returning = this.selectColumns === "*" ? "*" : this.selectColumns;
    const valuePlaceholders: string[] = [];
    const values: unknown[] = [];

    for (const row of entries) {
      const base = values.length;
      const placeholders = keys.map((_, index) => `$${base + index + 1}`).join(", ");
      valuePlaceholders.push(`(${placeholders})`);
      values.push(...keys.map((key) => normalizeSqlValue(row[key])));
    }

    const query = `INSERT INTO ${quoteIdentifier(this.table)} (${keys.map((key) => quoteIdentifier(key)).join(", ")}) VALUES ${valuePlaceholders.join(", ")} RETURNING ${returning};`;
    const result = await pool.query(query, values);
    return this.shapeWriteResult(result.rows);
  }

  private async executeUpsert(): Promise<{ data: any; error: any }> {
    const records = Array.isArray(this.payload) ? this.payload : [this.payload];
    const entries = records.filter(Boolean) as Record<string, unknown>[];

    if (entries.length === 0) {
      return { data: [], error: null };
    }

    const keys = Object.keys(entries[0]);
    const returning = this.selectColumns === "*" ? "*" : this.selectColumns;
    const conflictColumns = (this.onConflict ? this.onConflict : keys[0])
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
    const valuePlaceholders: string[] = [];
    const values: unknown[] = [];

    for (const row of entries) {
      const base = values.length;
      const placeholders = keys.map((_, index) => `$${base + index + 1}`).join(", ");
      valuePlaceholders.push(`(${placeholders})`);
      values.push(...keys.map((key) => normalizeSqlValue(row[key])));
    }

    const updateKeys = keys.filter((key) => !conflictColumns.includes(key));
    // When every column is part of the conflict target, re-assign the first one so RETURNING still yields the row.
    const updateAssignments = (updateKeys.length > 0 ? updateKeys : [conflictColumns[0]])
      .map((key) => `${quoteIdentifier(key)} = EXCLUDED.${quoteIdentifier(key)}`)
      .join(", ");

    const query = `INSERT INTO ${quoteIdentifier(this.table)} (${keys.map((key) => quoteIdentifier(key)).join(", ")}) VALUES ${valuePlaceholders.join(", ")} ON CONFLICT (${conflictColumns.map((column) => quoteIdentifier(column)).join(", ")}) DO UPDATE SET ${updateAssignments} RETURNING ${returning};`;
    const result = await pool.query(query, values);
    return this.shapeWriteResult(result.rows);
  }

  private async executeUpdate(): Promise<{ data: any; error: any }> {
    if (!this.payload || typeof this.payload !== "object") {
      return { data: null, error: new Error("Update payload is required") };
    }

    const assignments = Object.entries(this.payload)
      .map(([key, value], index) => `${quoteIdentifier(key)} = $${this.params.length + index + 1}`)
      .join(", ");

    const whereClause = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(" AND ")}` : "";
    const returning = this.selectColumns === "*" ? "*" : this.selectColumns;
    // WHERE placeholders ($1..$n) were numbered first, so their params must come first; SET placeholders follow.
    const values = [...this.params, ...Object.values(this.payload).map((value) => normalizeSqlValue(value))];

    const query = `UPDATE ${quoteIdentifier(this.table)} SET ${assignments}${whereClause} RETURNING ${returning};`;
    const result = await pool.query(query, values);
    return this.shapeWriteResult(result.rows);
  }

  private async executeDelete(): Promise<{ data: any; error: any }> {
    const whereClause = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(" AND ")}` : "";
    const query = `DELETE FROM ${quoteIdentifier(this.table)}${whereClause} RETURNING *;`;
    const result = await pool.query(query, this.params);
    return { data: result.rows, error: null };
  }

  async execute(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      if (this.operation === "select") {
        return await this.executeSelect();
      }
      if (this.operation === "insert") {
        return await this.executeInsert();
      }
      if (this.operation === "upsert") {
        return await this.executeUpsert();
      }
      if (this.operation === "update") {
        return await this.executeUpdate();
      }
      if (this.operation === "delete") {
        return await this.executeDelete();
      }
      return { data: null, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Database query failed";
      log.error("db.query_failed", { table: this.table, operation: this.operation, error });
      return { data: null, error: { message, code: (error as any)?.code ?? "DB_ERROR" } };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch(onrejected?: ((reason: unknown) => any) | null) {
    return this.execute().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return this.execute().finally(onfinally);
  }
}

export function getDatabaseClient() {
  return {
    from(table: string) {
      return new PostgresQueryBuilder(table);
    },
    async rpc(functionName: string, params: unknown[] = []) {
      const placeholders = params.map((_, index) => `$${index + 1}`).join(", ");
      const query = `SELECT ${quoteIdentifier(functionName)}(${placeholders}) AS value;`;
      try {
        const result = await pool.query(query, params);
        return { data: result.rows[0]?.value ?? null, error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : "RPC call failed";
        log.error("db.rpc_failed", { function: functionName, error });
        return { data: null, error: { message, code: (error as any)?.code ?? "DB_ERROR" } };
      }
    },
  };
}

export const supabase = getDatabaseClient();

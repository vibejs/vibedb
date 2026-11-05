import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool, type PoolConfig } from "pg";
import { DB_INVALID_CONFIG, DbError } from "./errors.ts";
import type { DbDriver } from "./module.ts";

export interface PostgresDriverOptions {
  readonly connectionString?: string;
  /** A caller-owned pool. The module still closes it on shutdown. */
  readonly pool?: Pool;
  readonly migrationsFolder?: string;
}

/** A node-postgres driver. Install `pg` when you import `@usevibejs/db/postgres`. */
export function postgresDriver(options: PostgresDriverOptions): DbDriver {
  const connectionString = options.connectionString?.trim();
  if (options.pool === undefined && (connectionString === undefined || connectionString === "")) {
    throw new DbError(DB_INVALID_CONFIG, "postgresDriver requires a connection string or a pool.");
  }
  return {
    async open(schema) {
      const pool = options.pool ?? new Pool({ connectionString });
      const db = drizzle({ client: pool, schema });
      return {
        db,
        async migrate() {
          if (options.migrationsFolder === undefined) return;
          await migrate(db, { migrationsFolder: options.migrationsFolder });
        },
        async close() {
          await pool.end();
        },
        async ping() {
          await db.execute(sql`select 1`);
        },
      };
    },
  };
}

export type { PoolConfig };

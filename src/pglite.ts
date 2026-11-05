import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { DbDriver } from "./module.ts";

export interface PgliteDriverOptions {
  /** A caller-owned client. The module still closes it on shutdown. */
  readonly client?: PGlite;
  /** Drizzle migrations folder. Omitted means there is nothing to migrate. */
  readonly migrationsFolder?: string;
}

/** A PGlite driver for tests and single-process apps. */
export function pgliteDriver(options: PgliteDriverOptions = {}): DbDriver {
  return {
    async open(schema) {
      const client = options.client ?? new PGlite();
      const db = drizzle({ client, schema });
      return {
        db,
        async migrate() {
          if (options.migrationsFolder === undefined) return;
          await migrate(db, { migrationsFolder: options.migrationsFolder });
        },
        async close() {
          await client.close();
        },
        async ping() {
          await db.execute(sql`select 1`);
        },
      };
    },
  };
}

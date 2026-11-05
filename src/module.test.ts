import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { JsonLogger, Module } from "@usevibejs/server";
import { VibeFactory } from "@usevibejs/server";
import { afterEach, expect, it } from "vitest";
import { DB_INVALID_CONFIG, DB_MIGRATION_FAILED, DB_UNAVAILABLE, DbError } from "./errors.ts";
import { DB, DbModule, type DbDriver } from "./module.ts";
import { pgliteDriver } from "./pglite.ts";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs.length = 0;
});

function migrations(): string {
  const dir = mkdtempSync(join(tmpdir(), "vibedb-"));
  dirs.push(dir);
  mkdirSync(join(dir, "meta"));
  writeFileSync(join(dir, "0000_init.sql"), 'CREATE TABLE "notes" ("id" text PRIMARY KEY);');
  writeFileSync(
    join(dir, "meta", "_journal.json"),
    JSON.stringify({
      version: "7",
      dialect: "postgresql",
      entries: [
        { idx: 0, version: "7", when: 1_700_000_000_000, tag: "0000_init", breakpoints: true },
      ],
    }),
  );
  return dir;
}

it("migrates on bootstrap, answers the health contract, and closes on shutdown", async () => {
  const client = new PGlite();
  @Module({
    imports: [
      DbModule.forRoot({
        schema: {},
        driver: pgliteDriver({ client, migrationsFolder: migrations() }),
      }),
    ],
  })
  class AppModule {}
  const app = await VibeFactory.create(AppModule, { logger: new JsonLogger({ level: "silent" }) });
  const health = await app.request("/db/health");
  expect(health.status).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  await client.query(`insert into notes (id) values ('a')`);
  const rows = await client.query<{ id: string }>(`select id from notes`);
  expect(rows.rows).toEqual([{ id: "a" }]);
  const opened = app.get(DB);
  await app.close();
  await expect(opened.ping()).rejects.toThrow(Error);
});

it("reports an unavailable database", async () => {
  const driver: DbDriver = {
    async open() {
      return {
        db: {},
        async migrate() {},
        async close() {},
        async ping() {
          throw new Error("down");
        },
      };
    },
  };
  @Module({ imports: [DbModule.forRoot({ schema: {}, driver })] })
  class AppModule {}
  const app = await VibeFactory.create(AppModule, { logger: new JsonLogger({ level: "silent" }) });
  const health = await app.request("/db/health");
  expect(health.status).toBe(503);
  expect(await health.json()).toMatchObject({ code: DB_UNAVAILABLE });
  await app.close();
});

it("fails bootstrap when migration throws and still closes", async () => {
  let closed = false;
  const driver: DbDriver = {
    async open() {
      return {
        db: {},
        async migrate() {
          throw new Error("bad sql");
        },
        async close() {
          closed = true;
        },
        async ping() {},
      };
    },
  };
  @Module({ imports: [DbModule.forRoot({ schema: {}, driver })] })
  class AppModule {}
  await expect(
    VibeFactory.create(AppModule, { logger: new JsonLogger({ level: "silent" }) }),
  ).rejects.toMatchObject({ code: DB_MIGRATION_FAILED });
  expect(closed).toBe(false);
  expect(new DbError(DB_MIGRATION_FAILED, "x").name).toBe("DbError");
});

it("rejects a schema or driver that cannot be opened", () => {
  const driver: DbDriver = {
    async open() {
      throw new Error("unused");
    },
  };
  expect(() =>
    DbModule.forRoot({ schema: null as unknown as Record<string, unknown>, driver }),
  ).toThrow(expect.objectContaining({ code: DB_INVALID_CONFIG }));
  expect(() =>
    DbModule.forRoot({ schema: 1 as unknown as Record<string, unknown>, driver }),
  ).toThrow(/schema/);
  expect(() =>
    DbModule.forRoot({ schema: [] as unknown as Record<string, unknown>, driver }),
  ).toThrow(/schema/);
  expect(() => DbModule.forRoot({ schema: {}, driver: undefined as unknown as DbDriver })).toThrow(
    /driver/,
  );
  expect(() => DbModule.forRoot({ schema: {}, driver: null as unknown as DbDriver })).toThrow(
    /driver/,
  );
  expect(() =>
    DbModule.forRoot({ schema: {}, driver: { open: "no" } as unknown as DbDriver }),
  ).toThrow(/driver/);
});

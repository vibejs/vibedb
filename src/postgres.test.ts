import { beforeEach, expect, it, vi } from "vitest";
import { DB_INVALID_CONFIG } from "./errors.ts";

const mocks = vi.hoisted(() => {
  const execute = vi.fn<() => Promise<void>>(async () => {});
  return {
    pools: [] as unknown[],
    end: vi.fn<() => Promise<void>>(async () => {}),
    execute,
    migrate: vi.fn<() => Promise<void>>(async () => {}),
    drizzle: vi.fn<() => { execute: typeof execute }>(() => ({ execute })),
  };
});

vi.mock("pg", () => ({
  Pool: class {
    constructor(options: unknown) {
      mocks.pools.push(options);
    }
    end = mocks.end;
  },
}));

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: mocks.drizzle,
}));

vi.mock("drizzle-orm/node-postgres/migrator", () => ({
  migrate: mocks.migrate,
}));

const { postgresDriver } = await import("./postgres.ts");

beforeEach(() => {
  mocks.pools.length = 0;
  mocks.end.mockClear();
  mocks.execute.mockClear();
  mocks.migrate.mockClear();
  mocks.drizzle.mockClear();
});

it("opens a pool from a connection string and migrates", async () => {
  const driver = postgresDriver({
    connectionString: "  postgres://localhost/app  ",
    migrationsFolder: "/migrations",
  });
  const opened = await driver.open({ notes: {} });
  await opened.migrate();
  await opened.ping();
  await opened.close();
  expect(mocks.pools).toEqual([{ connectionString: "postgres://localhost/app" }]);
  expect(mocks.migrate).toHaveBeenCalledWith(expect.anything(), {
    migrationsFolder: "/migrations",
  });
  expect(mocks.execute).toHaveBeenCalledOnce();
  expect(mocks.end).toHaveBeenCalledOnce();
  expect(mocks.drizzle).toHaveBeenCalledWith({ client: expect.anything(), schema: { notes: {} } });
});

it("uses a provided pool and skips migration without a folder", async () => {
  const pool = { end: vi.fn<() => Promise<void>>(async () => {}) };
  const opened = await postgresDriver({ pool: pool as never }).open({});
  await opened.migrate();
  await opened.close();
  expect(mocks.pools).toEqual([]);
  expect(mocks.migrate).not.toHaveBeenCalled();
  expect(pool.end).toHaveBeenCalledOnce();
});

it("rejects a missing connection", () => {
  expect(() => postgresDriver({})).toThrow(expect.objectContaining({ code: DB_INVALID_CONFIG }));
  expect(() => postgresDriver({ connectionString: "   " })).toThrow(
    expect.objectContaining({ code: DB_INVALID_CONFIG }),
  );
});

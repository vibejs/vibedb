// oxlint-disable typescript/no-extraneous-class -- module classes are containers
import {
  Controller,
  Handle,
  HttpError,
  Module,
  inject,
  token,
  type DynamicModule,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
  type Token,
} from "@usevibejs/server";
import { dbHealth } from "./contract.ts";
import { DB_INVALID_CONFIG, DB_MIGRATION_FAILED, DB_UNAVAILABLE, DbError } from "./errors.ts";

/** A database opened by a driver. `db` is the Drizzle instance for that driver. */
export interface OpenedDatabase<TDb = unknown> {
  readonly db: TDb;
  migrate(): Promise<void>;
  close(): Promise<void>;
  ping(): Promise<void>;
}

/** Opens a database for a Drizzle schema. The module migrates it on bootstrap and closes it on shutdown. */
export interface DbDriver<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TDb = unknown,
> {
  open(schema: TSchema): Promise<OpenedDatabase<TDb>>;
}

export interface DbModuleOptions<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TDb = unknown,
> {
  readonly schema: TSchema;
  readonly driver: DbDriver<TSchema, TDb>;
}

/** Inject this to use the opened database. */
export const DB: Token<OpenedDatabase> = token<OpenedDatabase>("DB");

class DbLifecycle implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly opened = inject(DB);

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.opened.migrate();
    } catch (error) {
      throw new DbError(DB_MIGRATION_FAILED, "Database migration failed.", { cause: error });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.opened.close();
  }
}

@Controller(dbHealth)
class DbHealthController {
  private readonly opened = inject(DB);

  @Handle(dbHealth.check)
  async check(): Promise<{ status: "ok" }> {
    try {
      await this.opened.ping();
    } catch (error) {
      throw new HttpError(503, DB_UNAVAILABLE, "Database is unavailable.", { cause: error });
    }
    return { status: "ok" };
  }
}

function assertOptions(options: DbModuleOptions): void {
  const { schema, driver } = options;
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    throw new DbError(DB_INVALID_CONFIG, "schema must be an object.");
  }
  if (driver === undefined || driver === null || typeof driver.open !== "function") {
    throw new DbError(DB_INVALID_CONFIG, "driver.open must be a function.");
  }
}

/** Opens `driver` for `schema`, migrates on bootstrap, and closes on shutdown. */
@Module({})
export class DbModule {
  static forRoot<TSchema extends Record<string, unknown>, TDb>(
    options: DbModuleOptions<TSchema, TDb>,
  ): DynamicModule {
    assertOptions(options);
    return {
      module: DbModule,
      global: true,
      controllers: [DbHealthController],
      providers: [
        DbLifecycle,
        { provide: DB, useFactory: () => options.driver.open(options.schema) },
      ],
      exports: [DB],
    };
  }
}

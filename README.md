# Vibe DB

**Drizzle module for vibe.js. Migrate on bootstrap, close on shutdown.**

The package name is `@usevibejs/db`.

## Install

```bash
pnpm add @usevibejs/db @usevibejs/server @usevibejs/contract
```

## Quick start

`DbModule.forRoot({ schema, driver })` opens the driver, migrates during application bootstrap, and closes the pool during shutdown. `inject(DB)` is the open database. `GET /db/health` is the health contract.

```ts
import { DbModule } from "@usevibejs/db";
import { pgliteDriver } from "@usevibejs/db/pglite";

DbModule.forRoot({ schema, driver: pgliteDriver({ migrationsFolder: "./drizzle" }) });
```

Install `pg` before importing `@usevibejs/db/postgres`. Tests and single-process apps can use `@usevibejs/db/pglite`.

## Error codes

See [docs/errors.md](docs/errors.md).

## Local development

```bash
pnpm install
pnpm check
```

`pnpm check` formats, lints, typechecks, and runs tests at 100% per-file coverage.

## Releases

Releases use changesets. A maintainer runs the Release workflow from main. Do not publish by hand.

## License

MIT. See [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

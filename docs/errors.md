# Error codes

These codes belong to `@usevibejs/db`. The `VIBE` series belongs to the vibe.js monorepo and is not used here.

| Code                  | Meaning                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `DB_INVALID_CONFIG`   | Thrown when schema or driver is missing.                              |
| `DB_MIGRATION_FAILED` | Thrown when bootstrap migration fails. The cause is the driver error. |
| `DB_UNAVAILABLE`      | HTTP 503 from GET /db/health when ping fails.                         |

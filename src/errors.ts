/** Stable codes owned by `@usevibejs/db`. They are not vibe.js `VIBE` codes. */
export const DB_INVALID_CONFIG = "DB_INVALID_CONFIG";
export const DB_MIGRATION_FAILED = "DB_MIGRATION_FAILED";
export const DB_UNAVAILABLE = "DB_UNAVAILABLE";

/** A database error. `code` is stable. */
export class DbError extends Error {
  override readonly name = "DbError";
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
  }
}

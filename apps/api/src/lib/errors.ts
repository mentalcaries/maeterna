import { HTTPException } from "hono/http-exception"

export type AppStatus = 400 | 401 | 403 | 404 | 409 | 410 | 422

export const STATUS_CODES: Record<AppStatus, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  410: "GONE",
  422: "VALIDATION_ERROR",
}

// Throw an HTTPException. Typed as `never` so it can replace any return.
export function raise(status: AppStatus, message: string): never {
  throw new HTTPException(status, { message })
}

// D1/SQLite surfaces unique index violations as a plain Error whose message
// contains this substring — used to translate a racing insert into a 409
// instead of an unhandled 500.
export function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message)
}

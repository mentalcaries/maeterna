import { HTTPException } from "hono/http-exception"

export type AppStatus = 401 | 403 | 404 | 409 | 410 | 422

export const STATUS_CODES: Record<AppStatus, string> = {
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

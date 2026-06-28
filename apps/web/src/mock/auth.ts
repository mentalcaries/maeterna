export type Role = "patient" | "doctor" | "admin"

export interface Session {
  userId: string
  role: Role
  name: string
}

const SESSION_KEY = "maeterna_session"

export function getSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(SESSION_KEY)
}

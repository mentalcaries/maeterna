import { createAuthClient } from "better-auth/client"
import { magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL as string,
  plugins: [magicLinkClient()],
})

export type AppUser = {
  id: string
  email: string
  name: string
  role: "patient" | "doctor" | "admin"
  firstName?: string | null
  lastName?: string | null
  status?: "active" | "suspended" | "pending_verification" | null
}

export function getAppUser(
  sessionData: { data: { user: unknown } | null } | null | undefined
): AppUser | null {
  if (!sessionData?.data?.user) return null
  return sessionData.data.user as AppUser
}

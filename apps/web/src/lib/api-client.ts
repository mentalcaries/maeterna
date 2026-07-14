import createClient from "openapi-fetch"
import type { paths } from "./api.types"
import { markAccountSuspended } from "./account-suspended"

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL as string,
  credentials: "include",
})

apiClient.use({
  async onResponse({ response }) {
    if (response.status === 403) {
      try {
        const body = await response.clone().json()
        if (body?.code === "ACCOUNT_SUSPENDED") markAccountSuspended()
      } catch {
        // non-JSON body — not our error shape, ignore
      }
    }
    return response
  },
})

import createClient from "openapi-fetch"
import type { paths } from "./api.types"

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL as string,
  credentials: "include",
})

import { useQuery } from "@tanstack/react-query"
import { authClient } from "./auth-client"

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession(),
    staleTime: 1000 * 60 * 5,
  })
}

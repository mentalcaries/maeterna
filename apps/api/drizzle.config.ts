import { defineConfig } from "drizzle-kit"
import { existsSync, readFileSync } from "node:fs"

if (existsSync(".dev.vars")) {
  for (const line of readFileSync(".dev.vars", "utf-8").split("\n")) {
    const match = line.match(/^([^#=\s][^=]*?)=(.*)$/)
    if (match) process.env[match[1].trim()] ??= match[2].trim()
  }
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
})

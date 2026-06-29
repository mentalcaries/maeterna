import { fetchMBTTRegistry } from "../src/lib/mbtt"

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID!
const token = process.env.CLOUDFLARE_D1_TOKEN!
const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`

const CONCURRENT = 50
const syncedAt = new Date().toISOString()

const INSERT_SQL = `INSERT INTO mbtt_registry (member_id, first_name, last_name, town_id, status, synced_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (member_id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name, status = excluded.status, synced_at = excluded.synced_at`

async function d1Query(sql: string, params: unknown[]) {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  })
  const json = (await res.json()) as any
  if (!json.success) throw new Error(JSON.stringify(json.errors))
}

console.log("Fetching MBTT registry...")
const doctors = await fetchMBTTRegistry()
console.log(
  `Fetched ${doctors.length} records. Upserting ${CONCURRENT} at a time...`
)

for (let i = 0; i < doctors.length; i += CONCURRENT) {
  await Promise.all(
    doctors
      .slice(i, i + CONCURRENT)
      .map((d) =>
        d1Query(INSERT_SQL, [
          d.member_id,
          d.first_name,
          d.last_name,
          d.town_id,
          d.status,
          syncedAt,
        ])
      )
  )
  console.log(
    `  ${Math.min(i + CONCURRENT, doctors.length)} / ${doctors.length}`
  )
}

console.log("Done.")

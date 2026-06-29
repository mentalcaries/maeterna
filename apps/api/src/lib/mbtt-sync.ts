import { fetchMBTTRegistry } from "./mbtt"

const BATCH_SIZE = 100

const INSERT_SQL = `INSERT INTO mbtt_registry (member_id, first_name, last_name, town_id, status, synced_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (member_id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name, status = excluded.status, synced_at = excluded.synced_at`

export async function syncMBTTRegistry(db: D1Database): Promise<void> {
  const doctors = await fetchMBTTRegistry()
  const syncedAt = new Date().toISOString()
  const stmt = db.prepare(INSERT_SQL)

  for (let i = 0; i < doctors.length; i += BATCH_SIZE) {
    const batch = doctors
      .slice(i, i + BATCH_SIZE)
      .map((d) =>
        stmt.bind(
          d.member_id,
          d.first_name,
          d.last_name,
          d.town_id,
          d.status,
          syncedAt
        )
      )
    await db.batch(batch)
  }

  console.log(`MBTT sync complete: ${doctors.length} records processed`)
}

export function hourOptionValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:00`
}

export function roundToNearestAvailableHour(
  date: Date,
  now = new Date()
): Date {
  const rounded = new Date(date)
  rounded.setMinutes(rounded.getMinutes() >= 30 ? 60 : 0, 0, 0)

  if (rounded > now) {
    rounded.setTime(date.getTime())
    rounded.setMinutes(0, 0, 0)
  }

  return rounded
}

export function combineLocalDateAndHour(
  date: Date | undefined,
  time: string
): Date | null {
  if (!date) return null
  const hour = Number(time.split(":")[0])
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null

  const timestamp = new Date(date)
  timestamp.setHours(hour, 0, 0, 0)
  return timestamp
}

const MBTT_URL = "https://mbtt.org/national-listing/"
const VALID_STATUSES = ["3", "4"]

export interface MBTTDoctor {
  member_id: string
  first_name: string
  last_name: string
  town_id: string
  status: string
}

interface MBTTLocation {
  lat: number
  lng: number
  title: string
  doctors: MBTTDoctor[]
}

export async function fetchMBTTRegistry(): Promise<MBTTDoctor[]> {
  const response = await fetch(MBTT_URL)
  const html = await response.text()

  const marker = "locations = ["
  const markerIdx = html.indexOf(marker)
  if (markerIdx === -1)
    throw new Error("Could not find locations variable in MBTT HTML")

  const arrayStart = markerIdx + marker.length - 1
  let depth = 0
  let arrayEnd = arrayStart
  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++
    else if (html[i] === "]") {
      depth--
      if (depth === 0) {
        arrayEnd = i
        break
      }
    }
  }

  const raw = html.slice(arrayStart, arrayEnd + 1).replace(/,(\s*[}\]])/g, "$1")
  const locations: MBTTLocation[] = JSON.parse(raw)
  return locations.flatMap((location) => location.doctors)
}

export function isValidRegistration(status: string): boolean {
  return VALID_STATUSES.includes(status)
}

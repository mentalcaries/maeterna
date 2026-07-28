import { presignGet, readR2Creds } from "./r2-presign"

// Fixed palette shared with the web app (see apps/web/src/lib/avatar-palette.ts).
// Any change here MUST be mirrored there — the API validates the slug and the
// web app maps the slug to a CSS colour.
export const AVATAR_PALETTE = [
  "coral",
  "sage",
  "sky",
  "lavender",
  "sand",
  "clay",
  "mint",
] as const

export type AvatarPaletteSlug = (typeof AVATAR_PALETTE)[number]

export function isAvatarPaletteSlug(v: unknown): v is AvatarPaletteSlug {
  return (
    typeof v === "string" && (AVATAR_PALETTE as readonly string[]).includes(v)
  )
}

export function computeInitials(
  firstName: string | null,
  lastName: string | null
): string {
  const f = firstName?.trim()?.[0] ?? ""
  const l = lastName?.trim()?.[0] ?? ""
  const initials = `${f}${l}`.toUpperCase()
  return initials.length > 0 ? initials : "?"
}

const AVATAR_URL_TTL_SECONDS = 60 * 60

// Given the raw user row fields, return the three avatar-related fields the
// PatientSchema exposes. `avatarObjectKey` is an R2 key, not a URL.
export async function serializePatientAvatar(input: {
  env: CloudflareBindings
  avatarObjectKey: string | null
  avatarBackgroundColor: string | null
  firstName: string | null
  lastName: string | null
}): Promise<{
  avatarUrl: string | null
  avatarBackgroundColor: AvatarPaletteSlug | null
  initials: string
}> {
  const initials = computeInitials(input.firstName, input.lastName)
  const bg = isAvatarPaletteSlug(input.avatarBackgroundColor)
    ? input.avatarBackgroundColor
    : null

  if (!input.avatarObjectKey) {
    return { avatarUrl: null, avatarBackgroundColor: bg, initials }
  }

  const creds = readR2Creds(
    input.env as unknown as Record<string, string | undefined>,
    input.env.R2_AVATARS_PUBLIC_BUCKET
  )
  const avatarUrl = await presignGet(
    creds,
    input.avatarObjectKey,
    AVATAR_URL_TTL_SECONDS
  )
  return { avatarUrl, avatarBackgroundColor: bg, initials }
}

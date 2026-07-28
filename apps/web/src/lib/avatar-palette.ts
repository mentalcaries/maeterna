// Palette slugs must stay in sync with apps/api/src/lib/avatar.ts — the API
// validates the slug and the web app maps it to a concrete CSS colour.
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

// Mid-lightness oklch tones chosen to remain legible with white text on both
// the light and dark themes without needing a per-theme variant.
const PALETTE: Record<AvatarPaletteSlug, string> = {
  coral: "oklch(0.72 0.14 25)",
  sage: "oklch(0.72 0.08 145)",
  sky: "oklch(0.72 0.11 235)",
  lavender: "oklch(0.72 0.10 300)",
  sand: "oklch(0.78 0.10 80)",
  clay: "oklch(0.65 0.11 45)",
  mint: "oklch(0.78 0.10 175)",
}

const DEFAULT_SLUG: AvatarPaletteSlug = "sage"

export function avatarBackgroundCss(slug: AvatarPaletteSlug | null): string {
  return PALETTE[slug ?? DEFAULT_SLUG]
}

export function isAvatarPaletteSlug(v: unknown): v is AvatarPaletteSlug {
  return (
    typeof v === "string" && (AVATAR_PALETTE as readonly string[]).includes(v)
  )
}

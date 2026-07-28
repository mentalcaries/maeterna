import { describe, expect, it } from "vite-plus/test"
import { AVATAR_PALETTE, computeInitials, isAvatarPaletteSlug } from "./avatar"

describe("computeInitials", () => {
  it("returns uppercased first and last initial", () => {
    expect(computeInitials("jane", "doe")).toBe("JD")
  })

  it("returns '?' when both names are null", () => {
    expect(computeInitials(null, null)).toBe("?")
  })

  it("returns '?' when both names are empty strings", () => {
    expect(computeInitials("", "")).toBe("?")
  })

  it("returns just the first initial when last name is missing", () => {
    expect(computeInitials("Alex", null)).toBe("A")
  })

  it("returns just the last initial when first name is missing", () => {
    expect(computeInitials(null, "Kim")).toBe("K")
  })

  it("trims leading whitespace before picking initials", () => {
    expect(computeInitials("  ada", "  lovelace")).toBe("AL")
  })
})

describe("isAvatarPaletteSlug", () => {
  it("accepts every slug listed in AVATAR_PALETTE", () => {
    for (const slug of AVATAR_PALETTE) {
      expect(isAvatarPaletteSlug(slug)).toBe(true)
    }
  })

  it("rejects an unknown string", () => {
    expect(isAvatarPaletteSlug("magenta")).toBe(false)
  })

  it("rejects null", () => {
    expect(isAvatarPaletteSlug(null)).toBe(false)
  })

  it("rejects a number", () => {
    expect(isAvatarPaletteSlug(42)).toBe(false)
  })

  it("rejects an object", () => {
    expect(isAvatarPaletteSlug({ slug: "coral" })).toBe(false)
  })
})

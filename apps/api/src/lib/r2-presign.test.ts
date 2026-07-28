import { describe, expect, it } from "vite-plus/test"
import { presignGet, presignPut, type R2Credentials } from "./r2-presign"

const CREDS: R2Credentials = {
  accountId: "test-account",
  accessKeyId: "AKIATESTKEY",
  secretAccessKey: "supersecretvalue",
  bucket: "test-bucket",
}

describe("presignGet", () => {
  it("preserves slashes in the object key path", async () => {
    const url = await presignGet(CREDS, "avatars/user-123/abc.webp", 3600)
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/test-bucket/avatars/user-123/abc.webp")
    expect(parsed.pathname).not.toContain("%2F")
  })

  it("targets the account-scoped R2 endpoint", async () => {
    const url = await presignGet(CREDS, "avatars/x.webp", 60)
    expect(url).toContain("test-account.r2.cloudflarestorage.com")
  })

  it("includes SigV4 query parameters and requested expiry", async () => {
    const url = await presignGet(CREDS, "avatars/x.webp", 900)
    const parsed = new URL(url)
    expect(parsed.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256")
    expect(parsed.searchParams.get("X-Amz-Expires")).toBe("900")
    expect(parsed.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe("presignPut", () => {
  it("preserves slashes in the object key path", async () => {
    const url = await presignPut(
      CREDS,
      "avatars/user-9/y.webp",
      "image/webp",
      300
    )
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/test-bucket/avatars/user-9/y.webp")
    expect(parsed.pathname).not.toContain("%2F")
  })
})

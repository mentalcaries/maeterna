import type { AvatarPaletteSlug } from "./avatar-palette"

// Small direct-fetch wrapper for the four /me/avatar endpoints. These routes
// are not yet in api.types.ts (openapi regen requires a running server); once
// the generator is rerun, callers can migrate to apiClient.

const API_BASE = import.meta.env.VITE_API_URL as string

type UploadUrlResponse = {
  url: string
  objectKey: string
  contentType: "image/webp"
  maxBytes: number
  expiresInSeconds: number
}

async function request(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Avatar API ${path} failed (${res.status}): ${text}`)
  }
  return res
}

export async function requestAvatarUploadUrl(): Promise<UploadUrlResponse> {
  const res = await request("/me/avatar/upload-url", { method: "POST" })
  return res.json()
}

export async function putAvatarToR2(
  upload: UploadUrlResponse,
  blob: Blob
): Promise<void> {
  const res = await fetch(upload.url, {
    method: "PUT",
    headers: { "content-type": upload.contentType },
    body: blob,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`R2 PUT failed (${res.status}): ${text}`)
  }
}

export async function confirmAvatarUpload(objectKey: string): Promise<void> {
  await request("/me/avatar/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objectKey }),
  })
}

export async function deleteAvatar(): Promise<void> {
  await request("/me/avatar", { method: "DELETE" })
}

export async function updateAvatarBackground(
  color: AvatarPaletteSlug | null
): Promise<void> {
  await request("/me/avatar/background", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ color }),
  })
}

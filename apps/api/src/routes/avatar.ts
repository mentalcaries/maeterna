import { createRoute, z } from "@hono/zod-openapi"
import { eq } from "drizzle-orm"
import { createDb } from "../db"
import { user as userTable } from "../db/schema"
import { AVATAR_PALETTE } from "../lib/avatar"
import { raise } from "../lib/errors"
import { presignPut, readR2Creds } from "../lib/r2-presign"
import { sessionMiddleware, requireRole } from "../middleware/session"
import { AvatarPaletteSchema, responses } from "../schemas"
import type { AppRouter } from "../types"

const AVATAR_CONTENT_TYPE = "image/webp"
const AVATAR_MAX_BYTES = 500 * 1024
const UPLOAD_URL_TTL_SECONDS = 5 * 60

const UploadUrlResponseSchema = z
  .object({
    url: z.string().url(),
    objectKey: z.string(),
    contentType: z.literal(AVATAR_CONTENT_TYPE),
    maxBytes: z.literal(AVATAR_MAX_BYTES),
    expiresInSeconds: z.number(),
  })
  .openapi("AvatarUploadUrl")

const uploadUrlRoute = createRoute({
  method: "post",
  path: "/me/avatar/upload-url",
  tags: ["Avatar"],
  summary: "Get a presigned R2 PUT URL for a new profile picture",
  responses: {
    200: {
      content: { "application/json": { schema: UploadUrlResponseSchema } },
      description: "Presigned PUT URL",
    },
    ...responses,
  },
})

const confirmRoute = createRoute({
  method: "post",
  path: "/me/avatar/confirm",
  tags: ["Avatar"],
  summary: "Confirm a completed profile-picture upload",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ objectKey: z.string().min(1) }),
        },
      },
    },
  },
  responses: {
    204: { description: "Profile picture stored" },
    ...responses,
  },
})

const deleteRoute = createRoute({
  method: "delete",
  path: "/me/avatar",
  tags: ["Avatar"],
  summary: "Remove the current profile picture",
  responses: {
    204: { description: "Profile picture removed" },
    ...responses,
  },
})

const patchBackgroundRoute = createRoute({
  method: "patch",
  path: "/me/avatar/background",
  tags: ["Avatar"],
  summary: "Update the initials-fallback background colour",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ color: AvatarPaletteSchema.nullable() }),
        },
      },
    },
  },
  responses: {
    204: { description: "Background colour updated" },
    ...responses,
  },
})

// The client uploads a cropped and compressed image; we only accept 512×512
// WebP under 500 KB. The presigned PUT constrains the content type but not
// the size — we re-check via HEAD on confirm.
export function registerAvatarRoutes(app: AppRouter) {
  app.use("/me/avatar", sessionMiddleware)
  app.use("/me/avatar", requireRole("patient"))
  app.use("/me/avatar/*", sessionMiddleware)
  app.use("/me/avatar/*", requireRole("patient"))

  app.openapi(uploadUrlRoute, async (c) => {
    const u = c.get("user")
    const creds = readR2Creds(
      c.env as unknown as Record<string, string | undefined>,
      c.env.R2_AVATARS_PUBLIC_BUCKET
    )
    const objectKey = `avatars/${u.id}/${crypto.randomUUID()}.webp`
    const url = await presignPut(
      creds,
      objectKey,
      AVATAR_CONTENT_TYPE,
      UPLOAD_URL_TTL_SECONDS
    )
    return c.json({
      url,
      objectKey,
      contentType: AVATAR_CONTENT_TYPE,
      maxBytes: AVATAR_MAX_BYTES,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    } as const)
  })

  app.openapi(confirmRoute, async (c) => {
    const u = c.get("user")
    const { objectKey } = c.req.valid("json")

    // Prevent a patient from claiming another user's uploaded object.
    const expectedPrefix = `avatars/${u.id}/`
    if (!objectKey.startsWith(expectedPrefix)) {
      raise(403, "objectKey does not belong to the current user")
    }

    const head = await c.env.AVATARS.head(objectKey)
    if (!head) raise(404, "Uploaded object not found")
    if (head.size > AVATAR_MAX_BYTES) {
      await c.env.AVATARS.delete(objectKey)
      raise(422, "Image exceeds 500 KB")
    }
    if (head.httpMetadata?.contentType !== AVATAR_CONTENT_TYPE) {
      await c.env.AVATARS.delete(objectKey)
      raise(422, "Image must be image/webp")
    }

    const db = createDb(c.env.DB)
    const previous = await db
      .select({ avatarObjectKey: userTable.avatarObjectKey })
      .from(userTable)
      .where(eq(userTable.id, u.id))
      .get()
    await db
      .update(userTable)
      .set({ avatarObjectKey: objectKey, updatedAt: new Date() })
      .where(eq(userTable.id, u.id))
    if (previous?.avatarObjectKey && previous.avatarObjectKey !== objectKey) {
      await c.env.AVATARS.delete(previous.avatarObjectKey)
    }
    return new Response(null, { status: 204 }) as never
  })

  app.openapi(deleteRoute, async (c) => {
    const u = c.get("user")
    const db = createDb(c.env.DB)
    const row = await db
      .select({ avatarObjectKey: userTable.avatarObjectKey })
      .from(userTable)
      .where(eq(userTable.id, u.id))
      .get()
    await db
      .update(userTable)
      .set({ avatarObjectKey: null, updatedAt: new Date() })
      .where(eq(userTable.id, u.id))
    if (row?.avatarObjectKey) await c.env.AVATARS.delete(row.avatarObjectKey)
    return new Response(null, { status: 204 }) as never
  })

  app.openapi(patchBackgroundRoute, async (c) => {
    const u = c.get("user")
    const { color } = c.req.valid("json")
    if (
      color !== null &&
      !(AVATAR_PALETTE as readonly string[]).includes(color)
    )
      raise(422, "Unknown avatar palette slug")
    const db = createDb(c.env.DB)
    await db
      .update(userTable)
      .set({ avatarBackgroundColor: color, updatedAt: new Date() })
      .where(eq(userTable.id, u.id))
    return new Response(null, { status: 204 }) as never
  })
}

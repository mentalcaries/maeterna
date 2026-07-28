import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Cropper from "react-easy-crop"
import { Button } from "@/components/button"
import { Avatar } from "@/components/avatar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import {
  confirmAvatarUpload,
  deleteAvatar,
  putAvatarToR2,
  requestAvatarUploadUrl,
  updateAvatarBackground,
} from "@/lib/avatar-api"
import { cropAndCompressAvatar, type PixelCrop } from "@/lib/avatar-image"
import {
  AVATAR_PALETTE,
  avatarBackgroundCss,
  type AvatarPaletteSlug,
} from "@/lib/avatar-palette"
import { cn } from "@/lib/utils"

type AvatarEditorProps = {
  avatarUrl: string | null
  initials: string
  backgroundColor: AvatarPaletteSlug | null
}

// Optional patient-facing avatar editor. Renders the current avatar, buttons
// to upload/remove, a crop dialog, and a colour swatch picker for the
// initials fallback.
export function AvatarEditor({
  avatarUrl,
  initials,
  backgroundColor,
}: AvatarEditorProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null)
  const [error, setError] = useState<string | null>(null)

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: ["patient-profile"] })

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const upload = await requestAvatarUploadUrl()
      await putAvatarToR2(upload, blob)
      await confirmAvatarUpload(upload.objectKey)
    },
    onSuccess: () => {
      void invalidateProfile()
      closeCropDialog()
    },
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : "Upload failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: invalidateProfile,
  })

  const backgroundMutation = useMutation({
    mutationFn: (color: AvatarPaletteSlug) => updateAvatarBackground(color),
    onSuccess: invalidateProfile,
  })

  function openFilePicker() {
    setError(null)
    fileInputRef.current?.click()
  }

  function closeCropDialog() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(null)
    setPixelCrop(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.")
      return
    }
    setSourceUrl(URL.createObjectURL(file))
  }

  async function handleConfirmCrop() {
    if (!sourceUrl || !pixelCrop) return
    setError(null)
    try {
      const blob = await cropAndCompressAvatar(sourceUrl, pixelCrop)
      uploadMutation.mutate(blob)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process image")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar
          url={avatarUrl}
          initials={initials}
          backgroundColor={backgroundColor}
          size="lg"
        />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openFilePicker}
              disabled={uploadMutation.isPending}
            >
              {avatarUrl ? "Change photo" : "Add photo"}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Optional. Doctors will see this next to your name.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />

      {!avatarUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Initials background colour</p>
          <div className="flex flex-wrap gap-2">
            {AVATAR_PALETTE.map((slug) => (
              <button
                key={slug}
                type="button"
                aria-label={`${slug} background`}
                aria-pressed={backgroundColor === slug}
                onClick={() => backgroundMutation.mutate(slug)}
                className={cn(
                  "size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-colors",
                  backgroundColor === slug
                    ? "ring-foreground"
                    : "ring-transparent hover:ring-muted-foreground/40"
                )}
                style={{ backgroundColor: avatarBackgroundCss(slug) }}
              />
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog
        open={sourceUrl !== null}
        onOpenChange={(open) => !open && closeCropDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop your photo</DialogTitle>
          </DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
            {sourceUrl && (
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, area) => setPixelCrop(area)}
              />
            )}
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeCropDialog}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCrop}
              disabled={uploadMutation.isPending || !pixelCrop}
            >
              {uploadMutation.isPending ? "Uploading…" : "Save photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

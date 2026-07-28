import imageCompression from "browser-image-compression"

export type PixelCrop = {
  x: number
  y: number
  width: number
  height: number
}

const OUTPUT_SIZE = 512
const TARGET_MB = 0.2

// Load an image element from a data/object URL. Waits for decode so callers
// get accurate naturalWidth/naturalHeight.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Draw a square 512×512 canvas of the cropped region and compress to WebP.
export async function cropAndCompressAvatar(
  sourceUrl: string,
  pixelCrop: PixelCrop
): Promise<Blob> {
  const image = await loadImage(sourceUrl)

  const canvas = document.createElement("canvas")
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  )

  const raw: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Canvas toBlob returned null")),
      "image/webp",
      0.9
    )
  })

  // browser-image-compression re-encodes with a size target and preserves
  // the requested output format. Overshoots stay under 500 KB.
  const rawFile = new File([raw], "avatar.webp", { type: "image/webp" })
  const compressed = await imageCompression(rawFile, {
    maxSizeMB: TARGET_MB,
    maxWidthOrHeight: OUTPUT_SIZE,
    fileType: "image/webp",
    initialQuality: 0.85,
    useWebWorker: true,
  })
  return compressed
}

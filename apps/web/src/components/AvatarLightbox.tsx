import { Dialog, DialogBackdrop, DialogPortal } from "@/components/dialog"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

// Simple image lightbox for the doctor's view of a patient avatar. Reuses the
// dialog primitive so it inherits backdrop, focus trap, and escape-to-close.
export function AvatarLightbox({
  open,
  onOpenChange,
  imageUrl,
  alt,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  alt: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-transparent shadow-xl outline-none">
          <DialogPrimitive.Title className="sr-only">
            {alt}
          </DialogPrimitive.Title>
          <img
            src={imageUrl}
            alt={alt}
            className="block max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            draggable={false}
          />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}

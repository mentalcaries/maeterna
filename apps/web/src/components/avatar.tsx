import * as React from "react"
import {
  avatarBackgroundCss,
  type AvatarPaletteSlug,
} from "@/lib/avatar-palette"
import { cn } from "@/lib/utils"

const SIZE_CLASSES = {
  sm: "size-9 text-sm",
  md: "size-14 text-lg",
  lg: "size-20 text-2xl",
} as const

export type AvatarSize = keyof typeof SIZE_CLASSES

type AvatarProps = {
  url: string | null | undefined
  initials: string
  backgroundColor: AvatarPaletteSlug | null | undefined
  size: AvatarSize
  alt?: string
  onClick?: () => void
  className?: string
}

// Shared avatar. Shows the image when `url` is set, otherwise a coloured circle
// with the patient's initials on their chosen background colour.
export function Avatar({
  url,
  initials,
  backgroundColor,
  size,
  alt,
  onClick,
  className,
}: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size]
  const [failed, setFailed] = React.useState(false)
  const showImage = Boolean(url) && !failed

  const shared = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white select-none",
    sizeClass,
    onClick && "cursor-pointer",
    className
  )

  if (showImage) {
    const imgClass = cn(shared, "bg-muted p-0")
    const inner = (
      <img
        src={url as string}
        alt={alt ?? ""}
        className="size-full object-cover"
        onError={() => setFailed(true)}
        draggable={false}
      />
    )
    return onClick ? (
      <button
        type="button"
        onClick={onClick}
        aria-label={alt ?? "Profile picture"}
        className={imgClass}
      >
        {inner}
      </button>
    ) : (
      <span className={imgClass} aria-label={alt ?? "Profile picture"}>
        {inner}
      </span>
    )
  }

  const style = {
    backgroundColor: avatarBackgroundCss(backgroundColor ?? null),
  }
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={alt ?? "Profile initials"}
      className={shared}
      style={style}
    >
      {initials}
    </button>
  ) : (
    <span
      aria-label={alt ?? "Profile initials"}
      className={shared}
      style={style}
    >
      {initials}
    </span>
  )
}

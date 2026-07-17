import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold tracking-wider uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
        critical:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        success:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        destructive: "bg-destructive/10 text-destructive",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        warning:
          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

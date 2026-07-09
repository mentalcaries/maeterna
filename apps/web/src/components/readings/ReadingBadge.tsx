import { Badge } from "@/components/badge"
import type { SeverityType } from "@/lib/thresholds"

interface ReadingBadgeProps {
  severity: SeverityType
}

export function ReadingBadge({ severity }: ReadingBadgeProps) {
  if (severity === "high") {
    return <Badge variant="critical">High</Badge>
  }
  return <Badge variant="success">Normal</Badge>
}

import { Badge } from "@/components/badge"
import type { AlertSeverity } from "@/lib/thresholds"

interface ReadingBadgeProps {
  severity?: AlertSeverity
}

export function ReadingBadge({ severity }: ReadingBadgeProps) {
  if (!severity) {
    return <Badge variant="success">Normal</Badge>
  }
  if (severity === "warning") {
    return <Badge variant="warning">Warning</Badge>
  }
  return <Badge variant="critical">Critical</Badge>
}

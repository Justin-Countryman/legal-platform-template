'use client'

// In-content "Office Hours" block (a blockContent insert). Renders the weekly
// hours grid for the active office, pulled from context (primary location by
// default; the current location on location pages). Renders nothing if no hours
// are available, so it's safe to place on any page.
import {OfficeHours} from '@/components/layout/footers/shared'
import {useOfficeHours} from './OfficeHoursContext'

export function OfficeHoursBlock({title}: {title?: string | null}) {
  const hours = useOfficeHours()
  if (!hours) return null
  return (
    // Bottom margin only (no top) so the block sits tight under a preceding
    // header/paragraph — its spacing comes from that element's bottom margin,
    // matching the rest of the content rhythm.
    <div className="mb-6">
      {title && (
        <h3 className="mb-3 font-heading text-2xl font-bold text-foreground">{title}</h3>
      )}
      <OfficeHours hours={hours} rowClass="text-base text-foreground" closedRowClass="text-base text-foreground-muted" />
    </div>
  )
}

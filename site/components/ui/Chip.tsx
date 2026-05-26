import type {ReactNode} from 'react'
import {ChipIcons, type ChipIcon} from './icons'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChipProps = {
  icon:       ChipIcon
  children:   ReactNode
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Chip({icon, children, className}: ChipProps) {
  const IconComponent = ChipIcons[icon]
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5',
        'rounded-ui border border-border',
        'bg-transparent',
        'px-4 py-1.5',
        'text-xs text-foreground-muted',
        'cursor-default',
        className,
      ].filter(Boolean).join(' ')}
    >
      <IconComponent className="size-3.5 text-accent" />
      {children}
    </span>
  )
}

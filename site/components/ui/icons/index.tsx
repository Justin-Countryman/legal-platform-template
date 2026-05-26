// Icon path data adapted from Lucide (https://lucide.dev/) — ISC license.
//
// ─── Overview ─────────────────────────────────────────────────────────────────
//
// Inline-SVG registry for Chip metadata icons. All icons share a 24x24 viewBox,
// 1.5 stroke-width, round caps/joins, and `currentColor` stroke so color
// inherits from the surrounding text-color cascade (per WS5). Each icon sets
// `aria-hidden="true"` because Chip metadata icons are decorative — the Chip's
// children provide the accessible name.
//
// Consumers reference icons by string key via the `ChipIcons` map (see
// Chip.tsx, Commit 4) or import the named `<Name>Icon` component directly for
// one-off use.

import type {ComponentType} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type IconProps = {
  className?: string
}

export type ChipIcon =
  | 'calendar'
  | 'clock'
  | 'map-pin'
  | 'phone'
  | 'mail'
  | 'video'
  | 'link'
  | 'users'
  | 'bookmark'

// ─── Shared SVG props ─────────────────────────────────────────────────────────

const SVG_PROPS = {
  xmlns:           'http://www.w3.org/2000/svg',
  viewBox:         '0 0 24 24',
  fill:            'none',
  stroke:          'currentColor',
  strokeWidth:     1.5,
  strokeLinecap:   'round',
  strokeLinejoin:  'round',
  'aria-hidden':   true,
} as const

// ─── Icons ────────────────────────────────────────────────────────────────────

export function CalendarIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

export function ClockIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function MapPinIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function PhoneIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  )
}

export function MailIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

export function VideoIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  )
}

export function LinkIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

export function UsersIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function BookmarkIcon({className}: IconProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
    </svg>
  )
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ChipIcons: Record<ChipIcon, ComponentType<{className?: string}>> = {
  calendar:  CalendarIcon,
  clock:     ClockIcon,
  'map-pin': MapPinIcon,
  phone:     PhoneIcon,
  mail:      MailIcon,
  video:     VideoIcon,
  link:      LinkIcon,
  users:     UsersIcon,
  bookmark:  BookmarkIcon,
}

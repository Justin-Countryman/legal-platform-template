// ─── Footer nav contract (canonical) ─────────────────────────────────────────
// `footerSettings.column1` and `footerSettings.column2` are the two operator-
// configurable footer nav arrays. Their semantic roles:
//
//   column1 — practice areas list. Populated per-client by SBT Phase 10
//             (compose_footer_column1_links) from each practiceArea doc's
//             `title` + slug. Labels can drift from page titles if titles
//             change after SBT runs — re-run SBT Phase 10 to re-sync, or
//             edit footerSettings in Studio.
//
//   column2 — standard core nav: About / Our Attorneys / Locations / Blog /
//             Contact. Populated once by SBT Phase 3 (site_setup) from
//             STANDARD_FOOTER_COLUMN_2 (BE/Site-Build-Tool/config/
//             content_recipes.py) — the same recipe across every client.
//
// 7 footer layouts (operator picks via footerSettings.footerLayout):
//   nav-having (renders column1 + column2)   no-nav layouts
//   ─────────────────────────────────────    ──────────────────────────────────
//   AnchorFooter  — single location           MeridianFooter    — logo/address/phone
//   CrestFooter   — single location           BeaconFooter      — contact form focus
//   PillarFooter  — single location           DistrictsFooter   — multi-location grid
//                                             SwitchboardFooter — multi-location selector
//
// The nav-having layouts share a footer-nav semantic posture (see
// FooterNavRegion + FooterNavList below) so a11y + crawl posture is
// identical regardless of layout — a `<nav aria-label="Footer navigation">`
// wraps the lists, each `<ul>` has role="list" + aria-label, and the bottom
// legal links (privacy/disclaimer/cookies) ship in every layout's bottom bar.
// ──────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import {FaXTwitter} from 'react-icons/fa6'
import {
  BiLogoFacebookCircle,
  BiLogoInstagram,
  BiLogoLinkedinSquare,
  BiLogoYoutube,
} from 'react-icons/bi'
import {MdCheck} from 'react-icons/md'
import {ButtonGroup, type CtaItem} from '@/components/ui/ButtonGroup'
import {formatPhone} from '@/lib/tokens'
import type {FooterData, FooterScheme, OfficeHours} from '../Footer'

// ─── Footer color scheme ──────────────────────────────────────────────────────
// Every footer layout is dark by default (brand background, light text) but can
// be flipped to light via footerSettings.footerScheme. The cascade-aware text
// utilities (text-foreground / -muted / -subtle, hover:text-action-text,
// border-border) auto-resolve polarity from `.bg-brand-dark` / the
// `[data-ring-context="dark"]` attribute — so a footer only has to swap its
// surface class + ring-context here and derive button context. Light uses
// `bg-hero-tint` (the neutral near-white used for light hero bands) — NOT
// `bg-muted` (accent-tinted, flat). Buttons/ButtonGroup take an explicit
// context, so we hand it back too.

export type FooterSurface = {
  /** Background + base text classes for the <footer> element. */
  footerClass: string
  /** `data-ring-context` value — 'dark' on the dark surface, omitted on light. */
  ringContext: 'dark' | undefined
  /** Surface context for Button / ButtonGroup / ActionButtons. */
  buttonContext: 'light' | 'dark'
}

export function footerSurface(scheme: FooterScheme | null | undefined): FooterSurface {
  if (scheme === 'light') {
    return {footerClass: 'bg-hero-tint text-foreground-muted', ringContext: undefined, buttonContext: 'light'}
  }
  return {footerClass: 'bg-brand-dark text-foreground-muted', ringContext: 'dark', buttonContext: 'dark'}
}

/** Scheme-appropriate logo: light surface prefers logoOnLight, falling back to
 *  the dark logo (and vice-versa) so a footer always has a mark to render. */
export function footerLogo(
  data: Pick<FooterData, 'logo' | 'logoLight'>,
  scheme: FooterScheme | null | undefined,
) {
  return scheme === 'light' ? data.logoLight ?? data.logo ?? null : data.logo ?? data.logoLight ?? null
}

// ─── Footer Nav primitives ────────────────────────────────────────────────────

export type FooterLink = {label: string; href: string}

/** Wraps both columns in a single landmark for screen readers and crawler
 *  semantics. Use once per footer layout that renders nav columns. */
export function FooterNavRegion({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <nav aria-label="Footer navigation" className={className}>
      {children}
    </nav>
  )
}

/** A single labeled column. `label` ships as `aria-label` on the `<ul>` (and
 *  is also exposed as `sr-only` text so it appears in the accessibility tree
 *  even if visual headings are omitted by the layout). */
export function FooterNavList({
  label,
  links,
  className = '',
  liClassName = 'py-1.5 text-sm',
  linkClassName,
}: {
  label: string
  links: FooterLink[]
  className?: string
  liClassName?: string
  linkClassName?: string
}) {
  if (links.length === 0) return null
  const linkCls =
    linkClassName ??
    'transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus'
  return (
    <ul role="list" aria-label={label} className={className}>
      {links.map((link, i) => (
        <li key={i} className={liClassName}>
          <Link href={link.href} className={linkCls}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

// ─── Office Details link label ────────────────────────────────────────────────
//
// Every footer layout renders an "Office Location" link next to its address
// block, pointing at the office's locationPage when one exists. The label is
// "{City} Office Location" (e.g. "Blaine Office Location") or "Office Location"
// when no city is known. The label was previously "{City} Office" / "Our Office"
// — normalized to include "Location" so the destination (a dedicated location
// page, not a generic contact section) is unambiguous to visitors.
//
// This link replaces the previous platform-wide "Locations" main-nav item +
// /locations index route — visitors reach individual locationPages via the
// footer instead. See content_recipes.STANDARD_NAV_ITEMS for the recipe note.

export function officeLocationLabel(city?: string | null): string {
  const c = city?.trim()
  return c ? `${c} Office Location` : 'Office Location'
}

// ─── Social Icons ─────────────────────────────────────────────────────────────

type SocialData = Pick<
  FooterData,
  'facebookUrl' | 'instagramUrl' | 'twitterUrl' | 'linkedInUrl' | 'youTubeUrl'
>

export function SocialIcons({
  data,
  className = '',
  ringClass = 'focus-visible:ring-focus',
  hoverClass = 'hover:text-action-text',
}: {
  data: SocialData
  className?: string
  ringClass?: string
  hoverClass?: string
}) {
  const {facebookUrl, instagramUrl, twitterUrl, linkedInUrl, youTubeUrl} = data
  if (!facebookUrl && !instagramUrl && !twitterUrl && !linkedInUrl && !youTubeUrl) return null
  const focusCls = `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass}`
  const linkCls = `transition-colors duration-ui-fast ${hoverClass} ${focusCls}`
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {facebookUrl && (
        <a href={facebookUrl} aria-label="Facebook" target="_blank" rel="noopener noreferrer" className={linkCls}>
          <BiLogoFacebookCircle className="size-5" />
        </a>
      )}
      {instagramUrl && (
        <a href={instagramUrl} aria-label="Instagram" target="_blank" rel="noopener noreferrer" className={linkCls}>
          <BiLogoInstagram className="size-5" />
        </a>
      )}
      {twitterUrl && (
        <a href={twitterUrl} aria-label="X (Twitter)" target="_blank" rel="noopener noreferrer" className={linkCls}>
          <FaXTwitter className="size-4" />
        </a>
      )}
      {linkedInUrl && (
        <a href={linkedInUrl} aria-label="LinkedIn" target="_blank" rel="noopener noreferrer" className={linkCls}>
          <BiLogoLinkedinSquare className="size-5" />
        </a>
      )}
      {youTubeUrl && (
        <a href={youTubeUrl} aria-label="YouTube" target="_blank" rel="noopener noreferrer" className={linkCls}>
          <BiLogoYoutube className="size-5" />
        </a>
      )}
    </div>
  )
}

// ─── Action Buttons ───────────────────────────────────────────────────────────

type ActionData = Pick<
  FooterData,
  'actionButton1Label' | 'actionButton1Url' | 'actionButton2Label' | 'actionButton2Url'
>

/**
 * Footer-global action buttons — the 1–2 CTAs sourced from `actionButton*`
 * fields on `footerSettings`. Renders via `<ButtonGroup>` at `size="small"`
 * with `variant="secondary"` per item (the canonical footer CTA shape).
 *
 * Context (light/dark) is determined implicitly by the parent footer surface
 * via the `data-ring-context` cascade for focus rings; consumer `className`
 * carries any per-surface text-color overrides (`text-foreground-muted`,
 * etc.) and any layout overrides via the consumer `className`.
 */
export function ActionButtons({
  data,
  className = '',
  context = 'light',
}: {
  data: ActionData
  className?: string
  /** Surface context for buttons — `dark` flips primary to white-fill and swaps focus ring. Defaults to `light`. */
  context?: 'light' | 'dark'
}) {
  const {actionButton1Label, actionButton1Url, actionButton2Label, actionButton2Url} = data
  if (!actionButton1Url && !actionButton2Url) return null

  const items: CtaItem[] = []
  if (actionButton1Label && actionButton1Url) {
    items.push({label: actionButton1Label, url: actionButton1Url, variant: 'secondary'})
  }
  if (actionButton2Label && actionButton2Url) {
    items.push({label: actionButton2Label, url: actionButton2Url, variant: 'secondary'})
  }

  return <ButtonGroup items={items} context={context} size="small" className={className} />
}

// ─── Address helpers ──────────────────────────────────────────────────────────

export function cityLine(city?: string | null, state?: string | null, zip?: string | null) {
  return [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

// ─── Office Hours ─────────────────────────────────────────────────────────────

const DAYS = [
  {key: 'monday',    short: 'Mon'},
  {key: 'tuesday',   short: 'Tue'},
  {key: 'wednesday', short: 'Wed'},
  {key: 'thursday',  short: 'Thu'},
  {key: 'friday',    short: 'Fri'},
  {key: 'saturday',  short: 'Sat'},
  {key: 'sunday',    short: 'Sun'},
] as const

// Office hours are STORED as zero-padded 24-hour (`08:00`, `17:00`) and that is
// settled: Zite's client portal parses the stored string for its own location
// view, and `openingHoursSpecification` in the page's JSON-LD requires 24-hour
// ISO. Storing a display format instead was tried and reverted — `8:00 AM` did
// not parse in the CRM and those days rendered blank. So the CRM and the
// structured data want the same value, and ONLY the footer wants a different
// one. This converts for RENDERING ONLY.
//
// `buildOpeningHours` in app/(site)/[...slug]/page.tsx must keep passing the
// raw stored value into opens/closes. It does not import this module.
//
// Anything that is not HH:MM is returned untouched. Legacy records may hold
// arbitrary text, and the design-studio fixture uses '8:30am'/'5:30pm' — a
// value this cannot parse must render as it was written rather than as NaN or
// an empty string, which is why the footer was originally written to print
// whatever it was handed.
//
// Provenance: monorepo BI/OUTSTANDING.md item 254.
export function formatHourForDisplay(value: string | null | undefined): string {
  if (!value) return ''
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim())
  if (!match) return value
  const hour = Number(match[1])
  if (hour > 23) return value
  const meridiem = hour < 12 ? 'AM' : 'PM'
  // 00:xx → 12 AM, 12:xx → 12 PM, 13:xx → 1 PM.
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${match[2]} ${meridiem}`
}

type DayEntry = {short: string; open: string | null; close: string | null; closed: boolean}
type HoursRow = {label: string; time: string; closed: boolean}

function buildHoursRows(hours: OfficeHours): HoursRow[] {
  const entries: DayEntry[] = DAYS.map(({key, short}) => {
    const status = (hours as Record<string, string | null | undefined>)[`${key}Status`]
    const open   = (hours as Record<string, string | null | undefined>)[`${key}Open`] ?? null
    const close  = (hours as Record<string, string | null | undefined>)[`${key}Close`] ?? null
    return {short, open, close, closed: status !== 'Open'}
  })

  const rows: HoursRow[] = []
  let i = 0
  while (i < entries.length) {
    const cur = entries[i]
    const time = cur.closed ? 'Closed' : `${formatHourForDisplay(cur.open)} – ${formatHourForDisplay(cur.close)}`
    let j = i + 1
    while (j < entries.length) {
      const next = entries[j]
      const nextTime = next.closed ? 'Closed' : `${formatHourForDisplay(next.open)} – ${formatHourForDisplay(next.close)}`
      if (nextTime !== time) break
      j++
    }
    const label = j - i > 1 ? `${cur.short}–${entries[j - 1].short}` : cur.short
    rows.push({label, time, closed: cur.closed})
    i = j
  }
  return rows
}

// Maps the location record's `appointmentRequired` enum to a short visitor-facing
// note. Returns null for unset/unknown values so callers can render conditionally.
// Placement note: this is an OFFICE attribute (shown by the office/address block),
// not a contact or hours detail.
export function appointmentNoteLabel(appointmentRequired?: string | null): string | null {
  // Only surface the restriction. "Walk-Ins Welcome" is the default state and
  // renders nothing — consistent with the {{…appointment}} shortcode.
  return appointmentRequired === 'Appointment Required' ? 'By appointment only' : null
}

// Appointment policy — an OFFICE attribute. Renders a checkmark icon + short
// note so it aligns visually with the icon'd office-location link it sits under.
export function AppointmentNote({
  appointmentRequired,
  className = '',
  iconClass = 'shrink-0',
}: {
  appointmentRequired?: string | null
  className?: string
  iconClass?: string
}) {
  const label = appointmentNoteLabel(appointmentRequired)
  if (!label) return null
  return (
    <p className={['flex w-fit items-center gap-1', className].join(' ').trim()}>
      <MdCheck className={iconClass} aria-hidden="true" />
      {label}
    </p>
  )
}

// 24/7 emergency contact — belongs in the CONTACT block, beneath the main phone.
// Renders a "24/7 Emergency" label with the emergency number under it; falls back
// to a plain availability line when no dedicated number is set.
export function EmergencyContact({
  emergency24_7,
  emergencyPhone,
  className = '',
  labelClass = 'text-sm font-semibold',
  phoneClass = 'text-sm',
}: {
  emergency24_7?: boolean | null
  emergencyPhone?: string | null
  className?: string
  labelClass?: string
  phoneClass?: string
}) {
  if (!emergency24_7) return null
  return (
    <div className={className}>
      <p className={labelClass}>24/7 Emergency</p>
      {emergencyPhone ? (
        <a
          href={`tel:${emergencyPhone.replace(/\D/g, '')}`}
          className={`block ${phoneClass} underline transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus`}
        >
          {formatPhone(emergencyPhone)}
        </a>
      ) : (
        <p className={phoneClass}>Emergency line available</p>
      )}
    </div>
  )
}

export function OfficeHours({
  hours,
  className = '',
  rowClass = 'text-sm',
  closedRowClass,
  closedClass = 'opacity-40',
}: {
  hours?: OfficeHours | null
  className?: string
  rowClass?: string
  /** When provided, replaces rowClass entirely for closed rows — prevents opacity compounding on dark backgrounds. */
  closedRowClass?: string
  closedClass?: string
}) {
  if (!hours) return null

  const rows = buildHoursRows(hours)
  // Check if any day is actually configured
  const hasData = rows.some((r) => !r.closed || r.time === 'Closed')

  if (!hasData) return null

  return (
    <div className={className}>
      <dl className="space-y-0.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className={[
              'grid items-baseline gap-x-3',
              row.closed && closedRowClass ? closedRowClass : rowClass,
              row.closed && !closedRowClass ? closedClass : '',
            ].join(' ').trim()}
            style={{gridTemplateColumns: '5rem 1fr'}}
          >
            <dt className="font-medium">{row.label}</dt>
            <dd>{row.time}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

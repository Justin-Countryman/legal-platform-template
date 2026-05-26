import {FaXTwitter} from 'react-icons/fa6'
import {
  BiLogoFacebookCircle,
  BiLogoInstagram,
  BiLogoLinkedinSquare,
  BiLogoYoutube,
} from 'react-icons/bi'
import {ButtonGroup, type CtaItem} from '@/components/ui/ButtonGroup'
import type {FooterData, OfficeHours} from '../Footer'

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
 * etc.) and layout overrides (`flex-col items-start` on LedgerFooter).
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
    const time = cur.closed ? 'Closed' : `${cur.open ?? ''} – ${cur.close ?? ''}`
    let j = i + 1
    while (j < entries.length) {
      const next = entries[j]
      const nextTime = next.closed ? 'Closed' : `${next.open ?? ''} – ${next.close ?? ''}`
      if (nextTime !== time) break
      j++
    }
    const label = j - i > 1 ? `${cur.short}–${entries[j - 1].short}` : cur.short
    rows.push({label, time, closed: cur.closed})
    i = j
  }
  return rows
}

export function OfficeHours({
  hours,
  emergency24_7,
  className = '',
  rowClass = 'text-sm',
  closedRowClass,
  closedClass = 'opacity-40',
}: {
  hours?: OfficeHours | null
  emergency24_7?: boolean | null
  className?: string
  rowClass?: string
  /** When provided, replaces rowClass entirely for closed rows — prevents opacity compounding on dark backgrounds. */
  closedRowClass?: string
  closedClass?: string
}) {
  if (!hours && !emergency24_7) return null

  const rows = hours ? buildHoursRows(hours) : []
  // Check if any day is actually configured
  const hasData = rows.some((r) => !r.closed || r.time === 'Closed')

  if (!hasData && !emergency24_7) return null

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
      {emergency24_7 && (
        <p className={['mt-2 font-semibold', rowClass].join(' ')}>
          24/7 Emergency Line Available
        </p>
      )}
    </div>
  )
}

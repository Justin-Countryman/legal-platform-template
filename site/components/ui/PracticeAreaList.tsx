import {MdChevronRight} from 'react-icons/md'
import {Button} from '@/components/ui/Button'
import {Chip} from './Chip'

// ─── Types ────────────────────────────────────────────────────────────────────

type PracticeArea = {
  label: string
  slug:  string | null
}

type Direction = 'row' | 'column'

type Props = {
  areas:      PracticeArea[]
  /** Surface this list renders on. Drives Button context. Default 'light'. */
  context?:   'light' | 'dark'
  /** Override the wrapper className (defaults to direction-appropriate layout). */
  className?: string
  /**
   * Layout direction. `row` (default) renders the existing flex-wrap pill list
   * used by Slate / Mosaic / Horizon. `column` renders a vertical nav-rail of
   * tertiary leading-arrow buttons (matches the SidebarNav widget pattern) for
   * narrow sidebar surfaces like Pillar.
   */
  direction?: Direction
  /**
   * Optional current pathname. When provided, the matching area renders with
   * active-state styling (`!text-foreground !font-semibold` on tertiary
   * buttons in column direction) and carries `aria-current="page"`. Both
   * directions get the aria attribute. Sidebar nav (column direction) passes
   * this from `usePathname()`; attorney layouts (row direction) leave it
   * undefined, so existing call sites are unaffected.
   * WS-Sidebar Phase 2.2 — `BI/BI-Sidebar.md` §3.
   */
  currentPath?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_WRAPPER: Record<Direction, string> = {
  row:    'flex flex-wrap gap-2',
  column: 'space-y-1',
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// A list of practice areas. Row variant renders pill-style secondary Buttons —
// used on attorney profile layouts. Column variant renders a vertical stack of
// tertiary leading-arrow Buttons, mirroring the SidebarNav practice-area widget
// so narrow sidebar surfaces read as a table-of-contents nav rail rather than a
// tag cloud. Non-linkable entries (no slug) render as decorative Chips with a
// bookmark leading icon, visually distinct from their linkable Tag/Button
// siblings so the absence of a destination is communicated at a glance.

// Trailing-slash-tolerant comparison. Sidebar.tsx has the matching helper —
// duplicated here so PracticeAreaList stays self-contained (no inter-component
// dependency; some attorney layouts render this without the sidebar).
function normalizePath(p: string): string {
  return p.endsWith('/') ? p : p + '/'
}
function isAreaActive(slug: string, currentPath?: string | null): boolean {
  if (!currentPath) return false
  return normalizePath(`/${slug}/`) === normalizePath(currentPath)
}

export function PracticeAreaList({
  areas,
  context   = 'light',
  className,
  direction = 'row',
  currentPath,
}: Props) {
  if (areas.length === 0) return null

  const wrapperClass = className ?? DEFAULT_WRAPPER[direction]

  return (
    <ul className={wrapperClass} aria-label="Practice areas">
      {areas.map((area, i) => {
        const active = area.slug ? isAreaActive(area.slug, currentPath) : false
        return (
          <li key={i}>
            {area.slug ? (
              direction === 'column' ? (
                <Button
                  variant="tertiary"
                  context={context}
                  arrowPosition="leading"
                  href={`/${area.slug}/`}
                  className={active ? '!text-foreground !font-semibold' : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  {area.label}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  context={context}
                  size="small"
                  href={`/${area.slug}/`}
                  aria-current={active ? 'page' : undefined}
                >
                  {area.label}
                  <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                </Button>
              )
            ) : (
              <Chip icon="bookmark">{area.label}</Chip>
            )}
          </li>
        )
      })}
    </ul>
  )
}

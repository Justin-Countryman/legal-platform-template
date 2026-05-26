import {describe, it, expect, vi} from 'vitest'
import {render, screen} from '@testing-library/react'

// Iterative composition pattern (this file's anchor): the wrapper iterates
// over an input array and renders one of multiple child primitives per item.
// Mock both composed children independently so we can assert (a) how many
// child instances render, (b) which child type renders per item, and (c) what
// props each instance receives. Same per-mock data-attr capture pattern as
// TestimonialCard, generalized to N items via .map().

vi.mock('@/components/ui/Button', () => ({
  Button: vi.fn(({variant, context, size, arrowPosition, href, className, children, ...props}) => (
    <a
      data-testid="btn"
      data-variant={variant}
      data-context={context}
      data-size={size ?? ''}
      data-arrow-position={arrowPosition ?? ''}
      data-classname={className ?? ''}
      aria-current={props['aria-current']}
      href={href}
    >
      {children}
    </a>
  )),
}))

vi.mock('../Chip', () => ({
  Chip: vi.fn(({icon, children}) => (
    <span data-testid="chip" data-icon={icon}>{children}</span>
  )),
}))

import {PracticeAreaList} from '../PracticeAreaList'

const AREAS_3 = [
  {label: 'Family Law', slug: 'family-law'},
  {label: 'Wills & Probate', slug: 'wills-and-probate'},
  {label: 'Conveyancing', slug: 'conveyancing'},
]

const AREAS_MIXED = [
  {label: 'Family Law', slug: 'family-law'},
  {label: 'Coming Soon', slug: null},
  {label: 'Conveyancing', slug: 'conveyancing'},
]

// ─── Render shape (null guard + list landmark) ────────────────────────────────

describe('PracticeAreaList — render shape', () => {
  it('renders nothing when areas array is empty', () => {
    const {container} = render(<PracticeAreaList areas={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a <ul> with aria-label="Practice areas" as the list landmark', () => {
    const {container} = render(<PracticeAreaList areas={AREAS_3} />)
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    expect(ul?.getAttribute('aria-label')).toBe('Practice areas')
  })

  it('emits exactly one <li> per area (iterative .map())', () => {
    const {container} = render(<PracticeAreaList areas={AREAS_3} />)
    const lis = container.querySelectorAll('ul > li')
    expect(lis.length).toBe(3)
  })
})

// ─── Iterative composition (the new pattern this file anchors) ────────────────
//
// Locked pattern for list composers: the .map() loop dispatches each item to
// a child primitive based on per-item state (slug present/absent). Tests
// assert (1) the count of each child kind matches the expected count from
// the input, and (2) per-item props forward correctly by reading the captured
// data-* attributes from the per-instance mock output.

describe('PracticeAreaList — iterative composition', () => {
  it('renders one <Button> per area when all areas have a slug', () => {
    render(<PracticeAreaList areas={AREAS_3} />)
    expect(screen.getAllByTestId('btn').length).toBe(3)
    expect(screen.queryAllByTestId('chip').length).toBe(0)
  })

  it('preserves input order in the rendered children', () => {
    render(<PracticeAreaList areas={AREAS_3} />)
    const buttons = screen.getAllByTestId('btn')
    expect(buttons[0].textContent).toBe('Family Law')
    expect(buttons[1].textContent).toBe('Wills & Probate')
    expect(buttons[2].textContent).toBe('Conveyancing')
  })

  it('forwards slug → href as `/${slug}/` for every Button instance', () => {
    render(<PracticeAreaList areas={AREAS_3} />)
    const buttons = screen.getAllByTestId('btn')
    expect(buttons[0].getAttribute('href')).toBe('/family-law/')
    expect(buttons[1].getAttribute('href')).toBe('/wills-and-probate/')
    expect(buttons[2].getAttribute('href')).toBe('/conveyancing/')
  })
})

// ─── Slug-conditional dispatch (Button vs Chip per item) ──────────────────────

describe('PracticeAreaList — slug-conditional dispatch', () => {
  it('renders <Chip> (decorative bookmark) for items without a slug', () => {
    render(<PracticeAreaList areas={AREAS_MIXED} />)
    const chips = screen.getAllByTestId('chip')
    expect(chips.length).toBe(1)
    expect(chips[0].textContent).toBe('Coming Soon')
    expect(chips[0].getAttribute('data-icon')).toBe('bookmark')
  })

  it('renders the slugged items as <Button> alongside the unslugged <Chip>', () => {
    render(<PracticeAreaList areas={AREAS_MIXED} />)
    expect(screen.getAllByTestId('btn').length).toBe(2)
    expect(screen.getAllByTestId('chip').length).toBe(1)
  })

  it('preserves input order across the Button/Chip mix', () => {
    const {container} = render(<PracticeAreaList areas={AREAS_MIXED} />)
    const lis = container.querySelectorAll('ul > li')
    // Item 0: Button (Family Law); item 1: Chip (Coming Soon); item 2: Button (Conveyancing).
    expect(lis[0].querySelector('[data-testid="btn"]')).not.toBeNull()
    expect(lis[1].querySelector('[data-testid="chip"]')).not.toBeNull()
    expect(lis[2].querySelector('[data-testid="btn"]')).not.toBeNull()
  })
})

// ─── Direction-prop variant matrix (Chip-style enum loop, layout flavor) ──────
//
// direction is a static prop (not viewport-driven) so no responsive testing
// is needed. Each direction value produces a different wrapper layout and a
// different Button variant. This mirrors the variant×context matrix already
// anchored by Button.test.tsx, applied here to layout choices.

describe('PracticeAreaList — direction-prop variant', () => {
  it('default direction="row" applies flex flex-wrap gap-2 to the wrapper', () => {
    const {container} = render(<PracticeAreaList areas={AREAS_3} />)
    const ul = container.querySelector('ul') as HTMLElement
    expect(ul.className).toContain('flex')
    expect(ul.className).toContain('flex-wrap')
    expect(ul.className).toContain('gap-2')
  })

  it('direction="column" applies space-y-1 to the wrapper', () => {
    const {container} = render(<PracticeAreaList areas={AREAS_3} direction="column" />)
    const ul = container.querySelector('ul') as HTMLElement
    expect(ul.className).toContain('space-y-1')
    expect(ul.className).not.toContain('flex-wrap')
  })

  it('direction="row" forwards Button variant="secondary" size="small" (no arrowPosition)', () => {
    render(<PracticeAreaList areas={AREAS_3} />)
    const buttons = screen.getAllByTestId('btn')
    buttons.forEach((b) => {
      expect(b.getAttribute('data-variant')).toBe('secondary')
      expect(b.getAttribute('data-size')).toBe('small')
      expect(b.getAttribute('data-arrow-position')).toBe('')
    })
  })

  it('direction="column" forwards Button variant="tertiary" arrowPosition="leading" (no size)', () => {
    render(<PracticeAreaList areas={AREAS_3} direction="column" />)
    const buttons = screen.getAllByTestId('btn')
    buttons.forEach((b) => {
      expect(b.getAttribute('data-variant')).toBe('tertiary')
      expect(b.getAttribute('data-arrow-position')).toBe('leading')
      expect(b.getAttribute('data-size')).toBe('')
    })
  })

  it('row variant renders an MdChevronRight icon next to the label inside the Button', () => {
    const {container} = render(<PracticeAreaList areas={AREAS_3} />)
    // The chevron is decorative — aria-hidden="true". It's rendered as an SVG.
    const chevrons = container.querySelectorAll('svg[aria-hidden="true"]')
    expect(chevrons.length).toBe(3)
  })

  it('column variant does NOT render the inline chevron (Button supplies its own arrow)', () => {
    const {container} = render(<PracticeAreaList areas={AREAS_3} direction="column" />)
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBe(0)
  })
})

// ─── context forwarding ───────────────────────────────────────────────────────

describe('PracticeAreaList — context forwarding', () => {
  it('defaults context="light" on every Button', () => {
    render(<PracticeAreaList areas={AREAS_3} />)
    const buttons = screen.getAllByTestId('btn')
    buttons.forEach((b) => expect(b.getAttribute('data-context')).toBe('light'))
  })

  it('forwards context="dark" to every Button when prop is set', () => {
    render(<PracticeAreaList areas={AREAS_3} context="dark" />)
    const buttons = screen.getAllByTestId('btn')
    buttons.forEach((b) => expect(b.getAttribute('data-context')).toBe('dark'))
  })
})

// ─── className override ───────────────────────────────────────────────────────

describe('PracticeAreaList — className override', () => {
  it('custom className replaces the direction-default wrapper class', () => {
    const {container} = render(
      <PracticeAreaList areas={AREAS_3} className="my-custom-grid" />,
    )
    const ul = container.querySelector('ul') as HTMLElement
    expect(ul.className).toBe('my-custom-grid')
    // Direction-default classes are NOT present when className is overridden.
    expect(ul.className).not.toContain('flex-wrap')
  })
})

// ─── currentPath (active state) — WS-Sidebar Phase 2.2 ────────────────────────
//
// When `currentPath` is provided, the area whose slug matches the path renders
// with active-state styling and aria-current="page". When unset, no area is
// active — attorney profile layouts (row direction) rely on this default.

describe('PracticeAreaList — currentPath (column direction)', () => {
  it('marks the matching area with aria-current="page"', () => {
    render(
      <PracticeAreaList areas={AREAS_3} direction="column" currentPath="/family-law/" />,
    )
    const buttons = screen.getAllByTestId('btn')
    const active = buttons.find((b) => b.getAttribute('href') === '/family-law/')
    const inactive = buttons.find((b) => b.getAttribute('href') === '/wills-and-probate/')
    expect(active?.getAttribute('aria-current')).toBe('page')
    expect(inactive?.getAttribute('aria-current')).toBeNull()
  })

  it('applies the cascade-aware active-state className to the matching button', () => {
    render(
      <PracticeAreaList areas={AREAS_3} direction="column" currentPath="/family-law/" />,
    )
    const active = screen.getAllByTestId('btn').find((b) => b.getAttribute('href') === '/family-law/')
    expect(active?.getAttribute('data-classname')).toContain('!text-foreground')
    expect(active?.getAttribute('data-classname')).toContain('!font-semibold')
    // Inactive sibling has no data-classname value (no override applied).
    const inactive = screen.getAllByTestId('btn').find((b) => b.getAttribute('href') === '/wills-and-probate/')
    expect(inactive?.getAttribute('data-classname')).toBe('')
  })

  it('uses only cascade-aware tokens — no hardcoded colors or on-light/on-dark anchors', () => {
    render(
      <PracticeAreaList areas={AREAS_3} direction="column" currentPath="/family-law/" />,
    )
    const active = screen.getAllByTestId('btn').find((b) => b.getAttribute('href') === '/family-law/')
    const cls = active?.getAttribute('data-classname') ?? ''
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(cls).not.toMatch(/\btext-foreground-on-light\b/)
    expect(cls).not.toMatch(/\btext-foreground-on-dark\b/)
  })

  it('normalizes trailing slashes — currentPath without trailing slash still matches', () => {
    render(
      <PracticeAreaList areas={AREAS_3} direction="column" currentPath="/family-law" />,
    )
    const active = screen.getAllByTestId('btn').find((b) => b.getAttribute('href') === '/family-law/')
    expect(active?.getAttribute('aria-current')).toBe('page')
  })

  it('applies no className and no aria-current when currentPath is undefined', () => {
    render(<PracticeAreaList areas={AREAS_3} direction="column" />)
    const buttons = screen.getAllByTestId('btn')
    buttons.forEach((b) => {
      expect(b.getAttribute('aria-current')).toBeNull()
      expect(b.getAttribute('data-classname')).toBe('')
    })
  })

  it('applies no aria-current when currentPath is null', () => {
    render(<PracticeAreaList areas={AREAS_3} direction="column" currentPath={null} />)
    const buttons = screen.getAllByTestId('btn')
    buttons.forEach((b) => expect(b.getAttribute('aria-current')).toBeNull())
  })

  it('marks at most one button active even if multiple areas share a slug-prefix (exact match only)', () => {
    // /family-law-overview and /family-law share the family-law prefix — only
    // the exact match should activate.
    const areas = [
      {label: 'Family Law', slug: 'family-law'},
      {label: 'Family Law Overview', slug: 'family-law-overview'},
    ]
    render(<PracticeAreaList areas={areas} direction="column" currentPath="/family-law/" />)
    const buttons = screen.getAllByTestId('btn')
    const active = buttons.filter((b) => b.getAttribute('aria-current') === 'page')
    expect(active).toHaveLength(1)
    expect(active[0].getAttribute('href')).toBe('/family-law/')
  })
})

describe('PracticeAreaList — currentPath (row direction)', () => {
  it('still marks the matching area with aria-current="page" on secondary buttons', () => {
    render(
      <PracticeAreaList areas={AREAS_3} direction="row" currentPath="/family-law/" />,
    )
    const active = screen.getAllByTestId('btn').find((b) => b.getAttribute('href') === '/family-law/')
    expect(active?.getAttribute('aria-current')).toBe('page')
  })

  it('does NOT apply the tertiary !text-foreground override on row direction (secondary buttons use their own weight)', () => {
    render(
      <PracticeAreaList areas={AREAS_3} direction="row" currentPath="/family-law/" />,
    )
    const active = screen.getAllByTestId('btn').find((b) => b.getAttribute('href') === '/family-law/')
    // Row uses variant="secondary" — no className override (secondary has its
    // own visual treatment; aria-current is the semantic marker).
    expect(active?.getAttribute('data-classname')).toBe('')
  })

  it('attorney-layout callers (no currentPath) get no aria-current attribute anywhere', () => {
    // Reflects the actual call sites in components/attorney/layouts/*Layout.tsx
    // — they render PracticeAreaList without currentPath, so existing behavior
    // is fully preserved.
    render(<PracticeAreaList areas={AREAS_3} direction="row" />)
    const buttons = screen.getAllByTestId('btn')
    buttons.forEach((b) => expect(b.getAttribute('aria-current')).toBeNull())
  })
})

describe('PracticeAreaList — currentPath (no-slug Chip path unaffected)', () => {
  it('chip entries (slug=null) never get aria-current even if a sibling area is active', () => {
    const areas = [
      {label: 'Family Law',        slug: 'family-law'},
      {label: 'Adoption',           slug: null},        // chip
      {label: 'Criminal Defense',  slug: 'criminal-defense'},
    ]
    const {container} = render(
      <PracticeAreaList areas={areas} direction="column" currentPath="/family-law/" />,
    )
    const chip = container.querySelector('[data-testid="chip"]')
    expect(chip).not.toBeNull()
    expect(chip?.getAttribute('aria-current')).toBeNull()
  })
})

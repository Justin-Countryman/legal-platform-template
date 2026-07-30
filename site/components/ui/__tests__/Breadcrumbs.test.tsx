import {describe, it, expect, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {Breadcrumbs, buildBreadcrumbs} from '../Breadcrumbs'

// next/link is mocked to a passthrough <a> per the codebase convention from
// Button.test.tsx — sidesteps router context that breadcrumb tests don't need.
vi.mock('next/link', () => ({
  default: ({href, children, ...rest}: {href: string; children: React.ReactNode}) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const ITEMS_2 = [
  {label: 'Home', href: '/'},
  {label: 'Family Law', href: '/family-law/'},
]

const ITEMS_3 = [
  {label: 'Home', href: '/'},
  {label: 'Family Law', href: '/family-law/'},
  {label: 'Divorce', href: '/family-law/divorce/'},
]

// ─── Render shape (null guard) ────────────────────────────────────────────────

describe('Breadcrumbs — render shape (null guard)', () => {
  it('renders nothing when items array is empty', () => {
    const {container} = render(<Breadcrumbs items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when items has only the Home entry (length === 1)', () => {
    const {container} = render(<Breadcrumbs items={[{label: 'Home', href: '/'}]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the nav landmark when items.length >= 2', () => {
    render(<Breadcrumbs items={ITEMS_2} />)
    expect(screen.getByRole('navigation', {name: /breadcrumb/i})).not.toBeNull()
  })
})

// ─── Nav-landmark A11y dimension (the new anchor pattern) ─────────────────────
//
// Locked pattern for nav landmarks: discoverable by role+name, semantic <ol>
// list structure, current item carries aria-current="page" and renders as a
// non-interactive <span>, prior items are <a> links, separators are
// aria-hidden="true" decorative spans.

describe('Breadcrumbs — nav landmark A11y', () => {
  it('wraps the trail in <nav aria-label="Breadcrumb"> (discoverable by role+name)', () => {
    render(<Breadcrumbs items={ITEMS_2} />)
    const nav = screen.getByRole('navigation', {name: /breadcrumb/i})
    expect(nav.tagName).toBe('NAV')
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb')
  })

  it('uses an <ol> for the trail (ordered semantic)', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_3} />)
    const ol = container.querySelector('nav > ol')
    expect(ol).not.toBeNull()
  })

  it('emits one <li> per item', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_3} />)
    const lis = container.querySelectorAll('nav > ol > li')
    expect(lis.length).toBe(3)
  })

  it('marks the LAST item with aria-current="page" rendered as a <span> (not a link)', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_3} />)
    const current = container.querySelector('[aria-current="page"]') as HTMLElement
    expect(current).not.toBeNull()
    expect(current.tagName).toBe('SPAN')
    expect(current.textContent).toBe('Divorce')
  })

  it('renders prior items as <a> links (interactive) with correct href', () => {
    render(<Breadcrumbs items={ITEMS_3} />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBe(2)
    expect(links[0].getAttribute('href')).toBe('/')
    expect(links[0].textContent).toBe('Home')
    expect(links[1].getAttribute('href')).toBe('/family-law/')
    expect(links[1].textContent).toBe('Family Law')
  })

  it('renders decorative "/" separators between items as aria-hidden spans', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_3} />)
    const separators = container.querySelectorAll('span[aria-hidden="true"]')
    // One separator before each non-first item → 2 separators for 3 items.
    expect(separators.length).toBe(2)
    separators.forEach((sep) => expect(sep.textContent).toBe('/'))
  })

  it('omits the leading separator before the first item', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_2} />)
    const firstLi = container.querySelector('nav > ol > li:first-child')
    expect(firstLi?.querySelector('span[aria-hidden="true"]')).toBeNull()
  })
})

// ─── JSON-LD structured data ──────────────────────────────────────────────────

describe('Breadcrumbs — JSON-LD schema', () => {
  it('omits the JSON-LD <script> when domain is not provided', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_2} />)
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull()
  })

  it('emits a JSON-LD <script> when domain is provided', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_2} domain="example.com" />)
    expect(container.querySelector('script[type="application/ld+json"]')).not.toBeNull()
  })

  it('schema has @context, @type=BreadcrumbList, and one ListItem per breadcrumb', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_3} domain="example.com" />)
    const script = container.querySelector('script[type="application/ld+json"]') as HTMLScriptElement
    const schema = JSON.parse(script.textContent ?? '{}')
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('BreadcrumbList')
    expect(schema.itemListElement).toHaveLength(3)
  })

  it('each ListItem carries position (1-indexed), name, and absolute item URL via domain', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_3} domain="hs.example" />)
    const script = container.querySelector('script[type="application/ld+json"]') as HTMLScriptElement
    const schema = JSON.parse(script.textContent ?? '{}')
    expect(schema.itemListElement[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://hs.example/',
    })
    expect(schema.itemListElement[2]).toMatchObject({
      position: 3,
      name: 'Divorce',
      item: 'https://hs.example/family-law/divorce/',
    })
  })
})

// ─── Cascade-aware contract (direct-token primitive) ──────────────────────────

describe('Breadcrumbs — cascade-aware contract', () => {
  it('uses cascade-aware tokens on the ol and current item', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_3} />)
    const ol = container.querySelector('ol') as HTMLElement
    expect(ol.className).toContain('text-foreground-muted')
    const current = container.querySelector('[aria-current="page"]') as HTMLElement
    expect(current.className).toContain('text-foreground')
  })

  it('does not emit anchored aliases or hex literals anywhere in the trail', () => {
    const {container} = render(<Breadcrumbs items={ITEMS_3} domain="example.com" />)
    const nav = container.querySelector('nav') as HTMLElement
    const html = nav.innerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})

// ─── buildBreadcrumbs helper (pure function) ──────────────────────────────────
//
// Helper exercises substantial logic (title→hero→slug fallback, parent and
// grandparent chain, no-slug guard). Pure-function tests don't need render —
// just call and assert shape.

describe('buildBreadcrumbs — helper', () => {
  it('always prepends Home as the first item', () => {
    const items = buildBreadcrumbs({title: 'Solo', slug: 'solo'})
    expect(items[0]).toEqual({label: 'Home', href: '/'})
  })

  it('prefers the nav label over the title', () => {
    // NAME-5: the types whose menu label differs from their Name. The
    // breadcrumb, the menu and the index card share this one field.
    const items = buildBreadcrumbs({
      navLabel: 'Blaine', title: 'Blaine Law Firm', slug: 'service-area/blaine-law-firm',
    })
    expect(items[items.length - 1].label).toBe('Blaine')
  })

  it('uses page.title when there is no nav label', () => {
    const items = buildBreadcrumbs({title: 'Family Law', slug: 'family-law'})
    expect(items[items.length - 1]).toEqual({label: 'Family Law', href: '/family-law/'})
  })

  it('cannot fall back to a heading, because it cannot see one', () => {
    // This asserted `.toBe('Family Law (Hero)')` until 2026-07-29. NAME-2 forbids
    // the heading rung and NAME-3 collapsed the four resolvers onto
    // `lib/pageLabel.ts`, whose signature carries no heading field at all — so a
    // heading passed in is inert rather than second in line.
    const items = buildBreadcrumbs({
      slug: 'family-law', hero: {heading: 'Family Law (Hero)'},
    } as Parameters<typeof buildBreadcrumbs>[0])
    expect(items[items.length - 1].label).toBe('Family Law')
  })

  it('falls back to the title-cased slug leaf, minor words lowercased', () => {
    // `Divorce And Separation` until 2026-07-29: the old local resolver
    // title-cased every word. The shared resolver mirrors
    // `_shared/page_name.py::titlecase_slug`, so the two repos agree on casing.
    const items = buildBreadcrumbs({slug: 'family-law/divorce-and-separation'})
    expect(items[items.length - 1].label).toBe('Divorce and Separation')
  })

  it('formats href with leading and trailing slash from the slug', () => {
    const items = buildBreadcrumbs({title: 'X', slug: 'family-law/divorce'})
    expect(items[items.length - 1].href).toBe('/family-law/divorce/')
  })

  it('returns only Home when page has no slug', () => {
    const items = buildBreadcrumbs({title: 'Orphan'})
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({label: 'Home', href: '/'})
  })

  it('builds a 3-item chain when parentPage is provided', () => {
    const items = buildBreadcrumbs({
      title: 'Divorce',
      slug: 'family-law/divorce',
      parentPage: {title: 'Family Law', slug: 'family-law'},
    })
    expect(items.map((i) => i.label)).toEqual(['Home', 'Family Law', 'Divorce'])
    expect(items.map((i) => i.href)).toEqual(['/', '/family-law/', '/family-law/divorce/'])
  })

  it('builds a 4-item chain when parentPage.parentPage is provided', () => {
    const items = buildBreadcrumbs({
      title: 'Uncontested',
      slug: 'family-law/divorce/uncontested',
      parentPage: {
        title: 'Divorce',
        slug: 'family-law/divorce',
        parentPage: {title: 'Family Law', slug: 'family-law'},
      },
    })
    expect(items.map((i) => i.label)).toEqual([
      'Home',
      'Family Law',
      'Divorce',
      'Uncontested',
    ])
  })

  it('skips a parent that has no slug (defensive against partial Sanity references)', () => {
    const items = buildBreadcrumbs({
      title: 'Divorce',
      slug: 'family-law/divorce',
      parentPage: {title: 'Phantom Parent'}, // no slug → skip
    })
    expect(items.map((i) => i.label)).toEqual(['Home', 'Divorce'])
  })
})

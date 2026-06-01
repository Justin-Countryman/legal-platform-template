import {describe, it, expect, expectTypeOf, vi, beforeEach} from 'vitest'
import {render} from '@testing-library/react'
import {SidebarDesignSettingsProvider} from '@/lib/sidebarDesignSettingsContext'
import type {SidebarDesignSettings} from '@/lib/designTokens'

// next/navigation's usePathname is a client hook with no router context in
// jsdom; mock it so tests can drive different pathnames. Default return is
// null (no current page), matching production behavior when Sidebar renders
// outside a navigation context — no link gets the active treatment.
const mockUsePathname = vi.fn<() => string | null>(() => null)
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

import {
  Sidebar,
  isCurrentPath,
  type SidebarComponent,
  type SidebarTocComponent,
  type SidebarNavComponent,
  type SidebarCtaBoxComponent,
  type SidebarFormEmbedComponent,
  type SidebarAttorneyListComponent,
} from '../Sidebar'

beforeEach(() => {
  mockUsePathname.mockReset()
  mockUsePathname.mockReturnValue(null)
})

// WS-Sidebar Phase 1 — resolves WS8 Decision-2.
//
// The component switched from a `[key: string]: any` escape hatch to a
// discriminated union on `_componentType`. These tests lock the narrowing
// behavior (type-level) and the per-variant dispatch path (runtime). They
// intentionally do NOT cover Phase 2 behavior (active state, hierarchy,
// accordion) — that work lands in a separate test surface.
//
// Mirrors the test patterns established in:
//   - SidebarPanel.test.tsx (render-shape sweep, cascade-aware contract)
//   - ContentSidebarLayout.test.tsx (conditional dispatch, polymorphism)

// ─── Type-level narrowing ─────────────────────────────────────────────────────
//
// vitest's expectTypeOf operates entirely at compile time. These assertions
// fail to *type-check* (not just at runtime) if SidebarComponent stops being
// a discriminated union — exactly the regression the WS8 Decision-2 escape
// hatch was masking.

describe('SidebarComponent — discriminated union (type-level)', () => {
  it('_componentType is a literal union of the 5 widget kinds', () => {
    expectTypeOf<SidebarComponent['_componentType']>().toEqualTypeOf<
      | 'sidebarTableOfContents'
      | 'sidebarNav'
      | 'sidebarCtaBox'
      | 'sidebarFormEmbed'
      | 'sidebarAttorneyList'
    >()
  })

  it('narrows to SidebarTocComponent when _componentType is sidebarTableOfContents', () => {
    const c: SidebarComponent = {_componentType: 'sidebarTableOfContents', enabled: true}
    if (c._componentType === 'sidebarTableOfContents') {
      expectTypeOf(c).toMatchTypeOf<SidebarTocComponent>()
      // enabled is present on the narrowed variant
      expectTypeOf(c.enabled).toEqualTypeOf<boolean | undefined>()
    }
  })

  it('narrows to SidebarNavComponent when _componentType is sidebarNav', () => {
    const c: SidebarComponent = {
      _componentType: 'sidebarNav',
      mode: 'practiceArea',
    }
    if (c._componentType === 'sidebarNav') {
      expectTypeOf(c).toMatchTypeOf<SidebarNavComponent>()
      // The narrowed variant exposes nav-specific fields (Phase 2.3 AOL tree
      // + Phase 2.2 links/posts; pre-2.3 practiceAreaNav alias dropped in the
      // post-Phase-2.5 schema cleanup).
      expectTypeOf(c.areasOfLaw).toMatchTypeOf<SidebarNavComponent['areasOfLaw']>()
      expectTypeOf(c.orderedAolIds).toMatchTypeOf<SidebarNavComponent['orderedAolIds']>()
      expectTypeOf(c.links).toMatchTypeOf<SidebarNavComponent['links']>()
      expectTypeOf(c.posts).toMatchTypeOf<SidebarNavComponent['posts']>()
    }
  })

  it('narrows to SidebarCtaBoxComponent when _componentType is sidebarCtaBox', () => {
    const c: SidebarComponent = {
      _componentType: 'sidebarCtaBox',
      header: 'Call Today',
      button: {title: 'Call', url: '/contact/'},
    }
    if (c._componentType === 'sidebarCtaBox') {
      expectTypeOf(c).toMatchTypeOf<SidebarCtaBoxComponent>()
      expectTypeOf(c.phoneNumber).toEqualTypeOf<string | undefined>()
      expectTypeOf(c.layout).toEqualTypeOf<'left' | 'centered' | undefined>()
    }
  })

  it('narrows to SidebarFormEmbedComponent when _componentType is sidebarFormEmbed', () => {
    const c: SidebarComponent = {
      _componentType: 'sidebarFormEmbed',
      header: 'Free Consultation',
    }
    if (c._componentType === 'sidebarFormEmbed') {
      expectTypeOf(c).toMatchTypeOf<SidebarFormEmbedComponent>()
      expectTypeOf(c.formEmbed).toEqualTypeOf<string | null | undefined>()
    }
  })

  it('narrows to SidebarAttorneyListComponent when _componentType is sidebarAttorneyList', () => {
    const c: SidebarComponent = {
      _componentType: 'sidebarAttorneyList',
      mode: 'all',
      layout: 'list',
    }
    if (c._componentType === 'sidebarAttorneyList') {
      expectTypeOf(c).toMatchTypeOf<SidebarAttorneyListComponent>()
      expectTypeOf(c.mode).toEqualTypeOf<
        'practiceArea' | 'manual' | 'all' | undefined
      >()
      expectTypeOf(c.layout).toEqualTypeOf<'list' | 'avatar' | undefined>()
    }
  })

  it('rejects cross-variant field access on narrowed branches', () => {
    const c: SidebarComponent = {_componentType: 'sidebarCtaBox'}
    if (c._componentType === 'sidebarCtaBox') {
      // @ts-expect-error — `mode` is not on SidebarCtaBoxComponent
      void c.mode
      // @ts-expect-error — `attorneys` is not on SidebarCtaBoxComponent
      void c.attorneys
      // @ts-expect-error — `areasOfLaw` is not on SidebarCtaBoxComponent
      void c.areasOfLaw
    }
  })

  it('SidebarComponent has no implicit index signature', () => {
    const c: SidebarComponent = {_componentType: 'sidebarFormEmbed'}
    if (c._componentType === 'sidebarFormEmbed') {
      // @ts-expect-error — arbitrary keys are no longer permitted (no [key: string]: any)
      void c.arbitraryField
    }
  })
})

// ─── Runtime dispatch — one variant per test ──────────────────────────────────
//
// One render assertion per discriminator value confirms the dispatcher routes
// each variant to its render path. We probe DOM signatures unique to each
// variant rather than asserting on the entire output.

describe('Sidebar — runtime dispatch per variant', () => {
  it('renders SidebarToc when _componentType is sidebarTableOfContents and enabled !== false', () => {
    const body = [
      {_type: 'block', style: 'h2', children: [{_type: 'span', text: 'Section One'}]},
      {_type: 'block', style: 'h3', children: [{_type: 'span', text: 'Subsection'}]},
    ]
    const components: SidebarComponent[] = [
      {_componentType: 'sidebarTableOfContents', enabled: true},
    ]
    const {container} = render(<Sidebar components={components} body={body} />)
    const toc = container.querySelector('nav[aria-label="Table of contents"]')
    expect(toc).not.toBeNull()
    expect(toc?.textContent).toContain('Section One')
    expect(toc?.textContent).toContain('Subsection')
  })

  it('omits SidebarToc when sidebarTableOfContents is explicitly disabled', () => {
    const body = [
      {_type: 'block', style: 'h2', children: [{_type: 'span', text: 'Section'}]},
    ]
    const components: SidebarComponent[] = [
      {_componentType: 'sidebarTableOfContents', enabled: false},
    ]
    const {container} = render(<Sidebar components={components} body={body} />)
    expect(container.querySelector('nav[aria-label="Table of contents"]')).toBeNull()
  })

  it('renders SidebarNav (custom mode) with link rows when _componentType is sidebarNav', () => {
    const components: SidebarComponent[] = [
      {
        _componentType: 'sidebarNav',
        header: 'Related Pages',
        mode: 'custom',
        links: [
          {_id: 'a', _type: 'page', title: 'About', slug: 'about'},
          {_id: 'b', _type: 'page', title: 'Contact', slug: 'contact'},
        ],
      },
    ]
    const {container} = render(<Sidebar components={components} />)
    const nav = container.querySelector('nav[aria-label="Related Pages"]')
    expect(nav).not.toBeNull()
    const links = nav?.querySelectorAll('a')
    expect(links?.length).toBe(2)
    // next/link normalizes trailing slashes in the rendered href (next.config has no
    // `trailingSlash: true`). Accept either form — Phase 1 asserts dispatch, not URL format.
    expect(links?.[0].getAttribute('href')).toMatch(/^\/about\/?$/)
    expect(links?.[1].textContent).toContain('Contact')
  })

  it('renders SidebarCtaBox with phone link + button when _componentType is sidebarCtaBox', () => {
    const components: SidebarComponent[] = [
      {
        _componentType: 'sidebarCtaBox',
        header: 'Speak With an Attorney',
        phoneNumber: '(555) 123-4567',
        button: {title: 'Get a Free Consultation', url: '/contact/'},
      },
    ]
    const {container} = render(<Sidebar components={components} />)
    const phone = container.querySelector('a[href^="tel:"]')
    expect(phone).not.toBeNull()
    expect(phone?.getAttribute('href')).toBe('tel:5551234567')
    expect(phone?.textContent).toContain('(555) 123-4567')
    // The CTA button renders to the configured URL
    const buttons = container.querySelectorAll('a')
    const cta = Array.from(buttons).find((a) =>
      a.textContent?.includes('Free Consultation'),
    )
    expect(cta).toBeDefined()
    expect(cta?.getAttribute('href')).toMatch(/^\/contact\/?$/)
  })

  it('renders SidebarFormEmbed fallback text when _componentType is sidebarFormEmbed and formEmbed is empty', () => {
    const components: SidebarComponent[] = [
      {
        _componentType: 'sidebarFormEmbed',
        header: 'Get Help',
        description: 'Free initial review.',
      },
    ]
    const {container} = render(<Sidebar components={components} />)
    expect(container.textContent).toContain('Get Help')
    expect(container.textContent).toContain('Free initial review.')
    expect(container.textContent).toContain('No form selected.')
  })

  it('renders SidebarAttorneyList (text layout) when _componentType is sidebarAttorneyList', () => {
    const components: SidebarComponent[] = [
      {
        _componentType: 'sidebarAttorneyList',
        header: 'Our Team',
        mode: 'manual',
        layout: 'list',
        attorneys: [
          {_id: 'a1', title: 'Jane Doe', slug: 'jane-doe'},
          {_id: 'a2', title: 'John Roe', slug: 'john-roe'},
        ],
      },
    ]
    const {container} = render(<Sidebar components={components} />)
    expect(container.textContent).toContain('Our Team')
    const links = container.querySelectorAll('a')
    const hrefs = Array.from(links).map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.some((h) => /^\/jane-doe\/?$/.test(h))).toBe(true)
    expect(hrefs.some((h) => /^\/john-roe\/?$/.test(h))).toBe(true)
  })

  it('returns null when neither components nor showSearch are provided', () => {
    const {container} = render(<Sidebar components={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders SidebarSearchWidget when showSearch is true', () => {
    const {container} = render(<Sidebar components={[]} showSearch />)
    const search = container.querySelector('input[type="search"]')
    expect(search).not.toBeNull()
    expect(search?.getAttribute('name')).toBe('q')
  })
})

// ─── isCurrentPath helper (WS-Sidebar Phase 2.2) ──────────────────────────────

describe('isCurrentPath — exported helper', () => {
  it('returns true when paths match exactly', () => {
    expect(isCurrentPath('/family-law/', '/family-law/')).toBe(true)
  })

  it('returns true when only one side has a trailing slash', () => {
    expect(isCurrentPath('/family-law/', '/family-law')).toBe(true)
    expect(isCurrentPath('/family-law', '/family-law/')).toBe(true)
  })

  it('returns false when pathname is null or undefined', () => {
    expect(isCurrentPath('/family-law/', null)).toBe(false)
  })

  it('returns false when href is null, undefined, empty, or just a fragment', () => {
    expect(isCurrentPath(null, '/family-law/')).toBe(false)
    expect(isCurrentPath(undefined, '/family-law/')).toBe(false)
    expect(isCurrentPath('', '/family-law/')).toBe(false)
    expect(isCurrentPath('#', '/family-law/')).toBe(false)
  })

  it('returns false for prefix matches (avoids /family-law lighting up /family-law-overview)', () => {
    expect(isCurrentPath('/family-law/', '/family-law-overview/')).toBe(false)
    expect(isCurrentPath('/family-law-overview/', '/family-law/')).toBe(false)
  })
})

// ─── Active state — WS-Sidebar Phase 2.2 ──────────────────────────────────────
//
// usePathname()-driven highlight. Each link-rendering variant marks the
// current page with aria-current="page" + cascade-aware className tweaks.
// Hover behavior remains independent (separate :hover styling on Button).
//
// The PracticeAreaList primitive carries its own currentPath-prop tests in
// components/ui/__tests__/PracticeAreaList.test.tsx. These tests cover the
// inline link-rendering paths in Sidebar.tsx (custom/recentPosts/faqPosts
// modes of SidebarNav, plus SidebarAttorneyList in both layouts).

describe('SidebarNav — active state (custom mode inline links)', () => {
  const components: SidebarComponent[] = [
    {
      _componentType: 'sidebarNav',
      header: 'Related Pages',
      mode: 'custom',
      links: [
        {_id: 'a', _type: 'page', title: 'About',   slug: 'about'},
        {_id: 'b', _type: 'page', title: 'Contact', slug: 'contact'},
      ],
    },
  ]

  it('marks the link matching the current pathname with aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/about/')
    const {container} = render(<Sidebar components={components} />)
    const links = container.querySelectorAll('a')
    const aboutLink   = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('about'))
    const contactLink = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('contact'))
    expect(aboutLink?.getAttribute('aria-current')).toBe('page')
    expect(contactLink?.getAttribute('aria-current')).toBeNull()
  })

  it('applies !text-foreground + !font-semibold to the active link only', () => {
    mockUsePathname.mockReturnValue('/about/')
    const {container} = render(<Sidebar components={components} />)
    const links = container.querySelectorAll('a')
    const aboutLink   = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('about'))
    const contactLink = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('contact'))
    expect(aboutLink?.className).toContain('!text-foreground')
    expect(aboutLink?.className).toContain('!font-semibold')
    expect(contactLink?.className).not.toContain('!font-semibold')
  })

  it('preserves the !whitespace-normal wrap utility even on the active link', () => {
    // Locked in WS7.7 Commit 7 — long blog post titles must wrap in the 320px
    // sidebar column. Active state must compose, not replace.
    mockUsePathname.mockReturnValue('/about/')
    const {container} = render(<Sidebar components={components} />)
    const links = container.querySelectorAll('a')
    const aboutLink = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('about'))
    expect(aboutLink?.className).toContain('!whitespace-normal')
  })

  it('applies no aria-current and no active className when pathname is null', () => {
    mockUsePathname.mockReturnValue(null)
    const {container} = render(<Sidebar components={components} />)
    const links = container.querySelectorAll('a')
    links.forEach((a) => {
      expect(a.getAttribute('aria-current')).toBeNull()
      expect(a.className).not.toContain('!font-semibold')
    })
  })

  it('matches with trailing-slash normalization (pathname missing trailing slash)', () => {
    mockUsePathname.mockReturnValue('/about')  // no trailing slash
    const {container} = render(<Sidebar components={components} />)
    const aboutLink = Array.from(container.querySelectorAll('a')).find((a) =>
      (a.getAttribute('href') ?? '').includes('about'),
    )
    expect(aboutLink?.getAttribute('aria-current')).toBe('page')
  })

  it('uses only cascade-aware tokens — no hardcoded colors or on-light/on-dark anchors in the active className', () => {
    mockUsePathname.mockReturnValue('/about/')
    const {container} = render(<Sidebar components={components} />)
    const aboutLink = Array.from(container.querySelectorAll('a')).find((a) =>
      (a.getAttribute('href') ?? '').includes('about'),
    )
    const cls = aboutLink?.className ?? ''
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(cls).not.toMatch(/\btext-foreground-on-light\b/)
    expect(cls).not.toMatch(/\btext-foreground-on-dark\b/)
  })
})

describe('SidebarAttorneyList — active state', () => {
  const componentsText: SidebarComponent[] = [
    {
      _componentType: 'sidebarAttorneyList',
      header: 'Our Team',
      mode: 'manual',
      layout: 'list',
      attorneys: [
        {_id: 'a1', title: 'Jane Doe', slug: 'jane-doe'},
        {_id: 'a2', title: 'John Roe', slug: 'john-roe'},
      ],
    },
  ]

  const componentsAvatar: SidebarComponent[] = [
    {
      _componentType: 'sidebarAttorneyList',
      header: 'Our Team',
      mode: 'manual',
      layout: 'avatar',
      attorneys: [
        {_id: 'a1', title: 'Jane Doe', slug: 'jane-doe', photo: {src: '', alt: ''}},
        {_id: 'a2', title: 'John Roe', slug: 'john-roe', photo: {src: '', alt: ''}},
      ],
    },
  ]

  it('text layout — marks the current-attorney profile link with aria-current="page" and active className', () => {
    mockUsePathname.mockReturnValue('/jane-doe/')
    const {container} = render(<Sidebar components={componentsText} />)
    const links = container.querySelectorAll('a')
    const jane = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('jane-doe'))
    const john = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('john-roe'))
    expect(jane?.getAttribute('aria-current')).toBe('page')
    expect(john?.getAttribute('aria-current')).toBeNull()
    expect(jane?.className).toContain('!font-semibold')
  })

  it('avatar layout — marks the current-attorney Link with aria-current and bumps weight on the label span', () => {
    mockUsePathname.mockReturnValue('/jane-doe/')
    const {container} = render(<Sidebar components={componentsAvatar} />)
    const links = container.querySelectorAll('a')
    const jane = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('jane-doe'))
    const john = Array.from(links).find((a) => (a.getAttribute('href') ?? '').includes('john-roe'))
    expect(jane?.getAttribute('aria-current')).toBe('page')
    expect(john?.getAttribute('aria-current')).toBeNull()
    // Label span (the name) bumps to font-semibold when active.
    const janeLabel = jane?.querySelector('span') as HTMLElement | null
    const johnLabel = john?.querySelector('span') as HTMLElement | null
    expect(janeLabel?.className).toContain('font-semibold')
    expect(johnLabel?.className).toContain('font-medium')
  })

  it('no link is active when pathname is null', () => {
    mockUsePathname.mockReturnValue(null)
    const {container} = render(<Sidebar components={componentsText} />)
    container.querySelectorAll('a').forEach((a) =>
      expect(a.getAttribute('aria-current')).toBeNull(),
    )
  })
})

describe('Sidebar — active state respects hover independence', () => {
  it('Button hover classes (transition-colors, hover:underline, etc.) remain in active link className', () => {
    // The active state adds !text-foreground !font-semibold; it doesn't strip
    // the existing transition/hover utility classes that Button emits. We
    // sanity-check by asserting the active link still carries the
    // transition-colors class that Button's tertiary branch ships.
    mockUsePathname.mockReturnValue('/about/')
    const components: SidebarComponent[] = [
      {
        _componentType: 'sidebarNav',
        mode: 'custom',
        links: [{_id: 'a', _type: 'page', title: 'About', slug: 'about'}],
      },
    ]
    const {container} = render(<Sidebar components={components} />)
    const link = container.querySelector('a')
    expect(link?.className).toContain('transition-colors')
    expect(link?.className).toContain('!font-semibold')
  })
})

// ─── Type-level — active state surface ────────────────────────────────────────

describe('isCurrentPath — type-level', () => {
  it('accepts (string | null | undefined, string | null) and returns boolean', () => {
    expectTypeOf(isCurrentPath).parameter(0).toEqualTypeOf<string | null | undefined>()
    expectTypeOf(isCurrentPath).parameter(1).toEqualTypeOf<string | null>()
    expectTypeOf(isCurrentPath).returns.toEqualTypeOf<boolean>()
  })
})

// ─── Context-aware hierarchy rendering (WS-Sidebar Phase 2.3) ────────────────
//
// The 4 scenarios from BI/BI-Sidebar.md §1 mapped to component render
// assertions. Fixture mirrors the canonical sidebar shape: 3 AOLs (Family Law, Criminal
// Defense, Estate Planning) with ordered nav menu placement, Family Law with
// 2 children (Divorce, Adoption), Divorce with 2 grandchildren (Contested,
// Uncontested), Criminal Defense with 1 child (DUI) that has no
// grandchildren, Estate Planning with no children.

const HIERARCHY_FIXTURE: SidebarComponent = {
  _componentType: 'sidebarNav',
  header: 'Practice Areas',
  mode: 'practiceArea',
  orderedAolIds: ['pa-criminal', 'pa-family', 'pa-estate'],
  areasOfLaw: [
    // Returned in alphabetical order by GROQ; the renderer applies
    // orderedAolIds to reorder.
    {
      _id: 'pa-criminal',
      slug: 'criminal-defense',
      title: 'Criminal Defense',
      children: [
        {
          _id: 'pa-dui',
          slug: 'criminal-defense/dui',
          title: 'DUI',
          grandchildren: [],
        },
      ],
    },
    {
      _id: 'pa-estate',
      slug: 'estate-planning',
      title: 'Estate Planning',
      children: [],
    },
    {
      _id: 'pa-family',
      slug: 'family-law',
      title: 'Family Law',
      children: [
        {
          _id: 'pa-adoption',
          slug: 'family-law/adoption',
          title: 'Adoption',
          grandchildren: [],
        },
        {
          _id: 'pa-divorce',
          slug: 'family-law/divorce',
          title: 'Divorce',
          grandchildren: [
            {slug: 'family-law/divorce/contested', title: 'Contested Divorce'},
            {slug: 'family-law/divorce/uncontested', title: 'Uncontested Divorce'},
          ],
        },
      ],
    },
  ],
}

// Helper — collect (href, label) pairs for every rendered Button anchor inside
// the rendered sidebar, in DOM order. Tertiary buttons render with a leading
// TertiaryArrow ("→") character; strip it from textContent so labels match the
// raw display string.
//
// `collectLinks` filters to *visible* links only — links inside a closed
// Phase 2.4 disclosure (`inert` ancestor or `aria-hidden="true"` ancestor)
// are skipped. Use `collectAllLinks` (incl. hidden) for DOM-presence checks.
function getLinkLabel(a: Element): string {
  return (a.textContent ?? '').replace(/^→\s*/, '').trim()
}
function isInHiddenRegion(el: Element): boolean {
  let current: Element | null = el.parentElement
  while (current) {
    if (current.hasAttribute('inert')) return true
    if (current.getAttribute('aria-hidden') === 'true') return true
    current = current.parentElement
  }
  return false
}
function collectLinks(container: HTMLElement): Array<{href: string; label: string}> {
  const links = Array.from(container.querySelectorAll('nav a')).filter(
    (a) => !isInHiddenRegion(a),
  )
  return links.map((a) => ({
    href: a.getAttribute('href') ?? '',
    label: getLinkLabel(a),
  }))
}
function collectAllLinks(container: HTMLElement): Array<{href: string; label: string}> {
  return Array.from(container.querySelectorAll('nav a')).map((a) => ({
    href: a.getAttribute('href') ?? '',
    label: getLinkLabel(a),
  }))
}
function findLinkByLabel(container: HTMLElement, label: string): HTMLAnchorElement | undefined {
  // Search all links (visible + hidden); per-test logic decides whether the
  // result should be in a hidden region.
  return Array.from(container.querySelectorAll('a')).find((a) => getLinkLabel(a) === label) as
    | HTMLAnchorElement
    | undefined
}

// WS-Sidebar Phase 2.5 — render Sidebar inside a custom design-settings
// provider. Default settings (no provider) are exercised by every existing
// Phase 2.2 / 2.3 / 2.4 test in this file via the context's default value.
function renderWithSettings(
  components: SidebarComponent[],
  settings: Partial<SidebarDesignSettings> = {},
  extraProps: {body?: unknown[]; showSearch?: boolean} = {},
) {
  const resolved: SidebarDesignSettings = {
    sidebarNavIconStyle: settings.sidebarNavIconStyle ?? 'chevrons',
    sidebarWidgetHeaderLine: settings.sidebarWidgetHeaderLine ?? true,
    sidebarItemSeparators: settings.sidebarItemSeparators ?? true,
  }
  return render(
    <SidebarDesignSettingsProvider value={resolved}>
      <Sidebar components={components} {...extraProps} />
    </SidebarDesignSettingsProvider>,
  )
}

describe('SidebarNav — hierarchy mode (Scenario 1: visitor on AOL parent page)', () => {
  it('renders primary AOL expanded with children, others as parent-only at bottom, no grandchildren', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const links = collectLinks(container)
    const labels = links.map((l) => l.label)

    // Primary AOL (Family Law) + its 2 children at top.
    expect(labels.indexOf('Family Law')).toBe(0)
    expect(labels.indexOf('Adoption')).toBeGreaterThan(labels.indexOf('Family Law'))
    expect(labels.indexOf('Divorce')).toBeGreaterThan(labels.indexOf('Adoption'))

    // No grandchildren rendered (visitor isn't on a child page).
    expect(labels).not.toContain('Contested Divorce')
    expect(labels).not.toContain('Uncontested Divorce')

    // Other AOLs at the bottom in nav menu order — Criminal Defense before
    // Estate Planning (orderedAolIds: ['pa-criminal', 'pa-family', 'pa-estate']
    // with Family Law removed from "others"). No children visible under the
    // bottom-list AOLs.
    const criminalIdx = labels.indexOf('Criminal Defense')
    const estateIdx = labels.indexOf('Estate Planning')
    expect(criminalIdx).toBeGreaterThan(labels.indexOf('Divorce'))
    expect(estateIdx).toBeGreaterThan(criminalIdx)
    expect(labels).not.toContain('DUI')
  })

  it('Family Law parent link carries aria-current="page" when on its own page', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const familyLink = findLinkByLabel(container, 'Family Law')
    expect(familyLink?.getAttribute('aria-current')).toBe('page')
  })
})

describe('SidebarNav — hierarchy mode (Scenario 2: visitor on child page WITH grandchildren)', () => {
  it('expands primary AOL + reveals only the current child\'s grandchildren', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const labels = collectLinks(container).map((l) => l.label)

    // Family Law + both children + Divorce's grandchildren.
    expect(labels).toContain('Family Law')
    expect(labels).toContain('Adoption')
    expect(labels).toContain('Divorce')
    expect(labels).toContain('Contested Divorce')
    expect(labels).toContain('Uncontested Divorce')

    // Grandchildren render after their child parent in DOM order.
    const divorceIdx = labels.indexOf('Divorce')
    const contestedIdx = labels.indexOf('Contested Divorce')
    expect(contestedIdx).toBeGreaterThan(divorceIdx)

    // Other AOLs still appear at the bottom, parent-only.
    expect(labels).toContain('Criminal Defense')
    expect(labels).toContain('Estate Planning')
    expect(labels).not.toContain('DUI')
  })

  it('emits a data-sidebar-grandchildren marker on the current child only', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const groups = container.querySelectorAll('[data-sidebar-grandchildren]')
    expect(groups).toHaveLength(1)
    expect(groups[0].getAttribute('data-sidebar-grandchildren')).toBe('family-law/divorce')
  })

  it('Divorce child link carries aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const divorce = findLinkByLabel(container, 'Divorce')
    expect(divorce?.getAttribute('aria-current')).toBe('page')
  })

  it('on a grandchild page (/family-law/divorce/contested/), the grandparent child still expands its grandchildren', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/contested/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const labels = collectLinks(container).map((l) => l.label)
    expect(labels).toContain('Contested Divorce')
    expect(labels).toContain('Uncontested Divorce')
    const contested = findLinkByLabel(container, 'Contested Divorce')
    expect(contested?.getAttribute('aria-current')).toBe('page')
  })
})

describe('SidebarNav — hierarchy mode (Scenario 3: visitor on child page WITHOUT grandchildren)', () => {
  it('renders the AOL expanded with children but no grandchildren block (DUI has none)', () => {
    mockUsePathname.mockReturnValue('/criminal-defense/dui/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const labels = collectLinks(container).map((l) => l.label)

    // Primary AOL is Criminal Defense; DUI is its only child.
    expect(labels).toContain('Criminal Defense')
    expect(labels).toContain('DUI')

    // No grandchildren rendered anywhere (DUI has none; other children's
    // grandchildren stay closed per doctrine).
    expect(container.querySelectorAll('[data-sidebar-grandchildren]')).toHaveLength(0)
    expect(labels).not.toContain('Contested Divorce')
    expect(labels).not.toContain('Uncontested Divorce')

    // Other AOLs still appear at bottom parent-only.
    expect(labels).toContain('Family Law')
    expect(labels).toContain('Estate Planning')
    expect(labels).not.toContain('Adoption')
    expect(labels).not.toContain('Divorce')
  })

  it('DUI carries aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/criminal-defense/dui/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const dui = findLinkByLabel(container, 'DUI')
    expect(dui?.getAttribute('aria-current')).toBe('page')
  })
})

describe('SidebarNav — hierarchy mode (Scenario 4: visitor on non-practice page)', () => {
  it('renders a flat parent-only list of all AOLs in nav menu order, no children anywhere', () => {
    mockUsePathname.mockReturnValue('/about/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const labels = collectLinks(container).map((l) => l.label)

    // Order matches orderedAolIds: criminal, family, estate.
    expect(labels).toEqual(['Criminal Defense', 'Family Law', 'Estate Planning'])

    // No children/grandchildren visible.
    expect(container.querySelectorAll('[data-sidebar-grandchildren]')).toHaveLength(0)
  })

  it('no link carries aria-current="page" (none of the AOLs matches /about/)', () => {
    mockUsePathname.mockReturnValue('/about/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    container.querySelectorAll('a').forEach((a) =>
      expect(a.getAttribute('aria-current')).toBeNull(),
    )
  })

  it('renders the same flat list when pathname is null (no router context)', () => {
    mockUsePathname.mockReturnValue(null)
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const labels = collectLinks(container).map((l) => l.label)
    expect(labels).toEqual(['Criminal Defense', 'Family Law', 'Estate Planning'])
  })

  it('renders the same flat list when pathname is the homepage', () => {
    mockUsePathname.mockReturnValue('/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const labels = collectLinks(container).map((l) => l.label)
    expect(labels).toEqual(['Criminal Defense', 'Family Law', 'Estate Planning'])
  })
})

describe('SidebarNav — hierarchy mode (ordering + edge cases)', () => {
  it('"Other AOLs at bottom" preserves orderedAolIds positions when present', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const labels = collectLinks(container).map((l) => l.label)
    // Bottom list excludes Family Law (primary). Order should be:
    // Criminal Defense (pa-criminal at orderedAolIds[0]) then
    // Estate Planning (pa-estate at orderedAolIds[2]).
    const criminalIdx = labels.indexOf('Criminal Defense')
    const estateIdx = labels.indexOf('Estate Planning')
    expect(criminalIdx).toBeLessThan(estateIdx)
  })

  it('falls back to alphabetical when orderedAolIds is null/empty', () => {
    mockUsePathname.mockReturnValue('/about/')
    const fixture: SidebarComponent = {...HIERARCHY_FIXTURE, orderedAolIds: null}
    const {container} = render(<Sidebar components={[fixture]} />)
    const labels = collectLinks(container).map((l) => l.label)
    expect(labels).toEqual(['Criminal Defense', 'Estate Planning', 'Family Law'])
  })

  it('renders header/description when AOL list is empty', () => {
    const empty: SidebarComponent = {
      _componentType: 'sidebarNav',
      header: 'Practice Areas',
      description: 'No areas defined yet.',
      mode: 'practiceArea',
      areasOfLaw: [],
      orderedAolIds: [],
    }
    const {container} = render(<Sidebar components={[empty]} />)
    expect(container.textContent).toContain('Practice Areas')
    expect(container.textContent).toContain('No areas defined yet.')
    expect(container.querySelector('nav')).toBeNull()
  })

  it('geoPracticeArea mode follows the same hierarchy rendering as practiceArea mode', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const geoFixture: SidebarComponent = {...HIERARCHY_FIXTURE, mode: 'geoPracticeArea'}
    const {container} = render(<Sidebar components={[geoFixture]} />)
    const labels = collectLinks(container).map((l) => l.label)
    expect(labels[0]).toBe('Family Law')
    expect(labels).toContain('Divorce')
    expect(labels).toContain('Criminal Defense')
  })

  it('active-state contract from Phase 2.2 still applies on hierarchy rows', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const divorce = findLinkByLabel(container, 'Divorce')
    expect(divorce?.className).toContain('!font-semibold')
    expect(divorce?.className).toContain('!text-foreground')
  })
})

// ─── Accordion mechanics — WS-Sidebar Phase 2.4 ──────────────────────────────
//
// Grandchildren disclosure: per BI-Sidebar.md §2 — plus-icon toggle (fixed,
// not from sidebarNavIconStyle), aria-expanded / aria-controls / inert
// semantics matching FaqAccordion (the canonical disclosure primitive), and
// auto-open driven by the visitor's pathname. Manual toggle remains sticky
// within the same context (autoOpen unchanged) and re-syncs on pathname-
// driven context changes.

import {fireEvent} from '@testing-library/react'

function getToggle(container: HTMLElement, childSlug: string): HTMLButtonElement | null {
  return container.querySelector(
    `[data-sidebar-grandchildren-toggle="${childSlug}"]`,
  ) as HTMLButtonElement | null
}
function getPanel(container: HTMLElement, childSlug: string): HTMLElement | null {
  // The disclosure panel sits at the level above the data-sidebar-grandchildren
  // <ul>; the <ul> itself carries the attribute. Walk up to find the wrapper
  // with aria-hidden on it.
  const ul = container.querySelector(`[data-sidebar-grandchildren="${childSlug}"]`)
  if (!ul) return null
  let cursor: HTMLElement | null = ul as HTMLElement
  while (cursor) {
    if (cursor.hasAttribute('aria-hidden')) return cursor
    cursor = cursor.parentElement
  }
  return null
}

describe('SidebarNav — accordion: DOM presence regardless of current page', () => {
  it('renders the disclosure for every grandchildren-bearing child, even when not current', () => {
    // On /family-law/ (Scenario 1 — AOL parent), Divorce is not the current
    // child but it has grandchildren. Phase 2.4 renders the disclosure
    // collapsed; Phase 2.3 omitted it entirely. The DOM presence is what lets
    // the operator toggle it open manually.
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    expect(getToggle(container, 'family-law/divorce')).not.toBeNull()
    expect(getPanel(container, 'family-law/divorce')).not.toBeNull()
  })

  it('does NOT render a disclosure for children with zero grandchildren', () => {
    // Adoption + DUI have no grandchildren — no toggle button, no panel.
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    expect(getToggle(container, 'family-law/adoption')).toBeNull()
    expect(getToggle(container, 'criminal-defense/dui')).toBeNull()
  })

  it('renders no disclosures in scenario 4 (no expanded AOL → no children rendered)', () => {
    mockUsePathname.mockReturnValue('/about/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    expect(container.querySelectorAll('[data-sidebar-grandchildren-toggle]')).toHaveLength(0)
  })
})

describe('SidebarNav — accordion: auto-open under current context', () => {
  it('auto-opens the matching child\'s disclosure (visitor on child page)', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    const panel = getPanel(container, 'family-law/divorce')!
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(panel.getAttribute('aria-hidden')).toBe('false')
  })

  it('auto-opens the disclosure when visitor is on a grandchild URL', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/contested/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('keeps the disclosure closed when visitor is on the AOL parent page (Scenario 1)', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    const panel = getPanel(container, 'family-law/divorce')!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(panel.getAttribute('aria-hidden')).toBe('true')
  })

  it('keeps the disclosure closed when visitor is on a different child page', () => {
    mockUsePathname.mockReturnValue('/family-law/adoption/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('SidebarNav — accordion: aria + inert semantics', () => {
  it('toggle button has aria-controls pointing at the panel id', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    const controlsId = toggle.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    expect(container.querySelector(`#${controlsId}`)).not.toBeNull()
  })

  it('panel ids are unique per child (no collisions when multiple disclosures coexist)', () => {
    // Extend the fixture so both Adoption and Divorce have grandchildren.
    const fixture: SidebarComponent = {
      ...HIERARCHY_FIXTURE,
      areasOfLaw: [
        {
          _id: 'pa-criminal',
          slug: 'criminal-defense',
          title: 'Criminal Defense',
          children: [],
        },
        {
          _id: 'pa-family',
          slug: 'family-law',
          title: 'Family Law',
          children: [
            {
              _id: 'pa-adoption',
              slug: 'family-law/adoption',
              title: 'Adoption',
              grandchildren: [{slug: 'family-law/adoption/stepchild', title: 'Stepchild Adoption'}],
            },
            {
              _id: 'pa-divorce',
              slug: 'family-law/divorce',
              title: 'Divorce',
              grandchildren: [
                {slug: 'family-law/divorce/contested', title: 'Contested Divorce'},
              ],
            },
          ],
        },
      ],
    }
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[fixture]} />)
    const adoptionToggle = getToggle(container, 'family-law/adoption')!
    const divorceToggle = getToggle(container, 'family-law/divorce')!
    expect(adoptionToggle.getAttribute('aria-controls')).not.toBe(
      divorceToggle.getAttribute('aria-controls'),
    )
  })

  it('toggle button has aria-label that mentions the child title and reflects state', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    // Closed → "Expand …"
    expect(toggle.getAttribute('aria-label')).toMatch(/expand .*divorce/i)
    fireEvent.click(toggle)
    // Open → "Collapse …"
    expect(toggle.getAttribute('aria-label')).toMatch(/collapse .*divorce/i)
  })

  it('panel inner wrapper carries `inert` when closed and drops it when open', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    const ul = container.querySelector('[data-sidebar-grandchildren="family-law/divorce"]')!
    const inner = ul.parentElement! // the .overflow-hidden wrapper with `inert`
    expect(inner.hasAttribute('inert')).toBe(true)
    fireEvent.click(toggle)
    expect(inner.hasAttribute('inert')).toBe(false)
  })

  it('grandchild links inside a CLOSED panel are filtered from the visible-links helper (test contract)', () => {
    // Establishes the test-helper invariant the Phase 2.3 scenario tests rely
    // on: a link buried inside an inert disclosure is not "visible".
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const visible = collectLinks(container).map((l) => l.label)
    const all = collectAllLinks(container).map((l) => l.label)
    expect(visible).not.toContain('Contested Divorce')
    expect(all).toContain('Contested Divorce')
  })
})

describe('SidebarNav — accordion: manual toggle', () => {
  it('clicking the toggle on a closed disclosure opens it (visible to user)', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    // Grandchildren are now visible (no longer inside an inert region).
    expect(collectLinks(container).map((l) => l.label)).toContain('Contested Divorce')
  })

  it('clicking the toggle on an auto-opened disclosure closes it', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(collectLinks(container).map((l) => l.label)).not.toContain('Contested Divorce')
  })

  it('manual toggle does NOT change the active-state contract on the parent link', () => {
    // The active class lives on the child's <a> Button — independent from
    // the toggle. Toggling open/closed shouldn't strip the active classes.
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const divorceBefore = findLinkByLabel(container, 'Divorce')!
    expect(divorceBefore.className).toContain('!font-semibold')
    const toggle = getToggle(container, 'family-law/divorce')!
    fireEvent.click(toggle)
    const divorceAfter = findLinkByLabel(container, 'Divorce')!
    expect(divorceAfter.className).toContain('!font-semibold')
    expect(divorceAfter.getAttribute('aria-current')).toBe('page')
  })
})

describe('SidebarNav — accordion: keyboard semantics', () => {
  it('toggle is a native <button> — Enter / Space resolve via the browser default', () => {
    // We don't need to fire keydown events because the native <button>
    // element converts Enter/Space → click. Asserting it's a <button> with
    // type="button" is the test contract.
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    expect(toggle.tagName).toBe('BUTTON')
    expect(toggle.getAttribute('type')).toBe('button')
  })

  it('focus-ring class is `ring-inset` (matches FaqAccordion row-UI exception)', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    expect(toggle.className).toContain('ring-inset')
    expect(toggle.className).toContain('focus-visible:ring-focus')
  })

  it('toggle morphs plus→minus when open (vertical bar scales out)', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    // The ± icon is two bars; the vertical bar (2nd) is full when collapsed and
    // scales to 0 when open — morphing + into −, no rotate-to-×.
    const verticalBar = () => toggle.querySelectorAll('span span')[1]
    expect(verticalBar()?.className).toContain('scale-y-100')
    fireEvent.click(toggle)
    expect(verticalBar()?.className).toContain('scale-y-0')
  })
})

describe('SidebarNav — accordion: pathname re-sync (open state honors context)', () => {
  it('re-opens the disclosure when the visitor navigates from AOL parent → child', () => {
    // First render at /family-law/ → Divorce closed
    mockUsePathname.mockReturnValue('/family-law/')
    const {container, rerender} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    expect(getToggle(container, 'family-law/divorce')!.getAttribute('aria-expanded')).toBe('false')

    // Navigate to /family-law/divorce/ → component re-renders with new
    // pathname → autoOpen flips to true → useEffect resyncs isOpen.
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    rerender(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    expect(getToggle(container, 'family-law/divorce')!.getAttribute('aria-expanded')).toBe('true')
  })

  it('manual toggle persists across re-renders within the same pathname', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container, rerender} = render(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    const toggle = getToggle(container, 'family-law/divorce')!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    // Re-render without changing pathname — manual toggle should stick.
    rerender(<Sidebar components={[HIERARCHY_FIXTURE]} />)
    expect(getToggle(container, 'family-law/divorce')!.getAttribute('aria-expanded')).toBe('true')
  })
})

// ─── Phase 2.5 — design-settings rendering ────────────────────────────────────
//
// SidebarDesignSettingsProvider drives `sidebarNavIconStyle`,
// `sidebarWidgetHeaderLine`, and `sidebarItemSeparators` from the context
// established in `app/(site)/layout.tsx`. These tests assert the rendered
// classNames + DOM shape per setting against the existing hierarchy fixture.
//
// Accordion plus icon (Phase 2.4) stays fixed regardless of
// `sidebarNavIconStyle` — covered by the dedicated test below.

describe('SidebarNav — sidebarNavIconStyle (arrows)', () => {
  it('renders the `→` arrow glyph on hierarchy nav rows', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarNavIconStyle: 'arrows',
    })
    // A standard nav row (bottom-list AOL) should contain the arrow character.
    // (The expanded AOL header intentionally uses no leading icon — it carries
    // the accordion chevron toggle instead.)
    const navLink = findLinkByLabel(container, 'Criminal Defense')!
    expect(navLink.textContent).toContain('→')
    // No hover-bg shift on the link itself.
    expect(navLink.className).not.toContain('hover:bg-foreground/5')
  })

  it('does not render a chevron SVG inside the link', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarNavIconStyle: 'arrows',
    })
    const navLink = findLinkByLabel(container, 'Criminal Defense')!
    expect(navLink.querySelector('svg')).toBeNull()
  })
})

describe('SidebarNav — sidebarNavIconStyle (chevrons, default)', () => {
  it('renders the chevron SVG (not the `→` character)', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarNavIconStyle: 'chevrons',
    })
    const navLink = findLinkByLabel(container, 'Criminal Defense')!
    expect(navLink.textContent).not.toContain('→')
    expect(navLink.querySelector('svg')).not.toBeNull()
  })

  it('preserves hover-nudge transform class on the chevron wrapper', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarNavIconStyle: 'chevrons',
    })
    const navLink = findLinkByLabel(container, 'Criminal Defense')!
    const svgWrapper = navLink.querySelector('span[aria-hidden]')!
    expect(svgWrapper.className).toContain('group-hover:translate-x-')
  })
})

describe('SidebarNav — sidebarNavIconStyle (none)', () => {
  it('renders no leading glyph (no `→`, no SVG)', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarNavIconStyle: 'none',
    })
    const familyLink = findLinkByLabel(container, 'Family Law')!
    expect(familyLink.textContent).not.toContain('→')
    expect(familyLink.querySelector('svg')).toBeNull()
  })

  it('swaps hover affordance to background-color shift via hover:bg-foreground/5', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarNavIconStyle: 'none',
    })
    const familyLink = findLinkByLabel(container, 'Family Law')!
    expect(familyLink.className).toContain('hover:bg-foreground/5')
    expect(familyLink.className).toContain('rounded')
    // Existing tertiary transition-colors covers bg-color → uses site-level
    // button animation speed (duration-ui-fast).
    expect(familyLink.className).toContain('transition-colors')
    expect(familyLink.className).toContain('duration-ui-fast')
  })

  it('applies the bg-hover override to every nav row, not just the AOL parent', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarNavIconStyle: 'none',
    })
    const labels = ['Family Law', 'Adoption', 'Divorce', 'Criminal Defense', 'Estate Planning']
    for (const label of labels) {
      const link = findLinkByLabel(container, label)
      expect(link?.className, `${label} link should carry hover-bg class`).toContain(
        'hover:bg-foreground/5',
      )
    }
  })

  it('uses only cascade-aware tokens for the hover-bg (no on-light/on-dark anchors, no hex)', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarNavIconStyle: 'none',
    })
    const familyLink = findLinkByLabel(container, 'Family Law')!
    const cls = familyLink.className
    expect(cls).not.toMatch(/\bhover:bg-foreground-on-light\b/)
    expect(cls).not.toMatch(/\bhover:bg-foreground-on-dark\b/)
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})

describe('SidebarNav — accordion ± toggle is unaffected by sidebarNavIconStyle', () => {
  it.each(['arrows', 'chevrons', 'none'] as const)(
    'iconStyle=%s — toggle renders the two-bar ± icon (no chevron/arrow glyph)',
    (iconStyle) => {
      mockUsePathname.mockReturnValue('/family-law/')
      const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
        sidebarNavIconStyle: iconStyle,
      })
      const toggle = getToggle(container, 'family-law/divorce')!
      // Two bars (horizontal always, vertical scales out on open) — no SVG glyph.
      const bars = toggle.querySelectorAll('span span')
      expect(bars.length).toBe(2)
      expect(toggle.querySelector('svg')).toBeNull()
    },
  )
})

describe('SidebarNav — sidebarWidgetHeaderLine', () => {
  it('default (true) renders border-b on the SidebarPanel title', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE])
    const title = container.querySelector('p[data-sidebar-header-line]')
    expect(title?.getAttribute('data-sidebar-header-line')).toBe('true')
    expect(title?.className).toContain('border-b')
  })

  it('false → no border-b on the title; data-sidebar-header-line="false"', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarWidgetHeaderLine: false,
    })
    const title = container.querySelector('p[data-sidebar-header-line]')
    expect(title?.getAttribute('data-sidebar-header-line')).toBe('false')
    expect(title?.className).not.toMatch(/\bborder-b\b/)
  })

  it('propagates to non-hierarchy modes (custom nav) too', () => {
    mockUsePathname.mockReturnValue('/about/')
    const fixture: SidebarComponent = {
      _componentType: 'sidebarNav',
      header: 'Related',
      mode: 'custom',
      links: [{_id: 'a', _type: 'page', title: 'About', slug: 'about'}],
    }
    const {container} = renderWithSettings([fixture], {sidebarWidgetHeaderLine: false})
    const title = container.querySelector('p[data-sidebar-header-line]')
    expect(title?.getAttribute('data-sidebar-header-line')).toBe('false')
  })
})

describe('SidebarNav — sidebarItemSeparators (hierarchy mode)', () => {
  it('default (true) applies border-b on non-last siblings in the bottom AOL list', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE])
    // Bottom list = Criminal Defense (not last), Estate Planning (last).
    const criminalLink = findLinkByLabel(container, 'Criminal Defense')!
    const estateLink = findLinkByLabel(container, 'Estate Planning')!
    expect(criminalLink.parentElement?.className).toContain('border-b')
    expect(estateLink.parentElement?.className).not.toMatch(/\bborder-b\b/)
  })

  it('false → no border-b on any sibling at any level', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE], {
      sidebarItemSeparators: false,
    })
    const lis = container.querySelectorAll('nav li')
    lis.forEach((li) => expect(li.className).not.toMatch(/\bborder-b\b/))
  })

  it('AOL parent (Family Law) never gets border-b (section heading, not a sibling)', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE])
    const familyLink = findLinkByLabel(container, 'Family Law')!
    expect(familyLink.parentElement?.className).not.toMatch(/\bborder-b\b/)
  })

  it('expanded AOL children are indented (no rail) and grouped with NO internal separators', () => {
    // Premium model: the area of law is an accordion (plus toggle); its child
    // pages are nested via indentation only (no vertical rail line) and grouped
    // as a unit — no separators between them. Separators live only at the
    // area-of-law (parent) level.
    const edwardsFixture: SidebarComponent = {
      _componentType: 'sidebarNav',
      header: 'Practice Areas',
      mode: 'practiceArea',
      orderedAolIds: ['pa-family'],
      areasOfLaw: [
        {
          _id: 'pa-family',
          slug: 'family-law',
          title: 'Family Law',
          children: [
            {_id: 'pa-adoption', slug: 'family-law/adoption', title: 'Adoption', grandchildren: []},
            {
              _id: 'pa-divorce',
              slug: 'family-law/divorce',
              title: 'Divorce',
              grandchildren: [
                {slug: 'family-law/divorce/contested', title: 'Contested Divorce'},
                {slug: 'family-law/divorce/uncontested', title: 'Uncontested Divorce'},
              ],
            },
            {_id: 'pa-custody', slug: 'family-law/custody', title: 'Custody', grandchildren: []},
          ],
        },
      ],
    }
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = renderWithSettings([edwardsFixture])
    const adoptionLi = findLinkByLabel(container, 'Adoption')?.parentElement
    // Divorce has the split-button wrapper (flex div) — climb two levels.
    const divorceLi = findLinkByLabel(container, 'Divorce')?.parentElement?.parentElement
    const custodyLi = findLinkByLabel(container, 'Custody')?.parentElement
    // Grouped — no separators between children at any position.
    expect(adoptionLi?.className).not.toMatch(/\bborder-b\b/)
    expect(divorceLi?.className).not.toMatch(/\bborder-b\b/)
    expect(custodyLi?.className).not.toMatch(/\bborder-b\b/)
    // Children are indented (pl-*) with NO vertical rail line (no border-l).
    const childUl = findLinkByLabel(container, 'Adoption')?.closest('ul')
    expect(childUl?.className).toMatch(/\bpl-\d/)
    expect(childUl?.className).not.toMatch(/\bborder-l\b/)
    // The area of law exposes a plus-icon accordion toggle.
    expect(container.querySelector('[data-sidebar-aol-toggle="family-law"]')).toBeTruthy()
  })

  it('grandchildren are grouped with NO internal separators', () => {
    mockUsePathname.mockReturnValue('/family-law/divorce/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE])
    const contestedLi = findLinkByLabel(container, 'Contested Divorce')?.parentElement
    const uncontestedLi = findLinkByLabel(container, 'Uncontested Divorce')?.parentElement
    expect(contestedLi?.className).not.toMatch(/\bborder-b\b/)
    expect(uncontestedLi?.className).not.toMatch(/\bborder-b\b/)
  })

  it('the expanded AOL block carries a trailing separator dividing it from the AOLs below', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE])
    // The expanded-AOL block <ul> (closest ul to the Family Law row) gets
    // border-b when other AOLs follow.
    const expandedUl = findLinkByLabel(container, 'Family Law')?.closest('ul')
    expect(expandedUl?.tagName).toBe('UL')
    expect(expandedUl?.className).toMatch(/\bborder-b\b/)
  })

  it('uses only cascade-aware tokens for separator lines', () => {
    mockUsePathname.mockReturnValue('/family-law/')
    const {container} = renderWithSettings([HIERARCHY_FIXTURE])
    // Area-of-law level separator (bottom list, non-last item).
    const criminalLi = findLinkByLabel(container, 'Criminal Defense')?.parentElement
    const cls = criminalLi?.className ?? ''
    expect(cls).toContain('border-foreground/10')
    expect(cls).not.toMatch(/\bborder-on-dark\b/)
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})

describe('SidebarNav — sidebarItemSeparators (custom nav mode)', () => {
  it('applies border-b to non-last custom links', () => {
    mockUsePathname.mockReturnValue('/')
    const fixture: SidebarComponent = {
      _componentType: 'sidebarNav',
      header: 'Related',
      mode: 'custom',
      links: [
        {_id: 'a', _type: 'page', title: 'About', slug: 'about'},
        {_id: 'b', _type: 'page', title: 'Contact', slug: 'contact'},
        {_id: 'c', _type: 'page', title: 'Careers', slug: 'careers'},
      ],
    }
    const {container} = renderWithSettings([fixture])
    const lis = container.querySelectorAll('nav li')
    expect(lis).toHaveLength(3)
    expect(lis[0].className).toContain('border-b')
    expect(lis[1].className).toContain('border-b')
    expect(lis[2].className).not.toMatch(/\bborder-b\b/)
  })

  it('false → no border-b on any custom-mode list item', () => {
    mockUsePathname.mockReturnValue('/')
    const fixture: SidebarComponent = {
      _componentType: 'sidebarNav',
      header: 'Related',
      mode: 'custom',
      links: [
        {_id: 'a', _type: 'page', title: 'About', slug: 'about'},
        {_id: 'b', _type: 'page', title: 'Contact', slug: 'contact'},
      ],
    }
    const {container} = renderWithSettings([fixture], {sidebarItemSeparators: false})
    const lis = container.querySelectorAll('nav li')
    lis.forEach((li) => expect(li.className).not.toMatch(/\bborder-b\b/))
  })
})

describe('SidebarAttorneyList — design settings propagation', () => {
  const ATTORNEY_FIXTURE: SidebarComponent = {
    _componentType: 'sidebarAttorneyList',
    header: 'Our Team',
    mode: 'manual',
    layout: 'list',
    attorneys: [
      {_id: 'a1', title: 'Jane Doe', slug: 'jane-doe'},
      {_id: 'a2', title: 'John Roe', slug: 'john-roe'},
      {_id: 'a3', title: 'Maya Chen', slug: 'maya-chen'},
    ],
  }

  it('respects sidebarNavIconStyle="none" on text-layout rows', () => {
    mockUsePathname.mockReturnValue('/')
    const {container} = renderWithSettings([ATTORNEY_FIXTURE], {
      sidebarNavIconStyle: 'none',
    })
    const jane = findLinkByLabel(container, 'Jane Doe')!
    expect(jane.textContent).not.toContain('→')
    expect(jane.className).toContain('hover:bg-foreground/5')
  })

  it('respects sidebarNavIconStyle="chevrons" on text-layout rows', () => {
    mockUsePathname.mockReturnValue('/')
    const {container} = renderWithSettings([ATTORNEY_FIXTURE], {
      sidebarNavIconStyle: 'chevrons',
    })
    const jane = findLinkByLabel(container, 'Jane Doe')!
    expect(jane.querySelector('svg')).not.toBeNull()
    expect(jane.textContent).not.toContain('→')
  })

  it('respects sidebarItemSeparators on attorney list rows', () => {
    mockUsePathname.mockReturnValue('/')
    const {container} = renderWithSettings([ATTORNEY_FIXTURE], {
      sidebarItemSeparators: true,
    })
    const lis = container.querySelectorAll('ul li')
    expect(lis).toHaveLength(3)
    expect(lis[0].className).toContain('border-b')
    expect(lis[1].className).toContain('border-b')
    expect(lis[2].className).not.toMatch(/\bborder-b\b/)
  })

  it('respects sidebarWidgetHeaderLine on the panel title', () => {
    mockUsePathname.mockReturnValue('/')
    const {container} = renderWithSettings([ATTORNEY_FIXTURE], {
      sidebarWidgetHeaderLine: false,
    })
    const title = container.querySelector('p[data-sidebar-header-line]')
    expect(title?.getAttribute('data-sidebar-header-line')).toBe('false')
  })
})

describe('Sidebar — defaults when rendered without provider', () => {
  // Confirms the context-default contract: a Sidebar rendered without a
  // SidebarDesignSettingsProvider (e.g., the existing DesignStudio 4-variant
  // stubs that predate Phase 2.5) falls back to the doctrine defaults from
  // BI-Sidebar.md §4–5: chevrons + headerLine on + separators on.
  it('default render uses chevrons + headerLine + separators', () => {
    mockUsePathname.mockReturnValue('/about/')
    const fixture: SidebarComponent = {
      _componentType: 'sidebarNav',
      header: 'Related',
      mode: 'custom',
      links: [
        {_id: 'a', _type: 'page', title: 'About', slug: 'about'},
        {_id: 'b', _type: 'page', title: 'Contact', slug: 'contact'},
      ],
    }
    const {container} = render(<Sidebar components={[fixture]} />)
    const title = container.querySelector('p[data-sidebar-header-line]')
    expect(title?.getAttribute('data-sidebar-header-line')).toBe('true')
    const lis = container.querySelectorAll('nav li')
    expect(lis[0].className).toContain('border-b')
    // Chevron SVG present (chevrons is default).
    expect(container.querySelector('nav a svg')).not.toBeNull()
  })
})

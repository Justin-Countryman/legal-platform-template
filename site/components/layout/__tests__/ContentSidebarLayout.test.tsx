import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {ContentSidebarLayout} from '../ContentSidebarLayout'

// ContentSidebarLayout is a pure layout primitive — no cascade-aware color
// tokens of its own (color comes from whatever surface its children render
// against). Cascade contract sweep is intentionally omitted from this file.

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('ContentSidebarLayout — render shape', () => {
  it('outer wrapper is a <div> with the canonical body band classes', () => {
    const {container} = render(
      <ContentSidebarLayout>
        <p>body</p>
      </ContentSidebarLayout>,
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.tagName).toBe('DIV')
    expect(outer.className).toContain('px-[5%]')
    expect(outer.className).toContain('py-12')
    expect(outer.className).toContain('md:py-16')
    expect(outer.className).toContain('lg:py-20')
  })

  it('inner wrapper is a <div class="container">', () => {
    const {container} = render(
      <ContentSidebarLayout>
        <p>body</p>
      </ContentSidebarLayout>,
    )
    const inner = container.querySelector('div > div.container')
    expect(inner).not.toBeNull()
  })

  it('renders children inside the BodyEl', () => {
    const {container} = render(
      <ContentSidebarLayout>
        <p data-testid="child">body content</p>
      </ContentSidebarLayout>,
    )
    const body = container.querySelector('main')
    expect(body?.querySelector('[data-testid="child"]')?.textContent).toBe('body content')
  })
})

// ─── `as` prop polymorphism (the new anchor pattern) ──────────────────────────
//
// Locked pattern for polymorphic-tag primitives: the `as` prop selects the
// HTML tag rendered for the body element. Use an enum loop (same shape as
// Chip's icon-registry loop) over the supported tag values, asserting tag
// dispatch + child-rendering invariant per tag.

describe('ContentSidebarLayout — as prop polymorphism', () => {
  it('defaults to <main> when as is not provided', () => {
    const {container} = render(
      <ContentSidebarLayout>
        <p>body</p>
      </ContentSidebarLayout>,
    )
    expect(container.querySelector('main')).not.toBeNull()
    expect(container.querySelector('article')).toBeNull()
  })

  for (const tag of ['main', 'article'] as const) {
    it(`renders <${tag}> as the body element when as="${tag}"`, () => {
      const {container} = render(
        <ContentSidebarLayout as={tag}>
          <p data-testid="child">body</p>
        </ContentSidebarLayout>,
      )
      const body = container.querySelector(tag)
      expect(body).not.toBeNull()
      expect(body?.querySelector('[data-testid="child"]')).not.toBeNull()
    })
  }

  it('honors as="article" inside the sidebar grid path', () => {
    const {container} = render(
      <ContentSidebarLayout as="article" sidebar={<nav data-testid="rail">rail</nav>}>
        <p data-testid="post">post body</p>
      </ContentSidebarLayout>,
    )
    const article = container.querySelector('article')
    expect(article?.querySelector('[data-testid="post"]')).not.toBeNull()
    // Grid wrapper still renders alongside.
    expect(container.querySelector('.grid')).not.toBeNull()
  })
})

// ─── Conditional sidebar dispatch ─────────────────────────────────────────────

describe('ContentSidebarLayout — conditional sidebar', () => {
  it('omits the grid wrapper and <aside> when no sidebar is provided', () => {
    const {container} = render(
      <ContentSidebarLayout>
        <p>body</p>
      </ContentSidebarLayout>,
    )
    expect(container.querySelector('aside')).toBeNull()
    expect(container.querySelector('.grid')).toBeNull()
  })

  it('wraps body + sidebar in a 1fr+320px grid when sidebar is provided', () => {
    const {container} = render(
      <ContentSidebarLayout sidebar={<nav>rail</nav>}>
        <p>body</p>
      </ContentSidebarLayout>,
    )
    const grid = container.querySelector('.grid') as HTMLElement
    expect(grid).not.toBeNull()
    expect(grid.className).toContain('lg:grid-cols-[1fr_320px]')
  })

  it('renders the sidebar inside an <aside aria-label="Sidebar"> for AT discovery', () => {
    const {container} = render(
      <ContentSidebarLayout sidebar={<nav data-testid="rail">rail</nav>}>
        <p>body</p>
      </ContentSidebarLayout>,
    )
    const aside = container.querySelector('aside') as HTMLElement
    expect(aside).not.toBeNull()
    expect(aside.getAttribute('aria-label')).toBe('Sidebar')
    expect(aside.querySelector('[data-testid="rail"]')).not.toBeNull()
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('ContentSidebarLayout — className composition', () => {
  it('appends custom className to the outer wrapper after the band classes', () => {
    const {container} = render(
      <ContentSidebarLayout className="my-custom">
        <p>body</p>
      </ContentSidebarLayout>,
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('my-custom')
    expect(outer.className).toContain('px-[5%]')  // band still present
    // Custom className appears after the band classes (concatenation order).
    expect(outer.className.indexOf('my-custom')).toBeGreaterThan(
      outer.className.indexOf('px-[5%]'),
    )
  })
})

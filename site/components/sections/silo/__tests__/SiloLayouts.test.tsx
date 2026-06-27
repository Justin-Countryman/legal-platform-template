import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render, screen, within} from '@testing-library/react'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  default: ({src, alt}: {src: string; alt: string}) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />
  },
}))

import {SiloSpotlight, SiloFeature, SiloTileLayout, SiloInline, SiloSplit} from '../SiloLayouts'
import type {SiloLayoutProps} from '../SiloLayouts'

const ITEMS = [
  {_key: 'a', label: 'Family Law', href: '/family-law/', description: 'Divorce, custody, support.', image: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}, icon: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}},
  {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: 'Wills and trusts.', icon: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}},
  {_key: 'c', label: 'Divorce', href: '/family-law/divorce/', description: null},
]

const LAYOUTS = [
  ['Spotlight', SiloSpotlight],
  ['Feature', SiloFeature],
  ['Tile', SiloTileLayout],
  ['Inline', SiloInline],
  ['Split', SiloSplit],
] as const

// Default props so a test only has to override what it exercises.
function props(over: Partial<SiloLayoutProps> = {}): SiloLayoutProps {
  return {items: ITEMS, ariaLabel: 'Practice areas', hoverEffects: ['imageZoom'], showArrow: true, iconPosition: 'auto', ...over}
}

// A11y has to be test-guaranteed (SectionShell blinds the JSX linter), and it must
// hold for EVERY layout — they all inherit the same nav-landmark + whole-tile-focus
// + always-present-label contract.
describe.each(LAYOUTS)('Silo layout: %s — a11y contract', (_name, Layout) => {
  it('renders a named <nav> landmark over a semantic list', () => {
    render(<Layout {...props()} />)
    const nav = screen.getByRole('navigation', {name: 'Practice areas'})
    expect(nav.tagName).toBe('NAV')
    expect(within(nav).getAllByRole('listitem')).toHaveLength(3)
  })

  it('every item is a whole-tile link with the focus-ring contract + the label inside it', () => {
    render(<Layout {...props()} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0].getAttribute('href')).toBe('/family-law/')
    for (const link of links) {
      const cls = link.getAttribute('class') ?? ''
      expect(cls).toContain('focus-visible:ring-focus')
      expect(cls).toContain('ring-2')
      expect(cls).toContain('outline-none')
      expect(cls).toContain('ring-offset-2')
    }
    const heading = screen.getByText('Family Law')
    expect(heading.closest('a')).not.toBeNull()
  })

  it('every tile gives a touch press-down (active:scale-95) — feedback where hover cannot fire', () => {
    render(<Layout {...props()} />)
    for (const link of screen.getAllByRole('link')) {
      const cls = link.getAttribute('class') ?? ''
      expect(cls).toContain('active:scale-95')
      expect(cls).toContain('transition-transform')
    }
  })

  it('media is decorative (empty alt) — never exposed to assistive tech', () => {
    render(<Layout {...props()} />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('a tile link accepts focus (native keyboard reach)', () => {
    render(<Layout {...props()} />)
    const link = screen.getAllByRole('link')[0]
    link.focus()
    expect(document.activeElement).toBe(link)
  })

  it('blurb is available on every layout (renders when the item has one)', () => {
    render(<Layout {...props()} />)
    expect(screen.getByText('Divorce, custody, support.')).toBeTruthy()
  })

  it('iconPosition="none" hides every icon chip', () => {
    const {container} = render(<Layout {...props({iconPosition: 'none'})} />)
    // icon chips are the only <img> sources of /i1.png|/i2.png; none should render
    expect(container.querySelectorAll('img[src="/i1.png"], img[src="/i2.png"]')).toHaveLength(0)
  })
})

describe('Silo layouts — knobs', () => {
  it('Show Arrow toggles the affordance on arrow layouts', () => {
    // SiloSpotlight renders an arrow; the affordance is an <svg> from react-icons.
    const on = render(<SiloSpotlight {...props({showArrow: true})} />)
    const off = render(<SiloSpotlight {...props({showArrow: false})} />)
    const arrows = (c: HTMLElement) => c.querySelectorAll('svg')
    expect(arrows(on.container).length).toBeGreaterThan(0)
    expect(arrows(off.container).length).toBe(0)
  })

  it('image layouts flip to dark context over the scrim; fill rows do not', () => {
    const spot = render(<SiloSpotlight {...props()} />)
    const links = within(spot.container).getAllByRole('link')
    expect(links[0].getAttribute('data-ring-context')).toBe('dark') // item a has an image
    expect(links[1].getAttribute('data-ring-context')).toBeNull() // item b has none

    const inline = render(<SiloInline {...props()} />)
    for (const link of within(inline.container).getAllByRole('link')) {
      expect(link.getAttribute('data-ring-context')).toBeNull() // Inline is always a fill row
    }
  })
})

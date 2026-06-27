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
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt}: {src: string; alt: string}) => <img src={src} alt={alt} />,
}))

import {SiloCarousel} from '../SiloCarousel'

const ITEMS = [
  {_key: 'a', label: 'Family Law', href: '/family-law/', image: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}, icon: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}},
  {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: 'Wills and trusts.'},
  {_key: 'c', label: 'Real Estate', href: '/real-estate/'},
]

function renderCarousel(over = {}) {
  return render(
    <SiloCarousel items={ITEMS} ariaLabel="Practice areas" hoverEffects={['imageZoom']} showArrow {...over} />,
  )
}

describe('SiloCarousel — mobile swipe carousel a11y + structure', () => {
  it('is a named nav landmark over a scroll-snap list', () => {
    renderCarousel()
    const nav = screen.getByRole('navigation', {name: 'Practice areas'})
    expect(nav.tagName).toBe('NAV')
    const ul = within(nav).getByRole('list')
    expect(ul.className).toContain('snap-x')
    expect(ul.className).toContain('overflow-x-auto')
    // Alignment fix: scroll-padding matches the gutter padding so snap-mandatory
    // lands the first card on the section content edge (not `p` closer to it).
    expect(ul.className).toContain('scroll-pl-4')
    expect(ul.className).toContain('p-4')
  })

  it('each item is a slide (role=group, "N of M") wrapping a whole-tile link', () => {
    renderCarousel()
    const slides = screen.getAllByRole('group', {name: /of 3$/})
    expect(slides).toHaveLength(3)
    expect(slides[0].getAttribute('aria-label')).toBe('1 of 3')
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0].getAttribute('href')).toBe('/family-law/')
    expect(within(links[0]).getByText('Family Law')).toBeTruthy()
  })

  it('tiles carry the touch press-down + focus-ring contract', () => {
    renderCarousel()
    for (const link of screen.getAllByRole('link')) {
      const cls = link.getAttribute('class') ?? ''
      expect(cls).toContain('active:scale-95')
      expect(cls).toContain('focus-visible:ring-focus')
    }
  })

  it('renders pagination dots with the first active (aria-current)', () => {
    renderCarousel()
    const dots = screen.getAllByRole('button', {name: /^Go to /})
    expect(dots).toHaveLength(3)
    expect(dots[0].getAttribute('aria-current')).toBe('true')
    expect(dots[1].getAttribute('aria-current')).toBeNull()
    // Dot label is descriptive (uses the practice-area name, not just an index).
    expect(dots[0].getAttribute('aria-label')).toContain('Family Law')
  })

  it('decorative media is never exposed to assistive tech (empty alt)', () => {
    renderCarousel()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('omits dots when there is a single item', () => {
    renderCarousel({items: [ITEMS[0]]})
    expect(screen.queryAllByRole('button', {name: /^Go to /})).toHaveLength(0)
  })
})

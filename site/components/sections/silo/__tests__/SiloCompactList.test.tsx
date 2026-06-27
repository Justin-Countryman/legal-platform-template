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

import {SiloCompactList} from '../SiloCompactList'

const ITEMS = [
  {_key: 'a', label: 'Family Law', href: '/family-law/', image: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}, icon: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}},
  {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: 'Wills and trusts.'},
  {_key: 'c', label: 'Real Estate', href: '/real-estate/'},
]

function renderList(over = {}) {
  return render(
    <SiloCompactList items={ITEMS} ariaLabel="Practice areas" hoverEffects={['glow']} showArrow {...over} />,
  )
}

describe('SiloCompactList — image-free compact rows', () => {
  it('is a named nav over a list, one whole-row link per item with its label', () => {
    renderList()
    const nav = screen.getByRole('navigation', {name: 'Practice areas'})
    expect(within(nav).getAllByRole('listitem')).toHaveLength(3)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0].getAttribute('href')).toBe('/family-law/')
    expect(within(links[0]).getByText('Family Law')).toBeTruthy()
  })

  it('renders NO photos (the lightweight / no-image option) even when items have images', () => {
    renderList()
    // The bg-photo TileImage isn't used here; only the small icon chips would be —
    // and all silo media is decorative (empty alt), so nothing is exposed as an image.
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    // No full-bleed photo element either.
    expect(document.querySelector('[class*="object-cover"]')).toBeNull()
  })

  it('rows use a background-wash press (not a scale that would gap the row)', () => {
    renderList()
    for (const link of screen.getAllByRole('link')) {
      const cls = link.getAttribute('class') ?? ''
      expect(cls).toContain('active:bg-foreground/[0.06]')
      expect(cls).not.toContain('active:scale-95')
      expect(cls).toContain('focus-visible:ring-focus')
    }
  })
})

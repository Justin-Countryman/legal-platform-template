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

import {SiloBento} from '../SiloBento'
import {bentoLayout, isBentoMode, mosaicCellSpan} from '../bento'
import type {SiloNavItem, SiloGridMode} from '../types'
import type {SiloHoverEffect} from '@/lib/siloHover'

const ITEMS: SiloNavItem[] = [
  {_key: 'a', label: 'Family Law', href: '/family-law/', description: 'Divorce and custody.', image: {src: '/fam.jpg'}},
  {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: 'Wills and trusts.', featured: true},
  {_key: 'c', label: 'Real Estate', href: '/real-estate/', description: null},
  {_key: 'd', label: 'Divorce', href: '/family-law/divorce/', description: null},
]

function props(over: Partial<Parameters<typeof SiloBento>[0]> = {}) {
  const base = {
    items: ITEMS,
    ariaLabel: 'Practice areas',
    hoverEffects: ['imageZoom'] as SiloHoverEffect[],
    showArrow: true,
    iconPosition: 'auto' as const,
    gridMode: 'bentoLeft' as SiloGridMode,
  }
  return {...base, ...over}
}

describe('bentoLayout — hero selection + spans', () => {
  it('the hero is the first Primary item, else the first item', () => {
    expect(bentoLayout(ITEMS, 'bentoLeft').hero?._key).toBe('b') // b is featured
    const none = ITEMS.map((i) => ({...i, featured: false}))
    expect(bentoLayout(none, 'bentoLeft').hero?._key).toBe('a') // falls back to first
  })

  it('the hero is pulled out of the remainder (rendered once)', () => {
    const {hero, rest} = bentoLayout(ITEMS, 'bentoLeft')
    expect(rest.find((i) => i._key === hero?._key)).toBeUndefined()
    expect(rest).toHaveLength(ITEMS.length - 1)
  })

  it('the grid modes share the 2×2 hero block (hero always leads top-left)', () => {
    for (const mode of ['bentoLeft', 'bentoMosaic'] as const) {
      expect(bentoLayout(ITEMS, mode).heroSpan).toContain('row-span-2')
    }
  })

  it('Mosaic varies the remaining tiles (tall neighbour, periodic wide)', () => {
    expect(mosaicCellSpan(0)).toContain('row-span-2') // sits tall beside the hero
    expect(mosaicCellSpan(2)).toContain('col-span-2') // periodic wide accent
    expect(mosaicCellSpan(1)).toBe('')
  })

  it('isBentoMode recognises only the bento presets', () => {
    expect(isBentoMode('bentoLeft')).toBe(true)
    expect(isBentoMode('bentoMosaic')).toBe(true)
    expect(isBentoMode('bentoList')).toBe(true)
    expect(isBentoMode('equal')).toBe(false)
    expect(isBentoMode(null)).toBe(false)
  })
})

describe('SiloBento — a11y + structure', () => {
  it('is a named nav landmark over a list, hero first', () => {
    render(<SiloBento {...props()} />)
    const nav = screen.getByRole('navigation', {name: 'Practice areas'})
    const items = within(nav).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    // hero (the featured Estate Planning) leads the DOM/reading order
    expect(within(items[0]).getByText('Estate Planning')).toBeTruthy()
  })

  it('every tile is a whole-tile link with the focus-ring contract', () => {
    render(<SiloBento {...props()} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    for (const link of links) {
      expect(link.getAttribute('class') ?? '').toContain('focus-visible:ring-focus')
    }
  })

  it('media is decorative — never exposed to assistive tech', () => {
    render(<SiloBento {...props()} />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('the hero cell carries the 2×2 span; Mosaic varies a later tile', () => {
    const {container} = render(<SiloBento {...props({gridMode: 'bentoMosaic'})} />)
    const lis = container.querySelectorAll(':scope > nav > ul > li')
    expect(lis[0].className).toContain('row-span-2') // hero 2×2
    // the first non-hero tile sits tall beside the hero
    expect(lis[1].className).toContain('@sm:row-span-2')
  })

  it('Feature & List pairs a hero with a scannable list — every item still a link', () => {
    render(<SiloBento {...props({gridMode: 'bentoList'})} />)
    const nav = screen.getByRole('navigation', {name: 'Practice areas'})
    // every practice area is reachable as a link, hero first
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(ITEMS.length)
    expect(within(links[0]).getByText('Estate Planning')).toBeTruthy() // featured hero leads
    // the rest render as the directory list (3 remaining)
    expect(within(nav).getByText('Family Law')).toBeTruthy()
  })
})

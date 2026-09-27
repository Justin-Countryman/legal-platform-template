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

import {PracticeAreaNavBlock, photosAllOrNone, type PracticeAreaNavBlockData} from '../PracticeAreaNavBlock'

const ITEMS = [
  {_key: 'a', label: 'Family Law', href: '/family-law/', description: 'Divorce and custody.'},
  {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: 'Wills and trusts.'},
]

function data(over: Partial<PracticeAreaNavBlockData> = {}): PracticeAreaNavBlockData {
  return {
    tagline: 'Practice areas',
    heading: 'How we can help',
    description: 'Counsel across the matters that matter most.',
    layout: 'feature',
    items: ITEMS,
    ...over,
  }
}

const LAYOUTS = ['centered', 'left', 'aside', 'banner'] as const

describe('PracticeAreaNavBlock — section layouts', () => {
  it.each(LAYOUTS)('renders the %s arrangement with the nav landmark + header intact', (sectionLayout) => {
    const {container} = render(<PracticeAreaNavBlock data={data({sectionLayout})} />)
    // the section-layout frame is tagged for the chosen arrangement
    expect(container.querySelector(`[data-section-layout="${sectionLayout}"]`)).not.toBeNull()
    // header survives every arrangement
    expect(screen.getByRole('heading', {name: 'How we can help'})).toBeTruthy()
    // Two named silo-nav renderings — the mobile carousel + the desktop grid — one
    // shown per breakpoint via CSS (md:hidden / hidden md:block). jsdom can't apply
    // the CSS, so both are present here; in a browser only one is in the a11y tree.
    expect(screen.getAllByRole('navigation', {name: 'How we can help'})).toHaveLength(2)
    // the desktop grid (the @container nav) lists every item
    const gridNav = container.querySelector('nav.\\@container') as HTMLElement
    expect(within(gridNav).getAllByRole('listitem')).toHaveLength(2)
  })

  it('defaults to centered when no section layout is set', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({sectionLayout: null})} />)
    expect(container.querySelector('[data-section-layout="centered"]')).not.toBeNull()
  })

  it('aside builds the two-column (sticky header) structure', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({sectionLayout: 'aside'})} />)
    const frame = container.querySelector('[data-section-layout="aside"]')
    // Side by side from `xl` (Phase 17C session 3, `[R-549]`): under it the aside stacks as on a phone.
    expect(frame?.className).toContain('xl:grid-cols-[18rem_1fr]')
    expect(frame?.querySelector('.xl\\:sticky')).not.toBeNull()
  })

  it('the grid is a container-query context so it adapts to its column', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({sectionLayout: 'aside'})} />)
    // SiloNav wraps the list in an @container; the grid uses container-query columns
    const nav = container.querySelector('nav.\\@container')
    expect(nav).not.toBeNull()
    expect(nav?.querySelector('ul')?.className).toContain('@4xl:grid-cols-3')
  })

  it('renders nothing when there are no linkable items', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({items: []})} />)
    expect(container.firstChild).toBeNull()
  })

  it('Bento grid mode overrides the button layout and leads with the Primary item', () => {
    const items = [
      {_key: 'a', label: 'Family Law', href: '/family-law/', description: null},
      {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: null, featured: true},
    ]
    const {container} = render(<PracticeAreaNavBlock data={data({gridMode: 'bentoLeft', layout: 'inline', items})} />)
    // the desktop bento (the @container nav) reorders; the mobile carousel keeps
    // source order, so assert against the bento grid specifically.
    const gridNav = container.querySelector('nav.\\@container') as HTMLElement
    const lis = within(gridNav).getAllByRole('listitem')
    // hero (featured) first, regardless of source order
    expect(within(lis[0]).getByText('Estate Planning')).toBeTruthy()
  })
})

describe('PracticeAreaNavBlock — mobile display axis', () => {
  it('carousel (default): a mobile swipe carousel + the desktop grid (two renderings)', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({mobileDisplay: 'carousel'})} />)
    expect(screen.getAllByRole('navigation', {name: 'How we can help'})).toHaveLength(2)
    // the mobile rendering is a scroll-snap carousel
    expect(container.querySelector('ul.snap-mandatory')).not.toBeNull()
    // the desktop grid is hidden on mobile
    expect(container.querySelector('.hidden.md\\:block')).not.toBeNull()
  })

  it('stacked: a SINGLE grid rendering shown at all widths (no mobile-only sibling, no carousel)', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({mobileDisplay: 'stacked'})} />)
    expect(screen.getAllByRole('navigation', {name: 'How we can help'})).toHaveLength(1)
    expect(container.querySelector('ul.snap-mandatory')).toBeNull()
    // grid is not wrapped in a hidden-on-mobile container
    expect(container.querySelector('.hidden.md\\:block')).toBeNull()
  })

  it('list: a mobile compact list (icon+label rows, no photos) + the desktop grid', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({mobileDisplay: 'list'})} />)
    expect(screen.getAllByRole('navigation', {name: 'How we can help'})).toHaveLength(2)
    // compact list is the md:hidden nav with divided rows — and no carousel
    expect(container.querySelector('ul.snap-mandatory')).toBeNull()
    const mobileNav = container.querySelector('nav.md\\:hidden')
    expect(mobileNav?.querySelector('ul.divide-y')).not.toBeNull()
    // no full-bleed photos in the list
    expect(container.querySelector('nav.md\\:hidden [class*="object-cover"]')).toBeNull()
  })
})

// ─── A photo per practice area (Phase 17D, `[R-556]`) ─────────────────────────
const photo = (ref: string) => ({asset: {_type: 'reference', _ref: ref}})
const PHOTOGRAPHED = [
  {...ITEMS[0], image: photo('image-family-1600x900-jpg')},
  {...ITEMS[1], image: photo('image-estate-1600x900-jpg')},
]
const gridOf = (container: HTMLElement) => container.querySelector('nav.\\@container') as HTMLElement

describe('PracticeAreaNavBlock — card photos', () => {
  it('a list shows photos only once every area in it has one', () => {
    const half = render(<PracticeAreaNavBlock data={data({layout: 'spotlight', items: [PHOTOGRAPHED[0], ITEMS[1]]})} />)
    expect(gridOf(half.container).querySelectorAll('img')).toHaveLength(0)
    half.unmount()
    const all = render(<PracticeAreaNavBlock data={data({layout: 'spotlight', items: PHOTOGRAPHED})} />)
    expect(gridOf(all.container).querySelectorAll('img')).toHaveLength(2)
  })

  it('photosAllOrNone leaves a fully photographed list alone and strips a partial one', () => {
    expect(photosAllOrNone(PHOTOGRAPHED)).toBe(PHOTOGRAPHED)
    expect(photosAllOrNone([PHOTOGRAPHED[0], ITEMS[1]]).map((i) => i.image ?? null)).toEqual([null, null])
    // An image object with no asset counts as no photo.
    expect(photosAllOrNone([PHOTOGRAPHED[0], {...ITEMS[1], image: {asset: null}}]).every((i) => !i.image)).toBe(true)
  })

  // The focus ring is drawn outside the card, on the band, so it must take the band's color:
  // the dark context sits on the card's content, never on its link (ADV-17D-P).
  it.each(['spotlight', 'tile'] as const)('%s: the dark context is on the content, not the link', (layout) => {
    const {container} = render(<PracticeAreaNavBlock data={data({layout, items: PHOTOGRAPHED})} />)
    const grid = gridOf(container)
    for (const a of grid.querySelectorAll('a')) {
      expect(a.getAttribute('data-ring-context')).toBeNull()
      expect(a.querySelector(':scope > [data-ring-context="dark"]')).not.toBeNull()
    }
  })

  it('bento and the carousel keep the dark context off the link too', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({gridMode: 'bentoLeft', items: PHOTOGRAPHED})} />)
    const links = container.querySelectorAll('a')
    expect(links.length).toBeGreaterThan(0)
    for (const a of links) expect(a.getAttribute('data-ring-context')).toBeNull()
    expect(container.querySelectorAll('[data-slide] [data-ring-context="dark"]')).toHaveLength(2)
  })

  it('Spotlight, Bento and the carousel put the scrim behind the text block; Tile scrims the whole card', () => {
    const spot = render(<PracticeAreaNavBlock data={data({layout: 'spotlight', items: PHOTOGRAPHED})} />)
    expect(gridOf(spot.container).querySelectorAll('.tile-text-scrim')).toHaveLength(2)
    expect(spot.container.querySelectorAll('[data-slide] .tile-text-scrim')).toHaveLength(2)
    spot.unmount()
    const bento = render(<PracticeAreaNavBlock data={data({gridMode: 'bentoLeft', items: PHOTOGRAPHED})} />)
    expect(gridOf(bento.container).querySelectorAll('.tile-text-scrim')).toHaveLength(2)
    bento.unmount()
    const tile = render(<PracticeAreaNavBlock data={data({layout: 'tile', items: PHOTOGRAPHED})} />)
    const grid = gridOf(tile.container)
    expect(grid.querySelectorAll('.tile-text-scrim')).toHaveLength(0)
    expect(grid.querySelectorAll('.from-scrim\\/95.to-scrim\\/80')).toHaveLength(2)
  })

  it('a photo card’s scrims sit above the hover glow', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({layout: 'spotlight', items: PHOTOGRAPHED})} />)
    const card = gridOf(container).querySelector('a') as HTMLElement
    const layers = [...card.children] as HTMLElement[]
    const glow = layers.findIndex((el) => el.className.includes('from-cue/30'))
    const tone = layers.find((el) => el.className.includes('from-brand-dark/95'))
    expect(glow).toBeGreaterThan(-1)
    // The tone layer is lifted over the glow; the text scrim lives in the z-10 content.
    expect(tone?.className).toContain('z-[1]')
    expect(card.querySelector('.z-10 .tile-text-scrim')).not.toBeNull()
  })

  it('without photos nothing changes: no scrim, no dark context', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({layout: 'spotlight'})} />)
    expect(container.querySelectorAll('.tile-text-scrim, [data-ring-context]')).toHaveLength(0)
  })
})

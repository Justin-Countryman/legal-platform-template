import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// MONOREPO BACKLOG 427, ITS FIRST POINT: practice-area Feature and Split drew an empty grey panel where the photo would
// be when the list had no photos (`TileFill` in a fixed `h-44` or `h-36` box). Without photos they now draw no panel:
// the card is its text, led by the item's icon drawn bare (no chip), and no edge is invented (`[R-641]`,
// WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 5). With photos nothing changes.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt: string; className?: string}) => <img src={src} alt={alt} className={className} />,
}))

import {PracticeAreaNavBlock, type PracticeAreaNavBlockData} from '../PracticeAreaNavBlock'

const icon = {asset: {_ref: 'image-abc123-64x64-png'}} as never
const photo = {asset: {_ref: 'image-def456-1200x800-jpg'}} as never
const items = (withPhoto: boolean) => [
  {_key: 'a', label: 'Family Law', href: '/family-law/', description: 'Divorce and custody.', icon, ...(withPhoto ? {image: photo} : {})},
  {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: 'Wills and trusts.', icon, ...(withPhoto ? {image: photo} : {})},
]
const block = (layout: string, withPhoto: boolean): PracticeAreaNavBlockData =>
  ({heading: 'How we can help', layout, mobileDisplay: 'stacked', items: items(withPhoto)} as never)

const PANEL = /(^|\s)(h-44|h-36)(\s|$)/
const FILL = 'from-foreground/5'

describe('a practice card with no photo draws no empty photo panel (backlog 427)', () => {
  it.each(['feature', 'split'])('%s without photos: no panel, no fill, the icon bare', (layout) => {
    const {container} = render(<PracticeAreaNavBlock data={block(layout, false)} />)
    const cards = [...container.querySelectorAll('li a')]
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect([...card.querySelectorAll('div')].some((d) => PANEL.test(d.className)), layout).toBe(false)
      expect(card.innerHTML.includes(FILL), layout).toBe(false)
      const glyph = card.querySelector('[data-tile-icon]')!
      expect(glyph.getAttribute('data-tile-icon')).toBe('bare')
      expect(glyph.className.split(' ')).not.toContain('bg-decor/10')
    }
  })

  it.each(['feature', 'split'])('%s with photos keeps its photo panel and its chip', (layout) => {
    const {container} = render(<PracticeAreaNavBlock data={block(layout, true)} />)
    for (const card of container.querySelectorAll('li a')) {
      expect([...card.querySelectorAll('div')].some((d) => PANEL.test(d.className)), layout).toBe(true)
      expect(card.querySelector('[data-tile-icon]')!.getAttribute('data-tile-icon')).toBe('chip')
    }
  })
})

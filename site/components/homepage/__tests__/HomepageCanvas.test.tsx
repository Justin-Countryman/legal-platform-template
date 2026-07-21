import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, className}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="badge-img" src={src} alt={alt ?? ''} className={className} />
  )),
}))

// ScrollReveal is stubbed with a marker so the FIRST-BLOCK RULE can be asserted
// on structure rather than on animation behavior. The real primitive is tested
// on its own; what matters here is which blocks get wrapped at all.
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => (
    <div data-testid="scroll-reveal">{children}</div>
  ),
}))

import {HomepageCanvas, type HomepageBlock} from '../HomepageCanvas'
import {BadgesBlock, type BadgeImage} from '../BadgesBlock'

const badge = (n: number): BadgeImage => ({
  src: `https://cdn.example.com/badge-${n}.png`,
  alt: `Badge ${n}`,
  width: 400,
  height: 400,
})

const badgesBlock = (key: string, badges: BadgeImage[] = [badge(1), badge(2)]): HomepageBlock => ({
  _type: 'badgesBlock',
  _key: key,
  heading: 'Recognised by our peers',
  description: 'A short description.',
  badges,
})

describe('BadgesBlock', () => {
  it('renders the heading at the MARKETING scale, not the interior section scale', () => {
    // Regression guard for a real mistake made while building this block: the
    // first draft routed the heading through <SectionHeader>, which maps to the
    // interior 3-tier rhythm and never emits the marketing scale. That would
    // make designSettings.marketingScale silently do nothing on the homepage.
    const {container} = render(<BadgesBlock data={badgesBlock('a')} />)
    const h2 = container.querySelector('h2')
    expect(h2?.className).toContain('marketing-h2')
    expect(h2?.className).not.toMatch(/\btext-3xl\b/)
  })

  it('renders one image per badge, with alt text carried through', () => {
    const {getAllByTestId} = render(<BadgesBlock data={badgesBlock('a')} />)
    const imgs = getAllByTestId('badge-img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0].getAttribute('alt')).toBe('Badge 1')
  })

  it('renders NOTHING when every badge lacks an image, rather than a heading over a void', () => {
    const {container} = render(
      <BadgesBlock data={badgesBlock('a', [{src: null, alt: null, width: null, height: null}])} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when the badge list is empty', () => {
    const {container} = render(<BadgesBlock data={badgesBlock('a', [])} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('HomepageCanvas — first-block rule', () => {
  // BI-Library: scroll reveal is default for mid-page blocks and NEVER for the
  // hero or the first block after it. ScrollReveal cannot enforce the
  // first-block half itself, because it only knows about the fold and a short
  // viewport can push block one below it. The canvas applies the rule by index,
  // and this test is what keeps that from being refactored away silently.
  it('does NOT wrap the first block in ScrollReveal', () => {
    const {queryAllByTestId} = render(<HomepageCanvas blocks={[badgesBlock('a')]} />)
    expect(queryAllByTestId('scroll-reveal')).toHaveLength(0)
  })

  it('wraps every block after the first', () => {
    const {queryAllByTestId} = render(
      <HomepageCanvas blocks={[badgesBlock('a'), badgesBlock('b'), badgesBlock('c')]} />,
    )
    expect(queryAllByTestId('scroll-reveal')).toHaveLength(2)
  })

  it('renders nothing for an absent or empty canvas', () => {
    expect(render(<HomepageCanvas blocks={null} />).container.innerHTML).toBe('')
    expect(render(<HomepageCanvas blocks={[]} />).container.innerHTML).toBe('')
  })

  it('renders nothing for an unknown block type instead of a placeholder', () => {
    const unknown = {_type: 'notARealBlock', _key: 'x'} as unknown as HomepageBlock
    const {container} = render(<HomepageCanvas blocks={[unknown]} />)
    expect(container.innerHTML).toBe('')
  })
})

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
import {type BadgeImage} from '@/components/homepage/BadgesBlock'

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

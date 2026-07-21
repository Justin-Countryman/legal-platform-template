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
import {RESULTS_DISCLAIMER_DEFAULT} from '@/lib/legal'

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

describe('HomepageCanvas — the results disclaimer cannot be switched off', () => {
  // Bar advertising rules require past results to be paired with a disclaimer,
  // ALWAYS. This suite lives platform-side on purpose: the block markup is
  // client-owned and may be rewritten per firm, so a test living beside the
  // block could be rewritten with it. These assertions are the third leg of the
  // enforcement, after the code constant and the required prop.
  const caseResultsBlock = (): HomepageBlock =>
    ({
      _type: 'caseResultsBlock',
      _key: 'cr',
      heading: 'Recent results',
      caseResults: [{_id: 'r1', amount: '$1.4 Million', caseType: 'Truck Accident', caption: 'A settlement.'}],
    }) as unknown as HomepageBlock

  it('renders the disclaimer when siteSettings has no override', () => {
    const {getByTestId} = render(<HomepageCanvas blocks={[caseResultsBlock()]} />)
    expect(getByTestId('results-disclaimer').textContent).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['whitespace', '   '],
    ['a newline', '\n'],
  ])('falls through to the constant when the override is %s', (_label, value) => {
    // Every one of these is a state an operator can produce in Studio, and none
    // of them may publish a case result with no disclaimer.
    const {getByTestId} = render(
      <HomepageCanvas blocks={[caseResultsBlock()]} resultsDisclaimer={value as string | null} />,
    )
    expect(getByTestId('results-disclaimer').textContent).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it('uses the operator override when one is genuinely set', () => {
    // The field is a WORDING override, so a real value must win. What it can
    // never do is produce nothing.
    const {getByTestId} = render(
      <HomepageCanvas blocks={[caseResultsBlock()]} resultsDisclaimer={'Jurisdiction-specific wording.'} />,
    )
    expect(getByTestId('results-disclaimer').textContent).toBe('Jurisdiction-specific wording.')
  })

  it('renders no results and no disclaimer when the block has no case results', () => {
    // The only branch where the disclaimer does not render is the one where no
    // case result renders either. Nothing is published, so nothing is disclaimed.
    const empty = {_type: 'caseResultsBlock', _key: 'cr', heading: 'Recent results', caseResults: []}
    const {container, queryByTestId} = render(
      <HomepageCanvas blocks={[empty as unknown as HomepageBlock]} />,
    )
    expect(queryByTestId('results-disclaimer')).toBeNull()
    // No section, no list, nothing visible. The canvas still emits its own
    // per-block wrapper element, because it holds a React element and cannot
    // know the component inside it will return null without rendering it. An
    // empty unstyled <div> is not a half-drawn band, so "empty renders nothing"
    // holds in substance; asserting on innerHTML === '' would be asserting on
    // the wrapper rather than on the rule.
    expect(container.querySelector('section')).toBeNull()
    expect(container.textContent).toBe('')
  })
})

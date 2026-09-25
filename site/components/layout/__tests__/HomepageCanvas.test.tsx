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
import {RESULTS_DISCLAIMER_DEFAULT} from '@/lib/legal'

const badge = (n: number) => ({
  src: `https://cdn.example.com/badge-${n}.png`,
  alt: `Badge ${n}`,
  width: 400,
  height: 400,
})

const badgesBlock = (key: string, badges = [badge(1), badge(2)]): HomepageBlock => ({
  _type: 'badgesSectionInline',
  _key: key,
  heading: 'Recognised by our peers',
  description: 'A short description.',
  layout: 'centeredGrid',
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

  it('an unknown member moves nothing: the band after it keeps the first-band rule and its full top padding', () => {
    // A stored member whose type has left the schema (an unmigrated canvas after
    // a contraction) renders nothing, so it must not count as the band above.
    const unknown = {_type: 'notARealBlock', _key: 'x'} as unknown as HomepageBlock
    const band: HomepageBlock = {_type: 'practiceAreaNavInline', _key: 'p', heading: 'Areas', items: [{_key: 'i', label: 'Family Law', href: '/family-law/'}]}
    const alone = render(<HomepageCanvas blocks={[band]} />).container.querySelector('section')!.className.split(' ')
    const {container, queryAllByTestId} = render(<HomepageCanvas blocks={[unknown, band]} />)
    const after = container.querySelector('section')!.className.split(' ')
    expect(queryAllByTestId('scroll-reveal')).toHaveLength(0)
    expect(after).toContain('pt-16')
    expect(after).not.toContain('pt-8')
    expect(after).toEqual(alone)
  })
})

describe('HomepageCanvas — the results disclaimer cannot be switched off', () => {
  // Bar advertising rules require past results to be paired with a disclaimer,
  // ALWAYS. These assertions are the third leg of the enforcement, after the
  // code constant and the required prop, and they run through the dispatcher.
  const caseResultsBlock = (): HomepageBlock =>
    ({
      _type: 'caseResultsSectionInline',
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
    const empty = {_type: 'caseResultsSectionInline', _key: 'cr', heading: 'Recent results', caseResults: []}
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

describe('HomepageCanvas — the inline section objects dispatch to the shared section components', () => {
  // `homePage.canvas` holds the nine `<name>Inline` objects, rendered through the
  // SAME components PageSections uses for the referenced documents. This suite
  // is the dispatch table, one case per type.
  const items = [{_key: 'i1', label: 'Family Law', href: '/family-law/'}]

  it('practiceAreaNavInline renders through PracticeAreaNavBlock (nav landmark, one grid when stacked)', () => {
    const {container, getByRole} = render(
      <HomepageCanvas
        blocks={[{_type: 'practiceAreaNavInline', _key: 'p', heading: 'How we can help', layout: 'tile', mobileDisplay: 'stacked', items}]}
      />,
    )
    expect(getByRole('heading', {level: 2}).textContent).toBe('How we can help')
    expect(container.querySelectorAll('nav')).toHaveLength(1)
    // The section component, not the old block: SectionHeader's scale, not marketing-h2.
    expect(container.querySelector('h2')?.className).not.toContain('marketing-h2')
  })

  it('attorneySectionInline renders through AttorneySectionBlock', () => {
    const {getByRole} = render(
      <HomepageCanvas
        blocks={[{_type: 'attorneySectionInline', _key: 'a', heading: 'Our people', layout: 'grid', cardStyle: 'portrait', attorneys: [{_id: 'x', title: 'Jane Roe', slug: 'attorneys/jane'}]}]}
      />,
    )
    expect(getByRole('link', {name: /Jane Roe/}).getAttribute('href')).toBe('/attorneys/jane')
  })

  it('badgesSectionInline renders through BadgesSectionBlock', () => {
    const {queryAllByTestId} = render(
      <HomepageCanvas blocks={[{_type: 'badgesSectionInline', _key: 'b', heading: 'Recognised', layout: 'centeredGrid', badges: [badge(1)]}]} />,
    )
    expect(queryAllByTestId('badge-img')).toHaveLength(1)
  })

  it('caseResultsSectionInline renders the promoted CaseResultsSection with the disclaimer, which cannot be switched off', () => {
    const block = {_type: 'caseResultsSectionInline', _key: 'c', heading: 'Results', caseResults: [{_id: 'r', amount: '$1M'}]} as HomepageBlock
    const disclaimerOf = (override?: string) =>
      render(<HomepageCanvas blocks={[block]} resultsDisclaimer={override} />).container.querySelector('[data-testid="results-disclaimer"]')?.textContent
    expect(disclaimerOf(undefined)).toBe(RESULTS_DISCLAIMER_DEFAULT)
    expect(disclaimerOf('   ')).toBe(RESULTS_DISCLAIMER_DEFAULT)
    expect(disclaimerOf('Jurisdiction wording.')).toBe('Jurisdiction wording.')
    // No results, no disclaimer, nothing published.
    const empty = {_type: 'caseResultsSectionInline', _key: 'c', heading: 'Results', caseResults: []} as HomepageBlock
    expect(render(<HomepageCanvas blocks={[empty]} />).container.querySelector('section')).toBeNull()
  })

  it('testimonialsGridInline and featuredTestimonialInline render the quote', () => {
    const t = {_id: 't', quote: 'Superb counsel.', name: 'A client'}
    expect(render(<HomepageCanvas blocks={[{_type: 'testimonialsGridInline', _key: 'g', heading: 'Clients', testimonials: [t]}]} />).container.textContent).toContain('Superb counsel.')
    expect(render(<HomepageCanvas blocks={[{_type: 'featuredTestimonialInline', _key: 'f', testimonial: t}]} />).container.textContent).toContain('Superb counsel.')
  })

  it('videoSectionInline renders through VideoSectionBlock', () => {
    const {getByRole} = render(
      <HomepageCanvas blocks={[{_type: 'videoSectionInline', _key: 'v', heading: 'Watch', videos: [{_id: 'v1', title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=abc123xyz00'}]}]} />,
    )
    expect(getByRole('heading', {level: 2}).textContent).toBe('Watch')
  })

  it('a member of a deleted block type renders nothing (deleted in Phase 15)', () => {
    const retired = {_type: 'siloNavBlock', _key: 's', heading: 'Areas', items} as unknown as HomepageBlock
    const {container, queryAllByTestId} = render(
      <HomepageCanvas blocks={[retired, {_type: 'practiceAreaNavInline', _key: 'p', heading: 'H', items}]} />,
    )
    expect(container.querySelectorAll('section')).toHaveLength(1)
    expect(queryAllByTestId('scroll-reveal')).toHaveLength(0)
  })
})

describe('HomepageCanvas — contentSectionInline (Phase 11)', () => {
  // The content section dispatches beside the thirteen existing cases, at the
  // marketing tier, with the results disclaimer resolved here, and an EMPTY
  // member is dropped by the dispatcher so it leaves no ScrollReveal wrapper.
  const statement = (key: string, extra: Record<string, unknown> = {}): HomepageBlock =>
    ({_type: 'contentSectionInline', _key: key, layout: 'statement', heading: 'Why {{firmName}} wins', headingEmphasis: '{{firmName}}', ...extra}) as HomepageBlock

  it('dispatches to the content section at the marketing tier, with the emphasis resolved', () => {
    const {container} = render(<HomepageCanvas blocks={[statement('a')]} napTokens={{firmName: 'Acme Law'}} />)
    const h2 = container.querySelector('h2')!
    expect(h2.innerHTML).toBe('Why <em class="heading-emphasis">Acme Law</em> wins')
    expect(h2.className).toContain('marketing-h2')
    expect(container.querySelector('[data-testid="results-disclaimer"]')).toBeNull()
  })

  it('an empty content section after the first band leaves no wrapper', () => {
    const empty = statement('b', {heading: ''})
    const {queryAllByTestId, container} = render(<HomepageCanvas blocks={[statement('a'), empty]} />)
    expect(queryAllByTestId('scroll-reveal')).toHaveLength(0)
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })

  it.each([
    ['absent', undefined],
    ['whitespace', '   '],
  ])('a proof number renders the default disclaimer when the override is %s', (_label, value) => {
    const {getByTestId} = render(
      <HomepageCanvas blocks={[statement('a', {proof: {number: '$40M', caption: 'recovered'}})]} resultsDisclaimer={value} />,
    )
    expect(getByTestId('results-disclaimer').textContent).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it('a stat row renders the operator wording when it is set', () => {
    const row = {_type: 'contentSectionInline', _key: 's', layout: 'statRow', items: [{_key: 'i', title: '500+', body: 'families'}]} as HomepageBlock
    const {getByTestId} = render(<HomepageCanvas blocks={[row]} resultsDisclaimer="Jurisdiction wording." />)
    expect(getByTestId('results-disclaimer').textContent).toBe('Jurisdiction wording.')
  })
})

describe('HomepageCanvas — reviewsSectionInline', () => {
  // The homepage copy of the reviews section (2026-09-14). A member with no
  // embed renders nothing and leaves no ScrollReveal wrapper.
  const member = (key: string, extra: Record<string, unknown> = {}): HomepageBlock =>
    ({_type: 'reviewsSectionInline', _key: key, heading: 'What clients say', reviewsEmbed: '<div>widget</div>', ...extra}) as HomepageBlock

  it('dispatches to the reviews section', () => {
    const {getByRole} = render(<HomepageCanvas blocks={[member('r')]} />)
    expect(getByRole('heading', {level: 2}).textContent).toBe('What clients say')
  })

  it('a member with no embed after the first band leaves no wrapper', () => {
    const {queryAllByTestId, container} = render(<HomepageCanvas blocks={[member('a'), member('b', {reviewsEmbed: ''})]} />)
    expect(queryAllByTestId('scroll-reveal')).toHaveLength(0)
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })
})

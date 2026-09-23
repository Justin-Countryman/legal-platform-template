import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, className}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className={className} />
  )),
}))
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => (
    <div data-testid="scroll-reveal">{children}</div>
  ),
}))

import {HomepageCanvas, frameOf, type HomepageBlock} from '../HomepageCanvas'
import * as CaseResults from '@/components/sections/CaseResultsSection'
import * as PracticeAreas from '@/components/sections/PracticeAreaNavBlock'

// ─── A band the page never draws is not a band ────────────────────────────────
//
// The seam walk asks each section, before anything renders, whether it will render
// at all (`isEmpty`, through `frameOf`), and a band it counts becomes the "previous
// band" of the next one and takes the first-band rule. Found in the Phase 17A
// challenge (monorepo WS-V1-PHASE17A-DESIGN §7.2 finding 5): two sections answered
// "not empty" for data they then drew nothing for, so the walk counted an invisible
// band. The grey box reads the same answer, so the wireframe the client approves
// would have shown a band the live page does not.
//
// Each section now answers from the filter it renders with.

const caseResultsWithNothingToShow = (key: string): HomepageBlock => ({
  _type: 'caseResultsSectionInline',
  _key: key,
  heading: 'Results',
  // A result with neither an amount nor a caption has nothing to show, and a
  // dangling reference projects as null.
  caseResults: [{_id: 'r1', amount: null, caption: null} as never, null as never],
})

const areasWithNoLinks = (key: string): HomepageBlock => ({
  _type: 'practiceAreaNavInline',
  _key: key,
  heading: 'Areas of law',
  layout: 'tile',
  // An item with no href is not drawn.
  items: [{title: 'Wills', href: null} as never, null as never],
})

const contentBand = (key: string): HomepageBlock => ({
  _type: 'contentSectionInline',
  _key: key,
  heading: 'Why us',
  layout: 'twoColumnText',
  items: [
    {_key: 'a', _type: 'contentSectionItem', title: 'One', text: 'First.'},
    {_key: 'b', _type: 'contentSectionItem', title: 'Two', text: 'Second.'},
  ],
} as never)

describe('a section that draws nothing is empty to the walk', () => {
  it('case results with no amount or caption, and a null, are empty', () => {
    const block = caseResultsWithNothingToShow('cr')
    expect(CaseResults.isEmpty(block as never)).toBe(true)
    expect(frameOf(block).empty).toBe(true)
  })

  it('areas of law whose items carry no link are empty', () => {
    const block = areasWithNoLinks('pa')
    expect(PracticeAreas.isEmpty(block as never)).toBe(true)
    expect(frameOf(block).empty).toBe(true)
  })

  it('the band after an invisible one is the first band, with no reveal wrapper', () => {
    const {container} = render(
      <HomepageCanvas blocks={[caseResultsWithNothingToShow('cr'), areasWithNoLinks('pa'), contentBand('c')]} />,
    )
    expect(container.querySelectorAll('section')).toHaveLength(1)
    expect(container.querySelectorAll('[data-testid="scroll-reveal"]')).toHaveLength(0)
  })
})

import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'

import {PageSections, type PageSectionData} from '../PageSections'
import {HEADING_UNIT_TIER_CLASS} from '@/components/ui/HeadingUnit'
import {RESULTS_DISCLAIMER_DEFAULT} from '@/lib/legal'

// ─── PageSections: the two documents an interior page can reference ───────────
//
// Phase 11 (monorepo WS-V1-PHASE11-DESIGN §7 amendment 1). `contentSection` and
// `caseResultsSection` register as documents in every interior `sections` list
// beside `ctaSection`, so this dispatcher renders them, and it resolves the
// results disclaimer from the page query's raw value the way HomepageCanvas does.
// A result can never render here without it.

describe('PageSections — contentSection', () => {
  it('renders at the interior tier', () => {
    const s = {_type: 'contentSection', _id: 'c1', layout: 'statement', heading: 'About the firm'} as PageSectionData
    const {container} = render(<PageSections sections={[s]} />)
    expect(container.querySelector('h2')!.className).toBe(HEADING_UNIT_TIER_CLASS.interior)
  })

  it.each([
    ['absent', undefined],
    ['blank', '   '],
  ])('a proof number renders the default disclaimer when the override is %s', (_label, value) => {
    const s = {_type: 'contentSection', _id: 'c1', layout: 'statement', heading: 'Results', proof: {number: '$1M', caption: 'verdict'}} as PageSectionData
    const {getByTestId} = render(<PageSections sections={[s]} resultsDisclaimer={value} />)
    expect(getByTestId('results-disclaimer').textContent).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it('an empty contentSection renders nothing', () => {
    const s = {_type: 'contentSection', _id: 'c2', layout: 'split', heading: 'Only a heading'} as PageSectionData
    expect(render(<PageSections sections={[s]} />).container.innerHTML).toBe('')
  })
})

describe('PageSections — caseResultsSection', () => {
  const s = {_type: 'caseResultsSection', _id: 'r1', heading: 'Results', caseResults: [{_id: 'x', amount: '$2M', caseType: 'Injury'}]} as PageSectionData

  it('renders the operator wording when it is set', () => {
    const {getByTestId} = render(<PageSections sections={[s]} resultsDisclaimer="Operator wording." />)
    expect(getByTestId('results-disclaimer').textContent).toBe('Operator wording.')
  })

  it('renders the constant when no wording is set', () => {
    const {getByTestId} = render(<PageSections sections={[s]} />)
    expect(getByTestId('results-disclaimer').textContent).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })
})

describe('PageSections — unknown types', () => {
  it('render nothing', () => {
    const unknown = {_type: 'notASection', _id: 'u'} as unknown as PageSectionData
    expect(render(<PageSections sections={[unknown]} />).container.innerHTML).toBe('')
  })
})

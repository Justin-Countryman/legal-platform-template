import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import {SectionHeader} from '../SectionHeader'
import {HeadingUnit} from '../HeadingUnit'
import {ContentSectionBlock} from '../../sections/ContentSectionBlock'
import {NO_SEAM, type SeamProps} from '../../sections/sectionFrame'
import {headingFit} from '@/lib/headingFit'

// Phase 17C session 3 (`[R-536]`, `[R-544]`): a section heading carries the two widths its words
// need and holds its words in one fitted span; with no fit it renders as before.

const FIT = {w3: 9.84, w4: 7.61}

describe('the fitted heading', () => {
  it('puts the widths on the heading and the words in one block span', () => {
    const {container} = render(<SectionHeader heading="Why work with us" fit={FIT} />)
    const h2 = container.querySelector('h2')!
    expect(h2.style.getPropertyValue('--heading-w3')).toBe('9.84')
    expect(h2.style.getPropertyValue('--heading-w4')).toBe('7.61')
    expect(h2.children).toHaveLength(1)
    expect(h2.firstElementChild!.className).toBe('heading-fit')
    expect(h2.firstElementChild!.textContent).toBe('Why work with us')
  })

  it('renders as before without a fit, and an empty heading stays empty so its rule is hidden', () => {
    const plain = render(<SectionHeader heading="Why work with us" />).container.querySelector('h2')!
    expect(plain.innerHTML).toBe('Why work with us')
    expect(plain.getAttribute('style')).toBeNull()
    const empty = render(<SectionHeader heading="" fit={headingFit('', null)} />).container.querySelector('h2')!
    expect(empty.innerHTML).toBe('')
  })

  it('keeps the emphasis inside the span on the content section heading', () => {
    const {container} = render(<HeadingUnit heading="Why Acme wins" headingEmphasis="Acme" scale="marketing" fit={FIT} />)
    expect(container.querySelector('h2 > .heading-fit')!.innerHTML).toBe('Why <em class="heading-emphasis">Acme</em> wins')
  })

  it('is computed by the section from the face the site look carries', () => {
    const seam: SeamProps = {...NO_SEAM, site: {imageFrame: null, cardHover: null, attorneyCardStyle: null, headingFace: {pairing: 7, weight: '700', upper: true}}}
    const {container} = render(
      <ContentSectionBlock data={{layout: 'statement', heading: 'Serious counsel for every stage'}} disclaimer="d" scale="marketing" seam={seam} />,
    )
    const want = headingFit('Serious counsel for every stage', {pairing: 7, weight: '700', upper: true})!
    const h2 = container.querySelector('h2')!
    expect(h2.style.getPropertyValue('--heading-w3')).toBe(String(want.w3))
    // Capitals are wider than the same words in mixed case in the same face.
    expect(want.w3).toBeGreaterThan(headingFit('Serious counsel for every stage', {pairing: 7, weight: '700', upper: false})!.w3)
  })
})

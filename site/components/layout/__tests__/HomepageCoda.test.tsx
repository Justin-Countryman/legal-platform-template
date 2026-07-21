import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'

import {HomepageCoda} from '../HomepageCoda'

const LINE = 'Sixty years in one community, and still answering the phone ourselves.'

describe('HomepageCoda', () => {
  it('renders the line as a paragraph, not a heading', () => {
    // A coda is a statement, not a section title. A heading here would compete
    // with the CTA heading directly above it and invert the arc.
    const {container, getByText} = render(<HomepageCoda text={LINE} />)
    expect(getByText(LINE).tagName).toBe('P')
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
  })

  it('does NOT use the marketing scale', () => {
    // marketing-h* is for headings. The coda should settle, not shout.
    const {container} = render(<HomepageCoda text={LINE} />)
    expect(container.innerHTML).not.toContain('marketing-h')
  })

  it('adds no unlabelled landmark for a single sentence', () => {
    const {container} = render(<HomepageCoda text={LINE} />)
    expect(container.querySelector('section')).toBeNull()
    expect(container.querySelector('aside')).toBeNull()
  })
})

describe('HomepageCoda — empty renders nothing', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])('renders nothing when the coda is %s', (_label, value) => {
    // An empty quiet band is an unexplained gap above the footer, so there is
    // no half-state worth showing.
    const {container} = render(<HomepageCoda text={value as string | null} />)
    expect(container.innerHTML).toBe('')
  })
})

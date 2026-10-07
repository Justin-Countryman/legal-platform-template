import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {ContentSectionBlock, type ContentSectionData} from '../ContentSectionBlock'

// A FIRM'S PROMISE SET LARGE (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 12, `[R-641]`): a 34-word promise drew
// seven lines at the section heading's size where brandilaw draws four. The content section's `textSize: 'large'` sets
// the body's first paragraph in the heading face between body size and the heading; the rest stays at body size, and the
// drop cap stands down. Blank renders as before.

const CSS = readFileSync(resolve(__dirname, '../../../app/globals.css'), 'utf8')
const para = (key: string, text: string) => ({_type: 'block', _key: key, style: 'normal', markDefs: [], children: [{_type: 'span', _key: `${key}s`, text, marks: []}]})
const data = (over: Partial<ContentSectionData> = {}): ContentSectionData => ({
  _type: 'contentSection', _id: 'c', layout: 'statement', heading: 'Why work with us',
  body: [para('a', 'Serious counsel for the decisions that shape a family or a business.'), para('b', 'We answer every call.')],
  ...over,
} as never)

describe('the large first paragraph', () => {
  it('marks the body when set, and takes no drop cap', () => {
    const {container} = render(<ContentSectionBlock data={data({textSize: 'large', layout: 'split'} as never)} disclaimer="Past results do not guarantee future outcomes." scale="marketing" />)
    const wrapper = container.querySelector('[data-lede]')!
    expect(wrapper).not.toBeNull()
    expect(wrapper.getAttribute('data-prose')).toBeNull()
    expect(wrapper.querySelectorAll(':scope > p')).toHaveLength(2)
  })

  it('is absent when blank, as before', () => {
    expect(render(<ContentSectionBlock data={data()} disclaimer="Past results do not guarantee future outcomes." scale="marketing" />).container.querySelector('[data-lede]')).toBeNull()
  })

  it('draws the first paragraph only, in the heading face and ink, between body size and the heading', () => {
    const rule = /\[data-lede\] > p:first-child \{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    expect(rule).toContain('font-family: var(--font-heading)')
    expect(rule).toContain('font-size: clamp(1.375rem, 1rem + 1.5vw, 2.25rem)')
    expect(rule).toContain('color: var(--color-heading)')
  })
})

import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {Linter} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '@/eslint-rules/rules/heading-cascade-discipline.js'
import {HeadingUnit, HEADING_UNIT_TIER_CLASS} from '@/components/ui/HeadingUnit'
import {SECTION_HEADER_H2_CLASS, stripTrailingGap} from '@/components/ui/SectionHeader'
import {splitEmphasis} from '@/lib/headingEmphasis'

// ─── The cascade guarantee for heading classes ────────────────────────────────
//
// `heading-cascade-discipline` cannot see a heading class read from a table: it
// skips any className it cannot tokenize, so `className={TABLE[tier]}` passes
// whatever the table holds (proven in Phase 11's challenge with a planted typo).
// This test is the guarantee instead: every class a heading unit or a section
// header can carry is fed through THE RULE ITSELF as a static literal, so the
// list of acceptable cascade tokens is never copied here.

function lintHeading(cls: string): string[] {
  const linter = new Linter({configType: 'flat'})
  const messages = linter.verify(
    `<h2 className=${JSON.stringify(cls)}>x</h2>`,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: {parser: tsParser, parserOptions: {ecmaFeatures: {jsx: true}}},
        plugins: {platform: {rules: {'heading-cascade-discipline': rule}}},
        rules: {'platform/heading-cascade-discipline': 'error'},
      },
    ],
    'probe.tsx',
  )
  return messages.map((m) => m.message)
}

const EVERY_HEADING_CLASS: Array<[string, string]> = [
  ...Object.entries(HEADING_UNIT_TIER_CLASS).map(([k, v]): [string, string] => [`HeadingUnit ${k}`, v]),
  ...Object.entries(SECTION_HEADER_H2_CLASS).flatMap(([k, v]): Array<[string, string]> => [
    [`SectionHeader ${k}`, v],
    [`SectionHeader ${k} noTrailingGap`, stripTrailingGap(v)],
  ]),
]

describe('every heading tier class carries a cascade-aware text token (checked by the rule itself)', () => {
  it.each(EVERY_HEADING_CLASS)('%s', (_name, cls) => {
    expect(lintHeading(cls)).toEqual([])
  })

  it('the harness is live: a heading class with no cascade token is reported', () => {
    expect(lintHeading('mb-4 text-3xl font-bold')).toHaveLength(1)
  })
})

describe('splitEmphasis', () => {
  it('splits at the first occurrence', () => {
    expect(splitEmphasis('Law, and Law again', 'Law')).toEqual(['', 'Law', ', and Law again'])
  })

  it('treats an empty emphasis (an unset token resolved to "") as no emphasis', () => {
    expect(splitEmphasis('Why us', '')).toBeNull()
  })

  it('returns null for an absent emphasis, one the heading lacks, or no heading', () => {
    expect(splitEmphasis('Why us', null)).toBeNull()
    expect(splitEmphasis('Why us', 'them')).toBeNull()
    expect(splitEmphasis('', 'us')).toBeNull()
  })
})

describe('HeadingUnit', () => {
  it('with no emphasis renders one text node inside one heading element', () => {
    const {container} = render(<HeadingUnit heading="Why Acme" scale="interior" />)
    const headings = container.querySelectorAll('h1,h2,h3,h4,h5,h6')
    expect(headings).toHaveLength(1)
    expect(headings[0].childNodes).toHaveLength(1)
    expect(container.querySelector('em')).toBeNull()
  })

  it('resolves tokens in the tagline, heading and emphasis before the split', () => {
    const {container} = render(
      <HeadingUnit
        tagline="About {{firmName}}"
        heading="Why {{firmName}} wins"
        headingEmphasis="{{firmName}}"
        tokens={{firmName: 'Acme Law'}}
        scale="marketing"
      />,
    )
    expect(container.querySelector('h2')!.innerHTML).toBe('Why <em class="heading-emphasis">Acme Law</em> wins')
    expect(container.querySelector('.tagline')?.textContent).toBe('About Acme Law')
  })

  it('emphasises only the first occurrence', () => {
    const {container} = render(<HeadingUnit heading="Law and Law" headingEmphasis="Law" scale="interior" />)
    expect(container.querySelectorAll('em')).toHaveLength(1)
    expect(container.querySelector('h2')!.innerHTML).toBe('<em class="heading-emphasis">Law</em> and Law')
  })

  it('renders no empty <em> when the emphasis token is unset', () => {
    const {container} = render(<HeadingUnit heading="Why us" headingEmphasis="{{unset}}" tokens={{}} scale="interior" />)
    expect(container.querySelector('em')).toBeNull()
    expect(container.querySelector('h2')!.textContent).toBe('Why us')
  })

  it.each(['h1', 'h2', 'h3'] as const)('as=%s renders exactly that element with the tier class', (as) => {
    const {container} = render(<HeadingUnit heading="x" as={as} scale="marketing" />)
    expect(container.querySelector(as)!.className).toBe(HEADING_UNIT_TIER_CLASS.marketing)
    expect(container.querySelectorAll('h1,h2,h3')).toHaveLength(1)
  })

  it('renders no rule element and no tagline when none is given', () => {
    const {container} = render(<HeadingUnit heading="x" scale="interior" />)
    const wrapper = container.firstElementChild!
    expect(wrapper.children).toHaveLength(1)
    expect(wrapper.firstElementChild!.tagName).toBe('H2')
  })

  it('centres through the wrapper and keeps a layout className there, never on the heading', () => {
    const {container} = render(<HeadingUnit heading="x" scale="interior" align="center" className="mx-auto max-w-2xl" />)
    expect(container.firstElementChild!.className).toBe('text-center mx-auto max-w-2xl')
    expect(container.querySelector('h2')!.className).toBe(HEADING_UNIT_TIER_CLASS.interior)
  })
})

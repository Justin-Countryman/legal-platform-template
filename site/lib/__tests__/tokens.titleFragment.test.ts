import {describe, it, expect} from 'vitest'
import {titleFragment} from '../tokens'
import type {NapTokens} from '../tokens'

// ─── Title fragment resolution ────────────────────────────────────────────────
//
// Doctrine: BI-Content.md "Title tags". `seoTitle` holds the page-specific
// fragment; the root layout's template appends the firm name; no page may
// render a title beginning with the separator. The rule this file pins is the
// return-type contract: an empty fragment must come back as `undefined`, never
// `''`, because Next treats `''` as a present title and takes the template
// branch — which is exactly the dangling-separator defect (item 32a).

const tokens: NapTokens = {primaryPhone: '555-0100'} as NapTokens

describe('titleFragment — seoTitle wins when present', () => {
  it('returns the resolved seoTitle', () => {
    expect(titleFragment('Bankruptcy Law', 'Bankruptcy', tokens)).toBe('Bankruptcy Law')
  })

  it('resolves tokens inside the fragment', () => {
    expect(titleFragment('Call {{primaryPhone}}', 'Contact', tokens)).toBe('Call 555-0100')
  })
})

describe('titleFragment — falls back to the page name', () => {
  it('null seoTitle falls back', () => {
    expect(titleFragment(null, 'Bankruptcy', tokens)).toBe('Bankruptcy')
  })

  it('undefined seoTitle falls back', () => {
    expect(titleFragment(undefined, 'Bankruptcy', tokens)).toBe('Bankruptcy')
  })

  it('empty-string seoTitle falls back — the item 32a case', () => {
    expect(titleFragment('', 'Bankruptcy', tokens)).toBe('Bankruptcy')
  })

  it('whitespace-only seoTitle falls back', () => {
    expect(titleFragment('   ', 'Bankruptcy', tokens)).toBe('Bankruptcy')
  })

  it('a fragment that is only an unset token falls back', () => {
    // {{primaryTollFree}} resolves to '' for a firm without one; the resulting
    // empty fragment must not reach the template.
    expect(titleFragment('{{primaryTollFree}}', 'Contact', tokens)).toBe('Contact')
  })
})

describe('titleFragment — undefined when both sources are empty', () => {
  // `undefined` lets Next fall through to the root `default` (bare firm name).
  // `''` would render "- Firm Name". This is the load-bearing distinction.
  it('both null', () => {
    expect(titleFragment(null, null, tokens)).toBeUndefined()
  })

  it('both empty strings', () => {
    expect(titleFragment('', '', tokens)).toBeUndefined()
  })

  it('never returns the empty string for any empty input pair', () => {
    const empties = [null, undefined, '', '  ']
    for (const a of empties) {
      for (const b of empties) {
        expect(titleFragment(a, b, tokens)).not.toBe('')
      }
    }
  })
})

describe('titleFragment — null tokens pass text through', () => {
  it('works without a token map (the review route has none)', () => {
    expect(titleFragment(null, 'Review Us in St. Paul', null)).toBe('Review Us in St. Paul')
  })
})

import {describe, it, expect} from 'vitest'
import {RESULTS_DISCLAIMER_DEFAULT, resolveResultsDisclaimer} from '../legal'

// ─── Results disclaimer resolution ────────────────────────────────────────────
//
// The governing rule: no reachable state renders a case result without a
// disclaimer. `siteSettings` is create-only and `initialValue` never backfills
// existing clients, so `undefined` is not a hypothetical — it is the state of
// every client provisioned before the field existed. See lib/legal.ts.

describe('resolveResultsDisclaimer — falls through to the constant', () => {
  it('returns the constant when the field is undefined (no argument)', () => {
    expect(resolveResultsDisclaimer()).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it('returns the constant when the field is undefined (explicit)', () => {
    expect(resolveResultsDisclaimer(undefined)).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it('returns the constant when the field is null', () => {
    expect(resolveResultsDisclaimer(null)).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it('returns the constant when the field is an empty string', () => {
    expect(resolveResultsDisclaimer('')).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it('treats whitespace-only values as empty', () => {
    // An operator who clears the field by selecting-all and typing a space
    // must not be able to blank the disclaimer.
    expect(resolveResultsDisclaimer(' ')).toBe(RESULTS_DISCLAIMER_DEFAULT)
    expect(resolveResultsDisclaimer('   ')).toBe(RESULTS_DISCLAIMER_DEFAULT)
    expect(resolveResultsDisclaimer('\n')).toBe(RESULTS_DISCLAIMER_DEFAULT)
    expect(resolveResultsDisclaimer('\t')).toBe(RESULTS_DISCLAIMER_DEFAULT)
    expect(resolveResultsDisclaimer(' \n\t ')).toBe(RESULTS_DISCLAIMER_DEFAULT)
  })

  it('never returns an empty string for any falsy-ish input', () => {
    const inputs = [undefined, null, '', ' ', '\n', '\t\t']
    for (const input of inputs) {
      expect(resolveResultsDisclaimer(input).length).toBeGreaterThan(0)
    }
  })
})

describe('resolveResultsDisclaimer — the Studio field overrides wording', () => {
  it('returns an operator-supplied override verbatim', () => {
    const custom = 'Prior results do not predict a similar outcome. NY Rule 7.1(e)(3).'
    expect(resolveResultsDisclaimer(custom)).toBe(custom)
  })

  it('preserves internal whitespace while trimming the ends', () => {
    expect(resolveResultsDisclaimer('  Past results vary.  ')).toBe('Past results vary.')
    expect(resolveResultsDisclaimer('Line one.\nLine two.')).toBe('Line one.\nLine two.')
  })
})

describe('RESULTS_DISCLAIMER_DEFAULT — the compliance floor', () => {
  it('is a non-empty string', () => {
    expect(typeof RESULTS_DISCLAIMER_DEFAULT).toBe('string')
    expect(RESULTS_DISCLAIMER_DEFAULT.trim().length).toBeGreaterThan(0)
  })

  it('carries the substance BI-Content requires — past results do not guarantee outcomes', () => {
    // BI-Content → Bar Advertising Compliance → Universal Restrictions:
    // "always pair with 'past results do not guarantee future outcomes' or
    // equivalent disclaimer when referencing case results".
    expect(RESULTS_DISCLAIMER_DEFAULT.toLowerCase()).toContain('past results')
    expect(RESULTS_DISCLAIMER_DEFAULT.toLowerCase()).toContain('do not guarantee')
  })
})

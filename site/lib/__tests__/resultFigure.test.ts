import {describe, expect, it} from 'vitest'
import {isResultFigure} from '../resultFigure'
import cases from './fixtures/result-figure-cases.json'

// Monorepo [R-720] (Justin, 2026-10-14: "only when a number is a result"): a number row shows the results disclaimer
// only when one of its numbers is a past result. The test is the platform's own (BE/_shared/claim_patterns.py,
// is_result_figure), ported; the case file is shared and the monorepo keeps its copy byte-equal to this one.
describe('isResultFigure, the platform detector ported', () => {
  it.each(cases.cases.map((c) => [c.text, c.result] as const))('%s -> %s', (text, result) => {
    expect(isResultFigure(text)).toBe(result)
  })

  it('reads nothing into an empty or missing text', () => {
    expect(isResultFigure('')).toBe(false)
    expect(isResultFigure(null)).toBe(false)
    expect(isResultFigure(undefined)).toBe(false)
  })
})

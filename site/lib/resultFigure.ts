// ─── Does a number read as a past result? ─────────────────────────────────────
//
// Monorepo [R-720] (Justin, 2026-10-14: "only when a number is a result"): a content
// section's number row, or its proof number, shows the results disclaimer only when
// one of its numbers states a past result (money, wins, verdicts, settlements);
// "500+ families" or "25 years" is not one. Case results themselves always carry it.
//
// A PORT, NOT A NEW RULE: the platform's composer gates already read a number this
// way (`BE/_shared/claim_patterns.py`, `is_result_figure`), and the two must agree, or
// a gate would pass a figure the page shows undisclaimed. The cases both sides assert
// are one file, `lib/__tests__/fixtures/result-figure-cases.json`, which the monorepo
// keeps byte-equal.
//
// Money with a unit, or of 1,000 or more, is a result; a percentage beside a result
// word is one; and a result word beside any digit is one.

const RESULT_MONEY = /\$\s?(\d[\d,]*(?:\.\d+)?)\s*(million|billion|mil|m|k)?\b/gi
const RESULT_WORDS = /\b(recover(?:ed|y|ies)|verdicts?|settlements?|won|awarded|acquitt\w*|dismiss\w*|success rate|win rate)\b/i
const PERCENT = /\b\d{1,3}(?:\.\d+)?\s*%/

export function isResultFigure(text: string | null | undefined): boolean {
  if (!text) return false
  for (const m of text.matchAll(RESULT_MONEY)) {
    const amount = Number((m[1] ?? '').replace(/,/g, '')) || 0
    if (m[2] || amount >= 1000) return true
  }
  if (PERCENT.test(text) && RESULT_WORDS.test(text)) return true
  return RESULT_WORDS.test(text) && /\d/.test(text)
}

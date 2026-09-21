// ─── Whether a paragraph may take a drop cap (Phase 16D, `[R-493]`) ──────────
//
// `::first-letter` draws the cap, so nothing enters the DOM and a screen reader reads
// the word whole. What CSS cannot express is WHICH paragraphs may have one:
// `::first-letter` takes any leading punctuation with the letter, so a paragraph
// opening with a quotation mark, a bracket or a digit renders a 52px two-character
// cap. Measured in the challenge on four realistic openings, including a resolved
// phone token that begins `(5`.
//
// So the component decides and the stylesheet has one rule. The decision is this
// function, which is pure and tested.

type ProseBlock = {_type?: string; children?: {text?: string}[]}

/** The first visible character of the first text block, or '' when there is none. */
export function firstProseCharacter(body: unknown): string {
  if (!Array.isArray(body)) return ''
  const first = body.find((b) => (b as ProseBlock)?._type === 'block') as ProseBlock | undefined
  const text = (first?.children ?? []).map((c) => c?.text ?? '').join('').trimStart()
  return text.charAt(0)
}

/** True when the first paragraph opens with a letter, which is the only case a
 *  `::first-letter` cap renders correctly. */
export function proseTakesDropCap(body: unknown): boolean {
  return /^\p{L}/u.test(firstProseCharacter(body))
}

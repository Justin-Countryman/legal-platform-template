// The characters `fonts/heading-advances.json` measures, in its order (Phase 17C session 3): printable
// ASCII, then the typographic and accented characters real headings carry, so none of them is guessed
// (ADV-17C3-PRA: a curly quote or a dash read as the widest letter shrank headings that fit, and an em
// dash in Oswald drew 7% wider than guessed). `scripts/ci/heading-advances.mjs` writes the same list into
// the table, and `lib/__tests__/headingFit.test.ts` holds the two equal.
const ASCII = Array.from({length: 95}, (_, i) => String.fromCharCode(32 + i)).join('')
export const HEADING_EXTRA_CHARS = '\u2019\u2018\u201c\u201d\u2013\u2014\u2026\u00e9\u00e8\u00e1\u00e0\u00ed\u00f3\u00fa\u00f1\u00fc\u00f6\u00e7\u00a9\u00ae\u2122\u00b7\u2022\u00a7'
export const HEADING_CHARS = ASCII + HEADING_EXTRA_CHARS

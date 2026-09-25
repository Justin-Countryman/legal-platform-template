import {HEADING_CASE_MAP} from '@/lib/designTokens'
import type {HeadingFace} from '@/lib/headingFace'

// ─── How wide a section heading's words are ───────────────────────────────────
//
// Phase 17C session 3 (`[R-536]`, `[R-544]`; monorepo WS-V1-PHASE17C3-DESIGN §2.1, amended by
// ADV-17C3-A). A section heading keeps its size unless its words would take more lines than the
// rule allows in the column it sits in: three from the stylesheet's `lg`, four under it. Only the
// browser knows the column; only the server knows the words. So the server works out, in em of
// the heading's own size, the narrowest line at which the words fit in three lines and in four,
// wrapped as the browser wraps them (greedy, a break at a space or after a hyphen, never inside a
// word), from the face's own character widths (`fonts/heading-advances.json`, measured from the
// committed files by `scripts/ci/heading-advances.mjs`). The heading carries the two numbers, and
// the CSS sets it at `min(its size, the column over the width)` (`globals.css`, `.heading-fit`).
//
// A count of characters times one average width per face was the first design; on 56 generic
// headings in 22 column layouts it left about 5,000 of 64,000 renders past the rule, and the slack
// that cleared them shrank one heading in eight that already fit (ADV-17C3-A, reproduced). Exact
// widths leave none past it and shrink almost none.
//
// NO TABLE HERE. The face arrives with its own row of widths (`HeadingFace.advances`, attached by the
// server page, `lib/headingAdvances.ts`), because the section components that call this are also
// rendered by a client component, and the table must never reach a browser file.

export type HeadingFit = {
  /** The narrowest line, in em of the heading's size, at which its words fit in three lines. */
  w3: number
  /** The same for four lines (phones and tablets). */
  w4: number
}

const FIRST = 32
type Row = readonly number[]

/** The advance of one character in em; one outside printable ASCII takes the row's widest letter. */
function advance(row: Row, ch: string): number {
  const i = ch.charCodeAt(0) - FIRST
  return i >= 0 && i < row.length ? row[i] : Math.max(row['M'.charCodeAt(0) - FIRST], row['W'.charCodeAt(0) - FIRST])
}

/** The pieces a line may break between: words, and the parts of a hyphenated word (the hyphen
 *  stays with the part before it). `space` says whether a space precedes the piece. */
function pieces(text: string, row: Row, tracking: number): {w: number; space: boolean}[] {
  const out: {w: number; space: boolean}[] = []
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const parts = word.split(/(?<=[-‐–—])/)
    parts.forEach((part, i) => {
      let w = 0
      for (const ch of part) w += advance(row, ch) + tracking
      out.push({w, space: i === 0})
    })
  }
  return out
}

function linesAt(ps: {w: number; space: boolean}[], width: number, space: number): number {
  let lines = 1
  let cur = 0
  for (const p of ps) {
    const add = (cur > 0 && p.space ? space : 0) + p.w
    if (cur > 0 && cur + add > width + 1e-9) {
      lines++
      cur = p.w
    } else {
      cur += add
    }
  }
  return lines
}

/** The narrowest width at which greedy wrapping fits the pieces in `n` lines, never under the
 *  widest piece (a word the browser will not break). */
function narrowest(ps: {w: number; space: boolean}[], n: number, space: number): number {
  let lo = Math.max(...ps.map((p) => p.w))
  let hi = ps.reduce((a, p) => a + p.w, 0) + space * ps.length
  if (linesAt(ps, lo, space) <= n) return lo
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (linesAt(ps, mid, space) <= n) hi = mid
    else lo = mid
  }
  return hi
}

const up = (x: number) => Math.ceil(x * 100) / 100

/** The two widths a section heading carries, or null for an empty heading (which renders as
 *  today, so the rule's `:empty` still hides the line under it) and for a face without its widths.
 *  `text` is the heading as it renders: tokens resolved, the emphasis included. */
export function headingFit(text: string | null | undefined, face: HeadingFace | null | undefined): HeadingFit | null {
  const plain = (text ?? '').trim()
  const row = face?.advances
  if (!plain || !row) return null
  const upper = !!face?.upper
  const tracking = upper ? parseFloat(HEADING_CASE_MAP.upper.tracking) : 0
  const ps = pieces(upper ? plain.toUpperCase() : plain, row, tracking)
  const space = advance(row, ' ') + tracking
  return {w3: up(narrowest(ps, 3, space)), w4: up(narrowest(ps, 4, space))}
}

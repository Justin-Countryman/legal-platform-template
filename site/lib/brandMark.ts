// ─── The firm's mark, drawn large and quiet (Phase 16D, `[R-492]`) ───────────
//
// The study's commonest drawn device is a "ghosted monogram": the firm's mark at
// page scale, very faint, behind one band's content (22 of 65 sites, 4 of 11
// premium). What the platform draws is the firm's INITIALS, set in the site's own
// heading font, and never the uploaded logo mark. Justin ruled it on 2026-09-20
// seeing both rendered on his own homepage.
//
// WHY NOT THE UPLOADED MARK, measured in the Phase 16D challenge. An SVG used as an
// image — a mask, a `background-image`, a `data:` URI — is an isolated document: it
// cannot reach the page's `@font-face` rules, and a render with the page's font
// declared is bit-identical to a render with the font missing. A mark whose letters
// are still live text therefore draws a different typeface for most visitors while
// looking correct on the machine that built it. Fetching it is refused by CORS on
// every live domain, so it would have to be inlined by the server; a logo on a white
// artboard and a knockout logo both mask as a solid rectangle, because `mask-mode`
// resolves to alpha; and the fetch costs three GETs on a cold build. The initials
// cost none of that and are of a piece with the style set's own type.
//
// The initials are DERIVED, never stored, so a theme that turns the ghost on renders
// something on every client from the first build.

// Words that are in most firm names and in none of their monograms: the entity
// suffixes, the articles, the trade words and the practice words. A firm whose whole
// name is these has no monogram, and the ghost then draws NOTHING rather than a pair
// of letters nobody would recognise — which is also what 223 of 229 live law-firm
// homepages do (ADV-16D-B).
const STOP = new Set([
  'the', 'of', 'at', 'and', 'a', 'for',
  'law', 'laws', 'firm', 'firms', 'office', 'offices', 'attorney', 'attorneys',
  'lawyer', 'lawyers', 'legal', 'group', 'associates', 'partners', 'practice',
  'llc', 'pllc', 'llp', 'lp', 'pa', 'pc', 'plc', 'inc', 'co', 'ltd',
  // The practice words, which are as generic in a firm's name as "law" is.
  'injury', 'accident', 'accidents', 'criminal', 'defense', 'defence', 'family',
  'divorce', 'estate', 'estates', 'planning', 'immigration', 'bankruptcy',
  'disability', 'compensation', 'litigation', 'trial', 'trials', 'counsel',
])

/**
 * The firm's initials: the stop words dropped, the first letter of each word that is
 * left, capped at two. "Surname & Surname" gives two letters; "Surname Law Firm"
 * gives one, which is what a one-name firm's monogram is; a name that is nothing but
 * stop words gives none, and the ghost then draws nothing.
 *
 * Deliberately NOT `initials()` from `AttorneyCardParts`, which takes the first and
 * last words and would read a firm's suffix as a surname.
 */
export function firmInitials(firmName: string | null | undefined): string {
  const words = String(firmName ?? '').replace(/&/g, ' ').split(/[\s,.\-|/]+/).filter(Boolean)
  const kept = words.filter((w) => !STOP.has(w.toLowerCase().replace(/[^a-z]/g, '')))
  const letters = kept.map((w) => w.match(/\p{L}/u)?.[0] ?? '').filter(Boolean)
  return letters.slice(0, 2).join('').toUpperCase()
}

/** What the ghost draws, or null when there is nothing to draw. */
export type GhostSource = {text: string}

export function ghostSource(firmName: string | null | undefined, on: boolean): GhostSource | null {
  if (!on) return null
  const text = firmInitials(firmName)
  return text ? {text} : null
}

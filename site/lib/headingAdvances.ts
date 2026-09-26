import ADVANCES from '@/fonts/heading-advances.json'
import {headingFaceOf, type HeadingFace} from '@/lib/headingFace'
import {HEADING_CHARS} from '@/lib/headingChars'
import {siteLookOf, type SiteLook} from '@/components/sections/sectionFrame'

// ─── The width table, read where a page is built on the server ────────────────
//
// Phase 17C session 3 (`[R-536]`, `[R-544]`; monorepo WS-V1-PHASE17C3-DESIGN §2.1). A section heading's
// fit (`lib/headingFit.ts`) needs the character widths of the face the page wears. The table of every
// face (`fonts/heading-advances.json`, 24 KB) is read HERE and nowhere else, and each page hands its
// sections only its own face's row, through the site look. The section components themselves are also
// rendered by a client component (the Design Studio's catalog), so anything they import reaches a
// browser file: `scripts/ci/check-preview-not-shipped.mjs` refuses the table there. Import this module
// only from server entry points: the homepage body, the page routes.

type Row = readonly number[]
const TABLE = ADVANCES.pairings as unknown as Record<string, Record<string, Row>>

/** Each character's widest advance over every shipped face and weight: an uploaded or unknown heading
 *  font is fitted as if it were the widest, so it shrinks early, never late. */
const WIDEST: Row = Array.from({length: HEADING_CHARS.length}, (_, i) =>
  Math.max(...Object.values(TABLE).flatMap((byWeight) => Object.values(byWeight).map((row) => row[i]))))

/** The face with its row of widths: the pairing's at the drawn weight, else the widest. */
export function withAdvances(face: HeadingFace): HeadingFace {
  const row = face.pairing != null ? TABLE[String(face.pairing)]?.[face.weight] : undefined
  return {...face, advances: row ?? WIDEST}
}

/** The face a page's section headings are fitted in, read from its projected Design Settings. */
export function headingFaceWithAdvances(d: Record<string, unknown> | null | undefined): HeadingFace {
  return withAdvances(headingFaceOf(d))
}

/** The site look a page hands its sections, with the heading face's widths. */
export function siteLookWithHeadingFace(d: Record<string, unknown> | null | undefined): SiteLook {
  return {...siteLookOf(d), headingFace: headingFaceWithAdvances(d)}
}

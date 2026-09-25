import {drawableWeight, getPresetById, headingWeights} from '@/fonts/presets'

// ─── The face a section heading draws in ──────────────────────────────────────
//
// Phase 17C session 3 (`[R-536]`, `[R-544]`; monorepo WS-V1-PHASE17C3-DESIGN §2.1). A section
// heading is set smaller only when its words would take more lines than the rule allows in its
// column, so the server must know how wide the words are in the face the page wears. This is
// that face, read from the projected Design Settings the way the shell reads it: the pairing,
// the weight a section heading draws in it, and whether the case is capitals. It reaches every
// section through the site look (`siteLookOf`, `seam.site`), so the preview's chosen style set
// reaches it with the rest of the plan. Small and table-free: the widths are attached where a page is
// built on the server (`lib/headingAdvances.ts`).

export type HeadingFace = {
  /** `fontPairingPreset`: the pairing whose heading the page declares; null where the page wears
   *  none (an upload, or nothing), which the fit reads as the widest shipped face. */
  pairing: number | null
  /** The weight a section heading draws in that face, as the table keys it. */
  weight: string
  /** The site sets its section headings in capitals (`headingCase: 'upper'`). */
  upper: boolean
  /** The face's character widths in em, printable ASCII in order: set only by the server page that
   *  builds the site look (`lib/headingAdvances.ts`); without them a heading takes no fit. */
  advances?: readonly number[]
}

/** The weight a section heading draws, as a number the face has: bold is the face's heaviest
 *  at 600 or over (a variable span clamps `font-bold` there); regular its 400, else the nearest
 *  under 600; light, for the width, its 400 too, the wider of light's two (Birch draws 300 only
 *  from 32 px, `globals.css`). A face with one weight draws that one. */
function drawnWeight(weights: readonly string[], kind: string): string {
  const n = weights.map(Number).sort((a, b) => a - b)
  const bold = n.filter((w) => w >= 600)
  const mid = n.filter((w) => w > 300 && w < 600)
  if (kind === 'bold' && bold.length) return String(bold[bold.length - 1])
  if (mid.length) return String(mid.includes(400) ? 400 : mid[0])
  return String(n[n.length - 1])
}

/** The face from the projected Design Settings. A preset wins over an upload, as the loader has
 *  it (`fonts/loader.ts`, `resolvefonts`); with no preset the pairing is null and the case still
 *  counts, since capitals are wider in any face. */
export function headingFaceOf(d: Record<string, unknown> | null | undefined): HeadingFace {
  const pairing = Number(d?.fontPairingPreset)
  const preset = pairing ? getPresetById(pairing) : undefined
  if (!preset) return {pairing: null, weight: '', upper: d?.headingCase === 'upper'}
  const wanted = typeof d?.headingWeight === 'string' ? d.headingWeight : 'bold'
  return {
    pairing,
    weight: drawnWeight(headingWeights(preset), drawableWeight(pairing, wanted)),
    upper: d?.headingCase === 'upper',
  }
}

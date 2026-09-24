import {
  type SectionAppearance,
} from '@/components/sections/SectionShell'
import {type VisibleGround, visibleGround} from '@/lib/sectionSurface'
import {flowOf, saturatedFillOk, darkBudget, type FlowRules, type Host, type CanvasFacts} from '@/lib/flows'
import type {HeroPhoto} from '@/lib/heroGround'

// ─── The seam walk ────────────────────────────────────────────────────────────
//
// Phase 13 (WS-V1-PHASE13-DESIGN §7 amendment 1). Both dispatchers run this over
// their list before rendering anything, and it answers three questions a band
// cannot answer about itself:
//
//   - does it render at all;
//   - does it sit on the same visible ground as the band above it, so the join
//     should carry one padding instead of two;
//   - what ground and what edge did the band above have, so this band can paint
//     that band's bottom edge.
//
// WHY A WALK AND NOT A COMPARISON OF STORED VALUES. Three things defeat the
// record's `i > 0 && visibleGround(prev) === visibleGround(curr)`:
//
// 1. AN INVISIBLE BAND IS NOT A BAND. Eleven components hold sixteen
//    `return null` sites between them — a case-results section with no results,
//    a badges section with no badges, a video section whose embed will not parse.
//    The dispatcher sees a member and a component that renders nothing, so
//    without the walk an empty band becomes the "previous band" and the seam is
//    computed against a ground nobody can see. That is item 312, which is why it
//    is a prerequisite of this phase rather than a tidy-up.
// 2. THE COMPONENT, NOT THE STORED VALUE, OWNS ITS SPACING. A content section
//    with `layout: 'ribbon'` renders `compact` from inside itself when no
//    spacing is stored, and the composer stores none (item 308). Comparing
//    `curr.spacing !== 'compact'` against the stored `undefined` would put a
//    seam on an already-compact band. So each component exports the appearance
//    it will actually use, and the walk reads that.
// 3. AN EDGE FILLS THE JOIN. A band that cut an angled edge into the next one
//    has already closed the gap; halving the padding on top of that crowds the
//    heading.
//
// The shape is deliberately the one `resultsDisclaimer` already uses: a value
// resolved by the dispatcher and handed down as a prop. The site's own look
// (Phase 16B: the photo frame, the card hover and style a style set sets) and
// the THEME (Phase 17B: the flow of the page, `lib/flows.ts`) ride the same
// per-band object, so they reach every section and `SectionShell` without a new
// prop on any of them.
//
// ─── Phase 17B: the ground pass, before everything ────────────────────────────
//
// Until Phase 17B no line of this walk decided a band's GROUND: `visibleGround` read
// the stored surface and an absent one was light, so a fresh build was one run of
// light bands after a dark hero whatever it wore (the audit's central finding). The
// theme fills that gap: `assignGrounds` runs FIRST, over the survivors, and fills
// every band that stores no surface from the theme's budget, its ranked hosts and
// its rhythm, then paints it (the dark ground, the texture, a photo, the fill). A
// band with a stored surface is never assigned; an inset band is never assigned a
// surface either and counts as light to the rhythm (a dark panel on the page ground
// broke the alternation, measured, ADV-17B-A F8). The walk then runs as it always
// did over the assigned grounds, with its inputs read from the theme instead of the
// style set's six retired fields: the divider's shape and placement, the carry, the
// ghost, the raised photo, the gradient, the run's cap.

/** What a section component must export so the walk can see it.
 *
 *  `resolveAppearance` returns the appearance the component WILL render with,
 *  including any default it applies itself. `isEmpty` is true when the component
 *  will render nothing. */
export type FrameResolver<T> = {
  resolveAppearance: (data: T) => SectionAppearance | null | undefined
  isEmpty: (data: T) => boolean
}

/** What the ground pass reads about a member, beside its resolved appearance (Phase 17B).
 *  `stored` is read from the RAW member, because four resolvers answer `light` for an
 *  absent surface and so cannot be the source of "stored" (ADV-17B-A F9). */
export type FlowInputs = {
  /** The member stores a surface of its own. */
  stored?: boolean
  /** The composer's role, or the type and layout (`hostOf`). */
  host?: Host | null
  /** The member carries its own background photo, for the `photo` paint. */
  photo?: boolean
  /** The member is a content section, the one type that offers the saturated fill. */
  content?: boolean
}

/** What the ground pass assigned to a band, or nothing where the band's own surface
 *  stands. `ground` is set only where the pass filled it; `texture` may be true on a
 *  stored dark band too (a treatment on the operator's dark, as the gradient is under
 *  `[R-502]`); `inset` is the `panel` paint filling an absent inset. Texture is never
 *  the surface value, so a stored `pattern` keeps its one meaning under every theme. */
export type Paint = {
  ground?: 'light' | 'tint' | 'dark' | 'saturated' | 'image'
  texture: boolean
  inset?: boolean
  /** The theme's room around a band it filled (`flow.spacing`, Phase 17B session 5). Only
   *  `spacious` is carried; the shell reads it below a stored spacing and a section's own. */
  spacing?: 'spacious'
  /** The window of the hero's photograph this band shows (Phase 17B session 6, `[R-530]`): one
   *  quadrant of the photograph drawn at twice the band's size. Set only with `ground: 'image'`
   *  on a band the theme filled; the shell draws the site look's `heroPhoto` through it. */
  window?: PhotoWindow
}

/** A quadrant of the hero's photograph: `x` 0 is the left half, `y` 0 the top half. */
export type PhotoWindow = {x: 0 | 1; y: 0 | 1}

/** Phase 16E: whether this member can raise a feature photo into the band above.
 *  Only the content section answers true, and only for a `split` layout whose media
 *  renders as an image or a cutout: a video is not raised, and a practice-area band
 *  also has a `split` layout with a different DOM, so the walk asks the member's own
 *  component rather than reading `layout`. */
export type Raisable = {raisesPhoto?: boolean}

/** How far an inset panel rides up over the band above it. */
export type Overlap = 'none' | 'small' | 'large' | 'photo'

/** The site's look, from Design Settings, as the sections read it (Phase 16B,
 *  `[R-468]`): what the style set writes and a section with a value of its own keeps,
 *  plus the THEME (Phase 17B), which the walk reads for every page-level device. */
export type SiteLook = {
  /** The photo frame a feature photo takes when its section stores none. */
  imageFrame: string | null
  /** The practice-area hover a section with no hover of its own takes. */
  cardHover: string | null
  /** The attorney card style a section with no style of its own takes. */
  attorneyCardStyle: string | null
  /** The theme: the flow of the page (`lib/flows.ts`, `[R-509]`). The stored `flow`, the
   *  compat bridge over the six retired fields, or the platform default; null on an
   *  interior page, which takes no page-level device (`[R-472]`). Optional, because a
   *  required member on `SiteLook` puts every test literal that constructs one red. */
  flow?: FlowRules | null
  /** The style set's texture kind, which the theme's `pattern` paint needs (ADV-17B-A F20). */
  patternTexture?: string | null
  /** The palette passes the saturated gate, so a theme may paint the accent fill. */
  saturated?: boolean
  /** The initials the ghost draws (Phase 16D, `[R-492]`), or null when the theme draws
   *  none. Derived from the firm's name, never stored; set by `HomeBody`. */
  ghost?: {text: string} | null
  /** The hero's photograph the `heroPhoto` paint and the `photo` close draw (Phase 17B session 6):
   *  on a live page only the photograph the theme was approved with (`[R-532]`), in the preview
   *  the live one; null wherever there is none. Set by `HomeBody`; interior pages never carry it. */
  heroPhoto?: HeroPhoto | null
  /** The closing call to action renders on this page, so a photo close is a neighbour of the
   *  last band. Set by `HomeBody`; absent reads as shown. */
  closeShown?: boolean
}

/** The site look from the projected Design Settings (`DESIGN_TOKENS_QUERY`). */
export function siteLookOf(d: Record<string, unknown> | null | undefined): SiteLook {
  const s = (k: string) => (typeof d?.[k] === 'string' && d[k] !== '' ? (d[k] as string) : null)
  return {
    imageFrame: s('imageFrame'),
    cardHover: s('cardHover'),
    attorneyCardStyle: s('attorneyCardStyle'),
    flow: flowOf(d),
    patternTexture: s('patternTexture'),
    saturated: saturatedFillOk(d),
    ghost: null,
  }
}

/** Interior pages are always a clean ground and never draw a divider (`[R-472]`): they
 *  keep the cards, frames and carried pieces, not the homepage's grounds, dividers,
 *  texture, ghost, raised photo or gradient, which are all the theme's; so an interior
 *  page carries no theme. The carried pieces DO reach them (`[R-483]`), painted by the
 *  site wrapper, as the drop cap does: they are the UI system's one decision each. */
export function interiorLook(site: SiteLook | null | undefined): SiteLook | null {
  return site ? {...site, flow: null, ghost: null, heroPhoto: null} : null
}

/** A section's own value where it has one; absent and `inherit` follow the site. */
export function followSite<T extends string>(own: T | 'inherit' | null | undefined, site: string | null | undefined): string | null {
  return own && own !== 'inherit' ? own : site ?? null
}

/** Per-band frame props the dispatcher passes into `SectionShell`. */
export type SeamProps = {
  /** The site's look, the same for every band (Phase 16B). */
  site: SiteLook | null
  seamTop: boolean
  previousGround: VisibleGround | null
  /** The overlap of the NEXT band, so this band can keep its content clear of it. */
  nextOverlap: Overlap
  /** The divider this band draws at its top (Phase 16C, `[R-481]`): a cut, painted in the
   *  ground of the band above, or, under the hero, a rise painted in this band's own
   *  ground, which is the only one that is knowable over a photo. */
  divider?: {mode: 'cut'; from: VisibleGround; flip: boolean} | {mode: 'rise'; flip: boolean} | null
  /** This band draws the ghost (Phase 16D). At most one band on a page does. */
  ghost?: boolean
  /** This band raises its feature photo into the band above (Phase 16E). At most one
   *  band on a page does. */
  raisePhoto?: boolean
  /** The ground an INSET band's own `<section>` paints (Phase 16F). Normally an inset
   *  band paints nothing and the page's light ground runs around its panel; where the
   *  band above and the band below both show one strong ground, the panel sits ON that
   *  ground instead, so the run reads as one block of color. Null everywhere else. */
  insetGround?: VisibleGround | null
  /** This band's place in its run of one visible ground (Phase 16F): `index` from 0 and
   *  `length` the run's size, so a gradient can be sliced across the run. A band that
   *  stands alone is a run of one and takes the whole ramp, which is the per-band device
   *  the field study and the live census both record. A run longer than eight starts a
   *  new run at the ninth band (Phase 17B), and a theme whose paint restarts the ramp
   *  per band numbers every band as a run of one. */
  run?: {index: number; length: number}
  /** What the theme's ground pass assigned this band (Phase 17B), or null where the
   *  band's own stored surface stands. The shell reads the ground and the texture. */
  paint?: Paint | null
  /** This band draws the theme's hairline at its top (Phase 17B): a decorative 1px line
   *  at a change of ground or at every join, as the theme says. */
  hairline?: boolean
}

export const NO_SEAM: SeamProps = {site: null, seamTop: false, previousGround: null, nextOverlap: 'none', divider: null, ghost: false, raisePhoto: false, insetGround: null}

/** Overlap applies to an inset panel only (Phase 16A, `[R-475]`): a full-width band
 *  riding over the one above only hid that band's bottom, text included. */
export function overlapOf(appearance: SectionAppearance | null | undefined): Overlap {
  return appearance?.inset ? (appearance.overlapPrevious ?? 'none') : 'none'
}

/** Which grounds an inset panel may sit on. Dark and saturated only: those are the
 *  two the page ground contrasts with, and they are the two a panel reads as a figure
 *  against. A panel on a light run is invisible -- it already sits on light. */
const HOSTS: readonly VisibleGround[] = ['dark', 'saturated']

/**
 * Walk a list of members, dropping the ones that render nothing, and compute the
 * frame props for each survivor.
 *
 * Returns one entry per SURVIVING member, in order, each carrying the member's
 * own index in the original list (so a caller can still key on it) and its seam
 * props. The first survivor always gets `NO_SEAM` — and it is the first
 * SURVIVOR, not the member at index 0, which is also what fixes the first-block
 * motion rule: `HomepageCanvas` tested `i === 0` on the stored index and nulled
 * the empty member afterwards, so an empty section at index 0 handed the first
 * visible band a `ScrollReveal` wrapper, against the rule that file's own
 * comment calls load-bearing.
 */
export function walkFrame<M>(
  members: readonly M[],
  resolve: (member: M) => {appearance: SectionAppearance | null | undefined; empty: boolean} & Raisable & FlowInputs,
  site: SiteLook | null = null,
  hero: VisibleGround | null = null,
): Array<{member: M; index: number; seam: SeamProps}> {
  // The theme (Phase 17B). Null on an interior page, where no page-level device fires.
  const flow = site?.flow ?? null
  // Where a divider goes: the theme's placement (`flow.divider.at`). `intoDark` is
  // `[R-481]`'s law: under the hero, and wherever the page enters a strong ground — dark
  // or saturated. `everyChange` fires at every change of ground. Never into a photo
  // band, or out of one: no site in the study cuts a shape into one (0 of 53 entries;
  // ADV-P16C-B). Tint and light count as one ground, because a tint wedge on white is
  // 1.04:1 and the band would gain its space for nothing.
  const shaped = !!flow && flow.divider.shape !== 'straight' && flow.divider.at !== 'none'
  const alternates = flow?.divider.shape === 'angledAlternating'
  const everyChange = flow?.divider.at === 'everyChange'
  const strong = (g: VisibleGround | null) => g === 'dark' || g === 'saturated'
  const same = (a: VisibleGround | null, b: VisibleGround | null) =>
    a === b || ((a === 'light' || a === 'tint') && (b === 'light' || b === 'tint'))
  let placed = 0
  const out: Array<{member: M; index: number; seam: SeamProps}> = []
  let prevGround: VisibleGround | null = null

  // ─── The adoption pass (Phase 16F) ──────────────────────────────────────────
  // An inset band's `visibleGround` is `light` unconditionally, because the page
  // ground runs around its panel on all four sides. That is right on a light page
  // and wrong inside a run of dark bands: measured on the fixture, it puts 683px of
  // white between two navy bands with a near-white panel floating on it.
  //
  // So BEFORE the walk numbers anything, an inset band bracketed above and below by
  // one strong ground adopts it. It has to be decided here rather than inside the
  // loop, because it needs the band BELOW and the forward walk does not have it --
  // and because everything downstream reads the ground: the seam, the divider (which
  // would otherwise cut a light wedge into an already-dark band), the ghost and the
  // raised photo.
  const survivors = members.map((m, index) => ({m, index, ...resolve(m)})).filter((r) => !r.empty)
  // ─── The ground pass (Phase 17B) ────────────────────────────────────────────
  // Before the adoption pass, because adoption reads the grounds, and the theme is what
  // decides a ground where none is stored.
  const paints = flow ? assignGrounds(survivors, flow, site) : survivors.map(() => null)
  const paintAt = new Map<number, Paint | null>()
  survivors.forEach((r, i) => paintAt.set(r.index, paints[i]))
  const isInset = (r: {appearance: SectionAppearance | null | undefined}, paint: Paint | null) =>
    !!r.appearance?.inset || !!paint?.inset
  const raw = survivors.map((r, i) => (isInset(r, paints[i]) ? 'light' : paints[i]?.ground ?? visibleGround(r.appearance)))
  const adopted: (VisibleGround | null)[] = survivors.map((r, i) => {
    if (!isInset(r, paints[i])) return null
    if (i === 0 || i === survivors.length - 1) return null
    const above = raw[i - 1]
    const below = raw[i + 1]
    return above === below && HOSTS.includes(above) ? above : null
  })
  const groundAt = new Map<number, VisibleGround>()
  const adoptAt = new Map<number, VisibleGround>()
  survivors.forEach((r, i) => {
    groundAt.set(r.index, adopted[i] ?? raw[i])
    if (adopted[i]) adoptAt.set(r.index, adopted[i]!)
  })

  members.forEach((member, index) => {
    const {appearance, empty} = resolve(member)
    // An invisible band leaves the previous ground untouched, so the band after
    // it seams against the last band anyone can actually see.
    if (empty) return

    const paint = paintAt.get(index) ?? null
    const ground = groundAt.get(index) ?? visibleGround(appearance)

    // An overlapping panel takes no top padding from `md`, so a seam would be
    // meaningless; `SectionShell` already resolves that, and asking for both
    // here would be a contradiction rather than a refinement.
    const overlapping = overlapOf(appearance) !== 'none'

    const seam: SeamProps =
      out.length === 0
        ? {...NO_SEAM, site, insetGround: adoptAt.get(index) ?? null, paint}
        : {
            site,
            seamTop: !overlapping && prevGround === ground,
            previousGround: prevGround,
            nextOverlap: 'none',
            insetGround: adoptAt.get(index) ?? null,
            paint,
          }

    // An inset first band takes none: the wedge crossed an overlapping panel to two
    // pixels above its text (ADV-P16C-A).
    let divider: SeamProps['divider'] = null
    const inset = isInset({appearance}, paint)
    if (shaped && out.length === 0 && hero && !inset && ground !== 'image' && !same(hero, ground)) {
      divider = {mode: 'rise', flip: alternates && placed % 2 === 1}
    } else if (shaped && out.length > 0 && prevGround && prevGround !== 'image' && ground !== 'image'
      && (everyChange ? !same(prevGround, ground) : strong(ground) && !strong(prevGround))) {
      divider = {mode: 'cut', from: prevGround, flip: alternates && placed % 2 === 1}
    }
    if (divider) {
      seam.divider = divider
      placed++
    }
    // The hairline (Phase 17B): a decorative line at the top of a band, at a change of
    // ground or at every join, as the theme says. Never on the first band, whose top is
    // the hero's seam.
    if (flow && out.length > 0 && (flow.divider.hairline === 'everyBand' || (flow.divider.hairline === 'atChange' && !same(prevGround, ground)))) {
      seam.hairline = true
    }

    // The backward half: the band above an overlapping panel keeps the panel off
    // its content by growing its own bottom padding by the overlap.
    if (overlapping && out.length > 0) {
      const above = out[out.length - 1]
      above.seam = {...above.seam, nextOverlap: overlapOf(appearance)}
    }

    out.push({member, index, seam})
    prevGround = ground
  })

  // THE GHOST goes on ONE band and no more (Phase 16D, `[R-492]`): the studied sites
  // use a median of one per page and a maximum of four, and a rule that fired on every
  // eligible band would draw ten on a client whose homepage runs ten dark sections.
  //
  // It prefers a DARK band, which is where the study's ghosts sit and where a large
  // quiet mark reads; failing that, the first eligible band. Eligible is every ground
  // whose blend with the texture ink `validateWcag` already sweeps — light, tint, muted
  // and dark — and excludes:
  //   saturated and image, where no swept pair exists (6 of 16 shipped palettes and
  //     8.9% of 5,000 seeded ones fail AA on a saturated band, measured);
  //   a Pattern band, because two decorative layers blend past the one the sweep covers;
  //   an inset panel, which is a card, not a ground.
  // Since Phase 17B the theme says whether the ghost draws (`flow.ghost`), and the site
  // look carries the initials it draws.
  if (site?.ghost && flow?.ghost === 'once') {
    const eligible = out.filter(({member, seam}) => {
      const a = resolve(member).appearance
      const g = groundAt.get(out.find((o) => o.member === member)!.index) ?? visibleGround(a)
      return g !== 'saturated' && g !== 'image' && a?.surface !== 'pattern' && !seam.paint?.texture && !isInset({appearance: a}, seam.paint ?? null)
    })
    const host =
      eligible.find(({index}) => groundAt.get(index) === 'dark') ??
      eligible[0]
    if (host) host.seam = {...host.seam, ghost: true}
  }

  // THE RAISED PHOTO (Phase 16E). One band per page, as the study's sites do: a median
  // of one mid-page overlap and a maximum of two, against two to four eligible bands on
  // an ordinary canvas. Eligible is a content section whose `split` media renders as a
  // photo, that is not the first band (nothing above it), that is not an inset panel
  // (the panel's own `overflow-hidden` cuts the photo dead flat, measured), and whose
  // band above shows a different ground, where light and tint count as one exactly as
  // the divider counts them.
  if (flow?.overlap === 'photo') {
    const eligible: number[] = []
    for (let i = 1; i < out.length; i++) {
      const r = resolve(out[i].member)
      if (!r.raisesPhoto || isInset(r, out[i].seam.paint ?? null)) continue
      const g = groundAt.get(out[i].index) ?? visibleGround(r.appearance)
      const prev = groundAt.get(out[i - 1].index) ?? visibleGround(resolve(out[i - 1].member).appearance)
      if (!same(g, prev)) eligible.push(i)
    }
    // NEAREST THE MIDDLE OF THE LIST, never the first: live, the first ground-change
    // band holds 1 of 35 rising overlaps, and the median normalised position is 0.50
    // with 18 of 35 in the middle third (ADV-16E-B). A tie takes the earlier band.
    const mid = (out.length - 1) / 2
    const pick = eligible.reduce<number | null>(
      (best, i) => (best === null || Math.abs(i - mid) < Math.abs(best - mid) ? i : best), null)
    if (pick !== null) {
      out[pick].seam = {...out[pick].seam, raisePhoto: true}
      out[pick - 1].seam = {...out[pick - 1].seam, nextOverlap: 'photo'}
    }
  }

  // ─── The run pass (Phase 16F) ───────────────────────────────────────────────
  // Number each maximal stretch of survivors sharing one visible ground, AFTER the
  // adoption pass, so an adopted inset band is inside its run rather than breaking it.
  // Phase 17B: the slice is capped at eight, so a longer run starts a new run at the
  // ninth band instead of repeating its last slice (ADV-17B-A F14 measured six flat
  // bands on a thirteen-band run); and a theme whose paint restarts the ramp on every
  // band (`gradientPerBand`, the all-dark page's seam) numbers every band as a run of
  // one.
  const RUN_CAP = 8
  const perBand = flow?.dark.paint === 'gradientPerBand'
  {
    let start = 0
    for (let i = 1; i <= out.length; i++) {
      const same2 = i < out.length && groundAt.get(out[i].index) === groundAt.get(out[start].index)
      if (!same2) {
        if (perBand) {
          for (let k = start; k < i; k++) out[k].seam = {...out[k].seam, run: {index: 0, length: 1}}
        } else {
          for (let chunk = start; chunk < i; chunk += RUN_CAP) {
            const length = Math.min(RUN_CAP, i - chunk)
            for (let k = chunk; k < chunk + length; k++) out[k].seam = {...out[k].seam, run: {index: k - chunk, length}}
          }
        }
        start = i
      }
    }
  }

  return out
}

// ─── The ground pass (Phase 17B, record §2.3) ─────────────────────────────────
//
// One paint per survivor, or null where the band's own surface stands. The theme
// fills only bands that store no surface and are not inset panels; everything else
// is counted, never repainted. The count: the budget is taken against ALL survivors,
// stored dark bands included, so the page's darkness matches the step. Candidates
// are the fillable bands whose host the theme names, in the theme's order. The
// rhythm decides which candidates go dark; the paint decides what a dark band and a
// light band draw, each gated by the data it needs and falling back to the plain
// ground.

type Survivor = {appearance: SectionAppearance | null | undefined} & FlowInputs

/** The bands the hero's photograph may sit behind: text-led ones (record §2.3). */
export const PHOTO_HOSTS: readonly Host[] = ['narrative', 'split', 'testimonials', 'differentiators', 'statement']
/** At most this many windows mid-page, plus the close: a fourth window shows the hero again. */
export const PHOTO_WINDOWS_PER_PAGE = 2

/** The photograph's windows, in the order they are given out: the quadrants farthest from the
 *  hotspot (the subject, which stays in the hero) first, and never the one nearest it; with no
 *  hotspot, the lower quadrants first, where a landscape's detail sits below its horizon. Three:
 *  the close's, then two for the bands. */
export function photoWindows(hotspot: {x: number; y: number} | null | undefined): PhotoWindow[] {
  const quadrants: PhotoWindow[] = [{x: 0, y: 1}, {x: 1, y: 1}, {x: 0, y: 0}, {x: 1, y: 0}]
  if (!hotspot) return quadrants.slice(0, 3)
  const d = (q: PhotoWindow) => Math.hypot(0.25 + q.x / 2 - hotspot.x, 0.25 + q.y / 2 - hotspot.y)
  return [...quadrants].sort((a, b) => d(b) - d(a)).slice(0, 3)
}

export function assignGrounds(
  survivors: readonly Survivor[],
  flow: FlowRules,
  site: Pick<SiteLook, 'patternTexture' | 'saturated' | 'heroPhoto' | 'closeShown'> | null = null,
): (Paint | null)[] {
  const n = survivors.length
  const strongOf = (a: SectionAppearance | null | undefined) => {
    const g = visibleGround(a)
    return g === 'dark' || g === 'saturated' || g === 'image'
  }
  const stored = survivors.map((r) => r.stored ?? !!r.appearance?.surface)
  const inset = survivors.map((r) => !!r.appearance?.inset)
  const fixed = survivors.map((_, i) => stored[i] || inset[i])
  // What counts as dark before the pass: a stored strong ground, and an inset band
  // bracketed by two of them, which `[R-501]` will adopt. An inset the pass BRACKETS by
  // darkening its neighbours adopts too, so the rhythm must see it: `promote` marks it
  // after every take and counts it against the budget, and the run lengths read
  // through an inset to the band beyond it (ADV-17B-2 F1: without this, `pairs` and
  // `alternate` both produced three visible dark bands in a row through adoption).
  const dark = survivors.map((r, i) => stored[i] && !inset[i] && strongOf(r.appearance))
  const promote = () => {
    survivors.forEach((_, i) => {
      if (inset[i] && !dark[i] && i > 0 && i < n - 1 && dark[i - 1] && dark[i + 1]) { dark[i] = true; remaining-- }
    })
  }
  let remaining = 0
  promote()
  remaining = Math.max(0, darkBudget(flow.dark.budget, n) - dark.filter(Boolean).length)
  const rank = (i: number) => flow.dark.hosts.indexOf(survivors[i].host as Host)
  const candidates = survivors.map((_, i) => i).filter((i) => !fixed[i] && rank(i) >= 0)
    .sort((a, b) => rank(a) - rank(b) || a - b)
  const isCandidate = new Set(candidates)
  // The visible dark run on one side of `i` once `i` is dark: a dark band counts, and an
  // inset counts when the band beyond it is dark, because it would then adopt.
  const runFrom = (i: number, step: -1 | 1) => {
    let k = 0
    let j = i + step
    while (j >= 0 && j < n) {
      if (dark[j]) { k++; j += step; continue }
      if (inset[j] && j + step >= 0 && j + step < n && dark[j + step]) { k++; j += step; continue }
      break
    }
    return k
  }
  const runLeft = (i: number) => runFrom(i, -1)
  const runRight = (i: number) => runFrom(i, 1)
  const take = (i: number) => { dark[i] = true; remaining--; promote() }

  switch (flow.dark.rhythm) {
    case 'bookends':
      break
    case 'alternate':
      for (const c of candidates) {
        if (remaining <= 0) break
        if (dark[c] || runLeft(c) > 0 || runRight(c) > 0) continue
        take(c)
      }
      break
    case 'pairs':
      for (const c of candidates) {
        if (remaining <= 0) break
        if (dark[c] || runLeft(c) + 1 + runRight(c) > 2) continue
        take(c)
      }
      break
    case 'runs':
      for (const c of candidates) {
        if (remaining <= 0) break
        if (dark[c]) continue
        take(c)
        // Extend to the neighbours before the next candidate: below first, then above,
        // alternating, as far as fillable hosts run and the budget allows. A stored dark
        // neighbour ends the extension on that side; the visible run continues past it,
        // but the pass never reaches through a band it did not fill.
        let below = c + 1
        let above = c - 1
        while (remaining > 0) {
          const canBelow = below < n && !dark[below] && isCandidate.has(below)
          const canAbove = above >= 0 && !dark[above] && isCandidate.has(above)
          if (!canBelow && !canAbove) break
          if (canBelow) { take(below); below++ }
          if (remaining > 0 && canAbove) { take(above); above-- }
        }
      }
      break
  }

  const texture = !!site?.patternTexture
  const paints: (Paint | null)[] = survivors.map((r, i) => {
    if (fixed[i]) {
      // A stored dark band takes the theme's texture as a treatment (record §2.8); an
      // inset, image or saturated band does not.
      const textured = flow.dark.paint === 'pattern' && texture && stored[i] && !inset[i] && visibleGround(r.appearance) === 'dark'
      return textured ? {texture: true} : null
    }
    if (dark[i]) {
      switch (flow.dark.paint) {
        case 'photo': return {ground: r.photo ? 'image' : 'dark', texture: false}
        case 'pattern': return {ground: 'dark', texture}
        case 'saturated': return {ground: site?.saturated && r.content ? 'saturated' : 'dark', texture: false}
        // The photograph's windows are placed below, over the whole page, because they read both
        // neighbours; every dark band starts on the dark ground.
        default: return {ground: 'dark', texture: false}
      }
    }
    return null
  })
  // Light bands: the theme's light paint, over every fillable band the rhythm left light.
  let wash = 0
  survivors.forEach((r, i) => {
    if (fixed[i]) { wash = 0; return }
    if (dark[i]) { wash = 0; return }
    switch (flow.light.paint) {
      case 'washes':
        paints[i] = {ground: wash % 2 === 1 ? 'tint' : 'light', texture: false}
        wash++
        break
      case 'pattern':
        paints[i] = {ground: 'light', texture}
        break
      case 'panel':
        paints[i] = i > 0 && i < n - 1 && dark[i - 1] && dark[i + 1]
          ? {ground: 'light', texture: false, inset: true}
          : {ground: 'light', texture: false}
        break
      default:
        paints[i] = {ground: 'light', texture: false}
    }
  })
  // THE HERO'S PHOTOGRAPH (Phase 17B session 6, `[R-530]`, record §2.3). A window of it on at
  // most two text-led dark bands the pass filled, never beside another photograph above or
  // below: the photo hero above the first band, an operator's Image band, another window, or the
  // photo close below the last when it renders. One photograph shown more often shows the hero
  // again (ADV-17B6-A); two windows cannot join at a seam without band heights the server does
  // not know, so adjacent photo bands, which the family's sites run as one photograph, are a
  // stated simplification. Text-led, because a grid's cards hide the photograph and a tall grid
  // on a phone magnifies it five to seven times. A band that would put a photograph beside an
  // inset between two strong grounds stays plain, so `[R-501]`'s adoption puts the panel on the
  // run as ruled (ADV-17B6-B). The windows: the close takes the first, the bands the next two.
  if (flow.dark.paint === 'heroPhoto' && site?.heroPhoto) {
    const closePhoto = flow.dark.close === 'photo' && site.closeShown !== false
    const strongAt = (i: number) => i >= 0 && i < n && (dark[i] || strongOf(survivors[i].appearance))
    const photoAt = (i: number): boolean => {
      if (i < 0) return true
      if (i >= n) return closePhoto
      // An operator's photograph counts whether its band is full width or an inset panel
      // (`visibleGround` answers light for an inset, so the surface is read directly; ADV-17B6-2 F3).
      return paints[i]?.ground === 'image' || (stored[i] && survivors[i].appearance?.surface === 'image')
    }
    const bracketsInset = (i: number) =>
      (i - 1 >= 0 && inset[i - 1] && strongAt(i - 2)) || (i + 1 < n && inset[i + 1] && strongAt(i + 2))
    const windows = photoWindows(site.heroPhoto.hotspot)
    let placed = 0
    for (let i = 0; i < n && placed < PHOTO_WINDOWS_PER_PAGE; i++) {
      if (fixed[i] || !dark[i] || !PHOTO_HOSTS.includes(survivors[i].host as Host)) continue
      if (photoAt(i - 1) || photoAt(i + 1) || bracketsInset(i)) continue
      paints[i] = {ground: 'image', texture: false, window: windows[1 + placed]}
      placed++
    }
  }
  // The room around the bands the theme filled (Phase 17B session 5, `[R-525]`): a band
  // whose own surface stands keeps its own room, as it keeps everything else.
  if (flow.spacing === 'spacious') {
    paints.forEach((p, i) => { if (p?.ground && !fixed[i]) paints[i] = {...p, spacing: 'spacious'} })
  }
  return paints
}

/** What the canvas and the site hold, for a theme's needs (`unmetNeeds`). The ribbons are
 *  the ones `flow`'s own pass fills (default: the site look's theme), so two adjacent
 *  ribbons, or a ribbon that stores its own surface, do not count as two (ADV-17B5-B). */
export function canvasFacts(
  survivors: readonly Survivor[],
  site: SiteLook | null | undefined,
  hero: VisibleGround | null = null,
  flow: FlowRules | null | undefined = site?.flow,
): CanvasFacts {
  const paints = flow ? assignGrounds(survivors, flow, site ?? null) : []
  return {
    hosts: [...new Set(survivors.map((r) => r.host).filter((h): h is Host => !!h))],
    photos: survivors.filter((r) => r.photo).length,
    texture: !!site?.patternTexture,
    initials: !!site?.ghost?.text,
    heroPhoto: !!site?.heroPhoto,
    hero,
    ribbonsFilled: survivors.filter((r, i) => r.host === 'ribbon' && (paints[i]?.ground === 'saturated' || paints[i]?.ground === 'dark')).length,
  }
}

import {
  type SectionAppearance,
} from '@/components/sections/SectionShell'
import {type VisibleGround, visibleGround} from '@/lib/sectionSurface'
import {fadeOf, glowGateOf, saturatedFillOk, darkBudget, type FlowRules, type Host, type CanvasFacts, type Close} from '@/lib/flows'
import {siteFlowOf} from '@/lib/backgrounds'
import type {HeroPhoto, SetPhoto} from '@/lib/heroGround'
import type {HeadingFace} from '@/lib/headingFace'
import type {DrawnStrength} from '@/lib/designTokens'

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
  /** The member's split draws a cutout figure, on this side (Phase 17D session 2): Gradient bloom puts its run's glow
   *  behind it. */
  cutout?: 'left' | 'right' | null
  /** The member's cards draw photographs of their own (the practice areas' card photos, Phase 17D): never a run of the
   *  theme's set (Phase 17E). */
  cardPhotos?: boolean
}

/** What the ground pass assigned to a band, or nothing where the band's own surface
 *  stands. `ground` is set only where the pass filled it; `texture` may be true on a
 *  stored dark band too (a treatment on the operator's dark, as the gradient is under
 *  `[R-502]`); `inset` is the `panel` paint filling an absent inset. Texture is never
 *  the surface value, so a stored `pattern` keeps its one meaning under every theme. */
export type Paint = {
  ground?: 'light' | 'tint' | 'dark' | 'saturated' | 'image' | 'wash'
  /** The texture and its strength (Phase 17C session 3, `[R-538]`): none, or the tile drawn quiet or
   *  strong, the theme's `alternate` resolved band by band in page order. */
  texture: false | DrawnStrength
  inset?: boolean
  /** The theme's room around a band it filled (`flow.spacing`, Phase 17B session 5). Only
   *  `spacious` is carried; the shell reads it below a stored spacing and a section's own. */
  spacing?: 'spacious'
  /** The window of the hero's photograph this band shows (Phase 17B session 6, `[R-530]`): one
   *  quadrant of the photograph drawn at twice the band's size. Set only with `ground: 'image'`
   *  on a band the theme filled; the shell draws the site look's `heroPhoto` through it. */
  window?: PhotoWindow
  /** The photograph of the theme's set this band shows (Phase 17E, `[R-573]`): its place in `site.photoSet`, and the
   *  band's place `at` in its run of `length` bands under that one photograph. A run longer than one band is drawn once
   *  by the canvas's wrapper (`HomepageCanvas`), and its bands paint no ground of their own. */
  photo?: {index: number; at: number; length: number}
  /** A photograph of the set faded into this band's own ground (the Background theme's `fade`): its place in
   *  `site.photoSet`, and the band's place `at` in its run of `length` bands under that one photograph. The band's ground
   *  stays what the theme gave it, so the seams, the hairline and the rhythm never see a photograph: on a dark band the
   *  photograph and its scrim fade into the dark ground at the run's head and foot; on a light band it is a ghost, alone
   *  on its band, from the `side` named. Never on a panel. */
  photoFade?: {index: number; at: number; length: number; side?: 'left' | 'right'}
  /** The ground a light panel the theme floats sits on (Phase 17D, `light.paint: 'floating'`): the walk
   *  reads the band as this ground and adopts it wherever the band sits, first and last included. */
  onGround?: 'dark'
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
  /** The palette's dark ground has room to glow (`glowFillOk`, Phase 17D session 2, `[R-557]`), so Gradient bloom may
   *  light its dark runs. */
  glow?: boolean
  /** The initials the ghost draws (Phase 16D, `[R-492]`), or null when the theme draws
   *  none. Derived from the firm's name, never stored; set by `HomeBody`. */
  ghost?: {text: string} | null
  /** The hero's photograph the `heroPhoto` paint and the `photo` close draw (Phase 17B session 6):
   *  on a live page only the photograph the theme was approved with (`[R-532]`), in the preview
   *  the live one; null wherever there is none. Set by `HomeBody`; interior pages never carry it. */
  heroPhoto?: HeroPhoto | null
  /** The theme's set of photographs of one place (Phase 17E, `[R-573]`): approved, qualifying, each once, never the
   *  hero's own (`photoSetOf`). Set by `HomeBody` only beside an approved hero photograph; interior pages never carry it. */
  photoSet?: SetPhoto[] | null
  /** The closing call to action renders on this page, so a photo close is a neighbour of the
   *  last band. Set by `HomeBody`; absent reads as shown. */
  closeShown?: boolean
  /** The close's ground as `closeOf` resolved it beside the footer (Phase 18 session B, `[R-597]`), so the photo set
   *  leaves the close's window only where the close is a photograph. Set by `HomeBody`; absent reads the theme's own. */
  close?: Close | null
  /** What the homepage hero's own band paints where it shows (Phase 18 session B, `heroPaint`): the theme's wash, or
   *  null. The light bands under a wash hero alternate from it, so a wash never touches a wash. Set by `HomeBody`. */
  heroPaint?: 'wash' | null
  /** The side the homepage hero's cutout figure stands on (`heroCutout`; the roster eye of 2026-10-03, `[R-631]`), so
   *  Gradient bloom's glow peaks behind it as it peaks behind a section's figure. Set by `HomeBody`; null without one. */
  heroCutout?: 'left' | 'right' | null
  /** The face a section heading draws in, with its widths (Phase 17C session 3): what a section's
   *  `headingFit` measures its words in. Set by the server page (`siteLookWithHeadingFace`, which
   *  holds the width table); absent, a heading takes no fit. Optional, as `flow` is. */
  headingFace?: HeadingFace | null
}

/** The site look from the projected Design Settings (`DESIGN_TOKENS_QUERY`). */
export function siteLookOf(d: Record<string, unknown> | null | undefined): SiteLook {
  const s = (k: string) => (typeof d?.[k] === 'string' && d[k] !== '' ? (d[k] as string) : null)
  return {
    imageFrame: s('imageFrame'),
    cardHover: s('cardHover'),
    attorneyCardStyle: s('attorneyCardStyle'),
    // The theme with its stored background in place of its own (`lib/backgrounds.ts`), where one is stored.
    flow: siteFlowOf(d),
    patternTexture: s('patternTexture'),
    saturated: saturatedFillOk(d),
    glow: glowGateOf(siteFlowOf(d), d),
    ghost: null,
  }
}

/** Interior pages are always a clean ground and never draw a divider (`[R-472]`): they
 *  keep the cards, frames and carried pieces, not the homepage's grounds, dividers,
 *  texture, ghost, raised photo or gradient, which are all the theme's; so an interior
 *  page carries no theme. The carried pieces DO reach them (`[R-483]`), painted by the
 *  site wrapper, as the drop cap does: they are the UI system's one decision each. */
export function interiorLook(site: SiteLook | null | undefined): SiteLook | null {
  return site ? {...site, flow: null, ghost: null, heroPhoto: null, photoSet: null} : null
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
   *  per band numbers every band as a run of one. Since Phase 17D session 2 the run also
   *  names where Gradient bloom's glow peaks (`peak`, the band carrying a cutout figure,
   *  else the run's middle band) and the side its light comes from (`side`, the figure's). */
  run?: {
    index: number; length: number; peak?: number; side?: 'left' | 'right'
    /** The glow as a light (monorepo WS-PREMIUM-PACKAGE-DESIGN §9.3, `[R-646]`), set only under a background that
     *  positions it: this band carries its group's light, from this side or centered, on its bottom edge where the band
     *  below is not dark (`edge`); and every band of a lit group draws the surround's veil, fading in its first and last
     *  band so the group meets its neighbours on the ground. */
    light?: 'left' | 'right' | 'center'; edge?: boolean; veil?: 'flat' | 'top' | 'bottom'
    /** The light's row where it is not the middle (`[R-648]`): at the band's top or bottom, on that seam where `edge`. */
    row?: 'top' | 'bottom'
  }
  /** What this band draws over a dark ground, from the theme (Phase 17D session 2, `fadeOf`): the bridge's ramp,
   *  Gradient bloom's glow where the palette has room, or nothing. The shell reads it, and draws it only where the band
   *  paints the dark ground. */
  fade?: 'gradient' | 'glow' | null
  /** What the theme's ground pass assigned this band (Phase 17B), or null where the
   *  band's own stored surface stands. The shell reads the ground and the texture. */
  paint?: Paint | null
  /** This band draws the theme's hairline at its top (Phase 17B): a decorative 1px line
   *  at a change of ground or at every join, as the theme says. */
  hairline?: boolean
  /** A ribbon's accent line on each edge where it shares its ground with the band it touches (Phase 17E,
   *  `[R-576]`): the hero above the first band, the close below the last. */
  ribbonEdges?: {top: boolean; bottom: boolean}
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
  return walkPage(members, resolve, site, hero, null).bands
}

/**
 * The walk, with the closing call to action as one more ground (Phase 17D session 2, record §2.4). The close is not a
 * member of the list, but the band above it meets it: an inset last band between a dark run and a dark close is
 * bracketed by one strong ground and adopts it (`[R-501]`), and a run Gradient bloom lights runs on into a dark close.
 * It takes part in the adoption and the run passes only: the close's own seam, and so its padding, are what they were;
 * an inset last band it makes adopt the run takes an adopted band's top padding, halved, under every theme whose close
 * is dark, the default Quiet among them (ADV-17D2-P; pinned by `flowReproduction.test.tsx`'s last-inset canvas).
 * `close` is the close's ground where it renders, else null; the close's own seam comes back beside the bands.
 */
export function walkPage<M>(
  members: readonly M[],
  resolve: (member: M) => {appearance: SectionAppearance | null | undefined; empty: boolean} & Raisable & FlowInputs,
  site: SiteLook | null = null,
  hero: VisibleGround | null = null,
  close: VisibleGround | null = null,
): {bands: Array<{member: M; index: number; seam: SeamProps}>; hero: {run?: SeamProps['run']; fade: SeamProps['fade']}; close: {run?: SeamProps['run']; fade: SeamProps['fade']}; last: VisibleGround | null} {
  // The theme (Phase 17B). Null on an interior page, where no page-level device fires.
  const flow = site?.flow ?? null
  const fade = fadeOf(flow, site?.glow)
  // Where a divider goes: the theme's placement (`flow.divider.at`). `intoDark` is
  // `[R-481]`'s law: under the hero, and wherever the page enters a strong ground — dark
  // or saturated. `everyChange` fires at every change of ground. Never into a photo
  // band, or out of one: no site in the study cuts a shape into one (0 of 53 entries;
  // ADV-P16C-B). Tint and light count as one ground, because a tint wedge on white is
  // 1.04:1 (1.08:1 since the tint reads apart, Phase 18 session D) and the band would gain its space for nothing.
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
  const paints = flow ? assignGrounds(survivors, flow, site, {close, hero}) : survivors.map(() => null)
  const paintAt = new Map<number, Paint | null>()
  survivors.forEach((r, i) => paintAt.set(r.index, paints[i]))
  const isInset = (r: {appearance: SectionAppearance | null | undefined}, paint: Paint | null) =>
    !!r.appearance?.inset || !!paint?.inset
  // A light panel the theme floats on the dark ground reads as that ground (Phase 17D), so a stored
  // inset beside it is bracketed by what the visitor sees (ADV-17D-B: it read light, a white stripe).
  const raw = survivors.map((r, i) => paints[i]?.onGround ?? (isInset(r, paints[i]) ? 'light' : paints[i]?.ground ?? visibleGround(r.appearance)))
  const adopted: (VisibleGround | null)[] = survivors.map((r, i) => {
    if (!isInset(r, paints[i])) return null
    if (paints[i]?.onGround) return paints[i]!.onGround!
    // The last band's ground below is the close's, where it renders (Phase 17D session 2).
    const below = i === survivors.length - 1 ? close : raw[i + 1]
    if (i === 0 || !below) return null
    const above = raw[i - 1]
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
        ? {...NO_SEAM, site, insetGround: adoptAt.get(index) ?? null, paint, ...(fade ? {fade} : {})}
        : {
            site,
            seamTop: !overlapping && prevGround === ground,
            previousGround: prevGround,
            nextOverlap: 'none',
            insetGround: adoptAt.get(index) ?? null,
            paint,
            ...(fade ? {fade} : {}),
          }

    // An inset first band takes none: the wedge crossed an overlapping panel to two
    // pixels above its text (ADV-P16C-A).
    let divider: SeamProps['divider'] = null
    const inset = isInset({appearance}, paint)
    if (shaped && out.length === 0 && hero && !inset && ground !== 'image' && !same(hero, ground)) {
      divider = {mode: 'rise', flip: alternates && placed % 2 === 1}
    } else if (shaped && out.length > 0 && prevGround && prevGround !== 'image' && ground !== 'image'
      // Never into an inset panel, as the rise never is: the panel takes no divider room, so its own
      // ground painted over a steep wedge at 1440 (Phase 17D, ADV-17D-2). `intoDark` never reached one.
      && !inset
      // At every change, the muted step counts as light too: a muted wedge on white is 1.08:1 and would
      // spend the divider's room on nothing (Phase 17D, ADV-17D-B), as a tint one would.
      && (everyChange ? !same(prevGround === 'muted' ? 'light' : prevGround, ground === 'muted' ? 'light' : ground) : strong(ground) && !strong(prevGround))) {
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
      return g !== 'saturated' && g !== 'image' && g !== 'wash' && a?.surface !== 'pattern' && !seam.paint?.texture && !isInset({appearance: a}, seam.paint ?? null)
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
  //
  // Phase 17D session 2: where the theme glows, the close is one more ground at the foot (where it renders), so a run
  // Gradient bloom lights runs on into a dark close; and a run names where the glow peaks, the band carrying a cutout
  // figure, lit from the figure's side, else the run's middle band, lit from the right. Under every other theme the runs
  // are numbered as they were.
  //
  // THE ROSTER EYE OF 2026-10-03 (`[R-631]`), of Gradient bloom: "there is no gradient in the hero to create that
  // continuity after a few sections the gradient stuff just stops". One peak per run left a long run flat past its
  // middle, and the hero stood outside it. So where the theme glows: a dark hero is one more ground at the head (a photo
  // hero is the scrim's, a light one is not lit) and joins the first run as its first band, its own cutout figure the
  // peak where it has one (`site.heroCutout`); and a dark run is lit in stretches of at most `GLOW_RUN_CAP` bands, each
  // with its own peak, the light coming from the right, then the left, in turn down the page, so the glow recurs from
  // the hero to the close instead of stopping. The hero's run comes back beside the close's (`hero`), for `HeroBand`.
  // Light runs under the theme, and every run under every other theme, are numbered as they were.
  const RUN_CAP = 8
  const perBand = flow?.on.dark === 'gradientPerBand'
  const glows = fade === 'glow'
  // The ramp's ends (the Background theme's Gradient, `on.ends`): a dark hero and a dark close join its first and last
  // runs as they join the glow's, so the ramp does not start under the hero and stop above the close. The bridge's ramp
  // names no ends and is numbered as it was.
  const joins = glows || (fade === 'gradient' && !!flow?.on.ends)
  const heroJoins = joins && hero === 'dark'
  const grounds: (VisibleGround | null)[] = [...(heroJoins ? [hero] : []), ...out.map((o) => groundAt.get(o.index) ?? null)]
  const figures: ('left' | 'right' | null)[] = [...(heroJoins ? [site?.heroCutout ?? null] : []), ...out.map((o) => resolve(o.member).cutout ?? null)]
  // The close joins the run only where the theme glows: no other theme draws anything a run's numbering moves.
  const closeJoins = joins && !!close
  if (closeJoins) { grounds.push(close); figures.push(null) }
  const runs: NonNullable<SeamProps['run']>[] = new Array(grounds.length)
  {
    let start = 0
    let stretch = 0
    for (let i = 1; i <= grounds.length; i++) {
      const same2 = i < grounds.length && grounds[i] === grounds[start]
      if (!same2) {
        if (perBand) {
          for (let k = start; k < i; k++) runs[k] = {index: 0, length: 1}
        } else {
          const lights = glows && grounds[start] === 'dark'
          const cap = lights ? GLOW_RUN_CAP : RUN_CAP
          for (let chunk = start; chunk < i; chunk += cap) {
            const length = Math.min(cap, i - chunk)
            let lit: {peak: number; side: 'left' | 'right'} | null = null
            if (lights) {
              lit = {peak: Math.floor(length / 2), side: stretch % 2 === 0 ? 'right' : 'left'}
              for (let k = chunk; k < chunk + length; k++) if (figures[k]) { lit = {peak: k - chunk, side: figures[k]!}; break }
              stretch++
            }
            for (let k = chunk; k < chunk + length; k++) runs[k] = {index: k - chunk, length, ...(lit ?? {})}
          }
        }
        start = i
      }
    }
  }
  const head = heroJoins ? 1 : 0
  // ─── The glow as a light (monorepo WS-PREMIUM-PACKAGE-DESIGN §9.3, `[R-646]`) ─────────────────────────────────
  // Under a background that positions the glow, the run's linear glow gives way to a light: one per dark run, on the band
  // that best carries it (a cut-out figure's, else the tallest kind of band by its host, never a ribbon or an inset
  // panel, the run's middle on a tie), at most `GLOW_LIGHTS_PER_PAGE` a page, the strongest kept; from the figure's side,
  // else alternating, or centered. Every band of a dark run of two or more draws the surround's veil, flat inside and
  // fading in the run's first and last band (the hero's top meets the page, so the hero holds it). Added as keys of
  // their own beside the run's numbering, so Gradient bloom's runs, peaks and sides do not move.
  const shape = glows ? flow?.on.glowShape : undefined
  if (shape) {
    const last = grounds.length - 1
    const rankAt = (k: number): number => {
      if (figures[k]) return 10
      if (heroJoins && k === 0) return 5
      if (closeJoins && k === last) return 3
      const o = out[k - head]
      const r = resolve(o.member)
      if (r.appearance?.inset || o.seam.paint?.inset) return 0
      return r.host ? LIGHT_RANK[r.host] : 3
    }
    const candidates: {k: number; rank: number; start: number; end: number}[] = []
    let s = 0
    for (let i = 1; i <= grounds.length; i++) {
      if (i < grounds.length && grounds[i] === grounds[s]) continue
      if (grounds[s] === 'dark') {
        if (i - s > 1) for (let k = s; k < i; k++) runs[k] = {...runs[k], veil: k === s && !(heroJoins && k === 0) ? 'top' : k === i - 1 ? 'bottom' : 'flat'}
        const mid = (s + i - 1) / 2
        let best = -1
        for (let k = s; k < i; k++) {
          const r = rankAt(k)
          if (r > 0 && (best < 0 || r > rankAt(best) || (r === rankAt(best) && Math.abs(k - mid) < Math.abs(best - mid)))) best = k
        }
        if (best >= 0) candidates.push({k: best, rank: rankAt(best), start: s, end: i - 1})
      }
      s = i
    }
    const chosen = [...candidates].sort((a, b) => b.rank - a.rank || a.k - b.k).slice(0, GLOW_LIGHTS_PER_PAGE).sort((a, b) => a.k - b.k)
    // The position (`[R-648]`, monorepo WS-PREMIUM-PACKAGE-DESIGN §10.2): the row picks the band in each chosen run, its
    // first band that carries a light for the top, its last for the bottom (the automatic corner's row), its best for the
    // middle (the centered light's), the automatic corner a run's cut-out figure where it has one; the column the side, a
    // cut-out figure's band mirrored to the figure. A light stands on
    // its row's seam only where the run meets the page there: a run's first band below a light band (not the hero, whose
    // top meets the header, nor a band drawing a rise, whose wedge would cut it), a run's last band above a light band
    // that draws no cut into it (the close never: the footer may be dark); elsewhere it sits inside its band.
    const at = flow?.on.glowAt
    const row: 'top' | 'middle' | 'bottom' = at ? (at.startsWith('top') ? 'top' : at.startsWith('bottom') ? 'bottom' : 'middle') : shape === 'center' ? 'middle' : 'bottom'
    const column: 'left' | 'right' | 'center' | null = at ? (at === 'left' || at.endsWith('Left') ? 'left' : at === 'right' || at.endsWith('Right') ? 'right' : 'center') : shape === 'center' ? 'center' : null
    const bandAt = (k: number) => (k - head >= 0 && k - head < out.length ? out[k - head] : null)
    let turn = 0
    for (const c of chosen) {
      const carriers = Array.from({length: c.end - c.start + 1}, (_, j) => c.start + j).filter((k) => rankAt(k) > 0)
      // The automatic corner keeps the light behind a run's cut-out figure, as the references draw it.
      const k = !at && figures[c.k] ? c.k : row === 'top' ? carriers[0] : row === 'bottom' ? carriers[carriers.length - 1] : c.k
      const auto = figures[k] ?? (turn++ % 2 === 0 ? 'right' : 'left')
      const side = column === 'center' ? 'center' : column && figures[k] ? figures[k]! : column ?? auto
      const hero = heroJoins && k === 0
      const edge = row === 'top'
        ? k === c.start && !hero && bandAt(k)?.seam.divider?.mode !== 'rise'
        : row === 'bottom'
          ? k === c.end && !(closeJoins && k === last) && bandAt(k + 1)?.seam.divider?.mode !== 'cut'
          : false
      runs[k] = {...runs[k], light: side, ...(row !== 'middle' && !hero ? {row} : {}), ...(edge ? {edge: true} : {})}
    }
  }
  out.forEach((o, k) => { o.seam = {...o.seam, run: runs[k + head]} })
  // ─── A ribbon's edges (Phase 17E, `[R-576]`) ─────────────────────────────────
  // A ribbon on the ground of the band above it (the hero, for the first band) or below it (the close, for the
  // last) reads as that band's last line: its line of display type draws an accent line on that edge, so it
  // reads as a strip. A ribbon on a ground of its own draws none (Ribbon rhythm's filled strips), nor a panel,
  // which floats on its gutter. A theme that draws its hairline at every band has drawn it at every join inside
  // the page, but never at the hero's or the close's (the pre-PR break pass: Type on black left both ribbons
  // joined to them), so there only those two edges are the ribbon's. Since the roster eye of 2026-10-03
  // (`[R-631]`) only Editorial draws at every band: Type on black's line draws at a change alone, so its ribbons
  // in the dark run line both edges, the ribbon's own lines, not the seam's. On an interior page no theme runs.
  if (flow) {
    const everyBand = flow.divider.hairline === 'everyBand'
    out.forEach((o, k) => {
      const r = resolve(o.member)
      if (r.host !== 'ribbon' || r.appearance?.inset || o.seam.paint?.inset) return
      const g = groundAt.get(o.index) ?? null
      const above = k === 0 ? hero : everyBand ? null : groundAt.get(out[k - 1].index) ?? null
      const below = k === out.length - 1 ? close : everyBand ? null : groundAt.get(out[k + 1].index) ?? null
      const top = !!g && !!above && same(above, g)
      const bottom = !!g && !!below && same(below, g)
      if (top || bottom) o.seam = {...o.seam, ribbonEdges: {top, bottom}}
    })
  }

  // The ground the close meets (Phase 18 session B): the last band's as the visitor sees it, for `closeOf`.
  const last = out.length ? (groundAt.get(out[out.length - 1].index) ?? visibleGround(resolve(out[out.length - 1].member).appearance)) : null
  return {bands: out, hero: {...(heroJoins ? {run: runs[0]} : {}), fade}, close: {...(closeJoins ? {run: runs[grounds.length - 1]} : {}), fade}, last}
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

/** A dark run Gradient bloom lights is lit in stretches of at most this many bands, each with its own peak (the roster
 *  eye of 2026-10-03, `[R-631]`): the glow in and out over three bands, as the study's pages draw several glows down a
 *  page, so a long run never goes flat past one middle. */
export const GLOW_RUN_CAP = 3
/** At most this many lights a page under a background that positions the glow (§9.3, `[R-646]`): Nguyen & Malik draws
 *  three, each by a figure or a section of its own. */
export const GLOW_LIGHTS_PER_PAGE = 3
/** How well a band carries the glow's light, by its host (§9.3: the platform's own band heights at 1440, from
 *  `flow-metrics.json`): attorneys tallest; a ribbon (136 to 312 px) never. A band with no host ranks as a text band. */
export const LIGHT_RANK: Record<Host, number> = {
  attorneys: 6, testimonials: 4, areas: 4, caseResults: 4, video: 4, reviews: 4, split: 4, differentiators: 4,
  narrative: 3, statement: 3, statRow: 3, badges: 1, ribbon: 0,
}
/** The bands the hero's photograph may sit behind: text-led ones (record §2.3). */
export const PHOTO_HOSTS: readonly Host[] = ['narrative', 'split', 'testimonials', 'differentiators', 'statement']
/** At most this many windows mid-page, plus the close: a fourth window shows the hero again. */
export const PHOTO_WINDOWS_PER_PAGE = 2
/** A run under one photograph of the theme's set is at most this many bands (Phase 17E): the evidence's runs are 991 to
 *  1,879 px at 1440, most often three bands (ADV-17E-A); on a phone the photograph is drawn at the run's head. */
export const SET_RUN_MAX = 3
/** The grids a run of the set may take in beside a text-led band: the practice areas, whose tiles let the photograph
 *  show; never the attorneys or case results, whose opaque cards hide it (ADV-17E-B). */
export const SET_RUN_GRIDS: readonly Host[] = ['areas']

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
  site: Pick<SiteLook, 'patternTexture' | 'saturated' | 'heroPhoto' | 'closeShown' | 'photoSet' | 'close' | 'heroPaint'> | null = null,
  ends: {close?: VisibleGround | null; hero?: VisibleGround | null} = {},
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
    case 'spread': {
      // Soft wash's second step (Phase 18 session E, monorepo `[R-598]`, WS-V1-PHASE18E-DESIGN §9.3): the dark ground
      // spread down a light page so it recurs, never gathered at one end. The positioning line under a light hero goes
      // dark outside the budget; under a dark or photo hero the first band sits out, since a dark band there only
      // lengthens the hero. The budget's bands then split the bands below into equal stretches, and in each the host
      // nearest the stretch's middle goes dark, its rank breaking a tie; a stretch already holding a strong band takes
      // none. Never two dark together: the dark close counts as the band after the last, and an inset beside a band
      // counts as dark where the band beyond it is, because it would adopt that ground (`[R-501]`, `[R-570]`).
      const h = ends.hero ?? null
      const heroLight = h === 'light' || h === 'tint' || h === 'wash' || h === 'muted'
      const c = ends.close ?? null
      const closeStrong = c === 'dark' || c === 'saturated' || c === 'image'
      const strongAt = (j: number) => (j === n ? closeStrong : j >= 0 && j < n && dark[j])
      const besideDark = (i: number) => ([-1, 1] as const).some((d) => strongAt(i + d) || (i + d >= 0 && i + d < n && inset[i + d] && strongAt(i + 2 * d)))
      const fillable = (i: number) => !fixed[i] && !dark[i] && rank(i) >= 0 && !besideDark(i)
      let start = 0
      if (n > 0 && !heroLight) start = 1
      else if (n > 0 && survivors[0].host === 'ribbon' && fillable(0)) { take(0); start = 1 }
      const m = n - start
      const k = darkBudget(flow.dark.budget, m)
      for (let j = 0; j < k; j++) {
        const from = start + Math.floor((j * m) / k)
        const to = start + Math.floor(((j + 1) * m) / k)
        if (dark.slice(from, to).some(Boolean)) continue
        const mid = (from + to - 1) / 2
        const pick = Array.from({length: to - from}, (_, t) => from + t).filter(fillable)
          .sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid) || rank(x) - rank(y) || x - y)[0]
        if (pick !== undefined) take(pick)
      }
      break
    }
  }

  const texture = !!site?.patternTexture
  const paints: (Paint | null)[] = survivors.map((r, i) => {
    if (fixed[i]) {
      // A stored dark band takes the theme's texture as a treatment (record §2.8); an
      // inset, image or saturated band does not.
      const textured = flow.on.dark === 'pattern' && texture && stored[i] && !inset[i] && visibleGround(r.appearance) === 'dark'
      return textured ? {texture: 'quiet'} : null
    }
    if (dark[i]) {
      // How it sits (the Layout theme's): a panel on the page's light ground (Phase 17D), which the walk reads as light
      // and nothing is drawn on (a background never draws inside a panel).
      if (flow.dark.sit === 'floating') return {ground: 'dark', texture: false, inset: true}
      // Its ground (the Flow theme's): the accent fill where the palette and the band allow it, on which nothing sits
      // (no pair is swept there), else the dark ground.
      if (flow.dark.ground === 'saturated' && site?.saturated && r.content) return {ground: 'saturated', texture: false}
      // What sits on the dark ground (the Background theme's).
      switch (flow.on.dark) {
        case 'photo': return {ground: r.photo ? 'image' : 'dark', texture: false}
        case 'pattern': return {ground: 'dark', texture: texture ? 'quiet' : false}
        // The photographs are placed below, over the whole page, because they read both
        // neighbours; every dark band starts on the dark ground.
        default: return {ground: 'dark', texture: false}
      }
    }
    return null
  })
  // Light bands: the theme's light paint, over every fillable band the rhythm left light.
  // `washes` (Phase 17D, `[R-551]`): the light ground and the wash in turn, counted up from the foot of
  // each light stretch, so the band before the close, a stored band or a dark one is light and a wash
  // close never meets a wash band (ADV-17D-B, -C). It alternated light and a tint nobody saw (ΔE 1.0).
  const fromFoot: number[] = new Array(n).fill(0)
  for (let i = n - 1, k = 0; i >= 0; i--) {
    if (fixed[i] || dark[i]) { k = 0; continue }
    fromFoot[i] = k++
  }
  // Phase 18 session B (`[R-603]`): under a hero that paints the wash, the stretch that touches it counts from the top,
  // so the band under the hero is light; where that stretch runs on into a wash close with an even count, its last band
  // stays light too: the double light it forces sits at the foot, never under the hero. A wash never touches a wash.
  let topEnd = 0
  if (site?.heroPaint === 'wash') while (topEnd < n && !fixed[topEnd] && !dark[topEnd]) topEnd++
  const washAt = (i: number) => {
    if (i >= topEnd) return fromFoot[i] % 2 === 1
    return i % 2 === 1 && !(i === n - 1 && ends.close === 'wash')
  }
  survivors.forEach((r, i) => {
    if (fixed[i]) return
    if (dark[i]) return
    // How it sits (the Layout theme's): a panel on the dark ground, wherever the band sits (Phase 17D); or, inside a
    // dark run, an inset panel that adopts the run. Nothing is drawn inside a panel.
    if (flow.light.sit === 'floating') {
      paints[i] = {ground: 'light', texture: false, inset: true, onGround: 'dark'}
      return
    }
    if (flow.light.sit === 'panel' && i > 0 && i < n - 1 && dark[i - 1] && dark[i + 1]) {
      paints[i] = {ground: 'light', texture: false, inset: true}
      return
    }
    // Its ground (the Flow theme's), then what sits on it (the Background theme's): the texture on the light ground
    // only, since the wash is already the darkest light ground the texture's ink may reach.
    const ground = flow.light.ground === 'washes' && washAt(i) ? 'wash' : 'light'
    paints[i] = {ground, texture: flow.on.light === 'pattern' && ground === 'light' && texture ? 'quiet' : false}
  })
  // A FEW (the Background theme's `lightEvery: 'few'`; Justin of Quiet, 2026-10-03: "one or two light bands take a
  // texture or pattern to break it up while keeping the colors the same"): of the light bands the pass textured, one in
  // three keeps it, the second, then the fifth, two at most; a page with one keeps that one.
  if (flow.on.light === 'pattern' && flow.on.lightEvery === 'few') {
    const textured = survivors.map((_, i) => i).filter((i) => !fixed[i] && !dark[i] && paints[i]?.texture)
    const keep = new Set(textured.length < 2 ? textured : textured.filter((_, k) => k % 3 === 1).slice(0, 2))
    textured.forEach((i) => { if (!keep.has(i)) paints[i] = {...paints[i]!, texture: false} })
  }
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
  // THE SET (Phase 17E, `[R-573]`, record WS-V1-PHASE17E-DESIGN §2.3). Beside an approved hero photograph only, so the
  // hero stays the page's first and largest photograph (a set photograph under a hero with none became the phone's
  // largest paint, measured). The close takes the set's first photograph; runs of one to three dark bands the pass
  // filled take the rest in page order, one photograph a run, never beside another photograph; a run is text-led
  // bands, and the practice areas when the run has a text-led band and their cards carry no photographs of their own.
  // Every photograph once: fewer photographs than places leave the later places plain. A set that can place nothing
  // (the close hidden, no run) gives way to the windows below.
  let setPlaced = 0
  const closeWord = site?.close ?? (flow.on.close === 'photo' ? 'photo' : flow.dark.close)
  if (flow.on.dark === 'span' && site?.heroPhoto && site.photoSet?.length) {
    const set = site.photoSet
    const closePhoto = closeWord === 'photo' && site.closeShown !== false
    const strongAt = (i: number) => i >= 0 && i < n && (dark[i] || strongOf(survivors[i].appearance))
    const photoAt = (i: number): boolean => {
      if (i < 0) return true
      if (i >= n) return closePhoto
      return paints[i]?.ground === 'image' || (stored[i] && survivors[i].appearance?.surface === 'image')
    }
    const bracketsInset = (i: number) =>
      (i - 1 >= 0 && inset[i - 1] && strongAt(i - 2)) || (i + 1 < n && inset[i + 1] && strongAt(i + 2))
    const textLed = (i: number) => PHOTO_HOSTS.includes(survivors[i].host as Host)
    const eligible = (i: number) => i >= 0 && i < n && !fixed[i] && dark[i] && !bracketsInset(i)
      && (textLed(i) || (SET_RUN_GRIDS.includes(survivors[i].host as Host) && !survivors[i].cardPhotos))
    let next = closePhoto ? 1 : 0
    setPlaced = closePhoto ? 1 : 0
    for (let i = 0; i < n && next < set.length; i++) {
      if (!eligible(i) || photoAt(i - 1)) continue
      const run = [i]
      while (run.length < SET_RUN_MAX && eligible(i + run.length)) run.push(i + run.length)
      while (run.length && photoAt(run[run.length - 1] + 1)) run.pop()
      // A run shows its photograph behind a text band: a grid alone would spend a photograph on the gutters.
      while (run.length && !run.some(textLed)) run.pop()
      if (!run.length) continue
      run.forEach((k, at) => { paints[k] = {ground: 'image', texture: false, photo: {index: next, at, length: run.length}} })
      next++
      setPlaced++
      i = run[run.length - 1]
    }
  }
  if (setPlaced === 0 && (flow.on.dark === 'span' || flow.on.dark === 'windows') && site?.heroPhoto) {
    const closePhoto = closeWord === 'photo' && site.closeShown !== false
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
  // FAINT PHOTOGRAPHS (the Background theme's `fade`; monorepo WS-V1-BACKGROUND-THEME-DESIGN §7 items 5, 8, 9). Beside an
  // approved hero photograph only, as the set always is. The close takes the set's first photograph where it is a
  // photograph (`closeOf`); the rest go down the page IN TURN, repeating, since a faint photograph is a ground, not a
  // picture shown once (Justin of Type on black, 2026-10-03: "faint BG images to break up things. Some bg images are
  // across multiple bands"). Behind every stretch of dark bands the pass filled, in runs of at most `SET_RUN_MAX`, each
  // run one photograph fading into the dark ground at its head and foot; and ghosted into every second light or wash
  // band that is text-led, from the right, then the left. Never a panel, a textured band, a band whose cards draw their
  // own photographs, or a band beside a photograph that keeps its hard edge (the photo hero, an operator's Image band).
  if ((flow.on.dark === 'fade' || flow.on.light === 'fade') && site?.heroPhoto && site.photoSet?.length) {
    const set = site.photoSet
    const closePhoto = closeWord === 'photo' && site.closeShown !== false
    let next = closePhoto && set.length > 1 ? 1 : 0
    const take = () => { const k = next % set.length; next++; return k }
    const hard = (i: number): boolean => (i < 0 ? ends.hero === 'image' : i < n && stored[i] && survivors[i].appearance?.surface === 'image')
    const free = (i: number) => i >= 0 && i < n && !fixed[i] && !paints[i]?.inset && !paints[i]?.texture && !survivors[i].cardPhotos && !hard(i - 1) && !hard(i + 1)
    if (flow.on.dark === 'fade') {
      for (let i = 0; i < n; i++) {
        if (!free(i) || !dark[i] || paints[i]?.ground !== 'dark') continue
        const run = [i]
        while (run.length < SET_RUN_MAX && free(i + run.length) && dark[i + run.length] && paints[i + run.length]?.ground === 'dark') run.push(i + run.length)
        const index = take()
        run.forEach((k, at) => { paints[k] = {...paints[k]!, photoFade: {index, at, length: run.length}} })
        i = run[run.length - 1]
      }
    }
    if (flow.on.light === 'fade') {
      let ghosts = 0
      let last = -2
      for (let i = 0; i < n; i++) {
        const g = paints[i]?.ground
        if (!free(i) || dark[i] || (g !== 'light' && g !== 'wash') || !PHOTO_HOSTS.includes(survivors[i].host as Host) || i - last < 2) continue
        paints[i] = {...paints[i]!, photoFade: {index: take(), at: 0, length: 1, side: ghosts % 2 === 0 ? 'right' : 'left'}}
        ghosts++
        last = i
      }
    }
  }
  // THE STRENGTH (Phase 17C session 3, `[R-538]`). Every band the pass textured was marked `quiet`
  // above; here the theme's word for its dark and light paints resolves: `strong` everywhere, or
  // `alternate`, the bands that paint textures in page order quiet, strong, quiet (a stored dark band the
  // theme textures counts in the order). A stored Pattern band is not the pass's and stays quiet.
  const strengthOf = (word: FlowRules['on']['darkTexture'], n: number): DrawnStrength =>
    word === 'strong' ? 'strong' : word === 'alternate' && n % 2 === 1 ? 'strong' : 'quiet'
  let darkN = 0
  let lightN = 0
  paints.forEach((p, i) => {
    if (!p?.texture) return
    const lightBand = p.ground === 'light' && !fixed[i]
    const word = lightBand ? flow.on.lightTexture : flow.on.darkTexture
    paints[i] = {...p, texture: strengthOf(word, lightBand ? lightN++ : darkN++)}
  })
  // The room around the bands the theme filled (Phase 17B session 5, `[R-525]`): a band
  // whose own surface stands keeps its own room, as it keeps everything else.
  if (flow.spacing === 'spacious') {
    paints.forEach((p, i) => { if (p?.ground && !fixed[i]) paints[i] = {...p, spacing: 'spacious'} })
  }
  return paints
}

/** The closing call to action's surface and seam under the theme's close (`closeOf`): a photo close
 *  is an Image section showing the photograph's first window (`[R-531]`); a wash close is painted as the
 *  theme paints a band (Soft wash, `[R-551]`), because the close's own appearance is the stored type;
 *  every other close is its surface alone. `HomeBody` renders what this returns. */
export function closeFrame(
  close: Close,
  site: SiteLook,
  walked?: {run?: SeamProps['run']; fade: SeamProps['fade']},
): {surface: 'dark' | 'saturated' | 'muted' | 'image' | 'light'; seam?: SeamProps} {
  // The set's first photograph where the theme has one (Phase 17E), else the hero's first window.
  if (close === 'photo' && site.heroPhoto && site.photoSet?.length) {
    return {surface: 'image', seam: {...NO_SEAM, site, paint: {ground: 'image', texture: false, photo: {index: 0, at: 0, length: 1}}}}
  }
  if (close === 'photo') {
    return {surface: 'image', seam: site.heroPhoto ? {...NO_SEAM, site, paint: {ground: 'image', texture: false, window: photoWindows(site.heroPhoto.hotspot)[0]}} : undefined}
  }
  if (close === 'wash') return {surface: 'light', seam: {...NO_SEAM, paint: {ground: 'wash', texture: false}}}
  // A dark close Gradient bloom lights (Phase 17D session 2): its place in the run above it, from the walk. Every other
  // close is its surface alone, as it was.
  // The texture on a dark close, where the background puts its pattern there and the style set has one.
  const texture = close === 'dark' && site.flow?.on.close === 'pattern' && site.patternTexture
    ? {paint: {ground: 'dark' as const, texture: site.flow.on.darkTexture === 'strong' ? 'strong' as const : 'quiet' as const}} : null
  if (close === 'dark' && walked?.fade && walked.run) return {surface: 'dark', seam: {...NO_SEAM, site, run: walked.run, fade: walked.fade, ...texture}}
  if (texture) return {surface: 'dark', seam: {...NO_SEAM, site, ...texture}}
  return {surface: close}
}

/** The ground the close shows the walk (`walkPage`): where it renders, its surface as a visible ground. */
export function closeGround(close: Close, shown: boolean): VisibleGround | null {
  if (!shown) return null
  if (close === 'photo') return 'image'
  if (close === 'wash') return 'wash'
  return close
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
  const paints = flow ? assignGrounds(survivors, flow, site ?? null, {hero}) : []
  return {
    hosts: [...new Set(survivors.map((r) => r.host).filter((h): h is Host => !!h))],
    photos: survivors.filter((r) => r.photo).length,
    texture: !!site?.patternTexture,
    initials: !!site?.ghost?.text,
    heroPhoto: !!site?.heroPhoto,
    photoSet: !!site?.photoSet?.length,
    glow: !!site?.glow,
    hero,
    ribbonsFilled: survivors.filter((r, i) => r.host === 'ribbon' && (paints[i]?.ground === 'saturated' || paints[i]?.ground === 'dark')).length,
  }
}

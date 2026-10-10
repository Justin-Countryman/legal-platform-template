import {COLOR_DETAILS} from '../details'
import {RETIRED_STYLE_SETS, STYLE_SETS, matchStyleSet, styleSetPatch, updatePatch, type StyleSet, type StyleSetDoc, type StyleSetMatch} from '@/lib/styleSets'
import {PALETTE_PRESETS, matchPreset, presetInputs, type PalettePreset} from '@/lib/palettes'
import {FLOWS, HIDDEN_FIELDS, RETIRED_FLOWS, drawsHeroPhoto, flowById, flowOf, type FlowRules} from '@/lib/flows'
import {BACKGROUNDS, backgroundById, effectiveFlow, type Background} from '@/lib/backgrounds'
import {LAYOUTS, layoutById, type Layout} from '@/lib/layouts'
import {parseHexInput, type ColorInputs} from '@/lib/designTokens'
import {isResolvedTreatment} from '@/lib/imageTreatment'
import {setApprovalKeys} from '@/lib/heroGround'
import {SILO_HOVER_EFFECTS} from '@/lib/siloHover'
import {type PreviewView} from './session'

// ─── What a choice changes ────────────────────────────────────────────────────
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.3). A style set and a palette are
// not stored as names: choosing one writes its values into Design Settings, and the
// name is matched back by value (`lib/styleSets.ts`, `lib/palettes.ts`). So what the
// preview shows is a CHANGE to the stored settings, and this module computes it with
// the same functions the Studio's pickers write with, on the document as it is
// stored. The projected settings the layout reads are a different shape (uploaded
// fonts arrive as URLs, not asset references), and a style set read on that shape
// forgets that the site uses its own fonts; measured in the challenge (§7.2).
//
// The same plan, with the `_rev` it was computed on, is what the Apply link carries.
// What is shown and what is applied are one object, not two computations.
//
// The plan is minimal: a value the site already holds is not in it, so Apply writes
// only what changes, and only for a row the operator changed. Choosing the style set
// the site already wears keeps any divider or heading line swapped on purpose
// (`updatePatch`, `[R-485]`).
//
// Phase 17B session 3 (WS-V1-PHASE17B-DESIGN §2.10): the third row. A theme IS stored
// by name (`designSettings.flow`, `[R-509]`), so its block is one key: a chosen theme
// that differs from the stored one sets `flow`; and ANY chosen theme clears every
// retired field the document still stores (the six the compat bridge reads,
// `[R-510]`), so Apply cleans a stored client with the choice, and choosing the theme
// the site already stores is the one operator action that reaches zero on a document
// still carrying the six (ADV-17B-3 F3; the deletion pin waits for zero on every
// client). "As the site is" contributes nothing.
//
// Phase 17B session 6 (`[R-532]`): a theme that draws the hero's photograph is approved WITH the
// photograph the preview shows, its asset id written as `flowPhoto` beside `flow`; any other chosen
// theme clears it. The live page draws that theme's photo sections only while the hero photograph
// is still the approved one.
//
// Phase 17E (`[R-574]`): with it, the theme's set of photographs the preview shows, as `flowPhotos`: the key
// of every photograph of the stored set the theme may draw (its asset id and, where cropped, the rectangle drawn;
// `setApprovalKeys`), sorted, so a reorder needs no new approval, and never an empty list; any other chosen theme
// clears it. The live page draws a photograph of the set only while its key is among them.

// The Background theme (monorepo WS-V1-BACKGROUND-THEME-DESIGN §4, §7): the fourth row. A background IS stored by name,
// as a theme is (`designSettings.background`), so its block is one key: a chosen background that differs from the stored
// one sets it, and "the theme's own" clears it, since an absent value is what renders the theme's own. The theme and
// the background meet in one place, `effectiveFlow`, and the photograph approvals follow THE PAIR the page will render
// (the chosen or stored theme under the chosen or stored background): a background of photographs chosen alone approves
// them, and a theme changed under a kept background of photographs keeps them.

// The Layout theme (monorepo WS-V1-LAYOUT-OPTIONS-DESIGN §1.4, ADV-LO amendment 13): the fifth row of the address, after
// the background. A layout IS stored by name (`designSettings.pageLayout`), so its block is one key, as the background's is: a
// chosen layout that differs from the stored one sets it, and "the theme's own" clears it. The switcher draws no row for it
// yet (its widget waits, amendment 13); the address is how CC compares layouts on a firm's hidden site and how the metrics
// run measures one, and Apply writes what the address showed once the monorepo's allow-list names the field.

/** The row value that leaves a choice as the site has it. */
export const AS_THE_SITE_IS = 'site'
/** The background row's value for the theme's own background: Apply clears the stored one. */
export const OWN_BACKGROUND = 'own'
/** The layout row's value for the theme's own layout: Apply clears the stored one. */
export const OWN_LAYOUT = 'own'
export const COLOR_ROLES = ['darkGround', 'lightGround', 'accent', 'action'] as const
/** The palette built from the firm's own colors (Phase 18 session E, monorepo `[R-620]`): its id in the address, its
 *  roles from the grant (`brandPalette`), written by Apply as a preset's are. The engine keeps every text pair readable
 *  whatever the roles (`resolvePalette`). */
export const BRAND_PALETTE = 'brand'
export const BRAND_PALETTE_NAME = 'Your colors'

/** `background` and `layout` are absent on choices built before their rows existed, and read as the site is. */
export type PreviewChoices = {styleSet: string; palette: string; flow: string; background?: string; layout?: string; view: PreviewView}

/** Every style set the address may name: the eight offered and the five retired. A retired one
 *  is never offered (the switcher, the Studio and the meeting's suggestions list the eight), but
 *  the operator's typed address renders it, because a live site may wear one and the eye and
 *  the metrics run (`scripts/ci/flow-metrics.mjs`) must see what it wears (Phase 17C session 2b). */
const ADDRESSABLE: readonly StyleSet[] = [...STYLE_SETS, ...RETIRED_STYLE_SETS]

/** The choices from the preview address, or null when any part is not one. */
export function parseChoices(styleSet: string, palette: string, flow: string, view: string, background: string = AS_THE_SITE_IS, layout: string = AS_THE_SITE_IS): PreviewChoices | null {
  const s = styleSet === AS_THE_SITE_IS || ADDRESSABLE.some((t) => t.id === styleSet)
  const p = palette === AS_THE_SITE_IS || palette === BRAND_PALETTE || PALETTE_PRESETS.some((x) => x.id === palette)
  const f = flow === AS_THE_SITE_IS || FLOWS.some((x) => x.id === flow)
  const b = background === AS_THE_SITE_IS || background === OWN_BACKGROUND || BACKGROUNDS.some((x) => x.id === background)
  const l = layout === AS_THE_SITE_IS || layout === OWN_LAYOUT || LAYOUTS.some((x) => x.id === layout)
  const v = view === 'design' || view === 'grey'
  return s && p && f && b && l && v ? {styleSet, palette, flow, background, layout, view: view as PreviewView} : null
}

/** The rows of the address, in order, between `/site-preview/` and the view. A layer added later appends its word. */
export const ADDRESS_ROWS = ['styleSet', 'palette', 'flow', 'background', 'layout'] as const

/** The choices from the address's segments: the last is the view, the rows fill from the left, and a row the address
 *  does not reach reads as the site is. So an address minted before a row existed (three segments before the theme,
 *  four before the background, five before the layout) still opens the same page, with no redirect, and a 14-day client
 *  link outlives the row. */
export function parseAddress(segments: readonly string[] | null | undefined): PreviewChoices | null {
  const parts = segments ?? []
  if (parts.length < 3 || parts.length > ADDRESS_ROWS.length + 1) return null
  const rows = parts.slice(0, -1)
  const at = (i: number) => rows[i] ?? AS_THE_SITE_IS
  return parseChoices(at(0), at(1), at(2), parts[parts.length - 1], at(3), at(4))
}

/** A grant's background: absent (a link minted before the row) reads as the site is. */
export function grantBackground(background: string | null | undefined): string {
  return background == null ? AS_THE_SITE_IS : background
}

/** A grant's layout: absent (a link minted before the row) reads as the site is. */
export function grantLayout(layout: string | null | undefined): string {
  return layout == null ? AS_THE_SITE_IS : layout
}

/** A client grant's theme, read against today's roster: an absent one (a link minted before the
 *  theme row, session 3) and a retired one (Phase 17B session 5 retired Alternating at mostly
 *  dark, `[R-523]`) read as the site is, so a 14-day link minted before still enters. Any other
 *  unknown id stays itself and is refused, as before. */
export function grantFlow(flow: string | null | undefined): string {
  return flow == null || flow in RETIRED_FLOWS ? AS_THE_SITE_IS : flow
}

/** A grant's style set, read against today's roster (Phase 17C session 2b, `[R-534]`): a retired
 *  one (Canyon, Valley, Linen, Granite, Quartz) reads as the site is, so a 14-day client link
 *  minted before the retirement still enters; an absent one too. Any other unknown id stays
 *  itself and is refused by the address check. */
export function grantStyleSet(styleSet: string | null | undefined): string {
  return styleSet == null || RETIRED_STYLE_SETS.some((s) => s.id === styleSet) ? AS_THE_SITE_IS : styleSet
}

export function previewPath(c: PreviewChoices): string {
  // The background's slot only where a background is chosen, and the layout's only where a layout is (the background's
  // then written out, `site` where none is chosen, so the rows still fill from the left): every address minted before a
  // row is still the address of its page.
  const layout = c.layout && c.layout !== AS_THE_SITE_IS ? `/${c.layout}` : ''
  const background = (c.background && c.background !== AS_THE_SITE_IS) || layout ? `/${c.background ?? AS_THE_SITE_IS}` : ''
  return `/site-preview/${c.styleSet}/${c.palette}/${c.flow}${background}${layout}/${c.view}`
}

/** Design Settings as stored, with the revision the plan was computed on. */
export type StoredDesign = StyleSetDoc & ColorInputs & {_id?: string; _rev?: string} & Record<string, unknown>

export type PreviewPlan = {
  /** Values to write. */
  set: Record<string, string | number | string[]>
  /** Fields to clear. */
  unset: string[]
  /** The chosen style set, palette and theme; null is "as the site is". */
  styleSet: StyleSet | null
  palette: PalettePreset | null
  flow: FlowRules | null
  /** The chosen background; `'own'` is the theme's own (the stored one cleared); null is as the site is. */
  background: Background | typeof OWN_BACKGROUND | null
  /** The chosen layout; `'own'` is the theme's own (the stored one cleared); null is as the site is. */
  layout: Layout | typeof OWN_LAYOUT | null
  /** The rules the previewed page renders: the chosen or stored theme under the chosen or stored background and layout. */
  shown: FlowRules
  /** The background id in force on the previewed page: the chosen one, none for the theme's own, else the stored one. */
  inForce: string | null
  /** The layout id in force on the previewed page, read as the background's is. */
  layoutInForce: string | null
  /** The stored revision the plan was computed on; Apply writes against it. */
  rev: string | null
  /** What the stored settings wear now, named as the Studio names them. The theme is
   *  what the site renders: the stored id, the bridge over the retired fields, or the
   *  platform default (`flowOf`). */
  wears: {styleSet: StyleSetMatch | null; palette: PalettePreset | null; flow: FlowRules; background: Background | null; layout: Layout | null}
}

const present = (v: unknown) => v !== undefined && v !== null
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export function planPreview(
  stored: StoredDesign | null | undefined,
  choices: Pick<PreviewChoices, 'styleSet' | 'palette' | 'flow'> & {background?: string; layout?: string},
  heroPhoto: string | null = null,
  brand: {darkGround: string; accent: string; lightGround?: string} | null = null,
): PreviewPlan {
  const doc: StoredDesign = stored ?? {}
  const wears = {styleSet: matchStyleSet(doc), palette: matchPreset(doc), flow: flowOf(doc), background: backgroundById(doc.background), layout: layoutById(doc.pageLayout)}
  const set: PreviewPlan['set'] = {}
  const unset: string[] = []

  const styleSet = ADDRESSABLE.find((t) => t.id === choices.styleSet) ?? null
  if (styleSet) {
    const patch = wears.styleSet?.styleSet.id === styleSet.id ? updatePatch(doc, wears.styleSet) : styleSetPatch(styleSet, doc)
    for (const [field, value] of Object.entries(patch.set)) if (!same(doc[field], value)) set[field] = value
    for (const field of patch.unset) if (present(doc[field])) unset.push(field)
  }

  const palette = choices.palette === BRAND_PALETTE
    ? (brand ? {id: BRAND_PALETTE, name: BRAND_PALETTE_NAME, darkGround: brand.darkGround, lightGround: brand.lightGround, accent: brand.accent, evidence: []} : null)
    : PALETTE_PRESETS.find((p) => p.id === choices.palette) ?? null
  if (palette) {
    const inputs = presetInputs(palette)
    for (const role of COLOR_ROLES) {
      const wanted = inputs[role]
      if (wanted) {
        if (parseHexInput(doc[role]) !== parseHexInput(wanted)) set[role] = wanted
      } else if (present(doc[role])) {
        unset.push(role)
      }
    }
    // The palette details point at roles (monorepo `[R-641]`, `lib/details.ts`): a palette that changes a role clears them,
    // so a heading "in the button color" never outlives the button color it was chosen for (ADV-PP-B).
    if (COLOR_ROLES.some((role) => role in set || unset.includes(role))) {
      for (const field of COLOR_DETAILS) if (present(doc[field])) unset.push(field)
    }
  }

  const flow = flowById(choices.flow)
  if (flow) {
    if (doc.flow !== flow.id) set.flow = flow.id
    for (const field of HIDDEN_FIELDS) if (present(doc[field]) && !unset.includes(field)) unset.push(field)
  }

  // The background: a roster id set, or the stored one cleared for the theme's own.
  const chosen = backgroundById(choices.background)
  const own = choices.background === OWN_BACKGROUND
  if (chosen && doc.background !== chosen.id) set.background = chosen.id
  if (own && present(doc.background)) unset.push('background')
  const background: PreviewPlan['background'] = chosen ?? (own ? OWN_BACKGROUND : null)
  // The layout: a roster id set, or the stored one cleared for the theme's own. It approves nothing.
  const chosenLayout = layoutById(choices.layout)
  const ownLayout = choices.layout === OWN_LAYOUT
  if (chosenLayout && doc.pageLayout !== chosenLayout.id) set.pageLayout = chosenLayout.id
  if (ownLayout && present(doc.pageLayout)) unset.push('pageLayout')
  const layout: PreviewPlan['layout'] = chosenLayout ?? (ownLayout ? OWN_LAYOUT : null)
  const layoutInForce = chosenLayout ? chosenLayout.id : ownLayout ? null : wears.layout?.id ?? null
  // The pair the page will render, which is what the photographs are approved with.
  const inForce = chosen ? chosen.id : own ? null : backgroundById(doc.background)?.id ?? null
  const shown = effectiveFlow(flow ?? wears.flow, inForce, layoutInForce)
  if (flow || background) {
    if (drawsHeroPhoto(shown) && heroPhoto) {
      if (doc.flowPhoto !== heroPhoto) set.flowPhoto = heroPhoto
    } else if (present(doc.flowPhoto)) {
      unset.push('flowPhoto')
    }
    const setIds = drawsHeroPhoto(shown) && heroPhoto ? setApprovalKeys(doc, heroPhoto) : []
    if (setIds.length > 0) {
      if (!same(doc.flowPhotos, setIds)) set.flowPhotos = setIds
    } else if (present(doc.flowPhotos)) {
      unset.push('flowPhotos')
    }
  }

  return {set, unset, styleSet: styleSet, palette, flow, background, layout, shown, inForce, layoutInForce, rev: typeof doc._rev === 'string' ? doc._rev : null, wears}
}

/** The chrome with the plan applied to the settings the layout and the page read. The
 *  projected field names are the stored ones for every field a plan can touch. */
export function withPreview<C>(chrome: C, plan: Pick<PreviewPlan, 'set' | 'unset'>): C {
  if (!chrome || typeof chrome !== 'object') return chrome
  const base = (chrome as {designTokens?: Record<string, unknown> | null}).designTokens ?? {}
  const tokens: Record<string, unknown> = {...base}
  for (const [field, value] of Object.entries(plan.set)) tokens[field] = value
  for (const field of plan.unset) delete tokens[field]
  return {...chrome, designTokens: tokens}
}

// ─── Bands that keep their own look ───────────────────────────────────────────
//
// A band's own value wins over the site's (`followSite`, `resolveHovers`,
// `resolveTreatment`), and neither the preview nor Apply touches a band, so a style
// set changes nothing about these. The switcher names them so the operator is not
// surprised (§2.3). The three predicates are the three readers' own.

export type OwnLook = {key: string; section: string; what: string}

type CanvasMember = {_type?: string; _key?: string} & Record<string, unknown>

export function ownLooks(canvas: readonly CanvasMember[] | null | undefined): OwnLook[] {
  const out: OwnLook[] = []
  for (const m of canvas ?? []) {
    if (!m || typeof m !== 'object') continue
    const key = String(m._key ?? '')
    if (m._type === 'attorneySectionInline' && typeof m.cardStyle === 'string' && m.cardStyle && m.cardStyle !== 'inherit') {
      out.push({key, section: 'Attorneys', what: 'card style'})
    }
    if (m._type === 'practiceAreaNavInline' && Array.isArray(m.hoverEffects)
      && m.hoverEffects.some((e) => (SILO_HOVER_EFFECTS as string[]).includes(e as string))) {
      out.push({key, section: 'Areas of law', what: 'card hover'})
    }
    if (m._type === 'contentSectionInline' && isResolvedTreatment(m.imageTreatment)) {
      out.push({key, section: 'Content section', what: 'photo frame'})
    }
  }
  return out
}

// ─── Bands that keep their own ground ─────────────────────────────────────────
//
// Phase 17B: the theme's ground pass fills only a band that stores no surface and is
// not an inset panel; a stored surface always stands and an inset is never assigned
// (record §2.8, amendments 5). The switcher counts them, so an operator looking at a
// hand-set canvas knows which bands a theme cannot reach. Read from the projected
// member, where the appearance fieldset is `appearance: {surface, inset, ...}`.

export type OwnGround = {key: string; section: string; what: 'surface' | 'inset'}

const SECTION_NAMES: Record<string, string> = {
  practiceAreaNavInline: 'Areas of law', attorneySectionInline: 'Attorneys', badgesSectionInline: 'Badges',
  testimonialsGridInline: 'Testimonials', featuredTestimonialInline: 'Testimonial', videoSectionInline: 'Video',
  caseResultsSectionInline: 'Case results', contentSectionInline: 'Content section', reviewsSectionInline: 'Reviews',
}

export function ownGrounds(canvas: readonly CanvasMember[] | null | undefined): OwnGround[] {
  const out: OwnGround[] = []
  for (const m of canvas ?? []) {
    if (!m || typeof m !== 'object') continue
    const key = String(m._key ?? '')
    const section = SECTION_NAMES[m._type ?? ''] ?? 'Section'
    const a = (m.appearance ?? null) as {surface?: unknown; inset?: unknown} | null
    if (typeof a?.surface === 'string' && a.surface) out.push({key, section, what: 'surface'})
    else if (a?.inset === true) out.push({key, section, what: 'inset'})
  }
  return out
}

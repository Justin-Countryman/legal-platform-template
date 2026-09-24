import {THEMES, matchTheme, themePatch, updatePatch, type Theme, type ThemeDoc, type ThemeMatch} from '@/lib/themes'
import {PALETTE_PRESETS, matchPreset, presetInputs, type PalettePreset} from '@/lib/palettes'
import {FLOWS, HIDDEN_FIELDS, RETIRED_FLOWS, drawsHeroPhoto, flowById, flowOf, type FlowRules} from '@/lib/flows'
import {parseHexInput, type ColorInputs} from '@/lib/designTokens'
import {isResolvedTreatment} from '@/lib/imageTreatment'
import {SILO_HOVER_EFFECTS} from '@/lib/siloHover'
import {type PreviewView} from './session'

// ─── What a choice changes ────────────────────────────────────────────────────
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.3). A style set and a palette are
// not stored as names: choosing one writes its values into Design Settings, and the
// name is matched back by value (`lib/themes.ts`, `lib/palettes.ts`). So what the
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

/** The row value that leaves a choice as the site has it. */
export const AS_THE_SITE_IS = 'site'
export const COLOR_ROLES = ['darkGround', 'lightGround', 'accent', 'action'] as const

export type PreviewChoices = {styleSet: string; palette: string; flow: string; view: PreviewView}

/** The choices from the preview address, or null when any part is not one. */
export function parseChoices(styleSet: string, palette: string, flow: string, view: string): PreviewChoices | null {
  const s = styleSet === AS_THE_SITE_IS || THEMES.some((t) => t.id === styleSet)
  const p = palette === AS_THE_SITE_IS || PALETTE_PRESETS.some((x) => x.id === palette)
  const f = flow === AS_THE_SITE_IS || FLOWS.some((x) => x.id === flow)
  const v = view === 'design' || view === 'grey'
  return s && p && f && v ? {styleSet, palette, flow, view: view as PreviewView} : null
}

/** A client grant's theme, read against today's roster: an absent one (a link minted before the
 *  theme row, session 3) and a retired one (Phase 17B session 5 retired Alternating at mostly
 *  dark, `[R-523]`) read as the site is, so a 14-day link minted before still enters. Any other
 *  unknown id stays itself and is refused, as before. */
export function grantFlow(flow: string | null | undefined): string {
  return flow == null || flow in RETIRED_FLOWS ? AS_THE_SITE_IS : flow
}

export function previewPath(c: PreviewChoices): string {
  return `/site-preview/${c.styleSet}/${c.palette}/${c.flow}/${c.view}`
}

/** Design Settings as stored, with the revision the plan was computed on. */
export type StoredDesign = ThemeDoc & ColorInputs & {_id?: string; _rev?: string} & Record<string, unknown>

export type PreviewPlan = {
  /** Values to write. */
  set: Record<string, string | number | string[]>
  /** Fields to clear. */
  unset: string[]
  /** The chosen style set, palette and theme; null is "as the site is". */
  styleSet: Theme | null
  palette: PalettePreset | null
  flow: FlowRules | null
  /** The stored revision the plan was computed on; Apply writes against it. */
  rev: string | null
  /** What the stored settings wear now, named as the Studio names them. The theme is
   *  what the site renders: the stored id, the bridge over the retired fields, or the
   *  platform default (`flowOf`). */
  wears: {styleSet: ThemeMatch | null; palette: PalettePreset | null; flow: FlowRules}
}

const present = (v: unknown) => v !== undefined && v !== null
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export function planPreview(
  stored: StoredDesign | null | undefined,
  choices: Pick<PreviewChoices, 'styleSet' | 'palette' | 'flow'>,
  heroPhoto: string | null = null,
): PreviewPlan {
  const doc: StoredDesign = stored ?? {}
  const wears = {styleSet: matchTheme(doc), palette: matchPreset(doc), flow: flowOf(doc)}
  const set: PreviewPlan['set'] = {}
  const unset: string[] = []

  const theme = THEMES.find((t) => t.id === choices.styleSet) ?? null
  if (theme) {
    const patch = wears.styleSet?.theme.id === theme.id ? updatePatch(doc, wears.styleSet) : themePatch(theme, doc)
    for (const [field, value] of Object.entries(patch.set)) if (!same(doc[field], value)) set[field] = value
    for (const field of patch.unset) if (present(doc[field])) unset.push(field)
  }

  const palette = PALETTE_PRESETS.find((p) => p.id === choices.palette) ?? null
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
  }

  const flow = flowById(choices.flow)
  if (flow) {
    if (doc.flow !== flow.id) set.flow = flow.id
    for (const field of HIDDEN_FIELDS) if (present(doc[field]) && !unset.includes(field)) unset.push(field)
    if (drawsHeroPhoto(flow) && heroPhoto) {
      if (doc.flowPhoto !== heroPhoto) set.flowPhoto = heroPhoto
    } else if (present(doc.flowPhoto)) {
      unset.push('flowPhoto')
    }
  }

  return {set, unset, styleSet: theme, palette, flow, rev: typeof doc._rev === 'string' ? doc._rev : null, wears}
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

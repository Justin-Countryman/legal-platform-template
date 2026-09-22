import {THEMES, matchTheme, themePatch, updatePatch, type Theme, type ThemeDoc, type ThemeMatch} from '@/lib/themes'
import {PALETTE_PRESETS, matchPreset, presetInputs, type PalettePreset} from '@/lib/palettes'
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

/** The row value that leaves a choice as the site has it. */
export const AS_THE_SITE_IS = 'site'
export const COLOR_ROLES = ['darkGround', 'lightGround', 'accent', 'action'] as const

export type PreviewChoices = {styleSet: string; palette: string; view: PreviewView}

/** The choices from the preview address, or null when any part is not one. */
export function parseChoices(styleSet: string, palette: string, view: string): PreviewChoices | null {
  const s = styleSet === AS_THE_SITE_IS || THEMES.some((t) => t.id === styleSet)
  const p = palette === AS_THE_SITE_IS || PALETTE_PRESETS.some((x) => x.id === palette)
  const v = view === 'design' || view === 'grey'
  return s && p && v ? {styleSet, palette, view: view as PreviewView} : null
}

export function previewPath(c: PreviewChoices): string {
  return `/site-preview/${c.styleSet}/${c.palette}/${c.view}`
}

/** Design Settings as stored, with the revision the plan was computed on. */
export type StoredDesign = ThemeDoc & ColorInputs & {_id?: string; _rev?: string} & Record<string, unknown>

export type PreviewPlan = {
  /** Values to write. */
  set: Record<string, string | number | string[]>
  /** Fields to clear. */
  unset: string[]
  /** The chosen style set and palette; null is "as the site is". */
  styleSet: Theme | null
  palette: PalettePreset | null
  /** The stored revision the plan was computed on; Apply writes against it. */
  rev: string | null
  /** What the stored settings wear now, named as the Studio names them. */
  wears: {styleSet: ThemeMatch | null; palette: PalettePreset | null}
}

const present = (v: unknown) => v !== undefined && v !== null
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export function planPreview(stored: StoredDesign | null | undefined, choices: Pick<PreviewChoices, 'styleSet' | 'palette'>): PreviewPlan {
  const doc: StoredDesign = stored ?? {}
  const wears = {styleSet: matchTheme(doc), palette: matchPreset(doc)}
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

  return {set, unset, styleSet: theme, palette, rev: typeof doc._rev === 'string' ? doc._rev : null, wears}
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

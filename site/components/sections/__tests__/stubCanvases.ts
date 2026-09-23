import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {type VisibleGround} from '@/lib/sectionSurface'

// The stub datasets under `scripts/ci/`, read the way the homepage query reads them
// (Phase 17B session 3). Not a test file: vitest does not collect it. The decision
// golden runs on canvas JSON, so a canvas whose bands reference documents (an attorney
// grid, a featured testimonial, a practice-area band in `allTopLevel` mode) must be
// resolved here as `SECTION_BODY` resolves it, or the walk drops those bands as empty
// and the golden disagrees with the served page.
//
// Null when a file is absent: the press prunes `scripts/ci` from a client tree, so a
// test that reads one runs on the template checkout and skips, by name, on a
// propagated client ([R-175]).

type Doc = Record<string, unknown> & {_id: string; _type: string}
type Ref = {_ref?: string}

export const CI_DIR = resolve(__dirname, '../../../scripts/ci')
// Phase 17B session 5: the ribbon evidence canvas, for a family whose need the other three do not meet.
export const RECORD_CANVASES = ['record-adversarial-mostly-dark.ndjson', 'record-planning-mostly-light.ndjson', 'record-multi-practice-balanced.ndjson', 'record-ribbons-mostly-light.ndjson'] as const

export function stubDataset(file: string): Doc[] | null {
  const p = resolve(CI_DIR, file)
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
}

const APPEARANCE = ['surface', 'spacing', 'inset', 'overlapPrevious'] as const

/** One dataset's homepage canvas with its references resolved, and the hero's ground. */
export function stubCanvas(file: string): {blocks: HomepageBlock[]; hero: VisibleGround} | null {
  const docs = stubDataset(file)
  if (!docs) return null
  const byId = new Map(docs.map((d) => [d._id, d]))
  const deref = (r: Ref | null | undefined) => (r?._ref ? byId.get(r._ref) ?? null : null)
  const home = docs.find((d) => d._type === 'homePage') as (Doc & {canvas?: Doc[]; hero?: {heading?: string}}) | undefined
  const heroDesign = (docs.find((d) => d._type === 'heroSettings') as (Doc & {homepageHero?: {schemeOverride?: string}}) | undefined)?.homepageHero
  const hero: VisibleGround = !home?.hero?.heading || !heroDesign ? 'light' : heroDesign.schemeOverride === 'light' ? 'tint' : 'dark'
  const areas = docs.filter((d) => d._type === 'practiceArea' && !d.parentPage)
    .map((d) => ({_key: d._id, label: (d.navLabel as string) ?? (d.title as string), href: `/${(d.slug as {current: string}).current}/`, description: d.metaDescription ?? null}))
    .sort((a, b) => a.label.localeCompare(b.label))
  const blocks = (home?.canvas ?? []).map((m) => {
    const out: Record<string, unknown> = {...m}
    out.appearance = {surface: m.surface ?? null, spacing: m.spacing ?? null, inset: m.inset ?? null, overlapPrevious: m.overlapPrevious ?? null, backgroundImage: null}
    for (const k of APPEARANCE) delete out[k]
    delete out.sectionBackgroundImage
    if (m._type === 'practiceAreaNavInline' && m.mode === 'allTopLevel') out.items = areas
    if (m._type === 'attorneySectionInline' && m.mode === 'manual') {
      out.attorneys = ((m.attorneys as Ref[]) ?? []).map(deref).filter(Boolean).map((d) => ({
        _id: d!._id, title: (d!.navLabel as string) ?? (d!.title as string), slug: (d!.slug as {current: string}).current, jobTitle: d!.jobTitle ?? null, bio: d!.metaDescription ?? null, photo: null,
      }))
    }
    if (m._type === 'featuredTestimonialInline') out.testimonial = deref(m.testimonial as Ref)
    if (m._type === 'testimonialsGridInline') out.testimonials = ((m.testimonials as Ref[]) ?? []).map(deref).filter(Boolean)
    if (m._type === 'caseResultsSectionInline') out.caseResults = ((m.caseResults as Ref[]) ?? []).map(deref).filter(Boolean)
    return out as unknown as HomepageBlock
  })
  return {blocks, hero}
}

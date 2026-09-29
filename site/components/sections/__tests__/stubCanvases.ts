import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {type VisibleGround} from '@/lib/sectionSurface'
import {heroPhotoOf, photoSetOf, type HeroPhoto, type SetPhoto} from '@/lib/heroGround'
import {type HomeHeroData} from '@/components/layout/homeHero/types'

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
// Phase 17B session 6: the three record canvases again with a stand-in photograph behind the hero and
// in every split band, for Photo scrims (the photographs under `photos/`).
// Phase 17D session 2: the adversarial record with a cutout figure in its splits (`[R-558]`).
export const RECORD_CANVASES = [
  'record-adversarial-mostly-dark.ndjson', 'record-planning-mostly-light.ndjson', 'record-multi-practice-balanced.ndjson', 'record-ribbons-mostly-light.ndjson',
  'record-adversarial-photo-hero.ndjson', 'record-planning-photo-hero.ndjson', 'record-multi-practice-photo-hero.ndjson',
  // Phase 17D session 2: the adversarial record with a stand-in cutout figure (a marble bust) in every split band, for
  // Gradient bloom's glow behind a figure.
  'record-adversarial-cutout.ndjson',
  // Phase 17E (`[R-573]`): the three records with a photograph of one city behind the hero and four more of it as the
  // theme's set, and the planning record with the set and no hero photograph, where the set draws nothing.
  'record-adversarial-photo-set.ndjson', 'record-planning-photo-set.ndjson', 'record-multi-practice-photo-set.ndjson',
  'record-planning-photo-set-no-hero-photo.ndjson',
  // Phase 17E (`[R-575]`, `[R-576]`): the canvas the homepage composer itself writes for a synthetic firm, a ribbon after
  // the hero and one before the close (`compose_from_record.py --composed` in the monorepo).
  'record-composed-ribbons.ndjson',
] as const

export function stubDataset(file: string): Doc[] | null {
  const p = resolve(CI_DIR, file)
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
}

const APPEARANCE = ['surface', 'spacing', 'inset', 'overlapPrevious'] as const

/** One dataset's homepage canvas with its references resolved, the hero's ground, the hero's
 *  photograph as the page reads it (`heroPhotoOf`), or null, and the theme's set as the preview draws it
 *  (every photograph approved, as choosing the theme approves them; Phase 17E), beside that photograph only. */
export function stubCanvas(file: string): {blocks: HomepageBlock[]; hero: VisibleGround; heroPhoto: HeroPhoto | null; photoSet: SetPhoto[]} | null {
  const docs = stubDataset(file)
  if (!docs) return null
  const byId = new Map(docs.map((d) => [d._id, d]))
  const deref = (r: Ref | null | undefined) => (r?._ref ? byId.get(r._ref) ?? null : null)
  const home = docs.find((d) => d._type === 'homePage') as (Doc & {canvas?: Doc[]; hero?: {heading?: string}}) | undefined
  const heroDesign = (docs.find((d) => d._type === 'heroSettings') as (Doc & {homepageHero?: {schemeOverride?: string; backdrop?: string; backgroundImage?: {asset?: Ref}}}) | undefined)?.homepageHero
  const asset = heroDesign?.backdrop === 'image' ? deref(heroDesign.backgroundImage?.asset) : null
  const hero: VisibleGround = !home?.hero?.heading || !heroDesign ? 'light' : heroDesign.backdrop === 'image' ? 'image' : heroDesign.schemeOverride === 'light' ? 'tint' : 'dark'
  const dims = (asset?.metadata as {dimensions?: {width?: number; height?: number}; isOpaque?: boolean} | undefined)
  const heroPhoto = home?.hero?.heading && heroDesign && asset
    ? heroPhotoOf({...(heroDesign as object), heading: home.hero.heading, backgroundImage: {src: asset.url as string, width: dims?.dimensions?.width ?? null, height: dims?.dimensions?.height ?? null, isOpaque: dims?.isOpaque ?? null, assetId: asset._id}} as HomeHeroData)
    : null
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
  const design = docs.find((d) => d._type === 'designSettings') as (Doc & {themePhotos?: Array<{asset?: Ref}>}) | undefined
  const themePhotos = (design?.themePhotos ?? []).map((p) => {
    const a = deref(p.asset)
    const m = a?.metadata as {dimensions?: {width?: number; height?: number}; isOpaque?: boolean} | undefined
    return {asset: p.asset, src: a?.url, width: m?.dimensions?.width, height: m?.dimensions?.height, isOpaque: m?.isOpaque, assetId: a?._id}
  })
  const photoSet = heroPhoto ? photoSetOf({themePhotos, flowPhotos: themePhotos.map((p) => p.assetId)}, heroPhoto.assetId) : []
  return {blocks, hero, heroPhoto, photoSet}
}

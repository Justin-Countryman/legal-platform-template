import {COLOR_DETAILS, DETAILS, detailsOf} from '@/lib/details'
import Link from 'next/link'
import {STYLE_SETS} from '@/lib/styleSets'
import {PALETTE_PRESETS} from '@/lib/palettes'
import {DARKNESS_LABELS, FAMILIES, chromeSchemes, closeOf, drawsHeroPhoto, familyOf, flowById, flowId, glowGateOf, needLabel, unmetNeeds, type FlowFamily, type FlowRules} from '@/lib/flows'
import {BACKGROUND_FAMILIES, CLOSE_NEEDS_LIGHT_FOOTER, HERO_NOT_DARK, SUGGESTED_WITH, backgroundById, describeOn, effectiveFlow} from '@/lib/backgrounds'
import {photoSetOf, type HeroPhoto, type SetPhoto, type SetPhotoEntry, type SetPhotoStatus} from '@/lib/heroGround'
import {urlForImage} from '@/lib/sanity/image'
import {type VisibleGround} from '@/lib/sectionSurface'
import {ghostSource} from '@/lib/brandMark'
import {canvasFacts, closeGround, siteLookOf, walkPage} from '@/components/sections/sectionFrame'
import {frameOf, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {type SiteChrome} from '@/components/layout/SiteShell'
import {
  APPLY_LINK_SECONDS, CLIENT_LINK_SECONDS, nowSeconds, signToken, type PreviewGrant,
} from '@/lib/preview/session'
import {AS_THE_SITE_IS, BRAND_PALETTE, BRAND_PALETTE_NAME, OWN_BACKGROUND, ownGrounds, ownLooks, previewPath, type PreviewChoices, type PreviewPlan} from '@/lib/preview/plan'

// ─── The switcher ─────────────────────────────────────────────────────────────
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.5, `[R-507]`). Three rows of buttons
// on the preview page: style set, palette and theme. Every button is a link to
// another preview address: the choices ARE the address, so a switch changes no
// state, writes nothing and cannot be triggered from another site; the page
// re-renders with the choice read from the URL.
//
// A server component with no browser code of its own: `next/link` is the framework's
// and already on every page. It is rendered only by the preview layout, after the
// session check, and the links, share link and Apply link it signs exist only in a
// response to a signed session.
//
// A CLIENT sees one line, the choices they were sent and when the link ends: never
// the roster (`[R-507]`). The role is inside the signed cookie, so it cannot be edited.
//
// THE THEME ROW (Phase 17B session 3, record §2.10, `[R-509]`). One button per family,
// with its name and its sentence; a family with more than one step shows its steps on a
// second line with the family's default preselected, so the meeting is still three
// clicks. A step the eye has not passed says so (`[R-517]`): the build's table cannot
// write it, but the eye pass runs through this row, so it is listed. Beside the row:
// the needs the theme has that this page or site cannot meet (it renders without
// them), how many bands keep a surface of their own that no theme reaches, and the header
// and footer the theme gives (Phase 17B session 4, `[R-518]`), naming a scheme stored on
// Header Settings or Footer Settings, which wins until it is cleared.

/** The row's head, and the bundle sentinel `scripts/ci/check-preview-not-shipped.mjs`
 *  searches for: a value only this row emits. */
export const ROW_THEME_HEAD = 'Theme, the flow of the page'
/** The background row's head (the Background theme), and a bundle sentinel as the theme row's is. */
export const ROW_BACKGROUND_HEAD = 'Background, what sits on the sections'

type Props = {
  grant: PreviewGrant
  choices: PreviewChoices
  plan: PreviewPlan
  canvas: unknown
  /** The chrome the page is drawn from, with the plan applied: what the theme's needs
   *  are read against (the style set's texture, the firm's initials), and the header
   *  an all-dark theme cannot reach. */
  chrome?: SiteChrome | null
  /** This site's own origin, from the request, for the share link. */
  origin: string
  /** The homepage hero's ground as the walk meets it, for a theme that wants a dark hero
   *  (Phase 17B session 5). */
  hero?: VisibleGround | null
  /** The hero's ground as each theme would draw it (Phase 18 session E: an inherited hero follows the theme,
   *  `themedHero`), so a theme's needs are read against its own hero; absent, every theme reads `hero`. */
  heroUnder?: (flow: FlowRules) => VisibleGround | null
  /** The live hero photograph a Photo scrims choice would be approved with (Phase 17B session 6). */
  heroPhoto?: HeroPhoto | null
  /** Every photograph of the theme's stored set, with its status against what the site has approved (Phase 17E). */
  photoSet?: readonly SetPhotoEntry[] | null
  /** The closing call to action renders on this page, so it takes the set's first photograph. */
  closeShown?: boolean
}

/** Why a photograph of the set draws or not, in the operator's words (Phase 17E, `[R-574]`). */
const SET_STATUS: Record<SetPhotoStatus, string> = {
  approved: 'approved',
  notApproved: 'not yet approved: it shows once this theme is applied',
  small: 'not shown: under 1,600 pixels wide',
  portrait: 'not shown: not a landscape photograph',
  transparent: 'not shown: it has a transparent background',
  duplicate: 'not shown: the same photograph is in the set twice',
  hero: 'not shown: it is the hero\u2019s own photograph',
}

/** The set as the switcher lists it: each photograph, its thumbnail, whether this page shows it and why not. */
function SetPhotos({entries, shown, placed, plain, heroPhoto, heroWaits, closeShown}: {entries: readonly SetPhotoEntry[]; shown: FlowRules; placed: Set<string>; plain: number; heroPhoto: boolean; heroWaits: boolean; closeShown: boolean}) {
  const usable = entries.filter((e) => e.status === 'approved' || e.status === 'notApproved').length
  return (
    <div className="sw-row">
      <span className="sw-head">Theme photographs</span>
      <p className="sw-note">
        {!heroPhoto
          ? `${shown.name} draws its set only with a hero photograph of a place, and this homepage has none.`
          : heroWaits
            ? `The set shows only beside the approved hero photograph, which waits for ${shown.name} to be applied.`
            : `This page shows ${placed.size} of the ${usable} photographs it can use${closeShown && placed.size > 0 ? ', the first behind the closing call to action' : ''}${placed.size < usable ? '; a photograph with no section to go behind waits for a longer page' : ''}.`}
        {heroPhoto && !heroWaits && plain > 0 && ` ${plain} more ${plain === 1 ? 'place' : 'places'} on this page could take a photograph and ${plain === 1 ? 'stays' : 'stay'} plain until the set has more.`}
      </p>
      <div className="sw-photos">
        {entries.map((e, i) => (
          <figure key={`${e.photo.assetId}-${i}`} className="sw-photo">
            {/* The whole photograph as cropped, every pixel that can draw on any screen, and a link to it at 1,600
                pixels: approval is given from this (the pre-PR break pass, record §9). */}
            <a href={urlForImage(e.photo.image).width(1600).fit('max').url()} target="_blank" rel="noopener noreferrer" aria-label={`Photograph ${i + 1}, full size`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlForImage(e.photo.image).width(240).fit('max').url()} alt="" width={120} height={75} />
            </a>
            <figcaption>
              {i + 1}. {e.status === 'approved' || e.status === 'notApproved' ? (placed.has(e.photo.assetId) ? 'shown on this page' : 'not used on this page') : SET_STATUS[e.status]}
              {e.status === 'notApproved' && `; ${SET_STATUS.notApproved}`}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function names(plan: PreviewPlan): string {
  const s = plan.styleSet?.name ?? (plan.wears.styleSet ? `${plan.wears.styleSet.styleSet.name} (as the site is)` : 'the site\'s own style')
  const p = plan.palette?.name ?? (plan.wears.palette ? `${plan.wears.palette.name} (as the site is)` : 'the site\'s own colors')
  const f = plan.flow?.name ?? `${plan.wears.flow.name} (as the site is)`
  const b = plan.background === OWN_BACKGROUND ? ', the theme\u2019s own background' : plan.background ? `, ${plan.background.name} on the sections` : ''
  return `${s}, ${p}, ${f}${b}`
}

const date = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10)

/** "Content section (photo frame) ×2, Attorneys (card style)": one entry per kind. */
function keptLine(keep: {section: string; what: string}[]): string {
  const counts = new Map<string, number>()
  for (const k of keep) counts.set(`${k.section} (${k.what})`, (counts.get(`${k.section} (${k.what})`) ?? 0) + 1)
  return [...counts].map(([label, n]) => (n > 1 ? `${label} ×${n}` : label)).join(', ')
}

/** The note's head, and a bundle sentinel (`scripts/ci/check-preview-not-shipped.mjs`). */
export const CHROME_NOTE_HEAD = 'Header and footer on this page'

type StoredChrome = {
  header?: {
    mainNavigation?: {defaultScheme?: string | null; scrolledScheme?: string | null} | null
    designSettings?: {logoOnLight?: unknown; logoOnDark?: unknown} | null
  } | null
  footer?: {footerSettings?: {footerScheme?: string | null} | null} | null
} | null | undefined

/** The header and footer the page shows, and why: the theme's, or a scheme stored on Header
 *  Settings or Footer Settings, which wins until it is cleared (Phase 17B session 4, `[R-518]`).
 *  It replaces 17B's all-dark note: the theme now sets the header. */
export function chromeNote(flow: Pick<FlowRules, 'chrome'>, chrome: StoredChrome): string {
  const nav = chrome?.header?.mainNavigation
  const foot = chrome?.footer?.footerSettings
  const logos = chrome?.header?.designSettings
  const s = chromeSchemes(flow, nav, foot, {onLight: logos?.logoOnLight, onDark: logos?.logoOnDark})
  const header = s.top === s.scrolled ? s.top : `${s.top}, ${s.scrolled} when scrolled`
  const kept = [
    nav?.defaultScheme && `the header's top (${nav.defaultScheme})`,
    nav?.scrolledScheme && `the header when scrolled (${nav.scrolledScheme})`,
    foot?.footerScheme && `the footer (${foot.footerScheme})`,
  ].filter(Boolean)
  let out = `${CHROME_NOTE_HEAD}: a ${header} header and a ${s.footer} footer.`
  if (kept.length > 0) out += ` Stored, so no theme reaches them: ${kept.join(', ')}; clear them in Header Settings and Footer Settings to hand them to the theme.`
  if (s.darkLogoMissing) out += ' The theme wants a dark header, which needs a logo for dark grounds with no white or colored box of its own; it stays light until one is uploaded.'
  return out
}

/** What the switcher says where Gradient bloom's palette has no room to glow (`glowOk`, `[R-557]`). */
export const NO_GLOW = 'On this palette the dark sections have no room to glow, so they show plain.'

/** A family's button label: its name, and, for a family with one step the eye has not passed,
 *  that it is not yet judged (Phase 17B session 5: the step line that carries the mark only
 *  appears for a family with two steps). */
export function familyLabel(f: Pick<FlowFamily, 'name' | 'steps' | 'passed' | 'defaultStep'>): string {
  return f.steps.length === 1 && !f.passed.includes(f.defaultStep) ? `${f.name} (not yet judged)` : f.name
}

// ─── The meeting's preselection (Phase 17C session 3, `[R-537]`) ─────────────
//
// The Site Builder App signs the style sets and palettes it suggests for this firm into the
// operator's grant (`suggest`), with its reason. A row then shows those first, the ones this site's
// own roster offers (a retired, unpassed or unknown id is dropped: the app computes at the
// monorepo's pin, and this client may be on an older one), then the rest behind "All". With no
// usable suggestion the row is the whole roster, as before. `[R-507]`: "never the roster" in the
// meeting; the rest stays one click away for the operator's own eye pass.

/** The suggested entries this roster offers, in the order suggested. */
function suggestedFrom<T extends {id: string}>(all: readonly T[], ids: readonly string[] | undefined, offered: (t: T) => boolean): T[] {
  return (ids ?? []).map((id) => all.find((t) => t.id === id && offered(t))).filter((t): t is T => !!t)
}

function Preselected<T extends {id: string}>({all, ids, offered, active, children}: {
  all: readonly T[]
  ids: readonly string[] | undefined
  offered: (t: T) => boolean
  active: string
  children: (t: T) => React.ReactNode
}) {
  const first = suggestedFrom(all, ids, offered)
  if (first.length === 0) return <>{all.map(children)}</>
  const rest = all.filter((t) => !first.includes(t))
  return (
    <>
      {first.map(children)}
      {rest.length > 0 && (
        <details className="sw-all" open={rest.some((t) => t.id === active) || undefined}>
          <summary className="sw-choice">All ({rest.length} more)</summary>
          {rest.map(children)}
        </details>
      )}
    </>
  )
}

/** The reason under a row, where the row shows a suggestion. */
function suggestedWhy<T extends {id: string}>(all: readonly T[], row: {ids: string[]; why: string} | undefined, offered: (t: T) => boolean) {
  return row && suggestedFrom(all, row.ids, offered).length > 0 ? <p className="sw-note sw-why">Suggested first: {row.why}</p> : null
}

function Choice({href, active, className, children}: {href: string; active: boolean; className?: string; children: React.ReactNode}) {
  const classes = ['sw-choice', active && 'sw-active', className].filter(Boolean).join(' ')
  return (
    <Link href={href} prefetch={false} scroll={false} className={classes} aria-current={active ? 'true' : undefined}>
      {children}
    </Link>
  )
}

export function Switcher({grant, choices, plan, canvas, chrome, origin, hero = null, heroUnder, heroPhoto = null, photoSet = null, closeShown = true}: Props) {
  const now = nowSeconds()
  const at = (c: Partial<PreviewChoices>) => previewPath({...choices, ...c})

  if (grant.role === 'client') {
    return (
      <aside className="sw" aria-label="Design preview">
        <style dangerouslySetInnerHTML={{__html: SWITCHER_CSS}} />
        <p className="sw-line"><strong>Preview, not live yet:</strong> {names(plan)}. Links on this page open the live site. This preview ends {date(grant.exp)}.</p>
      </aside>
    )
  }

  // A client sent the palette built from the firm's colors carries its roles (Phase 18 session E), or its link draws nothing.
  const brandRoles = choices.palette === BRAND_PALETTE && grant.brandPalette ? {brandPalette: grant.brandPalette} : {}
  const share = signToken({v: 1, role: 'client', exp: now + CLIENT_LINK_SECONDS, ...choices, ...brandRoles})
  const shareUrl = share ? `${origin}/site-preview/enter?t=${share}` : null
  const changes = Object.keys(plan.set).length + plan.unset.length
  // A retired style set (Phase 17C session 2b, `[R-534]`) is rendered by a typed address so a live
  // look can be seen and measured, and is offered nowhere: no Apply is minted for it.
  const retiredChoice = plan.styleSet && 'retired' in plan.styleSet ? plan.styleSet.name : null
  const apply = grant.apply && plan.rev && changes > 0 && !retiredChoice
    ? signToken({
        v: 1, kind: 'apply', slug: grant.apply.slug, exp: now + APPLY_LINK_SECONDS, rev: plan.rev,
        set: plan.set, unset: plan.unset,
        styleSet: plan.styleSet ? {id: plan.styleSet.id, name: plan.styleSet.name} : null,
        palette: plan.palette ? {id: plan.palette.id, name: plan.palette.name} : null,
        flow: plan.flow ? {id: plan.flow.id, name: plan.flow.name} : null,
        background: plan.background === OWN_BACKGROUND ? {id: OWN_BACKGROUND, name: 'the theme\u2019s own background'} : plan.background ? {id: plan.background.id, name: `${plan.background.name} on the sections`} : null,
      })
    : null
  const blocks = (Array.isArray(canvas) ? canvas : []) as HomepageBlock[]
  const keep = ownLooks(blocks)
  // The details the page draws (`lib/details.ts`, monorepo `[R-641]`), and the palette details this palette clears.
  const details = detailsOf(chrome?.designTokens as Record<string, unknown> | null | undefined)
  const clearedDetails = plan.unset.filter((f) => COLOR_DETAILS.includes(f)).map((f) => DETAILS.find((d) => d.field === f)!.label.toLowerCase())
  const grounds = ownGrounds(blocks)
  // A retired style set (Phase 17C session 2b, `[R-534]`) is named where the site wears it and
  // never offered; a style set the eye has not passed says so, as a theme family does.
  const wearsStyle = plan.wears.styleSet ? `${plan.wears.styleSet.styleSet.name}${plan.wears.styleSet.retired ? ' (retired)' : ''}` : 'Custom'
  const wearsPalette = plan.wears.palette ? plan.wears.palette.name : 'Custom'

  // The theme the page shows: the chosen one, else what the site renders. Its needs are
  // read against this page and the previewed site (the style set's texture, the firm's
  // initials), as the engine reads them.
  const shown: FlowRules = plan.shown
  // The theme without the background in force: what "the theme's own" names, and what each background is tried on.
  const baseFlow: FlowRules = plan.flow ?? plan.wears.flow
  const family = familyOf(shown)
  const survivors = blocks.map(frameOf).filter((r) => !r.empty)
  const look = siteLookOf(chrome?.designTokens)
  // The live hero photograph (Phase 17B session 6): choosing a theme that draws it approves it, so
  // the needs read it as met wherever the photograph qualifies (`heroPhotoOf`).
  const site = {...look, ghost: ghostSource(chrome?.header?.siteSettings?.firmName, true), heroPhoto}
  // The theme the page shows draws the hero's photograph, and the one it was approved with is not the
  // live one: its photo sections are plain until this one is approved (`[R-532]`).
  const approved = (chrome?.designTokens as {flowPhoto?: unknown} | null | undefined)?.flowPhoto
  const photoChanged = drawsHeroPhoto(shown) && !!heroPhoto?.assetId && approved !== heroPhoto.assetId
  // Facts per theme: the ribbons a theme fills are read from that theme's own pass.
  // A need of the palette, not of the page (Phase 17D session 2): Gradient bloom's room to glow is said on its own, so the
  // page is not blamed for the palette (ADV-17D2-C).
  // Every photograph of the stored set the page could draw once approved: choosing a background approves them.
  const usableSet: SetPhoto[] = (photoSet ?? []).filter((e) => e.status === 'approved' || e.status === 'notApproved').map((e) => e.photo)
  const unmetOf = (f: FlowRules | null) => (f ? unmetNeeds(f, canvasFacts(survivors, {...site, photoSet: heroPhoto ? usableSet : []}, heroUnder ? heroUnder(f) : hero, f)) : [])
  const lacks = (f: FlowRules | null) => unmetOf(f).filter((n) => n !== 'glow').map(needLabel)
  const noGlow = (f: FlowRules | null) => unmetOf(f).includes('glow')
  const unmet = lacks(shown)
  // The theme's three the Site Builder App suggests (`suggestTheme`), the ones this roster ships and the eye has passed.
  const suggestedFlows = (grant.suggestTheme?.ids ?? []).map((id) => flowById(id)).filter((f): f is FlowRules => !!f && f.passed)
  const familyChoices = FAMILIES.map((f) => {
    const own = flowById(flowId(f.id, f.defaultStep))
    // Read under the background in force, as the page would draw it.
    const first = own ? effectiveFlow(own, plan.inForce) : null
    const missing = lacks(first)
    return (
      <Choice key={f.id} href={at({flow: flowId(f.id, f.defaultStep)})} active={choices.flow !== AS_THE_SITE_IS && family?.id === f.id} className="sw-family">
        <strong>{familyLabel(f)}</strong>
        <span className="sw-sentence">{f.sentence}{missing.length > 0 && ` Needs ${missing.join(', ')} this page lacks.`}{noGlow(first) && ` ${NO_GLOW}`}</span>
      </Choice>
    )
  })
  const headerNote = chromeNote(shown, chrome)
  // ─── The background row (the Background theme, monorepo WS-V1-BACKGROUND-THEME-DESIGN §2, §7) ────────────────
  // Every option is tried on this page under the theme shown: the walk the page would run, with every photograph the
  // set could draw. An option that draws on no section here is dimmed with its reason and stays a link, never hidden
  // (`[R-632]`); one that draws but cannot reach the hero or the close under this theme says which, and why.
  const bg = choices.background ?? AS_THE_SITE_IS
  const footerOf = (f: FlowRules) => chromeSchemes(f, chrome?.header?.mainNavigation, chrome?.footer?.footerSettings, {
    onLight: chrome?.header?.designSettings?.logoOnLight, onDark: chrome?.header?.designSettings?.logoOnDark,
  }).footer
  const reachOf = (id: string): {none: boolean; note: string} => {
    const f = effectiveFlow(baseFlow, id)
    if (f.on.dark === 'plain' && f.on.light === 'plain' && !f.on.hero && f.on.close === 'none') return {none: false, note: ''}
    const heroG = heroUnder ? heroUnder(f) : hero
    // The room the option's glow needs on this palette: the light's where it positions one (`[R-646]`), else the glow's.
    const trySite = {...site, flow: f, photoSet: heroPhoto ? usableSet : [], closeShown, glow: glowGateOf(f, chrome?.designTokens as Record<string, unknown> | null)}
    const needs = unmetNeeds(f, canvasFacts(survivors, trySite, heroG, f)).filter((n) => f.ownNeeds.includes(n) === false)
    const footer = footerOf(f)
    const above = walkPage(blocks, frameOf, trySite, heroG, null).last ?? heroG
    const close = closeOf(f, {footer, above, heroPhoto: !!heroPhoto, colors: chrome?.designTokens as Record<string, unknown> | null})
    const walked = walkPage(blocks, frameOf, {...trySite, close}, heroG, closeGround(close, closeShown))
    const drawn = walked.bands.filter(({seam}) => !!seam.paint?.texture || !!seam.paint?.photo || !!seam.paint?.window || !!seam.paint?.photoFade || (!!seam.fade && seam.paint?.ground === 'dark')).length
    if (needs.length > 0) return {none: true, note: ` Needs ${needs.map(needLabel).join(', ')}.`}
    if (drawn === 0) return {none: true, note: ` ${baseFlow.name} leaves it no section to draw on.`}
    const partly: string[] = []
    const wantsClose = f.on.close === 'photo' || f.on.dark === 'glow' || f.on.ends
    if (closeShown && wantsClose && footer === 'dark') partly.push(CLOSE_NEEDS_LIGHT_FOOTER)
    if ((f.on.dark === 'glow' || f.on.ends) && heroG !== 'dark') partly.push(HERO_NOT_DARK)
    return {none: false, note: partly.length ? ` Partly here: ${partly.join('; ')}.` : ''}
  }
  const suggestedId = SUGGESTED_WITH[baseFlow.family]
  const inForce = backgroundById(plan.inForce)
  const backgroundChoices = BACKGROUND_FAMILIES.map((f) => {
    const stepIn = inForce?.family === f.id ? inForce.id : null
    const id = stepIn ?? (suggestedId?.startsWith(`${f.id}.`) ? suggestedId : f.steps[0].step ? `${f.id}.${f.steps[0].step}` : f.id)
    const entry = backgroundById(id)!
    const reach = reachOf(id)
    const suggested = suggestedId === id || (!!suggestedId && suggestedId.split('.')[0] === f.id)
    return (
      <Choice key={f.id} href={at({background: id})} active={bg !== AS_THE_SITE_IS && bg !== OWN_BACKGROUND && inForce?.family === f.id} className={reach.none ? 'sw-family sw-dim' : 'sw-family'}>
        <strong>{f.name}{suggested ? ` (suggested with ${baseFlow.name})` : ''}</strong>
        <span className="sw-sentence">{entry.sentence}{reach.note}</span>
      </Choice>
    )
  })
  const backgroundFamily = bg !== AS_THE_SITE_IS && bg !== OWN_BACKGROUND && inForce ? BACKGROUND_FAMILIES.find((f) => f.id === inForce.family) ?? null : null
  // The set as this preview draws it (Phase 17E): choosing the theme approves every photograph of the set in the preview,
  // so the photographs the page places are read from the preview's own walk, with the preview's own look; beside the
  // approved hero photograph only, as the page draws it (none while the hero photograph waits for approval).
  const drawnSet = drawsHeroPhoto(shown) && heroPhoto && !photoChanged ? photoSetOf(chrome?.designTokens as Record<string, unknown> | null, heroPhoto.assetId) : []
  const placedSet = new Set<string>()
  // And how many places the page has for a photograph that the set leaves plain (record §2.2, amendment 11): the walk
  // again with a set longer than any page can use.
  let plainPlaces = 0
  if (drawnSet.length > 0) {
    // The close as the page resolves it beside the footer (Phase 18 session B, `closeOf`): a photograph only where it
    // stands apart from the footer, as `HomeBody` draws it.
    const footer = chromeSchemes(shown, chrome?.header?.mainNavigation, chrome?.footer?.footerSettings, {
      onLight: chrome?.header?.designSettings?.logoOnLight, onDark: chrome?.header?.designSettings?.logoOnDark,
    }).footer
    const above = walkPage(blocks, frameOf, {...site, flow: shown}, hero, null).last ?? hero
    const close = closeOf(shown, {footer, above, heroPhoto: !photoChanged, colors: chrome?.designTokens as Record<string, unknown> | null})
    const photoPlaces = (set: SetPhoto[]) => {
      const setSite = {...site, flow: shown, photoSet: set, closeShown, close}
      const used = new Set<number>(closeShown && close === 'photo' ? [0] : [])
      for (const b of walkPage(blocks, frameOf, setSite, hero, closeGround(close, closeShown)).bands) {
        const i = b.seam.paint?.photo?.index
        if (i !== undefined && set[i]) used.add(i)
      }
      return used
    }
    for (const i of photoPlaces(drawnSet)) placedSet.add(drawnSet[i].assetId)
    plainPlaces = Math.max(0, photoPlaces(Array.from({length: 12}, (_, k) => drawnSet[k % drawnSet.length])).size - placedSet.size)
  }

  return (
    <aside className="sw" aria-label="Design preview">
      <style dangerouslySetInnerHTML={{__html: SWITCHER_CSS}} />
      {/* Closed at first so the page is visible; opened once, it stays open across
          switches, because React does not manage the attribute and the element is kept. */}
      <details>
        <summary className="sw-line"><strong>Preview, nothing is live:</strong> {names(plan)}</summary>
        <div className="sw-row">
          <span className="sw-head">View</span>
          <Choice href={at({view: 'grey'})} active={choices.view === 'grey'}>Grey box</Choice>
          <Choice href={at({view: 'design'})} active={choices.view === 'design'}>Designed</Choice>
        </div>
        <div className="sw-row">
          <span className="sw-head">Style set</span>
          <Choice href={at({styleSet: AS_THE_SITE_IS})} active={choices.styleSet === AS_THE_SITE_IS}>As the site is: {wearsStyle}</Choice>
          <Preselected all={STYLE_SETS} ids={grant.suggest?.styleSet?.ids} offered={(t) => t.passed} active={choices.styleSet}>
            {(t) => <Choice key={t.id} href={at({styleSet: t.id})} active={choices.styleSet === t.id}>{t.passed ? t.name : `${t.name} (not yet judged)`}</Choice>}
          </Preselected>
        </div>
        {suggestedWhy(STYLE_SETS, grant.suggest?.styleSet, (t) => t.passed)}
        <div className="sw-row">
          <span className="sw-head">Palette</span>
          <Choice href={at({palette: AS_THE_SITE_IS})} active={choices.palette === AS_THE_SITE_IS}>As the site is: {wearsPalette}</Choice>
          {grant.brandPalette && (
            <Choice href={at({palette: BRAND_PALETTE})} active={choices.palette === BRAND_PALETTE}>
              <span className="sw-swatch" style={{background: grant.brandPalette.darkGround}} />
              <span className="sw-swatch" style={{background: grant.brandPalette.accent}} />
              {BRAND_PALETTE_NAME}
            </Choice>
          )}
          <Preselected all={PALETTE_PRESETS} ids={grant.suggest?.palette?.ids} offered={() => true} active={choices.palette}>
            {(p) => (
              <Choice key={p.id} href={at({palette: p.id})} active={choices.palette === p.id}>
                <span className="sw-swatch" style={{background: p.darkGround}} />
                <span className="sw-swatch" style={{background: p.accent}} />
                {p.name}
              </Choice>
            )}
          </Preselected>
        </div>
        {grant.brandPalette && <p className="sw-note sw-why">{BRAND_PALETTE_NAME}: {grant.brandPalette.why}</p>}
        {suggestedWhy(PALETTE_PRESETS, grant.suggest?.palette, () => true)}
        <div className="sw-row">
          <span className="sw-head">{ROW_THEME_HEAD}</span>
          <Choice href={at({flow: AS_THE_SITE_IS})} active={choices.flow === AS_THE_SITE_IS}>As the site is: {plan.wears.flow.name}</Choice>
          {/* The theme's three for the meeting (Phase 18 session E), each its exact step, then the families behind All. */}
          {suggestedFlows.map((f) => (
            <Choice key={f.id} href={at({flow: f.id})} active={choices.flow === f.id}>{f.name}</Choice>
          ))}
          {suggestedFlows.length > 0 ? (
            <details className="sw-all" open={(choices.flow !== AS_THE_SITE_IS && !suggestedFlows.some((f) => f.id === choices.flow)) || undefined}>
              <summary className="sw-choice">All ({FAMILIES.length} more)</summary>
              {familyChoices}
            </details>
          ) : familyChoices}
        </div>
        {suggestedFlows.length > 0 && grant.suggestTheme && <p className="sw-note sw-why">Suggested first: {grant.suggestTheme.why}</p>}
        {family && family.steps.length > 1 && (
          <div className="sw-row">
            <span className="sw-head">Step: {family.name}</span>
            {family.steps.map((s) => (
              <Choice key={s} href={at({flow: flowId(family.id, s)})} active={shown.step === s}>
                {DARKNESS_LABELS[s]}{family.passed.includes(s) ? '' : ' (not yet judged)'}
              </Choice>
            ))}
          </div>
        )}
        <div className="sw-row">
          <span className="sw-head">{ROW_BACKGROUND_HEAD}</span>
          <Choice href={at({background: AS_THE_SITE_IS})} active={bg === AS_THE_SITE_IS}>As the site is: {plan.wears.background?.name ?? 'the theme\u2019s own'}</Choice>
          <Choice href={at({background: OWN_BACKGROUND})} active={bg === OWN_BACKGROUND} className="sw-family">
            <strong>The theme&rsquo;s own</strong>
            <span className="sw-sentence">Under {baseFlow.name}: {describeOn(baseFlow.on)}.</span>
          </Choice>
          {backgroundChoices}
        </div>
        {backgroundFamily && backgroundFamily.steps.length > 1 && (
          <div className="sw-row">
            <span className="sw-head">{backgroundFamily.name}</span>
            {backgroundFamily.steps.map((st) => (
              // The family's unnamed step is the family's own id (`glow`), never `glow.null`, which the plan refuses.
              <Choice key={st.step ?? backgroundFamily.id} href={at({background: st.step ? `${backgroundFamily.id}.${st.step}` : backgroundFamily.id})} active={inForce?.id === (st.step ? `${backgroundFamily.id}.${st.step}` : backgroundFamily.id)}>{st.label}</Choice>
            ))}
          </div>
        )}
        <p className="sw-note">
          Background: {inForce ? `${inForce.name}. ${inForce.sentence} It replaces the theme\u2019s own (${describeOn(baseFlow.on)}).` : `the theme\u2019s own: ${describeOn(baseFlow.on)}.`} No background has been judged yet; a dimmed one has nothing to draw on here.
        </p>
        <p className="sw-note">
          Theme: {shown.name}. {shown.sentence}
          {unmet.length > 0 && ` Needs this page lacks: ${unmet.join(', ')}; it renders without them.`}
          {noGlow(shown) && ` ${NO_GLOW}`}
          {grounds.length > 0 && ` ${grounds.length} ${grounds.length === 1 ? 'section keeps' : 'sections keep'} their own ground, whatever the theme: ${keptLine(grounds)}.`}
          {photoChanged && ` The hero photograph changed since ${shown.name} was applied, so its photo sections show none: choose ${shown.name} and Apply to approve this one.`}
        </p>
        {drawsHeroPhoto(shown) && photoSet && photoSet.length > 0 && (
          <SetPhotos entries={photoSet} shown={shown} placed={placedSet} plain={plainPlaces} heroPhoto={!!heroPhoto} heroWaits={photoChanged} closeShown={closeShown} />
        )}
        <p className="sw-note">{headerNote}</p>
        {keep.length > 0 && (
          <p className="sw-note">Kept as set on the section, whatever the style set: {keptLine(keep)}.</p>
        )}
        {details.length > 0 && (
          <p className="sw-note">Details from Design Settings, whatever the style set: {details.map((d) => `${d.label.toLowerCase()} ${d.value}`).join('; ')}.</p>
        )}
        {clearedDetails.length > 0 && (
          <p className="sw-note">This palette clears {clearedDetails.join(', ')}, which pointed at the colors it replaces.</p>
        )}
        <p className="sw-note">Links on this page open the live site. Interior pages are not previewed.</p>
        {shareUrl && (
          <label className="sw-share">
            <span className="sw-head">Client link, ends {date(now + CLIENT_LINK_SECONDS)}</span>
            <input readOnly value={shareUrl} className="sw-input" aria-label="Client preview link" />
          </label>
        )}
        {retiredChoice && (
          <p className="sw-note">{retiredChoice} is no longer offered: this address shows it, and nothing applies it. A site already wearing it keeps its look.</p>
        )}
        <div className="sw-row">
          {apply && grant.apply ? (
            <a className="sw-action" href={`${grant.apply.origin}/#/design?t=${apply}`}>Apply ({changes} {changes === 1 ? 'field' : 'fields'})</a>
          ) : (
            <span className="sw-choice sw-inert">{changes === 0 ? 'Nothing to apply: this is the site as it is' : 'Apply opens from the Site Builder App'}</span>
          )}
          <Link className="sw-choice" href="/" prefetch={false}>Exit to the live site</Link>
        </div>
      </details>
    </aside>
  )
}

// Fixed and neutral: the bar must read the same over any style set and palette it
// shows, so it takes nothing from the site's tokens.
const SWITCHER_CSS = `
.sw{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#111;color:#f5f5f5;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-height:60vh;overflow:auto;box-shadow:0 -2px 12px rgba(0,0,0,.35);padding:8px 12px}
.sw *{font-family:inherit;letter-spacing:normal;text-transform:none}
.sw-line{margin:0;cursor:pointer}
.sw-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0}
.sw-head{font-size:12px;color:#aaa;min-width:72px}
.sw-choice,.sw-action{display:inline-flex;align-items:center;gap:4px;border:1px solid #8a8a8a;border-radius:4px;padding:4px 8px;color:#f5f5f5;text-decoration:none;font-size:13px;background:transparent}
.sw-family{flex-direction:column;align-items:flex-start;gap:0;max-width:30ch}
.sw-sentence{font-size:11px;line-height:1.3;color:#bbb}
.sw-active{background:#f5f5f5;color:#111;border-color:#f5f5f5}
.sw-active .sw-sentence{color:#444}
.sw-inert{color:#888;border-style:dashed;cursor:default}
.sw-dim{opacity:.6;border-style:dashed}
.sw-action{background:#2e7d32;border-color:#2e7d32;font-weight:600}
.sw-swatch{display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid rgba(255,255,255,.4)}
.sw-note{font-size:12px;color:#bbb;margin:8px 0 0}
.sw-share{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0}
.sw-all{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px}
.sw-all[open]{flex-basis:100%}
.sw-all>summary{list-style:none;cursor:pointer}
.sw-all>summary::-webkit-details-marker{display:none}
.sw-all>summary::after{content:" \\25B8"}
.sw-all[open]>summary::after{content:" \\25BE"}
.sw-why{margin-top:4px}
.sw-photos{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 0;flex-basis:100%}
.sw-photo{margin:0;display:flex;flex-direction:column;gap:4px;max-width:130px;font-size:11px;line-height:1.3;color:#bbb}
.sw-photo img{display:block;width:120px;height:75px;object-fit:contain;background:#000;border:1px solid #8a8a8a;border-radius:2px}
.sw-input{flex:1;min-width:240px;background:#222;color:#f5f5f5;border:1px solid #8a8a8a;border-radius:4px;padding:4px 6px;font-size:12px}
`

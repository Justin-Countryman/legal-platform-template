import Link from 'next/link'
import {STYLE_SETS} from '@/lib/styleSets'
import {PALETTE_PRESETS} from '@/lib/palettes'
import {DARKNESS_LABELS, FAMILIES, chromeSchemes, drawsHeroPhoto, familyOf, flowById, flowId, needLabel, unmetNeeds, type FlowFamily, type FlowRules} from '@/lib/flows'
import {type HeroPhoto} from '@/lib/heroGround'
import {type VisibleGround} from '@/lib/sectionSurface'
import {ghostSource} from '@/lib/brandMark'
import {canvasFacts, siteLookOf} from '@/components/sections/sectionFrame'
import {frameOf, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {type SiteChrome} from '@/components/layout/SiteShell'
import {
  APPLY_LINK_SECONDS, CLIENT_LINK_SECONDS, nowSeconds, signToken, type PreviewGrant,
} from '@/lib/preview/session'
import {AS_THE_SITE_IS, ownGrounds, ownLooks, previewPath, type PreviewChoices, type PreviewPlan} from '@/lib/preview/plan'

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
  /** The live hero photograph a Photo scrims choice would be approved with (Phase 17B session 6). */
  heroPhoto?: HeroPhoto | null
}

function names(plan: PreviewPlan): string {
  const s = plan.styleSet?.name ?? (plan.wears.styleSet ? `${plan.wears.styleSet.styleSet.name} (as the site is)` : 'the site\'s own style')
  const p = plan.palette?.name ?? (plan.wears.palette ? `${plan.wears.palette.name} (as the site is)` : 'the site\'s own colors')
  const f = plan.flow?.name ?? `${plan.wears.flow.name} (as the site is)`
  return `${s}, ${p}, ${f}`
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
  if (s.darkLogoMissing) out += ' The theme wants a dark header, which needs the logo for dark grounds; it stays light until one is uploaded.'
  return out
}

/** A family's button label: its name, and, for a family with one step the eye has not passed,
 *  that it is not yet judged (Phase 17B session 5: the step line that carries the mark only
 *  appears for a family with two steps). */
export function familyLabel(f: Pick<FlowFamily, 'name' | 'steps' | 'passed' | 'defaultStep'>): string {
  return f.steps.length === 1 && !f.passed.includes(f.defaultStep) ? `${f.name} (not yet judged)` : f.name
}

function Choice({href, active, className, children}: {href: string; active: boolean; className?: string; children: React.ReactNode}) {
  const classes = ['sw-choice', active && 'sw-active', className].filter(Boolean).join(' ')
  return (
    <Link href={href} prefetch={false} scroll={false} className={classes} aria-current={active ? 'true' : undefined}>
      {children}
    </Link>
  )
}

export function Switcher({grant, choices, plan, canvas, chrome, origin, hero = null, heroPhoto = null}: Props) {
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

  const share = signToken({v: 1, role: 'client', exp: now + CLIENT_LINK_SECONDS, ...choices})
  const shareUrl = share ? `${origin}/site-preview/enter?t=${share}` : null
  const changes = Object.keys(plan.set).length + plan.unset.length
  const apply = grant.apply && plan.rev && changes > 0
    ? signToken({
        v: 1, kind: 'apply', slug: grant.apply.slug, exp: now + APPLY_LINK_SECONDS, rev: plan.rev,
        set: plan.set, unset: plan.unset,
        styleSet: plan.styleSet ? {id: plan.styleSet.id, name: plan.styleSet.name} : null,
        palette: plan.palette ? {id: plan.palette.id, name: plan.palette.name} : null,
        flow: plan.flow ? {id: plan.flow.id, name: plan.flow.name} : null,
      })
    : null
  const blocks = (Array.isArray(canvas) ? canvas : []) as HomepageBlock[]
  const keep = ownLooks(blocks)
  const grounds = ownGrounds(blocks)
  const wearsStyle = plan.wears.styleSet ? plan.wears.styleSet.styleSet.name : 'Custom'
  const wearsPalette = plan.wears.palette ? plan.wears.palette.name : 'Custom'

  // The theme the page shows: the chosen one, else what the site renders. Its needs are
  // read against this page and the previewed site (the style set's texture, the firm's
  // initials), as the engine reads them.
  const shown: FlowRules = plan.flow ?? plan.wears.flow
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
  const lacks = (f: FlowRules | null) => (f ? unmetNeeds(f, canvasFacts(survivors, site, hero, f)).map(needLabel) : [])
  const unmet = lacks(shown)
  const headerNote = chromeNote(shown, chrome)

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
          {STYLE_SETS.map((t) => (
            <Choice key={t.id} href={at({styleSet: t.id})} active={choices.styleSet === t.id}>{t.name}</Choice>
          ))}
        </div>
        <div className="sw-row">
          <span className="sw-head">Palette</span>
          <Choice href={at({palette: AS_THE_SITE_IS})} active={choices.palette === AS_THE_SITE_IS}>As the site is: {wearsPalette}</Choice>
          {PALETTE_PRESETS.map((p) => (
            <Choice key={p.id} href={at({palette: p.id})} active={choices.palette === p.id}>
              <span className="sw-swatch" style={{background: p.darkGround}} />
              <span className="sw-swatch" style={{background: p.accent}} />
              {p.name}
            </Choice>
          ))}
        </div>
        <div className="sw-row">
          <span className="sw-head">{ROW_THEME_HEAD}</span>
          <Choice href={at({flow: AS_THE_SITE_IS})} active={choices.flow === AS_THE_SITE_IS}>As the site is: {plan.wears.flow.name}</Choice>
          {FAMILIES.map((f) => {
            const first = flowById(flowId(f.id, f.defaultStep))
            const missing = lacks(first)
            return (
              <Choice key={f.id} href={at({flow: flowId(f.id, f.defaultStep)})} active={choices.flow !== AS_THE_SITE_IS && family?.id === f.id} className="sw-family">
                <strong>{familyLabel(f)}</strong>
                <span className="sw-sentence">{f.sentence}{missing.length > 0 && ` Needs ${missing.join(', ')} this page lacks.`}</span>
              </Choice>
            )
          })}
        </div>
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
        <p className="sw-note">
          Theme: {shown.name}. {shown.sentence}
          {unmet.length > 0 && ` Needs this page lacks: ${unmet.join(', ')}; it renders without them.`}
          {grounds.length > 0 && ` ${grounds.length} ${grounds.length === 1 ? 'section keeps' : 'sections keep'} their own ground, whatever the theme: ${keptLine(grounds)}.`}
          {photoChanged && ` The hero photograph changed since ${shown.name} was applied, so its photo sections show none: choose ${shown.name} and Apply to approve this one.`}
        </p>
        <p className="sw-note">{headerNote}</p>
        {keep.length > 0 && (
          <p className="sw-note">Kept as set on the section, whatever the style set: {keptLine(keep)}.</p>
        )}
        <p className="sw-note">Links on this page open the live site. Interior pages are not previewed.</p>
        {shareUrl && (
          <label className="sw-share">
            <span className="sw-head">Client link, ends {date(now + CLIENT_LINK_SECONDS)}</span>
            <input readOnly value={shareUrl} className="sw-input" aria-label="Client preview link" />
          </label>
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
.sw-action{background:#2e7d32;border-color:#2e7d32;font-weight:600}
.sw-swatch{display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid rgba(255,255,255,.4)}
.sw-note{font-size:12px;color:#bbb;margin:8px 0 0}
.sw-share{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0}
.sw-input{flex:1;min-width:240px;background:#222;color:#f5f5f5;border:1px solid #8a8a8a;border-radius:4px;padding:4px 6px;font-size:12px}
`

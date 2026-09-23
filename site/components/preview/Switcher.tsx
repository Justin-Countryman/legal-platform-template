import Link from 'next/link'
import {THEMES} from '@/lib/themes'
import {PALETTE_PRESETS} from '@/lib/palettes'
import {
  APPLY_LINK_SECONDS, CLIENT_LINK_SECONDS, nowSeconds, signToken, type PreviewGrant,
} from '@/lib/preview/session'
import {AS_THE_SITE_IS, ownLooks, previewPath, type PreviewChoices, type PreviewPlan} from '@/lib/preview/plan'

// ─── The switcher ─────────────────────────────────────────────────────────────
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.5, `[R-507]`). Three rows of buttons
// on the preview page: style set, palette, and a theme row that is not built yet.
// Every button is a link to another preview address: the choices ARE the address, so
// a switch changes no state, writes nothing and cannot be triggered from another
// site; the page re-renders with the choice read from the URL.
//
// A server component with no browser code of its own: `next/link` is the framework's
// and already on every page. It is rendered only by the preview layout, after the
// session check, and the links, share link and Apply link it signs exist only in a
// response to a signed session.
//
// A CLIENT sees one line, the choices they were sent and when the link ends: never
// the roster (`[R-507]`). The role is inside the signed cookie, so it cannot be edited.

// Phase 17B session 2: the engine is built and the site renders the stored theme (or the
// six retired fields, or the platform default); the ROW that switches it is session 3's.
// Until then a style-set switch leaves the stored divider, ghost, overlap and gradient as
// they are, because a style set no longer writes them. The string is a bundle sentinel.
const ROW_THEME_NOTE = 'As the site stores it, until the theme row arrives (Phase 17B session 3)'

type Props = {
  grant: PreviewGrant
  choices: PreviewChoices
  plan: PreviewPlan
  canvas: unknown
  /** This site's own origin, from the request, for the share link. */
  origin: string
}

function names(plan: PreviewPlan): string {
  const s = plan.styleSet?.name ?? (plan.wears.styleSet ? `${plan.wears.styleSet.theme.name} (as the site is)` : 'the site\'s own style')
  const p = plan.palette?.name ?? (plan.wears.palette ? `${plan.wears.palette.name} (as the site is)` : 'the site\'s own colors')
  return `${s}, ${p}`
}

const date = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10)

/** "Content section (photo frame) ×2, Attorneys (card style)": one entry per kind. */
function keptLine(keep: {section: string; what: string}[]): string {
  const counts = new Map<string, number>()
  for (const k of keep) counts.set(`${k.section} (${k.what})`, (counts.get(`${k.section} (${k.what})`) ?? 0) + 1)
  return [...counts].map(([label, n]) => (n > 1 ? `${label} ×${n}` : label)).join(', ')
}

function Choice({href, active, children}: {href: string; active: boolean; children: React.ReactNode}) {
  return (
    <Link href={href} prefetch={false} scroll={false} className={active ? 'sw-choice sw-active' : 'sw-choice'} aria-current={active ? 'true' : undefined}>
      {children}
    </Link>
  )
}

export function Switcher({grant, choices, plan, canvas, origin}: Props) {
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
      })
    : null
  const keep = ownLooks(Array.isArray(canvas) ? canvas : [])
  const wearsStyle = plan.wears.styleSet ? plan.wears.styleSet.theme.name : 'Custom'
  const wearsPalette = plan.wears.palette ? plan.wears.palette.name : 'Custom'

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
          {THEMES.map((t) => (
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
          <span className="sw-head">Theme</span>
          <span className="sw-choice sw-inert" aria-disabled="true">{ROW_THEME_NOTE}</span>
        </div>
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
.sw-active{background:#f5f5f5;color:#111;border-color:#f5f5f5}
.sw-inert{color:#888;border-style:dashed;cursor:default}
.sw-action{background:#2e7d32;border-color:#2e7d32;font-weight:600}
.sw-swatch{display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid rgba(255,255,255,.4)}
.sw-note{font-size:12px;color:#bbb;margin:8px 0 0}
.sw-share{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0}
.sw-input{flex:1;min-width:240px;background:#222;color:#f5f5f5;border:1px solid #8a8a8a;border-radius:4px;padding:4px 6px;font-size:12px}
`

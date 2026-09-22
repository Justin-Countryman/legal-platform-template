import {headers} from 'next/headers'
import {notFound, redirect} from 'next/navigation'
import {SiteShell} from '@/components/layout/SiteShell'
import {Switcher} from '@/components/preview/Switcher'
import {analyticsOff} from '@/lib/preview/analytics'
import {loadPreview} from '@/lib/preview/load'

// ─── The preview address ──────────────────────────────────────────────────────
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.1, `[R-507]`). The homepage, drawn with
// the style set and palette in this address instead of the stored ones, and nothing
// written: `/site-preview/<style set>/<palette>/<view>`, where `site` in a slot means
// "as the site is" and the view is `design` or `grey`. It is the live site's own
// shell (`SiteShell`) and homepage (`HomeBody`) over a chrome carrying the choice.
//
// A layout receives its segments' params, so the choices reach the CSS the shell
// builds, which a query string never could. Rendered per request, behind a signed
// cookie scoped to this path; with no valid cookie it is a 404 and costs no Sanity
// query. The page checks the same session itself (see `lib/preview/load.ts`).
//
// Nothing here is reachable from a live route: no live route imports it, and the
// build's check (`scripts/ci/check-preview-not-shipped.mjs`) holds that none of its
// words reach a visitor's page or the browser's scripts.

export const dynamic = 'force-dynamic'

type Params = Promise<{styleSet: string; palette: string; view: string}>

export default async function PreviewLayout({children, params}: {children: React.ReactNode; params: Params}) {
  const {styleSet, palette, view} = await params
  const state = await loadPreview(styleSet, palette, view)
  if (state.kind === 'none') notFound()
  if (state.kind === 'redirect') redirect(state.path)
  if (state.kind === 'ended') {
    return (
      <main id="main-content" tabIndex={-1} style={{fontFamily: 'system-ui, sans-serif', padding: '64px 16px', textAlign: 'center'}}>
        <p>This preview has ended. Ask for a new link.</p>
      </main>
    )
  }

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
  const off = analyticsOff(state.liveChrome?.scripts)
  const switcher = (
    <Switcher grant={state.grant} choices={state.choices} plan={state.plan} canvas={state.home?.page?.canvas} origin={`${proto}://${host}`} />
  )

  return (
    <>
      {off && <script dangerouslySetInnerHTML={{__html: off}} />}
      {state.choices.view === 'grey' ? (
        // The grey box draws its own header and footer boxes, in its own greys: no
        // site CSS at all in this view.
        <main id="main-content" tabIndex={-1} className="outline-none">{children}</main>
      ) : (
        <SiteShell chrome={state.chrome}>{children}</SiteShell>
      )}
      {switcher}
    </>
  )
}

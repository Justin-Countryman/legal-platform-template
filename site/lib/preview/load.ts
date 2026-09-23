import {cache} from 'react'
import {client} from '@/lib/sanity/client'
import {getHomePage, getSiteChrome} from '@/lib/sanity/fetchers'
import {PREVIEW_STORED_DESIGN_QUERY} from '@/lib/sanity/queries'
import {type SiteChrome} from '@/components/layout/SiteShell'
import {type HomePageData} from '@/components/layout/HomeBody'
import {getPreviewSession, type PreviewGrant} from './session'
import {AS_THE_SITE_IS, parseChoices, planPreview, previewPath, withPreview, type PreviewChoices, type PreviewPlan, type StoredDesign} from './plan'

// ─── One read of the preview, shared by its layout, its page and the switcher ──
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.1, §2.3). The session is checked
// FIRST, before anything is fetched, and by every entry point: Next can render the
// page without its layout, so the layout's check alone guards nothing the page draws
// (measured in the challenge, §7.5). A request with no valid cookie costs no Sanity
// query. `cache()` makes it one read per request whichever entry point runs first.

export type PreviewState =
  | {kind: 'none'}
  | {kind: 'ended'}
  /** A client's session is bound to the choices it was sent; another address is sent back to them. */
  | {kind: 'redirect'; path: string}
  | {
      kind: 'live'
      grant: PreviewGrant
      choices: PreviewChoices
      plan: PreviewPlan
      /** The chrome with the plan applied: what `SiteShell` and `HomeBody` draw from. */
      chrome: SiteChrome
      /** The chrome as the site has it, for what the switcher names "as the site is". */
      liveChrome: SiteChrome
      home: HomePageData
    }

export const loadPreview = cache(async (styleSet: string, palette: string, flow: string, view: string): Promise<PreviewState> => {
  const session = await getPreviewSession()
  if (session.state === 'none') return {kind: 'none'}
  if (session.state === 'ended') return {kind: 'ended'}
  const {grant} = session

  const asked = parseChoices(styleSet, palette, flow, view)
  let choices = asked
  if (grant.role === 'client') {
    // A client link minted before the theme row carries no `flow`: read as the site is.
    choices = parseChoices(grant.styleSet ?? '', grant.palette ?? '', grant.flow ?? AS_THE_SITE_IS, grant.view ?? '')
    if (choices && (!asked || previewPath(asked) !== previewPath(choices))) {
      return {kind: 'redirect', path: previewPath(choices)}
    }
  }
  if (!choices) return {kind: 'none'}

  const [liveChrome, home, stored] = await Promise.all([
    getSiteChrome(),
    getHomePage(),
    client.fetch(PREVIEW_STORED_DESIGN_QUERY) as Promise<StoredDesign | null>,
  ])
  const plan = planPreview(stored, choices)
  return {kind: 'live', grant, choices, plan, chrome: withPreview(liveChrome, plan), liveChrome, home}
})

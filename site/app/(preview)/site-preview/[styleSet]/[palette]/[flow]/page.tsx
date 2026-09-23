import {notFound, redirect} from 'next/navigation'
import {getPreviewSession} from '@/lib/preview/session'
import {AS_THE_SITE_IS, parseChoices, previewPath} from '@/lib/preview/plan'

// ─── The three-segment address, for one pin ───────────────────────────────────
//
// Phase 17B session 3 (monorepo WS-V1-PHASE17B-DESIGN §2.10, amendment 16). The
// preview address gained a theme slot: `/site-preview/<style set>/<palette>/<theme>/
// <view>`. A browser already inside a session opened at the old pin still holds the
// three-segment address, whose third slot is the view; it is sent to the same page
// with the theme as the site is. Next requires one slug name per position, so this
// folder is `[flow]` and the segment is read as the old view here. It reaches nobody
// without a session: the same check the layout and the page make, first. Deleted at
// the next pin, when every open session has ended (a client link lasts 14 days).

export const dynamic = 'force-dynamic'

type Params = Promise<{styleSet: string; palette: string; flow: string}>

export default async function ThreeSegmentPreview({params}: {params: Params}) {
  const {styleSet, palette, flow: view} = await params
  const session = await getPreviewSession()
  if (session.state === 'none') notFound()
  const choices = parseChoices(styleSet, palette, AS_THE_SITE_IS, view)
  if (!choices) notFound()
  redirect(previewPath(choices))
}

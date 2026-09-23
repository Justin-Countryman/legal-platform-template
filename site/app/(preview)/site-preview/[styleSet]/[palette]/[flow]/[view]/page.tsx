import type {Metadata} from 'next'
import {notFound, redirect} from 'next/navigation'
import {HomeBody} from '@/components/layout/HomeBody'
import {GreyBox} from '@/components/preview/GreyBox'
import {loadPreview} from '@/lib/preview/load'

// The preview's page (Phase 17A; see the layout beside it). It checks the session
// itself, first: Next can render a page without running its layout, and a check in
// the layout alone let the whole page out to a request with no cookie (measured,
// monorepo WS-V1-PHASE17A-DESIGN §7.5).

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Design preview',
  robots: {index: false, follow: false},
}

type Params = Promise<{styleSet: string; palette: string; flow: string; view: string}>

export default async function PreviewPage({params}: {params: Params}) {
  const {styleSet, palette, flow, view} = await params
  const state = await loadPreview(styleSet, palette, flow, view)
  if (state.kind === 'none') notFound()
  if (state.kind === 'redirect') redirect(state.path)
  if (state.kind === 'ended') return null
  if (state.choices.view === 'grey') return <GreyBox chrome={state.liveChrome} home={state.home} />
  return <HomeBody chrome={state.chrome} all={state.home} />
}

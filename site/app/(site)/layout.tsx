// Per-route `revalidate` controls cache TTL (86400s baseline, 3600s for the two
// events routes; monorepo [R-660]); the Sanity webhook revalidates on publish.
// Layout itself has no revalidate export — Next inherits the route's.
//
// The layout's body is `SiteShell` (Phase 17A); this file fetches the chrome and
// hands it over, so the preview address can hand the same shell a different one.

import {getSiteChrome} from '@/lib/sanity/fetchers'
import {SiteShell} from '@/components/layout/SiteShell'

export default async function SiteLayout({children}: {children: React.ReactNode}) {
  // The chrome is one request per render, shared with the root layout, the
  // robots decision and the page (lib/sanity/fetchers.ts); these four were
  // four requests until 2026-09-13.
  return <SiteShell chrome={await getSiteChrome()}>{children}</SiteShell>
}

import {createClient} from 'next-sanity'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-01-01',
  // useCdn:false on the server so on-demand revalidation (Sanity webhook ->
  // /api/revalidate) always re-fetches the LIVE value. With useCdn:true the
  // revalidation raced the CDN (~60s stale) and re-cached the *previous*
  // published value — settings changes (e.g. mobileLayout) appeared one edit
  // behind. Next's Data Cache + per-route ISR remain the caching layer.
  useCdn: false,
  // THE PERSPECTIVE IS STATED, never defaulted (monorepo OUTSTANDING item 285).
  // On API versions before 2025-02-19 the client's default is `raw`, under
  // which a draft sorts before its published document and `[0]` on a
  // singleton can be the draft. In production this client carries no token, so
  // drafts are invisible at any perspective; the pin is so that adding a token
  // (or bumping the API version) cannot change what a page reads. `published`
  // on 2024-01-01 excludes drafts and can never see versions, which is what
  // `published` means on the newer versions too. The dev branch below keeps
  // `previewDrafts` on purpose.
  perspective: 'published' as const,
  // CI only. `scripts/ci/content-lake-stub.mjs` stands in for the Content Lake
  // so `next build` can run with no project (monorepo OUTSTANDING item 255).
  // Non-public on purpose: it is read on the server at build time, never
  // inlined into a browser bundle, and no Vercel build sets it. With
  // `useProjectHostname: false` the project id travels as a header, so the
  // shipped sentinel id needs no placeholder.
  ...(process.env.SANITY_API_HOST_OVERRIDE
    ? {apiHost: process.env.SANITY_API_HOST_OVERRIDE, useProjectHostname: false}
    : {}),
  ...(process.env.NODE_ENV !== 'production' && process.env.SANITY_API_READ_TOKEN
    ? {
        token: process.env.SANITY_API_READ_TOKEN,
        perspective: 'previewDrafts' as const,
      }
    : {}),
})

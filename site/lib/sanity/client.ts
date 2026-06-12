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
  ...(process.env.NODE_ENV !== 'production' && process.env.SANITY_API_READ_TOKEN
    ? {
        token: process.env.SANITY_API_READ_TOKEN,
        perspective: 'previewDrafts' as const,
      }
    : {}),
})

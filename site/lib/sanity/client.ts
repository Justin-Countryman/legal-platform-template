import {createClient} from 'next-sanity'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  ...(process.env.NODE_ENV !== 'production' && process.env.SANITY_API_READ_TOKEN
    ? {
        token: process.env.SANITY_API_READ_TOKEN,
        perspective: 'previewDrafts' as const,
      }
    : {}),
})

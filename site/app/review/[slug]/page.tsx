export const revalidate = 3600

import {notFound} from 'next/navigation'
import {titleFragment} from '@/lib/tokens'
import type {Metadata} from 'next'
import {client} from '@/lib/sanity/client'
import {REVIEW_PAGE_QUERY, REVIEW_SLUGS_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {expandNapTokens} from '@/lib/tokens'
import {ReviewPageContent} from '@/components/review/ReviewPageContent'

type Props = {params: Promise<{slug: string}>}

// ─── Static params ────────────────────────────────────────────────────────────
// Review slugs are bare in Sanity (carry the conventional `review-` prefix
// as part of the slug itself, e.g. `review-us-maple-grove`).

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(REVIEW_SLUGS_QUERY)
  return slugs.map((slug) => ({slug}))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const data = await client.fetch(REVIEW_PAGE_QUERY, {slug})
  if (!data?.page) return {}
  return {
    title: titleFragment(data.page.seoTitle, data.page.h1, null),
    robots: {index: false, follow: false},
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReviewPage({params}: Props) {
  const {slug} = await params
  const [data, rawTokens] = await Promise.all([
    client.fetch(REVIEW_PAGE_QUERY, {slug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])

  if (!data?.page) notFound()

  const napTokens = expandNapTokens(rawTokens)

  return (
    <ReviewPageContent
      page={data.page}
      logo={data.logo}
      firmInfo={data.firmInfo}
      napTokens={napTokens}
    />
  )
}

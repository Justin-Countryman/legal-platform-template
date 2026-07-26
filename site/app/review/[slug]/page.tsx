export const revalidate = 3600

import {notFound} from 'next/navigation'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {resolveTitle} from '@/lib/seoTitle'
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
  const [data, rawTokens] = await Promise.all([
    client.fetch(REVIEW_PAGE_QUERY, {slug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  if (!data?.page) return {}
  // This route is outside the (site) group and did not previously read NAP
  // tokens in generateMetadata. TITLE-2 needs the firm name, so it does now.
  const tokens = expandNapTokens(rawTokens)
  // Search visibility comes from the DATA, like every other route — the review
  // shell is written `noIndex: true` by Site-Prep, which is the one place that
  // decides (BE/_shared/search_visibility.py). This route used to hardcode
  // `{index:false, follow:false}` and ignore the `noIndex` it already
  // projected; that was one of three mechanisms hiding review pages, and the
  // 2026-07-25 ruling collapsed them to one. Doctrine:
  // `BI-URL-Architecture.md` → Search visibility.
  return {
    title: resolveTitle(data.page.seoTitle, data.page.h1, tokens, tokens?.firmName).title,
    ...(await buildRobotsMeta(data.page.noIndex, data.page.noFollow)),
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

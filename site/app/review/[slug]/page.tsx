export const revalidate = 3600

import {notFound} from 'next/navigation'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {resolveTitle} from '@/lib/seoTitle'
import type {Metadata} from 'next'
import {client} from '@/lib/sanity/client'
import {REVIEW_PAGE_QUERY, REVIEW_SLUGS_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
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
  // NAME-2: an empty field uses NAME, and nothing reads the Heading as a
  // fallback for anything. This passed `h1` until 2026-07-31, which is the one
  // place in the site that still did — `reviewPage` carries no `seoTitle` field
  // in its schema, so its Search title is always empty and the fallback rung is
  // the whole of its title. NAME-6 named this behaviour change when the rule was
  // ruled and it did not land then: the page now reads `Review Mendota Heights`
  // rather than the H1's `Review Our Mendota Heights Office`. That is the ruling
  // working, not a regression.
  //
  // ─── The three gaps queue line 11 closed, 2026-08-10 ─────────────────────
  //
  // `seoTitle` used to be read here and `reviewPage` does not declare it, so
  // the first argument was always null. It is passed explicitly as null now,
  // because the fallback IS the behaviour and reading a field that does not
  // exist made it look accidental.
  const {title, label} = resolveTitle(null, data.page.title, tokens, tokens?.firmName)

  // TECH-2: every page that renders at a URL carries a self-referencing
  // canonical, and this route emitting none was named a DEFECT rather than an
  // exemption. A hidden page carries one too — `noIndex` and a canonical answer
  // different questions.
  //
  // THE PUBLIC URL IS `/<slug>`, NOT `/review/<slug>`. `proxy.ts` rewrites
  // `/review-*` onto this route and the browser URL never changes, so the
  // internal path is the one address this page must not name.
  const canonical = `/${data.page.slug}`

  // TECH-4: every page emits a card, and this was the route emitting none —
  // found during item 91's build and not acted on until now. No override
  // arguments: `reviewPage` carries no `ogTitle`, `ogDescription` or
  // `ogImageOverride`, and the builder's contract says omitting them is correct
  // for a type that has none.
  //
  // TECH-5, landed 2026-08-10 with the schema field, closing the last half of
  // queue line 11. The description argument was `undefined` here because the type
  // declared no `metaDescription` at all — the rule was unreachable on this page
  // type rather than satisfied on it. It reads the stored value now, like every
  // other route, and the card body has a fallback to read.
  //
  // `|| undefined` rather than the bare string, because `resolveTokenString`
  // answers `''` for an absent field and TECH-5 rules that a page with no meta
  // description emits NO tag. Same polarity the homepage uses.
  const description = resolveTokenString(data.page.metaDescription, tokens) || undefined

  return {
    title,
    description,
    ...(await buildRobotsMeta(data.page.noIndex, data.page.noFollow)),
    alternates: {canonical},
    ...buildSocialMeta(label, description),
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

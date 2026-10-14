export const revalidate = 86400

import {buildRobotsMeta} from '@/lib/robotsMeta'
import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import Link from 'next/link'
import {CASE_RESULT_PAGE_QUERY, CASE_RESULT_SLUGS_QUERY} from '@/lib/sanity/queries'
import {chromeDesignTokens, chromeGlobalCta, chromeNap, fetchCached, getSiteChrome, chromeClose} from '@/lib/sanity/fetchers'
import {headingFaceWithAdvances} from '@/lib/headingAdvances'
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {resolveTitle} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {resolveResultsDisclaimer} from '@/lib/legal'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS, resolvePageLabel} from '@/lib/pageLabel'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {siteHost} from '@/lib/siteHost'

// ─── A case result's own page (monorepo backlog 454) ──────────────────────────
//
// Served only for a result whose own-page switch is on and whose address is
// `case-results/` and one name (CASE_RESULT_HAS_PAGE, in the query); any other is a
// 404, and is never listed or linked. WS-CASE-RESULTS-DESIGN-2026-10-13.md §11.
//
// THE HEADLINE NAMES THE CASE, NEVER THE RESULT (monorepo [R-702] rule 7: no
// result in a title, meta description or H1, even a true one). The Result is the
// large line under the heading, with the disclaimer directly under it, where a
// reader of the result reads it (§5: NC 2009 FEO 16, the prominence opinions).
// JSON-LD is the trail's BreadcrumbList only: a firm's own result is not a review,
// and Review or rating markup on one breaks Google's self-serving review rule (§4).

// ─── Static params ────────────────────────────────────────────────────────────
// Stored as `case-results/{name}`; the URL segment is the bare `{name}`, as the
// blog's posts are.

export async function generateStaticParams() {
  const slugs = (await fetchCached<string[]>(CASE_RESULT_SLUGS_QUERY)) ?? []
  return slugs
    .filter((s) => s.startsWith('case-results/'))
    .map((s) => ({slug: s.slice('case-results/'.length)}))
}

type Props = {params: Promise<{slug: string}>}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const fullSlug = `case-results/${slug}`
  const [result, rawTokens] = await Promise.all([fetchCached(CASE_RESULT_PAGE_QUERY, fullSlug), chromeNap()])
  if (!result) return {title: INDEX_PAGE_PRESETS.caseResultIndex}
  const tokens = expandNapTokens(rawTokens)

  // NAME-1 / NAME-2: the SEO Title, else the page's name; the Result never.
  const {title, label} = resolveTitle(result.seoTitle, resolvePageLabel(result), tokens, tokens?.firmName)
  const description = resolveTokenString(result.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(result.noIndex, result.noFollow)),
    alternates: {canonical: result.canonicalUrl ?? `/${fullSlug}`},
    ...buildSocialMeta(label, description, result?.ogImage, {
      ogTitle: result?.ogTitle, ogDescription: result?.ogDescription, tokens,
    }),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CaseResultPage({params}: Props) {
  const {slug} = await params
  const fullSlug = `case-results/${slug}`

  const [result, globalCtaData, rawTokens, designTokens] = await Promise.all([
    fetchCached(CASE_RESULT_PAGE_QUERY, fullSlug),
    chromeGlobalCta(),
    chromeNap(),
    chromeDesignTokens(),
  ])
  if (!result) notFound()

  const tokens = expandNapTokens(rawTokens)
  // The heading band reads the internal hero's scheme, as a blog post's does.
  const isDark = designTokens?.internalHeroBackground !== 'light'
  // The Name is the heading (NAME-2: nothing falls back to anything else).
  const h1 = resolveTokenString(result.title, tokens)
  const disclaimer = resolveResultsDisclaimer(result.resultsDisclaimer)
  const kind = [result.caseType, result.year].filter(Boolean).join(' · ')
  const area = result.practiceArea?.slug ? result.practiceArea : result.areaOfLaw?.slug ? result.areaOfLaw : null

  // CRUMB-2: a page named by a headline ends its trail at its parent, as a blog
  // post's does, so the trail is Home, then the Case Results page.
  const breadcrumbItems = [
    {label: 'Home', href: '/'},
    {label: INDEX_PAGE_PRESETS.caseResultIndex, href: '/case-results'},
  ]

  return (
    <>
      <header
        data-ring-context={isDark ? 'dark' : undefined}
        className={`${isDark ? 'bg-brand-dark' : 'bg-hero-tint'} px-[5%] py-12 md:py-16 lg:py-20`}
      >
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="font-bold leading-tight text-3xl md:text-4xl lg:text-5xl text-foreground">{h1}</h1>
          </div>
        </div>
      </header>

      {/* CRUMB-1: its own strip below the heading band. CRUMB-2's headline exception: no rung is this page. */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={breadcrumbItems} domain={siteHost()} endsOnCurrentPage={false} />
        </div>
      </div>

      <article className="px-[5%] py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            {/* The result, as its card draws it, and the disclaimer directly under it. REQUIRED. */}
            <div data-card="" data-ring-context="light" className="rounded-ui bg-muted p-6 shadow-card-rest md:p-8">
              {result.amount ? (
                <p className="font-heading text-2xl font-bold text-foreground md:text-3xl">{result.amount}</p>
              ) : null}
              {kind ? (
                <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">{kind}</p>
              ) : null}
              {result.caption ? <p className="mt-3 text-foreground-muted">{result.caption}</p> : null}
              {area ? (
                <p className="mt-4 text-sm text-foreground-muted">
                  <Link href={`/${area.slug}/`} className="font-semibold text-foreground underline underline-offset-2">
                    {area.label}
                  </Link>
                </p>
              ) : null}
            </div>
            <p data-testid="results-disclaimer" className="mt-4 text-sm text-foreground-subtle">
              {disclaimer}
            </p>

            {result.body ? (
              <div className="mt-10">
                <PortableTextRenderer value={result.body} napTokens={tokens} />
              </div>
            ) : null}
          </div>
        </div>
      </article>

      {globalCtaData && (
        <GlobalCta headingFace={headingFaceWithAdvances((await getSiteChrome())?.designTokens)}
          data={globalCtaData} surface={await chromeClose()} napTokens={tokens}
        />
      )}
    </>
  )
}

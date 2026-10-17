export const revalidate = 86400

import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {CASE_RESULT_INDEX_QUERY} from '@/lib/sanity/queries'
import {chromeGlobalCta, chromeNap, fetchCached, getSiteChrome, chromeClose} from '@/lib/sanity/fetchers'
import {headingFaceWithAdvances} from '@/lib/headingAdvances'
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {resolveTitle} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {resolveResultsDisclaimer} from '@/lib/legal'
import {InternalHero} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS, resolvePageLabel} from '@/lib/pageLabel'
import {siteHost} from '@/lib/siteHost'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {withCtaOverride} from '@/lib/ctaOverride'
import {CASE_RESULT_TIERS, NARROW_FEW, countGridClasses} from '@/components/sections/countGrid'
import {isShownResult} from '@/components/sections/CaseResultsSection'
import {CaseResultCard} from '@/components/ui/CaseResultCard'
import {type CaseResultItem} from '@/components/sections/sectionProps'

// ─── The Case Results page (monorepo backlog 454) ─────────────────────────────
//
// Every case result as a card, newest first, one list (Justin, 2026-10-14: "a case
// results index page which would just be a big list of cards"). A card with a page
// of its own links to it; the rest link nowhere. The disclaimer sits once, directly
// below the list, at 14px (Justin, 2026-10-14: "show it once below the cards", "make
// it 14 then"; monorepo [R-717]). Served when at least one result has something to show, and a 404
// otherwise, so a firm with none has no empty page; `sitemap.xml` lists it by the
// same test. The page document (`caseResultIndex`) is optional: without one the
// page takes its preset name.

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const [page, rawTokens] = await Promise.all([fetchCached(CASE_RESULT_INDEX_QUERY), chromeNap()])
  if (!page) return {title: INDEX_PAGE_PRESETS.caseResultIndex}
  const tokens = expandNapTokens(rawTokens)

  const {title, label} = resolveTitle(page.seoTitle, resolvePageLabel(page, 'caseResultIndex') ?? '', tokens, tokens?.firmName)
  const description = resolveTokenString(page.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(page.noIndex, page.noFollow)),
    alternates: {canonical: page.canonicalUrl ?? '/case-results'},
    ...buildSocialMeta(label, description, page?.ogImage, {
      url: page.canonicalUrl ?? '/case-results',
      ogTitle: page?.ogTitle, ogDescription: page?.ogDescription, tokens,
    }),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CaseResultsPage() {
  const [page, globalCtaData, rawTokens] = await Promise.all([
    fetchCached(CASE_RESULT_INDEX_QUERY),
    chromeGlobalCta(),
    chromeNap(),
  ])
  // Belt-and-suspenders: the query keeps only shown results; this keeps a null or a
  // blank out whatever a query regression returns.
  const results: CaseResultItem[] = (page?.results ?? []).filter(
    (r: CaseResultItem | null): r is CaseResultItem => r != null && isShownResult(r),
  )
  if (results.length === 0) notFound()

  const tokens = expandNapTokens(rawTokens)
  // NAME-3: one resolver, and this route names nothing itself.
  const pageLabel = resolvePageLabel(page, 'caseResultIndex') ?? ''
  const disclaimer = resolveResultsDisclaimer(page?.resultsDisclaimer)
  const grid = countGridClasses(results.length, CASE_RESULT_TIERS, NARROW_FEW)

  return (
    <>
      {/* Hero — InternalHero when configured, fallback header band otherwise. h1 always ships. */}
      {page?.hero ? (
        <InternalHero data={page.hero} napTokens={tokens} />
      ) : (
        <InternalPageHeader title={pageLabel} />
      )}

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: pageLabel, href: '/case-results'}]} domain={siteHost()} />
        </div>
      </div>

      {/* Every result, the disclaimer once below them. REQUIRED: see CaseResultsSection.tsx's header. */}
      <div className="px-[5%] py-12 md:py-16 lg:py-20">
        <div className="container">
          <ul role="list" className={`${grid.list} gap-6`} aria-label="Case results">
            {results.map((r, i) => (
              <CaseResultCard key={r._id ?? i} result={r} level="h2" className={grid.items[i]} />
            ))}
          </ul>
          <p data-testid="results-disclaimer" className="mx-auto mt-8 max-w-3xl text-center text-sm text-foreground-subtle">
            {disclaimer}
          </p>
        </div>
      </div>

      {/* Global CTA */}
      {!page?.hideCtaForm && globalCtaData && (
        <GlobalCta headingFace={headingFaceWithAdvances((await getSiteChrome())?.designTokens)}
          data={withCtaOverride(globalCtaData, page?.ctaOverride)} surface={await chromeClose()}
          napTokens={tokens}
        />
      )}
    </>
  )
}

export const revalidate = 3600

import type {Metadata} from 'next'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {client} from '@/lib/sanity/client'
import {
  SERVICE_AREA_INDEX_QUERY,
  SERVICE_AREA_PAGES_QUERY,
  GLOBAL_CTA_QUERY,
  NAP_TOKENS_QUERY,
} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {cityFromServiceAreaSlug} from '@/lib/serviceAreaCity'
import {resolveTitle, SERVICE_AREA_INDEX_PAGE_NAME} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {Tagline} from '@/components/ui/Tagline'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {ServiceAreaIndexClient} from '@/components/sections/ServiceAreaIndexClient'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const [indexPage, rawTokens] = await Promise.all([
    client.fetch(SERVICE_AREA_INDEX_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!indexPage) return {title: 'Service Area'}

  // TITLE-10: the title-tag fallback is a fixed page name, deliberately NOT
  // `indexPage.title` (which is the hero heading, else "Service Area", and is
  // what the H1 and breadcrumb use). Only the title tag changes.
  const {title, label} = resolveTitle(
    indexPage.seoTitle,
    SERVICE_AREA_INDEX_PAGE_NAME,
    tokens,
    tokens?.firmName,
  )
  const description = resolveTokenString(indexPage.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(indexPage.noIndex, indexPage.noFollow)),
    alternates: {canonical: indexPage.canonicalUrl ?? '/service-area'},
    ...buildSocialMeta(label, description, indexPage?.ogImage),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ServiceAreaIndexPage() {
  const [indexPage, pages, globalCtaData, rawTokens] = await Promise.all([
    client.fetch(SERVICE_AREA_INDEX_QUERY),
    client.fetch(SERVICE_AREA_PAGES_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)

  // The card label is the CITY ALONE (ruled 2026-07-28). Mapped here rather
  // than inside ServiceAreaIndexClient so that component is untouched: it
  // builds its A-Z buckets and runs its search on `displayName`, so both follow
  // the ruling without a change of their own. That is the whole reason the
  // label is narrowed at the source instead of being special-cased downstream.
  const cards = ((pages ?? []) as {slug: string; title: string}[]).map((p) => ({
    slug: p.slug,
    displayName: cityFromServiceAreaSlug(p.slug) || p.title,
  }))

  const tagline = resolveTokenString(indexPage?.tagline, tokens)
  const heading = resolveTokenString(indexPage?.heading, tokens)
  const description = resolveTokenString(indexPage?.description, tokens)
  const hasIntro = !!(tagline || heading || description)

  return (
    <>
      {/* Hero — InternalHero when configured, fallback header band otherwise. h1 always ships. */}
      {indexPage?.hero ? (
        <InternalHero data={indexPage.hero} napTokens={tokens} />
      ) : (
        <InternalPageHeader title={indexPage?.title ?? 'Service Area'} />
      )}

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: 'Service Area', href: '/service-area/'}]} />
        </div>
      </div>

      {/* Intro copy (optional) */}
      {hasIntro && (
        <div className="bg-muted px-[5%] py-10 md:py-12">
          <div className="container max-w-3xl">
            {tagline && (
              <Tagline as="p">
                {tagline}
              </Tagline>
            )}
            {heading && (
              <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">{heading}</h2>
            )}
            {description && (
              <p className="text-foreground-muted">{description}</p>
            )}
          </div>
        </div>
      )}

      {/* City grid */}
      <section className="px-[5%] pt-8 pb-16 md:pt-10 md:pb-24 lg:pb-28">
        <div className="container">
          <ServiceAreaIndexClient pages={cards} />
        </div>
      </section>

      {/* Global CTA */}
      {!(indexPage?.hideCtaForm) && globalCtaData && (
        <GlobalCta
          data={
            indexPage?.ctaOverride
              ? {...globalCtaData, ...indexPage.ctaOverride}
              : globalCtaData
          }
          napTokens={tokens}
        />
      )}
    </>
  )
}

export const revalidate = 3600

import type {Metadata} from 'next'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {client} from '@/lib/sanity/client'
import {TESTIMONIALS_PAGE_QUERY, GLOBAL_CTA_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {resolveTitle} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS, resolvePageLabel} from '@/lib/pageLabel'
import {siteHost} from '@/lib/siteHost'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {TestimonialCard, type TestimonialData} from '@/components/ui/TestimonialCard'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const [page, rawTokens] = await Promise.all([
    client.fetch(TESTIMONIALS_PAGE_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  if (!page) return {title: INDEX_PAGE_PRESETS.testimonialsPage}
  const tokens = expandNapTokens(rawTokens)

  const {title, label} = resolveTitle(page.seoTitle, resolvePageLabel(page, 'testimonialsPage') ?? '', tokens, tokens?.firmName)
  const description = resolveTokenString(page.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(page.noIndex, page.noFollow)),
    alternates: {canonical: page.canonicalUrl ?? '/testimonials'},
    ...buildSocialMeta(label, description, page?.ogImage),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TestimonialsPage() {
  const [page, globalCtaData, rawTokens] = await Promise.all([
    client.fetch(TESTIMONIALS_PAGE_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  // NAME-3: one resolver, and this route names nothing itself.
  const pageLabel = resolvePageLabel(page, 'testimonialsPage') ?? ''
  // Belt-and-suspenders null filter — paired with GROQ post-projection
  // [defined(_id)] (see queries.ts TESTIMONIALS_PAGE_QUERY); guards against
  // future query regressions that bypass the canonical safe-defaults pattern.
  const testimonials: TestimonialData[] = (page?.testimonials ?? []).filter(
    (t: TestimonialData | null): t is TestimonialData => t !== null
  )

  return (
    <>
      {/* Hero — InternalHero when configured, fallback header band otherwise. h1 always ships. */}
      {page?.hero ? (
        <InternalHero data={page.hero} napTokens={tokens} />
      ) : (
        <InternalPageHeader title={page?.hero?.heading ?? pageLabel} />
      )}

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: pageLabel, href: '/testimonials/'}]} domain={siteHost()} />
        </div>
      </div>

      {/* Body */}
      <div className="px-[5%] py-12 md:py-16 lg:py-20">
        <div className="container">

          {/* Testimonials grid */}
          {testimonials.length > 0 ? (
            <ul
              role="list"
              className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Client testimonials"
            >
              {testimonials.map((t) => (
                <li key={t._id}>
                  <TestimonialCard t={t} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-foreground-muted">No testimonials added yet.</p>
          )}

        </div>
      </div>

      {/* Global CTA */}
      {!page?.hideCtaForm && globalCtaData && (
        <GlobalCta
          data={page?.ctaOverride ? {...globalCtaData, ...page.ctaOverride} : globalCtaData}
          napTokens={tokens}
        />
      )}
    </>
  )
}

export const revalidate = 3600

import type {Metadata} from 'next'
import {client} from '@/lib/sanity/client'
import {CONTACT_PAGE_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {resolveTokenString, expandNapTokens} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {Tagline} from '@/components/ui/Tagline'
import {FormEmbed} from '@/components/layout/footers/FormEmbed'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const [page, rawTokens] = await Promise.all([
    client.fetch(CONTACT_PAGE_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  if (!page) return {title: 'Contact'}
  const tokens = expandNapTokens(rawTokens)

  const title = resolveTokenString(page.seoTitle, tokens)
  const description = resolveTokenString(page.metaDescription, tokens)
  return {
    title,
    description,
    ...(page.noIndex ? {robots: {index: false, follow: false}} : {}),
    alternates: {canonical: page.canonicalUrl ?? '/contact'},
    ...buildSocialMeta(title, description),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ContactPage() {
  const [page, rawTokens] = await Promise.all([
    client.fetch(CONTACT_PAGE_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)

  const tagline = resolveTokenString(page?.tagline, tokens)
  const heading = resolveTokenString(page?.heading, tokens)
  const description = resolveTokenString(page?.description, tokens)
  const hasIntro = tagline || heading || description
  const needsFallbackH1 = !page?.showHero  // Always render intro h1 when no hero ships above

  return (
    <>
      {/* Hero */}
      {page?.showHero && page?.hero && <InternalHero data={page.hero} napTokens={tokens} />}

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: 'Contact', href: '/contact/'}]} />
        </div>
      </div>

      {/* Body */}
      <div className="px-[5%] py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl">

            {/* Optional intro copy — also hosts the page's h1 in the no-hero fallback path */}
            {(hasIntro || needsFallbackH1) && (
              <div className="mb-10">
                {tagline && (
                  <Tagline as="p">
                    {tagline}
                  </Tagline>
                )}
                {needsFallbackH1 ? (
                  <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">{heading || 'Contact us'}</h1>
                ) : heading ? (
                  <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">{heading}</h2>
                ) : null}
                {description && (
                  <p className="text-foreground-muted">{description}</p>
                )}
              </div>
            )}

            {/* Form */}
            {page?.formEmbed && <FormEmbed html={page.formEmbed} />}

          </div>
        </div>
      </div>

    </>
  )
}

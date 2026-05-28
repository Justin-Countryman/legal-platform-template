export const revalidate = 3600

import type {Metadata} from 'next'
import {Suspense} from 'react'
import {client} from '@/lib/sanity/client'
import {
  BLOG_INDEX_PAGE_QUERY,
  BLOG_POSTS_QUERY,
  BLOG_CATEGORIES_QUERY,
  GLOBAL_CTA_QUERY,
  NAP_TOKENS_QUERY,
} from '@/lib/sanity/queries'
import {resolveTokenString, expandNapTokens} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {BlogIndexClient} from '@/components/sections/BlogIndexClient'
import {BlogIndexFallback} from '@/components/sections/BlogIndexFallback'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const [indexPage, rawTokens] = await Promise.all([
    client.fetch(BLOG_INDEX_PAGE_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  if (!indexPage) return {title: 'Blog'}

  const tokens = expandNapTokens(rawTokens)
  const title = resolveTokenString(indexPage.seoTitle, tokens)
  const description = resolveTokenString(indexPage.metaDescription, tokens)
  return {
    title,
    description,
    ...(indexPage.noIndex ? {robots: {index: false, follow: false}} : {}),
    alternates: {canonical: indexPage.canonicalUrl ?? '/blog'},
    ...buildSocialMeta(title, description),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogIndexPage() {
  const [indexPage, posts, categories, globalCtaData, rawTokens] = await Promise.all([
    client.fetch(BLOG_INDEX_PAGE_QUERY),
    client.fetch(BLOG_POSTS_QUERY),
    client.fetch(BLOG_CATEGORIES_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)

  return (
    <>
      {/* Hero — InternalHero when configured, fallback header band otherwise. h1 always ships. */}
      {indexPage?.hero ? (
        <InternalHero data={indexPage.hero} napTokens={tokens} />
      ) : (
        <InternalPageHeader title={indexPage?.title ?? 'Blog'} />
      )}

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: 'Blog', href: '/blog/'}]} />
        </div>
      </div>

      {/* Blog listing */}
      <section className="px-[5%] pt-8 pb-16 md:pt-10 md:pb-24 lg:pb-28">
        <div className="container">
          {/* BlogIndexClient is gated behind Suspense because it calls
              useSearchParams() — during SSR the fallback renders, NOT the
              client component. Pre-fix the fallback was `null`, so SSR HTML
              had zero post anchors and non-JS crawlers (Screaming Frog
              default) couldn't discover blog post URLs through /blog at all.
              The fallback now renders every post as a crawlable <a>. */}
          <Suspense fallback={<BlogIndexFallback posts={posts ?? []} tokens={tokens ?? null} />}>
            <BlogIndexClient posts={posts ?? []} categories={categories ?? []} tokens={tokens ?? null} />
          </Suspense>
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

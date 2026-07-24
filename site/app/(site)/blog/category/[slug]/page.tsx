export const revalidate = 3600

import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import {client} from '@/lib/sanity/client'
import {
  BLOG_CATEGORY_PAGE_QUERY,
  BLOG_CATEGORY_SLUGS_QUERY,
  BLOG_POSTS_QUERY,
  BLOG_CATEGORIES_QUERY,
  GLOBAL_CTA_QUERY,
  NAP_TOKENS_QUERY,
} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString, titleFragment} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {Suspense} from 'react'
import {BlogIndexClient} from '@/components/sections/BlogIndexClient'
import {BlogIndexFallback} from '@/components/sections/BlogIndexFallback'

// ─── Static params ────────────────────────────────────────────────────────────
// Blog category slugs are bare in Sanity (no `blog/category/` prefix); the
// route prepends the prefix when composing URLs. Same pattern as staff/events.

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(BLOG_CATEGORY_SLUGS_QUERY)
  return slugs.map((slug) => ({slug}))
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {params: Promise<{slug: string}>}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params

  const [category, rawTokens] = await Promise.all([
    client.fetch(BLOG_CATEGORY_PAGE_QUERY, {slug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!category) return {title: 'Blog Category'}

  const title = titleFragment(category.seoTitle, category.title, tokens)
  const description = resolveTokenString(category.metaDescription, tokens)
  return {
    title,
    description,
    ...(category.noIndex ? {robots: {index: false, follow: false}} : {}),
    alternates: {canonical: category.canonicalUrl ?? `/blog/category/${slug}`},
    ...buildSocialMeta(title, description),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogCategoryPage({params}: Props) {
  const {slug} = await params

  const [category, posts, categories, globalCtaData, rawTokens] = await Promise.all([
    client.fetch(BLOG_CATEGORY_PAGE_QUERY, {slug}),
    client.fetch(BLOG_POSTS_QUERY),
    client.fetch(BLOG_CATEGORIES_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)

  if (!category) notFound()

  const heroData = {
    tagline: category.tagline ?? null,
    heading: category.h1 ?? category.title ?? 'Blog',
    description: category.description ?? null,
  }

  return (
    <>
      {/* Hero */}
      <InternalHero data={heroData} napTokens={tokens} />

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[
            {label: 'Home', href: '/'},
            {label: 'Blog', href: '/blog/'},
            {label: category.title, href: `/blog/category/${category.slug}/`},
          ]} />
        </div>
      </div>

      {/* Blog listing — pre-filtered to this category */}
      <section className="px-[5%] pt-8 pb-16 md:pt-10 md:pb-24 lg:pb-28">
        <div className="container">
          {/* SSR fallback renders every post in this category as a crawlable
              <a> so non-JS crawlers can discover them — see
              BlogIndexFallback for the rationale. */}
          <Suspense
            fallback={
              <BlogIndexFallback
                posts={posts ?? []}
                tokens={tokens ?? null}
                initialCategory={slug}
              />
            }
          >
            <BlogIndexClient
              posts={posts ?? []}
              categories={categories ?? []}
              tokens={tokens ?? null}
              initialCategory={slug}
            />
          </Suspense>
        </div>
      </section>

      {/* Global CTA */}
      {!(category?.hideCtaForm) && globalCtaData && (
        <GlobalCta
          data={
            category?.ctaOverride
              ? {...globalCtaData, ...category.ctaOverride}
              : globalCtaData
          }
          napTokens={tokens}
        />
      )}
    </>
  )
}

export const revalidate = 3600

import {notFound} from 'next/navigation'
import {buildRobotsMeta} from '@/lib/robotsMeta'
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
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {resolveTitle} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {siteHost} from '@/lib/siteHost'
import {INDEX_PAGE_PRESETS, resolvePageLabel} from '@/lib/pageLabel'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {Suspense} from 'react'
import {BlogIndexClient} from '@/components/sections/BlogIndexClient'
import {BlogIndexFallback} from '@/components/sections/BlogIndexFallback'

// ─── Static params ────────────────────────────────────────────────────────────
// Blog category slugs are stored as `blog/category/{name}`; the URL segment
// is the bare `{name}`. Strip the prefix so Next gets the route-shaped param.

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(BLOG_CATEGORY_SLUGS_QUERY)
  return slugs
    .filter((s) => s.startsWith('blog/category/'))
    .map((s) => ({slug: s.slice('blog/category/'.length)}))
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {params: Promise<{slug: string}>}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const fullSlug = `blog/category/${slug}`

  const [category, rawTokens] = await Promise.all([
    client.fetch(BLOG_CATEGORY_PAGE_QUERY, {slug: fullSlug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!category) return {title: 'Blog Category'}

  const {title, label} = resolveTitle(category.seoTitle, category.title, tokens, tokens?.firmName)
  const description = resolveTokenString(category.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(category.noIndex, category.noFollow)),
    alternates: {canonical: category.canonicalUrl ?? `/blog/category/${slug}`},
    ...buildSocialMeta(label, description, category?.ogImage),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogCategoryPage({params}: Props) {
  const {slug} = await params
  const fullSlug = `blog/category/${slug}`

  const [category, posts, categories, globalCtaData, rawTokens] = await Promise.all([
    client.fetch(BLOG_CATEGORY_PAGE_QUERY, {slug: fullSlug}),
    client.fetch(BLOG_POSTS_QUERY),
    client.fetch(BLOG_CATEGORIES_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)

  if (!category) notFound()

  const heroData = {
    tagline: category.tagline ?? null,
    heading: category.h1 ?? resolvePageLabel(category) ?? INDEX_PAGE_PRESETS.blogIndex,
    description: category.description ?? null,
  }

  return (
    <>
      {/* Hero */}
      <InternalHero data={heroData} napTokens={tokens} />

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          {/* NAME-3: no route names a page. The index rung was the literal
              'Blog' and the current rung read `.title` directly, bypassing the
              nav label NAME-2 puts ahead of it. */}
          <Breadcrumbs
            items={[
              {label: 'Home', href: '/'},
              {label: INDEX_PAGE_PRESETS.blogIndex, href: '/blog/'},
              {label: resolvePageLabel(category) ?? '', href: `/${category.slug}/`},
            ]}
            domain={siteHost()}
          />
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
                initialCategory={fullSlug}
              />
            }
          >
            <BlogIndexClient
              posts={posts ?? []}
              categories={categories ?? []}
              tokens={tokens ?? null}
              initialCategory={fullSlug}
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

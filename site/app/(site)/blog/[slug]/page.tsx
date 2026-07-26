export const revalidate = 3600

import type {ReactNode} from 'react'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import {SanityImage} from '@/components/ui/SanityImage'
import Link from 'next/link'
import {client} from '@/lib/sanity/client'
import {
  BLOG_POST_PAGE_QUERY,
  BLOG_POST_SLUGS_QUERY,
  DESIGN_TOKENS_QUERY,
  GLOBAL_CTA_QUERY,
  NAP_TOKENS_QUERY,
  RELATED_POSTS_QUERY,
} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString, titleFragment, type NapTokens} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {Button} from '@/components/ui/Button'
import {ContentSidebarLayout} from '@/components/layout/ContentSidebarLayout'
import {Sidebar} from '@/components/layout/Sidebar'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {RelatedPosts, type RelatedPostsData} from '@/components/sections/RelatedPosts'

// ─── Static params ────────────────────────────────────────────────────────────
// Blog post slugs are stored as `blog/{name}`; the URL segment is the bare
// `{name}`. Strip the prefix so Next gets the route-shaped param.

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(BLOG_POST_SLUGS_QUERY)
  return slugs
    .filter((s) => s.startsWith('blog/'))
    .map((s) => ({slug: s.slice('blog/'.length)}))
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {params: Promise<{slug: string}>}

const DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'example.com'

// ─── Schema ───────────────────────────────────────────────────────────────────

function buildArticleSchema(post: unknown, tokens: NapTokens | null) {
  const p = post as Record<string, unknown>
  // Belt-and-suspenders null filter — paired with GROQ post-projection
  // [defined(_id)] on authors (see queries.ts BLOG_POST_PAGE_QUERY).
  const authorNames = ((p.authors as unknown[]) ?? [])
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .map((a: unknown) => {
      const author = a as {firstName?: string | null; lastName?: string | null}
      return `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()
    })

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: resolveTokenString(p.h1 as string | null | undefined, tokens),
    description: resolveTokenString(p.metaDescription as string | null | undefined, tokens),
    url: `https://${DOMAIN}/${p.slug}/`,
    datePublished: (p.publishedAt as string | undefined) ?? undefined,
    dateModified: (p.lastModified as string | undefined) ?? (p.publishedAt as string | undefined) ?? undefined,
    author: authorNames.length
      ? authorNames.map((name: string) => ({'@type': 'Person', name}))
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: tokens?.firmName ?? '',
      url: `https://${DOMAIN}/`,
    },
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const fullSlug = `blog/${slug}`

  const [post, rawTokens] = await Promise.all([
    client.fetch(BLOG_POST_PAGE_QUERY, {slug: fullSlug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!post) return {title: 'Blog Post'}

  const title = titleFragment(post.seoTitle, post.title, tokens)
  const description = resolveTokenString(post.metaDescription, tokens)
  return {
    title,
    description,
    ...buildRobotsMeta(post.noIndex, post.noFollow),
    alternates: {canonical: post.canonicalUrl ?? `/${fullSlug}`},
    ...buildSocialMeta(title, description, post?.ogImage),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function readTime(bodyText: string | null): string {
  if (!bodyText) return '1 min read'
  const words = bodyText.trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 238))} min read`
}

function formatAuthors(authors: unknown[], firmName?: string | null): ReactNode {
  if (!authors.length) {
    return <>{'Written by: '}{firmName ?? ''}</>
  }
  return (
    <>
      {'Written by: '}
      {authors.map((raw, i) => {
        const a = raw as {_id?: string; firstName?: string | null; lastName?: string | null; slug?: string}
        const name = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim()
        const node = (
          <Link
            key={a._id}
            href={`/${a.slug}/`}
            className="font-semibold hover:underline"
          >
            {name}
          </Link>
        )
        if (i === 0) return node
        if (i === authors.length - 1) return <span key={`sep-${i}`}> and {node}</span>
        return <span key={`sep-${i}`}>, {node}</span>
      })}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({params}: Props) {
  const {slug} = await params
  const fullSlug = `blog/${slug}`

  const [post, globalCtaData, rawTokens, designTokens, relatedPosts] = await Promise.all([
    client.fetch(BLOG_POST_PAGE_QUERY, {slug: fullSlug}),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
    client.fetch(DESIGN_TOKENS_QUERY),
    client.fetch<RelatedPostsData>(RELATED_POSTS_QUERY, {slug: fullSlug}),
  ])
  const tokens = expandNapTokens(rawTokens)

  if (!post) notFound()

  // Hero scheme — read designSettings.internalHeroBackground server-side and
  // apply classes inline. The bespoke <header> below cannot consume the
  // <HeroSchemeProvider> context (this page is an async server component);
  // server-side fetch matches what app/(site)/layout.tsx already does for the
  // provider scheme and produces an identical rendered result.
  const isDark = designTokens?.internalHeroBackground !== 'light'

  const hasSidebarComponents =
    post.sidebar && post.sidebar.filter((c: unknown) => (c as {_componentType?: unknown})._componentType).length > 0

  // Belt-and-suspenders null filter — paired with GROQ post-projection
  // [defined(_id)] on authors (see queries.ts BLOG_POST_PAGE_QUERY).
  const authors: unknown[] = (post.authors ?? []).filter((a: unknown) => a !== null)
  const hasImage = !!post.featuredImage?.asset?._ref
  const h1 = resolveTokenString(post.h1, tokens)

  const breadcrumbItems = [
    {label: 'Home', href: '/'},
    {label: 'Blog', href: '/blog/'},
    ...(post.category
      ? [{label: post.category.title, href: `/${post.category.slug}/`}]
      : []),
  ]

  return (
    <>
      {/* Article schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(buildArticleSchema(post, tokens))}}
      />

      {/* ── Blog Post Header ─────────────────────────────────────────────── */}
      <header
        data-ring-context={isDark ? 'dark' : undefined}
        className={`${isDark ? 'bg-brand-dark' : 'bg-hero-tint'} px-[5%] py-12 md:py-16 lg:py-20`}
      >
        <div className="container">

          {/* Two h1 declarations below, one per render branch (hasImage vs not).
             Only one renders per request — design intent, not drift. */}
          {hasImage ? (
            /* Two-column layout when featured image exists */
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">

              {/* Left: meta + title + byline */}
              <div className="flex flex-col">
                <Breadcrumbs items={breadcrumbItems} domain={DOMAIN} />

                <h1 className="mt-6 font-bold leading-tight text-3xl md:text-4xl lg:text-5xl text-foreground">
                  {h1}
                </h1>

                <div className="mt-6 flex flex-col gap-2 text-sm text-foreground-muted">
                  <p className="font-semibold text-foreground">{formatAuthors(authors, tokens?.firmName)}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {post.publishedAt && (
                      <time dateTime={post.publishedAt}>
                        {formatDate(post.publishedAt)}
                      </time>
                    )}
                    {(post.publishedAt) && (
                      <span aria-hidden="true">·</span>
                    )}
                    <span>{readTime(post.bodyText)}</span>
                    {post.category && (
                      <>
                        <span aria-hidden="true">·</span>
                        <Button
                          variant="secondary"
                          size="small"
                          context={isDark ? 'dark' : 'light'}
                          href={`/${post.category.slug}/`}
                        >
                          {post.category.title}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: featured image */}
              <div className="relative aspect-video w-full overflow-hidden">
                <SanityImage
                  image={post.featuredImage}
                  mode="fill"
                  alt={post.featuredImage.alt || h1}
                  sizes="(min-width:1024px) 50vw, 100vw"
                  priority
                />
              </div>
            </div>

          ) : (
            /* Single-column layout when no featured image */
            <div className="max-w-3xl">
              <Breadcrumbs items={breadcrumbItems} domain={DOMAIN} />

              <h1 className="mt-6 font-bold leading-tight text-3xl md:text-4xl lg:text-5xl text-foreground">
                {h1}
              </h1>

              <div className="mt-6 flex flex-col gap-2 text-sm text-foreground-muted">
                <p className="font-semibold text-foreground">{formatAuthors(authors, tokens?.firmName)}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {post.publishedAt && (
                    <time dateTime={post.publishedAt}>
                      {formatDate(post.publishedAt)}
                    </time>
                  )}
                  {post.publishedAt && (
                    <span aria-hidden="true">·</span>
                  )}
                  <span>{readTime(post.bodyText)}</span>
                  {post.category && (
                    <>
                      <span aria-hidden="true">·</span>
                      <Button
                        variant="secondary"
                        size="small"
                        context={isDark ? 'dark' : 'light'}
                        href={`/${post.category.slug}/`}
                      >
                        {post.category.title}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* ── Body + Sidebar ───────────────────────────────────────────────── */}
      <ContentSidebarLayout
        as="article"
        sidebar={
          <Sidebar
            components={hasSidebarComponents ? post.sidebar : []}
            napTokens={tokens}
            body={post.body}
            showSearch
          />
        }
      >
        {post.body && (
          <PortableTextRenderer value={post.body} napTokens={tokens} />
        )}
      </ContentSidebarLayout>

      {/* ── Related posts (SSR — crawlable inter-blog linking) ──────────── */}
      <RelatedPosts data={relatedPosts ?? null} tokens={tokens} />

      {/* ── Global CTA ───────────────────────────────────────────────────── */}
      {!post.hideCtaForm && globalCtaData && (
        <GlobalCta
          data={
            post.ctaOverride
              ? {...globalCtaData, ...post.ctaOverride}
              : globalCtaData
          }
          napTokens={tokens}
        />
      )}
    </>
  )
}

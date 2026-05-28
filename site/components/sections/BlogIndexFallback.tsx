// Server component — renders as SSR HTML before BlogIndexClient hydrates,
// so non-JS crawlers (Screaming Frog default, Bing, lightweight bots) and
// pre-hydration page loads see every blog post as a crawlable <a href>.
//
// Why this exists: BlogIndexClient is a client component ('use client'),
// gated behind a <Suspense> boundary because it calls useSearchParams().
// During SSR that boundary renders its `fallback` prop, NOT the client
// component, so previously the SSR HTML had zero post anchors and only
// JS-rendering crawlers (Googlebot) could discover blog URLs at all.
// This component is the fallback now.
//
// Card structure mirrors BlogIndexClient's rendered card so the visual
// hand-off after hydration is as close to seamless as possible. Search /
// category filter / load-more UI are intentionally omitted — those are
// interactive features that require client JS.

import Link from 'next/link'
import {Button} from '@/components/ui/Button'
import {ClockIcon} from '@/components/ui/icons'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import type {BlogPostCard, BlogCategory} from '@/components/sections/BlogIndexClient'

function readTime(bodyText: string | null): string {
  if (!bodyText) return '1 min read'
  const words = bodyText.trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 238))} min read`
}

export function BlogIndexFallback({
  posts,
  tokens,
  initialCategory = null,
}: {
  posts: BlogPostCard[]
  categories?: BlogCategory[]
  tokens: NapTokens | null
  initialCategory?: string | null
}) {
  // Mirror BlogIndexClient's initial-state category filter so the SSR
  // markup matches what the user will see after hydration for category
  // archive pages (`/blog/category/<slug>`). On `/blog` itself
  // initialCategory is null and all posts render.
  const filtered = initialCategory
    ? posts.filter((p) => p.category?.slug === initialCategory)
    : posts

  if (filtered.length === 0) {
    return <p className="text-foreground-muted">No posts found.</p>
  }

  return (
    <div className="flex flex-col">
      <ul
        role="list"
        aria-label="Blog posts"
        className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 md:gap-y-16 lg:grid-cols-3"
      >
        {filtered.map((post) => (
          <li key={post.slug}>
            <article className="flex h-full flex-col rounded-ui border border-border bg-background px-5 py-6 shadow-card-rest md:p-6">
              {/* Title — Link to the post */}
              <h2 className="font-heading text-xl font-bold leading-snug text-foreground md:text-2xl">
                <Link
                  href={`/${post.slug}/`}
                  className="text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm"
                >
                  {resolveTokenString(post.h1, tokens)}
                </Link>
              </h2>

              {/* Metadata row — category tag + read time */}
              <div className="mb-4 mt-3 flex flex-wrap items-center gap-3">
                {post.category && (
                  <Button
                    variant="secondary"
                    size="small"
                    href={`/${post.category.slug}/`}
                  >
                    {post.category.title}
                  </Button>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                  <ClockIcon className="size-3.5 text-accent" />
                  {readTime(post.bodyText)}
                </span>
              </div>

              {/* Description */}
              {post.metaDescription && (
                <p className="text-foreground-muted">
                  {resolveTokenString(post.metaDescription, tokens)}
                </p>
              )}

              {/* Read More tertiary CTA */}
              <div className="mt-auto pt-6">
                <Button
                  variant="tertiary"
                  context="light"
                  href={`/${post.slug}/`}
                  aria-label={`Read article: ${resolveTokenString(post.h1, tokens)}`}
                >
                  Read More
                </Button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}

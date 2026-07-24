// Server-rendered related-posts module — ships on every blog post page so
// non-JS crawlers see a discoverable trail of inter-blog anchors. Before
// this module each blog post was a dead-end from a crawl perspective
// (Screaming Frog Kenneth dogfood found 13 of 91 blog posts because no
// crawled page linked to other posts in the same category).
//
// Picks up to 4 posts: same category first (newest), falls back to global
// recent posts when the current post has no category or no siblings exist.

import Link from 'next/link'
import {Button} from '@/components/ui/Button'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'

type RelatedPost = {
  slug: string
  h1: string | null
  metaDescription: string | null
  publishedAt: string | null
  category: {title: string; slug: string} | null
}

export type RelatedPostsData = {
  byCategory: RelatedPost[]
  fallback: RelatedPost[]
}

export function RelatedPosts({
  data,
  tokens,
}: {
  data: RelatedPostsData | null
  tokens: NapTokens | null
}) {
  // Prefer same-category posts; fall back to recent posts overall when the
  // current post has no category or no siblings exist.
  const posts = (data?.byCategory.length ?? 0) > 0 ? data!.byCategory : (data?.fallback ?? [])
  if (posts.length === 0) return null

  return (
    <section
      aria-label="Related articles"
      className="px-[5%] py-12 md:py-16 lg:py-20"
    >
      <div className="container">
        <SectionHeader
          tagline="More from the blog"
          heading="Related articles"
        />

        <ul
          role="list"
          className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4"
        >
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="flex h-full flex-col rounded-ui border border-border bg-background px-5 py-6 shadow-card-rest">
                <h3 className="font-heading text-lg font-bold leading-snug text-foreground">
                  <Link
                    href={`/${post.slug}/`}
                    className="text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm"
                  >
                    {resolveTokenString(post.h1, tokens)}
                  </Link>
                </h3>

                {post.category && (
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      size="small"
                      href={`/blog/category/${post.category.slug}/`}
                    >
                      {post.category.title}
                    </Button>
                  </div>
                )}

                {post.metaDescription && (
                  <p className="mt-4 text-sm text-foreground-muted line-clamp-3">
                    {resolveTokenString(post.metaDescription, tokens)}
                  </p>
                )}

                <div className="mt-auto pt-5">
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
    </section>
  )
}

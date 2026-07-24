'use client'

import {useState, useRef, useEffect} from 'react'
import {useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {Button} from '@/components/ui/Button'
import {ClockIcon} from '@/components/ui/icons'
import {Input} from '@/components/ui/Input'
import {Select} from '@/components/ui/Select'
import {AnimatePresence, motion} from 'framer-motion'

import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {motionConfig} from '@/lib/motionConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlogCategory = {
  title: string
  slug: string
}

export type BlogPostCard = {
  slug: string
  h1: string
  metaDescription: string | null
  publishedAt: string
  category: BlogCategory | null
  bodyText: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readTime(bodyText: string | null): string {
  if (!bodyText) return '1 min read'
  const words = bodyText.trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 238))} min read`
}

const PAGE_SIZE = 12

// ─── Component ────────────────────────────────────────────────────────────────

export function BlogIndexClient({
  posts,
  categories,
  tokens,
  initialCategory = null,
}: {
  posts: BlogPostCard[]
  categories: BlogCategory[]
  tokens: NapTokens | null
  initialCategory?: string | null
}) {
  // `?q=` is read client-side via useSearchParams so the parent /blog route
  // can stay SSG. Server-side searchParams reads would force the route into
  // dynamic rendering; the client-side hook re-reads on every navigation
  // without triggering a server round-trip.
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('q') ?? ''
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory)
  const [search, setSearch] = useState(initialSearch)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [firstNewIndex, setFirstNewIndex] = useState<number | null>(null)
  const newCardRef = useRef<HTMLAnchorElement>(null)

  const filtered = posts.filter((p) => {
    if (activeCategory && p.category?.slug !== activeCategory) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const title = resolveTokenString(p.h1, tokens).toLowerCase()
      const desc = resolveTokenString(p.metaDescription, tokens).toLowerCase()
      if (!title.includes(q) && !desc.includes(q)) return false
    }
    return true
  })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  function selectCategory(slug: string | null) {
    setActiveCategory(slug)
    setVisibleCount(PAGE_SIZE)
    setFirstNewIndex(null)
  }

  function handleSearch(value: string) {
    setSearch(value)
    setVisibleCount(PAGE_SIZE)
    setFirstNewIndex(null)
  }

  function handleLoadMore() {
    setFirstNewIndex(visible.length)
    setVisibleCount((c) => c + PAGE_SIZE)
  }

  // After new cards render, focus the first newly-loaded card.
  // tabIndex={-1} is set on that card for exactly this render so it can receive
  // programmatic focus; clearing firstNewIndex immediately after restores the card
  // to natural tab order so forward/backward Tab works through all cards.
  // setTimeout(0) defers the state reset out of the effect body so it doesn't
  // trigger a cascading-render warning (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (firstNewIndex !== null && newCardRef.current) {
      newCardRef.current.focus()
      setTimeout(() => setFirstNewIndex(null), 0)
    }
  }, [firstNewIndex, visible.length])

  return (
    <div className="flex flex-col">

      {/* Search + category filter row */}
      <div className="mb-10 flex flex-wrap items-center justify-end gap-3">

        {/* Category dropdown */}
        <label htmlFor="category-filter" className="text-sm font-semibold text-foreground-muted">
          Filter by category:
        </label>
        <div className="self-start min-w-[12.5rem]">
          <Select
            id="category-filter"
            value={activeCategory ?? ''}
            onChange={(e) => selectCategory(e.target.value || null)}
          >
            <option value="">All Posts</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.title}
              </option>
            ))}
          </Select>
        </div>

        {/* Search */}
        <div className="min-w-[12.5rem]">
          <label htmlFor="blog-search" className="sr-only">Search posts</label>
          <Input
            id="blog-search"
            type="search"
            placeholder="Search posts…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            leadingIcon={
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M13.5 13.5L18 18" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

      </div>

      {/* Card grid — fades on filter/search change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeCategory ?? 'all'}-${search}`}
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={motionConfig.crossfade}
        >
          {visible.length > 0 ? (
            <ul role="list" aria-label="Blog posts" className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
              {visible.map((post, index) => (
                <li key={post.slug}>
                <article
                  className="flex h-full flex-col rounded-ui border border-border bg-background px-5 py-6 shadow-card-rest md:p-6"
                >

                  {/* Title — Link to the post (sibling interactive element) */}
                  <h2 className="font-heading text-xl font-bold leading-snug text-foreground md:text-2xl">
                    <Link
                      ref={index === firstNewIndex ? newCardRef : null}
                      tabIndex={index === firstNewIndex ? -1 : undefined}
                      href={`/${post.slug}/`}
                      className="text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm"
                    >
                      {resolveTokenString(post.h1, tokens)}
                    </Link>
                  </h2>

                  {/* Metadata row — Tag + read time as flex siblings.
                      post.category.slug is already prefixed (e.g. "blog/category/foo"). */}
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

                  {/* Read More — tertiary CTA, sibling link to the post.
                      mt-auto pins to the bottom so cards align in the grid. */}
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
          ) : (
            <p className="text-foreground-muted">
              No posts found{search.trim() ? ` matching "${search.trim()}"` : ''}.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Load more */}
      {hasMore && (
        <div className="mt-12 flex justify-center md:mt-16">
          <Button
            variant="secondary"
            context="light"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        </div>
      )}

    </div>
  )
}

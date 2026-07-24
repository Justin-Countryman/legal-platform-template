'use client'

import {useState, useMemo} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {useMotionConfig} from '@/lib/motionConfig'
import {CardLink} from '@/components/ui/CardLink'
import {Input} from '@/components/ui/Input'
import {TertiaryArrow} from '@/components/ui/TertiaryArrow'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceAreaCard = {
  slug: string
  displayName: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceAreaIndexClient({pages}: {pages: ServiceAreaCard[]}) {
  // Reduced-motion-aware configs (item 38): the crossfade is pure opacity,
  // which MotionConfig's positional gate does not cover.
  const mc = useMotionConfig()
  const [search, setSearch] = useState('')
  const [activeLetter, setActiveLetter] = useState<string | null>(null)

  // Letters that actually have pages
  const availableLetters = useMemo(
    () => new Set(pages.map((p) => p.displayName.charAt(0).toUpperCase())),
    [pages],
  )

  const filtered = useMemo(() => {
    let result = pages
    if (activeLetter) {
      result = result.filter((p) => p.displayName.charAt(0).toUpperCase() === activeLetter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((p) => p.displayName.toLowerCase().includes(q))
    }
    return result
  }, [pages, activeLetter, search])

  function handleSearch(value: string) {
    setSearch(value)
    if (value.trim()) setActiveLetter(null) // clear letter filter when typing
  }

  function handleLetter(letter: string | null) {
    setActiveLetter(letter)
    setSearch('') // clear search when picking a letter
  }

  const animKey = `${activeLetter ?? 'all'}-${search}`

  return (
    <div>
      {/* Search + letter filter row */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">

        {/* Search */}
        <div className="sm:w-64">
          <label htmlFor="service-area-search" className="sr-only">Search cities</label>
          <Input
            id="service-area-search"
            type="search"
            placeholder="Search cities…"
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

        {/* Letter tabs */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handleLetter(null)}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors duration-ui-fast ${
              activeLetter === null && !search
                ? 'bg-action text-action-fg'
                : 'border border-border hover:bg-muted'
            }`}
          >
            All
          </button>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
            const has = availableLetters.has(letter)
            return (
              <button
                key={letter}
                onClick={() => has ? handleLetter(letter) : undefined}
                disabled={!has}
                className={`w-9 py-1.5 text-sm font-semibold transition-colors duration-ui-fast ${
                  activeLetter === letter
                    ? 'bg-action text-action-fg'
                    : has
                      ? 'border border-border hover:bg-muted'
                      : 'border border-border text-foreground-muted opacity-25 cursor-not-allowed'
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>

      </div>

      {/* Result count */}
      <p className="mb-6 text-sm text-foreground-muted">
        {filtered.length === pages.length
          ? `${pages.length} cities served`
          : `${filtered.length} of ${pages.length} cities`}
      </p>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={animKey}
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={mc.crossfade}
        >
          {filtered.length > 0 ? (
            <ul role="list" aria-label="Service areas" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {filtered.map((page) => (
                <li key={page.slug}>
                <CardLink
                  href={`/${page.slug}/`}
                  aria-label={`View ${page.displayName} service area page`}
                  className="flex flex-col p-4 hover:bg-muted md:p-5"
                >
                  {/* Pin icon */}
                  <svg
                    aria-hidden="true"
                    className="mb-3 h-5 w-5 shrink-0 text-foreground-muted transition-colors duration-ui-fast group-hover:text-foreground"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M10 2C7.239 2 5 4.239 5 7c0 4.418 5 11 5 11s5-6.582 5-11c0-2.761-2.239-5-5-5z"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="7" r="1.5" />
                  </svg>

                  {/* City name */}
                  <p className="font-heading font-bold leading-snug text-foreground group-hover:underline">
                    {page.displayName}
                  </p>

                  {/* CTA — decorative; card aria-label is the accessible name */}
                  <span aria-hidden="true" className="mt-3 inline-flex items-center gap-1.5 text-base font-medium [text-transform:var(--tertiary-text-transform,none)] [letter-spacing:var(--tertiary-letter-spacing,0em)] text-action-text">
                    View page
                    <TertiaryArrow />
                  </span>
                </CardLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground-muted">
              No cities found
              {search ? ` matching "${search}"` : ''}.
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

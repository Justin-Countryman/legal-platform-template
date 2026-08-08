import {TertiaryArrow} from '@/components/ui/TertiaryArrow'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'

// ─── Shared card data + primitives ─────────────────────────────────────────────
// Leaf module: the canonical AttorneyCard shape plus the bits every card style
// reuses (display name, monogram fallback, image wrapper, "View profile" cue).
// Kept dependency-free of the card variants to avoid import cycles.

export type AttorneyCard = {
  _id: string
  title: string
  slug: string
  jobTitle?: string | null
  bio?: string | null
  photo?: SanityImageData | null
}

// The card's label is the projected `title`, which the three attorney-card
// branches in ATTORNEY/SECTIONS queries resolve through NAV_LABEL_EXPR — the
// Nav Label when one is authored, the Name otherwise. Every other card on the
// platform reads that same key and nothing else; the sidebar attorney widget
// is the nearest neighbour.
//
// THE HEADING IS NOT A SOURCE, and it is out of reach rather than merely
// unread: `h1` is absent from the type above for the same reason it is absent
// from `lib/pageLabel.ts`. This returned `a.h1 ?? a.title` until 2026-08-07,
// which ran NAME-2 backwards at this one call site — an authored Nav Label
// reached the projection and then lost to the SEO heading. Ruled 2026-08-07 by
// Justin, Pass D.2b: cards use the same label chain as every other card, and an
// h1 is not a card label.
export function attorneyName(a: AttorneyCard): string {
  return a.title
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (first + last).toUpperCase()
}

// Initials monogram on a brand tint — the graceful fallback when an attorney
// has no headshot, so every image-based card style degrades intentionally.
export function AttorneyMonogram({name, className}: {name: string; className?: string}) {
  return (
    <div
      aria-hidden="true"
      className={['absolute inset-0 grid place-items-center bg-hero-tint', className ?? ''].filter(Boolean).join(' ')}
    >
      <span className="font-heading text-4xl font-semibold text-foreground-subtle">{initials(name)}</span>
    </div>
  )
}

// Image wrapper: aspect-ratio box (default) or absolute fill (`fill`). Renders
// the headshot when present, the monogram otherwise.
export function CardImage({
  attorney,
  ratio,
  fill,
  sizes,
  imgClassName,
  className,
}: {
  attorney: AttorneyCard
  ratio?: string
  fill?: boolean
  sizes?: string
  imgClassName?: string
  className?: string
}) {
  const name = attorneyName(attorney)
  const wrapper = fill
    ? ['absolute inset-0 overflow-hidden', className]
    : ['relative overflow-hidden', ratio, className]
  return (
    <div className={wrapper.filter(Boolean).join(' ')}>
      {hasImage(attorney.photo) ? (
        <SanityImage
          image={attorney.photo}
          mode="fill"
          alt={attorney.photo.alt ?? name}
          sizes={sizes}
          className={imgClassName}
        />
      ) : (
        <AttorneyMonogram name={name} />
      )}
    </div>
  )
}

// Decorative "View profile" affordance (the whole card is the link, so this is
// aria-hidden). Honors the tertiary-style design tokens; color cascades on dark.
export function ViewProfileCue({className}: {className?: string}) {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex items-center gap-1.5 text-base font-medium text-action-text [text-transform:var(--tertiary-text-transform,none)] [letter-spacing:var(--tertiary-letter-spacing,0em)]',
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      View profile
      <TertiaryArrow />
    </span>
  )
}

import Image from 'next/image'
import {TertiaryArrow} from '@/components/ui/TertiaryArrow'

// ─── Shared card data + primitives ─────────────────────────────────────────────
// Leaf module: the canonical AttorneyCard shape plus the bits every card style
// reuses (display name, monogram fallback, image wrapper, "View profile" cue).
// Kept dependency-free of the card variants to avoid import cycles.

export type AttorneyCard = {
  _id: string
  title: string
  slug: string
  h1?: string | null
  jobTitle?: string | null
  bio?: string | null
  photo?: {
    src: string
    alt?: string | null
    width?: number | null
    height?: number | null
  } | null
}

export function attorneyName(a: AttorneyCard): string {
  return a.h1 ?? a.title
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
      {attorney.photo?.src ? (
        <Image
          src={attorney.photo.src}
          alt={attorney.photo.alt ?? name}
          fill
          sizes={sizes}
          className={['object-cover object-top', imgClassName].filter(Boolean).join(' ')}
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

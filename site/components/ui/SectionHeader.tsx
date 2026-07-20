import {Tagline} from '@/components/ui/Tagline'

// ─── Types ────────────────────────────────────────────────────────────────────
//
// SectionHeader primitive — consolidates the dominant tagline + h2 + description
// rhythm used by section blocks (CtaSection, AttorneySection, BadgesSection,
// FaqSection, ReviewsSection, TestimonialsGrid, VideoSection, GlobalCta).
//
// Scale + alignment are typed knobs that map to the canonical 3-tier rhythm
// system (skill-typography → Section vertical rhythm system). Visual semantics
// are unchanged — the primitive emits the same h2 and description classes that
// the hand-rolled callsites produced pre-consolidation.

export type SectionHeaderScale = 'md' | 'lg' | 'xl'
export type SectionHeaderAlignment = 'center' | 'left'

export type SectionHeaderProps = {
  /** Heading text — rendered as <h2>. Required. */
  heading:      string
  /** Optional decorative label above the heading. Renders via <Tagline as="p">. */
  tagline?:     string | null
  /** Optional body copy below the heading. Default color `text-foreground-muted`. */
  description?: string | null
  /**
   * Rhythm tier — pairs h2 type scale with its trailing `mb-X` gap to the
   * description. `md` (Standard) is the dominant pattern. `lg` (Larger) is for
   * mid-prominence CTA blocks. `xl` (Largest) is for marquee bottom-of-page CTAs.
   * Maps to the canonical tier table in skill-typography.
   */
  scale?:       SectionHeaderScale
  /**
   * Text alignment for the wrapping <div>. `center` adds `text-center`; `left`
   * adds no alignment class. Consumers compose outer layout (max-width, mx-auto,
   * grid placement) via className — alignment owns only the text-align axis.
   */
  alignment?:   SectionHeaderAlignment
  /**
   * Suppresses the h2's scale-paired trailing `mb-X`. Opt-in, default `false` —
   * the canonical gap stays the default for every other consumer.
   *
   * For column-only headers that place their own content directly beneath the
   * header rather than below the description: CtaSectionBlock's TextOnlyCta
   * puts tagline + h2 in the left grid column under `md:items-center`, where
   * the canonical gap becomes column height and shifts the row's vertical
   * centering. The prop names that intent so the exception reads as a decision
   * rather than as a spacing override at the callsite.
   */
  noTrailingGap?: boolean
  /**
   * Wrapper className for layout overrides (max-width, margin, grid placement).
   * Spacing belongs to typed props — do NOT pass h2 `mb-X` or description color
   * through className.
   */
  className?:   string
}

// ─── Scale → h2 className mapping ─────────────────────────────────────────────
//
// Verbatim transcription of the canonical tier table in
// skill-typography → Section vertical rhythm system. Exported for tests +
// the Design Studio catalog cell.

export const SECTION_HEADER_H2_CLASS: Record<SectionHeaderScale, string> = {
  md: 'mb-4 text-3xl font-bold text-foreground md:text-4xl',
  lg: 'mb-5 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl',
  // xl is the marquee bottom-of-page CTA tier (sole consumer: GlobalCta). It
  // stays the largest tier — highest mobile floor (text-4xl) and reaches the
  // ceiling one breakpoint earlier than lg — but caps at text-5xl (48px). The
  // former lg:text-6xl (60px) overshot the project's own compressed display
  // ceiling (--text-10xl = 56px), so a long heading wrapped to three lines in
  // the centered max-w-lg column and dwarfed the eyebrow/subhead/button.
  xl: 'mb-5 text-4xl font-bold text-foreground md:mb-6 md:text-5xl',
}

// ─── Trailing-gap suppression ─────────────────────────────────────────────────
//
// Derives the `noTrailingGap` variant from the canonical tier class above by
// dropping every `mb-` token, responsive prefixes included (xl carries both
// `mb-5` and `md:mb-6`). Derived rather than tabled a second time so the tier
// table stays the single source of the type scale — a new tier gets its
// suppressed form for free, and the two cannot drift apart.

export function stripTrailingGap(h2Class: string): string {
  return h2Class
    .split(' ')
    .filter((token) => !/^(?:[a-z]+:)?mb-/.test(token))
    .join(' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SectionHeader({
  heading,
  tagline,
  description,
  scale = 'md',
  alignment = 'center',
  noTrailingGap = false,
  className,
}: SectionHeaderProps) {
  const wrapperClass = [
    alignment === 'center' ? 'text-center' : null,
    className,
  ].filter(Boolean).join(' ')

  const h2Class = noTrailingGap
    ? stripTrailingGap(SECTION_HEADER_H2_CLASS[scale])
    : SECTION_HEADER_H2_CLASS[scale]

  return (
    <div className={wrapperClass || undefined}>
      {tagline && <Tagline as="p">{tagline}</Tagline>}
      <h2 className={h2Class}>{heading}</h2>
      {description && <p className="text-foreground-muted">{description}</p>}
    </div>
  )
}

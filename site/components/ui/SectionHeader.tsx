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
  xl: 'mb-5 text-4xl font-bold text-foreground md:mb-6 md:text-5xl lg:text-6xl',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SectionHeader({
  heading,
  tagline,
  description,
  scale = 'md',
  alignment = 'center',
  className,
}: SectionHeaderProps) {
  const wrapperClass = [
    alignment === 'center' ? 'text-center' : null,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass || undefined}>
      {tagline && <Tagline as="p">{tagline}</Tagline>}
      <h2 className={SECTION_HEADER_H2_CLASS[scale]}>{heading}</h2>
      {description && <p className="text-foreground-muted">{description}</p>}
    </div>
  )
}

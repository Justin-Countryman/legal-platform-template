import {Tagline} from '@/components/ui/Tagline'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {splitEmphasis} from '@/lib/headingEmphasis'

// ─── Heading unit ─────────────────────────────────────────────────────────────
//
// Tagline above, one heading element, and an emphasis span inside the heading
// (Phase 11, 2026-09-14; monorepo WS-V1-PHASE11-DESIGN §7 amendment 3). The
// content section consumes it now; the hero, the closing CTA and SectionHeader
// join it later (Phase 16 adds the heading rule and a `context` prop, drawn as a
// pseudo-element so no consumer gains an element).
//
// THE EMPHASIS. `headingEmphasis` is a string that occurs in `heading`. Tokens
// resolve in the tagline, the heading and the emphasis BEFORE the split, so
// `{{firmName}}` meets the resolved firm name. The first occurrence renders as
// `<em class="heading-emphasis">`: `em` for its default meaning, though screen
// readers do not announce it. Until Phase 16's theme tokens exist the class sets
// the accent color and upright type (`globals.css`).
//
// THE TIER. A typed scale, never a class passthrough, so every class a heading
// can carry is enumerable: `__tests__/HeadingUnit.test.tsx` runs the real
// `heading-cascade-discipline` rule over each one, because the rule cannot see a
// class read from a table (it holds nothing here by itself).

export type HeadingUnitScale = 'marketing' | 'interior'

/** Exported for the cascade test and the Design Studio catalog. */
export const HEADING_UNIT_TIER_CLASS: Record<HeadingUnitScale, string> = {
  // The homepage tier: the marketing scale, so designSettings.marketingScale
  // moves it, as it moves the old homepage blocks.
  marketing: 'marketing-h2 font-heading font-bold text-foreground',
  // The interior tier: SectionHeader's standard (md) type size, without its
  // trailing margin; the consumer owns the gap below the unit.
  interior: 'text-3xl font-bold text-foreground md:text-4xl',
}

export type HeadingUnitProps = {
  tagline?: string | null
  heading: string
  headingEmphasis?: string | null
  tokens?: NapTokens | null
  scale: HeadingUnitScale
  /** One literal element per level. Default h2. */
  as?: 'h1' | 'h2' | 'h3'
  align?: 'left' | 'center'
  /** Wrapper layout only (max-width, margins). Never a heading class. */
  className?: string
}

export function HeadingUnit({
  tagline,
  heading,
  headingEmphasis,
  tokens,
  scale,
  as = 'h2',
  align = 'left',
  className,
}: HeadingUnitProps) {
  const text = resolveTokenString(heading, tokens)
  const taglineText = resolveTokenString(tagline, tokens)
  const parts = splitEmphasis(text, resolveTokenString(headingEmphasis, tokens))
  const content = parts ? (
    <>
      {parts[0]}
      <em className="heading-emphasis">{parts[1]}</em>
      {parts[2]}
    </>
  ) : (
    text
  )
  const tier = HEADING_UNIT_TIER_CLASS[scale]
  const wrapperClass = [align === 'center' ? 'text-center' : null, className].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass || undefined}>
      {taglineText && <Tagline as="p">{taglineText}</Tagline>}
      {as === 'h1' ? (
        <h1 className={tier}>{content}</h1>
      ) : as === 'h3' ? (
        <h3 className={tier}>{content}</h3>
      ) : (
        <h2 className={tier}>{content}</h2>
      )}
    </div>
  )
}

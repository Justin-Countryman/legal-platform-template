import type {ReactNode, ElementType} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
//
// Tagline primitive — small accent label rendered above a heading.
// Visual style (plain | lined | titlecase) is driven entirely by CSS variables
// emitted at runtime by buildDesignTokenCSS from designSettings.taglineStyle.
// Color is cascade-aware via text-accent — the same component renders correctly
// on both light and dark surfaces without a per-call variant prop.

export type TaglineMargin = 'mb-0' | 'mb-2' | 'mb-3' | 'mb-4'

export type TaglineProps = {
  children:   ReactNode
  as?:        'span' | 'div' | 'p'
  /**
   * Margin-bottom spacing — gap between the tagline and the heading
   * directly below it. Default `mb-3` (12px) is the platform standard;
   * profile layouts (FeatureGrid, PremiumHorizontal) intentionally use
   * `mb-2` / `mb-4` per layout-tier convention. Locked in WS7.7 Commit 5.
   */
  mb?:        TaglineMargin
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// The `tagline` utility class handles all visual treatment, including the
// leading rule for `lined` style (rendered via ::before, controlled by the
// --tagline-rule-display var). Single source of truth — the primitive and
// any semantic-element consumer (e.g. <h2 className="tagline">) render
// identically across all 3 styles.
//
// Spacing is owned by the primitive via the `mb` prop. Consumers should
// NOT pass `mb-*` through className — use the typed `mb` prop instead.
// Other layout overrides (e.g. `text-center`) belong in className.

export function Tagline({children, as = 'span', mb = 'mb-3', className}: TaglineProps) {
  const As = as as ElementType
  return (
    <As className={['tagline', mb, className].filter(Boolean).join(' ')}>
      {children}
    </As>
  )
}

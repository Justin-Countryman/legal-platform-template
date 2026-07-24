// ─── Types ────────────────────────────────────────────────────────────────────

type Size = 'sm' | 'md'

type Props = {
  /** Number of filled stars (0..total). */
  count:      number
  /** Total stars rendered. Defaults to 5. */
  total?:     number
  /** Star icon size — 'sm' = 16px (h-4 w-4), 'md' = 20px (h-5 w-5). */
  size?:      Size
  className?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
}

const GAP_CLASS: Record<Size, string> = {
  sm: 'gap-0.5',
  md: 'gap-1',
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Decorative star-rating row used by testimonial composables. Filled stars
// render per the "Stars semantic color doctrine" (skill-color-system):
// gold/amber FILL on every surface — `text-star-fill`, a dedicated anchored
// token holding the raw action color — plus an OUTLINE
// (`--color-star-outline`) that carries the WCAG SC 1.4.11 3:1 non-text
// contrast requirement for the star's shape (OUTSTANDING item 13, ruled
// 2026-07-19 under "Accessibility wins over convention"). The outline is a
// cascade-aware pair derived in designTokens.ts (`starOutline()` /
// `starOutlineOnDark()`): the :root value clears 3:1 on the light surfaces
// (bg-background / bg-muted / bg-hero-tint) and the standard dark-surface
// cascade swaps it inside bg-brand-dark sections; on either side the stroke
// collapses to the fill color (invisible) when the fill alone already
// carries the shape. Dedicated tokens (not raw `text-action`) so
// `platform/no-text-action-raw` needs no carve-out here. Empty stars use the
// light border color so the trailing dim stars still register as a 5-star
// scale.

export function StarRating({count, total = 5, size = 'sm', className}: Props) {
  const wrapperCls = [
    'flex',
    GAP_CLASS[size],
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <div className={wrapperCls} aria-label={`${count} out of ${total} stars`}>
      {Array.from({length: total}).map((_, i) => {
        const filled = i < count
        return (
          <svg
            key={i}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={[SIZE_CLASS[size], filled ? 'text-star-fill' : 'text-border'].join(' ')}
            // Shape outline on filled stars only (SC 1.4.11 — see header
            // comment). strokeLinejoin=round keeps the star's points from
            // spiking (miter joins on acute star tips overshoot the glyph).
            {...(filled
              ? {stroke: 'var(--color-star-outline)', strokeWidth: 1.5, strokeLinejoin: 'round' as const}
              : {})}
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      })}
    </div>
  )
}

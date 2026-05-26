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
// use raw `text-action` per the "Stars semantic color doctrine" — gold/amber
// is the universal semantic color for filled stars regardless of surface
// (the cultural convention overrides cascade-aware token discipline at this
// one site). Accepts the WCAG SC 1.4.11 graphical-contrast tradeoff on light
// surfaces (~2.27:1 vs the 3:1 threshold) as a deliberate design choice.
// See skill-color-system → "Stars semantic color doctrine" and OUTSTANDING.md
// → "StarRating graphical contrast (WCAG SC 1.4.11)" for the tracker.
// Empty stars use the light border color so the trailing dim stars still
// register as a 5-star scale.

export function StarRating({count, total = 5, size = 'sm', className}: Props) {
  const wrapperCls = [
    'flex',
    GAP_CLASS[size],
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <div className={wrapperCls} aria-label={`${count} out of ${total} stars`}>
      {Array.from({length: total}).map((_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          // eslint-disable-next-line platform/no-text-action-raw -- stars semantic gold doctrine (skill-color-system)
          className={[SIZE_CLASS[size], i < count ? 'text-action' : 'text-border'].join(' ')}
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

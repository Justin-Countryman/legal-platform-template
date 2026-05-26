// ─── Component ────────────────────────────────────────────────────────────────
//
// Standard tertiary-CTA arrow with the platform's hover-nudge animation.
// Color is inherited from the parent (currentColor); callers set the color
// via text-* utilities on the surrounding element. The nudge distance comes
// from the design-settings runtime token --tertiary-arrow-dx.
//
// Pair with a parent element that has the `group` class — the glyph nudges
// on `group-hover`.
//
// `position` only affects placement relative to the label (handled by the
// caller — Button.tsx orders children differently per position).
//
// `glyph` selects between the canonical arrow ("→") and a chevron-right SVG.
// Added in WS-Sidebar Phase 2.5 to support the `sidebarNavIconStyle` design
// setting (`'arrows'` | `'chevrons'` | `'none'`). Default `'arrow'` preserves
// existing behavior across every non-sidebar caller.

type ArrowPosition = 'leading' | 'trailing'
type ArrowGlyph    = 'arrow' | 'chevron'

type Props = {
  className?: string
  // Accepted for API symmetry with Button's arrowPosition prop. The glyph and
  // nudge direction are identical regardless of position; placement around the
  // label is the caller's responsibility.
  position?:  ArrowPosition
  /**
   * Visual glyph rendered inside the arrow span. `'arrow'` (default) renders
   * the canonical `→` character; `'chevron'` renders a thin chevron-right SVG
   * for sidebars whose `designSettings.sidebarNavIconStyle` selects chevrons.
   */
  glyph?:     ArrowGlyph
}

export function TertiaryArrow({className, glyph = 'arrow'}: Props) {
  const cls = [
    'inline-block transition-transform duration-ui-fast',
    'group-hover:translate-x-[var(--tertiary-arrow-dx,0.125rem)]',
    className ?? '',
  ].filter(Boolean).join(' ')

  if (glyph === 'chevron') {
    return (
      <span aria-hidden="true" className={cls}>
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="inline-block h-3.5 w-3.5 align-[-0.0625em]"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    )
  }

  return (
    <span aria-hidden="true" className={cls}>
      →
    </span>
  )
}

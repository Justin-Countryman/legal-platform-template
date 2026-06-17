import {forwardRef, type Ref} from 'react'
import Link from 'next/link'
import {TertiaryArrow} from '@/components/ui/TertiaryArrow'

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
type ButtonContext = 'light' | 'dark'
type ButtonSize    = 'small' | 'compact' | 'normal'
type ArrowPosition = 'leading' | 'trailing'
type ArrowGlyph    = 'arrow' | 'chevron'

type ButtonProps = {
  variant?:       ButtonVariant
  /**
   * Surface context the button renders on. Reduced scope post-WS5 — most
   * surface-dependent colors (`foreground`, `accent`, `border`, `ring-focus`,
   * `hover-wash`) auto-resolve via the `data-ring-context="dark"` /
   * `.bg-brand-dark` cascade. `context` is now needed only for two specific
   * design choices the cascade can't infer:
   *   1. Primary white-flip — primary buttons on dark scrim use `bg-background`
   *      with a cascade-reset so the inner text reads light-foreground.
   *   2. Ring-on-action-fill discipline — solid action-fill buttons on dark
   *      need `ring-white` (not `ring-focus-on-dark`) to remain visible
   *      against the action color itself.
   */
  context?:       ButtonContext
  size?:          ButtonSize
  fullWidth?:     boolean
  /** Tertiary only — flips arrow before / after the label. Ignored on primary/secondary. */
  arrowPosition?: ArrowPosition
  /**
   * Tertiary only — selects the leading/trailing icon glyph (`'arrow'`
   * default → `→`; `'chevron'` → chevron-right SVG). Added in WS-Sidebar
   * Phase 2.5 to support `sidebarNavIconStyle`. Default preserves existing
   * behavior across every non-sidebar caller.
   */
  arrowGlyph?:    ArrowGlyph
  /**
   * Tertiary only — when `true`, suppresses the leading/trailing TertiaryArrow.
   * Added in WS-Sidebar Phase 2.5 to support `sidebarNavIconStyle: 'none'`.
   * Default `false` preserves the existing always-render-the-arrow contract
   * for every non-sidebar tertiary caller.
   */
  noArrow?:       boolean
  href?:          string
  type?:          'button' | 'submit' | 'reset'
  disabled?:      boolean
  loading?:       boolean
  className?:     string
  children:       React.ReactNode
  'aria-label'?:       string
  'aria-describedby'?: string
  target?:        '_blank'
  rel?:           string
  onClick?:       React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZE: Record<ButtonSize, string> = {
  small:   'rounded-btn px-4 py-1.5 text-xs gap-1.5',
  compact: 'rounded-btn px-5 py-2.5 text-sm gap-2',
  normal:  'rounded-btn px-6 py-3 text-sm gap-2',
}

const VARIANTS: Record<'primary' | 'secondary', Record<ButtonContext, string>> = {
  primary: {
    light: 'bg-action text-action-fg hover:bg-action-hover active:brightness-95 focus-visible:ring-focus',
    // Primary-on-dark white-flip: button sits inside a dark parent (cascade
    // has swapped --color-foreground to the on-dark value). The arbitrary-
    // property override resets --color-foreground locally so `text-foreground`
    // resolves to the light-surface value (dark text on white fill).
    dark:  '[--color-foreground:var(--color-foreground-on-light)] bg-background text-foreground hover:bg-muted active:brightness-95 focus-visible:ring-white focus-visible:ring-offset-brand-dark',
  },
  secondary: {
    light: 'bg-transparent border border-action text-action-text hover:bg-action hover:text-action-fg hover:border-action active:brightness-95 focus-visible:ring-focus',
    // On dark surfaces the outline + text use the on-dark foreground (white via
    // the cascade) instead of the action color. The raw action color can sit too
    // close to the dark brand surface for monochromatic/dark palettes (e.g. dark
    // green on dark green), failing WCAG contrast. White outline guarantees
    // contrast on ANY dark brand; the action color still fills on hover.
    dark:  'bg-transparent border border-current text-foreground hover:bg-action hover:text-action-fg hover:border-action active:brightness-95 focus-visible:ring-white focus-visible:ring-offset-brand-dark',
  },
}

// Tertiary text color: cascade-aware `text-action-text` resolves to the
// AA-safe action-on-light fallback on light surfaces (e.g. burgundy on cream
// for vivid-accent palettes like a warm amber, where raw `text-accent` would
// fail 4.5:1) and to the raw action color on dark surfaces (passes contrast
// against brand-dark). Mirrors the hand-rolled tertiary spans inside
// `<CardLink>` parents which also use `text-action-text`. No surface lookup
// needed — cascade rule handles the swap.
const TERTIARY_TEXT = 'text-action-text'

// Tertiary focus ring: kept as a context-keyed lookup because solid action-fill
// buttons on dark scrims need `ring-white` (visible against any background)
// rather than the cascade-aware `ring-focus-on-dark` (amber, may blend with
// action color). This is the "ring-on-action-fill discipline" — design-driven,
// orthogonal to cascade.
const TERTIARY_RING: Record<ButtonContext, string> = {
  light: 'focus-visible:ring-focus',
  dark:  'focus-visible:ring-white focus-visible:ring-offset-brand-dark',
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

// Button has 6 render branches across 2 variant families × 3 href shapes:
// Tertiary × {external <a>, internal <Link>, no-href <button>}
// Primary/Secondary × {external <a>, internal <Link>, no-href <button>}
// The ref type is a union — caller knows from context which DOM element
// will render (no-href branches yield HTMLButtonElement; href branches
// yield HTMLAnchorElement). next/link's Link forwards ref through to its
// underlying anchor.

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button({
  variant       = 'primary',
  context       = 'light',
  size          = 'normal',
  fullWidth     = false,
  arrowPosition = 'trailing',
  arrowGlyph    = 'arrow',
  noArrow       = false,
  href,
  type          = 'button',
  disabled,
  loading,
  className,
  children,
  ...props
}, ref) {

  // ── Tertiary: text-link with appended (or prepended) arrow ─────────────────
  // fullWidth has no effect on tertiary — text-link doesn't full-width meaningfully.
  // Text color is cascade-aware (TERTIARY_TEXT — `text-action-text` resolves
  // to AA-safe action-on-light on light surfaces, raw action color on dark);
  // only the focus-ring is context-keyed (canonical white-ring discipline on
  // dark surfaces).
  if (variant === 'tertiary') {
    const stateClasses = disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
    const cls = [
      'group inline-flex items-center whitespace-nowrap',
      'text-base font-medium gap-1.5',
      '[text-transform:var(--tertiary-text-transform,none)]',
      '[letter-spacing:var(--tertiary-letter-spacing,0em)]',
      TERTIARY_TEXT,
      'transition-colors duration-ui-fast',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      TERTIARY_RING[context],
      stateClasses,
      className ?? '',
    ].filter(Boolean).join(' ')

    const arrow = noArrow ? null : <TertiaryArrow position={arrowPosition} glyph={arrowGlyph} />
    const content = noArrow
      ? <>{children}</>
      : arrowPosition === 'leading'
        ? <>{arrow}{children}</>
        : <>{children}{arrow}</>

    if (href) {
      const isHttp = href.startsWith('http')
      const isExternal = isHttp || href.startsWith('tel:') || href.startsWith('mailto:')
      if (isExternal) {
        const consumerAriaLabel = props['aria-label']
        const ariaLabelOverride = isHttp && consumerAriaLabel
          ? {'aria-label': `${consumerAriaLabel} (opens in new tab)`}
          : {}
        return (
          <a
            ref={ref as Ref<HTMLAnchorElement>}
            href={href}
            className={cls}
            {...(isHttp ? {target: props.target ?? '_blank', rel: props.rel ?? 'noopener noreferrer'} : {})}
            {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            {...ariaLabelOverride}
          >
            {content}
            {isHttp && !consumerAriaLabel && (
              <span className="sr-only"> (opens in new tab)</span>
            )}
          </a>
        )
      }
      return (
        <Link
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          className={cls}
          aria-disabled={disabled}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      )
    }
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled}
        className={cls}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    )
  }

  // ── Primary / Secondary ───────────────────────────────────────────────────
  // fullWidth applies w-full on the base; consumer className (last in the join)
  // wins per Tailwind convention if a caller passes a competing width class.
  const base = [
    'inline-flex items-center justify-center',
    SIZE[size],
    'font-semibold whitespace-nowrap',
    fullWidth ? 'w-full' : '',
    'transition-colors duration-ui-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  ].filter(Boolean).join(' ')

  const stateClasses = [
    disabled || loading ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
    loading ? 'cursor-wait' : '',
  ].filter(Boolean).join(' ')

  const cls = [base, VARIANTS[variant][context], stateClasses, className ?? ''].filter(Boolean).join(' ')

  // Animation hooks — picked up by [data-button-animation="<mode>"] selectors in
  // globals.css. Tertiary intentionally lacks these, so it's excluded from the
  // hover-animation system (its arrow-nudge is the only hover affordance).
  const animProps = {
    'data-variant': variant,
    'data-button-animatable': 'true',
  } as const

  if (href) {
    const isHttp = href.startsWith('http')
    const isExternal = isHttp || href.startsWith('tel:') || href.startsWith('mailto:')
    if (isExternal) {
      const consumerAriaLabel = props['aria-label']
      const ariaLabelOverride = isHttp && consumerAriaLabel
        ? {'aria-label': `${consumerAriaLabel} (opens in new tab)`}
        : {}
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          className={cls}
          aria-busy={loading || undefined}
          {...animProps}
          {...(isHttp ? {target: props.target ?? '_blank', rel: props.rel ?? 'noopener noreferrer'} : {})}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          {...ariaLabelOverride}
        >
          {loading && <Spinner />}
          {children}
          {isHttp && !consumerAriaLabel && (
            <span className="sr-only"> (opens in new tab)</span>
          )}
        </a>
      )
    }
    return (
      <Link
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={cls}
        aria-disabled={disabled}
        aria-busy={loading || undefined}
        {...animProps}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {loading && <Spinner />}
        {children}
      </Link>
    )
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      className={cls}
      aria-busy={loading || undefined}
      {...animProps}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
})

Button.displayName = 'Button'

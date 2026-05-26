import {forwardRef, type ButtonHTMLAttributes, type ReactNode} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type IconButtonSurface = 'light' | 'dark'
type IconButtonSize    = 'default'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** The icon node — typically a react-icons component sized via className. */
  icon:               ReactNode
  /** Required for assistive tech (icon-only buttons have no visible text). */
  'aria-label':       string
  /** Optional visible label rendered before the icon (e.g., drawer "Close"). */
  children?:          ReactNode
  /**
   * Surface context. Reduced scope post-WS5 — text color, hover bg, and ring
   * color all auto-resolve via the `data-ring-context="dark"` / `.bg-brand-dark`
   * cascade. `surface` is now needed only for the focus-ring offset color
   * (light = default white offset; dark = brand-dark offset to prevent the
   * white halo against a dark scrim).
   */
  surface?:           IconButtonSurface
  /** Size of the hit area. default = 44×44 (only supported size). */
  size?:              IconButtonSize
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZE_ICON_ONLY: Record<IconButtonSize, string> = {
  default: 'h-11 w-11',
}

const SIZE_WITH_LABEL: Record<IconButtonSize, string> = {
  default: 'h-11 px-3 gap-1.5 text-sm font-medium',
}

// Cascade-aware base — text color, hover wash, hover text, and ring color all
// auto-swap based on parent surface (data-ring-context="dark" / .bg-brand-dark).
const BASE = [
  'text-foreground-muted',
  'hover:bg-hover-wash hover:text-foreground',
  'focus-visible:ring-focus focus-visible:ring-offset-2',
].join(' ')

// Ring offset color — the only genuinely surface-specific styling. Default
// (white offset) works against the bg-background surfaces light IconButtons sit
// on; dark surfaces need brand-dark offset to prevent a white halo against
// the dark scrim.
const RING_OFFSET: Record<IconButtonSurface, string> = {
  light: '',
  dark:  'focus-visible:ring-offset-brand-dark',
}

// ─── Component ────────────────────────────────────────────────────────────────

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      children,
      surface = 'light',
      size    = 'default',
      type    = 'button',
      disabled,
      className,
      ...rest
    },
    ref,
  ) {
    const hasLabel = children != null

    const cls = [
      'inline-flex items-center justify-center',
      hasLabel ? SIZE_WITH_LABEL[size] : SIZE_ICON_ONLY[size],
      'rounded-ui',
      'transition-colors duration-ui-fast',
      'focus-visible:outline-none focus-visible:ring-2',
      BASE,
      RING_OFFSET[surface],
      disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
      className ?? '',
    ].filter(Boolean).join(' ')

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cls}
        {...rest}
      >
        {hasLabel && <span>{children}</span>}
        {icon}
      </button>
    )
  },
)

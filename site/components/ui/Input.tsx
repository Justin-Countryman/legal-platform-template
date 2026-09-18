import {forwardRef, type InputHTMLAttributes, type ReactNode} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** Icon node rendered inside the input on the left (e.g., a search glyph). */
  leadingIcon?:  ReactNode
  /** Element rendered absolutely on the right (e.g., a submit button). */
  trailingSlot?: ReactNode
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE = [
  'block w-full rounded-ui border border-border-control',
  'bg-background text-base text-foreground',
  'min-h-11 py-2',
  'placeholder:text-foreground-subtle',
  'transition-colors duration-ui-fast',
  'hover:border-foreground-muted',
  'focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-focus focus-visible:ring-offset-2',
  'focus-visible:border-cue',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ')

// ─── Component ────────────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  {className, leadingIcon, trailingSlot, type = 'text', ...rest},
  ref,
) {
  const padX = [
    leadingIcon  ? 'pl-10' : 'pl-4',
    trailingSlot ? 'pr-10' : 'pr-4',
  ].join(' ')

  const inputCls = [BASE, padX, className ?? ''].filter(Boolean).join(' ')

  // A control is a LIGHT island wherever it sits: it paints its own bg-background,
  // so its boundary, its text and its placeholder must resolve the light-surface
  // tokens even inside a dark or saturated band, where the cascade would otherwise
  // hand it the on-dark values and leave a near-invisible edge on white
  // (Phase 15, WS-V1-PHASE15-DESIGN §7 amendment 21).
  if (!leadingIcon && !trailingSlot) {
    return <input ref={ref} type={type} data-ring-context="light" className={inputCls} {...rest} />
  }

  return (
    <div className="relative" data-ring-context="light">
      {leadingIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foreground-muted">
          {leadingIcon}
        </span>
      )}
      <input ref={ref} type={type} className={inputCls} {...rest} />
      {trailingSlot && (
        <span className="absolute inset-y-0 right-0 flex items-center">
          {trailingSlot}
        </span>
      )}
    </div>
  )
})

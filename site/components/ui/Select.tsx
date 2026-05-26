import {forwardRef, type SelectHTMLAttributes} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = SelectHTMLAttributes<HTMLSelectElement>

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE = [
  'block w-full appearance-none rounded-ui border border-border',
  'bg-background text-base text-foreground',
  'min-h-11 py-2 pl-4 pr-10',
  'transition-colors duration-ui-fast',
  'hover:border-foreground-muted',
  'focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-focus focus-visible:ring-offset-2',
  'focus-visible:border-action',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ')

// ─── Component ────────────────────────────────────────────────────────────────
//
// Native <select> with platform tokens and an inline chevron. The chevron is
// decorative (aria-hidden) — the native select widget is the source of truth
// for assistive tech.

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  {className, children, ...rest},
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={[BASE, className ?? ''].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-foreground"
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  )
})

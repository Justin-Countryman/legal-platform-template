import {forwardRef, type ComponentPropsWithoutRef, type ReactNode} from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type LinkProps = ComponentPropsWithoutRef<typeof Link>

type Props = LinkProps & {
  children:   ReactNode
  className?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
//
// Whole-card-link wrapper: the entire card surface is a focusable Link.
// Bakes in the platform card chrome — surface, border, runtime card-lift
// shadow stack, hover lift + border accent, contrast-aware focus ring.
// Layout (flex direction, padding, overflow) is consumer-controlled via
// className so the same wrapper supports vertical post cards, horizontal
// attorney cards, and compact city-tile cards.
//
// `group` is set so inner <TertiaryArrow> nudges on hover.

const BASE = [
  'group block bg-background border border-border rounded-ui',
  'shadow-card-rest',
  'transition-[translate,box-shadow,border-color] duration-ui-slow ease-smooth',
  'hover:shadow-card-hover hover:card-lift hover:border-action',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
].join(' ')

// ─── Component ────────────────────────────────────────────────────────────────

export const CardLink = forwardRef<HTMLAnchorElement, Props>(function CardLink(
  {children, className, ...rest},
  ref,
) {
  const cls = [BASE, className ?? ''].filter(Boolean).join(' ')

  return (
    <Link ref={ref} className={cls} {...rest}>
      {children}
    </Link>
  )
})

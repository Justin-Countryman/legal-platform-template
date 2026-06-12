import {siloHover, type SiloHoverEffect} from '@/lib/siloHover'
import type {SiloNavItem} from './types'
import {TileLink, TileIcon, TileLabel, TileBlurb, TileArrow} from './parts'

// Mobile compact-list rendering for the silo nav: icon + label (+ optional blurb)
// rows, each a whole-row link with a chevron. No photos — the fastest, most
// scannable, lightest-weight mobile option (nothing to download). Shown < md; the
// desktop grid renders separately. Rows reuse the tile primitives, so they inherit
// the focus ring + decorative-media a11y; press feedback is a bg wash (a scale would
// gap the row inside its dividers).
export function SiloCompactList({
  items, ariaLabel, hoverEffects, showArrow, className,
}: {
  items: SiloNavItem[]
  ariaLabel: string
  hoverEffects: SiloHoverEffect[]
  showArrow: boolean
  className?: string
}) {
  const fx = siloHover(hoverEffects)
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul role="list" className="divide-y divide-border overflow-hidden rounded-ui border border-border">
        {items.map((item) => (
          <li key={item._key}>
            <TileLink href={item.href ?? '#'} press="wash" className="flex items-center gap-4 px-4 py-3.5">
              <TileIcon item={item} fx={fx} size="sm" />
              <div className="min-w-0 flex-1">
                <TileLabel
                  item={item}
                  fx={fx}
                  className="font-heading text-base font-semibold leading-tight tracking-tight text-foreground"
                />
                <TileBlurb item={item} className="mt-0.5 text-sm leading-snug text-foreground-muted line-clamp-1" />
              </div>
              {showArrow && <TileArrow fx={fx} className="size-5" />}
            </TileLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

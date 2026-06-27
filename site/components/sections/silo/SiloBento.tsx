import {siloHover, type SiloHoverEffect, type SiloHoverClasses} from '@/lib/siloHover'
import {hasImage} from '@/lib/sanity/image'
import type {SiloNavItem, SiloIconPosition, SiloGridMode} from './types'
import {
  SiloNav, TileLink, TileImage, TileFill, TileGlow, TileBorder, TileIcon, TileLabel, TileBlurb, TileArrow,
} from './parts'
import {bentoLayout, mosaicCellSpan} from './bento'

// Bento mode — a unified photo mosaic with the Primary item as the hero, always
// leading top-left. Each photo tile is a @container, so the SAME card renders compact
// in a small cell (label only) and rich in the hero cell (large label + blurb) with no
// per-size variants. bentoList swaps the field of tiles for a scannable row list beside
// the hero. Hover + a11y come from the shared primitives, identical to the equal-grid
// button layouts.

export type SiloBentoProps = {
  items: SiloNavItem[]
  ariaLabel: string
  hoverEffects: SiloHoverEffect[]
  showArrow: boolean
  iconPosition: SiloIconPosition
  gridMode: SiloGridMode
}

function BentoTile({
  item, fx, showArrow, showIcon,
}: {
  item: SiloNavItem
  fx: SiloHoverClasses
  showArrow: boolean
  showIcon: boolean
}) {
  const onImage = hasImage(item.image)
  return (
    <TileLink
      href={item.href ?? '#'}
      dark={onImage}
      className={`@container flex h-full flex-col p-5 @sm:p-6 ${fx.container}`}
    >
      {onImage ? <TileImage item={item} fx={fx} /> : <TileFill />}
      <TileGlow fx={fx} />
      <div className="relative z-10 flex h-full flex-col">
        {showIcon && <TileIcon item={item} fx={fx} onImage={onImage} size="sm" />}
        <div className="mt-auto pt-8">
          <div className="flex items-end justify-between gap-3">
            <TileLabel
              item={item}
              fx={fx}
              className="font-heading text-base font-semibold leading-tight tracking-tight text-foreground @sm:text-xl @lg:text-2xl"
            />
            {showArrow && <TileArrow fx={fx} className="size-5 @sm:size-6" />}
          </div>
          {/* Blurb appears only once the cell is wide enough to carry it (the hero). */}
          <TileBlurb item={item} className="mt-2 hidden text-sm leading-snug text-foreground-muted @sm:line-clamp-2" />
        </div>
      </div>
      <TileBorder fx={fx} />
    </TileLink>
  )
}

// Compact directory row (bentoList) — icon · label · arrow, a whole-row link.
function BentoRow({
  item, fx, showArrow, showIcon,
}: {
  item: SiloNavItem
  fx: SiloHoverClasses
  showArrow: boolean
  showIcon: boolean
}) {
  return (
    <TileLink href={item.href ?? '#'} className={`flex h-full items-center gap-3 px-5 py-4 ${fx.container}`}>
      <TileGlow fx={fx} />
      <span className="relative z-10 flex w-full items-center gap-3">
        {showIcon && <TileIcon item={item} fx={fx} size="sm" />}
        <span className="min-w-0 flex-1">
          <TileLabel item={item} fx={fx} className="font-heading text-sm font-semibold tracking-tight text-foreground @xs:text-base" />
        </span>
        {showArrow && <TileArrow fx={fx} className="size-4" />}
      </span>
    </TileLink>
  )
}

export function SiloBento({items, ariaLabel, hoverEffects, showArrow, iconPosition, gridMode}: SiloBentoProps) {
  const fx = siloHover(hoverEffects)
  const showIcon = iconPosition !== 'none'
  const {gridClass, heroSpan, hero, rest} = bentoLayout(items, gridMode)
  if (!hero) return null

  // Feature & List — a hero card beside a scannable column of the remaining links.
  if (gridMode === 'bentoList') {
    return (
      <SiloNav ariaLabel={ariaLabel} className="grid grid-cols-1 gap-5 @3xl:grid-cols-[1.25fr_1fr] @3xl:items-stretch @3xl:gap-6">
        <li className="min-h-[18rem] @3xl:min-h-[24rem]">
          <BentoTile item={hero} fx={fx} showArrow={showArrow} showIcon={showIcon} />
        </li>
        <li>
          <ul role="list" className="flex h-full flex-col rounded-ui border border-border [&>li+li]:border-t [&>li+li]:border-border">
            {rest.map((item) => (
              <li key={item._key} className="flex-1">
                <BentoRow item={item} fx={fx} showArrow={showArrow} showIcon={showIcon} />
              </li>
            ))}
          </ul>
        </li>
      </SiloNav>
    )
  }

  // Grid modes — hero 2×2 top-left; Mosaic varies the remaining tiles for rhythm.
  return (
    <SiloNav ariaLabel={ariaLabel} className={gridClass}>
      <li key={hero._key} className={heroSpan}>
        <BentoTile item={hero} fx={fx} showArrow={showArrow} showIcon={showIcon} />
      </li>
      {rest.map((item, i) => (
        <li key={item._key} className={gridMode === 'bentoMosaic' ? mosaicCellSpan(i) : undefined}>
          <BentoTile item={item} fx={fx} showArrow={showArrow} showIcon={showIcon} />
        </li>
      ))}
    </SiloNav>
  )
}

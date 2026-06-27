import {siloHover, type SiloHoverEffect} from '@/lib/siloHover'
import {hasImage} from '@/lib/sanity/image'
import type {SiloNavItem, SiloIconPosition} from './types'
import {
  SiloNav, TileLink, TileImage, TileFill, TileGlow, TileBorder, TileIcon, TileLabel, TileBlurb, TileArrow,
} from './parts'

// The five silo-nav button layouts. Each composes the shared item model
// (image · icon · label · blurb) differently and inherits the hover system +
// a11y primitives. Two section-level knobs thread through every layout: `showArrow`
// (hide/show the affordance) and `iconPosition` (where the icon sits — each layout
// honours the positions that fit its shape and clamps the rest; 'none' hides icons).
// Photo-capable: Spotlight · Feature · Tile (and the photo PANEL of Split). Inline is
// always a fill row. Spotlight + Tile OVERLAY text on the photo (dark context over a
// scrim); Feature + Split sit the text on a light panel beside/below an un-scrimmed
// photo. Every tile is a whole-tile link with the focus-ring contract;
// missing elements degrade gracefully (no icon → no chip, no image → fill, blurb only
// when set).

export type SiloLayoutProps = {
  items: SiloNavItem[]
  ariaLabel: string
  hoverEffects: SiloHoverEffect[]
  showArrow: boolean
  iconPosition: SiloIconPosition
}

type IconPos = 'top' | 'left' | 'right' | 'none'

// Resolve the section-level icon position into one this layout's shape supports:
// 'none' always hides; an explicit allowed position wins; otherwise the layout's
// natural fallback ('auto' and unsupported positions both fall back).
function pickIconPos(setting: SiloIconPosition, allowed: IconPos[], fallback: IconPos): IconPos {
  if (setting === 'none') return 'none'
  if (setting !== 'auto' && (allowed as string[]).includes(setting)) return setting as IconPos
  return fallback
}

// Container-query grids: columns scale off the nav's own width (see SiloNav's
// @container), so the grid is 3-up full-bleed and 2-up inside an Aside column with
// no viewport coupling. @xl ≈ 36rem, @4xl ≈ 56rem (container widths).
const CARD_GRID = 'grid grid-cols-1 gap-6 @xl:grid-cols-2 @4xl:grid-cols-3 @4xl:gap-7'
const ROW_GRID = 'grid grid-cols-1 gap-4 @xl:grid-cols-2'
const CARD = 'flex h-full flex-col rounded-ui border border-border'

// ── 1. Spotlight — photo cover · large label + arrow over the scrim ──────────────
export function SiloSpotlight({items, ariaLabel, hoverEffects, showArrow, iconPosition}: SiloLayoutProps) {
  const fx = siloHover(hoverEffects)
  const showIcon = iconPosition !== 'none'
  return (
    <SiloNav ariaLabel={ariaLabel} className={CARD_GRID}>
      {items.map((item) => {
        const onImage = hasImage(item.image)
        return (
          <li key={item._key}>
            <TileLink href={item.href ?? '#'} dark={onImage} className={`${CARD} min-h-[14rem] ${fx.container}`}>
              {onImage ? <TileImage item={item} fx={fx} /> : <TileFill />}
              <TileGlow fx={fx} />
              <div className="relative z-10 flex h-full flex-col p-6">
                {showIcon && <TileIcon item={item} fx={fx} onImage={onImage} size="sm" />}
                <div className="mt-auto pt-10">
                  <div className="flex items-end justify-between gap-4">
                    <TileLabel item={item} fx={fx} />
                    {showArrow && <TileArrow fx={fx} />}
                  </div>
                  <TileBlurb item={item} className="mt-2 text-sm leading-relaxed text-foreground-muted line-clamp-1" />
                </div>
              </div>
              <TileBorder fx={fx} />
            </TileLink>
          </li>
        )
      })}
    </SiloNav>
  )
}

// ── 2. Feature — image card · photo on top · content panel below ─────────────────
// The vertical sibling of Split: photo header (no scrim — no text overlaps it) with
// the icon chip straddling the seam, then label + blurb + arrow on a light panel.
export function SiloFeature({items, ariaLabel, hoverEffects, showArrow, iconPosition}: SiloLayoutProps) {
  const fx = siloHover(hoverEffects)
  const showIcon = iconPosition !== 'none'
  return (
    <SiloNav ariaLabel={ariaLabel} className={CARD_GRID}>
      {items.map((item) => {
        const onImage = hasImage(item.image)
        return (
          <li key={item._key}>
            <TileLink href={item.href ?? '#'} className={`${CARD} min-h-[20rem] overflow-hidden ${fx.container}`}>
              <div className="relative h-44 w-full shrink-0 overflow-hidden">
                {onImage ? <TileImage item={item} fx={fx} scrim={false} /> : <TileFill />}
              </div>
              <div className="relative z-10 flex flex-1 flex-col p-6">
                {showIcon && (
                  <div className="-mt-12 mb-3">
                    <TileIcon item={item} fx={fx} onImage={onImage} />
                  </div>
                )}
                <div>
                  <TileLabel item={item} fx={fx} className="font-heading text-lg font-semibold leading-snug tracking-tight text-foreground md:text-xl" />
                  <TileBlurb item={item} className="mt-2 text-sm leading-relaxed text-foreground-muted line-clamp-2" />
                </div>
                {showArrow && (
                  <div className="mt-auto pt-4">
                    <TileArrow fx={fx} className="size-5" />
                  </div>
                )}
              </div>
              <TileGlow fx={fx} />
              <TileBorder fx={fx} />
            </TileLink>
          </li>
        )
      })}
    </SiloNav>
  )
}

// ── 3. Tile — compact · icon (top/left/right) + label + blurb · optional photo ───
export function SiloTileLayout({items, ariaLabel, hoverEffects, iconPosition}: SiloLayoutProps) {
  const fx = siloHover(hoverEffects)
  const pos = pickIconPos(iconPosition, ['top', 'left', 'right'], 'top')
  const stacked = pos === 'top' || pos === 'none'
  return (
    <SiloNav ariaLabel={ariaLabel} className={CARD_GRID}>
      {items.map((item) => {
        const onImage = hasImage(item.image)
        return (
          <li key={item._key}>
            <TileLink
              href={item.href ?? '#'}
              dark={onImage}
              className={`${CARD} min-h-[12rem] items-center justify-center p-8 ${stacked ? 'text-center' : ''} ${fx.container}`}
            >
              {onImage ? <TileImage item={item} fx={fx} /> : <TileFill />}
              <TileGlow fx={fx} />
              <div className={`relative z-10 flex ${stacked ? 'flex-col items-center gap-4' : 'items-center gap-4'}`}>
                {pos === 'left' && <TileIcon item={item} fx={fx} onImage={onImage} />}
                {pos === 'top' && <TileIcon item={item} fx={fx} onImage={onImage} size="lg" />}
                <div className={stacked ? 'flex flex-col items-center' : 'min-w-0'}>
                  <TileLabel item={item} fx={fx} center={stacked} className="font-heading text-lg font-semibold leading-snug tracking-tight text-foreground" />
                  <TileBlurb item={item} className={`mt-1.5 text-sm leading-snug text-foreground-muted line-clamp-2 ${stacked ? 'text-center' : ''}`} />
                </div>
                {pos === 'right' && <TileIcon item={item} fx={fx} onImage={onImage} />}
              </div>
              <TileBorder fx={fx} />
            </TileLink>
          </li>
        )
      })}
    </SiloNav>
  )
}

// ── 4. Inline — fill row · icon (left/right) · label + blurb · arrow ─────────────
export function SiloInline({items, ariaLabel, hoverEffects, showArrow, iconPosition}: SiloLayoutProps) {
  const fx = siloHover(hoverEffects)
  const pos = pickIconPos(iconPosition, ['left', 'right'], 'left')
  return (
    <SiloNav ariaLabel={ariaLabel} className={ROW_GRID}>
      {items.map((item) => (
        <li key={item._key}>
          <TileLink href={item.href ?? '#'} className={`flex items-center rounded-ui border border-border p-5 ${fx.container}`}>
            <TileFill />
            <TileGlow fx={fx} />
            <div className="relative z-10 flex w-full items-center gap-4">
              {pos === 'left' && <TileIcon item={item} fx={fx} />}
              <div className="min-w-0 flex-1">
                <TileLabel item={item} fx={fx} className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg" />
                <TileBlurb item={item} className="mt-1 text-sm leading-snug text-foreground-muted line-clamp-1" />
              </div>
              {pos === 'right' && <TileIcon item={item} fx={fx} />}
              {showArrow && <TileArrow fx={fx} className="size-5" />}
            </div>
            <TileBorder fx={fx} />
          </TileLink>
        </li>
      ))}
    </SiloNav>
  )
}

// ── 5. Split — premium two-column card · photo panel · icon + label + blurb + arrow
export function SiloSplit({items, ariaLabel, hoverEffects, showArrow, iconPosition}: SiloLayoutProps) {
  const fx = siloHover(hoverEffects)
  const showIcon = iconPosition !== 'none'
  return (
    <SiloNav ariaLabel={ariaLabel} className={CARD_GRID}>
      {items.map((item) => {
        const onImage = hasImage(item.image)
        return (
          <li key={item._key}>
            <TileLink
              href={item.href ?? '#'}
              className={`flex flex-col overflow-hidden rounded-ui border border-border sm:min-h-[11rem] sm:flex-row ${fx.container}`}
            >
              <div className="relative h-36 w-full shrink-0 overflow-hidden sm:h-auto sm:w-2/5">
                {onImage ? <TileImage item={item} fx={fx} scrim={false} /> : <TileFill />}
              </div>
              <div className="relative z-10 flex min-w-0 flex-1 flex-col p-6">
                {showIcon && <TileIcon item={item} fx={fx} size="sm" />}
                <div className="mt-3">
                  <TileLabel item={item} fx={fx} className="font-heading text-lg font-semibold leading-snug tracking-tight text-foreground" />
                  <TileBlurb item={item} className="mt-2 text-sm leading-relaxed text-foreground-muted line-clamp-2" />
                </div>
                {showArrow && (
                  <div className="mt-auto pt-4">
                    <TileArrow fx={fx} className="size-5" />
                  </div>
                )}
              </div>
              <TileGlow fx={fx} />
              <TileBorder fx={fx} />
            </TileLink>
          </li>
        )
      })}
    </SiloNav>
  )
}

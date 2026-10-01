import {siloHover, type SiloHoverEffect} from '@/lib/siloHover'
import {hasImage} from '@/lib/sanity/image'
import type {SiloNavItem, SiloIconPosition} from './types'
import {
  SiloNav, TileLink, TileImage, TileFill, TileGlow, TileBorder, TileIcon, TileLabel, TileBlurb, TileArrow,
} from './parts'
import {AREA_CARD_TIERS, AREA_ROW_TIERS, countGridClasses} from '../countGrid'

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
// Phase 18 session D: the columns follow the count (`countGrid.ts`): every area on one row up to four in a full band,
// three from a 56rem nav and two from 36rem, past that the count that leaves nobody alone, a short last row centred.
// They were three across and two across whatever the count, so four, five, seven or eight areas left a short row.
const cardGrid = (count: number) => {
  const g = countGridClasses(count, AREA_CARD_TIERS)
  return {list: `${g.list} gap-6 @4xl:gap-7`, items: g.items}
}
const rowGrid = (count: number) => {
  const g = countGridClasses(count, AREA_ROW_TIERS)
  return {list: `${g.list} gap-4`, items: g.items}
}
const CARD = 'flex h-full flex-col rounded-ui border border-border'

// ── 1. Spotlight — photo cover · large label + arrow over the scrim ──────────────
export function SiloSpotlight({items, ariaLabel, hoverEffects, showArrow, iconPosition}: SiloLayoutProps) {
  const fx = siloHover(hoverEffects)
  const showIcon = iconPosition !== 'none'
  const grid = cardGrid(items.length)
  return (
    <SiloNav ariaLabel={ariaLabel} className={grid.list}>
      {items.map((item, i) => {
        const onImage = hasImage(item.image)
        return (
          <li key={item._key} className={grid.items[i]}>
            <TileLink href={item.href ?? '#'} className={`${CARD} min-h-[14rem] ${fx.container}`}>
              {onImage ? <TileImage item={item} fx={fx} /> : <TileFill />}
              <TileGlow fx={fx} />
              <div data-ring-context={onImage ? 'dark' : undefined} className="relative z-10 flex h-full flex-col p-6">
                {showIcon && <TileIcon item={item} fx={fx} onImage={onImage} size="sm" />}
                <div className={onImage ? 'mt-auto pt-10 tile-text-scrim' : 'mt-auto pt-10'}>
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
  const grid = cardGrid(items.length)
  return (
    <SiloNav ariaLabel={ariaLabel} className={grid.list}>
      {items.map((item, i) => {
        const onImage = hasImage(item.image)
        return (
          <li key={item._key} className={grid.items[i]}>
            <TileLink href={item.href ?? '#'} className={`${CARD} min-h-[20rem] overflow-hidden ${fx.container}`}>
              <div className="relative h-44 w-full shrink-0 overflow-hidden">
                {onImage ? <TileImage item={item} fx={fx} scrim={false} /> : <TileFill />}
              </div>
              <div className="relative z-10 flex flex-1 flex-col p-6">
                {/* The chip rides up over the photo's bottom edge, so its wrapper
                    exists only when there is a chip: without one, the -mt-12 pulled
                    the title up over the photo (Phase 16A, found in the catalog). */}
                {showIcon && hasImage(item.icon) && (
                  <div className="-mt-12 mb-3">
                    <TileIcon item={item} fx={fx} onImage={onImage} />
                  </div>
                )}
                <div>
                  <TileLabel item={item} fx={fx} className="font-heading card-title font-semibold tracking-tight text-foreground" />
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
// Centered on a plain card; on a photo, at the card's foot over the text scrim, so the photo shows
// above it (Phase 17D, `[R-556]`: a whole-card scrim left the photos a dim texture, ADV-17D-P2).
export function SiloTileLayout({items, ariaLabel, hoverEffects, iconPosition}: SiloLayoutProps) {
  const fx = siloHover(hoverEffects)
  const pos = pickIconPos(iconPosition, ['top', 'left', 'right'], 'top')
  const stacked = pos === 'top' || pos === 'none'
  const grid = cardGrid(items.length)
  return (
    <SiloNav ariaLabel={ariaLabel} className={grid.list}>
      {items.map((item, i) => {
        const onImage = hasImage(item.image)
        return (
          <li key={item._key} className={grid.items[i]}>
            <TileLink
              href={item.href ?? '#'}
              className={`${CARD} min-h-[12rem] items-center ${onImage ? 'justify-end' : 'justify-center'} p-8 ${stacked ? 'text-center' : ''} ${fx.container}`}
            >
              {onImage ? <TileImage item={item} fx={fx} /> : <TileFill />}
              <TileGlow fx={fx} />
              <div
                data-ring-context={onImage ? 'dark' : undefined}
                className={`relative z-10 flex ${stacked ? 'flex-col items-center gap-4' : 'items-center gap-4'}${onImage ? ' w-full justify-center tile-text-scrim [--tile-scrim-pad:2rem]' : ''}`}
              >
                {pos === 'left' && <TileIcon item={item} fx={fx} onImage={onImage} />}
                {pos === 'top' && <TileIcon item={item} fx={fx} onImage={onImage} size="lg" />}
                <div className={stacked ? 'flex flex-col items-center' : 'min-w-0'}>
                  <TileLabel item={item} fx={fx} center={stacked} className="font-heading card-title font-semibold tracking-tight text-foreground" />
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
  const grid = rowGrid(items.length)
  return (
    <SiloNav ariaLabel={ariaLabel} className={grid.list}>
      {items.map((item, i) => (
        <li key={item._key} className={grid.items[i]}>
          <TileLink href={item.href ?? '#'} card={false} className={`flex items-center rounded-ui border border-border p-5 ${fx.container}`}>
            <TileFill />
            <TileGlow fx={fx} />
            <div className="relative z-10 flex w-full items-center gap-4">
              {pos === 'left' && <TileIcon item={item} fx={fx} />}
              <div className="min-w-0 flex-1">
                <TileLabel item={item} fx={fx} className="font-heading row-title font-semibold tracking-tight text-foreground" />
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
  const grid = cardGrid(items.length)
  return (
    <SiloNav ariaLabel={ariaLabel} className={grid.list}>
      {items.map((item, i) => {
        const onImage = hasImage(item.image)
        return (
          <li key={item._key} className={grid.items[i]}>
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
                  <TileLabel item={item} fx={fx} className="font-heading card-title font-semibold tracking-tight text-foreground" />
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

import {SectionHeader} from '@/components/ui/SectionHeader'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {resolveHovers, type SiloHoverEffect} from '@/lib/siloHover'
import {SectionShell, type SectionAppearance} from './SectionShell'
import {
  SiloSpotlight, SiloFeature, SiloTileLayout, SiloInline, SiloSplit,
} from './silo/SiloLayouts'
import {SiloBento} from './silo/SiloBento'
import {isBentoMode} from './silo/bento'
import type {SiloNavItem, SiloLayout, SiloIconPosition, SiloSectionLayout, SiloGridMode} from './silo/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PracticeAreaNavBlockData = {
  _type: 'practiceAreaNav'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  layout?: SiloLayout | null
  sectionLayout?: SiloSectionLayout | null
  gridMode?: SiloGridMode | null
  hoverEffects?: string[] | null
  showArrow?: boolean | null
  iconPosition?: SiloIconPosition | null
  mode?: 'manual' | 'allTopLevel' | null
  items?: SiloNavItem[] | null
  appearance?: SectionAppearance | null
}

// Dispatch the chosen layout (the cardStyle → dispatcher pattern). Every layout
// inherits the resolved hover preset + the section-level Show Arrow / Icon Position
// knobs. `indexCards` is a legacy alias for the original tile → Spotlight.
function SiloVariant({
  layout, gridMode, items, ariaLabel, hoverEffects, showArrow, iconPosition,
}: {
  layout?: SiloLayout | null
  gridMode?: SiloGridMode | null
  items: SiloNavItem[]
  ariaLabel: string
  hoverEffects: SiloHoverEffect[]
  showArrow: boolean
  iconPosition: SiloIconPosition
}) {
  const props = {items, ariaLabel, hoverEffects, showArrow, iconPosition}
  // Bento is its own unified mosaic — it overrides the equal-grid button layout.
  if (isBentoMode(gridMode)) return <SiloBento {...props} gridMode={gridMode} />
  switch (layout) {
    case 'feature':
      return <SiloFeature {...props} />
    case 'tile':
      return <SiloTileLayout {...props} />
    case 'inline':
      return <SiloInline {...props} />
    case 'split':
      return <SiloSplit {...props} />
    case 'spotlight':
    case 'indexCards': // legacy alias — the original tile is now Spotlight
    default:
      return <SiloSpotlight {...props} />
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PracticeAreaNavBlock({
  data,
  napTokens,
}: {
  data: PracticeAreaNavBlockData
  napTokens?: NapTokens | null
}) {
  const items = (data.items ?? []).filter((i): i is SiloNavItem => !!i?.href)
  if (items.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)
  // Accessible name for the <nav> landmark — the heading when set, else a stable
  // fallback so the landmark is always named (assistive-tech requirement).
  const navLabel = heading?.trim() || 'Practice areas'
  const hoverEffects = resolveHovers(data.hoverEffects, data.layout)
  // Show Arrow defaults on; Icon Position defaults to each layout's natural spot.
  const showArrow = data.showArrow ?? true
  const iconPosition = data.iconPosition ?? 'auto'
  const sectionLayout: SiloSectionLayout = data.sectionLayout ?? 'centered'
  const hasHeader = !!(heading || tagline)

  const buttons = (
    <SiloVariant
      layout={data.layout}
      gridMode={data.gridMode}
      items={items}
      ariaLabel={navLabel}
      hoverEffects={hoverEffects}
      showArrow={showArrow}
      iconPosition={iconPosition}
    />
  )

  return (
    <SectionShell appearance={data.appearance}>
      <SiloSectionFrame
        layout={sectionLayout}
        hasHeader={hasHeader}
        tagline={tagline}
        heading={heading}
        description={description}
        buttons={buttons}
      />
    </SectionShell>
  )
}

// Arrange the header relative to the button grid — the section-layout axis. The grid
// adapts to whatever column width it lands in (SiloNav is a @container), so these
// layouts stay independent of the chosen button layout.
function SiloSectionFrame({
  layout, hasHeader, tagline, heading, description, buttons,
}: {
  layout: SiloSectionLayout
  hasHeader: boolean
  tagline: string | null
  heading: string | null
  description: string | null
  buttons: React.ReactNode
}) {
  const header = (alignment: 'center' | 'left', opts?: {withDescription?: boolean; className?: string}) =>
    hasHeader ? (
      <SectionHeader
        tagline={tagline}
        heading={heading ?? ''}
        description={opts?.withDescription === false ? null : description}
        alignment={alignment}
        className={opts?.className}
      />
    ) : null

  switch (layout) {
    case 'left':
      return (
        <div data-section-layout="left">
          {hasHeader && <div className="mb-12 max-w-2xl">{header('left')}</div>}
          {buttons}
        </div>
      )

    case 'aside':
      return (
        <div data-section-layout="aside" className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-12 xl:gap-16">
          {hasHeader && (
            <div className="mb-10 lg:mb-0 lg:sticky lg:top-28 lg:self-start">{header('left')}</div>
          )}
          <div>{buttons}</div>
        </div>
      )

    case 'banner':
      return (
        <div data-section-layout="banner">
          {hasHeader && (
            <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-12">
              {header('left', {withDescription: false, className: 'max-w-2xl'})}
              {description && <p className="max-w-md text-foreground-muted md:text-right">{description}</p>}
            </div>
          )}
          {buttons}
        </div>
      )

    case 'centered':
    default:
      return (
        <div data-section-layout="centered">
          {hasHeader && <div className="mx-auto mb-12 max-w-2xl">{header('center')}</div>}
          {buttons}
        </div>
      )
  }
}

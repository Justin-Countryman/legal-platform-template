'use client'

// Practice-area "Silo Nav" card strip — a full-width row of quick-link cards
// rendered beneath the hero content. Shared by BOTH the Overlay and Split
// skeletons so there's one implementation. 'cards' is the hero's own solid
// (bg-background) card — image-optional and always legible on the dark band;
// 'spotlight' / 'tile' reuse the shared silo library (self-surfacing photo
// layouts). Returns null when the strip is off or has no items.

import {CardLink} from '@/components/ui/CardLink'
import {TertiaryArrow} from '@/components/ui/TertiaryArrow'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {SiloSpotlight, SiloTileLayout} from '@/components/sections/silo/SiloLayouts'
import type {SiloNavItem} from '@/components/sections/silo/types'
import {resolveHovers} from '@/lib/siloHover'
import type {HeroConfig, PracticeAreaItem} from './types'

// Single source for "the strip actually renders": the toggle is on AND there
// are items. HeroBand's height ceiling keys off this same predicate (ruled
// 2026-07-23, item 58: with a strip present the hero has no height cap — a
// strip below the fold is fine, a cut-off strip is not), so the cap can never
// disagree with what the strip itself decides to render.
export function heroStripActive(config: HeroConfig, items: PracticeAreaItem[]): boolean {
  return !!config.contentStrip && items.length > 0
}

export function HeroSiloStrip({config, items}: {config: HeroConfig; items: PracticeAreaItem[]}) {
  if (!heroStripActive(config, items)) return null
  if (config.siloLayout === 'cards') return <CardsStrip items={items} />

  // Identical GROQ output to SiloNavItem; just guarantee a string _key.
  const siloItems: SiloNavItem[] = items.map((c, i) => ({
    _key: c._key ?? String(i),
    label: c.label,
    href: c.href,
    description: c.description,
    icon: c.icon,
    image: c.image,
    featured: c.featured,
  }))
  const props = {
    items: siloItems,
    ariaLabel: 'Practice areas',
    hoverEffects: resolveHovers(null, config.siloLayout),
    showArrow: true,
    iconPosition: 'auto' as const,
  }
  return (
    <div className="container relative z-10 mt-auto pt-12">
      {config.siloLayout === 'spotlight' ? <SiloSpotlight {...props} /> : <SiloTileLayout {...props} />}
    </div>
  )
}

function CardsStrip({items}: {items: PracticeAreaItem[]}) {
  return (
    <ul role="list" className="container relative z-10 mt-auto grid grid-cols-1 gap-6 pt-12 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c, i) => (
        <li key={c._key ?? i}>
          <CardLink href={c.href || '#'} className="flex h-full flex-col overflow-hidden">
            {hasImage(c.image) && (
              <div className="relative aspect-video w-full">
                <SanityImage image={c.image} mode="fill" alt={c.image.alt ?? ''} sizes="(min-width:1024px) 30vw, 100vw" />
              </div>
            )}
            {/* Light island inside the dark hero band — reset the cascade so text reads dark. */}
            <div className="p-5" data-ring-context="light">
              <p className="font-heading font-semibold text-foreground">{c.label}</p>
              {c.description && <p className="mt-1 text-sm text-foreground-muted">{c.description}</p>}
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-action-text">
                Learn more <TertiaryArrow position="trailing" />
              </span>
            </div>
          </CardLink>
        </li>
      ))}
    </ul>
  )
}

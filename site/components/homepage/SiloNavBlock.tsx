import {SiloTileLayout} from '@/components/sections/silo/SiloLayouts'
import type {SiloNavItem} from '@/components/sections/silo/types'
import {resolveHovers} from '@/lib/siloHover'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'

// ─── Areas of Law block (silo nav) ────────────────────────────────────────────
//
// CLIENT-OWNED. `components/homepage/` holds block components only; the
// dispatcher and the first-block motion rule are platform-owned at
// `components/layout/HomepageCanvas.tsx`. Keep the file path and the export
// name — the dispatcher imports `SiloNavBlock` from this exact path on every
// client. The markup inside is yours to replace wholesale.
//
// BEAT 4, AS A CANVAS BLOCK. `practiceAreaNav` — the Layer 2 section — is
// unchanged and still serves interior pages. It is no longer the homepage's
// realization of this beat, because a section always renders after every canvas
// block and a Required beat specified fourth of nine could not reach position
// four by any field value (monorepo `BI/OUTSTANDING.md` item 59, ruled
// 2026-08-08). See the block schema for the option rejected on the record.
//
// ─── WHY THIS REUSES SiloTileLayout RATHER THAN RE-CUTTING THE TILE ───────────
//
// The tile layout is the shared silo vocabulary: it already carries the
// whole-tile link and its focus-ring contract, the hover system, the
// image-or-fill degradation, the container-query grid, and the dark-context flip
// for photo tiles. Re-cutting that markup here would fork six accessibility and
// theming behaviours per client with nothing reporting the divergence. What is
// bespoke on a composed homepage is the BAND around the tiles — the header, the
// rhythm, the surface — and that is what this file writes.
//
// It is a component reused across the layer boundary, not an interior-page
// primitive smuggled in. The Layer 3 prohibition names things that decide TYPE
// SCALE on a block's behalf (`SectionHeader`, `PortableText` with heading
// styles); `SiloTileLayout` sets no heading scale at all — its labels are the
// tile's own `text-lg`, which is a card label rather than a heading tier.
//
// THE HEADER IS WRITTEN HERE, not routed through <SectionHeader>, for that exact
// reason: SectionHeader maps to the interior three-tier scale and never emits the
// marketing scale, so an operator could set `designSettings.marketingScale` and
// watch the homepage not move.
//
// TOKENS ONLY. Surface and text from role tokens, radius from --radius-ui, type
// from the marketing scale. No hex, no font family, no arbitrary radius.
//
// NO SCROLLREVEAL HERE. Motion is applied by the canvas, which is the only thing
// that knows whether this block is first on the page.

export type SiloNavBlockData = {
  _type: 'siloNavBlock'
  _key: string
  tagline?: string | null
  heading?: string | null
  description?: string | null
  mode?: 'manual' | 'allTopLevel' | null
  items?: SiloNavItem[] | null
}

export function SiloNavBlock({
  data,
  napTokens,
}: {
  data: SiloNavBlockData
  napTokens?: NapTokens | null
}) {
  // An item the GROQ resolved without an href cannot be a link, so it is not a
  // nav entry. Same filter the interior section applies, and for the same reason.
  const items = (data.items ?? []).filter((i): i is SiloNavItem => !!i?.href)

  // Empty renders nothing rather than a heading over a void. A firm with no
  // published practice areas has no Areas of Law band; the operator sees the gap
  // in Studio and the visitor never sees a half-drawn one.
  if (items.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)

  // Accessible name for the <nav> landmark — the heading when set, else a stable
  // fallback, so the landmark is always named even on a header-less band.
  const navLabel = heading?.trim() || 'Practice areas'

  // Hover preset resolved from the layout rather than from an operator field:
  // hover treatment is a composition choice, not content, so it fails the field
  // test and does not appear in the schema.
  const hoverEffects = resolveHovers(null, 'tile')

  return (
    <section className="px-[5%] py-16 md:py-24">
      {heading || tagline || description ? (
        <div className="container mx-auto max-w-3xl text-center">
          {tagline ? (
            <p className="font-heading text-sm font-semibold uppercase tracking-widest text-action-text">
              {tagline}
            </p>
          ) : null}
          {heading ? (
            <h2 className={`marketing-h2 font-heading font-bold text-foreground ${tagline ? 'mt-3' : ''}`}>
              {heading}
            </h2>
          ) : null}
          {description ? <p className="mt-4 text-foreground-muted">{description}</p> : null}
        </div>
      ) : null}

      <div className="container mx-auto mt-12 max-w-6xl">
        <SiloTileLayout
          items={items}
          ariaLabel={navLabel}
          hoverEffects={hoverEffects}
          showArrow
          iconPosition="auto"
        />
      </div>
    </section>
  )
}

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'

// ─── The page background layer ────────────────────────────────────────────────
//
// One decorative layer behind the whole document (Phase 13), so a `pattern` band
// and the gutters around an `inset` panel have something to show. Without it,
// `pattern` renders exactly as `light` and the inset modifier is just a narrower
// band.
//
// A SEPARATE COMPONENT, not inline in the layout, for one reason:
// `app/(site)/layout.tsx` is an `async` server component, so React Testing
// Library cannot render it and the record's `layout.test.tsx` cannot exist. This
// can be tested directly.
//
// ─── z-index: the one character that decides whether this works ───────────────
//
// `-z-10`, NOT `z-0`. Measured in Chrome 152: at `z-0` this layer paints OVER
// eleven of the fifteen bands and over the footer. A static, opaque element
// paints in the in-flow step, which is BEFORE a positioned element with
// `z-index: 0` — and the five section components off `SectionShell`, plus six of
// the seven footer layouts, are static. `<main>` is `position: static` too
// (`layout.tsx` gives it `className="outline-none"` and `globals.css` has no
// `main` selector), so tree order does not save it either.
//
// At `-z-10` every band covers the layer, including the static ones, and the only
// places it shows through are where a band paints no background at all. That also
// DECOUPLES this from requirement 5: the thirteen bands moving onto `SectionShell`
// do not need to gain a background class for this layer to be correct.
//
// `absolute`, NOT `fixed`. Measured: `fixed inset-0` covers the VIEWPORT (757px
// of a 4,068px document) and does not scroll, so a texture sits still while the
// page moves over it. `absolute inset-0` inside the layout's own `relative`
// wrapper covers the whole document, which is what a page texture does on every
// site in the field study. The cost is one `relative` class on that wrapper, and
// it does not disturb the sticky header, which is `fixed` against the viewport.
//
// `pointer-events-none` because the layer spans the document and would otherwise
// swallow every click on the page.
//
// It is decorative, so it carries NO `aria-hidden` and no `role`: a CSS
// background is outside the accessibility tree already, and an `<img>` here would
// put a decorative photo into it. The `photo` kind uses `alt=""` for that reason.
//
// `data-page-background` is what `globals.css` targets to remove the layer
// outright in forced-colors mode and in print. Forced-colors overrides
// `background-color` but forces `background-image` to `none` only for non-url
// values, so a ground drawn in a system colour would otherwise fight the UA's own
// text backplates.

/** The four textures the ten themes' sample sites actually wear. `fineGrid` and
 *  `dotLattice`, which the Phase 13 record named, have zero sites in the field
 *  study and are not here (§7 amendments 17 to 20). */
export const PAGE_TEXTURES = ['pinstripe', 'diagonalHatch', 'diamondLattice', 'scallop'] as const
export type PageTexture = (typeof PAGE_TEXTURES)[number]

export const PAGE_BACKGROUND_KINDS = ['none', 'texture', 'photo', 'gradient'] as const
export type PageBackgroundKind = (typeof PAGE_BACKGROUND_KINDS)[number]

export type PageBackgroundData = {
  kind?: PageBackgroundKind | null
  texture?: PageTexture | null
  image?: SanityImageData | null
  opacity?: number | null
}

// The utility per texture, defined as `@utility` blocks in `globals.css` so each
// gradient can read `var(--color-brand-dark)` and follow the client's palette
// with no literal colour anywhere. A TS map cannot be seen by the class checker,
// so `__tests__/PageBackgroundLayer.test.tsx` resolves every one of these through
// Tailwind's own design system.
const TEXTURE_CLASS: Record<PageTexture, string> = {
  pinstripe:      'page-texture-pinstripe',
  diagonalHatch:  'page-texture-diagonal-hatch',
  diamondLattice: 'page-texture-diamond-lattice',
  scallop:        'page-texture-scallop',
}

/** The code default when the operator set no opacity. Low, because the layer sits
 *  under body text on a `pattern` band. Phase 16's themes set it per theme. */
export const DEFAULT_PAGE_BACKGROUND_OPACITY = 0.04

/** The strongest a texture or photo layer ever renders. Body, supporting and label
 *  text on a `pattern` band sit on blend(ground, ink, opacity), and WCAG 1.4.3
 *  measures the darkest pixel under them: every light text tier holds up to 0.04 on
 *  every accepted light ground and fails above it (at 0.25, label text measured
 *  1.85:1; Phase 14). A stored value above it renders at it; the stored value is
 *  untouched. The gradient wash is lighter than `muted` and needs no cap. */
export const MAX_TEXT_SAFE_LAYER_OPACITY = 0.04

const LAYER = 'pointer-events-none absolute inset-0 -z-10'

export function PageBackgroundLayer({data}: {data?: PageBackgroundData | null}) {
  const kind = data?.kind ?? 'none'

  // `none`, absent, and an unknown value render NO element at all. This is the
  // default for every existing client: nothing sets `pageBackground`, so nothing
  // changes on any page until an operator or a Phase 16 theme chooses a kind.
  if (kind === 'none') return null

  const stored = typeof data?.opacity === 'number' ? data.opacity : DEFAULT_PAGE_BACKGROUND_OPACITY
  const opacity = kind === 'gradient' ? stored : Math.min(stored, MAX_TEXT_SAFE_LAYER_OPACITY)

  if (kind === 'texture') {
    const texture = data?.texture
    if (!texture || !(texture in TEXTURE_CLASS)) return null
    return <div data-page-background="texture" className={`${LAYER} ${TEXTURE_CLASS[texture]}`} style={{opacity}} />
  }

  if (kind === 'gradient') {
    return <div data-page-background="gradient" className={`${LAYER} page-wash-gradient`} style={{opacity}} />
  }

  // `photo`. The image is a real element rather than a CSS background so it gets
  // Sanity's CDN sizing and formats, the way every other image on the platform
  // does. `alt=""` because it is decorative.
  if (!hasImage(data?.image)) return null
  return (
    <div data-page-background="photo" className={LAYER} style={{opacity}}>
      <SanityImage image={data.image} mode="fill" alt="" sizes="100vw" />
    </div>
  )
}

/** Exported for the test that resolves every class through Tailwind. */
export const ALL_PAGE_BACKGROUND_CLASSES: readonly string[] = [
  LAYER,
  ...Object.values(TEXTURE_CLASS),
  'page-wash-gradient',
]
  .join(' ')
  .split(/\s+/)
  .filter(Boolean)

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import {
  sectionSurface, SECTION_SPACING, TIGHT_SPACING, DEFAULT_SECTION_SPACING,
  type StoredSurface, type SectionSpacing, type StoredEdge,
  type ResolvedSectionSurface, type SectionSpacingSteps,
  sectionEdgeClasses,
} from '@/lib/sectionSurface'
import {type SeamProps, NO_SEAM, overlapOf} from './sectionFrame'

// ─── SectionShell ───────────────────────────────────────────────────────────────
// The band wrapper every full-width section renders into. It owns the surface
// (bg + ring-context), vertical spacing, horizontal gutter, optional background
// image + scrim, and the centered container — so no section hardcodes a background.
// `children` may be a render function that receives the resolved surface (handy for
// passing buttonContext to a ButtonGroup, or branching content on dark vs light).
//
// ─── Phase 13, the section frame ───────────────────────────────────────────────
//
// WHY EVERY BAND MUST BE HERE. Not for the operator's sake: because a theme
// cannot reach a band that hardcodes its own `<section className="px-[5%]
// py-16 …">`. A theme's texture ground and join shape reach a band only through
// this shell (Phase 16B), and eleven of the fifteen bands were unreachable by any
// theme until Phase 13 moved them (WS-V1-PHASE13-DESIGN §7 amendment 16).
//
// THE FRAME PROPS ARE COMPUTED BY THE DISPATCHER, NEVER HERE. `seamTop`,
// `overlap` and `previousGround` all describe a RELATIONSHIP between two bands,
// and a band cannot know its own neighbours — the same reason the first-block
// motion rule lives in `HomepageCanvas`. The shell renders what it is told.
//
// `contained` (below) is the ORIGINAL prop and is untouched: it means "wrap the
// children in a centered `.container`". The schema's new panel modifier is called
// `inset`, deliberately, because `contained` was already taken and is load-bearing
// for both CTAs and the badges marquee.

export type SectionAppearance = {
  surface?: StoredSurface | null
  spacing?: SectionSpacing | null
  backgroundImage?: SanityImageData | null
  /** Render the band as a panel inside the container, with the page ground
   *  running past it on all four sides. The schema field is `inset`. */
  inset?: boolean | null
  /** The bottom edge this band cuts into the band below it, or `site` for the
   *  site's join shape. The band BELOW paints it; see `sectionEdgeClasses`. */
  edgeBottom?: StoredEdge | null
  /** Pull this band up over the one above it. Desktop and up. */
  overlapPrevious?: 'none' | 'small' | 'large' | null
}

// How far an inset panel rides up over the band above it. `md:` and up, so mobile
// stacks flat, and inset panels only (Phase 16A, `[R-475]`; a full-width band that
// overlapped only hid the bottom of the band above, text included). These work
// ONLY because the overlapping panel has no top padding from `md`
// (`topOverlap`): a negative margin cannot clear the parent's border box unless it
// exceeds the parent's top padding, and `-mt-24` against `md:pt-24` measured 0px
// of overlap in the Phase 13 challenge. With `md:pt-0` the margin IS the overlap.
//
// WCAG 2.2's 2.4.11 holds by construction: the band above grows its bottom
// padding by exactly the overlap (`bottomBeforeOverlap`, told by the walk), so
// the panel rides over padding that band added for it, never over its content.
const OVERLAP_CLASS: Record<'none' | 'small' | 'large', string> = {
  none:  '',
  small: 'md:-mt-12 md:relative md:z-10',
  large: 'md:-mt-24 md:relative md:z-10',
}

type SectionShellProps = {
  appearance?: SectionAppearance | null
  /** Wrap content in a centered `.container` (default). Set false for full-bleed layouts. */
  contained?: boolean
  /** Emit the horizontal gutter `px-[5%]` (default). False for a full-bleed strip. */
  gutter?: boolean
  /** Extra classes on the <section> element. */
  className?: string
  /** Extra classes on the inner container, for a layout that needs its own max-width. */
  innerClassName?: string
  /** The band's relationship to its neighbours, computed by the dispatcher's walk
   *  (`walkFrame`): whether to halve the top padding at a same-ground join, the
   *  ground and edge of the band above (so this band paints that edge), and the
   *  next band's overlap (so this band keeps its content clear of it). */
  seam?: SeamProps
  /** Use the operator-invisible tight preset. For `cta/centered` only, whose
   *  shipped `py-10 md:py-12` matches no storable spacing. */
  tight?: boolean
  /** aria-labelledby / aria-label passthrough for the landmark. */
  'aria-labelledby'?: string
  'aria-label'?: string
  /** Render as a different landmark element when the default `<section>` isn't right. */
  as?: 'section' | 'nav' | 'div'
  children: React.ReactNode | ((surface: ResolvedSectionSurface) => React.ReactNode)
}

export function SectionShell({
  appearance,
  contained = true,
  gutter = true,
  className,
  innerClassName,
  seam = NO_SEAM,
  tight = false,
  as: Tag = 'section',
  children,
  ...aria
}: SectionShellProps) {
  const resolved = sectionSurface(appearance?.surface, seam.site?.patternDark)
  const steps: SectionSpacingSteps = tight
    ? TIGHT_SPACING
    : SECTION_SPACING[appearance?.spacing ?? DEFAULT_SECTION_SPACING]

  const overlap = overlapOf(appearance)
  // The three top-padding states are exclusive, most specific first. An
  // overlapping panel takes no top padding from `md`, because the negative margin
  // is measured against it; a seam halves it; otherwise it is the preset.
  const top = overlap !== 'none' ? steps.topOverlap : seam.seamTop ? steps.seamTop : steps.top
  // The band above an overlapping panel makes room for it.
  const bottom = seam.nextOverlap !== 'none' ? steps.bottomBeforeOverlap[seam.nextOverlap] : steps.bottom

  const bg = appearance?.backgroundImage
  const showImage = resolved.isImage && hasImage(bg)
  const inner = typeof children === 'function' ? children(resolved) : children

  // An inset band is a panel: the surface, the radius and `overflow-hidden` move
  // onto an inner element so the page ground runs past it, and the <section>
  // itself paints nothing. `rounded-ui` is the operator's own radius (Justin,
  // 2026-09-16: no new `--radius-ui-lg` token, because `uiRadius` is already one
  // of the axes a theme fixes, so a panel follows its theme for free).
  const isInset = appearance?.inset === true

  // The site's section texture, on a Pattern band only (Phase 16A, `[R-472]`). One
  // decorative child, absolutely placed BEFORE the content container, which is
  // `relative` and so paints above it in tree order, exactly as the background
  // photo and its scrim do. The gradients are drawn in `currentColor`: on a light
  // band the dark ground at `opacity-4`, the tested ceiling (see
  // `SECTION_TEXTURE_OPACITY`); on a dark band the ink and opacity the engine
  // derived for the palette (`section-texture-dark`, Phase 16B). `-z-10` inside an
  // `isolate` band keeps it under the angled edge this band paints for the band
  // above, which it otherwise striped. `data-section-texture` is what the
  // forced-colors and print rules remove.
  const texture = resolved.textured ? (
    <div
      aria-hidden="true"
      data-section-texture
      className={`section-texture pointer-events-none absolute inset-0 -z-10 ${resolved.ringContext === 'dark' ? 'section-texture-dark' : 'text-brand-dark opacity-4'}`}
    />
  ) : null

  return (
    <Tag
      data-ring-context={resolved.ringContext}
      // Text on a photo: the action color and the focus ring resolve to the on-dark
      // body text color here (globals.css, the scrim block), because neither is
      // guaranteed 4.5:1 or 3:1 over the lightest photo pixel.
      data-scrim={showImage ? 'true' : undefined}
      aria-labelledby={aria['aria-labelledby']}
      aria-label={aria['aria-label']}
      className={[
        'relative',
        gutter && 'px-[5%]',
        // The band above's edge, painted by this band so it survives
        // ScrollReveal's transform. Empty unless that band asked for one.
        sectionEdgeClasses(seam.previousGround, seam.previousEdge),
        OVERLAP_CLASS[overlap],
        // An inset band's own box is transparent; the panel inside carries the
        // surface. A normal band carries it here.
        !isInset && resolved.surfaceClass,
        resolved.textured && !isInset && 'isolate',
        top,
        bottom,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showImage && !isInset && (
        <>
          <SanityImage image={bg} mode="fill" alt="" sizes="100vw" />
          <div className="absolute inset-0 bg-scrim/80" aria-hidden="true" />
        </>
      )}
      {isInset ? (
        <div className={['relative overflow-hidden rounded-ui px-[5%] py-12 md:py-16', resolved.textured && 'isolate', resolved.surfaceClass].filter(Boolean).join(' ')}>
          {showImage && (
            <>
              <SanityImage image={bg} mode="fill" alt="" sizes="100vw" />
              <div className="absolute inset-0 bg-scrim/80" aria-hidden="true" />
            </>
          )}
          {texture}
          <div className={[contained ? 'container relative' : 'relative', innerClassName].filter(Boolean).join(' ')}>{inner}</div>
        </div>
      ) : (
        <>
          {texture}
          <div className={[contained ? 'container relative' : 'relative', innerClassName].filter(Boolean).join(' ')}>{inner}</div>
        </>
      )}
    </Tag>
  )
}

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import {
  sectionSurface, SECTION_SPACING, TIGHT_SPACING, DEFAULT_SECTION_SPACING,
  type StoredSurface, type SectionSpacing,
  type ResolvedSectionSurface, type SectionSpacingSteps,
} from '@/lib/sectionSurface'
import {type SeamProps, NO_SEAM, overlapOf} from './sectionFrame'
import {fadesUnder} from '@/lib/flows'

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
// The paint of a divider (Phase 16C). A cut takes the ground of the band above; a rise
// this band's own. Both live in a `.ts` map, where neither the class checker nor ESLint
// looks, so `__tests__/sectionFrame.test.ts` resolves every class through Tailwind's own
// design system, as the frame's classes already are.
const DIVIDER_FROM: Record<string, string> = {
  light: 'before:bg-background', tint: 'before:bg-hero-tint', muted: 'before:bg-muted',
  dark: 'before:bg-brand-dark', saturated: 'before:bg-accent-fill',
}
const DIVIDER_OWN: Record<string, string> = {
  'bg-background': 'before:bg-background', 'bg-hero-tint': 'before:bg-hero-tint', 'bg-muted': 'before:bg-muted',
  'bg-brand-dark': 'before:bg-brand-dark', 'bg-accent-fill': 'before:bg-accent-fill',
}

const OVERLAP_CLASS: Record<'none' | 'small' | 'large' | 'photo', string> = {
  none:  '',
  small: 'md:-mt-12 md:relative md:z-10',
  large: 'md:-mt-24 md:relative md:z-10',
  photo: '',
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
  // Phase 17B: the theme's ground pass assigned this band a ground where it stored
  // none (`seam.paint`), and the ground it assigned wins over what the component's own
  // resolver answers, because four resolvers answer `light` for an absent surface. A
  // stored surface is never assigned, so a stored value always stands. The texture is a
  // flag on the paint, never the surface value, so a stored Pattern band keeps its one
  // meaning and a theme can texture the dark bands beside it.
  const resolved = sectionSurface(seam.paint?.ground ?? appearance?.surface)
  const textured = resolved.textured || !!seam.paint?.texture
  const steps: SectionSpacingSteps = tight
    ? TIGHT_SPACING
    // A stored spacing, then a section's own (the ribbon's compact rides `appearance`), then
    // the theme's room around a band it filled (Phase 17B session 5, `seam.paint.spacing`).
    : SECTION_SPACING[appearance?.spacing ?? seam.paint?.spacing ?? DEFAULT_SECTION_SPACING]

  const overlap = overlapOf(appearance)
  // The three top-padding states are exclusive, most specific first. An
  // overlapping panel takes no top padding from `md`, because the negative margin
  // is measured against it; a seam halves it; otherwise it is the preset.
  const top = overlap === 'small' || overlap === 'large' ? steps.topOverlap : seam.seamTop ? steps.seamTop : steps.top
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
  // Phase 17B: a theme's `panel` paint fills an absent inset on a light band inside a
  // dark run, so `[R-501]` puts the panel on the run.
  const isInset = appearance?.inset === true || seam.paint?.inset === true

  // Phase 16F. `seam.insetGround` is set only on an inset band the walk found bracketed
  // by one strong ground; everywhere else this is null and nothing below changes.
  const ADOPTED: Record<string, string> = {dark: 'bg-brand-dark', saturated: 'bg-accent-fill'}
  const adoptedClass = isInset && seam.insetGround ? ADOPTED[seam.insetGround] ?? '' : ''
  const paintsDark = isInset ? adoptedClass === 'bg-brand-dark' : resolved.surfaceClass === 'bg-brand-dark'

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
  const texture = textured ? (
    <div
      aria-hidden="true"
      data-section-texture
      className={`section-texture pointer-events-none absolute inset-0 -z-10 ${resolved.ringContext === 'dark' ? 'section-texture-dark' : 'text-brand-dark opacity-4'}`}
    />
  ) : null

  // THE GHOST (Phase 16D, `[R-492]`). One decorative child beside the texture, in the
  // same ink and at the same opacity, so `validateWcag`'s sweep covers the blend. The
  // walk decides which band draws it, because no band can know it is the first.
  // `-z-10` needs the band's `isolate`, which is why `isolate` now follows either
  // layer and not the texture alone: with the texture's `isolate` and the ghost's
  // rule mutually exclusive, the ghost's stacking context did not exist and the
  // measured band pixel was the bare ground.
  const ghostText = seam.ghost ? seam.site?.ghost?.text ?? null : null
  const ghost = ghostText ? (
    <div
      aria-hidden="true"
      data-decor-layer
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${resolved.ringContext === 'dark' ? 'section-texture-dark' : 'text-brand-dark opacity-4'}`}
    >
      <span className="decor-ghost absolute right-[6%] top-1/2 -translate-y-1/2 text-[30vw] md:text-[22vw] lg:text-[16rem]">
        {ghostText}
      </span>
    </div>
  ) : null

  return (
    <Tag
      data-ring-context={isInset && seam.insetGround ? (seam.insetGround === 'dark' ? 'dark' : 'saturated') : resolved.ringContext}
      // Text on a photo: the action color and the focus ring resolve to the on-dark
      // body text color here (globals.css, the scrim block), because neither is
      // guaranteed 4.5:1 or 3:1 over the lightest photo pixel.
      data-scrim={showImage ? 'true' : undefined}
      aria-labelledby={aria['aria-labelledby']}
      aria-label={aria['aria-label']}
      className={[
        'relative',
        gutter && 'px-[5%]',
        // The divider, painted by this band so it survives ScrollReveal's transform
        // (Phase 13 amendment 2). Empty unless the walk placed one here.
        seam.divider?.mode === 'cut' && `divider-cut ${DIVIDER_FROM[seam.divider.from] ?? ''}`,
        seam.divider?.mode === 'rise' && `divider-rise ${DIVIDER_OWN[resolved.surfaceClass] ?? ''}`,
        seam.divider?.flip && 'divider-flip',
        OVERLAP_CLASS[overlap],
        // Phase 16E: the band's own top padding, published so the raised photo's
        // utility can cancel it. Only on a band that raises one.
        seam.raisePhoto && steps.ptVar,
        // An inset band's own box is transparent; the panel inside carries the
        // surface. A normal band carries it here.
        !isInset && resolved.surfaceClass,
        // Phase 16F: an inset band inside a run of one strong ground paints that ground
        // on its own <section>, so the panel sits ON the run instead of on the page's
        // light ground. The walk decides it, because no band can see the one below it.
        isInset && adoptedClass,
        // Phase 16F: a dark band's ground fades into the palette's deep stop. Per band,
        // and only where the band really paints the dark ground -- an image band paints
        // a photo over it and a saturated band is the accent, and neither has a swept pair.
        // Since Phase 17B the theme says whether it fades (`dark.paint`, `lib/flows.ts`).
        fadesUnder(seam.site?.flow) && paintsDark && !resolved.isImage && 'band-gradient',
        fadesUnder(seam.site?.flow) && paintsDark && !resolved.isImage && `grad-i-${Math.min(seam.run?.index ?? 0, 7)}`,
        fadesUnder(seam.site?.flow) && paintsDark && !resolved.isImage && `grad-n-${Math.min(seam.run?.length ?? 1, 8)}`,
        // Phase 17B: the theme's hairline, a decorative line at the top of this band; in the
        // accent where the theme says so (session 5, `[R-524]`).
        seam.hairline && 'hairline-top',
        seam.hairline && seam.site?.flow?.divider.hairlineInk === 'accent' && 'hairline-accent',
        (textured || ghost) && !isInset && 'isolate',
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
        <div
          // The panel's own polarity. Required, not decorative: `.bg-brand-dark` on the
          // <section> above is itself a cascade trigger (globals.css), so a light panel
          // sitting on an adopted dark ground would resolve every text token, the focus
          // ring, the border and the slab to their on-dark forms without this reset.
          data-ring-context={adoptedClass ? resolved.ringContext ?? 'light' : undefined}
          className={['relative overflow-hidden rounded-ui px-[5%] py-12 md:py-16', textured && 'isolate', resolved.surfaceClass].filter(Boolean).join(' ')}
        >
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
          {ghost}
          <div className={[contained ? 'container relative' : 'relative', seam.divider?.mode === 'cut' && 'mt-divider', innerClassName].filter(Boolean).join(' ')}>{inner}</div>
        </>
      )}
    </Tag>
  )
}

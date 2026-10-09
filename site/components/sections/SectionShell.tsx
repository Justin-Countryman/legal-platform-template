import {getImageProps} from 'next/image'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import {
  sectionSurface, SECTION_SPACING, TIGHT_SPACING, DEFAULT_SECTION_SPACING,
  type StoredSurface, type SectionSpacing,
  type ResolvedSectionSurface, type SectionSpacingSteps,
} from '@/lib/sectionSurface'
import {type SeamProps, NO_SEAM, overlapOf} from './sectionFrame'
import {HERO_BACKDROP_SIZES} from '@/lib/heroSurface'
import {GhostPhotoLayer, SetPhotoLayer} from './SetPhoto'

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
  dark: 'before:bg-brand-dark', saturated: 'before:bg-accent-fill', wash: 'before:bg-wash',
}
const DIVIDER_OWN: Record<string, string> = {
  'bg-background': 'before:bg-background', 'bg-hero-tint': 'before:bg-hero-tint', 'bg-muted': 'before:bg-muted',
  'bg-brand-dark': 'before:bg-brand-dark', 'bg-accent-fill': 'before:bg-accent-fill', 'bg-wash': 'before:bg-wash',
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
  /** A content section's cut-out stands on this band's bottom edge (monorepo `[R-641]`): the band publishes its bottom
   *  padding (`--band-pb`), unless the band below overlaps it, where the padding is not its own. */
  bottomBleed?: boolean
}

/** The glow's light and veil classes (`globals.css`, `[R-646]`) as one string: written out so the class check sees each
 *  name, and kept out of the shell's class list, whose every optional entry a lint rule walks in combination. */
function glowLightClasses(run: SeamProps['run']): string {
  if (!run) return ''
  return [
    run.veil === 'flat' ? 'glow-veil-flat' : run.veil === 'top' ? 'glow-veil-top' : run.veil === 'bottom' ? 'glow-veil-bottom' : '',
    run.light ? 'glow-lit' : '',
    run.light === 'left' ? 'glow-light-left' : run.light === 'right' ? 'glow-light-right' : run.light === 'center' ? 'glow-light-center' : '',
    // The light's row where not the middle, and its seam (`[R-648]`).
    run.light && run.row === 'top' ? 'glow-light-top' : run.light && run.row === 'bottom' ? 'glow-light-bottom' : '',
    run.light && run.edge ? 'glow-light-edge' : '',
  ].filter(Boolean).join(' ')
}

export function SectionShell({
  appearance,
  bottomBleed = false,
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
  // Phase 17B session 6 (`[R-530]`, record §2.2): a window of the hero's photograph, where the
  // theme painted one and the site look carries the photograph. A band's own photo wins.
  const photoWin = seam.paint?.ground === 'image' ? seam.paint.window ?? null : null
  const heroPhoto = photoWin ? seam.site?.heroPhoto ?? null : null
  const showWindow = resolved.isImage && !!heroPhoto && !showImage
  // Phase 17E (`[R-573]`): a photograph of the theme's set. A band alone under its photograph, and the close, draw it
  // here; a band inside a longer run paints no ground of its own, because the canvas draws the run's one photograph
  // behind all its bands (`HomepageCanvas`), and carries the photo band's mark so it is an Image section as built by
  // hand (`[R-531]`).
  const setPaint = seam.paint?.ground === 'image' ? seam.paint.photo ?? null : null
  const setPhoto = setPaint ? seam.site?.photoSet?.[setPaint.index] ?? null : null
  const inRun = resolved.isImage && !!setPhoto && setPaint!.length > 1 && !showImage
  const showSet = resolved.isImage && !!setPhoto && setPaint!.length === 1 && !showImage
  // The Layout theme's panel (Panels, `seam.paint.onPanel`; monorepo WS-V1-LAYOUT-OPTIONS-DESIGN, ADV-LO amendment 4): the
  // band keeps its ground and everything drawn on it, and its words sit on a raised panel in the column. The light island
  // hands the band's content a light surface, so a button there takes the light context; the dark panel keeps the band's.
  const panel = appearance?.inset !== true && seam.paint?.inset !== true ? seam.paint?.onPanel ?? null : null
  const inner = typeof children === 'function' ? children(panel?.fill === 'light' ? sectionSurface('light') : resolved) : children

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
  // A photograph of the set faded into the band's own ground (the Background theme's faint photographs,
  // `seam.paint.photoFade`): on a dark band the set's layer with soft edges, the band an Image section in its colors
  // (`data-scrim`), one band alone drawing it here and a longer run drawn once by the canvas, its bands painting no
  // ground; on the page ground or the wash a ghost under the band's own tiers (`data-fade`). Never a panel.
  const fadePaint = !isInset && !resolved.isImage ? seam.paint?.photoFade ?? null : null
  const fadePhoto = fadePaint ? seam.site?.photoSet?.[fadePaint.index] ?? null : null
  const softDark = !!fadePhoto && resolved.surfaceClass === 'bg-brand-dark'
  const softRun = softDark && fadePaint!.length > 1
  const ghosted = !!fadePhoto && (resolved.surfaceClass === 'bg-background' || resolved.surfaceClass === 'bg-wash')
  // What the band draws over its dark ground (Phase 17D session 2, `seam.fade`): only where it paints the dark ground.
  const fade = paintsDark && !resolved.isImage ? seam.fade ?? null : null

  // The site's section texture, on a Pattern band only (Phase 16A, `[R-472]`). One
  // decorative child, absolutely placed BEFORE the content container, which is
  // `relative` and so paints above it in tree order, exactly as the background
  // photo and its scrim do. The gradients are drawn in `currentColor`: on a light
  // band the dark ground under the tested ceiling (see `SECTION_TEXTURE_OPACITY`
  // and the render scale, Phase 17C session 3); on a dark band the ink and opacity
  // the engine derived for the palette (`section-texture-on-dark`, Phase 16B). `-z-10` inside an
  // `isolate` band keeps it under the angled edge this band paints for the band
  // above, which it otherwise striped. `data-section-texture` is what the
  // forced-colors and print rules remove.
  // Phase 17C session 3 (`[R-538]`): the strength the theme gave this band (a stored Pattern band is
  // quiet), and the layer's ink at the swept blend times the tile's render scale.
  const strength = seam.paint?.texture === 'strong' ? 'strong' : 'quiet'
  const texture = textured ? (
    <div
      aria-hidden="true"
      data-section-texture={strength}
      className={`${strength === 'strong' ? 'section-texture-strong' : 'section-texture'} pointer-events-none absolute inset-0 -z-10 ${resolved.ringContext === 'dark' ? 'section-texture-on-dark' : 'section-texture-on-light'}`}
    />
  ) : null

  // THE GHOST (Phase 16D, `[R-492]`). One decorative child beside the texture, in the
  // same ink, under the same swept opacity (a solid mark, at 0.9 of it; Phase 17C session 3),
  // so `validateWcag`'s sweep covers the blend. The
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
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${resolved.ringContext === 'dark' ? 'decor-ghost-on-dark' : 'decor-ghost-on-light'}`}
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
      data-scrim={showImage || showWindow || showSet || inRun || softDark ? 'true' : undefined}
      data-fade={ghosted ? 'light' : undefined}
      // A band Gradient bloom lights takes the photo band's colors, its glow being solved under them (`[R-557]`); an
      // inset's section glows in its gutter only, and its panel keeps its own colors, so it takes none.
      data-glow={fade === 'glow' && !isInset ? 'true' : undefined}
      aria-labelledby={aria['aria-labelledby']}
      aria-label={aria['aria-label']}
      className={[
        'relative',
        // A panel keeps its gutter even where its section draws full-bleed (a scrolling badges band):
        // without it the panel met the viewport's edges (Phase 17D, ADV-17D-B).
        (gutter || isInset) && 'px-[5%]',
        // The divider, painted by this band so it survives ScrollReveal's transform
        // (Phase 13 amendment 2). Empty unless the walk placed one here.
        seam.divider?.mode === 'cut' && `divider-cut ${DIVIDER_FROM[seam.divider.from] ?? ''}`,
        seam.divider?.mode === 'rise' && `divider-rise ${DIVIDER_OWN[resolved.surfaceClass] ?? ''}`,
        seam.divider?.flip && 'divider-flip',
        OVERLAP_CLASS[overlap],
        // Phase 16E: the band's own top padding, published so the raised photo's
        // utility can cancel it. Only on a band that raises one.
        seam.raisePhoto && steps.ptVar,
        bottomBleed && seam.nextOverlap === 'none' && steps.pbVar,
        // An inset band's own box is transparent; the panel inside carries the
        // surface. A normal band carries it here.
        !isInset && !inRun && !softRun && resolved.surfaceClass,
        // Phase 16F: an inset band inside a run of one strong ground paints that ground
        // on its own <section>, so the panel sits ON the run instead of on the page's
        // light ground. The walk decides it, because no band can see the one below it.
        isInset && adoptedClass,
        // Phase 16F: a dark band's ground fades into the palette's deep stop. Per band,
        // and only where the band really paints the dark ground -- an image band paints
        // a photo over it and a saturated band is the accent, and neither has a swept pair.
        // Since Phase 17B the theme says whether it fades (`dark.paint`, `lib/flows.ts`); since Phase 17D session 2 the
        // walk carries what the band draws (`seam.fade`): the bridge's ramp, or Gradient bloom's glow (`[R-557]`), its
        // peak's band and the side its light comes from.
        fade === 'gradient' && 'band-gradient',
        fade === 'glow' && 'band-glow',
        fade && `grad-i-${Math.min(seam.run?.index ?? 0, 7)}`,
        fade && `grad-n-${Math.min(seam.run?.length ?? 1, 8)}`,
        fade === 'glow' && `grad-p-${Math.min(seam.run?.peak ?? 0, 7)}`,
        fade === 'glow' && seam.run?.side === 'left' && 'glow-from-left',
        // The glow as a light where the background positions it (monorepo WS-PREMIUM-PACKAGE-DESIGN §9.3, `[R-646]`): the
        // shape, the surround's veil on every band of a lit group, and the light on the band that carries it.
        fade === 'glow' && seam.site?.flow?.on.glowShape === 'corner' && 'glow-corner',
        fade === 'glow' && seam.site?.flow?.on.glowShape === 'center' && 'glow-center',
        fade === 'glow' && glowLightClasses(seam.run),
        // Phase 17B: the theme's hairline, a decorative line at the top of this band; in the
        // accent where the theme says so (session 5, `[R-524]`).
        seam.hairline && 'hairline-top',
        seam.hairline && seam.site?.flow?.divider.hairlineInk === 'accent' && 'hairline-accent',
        // Phase 17E (`[R-576]`): a ribbon's accent line where it shares its ground with its neighbor. A panel
        // floats on its gutter and is a strip already, so an inset band draws none.
        seam.ribbonEdges?.top && !isInset && 'ribbon-edge-top',
        seam.ribbonEdges?.bottom && !isInset && 'ribbon-edge-bottom',
        (textured || ghost || ghosted) && !isInset && 'isolate',
        top,
        bottom,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* A plain server image, not the <Image> component, and eager: it resolves the hero's own
          candidate URL (the same src, sizes, loader and quality), so the page downloads the
          photograph once; a lazy copy is fetched again by WebKit, and the component would add a
          client reference per band (ADV-17B6-B, measured). One quadrant of it at twice the band's
          size, toned by the scrim; the section is an Image section as one built by hand
          (`[R-531]`): the same scrim and the same `data-scrim` colors. */}
      {showWindow && !isInset && (
        <>
          <div aria-hidden="true" data-photo-window={`${photoWin!.x}${photoWin!.y}`} className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              {...photoWindowProps(heroPhoto!.src)}
              alt=""
              className="photo-window object-cover grayscale"
              style={{['--window-x' as string]: photoWin!.x ? '-100%' : '0%', ['--window-y' as string]: photoWin!.y ? '-100%' : '0%'}}
            />
          </div>
          <div className="absolute inset-0 bg-scrim/80" aria-hidden="true" />
        </>
      )}
      {showSet && !isInset && <SetPhotoLayer photo={setPhoto!} />}
      {softDark && !softRun && <SetPhotoLayer photo={fadePhoto!} soft />}
      {ghosted && <GhostPhotoLayer photo={fadePhoto!} side={fadePaint!.side} />}
      {showImage && !isInset && (
        <>
          <SanityImage image={bg} mode="fill" alt="" sizes="100vw" />
          <div className="absolute inset-0 bg-scrim/80" aria-hidden="true" />
        </>
      )}
      {panel ? (
        <>
          {texture}
          {ghost}
          <div
            // The panel's own fill: the glowing card's surface and the light in one top corner, with the lit band's text
            // values (`globals.css`, `[data-dark-panel]`); or the light island, which resets the dark cascade. Its padding
            // publishes its own bottom padding, so a cut-out stands on the panel's bottom edge (`panel-pad`).
            data-dark-panel={panel.fill}
            data-panel-corner={panel.fill === 'surface' && panel.corner === 'left' ? 'left' : undefined}
            data-ring-context={panel.fill === 'light' ? 'light' : undefined}
            className={['relative mx-auto max-w-7xl overflow-hidden rounded-ui panel-pad', panel.fill === 'light' && 'bg-background', seam.divider?.mode === 'cut' && 'mt-divider'].filter(Boolean).join(' ')}
          >
            <div data-band-content className={[contained ? 'container relative' : 'relative', innerClassName].filter(Boolean).join(' ')}>{inner}</div>
          </div>
        </>
      ) : isInset ? (
        <div
          // The panel's own polarity. Required, not decorative: `.bg-brand-dark` on the
          // <section> above is itself a cascade trigger (globals.css), so a light panel
          // sitting on an adopted dark ground would resolve every text token, the focus
          // ring, the border and the slab to their on-dark forms without this reset.
          data-ring-context={adoptedClass ? resolved.ringContext ?? 'light' : undefined}
          // A photo inside the panel: the panel's own `bg-brand-dark` re-triggers the dark cascade
          // block, which would undo the section's photo-band values, so the panel carries the photo
          // band's mark itself (Phase 17B session 6, ADV-17B6-2 F1, `[R-533]`).
          data-scrim={showImage ? 'true' : undefined}
          className={['relative overflow-hidden rounded-ui px-[5%] py-12 md:py-16', textured && 'isolate', resolved.surfaceClass].filter(Boolean).join(' ')}
        >
          {showImage && (
            <>
              <SanityImage image={bg} mode="fill" alt="" sizes="100vw" />
              <div className="absolute inset-0 bg-scrim/80" aria-hidden="true" />
            </>
          )}
          {texture}
          <div data-band-content className={[contained ? 'container relative' : 'relative', innerClassName].filter(Boolean).join(' ')}>{inner}</div>
        </div>
      ) : (
        <>
          {texture}
          {ghost}
          <div data-band-content className={[contained ? 'container relative' : 'relative', seam.divider?.mode === 'cut' && 'mt-divider', innerClassName].filter(Boolean).join(' ')}>{inner}</div>
        </>
      )}
    </Tag>
  )
}

/** The hero's photograph as the hero's own `next/image` resolves it (`HERO_BACKDROP_SIZES`, the default
 *  loader and quality), without its `fill` style, which the window's utility replaces. */
function photoWindowProps(src: string) {
  const {props} = getImageProps({src, alt: '', fill: true, sizes: HERO_BACKDROP_SIZES, loading: 'eager'})
  const {style: _style, ...rest} = props
  void _style
  return rest
}

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import {
  sectionSurface, SECTION_SPACING, DEFAULT_SECTION_SPACING,
  type SectionSurface, type SectionSpacing, type ResolvedSectionSurface,
} from '@/lib/sectionSurface'

// ─── SectionShell ───────────────────────────────────────────────────────────────
// The band wrapper every full-width section renders into. It owns the surface
// (bg + ring-context), vertical spacing, horizontal gutter, optional background
// image + scrim, and the centered container — so no section hardcodes a background.
// `children` may be a render function that receives the resolved surface (handy for
// passing buttonContext to a ButtonGroup, or branching content on dark vs light).

export type SectionAppearance = {
  surface?: SectionSurface | null
  spacing?: SectionSpacing | null
  backgroundImage?: SanityImageData | null
}

type SectionShellProps = {
  appearance?: SectionAppearance | null
  /** Wrap content in a centered `.container` (default). Set false for full-bleed layouts. */
  contained?: boolean
  /** Extra classes on the <section> element. */
  className?: string
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
  className,
  as: Tag = 'section',
  children,
  ...aria
}: SectionShellProps) {
  const resolved = sectionSurface(appearance?.surface)
  const spacing = SECTION_SPACING[appearance?.spacing ?? DEFAULT_SECTION_SPACING]
  const bg = appearance?.backgroundImage
  const showImage = resolved.isImage && hasImage(bg)
  const inner = typeof children === 'function' ? children(resolved) : children

  return (
    <Tag
      data-ring-context={resolved.ringContext}
      aria-labelledby={aria['aria-labelledby']}
      aria-label={aria['aria-label']}
      className={['relative px-[5%]', resolved.surfaceClass, spacing, className].filter(Boolean).join(' ')}
    >
      {showImage && (
        <>
          <SanityImage image={bg} mode="fill" alt="" sizes="100vw" />
          <div className="absolute inset-0 bg-brand-dark/80" aria-hidden="true" />
        </>
      )}
      <div className={contained ? 'container relative' : 'relative'}>{inner}</div>
    </Tag>
  )
}

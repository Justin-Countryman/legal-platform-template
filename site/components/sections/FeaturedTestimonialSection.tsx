import {StarRating} from '@/components/ui/StarRating'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {Tagline} from '@/components/ui/Tagline'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionShell} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {type FeaturedTestimonialProps} from './sectionProps'

// ─── Types ────────────────────────────────────────────────────────────────────

// One props type for both renderings; no `_type`, the dispatchers own it. See
// sectionProps.ts.
export type FeaturedTestimonialSectionData = FeaturedTestimonialProps

// ─── Component ────────────────────────────────────────────────────────────────

// ─── The frame (Phase 13) ───────────────────────────────────────────────────
// Exported for the seam walk in `sectionFrame.ts`: the dispatchers need to
// know, before rendering anything, what ground this band will sit on and
// whether it will render at all.

/** The appearance this section will actually render with. */
export function resolveAppearance(data: FeaturedTestimonialSectionData) {
  return data.appearance
}

/** True when this section renders nothing, so the walk skips it and it never
 *  becomes the "previous band" for the one after it (item 312). */
export function isEmpty(data: FeaturedTestimonialSectionData): boolean {
  return !data.testimonial?.quote
}

export function FeaturedTestimonialSection({
  data,
  napTokens,
  seam = NO_SEAM,
}: {
  data: FeaturedTestimonialSectionData
  napTokens?: NapTokens | null
  seam?: SeamProps
}) {
  const t = data.testimonial
  if (!t?.quote) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  // Editable H2; falls back to the original default for sections created before
  // the heading field existed.
  const heading = resolveTokenString(data.heading, napTokens) || 'Client Testimonial'

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      seam={seam}
    >
      <div className="mx-auto max-w-4xl">

        {/* Section heading */}
        {tagline && <Tagline as="p">{tagline}</Tagline>}
        <h2 className="section-heading mb-6 font-heading text-xl font-bold text-foreground md:text-2xl">
          {heading}
        </h2>

        {/* Stars */}
        {t.numberOfStars != null && t.numberOfStars > 0 && (
          <StarRating count={t.numberOfStars} size="md" className="mb-6 justify-center" />
        )}

        {/* Quote */}
        <blockquote className="border-l-4 border-decor pl-8 text-left">
          <p className="text-xl font-medium leading-relaxed text-foreground md:text-2xl lg:text-3xl">
            {t.quote}
          </p>

          {/* eslint-disable-next-line platform/footer-landmark-naming -- attribution footer inside <blockquote>, not a page-footer landmark; SectionShell wraps the <section> so the rule can't see the sectioning ancestor */}
          <footer className="mt-8 flex items-center gap-3">
            {hasImage(t.avatar) && (
              <SanityImage
                image={t.avatar}
                mode="fixed"
                width={96}
                height={96}
                alt={t.avatar.alt ?? t.name}
                sizes="48px"
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div>
              <p className="font-semibold text-foreground">{t.name}</p>
              {t.caseType && (
                <p className="text-sm text-foreground-muted">{t.caseType}</p>
              )}
            </div>
          </footer>
        </blockquote>

      </div>
    </SectionShell>
  )
}

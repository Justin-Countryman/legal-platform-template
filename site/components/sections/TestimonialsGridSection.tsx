import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {TestimonialCard, type TestimonialData} from '@/components/ui/TestimonialCard'
import {SectionShell} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {type TestimonialsGridProps} from './sectionProps'

// ─── Types ────────────────────────────────────────────────────────────────────

// One props type for both renderings; no `_type`, the dispatchers own it. See
// sectionProps.ts.
export type TestimonialsGridSectionData = TestimonialsGridProps

// ─── Component ────────────────────────────────────────────────────────────────

// ─── The frame (Phase 13) ───────────────────────────────────────────────────
// Exported for the seam walk in `sectionFrame.ts`: the dispatchers need to
// know, before rendering anything, what ground this band will sit on and
// whether it will render at all.

/** The appearance this section will actually render with. */
export function resolveAppearance(data: TestimonialsGridSectionData) {
  return data.appearance
}

/** True when this section renders nothing, so the walk skips it and it never
 *  becomes the "previous band" for the one after it (item 312). */
export function isEmpty(data: TestimonialsGridSectionData): boolean {
  return (data.testimonials ?? []).filter((t) => t !== null && Boolean(t?.quote)).length === 0
}

export function TestimonialsGridSection({
  data,
  napTokens,
  seam = NO_SEAM,
}: {
  data: TestimonialsGridSectionData
  napTokens?: NapTokens | null
  seam?: SeamProps
}) {
  // Belt-and-suspenders null filter — paired with GROQ post-projection
  // [defined(_id)] (see queries.ts SECTIONS_FRAGMENT testimonials);
  // guards against future query regressions that bypass the canonical
  // safe-defaults pattern.
  const testimonials = (data.testimonials ?? []).filter(
    (t: TestimonialData | null): t is TestimonialData => t !== null
  )
  if (testimonials.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      seam={seam}
    >

      {heading && (
        <SectionHeader
          tagline={tagline}
          heading={heading}
          description={description}
          className="mx-auto mb-12 max-w-2xl"
        />
      )}

      <ul
        role="list"
        className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Client testimonials"
      >
        {testimonials.map((t) => (
          <li key={t._id}>
            <TestimonialCard t={t} />
          </li>
        ))}
      </ul>

    </SectionShell>
  )
}

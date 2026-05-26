import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {TestimonialCard, type TestimonialData} from '@/components/ui/TestimonialCard'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TestimonialsGridSectionData = {
  _type: 'testimonialsGrid'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  testimonials?: TestimonialData[] | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TestimonialsGridSection({
  data,
  napTokens,
}: {
  data: TestimonialsGridSectionData
  napTokens?: NapTokens | null
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
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">

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

      </div>
    </section>
  )
}

import Image from 'next/image'
import {StarRating} from '@/components/ui/StarRating'
import {type TestimonialData} from '@/components/ui/TestimonialCard'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeaturedTestimonialSectionData = {
  _type: 'featuredTestimonial'
  testimonial?: TestimonialData | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeaturedTestimonialSection({
  data,
}: {
  data: FeaturedTestimonialSectionData
}) {
  const t = data.testimonial
  if (!t?.quote) return null

  return (
    <section className="bg-background px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container mx-auto max-w-4xl">

        {/* Section heading */}
        <h2 className="mb-6 font-heading text-xl font-bold text-foreground md:text-2xl">
          Client Testimonial
        </h2>

        {/* Stars */}
        {t.numberOfStars != null && t.numberOfStars > 0 && (
          <StarRating count={t.numberOfStars} size="md" className="mb-6 justify-center" />
        )}

        {/* Quote */}
        <blockquote className="border-l-4 border-accent pl-8 text-left">
          <p className="text-xl font-medium leading-relaxed text-foreground md:text-2xl lg:text-3xl">
            {t.quote}
          </p>

          <footer className="mt-8 flex items-center gap-3">
            {t.avatar?.src && (
              <Image
                src={t.avatar.src}
                alt={t.avatar.alt ?? t.name}
                width={48}
                height={48}
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
    </section>
  )
}

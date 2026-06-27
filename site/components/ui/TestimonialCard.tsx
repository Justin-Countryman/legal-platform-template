import {StarRating} from '@/components/ui/StarRating'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TestimonialData = {
  _id: string
  quote: string
  name: string
  caseType?: string | null
  numberOfStars?: number | null
  avatar?: SanityImageData | null
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function TestimonialCard({t}: {t: TestimonialData}) {
  return (
    <article className="flex flex-col h-full rounded-ui border border-border bg-background p-6 shadow-card-rest">

      {t.numberOfStars && t.numberOfStars > 0 && (
        <div className="mb-4">
          <StarRating count={t.numberOfStars} size="sm" />
        </div>
      )}

      <blockquote className="grow">
        <p className="text-foreground-muted leading-relaxed before:content-['\u201C'] after:content-['\u201D']">
          {t.quote}
        </p>
      </blockquote>

      <footer className="mt-6 flex items-center gap-3">
        {hasImage(t.avatar) && (
          <SanityImage
            image={t.avatar}
            mode="fixed"
            width={80}
            height={80}
            alt={t.avatar.alt ?? t.name}
            sizes="40px"
            className="h-10 w-10 rounded-full object-cover"
          />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          {t.caseType && (
            <p className="text-xs text-foreground-muted">{t.caseType}</p>
          )}
        </div>
      </footer>

    </article>
  )
}

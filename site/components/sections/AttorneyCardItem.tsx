import {CardLink} from '@/components/ui/CardLink'
import {CardImage, ViewProfileCue, attorneyName, type AttorneyCard} from './AttorneyCardParts'

export type {AttorneyCard} from './AttorneyCardParts'

// ─── Classic card (default) ─────────────────────────────────────────────────────
// Horizontal: photo left third, name + title + cue right. Compact and reliable —
// reads well even without a headshot (small monogram block). Isomorphic so both
// the server-rendered grid and the client slider can use it.

export function AttorneyCardItem({attorney}: {attorney: AttorneyCard}) {
  const name = attorneyName(attorney)
  return (
    <CardLink
      href={`/${attorney.slug}/`}
      aria-label={`View profile for ${name}`}
      className="flex min-h-[160px] overflow-hidden"
    >
      <CardImage
        attorney={attorney}
        className="w-1/3 shrink-0 self-stretch"
        sizes="(min-width: 1024px) 11vw, (min-width: 640px) 17vw, 33vw"
      />
      <div className="flex flex-1 flex-col justify-center border-l border-border px-5 py-6">
        <p className="font-heading font-semibold leading-snug text-foreground">{name}</p>
        {attorney.jobTitle && <p className="mt-1 text-sm text-foreground-muted">{attorney.jobTitle}</p>}
        <ViewProfileCue className="mt-3" />
      </div>
    </CardLink>
  )
}

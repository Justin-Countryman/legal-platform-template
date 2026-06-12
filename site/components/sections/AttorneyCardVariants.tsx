import Link from 'next/link'
import {CardLink} from '@/components/ui/CardLink'
import {CardImage, ViewProfileCue, attorneyName, type AttorneyCard} from './AttorneyCardParts'

// ─── Premium attorney card styles ───────────────────────────────────────────────
// All isomorphic (hover states are pure CSS via the `group` on the card link and
// the motion-duration tokens, which collapse under prefers-reduced-motion), so
// both the server grid and the client slider can render them.

const PORTRAIT_SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw'

// Portrait — photo on top (4:5), name + title + cue below. Directory standard.
export function AttorneyCardPortrait({attorney}: {attorney: AttorneyCard}) {
  const name = attorneyName(attorney)
  return (
    <CardLink
      href={`/${attorney.slug}/`}
      aria-label={`View profile for ${name}`}
      className="flex h-full flex-col overflow-hidden"
    >
      <CardImage attorney={attorney} ratio="aspect-[4/5]" sizes={PORTRAIT_SIZES} />
      <div className="flex flex-1 flex-col px-5 py-5">
        <p className="font-heading text-lg font-semibold leading-snug text-foreground">{name}</p>
        {attorney.jobTitle && <p className="mt-1 text-sm text-foreground-muted">{attorney.jobTitle}</p>}
        <ViewProfileCue className="mt-4" />
      </div>
    </CardLink>
  )
}

// Avatar — a centered round headshot with name + title below. The one circular
// style. Degrades to a clean initials-circle (never an empty box) when an
// attorney has no photo, so it stays premium for photo-less rosters. Hover rings
// the avatar in the accent color and gently zooms the photo within the circle.
export function AttorneyCardAvatar({attorney}: {attorney: AttorneyCard}) {
  const name = attorneyName(attorney)
  return (
    <Link
      href={`/${attorney.slug}/`}
      aria-label={`View profile for ${name}`}
      className="group block rounded-ui px-4 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
    >
      <div className="mx-auto w-32">
        <CardImage
          attorney={attorney}
          ratio="aspect-square"
          className="rounded-full ring-2 ring-border transition-[box-shadow] duration-ui-slow group-hover:ring-action"
          imgClassName="transition-transform duration-ui-slow group-hover:scale-105"
          sizes="160px"
        />
      </div>
      <p className="mt-5 font-heading text-lg font-semibold leading-snug text-foreground">{name}</p>
      {attorney.jobTitle && <p className="mt-1 text-sm text-foreground-muted">{attorney.jobTitle}</p>}
      <div className="mt-4 flex justify-center">
        <ViewProfileCue />
      </div>
    </Link>
  )
}

// Minimal — frameless. Rounded photo, plain type below, generous whitespace,
// subtle image zoom + accent underline on the name on hover.
export function AttorneyCardMinimal({attorney}: {attorney: AttorneyCard}) {
  const name = attorneyName(attorney)
  return (
    <Link
      href={`/${attorney.slug}/`}
      aria-label={`View profile for ${name}`}
      className="group block rounded-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
    >
      <CardImage
        attorney={attorney}
        ratio="aspect-[4/5]"
        className="rounded-ui"
        imgClassName="transition-transform duration-ui-slow group-hover:scale-105"
        sizes={PORTRAIT_SIZES}
      />
      <p className="mt-4 font-heading text-lg font-semibold leading-snug text-foreground underline-offset-4 decoration-action group-hover:underline">
        {name}
      </p>
      {attorney.jobTitle && <p className="mt-1 text-sm text-foreground-muted">{attorney.jobTitle}</p>}
      <ViewProfileCue className="mt-3" />
    </Link>
  )
}

// Spotlight — photo with name/title always visible; the bio + cue expand in on
// hover OR keyboard focus (grid-rows 0fr→1fr for a smooth reveal). The panel is a
// solid brand-dark surface — the reveal grows upward into it, so a gradient
// couldn't hold contrast; solid guarantees AA (WCAG 1.4.3) for the revealed text.
export function AttorneyCardSpotlight({attorney}: {attorney: AttorneyCard}) {
  const name = attorneyName(attorney)
  return (
    <CardLink
      href={`/${attorney.slug}/`}
      aria-label={`View profile for ${name}`}
      className="relative block aspect-[4/5] overflow-hidden"
    >
      <CardImage attorney={attorney} fill sizes={PORTRAIT_SIZES} />
      {/* Soft fade from the photo into the solid panel below. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-dark to-transparent" />
      <div data-ring-context="dark" className="absolute inset-x-0 bottom-0 bg-brand-dark p-5">
        <p className="font-heading text-lg font-semibold leading-snug text-foreground">{name}</p>
        {attorney.jobTitle && <p className="mt-1 text-sm text-foreground-muted">{attorney.jobTitle}</p>}
        <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-ui-slow group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
          <div className="overflow-hidden">
            {attorney.bio && <p className="mt-3 line-clamp-3 text-sm text-foreground-muted">{attorney.bio}</p>}
            <ViewProfileCue className="mt-3" />
          </div>
        </div>
      </div>
    </CardLink>
  )
}

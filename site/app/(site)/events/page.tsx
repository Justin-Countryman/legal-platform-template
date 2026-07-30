export const revalidate = 3600

import type {Metadata} from 'next'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import Link from 'next/link'
import {client} from '@/lib/sanity/client'
import {EVENT_INDEX_PAGE_QUERY, EVENT_INDEX_QUERY, GLOBAL_CTA_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString, type NapTokens} from '@/lib/tokens'
import {resolveTitle} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS, resolvePageLabel} from '@/lib/pageLabel'
import {siteHost} from '@/lib/siteHost'
import {Chip} from '@/components/ui/Chip'
import {CalendarIcon, MapPinIcon, type ChipIcon} from '@/components/ui/icons'
import {TertiaryArrow} from '@/components/ui/TertiaryArrow'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {PageSections} from '@/components/sections/PageSections'

// ─── Types ────────────────────────────────────────────────────────────────────

type EventCard = {
  title: string
  slug: string
  eventDate: string
  eventEndDate?: string | null
  eventType?: string | null
  category?: string | null
  locationType?: string | null
  locationAddress?: string | null
  registrationUrl?: string | null
  registrationCta?: string | null
  formEmbed?: string | null
  attorneys: Array<{_id: string; title: string; slug: string}>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  seminar: 'Seminar',
  workshop: 'Workshop',
  webinar: 'Webinar',
  'community-event': 'Community Event',
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  'in-person': 'In-Person',
  virtual: 'Virtual',
  hybrid: 'Hybrid',
}

const EVENT_TYPE_ICONS: Record<string, ChipIcon> = {
  seminar: 'users',
  workshop: 'users',
  webinar: 'video',
  'community-event': 'users',
}

const LOCATION_TYPE_ICONS: Record<string, ChipIcon> = {
  'in-person': 'map-pin',
  virtual: 'video',
  hybrid: 'link',
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const [indexPage, rawTokens] = await Promise.all([
    client.fetch(EVENT_INDEX_PAGE_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!indexPage) return {title: INDEX_PAGE_PRESETS.eventIndex}

  const {title, label} = resolveTitle(indexPage.seoTitle, resolvePageLabel(indexPage, 'eventIndex') ?? '', tokens, tokens?.firmName)
  const description = resolveTokenString(indexPage.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(indexPage.noIndex, indexPage.noFollow)),
    alternates: {canonical: indexPage.canonicalUrl ?? '/events'},
    ...buildSocialMeta(label, description, indexPage?.ogImage),
  }
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({event, tokens}: {event: EventCard; tokens: NapTokens}) {
  const past = isPast(event.eventDate)
  const locationLabel = event.locationType ? (LOCATION_TYPE_LABELS[event.locationType] ?? event.locationType) : null
  const address = event.locationAddress ? resolveTokenString(event.locationAddress, tokens) : null
  const dateLabel = `${formatEventDate(event.eventDate)}, ${formatEventTime(event.eventDate)}${event.eventEndDate ? ` – ${formatEventTime(event.eventEndDate)}` : ''}`

  return (
    <Link
      href={`/${event.slug}/`}
      aria-label={`${past ? 'Past event: ' : ''}${event.title}, ${dateLabel}`}
      className={[
        'group flex flex-col overflow-hidden rounded-ui border bg-background shadow-card-rest transition-[translate,box-shadow,border-color] duration-ui-slow ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        past ? 'border-border opacity-75' : 'border-border hover:card-lift hover:border-accent hover:shadow-card-hover',
      ].join(' ')}
    >

      <div className="flex flex-1 flex-col p-7">

        {/* Badges row */}
        <div className="mb-5 flex flex-wrap items-center gap-2" aria-hidden="true">
          {event.eventType && (
            <Chip icon={EVENT_TYPE_ICONS[event.eventType] ?? 'users'}>
              {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
            </Chip>
          )}
          {locationLabel && event.locationType && (
            <Chip icon={LOCATION_TYPE_ICONS[event.locationType] ?? 'map-pin'}>
              {locationLabel}
            </Chip>
          )}
          {past && (
            <Chip icon="clock">Past Event</Chip>
          )}
        </div>

        {/* Title */}
        <h2 className="mb-5 text-xl font-bold leading-snug text-foreground">
          {event.title}
        </h2>

        {/* Divider */}
        <div className="mb-5 h-px w-10 bg-border-secondary" aria-hidden="true" />

        {/* Date + time */}
        <div className="mb-2 inline-flex items-center gap-1.5 text-sm text-foreground-muted">
          <CalendarIcon className="size-3.5 text-accent" />
          <span>
            {formatEventDate(event.eventDate)}
            {' · '}
            {formatEventTime(event.eventDate)}
            {event.eventEndDate && ` – ${formatEventTime(event.eventEndDate)}`}
          </span>
        </div>

        {/* Address */}
        {address && (
          <div className="mb-6 inline-flex items-start gap-1.5 text-sm text-foreground-muted">
            <MapPinIcon className="size-3.5 mt-0.5 text-accent shrink-0" />
            <span className="whitespace-pre-line">{address}</span>
          </div>
        )}

        {/* CTA — decorative; card link is the interactive element */}
        <div className="mt-auto border-t border-border pt-5">
          <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-base font-medium [text-transform:var(--tertiary-text-transform,none)] [letter-spacing:var(--tertiary-letter-spacing,0em)] text-action-text">
            {past ? 'View event' : 'Learn more'}
            <TertiaryArrow />
          </span>
        </div>

      </div>
    </Link>
  )
}

// ─── Tab Panel ────────────────────────────────────────────────────────────────

function EventGrid({events, tokens}: {events: EventCard[]; tokens: NapTokens}) {
  if (events.length === 0) {
    return <p className="text-foreground-muted">No events found.</p>
  }
  return (
    <ul role="list" aria-label="Events" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <li key={e.slug}>
          <EventCard event={e} tokens={tokens} />
        </li>
      ))}
    </ul>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventsIndexPage() {
  const [indexPage, allEvents, rawTokens, globalCtaData] = await Promise.all([
    client.fetch(EVENT_INDEX_PAGE_QUERY),
    client.fetch(EVENT_INDEX_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  // NAME-3: one resolver, and this route names nothing itself.
  const pageLabel = resolvePageLabel(indexPage, 'eventIndex') ?? ''

  const events: EventCard[] = allEvents ?? []
  const now = new Date()

  const upcoming = events
    .filter((e) => new Date(e.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())

  const past = events
    .filter((e) => new Date(e.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

  return (
    <>
      {/* Hero */}
      {indexPage?.hero && <InternalHero data={indexPage.hero} napTokens={tokens} />}

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: pageLabel, href: '/events/'}]} domain={siteHost()} />
        </div>
      </div>

      {/* Event listings */}
      <div className="px-[5%] py-12 md:py-16 lg:py-20">
        <div className="container">

          {/* Upcoming */}
          <section className="mb-16">
            <h1 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">Upcoming Events</h1>
            <EventGrid events={upcoming} tokens={tokens} />
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section>
              <h2 className="mb-8 text-2xl font-bold md:text-3xl text-foreground-muted">Past Events</h2>
              <EventGrid events={past} tokens={tokens} />
            </section>
          )}

        </div>
      </div>

      {/* Full-width sections */}
      {indexPage?.sections && indexPage.sections.length > 0 && (
        <PageSections sections={indexPage.sections} napTokens={tokens} />
      )}

      {/* Global CTA */}
      {!(indexPage?.hideCtaForm) && globalCtaData && (
        <GlobalCta
          data={
            indexPage?.ctaOverride
              ? {...globalCtaData, ...indexPage.ctaOverride}
              : globalCtaData
          }
          napTokens={tokens}
        />
      )}
    </>
  )
}

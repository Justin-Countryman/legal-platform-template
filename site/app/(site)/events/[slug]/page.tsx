export const revalidate = 3600

import {notFound} from 'next/navigation'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import type {Metadata} from 'next'
import Link from 'next/link'
import {client} from '@/lib/sanity/client'
import {EVENT_PAGE_QUERY, EVENT_SLUGS_QUERY, GLOBAL_CTA_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString, type NapTokens} from '@/lib/tokens'
import {resolveTitle} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS, resolvePageLabel} from '@/lib/pageLabel'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {FormModal} from '@/components/ui/FormModal'
import {Button} from '@/components/ui/Button'
import {Chip} from '@/components/ui/Chip'
import type {ChipIcon} from '@/components/ui/icons'
import {siteHost} from '@/lib/siteHost'

// ─── Static params ────────────────────────────────────────────────────────────
// Event slugs are stored as `events/{name}` — the stored slug IS the URL path
// (single-convention ruling, item 69). The URL segment is the bare `{name}`;
// strip the prefix so Next gets the route-shaped param. Same idiom as
// attorneys/[slug] and blog/[slug].

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(EVENT_SLUGS_QUERY)
  return slugs
    .filter((s) => s.startsWith('events/'))
    .map((s) => ({slug: s.slice('events/'.length)}))
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {params: Promise<{slug: string}>}

type Attorney = {_id: string; title: string; slug: string}

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
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})
}

function isPastEvent(eventDate: string): boolean {
  return new Date(eventDate) < new Date()
}

// ─── Schema Builder ───────────────────────────────────────────────────────────

function buildEventSchema(event: unknown, tokens: NapTokens | null, domain: string) {
  const e = event as Record<string, unknown>
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    startDate: e.eventDate,
    url: `https://${domain}/${e.slug}/`,
    // ENTITY-6: point at the firm, do not redeclare it.
    organizer: {'@id': `https://${domain}/#firm`},
  }
  if (e.eventEndDate) schema.endDate = e.eventEndDate
  if (e.locationType === 'virtual' || e.locationType === 'hybrid') {
    schema.eventAttendanceMode = 'https://schema.org/OnlineEventAttendanceMode'
    schema.location = {
      '@type': 'VirtualLocation',
      ...(e.virtualLink ? {url: e.virtualLink} : {}),
    }
  } else if (e.locationAddress) {
    schema.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode'
    schema.location = {'@type': 'Place', address: e.locationAddress}
  }
  schema.eventStatus = isPastEvent(e.eventDate as string)
    ? 'https://schema.org/EventCancelled'
    : 'https://schema.org/EventScheduled'
  return schema
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug: slugParam} = await params
  const slug = `events/${slugParam}`
  const [event, rawTokens] = await Promise.all([
    client.fetch(EVENT_PAGE_QUERY, {slug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!event) return {}

  const {title, label} = resolveTitle(event.seoTitle, event.title, tokens, tokens?.firmName)
  const description = resolveTokenString(event.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(event.noIndex, event.noFollow)),
    alternates: {canonical: event.canonicalUrl ?? `/${slug}`},
    ...buildSocialMeta(label, description, event?.ogImage),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({params}: Props) {
  const {slug: slugParam} = await params
  const slug = `events/${slugParam}`
  const [event, rawTokens, globalCtaData] = await Promise.all([
    client.fetch(EVENT_PAGE_QUERY, {slug}),
    client.fetch(NAP_TOKENS_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)

  if (!event) notFound()

  const past = isPastEvent(event.eventDate)
  // Belt-and-suspenders null filter — paired with GROQ post-projection
  // [defined(_id)] on attorneys (see queries.ts EVENT_PAGE_QUERY).
  const attorneys: Attorney[] = (event.attorneys ?? []).filter(
    (a: Attorney | null): a is Attorney => a !== null
  )
  const hasFormEmbed = !!event.formEmbed
  const hasRegistrationUrl = !!event.registrationUrl
  const showRegistration = !past && (hasFormEmbed || hasRegistrationUrl)

  return (
    <>
      {/* Event schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildEventSchema(event, tokens, siteHost())),
        }}
      />

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          {/* NAME-3: no route names a page. The index rung was the literal
              'Events' and the current rung read `.title` directly, bypassing the
              nav label NAME-2 puts ahead of it. */}
          <Breadcrumbs
            items={[
              {label: 'Home', href: '/'},
              {label: INDEX_PAGE_PRESETS.eventIndex, href: '/events/'},
              {label: resolvePageLabel(event) ?? '', href: `/${event.slug}/`},
            ]}
            domain={siteHost()}
          />
        </div>
      </div>

      {/* Event header + body */}
      <div className="px-[5%] py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">

            {/* Event type + location type badges */}
            {(event.eventType || event.locationType) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {event.eventType && (
                  <Chip icon={EVENT_TYPE_ICONS[event.eventType] ?? 'users'}>
                    {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                  </Chip>
                )}
                {event.locationType && (
                  <Chip icon={LOCATION_TYPE_ICONS[event.locationType] ?? 'map-pin'}>
                    {LOCATION_TYPE_LABELS[event.locationType] ?? event.locationType}
                  </Chip>
                )}
              </div>
            )}

            {/* H1 */}
            <h1 className="mb-6 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl xl:text-6xl">{event.title}</h1>

            {/* Past badge */}
            {past && (
              <div className="mb-6">
                <Chip icon="clock">Event Passed</Chip>
              </div>
            )}

            {/* Meta grid */}
            <dl className="mb-8 grid gap-4 border-y border-border py-6 sm:grid-cols-2">
              {/* Date */}
              <div>
                <dt className="tagline mb-1">Date</dt>
                <dd className="font-medium">{formatEventDate(event.eventDate)}</dd>
              </div>

              {/* Time */}
              <div>
                <dt className="tagline mb-1">Time</dt>
                <dd className="font-medium">
                  {formatEventTime(event.eventDate)}
                  {event.eventEndDate && ` – ${formatEventTime(event.eventEndDate)}`}
                </dd>
              </div>

              {/* Location */}
              {(event.locationAddress || event.virtualLink) && (
                <div>
                  <dt className="tagline mb-1">Location</dt>
                  <dd className="font-medium">
                    {event.locationAddress && (
                      <span className="block whitespace-pre-line">
                        {resolveTokenString(event.locationAddress, tokens)}
                      </span>
                    )}
                    {(event.locationType === 'virtual' || event.locationType === 'hybrid') && event.virtualLink && !past && (
                      <a
                        href={event.virtualLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover"
                      >
                        Join online
                      </a>
                    )}
                  </dd>
                </div>
              )}

              {/* Attorneys */}
              {attorneys.length > 0 && (
                <div>
                  <dt className="tagline mb-1">
                    {attorneys.length === 1 ? 'Presenter' : 'Presenters'}
                  </dt>
                  <dd className="font-medium">
                    {attorneys.map((a, i) => (
                      <span key={a._id}>
                        {i > 0 && ', '}
                        <Link href={`/${a.slug}/`} className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover">
                          {a.title}
                        </Link>
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            {/* Registration CTA */}
            {showRegistration && (
              <div className="mb-10">
                {hasFormEmbed ? (
                  <FormModal
                    triggerLabel={event.registrationCta || 'Register Now'}
                    title="Register for This Event"
                    description={event.title}
                    formEmbed={event.formEmbed}
                  />
                ) : (
                  <Button href={event.registrationUrl} target="_blank">
                    {event.registrationCta || 'Register Now'}
                  </Button>
                )}
              </div>
            )}

            {/* Body */}
            {event.body && (
              <PortableTextRenderer value={event.body} napTokens={tokens} />
            )}

          </div>
        </div>
      </div>

      {/* Global CTA */}
      {!event.hideCtaForm && globalCtaData && (
        <GlobalCta data={event.ctaOverride ? {...globalCtaData, ...event.ctaOverride} : globalCtaData} napTokens={tokens} />
      )}
    </>
  )
}

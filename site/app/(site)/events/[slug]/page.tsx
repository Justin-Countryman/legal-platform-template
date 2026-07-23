export const revalidate = 3600

import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import Link from 'next/link'
import {client} from '@/lib/sanity/client'
import {EVENT_PAGE_QUERY, EVENT_SLUGS_QUERY, GLOBAL_CTA_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString, titleFragment, type NapTokens} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {FormModal} from '@/components/ui/FormModal'
import {Button} from '@/components/ui/Button'
import {Chip} from '@/components/ui/Chip'
import type {ChipIcon} from '@/components/ui/icons'

// ─── Static params ────────────────────────────────────────────────────────────
// Event slugs are bare in Sanity (no `events/` prefix); the URL segment
// matches one-for-one.

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(EVENT_SLUGS_QUERY)
  return slugs.map((slug) => ({slug}))
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
    organizer: {
      '@type': 'LegalService',
      name: tokens?.firmName ?? '',
      url: `https://${domain}/`,
    },
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
  const {slug} = await params
  const [event, rawTokens] = await Promise.all([
    client.fetch(EVENT_PAGE_QUERY, {slug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!event) return {}

  const title = titleFragment(event.seoTitle, event.title, tokens)
  const description = resolveTokenString(event.metaDescription, tokens)
  return {
    title,
    description,
    ...(event.noIndex ? {robots: {index: false, follow: false}} : {}),
    alternates: {canonical: event.canonicalUrl ?? `/events/${slug}`},
    ...buildSocialMeta(title, description),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'example.com'

export default async function EventDetailPage({params}: Props) {
  const {slug} = await params
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
          __html: JSON.stringify(buildEventSchema(event, tokens, DOMAIN)),
        }}
      />

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[
            {label: 'Home', href: '/'},
            {label: 'Events', href: '/events/'},
            {label: event.title, href: `/events/${event.slug}/`},
          ]} />
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
